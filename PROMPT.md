# PROMPT.md — AI Prompt & Command Guide

## How to Talk to AI Models About This Project

---

## 1. Quick-Start Prompt

Copy-paste this to any AI model (Claude, ChatGPT, Gemini, etc.):

```
I have an AI Browser Bridge running at http://localhost:9876.
You can send commands to it via HTTP POST.

Commands available:
- navigate: Go to a URL
- click: Click on text or selector
- type: Type text into a field
- extract: Get page content
- screenshot: Capture the page
- evaluate: Run JavaScript
- upload_video: Upload a YouTube video (track 1-16)

My project: TellLemThatsMe — 16 original rap/trap tracks.
Two YouTube channels to upload to.
Goal: monetize through YouTube + streaming + agency services.

Please help me upload tracks and manage my channels.
```

## 2. Bridge API Reference

### Base URL
```
http://127.0.0.1:9876
```

### Endpoints

#### GET /status
Check if bridge is running.

```
curl http://127.0.0.1:9876/status
```

Response:
```json
{"status":"running","queue_length":0,"results_available":0}
```

#### POST /command/send
Send a browser action.

```
curl -X POST http://127.0.0.1:9876/command/send \
  -H "Content-Type: application/json" \
  -d '{"action":"navigate","params":{"url":"https://studio.youtube.com"}}'
```

Response:
```json
{"job_id":"a1b2c3d4","status":"queued"}
```

#### GET /command/poll
Extension polls for next command. Returns 204 if queue empty.

#### POST /command/result
Extension reports execution result.

```
curl -X POST http://127.0.0.1:9876/command/result \
  -H "Content-Type: application/json" \
  -d '{"job_id":"a1b2c3d4","result":{"success":true,"url":"https://studio.youtube.com"}}'
```

#### GET /result/{job_id}
AI polls for result. Returns 404 if not found or already consumed.

---

## 3. Bridge Response Format

When your AI model sends commands, it gets responses like:

### Command Accepted
```json
{"job_id":"abc12345","status":"queued"}
```

### Extension Polls Command (not sent to you — it's between extension and bridge)

### Result Ready (you poll for it)
```json
{"job_id":"abc12345","result":{"success":true,"url":"https://studio.youtube.com"}}
```

### Queue Empty
```json
// HTTP 204 — no content
```

### Result Not Ready Yet
```json
// HTTP 404
{"error":"not_found"}
```

---

## 4. YouTube Upload Workflow (for AI Models)

When you send an `upload_video` command, the extension executes this flow:

```
1. Navigate to https://studio.youtube.com
2. Wait for page to load
3. Click "CREATE" button (top right)
4. Click "Upload videos"
5. File dialog opens (CDP sets file input)
6. Wait for upload to process
7. Type Title
8. Type Description
9. Type Tags
10. Click "Show more" to expand advanced
11. Set "Made for Kids" = No
12. Click "Next" through visibility/restrictions
13. Click "Next" through video elements
14. Click "Next" through checks
15. Click "Public" or "Unlisted"
16. Click "Publish"
```

Wait approximately 5–10 seconds between steps for YouTube to process.

To send an upload command:
```
curl -X POST http://127.0.0.1:9876/command/send \
  -H "Content-Type: application/json" \
  -d '{"action":"upload_video","params":{"track":1,"channel":"main"}}'
```

### Track-to-File Mapping
Tracks are numbered 1–16. Video files are stored in:
`C:\Users\karma\Videos\New folder\Media_Bank\youtubevids\`

File naming matches the posting board (e.g., "Every morning when I wake up.mp4").

---

## 5. All 16 Tracks Reference

| # | Title | File | Channel |
|---|-------|------|---------|
| 1 | EVERY MORNING WHEN I WAKE UP | Every morning when I wake up.mp4 | Both |
| 2 | DONT RUSH ME | dont rush me.mp4 | Both |
| 3 | I LIVE FOR YOU | i live for you.mp4 | Both |
| 4 | LIKE I MEANT TO DO | LIKE I MEANT TO DO.mp4 | Both |
| 5 | MY CHILDREN | my children.mp4 | Both |
| 6 | WEATHER YOU CAN DO | weather you can do.mp4 | Both |
| 7 | I CANT BE HIM | i cant be him.mp4 | Both |
| 8 | TELLEMTHATSME | tellemtrhatsme.mp4 | Both |
| 9 | EVIL PAST | evil past.mp4 | Both |
| 10 | JUST DRILL ME | just drill me.mp4 | Both |
| 11 | WOODS | woods.mp4 | Both |
| 12 | NO CHEATS | no cheats.mp4 | Both |
| 13 | TILL I'M DONE | till im done.mp4 | Both |
| 14 | AI FIVE | ai five.mp4 | Both |
| 15 | SINCE I WAS YOUNG | since i was young.mp4 | Both |
| 16 | EVERY MORNING (MV) | Every morning when I wake up.mp4 | Both |

### Kid-Related Tracks
The following tracks reference childhood/family themes in their lyrics:
- Track 1 (EVERY MORNING WHEN I WAKE UP) — dedicated to kids + love of my life
- Track 3 (I LIVE FOR YOU) — dedicated to Leah, Ryan, and Jess
- Track 4 (LIKE I MEANT TO DO) — "never had a father figure", dedication to kids
- Track 5 (MY CHILDREN) — parental alienation, dedicated to Leah, Ryan, Jess
- Track 6 (WEATHER YOU CAN DO) — resilience through any storm, dedicated to Leah, Ryan, and Jess
- Track 16 (EVERY MORNING MV) — dedicated to kids + love of my life

These should NOT be marked "Made for Kids" — they use nostalgic/adult reflection, not children's content.

---

## 6. Social Media Post Templates (for AI Models)

### Facebook Group Post
```
Just dropped [TRACK_TITLE] — [ONE_LINE_DESCRIPTION]

[LINK]

Let me know what you think in the comments!
```

### YouTube Shorts Script
```
30-60 second clip from track hook
Title: [CATCHY PHRASE] #TellLemThatsMe #Rap
```

### Instagram/TikTok Caption
```
New track "[TRACK_TITLE]" out now!
Stream link in bio.

[3-5 relevant hashtags]
```

---

## 7. Example AI Conversation Sequence

**You:** "Upload track 1 to my main channel"

**AI:**
```
1. POST /command/send {"action":"upload_video","params":{"track":1}}
2. Wait 5 seconds
3. GET /result/{job_id}
4. "Upload started successfully"
```

**You:** "What's playing on YouTube right now?"

**AI:**
```
1. POST /command/send {"action":"navigate","params":{"url":"https://studio.youtube.com"}}
2. Wait 3 seconds
3. POST /command/send {"action":"extract","params":{"selector":"body"}}
4. Get result
5. "Here's your dashboard..."
```
