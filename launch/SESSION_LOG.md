# SESSION LOG — Complete Project Documentation

**Date:** June 10, 2026
**Status:** All tasks complete
**Artist:** Brendan Foots (tellemthatsme)

---

## Summary of Everything Built & Fixed

### New Files Created

| File | Purpose | Status |
|------|---------|--------|
| `launch/DAILY_POSTING_BOARD.html` | Daily upload command center — 16 tracks, copy-paste buttons, checklists, localStorage | DONE |
| `launch/ALL_SOCIAL_POSTS.md` | Social post library — 16 tracks x 3 styles x 5 platforms (X, FB Group, FB Profile, Instagram, TikTok) | DONE |
| `launch/LAUNCH_CHECKLIST.md` | 5-phase launch checklist with daily routine reference | DONE |
| `launch/SESSION_LOG.md` | This file — complete project documentation | DONE |
| `scripts/shorts_cutter.bat` | Cuts vertical 1080x1920 Shorts clips from all 16 tracks using ffmpeg | DONE |
| `scripts/generate_narration.bat` | Windows batch script generating 7 narration segments via edge-tts (en-AU-WilliamNeural) | DONE |
| `scripts/SOCIAL_POSTER.py` | Cross-platform posting automation via browser bridge | DONE |
| `guides/MCP_SETUP_GUIDE.md` | Claude Desktop / Cursor MCP configuration guide | DONE |
| `guides/MARKETING_STRATEGY.md` | Full 4-phase marketing & promotion strategy (launch → growth → monetization → scale) | DONE |
| `guides/FREE_AI_VIDEO_TOOLS.md` | Comprehensive guide — 50+ free tools for AI news & music videos, 3 complete workflows | DONE |
| `guides/COMFYUI_SETUP_GUIDE.md` | Step-by-step Windows install guide for ComfyUI + Flux Schnell (unlimited free image gen) | DONE |
| `guides/USER_GUIDE.md` | User guide for the complete project | DONE |
| `guides/DEV_DOCS.md` | Developer documentation | DONE |
| `guides/N8N-SETUP-GUIDE.md` | n8n automation setup guide | DONE |
| `ai_news/AI_NEWS_CHANNEL.md` | AI news YouTube channel content strategy | DONE |
| `ai_news/FIRST_AI_NEWS_VIDEO.md` | First AI news video script (original template) | DONE |
| `ai_news/FIRST_NEWS_VIDEO_SCRIPT.md` | Full 8-12 min AI news video script with 5 tool segments, edge-tts narration text, production checklist (supersedes FIRST_AI_NEWS_VIDEO.md) | DONE |
| `browser_extension/mcp_server.py` | MCP server exposing 16 browser tools via JSON-RPC stdio | DONE |
| `browser_extension/start.bat` | Double-click to launch browser bridge server | DONE |

### Files Fixed/Updated

| File | What Changed |
|------|-------------|
| `browser_extension/youtube_uploader.py` | Added `'file'` key to all 16 tracks; fixed paths from `track{num}.mp4` to actual filenames via `Media_Bank/youtubevids/` |
| `browser_extension/bridge_server.py` | Startup banner updated to list all 15 actions (was 7) |
| `browser_extension/chrome/background.js` | Upload error recovery with step() helper, retries, logging; optional steps use retries=0 |
| `browser_extension/firefox/background.js` | Same error recovery + optional step optimization |
| `shorts_cutter.bat` | Added ffmpeg install check with clear error message |

### Shorts Clips Cut (16 files)

