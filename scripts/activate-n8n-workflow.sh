#!/usr/bin/env bash
# activate-n8n-workflow.sh — Import + activate scripts/n8n-daily-ai-brief.json via n8n API
# Usage: ./scripts/activate-n8n-workflow.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
N8N_URL="${N8N_URL:-http://localhost:5678}"
N8N_USER="${N8N_BASIC_AUTH_USER:-admin}"
N8N_PASS="${N8N_PASSWORD:-karma2026}"
WORKFLOW_FILE="${REPO_ROOT}/scripts/n8n-daily-ai-brief.json"

[[ -f "$WORKFLOW_FILE" ]] || { echo "fatal: $WORKFLOW_FILE not found" >&2; exit 1; }

echo "== Importing $WORKFLOW_FILE into $N8N_URL =="

# Read workflow JSON and strip outer braces to wrap as n8n expects
WORKFLOW_JSON=$(cat "$WORKFLOW_FILE")

# n8n's POST /api/v1/workflows expects the full workflow object
RESP=$(curl -fsS -u "${N8N_USER}:${N8N_PASS}" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "$WORKFLOW_JSON" \
  "${N8N_URL}/api/v1/workflows" 2>&1) || {
  echo "fatal: import failed — $RESP" >&2
  echo "import manually in the UI: Workflows → ⋯ → Import from File → $WORKFLOW_FILE"
  exit 1
}

WORKFLOW_ID=$(echo "$RESP" | python -c "import json, sys; d=json.load(sys.stdin); print(d.get('id') or d.get('data', {}).get('id') or '')")
echo "== Imported as workflow id: $WORKFLOW_ID =="

# Activate it
echo "== Activating =="
curl -fsS -u "${N8N_USER}:${N8N_PASS}" \
  -H "Content-Type: application/json" \
  -X PATCH \
  --data '{"active": true}' \
  "${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}" >/dev/null

echo "== DONE — daily AI brief workflow is now active =="
echo "Cron: 20:00 UTC (= 06:00 AEST) every day"
echo "Outputs: Discord webhook, Telegram bot, Slack webhook (configure env vars in karma-metrics)"
