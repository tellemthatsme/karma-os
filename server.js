const http = require('http')
const os = require('os')
const { exec } = require('child_process')

const PORT = process.env.PORT || 8888
const IS_WIN = process.platform === 'win32'

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  const url = req.url.split('?')[0]

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
    } else {
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found', endpoints: ['/metrics', '/github', '/cr', '/git', '/health'] }))
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
})
