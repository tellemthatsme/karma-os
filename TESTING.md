# KARMA OS — Testing Guide

> Complete test documentation for all KARMA OS test suites.
> Updated: June 14, 2026

---

## Quick Reference

```bash
# Fast structural (no browser, ~3s)
node validate-karma.js

# Node built-in test runner (~2s)
node --test karma-abtest.node-test.js
node --test server.test.js
node --test karma-integration.node-test.js

# All node:test suites at once
npm run test:node

# Playwright E2E (requires server on :8888)
npm test                              # Chromium, 72 tests
npm run test:all                      # All browsers
npm run test:cross-browser            # Chromium + Firefox + WebKit
```

---

## Test Suite Inventory

### Node.js Built-in Test Runner (`node:test`)

| File | Tests | Runner | What it covers |
|------|-------|--------|----------------|
| `karma-abtest.node-test.js` | 39 | `node --test` | A/B test routes — computeABStatsFromDB, routing, stats, config, events, results, significance, confidence, bayesian, rate limiter, sanitization, schema validation |
| `server.test.js` | ~20 | `node --test` | Server rate limiter, CORS headers, 404 handler, media URL safety, platform push validation, research API helpers, git info parser |
| `karma-integration.node-test.js` | 13 | `node --test` | Real HTTP integration tests — health, metrics, event POST, stats, results, significance, confidence, bayesian, reset, 404, CORS, push validation, research refresh |

**Total node:test**: ~72 tests

### Playwright E2E (`@playwright/test`)

| File | Tests | Focus | Browser |
|------|-------|-------|---------|
| `karma-hud.spec.js` | 10 | HUD floating widget | Chromium |
| `karma-widget.spec.js` | 8 | Compact sidebar widget | Chromium |
| `live-desktop.spec.js` | 10 | Desktop overlay + Matrix rain | Chromium |
| `karma-regression.spec.js` | 17 | Main OS full regression | Chromium |
| `karma-visual.spec.js` | 8 | Visual regression screenshots | Chromium |
| `karma-os.spec.js` | ~10 | Task queue + system integration | Chromium |
| `karma-server-regression.spec.js` | ~7 | Server API regression | Chromium |
| `karma-research.spec.js` | ~6 | AI research endpoints | Chromium |
| `karma-security.spec.js` | ~3 | Claude proxy + bridge auth | Chromium |

**Total Playwright**: 72 tests (Chromium all passing)

### Custom Test Runner

| File | Tests | Runner | What it covers |
|------|-------|--------|----------------|
| `karma-abtest.spec.js` | 48 | `node` (custom) | A/B test routes — 48 tests including edge cases, sanitization, schema validation |

### Structural Validation

| File | Checks | Runner | What it covers |
|------|--------|--------|----------------|
| `validate-karma.js` | 17 | `node` | File existence, HTML structure, server endpoint health, security headers, asset integrity |

---

## Test Commands Reference

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Playwright Chromium (72 tests, list reporter, 1 worker) |
| `npm run test:node` | All 3 node:test suites |
| `npm run test:all` | All browsers (parallel) |
| `npm run test:cross-browser` | Chromium + Firefox + WebKit |
| `npm run test:ci` | Chromium with HTML reporter |
| `npm run test:hud` | HUD tests only (10) |
| `npm run test:widget` | Widget tests only (8) |
| `npm run test:desktop` | Desktop tests only (10) |
| `npm run test:regression` | Main OS regression (17) |
| `npm run test:visual` | Visual regression (8) |
| `npm run validate` | Structural validation (17 checks) |
| `npm run server` | Start metrics server on :8888 |

### Direct node:test Commands

```bash
# Individual suites
node --test karma-abtest.node-test.js
node --test server.test.js
node --test karma-integration.node-test.js

# All at once (globs)
node --test karma-abtest.node-test.js server.test.js karma-integration.node-test.js

# With verbose output
node --test --test-reporter=spec karma-abtest.node-test.js

# With TAP output (machine-readable)
node --test --test-reporter=tap karma-abtest.node-test.js
```

### Custom A/B Test Runner

```bash
node karma-abtest.spec.js          # Run all 48 tests
```

---

## Cross-Browser Results

| Browser | Pass | Fail | Notes |
|---------|------|------|-------|
| **Chromium** | 53 | 0 | Primary target — full pass |
| **Firefox** | 50 | 3 | Bar visibility, toast timing |
| **WebKit** | 38 | 15 | `file://` CORS — works via HTTP server |

---

## CI Pipeline

### GitHub Actions (`.github/workflows/test.yml`)

```
Push/PR to main|master
  │
  ├── unit-tests (ubuntu-latest, Node 22)
  │   ├── npm ci
  │   ├── node --test karma-abtest.node-test.js
  │   └── node --test server.test.js
  │
  ├── integration-tests (depends: unit-tests)
  │   ├── npm ci
  │   └── node --test karma-integration.node-test.js
  │
  ├── playwright-tests (depends: integration-tests)
  │   ├── npm ci
  │   ├── npx playwright install chromium --with-deps
  │   ├── node server.js &
  │   ├── curl health check (20 retries)
  │   ├── npx playwright test --project=chromium --reporter=list
  │   └── Upload artifacts (test-results/)
  │
  └── validation (depends: unit-tests)
      ├── npm ci
      ├── node server.js &
      ├── curl health check (20 retries)
      └── node validate-karma.js
```

### Pre-Commit Hook (`.githooks/pre-commit`)

```bash
git config core.hooksPath .githooks  # Enable
```

Automatically runs `node -c` on `<script>` blocks >50 chars in changed `.html` files.

---

