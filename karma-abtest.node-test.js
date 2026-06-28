// karma-abtest.node-test.js — A/B Test Routes using Node.js built-in test runner
// Run with: node --test karma-abtest.node-test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
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

// ── Promise wrapper ──────────────────────────────────────────────────
function computeABStatsAsync(db) {
  return new Promise((resolve, reject) => {
    computeABStatsFromDB(db, (err, stats) => {
      if (err) reject(err);
      else resolve(stats);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════════════

describe('computeABStatsFromDB', () => {
  it('returns empty results for empty DB', async () => {
    const mockDb = {
      all: (query, params, cb) => {
        if (query.includes('GROUP BY')) cb(null, []);
        else cb(null, []);
      }
    };
    const stats = await computeABStatsAsync(mockDb);
    assert.deepStrictEqual(stats, {});
  });

  it('aggregates events and computes CTR', async () => {
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

  it('handles malformed props gracefully', async () => {
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

  it('handles SQLite error gracefully', async () => {
    const mockDb = {
      all: (query, params, cb) => cb(new Error('SQLITE_CORRUPT: database disk image is malformed')),
    };
    await assert.rejects(
      () => computeABStatsAsync(mockDb),
      /SQLITE_CORRUPT/
    );
  });
});

describe('handleAbtestRoutes — routing', () => {
  it('returns false for non-AB-test URLs', () => {
    const req = mockRequest({ url: '/metrics', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps());
    assert.strictEqual(result, false);
    assert.strictEqual(res.ended, false);
  });
});

describe('GET /api/abtest/stats', () => {
  it('returns stats with totalEvents, tests, wsClients', () => {
    const mockDb = {
      get: (q, p, cb) => cb(null, { total: 42 }),
      all: (q, p, cb) => cb(null, [{ testId: 't1', events: 42 }]),
    };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), { ...createDeps(mockDb), wsClients: new Set(['a', 'b']) });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.totalEvents, 42);
    assert.strictEqual(body.wsClients, 2);
  });

  it('handles DB error with 500', () => {
    const mockDb = { get: (q, p, cb) => cb(new Error('DB error')) };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 500);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
  });
});

describe('POST /api/abtest/reset', () => {
  it('clears data and broadcasts reset', () => {
    const mockDb = { run: (q, p, cb) => cb(null) };
    const req = mockRequest({ url: '/api/abtest/reset', method: 'POST' });
    const res = mockResponse();
    resetMocks();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(mockBroadcastCalls.length, 1);
    assert.strictEqual(mockBroadcastCalls[0].type, 'reset');
  });
});

describe('GET /api/abtest/export', () => {
  it('returns events with parsed props', () => {
    const mockDb = {
      all: (q, p, cb) => cb(null, [
        { id: 1, testId: 't1', variant: 'control', event: 'click', props: '{"revenue":5}', ts: 1000, userId: 'u1', sessionId: '', receivedAt: 2000 },
      ]),
    };
    const req = mockRequest({ url: '/api/abtest/export', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.count, 1);
    assert.deepStrictEqual(body.data[0].props, { revenue: 5 });
  });
});

describe('GET /api/abtest/config', () => {
  it('returns parsed configs', () => {
    const mockDb = {
      all: (q, p, cb) => cb(null, [
        { testId: 't1', name: 'Test 1', variants: '["control","a"]', weights: '[0.5,0.5]', startDate: '2024-01-01', endDate: null, createdAt: '2024-01-01' },
      ]),
    };
    const req = mockRequest({ url: '/api/abtest/config', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.deepStrictEqual(body.configs.t1.variants, ['control', 'a']);
  });
});

describe('POST /api/abtest/config', () => {
  it('creates a config', () => {
    const mockDb = { run: (q, p, cb) => cb(null) };
    const req = mockRequest({ url: '/api/abtest/config', method: 'POST' });
    req._body = JSON.stringify({ testId: 'new', name: 'New', variants: ['control', 'v1'] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.testId, 'new');
  });

  it('returns 400 with missing variants', () => {
    const mockDb = { run: () => {} };
    const req = mockRequest({ url: '/api/abtest/config', method: 'POST' });
    req._body = JSON.stringify({ testId: 'bad-config' });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 400);
  });

  it('returns 400 with invalid JSON', () => {
    const mockDb = { run: () => {} };
    const req = mockRequest({ url: '/api/abtest/config', method: 'POST' });
    req._body = '{bad json';
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 400);
  });
});

describe('POST /api/abtest/event', () => {
  it('accepts valid events', () => {
    const mockDb = {
      prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }),
    };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [{ testId: 't1', variant: 'control', event: 'click', userId: 'u1' }] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  it('returns 400 with invalid JSON', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = 'not-valid-json{';
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
  });

  it('returns 400 with missing events array', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
  });

  it('accepts empty events array (accepted 0)', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 0);
  });

  it('skips events with missing testId', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
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
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  it('skips events with overly long testId', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const longId = 'x'.repeat(200);
    req._body = JSON.stringify({ events: [{ testId: longId, variant: 'a', event: 'click', userId: 'u1' }] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 0);
  });

  it('handles finalize error with 500', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(new Error('Finalize failed')) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [{ testId: 't1', variant: 'a', event: 'click', userId: 'u1' }] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 500);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.ok(body.error.includes('Finalize failed'));
  });
});

describe('GET /api/abtest/results', () => {
  it('handles DB error with 500', () => {
    const mockDb = { all: (q, p, cb) => cb(new Error('DB connection lost')) };
    const req = mockRequest({ url: '/api/abtest/results', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 500);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, false);
    assert.ok(body.error.includes('DB connection lost'));
  });
});

describe('GET /api/abtest/significance', () => {
  it('returns chi-square and p-value', () => {
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
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.testId, 't1');
    assert.strictEqual(body.event, 'click');
    assert.ok(body.variants.significance);
    assert.ok(typeof body.variants.significance.chiSquare === 'number');
    assert.ok(typeof body.variants.significance.pValue === 'number');
  });

  it('returns 400 with missing query params', () => {
    const mockDb = { all: (q, p, cb) => cb(null, []) };
    const req = mockRequest({ url: '/api/abtest/significance', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 400);
  });
});

describe('GET /api/abtest/confidence', () => {
  it('returns Wilson score intervals', () => {
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
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.variants.control.confidence95);
    assert.ok(typeof body.variants.control.confidence95.lower === 'number');
  });

  it('returns 400 with only one variant', () => {
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [{ testId: 'solo', variant: 'control', event: 'click', count: 5, users: 50 }]);
        } else cb(null, []);
      },
    };
    const req = mockRequest({ url: '/api/abtest/confidence?testId=solo&event=click', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 400);
  });
});

