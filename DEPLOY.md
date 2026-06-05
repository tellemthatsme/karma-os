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

## Option 3: Vercel

```bash
npm i -g vercel
vercel --prod
# Follow prompts. Dashboard available at *.vercel.app
```

Config: `vercel.json` routes `/api/*` to `server.js` and static files to HTML dashboards.

## Option 4: Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod
# Static files served directly
```

Config: `netlify.toml` redirects `/` to `/index.html`.

## Option 5: Local (Node.js)

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

## Option 6: Local (Chrome --app Mode)

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
