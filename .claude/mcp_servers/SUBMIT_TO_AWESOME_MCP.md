# Submit KARMA MCP Servers to patriksimek/awesome-mcp-servers-2

> Ready-to-submit PR entries for `karma-bridge` and `karma-metrics` MCP servers.

---

## PR Title
```
Add karma-bridge and karma-metrics MCP servers
```

## PR Description
```
Add two MCP servers from the KARMA OS project:

1. **karma-bridge** — Exposes the AI Browser Bridge (localhost:9876) as MCP tools, enabling Claude Code to control a real Chrome/Firefox browser for navigation, clicking, typing, extraction, screenshots, JavaScript evaluation, and YouTube video uploads.

2. **karma-metrics** — Exposes the KARMA Metrics Backend (localhost:8888) as MCP tools for system monitoring, GitHub stats, and AI research pipeline control (refresh, status, brief retrieval, push to Discord/Telegram/Slack).

Both servers use Python stdlib only (no external dependencies) and communicate via JSON-RPC over stdio.
```

## README.md Entries

### For `🔍 - Search & Web` section (alphabetical, after K):

```markdown
- [Karma Bridge](https://github.com/tellemthatsme/karma-os) - Exposes AI Browser Bridge as MCP tools: status, navigate, click, type, extract, screenshot, evaluate, and YouTube video upload via real Chrome/Firefox browser. Python stdlib only.
```

### For `📈 - Monitoring` section (alphabetical, after K):

```markdown
- [Karma Metrics](https://github.com/tellemthatsme/karma-os) - Exposes KARMA Metrics Backend as MCP tools: system metrics, GitHub stats, health checks, AI research pipeline control, and webhook push to Discord/Telegram/Slack. Python stdlib only.
```

---

## Submission Checklist

- [ ] Fork `patriksimek/awesome-mcp-servers-2`
- [ ] Add `Karma Bridge` entry under `🔍 - Search & Web` (alphabetical)
- [ ] Add `Karma Metrics` entry under `📈 - Monitoring` (alphabetical)
- [ ] Commit: `Add karma-bridge and karma-metrics MCP servers`
- [ ] Push to fork
- [ ] Open PR with description above
- [ ] Ensure `https://github.com/tellemthatsme/karma-os` is public

---

## Alternative: Standalone MCP Server Repos

For better discovery, consider extracting each MCP server into its own repo:

| Server | Suggested Repo | README Content |
|--------|---------------|----------------|
| karma-bridge | `tellemthatsme/karma-bridge-mcp` | Bridge architecture, tool list, install, env vars |
| karma-metrics | `tellemthatsme/karma-metrics-mcp` | Metrics API docs, tool list, install, env vars |

Each standalone repo would link back to `karma-os` as the parent project.

## Format Reference

The repo uses this format:
```
- [Name](link) - Brief one-line description.
```

Keep descriptions under 140 characters. No nested lists, no emoji in entries (section headers only). Sort alphabetically within each section.

---

*Prepared for PR submission — `patriksimek/awesome-mcp-servers-2`*
