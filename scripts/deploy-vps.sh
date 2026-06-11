#!/usr/bin/env bash
# deploy-vps.sh — One-command KARMA OS deploy to a fresh Ubuntu 22.04+ VPS
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/tellemthatsme/karma-os/main/scripts/deploy-vps.sh | sudo bash
# Or after git clone:
#   ./scripts/deploy-vps.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

log()  { printf "\033[1;36m==>\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*" >&2; }
fail() { printf "\033[1;31m[fatal]\033[0m %s\n" "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "must run as root (sudo ./scripts/deploy-vps.sh)"

# 1. Install Docker + compose plugin if missing
if ! command -v docker &>/dev/null; then
  log "Installing Docker"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  log "Docker already installed: $(docker --version)"
fi

if ! docker compose version &>/dev/null; then
  log "Installing docker-compose plugin"
  apt-get update -y && apt-get install -y docker-compose-plugin
fi

# 2. Ensure .env exists
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    warn ".env created from .env.example — edit it now to set ANTHROPIC_API_KEY, webhooks, etc."
  else
    fail "no .env or .env.example found"
  fi
fi

# 3. Caddy for auto-HTTPS reverse proxy
if ! command -v caddy &>/dev/null; then
  log "Installing Caddy"
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/deb/debian.gpg' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true
  echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian/ any-version main" > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

# 4. Write Caddyfile from env
DOMAIN="${KARMA_DOMAIN:-_}"  # _ = use the VPS IP, no DNS needed
cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
  encode zstd gzip
  reverse_proxy /api/* karma-metrics:8888
  reverse_proxy /metrics karma-metrics:8888
  reverse_proxy /health karma-metrics:8888
  reverse_proxy /github karma-metrics:8888
  reverse_proxy /git karma-metrics:8888
  reverse_proxy /cr karma-metrics:8888
  reverse_proxy /feed.xml karma-metrics:8888
  reverse_proxy /rss karma-metrics:8888
  reverse_proxy /_archive/* karma-metrics:8888
  reverse_proxy /* karma-web:80
}
EOF
systemctl reload caddy

# 5. Build + start all 4 services (full stack profile)
log "Building + starting all 4 services"
docker compose --profile full-stack up -d --build

# 6. Wait for metrics to be healthy
log "Waiting for karma-metrics to be healthy"
for i in {1..30}; do
  if curl -fsS http://localhost:8888/health >/dev/null 2>&1; then
    log "karma-metrics is healthy"
    break
  fi
  sleep 2
done

# 7. Import the n8n workflow if n8n is up
if curl -fsS -m 3 http://localhost:5678/healthz >/dev/null 2>&1; then
  log "n8n is up — attempting to import the daily AI brief workflow"
  N8N_USER=$(grep '^N8N_BASIC_AUTH_USER=' .env | cut -d= -f2)
  N8N_PASS=$(grep '^N8N_PASSWORD=' .env | cut -d= -f2)
  WORKFLOW_JSON=$(cat scripts/n8n-daily-ai-brief.json)
  curl -fsS -u "${N8N_USER}:${N8N_PASS}" \
    -H "Content-Type: application/json" \
    -X POST \
    --data "{\"name\":\"Daily AI Brief\",\"nodes\":${WORKFLOW_JSON}}" \
    http://localhost:5678/api/v1/workflows || warn "n8n import failed — import manually in the UI"
else
  warn "n8n not responding on :5678 — import scripts/n8n-daily-ai-brief.json manually"
fi

# 8. Fallback daily cron (in case n8n goes down)
log "Installing /etc/cron.d/karma-ai-brief fallback"
cat > /etc/cron.d/karma-ai-brief <<EOF
# Runs at 06:00 AEST (= 20:00 UTC) every day as a fallback
0 20 * * * root cd ${REPO_ROOT} && /usr/bin/docker compose exec -T karma-metrics python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md >> /var/log/karma-ai-brief.log 2>&1
EOF

# 9. Print summary
PUBLIC_IP=$(curl -fsS -m 3 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
log "DEPLOY COMPLETE"
log ""
log "Public endpoints (use the IP if no DNS):"
log "  Dashboards:  http://${PUBLIC_IP}/"
log "  RSS / Atom:  http://${PUBLIC_IP}/api/research/rss"
log "  Metrics:     http://${PUBLIC_IP}/health"
log "  n8n admin:   http://${PUBLIC_IP}:5678/  (${N8N_USER:-admin} / <N8N_PASSWORD from .env>)"
log "  Bridge:      http://${PUBLIC_IP}:9876/  (token: <BRIDGE_TOKEN from .env>)"
log ""
log "Next: edit .env, then 'docker compose --profile full-stack restart karma-metrics karma-n8n'"
