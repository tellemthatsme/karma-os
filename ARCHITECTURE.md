# KARMA OS — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      KARMA OS v1.0                          │
├──────────┬──────────┬──────────────┬────────────────────────┤
│ Main OS  │   HUD    │   Widget     │    Live Desktop        │
│ (134KB)  │ (18KB)   │   (12KB)     │    (47KB)              │
├──────────┴──────────┴──────────────┴────────────────────────┤
│                    Shared Design System                      │
│  CSS Variables · Orbitron/Inter fonts · Cyberpunk themes    │
├─────────────────────────────────────────────────────────────┤
│  Metrics Server (localhost:8888)  │  External APIs          │
│  CPU · Memory · Disk · GitHub     │  CoinGecko · Bluesky    │
└─────────────────────────────────────────────────────────────┘
```

## Dashboard Relationships

```
karma-os-ultimate.html  ←→  karma-hud.html
       ↕                        ↕
karma-widget.html  ←→  live-desktop.html + .js + .css
```

All dashboards share the same CSS variable system (`--ac`, `--ac2`, `--ac3`, `--bg`, etc.)
and connect to `localhost:8888` for real metrics, falling back to mock data.

## Theme System

| Theme    | Primary    | Accent 2   | Accent 3   |
|----------|-----------|------------|------------|
| Cyberpunk| `#00d4ff` | `#b347ff`  | `#00ff9d`  |
| Stealth  | `#64ffda` | `#a8b2d1`  | `#8892b0`  |
| Alert    | `#ff3366` | `#ff6b35`  | `#ffbd00`  |
| Matrix   | `#00ff41` | `#008f11`  | `#00ff41`  |
| Aurora   | `#a78bfa` | `#34d399`  | `#f9a8d4`  |

## Data Flow

```
Browser ←──── fetch() ────→ Metrics Server (Node.js :8888)
  │                              │
  ├── CoinGecko API (crypto)     ├── os.cpus() (CPU)
  ├── localStorage (settings)    ├── os.freemem/totalmem (RAM)
  └── Mock fallback              └── exec() (disk, git)
```

## Test Architecture

```
playwright.config.js
  ├── karma-hud.spec.js       (10 tests)
  ├── karma-regression.spec.js (17 tests)
  ├── karma-widget.spec.js     (8 tests)
  └── live-desktop.spec.js     (10 tests)

validate-karma.js              (10 structural checks)
```
