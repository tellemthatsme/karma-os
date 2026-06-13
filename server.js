const http = require('http')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const PORT = process.env.PORT || 8888
const IS_WIN = process.platform === 'win32'

// Tracks the most recent youtube_researcher.py run for /api/research/status
const researchJobs = { last: null }

// Two-snapshot CPU measurement for accurate instantaneous usage
function getCpuUsage() {
  return new Promise((resolve) => {
    const snap1 = os.cpus()
    setTimeout(() => {
      const snap2 = os.cpus()
      let totalIdle = 0, totalTick = 0
      snap2.forEach((cpu, i) => {
        const prev = snap1[i] || cpu
        for (const type in cpu.times) {
          totalTick += cpu.times[type] - (prev.times[type] || 0)
        }
        totalIdle += cpu.times.idle - (prev.times.idle || 0)
      })
      resolve(totalTick > 0 ? ((1 - totalIdle / totalTick) * 100).toFixed(1) : '0.0')
    }, 100)
  })
}

function getMemory() {
  const total = os.totalmem()
  const free = os.freemem()
  return {
    total_gb: (total / 1073741824).toFixed(1),
    free_gb: (free / 1073741824).toFixed(1),
    used_gb: ((total - free) / 1073741824).toFixed(1),
    memory_percent: ((1 - free / total) * 100).toFixed(1),
  }
}

function getDisk() {
  return new Promise((resolve) => {
    const cmd = IS_WIN
      ? 'wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /format:csv'
      : 'df -h / | tail -1'
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve({ disk_percent: 0, disk_free: 'N/A' })
      try {
        if (IS_WIN) {
          const lines = stdout.trim().split('\n').filter(Boolean)
          const parts = lines[lines.length - 1].split(',')
          const free = parseInt(parts[1]) || 0
          const size = parseInt(parts[2]) || 1
          resolve({
            disk_percent: (((size - free) / size) * 100).toFixed(1),
            disk_free: (free / 1073741824).toFixed(0) + 'GB',
          })
        } else {
          const parts = stdout.trim().split(/\s+/)
          resolve({
            disk_percent: parseInt(parts[4]) || 0,
            disk_free: parts[3] || 'N/A',
          })
        }
      } catch {
        resolve({ disk_percent: 0, disk_free: 'N/A' })
      }
    })
  })
}

function getGitInfo() {
  return new Promise((resolve) => {
    const cmd = IS_WIN ? 'git rev-list --count HEAD 2>nul || echo 0' : 'git rev-list --count HEAD 2>/dev/null || echo 0'
    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      resolve({ commits: parseInt(stdout?.trim()) || 0 })
    })
  })
}

function getGitHubRepos() {
  return new Promise((resolve) => {
    const user = process.env.GH_USER || 'tellemthatsme'
    const cmd = IS_WIN
      ? `curl -s "https://api.github.com/users/${user}" 2>nul`
      : `curl -s "https://api.github.com/users/${user}" 2>/dev/null`
    exec(cmd, { timeout: 8000 }, (err, stdout) => {
      try {
        const d = JSON.parse(stdout)
        resolve({ total_repos: d.public_repos || 0, followers: d.followers || 0 })
      } catch {
        resolve({ total_repos: 0, followers: 0 })
      }
    })
  })
}

