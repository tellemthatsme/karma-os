# KARMA OS — Enhancement Roadmap (Research-Backed)

> **Generated:** Based on 4 research streams (multi-agent orchestration, MCP ecosystem, automation platforms, security best practices) for 2025-2026
> **Scope:** Concrete, actionable enhancements to `media/karma-os-ultimate.html` and the browser_extension/ scripts
> **Status:** Proposals only — no code changes made

---

## Executive Summary

The current KARMA OS v25 ULTIMATE is a **single-page, client-side demo** with strong UX but limited real backends. Research shows the industry has moved toward:
- **Stateful orchestration** (Manager-Worker hierarchies, not flat swarms)
- **Structured agent comms** (JSON schema, not free-text messages)
- **Server-side proxies** for LLM keys (never browser-direct)
- **Per-tool rate limiting** on MCP servers (circuit breakers)
- **Blackboard pattern** for shared state across agents

The biggest unlock: **moving from "looks like 25 agents" to "actually coordinates 25 agents"** with a small Node.js backend.

---

## Pillar 1 — Real Multi-Agent Orchestration

### Current state
- 25 agents are decorative; only KARMA chat hits a real LLM
- Footclan progress is `Math.random()` simulation
- Hermes messages are hardcoded strings
- OpenHuman approvals don't trigger real work

### Proposed enhancements

#### 1.1 — Add a Manager-Worker hierarchy
**Research basis:** "Hierarchical Decomposition" is the 2026 industry standard. LangGraph, CrewAI, AutoGen all converge on it.

**What:** Refactor the 25-agent model from a flat list into a DAG:
```
KARMA (root)
├── STRATEGY layer (1-2 agents)
│   ├── oracle (prediction)
│   └── ashlee (content strategy)
├── EXECUTION layer (5-7 agents)
│   ├── deepsearch, codeagent, apollo, nova
│   └── marketwatch, intelagent
├── WORKER layer (footclan fc01-fc20)
│   └── distributed task execution
└── OVERSIGHT layer
    ├── openhuman (HITL)
    └── hermes (comms)
```

**How:** Add a `AGENT_TREE` object to `karma-os-ultimate.html` that maps parent→children. The OpenClaw swarm already uses hub-and-spoke; extend it to show the tree visually.

**Value:** Real delegation. KARMA breaks a request into sub-tasks, assigns to layer, footclan executes.

#### 1.2 — Shared Blackboard (global state object)
**Research basis:** "Blackboard Architecture" with optimistic locking is the recommended pattern for >3 agents.

**What:** Add a `BLACKBOARD` object in `localStorage` (`ko_blackboard`) that all agents read/write:
```javascript
BLACKBOARD = {
  goals: [],            // active objectives
  context: {},          // shared facts
  decisions: [],        // log of agent decisions
  artifacts: {},        // outputs (content, code, reports)
  updated_by: 'agent-id',
  updated_at: timestamp
}
```

**How:** Add `readBlackboard()` / `writeBlackboard(key, value)` helpers. Footclan writes task results, KARMA reads them for synthesis. Use `localStorage` storage event to sync across tabs.

**Value:** Agents can build on each other's work. KARMA can answer "what did DeepSearch find today?" by reading the blackboard.

#### 1.3 — Structured Inter-Agent Messaging (JSON schema)
**Research basis:** "Indirect Prompt Injection" is a top concern. Free-text agent messages are vulnerable.

**What:** Replace `hermesBroadcast(msg: string)` with `hermesBroadcast({type, from, to, payload, schema})`:
```javascript
// Schema example
{
  type: 'task_assignment',
  from: 'karma',
  to: 'deepsearch',
  payload: { query: 'arxiv latest on transformer interpretability', deadline: '...' },
  schema: 'TaskAssignment.v1',
  ts: Date.now()
}
```

**How:** Add `MESSAGE_SCHEMAS` registry. Hermes validates inbound messages against schema before delivering. Renderers show structured fields, not raw text.

**Value:** Defense against prompt injection + machine-parseable for the UI.