describe('GET /api/abtest/bayesian', () => {
  it('returns Beta posteriors and probabilities', () => {
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
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.variants.control.posterior);
    assert.ok(body.variants.probabilities);
    assert.ok(typeof body.variants.probabilities['treatment_vs_control'] === 'number');
  });
});

describe('Rate limiter', { concurrency: false }, () => {
  const { checkAbtestRateLimit } = require('./src/routes/abtest');

  it('allows requests under threshold', () => {
    const result = checkAbtestRateLimit('10.0.0.1');
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.remaining, 59);
  });

  it('blocks requests over threshold', () => {
    for (let i = 0; i < 60; i++) checkAbtestRateLimit('10.0.0.2');
    const result = checkAbtestRateLimit('10.0.0.2');
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.remaining, 0);
    assert.ok(result.retryAfter > 0);
  });

  it('returns 429 when rate limited', () => {
    const mockDb = {};
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const res = mockResponse();
    // Exhaust exactly 60 — handler's own rate check is the 61st and first blocked
    for (let i = 0; i < 60; i++) checkAbtestRateLimit('10.0.0.3');
    req.connection.remoteAddress = '10.0.0.3';
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 429);
  });

  it('respects x-forwarded-for header', () => {
    const mockDb = { all: (q, p, cb) => cb(null, []), get: (q, p, cb) => cb(null, { total: 0 }) };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET', headers: { 'x-forwarded-for': '10.0.0.5, 192.168.1.1' } });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['X-RateLimit-Remaining'] !== undefined);
  });
});

