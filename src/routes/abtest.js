const sqlite3 = require('sqlite3').verbose();

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

  return false;
}

module.exports = { handleAbtestRoutes, computeABStatsFromDB };
