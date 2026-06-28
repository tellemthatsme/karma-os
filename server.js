const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const { handleAbtestRoutes } = require('./src/routes/abtest');

const PORT = process.env.PORT || 8888;
const IS_WIN = os.platform() === 'win32';

// ── SQLite Persistence ─────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'karma.db');
const db = new sqlite3.Database(DB_PATH);

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS abtest_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    testId TEXT NOT NULL,
    variant TEXT NOT NULL,
    event TEXT NOT NULL,
    ts INTEGER NOT NULL,
    userId TEXT NOT NULL,
    sessionId TEXT,
    props TEXT,
    receivedAt INTEGER NOT NULL
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_abtest_testId ON abtest_events(testId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_abtest_ts ON abtest_events(ts)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_abtest_user ON abtest_events(userId)`);

  db.run(`CREATE TABLE IF NOT EXISTS abtest_configs (
    testId TEXT PRIMARY KEY,
    name TEXT,
    variants TEXT,
    weights TEXT,
    startDate TEXT,
    endDate TEXT,
    createdAt TEXT
  )`);
});

// ── In-memory metrics ────────────────────────────────────────────────
const metrics = {
  requestsTotal: 0,
  requestsByStatus: {},
  requestDurations: [],
  startTime: Date.now(),
  activeConnections: 0,
};
const rateLimitMap = new Map(); // ip → { count, resetTime }

// ── Research job state ─────────────────────────────────────────────────
const researchJobs = {};

// ── WebSocket state ────────────────────────────────────────────────────
const wss = new WebSocket.Server({ noServer: true });
const wsClients = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', message: 'KARMA A/B Test Live Dashboard' }));
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

// ── System Metrics Helpers ─────────────────────────────────────────────
function getCpuUsage() {
  return new Promise((resolve) => {
    const stats1 = os.cpus();
    setTimeout(() => {
      const stats2 = os.cpus();
      let idle = 0, total = 0;
      for (let i = 0; i < stats1.length; i++) {
        const s1 = stats1[i].times;
        const s2 = stats2[i].times;
        const idleDiff = s2.idle - s1.idle;
        const totalDiff = Object.keys(s2).reduce((sum, k) => sum + (s2[k] - s1[k]), 0);
        idle += idleDiff;
        total += totalDiff;
      }
      const usage = total > 0 ? ((total - idle) / total) * 100 : 0;
      resolve(usage.toFixed(1));
    }, 100);
  });
}

function getMemory() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    memory_total_gb: (total / 1024 / 1024 / 1024).toFixed(2),
    memory_free_gb: (free / 1024 / 1024 / 1024).toFixed(2),
    memory_used_gb: (used / 1024 / 1024 / 1024).toFixed(2),
    memory_used_pct: ((used / total) * 100).toFixed(1),
  };
}

function getDisk() {
  return new Promise((resolve) => {
    if (IS_WIN) {
      exec('wmic logicaldisk get size,freespace,caption', (err, stdout) => {
        if (err) return resolve({});
        const lines = stdout.split('\n').slice(1).filter(Boolean);
        const c = lines.find(l => l.trim().startsWith('C:'));
        if (!c) return resolve({});
        const parts = c.trim().split(/\s+/);
        const free = parseInt(parts[1], 10);
        const size = parseInt(parts[2], 10);
        resolve({
          disk_free_gb: (free / 1024 / 1024 / 1024).toFixed(1),
          disk_total_gb: (size / 1024 / 1024 / 1024).toFixed(1),
          disk_used_pct: (((size - free) / size) * 100).toFixed(1),
        });
      });
    } else {
      exec("df -h / | tail -1 | awk '{print $2,$3,$4}'", (err, stdout) => {
        if (err) return resolve({});
        const [total, used, free] = stdout.trim().split(' ');
        resolve({ disk_total: total, disk_used: used, disk_free: free });
      });
    }
  });
}

function getGitInfo() {
  return new Promise((resolve) => {
    exec('git rev-list --count HEAD 2>/dev/null || echo 0', (err, stdout) => {
      resolve({ commits: parseInt(stdout.trim(), 10) || 0 });
    });
  });
}

function getGitHubRepos() {
  return new Promise((resolve) => {
    const user = process.env.GITHUB_USER || 'tellemthatsme';
    fetch(`https://api.github.com/users/${user}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => resolve({
        user: data.login || user,
        public_repos: data.public_repos || 0,
        followers: data.followers || 0,
        following: data.following || 0,
      }))
      .catch(() => resolve({ user, public_repos: 0, followers: 0, following: 0 }));
  });
}

