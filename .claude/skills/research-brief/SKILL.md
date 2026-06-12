---
name: research-brief
description: Generates and manages the KARMA OS AI weekly research brief — synthesizes from 27 YouTube channels and 37 GitHub awesome repos into a structured markdown brief.
---

# AI Research Brief Skill

## What This Does

Manages the `ai_news/CURRENT_AI_BRIEF.md` — the master AI weekly brief that feeds the KARMA OS command center, the Atom RSS feed, and the YouTube AI news channel.

## Brief Generation

### Quick Refresh (Claude API required)
```bash
python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md
```
Requires: `server.js` on `:8888` with `ANTHROPIC_API_KEY`.

### Full Scrape (browser + Claude API)
```bash
python scripts/youtube_researcher.py --channel "Wes Roth" "Cole Medin" "Corbin Brown" --max-videos 5 -o ai_news/research.json
python scripts/youtube_researcher.py --summarize-only --input ai_news/research.json -o ai_news/CURRENT_AI_BRIEF.md
```
Requires: bridge_server.py on `:9876` + browser extension connected.

## Brief Structure

Always maintain these 7 sections:
1. `# 🔥 Top 5 AI Stories` — headlines with source links
2. `# 🧠 New Models Released` — table: model | company | key feature
3. `# 💻 AI Coding & Dev Tools` — tables by category
4. `# 🤖 AI Agent Frameworks` — orchestration, MCP, browser, voice
5. `# ⭐ Trending GitHub Repos` — top 15-20 with why-trending
6. `# 📺 YouTube Channel Strategy` — tables by category (27 channels)
7. `# 🎯 Recommended Actions` — 2-3 actionable items

## Data Sources

- **27 YouTube channels** — `scripts/youtube_researcher.py` CHANNELS dict (all verified)
- **37 GitHub repos** — `ai_news/discoveries/AWESOME_REPOS.md` (21 general + 14 Claude Code + 2 free tools)
- **5 Claude Code agents** — `.claude/agents/` (test-runner, dashboard-dev, server-dev, social-media-poster, deploy)
- **5 Claude Code skills** — `.claude/skills/` (karma-theme-system, karma-bridge, telllem-music, research-brief, video-news)

## Archive System

- Previous brief auto-archived to `ai_news/archive/YYYY-MM-DD.md` on refresh
- Last 30 days kept, older auto-pruned
- Accessible via `/api/research/history` (JSON) and `/api/research/rss` (Atom)

## When to Use This Skill

- User asks to "generate a research brief" or "update the AI news"
- User asks "what's trending in AI?"
- User wants to push brief to Discord/Telegram/Slack
- User asks about the YouTube channel strategy or content calendar
