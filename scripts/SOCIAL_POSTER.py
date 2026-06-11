#!/usr/bin/env python3
"""
Social Media Poster — Cross-Platform Posting via AI Browser Bridge
================================================================
Posts content to YouTube, Facebook, Instagram, TikTok, and X
using the browser bridge at localhost:9876.

Usage:
    python SOCIAL_POSTER.py --platform youtube --content post.json
    python SOCIAL_POSTER.py --platform all --content post.json
    python SOCIAL_POSTER.py --platform x --thread thread.json
    python SOCIAL_POSTER.py --test
"""

import json
import sys
import time
import urllib.request

BRIDGE_URL = "http://127.0.0.1:9876"

# --- Platform Configs ---

PLATFORMS = {
    "youtube": {
        "name": "YouTube",
        "studio_url": "https://studio.youtube.com",
        "channel_url": "https://studio.youtube.com/channel/",
        "comment_url": "https://www.youtube.com/watch?v={video_id}",
    },
    "facebook": {
        "name": "Facebook",
        "groups_url": "https://www.facebook.com/groups/",
        "profile_url": "https://www.facebook.com/",
        "post_url": "https://www.facebook.com/",
    },
    "instagram": {
        "name": "Instagram",
        "home_url": "https://www.instagram.com/",
        "profile_url": "https://www.instagram.com/{username}/",
    },
    "tiktok": {
        "name": "TikTok",
        "upload_url": "https://www.tiktok.com/creator#/upload?scene=creator_center",
        "studio_url": "https://www.tiktok.com/creator-center",
    },
    "x": {
        "name": "X/Twitter",
        "compose_url": "https://x.com/compose/post",
        "home_url": "https://x.com/home",
    },
}

# --- Facebook Group List (customize these) ---

FB_GROUPS = [
    # Add your music promotion groups here
    # Format: "https://www.facebook.com/groups/YOUR_GROUP_ID"
]

# --- Post Templates ---

TEMPLATES = {
    "youtube_community": {
        "platform": "youtube",
        "description": "YouTube Community tab post",
    },
    "facebook_group": {
        "platform": "facebook",
        "description": "Facebook group post",
    },
    "facebook_profile": {
        "platform": "facebook",
        "description": "Facebook profile post",
    },
    "instagram_caption": {
        "platform": "instagram",
        "description": "Instagram caption (copy-paste)",
    },
    "tiktok_caption": {
        "platform": "tiktok",
        "description": "TikTok caption (copy-paste)",
    },
    "x_post": {
        "platform": "x",
        "description": "X/Twitter post",
    },
    "x_thread": {
        "platform": "x",
        "description": "X/Twitter thread",
    },
}


