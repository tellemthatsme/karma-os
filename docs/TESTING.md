# Testing Guide

> Test suite: `karma-revenue.spec.js` (23 tests) · Runner: `node karma-revenue.spec.js`

The Revenue Engine has a custom zero-dependency test runner — no Mocha, no Jest, just Node's `assert` module + an async array runner.

---

## Quick Start

```bash
$ node karma-revenue.spec.js

✅ Test 1: ...
✅ Test 2: ...
...

📊 Results: 23 passed, 0 failed
```

Zero exit code = all passing. Non-zero = at least one failure.

---

## Test Suite Breakdown

### Status & Decisions (7 tests)

| # | Test | What it verifies |
|---|------|------------------|
| 1 | Guardrails default shape | `DEFAULT_GUARDRAILS` has all 4 fields |
| 2 | Guardrails OK when within limits | `checkGuardrails` returns `{ ok: true }` |
| 3 | Guardrails reject over daily emails | `checkGuardrails` returns `{ ok: false, reason: 'maxDailyEmails' }` |
| 4 | Guardrails reject low margin | `checkGuardrails` returns `{ ok: false, reason: 'minMarginPercent' }` |
| 5 | `/api/revenue/status` returns aggregate | status returns `{ ok, stats, modules, guardrails }` |
| 6 | `/api/revenue/decisions` returns log | decisions endpoint returns rows |
| 7 | `/api/revenue/lead-hunter/status` runs today | LH returns last-run metadata |

### Lead Hunter (4 tests)

| # | Test | What it verifies |
|---|------|------------------|
| 8 | `runLeadHunterCycle` skips when disabled | calls return `{ ran: false, reason: 'disabled' }` |
| 9 | `scrapeSignals` returns signals array | signals have `source`, `niche`, `url` |
| 10 | `enrichLead` adds score + company | enrich returns lead with score ≥ 0 |
| 11 | `writeColdEmail` renders template | email body includes lead name + niche |

### Content Bot (3 tests)

| # | Test | What it verifies |
|---|------|------------------|
| 12 | `scrapeTrends` returns trends | trends have `topic`, `score`, `source` |
| 13 | `generateContent` formats post | content has body, hashtag |
| 14 | `/api/revenue/content-bot/posts` returns list | endpoint returns posts array, no crash |

### Stripe (4 tests)

| # | Test | What it verifies |
|---|------|------------------|
| 15 | Checkout creates session | `createCheckoutSession` returns `{ id, url }` (with mocked fetch) |
| 16 | Webhook processes event | `handleStripeWebhook` inserts row, returns `{ ok }` |
| 17 | Webhook rejects bad signature | bad sig returns error, no row written |
| 18 | Verify endpoint confirms session | `/api/revenue/stripe/verify?session_id=cs_test_123` returns verified=true |

### Scheduler (4 tests)

| # | Test | What it verifies |
|---|------|------------------|
| 19 | Scheduler starts Lead Hunter + Content Bot | `startScheduler` returns `{ started, tasks }` |
| 20 | Scheduler prevents double start | second `startScheduler` returns `{ started: false, reason: 'Already running' }` |
| 21 | Scheduler status endpoint returns state | `/api/scheduler/status` returns `{ running, tasks, schedules }` |
| 22 | Scheduler stop clears tasks | after `stopScheduler`, `tasks` empty, `running: false` |

### HTTP routing (1 test)

| # | Test | What it verifies |
|---|------|------------------|
| 23 | Unknown URL returns handled=false | unmatched routes return `false` so next handler in chain runs |

---

## Mocking Patterns

### Database

```js
function makeMockDb() {
  const calls = [];
  return {
    calls,  // exposed for assertions
    get: (sql, params, cb) => {
      calls.push(['get', sql, params]);
      if (typeof cb === 'function') cb(null, { /* fake row */ });
      else return Promise.resolve({ /* fake row */ });
    },
    run: (sql, params, cb) => {
      calls.push(['run', sql, params]);
      if (typeof cb === 'function') cb(null);
      else return Promise.resolve();
    },
    all: (sql, params, cb) => {
      calls.push(['all', sql, params]);
      if (typeof cb === 'function') cb(null, [/* fake rows */]);
      else return Promise.resolve([/* fake rows */]);
    },
  };
}
```

