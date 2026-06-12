---
name: telllem-music
description: TELLLEMTHATSME music release system — 16 tracks, dedications, posting board, revenue, and cross-platform strategy.
---

# TELLLEMTHATSME Music System

## Artist

**Brendan Foots** (tellemthatsme) — 16 original hip-hop/trap tracks. Dedicated to Leah, Ryan, and Jess.

## 16-Track Roster

| # | Track | Theme | Dedication |
|---|-------|-------|------------|
| 1 | EVERY MORNING WHEN I WAKE UP | Daily resilience | Kids + Love of my life |
| 2 | DONT RUSH ME | Patience | — |
| 3 | I LIVE FOR YOU | Devotion | Leah, Ryan, Jess |
| 4 | LIKE I MEANT TO DO | Heartbreak & recovery | Six-year relationship aftermath |
| 5 | MY CHILDREN | Parental alienation | Leah, Ryan, Jess |
| 6 | WEATHER YOU CAN DO | Resilience through storms | Leah, Ryan, Jess |
| 7 | I CANT BE HIM | Self-identity | — |
| 8 | TELLEMTHATSME | Self-branding | — |
| 9 | EVIL PAST | Overcoming past | — |
| 10 | JUST DRILL ME | Determination | — |
| 11 | WOODS | Isolation/reflection | — |
| 12 | NO CHEATS | Authenticity | — |
| 13 | TILL I'M DONE | Persistence | — |
| 14 | AI FIVE | Tech/AI theme | — |
| 15 | SINCE I WAS YOUNG | Origin story | — |
| 16 | EVERY MORNING (MV) | Music video | Kids + Love of my life |

## Dual Channel Strategy

- **Main channel**: Primary uploads, monetization target
- **Second channel**: Mirror uploads for reach
- **16 tracks × 2 channels = 32 total uploads** over 16 days

## Posting Board

File: `launch/DAILY_POSTING_BOARD.html`
- Shows exactly one track per day
- Pre-written description, tags, pinned comment
- Copy buttons for YouTube Studio paste
- Checklist: main upload, second upload, description, tags
- Progress persists via localStorage
- Auto-advances when all tasks complete

## YPP Requirements (90-day target)

| Metric | Target |
|--------|--------|
| Subscribers | 1,000 |
| Watch hours | 4,000 |
| Uploads | 32 (16 × 2 channels) |

## Revenue Tracking

File: `media/REVENUE_DASHBOARD.html`
- YPP progress bars (subs, watch hours, uploads)
- Streaming revenue estimates
- Agency pricing & service packages
- Money earned to date

## Kid-Related Tracks Policy

Tracks 1, 3, 4, 5, 6, 16 have child/family references.
**DO NOT mark as "Made for Kids"** — content is nostalgic/adult reflection, not children's entertainment.

## Social Media Platforms

| Platform | Strategy | Automation |
|----------|----------|-----------|
| YouTube | 32 uploads + Community posts | Bridge upload_video |
| Facebook | Groups + Profile posts | Bridge navigate/type |
| X/Twitter | Posts + threads | Bridge compose |
| Instagram | Captions + Stories | Manual (via bridge navigate) |
| TikTok | Shorts + captions | Manual |

## Hash Tags

Always include: `#TellLemThatsMe #HipHop`
Context-dependent: `#NewMusic #AustralianRap #OriginalMusic #Rap #Trap`

## Command Center

File: `media/TELLLEMTHATSME_COMMAND_CENTER.html` (179 KB, 22 tabs)
Tabs include: Posting Board, Revenue, AI Research, Bridge Control, Track List, Platform Status.

## Common Queries

- **"What's today's track?"** → Check posting board day counter
- **"Post track X"** → Use SOCIAL_POSTER.py or manual copy-paste
- **"Revenue status"** → Read REVENUE_DASHBOARD.html
- **"All dedications"** → Tracks 1, 3, 4, 5, 6, 16 → Leah, Ryan, Jess
- **"Upload video"** → Bridge upload_video (16-step flow)
