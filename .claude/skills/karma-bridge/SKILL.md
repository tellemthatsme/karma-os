---
name: karma-bridge
description: AI Browser Bridge — architecture, commands, extension flow, and troubleshooting for localhost:9876.
---

# AI Browser Bridge

## Architecture

```
AI Client (Claude/ChatGPT)
  │
  ├── POST /command/send ──→ Bridge Server (:9876) ──→ Command Queue
  │                                                       │
  │                              Extension polls ←────────┘
  │                                 │
  │                          GET /command/poll (every 3s)
  │                                 │
  │                          Extension executes in real browser
  │                                 │
  │                          POST /command/result ──→ Bridge
  │                                                       │
  └── GET /result/{job_id} ←──────────────────────────────┘
```

## Bridge Server

- **Location**: `browser_extension/bridge_server.py`
- **Port**: `127.0.0.1:9876`
- **Auth**: `BRIDGE_TOKEN` env var (optional, `changeme` default)
- **No external deps**: Python stdlib only

## Bridge API

### GET /status
```json
{"status":"running","queue_length":0,"results_available":0,"auth":"open"}
```

### POST /command/send
```json
{
  "action": "navigate",
  "params": {"url": "https://studio.youtube.com"}
}
```
Returns: `{"job_id":"abc123","status":"queued"}`

### GET /command/poll
Extension polls every 3s. Returns next command or 204 (empty).

### POST /command/result
Extension reports result: `{"job_id":"abc123","result":{"success":true}}`

### GET /result/{job_id}
AI polls for result. 404 = not ready/consumed.

## Supported Actions

| Action | Params | Wait | Use Case |
|--------|--------|------|----------|
| `navigate` | `{url}` | 3s | Open any URL |
| `click` | `{text}` or `{selector}` | 2s | Click button/link |
| `type` | `{selector, text}` | 2s | Fill form field |
| `extract` | `{selector}` | 1s | Get page content |
| `screenshot` | — | 2s | Capture page |
| `evaluate` | `{code}` | 3s | Run JavaScript |
| `upload_video` | `{track, channel}` | 120s | YouTube Studio flow |

## upload_video Flow (16 Steps)

```
1. navigate → studio.youtube.com
2. wait 5s for load
3. click "CREATE" (top right)
4. click "Upload videos"
5. File dialog → CDP sets file input
6. wait for upload progress (30-120s)
7. type Title
8. type Description
9. type Tags
10. click "Show more"
11. Set "Made for Kids" = No
12. click "Next" × 3
13. click "Public"
14. click "Publish"
```

## Browser Extensions

| Browser | Manifest | Location |
|---------|----------|----------|
| Chrome | MV3 | `browser_extension/chrome/` |
| Firefox | MV2 | `browser_extension/firefox/` |

**Extension popup**: one-button START/STOP for bridge connection.
**Background service worker**: polls GET /command/poll every 3 seconds.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Bridge offline | `python browser_extension/bridge_server.py` running? |
| Extension not polling | Popup shows "Connected"? START clicked? |
| Command timeout | YouTube uploads need 120s timeout |
| 403 Forbidden | Check `BRIDGE_TOKEN` matches |
| File upload fails | Video file exists at the path? |

## Testing

```bash
# Test bridge
python scripts/SOCIAL_POSTER.py --test
python scripts/youtube_researcher.py --test

# Manual test
curl http://127.0.0.1:9876/status
```
