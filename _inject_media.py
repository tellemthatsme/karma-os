import re

# ═══════════════════════════════════════════
# 1. Update live-desktop.html — Add media panel
# ═══════════════════════════════════════════
with open('C:/karma/live-desktop.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add media panel BEFORE the API Chart section in the right sidebar
# Find the API Chart panel in aside.rc
media_panel = '''      <!-- MEDIA HUB -->\r\n      <div class="p media-hub" style="flex-shrink:0">\r\n        <div class="pt" style="color:#ff4d00"><span class="d" style="background:#ff4d00"></span>Media Hub<span style="margin-left:auto;font-size:7px;color:var(--muted)">14 videos</span></div>\r\n        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">\r\n          <div class="cp" style="cursor:pointer;font-size:8px" onclick="window.open('https://youtube.com/@tellemthatsme69','_blank')"><span style="color:#ff0000">\\ud83c\\udfac</span> YouTube <span class="sy">5 subs</span></div>\r\n          <div class="cp" style="cursor:pointer;font-size:8px" onclick="window.open('https://facebook.com/tellemthatsme69','_blank')"><span style="color:#1877f2">\\ud83d\\udcd8</span> FB <span class="sy">3.9K</span></div>\r\n          <div class="cp" style="cursor:pointer;font-size:8px" onclick="window.open('https://tiktok.com/@tellemthatsme69','_blank')"><span style="color:#00f2ea">\\ud83c\\udfb5</span> TikTok</div>\r\n        </div>\r\n        <div id="media-video-list" style="display:flex;flex-direction:column;gap:3px;max-height:120px;overflow:auto"></div>\r\n        <div style="display:flex;gap:4px;margin-top:6px">\r\n          <button onclick="window.open('file:///C:/Users/karma/TELLLEMTHATSME_SOCIAL_MEDIA_DASHBOARD.html','_blank')" class="qb" style="flex:1;min-width:0;padding:5px 8px;font-size:7px">\\ud83d\\udcca Dashboard</button>\r\n          <button onclick="window.open('file:///C:/Users/karma/TELLLEMTHATSME_THUMBNAIL_GENERATOR.html','_blank')" class="qb" style="flex:1;min-width:0;padding:5px 8px;font-size:7px">\\ud83d\\uddbc\\ufe0f Thumbnails</button>\r\n        </div>\r\n      </div>\r\n'''

# Insert before the API CHART section
api_chart_marker = '      <!-- API CHART -->'
if api_chart_marker in html:
    html = html.replace(api_chart_marker, media_panel + api_chart_marker, 1)
    print("OK: Added Media Hub panel to live-desktop.html")
else:
    print("WARN: Could not find API CHART marker in live-desktop.html")

with open('C:/karma/live-desktop.html', 'w', encoding='utf-8') as f:
    f.write(html)

# ═══════════════════════════════════════════
# 2. Update live-desktop.css — Add media panel styles
# ═══════════════════════════════════════════
with open('C:/karma/live-desktop.css', 'r', encoding='utf-8') as f:
    css = f.read()

media_css = '''
/* ── Media Hub ── */
.media-hub { background: linear-gradient(135deg, rgba(255,77,0,.06), rgba(255,215,0,.04)); border-color: rgba(255,77,0,.15); }
.media-vid { display: flex; align-items: center; gap: 6px; padding: 4px 7px; border-radius: 5px; background: rgba(255,255,255,.02); border-left: 2px solid #ff4d00; cursor: pointer; transition: all .2s; font-size: 8px; }
.media-vid:hover { background: rgba(255,77,0,.08); transform: translateX(2px); }
.media-vid .vid-num { font-family: 'Orbitron', monospace; font-size: 7px; color: #ff4d00; background: rgba(255,77,0,.15); padding: 1px 4px; border-radius: 2px; flex-shrink: 0; }
.media-vid .vid-name { flex: 1; color: var(--text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.media-vid .vid-theme { font-size: 7px; color: var(--muted); flex-shrink: 0; }
'''

# Insert before the closing of the CSS (before the last animation or at the very end)
# Append after the last rule
css = css.rstrip() + '\n' + media_css
print("OK: Added media panel CSS styles")

with open('C:/karma/live-desktop.css', 'w', encoding='utf-8') as f:
    f.write(css)

# ═══════════════════════════════════════════
# 3. Update live-desktop.js — Add video data and render function
# ═══════════════════════════════════════════
with open('C:/karma/live-desktop.js', 'r', encoding='utf-8') as f:
    js = f.read()

media_js = '''

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
    '<div class="media-vid" onclick="navigator.clipboard.writeText(\\'' + v.n + ' \\u2014 tellemthatsme (Official Music Video)\\').then(()=>af({t:\\'success\\',i:\\'\\ud83c\\udfac\\',m:\\'Copied: ' + v.n.replace(/'/g, "\\\\'") + '\\'}))">' +
    '<span class="vid-num">' + (i + 1) + '</span>' +
    '<span class="vid-name">' + v.n + '</span>' +
    '<span class="vid-theme">' + v.t + '</span>' +
    '</div>'
  ).join('');
}

// Render on load
renderMediaVideos();
'''

# Insert before the closing of the JS file
js = js.rstrip() + '\n' + media_js
print("OK: Added media hub JS logic")

with open('C:/karma/live-desktop.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("DONE: All live-desktop files updated successfully")