## Test Coverage Map

### A/B Test Routes (`src/routes/abtest.js`)

| Endpoint | Unit Tests (node:test) | Integration Tests | Custom Runner |
|----------|----------------------|-------------------|---------------|
| `computeABStatsFromDB` | ✅ 4 tests | — | ✅ 4 tests |
| Routing | ✅ 1 test | — | ✅ 1 test |
| `GET /api/abtest/stats` | ✅ 2 tests | ✅ | ✅ 3 tests |
| `POST /api/abtest/reset` | ✅ 1 test | ✅ | ✅ 1 test |
| `GET /api/abtest/export` | ✅ 1 test | — | ✅ 2 tests |
| `GET /api/abtest/config` | ✅ 1 test | — | ✅ 2 tests |
| `POST /api/abtest/config` | ✅ 3 tests | — | ✅ 4 tests |
| `POST /api/abtest/event` | ✅ 7 tests | ✅ | ✅ 12 tests |
| `GET /api/abtest/results` | ✅ 1 test | ✅ | ✅ 3 tests |
| `GET /api/abtest/significance` | ✅ 2 tests | ✅ | ✅ 3 tests |
| `GET /api/abtest/confidence` | ✅ 2 tests | ✅ | ✅ 3 tests |
| `GET /api/abtest/bayesian` | ✅ 1 test | ✅ | ✅ 2 tests |
| Rate Limiter | ✅ 4 tests | — | ✅ 4 tests |
| Sanitization | ✅ 9 tests | — | ✅ 8 tests |
| Schema Validation | ✅ 5 tests | — | ✅ 10 tests |

### Metrics Server (`server.js`)

| Area | Unit Tests | Integration | Playwright |
|------|-----------|-------------|------------|
| Rate Limiter | ✅ 4 tests | — | — |
| CORS Headers | ✅ 2 tests | ✅ | ✅ |
| 404 Handler | ✅ 1 test | ✅ | ✅ |
| Media URL Safety | ✅ 3 tests | — | — |
| Platform Push | ✅ 2 tests | ✅ | ✅ |
| Research API | ✅ 2 tests | ✅ | ✅ |
| Git Parser | ✅ 2 tests | — | — |
| Health Endpoint | — | ✅ | ✅ |

### Dashboards

| Dashboard | Playwright Tests | Coverage |
|-----------|-----------------|----------|
| `index.html` | 8 (visual) | Load, themes, palette, toasts, cards |
| `karma-os-ultimate.html` | 17 (regression) + 10 (OS) | Gate, agents, army, modals, task queue |
| `karma-hud.html` | 10 | Load, clock, agents, crypto, bars, NITRO |
| `karma-widget.html` | 8 | Load, logo, clock, agents, crypto, bars, NITRO |
| `live-desktop.html` | 10 | Load, topbar, themes, agents, stats, CR, terminal |

---

## Running Tests Locally

### Prerequisites

```bash
npm install
npx playwright install chromium
```

### Step-by-Step

```bash
# 1. Start the server
node server.js &

# 2. Run fast checks (no browser)
npm run validate                              # ~3s
node --test karma-abtest.node-test.js         # ~1s
node --test server.test.js                    # ~1s
node --test karma-integration.node-test.js    # ~15s (starts own server)
node karma-abtest.spec.js                     # ~1s

# 3. Run Playwright E2E
npm test                                       # ~60s (Chromium)
npm run test:cross-browser                     # ~180s (3 browsers)
```

### Expected Output

```
# validate-karma.js
[PASS] (14/17) — 2 WARN (git missing) 1 FAIL (package.json path)

# node:test
▶ karma-abtest.node-test.js
  ✔ computeABStatsFromDB > returns empty results (1ms)
  ✔ computeABStatsFromDB > aggregates events (2ms)
  ...
  ℹ tests 39
  ℹ pass 39
  ℹ fail 0

# Playwright
Running 72 tests using 1 worker
  72 passed (45s)
```

---

## Troubleshooting

### Server not running

```bash
# Check if port 8888 is in use
netstat -ano | findstr :8888

# Start the server
node server.js
```

### Playwright tests hanging

```bash
# Kill stale server processes
taskkill /F /IM node.exe

# Clean Playwright cache
npx playwright install --force chromium
```

### node:test not found (Node < 18)

```bash
node --version  # Must be 18+
nvm install 22
```

### Integration tests fail with port in use

```bash
TEST_PORT=3457 node --test karma-integration.node-test.js
```

---

## Test File Map

```
karma-os/
├── karma-abtest.spec.js          # Custom runner — 48 A/B tests
├── karma-abtest.node-test.js     # node:test — 39 A/B tests
├── server.test.js                # node:test — ~20 server unit tests
├── karma-integration.node-test.js # node:test — 13 HTTP integration tests
│
├── karma-hud.spec.js             # Playwright — 10 HUD tests
├── karma-widget.spec.js          # Playwright — 8 widget tests
├── live-desktop.spec.js          # Playwright — 10 desktop tests
├── karma-regression.spec.js      # Playwright — 17 main OS tests
├── karma-visual.spec.js          # Playwright — 8 visual tests
├── karma-os.spec.js              # Playwright — ~10 OS integration tests
├── karma-server-regression.spec.js # Playwright — ~7 server tests
├── karma-research.spec.js        # Playwright — ~6 research tests
├── karma-security.spec.js        # Playwright — ~3 security tests
│
├── validate-karma.js             # Node — 17 structural checks
├── playwright.config.js          # 3-browser Playwright config
└── .github/workflows/test.yml    # CI pipeline
```

---

*KARMA OS Testing Guide — June 14, 2026*
