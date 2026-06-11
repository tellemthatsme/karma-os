// ══════════════════════════════════════════════
// SETTINGS: THEME & AUDIO
// ══════════════════════════════════════════════
let isMuted = localStorage.getItem('os_muted') === 'true';

const sBov = new Audio('bov.wav'); 
const sScr = new Audio('screech.wav'); 

function updateAudioVolume() {
  const vol = isMuted ? 0 : (isWallpaper ? 0 : 0.4);
  sBov.volume = vol;
  sScr.volume = vol;
  const btn = document.getElementById('btn-mute');
  if(btn) {
    btn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    if(isMuted) btn.classList.add('active');
    else btn.classList.remove('active');
  }
}

function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('os_muted', isMuted);
  updateAudioVolume();
}

function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('os_theme', themeName);
}

// Initialize Theme
const savedTheme = localStorage.getItem('os_theme') || 'cyberpunk';
if(savedTheme !== 'cyberpunk') setTheme(savedTheme);


// ══════════════════════════════════════════════
// WALLPAPER MODE
// ══════════════════════════════════════════════
const urlParams = new URLSearchParams(window.location.search);
const isWallpaper = urlParams.get('wallpaper') === '1';
if (isWallpaper) {
  document.body.classList.add('wallpaper-mode');
  const qlCont = document.querySelector('.ql-cont');
  if(qlCont) qlCont.style.display = 'none';
  const sb2 = document.querySelector('.sb2');
  if(sb2) sb2.style.opacity = '0.5';
  const fleetBtns = document.querySelector('#fleet-panel .qb');
  if(fleetBtns) fleetBtns.parentElement.style.display = 'none';
}

updateAudioVolume(); // Apply initial volume

// ══════════════════════════════════════════════
// AGENTS
// ══════════════════════════════════════════════
const AG = [
  {n:'Jarvis Voice AI',  i:'🎤', bg:'#00d4ff22', s:'so', t:'Listening…',        tip:'Voice pipeline active — 0ms latency'},
  {n:'ResearchAgent',   i:'🔭', bg:'#b347ff22', s:'sb', t:'Scraping arxiv',     tip:'3 new papers in queue'},
  {n:'CodeAgent',       i:'💻', bg:'#00ff9d22', s:'so', t:'PR review queued',   tip:'12 files pending review'},
  {n:'GitOpsAgent',     i:'🐙', bg:'#ff6b3522', s:'sb', t:'Syncing 12 repos',   tip:'ETA 45s — 5/12 complete'},
  {n:'Ash Lee (GF)',    i:'💜', bg:'#ff336622', s:'so', t:'Content pipeline',   tip:'Next post in 2h 14m'},
  {n:'SyncService',     i:'🔄', bg:'#00d4ff22', s:'so', t:'Idle — 2m ago',      tip:'Last sync: 239 checked, 12 updated'},
  {n:'DownloadMgr',     i:'📦', bg:'#00ff9d22', s:'sb', t:'3 jobs queued',      tip:'~820 MB remaining'},
  {n:'NotifyBot',       i:'🔔', bg:'#b347ff22', s:'so', t:'0 unread',           tip:'All notifications clear'},
  {n:'MarketWatch',     i:'📈', bg:'#ff6b3522', s:'so', t:'BTC monitoring',     tip:'Threshold: $95k — watching'},
  {n:'n8n Orch',        i:'⚡', bg:'#b347ff22', s:'sb', t:'Ash Lee posts',      tip:'2 workflows executing'},
];

const al = document.getElementById('al');
if(al) {
  al.innerHTML = '<div class="pt"><span class="d"></span>Agent Status</div>' +
    AG.map(a =>
      `<div class="ac" data-tip="${a.tip}">
        <div class="ai" style="background:${a.bg};box-shadow:inset 0 0 10px ${a.bg.replace('22','44')}">${a.i}</div>
        <div style="flex:1;min-width:0">
          <div class="an">${a.n}</div>
          <div class="at">${a.t}</div>
        </div>
        <div class="sd ${a.s}"></div>
      </div>`).join('');
}

// ══════════════════════════════════════════════
// CLOCK & UPTIME
// ══════════════════════════════════════════════
const startTime = Date.now();
function ck() {
  const n = new Date();
  const clkt = document.getElementById('clkt');
  const clkd = document.getElementById('clkd');
  const vt = document.getElementById('vt');
  
  if(clkt) clkt.textContent = n.toLocaleTimeString('en-AU', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(clkd) clkd.textContent = n.toLocaleDateString('en-AU', {weekday:'short',day:'numeric',month:'short',year:'numeric'});
  if(vt) vt.textContent = 'KARMA OS v2.5 · ' + n.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});

  // Uptime
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const hh = String(Math.floor(elapsed / 3600)).padStart(2,'0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2,'0');
  const ss = String(elapsed % 60).padStart(2,'0');
  const utd = document.getElementById('uptime-display');
  if(utd) utd.textContent = `${hh}:${mm}:${ss}`;
  
  setTimeout(ck, 1000);
}
ck();

