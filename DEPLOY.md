# Deployment Guide

## Option 1: Local (Docker)

```bash
docker-compose up -d
# Open http://localhost:8080 for dashboards
# Metrics API at http://localhost:8888
```

## Option 2: Vercel

```bash
npm i -g vercel
vercel
# Follow prompts. Dashboard available at *.vercel.app
```

## Option 3: Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod
# Static files served directly
```

## Option 4: GitHub Pages

1. Push to GitHub
2. Go to Settings > Pages
3. Set source to `main` branch, `/ (root)`
4. Dashboard at `https://<user>.github.io/karma-os/`

## Option 5: Local (Node.js)

```bash
node server.js          # Metrics API on :8888
open karma-os-ultimate.html  # Open directly in Chrome
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8888` | Metrics server port |
| `GH_USER` | `tellemthatsme` | GitHub username for repo count |

## CI/CD

Push to `main` triggers GitHub Actions:
1. Installs dependencies
2. Runs validation (`npm run validate`)
3. Runs all 45 tests (`npm run test:ci`)
4. Uploads Playwright report as artifact
