import re

with open('C:/karma/karma-os-ultimate.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add SOCIAL button to topbar (after HERMES, before Settings)
old_topbar = '<button class="tb-btn" onclick="openM(\'hermes-m\')"><i class="fas fa-paper-plane"></i> HERMES</button>\r\n        <button class="tb-btn" onclick="openM(\'settings-m\')">'
new_topbar = '<button class="tb-btn" onclick="openM(\'hermes-m\')"><i class="fas fa-paper-plane"></i> HERMES</button>\r\n        <button class="tb-btn" onclick="openM(\'social-m\')" style="border-color:rgba(255,77,0,.35)"><i class="fas fa-fire"></i> SOCIAL</button>\r\n        <button class="tb-btn" onclick="openM(\'settings-m\')">'

# Also try LF-only
old_topbar_lf = old_topbar.replace('\r\n', '\n')
new_topbar_lf = new_topbar.replace('\r\n', '\n')

if old_topbar in content:
    content = content.replace(old_topbar, new_topbar, 1)
    print("OK: Added SOCIAL button to topbar (CRLF)")
elif old_topbar_lf in content:
    content = content.replace(old_topbar_lf, new_topbar_lf, 1)
    print("OK: Added SOCIAL button to topbar (LF)")
else:
    print("WARN: Could not find topbar insertion point")

# 2. Add Social link to Quick Launch (before BOOST)
old_ql = '<a href="#" class="qb" onclick="triggerBoost();return false"><i class="fas fa-rocket" style="color:var(--warn)"></i>BOOST</a>'
new_ql = '<a href="#" class="qb" onclick="openM(\'social-m\');return false"><i class="fas fa-fire" style="color:#ff4d00"></i>Social</a>\r\n          ' + old_ql
new_ql_lf = new_ql.replace('\r\n', '\n')
old_ql_lf = old_ql

if old_ql in content:
    content = content.replace(old_ql, new_ql, 1)
    print("OK: Added Social to Quick Launch (CRLF)")
elif old_ql_lf in content:
    content = content.replace(old_ql_lf, new_ql_lf, 1)
    print("OK: Added Social to Quick Launch (LF)")
else:
    print("WARN: Could not find Quick Launch BOOST button")

# 3. Add Social Media modal HTML after settings modal, before toast
social_modal = '''
<!-- SOCIAL MEDIA HUB -->
<div class="modal" id="social-m">
  <div class="mbox" style="max-width:780px;max-height:92vh">
    <div class="mhdr"><div class="mtitle" style="color:#ff4d00"><i class="fas fa-fire" style="color:#ff4d00"></i>TELLLEMTHATSME \\u00b7 SOCIAL MEDIA HUB</div><button class="mclose" onclick="closeM('social-m')">\\u2715</button></div>
    <div class="mbody" style="gap:10px">
      <!-- STATS BAR -->
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div class="p sc" style="flex:1;min-width:90px;padding:10px 6px"><div class="sv" style="font-size:20px;background:linear-gradient(135deg,#ff4d00,#ffd700)">14</div><div class="sl">Music Videos</div></div>
        <div class="p sc" style="flex:1;min-width:90px;padding:10px 6px"><div class="sv" style="font-size:20px;background:linear-gradient(135deg,#ff0000,#ff4d00)">5</div><div class="sl">YouTube Subs</div></div>
        <div class="p sc" style="flex:1;min-width:90px;padding:10px 6px"><div class="sv" style="font-size:20px;background:linear-gradient(135deg,#1877f2,#00d4ff)">3.9K</div><div class="sl">FB Likes</div></div>
        <div class="p sc" style="flex:1;min-width:90px;padding:10px 6px"><div class="sv" style="font-size:20px;background:linear-gradient(135deg,#ffd700,#ff4d00)">404+</div><div class="sl">Total Songs</div></div>
      </div>

      <!-- SOCIAL PLATFORMS -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
        <div class="p" style="text-align:center;padding:10px 6px;cursor:pointer" onclick="window.open('https://youtube.com/@tellemthatsme69','_blank')">
          <div style="font-size:20px">\\ud83c\\udfac</div><div style="font-size:8px;color:var(--muted);margin-top:4px">YouTube</div><div style="font-size:10px;color:#ff0000;font-weight:600">@tellemthatsme69</div>
        </div>
        <div class="p" style="text-align:center;padding:10px 6px;cursor:pointer" onclick="window.open('https://facebook.com/tellemthatsme69','_blank')">
          <div style="font-size:20px">\\ud83d\\udcd8</div><div style="font-size:8px;color:var(--muted);margin-top:4px">Facebook</div><div style="font-size:10px;color:#1877f2;font-weight:600">tellemthatsme69</div>
        </div>
        <div class="p" style="text-align:center;padding:10px 6px;cursor:pointer" onclick="window.open('https://instagram.com/tellemthatsme69','_blank')">
          <div style="font-size:20px">\\ud83d\\udcf8</div><div style="font-size:8px;color:var(--muted);margin-top:4px">Instagram</div><div style="font-size:10px;color:#e4405f;font-weight:600">IG Reels</div>
        </div>
        <div class="p" style="text-align:center;padding:10px 6px;cursor:pointer" onclick="window.open('https://tiktok.com/@tellemthatsme69','_blank')">
          <div style="font-size:20px">\\ud83c\\udfb5</div><div style="font-size:8px;color:var(--muted);margin-top:4px">TikTok</div><div style="font-size:10px;color:#00f2ea;font-weight:600">3-5x/day</div>
        </div>
      </div>

      <!-- VIDEO CATALOG -->
      <div class="p" style="flex-shrink:0">
        <div class="pt" style="color:#ff4d00"><span class="d" style="background:#ff4d00"></span>\\ud83c\\udfac Music Video Catalog \\u00b7 14 Videos<span style="margin-left:auto;font-size:7px;color:var(--muted)">Click to copy title</span></div>
        <div id="social-video-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:5px;max-height:240px;overflow:auto"></div>
      </div>

      <!-- CONTENT STRATEGY -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="p">
          <div class="pt" style="color:var(--ac3)"><span class="d" style="background:var(--ac3)"></span>\\ud83d\\udcf1 Content Strategy</div>
          <div style="font-size:8px;color:rgba(255,255,255,.7);line-height:1.7">
            <div style="color:var(--ac);font-weight:600;margin-bottom:4px">1 video = 30+ pieces of content</div>
            <div>\\ud83c\\udfac YouTube: Long-form + 3-5 Shorts daily</div>
            <div>\\ud83d\\udcf8 IG: 2-3 Reels daily + lyric carousels</div>
            <div>\\ud83c\\udfb5 TikTok: 3-5x/day with trending sounds</div>
            <div>\\ud83d\\udcd8 FB: Clips + group shares + live sessions</div>
          </div>
        </div>
        <div class="p">
          <div class="pt" style="color:var(--warn)"><span class="d" style="background:var(--warn)"></span>\\ud83d\\udcc5 Upload Schedule</div>
          <div style="font-size:8px;color:rgba(255,255,255,.7);line-height:1.7">
            <div style="color:var(--warn);font-weight:600;margin-bottom:4px">12-Day Release Plan</div>
            <div>\\ud83c\\udf05 Morning (8-10AM): Short #1 + engage</div>
            <div>\\u2600\\ufe0f Midday (12-2PM): Main video + cross-post</div>
            <div>\\ud83c\\udf19 Evening (6-9PM): Short #3 + community</div>
            <div>\\ud83d\\udcca Peak: Fri-Sun 12-3PM \\u00b7 Weekdays 6-9PM</div>
          </div>
        </div>
      </div>

      <!-- SHORTS TRACKER -->
      <div class="p">
        <div class="pt" style="color:var(--ac2)"><span class="d" style="background:var(--ac2)"></span>\\u26a1 Shorts Engine<span style="margin-left:auto;font-size:7px;color:var(--ac3)">70 shorts planned \\u00b7 5 per video</span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <button onclick="triggerN8NWorkflow('ash-lee-post')" style="background:rgba(179,71,255,.12);border:1px solid rgba(179,71,255,.25);color:var(--ac2);border-radius:5px;padding:6px 12px;font-size:8px;font-family:'Orbitron',monospace;cursor:pointer;letter-spacing:.5px">\\ud83d\\ude80 LAUNCH SHORTS</button>
          <button onclick="window.open('file:///C:/Users/karma/TELLLEMTHATSME_SOCIAL_MEDIA_DASHBOARD.html','_blank')" style="background:rgba(255,77,0,.12);border:1px solid rgba(255,77,0,.25);color:#ff4d00;border-radius:5px;padding:6px 12px;font-size:8px;font-family:'Orbitron',monospace;cursor:pointer;letter-spacing:.5px">\\ud83d\\udcca FULL DASHBOARD</button>
          <button onclick="window.open('file:///C:/Users/karma/TELLLEMTHATSME_THUMBNAIL_GENERATOR.html','_blank')" style="background:rgba(255,215,0,.12);border:1px solid rgba(255,215,0,.25);color:#ffd700;border-radius:5px;padding:6px 12px;font-size:8px;font-family:'Orbitron',monospace;cursor:pointer;letter-spacing:.5px">\\ud83d\\uddbc\\ufe0f THUMBNAILS</button>
        </div>
      </div>
    </div>
  </div>
</div>
'''

# Insert before <div id="toast">
toast_marker = '<div id="toast"></div>'
toast_marker_lf = toast_marker
if toast_marker in content:
    content = content.replace(toast_marker, social_modal + toast_marker, 1)
    print("OK: Added Social Media modal HTML")
elif toast_marker_lf in content:
    content = content.replace(toast_marker_lf, social_modal + toast_marker_lf, 1)
    print("OK: Added Social Media modal HTML (LF)")
else:
    print("WARN: Could not find toast div for modal insertion")

# 4. Add video catalog JS and copyText function before closing </script>
# Find the copyText function or add video data near the end of the script
video_js = '''
// ══════════════════════════════════════════════
// SOCIAL MEDIA HUB — Video Catalog & Copy
// ══════════════════════════════════════════════
const TTM_VIDEOS = [
  {n:'Dont Rush Me', f:'dont rush me.mp4', t:'Patience & Persistence'},
  {n:'Every Morning When I Wake Up', f:'Every morning when I wake up.mp4', t:'Daily Motivation & Devotion'},
  {n:'My Evil Past', f:'evil past.mp4', t:'Redemption & Growth'},
  {n:'I Cant Be Him', f:'i cant be him.mp4', t:'Identity & Self-Worth'},
  {n:'I Live For You', f:'i live for you.mp4', t:'Devotion & Purpose'},
  {n:'Just Drill Me', f:'just drill me.mp4', t:'Hard Drill Energy'},
  {n:'Like I Meant To Do', f:'LIKE I MEANT TO DO.mp4', t:'Confidence & Parental Alienation'},
  {n:'My Children', f:'my children.mp4', t:'Family & Legacy'},
  {n:'No Cheats', f:'no cheats.mp4', t:'Integrity & Authenticity'},
  {n:'Tellemthatsme', f:'tellemtrhatsme.mp4', t:'Signature Anthem'},
  {n:'Till Im Done', f:'till im done.mp4', t:'Party & Energy'},
  {n:'Weather You Can Do', f:'weather you can do.mp4', t:'Resilience & Endurance'},
  {n:'Woods', f:'music_videomp4(4).mp4', t:'Reflection & Journey'},
  {n:'Every Morning (MV Version)', f:'Every morning when I wake up.mp4', t:'Music Video Visual'},
];

function renderSocialVideos() {
  const grid = document.getElementById('social-video-grid');
  if (!grid) return;
  grid.innerHTML = TTM_VIDEOS.map((v, i) =>
    '<div style="background:rgba(255,77,0,.06);border:1px solid rgba(255,77,0,.15);border-radius:6px;padding:8px 10px;cursor:pointer;transition:all .2s" ' +
    'onmouseenter="this.style.borderColor=\'rgba(255,77,0,.4)\'" onmouseleave="this.style.borderColor=\'rgba(255,77,0,.15)\'" ' +
    'onclick="navigator.clipboard.writeText(\'' + v.n + ' — tellemthatsme (Official Music Video)\').then(()=>toast(\'Copied: ' + v.n.replace(/'/g, "\\\\'") + '\'))">' +
    '<div style="display:flex;align-items:center;gap:6px">' +
    '<span style="font-family:Orbitron,monospace;font-size:9px;color:#ff4d00;background:rgba(255,77,0,.15);padding:1px 5px;border-radius:3px">' + (i+1) + '</span>' +
    '<span style="font-size:10px;font-weight:600;color:var(--text)">' + v.n + '</span></div>' +
    '<div style="font-size:7px;color:var(--muted);margin-top:3px">' + v.t + '</div>' +
    '<div style="font-size:7px;color:var(--ac);margin-top:2px;font-family:JetBrains Mono,monospace">' + v.f + '</div>' +
    '</div>'
  ).join('');
}

// Social media voice commands
const SOCIAL_COMMANDS = {
  'social': 'Open social media hub',
  'social media': 'Open social media hub',
  'videos': 'Show video catalog',
  'music videos': 'Show video catalog',
  'shorts': 'Show shorts plan',
  'youtube': 'Open YouTube channel',
  'tiktok': 'Open TikTok',
  'instagram': 'Open Instagram',
  'content calendar': 'Show upload schedule',
  'upload schedule': 'Show upload schedule',
};

// Add social commands to VOICE_COMMANDS
Object.assign(VOICE_COMMANDS, SOCIAL_COMMANDS);

// Add social video rendering when modal opens
const origOpenM = window.openM;
if (typeof openM === 'function') {
  const _origOpenM = openM;
  window.openM = function(id) {
    _origOpenM(id);
    if (id === 'social-m') renderSocialVideos();
  };
}
'''

# Insert before the closing </script> tag - find the last occurrence
script_close = '</script>'
last_script_idx = content.rfind(script_close)
if last_script_idx > 0:
    content = content[:last_script_idx] + video_js + '\n' + content[last_script_idx:]
    print("OK: Added video catalog JS and social commands")
else:
    print("WARN: Could not find closing </script> tag")

# 5. Add social/media commands to handleVoiceCmd
# Find the existing social post handler and add more commands after it
social_handler_old = "// Post content\r\n  if (t.includes('post') && (t.includes('content') || t"
social_handler_lf = social_handler_old.replace('\r\n', '\n')

# Add social-specific commands before the existing post content handler
social_cmds = '''  // Social media hub
  if (t.includes('social') && !t.includes('post')) { openM('social-m'); return reply('Social Media Hub — 14 music videos loaded'); }
  if (t.includes('video') || t.includes('music video')) { openM('social-m'); return reply('Video catalog — ' + TTM_VIDEOS.length + ' music videos'); }
  if (t.includes('shorts')) { openM('social-m'); return reply('Shorts Engine — 70 shorts planned, 5 per video'); }
  if (t.includes('youtube')) { window.open('https://youtube.com/@tellemthatsme69', '_blank'); return reply('Opening YouTube channel'); }
  if (t.includes('tiktok')) { window.open('https://tiktok.com/@tellemthatsme69', '_blank'); return reply('Opening TikTok'); }
  if (t.includes('instagram')) { window.open('https://instagram.com/tellemthatsme69', '_blank'); return reply('Opening Instagram'); }
  if (t.includes('content calendar') || t.includes('upload schedule')) { openM('social-m'); return reply('Content strategy — 12-day release plan loaded'); }

'''

# Find a good insertion point - before the "// Post content" comment
post_content_marker = "  // Post content\r\n  if (t.includes('post')"
post_content_marker_lf = "  // Post content\n  if (t.includes('post')"

if post_content_marker in content:
    content = content.replace(post_content_marker, social_cmds + post_content_marker, 1)
    print("OK: Added social media voice commands (CRLF)")
elif post_content_marker_lf in content:
    content = content.replace(post_content_marker_lf, social_cmds + post_content_marker_lf, 1)
    print("OK: Added social media voice commands (LF)")
else:
    print("WARN: Could not find post content handler for command insertion")

# Write the modified file
with open('C:/karma/karma-os-ultimate.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("DONE: karma-os-ultimate.html updated successfully")
