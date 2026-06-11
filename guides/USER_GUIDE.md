# USER_GUIDE.md — User Guide & Daily Operations

## TellLemThatsMe Music Monetization System

---

## 1. Quick Start

### Step 1: Start the Bridge (for AI uploads)
```
Double-click: browser_extension/start.bat
```
Or:
```
cd browser_extension
python bridge_server.py
```

### Step 2: Install the Extension
1. Open Chrome → `chrome://extensions`
2. Toggle "Developer mode" ON
3. Click "Load unpacked"
4. Select `browser_extension/chrome/`
5. Click the puzzle icon → Pin the extension

### Step 3: Start Your Daily Routine
```
Open: DAILY_POSTING_BOARD.html
Open: https://studio.youtube.com
```

---

## 2. Daily Routine (15 minutes)

Every day, your routine looks like this:

```
+---------+----------------------------------------+----------+
| Step    | Action                                 | Time     |
+---------+----------------------------------------+----------+
| 1       | Open DAILY_POSTING_BOARD.html          | 30 sec   |
| 2       | Open studio.youtube.com                 | 30 sec   |
| 3       | Copy Title from board                   | 30 sec   |
| 4       | Paste into YouTube Studio (Title)       | 30 sec   |
| 5       | Copy Description from board             | 30 sec   |
| 6       | Paste into YouTube Studio (Desc)        | 30 sec   |
| 7       | Copy Tags from board                    | 30 sec   |
| 8       | Paste into YouTube Studio (Tags)        | 30 sec   |
| 9       | Copy Pinned Comment                     | 30 sec   |
| 10      | Paste into YouTube Studio (Comment)     | 30 sec   |
| 11      | Repeat for Channel 2                    | 2 min    |
| 12      | Check off both channels on board        | 30 sec   |
| 13      | Click "Mark Day Complete"               | 10 sec   |
+---------+----------------------------------------+----------+
|         | TOTAL                                  | ~8 min   |
+---------+----------------------------------------+----------+
```

### Pro Tip
Keep `DAILY_POSTING_BOARD.html` on the left half of your screen and YouTube Studio on the right. Copy → paste → done.

---

## 3. The 16-Day Upload Schedule

| Day | Track | Focus |
|-----|-------|-------|
| 1 | EVERY MORNING WHEN I WAKE UP | Daily grind, morning motivation — sets the tone |
| 2 | DONT RUSH ME | Patience anthem — good things take time |
| 3 | I LIVE FOR YOU | Dedication to kids — Leah, Ryan, Jess |
| 4 | LIKE I MEANT TO DO | Breaking free from the past |
| 5 | MY CHILDREN | Parental alienation, raw honesty |
| 6 | WEATHER YOU CAN DO | Resilience through any storm — dedicated to Leah, Ryan, and Jess |
| 7 | I CANT BE HIM | Identity — refusing to be someone you're not |
| 8 | TELLEMTHATSME | The anthem — the name, the statement |
| 9 | EVIL PAST | Confronting mistakes and turning them into fuel |
| 10 | JUST DRILL ME | Hard-hitting energy, drill vibes |
| 11 | WOODS | Deep reflection, navigating dark moments |
| 12 | NO CHEATS | Integrity — earning everything the right way |
| 13 | TILL I'M DONE | Persistence — never quitting until the end |
| 14 | AI FIVE | The future, technology, riding the wave |
| 15 | SINCE I WAS YOUNG | Journey from childhood dreams to reality |
| 16 | EVERY MORNING (MV) | Music video — daily resilience, dedication to kids |

**Each track uploads to BOTH channels.** That's 32 total uploads.

---

## 4. Using the AI Browser Bridge

### 4.1 Check if Bridge is Running
Click the extension icon. Green dot = online. Red dot = offline.

### 4.2 Start/Stop Bridge
Green button: **START BRIDGE** / **STOP BRIDGE**

### 4.3 Test Buttons
- **Open YouTube** — Navigates to YouTube Studio
- The bridge also works with any AI model that sends HTTP commands

### 4.4 Upload with AI
Tell an AI model (like Claude or ChatGPT):
```
I have a bridge server at localhost:9876. Upload track 3 to my channel.
```

The AI handles the rest.

---

## 5. Facebook Group Strategy

### Week 1–2 (Posting Phase)
- Join 3–5 music promotion groups per day
- Post each track's YouTube link with a short description
- Engage with other artists' posts

