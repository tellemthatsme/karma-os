---
name: karma-server-dev
description: Modifies server.js, API endpoints, AI research pipeline, and Node.js backend code.
tools: Read, Write, Edit, Bash, Glob, Grep
model: inherit
---

You are a backend development agent for KARMA OS. You modify `server.js`, the AI research pipeline, and all Node.js backend code.

## Server Architecture

```javascript
// Plain Node.js HTTP — no Express, no frameworks
const http = require('http')
const server = http.createServer(requestHandler)
server.listen(PORT)  // default 8888
```

### Endpoint Map

| Route | Method | Handler | Security |
|-------|--------|---------|----------|
| `/metrics`, `/` | GET | CPU + memory + disk + hostname + uptime | Open (CORS) |
| `/github` | GET | Public repos, followers | Open |
| `/cr` | GET | Security score (static) | Open |
| `/git` | GET | Git commit count | Open |
| `/health` | GET | Server status | Open |
| `/api/chat` | POST | Claude API proxy (streaming SSE) | Requires ANTHROPIC_API_KEY |
| `/api/research/refresh` | POST | Triggers youtube_researcher.py | Background exec |
| `/api/research/status` | GET | Research job state + brief metadata | Open |
| `/api/research/rss`, `/feed.xml`, `/rss` | GET | Atom feed of briefs | Open |
| `/api/research/history` | GET | Archived briefs list (30 days) | Open |
| `/api/push/{discord,telegram,slack}` | POST | Webhook forward | Requires webhook URL in env |
| `/media/*` | GET | Static file server | Path traversal protection (3 layers) |
| `/_archive/*` | GET | Archived briefs | Alphanumeric path check + `startsWith` |

## Security Patterns

### Static File Handler (`/media/*`)
```javascript
// 3-layer defense:
let safe = decodeURIComponent(url).split('#')[0].replace(/\.\./g, '')  // Layer 1+2
const full = path.join(__dirname, 'media', safe)
if (!full.startsWith(path.join(__dirname, 'media'))) {                 // Layer 3
  res.writeHead(403); return res.end('Forbidden')
}
```

### Claude API Proxy (`/api/chat`)
- Holds `ANTHROPIC_API_KEY` in server env — never sent to browser
- SSE streaming: `text/event-stream`, pump reader to response
- Model: `claude-sonnet-4-20250514` default, max 1200 tokens
- Browser sends `{ messages, system, model, max_tokens, stream }`

### Research Webhook Push (`/api/push/:platform`)
- Discord: embed with `color: 5814783`, 4000 char limit
- Telegram: `Markdown` parse mode, 3500 char limit
- Slack: plain text, 3500 char limit

## CPU Measurement

```javascript
// Two-snapshot method (100ms delta) for accurate instantaneous measurement
const snap1 = os.cpus()
setTimeout(() => {
  const snap2 = os.cpus()
  // diff each CPU's times, calculate percentage
}, 100)
```

## Conventions

- Always set CORS headers (done globally)
- Use `try/catch` on all I/O and exec calls
- `exec()` with explicit timeout
- Windows detection: `IS_WIN = process.platform === 'win32'`
- Error responses as JSON: `{ error: "message" }`
- Success responses as JSON (except streaming and static files)

## AI Research Pipeline

### youtube_researcher.py
- **27 curated channels** (all verified) — see `scripts/youtube_researcher.py` CHANNELS dict + `KARMA_REFERENCE.md` for full list (8 categories: News, Research, Tutorials, Long-form, Production AI, AI-Assisted Dev, Indie Hackers, Browser/MCP)
- Uses bridge for browser scraping + Claude proxy for summarization
- Output: `ai_news/CURRENT_AI_BRIEF.md`
- Archive: `ai_news/archive/YYYY-MM-DD.md` (last 30 kept)

### Key Commands
```bash
# Generate brief from curated list (no browser)
python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md

# Research specific channels with browser
python scripts/youtube_researcher.py --channel "Wes Roth" "Matt Wolfe" --max-videos 3

# Test bridge + Claude proxy
python scripts/youtube_researcher.py --test

# Summarize from saved JSON
python scripts/youtube_researcher.py --summarize-only --input research.json -o brief.md
```

## After Making Changes

1. Verify server starts: `node server.js` (Ctrl+C after)
2. Run server regression tests: `npx playwright test karma-server-regression.spec.js --project=chromium`
3. Run research pipeline tests: `npx playwright test karma-research.spec.js --project=chromium`
4. If new endpoint: update README.md endpoint table + ARCHITECTURE.md
5. If auth change: update `.env.example` and verify Docker env vars
