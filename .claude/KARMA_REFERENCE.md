# KARMA OS — Master Reference

> Single-file token-efficient context. Load this instead of 10+ separate files.
> Cyberpunk multi-dashboard system monitor + AI research pipeline + music release system.

---

## ⚡ Quick Commands

```bash
npm test                        # 72 tests (Chromium, list reporter)
npm run test:all                # same as above
npm run test:hud                # Core dashboards: 10 + 8 + 10 + 17 + 8 = 53 tests
npm run validate                # 10 structural checks (fast, no browser)
npm run test:cross-browser      # All 3 browsers
npm run server                  # localhost:8888
npm run docker:up / :down
cmd /c launch-karma.bat         # Launch dashboards (Windows)

# Python scripts
python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md
python scripts/SOCIAL_POSTER.py --generate "Title" x --style announcement
python scripts/SOCIAL_POSTER.py --post --content post.json --platform facebook_group
```

---

## 📁 File Map

| File | Role | Size |
|------|------|------|
| `index.html` | Unified launcher (6 themes, command palette) | 26 KB |
| `karma-os-ultimate.html` | Main OS dashboard (terminal, agents, crypto) | 134 KB |
| `karma-hud.html` | Floating HUD (300px, draggable, collapsible) | 18 KB |
| `karma-widget.html` | Compact sidebar widget | 12 KB |
| `live-desktop.html/.js/.css` | Desktop overlay + Matrix rain | 12+22+12 KB |
| `server.js` | Node.js metrics backend (no Express) | port 8888 |
| `playwright.config.js` | 3-browser config (chromium/firefox/webkit) | — |
| `validate-karma.js` | 10 structural checks | — |
| `*.spec.js` (9 files) | 72 total tests across all suites | — |
| `ai_news/CURRENT_AI_BRIEF.md` | Weekly AI research brief | — |
| `ai_news/discoveries/AWESOME_REPOS.md` | 37 GitHub awesome-* repos + tools | — |
| `browser_extension/bridge_server.py` | AI Browser Bridge | port 9876 |
| `scripts/youtube_researcher.py` | AI research pipeline (27 channels) | — |
| `scripts/SOCIAL_POSTER.py` | Cross-platform social posting | — |
| `launch-karma.bat` | Windows launcher (10 options) | — |
| `karma-top.ps1` | Always-on-top PowerShell toggle | — |
| `karma-top.ahk` | Ctrl+Shift+T global hotkey (AutoHotkey) | — |
| `media/TELLLEMTHATSME_COMMAND_CENTER.html` | Music command center (22 tabs) | 179 KB |
| `media/REVENUE_DASHBOARD.html` | YPP progress, streaming revenue | — |
| `launch/DAILY_POSTING_BOARD.html` | Day-by-day track posting checklist | — |
| `sw.js` | Service worker (offline caching) | — |

---

## 📚 Key Files Reference

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

---

## 🌐 Ports & Services

| Port | Service | Description |
|------|---------|-------------|
| 8888 | Metrics server (server.js) | 12 API endpoints, Claude proxy, research pipeline |
| 9876 | AI Browser Bridge | Chrome/Firefox browser automation via extension |
| 8080 | nginx (Docker) | Static files + reverse proxy |
| 5678 | n8n (Docker) | Workflow automation |

---

## 🏗 Architecture

- **5 HTML dashboards** → shared CSS variable system → connect to `localhost:8888` with mock fallback
- **server.js** → plain Node.js HTTP, 12 endpoints, CORS on every response
- **Bridge** → Python, queue pattern (POST /command/send → extension polls → posts result → AI polls /result/{id})
- **Research** → youtube_researcher.py scrapes via bridge → Claude API (via server proxy) → brief → RSS + webhook push
- **Music** → 16 tracks, dual YouTube channels, bridge upload_video (16-step YouTube Studio flow)
- **CSS variables**: `--ac`, `--ac2`, `--ac3`, `--bg`, `--panel`, `--border`, `--text`, `--muted`, `--warn`, `--danger`
- **localStorage keys**: `ko_theme`, `ko_muted`, `ko_gh`, `ko_start`
- **Fonts**: Orbitron (display), Inter (body)
- **Themes**: `data-theme` attribute → cyberpunk/stealth/alert/matrix/aurora/light

