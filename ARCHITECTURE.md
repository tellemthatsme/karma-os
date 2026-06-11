# KARMA OS — Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          KARMA OS v1.3.0                             │
├───────────┬───────────┬──────────────┬──────────────┬───────────────┤
│ Unified   │  Main OS  │     HUD      │   Widget     │ Live Desktop  │
│ (26 KB)   │ (134 KB)  │   (18 KB)    │   (12 KB)    │   (47 KB)     │
│ Themes    │ Terminal  │  Floating    │  Sidebar     │ Matrix Rain   │
│ Palette   │ Agents    │  NITRO       │  Compact     │ CR Analysis   │
│ Export    │ Crypto    │  Pin         │  Quick       │ Fleet Mgmt    │
├───────────┴───────────┴──────────────┴──────────────┴───────────────┤
│                    Shared Design System                               │
│  CSS Variables (6 themes) · Orbitron/Inter fonts · localStorage     │
├─────────────────────────────────────────────────────────────────────┤
│  Metrics Server (Node.js :8888)        │  External APIs             │
│  CPU · Memory · Disk · GitHub · Git    │  CoinGecko                 │
├────────────────────────────────────────┴────────────────────────────┤
│  Infrastructure                                                      │
│  Docker · nginx · Vercel · Netlify · GitHub Actions CI              │
└─────────────────────────────────────────────────────────────────────┘
```

## Dashboard Relationships

```
                    ┌───────────────┐
                    │  index.html   │ ← Unified Launcher
                    │  (hub page)   │
                    └───────┬───────┘
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │  Main OS     │ │  HUD Widget  │ │ Live Desktop │
   │  (ultimate)  │ │  (300px)     │ │ (fullscreen) │
   └──────┬───────┘ └──────────────┘ └──────┬───────┘
          │                                  │
          ▼                                  ▼
   ┌──────────────┐                  ┌──────────────┐
   │ Widget       │                  │ live-desktop  │
   │ (sidebar)    │                  │ .html/.js/.css│
   └──────────────┘                  └──────────────┘
```

All dashboards share:
- CSS variable system (`--ac`, `--ac2`, `--ac3`, `--bg`, `--text`, etc.)
- `localStorage` keys (`ko_theme`, `ko_muted`, `ko_start`, `ko_gh`, etc.)
- Metrics server at `localhost:8888` with mock fallback

## Theme System

6 themes defined as CSS custom properties:

| Theme | Primary | Accent 2 | Accent 3 | Background |
|---|---|---|---|---|
| Cyberpunk | `#00d4ff` | `#b347ff` | `#00ff9d` | `#060a14` |
| Stealth | `#64ffda` | `#a8b2d1` | `#8892b0` | `#0a0e14` |
| Alert | `#ff3366` | `#ff6b35` | `#ffbd00` | `#14060a` |
| Matrix | `#00ff41` | `#008f11` | `#00ff41` | `#000300` |
| Aurora | `#a78bfa` | `#34d399` | `#f9a8d4` | `#0d0d1a` |
| Light | `#0077cc` | `#7c3aed` | `#059669` | `#f0f4f8` |

Theme switching uses `data-theme` attribute on `<html>`. Cyberpunk is the default (no attribute).

## Data Flow

```
Browser ──fetch()──→ Metrics Server (Node.js :8888)
   │                       │
   ├── CoinGecko API       ├── os.cpus() × 2 snapshots (100ms delta)
   ├── localStorage        ├── os.freemem/totalmem
   └── Mock fallback       ├── wmic/df (disk)
                           └── git rev-list (commits)
```

### API Endpoints

| Endpoint | Method | Response |
|---|---|---|
| `/metrics` | GET | CPU %, memory %, disk %, hostname, uptime, timestamp |
| `/github` | GET | Public repos count, followers |
| `/cr` | GET | Security score, total scans |
| `/git` | GET | Git commit count |
| `/health` | GET | Server status, uptime |
| `/api/chat` | POST | Claude API proxy (ANTHROPIC_API_KEY in env) |
| `/api/research/refresh` | POST | Trigger AI research pipeline refresh |
| `/api/research/status` | GET | Research pipeline status (last run, next run) |
| `/api/research/rss` | GET | Atom feed — current brief + 30 archived |
| `/api/research/history` | GET | List of archived briefs |
| `/media/*` | GET | Static files — command center, dashboards, diagrams |
| `/_archive/*` | GET | Archived research brief files |

## Test Architecture

```
playwright.config.js (3 browsers: chromium, firefox, webkit)
  ├── karma-hud.spec.js        10 tests   HUD widget
  ├── karma-regression.spec.js  17 tests   Main OS regression
  ├── karma-widget.spec.js       8 tests   Compact widget
  ├── live-desktop.spec.js      10 tests   Live desktop
  └── karma-visual.spec.js       8 tests   Visual regression screenshots

validate-karma.js               10 checks  Structural validation

Total: 72 tests (Chromium all passing)
```

### Cross-Browser Results

| Browser | Pass | Fail | Notes |
|---|---|---|---|
| Chromium | 53 | 0 | Primary target |
| Firefox | 50 | 3 | Bar visibility, toast timing |
| WebKit | 38 | 15 | `file://` CORS/timeouts |

## CI/CD Pipeline

```
Push/PR to main
  → GitHub Actions (ubuntu-latest)
    → npm ci
    → npx playwright install (all 3 browsers)
    → npm run validate (10 checks)
    → npm run test:ci (53 tests, HTML reporter)
    → Upload playwright-report artifact
```

## `/media/` Static File Handler

```
Browser ──GET /media/TELLLEMTHATSME_COMMAND_CENTER.html──→ server.js
   │                                                         │
   ├── decodeURIComponent(url.split('#')[0])                 │
   ├── replace(/\.\./g, '')  ← strip path traversal          │
   ├── path.join(__dirname, 'media', safe)                   │
   ├── if (!full.startsWith(__dirname + '/media')) → 403     │
   └── fs.readFile(full) → 200 with Content-Type             │
       └── Error → 404 text/plain (no path leakage)         │
```

Security: defense-in-depth with 3 layers (decode try/catch, `..` stripping, `startsWith` check).

## Pre-Commit Hook

```
git commit
  → .githooks/pre-commit
    → find all <script> blocks >50 chars in changed .html files
    → write each to tempfile
    → node -c <tempfile>  (syntax check)
    → if any fail → abort commit with error details
```

Uses `python3`/`python` fallback and `tempfile.gettempdir()` for cross-platform compatibility.

## Infrastructure

```
Docker Compose
  ├── karma-metrics (Node.js :8888)
  │   └── server.js with 5 endpoints
  └── karma-web (nginx :8080)
      └── Static files + /api/* proxy to metrics
```

## File Size Budget

| Category | Files | Total Size |
|---|---|---|
| Dashboards | 5 HTML + 2 JS + 1 CSS | ~360 KB |
| Tests | 6 spec.js + 1 validate.js | ~41 KB |
| Infrastructure | Docker, CI, deploy configs | ~5 KB |
| Documentation | 7 .md files | ~40 KB |
| Scripts | bat, ps1, ahk | ~13 KB |
| Config | package.json, prettierrc, etc. | ~6 KB |
| **Active total** | **50+ files** | **~650 KB** |
| Legacy versions | `karma-os-v6.html`, `karma-os-v6 (1).html`, `karma-enhancements (2).html` | ~225 KB |
| Legacy docs | `KARMA-OS-DOCUMENTATION.md`, `N8N-SETUP-GUIDE.md` | ~31 KB |
