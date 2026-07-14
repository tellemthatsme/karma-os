# Karma Revenue Engine — Architecture

> Autonomous revenue generation system that scrapes signals, enriches leads, sends outreach, publishes content, and processes payments — all under guardrails with a live operator dashboard.

**Status:** Production · **Tests:** 76 passing (23 revenue + 53 abtest) · **Repo:** `karma-os`

---

## 1. What It Does

The Revenue Engine is Karma's money-making brain. It runs five registered modules — each with its own guardrails, logging, and operator dashboard:

| Module | Purpose | Cadence | Output |
|--------|---------|---------|--------|
| **Lead Hunter** | Find → enrich → email cold leads | Daily at 09:00 (cron) | `revenue_leads`, `revenue_outreach` |
| **Content Bot** | Publish trend-jacking posts | Every 6 hours (cron) | `content_bot_posts` |
| **Micro-SaaS Factory** | Auto-build micro-tools | On demand | `revenue_leads` |
| **Price Arbitrage Scanner** | Marketplace diff monitor | On demand | `revenue_decisions` |
| **Asset Flipper** | Undervalued digital assets | On demand | `revenue_decisions` |

A node-cron scheduler (`src/scheduler.js`) drives Lead Hunter and Content Bot on cron. Stripe monetization runs on demand via HTTP endpoint and webhook. The operator dashboard (`public/revenue.html`) shows everything live.

---

## 2. Architecture Overview

```
                ┌────────────────────────────────────────────────────┐
                │            src/routes/revenue.js                   │
                │  (handleRevenueRoutes — single entry point)        │
                └───────────────┬────────────────────┬───────────────┘
                                │                    │
              ┌─────────────────┼────────────────────┼──────────────────┐
              │                 │                    │                  │
   ┌──────────▼─────────┐ ┌─────▼───────────┐ ┌──────▼──────────┐ ┌─────▼────────────┐
   │  runLeadHunter     │ │ runContentBot   │ │ createCheckout  │ │ handleStripe     │
   │  Cycle             │ │ Cycle           │ │ Session         │ │ Webhook          │
   └──────┬─────────────┘ └──────┬──────────┘ └──────┬──────────┘ └─────┬────────────┘
          │                      │                   │                  │
   ┌──────▼────────┐     ┌───────▼────────┐   ┌──────▼─────────┐ ┌─────▼──────────┐
   │ scrapeSignals │     │ scrapeTrends   │   │ Stripe API     │ │ verify sig     │
   │ enrichLead    │     │ generateContent│   │ checkout → URL │ │ insert payment │
   │ writeColdEmail│     │ postContent    │   └────────────────┘ └────────────────┘
   │ sendOutreach  │     └────────────────┘
   └───────────────┘
          │                      │                   │                  │
          └──────────┬───────────┴───────────────────┴──────────────────┘
                     │
              ┌──────▼───────┐         ┌─────────────────┐
              │  check        │         │  src/scheduler  │
              │  Guardrails   │         │  (node-cron)    │
              └──────┬────────┘         └────────┬────────┘
                     │                          │
                     ▼                          ▼
              ┌──────────────┐          ┌──────────────────┐
              │ logDecision  │          │ /api/scheduler/  │
              │ (DB history) │          │ status endpoint  │
              └──────────────┘          └──────────────────┘
```

**Key principle:** One HTTP entry point (`handleRevenueRoutes`) routes everything. Components are pure functions exported for unit testing (no hidden globals). All DB writes go through guardrails; all decisions are logged for audit.

---

## 3. Module Reference

### 3.1 Lead Hunter

**File:** `src/routes/revenue.js` (lines 191–360)

**Flow:** `scrapeSignals` → `enrichLead` → `writeColdEmail` → `checkGuardrails` → `sendOutreach` → `logDecision`

**Inputs:**
- `config.modules.leadHunter` — runtime config; `enabled` bool gate
- DB tables: `revenue_leads`, `revenue_outreach`, `revenue_decisions`

**Outputs:**
- New rows in `revenue_leads` (one per enriched lead)
- New rows in `revenue_outreach` (one per sent outreach) — async reply monitoring
- Decision log entries in `revenue_decisions` with guardrail outcome

