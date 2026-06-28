const http = require('http');
const assert = require('assert');
const { handleAbtestRoutes, computeABStatsFromDB } = require('./src/routes/abtest');

// ── Test Helpers ───────────────────────────────────────────────────────
function mockRequest({ url, method, body, headers = {} }) {
  const req = new http.IncomingMessage({});
  req.url = url;
  req.method = method;
  req.headers = headers;
  req.connection = { remoteAddress: '127.0.0.1' };
  req._body = body;
  return req;
}

function mockResponse() {
  const res = {
    statusCode: 0,
    headers: {},
    body: null,
    ended: false,
    writeHead(code, hdrs) { this.statusCode = code; if (hdrs) Object.assign(this.headers, hdrs); },
    setHeader(k, v) { this.headers[k] = v; },
    end(data) { this.body = data; this.ended = true; },
    write(data) { this.body = (this.body || '') + data; },
  };
  return res;
}

// ── Mock Dependencies ────────────────────────────────────────────────
let mockBroadcastCalls = [];
let mockLogCalls = [];
let mockMetrics = { activeConnections: 1, requestsTotal: 0, requestsByStatus: {}, requestDurations: [], startTime: Date.now() };
let mockWsClients = new Set();

function resetMocks() {
  mockBroadcastCalls = [];
  mockLogCalls = [];
  mockMetrics = { activeConnections: 1, requestsTotal: 0, requestsByStatus: {}, requestDurations: [], startTime: Date.now() };
  mockWsClients = new Set();
}

function createDeps(db) {
  return {
    db,
    broadcast: (data) => mockBroadcastCalls.push(data),
    logRequest: (req, res, startTime, extra) => mockLogCalls.push({ url: req.url, status: res.statusCode, extra }),
    metrics: mockMetrics,
    wsClients: mockWsClients,
  };
}

// ── Promise wrapper for callback-based computeABStatsFromDB ─────────
function computeABStatsAsync(db) {
  return new Promise((resolve, reject) => {
    computeABStatsFromDB(db, (err, stats) => {
      if (err) reject(err);
      else resolve(stats);
    });
  });
}

