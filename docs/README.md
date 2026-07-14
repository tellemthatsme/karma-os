# Karma Docs Index

> Living documentation for the Karma Revenue Engine and adjacent systems.

---

## Overview

This directory contains architecture, API, scheduler, dashboard, and testing docs for the **Karma Revenue Engine** — Karma's autonomous money-making system.

---

## Doc Set

| Doc | What's in it |
|-----|--------------|
| [**REVENUE_ENGINE.md**](./REVENUE_ENGINE.md) | Architecture: module overview, data flow, DB schema, dashboard intro |
| [**API_ENDPOINTS.md**](./API_ENDPOINTS.md) | Every HTTP endpoint with request/response shapes |
| [**SCHEDULER.md**](./SCHEDULER.md) | Cron schedules, env overrides, CLI usage, lifecycle |
| [**DASHBOARD.md**](./DASHBOARD.md) | Dashboard tabs, success page, theming, extending |
| [**TESTING.md**](./TESTING.md) | Test suite breakdown, mocking patterns, how to add tests |
| [**AUDIT-IMPLEMENTATION.md**](./AUDIT-IMPLEMENTATION.md) | Original system audit (pre-dashboard) |

---

## Reading Order

**New to the codebase?**
1. [REVENUE_ENGINE.md](./REVENUE_ENGINE.md) — get the big picture
2. [API_ENDPOINTS.md](./API_ENDPOINTS.md) — see the contracts
3. [DASHBOARD.md](./DASHBOARD.md) — see the frontend
4. [SCHEDULER.md](./SCHEDULER.md) — see the automation
5. [TESTING.md](./TESTING.md) — learn how to test changes

**Adding a new module?**
1. [REVENUE_ENGINE.md §3](./REVENUE_ENGINE.md) — module pattern
2. [API_ENDPOINTS.md §"Adding a New Endpoint"](./API_ENDPOINTS.md)
3. [TESTING.md §"How to Add a Test"](./TESTING.md)

**Debugging a tick?**
1. Check `decisions` table — every action logged with outcome.
2. Console logs prefixed with `[Scheduler]` for cron-driven runs.
3. Dashboard → Decisions tab for visual audit.

**Deploying?**
1. Set env vars (see [REVENUE_ENGINE.md §3.3](./REVENUE_ENGINE.md)) — Stripe keys for payments.
2. Apply DB migrations (server.js creates tables on startup).
3. Set timezone via `config.timezone` in `startScheduler` call.
4. Test with `node karma-revenue.spec.js` before deploying.

---

## Doc Conventions

- **Status badges in headers** — Production · Tests passing · Repo.
- **Tables for lists** — easier to scan than prose.
- **Code blocks for syntax** — copy-pasteable.
- **Cross-references** — `[REVENUE_ENGINE.md](./REVENUE_ENGINE.md)` style.
- **No emoji in docs** — keep docs searchable and accessible.

When a doc contradicts code, **fix the doc**. Code is the truth.

---

## Contributing

When adding a new feature:
1. Update the relevant section in `REVENUE_ENGINE.md` (`§3` for modules, `§6` for dashboard).
2. Add endpoint to `API_ENDPOINTS.md` with full request/response shape.
3. Add test to `karma-revenue.spec.js` and document in `TESTING.md`.
4. If introducing new scheduler behavior, document in `SCHEDULER.md`.

---

## Source Code Map

| Code path | Doc |
|-----------|-----|
| `src/routes/revenue.js` | [REVENUE_ENGINE.md](./REVENUE_ENGINE.md) + [API_ENDPOINTS.md](./API_ENDPOINTS.md) |
| `src/scheduler.js` | [SCHEDULER.md](./SCHEDULER.md) |
| `cli/scheduler.js` | [SCHEDULER.md §CLI](./SCHEDULER.md) |
| `public/revenue.html` | [DASHBOARD.md](./DASHBOARD.md) |
| `public/revenue/success.html` | [DASHBOARD.md §Success Page](./DASHBOARD.md) |
| `karma-revenue.spec.js` | [TESTING.md](./TESTING.md) |
| `server.js` (rev-engine wiring) | [REVENUE_ENGINE.md §1](./REVENUE_ENGINE.md) |
