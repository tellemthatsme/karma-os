# Contributing to KARMA OS

Thanks for your interest in contributing! Here's how to get started.

## Quick Start

```bash
git clone https://github.com/tellemthatsme/karma-os.git
cd karma-os
npm install
npx playwright install chromium
```

## Development

1. Open any dashboard HTML file directly in Chrome
2. Make changes — dashboards are single-file HTML apps with no build step
3. Run tests: `npm test`
4. Run validation: `npm run validate`

## Project Structure

| Area | Files | Notes |
|---|---|---|
| Dashboards | `*.html` | Self-contained single-file apps with embedded CSS/JS |
| Tests | `*.spec.js` | Playwright end-to-end tests |
| Backend | `server.js` | Node.js metrics server |
| Infrastructure | `Dockerfile`, `docker-compose.yml`, CI configs | Deploy and containerization |
| Docs | `*.md` | README, CHANGELOG, ARCHITECTURE, DEPLOY, CONTRIBUTING |

## Testing

All PRs must pass the 72-test Playwright suite:

```bash
npm test                    # Run all 72 tests (Chromium)
npm run test:hud            # 10 tests — HUD widget
npm run test:widget         #  8 tests — compact widget
npm run test:desktop        # 10 tests — live desktop
npm run test:regression     # 17 tests — main OS regression
npm run validate            # 10 structural checks
```

Cross-browser testing (Firefox + WebKit):
```bash
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Pre-Commit Hook

A pre-commit hook (`.githooks/pre-commit`) automatically validates JavaScript syntax in all `<script>` blocks before every commit. This catches bugs like:

- Unescaped apostrophes in single-quoted strings
- Missing `async` keywords on functions using `await`
- Unterminated string literals
- Other syntax errors that break page load

```bash
# The hook runs automatically — no setup needed
# To skip (not recommended): git commit --no-verify
# To install on clone: git config core.hooksPath .githooks
```

## CI Pipeline

GitHub Actions runs on every push and pull request to `main`/`master`.

### Job 1: `test` (blocking)
- Runs validation (`npm run validate`)
- Runs all 72 Playwright tests on **Chromium** (`npm run test:ci`)
- Uploads `playwright-report/` as artifact (7-day retention)
- **Must pass** before PRs can be merged

### Job 2: `cross-browser` (non-blocking)
- Runs after Job 1 passes (`needs: test`)
- Tests all 3 browsers: Chromium, Firefox, WebKit (`npm run test:cross-browser`)
- Configured with `continue-on-error: true` — failures don't block the pipeline
- Useful for identifying browser-specific regressions

### Running tests locally

```bash
# Chromium only (fast, what CI runs)
npm test

# All 3 browsers (full sweep)
npm run test:cross-browser

# Specific test file
npx playwright test karma-hud.spec.js --project=chromium

# Specific browser
npx playwright test --project=firefox
```

### Test file URLs

All test files use `http://localhost:8888/media/` to serve dashboards (not `file://` protocol). Start the server before running tests:

```bash
node server.js &
npm test
```

## Code Style

- **Formatter:** Prettier (`.prettierrc` in repo) — run `npx prettier --write .`
- **Fonts:** `Orbitron` for display/headings, `Inter` for body text
- **Theming:** Always use CSS custom properties (`--ac`, `--ac2`, `--ac3`, `--bg`, `--text`)
- **Dashboards:** Keep as self-contained single HTML files where possible
- **localStorage:** Use `ko_` prefix for keys (e.g., `ko_theme`, `ko_muted`)

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Run `npm test` and `npm run validate` — ensure everything passes
4. Submit PR with a clear description of what changed and why

## Adding a New Theme

1. Add a `[data-theme="yourtheme"]` block in the `:root` CSS
2. Add the theme pill button in the themes container
3. Add to the `themes` array in the `setTheme`/`cycleTheme` functions
4. Test in all 4 dashboards

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for system diagrams, data flow, and theme reference.
