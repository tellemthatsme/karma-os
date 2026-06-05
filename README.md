# ⚡ KARMA OS

> A cyberpunk-themed multi-dashboard system monitor with a floating HUD, widget, live desktop overlay, and full-featured terminal interface.

![Tests](https://img.shields.io/badge/tests-45%2F45-brightgreen)
![Playwright](https://img.shields.io/badge/Playwright-v1.52-blue)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## 🖥️ Dashboards

| Dashboard | File | Description |
|---|---|---|
| **Main OS** | `karma-os-ultimate.html` | Full terminal-style system monitor with agents, crypto, activity feed, and command palette |
| **HUD Widget** | `karma-hud.html` | 300px floating overlay — draggable, collapsible, always-on-top, NITRO boost |
| **Compact Widget** | `karma-widget.html` | Lightweight sidebar widget with system metrics and quick actions |
| **Live Desktop** | `live-desktop.html` + `.js` + `.css` | Desktop overlay with matrix rain, terminal HUD, and health bars |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Install Playwright Chromium browser
npx playwright install chromium

# Launch all dashboards
launch-karma.bat
```

### Launch Options

| Key | Action |
|---|---|
| `1` | Open Main OS Dashboard |
| `2` | Open HUD Widget (frameless, top-right) |
| `3` | Open Compact Widget |
| `4` | Open Live Desktop |
| `5` | Open HUD in always-on-top mode |
| `6` | Open All Dashboards |
| `T` | Toggle always-on-top (via PowerShell) |
| `V` | Run validation checks |
| `D` | Run all tests |
| `H` | View documentation |

### Always-On-Top

```powershell
# Toggle always-on-top for HUD window
powershell -ExecutionPolicy Bypass -File karma-top.ps1

# Toggle for widget window
powershell -ExecutionPolicy Bypass -File karma-top.ps1 -Widget

# AutoHotkey: press Ctrl+Shift+T from anywhere
karma-top.ahk
```

## 🧪 Testing

```bash
# Run all 45 tests
npm test

# Run specific suites
npm run test:hud          # 10 tests — HUD widget
npm run test:widget       #  8 tests — compact widget
npm run test:desktop      # 10 tests — live desktop
npm run test:regression   # 17 tests — main OS regression

# Run validation checks
npm run validate          # 10 structural checks
```

## 📁 Project Structure

```
karma/
├── karma-os-ultimate.html    # Main OS dashboard (134 KB)
├── karma-hud.html            # Floating HUD widget
├── karma-widget.html         # Compact sidebar widget
├── live-desktop.html         # Desktop overlay
├── live-desktop.js           # Desktop overlay logic
├── live-desktop.css          # Desktop overlay styles
├── launch-karma.bat          # Multi-option launcher
├── karma-top.ps1             # PowerShell always-on-top toggle
├── karma-top.ahk             # AutoHotkey global hotkey (Ctrl+Shift+T)
├── validate-karma.js         # Structural validation script
├── playwright.config.js      # Playwright test config
├── karma-hud.spec.js         # HUD tests (10)
├── karma-widget.spec.js      # Widget tests (8)
├── karma-regression.spec.js  # Regression tests (17)
├── live-desktop.spec.js      # Desktop tests (10)
├── KARMA-DASHBOARDS.txt      # Full feature documentation
├── package.json              # npm scripts & dependencies
└── README.md                 # This file
```

## 🎨 Features

- **8 AI Agents** with real-time status indicators
- **Crypto tracker** with live price simulation
- **CPU & Memory** animated health bars
- **Activity feed** with scrolling event log
- **Matrix rain** canvas background effect
- **NITRO boost** mode with particle animations
- **Command palette** (Ctrl+K) for quick navigation
- **3 color themes** — Cyberpunk, Midnight, Neon
- **Draggable & collapsible** panels
- **Spotlight + scanline** visual effects

## 📄 License

MIT
