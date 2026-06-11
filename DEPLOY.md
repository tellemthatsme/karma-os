# Deployment Guide

## Option 1: GitHub Pages (Recommended for Static)

1. Go to https://github.com/tellemthatsme/karma-os/settings/pages
2. Set source to `master` branch, `/ (root)`
3. Dashboard at `https://tellemthatsme.github.io/karma-os/`
4. Open `index.html` for the unified launcher

```bash
# After enabling Pages, the site is live at:
# https://tellemthatsme.github.io/karma-os/index.html
```

## Option 2: Docker

```bash
# Build and start (metrics server + nginx)
docker-compose up -d

# Dashboards at http://localhost:8080
# Metrics API at http://localhost:8888
# Health check: http://localhost:8888/health
```

Services:
- `karma-metrics` — Node.js server on port 8888 (real CPU/memory/disk)
- `karma-web` — nginx on port 8080 (static files + API proxy)

## Option 2b: Full Stack (with n8n + bridge)

```bash
# Bring up everything: metrics, web, bridge, AND n8n
docker-compose --profile full-stack up -d

# Or use the one-command VPS script:
./scripts/deploy-vps.sh
```

Additional services when `--profile full-stack` is set:
- `karma-bridge` — browser-automation bridge on port 9876 (Python + Chromium)
- `karma-n8n` — n8n on port 5678 (imports `scripts/n8n-daily-ai-brief.json` automatically)

## Option 3: $5 VPS One-Command Deploy

The fastest path to a publicly-reachable, fully-stacked KARMA OS:

```bash
# On a fresh Ubuntu 22.04+ VPS (DigitalOcean / Hetzner / Vultr / Oracle free tier):
git clone https://github.com/tellemthatsme/karma-os.git
cd karma-os
cp .env.example .env  # then edit .env with your API keys
./scripts/deploy-vps.sh
```

`deploy-vps.sh` does all of:
1. Installs Docker + Docker Compose
2. Builds all 4 service images
3. Generates self-signed TLS via `mkcert` (or use Caddy for auto-Let's-Encrypt)
4. Starts `karma-metrics`, `karma-web`, `karma-bridge`, `karma-n8n` via systemd
5. Imports `scripts/n8n-daily-ai-brief.json` workflow into n8n
6. Sets up daily 06:00 AEST cron as a fallback
7. Configures Caddy reverse proxy with auto-HTTPS
8. Prints public URLs for each service

After deploy, your stack is live at:
- **Dashboards:** `https://your-vps-ip/` (Caddy terminates TLS)
- **RSS / Atom feed:** `https://your-vps-ip/api/research/rss` — paste into Feedly
- **Metrics API:** `https://your-vps-ip/health`
- **n8n:** `https://your-vps-ip:5678/` (admin / password from `.env`)

### Environment variables (`.env`)

```bash
# Required for the AI Research feature
ANTHROPIC_API_KEY=sk-ant-...

# Optional push destinations
DISCORD_WEBHOOK_AI_BRIEF=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_AI_BRIEF_CHAT_ID=-100123456789
SLACK_WEBHOOK_AI_BRIEF=https://hooks.slack.com/services/...

# n8n admin
N8N_PASSWORD=change-me-on-first-login

# Bridge auth
BRIDGE_TOKEN=long-random-string
```

### Activate the n8n workflow after deploy

The `scripts/n8n-daily-ai-brief.json` file is mounted into n8n's import directory, but you still need to **activate** it once:

1. Open `https://your-vps-ip:5678/` and log in
2. Click **Workflows** → **Import from File** → select `daily-ai-brief.json`
3. Fill in credential placeholders (Discord webhook, etc.) — they're read from env vars
4. Toggle the workflow to **Active**

Or run `scripts/activate-n8n-workflow.sh` from the VPS CLI to do it via the n8n API.

## Option 4: Vercel

```bash
npm i -g vercel
vercel --prod
# Follow prompts. Dashboard available at *.vercel.app
```

Config: `vercel.json` routes `/api/*` to `server.js` and static files to HTML dashboards.

## Option 5: Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod
# Static files served directly
```

Config: `netlify.toml` redirects `/` to `/index.html`.

## Option 6: Local (Node.js)

```bash
# Start metrics server
node server.js

# Open dashboards directly in Chrome
start karma-os-ultimate.html     # Main OS
start karma-hud.html             # HUD (use --app mode for frameless)
start karma-widget.html          # Widget
start live-desktop.html          # Live Desktop
start index.html                 # Unified Launcher

# Or use the Windows launcher
launch-karma.bat
```

## Option 7: Local (Chrome --app Mode)

```bash
# Frameless HUD in top-right corner
chrome --app="file:///C:/karma/karma-hud.html" --window-size=320,520 --window-position=980,40

# Toggle always-on-top via PowerShell
powershell -ExecutionPolicy Bypass -File karma-top.ps1

# Or use AutoHotkey (Ctrl+Shift+T from anywhere)
karma-top.ahk
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8888` | Metrics server port |
| `GH_USER` | `tellemthatsme` | GitHub username for repo count |
| `ANTHROPIC_API_KEY` | _none_ | Claude API key for `/api/chat` proxy and researcher summarization |
| `DISCORD_WEBHOOK_AI_BRIEF` | _none_ | Discord webhook URL for daily AI brief push |
| `TELEGRAM_BOT_TOKEN` | _none_ | Telegram bot token |
| `TELEGRAM_AI_BRIEF_CHAT_ID` | _none_ | Telegram chat ID to receive the brief |
| `SLACK_WEBHOOK_AI_BRIEF` | _none_ | Slack incoming webhook URL |
| `BRIDGE_TOKEN` | `changeme` | Shared secret between bridge and browser extension |
| `N8N_PASSWORD` | `karma2026` | n8n basic-auth password (change on first login) |

## CI/CD (GitHub Actions)

Push to `master` triggers `.github/workflows/test.yml`:

1. `npm ci` — Install dependencies
2. `npx playwright install --with-deps` — Install Chromium, Firefox, WebKit
3. `npm run validate` — 10 structural checks
4. `npm run test:ci` — 53 tests with HTML reporter
5. Upload `playwright-report/` as artifact (retained 7 days)

## Troubleshooting

**Dashboards show mock data?** — Start the metrics server: `node server.js`

**Tests fail on WebKit?** — WebKit has `file://` CORS restrictions. Serve via HTTP: `docker-compose up -d` or use `npx serve .`

**Always-on-top not working?** — Run `karma-top.ps1` from PowerShell (requires admin on some systems) or use `karma-top.ahk` (AutoHotkey v2).

**n8n workflow not auto-importing?** — The import directory mount only works for **fresh** n8n volumes. For existing volumes, manually import via the UI: Workflows → ⋯ → Import from File → `scripts/n8n-daily-ai-brief.json`.

**RSS feed returns HTML instead of XML?** — Check that `server.js` is running (not just the static nginx). RSS lives on port 8888, not 8080.

**Public VPS RSS not reachable?** — Ensure Caddy / nginx proxies `/api/research/rss` to `:8888` (the karma-metrics container), not to the static web container.
