# KARMA OS — Master Documentation

> **Complete project documentation — all components, all files, all knowledge.**
> Cyberpunk-themed multi-dashboard system monitor + AI research pipeline + music release system + 37 curated GitHub repos + 27 YouTube channels.
>
> Last updated: June 13, 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Quick Commands](#quick-commands)
4. [File Map](#file-map)
5. [5 Dashboards](#5-dashboards)
6. [Metrics Server (server.js)](#metrics-server)
7. [AI Browser Bridge](#ai-browser-bridge)
8. [AI Research Pipeline](#ai-research-pipeline)
9. [5 Claude Code Agents](#5-claude-code-agents)
10. [5 Claude Code Skills](#5-claude-code-skills)
11. [3 MCP Servers](#3-mcp-servers)
12. [Theme System](#theme-system)
13. [16-Track Music System](#16-track-music-system)
14. [27 YouTube Channels](#27-youtube-channels)
15. [37 GitHub Awesome Repos](#37-github-awesome-repos)
16. [Environment Variables](#environment-variables)
17. [Code Conventions](#code-conventions)
18. [Common Workflows](#common-workflows)
19. [Deployment](#deployment)
20. [Claude Code Configuration](#claude-code-configuration)
21. [CLI Tools Configuration](#cli-tools-configuration)

---

## Project Overview

KARMA OS is a cyberpunk-themed, multi-functional system monitor and command center built as a collection of HTML dashboards backed by a Node.js metrics server, a Python AI Browser Bridge, and a Claude Code agent/skill ecosystem.

- **Author**: Brendan Foots (tellemthatsme)
- **Tech stack**: HTML/CSS/JS (browser), Node.js (server), Python (bridge + scripts)
- **AI coding tools**: Claude Code, Codex CLI (GPT-5.4), Kilo Code (Grok Code Fast / Minimax)
- **Testing**: Playwright (72 tests, Chromium primary, 3-browser CI)
- **Deployment**: Docker, VPS, Vercel, Netlify, GitHub Pages

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KARMA OS Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ index    │  │ ultimate │  │   HUD    │  │ widget   │   │
│  │ .html    │  │  .html   │  │  .html   │  │ .html    │   │
│  │ Launcher │  │ Main OS  │  │ Floating │  │ Sidebar  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│  ┌────┴─────────────┴─────────────┴─────────────┴────┐     │
│  │           live-desktop.html/.js/.css               │     │
│  │           Desktop Overlay + Matrix Rain            │     │
│  └────────────────────────┬───────────────────────────┘     │
│                           │                                 │
│                  Shared CSS Variable System                 │
│              (6 themes via data-theme attribute)            │
│                           │                                 │
│              ┌────────────┴────────────┐                    │
│              │      localhost:8888     │                    │
│              │     server.js (API)     │                    │
│              │  ┌──────────────────┐   │                    │
│              │  │ /api/chat        │───┼──→ Claude API      │
│              │  │ /api/research/*  │───┼──→ youtube_research│
│              │  │ /api/push/*      │───┼──→ Discord/TG/Slack│
│              │  │ /metrics         │───┼──→ System stats    │
│              │  └──────────────────┘   │                    │
│              └─────────────────────────┘                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AI Browser Bridge (:9876)               │    │
│  │  ┌──────────┐     ┌──────────┐     ┌──────────┐     │    │
│  │  │Python    │────→│ Command  │────→│ Chrome/  │     │    │
│  │  │Bridge    │←────│ Queue    │←────│ Firefox  │     │    │
│  │  │Server    │     │          │     │ Extension│     │    │
│  │  └──────────┘     └──────────┘     └──────────┘     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Claude Code (.claude/)                  │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐   │    │
│  │  │5 Agents│ │5 Skills│ │3 MCP   │ │1 Hook +    │   │    │
│  │  │        │ │        │ │Servers │ │Settings    │   │    │
│  │  └────────┘ └────────┘ └────────┘ └────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Music System: 16 tracks → dual YouTube channels            │
│  Research: 27 channels → weekly brief → multi-platform push │
│  Knowledge: 37 curated GitHub awesome-* repos               │
└─────────────────────────────────────────────────────────────┘
```

### Ports

| Port | Service | Description |
|------|---------|-------------|
| **8888** | Metrics Server | 16 API endpoints, Claude proxy, research pipeline |
| **9876** | AI Browser Bridge | Chrome/Firefox browser automation via extension |
| **8080** | nginx (Docker) | Static files + reverse proxy |
| **5678** | n8n (Docker) | Workflow automation |

---

## Quick Commands

```bash
# Testing (72 tests total)
npm test                           # Chromium, list reporter
npm run test:all                   # Same as above
npm run test:hud                   # HUD (10 tests)
npm run test:widget                # Widget (8 tests)
npm run test:desktop               # Desktop (10 tests)
npm run test:regression            # Main OS (17 tests)
npm run test:visual                # Visual (8 tests)
npm run test:cross-browser         # All 3 browsers
npm run validate                   # 10 structural checks (fast, no browser)

# Server
npm run server                     # localhost:8888
npm run docker:up                  # Start all Docker services
npm run docker:down                # Stop all Docker services

# Launch (Windows)
cmd /c launch-karma.bat            # 10-option launcher

# Python scripts
python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md
python scripts/SOCIAL_POSTER.py --generate "Title" x --style announcement
python scripts/SOCIAL_POSTER.py --post --content post.json --platform facebook_group
python scripts/youtube_researcher.py --test  # Test bridge + Claude proxy

# Pre-commit
git config core.hooksPath .githooks  # Enable pre-commit syntax check
```

---

## File Map

### Core Dashboards (5 HTML files)

| File | Description | Size |
|------|-------------|------|
| `index.html` | Unified launcher — 6 theme selector, command palette, keyboard shortcuts, export | 26 KB |
| `karma-os-ultimate.html` | Main OS dashboard — terminal, 8 agents, crypto tracker, activity feed, army modal | 134 KB |
| `karma-hud.html` | Floating HUD — 300px, draggable, collapsible, NITRO boost mode | 18 KB |
| `karma-widget.html` | Compact sidebar widget — 360px, always-visible | 12 KB |
| `live-desktop.html` | Desktop overlay — Matrix rain canvas, terminal HUD, CR analysis | 12 KB |
| `live-desktop.js` | Desktop overlay logic | 22 KB |
| `live-desktop.css` | Desktop overlay styles | 12 KB |

### Server & Config

| File | Description |
|------|-------------|
| `server.js` | Node.js metrics backend — plain HTTP, no frameworks, 16 endpoints |
| `playwright.config.js` | 3-browser test config (chromium/firefox/webkit) |
| `validate-karma.js` | 10 structural checks via Playwright |
| `sw.js` | Service worker (offline caching) |

### Test Files (9 spec files, 72 tests)

| File | Tests | Focus |
|------|-------|-------|
| `karma-hud.spec.js` | 10 | HUD widget functionality |
| `karma-widget.spec.js` | 8 | Compact widget |
| `live-desktop.spec.js` | 10 | Live desktop overlay |
| `karma-regression.spec.js` | 17 | Main OS regression suite |
| `karma-visual.spec.js` | 8 | Visual regression |
| `karma-server-regression.spec.js` | ~7 | Server API endpoints |
| `karma-research.spec.js` | ~6 | AI research pipeline |
| `karma-security.spec.js` | ~3 | Security checks |
| `karma-os.spec.js` | ~3 | Orchestration/OS |

### Scripts

| File | Language | Description |
|------|----------|-------------|
| `scripts/youtube_researcher.py` | Python | AI research pipeline — scrapes 27 channels, summarizes via Claude |
| `scripts/SOCIAL_POSTER.py` | Python | Cross-platform social media posting |
| `browser_extension/bridge_server.py` | Python | AI Browser Bridge server (:9876) |

### Music & Revenue

| File | Description | Size |
|------|-------------|------|
| `media/TELLLEMTHATSME_COMMAND_CENTER.html` | Music command center with 22 tabs | 179 KB |
| `media/REVENUE_DASHBOARD.html` | YPP progress tracking + streaming revenue estimates | — |
| `launch/DAILY_POSTING_BOARD.html` | Day-by-day track posting checklist | — |

### Key Documentation Files

| File | When to reference |
|------|------------------|
| `README.md` | Project overview, quick start, keyboard shortcuts |
| `ARCHITECTURE.md` | System diagrams, data flow, theme reference |
| `KARMA_OS_SHIPPED.md` | Release notes, bug fix history, verification |
| `PRD.md` | Music release requirements, track inventory, dedications |
| `PROMPT.md` | AI prompt templates, bridge API, upload workflow |
| `CHANGELOG.md` | Version history |
| `DEPLOY.md` | 6 deployment options, env vars, troubleshooting |
| `CONTRIBUTING.md` | Dev setup, code style, PR guidelines |
| `ai_news/AI_NEWS_CHANNEL.md` | YouTube channel strategy, content calendar |
| `ai_news/discoveries/AWESOME_REPOS.md` | 37 GitHub awesome repos, deep dives |
| `MASTER_DOC.md` | This file — complete project documentation |

### Windows Utilities

| File | Description |
|------|-------------|
| `launch-karma.bat` | Windows launcher with 10 options |
| `karma-top.ps1` | PowerShell always-on-top toggle |
| `karma-top.ahk` | AutoHotkey Ctrl+Shift+T global hotkey |

### Infrastructure

| File | Description |
|------|-------------|
| `docker-compose.yml` | Multi-service orchestration (metrics + nginx + bridge + n8n) |
| `Dockerfile` | Metrics server image |
| `Dockerfile.bridge` | Bridge server image |
| `nginx.conf` | Reverse proxy configuration |
| `vercel.json` | Vercel deployment routes |
| `netlify.toml` | Netlify redirect rules |
| `.github/workflows/test.yml` | CI: 3-browser test on push/PR |
| `.githooks/pre-commit` | Script block syntax validator |

---

## 5 Dashboards

### Shared Design System

All dashboards share a single CSS variable system. Themes are controlled via the `data-theme` attribute on `<html>`:

```html
<html data-theme="stealth">  <!-- Explicit theme -->
<html>                        <!-- Defaults to Cyberpunk -->
```

**CSS Variables**: `--ac`, `--ac2`, `--ac3`, `--bg`, `--panel`, `--border`, `--text`, `--muted`, `--warn`, `--danger`

**localStorage Keys**: `ko_theme`, `ko_muted`, `ko_gh`, `ko_start`

**Fonts**: Orbitron (display/headings), Inter (body/UI)

### Dashboard Details

| Dashboard | Key Features |
|-----------|-------------|
| **index.html** (launcher) | 6 theme selector, command palette (Ctrl+K), keyboard shortcuts reference, theme export |
| **karma-os-ultimate.html** (main) | Terminal emulator, 8 agent status indicators, crypto price tracker, activity feed, army modal (20 FOOTCLAN + 24 specialists), settings modal, n8n status |
| **karma-hud.html** (HUD) | 300px floating window, drag handle, collapse toggle, NITRO boost animation, always-on-top via karma-top scripts |
| **karma-widget.html** (widget) | 360px compact sidebar, module grid, mini agent indicators |
| **live-desktop.html** (desktop) | Canvas Matrix rain background, terminal HUD overlay, CR (credit) analysis, real-time system metrics |

### Connection Pattern

```
Dashboard → fetch(localhost:8888) → server.js response
                          ↓
                    Mock fallback (when offline)
```

---

## Metrics Server

### server.js

- **Framework**: Plain Node.js HTTP (no Express, no dependencies)
- **Port**: 8888 (configurable via `PORT` env var)
- **CORS**: Global `Access-Control-Allow-*` headers on every response

### Full Endpoint Reference

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/`, `/metrics` | GET | CPU (2-snapshot 100ms delta), memory, disk, hostname, uptime | Open |
| `/github` | GET | Public repos + followers for `GH_USER` | Open |
| `/cr` | GET | Static security score | Open |
| `/git` | GET | Git commit count | Open |
| `/health` | GET | `{"status":"ok"}` | Open |
| `/api/chat` | POST | Claude API proxy with SSE streaming | `ANTHROPIC_API_KEY` |
| `/api/research/refresh` | POST | Triggers `youtube_researcher.py` in background | Open |
| `/api/research/status` | GET | Research job state + brief metadata | Open |
| `/api/research/rss` | GET | Atom feed of archived briefs | Open |
| `/feed.xml`, `/rss` | GET | Aliases for `/api/research/rss` | Open |
| `/api/research/history` | GET | List of archived briefs (last 30 days) | Open |
| `/api/push/discord` | POST | Forward brief content to Discord webhook | `DISCORD_WEBHOOK_AI_BRIEF` |
| `/api/push/telegram` | POST | Forward to Telegram bot (Markdown mode) | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_AI_BRIEF_CHAT_ID` |
| `/api/push/slack` | POST | Forward to Slack webhook | `SLACK_WEBHOOK_AI_BRIEF` |
| `/media/*` | GET | Static file server (3-layer path traversal protection) | Open |
| `/_archive/*` | GET | Archived briefs (alphanumeric path check + startsWith) | Open |

### Security Patterns

- **Static files**: `decodeURIComponent` → strip `..` → `split('#')` → `startsWith` check (3 layers)
- **Archive**: Alphanumeric-only path validation + `path.join` directory confinement
- **Claude proxy**: API key stays in server env — never exposed to browser
- **All exec**: Uses `exec()` with explicit timeout

---

## AI Browser Bridge

### Architecture

```
AI Client (Claude/ChatGPT/Codebuff)
  │
  ├── POST /command/send ──→ Bridge Server (:9876) ──→ Command Queue
  │                                                       │
  │                              Extension polls ←────────┘ (every 3s)
  │                                 │
  │                          GET /command/poll
  │                                 │
  │                          Extension executes in real browser
  │                                 │
  │                          POST /command/result ──→ Bridge
  │                                                       │
  └── GET /result/{job_id} ←──────────────────────────────┘
```

### Bridge API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | `{"status":"running","queue_length":0,"auth":"open"}` |
| `/command/send` | POST | `{"action":"navigate","params":{"url":"..."}}` → `{"job_id":"abc","status":"queued"}` |
| `/command/poll` | GET | Extension polls every 3s — returns next command or 204 |
| `/command/result` | POST | Extension posts result: `{"job_id":"abc","result":{...}}` |
| `/result/{job_id}` | GET | AI polls — 404 = not ready/consumed, 200 = result |

### Actions

| Action | Params | Timeout | Use Case |
|--------|--------|---------|----------|
| `navigate` | `{"url":"..."}` | 15s | Open any URL |
| `click` | `{"text":"..."}` or `{"selector":"..."}` | 10s | Click button/link |
| `type` | `{"selector":"...","text":"..."}` | 10s | Fill form field |
| `extract` | `{"selector":"..."}` (optional) | 10s | Get page content |
| `screenshot` | — | 10s | Capture page |
| `evaluate` | `{"code":"..."}` | 15s | Run JavaScript |
| `upload_video` | `{"track":1,"channel":"main"}` | 180s | YouTube Studio 16-step flow |

### Browser Extensions

| Browser | Version | Location |
|---------|---------|----------|
| Chrome | Manifest V3 | `browser_extension/chrome/` |
| Firefox | Manifest V2 | `browser_extension/firefox/` |

Extension popup: one-button START/STOP for bridge connection. Background worker polls `/command/poll` every 3 seconds.

---

## AI Research Pipeline

### youtube_researcher.py

- **Language**: Python 3 (stdlib only — no external dependencies)
- **Input**: 27 curated YouTube channels (CHANNELS dict)
- **Output**: `ai_news/CURRENT_AI_BRIEF.md` (structured markdown)
- **Dependencies**: Bridge server (:9876) for scraping + Server (:8888) for Claude API proxy

### Modes

| Flag | Description | Needs Bridge | Needs Claude |
|------|-------------|-------------|--------------|
| `--trending` | Generate brief from channel roster only (no scraping) | No | Yes |
| `--channel "Name1" "Name2"` | Full scrape: open channels, extract videos, summarize | Yes | Optional |
| `--summarize-only` | Summarize from saved research.json | No | Yes |
| `--test` | Test bridge + Claude proxy connectivity | Yes | Optional |

### Brief Structure (7 sections)

1. `# 🔥 Top 5 AI Stories` — headlines with source links
2. `# 🧠 New Models Released` — table: model | company | key feature
3. `# 💻 AI Coding & Dev Tools` — editors, builders, MCP ecosystem tables
4. `# 🤖 AI Agent Frameworks` — orchestration + specialized agent tables
5. `# ⭐ Trending GitHub Repos` — top 15 with why-trending
6. `# 📺 YouTube Channel Strategy` — tables by category (27 channels)
7. `# 🎯 Recommended Actions` — 2-3 actionable items

### Archive & Distribution

- Previous brief auto-archived to `ai_news/archive/YYYY-MM-DD.md` on refresh
- Last 30 days kept, older auto-pruned
- Atom feed at `/api/research/rss` (also `/feed.xml`, `/rss`)
- Webhook push to Discord, Telegram, or Slack via `/api/push/:platform`

---

## 5 Claude Code Agents

All agents live in `.claude/agents/` and follow the YAML frontmatter + Markdown body format with `name`, `description`, `tools`, and `model: inherit`.

### 1. karma-test-runner

| Field | Value |
|-------|-------|
| **File** | `.claude/agents/karma-test-runner.md` |
| **Role** | Runs Playwright tests, structural validation, cross-browser sweeps |
| **Knowledge** | 72 tests (53 core + ~19 server/integration), cross-browser expectations, test commands, failure diagnosis |

**Key Commands**:
```bash
npm test                    # 72 tests (Chromium)
npm run test:cross-browser  # All 3 browsers
npm run validate            # 10 structural checks (fast)
```

### 2. karma-dashboard-dev

| Field | Value |
|-------|-------|
| **File** | `.claude/agents/karma-dashboard-dev.md` |
| **Role** | Modifies HTML/CSS/JS dashboards with theme awareness |
| **Knowledge** | 5 dashboards, 6 themes, CSS variables, localStorage conventions, effects library |

### 3. karma-server-dev

| Field | Value |
|-------|-------|
| **File** | `.claude/agents/karma-server-dev.md` |
| **Role** | Modifies server.js, API endpoints, research pipeline |
| **Knowledge** | 16 endpoints, security patterns, Claude proxy, CPU measurement, research pipeline |

### 4. karma-deploy

| Field | Value |
|-------|-------|
| **File** | `.claude/agents/karma-deploy.md` |
| **Role** | Docker, CI/CD, VPS, Vercel/Netlify, nginx, infrastructure |
| **Knowledge** | 6 deployment options, docker-compose profiles, nginx config, GitHub Actions CI |

### 5. social-media-poster

| Field | Value |
|-------|-------|
| **File** | `.claude/agents/social-media-poster.md` |
| **Role** | 16-track music posting, YouTube uploads, cross-platform social posts |
| **Knowledge** | 16-track inventory, bridge upload_video (16-step flow), post templates, revenue tracking |

---

## 5 Claude Code Skills

All skills live in `.claude/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`).

### 1. karma-theme-system

| Field | Value |
|-------|-------|
| **File** | `.claude/skills/karma-theme-system/SKILL.md` |
| **Purpose** | 6-theme design system — CSS variables, color palettes, effects library |

### 2. karma-bridge

| Field | Value |
|-------|-------|
| **File** | `.claude/skills/karma-bridge/SKILL.md` |
| **Purpose** | AI Browser Bridge — architecture, commands, extension flow, troubleshooting |

### 3. telllem-music

| Field | Value |
|-------|-------|
| **File** | `.claude/skills/telllem-music/SKILL.md` |
| **Purpose** | 16-track music release system — dedications, posting board, revenue, YPP targets |

### 4. research-brief

| Field | Value |
|-------|-------|
| **File** | `.claude/skills/research-brief/SKILL.md` |
| **Purpose** | AI weekly brief generation + management from 27 channels + 37 repos |

### 5. video-news

| Field | Value |
|-------|-------|
| **File** | `.claude/skills/video-news/SKILL.md` |
| **Purpose** | YouTube AI news channel production — 7-day content strategy, templates, thumbnails |

---

## 3 MCP Servers

### karma-bridge

| Field | Value |
|-------|-------|
| **File** | `.claude/mcp_servers/bridge_mcp.py` |
| **Transport** | stdio (JSON-RPC) |
| **Protocol** | MCP 2024-11-05 |
| **Backend** | `localhost:9876` (AI Browser Bridge) |
| **Tools (8)** | `bridge_status`, `bridge_navigate`, `bridge_click`, `bridge_type`, `bridge_extract`, `bridge_screenshot`, `bridge_evaluate`, `bridge_upload_video` |

### karma-metrics

| Field | Value |
|-------|-------|
| **File** | `.claude/mcp_servers/metrics_mcp.py` |
| **Transport** | stdio (JSON-RPC) |
| **Protocol** | MCP 2024-11-05 |
| **Backend** | `localhost:8888` (Metrics Server) |
| **Tools (8)** | `metrics_system`, `metrics_github`, `metrics_health`, `research_refresh`, `research_status`, `research_brief`, `research_history`, `research_push` |

### playwright

| Field | Value |
|-------|-------|
| **Command** | `npx @playwright/mcp@latest` |
| **Transport** | stdio |
| **Purpose** | Browser automation via MCP protocol |

### Configuration (settings.json)

```json
{
  "mcpServers": {
    "karma-bridge": {
      "command": "python",
      "args": [".claude/mcp_servers/bridge_mcp.py"],
      "env": { "BRIDGE_URL": "http://127.0.0.1:9876" }
    },
    "karma-metrics": {
      "command": "python",
      "args": [".claude/mcp_servers/metrics_mcp.py"],
      "env": { "METRICS_URL": "http://localhost:8888" }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

---

## Theme System

### 6 Theme Palettes

| Theme | `data-theme` | `--ac` (Primary) | `--ac2` (Secondary) | `--ac3` (Tertiary) | `--bg` (Background) | Vibe |
|-------|-------------|------------------|---------------------|--------------------|---------------------|------|
| **Cyberpunk** | (default) | `#00d4ff` | `#b347ff` | `#00ff9d` | `#060a14` | Default neon |
| **Stealth** | `stealth` | `#64ffda` | `#a8b2d1` | `#8892b0` | `#0a0e14` | Muted teal |
| **Alert** | `alert` | `#ff3366` | `#ff6b35` | `#ffbd00` | `#14060a` | High-contrast red |
| **Matrix** | `matrix` | `#00ff41` | `#008f11` | `#00ff41` | `#000300` | Classic green |
| **Aurora** | `aurora` | `#a78bfa` | `#34d399` | `#f9a8d4` | `#0d0d1a` | Soft purple |
| **Light** | `light` | `#0077cc` | `#7c3aed` | `#059669` | `#f0f4f8` | Clean light |

### 9 Effects

| Effect | Implementation | Usage |
|--------|---------------|-------|
| Border glow | `@keyframes` box-shadow shift | `.glow-border` |
| Breathing dot | `@keyframes breathe` opacity pulse | Agent status |
| Glow pulse | `text-shadow` animation | Clock, headings |
| NITRO flash | `box-shadow` scale pulse | Boost mode |
| Scanlines | `repeating-linear-gradient` overlay | CRT effect |
| Spotlight | `radial-gradient` mouse-follow | Hero sections |
| Matrix rain | Canvas + JS falling chars | Desktop background |
| Slide-in | `@keyframes slideIn` transform | Feed entries |
| Toast | Fixed + translateY animation | Notifications |

---

## 16-Track Music System

### Artist: TELLLEMTHATSME (Brendan Foots)

16 original hip-hop/trap tracks. Video files at `C:\Users\karma\Videos\New folder\Media_Bank\youtubevids\`.

### Full Roster

| # | Track Title | Theme | Dedication |
|---|-------------|-------|------------|
| 1 | EVERY MORNING WHEN I WAKE UP | Daily resilience | Kids + Love of my life |
| 2 | DONT RUSH ME | Patience | — |
| 3 | I LIVE FOR YOU | Devotion | Leah, Ryan, Jess |
| 4 | LIKE I MEANT TO DO | Heartbreak & recovery | Six-year relationship aftermath |
| 5 | MY CHILDREN | Parental alienation | Leah, Ryan, Jess |
| 6 | WEATHER YOU CAN DO | Resilience through storms | Leah, Ryan, Jess |
| 7 | I CANT BE HIM | Self-identity | — |
| 8 | TELLEMTHATSME | Self-branding | — |
| 9 | EVIL PAST | Overcoming past | — |
| 10 | JUST DRILL ME | Determination | — |
| 11 | WOODS | Isolation/reflection | — |
| 12 | NO CHEATS | Authenticity | — |
| 13 | TILL I'M DONE | Persistence | — |
| 14 | AI FIVE | Tech/AI theme | — |
| 15 | SINCE I WAS YOUNG | Origin story | — |
| 16 | EVERY MORNING (MV) | Music video | Kids + Love of my life |

### Strategy

- **Dual YouTube channels**: 16 tracks × 2 = 32 total uploads over 16 days
- **Kid-related tracks**: 1, 3, 4, 5, 6, 16 — do NOT mark as "Made for Kids" (adult/nostalgic content)
- **YPP target**: 1,000 subscribers + 4,000 watch hours (90-day target)
- **Hash tags**: `#TellLemThatsMe #HipHop` always; `#NewMusic #AustralianRap #OriginalMusic` context-dependent

### Posting Platforms

| Platform | Automation | Method |
|----------|-----------|--------|
| YouTube | Full | Bridge `upload_video` + Community posts |
| Facebook Groups | Full | Bridge navigate + click + type |
| X/Twitter | Full | Bridge compose |
| Instagram | Partial | Bridge navigate, then manual |
| TikTok | Partial | Bridge navigate to studio, then manual |

---

## 27 YouTube Channels

All 27 channels verified as of June 2026.

### News (5)
| Channel | Handle | Cadence | Focus |
|---------|--------|---------|-------|
| Wes Roth | @WesRoth | Daily | Daily AI news, agents, tools |
| Matt Wolfe | @maboroshi_desu | 3-5x/wk | AI tools, creator workflows |
| The AI Grid | @TheAIGrid | Weekly | Weekly AI news roundup |
| Matthew Berman | @matthewberman | 3x/wk | AI agents, demos, tutorials |
| AI Code King | @theaicodeking | Daily | Daily dev agent coverage |

### Research/Deep Dives (4)
| Channel | Handle | Cadence |
|---------|--------|---------|
| Andrej Karpathy | @AndrejKarpathy | Monthly |
| Yannic Kilcher | @YannicKilcher | 3-5x/wk |
| Two Minute Papers | @TwoMinutePapers | Weekly |
| 3Blue1Brown | @3blue1brown | Monthly |

### Tutorials/Coding (5)
| Channel | Handle | Cadence |
|---------|--------|---------|
| DeepLearning.AI | @DeepLearningAI | Weekly |
| Krish Naik | @krishnaik06 | 3x/wk |
| Tech With Tim | @TechWithTim | Weekly |
| Sentdex | @sentdex | Weekly |
| StatQuest | @statquest | Weekly |

### Long-form (1)
| Channel | Handle | Cadence |
|---------|--------|---------|
| Lex Fridman | @lexfridman | 2-3x/wk |

### Production AI Engineering (5)
| Channel | Handle | Focus |
|---------|--------|-------|
| Cole Medin | @ColeMedin | Production AI agents, n8n, LangGraph |
| AI Jason | @AIJasonZ | LLM evaluation, agent architecture |
| LangChain | @LangChain | Agent frameworks, RAG, state machines |
| AssemblyAI | @AssemblyAI | Voice AI, multimodal agents |
| Automata Learning Lab | @AutomataLearningLab | Clean integrations, enterprise AI |

### AI-Assisted Development (3)
| Channel | Handle | Focus |
|---------|--------|-------|
| Corbin Brown | @CorbinAI | Claude Code, Cursor, V0 workflows |
| Brandon Hancock | @BrandonHancockAI | TypeScript/JS AI, full-stack agents |
| VoloBuilds | @VoloBuilds | Advanced AI dev patterns, RAG |

### Indie Hacker / Solo Dev (3)
| Channel | Handle | Focus |
|---------|--------|-------|
| David Ondrej | @DavidOndrej | Low-code agents, n8n/Make + AI |
| Riley Brown | @rileybrownai | Rapid prototyping, Cursor-built apps |
| Astro K. Joseph | @AstroKJ | Business-centric AI engineering |

### Browser Automation / MCP (1)
| Channel | Handle | Focus |
|---------|--------|-------|
| Firecrawl | @Firecrawl | AI web scraping, MCP servers |

---

## 37 GitHub Awesome Repos

### General AI / Agent / MCP (21 repos)

| # | Repo | Focus | Status |
|---|------|-------|--------|
| 1 | `kyrolabs/awesome-agents` | AI Agents — frameworks, evals, niches | ✅ |
| 2 | `patriksimek/awesome-mcp-servers-2` | Best community MCP catalog | ✅ |
| 3 | `punkpeye/awesome-mcp-servers` | Original MCP servers collection | ✅ |
| 4 | `punkpeye/awesome-mcp-devtools` | MCP SDKs, libraries, debuggers | ✅ |
| 5 | `modelcontextprotocol/servers` | Official MCP reference implementations | ✅ |
| 6 | `promptslab/awesome-prompt-engineering` | Context engineering, DSPy, TextGrad | ✅ |
| 7 | `steel-dev/awesome-web-agents` | Browser-navigating AI agents | ✅ |
| 8 | `angrykoala/awesome-browser-automation` | Playwright/Puppeteer + AI tools | ✅ |
| 9 | `mahseema/awesome-ai-tools` | Broad gen AI tools + LLM infra | ✅ |
| 10 | `hannibal046/awesome-llm` | LLM research, architectures, training | ✅ |
| 11 | `alvinreal/awesome-opensource-ai` | Self-hosted models | ✅ |
| 12 | `steven2358/awesome-generative-ai` | Image, video, audio, text gen | ✅ |
| 13 | `filipecalegario/awesome-generative-ai` | Lectures, papers, courses | ✅ |
| 14 | `dair-ai/Prompt-Engineering-Guide` | Most-starred prompt guide (55K+) | ✅ |
| 15 | `microsoft/generative-ai-for-beginners` | Free 21-lesson curriculum | ✅ |
| 16 | `openai/openai-cookbook` | Official OpenAI API patterns | ✅ |
| 17 | `anthropics/anthropic-cookbook` | Official Anthropic API patterns | ✅ |
| 18 | `microsoft/playwright-mcp` | Playwright as MCP server | ✅ |
| 19 | `agiresearch/AIOS` | AI agent operating systems | ⚠️ |
| 20 | `HumanAIGC/awesome-ai-tools` | Curated AI tools for creators | ⚠️ |
| 21 | `fr0gger/Awesome-GPT-Agents` | Specialized GPT agent examples | ⚠️ |

### Free Claude Code Tools (2 repos)

| # | Repo | Type | Description |
|---|------|------|-------------|
| 22 | `Rishurajgautam24/free-claude-code` | Proxy | Routes Claude Code to NVIDIA NIM (40 req/min free), OpenRouter, LM Studio. Discord bot. |
| 23 | `Gitlawb/openclaude` | Standalone CLI | Open-source coding agent. 10+ backends, MCP, gRPC, VS Code ext. No Anthropic dependency. |

### Claude Code Ecosystem (14 repos)

| # | Repo | Stars | Focus |
|---|------|-------|-------|
| 24 | `hesreallyhim/awesome-claude-code` | ~37k | Canonical Claude Code list — skills, hooks, CLI tools |
| 25 | `ComposioHQ/awesome-claude-skills` | ~12k | 1000+ reusable skill packages |
| 26 | `vijaythecoder/awesome-claude-agents` | ~8k | Orchestrated sub-agent teams |
| 27 | `win4r/Awesome-Claude-MCP-Servers` | ~5k | Claude-specific MCP directory |
| 28 | `PatrickJS/awesome-cursorrules` | ~45k | `.mdc` rules (cross-compatible with Claude Code) |
| 29 | `spencerpauly/awesome-cursor-skills` | ~2k | Cursor-specific skills |
| 30 | `sanjeed5/awesome-cursor-rules-mdc` | ~1.5k | Focused `.mdc` curation |
| 31 | `anthropics/skills` | — | Official Anthropic skill registry |
| 32 | `rahulvrane/awesome-claude-agents` | ~3k | Community agents directory |
| 33 | `webfuse-com/awesome-claude` | ~1.5k | Most comprehensive all-things-Claude hub |
| 34 | `hao-ji-xing/awesome-cursor` | ~81 | Cursor IDE ecosystem — tools, MCP bridges, 44K+ skills |
| 35 | `ai-for-developers/awesome-ai-coding-tools` | ~304 | AI coding tools with Claude integrations |
| 36 | `Jenqyang/Awesome-AI-Agents` | ~9.2k | Autonomous agents — Alfred Claude Code runtime, safety, benchmarks |
| 37 | `e2b-dev/awesome-ai-agents` | ~28.3k | Foundational AI agent list — Claude Code governance patterns |

### Community Resources

| Resource | URL | Description |
|----------|-----|-------------|
| **AwesomeClaude.ai** | https://awesomeclaude.ai/ | Curated directory of Claude Code resources |
| **MCP Market** | https://mcpmarket.com/ | MCP server leaderboard and registry |
| **r/ClaudeCode** | https://reddit.com/r/ClaudeCode | Active Reddit community for Claude Code troubleshooting |
| **GitHub Megathread** | `hesreallyhim/awesome-claude-code` Issues | De-facto community hub for design patterns and new projects |
| **ClaudeAI Discord** | Discord (Composio, AI-coding servers) | Power users share workflows, skills, and MCP configs |

### Submission Targets (for KARMA OS promotion)

| List | What to Submit | Priority | Status |
|------|---------------|----------|--------|
| `patriksimek/awesome-mcp-servers-2` | `bridge_mcp.py` + `metrics_mcp.py` | HIGH | ✅ DONE |
| `hesreallyhim/awesome-claude-code` | 5 agents + 5 skills | HIGH | — |
| `win4r/Awesome-Claude-MCP-Servers` | `bridge_mcp.py` + `metrics_mcp.py` | HIGH | — |
| `ComposioHQ/awesome-claude-skills` | All 5 KARMA OS skills | HIGH | — |
| `steel-dev/awesome-web-agents` | AI Browser Bridge | MEDIUM | — |
| `kyrolabs/awesome-agents` | Social media posting agent | MEDIUM | — |
| `promptslab/awesome-prompt-engineering` | youtube_researcher.py prompts | LOW | — |
| `angrykoala/awesome-browser-automation` | AI Browser Bridge | LOW | — |

---

## Environment Variables

| Variable | Used By | Required | Description |
|----------|---------|----------|-------------|
| `ANTHROPIC_API_KEY` | server.js `/api/chat` | Yes (for Claude) | Claude API key for summarization |
| `GH_USER` | server.js `/github` | No | Default: `tellemthatsme` |
| `DISCORD_WEBHOOK_AI_BRIEF` | server.js push | No | Discord webhook URL |
| `TELEGRAM_BOT_TOKEN` | server.js push | No | Telegram bot token |
| `TELEGRAM_AI_BRIEF_CHAT_ID` | server.js push | No | Telegram chat ID |
| `SLACK_WEBHOOK_AI_BRIEF` | server.js push | No | Slack webhook URL |
| `BRIDGE_TOKEN` | bridge_server.py | No | Bridge auth token (default: `changeme`) |
| `N8N_PASSWORD` | docker-compose | No | n8n admin password (default: `karma2026`) |

---

## Code Conventions

### HTML
- Use CSS variables only (`var(--ac)`, not `#00d4ff`)
- Apply `data-theme` for theme-aware elements
- No inline `style="display:none"` — use classes
- Watch unescaped apostrophes in single-quoted JS strings

### JavaScript (Browser)
- `localStorage` keys prefixed with `ko_`
- All async functions declared `async`
- Server calls: `fetch(url).then(...).catch(fallback)`
- No API keys in browser code — use server proxy

### JavaScript (Server)
- Plain Node.js HTTP (no Express)
- `res.setHeader()` for CORS on every response
- `exec()` with explicit timeout
- `try/catch` on all I/O operations
- Path safety: `startsWith()` + `..` stripping

### Python
- `urllib.request` only (no external dependencies)
- UTF-8 reconfigure on stdout
- Timeout on all HTTP calls
- `time.sleep()` between bridge commands (3-5s for YouTube)

### Testing
- Playwright: Chromium primary, headless, 1280×720, 30s timeout
- Test files: `*.spec.js` pattern
- `validate-karma.js` for fast structural checks
- Firefox ~50/53 pass, WebKit ~38/53 pass (timing/CORS differences)

---

## Common Workflows

### Add a Dashboard Feature
1. Identify target dashboard (ultimate, HUD, widget, desktop)
2. Follow CSS variable system — use `var(--ac)` not hardcoded `#00d4ff`
3. Add test to matching `.spec.js` file
4. Run `npm run validate` (fast check)
5. Run `npm test` (full Chromium suite)

### Add an API Endpoint
1. Add handler in `server.js` before the 404 fallback
2. CORS headers already set globally
3. Add security: `startsWith` checks for path endpoints
4. Update `karma-server-regression.spec.js`
5. Update endpoint documentation

### Post a Track via Bridge (Video Upload)
```bash
# 1. Start bridge
python browser_extension/bridge_server.py

# 2. Ensure Chrome/Firefox extension connected (popup → START)

# 3. Send upload command
curl -X POST http://127.0.0.1:9876/command/send \
  -H "Content-Type: application/json" \
  -d '{"action":"upload_video","params":{"track":1,"channel":"main"}}'

# Bridge runs 16-step YouTube Studio flow:
# Navigate → CREATE → Upload → Fill title/desc/tags → 
# Made for Kids: No → Next 3x → Public → Publish
```

### Social Media Text Post
```bash
# Generate content
python scripts/SOCIAL_POSTER.py --generate "Track Title" x --style announcement

# Post via bridge
python scripts/SOCIAL_POSTER.py --post --content post.json --platform facebook_group

# Styles: announcement, hype, engagement
# Platforms: youtube, facebook, instagram, tiktok, x
```

### Generate AI Weekly Brief
```bash
# Quick (needs server.js + ANTHROPIC_API_KEY)
python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md

# Full scrape (needs bridge + browser extension)
python scripts/youtube_researcher.py --channel "Wes Roth" "Cole Medin" --max-videos 5

# Push to Discord
curl -X POST localhost:8888/api/push/discord \
  -H "Content-Type: application/json" \
  -d '{"content":"..."}'
```

### Fix a Test Failure
1. Read the failing test in `*.spec.js`
2. Check if it's a timing issue (Firefox/WebKit need longer waits)
3. Fix the test or the dashboard code
4. Run `npm test -- --project=chromium` for quick feedback
5. Never change `karma-regression.spec.js` selectors without understanding the DOM

### Deploy to Production
```bash
# Docker
docker-compose up -d
docker-compose logs -f

# VPS
bash scripts/deploy-vps.sh

# Vercel / Netlify
npm run deploy:vercel
npm run deploy:netlify
```

---

## Deployment

### 6 Deployment Options

| Method | Command | Details |
|--------|---------|---------|
| **Docker** | `docker-compose up -d` | Metrics + nginx + bridge + n8n (profiles: `full-stack`) |
| **VPS** | `bash scripts/deploy-vps.sh` | Interactive: prompts for IP, user, SSH key |
| **Vercel** | `npm run deploy:vercel` | `vercel --prod` |
| **Netlify** | `npm run deploy:netlify` | `netlify deploy --prod` |
| **GitHub Pages** | Push to main | Static only (no server.js) |
| **Bare Metal** | `node server.js` | Port 8888 directly |

### Docker Compose Services

```yaml
services:
  karma-metrics:   # Node.js server (:8888)
  karma-web:       # nginx (:8080) — static + proxy
  karma-bridge:    # Python bridge (:9876) — profile: full-stack
  karma-n8n:       # n8n (:5678) — profile: full-stack
```

### CI/CD (GitHub Actions)

`.github/workflows/test.yml`:
- Trigger: push/PR to main
- Steps: checkout → `npm ci` → `npx playwright install` (3 browsers) → `npm run validate` → `npm run test:ci` → upload `playwright-report` artifact

### Pre-Commit Hook

`.githooks/pre-commit`: Runs `node -c` on `<script>` blocks >50 chars in changed `.html` files.

```bash
git config core.hooksPath .githooks  # Enable
```

---

## Claude Code Configuration

### Complete .claude/ Directory (17 files)

```
.claude/
├── CLAUDE.md                     # Master context (build/test/lint, architecture, conventions)
├── KARMA_REFERENCE.md            # Token-efficient single-file reference
├── settings.json                 # MCP servers + hooks + marketplace config
│
├── agents/                       # 5 specialized sub-agents
│   ├── karma-test-runner.md
│   ├── karma-dashboard-dev.md
│   ├── karma-server-dev.md
│   ├── karma-deploy.md
│   └── social-media-poster.md
│
├── skills/                       # 5 reusable skill packages
│   ├── karma-theme-system/SKILL.md
│   ├── karma-bridge/SKILL.md
│   ├── telllem-music/SKILL.md
│   ├── research-brief/SKILL.md
│   └── video-news/SKILL.md
│
├── mcp_servers/                  # 2 Python MCP servers
│   ├── bridge_mcp.py             # 8 tools — browser automation via MCP
│   ├── metrics_mcp.py            # 8 tools — system monitoring via MCP
│   └── SUBMIT_TO_AWESOME_MCP.md  # PR submission guide
│
└── hooks/
    └── html_check.py             # PostToolUse syntax validator
```

### Settings (settings.json)

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "python .claude/hooks/html_check.py \"{{toolInput}}\" 2>&1 || true"
      }]
    }]
  },
  "mcpServers": {
    "karma-bridge": { "command": "python", "args": [".claude/mcp_servers/bridge_mcp.py"] },
    "karma-metrics": { "command": "python", "args": [".claude/mcp_servers/metrics_mcp.py"] },
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }
  },
  "extraKnownMarketplaces": {
    "karma-os": { "source": "github", "repo": "tellemthatsme/karma-os" }
  }
}
```

### Hook: html_check.py

- **Trigger**: After every `Write` or `Edit` tool use
- **Action**: Finds `<script>` blocks >50 chars in changed `.html` files
- **Validation**: Runs each script block through `node --check`
- **Safety**: Prints warnings on syntax errors, but never exits non-zero (won't abort agent turn)
- **Early exit**: Skips non-`.html` files instantly

---

## CLI Tools Configuration

KARMA OS uses three AI coding CLI tools: **Claude Code**, **Codex CLI**, and **Kilo Code**.

### Overview

| Tool | Config | Model | Agents | Optimized |
|------|--------|-------|--------|-----------|
| **Claude Code** | `.claude/settings.json` | Sonnet | 5 project agents | ✅ |
| **Codex CLI** | `~/.codex/config.toml` | GPT-5.4 | 24 GSD agents | ✅ |
| **Kilo Code** | `~/.config/kilo/kilo.json` | Grok Code Fast (Minimax) | 5 agents | ✅ Optimized |

### Claude Code (Primary)

- **Config**: `.claude/settings.json` — extensive hooks (PreToolUse, PreCompact, SessionStart, PostToolUse, Stop, SessionEnd)
- **Agents**: 5 project-level agents in `.claude/agents/`
- **Skills**: 5 project skills in `.claude/skills/`
- **MCP**: 3 servers (bridge, metrics, playwright)
- **Security**: Block git hook bypass, MCP health checks, commit quality reminders
- **Optimization**: Always thinking enabled, model: sonnet

### Codex CLI (OpenAI)

- **Config**: `~/.codex/config.toml`
- **Model**: GPT-5.4 with medium reasoning effort, pragmatic personality
- **Agents**: 24 GSD workflow agents (plan, code, review, test, deploy, audit)
- **Hooks**: SessionStart runs `gsd-check-update.js`
- **Plugins**: `build-web-apps@openai-curated`, `netlify@openai-curated`
- **Optimizations applied**: `model_auto_compact_token_limit=150000`, `max_threads=3`
- **Session history**: `~/.codex/sessions/` (2025 + 2026 directories)

### Kilo Code (Open-Source)

- **Config**: `~/.config/kilo/kilo.json` + `~/.config/kilo/kilo.jsonc`
- **Model**: `kilo/x-ai/grok-code-fast-1:optimized:free` (Minimax API)
- **Agents**: 5 agents — frontend-specialist, test-engineer, server-dev, deploy, poster
- **Security fix applied**: Tightened `external_directory` from `C:\*` + `D:\*` → `C:/Users/karma/*`
- **Optimizations applied**: Snapshots enabled, auto-compaction on, permissions restricted by agent
- **Session history**: `~/.kilocode/projects/` (5 project directories)

### Session History Backup

All session histories backed up to `C:\seshhist\` (7 directories):

```
C:\seshhist\
├── claude-session-data/      # .claude/session-data/
├── claude-session-env/       # .claude/session-env/
├── claude-sessions/          # .claude/sessions/
├── claude-projects/          # .claude/projects/
├── codex-sessions/           # .codex/sessions/
├── kilocode-projects/        # .kilocode/projects/
└── kilocode-chats/           # .kilocode/chats/
```

---

## Knowledge Base Files

| File | Location | Contents |
|------|----------|----------|
| `KARMA_REFERENCE.md` | `.claude/` | Compact token-efficient reference (280 lines) |
| `MASTER_DOC.md` | Project root | This file — complete documentation |
| `AWESOME_REPOS.md` | `ai_news/discoveries/` | 37 curated repos with deep dives |
| `CURRENT_AI_BRIEF.md` | `ai_news/` | Latest weekly research brief |
| `AI_NEWS_CHANNEL.md` | `ai_news/` | YouTube news channel strategy |

---*KARMA OS Master Documentation — June 13, 2026*
*5 agents · 5 skills · 3 MCP servers · 5 dashboards · 16 endpoints · 37 repos · 27 channels · 16 tracks*