| # | Track | File | Size |
|---|-------|------|------|
| 1 | EVERY MORNING WHEN I WAKE UP | short_01_every_morning_hook.mp4 | 8.5M |
| 2 | DONT RUSH ME | short_02_dont_rush_me_hook.mp4 | 9.8M |
| 3 | I LIVE FOR YOU | short_03_i_live_for_you_hook.mp4 | 8.3M |
| 4 | LIKE I MEANT TO DO | short_04_like_i_meant_to_do_hook.mp4 | 11M |
| 5 | MY CHILDREN | short_05_my_children_hook.mp4 | 8.1M |
| 6 | WEATHER YOU CAN DO | short_06_weather_you_can_do_hook.mp4 | 11M |
| 7 | I CANT BE HIM | short_07_i_cant_be_him_hook.mp4 | 11M |
| 8 | TELLEMTHATSME | short_08_tellemthatsme_hook.mp4 | 7.4M |
| 9 | EVIL PAST | short_09_evil_past_hook.mp4 | 12M |
| 10 | JUST DRILL ME | short_10_just_drill_me_hook.mp4 | 8.0M |
| 11 | WOODS | short_11_woods_hook.mp4 | 13M |
| 12 | NO CHEATS | short_12_no_cheats_hook.mp4 | 8.7M |
| 13 | TILL I'M DONE | short_13_till_im_done_hook.mp4 | 12M |
| 14 | AI FIVE | short_14_ai_five_hook.mp4 | 15M |
| 15 | SINCE I WAS YOUNG | short_15_since_i_was_young_hook.mp4 | 9.9M |
| 16 | EVERY MORNING (MV) | short_16_every_morning_mv_hook.mp4 | 11M |