describe('Sanitization', () => {
  it('accepts special characters (XSS, SQL strings)', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
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
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  it('treats SQL injection as literal value', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const sqlInjection = "'; DROP TABLE abtest_events; --";
    req._body = JSON.stringify({ events: [{ testId: sqlInjection, variant: 'a', event: 'impression', userId: 'u1' }] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  it('accepts Unicode and emoji', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [
      { testId: 'test-\u{1F680}-unicode', variant: '\u5909\u4F53', event: 'clic \uD83C\uDFAF', userId: 'user_\u65E5\u672C\u8A9E_\uD55C\uAD6D\uC5B4' },
    ]});
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  it('accepts deeply nested props', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const deepProps = { a: { b: { c: { d: { e: 'deep' } } } }, arr: [1, [2, [3]]] };
    req._body = JSON.stringify({ events: [{ testId: 'deep-test', variant: 'a', event: 'click', userId: 'u1', props: deepProps }] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  it('accepts 100-char event name (at limit)', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [{ testId: 'limit-test', variant: 'a', event: 'e'.repeat(100), userId: 'u1' }] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  it('accepts null bytes in event fields', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
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
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 1);
  });

  it('config POST accepts XSS and quote characters in name', () => {
    const mockDb = { run: (q, p, cb) => cb(null) };
    const req = mockRequest({ url: '/api/abtest/config', method: 'POST' });
    req._body = JSON.stringify({
      testId: 'test-xss',
      name: 'Test <script>alert(1)</script> & "quotes"',
      variants: ['control', 'variant_a'],
    });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
  });

  it('skips 200-char event name (over limit)', () => {
    const mockDb = { prepare: () => ({ run: () => {}, finalize: (cb) => cb(null) }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    req._body = JSON.stringify({ events: [{ testId: 'limit-test', variant: 'a', event: 'e'.repeat(200), userId: 'u1' }] });
    const res = mockResponse();
    req.on = (event, handler) => {
      if (event === 'data') handler(Buffer.from(req._body));
      if (event === 'end') handler();
    };
    resetMocks();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 0);
  });
});

describe('Schema validation', () => {
  it('Confidence intervals are within [0,1] range', () => {
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
    const ci = body.variants.control.confidence95;
    assert.ok(ci.lower >= 0 && ci.lower <= 1, `lower ${ci.lower} out of [0,1]`);
    assert.ok(ci.upper >= 0 && ci.upper <= 1, `upper ${ci.upper} out of [0,1]`);
    assert.ok(ci.point >= 0 && ci.point <= 1, `point ${ci.point} out of [0,1]`);
  });

  it('Bayesian posterior probabilities are within [0,1]', () => {
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
    const mean = body.variants.control.posterior.mean;
    assert.ok(mean >= 0 && mean <= 1, `posterior mean ${mean} out of [0,1]`);
    for (const key of Object.keys(body.variants.probabilities)) {
      const prob = body.variants.probabilities[key];
      assert.ok(prob >= 0 && prob <= 1, `probability ${key}=${prob} out of [0,1]`);
    }
  });

  it('Stats response has correct types', () => {
    const mockDb = {
      get: (q, p, cb) => cb(null, { total: 42 }),
      all: (q, p, cb) => cb(null, [{ testId: 't1', events: 42 }]),
    };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET' });
    const res = mockResponse();
    handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    const body = JSON.parse(res.body);
    assert.strictEqual(typeof body.ok, 'boolean');
    assert.strictEqual(typeof body.totalEvents, 'number');
    assert.ok(Array.isArray(body.tests));
    assert.strictEqual(typeof body.wsClients, 'number');
  });

  it('Significance response has correct types', () => {
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
    assert.strictEqual(typeof body.ok, 'boolean');
    assert.strictEqual(typeof body.testId, 'string');
    assert.ok(body.variants.significance);
    assert.strictEqual(typeof body.variants.significance.chiSquare, 'number');
    assert.strictEqual(typeof body.variants.significance.pValue, 'number');
    assert.strictEqual(typeof body.variants.significance.significant, 'boolean');
  });

  it('Error response has ok=false and error string', () => {
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
    assert.strictEqual(body.ok, false);
    assert.strictEqual(typeof body.error, 'string');
    assert.ok(body.error.length > 0);
  });
});
