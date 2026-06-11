#!/usr/bin/env python3
"""
YouTube Uploader — sends upload commands through the AI Browser Bridge

Usage:
    python youtube_uploader.py --track 1          # Upload track 1
    python youtube_uploader.py --all               # Upload all 16 tracks (one per day)
    python youtube_uploader.py --track 5 --channel both  # Upload to both channels
    python youtube_uploader.py --test              # Test connection to bridge
"""

import json
import sys
import time
import urllib.request

BRIDGE_URL = 'http://127.0.0.1:9876'

# Track data (matches DAILY_POSTING_BOARD.html — the source of truth)
TRACKS = [
    {
        'title': "tellemthatsme — EVERY MORNING WHEN I WAKE UP",
        'file': "Every morning when I wake up.mp4",
        'desc': "Every morning brings a new chance to fight, to grow, to become who you're meant to be. This track captures the raw ritual of waking up and choosing to keep going no matter what.\n\nDedicated to my kids — you are my reason, my purpose, and my strength every single day. Everything I do, I do for you.\n\nAnd to the love of my life, who's always there no matter what, where, or how far apart we are. Thank you for being my constant.",
        'tags': "tellemthatsme, hip hop, every morning, motivation, dedication, kids, love, new day, grind, morning motivation",
        'pinned': "This one's for everyone who wakes up and chooses to keep going. You're not alone. What's the first thing YOU do every morning? Drop it below. New videos every week."
    },
    {
        'title': "tellemthatsme — DONT RUSH ME",
        'file': "dont rush me.mp4",
        'desc': "Sometimes the best things take time. \"Don't Rush Me\" is a declaration of patience, persistence, and staying true to your own pace while the world speeds around you.",
        'tags': "tellemthatsme, hip hop, dont rush me, patience, grind, original music",
        'pinned': "Patience is power. What's something YOU refuse to rush? Drop it below. Subscribe for new videos every week!"
    },
    {
        'title': "tellemthatsme — I LIVE FOR YOU",
        'file': "i live for you.mp4",
        'desc': "A raw declaration of love and purpose. This track channels the fire of living for something greater than yourself — your kids, your passion, your reason to keep going.\n\nDedicated to Leah, Ryan, and Jess — every word is for you.",
        'tags': "tellemthatsme, hip hop, i live for you, dedication, kids, family, love",
        'pinned': "This one hits different when you've lost someone you love. Who do YOU live for? New videos every week."
    },
    {
        'title': "tellemthatsme — LIKE I MEANT TO DO",
        'file': "LIKE I MEANT TO DO.mp4",
        'desc': "Finally stepping into who I was always meant to be. This is the sound of breaking free from everything that held me back.\n\nTHE STORY BEHIND THE SONG:\nSix years. No reason. No explanation. Just silence — and the pieces I had to pick up alone.\n\n\"Like I'm Meant To Do\" was written in the wreckage of a six-year relationship that ended without a word. No fight. No closure. Just somebody walking away like those years meant nothing.\n\nThis isn't a love song. This is the sound of putting yourself back together when someone else left you in pieces.\n\nDedicated to: Leah, Ryan, and Jess. I love you. I always have. I always will.",
        'tags': "tellemthatsme, hip hop, like im meant to do, heartbreak, healing, moving on, real story",
        'pinned': "We've all been left with no closure. This one's for anyone picking up the pieces. What song got YOU through a breakup? Drop it below."
    },
    {
        'title': "tellemthatsme — MY CHILDREN",
        'file': "my children.mp4",
        'desc': "Written from the darkest chapter of my life — my three children stolen away by lies, a father left to grieve, and the fight to hold on when everything was taken. This track is for every parent who knows this pain.\n\nDedicated to Leah, Ryan, and Jess — I love you. I always have. I always will.",
        'tags': "tellemthatsme, hip hop, my children, parental alienation, father, kids, family, real",
        'pinned': "If you're a parent who's been separated from your children — you're not alone. This one's for you. Share your story below."
    },
    {
        'title': "tellemthatsme — WEATHER YOU CAN DO",
        'file': "weather you can do.mp4",
        'desc': "No matter the weather, no matter the storm — I'm still standing. This track is about resilience and proving that nothing can break you when you know who you are.\n\nDedicated to Leah, Ryan, and Jess — no matter the weather, I will always be here for you. Every storm we weathered, we weathered together. I love you. I always have. I always will.",
        'tags': "tellemthatsme, hip hop, weather you can do, resilience, kids, family, dedication",
        'pinned': "This one's for my kids — no matter the weather, I will always be here for you. Who do YOU weather the storm for? Drop it below. New music every week."
    },
    {
        'title': "tellemthatsme — I CANT BE HIM",
        'file': "i cant be him.mp4",
        'desc': "I can't be him. I won't be him. This track is about refusing to be someone you're not, breaking out of molds, and owning your own identity.",
        'tags': "tellemthatsme, hip hop, i cant be him, identity, self, original, real",
        'pinned': "Ever been told to be someone you're not? This one's for you. What's YOUR identity? Drop it below."
    },
    {
        'title': "tellemthatsme — TELLEMTHATSME",
        'file': "tellemtrhatsme.mp4",
        'desc': "The anthem. The name. The statement. This is who I am — take it or leave it. No apologies, no compromises.",
        'tags': "tellemthatsme, hip hop, tellemthatsme, anthem, identity, original music",
        'pinned': "This is the anthem. This is the name. Tell them who you are. Drop your story below. Subscribe for more."
    },
    {
        'title': "tellemthatsme — EVIL PAST",
        'file': "evil past.mp4",
        'desc': "We all have a past. Some of it's dark. This track confronts the mistakes, the scars, and the things we'd rather forget — and turns them into fuel.",
        'tags': "tellemthatsme, hip hop, evil past, past, redemption, growth, real talk",
        'pinned': "Your past doesn't define you — it fuels you. What's YOUR redemption story? Drop it below."
    },
    {
        'title': "tellemthatsme — JUST DRILL ME",
        'file': "just drill me.mp4",
        'desc': "Hard-hitting. Unapologetic. This track brings the energy and the edge — straight drill vibes with something to say.",
        'tags': "tellemthatsme, hip hop, just drill me, drill, energy, hard, original",
        'pinned': "Straight energy. No filter. What drill track hits YOU the hardest? Drop it below. Subscribe for more."
    },
    {
        'title': "tellemthatsme — WOODS",
        'file': "woods.mp4",
        'desc': "Deep in the woods — lost, found, and everything in between. This track is about navigating life's darkest moments and finding your way back.",
        'tags': "tellemthatsme, hip hop, woods, deep, reflective, atmosphere, real",
        'pinned': "Sometimes you have to get lost to find yourself. What's YOUR dark moment that made you stronger? Drop it below."
    },
    {
        'title': "tellemthatsme — NO CHEATS",
        'file': "no cheats.mp4",
        'desc': "No shortcuts. No cheating. Just real work and real results. This track is about earning everything you have and doing it the right way.",
        'tags': "tellemthatsme, hip hop, no cheats, real, grind, hustle, integrity",
        'pinned': "No shortcuts. No cheats. Just hard work. What's something YOU earned the hard way? Drop it below."
    },
    {
        'title': "tellemthatsme — TILL IM DONE",
        'file': "till im done.mp4",
        'desc': "I won't stop till I'm done. Period. This track is about persistence, drive, and refusing to quit until you've given everything you've got.",
        'tags': "tellemthatsme, hip hop, till im done, persistence, grind, never quit",
        'pinned': "Never stop. Never quit. What keeps YOU going when it gets hard? Drop it below. Subscribe for more."
    },
    {
        'title': "tellemthatsme — AI FIVE",
        'file': "ai five.mp4",
        'desc': "Five tracks deep in the AI revolution. This one's about the future, the technology, and how we ride the wave instead of getting swept away.",
        'tags': "tellemthatsme, hip hop, ai five, artificial intelligence, future, tech, original",
        'pinned': "AI is changing everything. Are you riding the wave or watching from the shore? Drop your take below."
    },
    {
        'title': "tellemthatsme — SINCE I WAS YOUNG",
        'file': "since i was young.mp4",
        'desc': "Since I was young, I knew I was different. This track traces the journey from childhood dreams to the reality of who I've become.",
        'tags': "tellemthatsme, hip hop, since i was young, journey, growth, childhood, real story",
        'pinned': "We all started somewhere. Where did YOUR journey begin? Drop it below. Subscribe for more."
    },
    {
        'title': "tellemthatsme — EVERY MORNING WHEN I WAKE UP (Music Video)",
        'file': "Every morning when I wake up.mp4",
        'desc': "Every morning brings a new chance to fight, to grow, to become who you're meant to be. This music video captures the raw ritual of waking up and choosing to keep going no matter what.\n\nDedicated to my kids — you are my reason, my purpose, and my strength every single day. Everything I do, I do for you.\n\nAnd to the love of my life, who's always there no matter what, where, or how far apart we are. Thank you for being my constant.",
        'tags': "tellemthatsme, hip hop, every morning, music video, dedication, kids, love, motivation",
        'pinned': "The music video for Every Morning. This one's for everyone who keeps going. What's YOUR morning routine? Drop it below. Subscribe and hit the bell.",
        'short_only': True
    }
]


