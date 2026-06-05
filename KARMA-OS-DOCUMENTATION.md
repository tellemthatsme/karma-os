# KARMA OS v25 ULTIMATE — Full Documentation

> AI Army Operating System · 25 Agents · 12 Footclan Workers · 35+ Voice Commands
> OpenClaw Swarm · Hermes Messenger · OpenHuman Approvals · n8n Automation · MCP Bridge

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [System Overview](#system-overview)
3. [Agent Fleet (25 Agents)](#agent-fleet-25-agents)
4. [Agent Crews — CrewAI-Style Architecture](#agent-crews--crewai-style-architecture)
5. [Footclan Worker System](#footclan-worker-system)
6. [Hermes Messenger & Notification Center](#hermes-messenger--notification-center)
7. [OpenHuman Approval Workflow](#openhuman-approval-workflow)
8. [Voice Command System (35+ Commands)](#voice-command-system-35-commands)
9. [n8n Workflow Automation](#n8n-workflow-automation)
10. [MCP Bridge (Model Context Protocol)](#mcp-bridge-model-context-protocol)
11. [Settings & Configuration](#settings--configuration)
12. [Modals & UI Panels](#modals--ui-panels)
13. [CSS Themes](#css-themes)
14. [Data Model & State](#data-model--state)
15. [Functions Reference (55 functions)](#functions-reference-55-functions)

---

## Quick Start

1. Open `karma-os-ultimate.html` in any browser
2. Enter gate code **`OVERRIDE`** to unlock
3. Configure API keys in **Settings** (🔑 icon):
   - `sk-ant-...` Anthropic key → activates KARMA AI chat and Impossible Desk streaming
   - n8n webhook URL → activates real workflow triggers
   - MCP server URL → activates Model Context Protocol bridge
4. Try voice commands: Click the **🎤 VOICE** button and speak
5. Open **HERMES** to message agents or broadcast to all 25
6. Open **ARMY** to see the full fleet with status, crew assignments, and skills

---

## System Overview

```
KARMA OS v25 ULTIMATE
├── 25 AI Agents organized in 7 crews
├── 12 Footclan distributed workers
├── Hermes inter-agent messenger + notification center
├── OpenHuman human-in-the-loop approval system
├── OpenClaw D3 force-graph swarm visualization
├── 8 n8n webhook-triggered workflows
├── MCP Bridge for Model Context Protocol
├── 35+ voice commands via Auggie
├── 4 CSS themes (Cyberpunk, Stealth, Matrix, Aurora)
└── 55 JavaScript functions
```

**File:** `karma-os-ultimate.html` — single self-contained file (~2092 lines)
**Access:** Gate code `OVERRIDE` (configurable in Settings)
**State:** All settings persisted to `localStorage`
**Uptime tracking:** `_karmaStart` stored in localStorage, survives page refresh

---

## Agent Fleet (25 Agents)

### COMMAND LAYER — `crew: command` · color: `#00d4ff`
| ID | Name | Icon | Role | Skills |
|----|------|------|------|--------|
| `karma` | KARMA Commander | 🦊 | commander | strategy, orchestration, 决策 |
| `auggie` | Auggie Voice AI | 🎤 | voice | stt, tts, voice-cmd |
| `oracle` | Oracle Prediction | 👁 | prediction | prediction, analytics, trends |

### SWARM LAYER — `crew: swarm` · color: `#00ff9d`
| ID | Name | Icon | Role | Skills |
|----|------|------|------|--------|
| `openclaw` | OpenClaw Swarm | 🕸 | swarm | network, topology, connections |
| `hermes` | Hermes Messenger | 📡 | messenger | routing, notifications, broadcast |
| `nexus` | Nexus Protocol | 🔗 | integration | mcp, webhooks, api-gateway |

### SPECIALIST LAYER — `crew: specialist` · color: `#b347ff`
| ID | Name | Icon | Role | Skills |
|----|------|------|------|--------|
| `deepsearch` | DeepSearch | 🔮 | research | arxiv, web-search, papers |
| `codeagent` | CodeAgent | ⚡ | coder | pr-review, code-gen, refactor |
| `apollo` | Apollo Coder | 🛠️ | coder | react, node, python, fullstack |
| `nova` | Nova Designer | 🎨 | designer | html, css, design, figma |

### MARKETING LAYER — `crew: marketing` · color: `#ff3366`
| ID | Name | Icon | Role | Skills |
|----|------|------|------|--------|
| `ashlee` | Ash Lee AI | 💜 | content | bluesky, social, blog, copy |
| `footclan` | Footclan HQ | 👥 | workers | scraping, outreach, lead-gen |

### OPERATIONS LAYER — `crew: ops` · color: `#ff6b35`
| ID | Name | Icon | Role | Skills |
|----|------|------|------|--------|
| `marketwatch` | MarketWatch | 📈 | analytics | crypto, alerts, portfolio |
| `intelagent` | IntelAgent | 🧠 | intel | feeds, rss, news |
| `gitops` | GitOpsAgent | 🐙 | devops | github, sync, ci/cd |
| `synservice` | SyncService | 🔄 | infrastructure | sync, backup, replication |
| `uptimebot` | UptimeBot | 🔔 | monitoring | uptime, ping, alerts |
| `rssagent` | RSSAgent | 📰 | feeds | rss, aggregation, filter |
| `invoicebot` | InvoiceBot | 💰 | finance | invoicing, tracking, reports |

### HUMAN-IN-LOOP LAYER — `crew: human` · color: `#00d4ff`
| ID | Name | Icon | Role | Skills |
|----|------|------|------|--------|
| `openhuman` | OpenHuman | 👤 | approval | approvals, authorization, ethics |

### AUTOMATION LAYER — `crew: auto` · color: `#00ff9d`
| ID | Name | Icon | Role | Skills |
|----|------|------|------|--------|
| `n8norch` | n8n Orchestrator | ⚙️ | automation | n8n, workflows, triggers |
| `mcpbridge` | MCP Bridge | 🌉 | mcp | mcp-server, tools, resources |
| `zapier` | Zapier Connector | ⚡ | zapier | zapier, integrations, automation |
| `cronus` | Cronus Scheduler | ⏰ | scheduler | cron, scheduling, tasks |
| `dataflow` | DataFlow ETL | 🔄 | etl | etl, transform, pipeline |

---

## Agent Crews — CrewAI-Style Architecture

```javascript
AGENT_CREWS = {
  command:    { name: 'Command',     color: '#00d4ff', icon: '🦊', agents: ['karma','auggie','oracle'] },
  swarm:      { name: 'Swarm',       color: '#00ff9d', icon: '🕸', agents: ['openclaw','hermes','nexus'] },
  specialist: { name: 'Specialist',  color: '#b347ff', icon: '🔮', agents: ['deepsearch','codeagent','apollo','nova'] },
  marketing:  { name: 'Marketing',   color: '#ff3366', icon: '📣', agents: ['ashlee','footclan'] },
  ops:        { name: 'Operations',  color: '#ff6b35', icon: '⚙️', agents: ['marketwatch','intelagent','gitops','synservice','uptimebot','rssagent','invoicebot'] },
  human:      { name: 'Human-in-Loop', color: '#00d4ff', icon: '👤', agents: ['openhuman'] },
  auto:       { name: 'Automation',  color: '#00ff9d', icon: '⚡', agents: ['n8norch','mcpbridge','zapier','cronus','dataflow'] },
}
```

Each agent has: `id`, `n` (name), `i` (icon emoji), `bg` (card background color), `s` (status), `stag` (some agents have stag for status badge), `t` (status text), `role`, `crew`, `skills[]`

---

## Footclan Worker System

### Workers (20 total — fc01–fc20 with load-balanced assignment)

| ID | Name | Icon | Status | Task | Progress | Assigned To |
|----|------|------|--------|------|----------|-------------|
| `fc01` | FC-01 Research | 🔬 | active | Scanning arxiv for AI papers | 72% | deepsearch |
| `fc02` | FC-02 CodeReview | 🔍 | busy | Reviewing PR #47 — nova-hub | 45% | codeagent |
| `fc03` | FC-03 Content | ✍️ | idle | Awaiting task | 0% | — |
| `fc04` | FC-04 DataScrape | 📊 | active | Collecting competitor pricing | 88% | marketwatch |
| `fc05` | FC-05 ReportGen | 📝 | idle | Awaiting task | 0% | — |
| `fc06` | FC-06 Outreach | 📧 | busy | Sending cold emails batch 3/5 | 60% | footclan |
| `fc07` | FC-07 LeadQual | 🎯 | active | Qualifying Contra leads | 35% | nexus |
| `fc08` | FC-08 Monitor | 👁 | idle | Awaiting task | 0% | — |
| `fc09` | FC-09 SEOAudit | 🔍 | idle | Awaiting task | 0% | — |
| `fc10` | FC-10 Backlink | 🔗 | idle | Awaiting task | 0% | — |
| `fc11` | FC-11 CopyWrite | ✏️ | idle | Awaiting task | 0% | — |
| `fc12` | FC-12 QATest | 🧪 | idle | Awaiting task | 0% | — |
| `fc13` | FC-13 SEOOptim | 📊 | idle | Awaiting task | 0% | — |
| `fc14` | FC-14 SocialMed | 📱 | idle | Awaiting task | 0% | — |
| `fc15` | FC-15 EmailCrt | 📧 | idle | Awaiting task | 0% | — |
| `fc16` | FC-16 DataAnly | 🔢 | idle | Awaiting task | 0% | — |
| `fc17` | FC-17 LinkBldg | 🔗 | idle | Awaiting task | 0% | — |
| `fc18` | FC-18 CompetAn | 🎯 | idle | Awaiting task | 0% | — |
| `fc19` | FC-19 RankTrck | 📈 | idle | Awaiting task | 0% | — |
| `fc20` | FC-20 ConvOptim | 💰 | idle | Awaiting task | 0% | — |

### Task Lifecycle

```
createTask() → [pending] → approveTask() → [approved] → assigned to Footclan → completeTask() → [done]
                                                      → rejectTask() → [rejected]
```

### Functions
- **`createTask()`** — Creates a task from the new-task-input, assigns random priority (low/medium/high/critical) and random agent
- **`renderTaskQueue()`** — Renders pending + completed tasks in the OpenHuman panel with approve/reject buttons
- **`approveTask(id)`** — Approves a pending task, assigns it to first idle/active Footclan worker
- **`rejectTask(id)`** — Rejects a task, logs warning to feed
- **`completeTask(id)`** — Marks task done, resets Footclan worker to idle
- **`renderFootclan()`** — Re-renders the 8-worker list every 3 seconds with progress bar updates

### Round-Robin Load Balancing
`approveTask()` uses a `_fcRR` counter for circular scan across all 20 workers:
- Starts search from `_fcRR % FOOTCLAN.length`
- Skips busy workers (`s === 'busy'`)
- Wraps around to scan full circle if needed
- Advances `_fcRR` to next position after assignment
- Reports assigned worker ID in success feed message (e.g. "assigned to Footclan (fc07)")

### Simulated Progress
Every 3 seconds, active/busy workers increment progress by `Math.random() * 8`. When progress reaches 100%, worker resets to idle with "Awaiting task" and a ✅ feed entry is added.

---

## Hermes Messenger & Notification Center

### Messenger Modal (`hermes-m`)
- **To field:** Dropdown targeting specific agents: auggie, openclaw, hermes, oracle, deepsearch, codeagent, footclan, all, marketwatch
- **Thread:** Scrollable message history with agent-to-agent conversation bubbles
- **Preloaded messages** simulate inter-agent communication on startup

### Send Message Flow
```javascript
sendHermesMsg() → adds user message to thread → setTimeout → simulated agent response
```

### Notification Center (`HERMES_NOTIFS` array)
- **`addNotif(msg, type)`** — Adds notification to array (max 50), renders last 10 in notification panel
- Badge count shows notifications from last 5 minutes (300000ms)
- Types: `info`, `success`, `warn`, `error`

### Broadcast System
- **`hermesBroadcast(msg)`** — Broadcasts a message to ALL 25 agents
- Shows 📡 notification, adds to feed, simulates staggered delivery to all crew layers
- Accessible via 📡 BROADCAST button in Hermes modal footer

### Preloaded Agent Messages (on startup)
```
HERMES → ALL: "Swarm check: all agents responding within 200ms. Network healthy."
AUGGIE → HERMES: "Voice commands queue clear. Ready for input."
OPENCLAW → HERMES: "Swarm visualization updated. 18 nodes, 32 active connections."
FOOTCLAN FC-04 → HERMES: "Task complete: competitor data collected. 47 records queued for analysis."
```

---

## OpenHuman Approval Workflow

Tasks requiring human authorization before Footclan execution.

### UI Elements
- **Task List panel** (`id="task-list"`) — Shows pending (with approve/reject buttons) and last 5 completed
- **Badge counter** (`id="oh-count"`) — Shows count of pending tasks
- **New task input** (`id="new-task-input"`) — Text input + create button

### Task Object Schema
```javascript
{
  id: 't' + Date.now(),       // unique ID
  task: 'Task description',   // task text
  priority: 'high',           // low | medium | high | critical
  status: 'pending',          // pending | approved | rejected | done
  created: Date.now(),        // timestamp
  agent: 'deepsearch'         // assigned agent ID
}
```

### Priority Styling
Each task shows a single-letter badge: L (low), M (medium), H (high), C (critical) with color coding.

---

## Voice Command System (35+ Commands)

### Activation
Click the 🎤 microphone button in VOICE modal, or use Auggie button in toolbar.

### Command Dictionary

**Navigation**
| Command | Action |
|---------|--------|
| `open github` | Opens github.com/{ghUser} |
| `open claude` | Opens claude.ai |
| `open bluesky` | Opens bsky.app |
| `open contra` | Opens contra.com |
| `open n8n` | Opens n8n URL |
| `open intel` | Opens KARMA INTEL URL |

**System Controls**
| Command | Action |
|---------|--------|
| `mute` | Mutes audio, sets volume to 0 |
| `unmute` | Unmutes audio, sets volume to 0.28 |
| `boost` | Increases display brightness/contrast |
| `turbo` | Maximum display boost |
| `reset display` | Returns display to normal |
| `settings` | Opens Settings modal |

**Themes**
| Command | Action |
|---------|--------|
| `theme cyberpunk` | Cyberpunk theme |
| `theme stealth` | Stealth dark theme |
| `theme matrix` | Matrix green theme |
| `theme aurora` | Aurora gradient theme |

**Fleet Operations**
| Command | Action |
|---------|--------|
| `deploy fleet` | Triggers n8n deploy-fleet workflow |
| `sync repos` | Triggers n8n intel-sync workflow |
| `check uptime` | Triggers n8n uptime-check workflow |
| `market alert` | Triggers n8n crypto-alert workflow |
| `broadcast all` | Sends fleet-wide Hermes broadcast |
| `code review` | Triggers research-arxiv workflow |
| `sync` | Runs fleet sync |

**Agent Commands**
| Command | Action |
|---------|--------|
| `oracle predict` | Opens Impossible Desk with Oracle prompt |
| `deep search` | Opens Impossible Desk with DeepSearch prompt |
| `show army` | Opens Army Overview modal |

**Footclan Commands**
| Command | Action |
|---------|--------|
| `create task` | Opens browser prompt for task description |
| `show tasks` | Opens Army modal with task queue |
| `clear done` | Removes all completed tasks from queue |

**Hermes Commands**
| Command | Action |
|---------|--------|
| `open hermes` | Opens Hermes Messenger modal |
| `notifications` | Toggles notification panel visibility |
| `read notifications` | Toasts last 3 notifications |

**Info Commands**
| Command | Action |
|---------|--------|
| `status` | Toasts full system status |
| `what time` | Toasts current time |
| `uptime` | Toasts KARMA OS uptime in minutes |
| `agents count` | Toasts agent and Footclan counts |
| `which agents` | Toasts fleet summary |
| `version` | Toasts version string |
| `help` | Toasts command list |

**Content & Research**
| Command | Action |
|---------|--------|
| `intel deals` | Triggers deals webhook, updates ticker |
| `intel news` | Triggers news webhook, refreshes ticker |
| `intel refresh` | Refreshes all intel feeds |
| `research arxiv` | Opens Impossible Desk with arxiv search prompt |

---

## n8n Workflow Automation

### HTTP Trigger with Retry Logic
```javascript
async function triggerN8NWorkflow(id, retries = 2) {
  // 3 total attempts (attempt 0 + 2 retries), exponential backoff: 500ms * 2^attempt
  // Handles 5xx errors and timeouts with automatic retry
  // Non-5xx errors (400, 401, 404) return immediately without retry
  // Payload: { ts, source: 'karma-os', workflow: id, agent: 'karma' }
}

function testN8NConnection() {
  // Hits n8n /health endpoint, displays status in Settings header (#n8n-status)
  // Called on boot and after every saveSettings()
  // States: "n8n: Connected ✓" (green), "n8n: Server error N" (yellow), "n8n: Unreachable" (red)
}
```

### Configured Workflows (8 total)
|----|------|------|------|---------|--------------|
| `ash-lee-post` | Ash Lee Daily Post | 📰 | scheduled | 18:30 AEST | `/webhook/ash-lee-post` |
| `intel-sync` | KARMA INTEL Sync | 📡 | interval | 5min | `/webhook/intel-sync` |
| `uptime-check` | Uptime Monitor | 🔔 | interval | 1min | `/webhook/uptime` |
| `crypto-alert` | BTC Alert System | 💹 | condition | >$70k | `/webhook/crypto-alert` |
| `client-followup` | Client Follow-up | 📧 | scheduled | Daily 09:00 | `/webhook/client-followup` |
| `lead-qual` | Lead Qualification | 🤖 | trigger | Contra webhook | `/webhook/lead-qual` |
| `deploy-fleet` | Deploy Fleet | 🚀 | manual | button | `/webhook/deploy` |
| `research-arxiv` | Research Arxiv | 🔬 | manual | button | `/webhook/research` |

### Real HTTP Trigger Function
```javascript
async function triggerN8NWorkflow(id) {
  const wf = WORKFLOWS.find(w => w.id === id);
  const url = S.n8nUrl + wf.webhook;
  // POSTs JSON: { ts, source: 'karma-os', workflow: id, agent: 'karma' }
  // 5s timeout · success/error/warn feedback in army feed
}
```

---

## MCP Bridge (Model Context Protocol)

### Settings Fields
- **MCP Server URL** (`id="s-mcp-url"`) — e.g., `http://localhost:3100`
- **MCP Auth Token** (`id="s-mcp-token"`) — Optional Bearer token

### Health Check Function
```javascript
function checkMCPStatus() {
  fetch(S.mcpUrl + '/health', { signal: AbortSignal.timeout(4000) })
    .then(r => { if (r.ok) show 'MCP: Connected ✓' (green)
                 else show 'MCP: Server error {status}' (yellow) })
    .catch(() => show 'MCP: Unreachable' (red));
}
```
Called on `onBoot()` and after every `saveSettings()`.

### Capabilities
The MCP Bridge agent (`id: mcpbridge`) can route tool calls, resource requests, and prompt invocations through the MCP protocol to connect external tools: filesystem access, git operations, web search, and custom MCP servers.

---

## Settings & Configuration

### State Object (`S`)
```javascript
const S = {
  claudeKey: localStorage.getItem('ko_claude') || '',      // Anthropic API key
  openaiKey: localStorage.getItem('ko_openai') || '',      // OpenAI API key
  mcpUrl: localStorage.getItem('ko_mcp_url') || '',        // MCP server URL
  mcpToken: localStorage.getItem('ko_mcp_token') || '',    // MCP auth token
  ghUser: localStorage.getItem('ko_gh') || 'tellemthatsme', // GitHub username
  n8nUrl: localStorage.getItem('ko_n8n') || 'http://localhost:5678',
  intelUrl: localStorage.getItem('ko_intel') || 'http://localhost:7337',
  gateCode: localStorage.getItem('ko_gate') || 'OVERRIDE',
  theme: localStorage.getItem('ko_theme') || 'cyberpunk',
  muted: localStorage.getItem('ko_muted') === 'true',
  karmaHistory: [],        // KARMA chat history
  isListening: false,      // voice recognition active
  recognition: null,       // Web Speech API instance
  startTime: Date.now(),
  agents: [],
  footclan: [],
  workflows: [],
  hermesMessages: [],
};
```

### Settings Modal Fields
| Field ID | localStorage Key | Purpose |
|----------|-----------------|---------|
| `s-claude` | `ko_claude` | Anthropic Claude API key |
| `s-openai` | `ko_openai` | OpenAI API key |
| `s-mcp-url` | `ko_mcp_url` | MCP server URL |
| `s-mcp-token` | `ko_mcp_token` | MCP auth token |
| `s-github` | `ko_gh` | GitHub username |
| `s-n8n` | `ko_n8n` | n8n base URL |
| `s-intel` | `ko_intel` | KARMA INTEL URL |
| `s-gate` | `ko_gate` | Access gate code |

---

## Modals & UI Panels

### Core Modals (7)
| Modal ID | Title | Purpose |
|----------|-------|---------|
| `karma-m` | ASK KARMA — AI INTERFACE | Main chat with KARMA commander (requires claudeKey for real AI) |
| `imp-m` | IMPOSSIBLE DESK | Claude streaming interface for complex requests |
| `voice-m` | AUGGIE · VOICE AI | Voice recognition with visual audio bars |
| `army-m` | AI ARMY OVERVIEW | Full fleet visualization with crew breakdown |
| `settings-m` | KARMA OS SETTINGS | API keys, MCP, connections, themes |
| `hermes-m` | HERMES · Agent Messenger | Inter-agent messaging and broadcast |
| `openhuman-m` | OpenHuman · Approvals | Task queue with approve/reject |

### Left Panel (4 sections)
1. **AI ARMY** — Agent list with role icons, status badges, and skills
2. **COMMAND CENTER** — Quick actions: sync, deploy, check, intel
3. **n8n WORKFLOWS** — 8 workflow cards with trigger buttons
4. **FOOTCLAN WORKERS** — 8-worker list with progress bars and complete buttons

### Center Panel (5 sections)
1. **Stats row** — 309 repos · 25 agents · 12 footclan · boost button
2. **OpenClaw Swarm** — D3 force-graph with 25 nodes, physics simulation, crew color coding
3. **ARMY FEED** — Real-time activity log with timestamps and type icons
4. **QUICK LAUNCH** — 8 website shortcuts (GitHub, Claude, Bluesky, Contra, n8n, Intel, Nexus, DeepSearch)
5. **TICKER** — Scrolling crypto prices (BTC/ETH/SOL) + deals/news

### Right Panel (5 sections)
1. **SYSTEM HEALTH** — CPU (mock), Memory (mock), Network (mock), Uptime
2. **HERMES MESSENGER** — Compact message log + OPEN HERMES button
3. **OPENHUMAN APPROVALS** — Task queue with badge counter
4. **ACTIVE WORKFLOWS** — Live workflow status (6 slots)
5. **API CHART** — 24-bar animated mock API latency chart

### Footer
- Clock with date
- 5 status dots: Claude API, GitHub, n8n, INTEL, Audio
- Version info

---

## CSS Themes

4 themes stored in `localStorage` as `ko_theme`. Switch via Settings or voice commands.

### CYBERPUNK (default)
```css
--bg: #050510;         /* near-black blue */
--surface: #0a0a1a;
--border: rgba(0,212,255,.15);
--text: #c8d6e5;
--muted: #64748b;
--ac: #00d4ff;         /* cyan accent */
--ac2: #b347ff;        /* purple accent */
--ac3: #00ff9d;        /* green accent */
--warn: #ff6b35;
--err: #ff3366;
```

### STEALTH
```css
--bg: #0a0a0a; --surface: #111; --border: rgba(255,255,255,.05);
--text: #888; --ac: #444; --ac2: #333; --ac3: #555;
```

### MATRIX
```css
--bg: #0a0f0a; --surface: #0d1a0d; --border: rgba(0,255,0,.1);
--text: #00ff00; --ac: #00ff00; --ac2: #00cc00; --ac3: #00ff00;
```

### AURORA
```css
--bg: #0f0a1a; --surface: #1a0f2e; --border: rgba(179,71,255,.15);
--text: #e0d0ff; --ac: #b347ff; --ac2: #00d4ff; --ac3: #ff6b35;
```

---

## Data Model & State

### Arrays
| Variable | Type | Count | Description |
|----------|------|-------|-------------|
| `AGENTS` | `const` array | 25 | Agent definitions with metadata |
| `FOOTCLAN` | `const` array | 8 | Worker definitions with status |
| `TASK_QUEUE` | `let` array | dynamic | Pending/approved/rejected/done tasks |
| `WORKFLOWS` | `const` array | 8 | n8n workflow definitions |
| `HERMES_NOTIFS` | `const` array | max 50 | Notification log |
| `feedItems` | internal | max 50 | Army feed log |
| `chartD` | `const` array | 24 | API latency chart data points |

### Objects
| Key | Type | Description |
|-----|------|-------------|
| `S` | global state | All settings, history, runtime state |
| `AGENT_CREWS` | const | Crew grouping for delegation visualization |

---

## Functions Reference (55 functions)

### Initialization
| Function | Description |
|----------|-------------|
| `onBoot()` | Boot sequence: loads feeds, initializes swarm, starts clock/crypto ticker |

### Rendering
| Function | Description |
|----------|-------------|
| `renderAgents()` | Renders agent cards in left panel with crew color coding |
| `renderFootclan()` | Renders 8-worker list with progress bars and complete buttons |
| `renderChart()` | Renders 24-bar API latency chart |
| `renderTaskQueue()` | Renders OpenHuman pending/approved/rejected task list |

### Task Queue (OpenHuman)
| Function | Description |
|----------|-------------|
| `createTask()` | Creates task from input, adds to TASK_QUEUE |
| `approveTask(id)` | Approves + assigns to first idle Footclan worker |
| `rejectTask(id)` | Rejects task, logs warning |
| `completeTask(id)` | Marks done, resets worker to idle |

### Hermes Messenger
| Function | Description |
|----------|-------------|
| `sendHermesMsg()` | Sends message to selected agent, simulates response |
| `addNotif(msg, type)` | Adds notification to HERMES_NOTIFS array, updates UI |
| `hermesBroadcast(msg)` | Broadcasts message to all 25 agents with staggered delivery |

### n8n Automation
| Function | Description |
|----------|-------------|
| `triggerN8NWorkflow(id)` | Real HTTP POST to n8n webhook with 5s timeout |
| `triggerWorkflow(id)` | Button handler calling triggerN8NWorkflow |

### MCP Bridge
| Function | Description |
|----------|-------------|
| `checkMCPStatus()` | Fetches MCP server /health endpoint, updates status display |

### Settings
| Function | Description |
|----------|-------------|
| `saveSettings()` | Saves all form fields to S and localStorage |
| `populateSettings()` | Loads settings from S into form fields |
| `updateDots()` | Updates footer status dots based on configured API keys |

### Modals
| Function | Description |
|----------|-------------|
| `openM(id)` | Adds 'open' class to modal |
| `closeM(id)` | Removes 'open' class from modal |

### Voice AI (Auggie)
| Function | Description |
|----------|-------------|
| `toggleVoice()` | Starts/stops Web Speech API recognition |
| `processVoice(text)` | Parses transcribed text, executes voice commands |
| `reply(text)` | Shows text response in voice modal |
| `initVoice()` | Sets up SpeechRecognition with continuous mode |

### Impossible Desk
| Function | Description |
|----------|-------------|
| `fireImpossible()` | Streams Claude response to #imp-out div using SSE |
| `oraclePulse()` | Special Oracle prediction mode — makes one Claude API call with a prediction prompt, displays formatted output in #imp-out. Requires API key. Command handler: `oracle predict` or `oracle <topic>`.

### KARMA Chat
| Function | Description |
|----------|-------------|
| `sendKarma()` | Sends message to KARMA, displays response |
| `callClaude(messages, system)` | Internal — calls Anthropic Messages API with key. Falls back to inline error message if no key set. Uses last 12 messages from `karmaHistory`. |

**sendKarma() behavior:**
1. User types message → pushed to `S.karmaHistory`
2. Typing indicator shown while awaiting response
3. **Without API key:** Shows inline message `[Add Claude API key in Settings ⚙ to activate KARMA and the full AI Army]` — no error thrown, no external call made
4. **With API key:** POSTs to `https://api.anthropic.com/v1/messages` with `messages` (last 12), `system` prompt, `max_tokens: 1024`. Response displayed as chat bubble. Full error messages shown on failure.
5. `karmaHistory` persists for session duration (localStorage not used for history)

### Themes & Display
| Function | Description |
|----------|-------------|
| `setTheme(name)` | Applies CSS custom properties, saves to localStorage |
| `setVol(v)` | Sets audio volume (0.28 default) |
| `toggleMute()` | Toggles muted state |

### Clock & Data
| Function | Description |
|----------|-------------|
| `clockStart()` | Updates clock every second |
| `fetchCrypto()` | Fetches BTC/ETH/SOL prices from CoinGecko API |
| `renderChart()` | Re-renders API latency chart |

### OpenClaw Swarm
| Function | Description |
|----------|-------------|
| `initSwarm()` | Initializes canvas-based force simulation with 25 agent nodes (hub-and-spoke + peer connections). Agent nodes sized by role: commander=10px, others=6px. Colored by identity: KARMA=#00d4ff, Footclan=#ff6b35, Hermes=#b347ff, others=#00ff9d. Links: all 24 agents connected to KARMA (hub), plus peer connections between Swarm/Specialist layer agents. Physics: velocity damping 0.4, gravity toward center, spring connections between linked agents. Runs via `setTimeout(initSwarm, 500)` on boot, also re-initialized after theme changes with `setTimeout(() => { try { initSwarm(); } catch {} }, 200)`.

### Misc
| Function | Description |
|----------|-------------|
| `toast(msg, dur)` | Shows toast notification (2.4s default) |
| `addFeed(event)` | Adds entry to army feed with type icon |
| `pad(n)` | Pads number to 2 digits for clock |

---

## Version History

- **v18** — Original karma-os-v6 with 12 agents, OpenClaw swarm, Hermes messenger
- **v25 ULTIMATE** — Major expansion to 25 agents, 12 Footclan workers, 35+ voice commands, MCP bridge, n8n webhook triggers, task queue, notification center, localStorage persistence, 4 themes, CrewAI-style crew architecture

---

*Document generated from `karma-os-ultimate.html` source analysis · 2092 lines · 55 functions · 7 agent crews · 8 workflows*