def send_command(action, params=None, timeout=60):
    """Send a command to the bridge and wait for result."""
    if params is None:
        params = {}
    data = json.dumps({"action": action, "params": params}).encode()
    req = urllib.request.Request(
        f"{BRIDGE_URL}/command/send",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        result = json.loads(resp.read())
    except Exception as e:
        return {"success": False, "error": f"Bridge offline: {e}"}

    job_id = result.get("job_id")
    if not job_id:
        return {"success": False, "error": "No job_id returned"}

    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(f"{BRIDGE_URL}/result/{job_id}", timeout=5)
            return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                time.sleep(2)
                continue
            return {"success": False, "error": f"HTTP {e.code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    return {"success": False, "error": "Timeout"}


def check_bridge():
    """Check if bridge is running."""
    try:
        resp = urllib.request.urlopen(f"{BRIDGE_URL}/status", timeout=3)
        data = json.loads(resp.read())
        return data.get("status") == "running"
    except Exception:
        return False


# --- Platform Poster Functions ---


def post_to_facebook_group(content, group_url=None):
    """Post to a Facebook group via browser automation."""
    if not group_url and FB_GROUPS:
        group_url = FB_GROUPS[0]

    if not group_url:
        return {"success": False, "error": "No Facebook group URL configured"}

    print(f"  Navigating to group: {group_url}")
    send_command("navigate", {"url": group_url})
    time.sleep(5)

    # Click "Write something" or post input
    print("  Looking for post input...")
    send_command("click", {"text": "Write something"})
    time.sleep(2)

    # Try alternative selectors
    send_command("click", {"selector": '[aria-label*="Write something"]'})
    time.sleep(1)

    # Type the post content
    text = content.get("text", "")
    print(f"  Typing post ({len(text)} chars)...")
    send_command("type", {
        "selector": '[role="textbox"][contenteditable="true"], [contenteditable="true"]',
        "text": text,
    })
    time.sleep(2)

    # Click Post button
    print("  Clicking Post...")
    send_command("click", {"text": "Post"})
    time.sleep(3)

    print("  Posted to Facebook group!")
    return {"success": True, "platform": "facebook", "group": group_url}


def post_to_facebook_profile(content):
    """Post to Facebook profile via browser automation."""
    print("  Navigating to Facebook profile...")
    send_command("navigate", {"url": "https://www.facebook.com/"})
    time.sleep(5)

    # Click "What's on your mind"
    send_command("click", {"text": "What's on your mind"})
    time.sleep(2)

    # Type content
    text = content.get("text", "")
    send_command("type", {
        "selector": '[role="textbox"][contenteditable="true"], [contenteditable="true"]',
        "text": text,
    })
    time.sleep(2)

    # Click Post
    send_command("click", {"text": "Post"})
    time.sleep(3)

    print("  Posted to Facebook profile!")
    return {"success": True, "platform": "facebook"}


def post_to_x(content):
    """Post to X/Twitter via browser automation."""
    print("  Navigating to X compose...")
    send_command("navigate", {"url": "https://x.com/compose/post"})
    time.sleep(5)

    # Type the tweet
    text = content.get("text", "")
    print(f"  Typing tweet ({len(text)} chars)...")
    send_command("type", {
        "selector": '[data-testid="tweetTextarea_0"], [role="textbox"]',
        "text": text,
    })
    time.sleep(2)

    # Click Post/Tweet button
    send_command("click", {"selector": '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]'})
    time.sleep(3)

    print("  Posted to X!")
    return {"success": True, "platform": "x"}


def post_x_thread(thread_tweets):
    """Post a thread to X/Twitter."""
    results = []
    for i, tweet in enumerate(thread_tweets):
        print(f"  Tweet {i + 1}/{len(thread_tweets)}...")
        if i == 0:
            result = post_to_x({"text": tweet})
        else:
            # Click "Add another tweet" or type in the reply box
            send_command("click", {"selector": '[data-testid="addTweetButton"], [aria-label*="Add another"}'})
            time.sleep(1)
            send_command("type", {
                "selector": '[data-testid="tweetTextarea_1"], [role="textbox"]',
                "text": tweet,
            })
            time.sleep(1)
            send_command("click", {"selector": '[data-testid="tweetButton"]'})
            time.sleep(3)
            result = {"success": True}

        results.append(result)
        time.sleep(2)

    return {"success": True, "tweets_posted": len(results), "results": results}


def post_youtube_community(content):
    """Post to YouTube Community tab."""
    print("  Navigating to YouTube Community...")
    send_command("navigate", {"url": "https://studio.youtube.com/channel/UC/posts"})
    time.sleep(5)

    # Click "Create post"
    send_command("click", {"text": "Create"})
    time.sleep(2)
    send_command("click", {"text": "Create a post"})
    time.sleep(2)

    # Type content
    text = content.get("text", "")
    send_command("type", {
        "selector": '[contenteditable="true"], textarea',
        "text": text,
    })
    time.sleep(2)

    # Click Post
    send_command("click", {"text": "Post"})
    time.sleep(3)

    print("  Posted to YouTube Community!")
    return {"success": True, "platform": "youtube_community"}


def generate_post(track_data, platform, style="announcement"):
    """Generate a social media post from track data."""
    title = track_data.get("title", "New Track")
    desc = track_data.get("description", "")
    url = track_data.get("url", "")
    tags = track_data.get("tags", "")

    posts = {
        "announcement": {
            "x": f'New track: "{title}" is out now!\n\n{desc[:140]}\n\n{url}\n\n#TellLemThatsMe #NewMusic #HipHop',
            "facebook_group": f'NEW TRACK: {title}\n\n{desc}\n\nWatch here: {url}\n\nWhat do you think? Drop a comment!',
            "facebook_profile": f'Just dropped "{title}" - this one hits different.\n\n{url}\n\nLet me know what you think!',
            "instagram": f'New track "{title}" out now!\n\n{desc[:200]}\n\nLink in bio\n\n#TellLemThatsMe #NewMusic #HipHop #OriginalMusic #AustralianRap',
            "tiktok": f'{title} 🎵\n\n{desc[:100]}\n\n#TellLemThatsMe #NewMusic #HipHop #AustralianRap',
            "youtube_community": f'{title} is OUT NOW!\n\n{desc}\n\nWatch: {url}\n\nWhat\'s your favorite line? Drop it below!',
        },
        "hype": {
            "x": f'🔥 {title}\n\nThis one\'s special. Listen and tell me I\'m wrong.\n\n{url}\n\n#TellLemThatsMe #HipHop',
            "facebook_group": f'Y\'ALL. 🔥\n\n{title} just dropped.\n\n{url}\n\nI need your honest thoughts!',
            "facebook_profile": f'Sometimes you just know when a track is different.\n\n{title} — out now.\n\n{url}',
            "instagram": f'{title} 🔥\n\nThis one hits different. New music out now.\n\n#TellLemThatsMe #NewMusic #HipHop',
            "tiktok": f'{title} 🔥\n\nWait for it...\n\n#TellLemThatsMe #HipHop #NewMusic',
            "youtube_community": f'Just dropped "{title}" and I think this might be my favorite one yet.\n\nWhat do you think? 🎧',
        },
        "engagement": {
            "x": f'Quick question for my music fans:\n\nWhat matters more in a track?\n\nA) The beat\nB) The lyrics\nC) The story behind it\n\n{url}\n\n#TellLemThatsMe #HipHop',
            "facebook_group": f'Question for the group:\n\nWhen you listen to a new track, what hooks you first?\n\nThe beat? The lyrics? The vibe?\n\nI\'d love to know — drop your answer below!',
            "facebook_profile": f'Music question for my friends:\n\nWhat makes you press replay on a track?\n\nGenuinely curious. Drop your answer below!',
            "instagram": f'Poll time! 🎵\n\nWhat matters more?\n\nA) The beat\nB) The lyrics\nC) The story\n\nComment your answer!\n\n#TellLemThatsMe #MusicPoll #HipHop',
            "tiktok": f'What matters more?\n\nA) The beat\nB) The lyrics\nC) The story\n\nComment below!',
            "youtube_community": f'Quick question for the community:\n\nWhen you hear a track for the first time, what grabs you first?\n\nA) The beat\nB) The lyrics\nC) The story\n\nLet me know in the comments!',
        },
    }

    style_posts = posts.get(style, posts["announcement"])
    platform_key = platform.lower().replace("/", "_")

    if platform_key in style_posts:
        return {
            "platform": platform,
            "style": style,
            "text": style_posts[platform_key],
        }

    return {"platform": platform, "style": style, "text": style_posts.get("x", "")}


def post_all(content, platforms=None):
    """Post content to multiple platforms."""
    if platforms is None:
        platforms = ["facebook_group", "x"]

    results = []
    for platform in platforms:
        print(f"\n--- Posting to {platform} ---")
        if platform == "facebook_group":
            for i, group in enumerate(FB_GROUPS[:3]):
                print(f"  Group {i + 1}/{min(len(FB_GROUPS), 3)}...")
                result = post_to_facebook_group(content, group)
                results.append(result)
                time.sleep(5)
        elif platform == "facebook_profile":
            result = post_to_facebook_profile(content)
            results.append(result)
            time.sleep(5)
        elif platform == "x":
            result = post_to_x(content)
            results.append(result)
            time.sleep(5)
        elif platform == "youtube_community":
            result = post_youtube_community(content)
            results.append(result)
            time.sleep(5)
        else:
            print(f"  Platform '{platform}' not automated yet — use manual copy-paste")
            results.append({"success": False, "error": "Not automated", "platform": platform})

    return results


def test_connection():
    """Test bridge connection."""
    print("Testing bridge connection...")
    if check_bridge():
        print("  Bridge is ONLINE")
        return True
    else:
        print("  Bridge is OFFLINE")
        print("  Start it: python browser_extension/bridge_server.py")
        return False


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if len(sys.argv) < 2 or "--help" in sys.argv:
        print(__doc__)
        print("\nPlatforms:", ", ".join(PLATFORMS.keys()))
        print("Styles: announcement, hype, engagement")
        return

    if "--test" in sys.argv:
        if test_connection():
            print("\nBridge is ready for posting!")
        return

    if "--generate" in sys.argv:
        # Generate post content
        idx = sys.argv.index("--generate")
        if idx + 2 < len(sys.argv):
            track_title = sys.argv[idx + 1]
            platform = sys.argv[idx + 2]
            style = "announcement"
            if "--style" in sys.argv:
                s_idx = sys.argv.index("--style")
                if s_idx + 1 < len(sys.argv):
                    style = sys.argv[s_idx + 1]

            post = generate_post({"title": track_title}, platform, style)
            print(f"\n--- Generated {platform} post ({style}) ---\n")
            print(post["text"])
            print("\n--- Copy the above and paste manually ---")
        return

    if "--post" in sys.argv:
        if not test_connection():
            return

        # Read content from file or stdin
        content_file = None
        if "--content" in sys.argv:
            c_idx = sys.argv.index("--content")
            if c_idx + 1 < len(sys.argv):
                content_file = sys.argv[c_idx + 1]

        if content_file:
            with open(content_file, "r", encoding="utf-8") as f:
                content = json.load(f)
        else:
            print("Provide --content <file.json> with {\"text\": \"your post\"}")
            return

        platforms = ["x", "facebook_group"]
        if "--platform" in sys.argv:
            p_idx = sys.argv.index("--platform")
            if p_idx + 1 < len(sys.argv):
                platforms = [sys.argv[p_idx + 1]]

        results = post_all(content, platforms)
        print(f"\n--- Results ---")
        for r in results:
            print(f"  {r.get('platform', '?')}: {'OK' if r.get('success') else r.get('error', 'failed')}")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
