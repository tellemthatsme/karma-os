# Changelog

All notable changes to KARMA OS.

## [1.2.0] - 2025-06-06

### Added — Unified Dashboard (`index.html`)
- **6 color themes** — Cyberpunk, Stealth, Alert, Matrix, Aurora, Light
- **Command palette** (`Ctrl+K`) — search dashboards, switch themes, toggle settings
- **Keyboard shortcuts** — `Ctrl+M` (mute), `Ctrl+E` (export), `1`-`4` (dashboards), `T` (cycle themes)
- **Sound effects** — Web Audio API synthesized clicks, opens, theme changes, success/error chimes
- **Toast notifications** — Animated info/success/warning/error messages with auto-dismiss
- **Data export** — Downloads JSON + CSV with metrics, settings, and dashboard info
- **Responsive design** — Breakpoints at 768px (tablet) and 480px (mobile)
- **LocalStorage persistence** — Theme and mute settings shared across all dashboards via `ko_theme`/`ko_muted` keys
- **Live metrics** — CPU, memory, uptime stats from `localhost:8888`
- **6 dashboard cards** — Main OS, HUD, Widget, Live Desktop, Documentation, Architecture

### Added — Metrics Backend (`server.js`)
- **Two-snapshot CPU measurement** — Accurate instantaneous CPU usage (100ms delta)
- **Cross-platform** — Windows (`wmic`, `2>nul`) and Linux/macOS (`df`, `2>/dev/null`) support
- **5 endpoints** — `/metrics`, `/github`, `/cr`, `/git`, `/health`
- **CORS enabled** — Accessible from any dashboard origin

### Added — Docker Support
- **Dockerfile** — Node 20 Alpine with health checks
- **docker-compose.yml** — Metrics server + nginx reverse proxy
- **nginx.conf** — Proxies `/api/*` to metrics server, serves dashboards at `/`
- **.dockerignore** — Excludes tests, configs, Windows scripts, `node_modules`

### Added — Deployment Configs
- **vercel.json** — Vercel static + serverless config
- **netlify.toml** — Netlify redirect rules

### Added — Visual Regression Tests (`karma-visual.spec.js`)
- 8 screenshot-based tests covering all dashboards
- Main OS, HUD, Widget, Desktop, Unified, theme switching, command palette, toasts
- Screenshots saved to `test-results/` for visual diffing

### Added — Cross-Browser Testing
- Firefox and WebKit added to `playwright.config.js`
- CI workflow updated to install all 3 browsers
- Results: Chromium 53/53, Firefox 50/53, WebKit 38/53

### Added — Documentation
- **ARCHITECTURE.md** — System diagrams, data flow, theme reference, test architecture
- **DEPLOY.md** — 5 deployment options (Docker, Vercel, Netlify, GitHub Pages, local)
- **CONTRIBUTING.md** — Dev setup, code style, PR guidelines
- **CHANGELOG.md** — This file
- **LICENSE** — MIT
- **.prettierrc** + **.prettierignore** — Code formatting config

### Changed
- `playwright.config.js` — Added Firefox + WebKit projects, screenshot-on-failure
- `.github/workflows/test.yml` — Installs all 3 browsers (not just Chromium)
- `package.json` — Added `server`, `docker:build/up/down`, `deploy:vercel/netlify` scripts
- `README.md` — Complete rewrite with all features, cross-browser results, GitHub URL

### Fixed
- localStorage theme keys unified across all dashboards (`ko_theme`, `ko_muted`)

## [1.1.0] - 2025-06-05

### Added
- **Always-on-top support** — `karma-top.ps1` (PowerShell via Win32 SetWindowPos P/Invoke)
- **AutoHotkey hotkey** — `karma-top.ahk` with `Ctrl+Shift+T` global toggle
- **HUD pin status indicator** — Footer shows FREE/PINNED with glow dot
- **Toast notifications in HUD** — Visual feedback for pin/unpin actions
- **HUD in Open All** — `launch-karma.bat` option 6 now opens all 4 dashboards
- **Launcher toggle option** — `T` option in launcher runs `karma-top.ps1`

### Fixed
- HUD drag handler regex — Replaced broken Unicode escapes with proper `translate()` parser
- HUD nitroBtn click handler — Added missing `onclick` for NITRO button
- Flaky tests — Widget "system bars" and regression "Impossible Desk modal" use explicit `waitForSelector`
- Live-desktop spec — "terminal HUD" and "system health bars" tests use proper waits
- PowerShell `-Widget` flag — Now actually targets the widget window title
- AutoHotkey script — Removed dead code and misleading comments

## [1.0.0] - 2025-06-04

### Added
- **Main OS Dashboard** (`karma-os-ultimate.html`) — Full terminal-style monitor with 8 agents, crypto, activity feed, command palette
- **Floating HUD** (`karma-hud.html`) — 300px draggable overlay with NITRO boost, always-on-top pin, collapse
- **Compact Widget** (`karma-widget.html`) — Lightweight sidebar monitor with system metrics
- **Live Desktop** (`live-desktop.html`) — Desktop overlay with matrix rain, terminal HUD, CR analysis hub
- **45 Playwright tests** — HUD (10), regression (17), widget (8), desktop (10) — all passing
- **Structural validation** (`validate-karma.js`) — 10 automated checks
- **GitHub Actions CI** — Runs all tests on push/PR with artifact upload
- **CoinGecko integration** — Live BTC/ETH/SOL prices
- **Activity feed** — Scrolling event log with color-coded entries
- **Matrix rain** — Canvas background effect with falling characters
- **Scanlines + Spotlight** — CRT overlay and mouse-follow radial gradient
- **Windows launcher** (`launch-karma.bat`) — 10-option menu
