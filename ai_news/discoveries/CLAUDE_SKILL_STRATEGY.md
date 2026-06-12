# 🔌 Claude Skill Strategy for KARMA OS — Research Findings (June 2026)

> Based on deep-dive into ComposioHQ/awesome-claude-skills and the broader Claude Code ecosystem.

## Key Insight: Skills vs. MCP Servers vs. Composio Connect

There are three distinct layers in the Claude Code ecosystem:

| Layer | What It Is | Example |
|-------|-----------|---------|
| **Skills** | Procedural instructions (Markdown/YAML) that teach Claude HOW to use tools | `karma-theme-system` — teaches color conventions |
| **MCP Servers** | Infrastructure that gives Claude ACCESS to external services | `karma-bridge` MCP — gives browser control |
| **Composio Connect** | Unified MCP plugin for 500+ services (auth + tool calling) | One plugin → Slack + GitHub + Jira + Discord |

## Recommendation for KARMA OS

**Use Composio Connect for connectivity** (instead of building individual integrations):

```
claude --plugin-dir ./connect-apps-plugin
/connect-apps:setup  (enter API key from dashboard.composio.dev)
```

Once connected, Claude has native MCP tools for Slack, GitHub, Jira, Discord, Gmail, etc. — no need to maintain individual MCP servers for each service.

**Keep custom KARMA OS skills** for procedural logic:
- `karma-theme-system` — design conventions (✅ existing)
- `karma-bridge` — bridge knowledge (✅ existing)
- `telllem-music` — music workflow (✅ existing)
- `research-brief` — brief structure (✅ existing)
- `video-news` — content strategy (✅ existing)

## Specific Service Recommendations

| Service | Best Approach | Notes |
|---------|--------------|-------|
| **Slack** | Composio Connect | For research brief distribution |
| **Discord** | Composio Connect | For bot commands |
| **GitHub** | Composio Connect | For PR/issue management |
| **Jira** | Composio Connect | For task tracking |
| **Email/Gmail** | Composio Connect | For newsletter distribution |
| **Playwright** | `npx skills add playwright` (standalone skill) | For test execution logic |
| **Browser** | KARMA OS bridge_mcp.py | Our custom solution (✅ existing) |
| **YouTube** | KARMA OS bridge upload_video | Our custom solution (✅ existing) |

## ComposioHQ/awesome-claude-skills — What We'd Actually Use

The repo catalogs 1000+ skills, but most are Composio-backed (i.e., they use Connect under the hood). The most relevant for KARMA OS:

| Skill | Category | Notes |
|-------|----------|-------|
| **Slack Automation** | Notifications | Post research briefs to Slack channels |
| **GitHub Automation** | DevOps | PR management, issue triage |
| **Jira Automation** | Project Mgmt | Sprint tracking |
| **Discord Automation** | Community | Bot commands for the AI news Discord |
| **Twitter Automation** | Social | Cross-platform posting |
| **Playwright Browser Automation** | Testing | Test execution patterns |
| **recursive-research** | Research | Multi-step deep-dive research |

## When to Install Composio Connect

Install when you want to bridge KARMA OS to any of these services WITHOUT writing custom MCP servers:

```bash
# In Claude Code terminal
claude --plugin-dir ./connect-apps-plugin
/connect-apps:setup
```

Then Claude can:
- Post research briefs to Slack → `"Post today's brief to the #ai-research Slack channel"`
- Create GitHub issues from brief findings → `"Create a GitHub issue for this trending repo"`
- Send email newsletters → `"Email this week's brief to the subscriber list"`

## What NOT to Do

- Don't build individual MCP servers for Slack, Discord, GitHub, etc. — Composio Connect handles all of them
- Don't add 10+ standalone skills from awesome-claude-skills — they're mostly Composio wrappers
- Don't spam sub-agents — each sub-agent opens new context (4-7x token cost)

## Next Actions

1. Get a Composio API key from dashboard.composio.dev
2. Install Connect plugin: `claude --plugin-dir ./connect-apps-plugin` then `/connect-apps:setup`
3. Test: "Post a test message to [Slack/Discord] summarizing today's KARMA OS status"
4. Once working, add a new KARMA OS skill `karma-integrations` that documents the Connect setup

---

*Research: June 2026 — Part of the KARMA OS AI Knowledge Base*