---

## 🎨 Theme Palette Quick Ref

| Theme | --ac | --ac2 | --ac3 | --bg |
|-------|------|-------|-------|-----|
| Cyberpunk | #00d4ff | #b347ff | #00ff9d | #060a14 |
| Stealth | #64ffda | #a8b2d1 | #8892b0 | #0a0e14 |
| Alert | #ff3366 | #ff6b35 | #ffbd00 | #14060a |
| Matrix | #00ff41 | #008f11 | #00ff41 | #000300 |
| Aurora | #a78bfa | #34d399 | #f9a8d4 | #0d0d1a |
| Light | #0077cc | #7c3aed | #059669 | #f0f4f8 |

Effects: border glow, breathing dot, glow pulse, NITRO flash, scanlines, spotlight, Matrix rain, slide-in, toast.

---

## 🔌 Server Endpoints (`localhost:8888`)

| Route | Method | Returns |
|-------|--------|---------|
| `/metrics`, `/` | GET | CPU + memory + disk + hostname + uptime |
| `/github` | GET | Public repos, followers |
| `/cr` | GET | Security score (static) |
| `/git` | GET | Git commit count |
| `/health` | GET | `{"status":"ok"}` |
| `/api/chat` | POST | Claude API proxy (SSE streaming, needs ANTHROPIC_API_KEY) |
| `/api/research/refresh` | POST | Triggers youtube_researcher.py |
| `/api/research/status` | GET | Research job state + brief metadata |
| `/api/research/rss` | GET | Atom feed of briefs |
| `/api/research/history` | GET | Archived briefs (30 days) |
| `/api/push/{discord,telegram,slack}` | POST | Webhook forward (needs webhook URL in env) |
| `/media/*` | GET | Static files (path traversal protected, 3 layers) |
| `/_archive/*` | GET | Archived briefs (alphanumeric path check + startsWith security) |
| `/api/research/rss` (also `/feed.xml`, `/rss`) | GET | Atom feed aliases |

---

## 🔑 Environment Variables

| Variable | Used By | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | server.js `/api/chat` | For Claude proxy |
| `GH_USER` | server.js `/github` | Default: tellemthatsme |
| `DISCORD_WEBHOOK_AI_BRIEF` | server.js push | Optional |
| `TELEGRAM_BOT_TOKEN` | server.js push | Optional |
| `TELEGRAM_AI_BRIEF_CHAT_ID` | server.js push | Optional |
| `SLACK_WEBHOOK_AI_BRIEF` | server.js push | Optional |
| `BRIDGE_TOKEN` | bridge_server.py | For bridge auth |
| `N8N_PASSWORD` | docker-compose (n8n) | Default: karma2026 |

---

## 📺 27 YouTube Channels (all verified)

### News (5)
| Channel | Handle | Cadence |
|---------|--------|---------|
| Wes Roth | @WesRoth | daily |
| Matt Wolfe | @maboroshi_desu | 3-5x/wk |
| The AI Grid | @TheAIGrid | weekly |
| Matthew Berman | @matthewberman | 3x/wk |
| AI Code King | @theaicodeking | daily |

### Research/Deep Dives (4)
| Channel | Handle | Cadence |
|---------|--------|---------|
| Andrej Karpathy | @AndrejKarpathy | monthly |
| Yannic Kilcher | @YannicKilcher | 3-5x/wk |
| Two Minute Papers | @TwoMinutePapers | weekly |
| 3Blue1Brown | @3blue1brown | monthly |