#### 1.4 — State Snapshot Time-Travel
**Research basis:** "Time-Travel" debugging is a top dashboard feature in 2026 multi-agent systems.

**What:** Persist all agent turns (KARMA chat, footclan task completions, hermes messages, openhuman decisions) to a circular buffer in `localStorage` (max 500 entries). Add a "History" tab to the Army modal showing the last 50 turns with timestamps, agent IDs, and payloads.

**How:** Add `HISTORY = []` array, `addHistory(entry)` function, `renderHistory()` UI. Already 80% of the data exists in `S.karmaHistory`, `feedItems`, and `HERMES_NOTIFS` — just unify them.

**Value:** Debugging. "Why did FC-04 fail yesterday?" becomes answerable.

---

## Pillar 2 — Real LLM Backing for Specialists

### Current state
- Only `karma` agent has a real LLM connection
- 24 other agents are static UI elements

### Proposed enhancements

#### 2.1 — Per-agent Claude calls with role prompts
**What:** Each specialist agent gets a dedicated system prompt and can be invoked individually:
```javascript
const AGENT_PROMPTS = {
  deepsearch: "You are DeepSearch — research agent. Find academic papers, technical docs, and current AI developments. Return citations and summaries.",
  codeagent: "You are CodeAgent — code review and refactoring specialist. Analyze code, suggest improvements, catch bugs.",
  apollo: "You are Apollo — full-stack developer. Generate React/Node/Python code following best practices.",
  nova: "You are Nova — UI/UX designer. Suggest layouts, color schemes, component structures.",
  ashlee: "You are Ash Lee — content creator for Bluesky, X, blog. Write in tellmthatsme's voice: raw, personal, hip-hop-rooted.",
  oracle: "You are Oracle — prediction engine. Forecast AI/crypto trends, provide actionable intelligence.",
  marketwatch: "You are MarketWatch — crypto/finance analyst. Track BTC/ETH/SOL, alert on thresholds, summarize market moves."
};
```

**How:** Add `callAgent(agentId, message, stream=false)` dispatcher that:
- Looks up the agent's system prompt
- Calls `callClaude(messages, prompt, stream)`
- Logs to blackboard
- Renders in agent-specific panel

**Value:** 7 agents become real instead of 1. Cost: same Claude API, just different system prompts.

#### 2.2 — Agent selection UI
**What:** In the KARMA chat modal, add a dropdown "TALK TO" with the 7 backed agents. Selecting one routes the message to that agent's prompt.

**How:** Replace the single `karma-in` input with an agent selector + textarea. The current KARMA persona becomes one of the options.

**Value:** Users can directly invoke specific specialists.

#### 2.3 — Multi-agent consensus for hard questions
**What:** For complex queries, have 2-3 agents answer in parallel, then KARMA synthesizes the best parts.

**How:** Add `askMultiple(agentIds, question)` that:
- Calls each agent in parallel (Promise.all)
- Sends all responses to KARMA with "synthesize these" prompt
- Returns combined answer

**Use case:** "Should I post this video on Tuesday or Friday?" → ashlee (content), marketwatch (timing), oracle (trend) → KARMA synthesizes.

**Value:** Better answers for ambiguous questions. Shows the "army" is actually working.

---

## Pillar 3 — Expanded MCP Tool Suite

### Current state
- 16 MCP tools, all browser-automation focused
- Single bridge server, single browser

### Proposed enhancements (based on MCP research)

#### 3.1 — Add filesystem MCP server
**Research basis:** "Filesystem access" is in the top 3 most-requested MCP tools globally.

**What:** Add a filesystem MCP server (`fs_server.py`) exposing:
- `fs_read(path)` — read file contents
- `fs_write(path, content)` — write file
- `fs_list(dir)` — list directory
- `fs_search(pattern)` — grep across files
- `fs_watch(path)` — file system watcher

**Value:** Agents can read code, write reports, search the project. This is a 10x capability multiplier.

#### 3.2 — Add git MCP server
**What:** `git_server.py` exposing:
- `git_status(repo)` — current changes
- `git_diff(file)` — show diff
- `git_commit(message, files)` — commit
- `git_log(n)` — recent commits
- `git_branch_list()` — list branches

