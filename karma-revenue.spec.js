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

function createDeps(mockDb, extraConfig) {
  return { db: mockDb, logRequest: () => {}, metrics: { activeConnections: 1 }, config: extraConfig || {} };
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
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb(), { modules: { leadHunter: { enabled: true } } }));
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

  // ════════════════════════════════════════════════════════════════════════════
  // v2 Tests — Content Arbitrage Bot
  // ════════════════════════════════════════════════════════════════════════════

  // ── 14. Lead Hunter status endpoint ────────────────────────────────────────
  await test('Lead Hunter status returns stats', async () => {
    const req = mockRequest({ url: '/api/revenue/lead-hunter/status', method: 'GET' });
    const res = mockResponse();
    const db = makeMockDb([{ total: 42 }]);
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(db));
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 30));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(typeof body.status === 'object');
    assert.ok(typeof body.status.totalLeads === 'number');
    assert.ok(typeof body.status.hotLeads === 'number');
    assert.ok(typeof body.status.emailsSentToday === 'number');
  });

  // ── 15. Content Bot cycle endpoint ─────────────────────────────────────────
  await test('Content Bot cycle returns summary', async () => {
    const req = mockRequest({ url: '/api/revenue/content-bot/cycle', method: 'POST' });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb(), { modules: { contentBot: { enabled: true } } }));
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(typeof body.cycle === 'object');
    assert.ok(typeof body.cycle.trendsScraped === 'number');
    assert.ok(typeof body.cycle.postsGenerated === 'number');
    assert.ok(typeof body.cycle.postsPublished === 'number');
    assert.ok(Array.isArray(body.cycle.posts));
  });

  // ── 16. Content Bot posts list ─────────────────────────────────────────────
  await test('Content Bot posts list returns posts array', async () => {
    const req = mockRequest({ url: '/api/revenue/content-bot/posts?limit=5', method: 'GET' });
    const res = mockResponse();
    const db = makeMockDb([
      { id: 'cb-1', platform: 'twitter', niche: 'ai', topic: 'GPT-5', content: 'Hello world', engagement: 120, status: 'published', postedAt: Date.now() }
    ]);
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(db));
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.posts));
    assert.ok(body.posts.length >= 0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // v2 Tests — Stripe Monetization
  // ════════════════════════════════════════════════════════════════════════════

  // Mock global.fetch for Stripe tests
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ id: 'cs_test_123', url: 'https://checkout.stripe.com/test' }),
  });

  await test('Stripe checkout creates session URL', async () => {
    const req = mockRequest({
      url: '/api/revenue/stripe/checkout',
      method: 'POST',
      body: JSON.stringify({ lineItems: [{ price: 'price_123', quantity: 1 }], metadata: { plan: 'pro' } })
    });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb(), { stripeSecretKey: 'sk_test_xxx', stripeWebhookSecret: 'whsec_xxx' }));
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 30));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(typeof body.url === 'string');
    assert.ok(body.url.includes('checkout.stripe.com'));
  });

  // ── 18. Stripe webhook processes payment event ─────────────────────────────
  await test('Stripe webhook processes payment event', async () => {
    const req = mockRequest({
      url: '/api/revenue/stripe/webhook',
      method: 'POST',
      body: JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_123', amount_total: 4900, currency: 'usd', customer_email: 'test@example.com' } } }),
      headers: { 'stripe-signature': 'sig_test_123' }
    });
    const res = mockResponse();
    const result = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb(), { stripeWebhookSecret: 'whsec_xxx' }));
    assert.strictEqual(result, true);
    await new Promise(r => setTimeout(r, 30));
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.ok === true);
  });


  // ════════════════════════════════════════════════════════════════════════════
  // Scheduler Tests
  // ════════════════════════════════════════════════════════════════════════════

  const { startScheduler, stopScheduler, getSchedulerStatus, DEFAULT_SCHEDULES } = require('./src/scheduler');

  // ── 19. Scheduler starts successfully ──────────────────────────────────────
  await test('Scheduler starts Lead Hunter and Content Bot', async () => {
    const result = startScheduler(makeMockDb(), { timezone: 'UTC' });
    assert.strictEqual(result.started, true);
    assert.ok(Array.isArray(result.tasks));
    assert.ok(result.tasks.includes('leadHunter'));
    assert.ok(result.tasks.includes('contentBot'));
    stopScheduler();
  });

  // ── 20. Scheduler returns already-running on second start ──────────────────
  await test('Scheduler prevents double start', async () => {
    startScheduler(makeMockDb(), { timezone: 'UTC' });
    const result2 = startScheduler(makeMockDb(), { timezone: 'UTC' });
    assert.strictEqual(result2.started, false);
    assert.strictEqual(result2.reason, 'Already running');
    stopScheduler();
  });

  // ── 21. Scheduler status returns correct shape ─────────────────────────────
  await test('Scheduler status returns running state', async () => {
    startScheduler(makeMockDb(), { timezone: 'UTC' });
    const status = getSchedulerStatus();
    assert.strictEqual(status.running, true);
    assert.ok(Array.isArray(status.tasks));
    assert.ok(typeof status.schedules === 'object');
    stopScheduler();
  });

  // ── 22. Scheduler stop clears tasks ────────────────────────────────────────
  await test('Scheduler stop clears all tasks', async () => {
    startScheduler(makeMockDb(), { timezone: 'UTC' });
    const before = getSchedulerStatus();
    assert.strictEqual(before.running, true);
    stopScheduler();
    const after = getSchedulerStatus();
    assert.strictEqual(after.running, false);
    assert.strictEqual(after.tasks.length, 0);
  });

  global.fetch = originalFetch;

  console.log('\n📊 Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

runTests();