def send_command(action, params=None):
    """Send a command to the bridge server."""
    if params is None:
        params = {}
    data = json.dumps({'action': action, 'params': params}).encode()
    req = urllib.request.Request(
        f'{BRIDGE_URL}/command/send',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        return json.loads(resp.read())
    except Exception as e:
        return {'error': str(e)}


def test_connection():
    """Test if the bridge is running."""
    try:
        resp = urllib.request.urlopen(f'{BRIDGE_URL}/status', timeout=3)
        data = json.loads(resp.read())
        print(f"[OK] Bridge is online — {data}")
        return True
    except Exception as e:
        print(f"[FAIL] Bridge is offline — {e}")
        print("\nStart the bridge first:")
        print("  double-click start.bat")
        print("  or: python bridge_server.py")
        return False


def upload_track(track_num, channel='main'):
    """Send an upload command for a specific track."""
    if track_num < 1 or track_num > len(TRACKS):
        print(f"[FAIL] Invalid track number. Use 1-{len(TRACKS)}")
        return

    track = TRACKS[track_num - 1]

    if track.get('short_only'):
        print(f"\n[SHORTS] Track {track_num}: {track['title']}")
        print(f"   This track shares a file with Track 1. Upload as YouTube Short only.")
        print(f"   Use the vertical clip: Videos/New folder/Media_Bank/shorts/short_16_every_morning_mv_hook.mp4")
        return

    print(f"\n[UPLOAD] Track {track_num}: {track['title']}")
    print(f"   Channel: {channel}")
    print(f"   Sending to bridge...")

    result = send_command('upload_video', {
        'title': track['title'],
        'description': track['desc'],
        'tags': track['tags'],
        'file_path': f"C:/Users/karma/Videos/New folder/Media_Bank/youtubevids/{TRACKS[track_num - 1]['file']}",
        'pinned_comment': track.get('pinned', ''),
        'channel': channel
    })

    if 'error' in result:
        print(f"[FAIL] Failed: {result['error']}")
    else:
        print(f"[OK] Queued! Job ID: {result.get('job_id')}")
        print(f"   Check the browser to see it happening")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    if '--test' in sys.argv:
        test_connection()
        return

    if not test_connection():
        return

    if '--all' in sys.argv:
        print(f"\n[QUEUE] Uploading all {len(TRACKS)} tracks to main channel...")
        for i in range(1, len(TRACKS) + 1):
            upload_track(i)
            print(f"   Waiting 60s between uploads...")
            if i < len(TRACKS):
                time.sleep(60)

    elif '--track' in sys.argv:
        idx = sys.argv.index('--track')
        if idx + 1 < len(sys.argv):
            track_num = int(sys.argv[idx + 1])
            channel = 'main'
            if '--channel' in sys.argv:
                ch_idx = sys.argv.index('--channel')
                if ch_idx + 1 < len(sys.argv):
                    channel = sys.argv[ch_idx + 1]
            upload_track(track_num, channel)




if __name__ == '__main__':
    # Force UTF-8 output encoding for Windows compatibility
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    main()
