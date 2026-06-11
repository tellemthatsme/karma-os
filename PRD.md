# PRD — TELLLEMTHATSME Music Release & Monetization System

**Product:** TELLLEMTHATSME Music Project  
**Artist:** Brendan Foots (tellemthatsme)  
**Version:** 1.0  
**Status:** Live / In Deployment

---

## 1. Product Overview

### 1.1 Vision
Turn 16 original hip-hop tracks from TELLLEMTHATSME into a sustainable music revenue stream — YouTube monetization, streaming royalties, social media presence, and AI-powered automation.

### 1.2 Core Value Proposition
- 16 original tracks ready for release
- Dual YouTube channel strategy (main + second channel)
- Complete copy-paste posting system with no daily decision-making
- AI Browser Bridge for automated uploads via any AI model
- Revenue tracking dashboard for YPP progress monitoring

### 1.3 Target Audience
- Primary: Hip-hop listeners on YouTube, Spotify, Apple Music
- Secondary: Facebook group communities, Instagram/TikTok short-form viewers
- Personal: Dedicated to Leah, Ryan, and Jess (artist's children)

---

## 2. Track Inventory

### 2.1 All 16 Tracks

| # | Track | File | Day | Channel |
|---|-------|------|-----|---------|
| 1 | EVERY MORNING WHEN I WAKE UP | Every morning when I wake up.mp4 | Mon 12PM | Both |
| 2 | DONT RUSH ME | dont rush me.mp4 | Tue 6PM | Both |
| 3 | I LIVE FOR YOU | i live for you.mp4 | Wed 12PM | Both |
| 4 | LIKE I MEANT TO DO | LIKE I MEANT TO DO.mp4 | Thu 6PM | Both |
| 5 | MY CHILDREN | my children.mp4 | Fri 12PM | Both |
| 6 | WEATHER YOU CAN DO | weather you can do.mp4 | Sat 2PM | Both |
| 7 | I CANT BE HIM | i cant be him.mp4 | Sun 12PM | Both |
| 8 | TELLEMTHATSME | tellemtrhatsme.mp4 | Mon 6PM | Both |
| 9 | EVIL PAST | evil past.mp4 | Tue 12PM | Both |
| 10 | JUST DRILL ME | just drill me.mp4 | Wed 6PM | Both |
| 11 | WOODS | woods.mp4 | Thu 12PM | Both |
| 12 | NO CHEATS | no cheats.mp4 | Fri 6PM | Both |
| 13 | TILL I'M DONE | till im done.mp4 | Sat 2PM | Both |
| 14 | AI FIVE | ai five.mp4 | Sun 12PM | Both |
| 15 | SINCE I WAS YOUNG | since i was young.mp4 | Mon 6PM | Both |
| 16 | EVERY MORNING (MV) | Every morning when I wake up.mp4 | Tue 12PM | Both |

### 2.2 Key Tracks (Personal Narrative Arc)

| Track | Theme | Dedication |
|-------|-------|------------|
| EVERY MORNING WHEN I WAKE UP | Daily resilience, morning grind | Kids + Love of my life |
| LIKE I'M MEANT TO DO | Heartbreak & recovery | Six-year relationship aftermath |
| MY CHILDREN | Parental alienation | Leah, Ryan, Jess |
| WEATHER YOU CAN DO | Resilience through any storm | Leah, Ryan, Jess |
| EVERY MORNING (MV) | Visual story of daily resilience | Kids + Love of my life |

---

## 3. Functional Requirements

### 3.1 Posting System

**FR-1** Daily posting board must show exactly one track per day for 16 days  
**FR-2** Each track must have pre-written description, tags, and pinned comment  
**FR-3** Copy buttons must put content on clipboard for YouTube Studio paste  
**FR-4** Checklist must track: main channel upload, second channel upload, description copy, tags copy  
**FR-5** Progress must persist across sessions (localStorage)  
**FR-6** Day auto-advances when all tasks are complete

### 3.2 Revenue Dashboard

**FR-7** Must track YPP progress (subs, watch hours, uploads)  
**FR-8** Must show estimated streaming revenue at scale  
**FR-9** Must include agency pricing & service packages  
**FR-10** Must show money earned to date

### 3.3 AI Browser Bridge

**FR-11** Must run as local server on 127.0.0.1:9876  
**FR-12** Chrome extension (MV3) + Firefox extension (MV2)  
**FR-13** Must support: navigate, click, type, extract, screenshot, evaluate, upload_video  
**FR-14** Extension popup must have one-button START/STOP for bridge connection  
**FR-15** Background service worker polls bridge every 3 seconds  
**FR-16** Can upload videos to YouTube Studio with full metadata

### 3.4 Social Media Kit

**FR-17** Automation hub must show status overview of all operations  
**FR-18** Content factory must generate social posts from any track  
**FR-19** Agency toolkit must provide service pricing and client management

---

## 4. System Architecture

### 4.1 Component Diagram

```
User (Brendan)
  |
  |-- launch/DAILY_POSTING_BOARD.html  (what to post today)
  |-- media/TELLLEMTHATSME_SOCIAL_MEDIA_DASHBOARD.html  (full 16-track hub)
  |-- media/REVENUE_DASHBOARD.html  (money tracker)
  |
  |-- AI Browser Bridge (extension popup)
  |     |
  |     +-- bridge_server.py (:9876)
  |     +-- Chrome/Firefox extension -> your real browser
  |
  |-- SOCIAL_MEDIA_KIT/
  |     +-- automation_hub.py  (status overview)
  |     +-- content_factory.py  (post generator)
  |     +-- agency_toolkit.py  (pricing)
  |
  +-- YouTube Studio (studio.youtube.com)
  +-- Facebook Groups
  +-- Instagram / TikTok
```

### 4.2 Data Flow

```
Content Creation:
  Track recorded -> MP4 exported -> Upload_pack created -> Dashboard updated

Daily Posting Flow:
  Open Posting Board -> See Day X -> Copy Description -> 
  Paste into YouTube Studio -> Upload video -> Publish -> 
  Mark checkbox -> Move to next day

AI Automation Flow:
  AI sends command -> POST /command/send ->
  Extension polls GET /command/poll ->
  Extension executes in browser ->
  Extension POSTs result back ->
  AI polls GET /result/<id>
```

---

## 5. User Stories

### 5.1 Daily Upload (Manual)
"As an artist, I want to open one page and know exactly what to post today — copy, paste, done."

### 5.2 AI-Powered Upload
"As an artist, I want to tell my AI 'upload track 5' and have it happen in my browser without me touching anything."

### 5.3 Revenue Tracking
"As an artist, I want to see my YPP progress and know exactly how much money I'm making."

### 5.4 Social Media Management
"As an artist, I want automated social posts so my content stays active even when I'm not online."

---

## 6. Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| YouTube Subs (YPP) | 1,000 | 90 days |
| Watch Hours (YPP) | 4,000 | 90 days |
| Total Uploads | 32 (16 x 2 channels) | 16 days |
| Streaming Revenue | $50+/month | 6 months |
| Facebook Group Reach | 10,000+ | 30 days |

---

## 7. Technical Requirements

### 7.1 Platforms
- **Browser:** Chrome (primary), Firefox (secondary)
- **OS:** Windows 10/11
- **Python:** 3.8+
- **YouTube:** YouTube Studio (studio.youtube.com)

### 7.2 Files & Storage
- Video files: `Videos/New folder/`
- Guides: `guides/` folder (setup guides, marketing strategy, tool references)
- Launch assets: `launch/` folder (posting board, social posts, checklists, session log)
- Scripts: `scripts/` folder (automation scripts, narration generator, Shorts cutter)
- AI News: `ai_news/` folder (channel strategy, video scripts)
- Dashboards: `media/` folder (HTML dashboards, UI files)
- Extension: `browser_extension/`

### 7.3 Dependencies
- Python standard library only (server)
- No external npm/PyPI packages required for core functionality
- Browser: Chrome 103+ / Firefox 90+

---

## 8. Future Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | 16-track dashboard + posting board | DONE |
| 2 | AI Browser Bridge extension | DONE |
| 3 | Revenue dashboard | DONE |
| 4 | Social media automation | DONE |
| 5 | YouTube Shorts pipeline | PLANNED |
| 6 | Spotify/Apple Music distribution | PLANNED |
| 7 | AI music video generation | PLANNED |

---

## 9. Appendix

- All dedications are plain text (no emoji prefixes) matching the style of Like I'm Meant To Do
- Kid-related tracks (3, 4, 5, 14, 16) all carry dedications to Leah, Ryan, and Jess
- Every Morning tracks carry dual dedications: kids + love of my life
