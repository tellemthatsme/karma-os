# KARMA OS — Claude Code Project Context

> Cyberpunk-themed multi-dashboard system monitor with AI research pipeline, music release system, and social media command center.

## ⚡ Build, Test & Lint

```bash
# Install
npm install
npx playwright install chromium

# Run all 72 tests (Chromium only)
npm test                   # or npm run test:all

# Run specific test suites (core dashboards = 53 tests)
npm run test:hud          # HUD widget (10 tests)
npm run test:widget       # Compact widget (8 tests)
npm run test:desktop      # Live desktop (10 tests)
npm run test:regression   # Main OS regression (17 tests)
npm run test:visual       # Visual regression (8 tests)

# Cross-browser (all 3)
npm run test:cross-browser

# Structural validation (10 checks)
npm run validate

# Start metrics server
npm run server             # localhost:8888

# Docker
npm run docker:up
npm run docker:down

# Launch dashboards (Windows)
cmd /c launch-karma.bat

# Pre-commit hook (syntax check on <script> blocks)
git config core.hooksPath .githooks

# Python scripts
python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md
python scripts/SOCIAL_POSTER.py --test
python scripts/SOCIAL_POSTER.py --generate "Track Title" x
```

## 📁 Project Structure

```
karma/                          # Project root = C:\Users\karma
├── index.html                  # Unified launcher (26 KB, 6 themes, command palette)
├── karma-os-ultimate.html      # Main OS dashboard (134 KB, terminal, agents, crypto)
├── karma-hud.html              # Floating HUD (18 KB, 300px, draggable, collapsible)
├── karma-widget.html           # Compact sidebar widget (12 KB)
├── live-desktop.html           # Desktop overlay (12 KB) + live-desktop.js (22 KB) + live-desktop.css (12 KB)
├── server.js                   # Node.js metrics backend (port 8888, 12 endpoints)
├── playwright.config.js        # 3-browser config (chromium, firefox, webkit)
├── validate-karma.js           # 10 structural checks via Playwright
│
├── *.spec.js                   # 6 test files (72 total tests)
├── launch-karma.bat            # Windows launcher (10 options)
├── karma-top.ps1               # Always-on-top PowerShell toggle
├── karma-top.ahk               # AutoHotkey Ctrl+Shift+T global hotkey
│
├── media/                       # Dashboards, command center, images
├── ai_news/                     # AI research briefs + archive/
├── scripts/                     # Python automation scripts
├── guides/                      # Setup guides, strategy docs
├── launch/                      # Posting board, checklists
├── browser_extension/           # Chrome/Firefox AI Browser Bridge
│
├── Dockerfile + docker-compose.yml + Dockerfile.bridge
├── nginx.conf + vercel.json + netlify.toml
├── .githooks/pre-commit         # Syntax validator for <script> blocks
└── .github/workflows/test.yml   # CI: 3-browser test on push/PR
```

## 🏗 Architecture

### Dashboards (Client-Side)
- **5 HTML dashboards** with shared CSS variable system (6 themes)
- **localStorage keys**: `ko_theme`, `ko_muted`, `ko_gh`, etc.
- **Fonts**: Orbitron (display), Inter (body)
- All dashboards connect to `localhost:8888` with mock fallback
- Theme switching via `data-theme` attribute on `<html>`

### Metrics Server (Node.js)
- **12 endpoints**: `/metrics`, `/github`, `/cr`, `/git`, `/health`, `/api/chat`, `/api/research/refresh`, `/api/research/status`, `/api/research/rss`, `/api/research/history`, `/api/push/{discord|telegram|slack}`, `/media/*`
- `/api/chat` — Claude API proxy (ANTHROPIC_API_KEY in env, never in browser)
- `/media/*` — Static file handler with path-traversal protection (3 layers)
- CPU measurement: two-snapshot 100ms delta for accuracy

### AI Browser Bridge
- Python server (`browser_extension/bridge_server.py`) on `127.0.0.1:9876`
- Chrome (MV3) + Firefox (MV2) extensions
- Commands: navigate, click, type, extract, screenshot, evaluate, upload_video
- Queue pattern: POST /command/send → extension polls GET /command/poll → extension POSTs result → AI polls GET /result/{id}

### AI Research Pipeline
- `scripts/youtube_researcher.py` — scrapes 14 curated AI channels
- Uses bridge + Claude proxy for summarization
- `/api/research/refresh` triggers background run
- Archive system: keeps last 30 daily briefs
- Atom feed at `/api/research/rss`
- Webhook push to Discord/Telegram/Slack

### TELLLEMTHATSME Music System
- 16 original hip-hop tracks with dedications (Leah, Ryan, Jess)
- Dual YouTube channel strategy (main + second)
- Daily posting board with copy-paste workflow
- Revenue dashboard tracking YPP progress
- Social media poster via bridge or copy-paste

