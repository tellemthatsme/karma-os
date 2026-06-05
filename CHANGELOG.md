# Changelog

All notable changes to KARMA OS.

## [1.1.0] - 2025-06-05

### Added
- **Metrics Backend** (`server.js`) — Node.js HTTP server serving real CPU, memory, disk, and GitHub metrics on port 8888
- **Unified Dashboard** (`index.html`) — Single-page launcher linking all 4 dashboards with theme switcher
- **Cross-browser Testing** — Firefox and WebKit added to Playwright config
- **Docker Support** — Dockerfile + docker-compose.yml with nginx reverse proxy
- **Deployment Configs** — Vercel (`vercel.json`) and Netlify (`netlify.toml`) one-click deploy
- **Architecture Docs** — ARCHITECTURE.md with system diagrams and data flow
- **Contributing Guide** — CONTRIBUTING.md with dev setup and code style
- **License** — MIT license
- **Prettier Config** — `.prettierrc` + `.prettierignore` for consistent formatting
- **CHANGELOG.md** — This file

## [1.0.0] - 2025-06-04

### Added
- **Main OS Dashboard** (`karma-os-ultimate.html`) — Full terminal-style monitor with 8 agents, crypto, activity feed
- **Floating HUD** (`karma-hud.html`) — 300px draggable overlay with NITRO boost, always-on-top pin
- **Compact Widget** (`karma-widget.html`) — Lightweight sidebar monitor
- **Live Desktop** (`live-desktop.html`) — Desktop overlay with matrix rain and terminal HUD
- **Always-on-top Scripts** — `karma-top.ps1` (PowerShell) and `karma-top.ahk` (AutoHotkey)
- **Windows Launcher** (`launch-karma.bat`) — 10-option menu for all dashboards
- **Playwright Test Suite** — 45 tests across 4 spec files (all passing)
- **Structural Validation** (`validate-karma.js`) — 10 automated checks
- **GitHub Actions CI** — Runs all tests on push/PR
- **CoinGecko Integration** — Live BTC/ETH/SOL prices
- **Activity Feed** — Scrolling event log with color-coded entries
- **Matrix Rain** — Canvas background effect
- **Scanlines + Spotlight** — CRT and mouse-follow effects
