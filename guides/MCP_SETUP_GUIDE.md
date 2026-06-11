# MCP Server Setup Guide — AI Browser Bridge

## Quick Setup for Claude Desktop

### Step 1: Start the Bridge Server
```
cd browser_extension
python bridge_server.py
```
Or double-click `start.bat`

### Step 2: Configure Claude Desktop

Open your Claude Desktop config file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this to the `mcpServers` section:

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

If you already have other MCP servers, add `browser-bridge` alongside them:

```json
{
  "mcpServers": {
    "browser-bridge": {
      "command": "python",
      "args": ["C:\\Users\\karma\\browser_extension\\mcp_server.py"]
    },
    "other-server": {
      "command": "...",
      "args": ["..."]
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop. The browser bridge tools should now appear.

### Step 4: Test It

Ask Claude:
```
Can you check if my browser bridge is running?
```

Claude should use the `browser_status` tool and tell you if the bridge is online.

---

## Setup for Cursor / Windsurf

Add to your MCP config (usually `.cursor/mcp.json` or project settings):

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

---

## Setup for Any MCP-Compatible Client

The MCP server communicates over **stdio** (stdin/stdout). Any client that supports MCP can connect by spawning the process:

```
python C:\Users\karma\browser_extension\mcp_server.py
```

The server will:
1. Wait for JSON-RPC messages on stdin
2. Respond with tool definitions and results on stdout
3. Route tool calls to the bridge server at localhost:9876

---

## Available Tools (16 total)

| Tool | Description |
|------|-------------|
| `browser_navigate` | Go to a URL |
| `browser_click` | Click by selector or text |
| `browser_type` | Type into an input field |
| `browser_extract` | Get page text or element content |
| `browser_screenshot` | Capture a screenshot |
| `browser_evaluate` | Run JavaScript in the page |
| `browser_scroll` | Scroll up/down/to element |
| `browser_hover` | Hover over an element |
| `browser_tab_list` | List all open tabs |
| `browser_tab_switch` | Switch to a tab |
| `browser_tab_close` | Close a tab |
| `browser_select` | Select dropdown option |
| `browser_keypress` | Press a key or key combo |
| `upload_video` | Upload to YouTube Studio |
| `add_pinned_comment` | Add pinned comment to YouTube |
| `browser_status` | Check bridge connection |

---

## Usage Examples

Once configured, you can ask your AI to:

```
Navigate to YouTube Studio and check my dashboard
```
```
Open example.com and extract all the links on the page
```
```
Upload track 5 to my YouTube channel
```
```
Take a screenshot of whatever's on my screen right now
```
```
Open Facebook and post to my group
```
```
Scroll down to the bottom of this page
```

---

## Troubleshooting

### "No tools showing up in Claude Desktop"
1. Check the config file path is correct
2. Make sure Python is in your PATH
3. Restart Claude Desktop after editing the config
4. Check Claude Desktop logs for errors

### "Tools exist but fail to execute"
1. Make sure `bridge_server.py` is running
2. Make sure the Chrome/Firefox extension is installed and connected
3. Check the bridge status: `http://127.0.0.1:9876/status`

### "Connection refused"
1. Start the bridge: `python bridge_server.py`
2. Or: double-click `start.bat`
3. Wait 3 seconds, then try again

### "Permission denied on macOS/Linux"
```
chmod +x mcp_server.py
```

---

## Architecture

```
AI Model (Claude/GPT/Gemini)
    |
    | (MCP JSON-RPC over stdio)
    v
mcp_server.py (:stdio)
    |
    | (HTTP POST to bridge)
    v
bridge_server.py (:9876)
    |
    | (Extension polls every 3s)
    v
Chrome/Firefox Extension
    |
    | (CDP / DOM manipulation)
    v
Your Real Browser
```

The MCP server is a translation layer:
- Receives tool calls from the AI via MCP protocol
- Forwards them to the bridge server via HTTP
- The browser extension picks them up and executes them
- Results flow back: Extension → Bridge → MCP → AI