// ── Tests ──────────────────────────────────────────────────────────────
async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      console.log('  ✓', name);
    } catch (e) {
      failed++;
      console.log('  ✗', name);
      console.log('    ', e.message);
    }
  }

  console.log('\n🧪 A/B Test Route Unit Tests\n');

  // 1. computeABStatsFromDB returns empty object when no data
  await test('computeABStatsFromDB returns empty results for empty DB', async () => {
    const mockDb = {
      all: (query, params, cb) => {
        if (query.includes('GROUP BY')) cb(null, []);
        else cb(null, []);
      }
    };
    const stats = await computeABStatsAsync(mockDb);
    assert.deepStrictEqual(stats, {});
  });

  // 2. computeABStatsFromDB correctly aggregates events
  await test('computeABStatsFromDB aggregates events and computes CTR', async () => {
    const mockDb = {
      all: (query, params, cb) => {
        if (query.includes('GROUP BY')) {
          cb(null, [
            { testId: 't1', variant: 'control', event: 'impression', count: 100, users: 50 },
            { testId: 't1', variant: 'control', event: 'click', count: 10, users: 10 },
          ]);
        } else {
          cb(null, [
            { testId: 't1', variant: 'control', props: JSON.stringify({ revenue: 5.99 }) },
            { testId: 't1', variant: 'control', props: JSON.stringify({ revenue: 2.50 }) },
          ]);
        }
      }
    };
    const stats = await computeABStatsAsync(mockDb);
    assert.strictEqual(stats.t1.control.events.impression, 100);
    assert.strictEqual(stats.t1.control.events.click, 10);
    assert.strictEqual(stats.t1.control.ctr, '10.00%');
    assert.strictEqual(stats.t1.control.revenue, 8.49);
  });

  // 3. handleAbtestRoutes returns false for non-matching URLs
  await test('handleAbtestRoutes returns false for non-AB-test URLs', () => {
    const req = mockRequest({ url: '/metrics', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps());
    assert.strictEqual(result, false);
    assert.strictEqual(res.ended, false);
  });

  // 4. handleAbtestRoutes handles /api/abtest/stats
  await test('handleAbtestRoutes handles /api/abtest/stats', () => {
    const mockDb = {
      get: (q, p, cb) => cb(null, { total: 42 }),
      all: (q, p, cb) => cb(null, [{ testId: 't1', events: 42 }]),
    };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET' });
    const res = mockResponse();
    const startTime = Date.now();
    const result = handleAbtestRoutes(req, res, startTime, { ...createDeps(mockDb), wsClients: new Set(['a', 'b']) });
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.totalEvents, 42);
    assert.strictEqual(body.wsClients, 2);
  });

  // 5. handleAbtestRoutes handles /api/abtest/reset
  await test('handleAbtestRoutes handles /api/abtest/reset', () => {
    const mockDb = {
      run: (q, p, cb) => cb(null),
    };
    const req = mockRequest({ url: '/api/abtest/reset', method: 'POST' });
    const res = mockResponse();
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(mockBroadcastCalls.length, 1);
    assert.strictEqual(mockBroadcastCalls[0].type, 'reset');
  });

  // 6. handleAbtestRoutes handles /api/abtest/export
  await test('handleAbtestRoutes handles /api/abtest/export', () => {
    const mockDb = {
      all: (q, p, cb) => cb(null, [
        { id: 1, testId: 't1', variant: 'control', event: 'click', props: '{"revenue":5}' },
      ]),
    };
    const req = mockRequest({ url: '/api/abtest/export', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.count, 1);
    assert.deepStrictEqual(body.data[0].props, { revenue: 5 });
  });

  // 7. handleAbtestRoutes handles /api/abtest/config GET
  await test('handleAbtestRoutes handles /api/abtest/config GET', () => {
    const mockDb = {
      all: (q, p, cb) => cb(null, [
        { testId: 't1', name: 'Test 1', variants: '["control","a"]', weights: '[0.5,0.5]', startDate: '2024-01-01', endDate: null, createdAt: '2024-01-01' },
      ]),
    };
    const req = mockRequest({ url: '/api/abtest/config', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.deepStrictEqual(body.configs.t1.variants, ['control', 'a']);
  });

  // 8. handleAbtestRoutes handles /api/abtest/config POST
  await test('handleAbtestRoutes handles /api/abtest/config POST', () => {
    const mockDb = {
      run: (q, p, cb) => cb(null),
    };
    const req = mockRequest({ url: '/api/abtest/config', method: 'POST' });
    req._body = JSON.stringify({ testId: 'new', name: 'New', variants: ['control', 'v1'] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.testId, 'new');
  });


  // 9. handleAbtestRoutes handles /api/abtest/event POST
  await test('handleAbtestRoutes handles /api/abtest/event POST', () => {
    const mockDb = {
      prepare: (q) => ({
        run: (...args) => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [{ testId: 't1', variant: 'control', event: 'click', userId: 'u1' }] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    // Mock req.on fires synchronously, so response is already sent
    assert.strictEqual(res.ended, true);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  // 10. computeABStatsFromDB handles malformed props gracefully
  await test('computeABStatsFromDB handles malformed props gracefully', async () => {
    const mockDb = {
      all: (query, params, cb) => {
        if (query.includes('GROUP BY')) {
          cb(null, [{ testId: 't1', variant: 'control', event: 'impression', count: 1, users: 1 }]);
        } else {
          cb(null, [
            { testId: 't1', variant: 'control', props: 'not-json' },
            { testId: 't1', variant: 'control', props: '{"revenue": 10}' },
          ]);
        }
      }
    };
    const stats = await computeABStatsAsync(mockDb);
    assert.strictEqual(stats.t1.control.revenue, 10);
  });


  // 11. Rate limiter allows requests under threshold
  await test('Rate limiter allows requests under threshold', () => {
    const { checkAbtestRateLimit } = require('./src/routes/abtest');
    const result = checkAbtestRateLimit('10.0.0.1');
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.remaining, 59);
  });

  // 12. Rate limiter blocks requests over threshold
  await test('Rate limiter blocks requests over threshold', () => {
    const { checkAbtestRateLimit } = require('./src/routes/abtest');
    for (let i = 0; i < 60; i++) {
      checkAbtestRateLimit('10.0.0.2');
    }
    const result = checkAbtestRateLimit('10.0.0.2');
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.remaining, 0);
    assert.ok(result.retryAfter > 0);
  });

  // 13. handleAbtestRoutes returns 429 when rate limited
  await test('handleAbtestRoutes returns 429 when rate limited', () => {
    const { handleAbtestRoutes, checkAbtestRateLimit } = require('./src/routes/abtest');
    const mockDb = { all: (q, p, cb) => cb(null, []), get: (q, p, cb) => cb(null, { total: 0 }), prepare: () => ({ run: () => {}, finalize: () => {} }) };
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
  });

  // 14. Significance endpoint returns chi-square and p-value
  await test('Significance endpoint returns chi-square and p-value', () => {
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [
            { testId: 't1', variant: 'control', event: 'click', count: 10, users: 100 },
            { testId: 't1', variant: 'treatment', event: 'click', count: 20, users: 100 },
          ]);
        } else {
          cb(null, []);
        }
      },
    };
    const req = mockRequest({ url: '/api/abtest/significance?testId=t1&event=click', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.testId, 't1');
    assert.strictEqual(body.event, 'click');
    assert.ok(body.variants.control);
    assert.ok(body.variants.treatment);
    assert.ok(body.variants.significance);
    assert.ok(typeof body.variants.significance.chiSquare === 'number');
    assert.ok(typeof body.variants.significance.pValue === 'number');
  });

  // 15. Rate limiter respects x-forwarded-for header
  await test('Rate limiter respects x-forwarded-for header', () => {
    const { handleAbtestRoutes } = require('./src/routes/abtest');
    const mockDb = { all: (q, p, cb) => cb(null, []), get: (q, p, cb) => cb(null, { total: 0 }), prepare: () => ({ run: () => {}, finalize: () => {} }) };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET', headers: { 'x-forwarded-for': '10.0.0.5, 192.168.1.1' } });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['X-RateLimit-Remaining'] !== undefined);
  });

  // 16. Confidence endpoint returns Wilson score intervals
  await test('Confidence endpoint returns Wilson score intervals', () => {
    const { handleAbtestRoutes } = require('./src/routes/abtest');
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [
            { testId: 't1', variant: 'control', event: 'click', count: 10, users: 100 },
            { testId: 't1', variant: 'treatment', event: 'click', count: 20, users: 100 },
          ]);
        } else {
          cb(null, []);
        }
      },
    };
    const req = mockRequest({ url: '/api/abtest/confidence?testId=t1&event=click', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.variants.control.confidence95);
    assert.ok(body.variants.treatment.confidence95);
    assert.ok(typeof body.variants.control.confidence95.lower === 'number');
    assert.ok(typeof body.variants.control.confidence95.upper === 'number');
  });

  // 17. Bayesian endpoint returns Beta posteriors and probabilities
  await test('Bayesian endpoint returns Beta posteriors and probabilities', () => {
    const { handleAbtestRoutes } = require('./src/routes/abtest');
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [
            { testId: 't1', variant: 'control', event: 'click', count: 10, users: 100 },
            { testId: 't1', variant: 'treatment', event: 'click', count: 20, users: 100 },
          ]);
        } else {
          cb(null, []);
        }
      },
    };
    const req = mockRequest({ url: '/api/abtest/bayesian?testId=t1&event=click', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.variants.control.posterior);
    assert.ok(body.variants.treatment.posterior);
    assert.ok(body.variants.probabilities);
    assert.ok(typeof body.variants.probabilities['treatment_vs_control'] === 'number');
  });

  // ── Edge Case Tests ──────────────────────────────────────────────────

  // 18. POST /api/abtest/event with invalid JSON returns 400
  await test('POST /api/abtest/event with invalid JSON returns 400', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = 'not-valid-json{';
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
  });

  // 19. POST /api/abtest/event with missing events array returns 400
  await test('POST /api/abtest/event with missing events array returns 400', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
  });

  // 20. POST /api/abtest/event with empty events array returns 200 (accepted 0)
  await test('POST /api/abtest/event with empty events array returns 200', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 0);
  });

  // 21. POST /api/abtest/event skips events with missing testId
  await test('POST /api/abtest/event skips events with missing testId', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [
      { variant: 'a', event: 'click', userId: 'u1' },
      { testId: 'valid', variant: 'b', event: 'click', userId: 'u2' },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  // 22. POST /api/abtest/event skips events with overly long testId
  await test('POST /api/abtest/event skips events with overly long testId', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const longId = 'x'.repeat(200);
    req._body = JSON.stringify({ events: [
      { testId: longId, variant: 'a', event: 'click', userId: 'u1' },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 0);
  });

  // 23. POST /api/abtest/config with missing variants returns 400
  await test('POST /api/abtest/config with missing variants returns 400', () => {
    const mockDb = { run: () => {} };
    const req = mockRequest({ url: '/api/abtest/config', method: 'POST' });
    req._body = JSON.stringify({ testId: 'bad-config' });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 400);
  });

  // 24. GET /api/abtest/significance with missing query params returns 400
  await test('GET /api/abtest/significance with missing query params returns 400', () => {
    const mockDb = { all: (q, p, cb) => cb(null, []) };
    const req = mockRequest({ url: '/api/abtest/significance', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.ok(body.error.includes('Missing testId'));
  });

  // 25. GET /api/abtest/confidence with only one variant returns 400
  await test('GET /api/abtest/confidence with only one variant returns 400', () => {
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [{ testId: 'solo', variant: 'control', event: 'click', count: 5, users: 50 }]);
        } else {
          cb(null, []);
        }
      },
    };
    const req = mockRequest({ url: '/api/abtest/confidence?testId=solo&event=click', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.ok(body.error.includes('only one variant'));
  });

  // 26. computeABStatsFromDB handles SQLite error gracefully
  await test('computeABStatsFromDB handles SQLite error gracefully', async () => {
    const mockDb = {
      all: (query, params, cb) => cb(new Error('SQLITE_CORRUPT: database disk image is malformed')),
    };
    try {
      await computeABStatsAsync(mockDb);
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err.message.includes('SQLITE_CORRUPT'));
    }
  });

  // 27. POST /api/abtest/event handles finalize error
  await test('POST /api/abtest/event handles finalize error', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(new Error('Finalize failed')),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [{ testId: 't1', variant: 'a', event: 'click', userId: 'u1' }] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 500);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.ok(body.error.includes('Finalize failed'));
  });

  // 28. GET /api/abtest/results handles DB error
  await test('GET /api/abtest/results handles DB error', () => {
    const mockDb = {
      all: (q, p, cb) => cb(new Error('DB connection lost')),
    };
    const req = mockRequest({ url: '/api/abtest/results', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 500);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.ok(body.error.includes('DB connection lost'));
  });

  // 29. GET /api/abtest/stats handles DB error
  await test('GET /api/abtest/stats handles DB error', () => {
    const mockDb = {
      get: (q, p, cb) => cb(new Error('DB error')),
    };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 500);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
  });

  // 30. POST /api/abtest/config with invalid JSON returns 400
  await test('POST /api/abtest/config with invalid JSON returns 400', () => {
    const mockDb = { run: () => {} };
    const req = mockRequest({ url: '/api/abtest/config', method: 'POST' });
    req._body = '{bad json';
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 400);
  });

  // ── Sanitization Tests ─────────────────────────────────────────────

  // 31. Event fields with special chars are accepted (escaped safely by SQLite)
  await test('Event fields with special characters are accepted', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [
      { testId: "test<script>alert(1)</script>", variant: "'; DROP TABLE--", event: "click&boom", userId: "u' OR '1'='1" },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  // 32. SQL injection string in testId is treated as literal, not executed
  await test('SQL injection in testId is treated as literal value', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const sqlInjection = "'; DROP TABLE abtest_events; --";
    req._body = JSON.stringify({ events: [
      { testId: sqlInjection, variant: 'a', event: 'impression', userId: 'u1' },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  // 33. Unicode and emoji in event fields are accepted
  await test('Unicode and emoji in event fields are accepted', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [
      { testId: 'test-🚀-unicode', variant: '変体', event: 'clic 🎯', userId: 'user_日本語_한국어' },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  // 34. Null bytes in event fields are accepted (SQLite-safe)
  await test('Null bytes in event fields are accepted', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [
      { testId: 'test\u0000null', variant: 'a', event: 'click', userId: 'u\u00001' },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  // 35. Config POST with special characters in testId and name
  await test('Config POST accepts special characters in name field', () => {
    const mockDb = {
      run: (q, p, cb) => cb(null),
    };
    const req = mockRequest({ url: '/api/abtest/config', method: 'POST' });
    req._body = JSON.stringify({
      testId: 'test-🚀',
      name: 'Test <script>alert(1)</script> & "quotes"',
      variants: ['control', 'variant_a'],
    });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
  });

  // 36. Event POST with deeply nested props is accepted
  await test('Event POST accepts deeply nested props', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const deepProps = { a: { b: { c: { d: { e: 'deep' } } } }, arr: [1, [2, [3]]] };
    req._body = JSON.stringify({ events: [
      { testId: 'deep-test', variant: 'a', event: 'click', userId: 'u1', props: deepProps },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  // 37. Event POST with extremely long event name (within limit) is accepted
  await test('Event POST with 100-char event name is accepted', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const longEvent = 'e'.repeat(100);
    req._body = JSON.stringify({ events: [
      { testId: 'limit-test', variant: 'a', event: longEvent, userId: 'u1' },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  // 38. Event POST with overly long event name is skipped
  await test('Event POST with 200-char event name is skipped', () => {
    const mockDb = {
      prepare: () => ({
        run: () => {},
        finalize: (cb) => cb(null),
      }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const tooLongEvent = 'e'.repeat(200);
    req._body = JSON.stringify({ events: [
      { testId: 'limit-test', variant: 'a', event: tooLongEvent, userId: 'u1' },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 0);
  });

  // ── Schema Validation Tests ────────────────────────────────────────

  // 39. Stats response schema validation
  await test('Stats response matches schema', () => {
    const mockDb = {
      get: (q, p, cb) => cb(null, { total: 42 }),
      all: (q, p, cb) => cb(null, [{ testId: 't1', events: 42 }]),
    };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    // Schema: { ok: boolean, totalEvents: number, tests: array, wsClients: number }
    assert.strictEqual(typeof body.ok, 'boolean');
    assert.strictEqual(typeof body.totalEvents, 'number');
    assert.ok(Array.isArray(body.tests));
    assert.strictEqual(typeof body.wsClients, 'number');
  });

  // 40. Results response schema validation
  await test('Results response matches schema', async () => {
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [{ testId: 't1', variant: 'a', event: 'click', count: 5, users: 10 }]);
        } else cb(null, []);
      },
    };
    const req = mockRequest({ url: '/api/abtest/results', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    // Schema: { ok: boolean, totalTests: number, results: object }
    assert.strictEqual(typeof body.ok, 'boolean');
    assert.strictEqual(typeof body.totalTests, 'number');
    assert.strictEqual(typeof body.results, 'object');
    assert.ok(body.results !== null);
  });

  // 41. Config GET response schema validation
  await test('Config GET response matches schema', () => {
    const mockDb = {
      all: (q, p, cb) => cb(null, [
        { testId: 't1', name: 'Test', variants: '["a","b"]', weights: '[0.5,0.5]', startDate: '2024-01-01', endDate: null, createdAt: '2024-01-01' },
      ]),
    };
    const req = mockRequest({ url: '/api/abtest/config', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    // Schema: { ok: boolean, configs: object }
    assert.strictEqual(typeof body.ok, 'boolean');
    assert.strictEqual(typeof body.configs, 'object');
    assert.ok(body.configs.t1);
    const cfg = body.configs.t1;
    assert.strictEqual(typeof cfg.name, 'string');
    assert.ok(Array.isArray(cfg.variants));
    assert.strictEqual(typeof cfg.startDate, 'string');
  });

  // 42. Export response schema validation
  await test('Export response matches schema', () => {
    const mockDb = {
      all: (q, p, cb) => cb(null, [
        { id: 1, testId: 't1', variant: 'a', event: 'click', ts: 1000, userId: 'u1', sessionId: '', props: '{}', receivedAt: 2000 },
      ]),
    };
    const req = mockRequest({ url: '/api/abtest/export', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    // Schema: { ok: boolean, count: number, data: array }
    assert.strictEqual(typeof body.ok, 'boolean');
    assert.strictEqual(typeof body.count, 'number');
    assert.ok(Array.isArray(body.data));
    const row = body.data[0];
    assert.strictEqual(typeof row.id, 'number');
    assert.strictEqual(typeof row.testId, 'string');
    assert.strictEqual(typeof row.variant, 'string');
    assert.strictEqual(typeof row.event, 'string');
    assert.strictEqual(typeof row.userId, 'string');
  });

  // 43. Significance response schema validation
  await test('Significance response matches schema', () => {
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [
            { testId: 't1', variant: 'control', event: 'click', count: 10, users: 100 },
            { testId: 't1', variant: 'treatment', event: 'click', count: 20, users: 100 },
          ]);
        } else cb(null, []);
      },
    };
    const req = mockRequest({ url: '/api/abtest/significance?testId=t1&event=click', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    // Schema: { ok: boolean, testId: string, event: string, variants: object with significance }
    assert.strictEqual(typeof body.ok, 'boolean');
    assert.strictEqual(typeof body.testId, 'string');
    assert.strictEqual(typeof body.event, 'string');
    assert.strictEqual(typeof body.variants, 'object');
    assert.ok(body.variants.significance);
    assert.strictEqual(typeof body.variants.significance.chiSquare, 'number');
    assert.strictEqual(typeof body.variants.significance.pValue, 'number');
    assert.strictEqual(typeof body.variants.significance.significant, 'boolean');
    assert.ok(Array.isArray(body.variants.significance.compared));
  });

  // 44. Confidence response schema validation
  await test('Confidence response matches schema', () => {
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [
            { testId: 't1', variant: 'control', event: 'click', count: 10, users: 100 },
            { testId: 't1', variant: 'treatment', event: 'click', count: 20, users: 100 },
          ]);
        } else cb(null, []);
      },
    };
    const req = mockRequest({ url: '/api/abtest/confidence?testId=t1&event=click', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    // Schema: variants.{name}.confidence95: { lower: number, upper: number, point: number }
    const v = body.variants.control;
    assert.ok(v.confidence95);
    assert.strictEqual(typeof v.confidence95.lower, 'number');
    assert.strictEqual(typeof v.confidence95.upper, 'number');
    assert.strictEqual(typeof v.confidence95.point, 'number');
    assert.ok(v.confidence95.lower >= 0 && v.confidence95.lower <= 1);
    assert.ok(v.confidence95.upper >= 0 && v.confidence95.upper <= 1);
  });

  // 45. Bayesian response schema validation
  await test('Bayesian response matches schema', () => {
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [
            { testId: 't1', variant: 'control', event: 'click', count: 10, users: 100 },
            { testId: 't1', variant: 'treatment', event: 'click', count: 20, users: 100 },
          ]);
        } else cb(null, []);
      },
    };
    const req = mockRequest({ url: '/api/abtest/bayesian?testId=t1&event=click', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    // Schema: variants.{name}.posterior: { alpha: number, beta: number, mean: number, variance: number }
    const v = body.variants.control;
    assert.ok(v.posterior);
    assert.strictEqual(typeof v.posterior.alpha, 'number');
    assert.strictEqual(typeof v.posterior.beta, 'number');
    assert.strictEqual(typeof v.posterior.mean, 'number');
    assert.ok(v.posterior.mean >= 0 && v.posterior.mean <= 1);
    assert.ok(body.variants.probabilities);
    const probs = body.variants.probabilities;
    for (const key of Object.keys(probs)) {
      assert.ok(probs[key] >= 0 && probs[key] <= 1, `Probability ${key}=${probs[key]} out of range`);
    }
  });

  // 46. Error response schema validation
  await test('Error response matches schema', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = 'not-valid';
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    // Error schema: { ok: false, error: string }
    assert.strictEqual(body.ok, false);
    assert.strictEqual(typeof body.error, 'string');
    assert.ok(body.error.length > 0);
  });

  // 47. Rate limit headers schema validation
  await test('Rate limit headers are set on successful requests', () => {
    const mockDb = {
      get: (q, p, cb) => cb(null, { total: 0 }),
      all: (q, p, cb) => cb(null, []),
    };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET', headers: { 'x-forwarded-for': '10.0.0.99' } });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    // Headers schema: X-RateLimit-Remaining should be present and numeric
    assert.ok(res.headers['X-RateLimit-Remaining'] !== undefined);
    const remaining = parseInt(res.headers['X-RateLimit-Remaining'], 10);
    assert.ok(remaining >= 0);
  });

  // 48. Rate limited response schema validation
  await test('Rate limited response has correct headers and body', () => {
    const { handleAbtestRoutes, checkAbtestRateLimit } = require('./src/routes/abtest');
    const mockDb = {};
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET', headers: { 'x-forwarded-for': '10.0.0.88' } });
    // Exhaust limit
    for (let i = 0; i < 61; i++) checkAbtestRateLimit('10.0.0.88');
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    // Schema: status 429, Retry-After header, body: { error: string, retryAfter: number }
    assert.strictEqual(res.statusCode, 429);
    assert.ok(res.headers['Retry-After'] !== undefined);
    const retryAfter = parseInt(res.headers['Retry-After'], 10);
    assert.ok(retryAfter > 0);
  });

  console.log('\n📊 Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}
runTests();