### Tutorials/Coding (5)
| Channel | Handle | Cadence |
|---------|--------|---------|
| DeepLearning.AI | @DeepLearningAI | weekly |
| Krish Naik | @krishnaik06 | 3x/wk |
| Tech With Tim | @TechWithTim | weekly |
| Sentdex | @sentdex | weekly |
| StatQuest | @statquest | weekly |

### Long-form (1)
Lex Fridman | @lexfridman | 2-3x/wk

### Production AI Engineering (5)
| Channel | Handle | Cadence |
|---------|--------|---------|
| Cole Medin | @ColeMedin | weekly |
| AI Jason | @AIJasonZ | weekly |
| LangChain | @LangChain | weekly |
| AssemblyAI | @AssemblyAI | weekly |
| Automata Learning Lab | @AutomataLearningLab | weekly |

### AI-Assisted Dev (3)
| Channel | Handle | Cadence |
|---------|--------|---------|
| Corbin Brown | @CorbinAI | 2-3x/wk |
| codewithbrandon | @BrandonHancockAI | weekly |
| VoloBuilds | @VoloBuilds | weekly |

### Indie/Solo Dev (3)
| Channel | Handle | Cadence |
|---------|--------|---------|
| David Ondrej | @DavidOndrej | weekly |
| Riley Brown | @rileybrownai | 2-3x/wk |
| Astro K. Joseph | @AstroKJ | weekly |

### Browser/MCP (1)
Firecrawl | @Firecrawl | weekly

---

## 🔥 37 GitHub Awesome Repos + Tools

| # | Repo | Focus | Status |
|---|------|-------|--------|
| 1 | `kyrolabs/awesome-agents` | AI Agents — all frameworks, evals, niches | ✅ |
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
| 22 | `Rishurajgautam24/free-claude-code` | Claude Code proxy → NVIDIA NIM/OpenRouter/LM Studio. Free tier. Per-model routing | ✅ |
| 23 | `Gitlawb/openclaude` | Standalone OSS coding-agent CLI. 10+ backends, MCP, gRPC, VS Code ext | ✅ |
| 24 | `hesreallyhim/awesome-claude-code` | Canonical Claude Code list (~37k stars) — skills, hooks, CLI tools, orchestrators | ✅ |
| 25 | `ComposioHQ/awesome-claude-skills` | 1000+ Claude skills (~12k stars) — automation workflows, coding patterns. Strategy: [CLAUDE_SKILL_STRATEGY.md](ai_news/discoveries/CLAUDE_SKILL_STRATEGY.md) | ✅ |
| 26 | `vijaythecoder/awesome-claude-agents` | Orchestrated sub-agent teams (~8k stars) — multi-agent patterns | ✅ |
| 27 | `win4r/Awesome-Claude-MCP-Servers` | Claude-specific MCP directory (~5k stars) — Claude-tested servers | ✅ |
| 28 | `PatrickJS/awesome-cursorrules` | Cursor `.mdc` rules (~45k stars) — cross-compatible with Claude Code | ✅ |
| 29 | `spencerpauly/awesome-cursor-skills` | Cursor-specific skills (~2k stars) — many Claude Code compatible | ✅ |
| 30 | `sanjeed5/awesome-cursor-rules-mdc` | Focused `.mdc` curation (~1.5k stars) — Cursor/Claude integrations | ✅ |
| 31 | `anthropics/skills` | Official Anthropic skill registry — marketplace source of truth | ✅ |
| 32 | `rahulvrane/awesome-claude-agents` | Community agents directory (~3k stars) | ✅ |
| 33 | `webfuse-com/awesome-claude` | Most comprehensive all-things-Claude hub (~1.5k stars) — tools, skills, MCP, IDEs | ✅ |
| 34 | `hao-ji-xing/awesome-cursor` | Cursor IDE ecosystem (~81 stars) — tools, MCP bridges, 44K+ skills. ⚠️ Low stars — reassess Q3 2026 | ✅ |
| 35 | `ai-for-developers/awesome-ai-coding-tools` | Broad AI coding tools (~304 stars) — Claude-specific integrations | ✅ |
| 36 | `Jenqyang/Awesome-AI-Agents` | Autonomous agents (~9.2k stars) — Alfred Claude Code agent runtime, safety, benchmarks | ✅ |
| 37 | `e2b-dev/awesome-ai-agents` | AI agent dev + safety (~28.3k stars) — foundational list, Claude Code governance | ✅ |

