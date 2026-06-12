#!/usr/bin/env python3
"""
KARMA Metrics MCP Server — exposes the KARMA Metrics Backend (localhost:8888) as MCP tools.
Uses stdio transport for Claude Code integration.

Tools exposed:
- metrics_system: CPU, memory, disk, hostname, uptime
- metrics_github: Public repos and followers
- metrics_health: Server health check
- research_refresh: Trigger AI research pipeline
- research_status: Check research pipeline status
- research_brief: Get the current AI research brief
- research_history: List archived briefs
- research_push: Push brief to Discord/Telegram/Slack
"""

import json
import sys
import urllib.request
import urllib.error
import os

METRICS_URL = os.environ.get("METRICS_URL", "http://localhost:8888")

def log(msg):
    print(f"[metrics_mcp] {msg}", file=sys.stderr, flush=True)

def api_get(path, timeout=10):
    """Call the metrics API."""
    try:
        resp = urllib.request.urlopen(f"{METRICS_URL}{path}", timeout=timeout)
        return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def api_post(path, body, timeout=15):
    """POST to the metrics API."""
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{METRICS_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:300]}"}
    except Exception as e:
        return {"error": str(e)}


def handle_request(method, params):
    """Route MCP protocol methods."""
    if method == "initialize":
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "karma-metrics", "version": "1.0.0"}
        }

    if method == "notifications/initialized":
        return {}

    if method == "tools/list":
        return {
            "tools": [
                {
                    "name": "metrics_system",
                    "description": "Get system metrics: CPU, memory, disk, hostname, uptime",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "metrics_github",
                    "description": "Get GitHub stats: public repos and followers for tellemthatsme",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "metrics_health",
                    "description": "Check if the metrics server is healthy",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "research_refresh",
                    "description": "Trigger the AI research pipeline to generate a new brief",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "research_status",
                    "description": "Check the AI research pipeline status and current brief metadata",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "research_brief",
                    "description": "Get the current AI research brief content",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "research_history",
                    "description": "List archived AI research briefs (last 30 days)",
                    "inputSchema": {"type": "object", "properties": {}}
                },
                {
                    "name": "research_push",
                    "description": "Push the current AI research brief to a platform (discord, telegram, or slack)",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "platform": {
                                "type": "string",
                                "description": "Platform: discord, telegram, or slack",
                                "enum": ["discord", "telegram", "slack"]
                            },
                            "content": {
                                "type": "string",
                                "description": "Content to push (defaults to current brief if empty)"
                            }
                        },
                        "required": ["platform"]
                    }
                },
            ]
        }

    if method == "tools/call":
        tool_name = params.get("name", "")
        args = params.get("arguments", {})

        if tool_name == "metrics_system":
            result = api_get("/metrics")
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "metrics_github":
            result = api_get("/github")
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "metrics_health":
            result = api_get("/health")
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "research_refresh":
            result = api_post("/api/research/refresh", {})
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "research_status":
            result = api_get("/api/research/status")
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "research_brief":
            result = api_get("/_archive/ai_news/CURRENT_AI_BRIEF.md", timeout=10)
            if isinstance(result, dict) and "error" in result:
                return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}
            return {"content": [{"type": "text", "text": str(result)}]}

        if tool_name == "research_history":
            result = api_get("/api/research/history")
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        if tool_name == "research_push":
            platform = args["platform"]
            content = args.get("content", "")
            if not content:
                # Fetch current brief
                brief = api_get("/_archive/ai_news/CURRENT_AI_BRIEF.md", timeout=10)
                content = str(brief) if brief else ""
            result = api_post(f"/api/push/{platform}", {"content": content})
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}

        return {"content": [{"type": "text", "text": json.dumps({"error": f"Unknown tool: {tool_name}"})}]}

    return None


def main():
    log(f"Starting metrics MCP server — metrics at {METRICS_URL}")

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
