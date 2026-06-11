# KARMA OS v25 ULTIMATE — Complete Reference

> **Status:** Canonical reference · supersedes `KARMA-OS-DOCUMENTATION.md` (which still references v18/12-footclan state)
> **File:** `media/karma-os-ultimate.html` (~2092 lines, self-contained)
> **Access gate:** `OVERRIDE` (configurable in Settings)
> **State:** All settings persisted to `localStorage`

---

## Table of Contents

1. [System Overview](#system-overview)
2. [AI Army — 25 Agents in 7 Crews](#ai-army--25-agents-in-7-crews)
3. [Footclan — 20 Workers](#footclan--20-workers)
4. [OpenClaw Swarm Canvas](#openclaw-swarm-canvas)
5. [n8n Workflow Automation](#n8n-workflow-automation)
6. [MCP Bridge — 16 Tools](#mcp-bridge--16-tools)
7. [Voice Command System (35+ Commands)](#voice-command-system-35-commands)
8. [AI Chat — KARMA & Impossible Desk](#ai-chat--karma--impossible-desk)
9. [Hermes Messenger & Notification Center](#hermes-messenger--notification-center)
10. [OpenHuman Approval Workflow](#openhuman-approval-workflow)
11. [Settings & Configuration](#settings--configuration)
12. [Modals & UI Panels](#modals--ui-panels)
13. [Themes](#themes)
14. [Data Model & State](#data-model--state)
15. [Extension Patterns](#extension-patterns)
16. [Production Hardening Checklist](#production-hardening-checklist)

---

## System Overview

```
KARMA OS v25 ULTIMATE
├── 25 AI Agents in 7 crews
├── 20 Footclan distributed workers
├── 35+ voice commands (Auggie)
├── 8 n8n webhook-triggered workflows
├── MCP Bridge (16 tools) for any AI model
├── OpenClaw D3-style canvas swarm viz
├── Hermes inter-agent messenger + notifications
├── OpenHuman human-in-the-loop approvals
├── 4 CSS themes (Cyberpunk, Stealth, Matrix, Aurora)
├── 7 modals (KARMA, Impossible, Voice, Army, Hermes, OpenHuman, Settings)
└── Real Claude API integration (Anthropic Messages)
```

**Single-file deploy:** all HTML/CSS/JS inlined in `karma-os-ultimate.html`.

**Sibling files (external integrations):**
- `browser_extension/bridge_server.py` — HTTP server `127.0.0.1:9876`
- `browser_extension/mcp_server.py` — MCP stdio server (16 tools)
- `browser_extension/youtube_uploader.py` — track upload automation
- `scripts/SOCIAL_POSTER.py` — cross-platform social posting
- `server.js` — Node.js metrics server (`:8888`)

---

## AI Army — 25 Agents in 7 Crews

### Command Layer · `crew: command` · color `#00d4ff`
| ID | Name | Icon | Role | Skills |
|---|---|---|---|---|
| `karma` | KARMA Commander | 🦊 | commander | strategy, orchestration, 决策 |
| `auggie` | Auggie Voice AI | 🎤 | voice | stt, tts, voice-cmd |
| `oracle` | Oracle Prediction | 👁 | prediction | prediction, analytics, trends |

### Swarm Layer · `crew: swarm` · color `#00ff9d`
| ID | Name | Icon | Role | Skills |
|---|---|---|---|---|
| `openclaw` | OpenClaw Swarm | 🕸 | swarm | network, topology, connections |
| `hermes` | Hermes Messenger | 📡 | messenger | routing, notifications, broadcast |
| `nexus` | Nexus Protocol | 🔗 | integration | mcp, webhooks, api-gateway |

### Specialist Layer · `crew: specialist` · color `#b347ff`
| ID | Name | Icon | Role | Skills |
|---|---|---|---|---|
| `deepsearch` | DeepSearch | 🔮 | research | arxiv, web-search, papers |
| `codeagent` | CodeAgent | ⚡ | coder | pr-review, code-gen, refactor |
| `apollo` | Apollo Coder | 🛠️ | coder | react, node, python, fullstack |
| `nova` | Nova Designer | 🎨 | designer | html, css, design, figma |

### Marketing Layer · `crew: marketing` · color `#ff3366`
| ID | Name | Icon | Role | Skills |
|---|---|---|---|---|
| `ashlee` | Ash Lee AI | 💜 | content | bluesky, social, blog, copy |
| `footclan` | Footclan HQ | 👥 | workers | scraping, outreach, lead-gen |

### Operations Layer · `crew: ops` · color `#ff6b35`
| ID | Name | Icon | Role | Skills |
|---|---|---|---|---|
| `marketwatch` | MarketWatch | 📈 | analytics | crypto, alerts, portfolio |
| `intelagent` | IntelAgent | 🧠 | intel | feeds, rss, news |
| `gitops` | GitOpsAgent | 🐙 | devops | github, sync, ci/cd |
| `synservice` | SyncService | 🔄 | infrastructure | sync, backup, replication |
| `uptimebot` | UptimeBot | 🔔 | monitoring | uptime, ping, alerts |
| `rssagent` | RSSAgent | 📰 | feeds | rss, aggregation, filter |
| `invoicebot` | InvoiceBot | 💰 | finance | invoicing, tracking, reports |

### Human-in-Loop Layer · `crew: human` · color `#00d4ff`
| ID | Name | Icon | Role | Skills |
|---|---|---|---|---|
| `openhuman` | OpenHuman | 👤 | approval | approvals, authorization, ethics |

### Automation Layer · `crew: auto` · color `#00ff9d`
| ID | Name | Icon | Role | Skills |
|---|---|---|---|---|
| `n8norch` | n8n Orchestrator | ⚙️ | automation | n8n, workflows, triggers |
| `mcpbridge` | MCP Bridge | 🌉 | mcp | mcp-server, tools, resources |
| `zapier` | Zapier Connector | ⚡ | zapier | zapier, integrations, automation |
| `cronus` | Cronus Scheduler | ⏰ | scheduler | cron, scheduling, tasks |
| `dataflow` | DataFlow ETL | 🔄 | etl | etl, transform, pipeline |

### Agent Definition Schema
```javascript
{
  id: 'karma',                          // unique
  n: 'KARMA Commander',                 // display name
  i: '🦊',                              // icon (emoji)
  bg: '#00d4ff22',                      // card background (hex with alpha)
  s: 'so',                              // status: 'so' (online/anim) | 'sb' (busy) | 'si' (idle) | 'sr' (red/error)
  t: 'Commanding 25 agents',            // status text
  role: 'commander',                    // for sizing in swarm
  crew: 'command',                      // crew key
  skills: ['strategy', 'orchestration', '决策']
}
```

### AGENT_CREWS lookup
```javascript
const AGENT_CREWS = {
  command:    { name: 'Command',      color: '#00d4ff', icon: '🦊', agents: ['karma','auggie','oracle'] },
  swarm:      { name: 'Swarm',        color: '#00ff9d', icon: '🕸', agents: ['openclaw','hermes','nexus'] },
  specialist: { name: 'Specialist',   color: '#b347ff', icon: '🔮', agents: ['deepsearch','codeagent','apollo','nova'] },
  marketing:  { name: 'Marketing',    color: '#ff3366', icon: '📣', agents: ['ashlee','footclan'] },
  ops:        { name: 'Operations',   color: '#ff6b35', icon: '⚙️', agents: ['marketwatch','intelagent','gitops','synservice','uptimebot','rssagent','invoicebot'] },
  human:      { name: 'Human-in-Loop', color: '#00d4ff', icon: '👤', agents: ['openhuman'] },
  auto:       { name: 'Automation',   color: '#00ff9d', icon: '⚡', agents: ['n8norch','mcpbridge','zapier','cronus','dataflow'] },
};
```

---

## Footclan — 20 Workers

### Worker Roster (fc01–fc20)
| ID | Name | Default Status | Task (default) | Assigned To |
|---|---|---|---|---|
| `fc01` | FC-01 Research | active | Scanning arxiv for AI papers | `deepsearch` |
| `fc02` | FC-02 CodeReview | busy | Reviewing PR | `codeagent` |
| `fc03` | FC-03 Content | idle | Awaiting task | — |
| `fc04` | FC-04 DataScrape | active | Collecting competitor pricing | `marketwatch` |
| `fc05` | FC-05 ReportGen | idle | Awaiting task | — |
| `fc06` | FC-06 Outreach | busy | Sending cold emails | `footclan` |
| `fc07` | FC-07 LeadQual | active | Qualifying Contra leads | `nexus` |
| `fc08` | FC-08 Monitor | idle | Awaiting task | — |
| `fc09` | FC-09 SEOAudit | idle | Awaiting task | — |
| `fc10` | FC-10 Backlink | idle | Awaiting task | — |
| `fc11` | FC-11 CopyWrite | idle | Awaiting task | — |
| `fc12` | FC-12 QATest | idle | Awaiting task | — |
| `fc13` | FC-13 SEOOptim | idle | Awaiting task | — |
| `fc14` | FC-14 SocialMed | idle | Awaiting task | — |
| `fc15` | FC-15 EmailCrt | idle | Awaiting task | — |
| `fc16` | FC-16 DataAnly | idle | Awaiting task | — |
| `fc17` | FC-17 LinkBldg | idle | Awaiting task | — |
| `fc18` | FC-18 CompetAn | idle | Awaiting task | — |
| `fc19` | FC-19 RankTrck | idle | Awaiting task | — |
| `fc20` | FC-20 ConvOptim | idle | Awaiting task | — |

### Task Lifecycle
```
createTask() → [pending] → approveTask() → [approved] → assigned to Footclan → completeTask() → [done]
                                                      → rejectTask()  → [rejected]
```

### Task Object Schema
```javascript
{
  id: 't' + Date.now(),         // unique
  task: 'Task description',     // text
  priority: 'high',             // 'low' | 'medium' | 'high' | 'critical'
  status: 'pending',            // 'pending' | 'approved' | 'rejected' | 'done'
  created: Date.now(),
  agent: 'deepsearch'           // assigned agent
}
```

### Round-Robin Load Balancing
`approveTask()` uses `_fcRR` counter for circular scan:
- Starts at `_fcRR % FOOTCLAN.length`
- Skips workers where `s === 'busy'`
- Wraps around if needed
- Advances `_fcRR` after assignment

### Functions
| Function | Purpose |
|---|---|
| `createTask()` | Adds task to `TASK_QUEUE`, random priority/agent |
| `approveTask(id)` | Approves + assigns via round-robin |
| `rejectTask(id)` | Marks rejected, logs warning |
| `completeTask(id)` | Marks done, resets worker to idle |
| `renderFootclan()` | Re-renders worker list every 3s with progress |

### Progress Simulation
```javascript
setInterval(() => {
  FOOTCLAN.forEach(f => {
    if (f.s === 'active' || f.s === 'busy') {
      f.progress = Math.min(100, f.progress + Math.random() * 8);
      if (f.progress >= 100) { f.s = 'idle'; f.task = 'Awaiting task'; }
    }
  });
  renderFootclan();
}, 3000);
```

---

## OpenClaw Swarm Canvas

**Location:** `initSwarm()` at line 1588 of `karma-os-ultimate.html`

### Visual
- HTML5 `<canvas>` 130px tall, full width
- 25 agent nodes (KARMA = 10px, others = 6px)
- Hub-and-spoke topology: all 24 connect to KARMA
- 17 peer links for richer topology

### Node Coloring
| Agent | Color |
|---|---|
| `karma` | `#00d4ff` (cyan) |
| `footclan` | `#ff6b35` (orange) |
| `hermes` | `#b347ff` (purple) |
| all others | `#00ff9d` (green) |

### Physics (per frame)
```javascript
// Repulsion: every pair pushes apart
f = 600 / (d²)             // Coulomb-like

// Attraction: linked nodes pull together
f = (d - 50) * 0.012       // Hooke spring, rest length 50

// Center pull
n.vx += (W/2 - n.x) * 0.004
n.vy += (H/2 - n.y) * 0.004

// Damping
n.vx *= 0.88               // velocity decay
```

### Packets
Random traveling dots along links (spawned when `Math.random() > 0.85`):
```javascript
packets.push({ sx, sy, ex, ey, p: 0, col: sourceNode.col });
// Each frame: p += 0.025, drawn as moving arc, removed when p >= 1
```

### Initialization
```javascript
setTimeout(initSwarm, 500);  // on boot
setTimeout(() => { try { initSwarm(); } catch {} }, 200);  // after theme change
```

### Extension Patterns
1. **Add new node color** — extend the col ternary with new agent ID
2. **Click-to-focus** — `canvas.onclick` to detect nearest node, open agent modal
3. **Drag nodes** — capture mousedown, override velocity for dragged nodes
4. **Replace with D3** — keep `AGENTS` data, swap canvas for SVG + `d3-force` simulation

---

## n8n Workflow Automation

### Configured Workflows (8)

| ID | Name | Trigger | Webhook Path | Status |
|---|---|---|---|---|
| `ash-lee-post` | Ash Lee Daily Post | Scheduled 18:30 AEST | `/webhook/ash-lee-post` | active |
| `intel-sync` | KARMA INTEL Sync | Interval 5min | `/webhook/intel-sync` | active |
| `uptime-check` | Uptime Monitor | Interval 1min | `/webhook/uptime` | active |
| `crypto-alert` | BTC Alert System | Condition >$70k | `/webhook/crypto-alert` | paused |
| `client-followup` | Client Follow-up | Scheduled 09:00 daily | `/webhook/client-followup` | active |
| `lead-qual` | Lead Qualification | Contra webhook | `/webhook/lead-qual` | active |
| `deploy-fleet` | Deploy Fleet | Manual button | `/webhook/deploy` | active |
| `research-arxiv` | Research Arxiv | Manual button | `/webhook/research` | active |

### Trigger Function
```javascript
async function triggerN8NWorkflow(id, retries = 2) {
  const wf = WORKFLOWS.find(w => w.id === id);
  const url = S.n8nUrl + wf.webhook;  // e.g. http://localhost:5678/webhook/ash-lee-post
  const payload = JSON.stringify({ ts: Date.now(), source: 'karma-os', workflow: id, agent: 'karma' });
  
  // Retry logic: 3 total attempts, exponential backoff
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(5000)   // 5s timeout
      });
      if (r.ok) return;                      // success
      if (r.status >= 500 && attempt < retries) {
        await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt)));
        continue;                            // retry on 5xx
      }
      return;                                // 4xx: don't retry
    } catch (e) {
      if (attempt < retries) await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt)));
    }
  }
}
```

### Payload Format (every webhook)
```json
{
  "ts": 1716000000000,
  "source": "karma-os",
  "workflow": "deploy-fleet",
  "agent": "karma"
}
```

### End-to-End Setup (BTC Alert Example)
1. **Start n8n:** `docker run -d --name n8n -p 5678:5678 n8nio/n8n`
2. **In n8n UI:** Create workflow → Webhook node (POST `/karma-btc-alert`) → Action → Activate
3. **Add to `WORKFLOWS` array** in `karma-os-ultimate.html`:
   ```javascript
   { id: 'btc-alert', n: 'BTC Price Alert', icon: '🚨', type: 'trigger', status: 'active', webhook: '/webhook/karma-btc-alert' }
   ```
4. **Configure in Settings:** n8n Webhook URL = `http://localhost:5678`
5. **Trigger:** click button / voice `workflow` / console `triggerN8NWorkflow('btc-alert')`

### Connection Check
```javascript
function testN8NConnection() {
  fetch(S.n8nUrl + '/health', { signal: AbortSignal.timeout(4000) })
    .then(r => r.ok ? 'Connected ✓' : 'Server error ' + r.status)
    .catch(() => 'Unreachable');
}
```
Status shown in Settings modal header.

---

## MCP Bridge — 16 Tools

**Server:** `browser_extension/mcp_server.py` · **Transport:** stdio JSON-RPC 2.0
**Bridge:** `browser_extension/bridge_server.py` on `http://127.0.0.1:9876`

### Standard Response
```json
{ "success": true, "result": <any> }      // success
{ "success": false, "error": "string" }   // failure
```

### Tools

#### Navigation & Tabs
| Tool | Args | Returns |
|---|---|---|
| `browser_navigate` | `url` | `{url, title}` of loaded page |
| `browser_tab_list` | — | `tabs: [{index, title, url}]` |
| `browser_tab_switch` | `index` or `url_contains` | active tab info |
| `browser_tab_close` | `index?` (omit for current) | success |

#### Interaction
| Tool | Args | Notes |
|---|---|---|
| `browser_click` | `selector?` and/or `text?` | Need at least one |
| `browser_hover` | `selector?` and/or `text?` | Triggers tooltips/dropdowns |
| `browser_select` | `selector`, `value?` or `label?` | Dropdown select |
| `browser_keypress` | `key`, `selector?` | e.g. `Enter`, `Ctrl+A` |
| `browser_scroll` | `direction`, `pixels?`, `selector?` | direction: up/down/top/bottom |

#### Input
| Tool | Args | Notes |
|---|---|---|
| `browser_type` | `selector`, `text` | Input/textarea fill |

#### Output / Capture
| Tool | Args | Returns |
|---|---|---|
| `browser_extract` | `selector?` (omit = full page) | `{text}` first 5000 chars |
| `browser_screenshot` | — | `{data: "data:image/png;base64,..."}` |
| `browser_evaluate` | `code` | `{result}` from JS execution |

#### High-Level (YouTube)
| Tool | Args | Timeout |
|---|---|---|
| `upload_video` | `title`, `description`, `tags?`, `file_path`, `channel?` | 120s |
| `add_pinned_comment` | `video_id`, `text` | 60s |
| `browser_status` | — | health check |

### Install in Claude Desktop
`%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "browser-bridge": {
      "command": "python",
      "args": ["C:\\Users\\karma\\browser_extension\\mcp_server.py"]
    }
  }
}
```

### Test Mode
```bash
python browser_extension/mcp_server.py --test
```

### Typical YouTube Upload Flow
```javascript
1. browser_navigate("https://studio.youtube.com")
2. browser_click({text: "Create"})
3. browser_click({text: "Upload videos"})
4. browser_evaluate({code: "document.querySelector('input[type=file]').click()"})
5. browser_type({selector: "input#title", text: "..."})
6. browser_type({selector: "textarea#description", text: "..."})
7. browser_screenshot()                           // verify state
8. browser_click({text: "Publish"})
9. add_pinned_comment({video_id: "...", text: "..."})
```

---

## Voice Command System (35+ Commands)

**Activation:** Click 🎤 VOICE button → click mic ring (Web Speech API)
**Processor:** `processVoice(text)` at line 2111
**Help list:** `#voice-cmd-list` div in voice modal

### System
| Command | Action |
|---|---|
| `status` | Opens Army modal, shows agent count |
| `agents` | Re-renders fleet panel |
| `army` | Opens Army Overview modal |
| `hermes` | Opens Hermes Messenger |
| `boost` / `turbo` | Engages system boost (visual + perf) |
| `sync` / `fleet sync` / `refresh` | Triggers intel-sync n8n + reloads |
| `mute` / `unmute` / `audio off` / `audio on` | Audio toggle |
| `what time` / `time` / `clock` | Current time toast |

### Themes
| Command | Action |
|---|---|
| `stealth` / `stealth mode` | Switches to gray theme |
| `matrix` / `matrix mode` | Green terminal theme |
| `aurora` / `aurora mode` | Purple gradient theme |
| `cyberpunk` / `cyber mode` | Cyan (default) |

### Open URLs
| Command | Action |
|---|---|
| `open github` | `github.com/{ghUser}` (from settings) |
| `open claude` | claude.ai |
| `open contra` | contra.com |
| `open bluesky` | bsky.app |
| `open n8n` | `S.n8nUrl` |
| `open intel` | `S.intelUrl` |
| `open settings` | Settings modal |
| `open impossible` | Impossible Desk |

### Intel/Content
| Command | Action |
|---|---|
| `deals` / `intel deal` / `free stuff` | Refresh deals ticker |
| `news` / `intel news` / `ai news` | Refresh news ticker |
| `intel refresh` | Full intel refresh |

### Agents & Approvals
| Command | Action |
|---|---|
| `approve` / `approvals` | Show pending count |
| `footclan` / `workers` | Worker status |
| `workflow` / `workflows` / `automations` | Active workflow count |
| `oracle` | Oracle prediction mode (Impossible Desk) |
| `code review` | Research Arxiv workflow |
| `research arxiv` | Open Impossible Desk with arxiv prompt |

### Hermes
| Command | Action |
|---|---|
| `notifications` | Toggle notif panel |
| `read notifications` | Toast last 3 notifs |
| `broadcast all` | Send Hermes broadcast |

### Adding a New Command (5 steps)
1. **Add to `VOICE_COMMANDS` dict** (~line 1361):
   ```javascript
   'fleet status': 'Show fleet summary',
   ```
2. **Add handler in `processVoice(t)`** (~line 2111):
   ```javascript
   if (t.includes('fleet status')) {
     openM('army-m');
     renderArmyModal();
     addFeed({ t: 'success', i: '🚀', m: 'Fleet status: ...' });
     return reply('Fleet status: 18 agents online');
   }
   ```
3. **Add to help list** in voice modal HTML
4. **Add to Command Center quick-list** in HTML
5. **Test:** refresh → 🎤 → say "fleet status"

---

## AI Chat — KARMA & Impossible Desk

### callClaude (line 1897)
```javascript
async function callClaude(messages, system, stream = false) {
  if (!S.claudeKey) throw new Error('NO_KEY');
  const body = { model: 'claude-sonnet-4-20250514', max_tokens: 1200, messages };
  if (system) body.system = system;
  if (stream) body.stream = true;
  
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': S.claudeKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'   // ⚠️ exposes key in browser
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const t = await r.text(); throw new Error(t.substring(0, 120)); }
  return r;
}
```

### sendKarma (non-streaming chat)
- Reads `karma-in` input
- Appends user bubble to `#karma-msgs`
- Pushes to `S.karmaHistory`
- Shows typing indicator
- Calls `callClaude(history.slice(-12), KARMA_SYS)` — **last 12 messages only**
- Parses `d.content[0].text` from response
- Appends assistant bubble, updates history, logs to feed
- **Without API key:** shows inline prompt to add key, no external call

### fireImpossible (streaming)
- Reads `imp-in` input
- Sets `#imp-out` to "executing..." message
- Calls `callClaude([{role:'user',content:req}], IMP_SYS, true)` — **streaming=true**
- Uses `r.body.getReader()` + `TextDecoder`
- Parses SSE: lines starting with `data: ` → JSON.parse → `j.delta.text` appended live
- Stops at `[DONE]`

### Stream Parse Pattern
```javascript
const reader = r.body.getReader();
const dec = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const lines = dec.decode(value).split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      try {
        const j = JSON.parse(data);
        if (j.delta?.text) out.textContent += j.delta.text;
      } catch {}
    }
  }
}
```

### System Prompts
- `KARMA_SYS` — base persona (decision-maker, 25-agent commander)
- `IMP_SYS` — "Impossible Desk" persona (no disclaimers, full document generation)

### Oracle Mode
Special prediction mode in fireImpossible with one-shot prompt about AI tools landscape, crypto sentiment, actionable recs.

### OpenAI Fallback Extension
```javascript
async function callOpenAI(messages, system, stream = false) {
  if (!S.openaiKey) throw new Error('NO_OPENAI_KEY');
  const body = {
    model: 'gpt-4o',
    max_tokens: 1200,
    messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
    stream
  };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.openaiKey },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const t = await r.text(); throw new Error(t.substring(0, 120)); }
  return r;
}

async function callAI(messages, system, stream = false, prefer = 'claude') {
  if (prefer === 'claude' && S.claudeKey) {
    try { return await callClaude(messages, system, stream); }
    catch (e) { console.warn('Claude failed, falling back:', e); }
  }
  if (S.openaiKey) {
    try { return await callOpenAI(messages, system, stream); }
    catch (e) { throw e; }
  }
  throw new Error('NO_KEY');
}
```

### Response Normalization
| Provider | Path to text |
|---|---|
| Claude | `d.content[0]?.text` |
| OpenAI | `d.choices[0]?.message?.content` |
| OpenAI stream | `j.choices[0]?.delta?.content` |
| Claude stream | `j.delta?.text` |

---

## Hermes Messenger & Notification Center

### Modal: `hermes-m`
- **To field:** dropdown of 19 specific agents + "Broadcast All (25 agents)"
- **Thread:** scrollable `#hermes-thread`
- **Preloaded messages** on startup (Hermes ↔ Auggie, OpenClaw, FC-04)
- **Send flow:** `sendHermesMsg()` adds user bubble → setTimeout → simulated response
- **Broadcast:** `hermesBroadcast(msg)` distributes to all 25 with staggered delivery

### Notification Center
- `HERMES_NOTIFS` array (max 50)
- `addNotif(msg, type)` adds to array, renders last 10 in panel
- Badge count = notifications from last 5 minutes
- Types: `info`, `success`, `warn`, `error`

---

## OpenHuman Approval Workflow

### Task Object
```javascript
{
  id: 't' + Date.now(),
  task: 'description',
  priority: 'low' | 'medium' | 'high' | 'critical',
  status: 'pending' | 'approved' | 'rejected' | 'done',
  created: Date.now(),
  agent: 'deepsearch'
}
```

### UI
- Pending list with approve/reject buttons
- Badge counter (`#oh-count`)
- New task input (`#new-task-input`)
- Priority badges: L / M / H / C

### Approval Flow
```javascript
function approveTask(id) {
  const t = TASK_QUEUE.find(t => t.id === id);
  t.status = 'approved';
  // Round-robin scan for idle/active worker
  let w = null, start = _fcRR % FOOTCLAN.length;
  for (let i = 0; i < FOOTCLAN.length; i++) {
    const idx = (start + i) % FOOTCLAN.length;
    if (FOOTCLAN[idx].s === 'idle' || FOOTCLAN[idx].s === 'active') {
      w = FOOTCLAN[idx];
      _fcRR = idx + 1;
      break;
    }
  }
  if (w) { w.s = 'active'; w.task = t.task; w.progress = 0; w.assigned = t.agent; }
}
```

---

## Settings & Configuration

### State Object (`S`)
```javascript
const S = {
  claudeKey:    localStorage.getItem('ko_claude') || '',
  openaiKey:    localStorage.getItem('ko_openai') || '',
  mcpUrl:       localStorage.getItem('ko_mcp_url') || '',
  mcpToken:     localStorage.getItem('ko_mcp_token') || '',
  ghUser:       localStorage.getItem('ko_gh') || 'tellemthatsme',
  n8nUrl:       localStorage.getItem('ko_n8n') || 'http://localhost:5678',
  intelUrl:     localStorage.getItem('ko_intel') || 'http://localhost:7337',
  gateCode:     localStorage.getItem('ko_gate') || 'OVERRIDE',
  theme:        localStorage.getItem('ko_theme') || 'cyberpunk',
  muted:        localStorage.getItem('ko_muted') === 'true',
  karmaHistory: [],           // in-memory only — lost on refresh
  isListening:  false,
  recognition:  null,
  startTime:    Date.now(),
  agents:       [],
  footclan:     [],
  workflows:    [],
  hermesMessages: [],
};
```

### localStorage Keys
| Key | Field | Default |
|---|---|---|
| `ko_claude` | `s-claude` | empty |
| `ko_openai` | `s-openai` | empty |
| `ko_mcp_url` | `s-mcp-url` | empty |
| `ko_mcp_token` | `s-mcp-token` | empty |
| `ko_gh` | `s-github` | `tellemthatsme` |
| `ko_n8n` | `s-n8n` | `http://localhost:5678` |
| `ko_intel` | `s-intel` | `http://localhost:7337` |
| `ko_gate` | `s-gate` | `OVERRIDE` |
| `ko_theme` | (set by setTheme) | `cyberpunk` |
| `ko_muted` | (set by toggleMute) | `false` |
| `ko_start` | (set on boot) | `Date.now()` |

---

## Modals & UI Panels

### 7 Modals
| ID | Title | Purpose |
|---|---|---|
| `karma-m` | ASK KARMA — AI INTERFACE | Claude chat |
| `imp-m` | IMPOSSIBLE DESK | Streaming Claude interface |
| `voice-m` | AUGGIE · VOICE AI | Voice recognition + commands |
| `army-m` | AI ARMY OVERVIEW | Fleet visualization |
| `settings-m` | KARMA OS SETTINGS | API keys, URLs, themes |
| `hermes-m` | HERMES · Agent Messenger | Inter-agent messaging |
| `openhuman-m` | OPENHUMAN · Approvals | Task queue |

### Layout (3-column grid)
**Left:** AI Army list · Command Center · n8n Workflows · Footclan Workers
**Center:** Stats row · OpenClaw Swarm · Army Feed · Quick Launch · Ticker
**Right:** System Health · Hermes Messenger · OpenHuman Approvals · Active Workflows · API Chart

### Footer Status Dots
UAS · GitHub · Claude · n8n:4 · Voice · OpenClaw · Footclan · Hermes · OpenHuman

---

## Themes

4 themes via `data-theme` attribute on `<html>`. Stored as `ko_theme`.

| Theme | Primary | Background |
|---|---|---|
| Cyberpunk (default) | `#00d4ff` | `#060a14` |
| Stealth | `#64ffda` | `#0a0e14` |
| Matrix | `#00ff41` | `#000300` |
| Aurora | `#a78bfa` | `#0f0a1a` |

```javascript
function setTheme(name) {
  S.theme = name;
  if (name === 'cyberpunk') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('ko_theme', name);
  // re-init swarm after theme change
  setTimeout(() => { try { initSwarm(); } catch {} }, 200);
}
```

---

## Data Model & State

### Arrays
| Variable | Type | Count | Description |
|---|---|---|---|
| `AGENTS` | const | 25 | Agent definitions |
| `FOOTCLAN` | const | 20 | Worker definitions |
| `WORKFLOWS` | const | 8 | n8n workflow definitions |
| `TASK_QUEUE` | let | dynamic | Pending/approved/done tasks |
| `HERMES_NOTIFS` | const | max 50 | Notification log |
| `feedItems` | internal | max 50 | Army feed log |
| `chartD` | const | 24 | API latency chart data |

### Runtime Globals
| Name | Type | Purpose |
|---|---|---|
| `S` | state object | All settings + runtime |
| `AGENT_CREWS` | const | Crew grouping for delegation |
| `_karmaStart` | localStorage | Uptime tracking |
| `_n8nRetry` | int | n8n retry counter |
| `_fcRR` | int | Footclan round-robin cursor |

### Functions Reference (60+)
| Category | Functions |
|---|---|
| Init | `onBoot`, `tryGate`, `clockStart` |
| Rendering | `renderAgents`, `renderFootclan`, `renderChart`, `renderTaskQueue`, `renderArmyModal` |
| Task Queue | `createTask`, `approveTask`, `rejectTask`, `completeTask` |
| Hermes | `sendHermesMsg`, `addNotif`, `hermesBroadcast` |
| n8n | `triggerN8NWorkflow`, `triggerWorkflow`, `testN8NConnection` |
| MCP | `checkMCPStatus` |
| Settings | `saveSettings`, `populateSettings`, `updateDots` |
| Modals | `openM`, `closeM` |
| Voice | `toggleVoice`, `processVoice`, `reply`, `initVoice` |
| AI | `callClaude`, `sendKarma`, `fireImpossible`, `oraclePulse` |
| Themes | `setTheme`, `setVol`, `toggleMute` |
| Data | `clockStart`, `fetchCrypto` |
| Swarm | `initSwarm` |
| Misc | `toast`, `addFeed`, `pad`, `execCmd`, `sendCmd`, `triggerBoost` |

---

## Extension Patterns

### Add a New Agent
```javascript
// In AGENTS array
{ id: 'newagent', n: 'New Agent', i: '🆕', bg: '#xxx22', s: 'so', t: 'Idle', role: 'specialist', crew: 'specialist', skills: ['...'] }

// In AGENT_CREWS
specialist: { ..., agents: ['deepsearch', 'codeagent', 'apollo', 'nova', 'newagent'] }
```

### Add a New Workflow
```javascript
// In WORKFLOWS array
{ id: 'my-wf', n: 'My Workflow', icon: '⚡', type: 'manual', status: 'active', webhook: '/webhook/my-wf' }

// Then create matching n8n workflow at /webhook/my-wf
```

### Add a New MCP Tool
1. Add tool def to `MCP_TOOLS` in `mcp_server.py`:
   ```python
   {"name": "my_tool", "description": "...", "inputSchema": {"type": "object", "properties": {...}, "required": [...]}}
   ```
2. Add handler in `handle_tool()`:
   ```python
   if name == "my_tool":
       return send_command("my_action", args)
   ```
3. Implement action in browser extension's `background.js`

### Add a New Theme
1. Add CSS class to `<html>` data-theme attribute:
   ```css
   [data-theme="mytheme"]{--ac:#xxx;--ac2:#yyy;--ac3:#zzz;--bg:#aaa;...}
   ```
2. Add to settings modal theme grid:
   ```html
   <div class="theme-btn" onclick="setTheme('mytheme')">MYTHEME</div>
   ```

---

## Production Hardening Checklist

### Security
- [ ] Move `callClaude` server-side (the `anthropic-dangerous-direct-browser-access` flag exposes the API key in browser DevTools)
- [ ] Add Bearer token auth to `bridge_server.py` (MCP token setting exists but unused)
- [ ] Add HTTPS reverse proxy (nginx/cloudflare) for n8n
- [ ] Sanitize user input before display (XSS risk in chat bubbles)
- [ ] Add rate limiting on bridge commands

### Reliability
- [ ] Add `AbortSignal.timeout()` to all `fetch` calls
- [ ] Add max-age + DLQ to `bridge_server.py` command queue (jobs >5min should reject)
- [ ] Add exponential backoff retry for 529 (overloaded) responses
- [ ] Persist `karmaHistory` and `TASK_QUEUE` to localStorage
- [ ] Add max-queue-size to feed/notifications (currently hardcoded 50/20)

### Observability
- [ ] Add structured error logging
- [ ] Add token usage tracking (`usage` field in Claude responses)
- [ ] Add timing metrics for API calls
- [ ] Add health check endpoint to `bridge_server.py`

### Testing
- [ ] Add Playwright tests for `karma-os-ultimate.html` (current tests target legacy v6)
- [ ] Add unit tests for `bridge_server.py`, `mcp_server.py`, `youtube_uploader.py`
- [ ] Add integration test for full n8n webhook flow
- [ ] Add MCP server contract tests

### Documentation
- [x] This file (replaces stale `KARMA-OS-DOCUMENTATION.md`)
- [ ] Update `KARMA-OS-DOCUMENTATION.md` to point to this file (or delete)
- [ ] Add inline JSDoc to major functions
- [ ] Add architecture diagram for OpenClaw swarm

---

## Cross-References

- `PRD.md` — TELLLEMTHATSME music project requirements
- `ARCHITECTURE.md` — System architecture
- `guides/N8N-SETUP-GUIDE.md` — n8n setup
- `guides/MCP_SETUP_GUIDE.md` — MCP setup
- `launch/SESSION_LOG.md` — Session history
- `browser_extension/README.md` — Browser bridge docs

---

*Document version: v25 ULTIMATE reference · 25 agents · 20 footclan · 8 workflows · 16 MCP tools · 35+ voice commands · 60+ functions*
