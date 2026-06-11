// AI Browser Bridge — Firefox Popup
const BRIDGE_URL = 'http://127.0.0.1:9876';

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const bridgeStatus = document.getElementById('bridgeStatus');
const btnBridge = document.getElementById('btnBridge');
const btnYoutube = document.getElementById('btnYoutube');
const btnUpload = document.getElementById('btnUpload');

let bridgeRunning = false;

checkBridge();
setInterval(checkBridge, 3000);

async function checkBridge() {
  try {
    const resp = await fetch(`${BRIDGE_URL}/status`, { signal: AbortSignal.timeout(2000) });
    if (resp.ok) {
      const data = await resp.json();
      setOnline(data);
    } else {
      setOffline();
    }
  } catch {
    setOffline();
  }
}

function setOnline(data) {
  bridgeRunning = true;
  statusDot.className = 'status-dot online';
  statusText.textContent = '✅ Bridge online — AI can control your browser';
  bridgeStatus.textContent = '● Online';
  bridgeStatus.style.color = '#4ade80';
  btnBridge.textContent = '⏹ STOP BRIDGE';
  btnBridge.className = 'btn btn-stop';
}

function setOffline() {
  bridgeRunning = false;
  statusDot.className = 'status-dot offline';
  statusText.textContent = '❌ Bridge offline — run start.bat first';
  bridgeStatus.textContent = '● Offline';
  bridgeStatus.style.color = '#f87171';
  btnBridge.textContent = '▶ START BRIDGE';
  btnBridge.className = 'btn btn-start';
}

btnBridge.addEventListener('click', async () => {
  if (!bridgeRunning) {
    btnBridge.textContent = '⏳ Connecting...';
    btnBridge.className = 'btn btn-connecting';
    btnBridge.disabled = true;
    for (let i = 0; i < 10; i++) {
      await sleep(500);
      try {
        const resp = await fetch(`${BRIDGE_URL}/status`, { signal: AbortSignal.timeout(1000) });
        if (resp.ok) {
          const data = await resp.json();
          setOnline(data);
          btnBridge.disabled = false;
          return;
        }
      } catch {}
    }
    btnBridge.textContent = '▶ START BRIDGE';
    btnBridge.className = 'btn btn-start';
    btnBridge.disabled = false;
    alert('Bridge not responding.\n\nMake sure bridge_server.py is running:\n  double-click start.bat\n\nThen click START BRIDGE again.');
  } else {
    try {
      await fetch(`${BRIDGE_URL}/stop`, { method: 'POST', signal: AbortSignal.timeout(2000) });
    } catch {}
    setOffline();
  }
});

btnYoutube.addEventListener('click', () => {
  browser.tabs.create({ url: 'https://studio.youtube.com' });
  window.close();
});

btnUpload.addEventListener('click', async () => {
  if (!bridgeRunning) {
    alert('Start the bridge first!');
    return;
  }
  try {
    btnUpload.textContent = '⏳ Sending...';
    btnUpload.disabled = true;
    await fetch(`${BRIDGE_URL}/command/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'navigate',
        params: { url: 'https://studio.youtube.com' }
      })
    });
    btnUpload.textContent = '✅ Sent!';
    setTimeout(() => {
      btnUpload.textContent = '🎬 Upload Day 1';
      btnUpload.disabled = false;
    }, 2000);
  } catch (e) {
    btnUpload.textContent = '❌ Failed';
    btnUpload.disabled = false;
  }
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