### Week 3+ (Community Building)
- Create your own Facebook group: "TellLemThatsMe Fam"
- Share behind-the-scenes content
- Ask for feedback on new tracks
- Run polls: "Which track should I make a video for?"

### Facebook Post Template
```
NEW TRACK: [TITLE] 🎵

[2-3 sentence description of the track]

Watch here: [YouTube Link]

What do you think? Drop a comment! 🔥
```

---

## 6. Social Media Daily Checklist

| Platform | Action | Time |
|----------|--------|------|
| YouTube | Upload track of the day | 8 min |
| YouTube | Post Shorts clip (30–60 sec) | 5 min |
| Facebook | Post in 3 groups | 5 min |
| Facebook | Reply to 5 comments | 3 min |
| Instagram | Share track link in story | 2 min |
| **Total** | | **~23 min** |

---

## 7. Weekly Tasks

### Every Sunday

### 1. Revenue Dashboard Update
- Open `REVENUE_DASHBOARD.html`
- Update: subscribers, watch hours, RPM
- Add any streaming revenue received

### 2. Content Performance Review
- Check YouTube Analytics
- Note which tracks performed best
- Plan Shorts content around top performers

### 3. Social Media Planning
- Schedule posts for the coming week
- Identify 5 new Facebook groups to join
- Reply to unanswered comments

### 4. AI Bridge Maintenance
- Check extension is still installed and working
- Restart bridge server if needed
- Clear old command queue (restart clears it)

---

## 8. Tools Reference Card

| Tool | What It Does | When to Use |
|------|-------------|-------------|
| `DAILY_POSTING_BOARD.html` | Day-by-day uploads, copy-paste, checklist | Daily |
| `REVENUE_DASHBOARD.html` | Track earnings, YPP progress, agency pricing | Weekly |
| `TELLLEMTHATSME_SOCIAL_MEDIA_DASHBOARD.html` | Full campaign management, Shorts, SEO, groups | Weekly |
| `TELLLEMTHATSME_THUMBNAIL_GENERATOR.html` | Generate thumbnails for tracks | Per track |
| `browser_extension/start.bat` | Start the AI bridge server | When using AI |
| Chrome Extension | AI controls your browser | When using AI |
| `PRD.md` | Product Requirements Document | Reference |
| `DEV_DOCS.md` | Developer documentation | Reference |
| `VALUATION_AUDIT.md` | Revenue valuation | Reference |
| `PROMPT.md` | AI prompt/command guide | When using AI |
| `USER_GUIDE.md` | This guide | Daily |

---

## 9. Troubleshooting

### "Bridge won't start"
- Make sure Python is installed: `python --version`
- If that fails, try: `python3 --version` or `py --version`
- Double-click `start.bat` — it auto-detects which Python to use

### "Extension shows red dot"
- Bridge server isn't running
- Double-click `start.bat` or run `python bridge_server.py`
- Wait 3 seconds — popup auto-checks every 3 seconds

### "Upload failed"
- Make sure you're logged into YouTube in Chrome
- YouTube Studio UI may have changed — try manual upload

### "Can't find a track"
- All tracks have named video files (e.g., "Every morning when I wake up.mp4", "dont rush me.mp4")
- Default folder: `C:\Users\karma\Videos\New folder\Media_Bank\youtubevids\`

### "Forgot what day I'm on"
- `DAILY_POSTING_BOARD.html` saves your progress
- The day counter shows current day / 16

---

## 10. After the 16 Days

Once all 16 tracks are uploaded to both channels:

1. **Keep posting** — upload Shorts clips from existing tracks
2. **Monitor revenue** — check YouTube Studio analytics weekly
3. **Grow the community** — keep engaging in Facebook groups
4. **Hit YPP targets** — 1,000 subs + 4,000 watch hours
5. **Apply for YPP** — once eligible, turn on monetization
6. **Distribute to streaming** — use DistroKid for Spotify, Apple Music, etc.
7. **Expand** — offer agency services with your system as the selling point

### Monthly Maintenance (After 16 Days)
| Task | Frequency |
|------|-----------|
| Check YouTube Analytics | Weekly |
| Post Shorts clips | 2–3x/week |
| Engage in Facebook groups | Daily (5 min) |
| Update revenue dashboard | Weekly |
| Check for new track ideas | Monthly |
| Audit bridge extension | Monthly |
