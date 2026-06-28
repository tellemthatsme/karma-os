const sqlite3 = require('sqlite3').verbose();
// -- A/B Test Rate Limiter ------------------------------------------------
const abtestRateLimitMap = new Map(); // ip -> { count, resetTime }
const ABTEST_WINDOW_MS = 60 * 1000;   // 1 minute
const ABTEST_MAX_REQUESTS = 60;        // 60 requests per minute

function checkAbtestRateLimit(ip) {
  const now = Date.now();
  // Lazy cleanup: remove expired entries when map grows large
  if (abtestRateLimitMap.size > 100 && Math.random() < 0.1) {
    for (const [key, entry] of abtestRateLimitMap) {
      if (now > entry.resetTime) abtestRateLimitMap.delete(key);
    }
  }
  const entry = abtestRateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    abtestRateLimitMap.set(ip, { count: 1, resetTime: now + ABTEST_WINDOW_MS });
    return { allowed: true, remaining: ABTEST_MAX_REQUESTS - 1, retryAfter: 0 };
  }
  entry.count++;
  if (entry.count > ABTEST_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }
  return { allowed: true, remaining: ABTEST_MAX_REQUESTS - entry.count, retryAfter: 0 };
}




// -- Wilson score confidence interval for binomial proportion ----------------
function wilsonScoreInterval(conversions, users, z = 1.96) {
  if (users === 0) return { lower: 0, upper: 0, point: 0 };
  const p = conversions / users;
  const n = users;
  const denominator = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const halfWidth = z * Math.sqrt((p * (1 - p) / n) + (z * z) / (4 * n * n));
  const lower = Math.max(0, (centre - halfWidth) / denominator);
  const upper = Math.min(1, (centre + halfWidth) / denominator);
  return { lower: Number(lower.toFixed(4)), upper: Number(upper.toFixed(4)), point: Number(p.toFixed(4)) };
}

// -- Bayesian Beta posterior for A/B test ------------------------------------
function betaPosterior(conversions, users, alphaPrior = 1, betaPrior = 1) {
  const alpha = alphaPrior + conversions;
  const beta = betaPrior + (users - conversions);
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
  return { alpha, beta, mean: Number(mean.toFixed(4)), variance: Number(variance.toFixed(6)) };
}

// -- Monte Carlo probability that variant A beats variant B ------------------
function probabilityABeatsB(alphaA, betaA, alphaB, betaB, samples = 10000) {
  let wins = 0;
  for (let i = 0; i < samples; i++) {
    const sampleA = sampleBeta(alphaA, betaA);
    const sampleB = sampleBeta(alphaB, betaB);
    if (sampleA > sampleB) wins++;
  }
  return Number((wins / samples).toFixed(4));
}

// Marsaglia's method for Beta sampling
function sampleBeta(alpha, beta) {
  const x = sampleGamma(alpha, 1);
  const y = sampleGamma(beta, 1);
  return x / (x + y);
}