// ── Request Logger ─────────────────────────────────────────────────────
function logRequest(req, res, startTime, extra = {}) {
  const duration = Date.now() - startTime;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const status = res.statusCode || 200;
  console.log(`[${new Date().toISOString()}] ${status} ${req.method} ${req.url} ${duration}ms ${ip}${extra.error ? ' ERROR: ' + extra.error : ''}`);
  metrics.requestsTotal++;
  metrics.requestsByStatus[status] = (metrics.requestsByStatus[status] || 0) + 1;
  metrics.requestDurations.push(duration);
  if (metrics.requestDurations.length > 1000) metrics.requestDurations.shift();
}

// ── Rate Limiter ───────────────────────────────────────────────────────
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 120;
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// ── AB Test Routes (delegated to src/routes/abtest.js) ───────────────
// ── Request Handler ────────────────────────────────────────────────────
const requestHandler = async (req, res) => {
  const startTime = Date.now();
  metrics.activeConnections++;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    metrics.activeConnections--;
    return res.end();
  }

  // Rate limiting
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (forwarded ? forwarded.split(',')[0].trim() : null) || req.connection.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfter);
    res.writeHead(429);
    logRequest(req, res, startTime, { error: 'Rate limited' });
    metrics.activeConnections--;
    return res.end(JSON.stringify({ error: 'Too many requests', retryAfter: rateLimit.retryAfter }));
  }
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);

  const url = req.url.split('?')[0];

  // ── Claude API proxy (server-side) ───────────────────────────────────
  if (url === '/api/chat' && req.method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.writeHead(503);
      logRequest(req, res, startTime, { error: 'ANTHROPIC_API_KEY not set' });
      metrics.activeConnections--;
      return res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set on server' }));
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { messages, system, model, max_tokens, stream, agent } = JSON.parse(body || '{}');
        const useModel = model || 'claude-sonnet-4-20250514';
        const useMax = max_tokens || 1200;
        if (!Array.isArray(messages) || messages.length === 0) {
          res.writeHead(400);
          logRequest(req, res, startTime, { error: 'messages required' });
          metrics.activeConnections--;
          return res.end(JSON.stringify({ error: 'messages required' }));
        }
        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: useModel,
            max_tokens: useMax,
            system: system || `You are ${agent || 'KARMA'} — an AI agent in the KARMA OS v25 ULTIMATE multi-agent system.`,
            messages,
            stream: !!stream,
          }),
        });
        if (!upstream.ok) {
          const txt = await upstream.text();
          res.writeHead(upstream.status);
          logRequest(req, res, startTime, { error: 'Upstream error: ' + txt.substring(0, 100) });
          metrics.activeConnections--;
          return res.end(JSON.stringify({ error: txt.substring(0, 500) }));
        }
        if (stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });
          const reader = upstream.body.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) { res.end(); metrics.activeConnections--; return; }
              res.write(Buffer.from(value));
            }
          };
          pump().catch((e) => { try { res.end(); metrics.activeConnections--; } catch {} });
        } else {
          const data = await upstream.json();
          res.writeHead(200);
          logRequest(req, res, startTime);
          metrics.activeConnections--;
          res.end(JSON.stringify(data));
        }
      } catch (e) {
        res.writeHead(500);
        logRequest(req, res, startTime, { error: e.message });
        metrics.activeConnections--;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  try {
    // ── Metrics / Health ───────────────────────────────────────────────
    if (url === '/metrics' || url === '/') {
      const cpu = await getCpuUsage();
      const mem = getMemory();
      const disk = await getDisk();
      res.writeHead(200);
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({
        cpu: parseFloat(cpu),
        ...mem,
        ...disk,
        hostname: os.hostname(),
        platform: os.platform(),
        uptime: os.uptime(),
        timestamp: new Date().toISOString(),
      }));
    } else if (url === '/health') {
      const mem = process.memoryUsage();
      const avgDuration = metrics.requestDurations.length > 0
        ? (metrics.requestDurations.reduce((a, b) => a + b, 0) / metrics.requestDurations.length).toFixed(1)
        : 0;
      res.writeHead(200);
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        uptime_human: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
        memory: {
          rss_mb: (mem.rss / 1024 / 1024).toFixed(1),
          heap_total_mb: (mem.heapTotal / 1024 / 1024).toFixed(1),
          heap_used_mb: (mem.heapUsed / 1024 / 1024).toFixed(1),
          external_mb: (mem.external / 1024 / 1024).toFixed(1),
        },
        requests: {
          total: metrics.requestsTotal,
          active_connections: metrics.activeConnections,
          avg_duration_ms: avgDuration,
          by_status: metrics.requestsByStatus,
        },
        version: 'v25.2',
        timestamp: new Date().toISOString(),
      }));
    } else if (url === '/github') {
      const data = await getGitHubRepos();
      res.writeHead(200);
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify(data));
    } else if (url === '/cr') {
      res.writeHead(200);
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ security_score: 98, total_scans: 142 }));
    } else if (url === '/git') {
      const data = await getGitInfo();
      res.writeHead(200);
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify(data));
    }
    // ── Static media files ──────────────────────────────────────────────
    if (url.startsWith('/media/') && req.method === 'GET') {
      let safe;
      try { safe = decodeURIComponent(url.replace(/^\/media\//, '').split('#')[0]).replace(/\.\./g, ''); } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        logRequest(req, res, startTime, { error: 'Bad request' });
        metrics.activeConnections--;
        return res.end('Bad request');
      }
      const full = path.join(__dirname, 'media', safe);
      if (!full.startsWith(path.join(__dirname, 'media'))) {
        res.writeHead(403);
        logRequest(req, res, startTime, { error: 'Forbidden' });
        metrics.activeConnections--;
        return res.end('Forbidden');
      }
      const ext = path.extname(full).toLowerCase();
      const mime = {
        '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
        '.md': 'text/markdown', '.json': 'application/json',
      }[ext] || 'application/octet-stream';
      fs.readFile(full, (err, data) => {
        if (err) {
          console.error('[media]', err.code, safe);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          logRequest(req, res, startTime, { error: 'Not found' });
          metrics.activeConnections--;
          return res.end('Not found: ' + safe);
        }
        res.writeHead(200, { 'Content-Type': mime });
        logRequest(req, res, startTime);
        metrics.activeConnections--;
        res.end(data);
      });
      return;
    }
    // ── A/B Testing ────────────────────────────────────────────────────
    if (handleAbtestRoutes(req, res, startTime, { db, broadcast, logRequest, metrics, wsClients })) {
      return;
    }
    // ── Research ───────────────────────────────────────────────────────
    else if (url === '/api/research/refresh' && req.method === 'POST') {
      const projRoot = __dirname;
      const py = IS_WIN ? 'python' : 'python3';
      const cmd = `cd "${projRoot}" && ${py} scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md 2>&1`;
      const child = exec(cmd, { timeout: 120000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (researchJobs.last) {
          researchJobs.last = {
            ...researchJobs.last,
            ended_at: new Date().toISOString(),
            ok: !err,
            output_tail: String(stdout || '').slice(-2000),
            error: err ? String(err.message) : null,
          };
        }
      });
      researchJobs.last = {
        started_at: new Date().toISOString(),
        pid: child.pid,
        ok: null,
      };
      const archiveDir = path.join(__dirname, 'ai_news', 'archive');
      try { fs.mkdirSync(archiveDir, { recursive: true }); } catch {}
      const briefPath = path.join(__dirname, 'ai_news', 'CURRENT_AI_BRIEF.md');
      try {
        const prev = fs.readFileSync(briefPath, 'utf8');
        const today = new Date().toISOString().slice(0, 10);
        const archivePath = path.join(archiveDir, today + '.md');
        if (!fs.existsSync(archivePath)) {
          fs.writeFileSync(archivePath, prev, 'utf8');
          const files = fs.readdirSync(archiveDir).sort();
          if (files.length > 30) {
            for (const old of files.slice(0, files.length - 30)) {
              try { fs.unlinkSync(path.join(archiveDir, old)); } catch {}
            }
          }
        }
      } catch (e) {}
      res.writeHead(202);
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ started: true, pid: child.pid, brief_path: 'ai_news/CURRENT_AI_BRIEF.md' }));
    } else if (url === '/api/research/status') {
      const briefPath = path.join(__dirname, 'ai_news', 'CURRENT_AI_BRIEF.md');
      let briefMeta = { exists: false };
      try {
        const stat = fs.statSync(briefPath);
        briefMeta = {
          exists: true,
          bytes: stat.size,
          modified: stat.mtime.toISOString(),
          age_seconds: Math.round((Date.now() - stat.mtime.getTime()) / 1000),
        };
      } catch {}
      res.writeHead(200);
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ job: researchJobs.last, brief: briefMeta }, null, 2));
    } else if (url === '/api/research/rss' || url === '/feed.xml' || url === '/rss') {
      const baseUrl = `http://${req.headers.host || 'localhost:' + PORT}`;
      const aiDir = path.join(__dirname, 'ai_news');
      const entries = [];
      try {
        const stat = fs.statSync(path.join(aiDir, 'CURRENT_AI_BRIEF.md'));
        const content = fs.readFileSync(path.join(aiDir, 'CURRENT_AI_BRIEF.md'), 'utf8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const summary = content.replace(/[#*`>]/g, '').replace(/\n+/g, ' ').trim().slice(0, 280);
        entries.push({
          id: `ai-brief-${stat.mtime.toISOString().slice(0, 10)}`,
          title: titleMatch ? titleMatch[1] : 'AI Weekly Brief',
          link: `${baseUrl}/api/research/rss`,
          updated: stat.mtime.toISOString(),
          summary,
        });
      } catch {}
      try {
        const archiveDir = path.join(aiDir, 'archive');
        const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 30);
        for (const f of files) {
          const full = path.join(archiveDir, f);
          const stat = fs.statSync(full);
          const content = fs.readFileSync(full, 'utf8');
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const summary = content.replace(/[#*`>]/g, '').replace(/\n+/g, ' ').trim().slice(0, 280);
          entries.push({
            id: `ai-brief-${f.replace('.md', '')}`,
            title: titleMatch ? titleMatch[1] : 'AI Brief ' + f.replace('.md', ''),
            link: `${baseUrl}/_archive/ai_news/archive/${f}`,
            updated: stat.mtime.toISOString(),
            summary,
          });
        }
      } catch {}
      const updated = entries.length ? entries[0].updated : new Date().toISOString();
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc('KARMA OS · AI Weekly Brief')}</title>
  <subtitle>${esc('Auto-generated AI/ML/news brief by scripts/youtube_researcher.py')}</subtitle>
  <link href="${esc(baseUrl + '/api/research/rss')}" rel="self"/>
  <link href="${esc(baseUrl + '/')}""/>
  <id>urn:karma-os:ai-brief</id>
  <updated>${esc(updated)}</updated>
${entries.map(e => `  <entry>
    <title>${esc(e.title)}</title>
    <link href="${esc(e.link)}"/>
    <id>urn:karma-os:${esc(e.id)}</id>
    <updated>${esc(e.updated)}</updated>
    <summary>${esc(e.summary)}</summary>
  </entry>`).join('\n')}
</feed>
`;
      res.writeHead(200, { 'Content-Type': 'application/atom+xml; charset=utf-8' });
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(xml);
      return;
    } else if (url === '/api/research/history' && req.method === 'GET') {
      const archiveDir = path.join(__dirname, 'ai_news', 'archive');
      let history = [];
      try {
        const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.md')).sort().reverse();
        history = files.map(f => {
          const stat = fs.statSync(path.join(archiveDir, f));
          return {
            date: f.replace('.md', ''),
            path: 'ai_news/archive/' + f,
            size_kb: Math.round(stat.size / 1024),
            modified: stat.mtime.toISOString(),
          };
        });
      } catch {}
      res.writeHead(200);
      logRequest(req, res, startTime);
      metrics.activeConnections--;
      res.end(JSON.stringify({ history }, null, 2));
    } else if (url.startsWith('/_archive/') && req.method === 'GET') {
      const subpath = url.replace('/_archive/', '');
      if (!/^[a-zA-Z0-9._\-\/]+$/.test(subpath)) {
        res.writeHead(400);
        logRequest(req, res, startTime, { error: 'Invalid path' });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: 'Invalid path' }));
      }
      const full = path.join(__dirname, subpath);
      if (!full.startsWith(path.join(__dirname, 'ai_news'))) {
        res.writeHead(403);
        logRequest(req, res, startTime, { error: 'Forbidden' });
        metrics.activeConnections--;
        return res.end(JSON.stringify({ error: 'Forbidden' }));
      }
      try {
        const text = fs.readFileSync(full, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/markdown' });
        logRequest(req, res, startTime);
        metrics.activeConnections--;
        res.end(text);
      } catch (e) {
        res.writeHead(404);
        logRequest(req, res, startTime, { error: 'Not found' });
        metrics.activeConnections--;
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } else if (url.startsWith('/api/push/') && req.method === 'POST') {
      const platform = url.replace('/api/push/', '').split('?')[0];
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', async () => {
        try {
          const { content } = JSON.parse(body || '{}');
          if (!content) {
            res.writeHead(400);
            logRequest(req, res, startTime, { error: 'content required' });
            metrics.activeConnections--;
            return res.end(JSON.stringify({ error: 'content required' }));
          }
          let webhookUrl = null;
          let payload = null;
          if (platform === 'discord') {
            webhookUrl = process.env.DISCORD_WEBHOOK_AI_BRIEF;
            payload = {
              content: '@here 🧪 AI Weekly Brief',
              embeds: [{ description: content.slice(0, 4000), color: 5814783, footer: { text: 'KARMA OS' } }],
            };
          } else if (platform === 'telegram') {
            const token = process.env.TELEGRAM_BOT_TOKEN;
            const chat = process.env.TELEGRAM_AI_BRIEF_CHAT_ID;
            if (!token || !chat) {
              res.writeHead(503);
              logRequest(req, res, startTime, { error: 'Telegram not configured' });
              metrics.activeConnections--;
              return res.end(JSON.stringify({ ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_AI_BRIEF_CHAT_ID not set', hint: 'add to server.js env vars' }));
            }
            webhookUrl = `https://api.telegram.org/bot${token}/sendMessage`;
            payload = { chat_id: chat, text: '🧪 *AI Weekly Brief*\n\n' + content.slice(0, 3500), parse_mode: 'Markdown' };
          } else if (platform === 'slack') {
            webhookUrl = process.env.SLACK_WEBHOOK_AI_BRIEF;
            payload = { text: '🧪 *AI Weekly Brief*\n\n' + content.slice(0, 3500) };
          } else {
            res.writeHead(400);
            logRequest(req, res, startTime, { error: 'Unknown platform: ' + platform });
            metrics.activeConnections--;
            return res.end(JSON.stringify({ error: 'Unknown platform: ' + platform, supported: ['discord', 'telegram', 'slack'] }));
          }
          if (!webhookUrl) {
            res.writeHead(503);
            logRequest(req, res, startTime, { error: 'Webhook not configured' });
            metrics.activeConnections--;
            return res.end(JSON.stringify({ ok: false, error: 'Webhook URL not configured', hint: 'set ' + platform.toUpperCase() + '_WEBHOOK env var' }));
          }
          const r = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const ok = r.ok;
          res.writeHead(ok ? 200 : 502);
          logRequest(req, res, startTime, ok ? {} : { error: 'Upstream error' });
          metrics.activeConnections--;
          res.end(JSON.stringify({ ok, status: r.status, message: ok ? 'Posted to ' + platform : 'Upstream returned ' + r.status }));
        } catch (e) {
          res.writeHead(500);
          logRequest(req, res, startTime, { error: e.message });
          metrics.activeConnections--;
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    } else if (url.startsWith('/media/') && req.method === 'GET') {
      let safe;
      try { safe = decodeURIComponent(url.replace(/^\/media\//, '').split('#')[0]).replace(/\.\./g, ''); } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        logRequest(req, res, startTime, { error: 'Bad request' });
        metrics.activeConnections--;
        return res.end('Bad request');
      }
      const full = path.join(__dirname, 'media', safe);
      if (!full.startsWith(path.join(__dirname, 'media'))) {
        res.writeHead(403);
        logRequest(req, res, startTime, { error: 'Forbidden' });
        metrics.activeConnections--;
        return res.end('Forbidden');
      }
      const ext = path.extname(full).toLowerCase();
      const mime = {
        '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
        '.md': 'text/markdown', '.json': 'application/json',
      }[ext] || 'application/octet-stream';
      fs.readFile(full, (err, data) => {
        if (err) {
          console.error('[media]', err.code, safe);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          logRequest(req, res, startTime, { error: 'Not found' });
          metrics.activeConnections--;
          return res.end('Not found: ' + safe);
        }
        res.writeHead(200, { 'Content-Type': mime });
        logRequest(req, res, startTime);
        metrics.activeConnections--;
        res.end(data);
      });
      return;
    } else {
      res.writeHead(404);
      logRequest(req, res, startTime, { error: 'Not found' });
      metrics.activeConnections--;
      res.end(JSON.stringify({
        error: 'Not found',
        endpoints: [
          '/metrics', '/github', '/cr', '/git', '/health',
          '/api/chat (POST)', '/api/abtest/event (POST)', '/api/abtest/results (GET)',
          '/api/abtest/config (POST/GET)', '/api/abtest/reset (POST)',
          '/api/abtest/stats (GET)', '/api/abtest/significance (GET)', '/api/abtest/confidence (GET)', '/api/abtest/bayesian (GET)', '/api/abtest/sample-size (GET)', '/api/abtest/export (GET)',
          '/api/research/{refresh,status,history,rss}', '/api/push/{discord,telegram,slack} (POST)',
          '/media/* (static)',
        ],
      }));
    }
  } catch (e) {
    res.writeHead(500);
    logRequest(req, res, startTime, { error: e.message });
    metrics.activeConnections--;
    res.end(JSON.stringify({ error: 'Internal server error', message: e.message, timestamp: new Date().toISOString() }));
  }
};

const server = http.createServer(requestHandler);
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
server.listen(PORT, () => {
  console.log(`⚡ KARMA Metrics Server v25.2 running on http://localhost:${PORT}`);
  console.log(`   Endpoints: /metrics  /github  /cr  /git  /health`);
  console.log(`   A/B Test:  /api/abtest/{event,results,stats,config,reset,export,sample-size}`);
  console.log(`   WebSocket: ws://localhost:${PORT} (A/B test live dashboard)`);
  console.log(`   Research:  /api/research/{refresh,status,history,rss}  /feed.xml  /rss`);
  console.log(`   Push:      /api/push/{discord,telegram,slack}`);
  console.log(`   Proxy:     POST /api/chat  (Anthropic Claude, ${process.env.ANTHROPIC_API_KEY ? 'API key loaded ✓' : 'NO API KEY SET — set ANTHROPIC_API_KEY env'})`);
  console.log(`   SQLite:    ${DB_PATH}`);
});