**Value:** CodeAgent and GitOpsAgent become real instead of decorative.

#### 3.3 — Add Perplexity / web search MCP server
**What:** `websearch_server.py` exposing:
- `web_search(query, n=5)` — search results
- `web_fetch(url)` — extract page content
- `news_search(topic)` — recent news

**Value:** DeepSearch and IntelAgent can actually fetch data.

#### 3.4 — Add Composio MCP integration (100+ SaaS tools)
**Research basis:** "Cross-Platform Orchestration" via Composio was highlighted as the highest-leverage MCP addition.

**What:** Stand up Composio MCP server (free tier: 100+ apps including Gmail, Slack, Notion, HubSpot, Linear, Jira, Trello, Airtable).

**Value:** Single command → post to social, send email, create CRM entry, log to Linear. This is the "1 tool → 100 capabilities" leverage point.

#### 3.5 — Add Cloudflare Workers AI integration
**What:** Stand up a Cloudflare Worker that runs Llama 3.3 / Qwen 2.5 at the edge for free-tier inference. Expose via MCP.

**Value:** Backup LLM when Claude API is down or rate-limited. Cost: $0 for low volume.

---

## Pillar 4 — Security Hardening

### Current state (per security research)
- ⚠️ Claude API key in browser via `anthropic-dangerous-direct-browser-access` flag
- ⚠️ No auth on `bridge_server.py` — anyone on localhost can drive the browser
- ⚠️ Free-text agent messages — prompt injection risk
- ⚠️ No rate limiting on MCP tool calls
- ⚠️ CORS wide open on bridge

### Proposed enhancements

#### 4.1 — Server-side Claude proxy
**Research basis:** "Never store API keys client-side" is the #1 rule in 2026.

**What:** Add a Node.js proxy endpoint to existing `server.js`:
```javascript
// server.js addition
app.post('/api/chat', rateLimit, async (req, res) => {
  const { messages, agent, stream } = req.body;
  const system = AGENT_PROMPTS[agent] || KARMA_SYS;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, system, messages, stream })
  });
  // proxy response back
});
```

**How:** 
1. Move `S.claudeKey` to server env var (`ANTHROPIC_API_KEY`)
2. `callClaude` in HTML calls `POST /api/chat` instead of `api.anthropic.com`
3. Streaming proxied via SSE
4. Remove `anthropic-dangerous-direct-browser-access` flag

**Value:** API key no longer in browser DevTools. 100x safer.

#### 4.2 — Bridge bearer token auth
**What:** The MCP token field already exists in settings (`S.mcpToken`). Use it.

**How:** 
1. Generate token once: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
2. Set `BRIDGE_TOKEN=...` in env for `bridge_server.py`
3. Bridge checks `Authorization: Bearer <token>` on all requests
4. MCP server reads from `S.mcpToken`, sends header

**Value:** Random other processes on localhost can't hijack the bridge.

#### 4.3 — MCP rate limiting + circuit breakers
**Research basis:** "Per-tool rate limiting + circuit breakers" is the 2026 standard.

**What:** Add per-tool rate limits to `mcp_server.py`:
```python
RATE_LIMITS = {
    'browser_navigate': (60, 60),   # 60 calls per 60s
    'upload_video': (5, 3600),      # 5 uploads per hour
    'browser_screenshot': (30, 60), # 30 screenshots per min
}

def check_rate_limit(tool, caller_id='default'):
    # Token bucket per (tool, caller)
    # If exceeded, return {"error": "rate_limited", "retry_after": ...}
```

**Value:** Runaway agent loops can't drain your API budget.

#### 4.4 — Output sanitization in chat bubbles
**What:** Before injecting any agent response into a `.chat-bubble` div, escape HTML:
```javascript
function sanitize(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
```

**Value:** XSS prevention if an agent returns malicious content (e.g., from prompt-injected data).

---

## Pillar 5 — UX & Observability Enhancements

### 5.1 — Handoff/bottleneck heatmap
**Research basis:** "Visualize the flow of tasks as a graph. Highlight nodes that have the highest retry rates."

