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

// ── Tests ──────────────────────────────────────────────────────────────
async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
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
  test('computeABStatsFromDB returns empty results for empty DB', () => {
    const mockDb = {
      all: (query, params, cb) => {
        if (query.includes('GROUP BY')) cb(null, []);
        else cb(null, []);
      }
    };
    computeABStatsFromDB(mockDb, (err, stats) => {
      assert.strictEqual(err, null);
      assert.deepStrictEqual(stats, {});
    });
  });

  // 2. computeABStatsFromDB correctly aggregates events
  test('computeABStatsFromDB aggregates events and computes CTR', () => {
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
    computeABStatsFromDB(mockDb, (err, stats) => {
      assert.strictEqual(err, null);
      assert.strictEqual(stats.t1.control.events.impression, 100);
      assert.strictEqual(stats.t1.control.events.click, 10);
      assert.strictEqual(stats.t1.control.ctr, '10.00%');
      assert.strictEqual(stats.t1.control.revenue, 8.49);
    });
  });

  // 3. handleAbtestRoutes returns false for non-matching URLs
  test('handleAbtestRoutes returns false for non-AB-test URLs', () => {
    const req = mockRequest({ url: '/metrics', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps());
    assert.strictEqual(result, false);
    assert.strictEqual(res.ended, false);
  });

  // 4. handleAbtestRoutes handles /api/abtest/stats
  test('handleAbtestRoutes handles /api/abtest/stats', () => {
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
  test('handleAbtestRoutes handles /api/abtest/reset', () => {
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
  test('handleAbtestRoutes handles /api/abtest/export', () => {
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
  test('handleAbtestRoutes handles /api/abtest/config GET', () => {
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
  test('handleAbtestRoutes handles /api/abtest/config POST', () => {
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
  test('handleAbtestRoutes handles /api/abtest/event POST', () => {
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
  test('computeABStatsFromDB handles malformed props gracefully', () => {
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
    computeABStatsFromDB(mockDb, (err, stats) => {
      assert.strictEqual(err, null);
      assert.strictEqual(stats.t1.control.revenue, 10);
    });
  });


  // 11. Rate limiter allows requests under threshold
  test('Rate limiter allows requests under threshold', () => {
    const { checkAbtestRateLimit } = require('./src/routes/abtest');
    const result = checkAbtestRateLimit('10.0.0.1');
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.remaining, 59);
  });

  // 12. Rate limiter blocks requests over threshold
  test('Rate limiter blocks requests over threshold', () => {
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
  });

  // 14. Significance endpoint returns chi-square and p-value
  test('Significance endpoint returns chi-square and p-value', () => {
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

  console.log('\n📊 Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

runTests();