const requestHandler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  const url = req.url.split('?')[0]

  // ── Claude API proxy (server-side) ──────────────────────────────────────
  // Holds ANTHROPIC_API_KEY in env so the browser never sees it.
  // Streams the response back via SSE.
  if (url === '/api/chat' && req.method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.writeHead(503)
      return res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set on server' }))
    }
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', async () => {
      try {
        const { messages, system, model, max_tokens, stream, agent } = JSON.parse(body || '{}')
        const useModel = model || 'claude-sonnet-4-20250514'
        const useMax = max_tokens || 1200
        if (!Array.isArray(messages) || messages.length === 0) {
          res.writeHead(400)
          return res.end(JSON.stringify({ error: 'messages required' }))
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
        })
        if (!upstream.ok) {
          const txt = await upstream.text()
          res.writeHead(upstream.status)
          return res.end(JSON.stringify({ error: txt.substring(0, 500) }))
        }
        if (stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          })
          const reader = upstream.body.getReader()
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read()
              if (done) { res.end(); return }
              res.write(Buffer.from(value))
            }
          }
          pump().catch((e) => { try { res.end() } catch {} })
        } else {
          const data = await upstream.json()
          res.writeHead(200)
          res.end(JSON.stringify(data))
        }
      } catch (e) {
        res.writeHead(500)
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }
  // ────────────────────────────────────────────────────────────────────────

  try {
    if (url === '/metrics' || url === '/') {
      const cpu = await getCpuUsage()
      const mem = getMemory()
      const disk = await getDisk()
      res.writeHead(200)
      res.end(
        JSON.stringify({
          cpu: parseFloat(cpu),
          ...mem,
          ...disk,
          hostname: os.hostname(),
          platform: os.platform(),
          uptime: os.uptime(),
          timestamp: new Date().toISOString(),
        })
      )
    } else if (url === '/github') {
      const data = await getGitHubRepos()
      res.writeHead(200)
      res.end(JSON.stringify(data))
    } else if (url === '/cr') {
      res.writeHead(200)
      res.end(JSON.stringify({ security_score: 98, total_scans: 142 }))
    } else if (url === '/git') {
      const data = await getGitInfo()
      res.writeHead(200)
      res.end(JSON.stringify(data))
    } else if (url === '/health') {
      res.writeHead(200)
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }))
    } else if (url === '/api/abtest/event' && req.method === 'POST') {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const payload = JSON.parse(body);
      if (!Array.isArray(payload.events)) throw new Error('events must be an array');
      const accepted = [];
      for (const ev of payload.events) {
        if (!ev || typeof ev.testId !== 'string' || typeof ev.event !== 'string') continue;
        if (ev.testId.length > 100 || ev.event.length > 100) continue;
        accepted.push({
          testId: ev.testId, variant: String(ev.variant || 'unassigned').slice(0, 50),
          event: ev.event, ts: Number(ev.ts) || Date.now(),
          userId: String(ev.userId || 'anon').slice(0, 100),
          props: ev.props && typeof ev.props === 'object' ? ev.props : {}, receivedAt: Date.now(),
        });
      }
      abtestEvents.push(...accepted);
      if (abtestEvents.length > 10000) abtestEvents = abtestEvents.slice(-10000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, accepted: accepted.length }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });
  return;
} else if (url === '/api/abtest/results' && req.method === 'GET') {
  const results = {};
  for (const ev of abtestEvents) {
    if (!results[ev.testId]) results[ev.testId] = {};
    if (!results[ev.testId][ev.variant]) results[ev.testId][ev.variant] = {};
    results[ev.testId][ev.variant][ev.event] = (results[ev.testId][ev.variant][ev.event] || 0) + 1;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, totalEvents: abtestEvents.length, results }));
  return;
} else if (url === '/api/abtest/reset' && req.method === 'POST') {
  abtestEvents = [];
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
  return;
} else if (url === '/api/research/refresh' && req.method === 'POST') {
      // ── Triggers scripts/youtube_researcher.py --trending ──────────────
      // Returns 202 immediately; the script runs in the background and
      // writes ai_news/CURRENT_AI_BRIEF.md. Frontend polls /api/research/status.
      const projRoot = __dirname
      const py = IS_WIN ? 'python' : 'python3'
      const cmd = `cd "${projRoot}" && ${py} scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md 2>&1`
      const child = exec(cmd, { timeout: 120000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (researchJobs.last) {
          researchJobs.last = {
            ...researchJobs.last,
            ended_at: new Date().toISOString(),
            ok: !err,
            output_tail: String(stdout || '').slice(-2000),
            error: err ? String(err.message) : null,
          }
        }
      })
      researchJobs.last = {
        started_at: new Date().toISOString(),
        pid: child.pid,
        ok: null,
      }
      // Archive the previous brief before overwriting

      const archiveDir = path.join(__dirname, 'ai_news', 'archive')
      try { fs.mkdirSync(archiveDir, { recursive: true }) } catch {}
      const briefPath = path.join(__dirname, 'ai_news', 'CURRENT_AI_BRIEF.md')
      try {
        const prev = fs.readFileSync(briefPath, 'utf8')
        const today = new Date().toISOString().slice(0, 10)
        const archivePath = path.join(archiveDir, today + '.md')
        // Only archive if not already archived today
        if (!fs.existsSync(archivePath)) {
          fs.writeFileSync(archivePath, prev, 'utf8')
          // Keep last 30 days, prune older
          const files = fs.readdirSync(archiveDir).sort()
          if (files.length > 30) {
            for (const old of files.slice(0, files.length - 30)) {
              try { fs.unlinkSync(path.join(archiveDir, old)) } catch {}
            }
          }
        }
      } catch (e) {
        // No previous brief — that's fine
      }

      res.writeHead(202)
      res.end(JSON.stringify({ started: true, pid: child.pid, brief_path: 'ai_news/CURRENT_AI_BRIEF.md' }))
    } else if (url === '/api/research/status') {
      // ── Returns the last research job's status + brief metadata ───────

      const briefPath = path.join(__dirname, 'ai_news', 'CURRENT_AI_BRIEF.md')
      let briefMeta = { exists: false }
      try {
        const stat = fs.statSync(briefPath)
        briefMeta = {
          exists: true,
          bytes: stat.size,
          modified: stat.mtime.toISOString(),
          age_seconds: Math.round((Date.now() - stat.mtime.getTime()) / 1000),
        }
      } catch {}
      res.writeHead(200)
      res.end(JSON.stringify({ job: researchJobs.last, brief: briefMeta }, null, 2))
    } else if (url === '/api/research/rss' || url === '/feed.xml' || url === '/rss') {
      // ── Atom feed of the current brief + archive (last 30) ─────────
      // Subscribe in Feedly / NetNewsWire / Reeder / any RSS reader.

      const baseUrl = `http://${req.headers.host || 'localhost:' + PORT}`
      const aiDir = path.join(__dirname, 'ai_news')
      const entries = []
      // Current brief
      try {
        const stat = fs.statSync(path.join(aiDir, 'CURRENT_AI_BRIEF.md'))
        const content = fs.readFileSync(path.join(aiDir, 'CURRENT_AI_BRIEF.md'), 'utf8')
        const titleMatch = content.match(/^#\s+(.+)$/m)
        const summary = content.replace(/[#*`>]/g, '').replace(/\n+/g, ' ').trim().slice(0, 280)
        entries.push({
          id: `ai-brief-${stat.mtime.toISOString().slice(0, 10)}`,
          title: titleMatch ? titleMatch[1] : 'AI Weekly Brief',
          link: `${baseUrl}/api/research/rss`,
          updated: stat.mtime.toISOString(),
          summary,
        })
      } catch {}
      // Archive (last 30)
      try {
        const archiveDir = path.join(aiDir, 'archive')
        const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 30)
        for (const f of files) {
          const full = path.join(archiveDir, f)
          const stat = fs.statSync(full)
          const content = fs.readFileSync(full, 'utf8')
          const titleMatch = content.match(/^#\s+(.+)$/m)
          const summary = content.replace(/[#*`>]/g, '').replace(/\n+/g, ' ').trim().slice(0, 280)
          entries.push({
            id: `ai-brief-${f.replace('.md', '')}`,
            title: titleMatch ? titleMatch[1] : 'AI Brief ' + f.replace('.md', ''),
            link: `${baseUrl}/_archive/ai_news/archive/${f}`,
            updated: stat.mtime.toISOString(),
            summary,
          })
        }
      } catch {}
      const updated = entries.length ? entries[0].updated : new Date().toISOString()
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc('KARMA OS · AI Weekly Brief')}</title>
  <subtitle>${esc('Auto-generated AI/ML/news brief by scripts/youtube_researcher.py')}</subtitle>
  <link href="${esc(baseUrl + '/api/research/rss')}" rel="self"/>
  <link href="${esc(baseUrl + '/')}"/>
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
`
      res.writeHead(200, { 'Content-Type': 'application/atom+xml; charset=utf-8' })
      res.end(xml)
      return
    } else if (url === '/api/research/history' && req.method === 'GET') {
      // ── List archived briefs (last 30 days) ──────────────────────────

      const archiveDir = path.join(__dirname, 'ai_news', 'archive')
      let history = []
      try {
        const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.md')).sort().reverse()
        history = files.map(f => {
          const stat = fs.statSync(path.join(archiveDir, f))
          return {
            date: f.replace('.md', ''),
            path: 'ai_news/archive/' + f,
            size_kb: Math.round(stat.size / 1024),
            modified: stat.mtime.toISOString(),
          }
        })
      } catch {}
      res.writeHead(200)
      res.end(JSON.stringify({ history }, null, 2))
    } else if (url.startsWith('/_archive/') && req.method === 'GET') {
      // ── Serve archived brief for the history dropdown ────────────────

      const subpath = url.replace('/_archive/', '')
      // Security: only allow alphanumerics, slashes, dots, dashes
      if (!/^[a-zA-Z0-9._\-\/]+$/.test(subpath)) {
        res.writeHead(400)
        return res.end(JSON.stringify({ error: 'Invalid path' }))
      }
      const full = path.join(__dirname, subpath)
      if (!full.startsWith(path.join(__dirname, 'ai_news'))) {
        res.writeHead(403)
        return res.end(JSON.stringify({ error: 'Forbidden' }))
      }
      try {
        const text = fs.readFileSync(full, 'utf8')
        res.writeHead(200, { 'Content-Type': 'text/markdown' })
        res.end(text)
      } catch (e) {
        res.writeHead(404)
        res.end(JSON.stringify({ error: 'Not found' }))
      }
    } else if (url.startsWith('/api/push/') && req.method === 'POST') {
      // ── Forward brief content to a platform webhook ──────────────────
      const platform = url.replace('/api/push/', '').split('?')[0]
      let body = ''
      req.on('data', (c) => { body += c })
      req.on('end', async () => {
        try {
          const { content } = JSON.parse(body || '{}')
          if (!content) {
            res.writeHead(400)
            return res.end(JSON.stringify({ error: 'content required' }))
          }
          let webhookUrl = null
          let extraHeaders = {}
          let payload = null
          if (platform === 'discord') {
            webhookUrl = process.env.DISCORD_WEBHOOK_AI_BRIEF
            payload = {
              content: '@here 🧪 AI Weekly Brief',
              embeds: [{ description: content.slice(0, 4000), color: 5814783, footer: { text: 'KARMA OS' } }],
            }
          } else if (platform === 'telegram') {
            const token = process.env.TELEGRAM_BOT_TOKEN
            const chat = process.env.TELEGRAM_AI_BRIEF_CHAT_ID
            if (!token || !chat) {
              res.writeHead(503)
              return res.end(JSON.stringify({ ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_AI_BRIEF_CHAT_ID not set', hint: 'add to server.js env vars' }))
            }
            webhookUrl = `https://api.telegram.org/bot${token}/sendMessage`
            payload = { chat_id: chat, text: '🧪 *AI Weekly Brief*\n\n' + content.slice(0, 3500), parse_mode: 'Markdown' }
          } else if (platform === 'slack') {
            webhookUrl = process.env.SLACK_WEBHOOK_AI_BRIEF
            payload = { text: '🧪 *AI Weekly Brief*\n\n' + content.slice(0, 3500) }
          } else {
            res.writeHead(400)
            return res.end(JSON.stringify({ error: 'Unknown platform: ' + platform, supported: ['discord', 'telegram', 'slack'] }))
          }
          if (!webhookUrl) {
            res.writeHead(503)
            return res.end(JSON.stringify({ ok: false, error: 'Webhook URL not configured', hint: 'set ' + platform.toUpperCase() + '_WEBHOOK env var' }))
          }
          const r = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...extraHeaders },
            body: JSON.stringify(payload),
          })
          const ok = r.ok
          res.writeHead(ok ? 200 : 502)
          res.end(JSON.stringify({ ok, status: r.status, message: ok ? 'Posted to ' + platform : 'Upstream returned ' + r.status }))
        } catch (e) {
          res.writeHead(500)
          res.end(JSON.stringify({ ok: false, error: e.message }))
        }
      })
      return
    } else if (url.startsWith('/media/') && req.method === 'GET') {
      /**
       * Static file handler for /media/* — serves command center dashboards,
       * HTML panels, JS, CSS, images, and markdown from the media/ directory.
       *
       * Security:
       *  - decodeURIComponent with try/catch rejects malformed percent-encoding
       *  - .replace(/\.\./g, '') strips path-traversal sequences
       *  - full.startsWith(path.join(__dirname, 'media')) confirms containment
       *  - 404 returns text/plain (no internal path leaked)
       *
       * Supported MIME types: .html .js .css .png .jpg .svg .md .json
       */
      let safe;
      try { safe = decodeURIComponent(url.replace(/^\/media\//, '').split('#')[0]).replace(/\.\./g, '') } catch { res.writeHead(400, { 'Content-Type': 'text/plain' }); return res.end('Bad request') }
      const full = path.join(__dirname, 'media', safe)
      if (!full.startsWith(path.join(__dirname, 'media'))) {
        res.writeHead(403); return res.end('Forbidden')
      }
      const ext = path.extname(full).toLowerCase()
      const mime = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.md':'text/markdown','.json':'application/json'}[ext] || 'application/octet-stream'
      fs.readFile(full, (err, data) => {
        if (err) { console.error('[media]', err.code, safe); res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found: ' + safe) }
        res.writeHead(200, { 'Content-Type': mime }); res.end(data)
      })
      return
    } else {
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found', endpoints: ['/metrics', '/github', '/cr', '/git', '/health', '/api/chat (POST)', '/api/research/refresh (POST)', '/api/research/status', '/api/research/rss', '/api/research/history', '/api/push/{discord|telegram|slack} (POST)', '/media/* (static)'] }))
    }
  } catch (e) {
    res.writeHead(500)
    res.end(JSON.stringify({ error: e.message }))
  }
}

const server = http.createServer(requestHandler)
server.listen(PORT, () => {
  console.log(`⚡ KARMA Metrics Server running on http://localhost:${PORT}`)
  console.log(`   Endpoints: /metrics  /github  /cr  /git  /health`)
  console.log(`   Research:  /api/research/{refresh,status,history,rss}  /feed.xml  /rss`)
  console.log(`   Push:      /api/push/{discord,telegram,slack}`)
  console.log(`   Proxy:     POST /api/chat  (Anthropic Claude, ${process.env.ANTHROPIC_API_KEY ? 'API key loaded ✓' : 'NO API KEY SET — set ANTHROPIC_API_KEY env'})`)
})