**What:** Track per-agent metrics:
- Tasks assigned
- Tasks completed
- Average completion time
- Failure rate
- Current queue depth

Render as a heatmap overlay on the OpenClaw swarm canvas — hot colors for bottlenecks.

**Value:** Instantly see which agent is the bottleneck. "FC-04 has 12 tasks queued, avg 8min each."

### 5.2 — Autonomous vs Human-triggered ratio
**Research basis:** "Track how often agents succeed autonomously vs require HITL."

**What:** Add a stat card showing:
- 87% autonomous
- 13% required approval

**Value:** ROI metric for the army. "Are the agents actually saving me time?"

### 5.3 — Real blackboard inspector panel
**Research basis:** "Live-updating view of the Global State (Blackboard) object."

**What:** New modal `blackboard-m` showing:
- Current goals
- Active context
- Recent decisions
- Artifact gallery (links to outputs)

**Value:** Visibility into what agents know right now.

### 5.4 — Export full session as JSON
**What:** Expand the existing export to include blackboard, history, all settings. Add a "Replay" button to step through the session.

**Value:** Debugging, sharing, archiving.

### 5.5 — Per-agent execution timing
**What:** Measure `performance.now()` before/after each agent call, show in chat bubble ("took 2.3s").

**Value:** Performance debugging.

---

## Pillar 6 — New Integrations (Based on Automation Platform Research)

### 6.1 — Cloudflare Workers deployment
**Research basis:** "Cloudflare Workers for low-cost, global-scale APIs that trigger n8n workflows."

**What:** Deploy a small Worker that exposes a webhook for n8n (cheaper than running n8n on a VPS for low volume). Worker URL goes in `S.n8nUrl`.

**Value:** $0 vs. $5/mo VPS. Edge latency.

### 6.2 — Modal.com integration for GPU tasks
**Research basis:** "Offload heavy lifting to Modal."

**What:** Add an MCP tool `modal_run(function_name, params)` that triggers a Modal function. Use for music gen, image gen, video gen.

**Value:** Local laptop doesn't need GPU. Pay-per-use compute.

### 6.3 — Steel.dev for browser automation
**Research basis:** "Steel.dev for open-source browser fleet control."

**What:** Replace local Chrome extension with Steel.dev managed sessions. Pro: works on any device, no local setup. Con: cost.

**Value:** Cloud-based browser automation. Optional upgrade path.

### 6.4 — Replicate for one-click model deployment
**What:** Add MCP tool `replicate_run(model_id, input)` for any of 1000+ models on Replicate. Useful for music cover art, voice cloning, etc.

**Value:** Access to latest models without managing infrastructure.

### 6.5 — n8n self-hosted on cheap VPS
**Research basis:** "n8n (Self-hosted) is the gold standard for solo creators."

**What:** Move from local Docker to a $4/mo Hetzner VPS. n8n UI accessible anywhere. Webhooks persistent.

**Value:** Workflows survive laptop restarts.

---

## Pillar 7 — Quick Wins (under 1 hour each)

| # | Enhancement | Effort | Impact |
|---|---|---|---|
| 7.1 | Add `AGENT_PROMPTS` dict with 7 specialist prompts | 30 min | High |
| 7.2 | Persist `karmaHistory` to localStorage | 15 min | Medium |
| 7.3 | Persist `TASK_QUEUE` to localStorage | 15 min | Medium |
| 7.4 | Add blackboard object + read/write helpers | 30 min | High |
| 7.5 | Add `callAgent(agentId, msg)` dispatcher | 20 min | High |
| 7.6 | Add agent selector to KARMA chat modal | 30 min | Medium |
| 7.7 | Add structured message schema for Hermes | 1 hr | Medium |
| 7.8 | Add per-agent timing to chat bubbles | 15 min | Low |
| 7.9 | Add handoff heatmap to swarm canvas | 1 hr | Medium |
| 7.10 | Add export of full session JSON | 30 min | Medium |
| 7.11 | Add 5 more voice commands (fleet status, etc.) | 30 min | Low |
| 7.12 | Add "Replay" button to walk history | 1 hr | Low |

