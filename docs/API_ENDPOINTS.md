# Revenue Engine — API Endpoint Reference

> Every endpoint exposed by `handleRevenueRoutes` (in `src/routes/revenue.js`) plus `/api/scheduler/status`. Verified against actual handlers — version July 2025.

**Base URL:** `http://localhost:3000` (dev) or your deployed origin.

**Response shape:** Most endpoints return `{ ok: true | false, ...data, error?: string }`. JSON only. HTTP status: `200` for business-logic errors (so frontend reads `body.ok`), `400/404/500` for protocol-level errors.

---

## Reading Order

1. [Module & Snapshot endpoints](#module--snapshot-endpoints)
2. [Stripe endpoints](#stripe-endpoints)
3. [Scheduler endpoints](#scheduler-endpoints)
4. [Error conventions](#error-conventions)
5. [Known issues](#known-issues)

---

## Module & Snapshot Endpoints

> All Module routes live in `src/routes/revenue.js` `handleRevenueRoutes`. Module names in paths come from the `MODULES` registry: `leadHunter`, `contentBot`, `microSaaS`, `priceArbitrage`, `assetFlipper`.

### `GET /api/revenue/dashboard`

Primary aggregate snapshot for the dashboard.

**Response 200:**
```json
{
  "ok": true,
  "today": "2025-07-15",
  "counters": { "emails": 0, "spend": 0, "apiCalls": 0, "decisions": 0 },
  "modules": [{ "id": "leadHunter", "name": "Lead Hunter", "description": "...", "enabled": true, "estRevenue": 0 }],
  "guardrails": { ...DEFAULT_GUARDRAILS, "minMarginPercent": 0.20 },
  "stats": {
    "todayRevenue": 0,
    "leadsGenerated": 142,
    "hotLeads": 7,
    "emailsSent": 38,
    "totalReplies": 5,
    "todaysDecisions": [{ "module": "leadHunter", "count": 12 }]
  },
  "recentDecisions": [{ "module": "leadHunter", "action": "sendOutreach", "approved": true, "outcome": "sent", "ts": 1721044354000 }]
}
```

---

### `GET /api/revenue/modules`

Returns the `MODULES` registry with full config.

**Response 200:**
```json
{
  "ok": true,
  "modules": [{ "id": "leadHunter", "name": "Lead Hunter", "description": "...", "enabled": true, "config": { "maxDailyEmails": 50, "niches": ["saas"] } }]
}
```

---

### `POST /api/revenue/modules/:id/toggle`

Flip a module's `enabled` flag. Persists to `revenue_modules` table via `INSERT ... ON CONFLICT(id) DO UPDATE`.

**Path params:** `id` = any key in [`MODULES`](./REVENUE_ENGINE.md#module-reference).

**Response 200:**
```json
{ "ok": true, "module": { "id": "leadHunter", "name": "Lead Hunter", "enabled": false } }
```

**Response 404** (unknown module):
```json
{ "error": "Module not found", "available": ["leadHunter","contentBot","microSaaS","priceArbitrage","assetFlipper"] }
```

---

### `GET /api/revenue/guardrails`

Read current guardrail config (from `revenue_guardrails` row with latest `updatedAt`; fallback to `DEFAULT_GUARDRAILS`).

**Response 200:**
```json
{
  "ok": true,
  "guardrails": {
    "maxDailySpend": 50,
    "maxDailyEmails": 100,
    "maxDailyApiCalls": 1000,
    "minProfitMargin": 0.20,
    "minMarginPercent": 0.20,
    "riskLevel": "conservative",
    "autoExecuteConfidence": 0.85,
    "notificationLevel": "important"
  }
}
```

> `minMarginPercent` is a legacy alias for `minProfitMargin` — both are returned.

### `POST /api/revenue/guardrails`

Update guardrail config. Body is any subset of `DEFAULT_GUARDRAILS`; merged over defaults.

```json
{ "maxDailyEmails": 75, "riskLevel": "moderate" }
```

**Response 200:** `{ "ok": true, "guardrails": { ...merged } }`

**Response 400** (invalid JSON): `{ "error": "Invalid JSON", "message": "..." }`

---

### `GET /api/revenue/decisions?limit=50&module=leadHunter`

Audit log of every engine action.

**Query params:**
- `limit` — max rows (default 50)
- `module` — optional filter (`leadHunter`, `contentBot`, `stripe`, ...)

**Response 200:**
```json
{
  "ok": true,
  "decisions": [{
    "ts": 1721044354000,
    "module": "leadHunter",
    "action": "sendOutreach",
    "payload": "{\"leadId\":\"lead_abc\"}",
    "approved": true,
    "violations": "[]",
    "outcome": "sent",
    "date": "2025-07-15"
  }]
}
```

---

### `GET /api/revenue/leads?limit=50&status=new`

Query lead pool.

**Query params:**
- `limit` — max rows (default 50)
- `status` — optional filter (`new` | `contacted` | `hot`)

**Response 200:**
```json
{
  "ok": true,
  "leads": [{
    "id": "lead_abc",
    "company": "...", "domain": "...", "email": "...",
    "niche": "saas", "source": "reddit",
    "confidence": 0.85, "status": "new",
    "createdAt": 1721044354000, "date": "2025-07-15",
    "lastContacted": null, "replyCount": 0, "lastReplyAt": null
  }]
}
```

---

### `GET /api/revenue/outreach?limit=50`

Query outreach events.

**Query params:**
- `limit` — max rows (default 50)

**Response 200:**
```json
{
  "ok": true,
  "leads": [{
    "id": "out_xyz", "leadId": "lead_abc",
    "emailBody": "Subject: ...\n\nHi there, ...",
    "sentAt": 1721044354000, "status": "sent", "replies": 0,
    "date": "2025-07-15"
  }]
}
```

> ⚠ Response key is `leads` (not `outreach`) — code typo at handleRevenueRoutes line 691. Acceptable; treat as `outreach` events.

---

### `POST /api/revenue/run/:module`

Generic run-cycle endpoint. Only `leadHunter` is currently implemented.

**Path params:** `module` = `leadHunter` (only supported).

**Response 200:**
```json
{
  "ok": true,
  "module": "leadHunter",
  "result": {
    "ran": true,
    "signalsFound": 12,
    "leadsEnriched": 8,
    "emailsSent": 6,
    "leads": [...]
  }
}
```

**Response 400** (unsupported module):
```json
{ "error": "Module not runnable or not found", "available": ["leadHunter"] }
```

---

### `POST /api/revenue/lead-hunter/cycle`

Dedicated Lead Hunter cycle endpoint (identical to `/api/revenue/run/leadHunter`).

**Response 200:**
```json
{
  "ok": true,
  "cycle": {
    "ran": true,
    "signalsFound": 12,
    "leadsEnriched": 8,
    "emailsSent": 6,
    "leads": [...]
  }
}
```

---

### `POST /api/revenue/lead-hunter/trigger`

Stub: queues a Lead Hunter run without executing inline. Dashboard polls `/api/revenue/lead-hunter/status` for live progress.

**Response 200:** `{ "ok": true, "status": "queued", "module": "leadHunter" }`

---

### `GET /api/revenue/lead-hunter/status`

Lead Hunter-specific stats from `getLeadHunterStatus(db)`.

**Response 200:**
```json
{
  "ok": true,
  "status": {
    "enabled": true,
    "today": "2025-07-15",
    "totalLeads": 142,
    "hotLeads": 7,
    "emailsSentToday": 12,
    "repliesToday": 3,
    "decisionsToday": 18,
    "dailyCounters": { "emails": 0, "spend": 0, "apiCalls": 0, "decisions": 0 }
  }
}
```

---

### `POST /api/revenue/content-bot/cycle`

Trigger a Content Bot cycle manually.

**Response 200:**
```json
{
  "ok": true,
  "cycle": {
    "ran": true,
    "trendsScraped": 9,
    "postsGenerated": 9,
    "postsPublished": 7,
    "blocked": 0,
    "posts": [{ "ok": true, "postId": "post_xyz", "platform": "twitter", "engagement": 1820 }]
  }
}
```

---

### `GET /api/revenue/content-bot/posts?limit=10`

List recent published posts (raw rows from `content_bot_posts`).

**Query params:**
- `limit` — max rows (default 50)

**Response 200:**
```json
{
  "ok": true,
  "posts": [{
    "id": "post_abc",
    "platform": "twitter", "niche": "ai", "topic": "Top 5 ai tools in 2026",
    "content": "🧵 Top 5 ...",
    "engagement": 1240, "status": "posted",
    "postedAt": 1721044354000, "date": "2025-07-15"
  }]
}
```

---

### `POST /api/revenue/content-bot/find-trends`

_NOT IMPLEMENTED as standalone endpoint. Trends are scraped internally by `runContentBotCycle`. Use the cycle endpoint to exercise trend scraping._

---

### `GET /api/revenue/ledger?limit=100`

Query financial ledger (`revenue_ledger` table).

**Response 200:**
```json
{
  "ok": true,
  "totalIncome": 1240.00,
  "totalExpense": 380.00,
  "netProfit": 860.00,
  "entries": [{
    "id": "txn_abc", "ts": 1721044354000,
    "type": "income", "amount": 49.00,
    "source": "stripe", "description": "Pro plan signup",
    "module": "stripe", "date": "2025-07-15"
  }]
}
```

### `POST /api/revenue/ledger`

Append a ledger entry.

**Request body:**
```json
{ "type": "income", "amount": 49.00, "source": "stripe", "description": "Pro plan signup", "module": "stripe" }
```

**Response 200:** `{ "ok": true, "id": "txn_abc123" }`

---

### `GET|POST /api/revenue/notify`

Test notification dispatch (Discord / Slack / Telegram via configured webhooks).

**GET:** reads `?msg=...` query param. Default message: `"Hello from KARMA Revenue Engine"`.

**POST body:** `{ level: "info" | "success" | "warning" | "critical", title, message }`

**Response 200:** `{ "ok": true, "message": "Notification dispatched (mock)" }`

---

### `GET /api/revenue/scheduler`

Lightweight snapshot of enabled modules (used by Scheduler tab before pulling full state).

**Response 200:** `{ "ok": true, "enabledModules": ["leadHunter"], "nextRuns": {} }`

> `nextRuns` is currently a placeholder (`{}`) — populated when scheduler module integrates cron-parser for actual next-run times.

---

## Stripe Endpoints

### `POST /api/revenue/stripe/checkout`

Create a Stripe Checkout session.

**Request body:**
```json
{
  "lineItems": [{ "name": "Pro Plan", "amount": 49.00, "quantity": 1, "currency": "usd" }],
  "metadata": { "plan": "pro", "userId": "u_123", "successUrl": "https://...", "cancelUrl": "https://..." }
}
```

> `lineItems[].amount` here is in **dollars** (multiplied by 100 before sending to Stripe API as `unit_amount`).

**Response 200:**
```json
{ "ok": true, "sessionId": "cs_test_a1b2c3", "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3" }
```

**Response 400** (no `STRIPE_SECRET_KEY`): `{ "ok": false, "error": "Stripe secret key not configured" }`

---

### `POST /api/revenue/stripe/webhook`

Stripe webhook receiver. Parses the event and inserts a row into `stripe_payments`.

> ⚠ **Signature verification is NOT IMPLEMENTED.** Production should `crypto.createHmac` against `STRIPE_WEBHOOK_SECRET`.

**Request body:** Raw Stripe event payload (JSON).

**Headers:** `stripe-signature` (currently unread, but required in production).

**Response 200:** `{ "ok": true, "id": "wh_abc", "eventType": "checkout.session.completed" }`

---

### `GET /api/revenue/stripe/verify?session_id=cs_test_x`

Payment verification for the success page.

**Query params:**
- `session_id` (required) — Stripe session ID

**Response 200** (verified from DB — amount in **DOLLARS**):
```json
{
  "ok": true,
  "verified": true,
  "plan": "pro",
  "amount": 49.00,
  "currency": "usd",
  "customerEmail": "user@example.com",
  "status": "completed"
}
```

**Response 400** (missing session_id):
```json
{ "ok": false, "error": "Missing session_id" }
```

**Response 404** (production, unknown session):
```json
{ "ok": false, "error": "Session not found" }
```

**Development fallback** (when session not in DB AND `NODE_ENV !== 'production'`):
```json
{
  "ok": true,
  "verified": true,
  "plan": "Pro",
  "amount": 4900,
  "currency": "usd",
  "customerEmail": "customer@example.com",
  "status": "succeeded",
  "note": "Mock verification — integrate Stripe API for production"
}
```

> ⚠ The dev mock returns `amount: 4900` (cents), inconsistent with the production flow that stores dollars. See [Known Issues](#known-issues).

---

## Scheduler Endpoints

> Two endpoints expose scheduler state. They serve different surfaces.

| Endpoint | Source | Returns |
|----------|--------|---------|
| `/api/revenue/scheduler` | `handleRevenueRoutes` | enabled modules list (lightweight) |
| `/api/scheduler/status` | `src/scheduler.js` `getSchedulerStatus()` | full state incl. cron expressions |

### `GET /api/revenue/scheduler`

**Response 200:** `{ "ok": true, "enabledModules": ["leadHunter"], "nextRuns": {} }`

### `GET /api/scheduler/status`

**Response 200:**
```json
{
  "ok": true,
  "status": {
    "running": true,
    "tasks": [
      { "name": "leadHunter", "running": true },
      { "name": "contentBot", "running": true }
    ],
    "schedules": {
      "leadHunter": { "enabled": true, "cron": "0 9 * * *", "description": "Lead Hunter daily sweep" },
      "contentBot":  { "enabled": true, "cron": "0 */6 * * *", "description": "Content Bot publishing cycle" }
    }
  }
}
```

---

## Error Conventions

- All errors return `{ ok: false, error: "human-readable message" }`.
- HTTP status code is `200` for business-logic errors (so frontend can read `body.ok`).
- HTTP status code is `400`/`404`/`500` only for protocol-level errors (bad JSON, missing fields, internal exceptions).
- Request logging: every request is recorded with `req.method`, `req.url`, response duration, status code via `logRequest(req, res, startTime)`.

---

## Known Issues

These are documented factual inconsistencies in the code. Tracked as follow-ups.

1. **`stripe_payments.amount` units are inconsistent.** `handleStripeWebhook` stores dollars, but the dev `mock` fallback on `/api/revenue/stripe/verify` returns cents (`4900`). Fix: unify on dollars in the mock.
2. **`public/revenue/success.html` double-divides amount.** Renders `data.amount / 100`, assuming cents. Since verify now returns dollars (after `handleStripeWebhook` fix), display shows `$0.49` instead of `$49.00`. Fix: drop the `/100` in success.html or normalize verify response to cents.
3. **`/api/revenue/outreach` returns key `leads`, not `outreach`.** Code typo in handleRevenueRoutes. Documented above; keep the typo unless a breaking change is acceptable.
4. **`/api/revenue/stripe/webhook` does not verify signatures.** Production gap. Should `crypto.createHmac('sha256', secret)` against the `stripe-signature` header.
5. **`/api/revenue/scheduler.nextRuns` is `{}` placeholder.** Not implemented. Would require `cron-parser` or manual cron-evaluation against current time.

---

## Adding a New Endpoint

1. Add a new case in `handleRevenueRoutes` (search for `// ───` comments in `src/routes/revenue.js`).
2. Use `logRequest(req, res, startTime)` before `res.end`.
3. Add tests to `karma-revenue.spec.js`.
4. Document in this file under the appropriate section.

---

## See Also

- [REVENUE_ENGINE.md](./REVENUE_ENGINE.md) — architecture & module deep-dive
- [SCHEDULER.md](./SCHEDULER.md) — cron + CLI for scheduler
- [DASHBOARD.md](./DASHBOARD.md) — frontend tabs calling these endpoints
