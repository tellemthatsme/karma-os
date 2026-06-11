#!/usr/bin/env python3
"""
AI Browser Bridge — MCP Server
==============================
Exposes the browser bridge as an MCP (Model Context Protocol) server.
Any AI model that supports MCP can discover and use these tools.

Usage:
    python mcp_server.py                    # Run as stdio MCP server
    python mcp_server.py --test             # Test all tools work

Install in Claude Desktop (claude_desktop_config.json):
    "mcpServers": {
        "browser-bridge": {
            "command": "python",
            "args": ["C:\\Users\\karma\\browser_extension\\mcp_server.py"]
        }
    }
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

BRIDGE_URL = "http://127.0.0.1:9876"
# Optional bearer token — set MCP_BRIDGE_TOKEN env var to match BRIDGE_TOKEN on the bridge.
BRIDGE_TOKEN = os.environ.get("MCP_BRIDGE_TOKEN", "").strip()

# --- Per-tool rate limiting (token bucket per caller) ---
# Format: (capacity, refill_per_second). Set RATE_LIMITS_DISABLE=1 to skip.
RATE_LIMITS = {
    "browser_navigate": (30, 0.5),     # 30 burst, 1 per 2s sustained
    "browser_click": (60, 2.0),
    "browser_type": (60, 2.0),
    "browser_extract": (30, 1.0),
    "browser_screenshot": (20, 0.5),   # screenshots are heavy
    "browser_evaluate": (30, 1.0),
    "browser_scroll": (60, 3.0),
    "browser_hover": (40, 2.0),
    "browser_tab_list": (20, 1.0),
    "browser_tab_switch": (30, 1.0),
    "browser_tab_close": (20, 0.5),
    "browser_select": (30, 1.0),
    "browser_keypress": (40, 2.0),
    "upload_video": (5, 1 / 3600),      # 5 per hour
    "add_pinned_comment": (20, 1 / 30), # 20 per 30s
    "browser_status": (120, 4.0),       # status is cheap
}
_buckets = {}  # tool -> list of (ts, count) timestamps
_rate_disabled = os.environ.get("RATE_LIMITS_DISABLE", "").strip() == "1"


def _rate_check(tool):
    """Return (allowed: bool, retry_after_seconds: float)."""
    if _rate_disabled or tool not in RATE_LIMITS:
        return True, 0.0
    cap, refill = RATE_LIMITS[tool]
    now = time.time()
    bucket = _buckets.setdefault(tool, [])
    # Refill
    if bucket:
        last = bucket[-1]
        # Compute current token count (capped at cap)
        elapsed = now - last["t"]
        tokens = min(cap, last["tokens"] + elapsed * refill)
    else:
        tokens = cap
    if tokens >= 1:
        bucket.append({"t": now, "tokens": tokens - 1})
        # Trim old entries to keep list small
        if len(bucket) > 50:
            del bucket[:-50]
        return True, 0.0
    # Not enough tokens — compute retry-after
    deficit = 1 - tokens
    retry = deficit / refill if refill > 0 else 60
    return False, round(retry, 2)

# --- MCP Protocol ---

MCP_TOOLS = [
    {
        "name": "browser_navigate",
        "description": "Navigate the browser to a URL. Returns success/failure.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The URL to navigate to (e.g., https://studio.youtube.com)"
                }
            },
            "required": ["url"]
        }
    },
    {
        "name": "browser_click",
        "description": "Click an element on the page by CSS selector or visible text.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "selector": {
                    "type": "string",
                    "description": "CSS selector (e.g., '#submit', '.btn-primary')"
                },
                "text": {
                    "type": "string",
                    "description": "Visible text to click (e.g., 'Submit', 'Upload')"
                }
            }
        }
    },
    {
        "name": "browser_type",
        "description": "Type text into an input field or text area.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "selector": {
                    "type": "string",
                    "description": "CSS selector for the input element"
                },
                "text": {
                    "type": "string",
                    "description": "Text to type into the field"
                }
            },
            "required": ["selector", "text"]
        }
    },
    {
        "name": "browser_extract",
        "description": "Extract text content from the page or a specific element. Returns the page title, URL, and body text (first 5000 chars) if no selector given.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "selector": {
                    "type": "string",
                    "description": "CSS selector to extract from (omit for full page)"
                }
            }
        }
    },
    {
        "name": "browser_screenshot",
        "description": "Capture a screenshot of the current browser tab. Returns a base64 PNG data URL.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "browser_evaluate",
        "description": "Execute JavaScript code in the current tab and return the result. Use for complex interactions, reading page state, or custom logic.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "JavaScript code to execute (must return a value)"
                }
            },
            "required": ["code"]
        }
    },
    {
        "name": "browser_scroll",
        "description": "Scroll the page up or down by a number of pixels or to a specific element.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "direction": {
                    "type": "string",
                    "enum": ["up", "down", "top", "bottom"],
                    "description": "Direction to scroll"
                },
                "pixels": {
                    "type": "number",
                    "description": "Number of pixels to scroll (default 500)"
                },
                "selector": {
                    "type": "string",
                    "description": "Scroll to this CSS selector instead"
                }
            }
        }
    },
    {
        "name": "browser_hover",
        "description": "Hover over an element to trigger dropdown menus, tooltips, etc.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "selector": {
                    "type": "string",
                    "description": "CSS selector to hover over"
                },
                "text": {
                    "type": "string",
                    "description": "Visible text to hover over"
                }
            }
        }
    },
    {
        "name": "browser_tab_list",
        "description": "List all open browser tabs with their titles and URLs.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "browser_tab_switch",
        "description": "Switch to a specific tab by index or URL pattern.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "index": {
                    "type": "number",
                    "description": "Tab index (0-based)"
                },
                "url_contains": {
                    "type": "string",
                    "description": "Switch to first tab whose URL contains this string"
                }
            }
        }
    },
    {
        "name": "browser_tab_close",
        "description": "Close a specific tab or the current tab.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "index": {
                    "type": "number",
                    "description": "Tab index to close (omit for current tab)"
                }
            }
        }
    },
    {
        "name": "browser_select",
        "description": "Select an option from a dropdown/select element.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "selector": {
                    "type": "string",
                    "description": "CSS selector for the select element"
                },
                "value": {
                    "type": "string",
                    "description": "Value to select"
                },
                "label": {
                    "type": "string",
                    "description": "Label text to select (alternative to value)"
                }
            },
            "required": ["selector"]
        }
    },
    {
        "name": "browser_keypress",
        "description": "Press a keyboard key or key combination.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "key": {
                    "type": "string",
                    "description": "Key to press (e.g., 'Enter', 'Escape', 'Tab', 'Ctrl+A')"
                },
                "selector": {
                    "type": "string",
                    "description": "Focus this element first (optional)"
                }
            },
            "required": ["key"]
        }
    },
    {
        "name": "upload_video",
        "description": "Upload a video to YouTube Studio with full metadata (title, description, tags). Navigates to Studio, clicks CREATE, sets file, fills metadata, and publishes.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Video title"},
                "description": {"type": "string", "description": "Video description"},
                "tags": {"type": "string", "description": "Comma-separated tags"},
                "file_path": {"type": "string", "description": "Full path to the video file"},
                "channel": {"type": "string", "description": "Channel to upload to (main/second)"}
            },
            "required": ["title", "description", "file_path"]
        }
    },
    {
        "name": "add_pinned_comment",
        "description": "Add a pinned comment to a YouTube video.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "video_id": {"type": "string", "description": "YouTube video ID"},
                "text": {"type": "string", "description": "Comment text to post and pin"}
            },
            "required": ["video_id", "text"]
        }
    },
    {
        "name": "browser_status",
        "description": "Check if the browser bridge is running and get queue status.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    }
]


def send_command(action, params=None, timeout=60):
    """Send a command to the bridge server and wait for result."""
    if params is None:
        params = {}

    # Build headers — include bearer token if configured
    headers = {"Content-Type": "application/json"}
    if BRIDGE_TOKEN:
        headers["Authorization"] = "Bearer " + BRIDGE_TOKEN

    # Send command
    data = json.dumps({"action": action, "params": params}).encode()
    req = urllib.request.Request(
        f"{BRIDGE_URL}/command/send",
        data=data,
        headers=headers,
        method="POST"
    )
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        result = json.loads(resp.read())
    except Exception as e:
        return {"success": False, "error": f"Bridge offline: {e}"}

    job_id = result.get("job_id")
    if not job_id:
        return {"success": False, "error": "No job_id returned"}

    # Poll for result
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(
                f"{BRIDGE_URL}/result/{job_id}", timeout=5)
            return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                time.sleep(1)
                continue
            return {"success": False, "error": f"HTTP {e.code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    return {"success": False, "error": "Timeout waiting for result"}


def handle_tool(name, args):
    """Route a tool call to the bridge."""
    # Rate limit gate (cheap check before any network call)
    allowed, retry_after = _rate_check(name)
    if not allowed:
        return {
            "success": False,
            "error": "rate_limited",
            "retry_after_seconds": retry_after,
            "message": f"Tool {name} rate limit exceeded — retry in {retry_after}s",
        }
    if name == "browser_status":
        try:
            req = urllib.request.Request(f"{BRIDGE_URL}/status")
            if BRIDGE_TOKEN:
                req.add_header("Authorization", "Bearer " + BRIDGE_TOKEN)
            resp = urllib.request.urlopen(req, timeout=3)
            return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 401:
                return {"success": False, "error": "Bridge rejected token (401). Set MCP_BRIDGE_TOKEN env var."}
            return {"success": False, "error": f"HTTP {e.code}"}
        except Exception as e:
            return {"success": False, "error": f"Bridge offline: {e}"}

    if name == "browser_navigate":
        return send_command("navigate", {"url": args.get("url", "")})

    if name == "browser_click":
        if not args.get("selector") and not args.get("text"):
            return {"success": False, "error": "Need at least one of selector or text"}
        params = {}
        if args.get("selector"):
            params["selector"] = args["selector"]
        if args.get("text"):
            params["text"] = args["text"]
        return send_command("click", params)

    if name == "browser_type":
        return send_command("type", {
            "selector": args.get("selector", ""),
            "text": args.get("text", "")
        })

    if name == "browser_extract":
        params = {}
        if args.get("selector"):
            params["selector"] = args["selector"]
        return send_command("extract", params)

    if name == "browser_screenshot":
        return send_command("screenshot", {})

    if name == "browser_evaluate":
        return send_command("evaluate", {"code": args.get("code", "")})

    if name == "browser_scroll":
        return send_command("scroll", {
            "direction": args.get("direction", "down"),
            "pixels": args.get("pixels", 500),
            "selector": args.get("selector")
        })

    if name == "browser_hover":
        params = {}
        if args.get("selector"):
            params["selector"] = args["selector"]
        if args.get("text"):
            params["text"] = args["text"]
        return send_command("hover", params)

    if name == "browser_tab_list":
        return send_command("tab_list", {})

    if name == "browser_tab_switch":
        params = {}
        if args.get("index") is not None:
            params["index"] = args["index"]
        if args.get("url_contains"):
            params["url_contains"] = args["url_contains"]
        return send_command("tab_switch", params)

    if name == "browser_tab_close":
        return send_command("tab_close", {"index": args.get("index")})

    if name == "browser_select":
        return send_command("select", {
            "selector": args.get("selector", ""),
            "value": args.get("value"),
            "label": args.get("label")
        })

    if name == "browser_keypress":
        return send_command("keypress", {
            "key": args.get("key", ""),
            "selector": args.get("selector")
        })

    if name == "upload_video":
        return send_command("upload_video", {
            "title": args.get("title", ""),
            "description": args.get("description", ""),
            "tags": args.get("tags", ""),
            "file_path": args.get("file_path", ""),
            "channel": args.get("channel", "main")
        }, timeout=120)  # Uploads take 30-45s in extension

    if name == "add_pinned_comment":
        return send_command("pinned_comment", {
            "video_id": args.get("video_id", ""),
            "text": args.get("text", "")
        })

    return {"success": False, "error": f"Unknown tool: {name}"}


# --- MCP JSON-RPC over stdio ---

def read_message():
    """Read a JSON-RPC message from stdin."""
    header_line = sys.stdin.readline()
    if not header_line:
        return None

    # Read Content-Length header
    content_length = 0
    while True:
        line = sys.stdin.readline()
        if not line or line.strip() == "":
            break
        if line.lower().startswith("content-length:"):
            content_length = int(line.split(":")[1].strip())

    if content_length == 0:
        return None

    body = sys.stdin.read(content_length)
    return json.loads(body)


def write_message(msg):
    """Write a JSON-RPC message to stdout."""
    body = json.dumps(msg)
    header = f"Content-Length: {len(body)}\r\n\r\n"
    sys.stdout.write(header + body)
    sys.stdout.flush()


def handle_request(msg):
    """Handle an incoming JSON-RPC request."""
    method = msg.get("method", "")
    msg_id = msg.get("id")
    params = msg.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "ai-browser-bridge",
                    "version": "1.0.0"
                }
            }
        }

    if method == "notifications/initialized":
        return None  # No response needed for notifications

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "tools": MCP_TOOLS
            }
        }

    if method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})
        try:
            result = handle_tool(tool_name, arguments)
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result, indent=2)
                        }
                    ]
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps({"success": False, "error": str(e)})
                        }
                    ],
                    "isError": True
                }
            }

    if method == "ping":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {}}

    # Unknown method
    if msg_id is not None:
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}"
            }
        }
    return None


def run_stdio():
    """Run the MCP server over stdio."""
    sys.stderr.write("AI Browser Bridge MCP Server started\n")
    sys.stderr.flush()

    while True:
        try:
            msg = read_message()
            if msg is None:
                break

            response = handle_request(msg)
            if response is not None:
                write_message(response)

        except KeyboardInterrupt:
            break
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")
            sys.stderr.flush()


def test_tools():
    """Test all MCP tools against the bridge."""
    print("Testing AI Browser Bridge MCP tools...\n")

    # Check bridge status
    print("1. browser_status")
    result = handle_tool("browser_status", {})
    print(f"   Result: {result}\n")

    if not result.get("status") == "running":
        print("Bridge is not running! Start it first:")
        print("  python bridge_server.py")
        return

    # Navigate
    print("2. browser_navigate")
    result = handle_tool("browser_navigate", {"url": "https://example.com"})
    print(f"   Result: {result}\n")

    time.sleep(3)

    # Extract
    print("3. browser_extract")
    result = handle_tool("browser_extract", {})
    print(f"   Result: {json.dumps(result, indent=2)[:300]}...\n")

    # Screenshot
    print("4. browser_screenshot")
    result = handle_tool("browser_screenshot", {})
    if result.get("success"):
        print("   Result: Screenshot captured (data URL returned)\n")
    else:
        print(f"   Result: {result}\n")

    # Scroll
    print("5. browser_scroll")
    result = handle_tool("browser_scroll", {"direction": "down", "pixels": 300})
    print(f"   Result: {result}\n")

    # Tab list
    print("6. browser_tab_list")
    result = handle_tool("browser_tab_list", {})
    print(f"   Result: {json.dumps(result, indent=2)[:300]}...\n")

    print("All tests complete!")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if "--test" in sys.argv:
        test_tools()
    else:
        run_stdio()