// ══════════════════════════════════════════════
// CRYPTO PRICES
// ══════════════════════════════════════════════
async function fc() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', {signal: AbortSignal.timeout(8000)});
    const d = await r.json();
    const s = (id, p, c) => {
      if (!d[id]) return;
      const pel = document.getElementById(p);
      if(pel) pel.textContent = '$' + d[id].usd.toLocaleString();
      const ch = (d[id].usd_24h_change || 0).toFixed(2);
      const el = document.getElementById(c);
      if(el) {
        el.textContent = (ch >= 0 ? '+' : '') + ch + '%';
        el.className = ch >= 0 ? 'up' : 'dn';
      }
    };
    s('bitcoin','bp','bc'); s('ethereum','ep','ec'); s('solana','sp','scc');
    localStorage.setItem('kc', JSON.stringify({...d, _t: Date.now()}));
  } catch {
    const c = localStorage.getItem('kc');
    if (c) {
      const d = JSON.parse(c);
      const bp = document.getElementById('bp'); if(bp) bp.textContent = '$' + (d.bitcoin?.usd || '--');
      const ep = document.getElementById('ep'); if(ep) ep.textContent = '$' + (d.ethereum?.usd || '--');
      const sp = document.getElementById('sp'); if(sp) sp.textContent = '$' + (d.solana?.usd || '--');
    }
  }
  setTimeout(fc, 60000);
}
fc();

// ══════════════════════════════════════════════
// ZERO-DELAY TELEMETRY (SSE Integration)
// ══════════════════════════════════════════════
let prevNetBytes = null;
let redlineActive = false;

const evtSource = new EventSource('http://localhost:8888/stream');

evtSource.onopen = () => {
  console.log('Zero-Delay Telemetry Connected');
  af({t:'success', i:'🔗', m:'System: Real-time Telemetry Linked.'});
};

evtSource.onmessage = (event) => {
  try {
    const d = JSON.parse(event.data);
    updateMetricsUI(d.metrics);
    updateGithubUI(d.github);
    updateLogsUI(d.logs);
    updateCrUI(d.cr);
  } catch(e) {}
};

evtSource.onerror = () => {
  console.warn('Telemetry disconnected.');
};

function updateMetricsUI(d) {
  const cv = document.getElementById('cv'); if(cv) cv.textContent = Math.round(d.cpu) + '%';
  const cb = document.getElementById('cb'); if(cb) cb.style.width = d.cpu + '%';
  const mv = document.getElementById('mv'); if(mv) mv.textContent = Math.round(d.memory_percent) + '%';
  const mb = document.getElementById('mb'); if(mb) mb.style.width = d.memory_percent + '%';
  const dv = document.getElementById('dv'); if(dv) dv.textContent = Math.round(d.disk_percent) + '%';
  const db = document.getElementById('db'); if(db) db.style.width = d.disk_percent + '%';

  const totalBytes = d.network_mbps * 1024 * 1024;
  if (prevNetBytes !== null) {
    const deltaMB = Math.max(0, (totalBytes - prevNetBytes) / 1024 / 1024).toFixed(1);
    const nv = document.getElementById('nv'); if(nv) nv.textContent = deltaMB + ' MB/s';
    const nb = document.getElementById('nb'); if(nb) nb.style.width = Math.min(deltaMB * 10, 100) + '%';
  }
  prevNetBytes = totalBytes;

  if (d.cpu > 90 && !redlineActive) toggleRedline();
}