`db.calls` is asserted against to verify SQL was issued:
```js
assert.ok(db.calls.some(c => c[1].includes('INSERT INTO decisions')));
```

### HTTP

```js
function mockRequest(opts = {}) {
  const req = {
    url: opts.url || '/',
    method: opts.method || 'GET',
    headers: opts.headers || {},
    body: opts.body,
    on: (event, cb) => {
      if (event === 'data' && req.body) process.nextTick(() => cb(Buffer.from(req.body)));
      if (event === 'end') process.nextTick(() => cb());
    },
  };
  return req;
}

function mockResponse() {
  const res = { statusCode: 200, headers: {}, body: '' };
  res.writeHead = (code, hdrs) => {
    res.statusCode = code;
    if (hdrs) Object.assign(res.headers, hdrs);
  };
  res.end = (chunk) => { if (chunk) res.body += chunk; };
  return res;
}
```

### global.fetch (Stripe isolation)

```js
const originalFetch = global.fetch;
global.fetch = async () => ({
  ok: true,
  json: async () => ({ id: 'cs_test_123', url: 'https://checkout.stripe.com/test' }),
});

// ... Stripe tests ...

global.fetch = originalFetch;  // restored at end
```

### Scheduler cleanup

```js
before('start scheduler', () => { /* ... */ });
after('stop scheduler', () => { stopScheduler(); });

// Or per-test:
it('test', () => {
  startScheduler(mockDb, { timezone: 'UTC' });
  try { /* assertions */ } finally { stopScheduler(); }
});
```

---

## How to Add a Test

1. Open `karma-revenue.spec.js`.
2. Find the next test number (`// ── 24. <name> ─────...`).
3. Add:

```js
await test('Does the thing', async () => {
  const req = mockRequest({ url: '/api/...', method: 'GET' });
  const res = mockResponse();
  const handled = handleRevenueRoutes(req, res, Date.now(), createDeps(makeMockDb()));
  assert.strictEqual(handled, true);
  assert.strictEqual(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.ok, true);
});
```

4. Run: `node karma-revenue.spec.js`.

---

## Continuous Integration

Add to `.github/workflows/test.yml`:

```yaml
name: tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node karma-revenue.spec.js
      - run: node karma-abtest.spec.js
```

Node's built-in test runner exits non-zero on any failure — works in CI without flags.

---

## Coverage Goals

Current: **23 tests / 1004 lines** for revenue.js, **4 tests / 100 lines** for scheduler.js. Target additions:

| Area | Tests planned |
|------|----------------|
| `createCheckoutSession` error paths | 2 |
| `handleStripeWebhook` event variants | 3 |
| Module toggle persistence | 2 |
| `runContentBotCycle` skip paths | 2 |
| `logDecision` payload shape | 1 |

---

## Why no Mocha/Jest?

Choices:
- **Zero deps** — `karma-os` is a single-purpose binary; pulling in Mocha is 200KB+ for no real benefit.
- **Fast iteration** — `node karma-revenue.spec.js` runs all 23 tests in <1 second.
- **Readable** — every test is `await test('name', async () => { ... })`. No DSL.
- **Portable** — no transpile step, no `babelrc`, no `jest.config.js`.

If we ever need parallel test runners or coverage tooling, we'll add `c8` (zero-config coverage) — but until then, simplicity wins.

---

## Files

- `karma-revenue.spec.js` (392 lines, 23 tests)
- `karma-abtest.spec.js` (53 tests, A/B testing domain — separate doc)
- `cli/scheduler.js` — can be smoke-tested manually with `node cli/scheduler.js status`

---

## See Also

- [REVENUE_ENGINE.md §7](./REVENUE_ENGINE.md) — testing overview
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) — endpoint contracts tested above
