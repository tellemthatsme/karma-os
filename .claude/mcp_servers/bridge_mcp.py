#!/usr/bin/env python3
"""
KARMA Bridge MCP Server — exposes the AI Browser Bridge (localhost:9876) as MCP tools.
Uses stdio transport for Claude Code integration.

Tools exposed:
- bridge_status: Check if bridge is running
- bridge_navigate: Navigate to a URL
- bridge_click: Click on text or selector
- bridge_type: Type text into a field
- bridge_extract: Get page content
- bridge_screenshot: Capture the page
- bridge_evaluate: Run JavaScript in the page
- bridge_upload_video: Upload a YouTube video (tracks 1-16)
"""

import json
import sys
import time
import urllib.request
import urllib.error
import os

BRIDGE_URL = os.environ.get("BRIDGE_URL", "http://127.0.0.1:9876")

def log(msg):
    """Log to stderr (stdout is for MCP protocol)."""
    print(f"[bridge_mcp] {msg}", file=sys.stderr, flush=True)

def bridge_call(action, params=None, timeout=60):
    """Send a command to the bridge and wait for result."""
    if params is None:
        params = {}
    data = json.dumps({"action": action, "params": params}).encode()
    req = urllib.request.Request(
        f"{BRIDGE_URL}/command/send",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        result = json.loads(resp.read())
    except Exception as e:
        return {"success": False, "error": f"Bridge offline: {e}"}

    job_id = result.get("job_id")
    if not job_id:
        return {"success": False, "error": "No job_id returned"}

    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(f"{BRIDGE_URL}/result/{job_id}", timeout=5)
            return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                time.sleep(1)
                continue
            return {"success": False, "error": f"HTTP {e.code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Timeout"}


def handle_request(method, params):
    """Route MCP protocol methods."""
    if method == "initialize":
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "karma-bridge", "version": "1.0.0"}
        }

    if method == "notifications/initialized":
        return {}  # No response needed for notifications

    if method == "tools/list":
        return {
            "tools": [
                {
                    "name": "bridge_status",
                    "description": "Check if the AI Browser Bridge is running",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "bridge_navigate",
                    "description": "Navigate the browser to a URL",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "description": "Full URL to navigate to"}
                        },
                        "required": ["url"]
                    }
                },
                {
                    "name": "bridge_click",
                    "description": "Click on a button or link in the browser",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string", "description": "Text content of the element to click"},
                            "selector": {"type": "string", "description": "CSS selector of the element to click"}
                        }
                    }
                },
                {
                    "name": "bridge_type",
                    "description": "Type text into an input field",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "selector": {"type": "string", "description": "CSS selector of the input field"},
                            "text": {"type": "string", "description": "Text to type"}
                        },
                        "required": ["text"]
                    }
                },
                {
                    "name": "bridge_extract",
                    "description": "Extract text content from the page",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "selector": {"type": "string", "description": "CSS selector. Default: body"}
                        }
                    }
                },
                {
                    "name": "bridge_screenshot",
                    "description": "Capture a screenshot of the current page",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "bridge_evaluate",
                    "description": "Run JavaScript code in the browser",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "code": {"type": "string", "description": "JavaScript code to execute"}
                        },
                        "required": ["code"]
                    }
                },
                {
                    "name": "bridge_upload_video",
                    "description": "Upload a YouTube video (track 1-16) via YouTube Studio",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "track": {"type": "integer", "description": "Track number 1-16 from TELLLEMTHATSME roster"},
                            "channel": {"type": "string", "description": "Channel: main or second"}
                        },
                        "required": ["track"]
                    }
                },
            ]
        }

    if method == "tools/call":
        tool_name = params.get("name", "")
        args = params.get("arguments", {})

        if tool_name == "bridge_status":
            try:
                resp = urllib.request.urlopen(f"{BRIDGE_URL}/status", timeout=3)
                data = json.loads(resp.read())
                return {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]}
            except Exception as e:
                return {"content": [{"type": "text", "text": json.dumps({"status": "offline", "error": str(e)})}]}

        if tool_name == "bridge_navigate":
            result = bridge_call("navigate", {"url": args["url"]}, timeout=15)
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "bridge_click":
            params_bridge = {}
            if "text" in args:
                params_bridge["text"] = args["text"]
            if "selector" in args:
                params_bridge["selector"] = args["selector"]
            result = bridge_call("click", params_bridge, timeout=10)
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "bridge_type":
            params_bridge = {"text": args["text"]}
            if "selector" in args:
                params_bridge["selector"] = args["selector"]
            result = bridge_call("type", params_bridge, timeout=10)
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "bridge_extract":
            params_bridge = {}
            if "selector" in args:
                params_bridge["selector"] = args["selector"]
            result = bridge_call("extract", params_bridge, timeout=10)
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "bridge_screenshot":
            result = bridge_call("screenshot", timeout=10)
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "bridge_evaluate":
            result = bridge_call("evaluate", {"code": args["code"]}, timeout=15)
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "bridge_upload_video":
            track = args.get("track", 1)
            channel = args.get("channel", "main")
            result = bridge_call("upload_video", {"track": track, "channel": channel}, timeout=180)
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        return {"content": [{"type": "text", "text": json.dumps({"error": f"Unknown tool: {tool_name}"})}]}

    return None


def main():
    log(f"Starting bridge MCP server — bridge at {BRIDGE_URL}")

    # MCP uses JSON-RPC over stdio
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            req_id = request.get("id")
            method = request.get("method", "")

            result = handle_request(method, request.get("params", {}))
            if result is not None:
                response = {"jsonrpc": "2.0", "id": req_id, "result": result}
            else:
                response = {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Method not found: {method}"}}

            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except Exception as e:
            log(f"Error: {e}")
            error_resp = {"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": str(e)}}
            sys.stdout.write(json.dumps(error_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