---

## Pillar 8 — Major Rebuilds (1+ week each)

| # | Enhancement | Effort | Impact |
|---|---|---|---|
| 8.1 | Server-side Claude proxy (security) | 3 days | Critical |
| 8.2 | Bridge bearer token auth | 1 day | High |
| 8.3 | MCP rate limiting + circuit breakers | 2 days | High |
| 8.4 | Add filesystem MCP server | 2 days | High |
| 8.5 | Add git MCP server | 2 days | High |
| 8.6 | Add web search MCP server (Perplexity) | 1 day | High |
| 8.7 | Blackboard UI + persistence | 1 week | High |
| 8.8 | Multi-agent consensus for hard questions | 1 week | High |
| 8.9 | Composio integration (100+ SaaS) | 3 days | High |
| 8.10 | Manager-worker delegation engine | 2 weeks | Critical |
| 8.11 | Playwright tests for v25 HTML | 1 week | Medium |
| 8.12 | Replace decorative agents with real Claude calls | 1 week | High |

---

## Recommended Sequencing

### Phase 1 (Week 1) — Quick wins + security foundation
- 7.1, 7.2, 7.3, 7.4, 7.5, 7.6 (Pillar 1 quick wins)
- 4.1 (server-side proxy — start of security overhaul)
- 4.2 (bridge auth)

**Result:** 7 real agents, secure key handling, persistent state

### Phase 2 (Weeks 2-3) — MCP expansion
- 3.1, 3.2, 3.3 (filesystem, git, web search MCP)
- 4.3 (rate limiting)

**Result:** Agents can actually do things beyond chat

### Phase 3 (Weeks 4-5) — Orchestration
- 1.1, 1.2, 1.3 (manager-worker, blackboard, structured comms)
- 8.10 (delegation engine)

**Result:** Agents coordinate, not just chat

### Phase 4 (Week 6+) — Polish
- 5.x (observability)
- 6.x (new integrations)
- 11.x (testing)

---

## Cost Analysis

| Service | Free Tier | Paid (low volume) |
|---|---|---|
| Claude API (Sonnet 4) | None | $3/M input, $15/M output |
| n8n Cloud | 20 days trial | $20/mo |
| n8n Self-hosted (Hetzner) | — | €3.79/mo (~$4) |
| Cloudflare Workers | 100K req/day | $0.50/M req |
| Modal.com | $30/mo free credits | Pay per second |
| Replicate | Limited free | ~$0.0001/sec GPU |
| Steel.dev | Limited free | $0.10/session |
| Browserbase | Limited free | $0.10/session |
| Perplexity API | None | $1/M tokens |
| Composio | 100+ apps free tier | Varies |

**Realistic monthly cost for active solo creator:** $20-50/mo (mostly Claude API)

---

## What NOT to Build (YAGNI)

Based on the research, these are common in multi-agent systems but overkill for KARMA OS:
- ❌ LangGraph/AutoGen migration — current scale doesn't need it
- ❌ Kubernetes deployment — Hetzner VPS is fine
- ❌ Vector database for memory — blackboard pattern is sufficient
- ❌ Custom UI framework — current vanilla JS + canvas works
- ❌ Cross-region replication — single user, single region
- ❌ Multi-tenant support — single user
- ❌ WebSocket-based realtime — polling is fine for this scale

---

## References (Research Sources)

- **Multi-agent patterns:** LangGraph docs, CrewAI docs, AutoGen/AG2 docs, Developers Digest Coordination Guide
- **MCP ecosystem:** modelcontextprotocol.io, Glama.ai MCP Marketplace, awesome-mcp-servers GitHub
- **Automation platforms:** n8n docs, Zapier, Make, Pipedream, Modal, Replicate, Cloudflare Workers, Steel.dev, Browserbase
- **Security:** OWASP LLM Top 10, NVIDIA NeMo Guardrails, Lakera Guard, Anthropic safety docs

---

*Roadmap version: 2026-Q2 · Research conducted June 2026 · KARMA OS v25 ULTIMATE*
