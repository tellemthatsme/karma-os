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

All PRs must pass the 53-test Playwright suite:

```bash
npm test                    # Run all 53 tests (Chromium)
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