---

## 🤖 5 Claude Code Agents

| Agent | File | Role |
|-------|------|------|
| `karma-test-runner` | `.claude/agents/karma-test-runner.md` | Playwright tests, validation, cross-browser |
| `karma-dashboard-dev` | `.claude/agents/karma-dashboard-dev.md` | HTML/CSS/JS dashboards, theme awareness |
| `karma-server-dev` | `.claude/agents/karma-server-dev.md` | server.js, API endpoints, research pipeline |
| `karma-deploy` | `.claude/agents/karma-deploy.md` | Docker, CI/CD, VPS, Vercel, nginx |
| `social-media-poster` | `.claude/agents/social-media-poster.md` | 16 tracks, YouTube uploads, cross-posting |

---

## 🧩 5 Project Skills

| Skill | File | Purpose |
|-------|------|---------|
| `karma-theme-system` | `.claude/skills/karma-theme-system/SKILL.md` | 6 themes, CSS variables, effects library |
| `karma-bridge` | `.claude/skills/karma-bridge/SKILL.md` | Bridge API, commands, extension flow |
| `telllem-music` | `.claude/skills/telllem-music/SKILL.md` | 16 tracks, dedications, posting board |
| `research-brief` | `.claude/skills/research-brief/SKILL.md` | AI weekly brief generation + management |
| `video-news` | `.claude/skills/video-news/SKILL.md` | YouTube AI news channel production |

---

## 🔧 3 MCP Servers

| Server | File | Tools | Port |
|--------|------|-------|------|
| `karma-bridge` | `.claude/mcp_servers/bridge_mcp.py` | 8: status, navigate, click, type, extract, screenshot, evaluate, upload_video | 9876 |
| `karma-metrics` | `.claude/mcp_servers/metrics_mcp.py` | 8: system, github, health, research_refresh, research_status, research_brief, research_history, research_push | 8888 |
| `playwright` | `@playwright/mcp@latest` (npx) | Browser automation via MCP | — |

---

## 🎵 16-Track Music Roster

| # | Track | Dedication |
|---|-------|------------|
| 1 | EVERY MORNING WHEN I WAKE UP | Kids + Love of my life |
| 2 | DONT RUSH ME | — |
| 3 | I LIVE FOR YOU | Leah, Ryan, Jess |
| 4 | LIKE I MEANT TO DO | Six-year relationship aftermath |
| 5 | MY CHILDREN | Leah, Ryan, Jess |
| 6 | WEATHER YOU CAN DO | Leah, Ryan, Jess |
| 7 | I CANT BE HIM | — |
| 8 | TELLEMTHATSME | — |
| 9 | EVIL PAST | — |
| 10 | JUST DRILL ME | — |
| 11 | WOODS | — |
| 12 | NO CHEATS | — |
| 13 | TILL I'M DONE | — |
| 14 | AI FIVE | — |
| 15 | SINCE I WAS YOUNG | — |
| 16 | EVERY MORNING (MV) | Kids + Love of my life |

