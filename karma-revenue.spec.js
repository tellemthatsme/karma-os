const assert = require('assert');

function mockRequest(opts = {}) {
  const handlers = {};
  const req = {
    url: opts.url || '/',
    method: opts.method || 'GET',
    headers: opts.headers || {},
    on: (event, cb) => {
      handlers[event] = cb;
      if (event === 'end') {
        // Auto-fire end on next tick for GET; fire after data for POST with body
        if (req.method === 'GET' || !opts.body) {
          process.nextTick(() => cb());
        }
      }
      if (event === 'data' && opts.body) {
        process.nextTick(() => {
          cb(Buffer.from(opts.body));
          if (handlers.end) handlers.end();
        });
      }
    },
  };
  return req;
}

function mockResponse() {
  const res = { statusCode: 200, headers: {}, body: '' };
  res.writeHead = (code, hdrs) => { res.statusCode = code; if (hdrs) Object.assign(res.headers, hdrs); };
  res.end = (data) => { res.body = data; };
  return res;
}

function createDeps(mockDb) {
  return { db: mockDb, logRequest: () => {}, metrics: { activeConnections: 1 }, config: {} };
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name); console.log('    ' + e.message); }
}

function makeMockDb(rows) {
  return {
    run: () => {},
    all: (sql, params, cb) => { if (typeof cb === 'function') cb(null, rows || []); else return rows || []; },
    get: (sql, params, cb) => { if (typeof cb === 'function') cb(null, (rows || [])[0] || null); else return (rows || [])[0] || null; },
    prepare: () => ({ run: () => {}, finalize: () => {} }),
  };
}

async function runTests() {
  console.log('\n🔥 KARMA Revenue Engine Tests');
  console.log('================================\n');

  const { handleRevenueRoutes, MODULES, DEFAULT_GUARDRAILS, checkGuardrails } = require('./src/routes/revenue');

  // ── 1. Dashboard endpoint ──────────────────────────────────────────────────
  await test('Dashboard returns revenue stats', async () => {
    const req = mockRequest({ url: '/api/revenue/dashboard', method: 'GET' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
    assert.strictEqual(result, true);
    // Wait for nested DB callbacks
    await new Promise(r => setTimeout(r, 30));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.modules));
    assert.ok(typeof body.guardrails === 'object');
    assert.ok(typeof body.stats === 'object');
  });

  // ── 2. Modules list ────────────────────────────────────────────────────────
  await test('Modules list returns all modules', () => {
    const req = mockRequest({ url: '/api/revenue/modules', method: 'GET' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.modules));
    assert.ok(body.modules.length >= 3);
  });

  // ── 3. Guardrails endpoint ─────────────────────────────────────────────────
  await test('Guardrails returns default limits', async () => {
    const req = mockRequest({ url: '/api/revenue/guardrails', method: 'GET' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(typeof body.guardrails.maxDailySpend === 'number');
    assert.ok(typeof body.guardrails.maxDailyEmails === 'number');
    assert.ok(typeof body.guardrails.minMarginPercent === 'number');
    assert.ok(typeof body.guardrails.riskLevel === 'string');
  });

  // ── 4. Decisions list ──────────────────────────────────────────────────────
  await test('Decisions list returns array', async () => {
    const req = mockRequest({ url: '/api/revenue/decisions', method: 'GET' });
    const res = mockResponse();
    const db = makeMockDb([
      { id: 1, ts: Date.now(), module: 'leadHunter', action: 'send_email', approved: 1, payload: '{}' }
    ]);
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(db));
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.decisions));
  });

  // ── 5. Notifications endpoint (mock) ───────────────────────────────────────
  await test('Notifications endpoint sends test notification', async () => {
    const req = mockRequest({ url: '/api/revenue/notify?msg=hello', method: 'GET' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.message.includes('sent') || body.message.includes('mock'));
  });

  // ── 6. Lead Hunter cycle endpoint ──────────────────────────────────────────
  await test('Lead Hunter cycle returns summary', async () => {
    const req = mockRequest({ url: '/api/revenue/lead-hunter/cycle', method: 'POST' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), { ...createDeps(makeMockDb()), config: { modules: { leadHunter: { enabled: true } } } });
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(typeof body.cycle === 'object');
    assert.ok(typeof body.cycle.signalsFound === 'number');
    assert.ok(typeof body.cycle.leadsEnriched === 'number');
    assert.ok(typeof body.cycle.emailsSent === 'number');
    assert.ok(Array.isArray(body.cycle.leads));
  });

  // ── 7. Outreach list ───────────────────────────────────────────────────────
  await test('Outreach list returns leads array', async () => {
    const req = mockRequest({ url: '/api/revenue/outreach?limit=5', method: 'GET' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.leads));
  });

  // ── 8. Lead Hunter manual trigger ──────────────────────────────────────────
  await test('Lead Hunter trigger returns queued status', () => {
    const req = mockRequest({ url: '/api/revenue/lead-hunter/trigger', method: 'POST' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.status, 'queued');
  });

  // ── 9. Scheduler state ─────────────────────────────────────────────────────
  await test('Scheduler state returns enabled modules', () => {
    const req = mockRequest({ url: '/api/revenue/scheduler', method: 'GET' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.enabledModules));
  });

  // ── 10. Module toggle ──────────────────────────────────────────────────────
  await test('Module toggle returns updated status', () => {
    const req = mockRequest({ url: '/api/revenue/modules/leadHunter/toggle', method: 'POST' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(typeof body.module === 'object');
    assert.ok(typeof body.module.enabled === 'boolean');
  });

  // ── 11. Revenue engine route not found ─────────────────────────────────────
  await test('Unmatched revenue route returns false', () => {
    const req = mockRequest({ url: '/api/revenue/nonexistent', method: 'GET' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
    assert.strictEqual(result, false);
  });

  // ── 12. Guardrails engine blocks excessive spend ───────────────────────────
  await test('Guardrails blocks excessive spend', () => {
    const ctx = { todaySpend: 150, todayEmails: 10, todayTrades: 2, pendingChoices: 0 };
    const result = checkGuardrails(ctx, { maxDailySpend: 100 });
    assert.strictEqual(result.approved, false);
    assert.ok(result.violations.some(v => v.includes('spend')));
  });

  // ── 13. Guardrails allows within limits ────────────────────────────────────
  await test('Guardrails allows within limits', () => {
    const ctx = { todaySpend: 10, todayEmails: 5, todayTrades: 1, pendingChoices: 0 };
    const result = checkGuardrails(ctx, DEFAULT_GUARDRAILS);
    assert.strictEqual(result.approved, true);
    assert.strictEqual(result.violations.length, 0);
  });

  console.log('\n📊 Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

runTests();