**Default config from `MODULES.leadHunter.config`**:
```js
{
  maxDailyEmails: 50,
  signalSources: ['reddit', 'indiehackers', 'jobboards'],
  niches: ['saas', 'ai-tools', 'automation'],
  emailTemplate: 'personalized-value-first',
  replyMonitoring: true,
}
```

**Guardrails checked:** `maxDailyEmails`, `autoExecuteConfidence` (default 0.85). Below threshold → `outcome: 'pending_approval'`.

### 3.2 Content Bot

**File:** `src/routes/revenue.js` (lines 363–455)

**Flow:** `scrapeTrends` → `generateContent` → `checkGuardrails` → `postContent` → `logDecision`

**Cadence:** Every 6 hours. Three content templates: `affiliate-review`, `problem-solution`, `hot-take`. Default platform mix: twitter, linkedin, medium.

**Default config from `MODULES.contentBot.config`**:
```js
{
  platforms: ["twitter", "linkedin", "medium"],
  postFrequency: 3,
  niches: ["ai", "productivity", "saas"],
}
```

**Outputs:** New rows in `content_bot_posts` with `postedAt`, `platform`, `engagement` (number), `status='posted'`.

### 3.3 Stripe Pay

**File:** `src/routes/revenue.js` (lines 459–527)

**Endpoints:**
- `POST /api/revenue/stripe/checkout` → `createCheckoutSession` returns Stripe URL
- `POST /api/revenue/stripe/webhook` → `handleStripeWebhook` processes events, inserts payments
- `GET /api/revenue/stripe/verify` → queries DB for session_id, returns payment details

**Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

**Defaults:** If `STRIPE_SECRET_KEY` is unset, `/api/revenue/stripe/checkout` returns `{ ok: false, error: 'Stripe secret key not configured' }`. `/api/revenue/stripe/verify` falls back to a mocked demo response when session_id is not in DB and `NODE_ENV !== 'production'`.

