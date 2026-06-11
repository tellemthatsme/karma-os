# n8n Setup Guide — KARMA OS v25 ULTIMATE

> Configure your n8n instance to receive webhook triggers from KARMA OS

## Quick Setup (5 minutes)

### 1. Start n8n
```bash
docker run -d --name n8n -p 5678:5678 n8nio/n8n
# Or on localhost:5678 if already running
```

### 2. Create a Workflow

In your n8n instance (http://localhost:5678):

1. Click **+ Create Workflow**
2. Add an **HTTP Request** node as the trigger
3. Set **HTTP Method** → `POST`
4. Set **URL** → `http://YOUR_HOST/webhook/karma-os-test`
5. Set **Response Mode** → "Response Data"
6. Add actions (send email, Slack message, etc.)
7. **Activate** the workflow

### 3. Configure KARMA OS Settings

Open KARMA OS → Settings (🔑):
- **n8n URL:** `http://localhost:5678` (or your n8n server URL)
- n8n will automatically append webhook paths from the WORKFLOWS array

### 4. Test the Connection

Click any workflow button in the ARMY panel (e.g., "DEPLOY FLEET"). If n8n is running and the webhook is active, you'll see a green ✅ feed entry. If offline, you'll see "⚙️ queued (server offline or timeout)".

## Webhook Paths Configured in KARMA OS

| Workflow | Webhook Path | Purpose |
|----------|-------------|---------|
| Ash Lee Daily Post | `/webhook/ash-lee-post` | Scheduled social posting |
| Intel Sync | `/webhook/intel-sync` | 5-minute data refresh |
| Uptime Monitor | `/webhook/uptime` | 1-minute health check |
| BTC Alert System | `/webhook/crypto-alert` | Price threshold alert |
| Client Follow-up | `/webhook/client-followup` | Daily client email |
| Lead Qualification | `/webhook/lead-qual` | Contra webhook inbound |
| Deploy Fleet | `/webhook/deploy` | Manual fleet deployment |
| Research Arxiv | `/webhook/research` | Manual research trigger |

## Payload Format

Every webhook receives:
```json
{
  "ts": 1716000000000,
  "source": "karma-os",
  "workflow": "deploy-fleet",
  "agent": "karma"
}
```

- `ts` — Unix timestamp (ms)
- `source` — Always `"karma-os"`
- `workflow` — Workflow ID from WORKFLOWS array
- `agent` — Agent ID that triggered (always `"karma"` for button triggers)

## n8n Workflow Examples

### Example 1: Simple notification
```
HTTP POST (trigger) → Slack Message → Stop
```

### Example 2: Conditional routing
```
HTTP POST → IF (workflow == "crypto-alert") → Send Email
                                       → ELSE → Write to Google Sheet
```

### Example 3: Multi-step automation
```
HTTP POST → Code (transform) → HTTP Request (forward to API) → Telegram Bot
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Server offline" message | Check n8n URL in Settings, ensure container is running |
| Webhook not firing | Verify workflow is **Activated** in n8n |
| CORS errors | n8n handles CORS for webhook POSTs automatically |
| Timeout | Increase n8n workflow timeout or reduce processing time |

## Production Checklist

- [ ] n8n behind HTTPS reverse proxy (nginx/cloudflare)
- [ ] Webhooks use Bearer token auth in n8n HTTP Request node
- [ ] Error workflows for failed webhooks
- [ ] Monitoring on n8n queue depth