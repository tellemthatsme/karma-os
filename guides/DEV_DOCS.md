# DEV_DOCS.md — Developer Documentation

## TellLemThatsMe Music Monetization System

---

## 1. Architecture Overview

```
+==============================================================================+
|                           USER (You) / AI Model                              |
+==============================================================================+
       |                             |                            |
       v                             v                            v
+===============+      +=====================+      +=========================+
|  AI Browser   |      |  DAILY_POSTING_BOARD |     |  TELLLEMTHATSME_SOCIAL  |
|  Bridge       |      |  .html               |     |  _MEDIA_DASHBOARD.html  |
|  (Extension)  |      |  (Copy-paste upload) |     |  (Full campaign mgmt)   |
+===============+      +======================+     +=========================+
       |
       v (polls :9876)
+======================+
| bridge_server.py     |
| localhost:9876       |
+======================+
       ^
       | (POST commands)
+======================+
| AI Models            |
| (Claude, ChatGPT,    |
|  OpenRouter, etc.)   |
+======================+
```

## 2. File Map

### Root Project Files

| File | Lines | Purpose |
|------|-------|---------|
| `DAILY_POSTING_BOARD.html` | 390 | Day-by-day upload content board, copy-paste, checklists, progress |
| `TELLLEMTHATSME_SOCIAL_MEDIA_DASHBOARD.html` | 2,657 | Full 16-track dashboard, Shorts plan, SEO, Facebook groups |
| `REVENUE_DASHBOARD.html` | 194 | YPP progress, streaming revenue, agency pricing, action items |
| `TELLLEMTHATSME_THUMBNAIL_GENERATOR.html` | 262 | Thumbnail generation tool for all tracks |
| `UPLOAD_PLAN.md` | 40 | 16-track upload schedule and descriptions |
| `ARCHITECTURE.md` | 528 | Original system architecture reference |
| `MASTER_DOCUMENTATION.md` | 820 | Master documentation reference |
| `PRD.md` | 45 | Product Requirements Document |
| `DEV_DOCS.md` | This | Developer documentation |
| `VALUATION_AUDIT.md` | 143 | Revenue valuation and projections |
| `PROMPT.md` | 231 | AI command/prompt guide |
| `USER_GUIDE.md` | 241 | End-user operations manual |
| `COMPLETE_OPTIONS.md` | 385 | Feature/strategy options reference |
| `PROJECTS.md` | 220 | Project organization reference |

### Browser Extension (`browser_extension/`)

| File | Lines | Purpose |
|------|-------|---------|
| `bridge_server.py` | 214 | Local HTTP server on `127.0.0.1:9876` |
| `youtube_uploader.py` | 204 | Python CLI client with all 16 tracks |
| `start.bat` | 35 | One-click Windows launcher |
| `README.md` | 174 | Setup guide |
| `chrome/manifest.json` | 38 | Chrome MV3 manifest |
| `chrome/background.js` | 394 | Service worker — polls bridge, executes browser commands |
| `chrome/popup.html` | 46 | Popup UI — dead-simple bridge control |
| `chrome/popup.js` | 185 | Popup logic — status checking, commands |
| `firefox/manifest.json` | 33 | Firefox MV2 manifest |
| `firefox/background.js` | 188 | Firefox background script |
| `firefox/popup.html` | 44 | Firefox popup UI |
| `firefox/popup.js` | 108 | Firefox popup logic |

### Social Media Kit (`SOCIAL_MEDIA_KIT/`)

Contains automation scripts, content factory, and utility tools for social media posting automation.

## 3. Data Flow

### Manual Upload Flow
```
DAILY_POSTING_BOARD.html
  -> Copy Day X Title/Description/Tags
  -> Paste into YouTube Studio
  -> Check off channel
  -> Mark Day Complete
```

### AI-Assisted Upload Flow
```
AI Model (Claude/ChatGPT)
  -> POST /command/send {"action":"upload_video","params":{"track":1}}
  -> bridge_server.py queues job
  -> Chrome extension polls GET /command/poll
  -> Extension executes in real browser (YouTube Studio logged in)
  -> Extension POSTs result back to /command/result
  -> AI polls GET /result/{job_id}
```

### Social Media Post Flow
```
TELLLEMTHATSME_SOCIAL_MEDIA_DASHBOARD.html
  -> Select track
  -> Generate Shorts script
  -> Post to Facebook groups
  -> Track engagement
```

### Revenue Tracking Flow
```
YouTube Studio
  -> REVENUE_DASHBOARD.html
  -> Update YPP progress, RPM, views
  -> Calculate streaming revenue projections
```

## 4. Key Systems

### 4.1 Bridge Server (`bridge_server.py`)
- **Purpose**: Local HTTP API that bridges AI models to the browser
- **Endpoints**:
  - `GET /status` — Server health, queue depth
  - `POST /command/send` — Enqueue a browser action
  - `GET /command/poll` — Extension retrieves next command
  - `POST /command/result` — Extension posts execution result
  - `GET /result/<job_id>` — AI retrieves result
- **Threading**: Thread-safe command queue and results store with locks
- **Cleanup**: 5-minute TTL on stale results

### 4.2 Chrome Extension
- **Type**: Manifest V3 service worker
- **Bridge polling**: `setInterval` at 3-second intervals + alarm fallback for service worker wake
- **YouTube upload**: Full multi-step workflow via CDP (Chrome DevTools Protocol)
- **Command types**: `navigate`, `click`, `type`, `extract`, `screenshot`, `evaluate`, `upload_video`

### 4.3 Firefox Extension
- **Type**: Manifest V2 background page
- **Same API surface** as Chrome but without CDP upload support

### 4.4 Posting Board (`DAILY_POSTING_BOARD.html`)
- **State**: localStorage-based day tracking
- **Content**: Pre-written titles, descriptions, tags, pinned comments for all 16 tracks
- **Channels**: Two channels tracked simultaneously

## 5. Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Bridge won't start | Python not on PATH | Install Python 3.10+, check `python --version` |
| Bridge crashes on start | UnicodeEncodeError (Windows) | Fixed in v2 — uses ASCII-only output |
| Extension shows red dot | Bridge not running | Double-click `start.bat` |
| Polling stops | MV3 service worker terminated | Alarm fallback polls every 30s; click popup to wake |
| Upload fails | YouTube Studio UI changed | Update selectors in `background.js` |
| Manifest won't load | Wrong permissions | Check `manifest.json` syntax with `python -m json.tool` |

## 6. Security Notes

- Bridge server binds to `127.0.0.1` only — no external network access
- No authentication (localhost-only, no sensitive data transmitted)
- `debugger` permission required for file upload via CDP
- Extension permissions limited to YouTube, Facebook, Instagram domains
