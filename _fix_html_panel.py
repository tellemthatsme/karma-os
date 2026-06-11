with open('C:/karma/live-desktop.html', 'r', encoding='utf-8') as f:
    html = f.read()

media_panel = '''      <!-- MEDIA HUB -->\r\n      <div class="p media-hub" style="flex-shrink:0">\r\n        <div class="pt" style="color:#ff4d00"><span class="d" style="background:#ff4d00"></span>Media Hub<span style="margin-left:auto;font-size:7px;color:var(--muted)">14 videos</span></div>\r\n        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">\r\n          <div class="cp" style="cursor:pointer;font-size:8px" onclick="window.open('https://youtube.com/@tellemthatsme69','_blank')"><span style="color:#ff0000">\U0001f3ac</span> YouTube <span class="sy">5 subs</span></div>\r\n          <div class="cp" style="cursor:pointer;font-size:8px" onclick="window.open('https://facebook.com/tellemthatsme69','_blank')"><span style="color:#1877f2">\U0001f4d8</span> FB <span class="sy">3.9K</span></div>\r\n          <div class="cp" style="cursor:pointer;font-size:8px" onclick="window.open('https://tiktok.com/@tellemthatsme69','_blank')"><span style="color:#00f2ea">\U0001f3b5</span> TikTok</div>\r\n        </div>\r\n        <div id="media-video-list" style="display:flex;flex-direction:column;gap:3px;max-height:120px;overflow:auto"></div>\r\n        <div style="display:flex;gap:4px;margin-top:6px">\r\n          <button onclick="window.open('file:///C:/Users/karma/TELLLEMTHATSME_SOCIAL_MEDIA_DASHBOARD.html','_blank')" class="qb" style="flex:1;min-width:0;padding:5px 8px;font-size:7px">\U0001f4ca Dashboard</button>\r\n          <button onclick="window.open('file:///C:/Users/karma/TELLLEMTHATSME_THUMBNAIL_GENERATOR.html','_blank')" class="qb" style="flex:1;min-width:0;padding:5px 8px;font-size:7px">\U0001f5bc\ufe0f Thumbnails</button>\r\n        </div>\r\n      </div>\r\n'''

marker = '<!-- API Chart -->'
if marker in html:
    html = html.replace(marker, media_panel + '      ' + marker, 1)
    print("OK: Inserted Media Hub panel before API Chart section")
else:
    print("WARN: Could not find '<!-- API Chart -->' marker")

with open('C:/karma/live-desktop.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("DONE: live-desktop.html media panel inserted")
