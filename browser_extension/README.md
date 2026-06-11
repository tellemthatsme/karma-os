# 🤖 AI Browser Bridge

**Any AI model can control your real browser.**

A local bridge server + browser extension that lets any AI tool (ChatGPT, Claude, Cursor, etc.) control your browser with all your real logins.

## How It Works

```
AI Model → bridge_server.py (:9876) → Browser Extension → Your Browser (logged in)
```

1. AI sends a command (e.g., "upload this video") to the bridge server
2. Your extension polls the bridge, picks up the command
3. The extension executes it in your real browser — with YouTube, Facebook, Instagram logins intact

---

## 🚀 Setup — 3 Steps

### Step 1: Start the Bridge

**Easy way:** Double-click `start.bat`

**Or from terminal:**
```bash
python bridge_server.py
```

You'll see:
```
╔══════════════════════════════════════════╗
║        AI Browser Bridge Server          ║
║  Any AI → http://127.0.0.1:9876 → Browser║
╚══════════════════════════════════════════╝
```

### Step 2: Install the Extension

#### Chrome
1. Open `chrome://extensions/` in Chrome
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Select the `browser_extension/chrome/` folder

#### Firefox
1. Open `about:debugging#/runtime/this-firefox` in Firefox
2. Click **Load Temporary Add-on**
3. Select `browser_extension/firefox/manifest.json`

### Step 3: Click START

1. Click the 🤖 extension icon in your toolbar
2. Click the green **▶ START BRIDGE** button
3. The green dot turns on — you're connected

![Extension Popup](https://via.placeholder.com/320x240/1a1a2e/4ade80?text=Click+START+BRIDGE)

---

## 🎮 How to Use

### Open the Extension Popup

Click the 🤖 icon → you'll see:

| Element | What It Does |
|---------|-------------|
| 🟢 Green Dot | Bridge is connected |
| 🔴 Red Dot | Bridge is offline |
| **▶ START BRIDGE** | Connect to the bridge |
| **⏹ STOP BRIDGE** | Disconnect |
| **🧪 Open YouTube** | Opens YouTube Studio in a new tab |
| **🎬 Upload Day 1** | Test: sends a navigate command |

### Send Commands from Any AI

```bash
# Navigate to a page
curl -X POST http://127.0.0.1:9876/command/send \
  -H 'Content-Type: application/json' \
  -d '{"action":"navigate","params":{"url":"https://studio.youtube.com"}}'

# Click a button
curl -X POST http://127.0.0.1:9876/command/send \
  -H 'Content-Type: application/json' \
  -d '{"action":"click","params":{"text":"CREATE"}}'

# Type text
curl -X POST http://127.0.0.1:9876/command/send \
  -H 'Content-Type: application/json' \
  -d '{"action":"type","params":{"selector":"#title-input","text":"My Video Title"}}'

# Extract page content
curl -X POST http://127.0.0.1:9876/command/send \
  -H 'Content-Type: application/json' \
  -d '{"action":"extract","params":{}}'

# Take a screenshot
curl -X POST http://127.0.0.1:9876/command/send \
  -H 'Content-Type: application/json' \
  -d '{"action":"screenshot","params":{}}'
```

### Using the Python Uploader

```bash
# Test connection first
python youtube_uploader.py --test

# Upload a specific track
python youtube_uploader.py --track 1

# Upload all 16 tracks (one per minute)
python youtube_uploader.py --all
```

---

## 📋 Available Actions

| Action | Params | Description |
|--------|--------|-------------|
| `navigate` | `{ url: "..." }` | Go to a URL |
| `click` | `{ selector: "..." }` or `{ text: "..." }` | Click an element |
| `type` | `{ selector: "...", text: "..." }` | Type into a field |
| `extract` | `{ selector: "..." }` (optional) | Get page content |
| `screenshot` | `{}` | Capture visible tab |
| `evaluate` | `{ code: "..." }` | Run JavaScript in page |
| `upload_video` | `{ title, desc, tags, file_path }` | Upload to YouTube |

---

## 📁 Project Structure

```
browser_extension/
├── bridge_server.py          # 🔥 Start this — local API on :9876
├── start.bat                 # One-click launcher (Windows)
├── youtube_uploader.py       # AI client — upload videos
├── README.md                 # This file
├── chrome/
│   ├── manifest.json         # Chrome extension manifest
│   ├── background.js         # Polls bridge, executes commands
│   ├── popup.html            # Dead-simple popup UI
│   └── popup.js              # Popup logic
└── firefox/
    ├── manifest.json         # Firefox extension manifest
    ├── background.js         # Firefox background script
    ├── popup.html            # Firefox popup UI
    └── popup.js              # Firefox popup logic
```

---

## 🔒 Security

- The bridge only listens on `127.0.0.1` (localhost) — no external access
- No authentication tokens, no cloud, no data leaves your machine
- The extension only connects to `localhost:9876`
- Close the terminal window to stop the bridge

---

## 🎯 Daily Workflow

1. **Double-click** `start.bat`
2. **Click** the 🤖 extension icon → **START BRIDGE**
3. **Open** `DAILY_POSTING_BOARD.html` to see what to post
4. **Tell your AI:** "Upload track 1 to YouTube"

The AI sends commands → bridge queues them → extension executes in your real browser.