Videos: `C:\Users\karma\Videos\New folder\Media_Bank\youtubevids\`
Dual channel strategy: 16 tracks × 2 = 32 uploads over 16 days. YPP target: 1K subs, 4K watch hours.
Kid-related tracks (1,3,4,5,6,16): do NOT mark "Made for Kids" — adult/nostalgic content.

---

## 🌉 Bridge API (`localhost:9876`)

```
GET  /status               → queue_length, auth mode
POST /command/send         → {action, params} → {job_id, status: "queued"}
GET  /command/poll         → Extension polls every 3s
POST /command/result       → Extension reports result
GET  /result/{job_id}      → 404 = not ready, 200 = result
```

Actions: `navigate`, `click`, `type`, `extract`, `screenshot`, `evaluate`, `upload_video`
upload_video: 16-step YouTube Studio flow, needs 180s timeout.

---

## 📋 Code Conventions

- **HTML**: CSS variables only (`var(--ac)`), not hardcoded colors. `data-theme` for theme-aware. No inline `display:none`. Watch unescaped apostrophes in single-quoted JS.
- **JS (browser)**: `localStorage` keys prefixed `ko_`. All async functions declared `async`. `fetch().catch(fallback)`. No API keys in browser code.
- **JS (server)**: Plain Node.js HTTP. `res.setHeader()` CORS on every response. `exec()` with timeout. `try/catch` all I/O. Path safety: `startsWith()` + `..` stripping.
- **Python**: `urllib.request` (no external deps). UTF-8 reconfigure stdout. Timeout on all HTTP. `time.sleep()` between bridge commands (3-5s for YouTube).
- **Testing**: Chromium primary, headless, 1280×720, 30s timeout. Test files: `*.spec.js`.

---

## 🔄 Common Workflows

### Add dashboard feature
1. Identify target dashboard → follow CSS variable system → add to test file → `npm run validate` + `npm test`

### Add API endpoint
1. Add handler in server.js before 404 → CORS already set → security: `startsWith` checks → update regression test → update README

### Post track via bridge (video upload)
```bash
python browser_extension/bridge_server.py  # Start bridge
# Ensure extension connected (popup → START)
curl -X POST http://127.0.0.1:9876/command/send -H "Content-Type: application/json" -d '{"action":"upload_video","params":{"track":1,"channel":"main"}}'
```

### Social media text post
```bash
python scripts/SOCIAL_POSTER.py --generate "Track Title" x --style announcement
python scripts/SOCIAL_POSTER.py --post --content post.json --platform facebook_group
```

### Generate AI weekly brief
```bash
# Needs server.js + ANTHROPIC_API_KEY
python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md
curl -X POST localhost:8888/api/push/discord -H "Content-Type: application/json" -d '{"content":"..."}'
```

### Fix test failure
1. Read failing test → check timing (Firefox/WebKit slower) → fix test or dashboard → `npm test -- --project=chromium`

---

## 🚀 Deployment

- **Docker**: `docker-compose up -d` (metrics + nginx + bridge + n8n via profiles)
- **VPS**: `bash scripts/deploy-vps.sh`
- **Vercel/Netlify**: `vercel --prod` / `netlify deploy --prod`
- **CI**: `.github/workflows/test.yml` — 3 browsers on push/PR, uploads playwright-report artifact
- **Pre-commit**: `.githooks/pre-commit` — `node -c` on `<script>` blocks in changed .html files

---

*KARMA OS Reference — Generated June 2026 — Load this file instead of 10+ separate .claude/ files*

---

## 🔧 CLI Tools Configuration

| Tool | Config | Model | Agents | Status |
|------|--------|-------|--------|--------|
| Claude Code | `.claude/settings.json` | Sonnet | 5 project agents | ✅ Optimized |
| Codex CLI | `~/.codex/config.toml` | GPT-5.4 | 24 GSD agents | ✅ Optimized |
| Kilo Code | `~/.config/kilo/kilo.json` | Grok Code Fast | 5 agents | ✅ Optimized |

**Session backup**: `C:\seshhist\` (7 directories: claude ×4, codex ×1, kilocode ×2)

**Codex optimizations**: `model_auto_compact_token_limit=150000`, `max_threads=3`
**Kilo Code fixes**: `C:\*`+`D:\*` → `C:/Users/karma/*`, snapshots enabled, 5 agents installed (server-dev, deploy, poster added)
**Claude Code**: Extensive hook system, always thinking on — no changes needed