function sampleGamma(shape, scale) {
  if (shape < 1) {
    return sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x = sampleNormal();
    let v = Math.pow(1 + c * x, 3);
    if (v > 0) {
      let u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
  }
}

function sampleNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// -- Chi-square p-value (df=1) using standard normal CDF (Abramowitz & Stegun) ----
function chiSquarePValue(chi2) {
  const z = Math.sqrt(chi2);
  // Abramowitz & Stegun formula 7.1.26
  const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937;
  const b4 = -1.821255978, b5 = 1.330274429;
  const p = 0.2316419;
  const t = 1 / (1 + p * z);
  const phi = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  const Phi = 1 - phi * (b1 * t + b2 * t * t + b3 * Math.pow(t, 3) + b4 * Math.pow(t, 4) + b5 * Math.pow(t, 5));
  return 2 * (1 - Phi);
}

function computeABStatsFromDB(db, callback) {
  const query = `
    SELECT testId, variant, event, COUNT(*) as count,
           COUNT(DISTINCT userId) as users
    FROM abtest_events
    GROUP BY testId, variant, event
  `;
  db.all(query, [], (err, rows) => {
    if (err) return callback(err);
    const results = {};
    for (const row of rows) {
      if (!results[row.testId]) results[row.testId] = {};
      if (!results[row.testId][row.variant]) results[row.testId][row.variant] = { events: {}, userCount: 0, revenue: 0 };
      const v = results[row.testId][row.variant];
      v.events[row.event] = (v.events[row.event] || 0) + row.count;
      v.userCount = Math.max(v.userCount, row.users);
    }
    // Compute revenue from raw events
    db.all('SELECT testId, variant, props FROM abtest_events', [], (err2, allRows) => {
      if (!err2) {
        for (const r of allRows) {
          if (results[r.testId] && results[r.testId][r.variant]) {
            try {
              const p = JSON.parse(r.props || '{}');
              if (p && typeof p.revenue === 'number') {
                results[r.testId][r.variant].revenue += p.revenue;
              }
            } catch (_) { /* ignore malformed props */ }
          }
        }
      }
      // Compute rates
      for (const testId in results) {
        for (const variant in results[testId]) {
          const v = results[testId][variant];
          const impressions = v.events.impression || v.events.view || 0;
          const clicks = v.events.click || 0;
          const conversions = v.events.conversion || 0;
          v.ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : 'N/A';
          v.conversionRate = impressions > 0 ? ((conversions / impressions) * 100).toFixed(2) + '%' : 'N/A';
          v.revenue = Number(v.revenue.toFixed(2));
        }
      }
      callback(null, results);
    });
  });
}

function handleAbtestRoutes(req, res, startTime, deps) {
  const { db, broadcast, logRequest, metrics, wsClients } = deps;
  const url = req.url.split('?')[0];

  // -- Rate limit check (uses x-forwarded-for like server.js) ----------------
  const clientIp = req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : (req.connection.remoteAddress || req.socket?.remoteAddress || 'unknown');
  const rateLimit = checkAbtestRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfter);
    res.writeHead(429, { 'Content-Type': 'application/json' });
    logRequest(req, res, startTime, { error: 'Too many requests' });
    metrics.activeConnections--;
    res.end(JSON.stringify({ error: 'Too many requests', retryAfter: rateLimit.retryAfter }));
    return true;
  }
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);

  // /api/abtest/event — POST
  if (url === '/api/abtest/event' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!Array.isArray(payload.events)) throw new Error('events must be an array');
        const accepted = [];
        const stmt = db.prepare(`
          INSERT INTO abtest_events (testId, variant, event, ts, userId, sessionId, props, receivedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const ev of payload.events) {
          if (!ev || typeof ev.testId !== 'string' || typeof ev.event !== 'string') continue;
          if (ev.testId.length > 100 || ev.event.length > 100) continue;
          const record = {
            testId: ev.testId,
            variant: String(ev.variant || 'unassigned').slice(0, 50),
            event: ev.event,
            ts: Number(ev.ts) || Date.now(),
            userId: String(ev.userId || 'anon').slice(0, 100),
            sessionId: String(ev.sessionId || '').slice(0, 100),
            props: JSON.stringify(ev.props || {}),
            receivedAt: Date.now(),
          };
          stmt.run(record.testId, record.variant, record.event, record.ts, record.userId, record.sessionId, record.props, record.receivedAt);
          accepted.push(record);
        }
        stmt.finalize((finalizeErr) => {
          if (finalizeErr) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            logRequest(req, res, startTime, { error: finalizeErr.message });
            metrics.activeConnections--;
            return res.end(JSON.stringify({ ok: false, error: finalizeErr.message }));
          }
          broadcast({ type: 'new_events', count: accepted.length, testIds: [...new Set(accepted.map(e => e.testId))] });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          logRequest(req, res, startTime);
          metrics.activeConnections--;
          res.end(JSON.stringify({ ok: true, accepted: accepted.length }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime, { error: err.message });
        metrics.activeConnections--;
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return true;
  }

  // /api/abtest/results — GET
  if (url === '/api/abtest/results' && req.method === 'GET') {
    computeABStatsFromDB(db, (err, stats) => {
      if (err) {
        res.writeHead(500);
        logRequest(req, res, startTime, { error: err.message });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ ok: true, totalTests: Object.keys(stats).length, results: stats }));
    });
    return true;
  }

  // /api/abtest/stats — GET
  if (url === '/api/abtest/stats' && req.method === 'GET') {
    db.get('SELECT COUNT(*) as total FROM abtest_events', [], (err, row) => {
      if (err) {
        res.writeHead(500);
        logRequest(req, res, startTime, { error: err.message });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      db.all('SELECT testId, COUNT(*) as events FROM abtest_events GROUP BY testId', [], (err, tests) => {
        if (err) {
          res.writeHead(500);
          logRequest(req, res, startTime, { error: err.message });
          metrics.activeConnections--;
          return res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime);
        metrics.activeConnections--;
        res.end(JSON.stringify({ ok: true, totalEvents: row.total, tests, wsClients: wsClients.size }));
      });
    });
    return true;
  }

  // /api/abtest/config — POST
  if (url === '/api/abtest/config' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { testId, name, variants, weights, startDate, endDate } = JSON.parse(body);
        if (!testId || !Array.isArray(variants)) {
          res.writeHead(400);
          logRequest(req, res, startTime, { error: 'testId and variants required' });
          metrics.activeConnections--;
          return res.end(JSON.stringify({ error: 'testId and variants required' }));
        }
        db.run(
          `INSERT OR REPLACE INTO abtest_configs (testId, name, variants, weights, startDate, endDate, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [testId, name || testId, JSON.stringify(variants), weights ? JSON.stringify(weights) : null, startDate || new Date().toISOString(), endDate || null, new Date().toISOString()],
          function(err) {
            if (err) {
              res.writeHead(500);
              logRequest(req, res, startTime, { error: err.message });
              metrics.activeConnections--;
              return res.end(JSON.stringify({ error: err.message }));
            }
            res.writeHead(200);
            logRequest(req, res, startTime);
            metrics.activeConnections--;
            res.end(JSON.stringify({ ok: true, testId }));
          }
        );
      } catch (e) {
        res.writeHead(400);
        logRequest(req, res, startTime, { error: e.message });
        metrics.activeConnections--;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }


  // /api/abtest/config — GET
  if (url === '/api/abtest/config' && req.method === 'GET') {
    db.all('SELECT * FROM abtest_configs', [], (err, rows) => {
      if (err) {
        res.writeHead(500);
        logRequest(req, res, startTime, { error: err.message });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: err.message }));
      }
      const configs = {};
      for (const row of rows) {
        configs[row.testId] = {
          name: row.name,
          variants: JSON.parse(row.variants),
          weights: row.weights ? JSON.parse(row.weights) : null,
          startDate: row.startDate,
          endDate: row.endDate,
          createdAt: row.createdAt,
        };
      }
      res.writeHead(200);
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ ok: true, configs }));
    });
    return true;
  }

  // /api/abtest/reset — POST
  if (url === '/api/abtest/reset' && req.method === 'POST') {
    db.run('DELETE FROM abtest_events', [], (err) => {
      if (err) {
        res.writeHead(500);
        logRequest(req, res, startTime, { error: err.message });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: err.message }));
      }
      broadcast({ type: 'reset', message: 'All A/B test data cleared' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ ok: true, message: 'All A/B test data cleared' }));
    });
    return true;
  }

  // /api/abtest/export — GET
  if (url === '/api/abtest/export' && req.method === 'GET') {
    db.all('SELECT * FROM abtest_events ORDER BY ts DESC LIMIT 5000', [], (err, rows) => {
      if (err) {
        res.writeHead(500);
        logRequest(req, res, startTime, { error: err.message });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: err.message }));
      }
      const data = rows.map(r => ({
        ...r,
        props: JSON.parse(r.props || '{}'),
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ ok: true, count: data.length, data }));
    });
    return true;
  }


  // /api/abtest/significance — GET
  if (url === '/api/abtest/significance' && req.method === 'GET') {
    const testId = new URL(req.url, 'http://localhost').searchParams.get('testId');
    const event = new URL(req.url, 'http://localhost').searchParams.get('event');
    if (!testId || !event) {
      res.writeHead(400);
      logRequest(req, res, startTime, { error: 'Missing testId or event' });
      metrics.activeConnections--;
      return res.end(JSON.stringify({ error: 'Missing testId or event' }));
    }
    computeABStatsFromDB(db, (err, stats) => {
      if (err) {
        res.writeHead(500);
        logRequest(req, res, startTime, { error: err.message });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: err.message }));
      }
      const testData = stats[testId];
      if (!testData || Object.keys(testData).length < 2) {
        res.writeHead(400);
        logRequest(req, res, startTime, { error: 'Test not found or only one variant' });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: 'Test not found or only one variant' }));
      }
      const variants = Object.keys(testData);
      const result = {};
      // Calculate conversion rates per variant
      for (const v of variants) {
        const d = testData[v];
        const conversions = d.events[event] || 0;
        const users = d.userCount || 0;
        result[v] = {
          users,
          conversions,
          rate: users > 0 ? (conversions / users) : 0,
          revenue: d.revenue || 0,
        };
      }
      // Chi-square test for first two variants (pairwise comparison only)
      if (variants.length >= 2) {
        const v1 = variants[0], v2 = variants[1];
        const c1 = result[v1].conversions, n1 = result[v1].users;
        const c2 = result[v2].conversions, n2 = result[v2].users;
        const t1 = c1, t2 = c2, t3 = n1 - c1, t4 = n2 - c2;
        const total = n1 + n2;
        const totalConv = c1 + c2;
        const totalNonConv = total - totalConv;
        let chi2 = 0;
        const expected = [
          [n1 * totalConv / total, n1 * totalNonConv / total],
          [n2 * totalConv / total, n2 * totalNonConv / total],
        ];
        const observed = [[c1, n1 - c1], [c2, n2 - c2]];
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            const e = expected[i][j];
            if (e > 0) chi2 += Math.pow(observed[i][j] - e, 2) / e;
          }
        }
        const pValue = chi2 > 0 ? chiSquarePValue(chi2) : 1;
        result.significance = {
          chiSquare: chi2,
          pValue,
          winner: pValue < 0.05 ? (result[v1].rate > result[v2].rate ? v1 : v2) : null,
          significant: pValue < 0.05,
          compared: [v1, v2],
        };
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ ok: true, testId, event, variants: result }));
    });
    return true;
  }


  // /api/abtest/confidence — GET
  if (url === '/api/abtest/confidence' && req.method === 'GET') {
    const testId = new URL(req.url, 'http://localhost').searchParams.get('testId');
    const event = new URL(req.url, 'http://localhost').searchParams.get('event');
    if (!testId || !event) {
      res.writeHead(400);
      logRequest(req, res, startTime, { error: 'Missing testId or event' });
      metrics.activeConnections--;
      return res.end(JSON.stringify({ error: 'Missing testId or event' }));
    }
    computeABStatsFromDB(db, (err, stats) => {
      if (err) {
        res.writeHead(500);
        logRequest(req, res, startTime, { error: err.message });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: err.message }));
      }
      const testData = stats[testId];
      if (!testData || Object.keys(testData).length < 2) {
        res.writeHead(400);
        logRequest(req, res, startTime, { error: 'Test not found or only one variant' });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: 'Test not found or only one variant' }));
      }
      const variants = Object.keys(testData);
      const result = {};
      for (const v of variants) {
        const d = testData[v];
        const conversions = d.events[event] || 0;
        const users = d.userCount || 0;
        const interval = wilsonScoreInterval(conversions, users);
        result[v] = {
          users,
          conversions,
          rate: users > 0 ? Number((conversions / users).toFixed(4)) : 0,
          confidence95: interval,
        };
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ ok: true, testId, event, variants: result }));
    });
    return true;
  }

  // /api/abtest/bayesian — GET
  if (url === '/api/abtest/bayesian' && req.method === 'GET') {
    const testId = new URL(req.url, 'http://localhost').searchParams.get('testId');
    const event = new URL(req.url, 'http://localhost').searchParams.get('event');
    if (!testId || !event) {
      res.writeHead(400);
      logRequest(req, res, startTime, { error: 'Missing testId or event' });
      metrics.activeConnections--;
      return res.end(JSON.stringify({ error: 'Missing testId or event' }));
    }
    computeABStatsFromDB(db, (err, stats) => {
      if (err) {
        res.writeHead(500);
        logRequest(req, res, startTime, { error: err.message });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: err.message }));
      }
      const testData = stats[testId];
      if (!testData || Object.keys(testData).length < 2) {
        res.writeHead(400);
        logRequest(req, res, startTime, { error: 'Test not found or only one variant' });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: 'Test not found or only one variant' }));
      }
      const variants = Object.keys(testData);
      const result = {};
      for (const v of variants) {
        const d = testData[v];
        const conversions = d.events[event] || 0;
        const users = d.userCount || 0;
        const posterior = betaPosterior(conversions, users);
        result[v] = {
          users,
          conversions,
          posterior,
        };
      }
      // Pairwise probability that each variant beats the control (first variant)
      if (variants.length >= 2) {
        const control = variants[0];
        const controlPost = result[control].posterior;
        const probabilities = {};
        for (let i = 1; i < variants.length; i++) {
          const v = variants[i];
          const vPost = result[v].posterior;
          const prob = probabilityABeatsB(vPost.alpha, vPost.beta, controlPost.alpha, controlPost.beta);
          probabilities[v + '_vs_' + control] = prob;
        }
        result.probabilities = probabilities;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ ok: true, testId, event, variants: result }));
    });
    return true;
  }

  return false;
}

module.exports = { handleAbtestRoutes, computeABStatsFromDB, checkAbtestRateLimit, wilsonScoreInterval, betaPosterior, probabilityABeatsB };