// ══════════════════════════════════════════════
// REDLINE MODE
// ══════════════════════════════════════════════
function spawnParticles(x, y, color='#ff3366') {
  const container = document.getElementById('particle-container');
  if(!container) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (Math.random() * 360) * Math.PI / 180;
    const dist = 50 + Math.random() * 150;
    p.style.cssText = `
      left:${x}px; top:${y}px; width:${4+Math.random()*6}px; height:${4+Math.random()*6}px;
      background:${color}; box-shadow:0 0 6px ${color};
      --tx:${Math.cos(angle)*dist}px; --ty:${Math.sin(angle)*dist}px;
      animation-duration:${0.8+Math.random()*0.6}s;
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

function toggleRedline() {
  redlineActive = !redlineActive;
  const badge = document.getElementById('redline-badge');
  if(badge) badge.style.display = redlineActive ? 'flex' : 'none';
  document.body.classList.toggle('redline-mode', redlineActive);
  if (redlineActive) {
    af({t:'error', i:'🚨', m:'System: Redline Mode Activated. Overclocking UAS...'});
    if(badge) {
      const rect = badge.getBoundingClientRect();
      spawnParticles(rect.left + rect.width/2, rect.top + rect.height/2, 'var(--danger)');
    }
  } else {
    af({t:'info', i:'✅', m:'System: Redline Deactivated. Standard ops restored.'});
  }
}

// ══════════════════════════════════════════════
// SYSTEM BOOST
// ══════════════════════════════════════════════
let boostCooldown = false;
function triggerBoost() {
  if (boostCooldown) return;
  boostCooldown = true;
  const b = document.getElementById('boost-card');
  const t = document.getElementById('boost-timer');
  if(t) t.innerText = 'NITRO';
  if(b) {
    b.style.boxShadow = '0 0 40px var(--danger), 0 0 80px rgba(255,51,102,.3)';
    b.style.transform = 'scale(1.05)';
    const rect = b.getBoundingClientRect();
    spawnParticles(rect.left + rect.width/2, rect.top + rect.height/2, 'var(--ac)');
  }
  
  af({t:'error', i:'🚀', m:'SYSTEM OVERCLOCK INITIATED — Turbo Mode ACTIVE'});
  if(!isMuted) { sBov.currentTime = 0; sBov.play().catch(()=>{}); }
  document.body.style.animation = 'shake 0.5s ease';

  let count = 5;
  const interval = setInterval(() => {
    if(t) t.innerText = count > 0 ? `T-${count}` : 'READY';
    if(count <= 0) {
      clearInterval(interval);
      if(b) {
        b.style.boxShadow = '';
        b.style.transform = '';
      }
      document.body.style.animation = '';
      boostCooldown = false;
      af({t:'success', i:'✅', m:'Boost complete — systems nominal'});
    }
    count--;
  }, 400);
}

// ══════════════════════════════════════════════
// FLEET UI
// ══════════════════════════════════════════════
function updateGithubUI(d) {
  const fa = document.getElementById('fleet-accounts'); if(fa) fa.textContent = d.accounts.length;
  const fr = document.getElementById('fleet-repos'); if(fr) fr.textContent = d.total_repos;
  const fs = document.getElementById('fleet-syncs'); if(fs) fs.textContent = d.active_syncs;
  const fh = document.getElementById('fleet-health'); if(fh) fh.textContent = d.health;
  const repoStat = document.querySelector('#repo-count');
  if (repoStat) repoStat.textContent = d.total_repos;
}

function toggleFleetSetup() {
  const modal = document.getElementById('fleet-setup');
  if(modal) modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

async function saveFleetAccount() {
  const user = document.getElementById('gh-user').value.trim();
  const token = document.getElementById('gh-token').value.trim();
  if (!user) return;
  
  if (token) {
    try {
      await fetch('http://localhost:8888/secure-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, token })
      });
      af({t:'success', i:'🔗', m:`Fleet HQ: Account "${user}" secured in backend memory.`});
    } catch(e) {
      af({t:'error', i:'❌', m:`Fleet HQ: Telemetry disconnected. Cannot save token.`});
    }
  } else {
    af({t:'info', i:'🔗', m:`Fleet HQ: Account "${user}" linked without token.`});
  }
  
  document.getElementById('gh-user').value = '';
  document.getElementById('gh-token').value = '';
  toggleFleetSetup();
}

function triggerFleetSync() {
  const btn = document.getElementById('sync-btn');
  const panel = document.getElementById('fleet-panel');
  if(btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING';
    btn.classList.add('glow-ac3');
  }
  if(panel) panel.style.boxShadow = '0 0 30px rgba(0,212,255,.2)';
  af({t:'info', i:'🐙', m:'Fleet HQ: Aggregating account repos...'});
  setTimeout(() => {
    af({t:'success', i:'✅', m:'Fleet HQ: Audit complete.'});
    if(btn) {
      btn.innerHTML = '<i class="fas fa-check"></i> UPDATED';
      btn.classList.remove('glow-ac3');
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-sync-alt"></i> UPDATE ALL'; }, 3000);
    }
    if(panel) panel.style.boxShadow = '';
  }, 3500);
}

// ══════════════════════════════════════════════
// TERMINAL HUD & CR
// ══════════════════════════════════════════════
function updateLogsUI(d) {
  const hc = document.getElementById('hud-content');
  if(!hc) return;
  hc.innerHTML = d.map(l =>
    `<div class="fi ${l.t}" style="border:none;padding:2px 0;background:none;font-family:'Courier New',monospace">
      <span style="opacity:.6">></span> ${l.m}
    </div>`).join('');
  hc.scrollTop = hc.scrollHeight;
}

function updateCrUI(d) {
  const crt = document.getElementById('cr-total'); if(crt) crt.innerText = d.analyzed;
  const secVal = parseInt(d.security_score) || 0;
  const crs = document.getElementById('cr-security'); if(crs) crs.innerText = secVal + '%';
  const crsb = document.getElementById('cr-security-bar'); if(crsb) crsb.style.width = secVal + '%';
  if(crs) crs.style.color = secVal > 80 ? 'var(--ac3)' : secVal > 60 ? 'var(--warn)' : 'var(--danger)';
  const crc = document.getElementById('cr-complexity'); if(crc) crc.innerText = d.complexity_avg;
  
  const gradeMap = {'A+':95,'A':88,'A-':82,'B+':76,'B':70,'B-':64,'C+':57,'C':50};
  const gradeVal = gradeMap[d.complexity_avg] || 70;
  const crcb = document.getElementById('cr-complexity-bar'); if(crcb) crcb.style.width = gradeVal + '%';
}

// ══════════════════════════════════════════════
// API CHART
// ══════════════════════════════════════════════
const chartData = Array.from({length:24}, () => Math.random()*80+10);
function renderChart() {
  const mx = Math.max(...chartData);
  const mc = document.getElementById('mc');
  if (mc) mc.innerHTML = chartData.map((v,i) =>
    `<div class="cb" style="height:${(v/mx*100)}%;opacity:${.4+(i/chartData.length)*.6}" title="${v.toFixed(0)} req"></div>`
  ).join('');
}
renderChart();
setInterval(() => { chartData.shift(); chartData.push(Math.random()*80+10); renderChart(); }, 5000);

// ══════════════════════════════════════════════
// ACTIVITY FEED
// ══════════════════════════════════════════════
const FD = [
  {t:'success', i:'✅', m:'GitOpsAgent synced nova-hub (12 commits)'},
  {t:'info',    i:'🔭', m:'ResearchAgent: 3 new AI papers found'},
  {t:'info',    i:'📦', m:'DownloadManager: 5 repos queued'},
  {t:'success', i:'💜', m:'Ash Lee posted to Bluesky — 48 impr'},
  {t:'warn',    i:'⚠️', m:'Rate limit at 82% for karma-dev'},
  {t:'error',   i:'❌', m:'SyncService: Database connection failed'},
  {t:'info',    i:'🎤', m:'Jarvis voice session started'},
  {t:'success', i:'💹', m:'BTC scan complete — holding'},
  {t:'info',    i:'⚡', m:'n8n: Ash Lee Daily Post triggered'},
  {t:'info',    i:'🔄', m:'SyncService: 309 checked, 12 updated'},
  {t:'success', i:'🔐', m:'Security scan — no anomalies'},
  {t:'info',    i:'🤖', m:'CodeAgent: Complexity report ready'},
  {t:'warn',    i:'🌐', m:'OpenRouter: latency spike 340ms'},
  {t:'success', i:'🚀', m:'GRAV25 dashboard uptime 4h 32m'},
];

function af(e) {
  const l = document.getElementById('fl');
  if (!l) return;
  const n = new Date().toLocaleTimeString('en-AU', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const div = document.createElement('div');
  div.className = `fi ${e.t}`;
  div.innerHTML = `<span>${e.i}</span><span class="ft">${e.m}</span><span class="ftm">${n}</span>`;
  l.prepend(div);
  while (l.children.length > 20) l.lastChild.remove();
  if (!isMuted) {
    if (e.t === 'success') { sBov.currentTime = 0; sBov.play().catch(()=>{}); }
    if (e.t === 'error' || e.t === 'warn') { sScr.currentTime = 0; sScr.play().catch(()=>{}); }
  }
}

// Initial population
FD.slice(0, 6).forEach((e, i) => setTimeout(() => af(e), i * 250));
let feedIdx = 6;
setInterval(() => { af(FD[feedIdx % FD.length]); feedIdx++; }, 7000);

// ══════════════════════════════════════════════
// AGENT HEATMAP
// ══════════════════════════════════════════════
function renderHeatmap() {
  const container = document.getElementById('heatmap');
  if (!container) return;
  // Dynamic color picks based on active theme
  const isAlert = document.documentElement.getAttribute('data-theme') === 'alert';
  const isStealth = document.documentElement.getAttribute('data-theme') === 'stealth';
  let colors = ['#00d4ff','#b347ff','#00ff9d','#ff6b35','#ff3366'];
  if(isAlert) colors = ['#ff3366','#ff6b35','#ffbd00','#ff9900','#ff0000'];
  if(isStealth) colors = ['#8892b0','#a8b2d1','#64ffda','#ffd700','#ff0033'];

  container.innerHTML = Array.from({length:10}, (_, i) => {
    const intensity = Math.random();
    const color = colors[Math.floor(Math.random() * colors.length)];
    const alpha = (0.1 + intensity * 0.8).toFixed(2);
    return `<div class="hm-cell" style="background:${color};opacity:${alpha};color:${color}" title="Cycle ${i+1}: ${Math.round(intensity*100)}% load"></div>`;
  }).join('');
}
renderHeatmap();
setInterval(renderHeatmap, 4000);

// ══════════════════════════════════════════════
// MATRIX RAIN (HUD background)
// ══════════════════════════════════════════════
const canvas = document.getElementById('matrix-canvas');
if(canvas) {
  const ctx = canvas.getContext('2d');
  const chars = '01アイウエオカキクケコサシスセソ';
  let drops = [];

  function initMatrix() {
    const hud = canvas.parentElement;
    canvas.width = hud.clientWidth;
    canvas.height = hud.clientHeight;
    drops = Array.from({length: Math.floor(canvas.width / 14)}, () => Math.random() * canvas.height);
  }

  function drawMatrix() {
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Dynamic color depending on theme
    const style = getComputedStyle(document.body);
    ctx.fillStyle = style.getPropertyValue('--ac').trim() || '#00d4ff';
    ctx.font = '10px Courier New';
    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * 14, y);
      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 12;
    });
  }

  initMatrix();
  setInterval(drawMatrix, 80);
  window.addEventListener('resize', initMatrix);
}

// ══════════════════════════════════════════════
// SORTABLE JS INITIALIZATION
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  if (typeof Sortable !== 'undefined') {
    // Make the main layout draggable (the center grid container, right container)
    const ct3 = document.querySelector('.ct3');
    if(ct3) {
      Sortable.create(ct3, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        delay: 100, // slight delay so click events still fire
        delayOnTouchOnly: true
      });
    }

    const rc = document.querySelector('.rc');
    if(rc) {
      Sortable.create(rc, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        handle: '.pt', // drag by the title
        delay: 50
      });
    }
  }
});


// ══════════════════════════════════════════════
// MEDIA HUB — Video Catalog & Social
// ══════════════════════════════════════════════
const TTM_VIDEOS = [
  {n:'Dont Rush Me', t:'Patience & Persistence'},
  {n:'Every Morning When I Wake Up', t:'Daily Motivation & Devotion'},
  {n:'My Evil Past', t:'Redemption & Growth'},
  {n:'I Cant Be Him', t:'Identity & Self-Worth'},
  {n:'I Live For You', t:'Devotion & Purpose'},
  {n:'Just Drill Me', t:'Hard Drill Energy'},
  {n:'Like I Meant To Do', t:'Confidence & PA'},
  {n:'My Children', t:'Family & Legacy'},
  {n:'No Cheats', t:'Integrity & Authenticity'},
  {n:'Tellemthatsme', t:'Signature Anthem'},
  {n:'Till Im Done', t:'Party & Energy'},
  {n:'Weather You Can Do', t:'Resilience & Endurance'},
  {n:'Woods', t:'Reflection & Journey'},
  {n:'Every Morning (MV)', t:'Music Video Visual'},
];

function renderMediaVideos() {
  const list = document.getElementById('media-video-list');
  if (!list) return;
  list.innerHTML = TTM_VIDEOS.map((v, i) =>
    '<div class="media-vid" onclick="navigator.clipboard.writeText(\'' + v.n + ' \u2014 tellemthatsme (Official Music Video)\').then(()=>af({t:\'success\',i:\'\ud83c\udfac\',m:\'Copied: ' + v.n.replace(/'/g, "\\'") + '\'}))">' +
    '<span class="vid-num">' + (i + 1) + '</span>' +
    '<span class="vid-name">' + v.n + '</span>' +
    '<span class="vid-theme">' + v.t + '</span>' +
    '</div>'
  ).join('');
}

// Render on load
renderMediaVideos();
