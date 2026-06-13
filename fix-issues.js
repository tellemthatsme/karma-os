const fs = require('fs');

// ── Fix src/routes/abtest.js ───────────────────────────────────────────
let abtest = fs.readFileSync('src/routes/abtest.js', 'utf8');

// 1. Add TTL cleanup to checkAbtestRateLimit
const oldRateLimiter = `function checkAbtestRateLimit(ip) {
  const now = Date.now();
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
}`;

const newRateLimiter = `function checkAbtestRateLimit(ip) {
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
}`;

if (abtest.includes(oldRateLimiter)) {
  abtest = abtest.replace(oldRateLimiter, newRateLimiter);
  console.log('Added TTL cleanup to rate limiter');
} else {
  console.log('Could not find rate limiter function');
}

// 2. Insert rate limit check at the beginning of handleAbtestRoutes
const oldHandleStart = `function handleAbtestRoutes(req, res, startTime, deps) {
  const { db, broadcast, logRequest, metrics, wsClients } = deps;
  const url = req.url.split('?')[0];

  // /api/abtest/event — POST`;

const newHandleStart = `function handleAbtestRoutes(req, res, startTime, deps) {
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

  // /api/abtest/event — POST`;

if (abtest.includes(oldHandleStart)) {
  abtest = abtest.replace(oldHandleStart, newHandleStart);
  console.log('Inserted rate limit check into handleAbtestRoutes');
} else {
  console.log('Could not find handleAbtestRoutes start');
}

// 3. Fix p-value approximation using standard normal CDF
const oldPValue = `const pValue = chi2 > 0 ? Math.exp(-chi2 / 2) : 1; // rough approximation`;
const newPValue = `const pValue = chi2 > 0 ? chiSquarePValue(chi2) : 1;`;

if (abtest.includes(oldPValue)) {
  abtest = abtest.replace(oldPValue, newPValue);
  console.log('Fixed p-value calculation call');
} else {
  console.log('Could not find p-value line');
}

// Add chiSquarePValue function before computeABStatsFromDB
const chiSquarePValueFunc = `
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

`;

if (!abtest.includes('function chiSquarePValue')) {
  abtest = abtest.replace('function computeABStatsFromDB', chiSquarePValueFunc + 'function computeABStatsFromDB');
  console.log('Added chiSquarePValue function');
}

// 4. Document significance endpoint limitation
const oldSignificanceNote = `      // Chi-square test for first two variants`;
const newSignificanceNote = `      // Chi-square test for first two variants (pairwise comparison only)`;

if (abtest.includes(oldSignificanceNote)) {
  abtest = abtest.replace(oldSignificanceNote, newSignificanceNote);
  console.log('Documented significance endpoint limitation');
}

fs.writeFileSync('src/routes/abtest.js', abtest);
console.log('Updated src/routes/abtest.js');

// ── Fix karma-abtest.spec.js ─────────────────────────────────────────
let spec = fs.readFileSync('karma-abtest.spec.js', 'utf8');

// 5. Fix test 13: exhaust rate limit for 10.0.0.3
const oldTest13 = `  // 13. handleAbtestRoutes returns 429 when rate limited
  test('handleAbtestRoutes returns 429 when rate limited', () => {
    const { handleAbtestRoutes, checkAbtestRateLimit } = require('./src/routes/abtest');
    const mockDb = { all: () => {}, prepare: () => ({ run: () => {}, finalize: () => {} }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const res = mockResponse();
    for (let i = 0; i < 60; i++) {
      checkAbtestRateLimit('10.0.0.3');
    }
    req.connection.remoteAddress = '10.0.0.3';
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 429);
    const body = JSON.parse(res.body);
    assert.ok(body.error.includes('Too many requests'));
  });`;

const newTest13 = `  // 13. handleAbtestRoutes returns 429 when rate limited
  test('handleAbtestRoutes returns 429 when rate limited', () => {
    const { handleAbtestRoutes, checkAbtestRateLimit } = require('./src/routes/abtest');
    const mockDb = { all: () => {}, prepare: () => ({ run: () => {}, finalize: () => {} }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const res = mockResponse();
    // Exhaust rate limit for 10.0.0.3
    for (let i = 0; i < 61; i++) {
      checkAbtestRateLimit('10.0.0.3');
    }
    req.connection.remoteAddress = '10.0.0.3';
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 429);
    const body = JSON.parse(res.body);
    assert.ok(body.error.includes('Too many requests'));
  });`;

if (spec.includes(oldTest13)) {
  spec = spec.replace(oldTest13, newTest13);
  console.log('Updated test 13');
} else {
  console.log('Could not find test 13');
}

fs.writeFileSync('karma-abtest.spec.js', spec);
console.log('Updated karma-abtest.spec.js');

console.log('All fixes applied!');