### Infrastructure
- Docker Compose: metrics server + nginx + bridge + n8n
- CI/CD: GitHub Actions (3 browsers, artifact upload)
- Deploy: Vercel, Netlify, Docker, VPS script

## 🎨 Code Conventions

### HTML/CSS
- CSS variables: `--ac`, `--ac2`, `--ac3`, `--bg`, `--panel`, `--border`, `--text`, `--muted`, `--warn`, `--danger`
- Data attributes: `data-theme` (cyberpunk/stealth/alert/matrix/aurora/light)
- No inline styles (use CSS classes or data-theme)
- Avoid unescaped apostrophes in single-quoted JS strings

### JavaScript (Browser)
- Use `localStorage` keys prefixed with `ko_`
- All async functions must be declared `async`
- Use `fetch()` with `catch()` for server calls
- Mock fallback when server is offline
- No hardcoded API keys in browser code

### Node.js (Server)
- Plain Node.js HTTP (no Express/frameworks)
- `res.setHeader()` for CORS on every response
- `exec()` with timeouts for shell commands
- `try/catch` on all I/O operations
- Security: `startsWith()` checks, `..` stripping, `decodeURIComponent` try/catch

### Python Scripts
- Use `urllib.request` (no external deps for bridge calls)
- UTF-8 reconfigure on stdout
- Timeout on all HTTP calls
- `time.sleep()` between bridge commands (YouTube needs 3-5s)

### Testing
- Playwright config: Chromium primary, headless, 1280×720, 30s timeout
- Test files: `*.spec.js` pattern
- `validate-karma.js` for structural checks (agent counts, JS errors, DOM)

## 🔑 Environment Variables

| Variable | Used By | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | server.js `/api/chat` | For Claude proxy |
| `GH_USER` | server.js `/github` | Default: tellemthatsme |
| `DISCORD_WEBHOOK_AI_BRIEF` | server.js `/api/push/discord` | Optional |
| `TELEGRAM_BOT_TOKEN` | server.js `/api/push/telegram` | Optional |
| `TELEGRAM_AI_BRIEF_CHAT_ID` | server.js `/api/push/telegram` | Optional |
| `SLACK_WEBHOOK_AI_BRIEF` | server.js `/api/push/slack` | Optional |
| `BRIDGE_TOKEN` | bridge_server.py | For bridge auth |
| `N8N_PASSWORD` | docker-compose.yml (n8n) | Default: karma2026 |

## 🧩 Common Workflows

### Add a new dashboard feature
1. Identify which dashboard (ultimate, hud, widget, desktop)
2. Follow CSS variable system — use `var(--ac)`, not hardcoded `#00d4ff`
3. Add to appropriate test file
4. Run `npm run validate` and `npm test`
5. Update ARCHITECTURE.md if architecture changes

### Add a new API endpoint
1. Add handler in `server.js` before the 404 fallback
2. Set CORS headers (already done globally)
3. Add security checks matching `/media/*` pattern
4. Update `karma-server-regression.spec.js`
5. Update README.md endpoint table
6. Run `npm run test:regression`

### Post a track via bridge (YouTube video upload)
1. Start bridge: `python browser_extension/bridge_server.py`
2. Ensure Chrome/Firefox extension is installed and connected (popup → START)
3. Send upload command via bridge directly: `curl -X POST http://127.0.0.1:9876/command/send -H "Content-Type: application/json" -d '{"action":"upload_video","params":{"track":1,"channel":"main"}}'`
4. Bridge polls extension, extension executes 16-step YouTube Studio flow in browser, result returned

### Generate + post social media content (text posts)
1. Generate post: `python scripts/SOCIAL_POSTER.py --generate "Track Title" x --style announcement`
2. For bridge-assisted posting to Facebook/X: `python scripts/SOCIAL_POSTER.py --post --content post.json --platform facebook_group`
3. For manual copy-paste: use the generated text directly

### Generate AI research brief
1. Ensure server.js running with ANTHROPIC_API_KEY
2. Run: `python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md`
3. Brief saved to ai_news/CURRENT_AI_BRIEF.md
4. Push to platforms: `curl -X POST localhost:8888/api/push/discord -H "Content-Type: application/json" -d '{"content":"..."}'`

### Fix a test failure
1. Read the failing test in `*.spec.js`
2. Check if it's a timing issue (Firefox/WebKit need longer waits)
3. Fix the test or the dashboard code
4. Run `npm test -- --project=chromium` for quick feedback
5. Never touch `karma-regression.spec.js` selectors without understanding the DOM

## 📊 Key Files Reference

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
| `scripts/SOCIAL_POSTER.py` | Cross-platform social media posting |
| `scripts/youtube_researcher.py` | AI research pipeline |
| `server.js` | All API endpoints, security patterns |
| `playwright.config.js` | Test configuration |
| `docker-compose.yml` | Container orchestration |