**Location:** `C:\Users\karma\Videos\New folder\Media_Bank\shorts\`

### MCP Server Configuration

Claude Desktop config updated at `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "browser-bridge": {
      "command": "python",
      "args": ["C:\\Users\\karma\\browser_extension\\mcp_server.py"]
    }
  }
}
```

**To activate:** Restart Claude Desktop. The browser-bridge tools will appear automatically.

### Social Media Posts

All 16 tracks have copy-paste-ready posts in `ALL_SOCIAL_POSTS.md`:
- 3 styles per track: Announcement, Hype, Engagement
- 5 platforms per style: X/Twitter, Facebook Group, Facebook Profile, Instagram, TikTok
- Total: 240 ready-to-use social posts

### Upload Error Recovery

Both Chrome and Firefox extensions now have:
- `step()` helper with configurable retries (default 2 per step)
- Step logging array tracking ok/retry/fail status
- Critical failure on file upload returns early with full log
- Optional steps ("Show more", "Not made for kids") use retries=0 to save ~12 seconds per upload
- Final result includes success/failure summary with names of failed steps

---

## Track Data (Source of Truth)

All 16 tracks verified against actual files on disk in `C:\Users\karma\Videos\New folder\Media_Bank\youtubevids\`:

| # | Title | File | Day | Channel |
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

**Note:** Track 16 uses the same file as Track 1. Upload Track 16 as a YouTube Short (using the vertical clip from `shorts/`) to avoid duplicate detection.

---

## Marketing Strategy (MARKETING_STRATEGY.md)

4-phase strategy covering the full journey:

| Phase | Period | Focus |
|-------|--------|-------|
| Phase 1: The Drop | Days 1-16 | Daily uploads to both channels, cross-platform posting, Facebook group strategy, YouTube Community Tab, Instagram Reels |
| Phase 2: The Grind | Days 17-60 | YouTube Shorts pipeline (30+ Shorts), content repurposing, SEO & discovery, collaboration outreach |
| Phase 3: The Money | Days 60-90 | YPP eligibility (1,000 subs + 4,000 watch hours), DistroKid Content ID, agency services ($100/$300/$500) |
| Phase 4: The Empire | Days 90+ | AI News channel launch, Discord community, merchandise, content calendar |

**Key additions from code review:**
- YouTube Community Tab (Start Day 1) — polls, BTS, lyrics quotes, fan shoutouts
- Instagram Reels (Start Day 1) — reuse Shorts clips as Reels
- YouTube End Screens & Cards — set up once as template, auto-applies to all uploads
- YouTube Shorts SEO — title hooks, #Shorts hashtag guidance, posting times (12PM/7PM AEST)
- Daily routine updated: Community tab (1 min) + Instagram Reel added

---

## Free AI Video Tools (FREE_AI_VIDEO_TOOLS.md)

50+ free tools organized into 12 categories:

| Category | Top Pick | Backup |
|----------|----------|--------|
| Script Writing | Gemini (free) | ChatGPT free tier |
| Voice/TTS | edge-tts (unlimited, free) | ElevenLabs (10 min/mo) |
| Video Gen (Cloud) | Kling AI + Hailuo | Luma + PixVerse |
| Video Gen (Local) | Wan 2.1 + ComfyUI | CogVideoX |
| Image Gen (Cloud) | Google ImageFX | Leonardo AI + Tensor.art |
| Image Gen (Local) | Flux via ComfyUI | Stable Diffusion |
| Video Editing | DaVinci Resolve | Shotcut |
| Auto-Captions | CapCut | VEED.io |
| Thumbnails | Photopea + ImageFX | Canva free |
| Music/SFX | YouTube Audio Library | FreeSound.org |
| Stock Footage | Pexels + Pixabay | Unsplash |
| Talking Heads | Hedra (free) | D-ID trial |

**Credit stacking strategy:** Kling → Hailuo → Luma → PixVerse → Hugging Face = ~20-30 free video clips/day

---

## AI News Video Production (FIRST_NEWS_VIDEO_SCRIPT.md)

**Title:** "AI Just Changed Everything This Week — 5 Tools You NEED to Know"
**Length:** 8-12 minutes
**Format:** Voiceover narration + B-roll visuals + screen recordings
**Cost:** $0
**Production time:** ~3 hours per video

**Narration:** Generated with edge-tts (en-AU-WilliamNeural, Australian male voice)
**Test file:** `Videos/New folder/Media_Bank/audio/narration/news_intro_test.mp3` (78KB)

**Workflow:**
1. Script (Gemini) → 2. Voice (edge-tts) → 3. B-roll (Kling/Hailuo free credits) → 4. Screen recording (OBS) → 5. Edit (DaVinci Resolve) → 6. Captions (CapCut) → 7. Thumbnail (Photopea) → 8. Upload

**Batch script:** `generate_narration.bat` generates all 7 narration segments in one run

---

## ComfyUI + Flux Setup (COMFYUI_SETUP_GUIDE.md)

**Purpose:** Unlimited free AI image generation for music video visuals, thumbnails, B-roll
**Requirements:** NVIDIA GPU with 8GB+ VRAM (12GB+ recommended)
**Models:** Flux Schnell (FP8) + VAE + T5/CLIP text encoders
**Interface:** ComfyUI at http://127.0.0.1:8188

**VRAM guide:**
- RTX 3060 (12GB): Works with FP8 (~15-20s/image)
- RTX 4070 Ti (12GB): Fast FP8 (~8-12s/image)
- RTX 4080/4090 (16-24GB): Full FP16, fastest (~5-8s/image)
- No GPU: Use Google Colab or Hugging Face Spaces

---

## edge-tts (Text-to-Speech)

**Installed:** `pip install edge-tts`
**Usage:** `python -m edge_tts --voice en-AU-WilliamNeural --text "..." --write-media output.mp3`
**Best voice:** `en-AU-WilliamNeural` (Australian male, energetic, news-anchor style)
**Cost:** $0, unlimited, no account needed
**Test passed:** `news_intro_test.mp3` generated successfully (78KB)

---

## Known Issues & Notes

1. **Tracks 1 & 16 same file** — Upload Track 16 as a Short or with different metadata to avoid YouTube duplicate detection
2. **Shorts timestamps** — All clips start at `ss 0` (beginning of track). You may want to adjust timestamps to cut from the hook/chorus section for maximum impact
3. **Social posting** — Instagram and TikTok require manual posting or mobile app. The browser bridge works best for YouTube, X, and Facebook
4. **MCP requires restart** — Claude Desktop must be restarted after config changes
5. **edge-tts CLI** — Use `python -m edge_tts` (not bare `edge-tts`) on Windows if the CLI isn't in PATH
6. **ComfyUI not yet installed** — Requires NVIDIA GPU check first (see COMFYUI_SETUP_GUIDE.md)

---

## MCP Server Configuration

Claude Desktop config at `%APPDATA%\Claude\claude_desktop_config.json` includes:
- **browser-bridge** MCP server (16 tools)
- **filesystem** MCP server (file access)
- **github** MCP server (GitHub integration)

**To activate:** Restart Claude Desktop. The browser-bridge tools will appear automatically.

---

## Folder Structure

```
C:\Users\karma\
├── guides/          # All documentation & setup guides
│   ├── COMFYUI_SETUP_GUIDE.md
│   ├── DEV_DOCS.md
│   ├── FREE_AI_VIDEO_TOOLS.md
│   ├── MARKETING_STRATEGY.md
│   ├── MCP_SETUP_GUIDE.md
│   ├── N8N-SETUP-GUIDE.md
│   └── USER_GUIDE.md
├── launch/          # Launch assets & session tracking
│   ├── ALL_SOCIAL_POSTS.md
│   ├── DAILY_POSTING_BOARD.html
│   ├── LAUNCH_CHECKLIST.md
│   └── SESSION_LOG.md
├── scripts/         # Automation scripts
│   ├── generate_narration.bat
│   ├── shorts_cutter.bat
│   └── SOCIAL_POSTER.py
├── ai_news/         # AI News channel content
│   ├── AI_NEWS_CHANNEL.md
│   ├── FIRST_AI_NEWS_VIDEO.md
│   └── FIRST_NEWS_VIDEO_SCRIPT.md
├── media/           # HTML dashboards & UI files
│   ├── index.html
│   ├── karma-hud.html
│   ├── karma-os-ultimate.html
│   ├── karma-os-v6.html
│   ├── karma-widget.html
│   ├── live-desktop.css
│   ├── live-desktop.html
│   └── live-desktop.js
├── browser_extension/  # Browser bridge & MCP server
│   ├── start.bat
│   ├── bridge_server.py
│   ├── youtube_uploader.py
│   ├── mcp_server.py
│   ├── chrome/
│   └── firefox/
├── Videos/New folder/Media_Bank/  # Media files
│   ├── youtubevids/    # 16 original track videos
│   ├── shorts/         # 16 vertical Shorts clips
│   └── audio/narration/ # edge-tts generated audio
├── PRD.md            # Product requirements
├── PROMPT.md         # Project prompt
├── README.md         # Project readme
├── ARCHITECTURE.md   # Architecture docs
└── ...               # Other core project files
```

---

## What's Ready to Use Right Now

| # | Asset | Folder | Status | Action |
|---|-------|--------|--------|--------|
| 1 | DAILY_POSTING_BOARD.html | `launch/` | Ready | Open and start Day 1 |
| 2 | 16 Shorts clips | `Videos/.../shorts/` | Ready | Upload to YouTube Shorts, TikTok, Instagram Reels |
| 3 | 240 social posts | `launch/ALL_SOCIAL_POSTS.md` | Ready | Copy-paste from file |
| 4 | MCP server | `browser_extension/` | Configured | Restart Claude Desktop to activate |
| 5 | Browser bridge | `browser_extension/start.bat` | Ready | Double-click to start |
| 6 | Marketing strategy | `guides/MARKETING_STRATEGY.md` | Complete | Follow 4-phase plan |
| 7 | Free tools guide | `guides/FREE_AI_VIDEO_TOOLS.md` | Complete | Reference for $0 production |
| 8 | News video script | `ai_news/FIRST_NEWS_VIDEO_SCRIPT.md` | Template | Fill in [brackets] with this week's AI tools |
| 9 | Narration generator | `scripts/generate_narration.bat` | Ready | Run after editing script |
| 10 | ComfyUI guide | `guides/COMFYUI_SETUP_GUIDE.md` | Ready | GPU check first, then install |
| 11 | edge-tts | Installed | Ready | `python -m edge_tts` for unlimited free voiceover |