**Known units issue:** `handleStripeWebhook` stores `amount` in **dollars** (divides `amount_total / 100` from Stripe). The dev mock on the verify endpoint returns `amount: 4900` (cents, inconsistent with DB units). Documented in [API_ENDPOINTS.md §Known Issues](./API_ENDPOINTS.md#known-issues).

### 3.4 Guardrails

**File:** `src/routes/revenue.js` (lines 55–118)

**`DEFAULT_GUARDRAILS` constant** — exported for testability.

```js
{
  maxDailySpend: 50,            // USD
  maxDailyEmails: 100,
  maxDailyApiCalls: 1000,
  minProfitMargin: 0.20,        // 20% minimum
  riskLevel: 'conservative',    // conservative | moderate | aggressive
  autoExecuteConfidence: 0.85,
  notificationLevel: 'important', // all | important | critical
}
```

> Note: dashboard endpoints alias this as `minMarginPercent` (= `minProfitMargin`) for legacy field-name compatibility.

**`checkGuardrails(action, payload, guardrails)`** returns `{ approved, violations[], riskLevel }`. Called by every revenue action before execution. Side effects: increments `state.dailyCounters.decisions` and rolls counters on date change.

---

## 4. Data Flow

### HTTP request
1. Browser → `POST /api/revenue/run/leadHunter` (or dedicated `/api/revenue/lead-hunter/cycle`)
2. `server.js` → `handleRevenueRoutes(req, res, startTime, deps)`
3. Route matches → dispatches to module function (e.g. `runLeadHunterCycle`)
4. Module calls `checkGuardrails` → if approved, executes & writes DB rows
5. Module calls `logDecision` → returns JSON summary
6. `handleRevenueRoutes` writes response + `logRequest(req, res, startTime)` records latency

### Cron tick
1. `node-cron` fires → `startScheduler`'s registered task
2. Task calls `runLeadHunterCycle(db, { modules: { leadHunter: { enabled: true } } })`
3. Same flow as HTTP, but result is logged to console (not HTTP response)
4. Errors caught → logged with `[Scheduler]` prefix

---

## 5. Database Schema

All tables created by `server.js` startup migrations (lines 55–136). Column names verified against `INSERT` statements in `src/routes/revenue.js`.

```
revenue_leads       (id, company, domain, email, niche, source, confidence, status,
                     createdAt, date, lastContacted, replyCount, lastReplyAt)
revenue_outreach    (id, leadId, emailBody, sentAt, status, replies, date)
revenue_decisions   (ts, module, action, payload, approved, violations, outcome, date)
content_bot_posts   (id, platform, niche, topic, content, engagement, status, postedAt, date)
stripe_payments     (id, ts, eventType, sessionId, amount [DOLLARS], currency,
                     status, customerEmail, metadata, date)
revenue_modules     (id, name, enabled, updatedAt)
revenue_guardrails  (config [JSON], updatedAt)
revenue_ledger      (id, ts, type, amount, source, description, module, date)
```

**Cross-cutting tables** (not revenue-specific):
```
abtest_events       (id, experiment_id, variant, metric_name, value, ts)
abtest_configs      (...)
```

**Notable quirks:**
- `revenue_decisions.approved` is a boolean (not `guardrail_ok`) — older interface name.
- `revenue_outreach.emailBody` is a single rendered template (no separate `subject`/`body` columns).
- `revenue_guardrails.config` is JSON-encoded; `parseInt(GET)` unions with `DEFAULT_GUARDRAILS` if missing.
- `stripe_payments.amount` is in **dollars** (webhook divides cents → dollars). Verify endpoint returns dollars.

All timestamps are millisecond `ts` columns OR `ISO-8601 date` strings. Idempotent: re-running a cycle is safe — guardrails prevent duplicate sends.

---

## 6. Operator Dashboard

**URL:** `/revenue` (served from `public/revenue.html`)

**Tabs:**
- **Overview** — KPI grid + revenue chart + guardrails + Lead Hunter stats
- **Modules** — toggle each module on/off, manual Run buttons, enable-all
- **Content Bot** — recent posts + run cycle button
- **Payments** — Stripe revenue + create-checkout button + recent payments
- **Decisions** — audit log of every engine action
- **Scheduler** — Scheduler status panel with cron expression list
- **Live Log** — auto-scrolling system log

**Endpoints called by dashboard:**
- `/api/revenue/dashboard` — primary snapshot (called on load + manual refresh)
- `/api/revenue/scheduler` — lightweight enabled-modules list for Scheduler tab
- `/api/scheduler/status` — full scheduler state from `src/scheduler.js`

**Auto-refresh:** dashboard polls `/api/revenue/dashboard` every ~5s; manual refresh button forces immediate reload.

**Theme:** Dark, cyan/violet gradient accents. CSS variables at top of file (easy to retheme).

---

## 7. Testing

**File:** `karma-revenue.spec.js` (23 tests)

Coverage buckets:
- 4 Stripe checkout + webhook + verify tests
- 4 Scheduler start / stop / status tests
- 1 HTTP routing smoke test (`/api/scheduler/status`)
- 14 module + state tests (Lead Hunter, Content Bot, decisions, dashboard)

**Mock pattern:** `makeMockDb()` creates an in-memory db stub that records `.run` calls and returns canned `.get` / `.all` data. `global.fetch` is patched for Stripe test isolation.

**Run:** `node karma-revenue.spec.js` — should print `📊 Results: 23 passed, 0 failed`.

---

## 8. Where to Start Reading

- New to the code? Start at `src/routes/revenue.js` `module.exports` (last 20 lines) → `handleRevenueRoutes(req, res, ...)` (line 555) → `checkGuardrails` (line 80) → `DEFAULT_GUARDRAILS` (line 55).
- Want to add a new module? Copy the pattern in §3.1 — a cycle function + guardrail check + decision log. Register in `MODULES.{yourId}` and add a toggle case to `handleRevenueRoutes`.
- Debugging a cycle? Read the `revenue_decisions` table — every action is logged with `module`, `action`, `approved`, `outcome`, `date`.

---

## 9. Files in This Doc Set

| File | What it covers |
|------|----------------|
| [API_ENDPOINTS.md](./API_ENDPOINTS.md) | Every HTTP endpoint with request/response shapes |
| [SCHEDULER.md](./SCHEDULER.md) | Cron schedules, env overrides, CLI usage |
| [DASHBOARD.md](./DASHBOARD.md) | Dashboard tabs, success page, theming |
| [TESTING.md](./TESTING.md) | Test suite breakdown, mocking patterns, how to add tests |
