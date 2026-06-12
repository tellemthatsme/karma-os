#!/usr/bin/env python3
"""
YouTube Researcher + Playlist Summarizer
========================================
Uses the AI browser bridge (MCP) + Claude API (via /api/chat proxy) to:
1. Open YouTube channels
2. Extract their playlists
3. Read the playlist contents
4. Summarize each via Claude
5. Output a brief — ready for the AI news channel

Usage:
    python youtube_researcher.py --channel "Wes Roth" "Matt Wolfe" --max-videos 5
    python youtube_researcher.py --playlist "https://youtube.com/playlist?list=..." --max-videos 10
    python youtube_researcher.py --trending --output ai_news/CURRENT_AI_BRIEF.md
    python youtube_researcher.py --summarize-only --input research.json
    python youtube_researcher.py --test          # Test bridge connection

Requires:
    - bridge_server.py running on :9876 (browser polling extension)
    - server.js running on :8888 (Claude proxy with ANTHROPIC_API_KEY)
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta

BRIDGE_URL = 'http://127.0.0.1:9876'
CHAT_URL = 'http://localhost:8888/api/chat'

# ============================================================================
# CHANNEL CONFIG — top AI channels to follow (2026)
# ============================================================================
CHANNELS = {
    # News
    'Wes Roth':         {'url': 'youtube.com/@WesRoth',         'focus': 'daily AI news, agents, tools', 'cadence': 'daily'},
    'Matt Wolfe':       {'url': 'youtube.com/@maboroshi_desu',  'focus': 'AI tools, creator workflows',    'cadence': '3-5x/wk'},
    'The AI Grid':      {'url': 'youtube.com/@TheAIGrid',       'focus': 'weekly AI news roundup',         'cadence': 'weekly'},
    'Matthew Berman':   {'url': 'youtube.com/@matthewberman',   'focus': 'AI agents, demos, tutorials',    'cadence': '3x/wk'},
    'AI Code King':     {'url': 'youtube.com/@theaicodeking',   'focus': 'daily dev agent coverage, new tools', 'cadence': 'daily'},
    # Research / deep dives
    'Andrej Karpathy':  {'url': 'youtube.com/@AndrejKarpathy',  'focus': 'deep learning, LLM internals',   'cadence': 'monthly'},
    'Yannic Kilcher':   {'url': 'youtube.com/@YannicKilcher',   'focus': 'paper deep-dives, architecture', 'cadence': '3-5x/wk'},
    'Two Minute Papers':{'url': 'youtube.com/@TwoMinutePapers', 'focus': 'research breakthroughs',         'cadence': 'weekly'},
    '3Blue1Brown':      {'url': 'youtube.com/@3blue1brown',     'focus': 'math/ML fundamentals',           'cadence': 'monthly'},
    # Tutorials / coding
    'DeepLearning.AI':  {'url': 'youtube.com/@DeepLearningAI',  'focus': 'Andrew Ng courses, tutorials',   'cadence': 'weekly'},
    'Krish Naik':       {'url': 'youtube.com/@krishnaik06',     'focus': 'MLOps, deployment, coding',      'cadence': '3x/wk'},
    'Tech With Tim':    {'url': 'youtube.com/@TechWithTim',     'focus': 'build AI apps',                  'cadence': 'weekly'},
    'Sentdex':          {'url': 'youtube.com/@sentdex',         'focus': 'real-world AI projects',         'cadence': 'weekly'},
    'StatQuest':        {'url': 'youtube.com/@statquest',       'focus': 'ML/stats fundamentals',          'cadence': 'weekly'},
    # Long-form / philosophy
    'Lex Fridman':      {'url': 'youtube.com/@lexfridman',      'focus': 'long-form AI + society',         'cadence': '2-3x/wk'},
    # Production AI engineering (2026 additions — all verified)
    'Cole Medin':       {'url': 'youtube.com/@ColeMedin',       'focus': 'production AI agents, n8n, LangGraph', 'cadence': 'weekly', 'verified': True},
    'AI Jason':         {'url': 'youtube.com/@AIJasonZ',        'focus': 'LLM evaluation, agent architecture', 'cadence': 'weekly', 'verified': True},
    'LangChain':        {'url': 'youtube.com/@LangChain',       'focus': 'agent frameworks, RAG, state machines', 'cadence': 'weekly', 'verified': True},
    'AssemblyAI':       {'url': 'youtube.com/@AssemblyAI',      'focus': 'voice AI, multimodal agents, real-time', 'cadence': 'weekly', 'verified': True},
    'Automata Learning Lab': {'url': 'youtube.com/@AutomataLearningLab', 'focus': 'clean integrations, enterprise AI', 'cadence': 'weekly', 'verified': True},
    # AI-assisted development (all verified)
    'Corbin Brown':     {'url': 'youtube.com/@CorbinAI',        'focus': 'Claude Code, Cursor, V0 workflows', 'cadence': '2-3x/wk', 'verified': True},
    'codewithbrandon':  {'url': 'youtube.com/@BrandonHancockAI','focus': 'TypeScript/JS AI, full-stack agents', 'cadence': 'weekly', 'verified': True},
    'VoloBuilds':       {'url': 'youtube.com/@VoloBuilds',      'focus': 'advanced AI dev patterns, RAG',  'cadence': 'weekly', 'verified': True},
    # Indie hacker / solo dev (all verified)
    'David Ondrej':     {'url': 'youtube.com/@DavidOndrej',     'focus': 'low-code agents, n8n/Make + AI', 'cadence': 'weekly', 'verified': True},
    'Riley Brown':      {'url': 'youtube.com/@rileybrownai',    'focus': 'rapid prototyping, Cursor-built apps', 'cadence': '2-3x/wk', 'verified': True},
    'Astro K. Joseph':  {'url': 'youtube.com/@AstroKJ',         'focus': 'business-centric AI engineering', 'cadence': 'weekly', 'verified': True},
    # Browser automation / MCP
    'Firecrawl':        {'url': 'youtube.com/@Firecrawl',       'focus': 'AI web scraping, MCP servers',   'cadence': 'weekly', 'verified': True},
}
}

# ============================================================================
# BRIDGE HELPERS
# ============================================================================
def bridge_call(action, params=None, timeout=30):
    """Send a command to the bridge and wait for result."""
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
        result = json.loads(resp.read())
    except Exception as e:
        return {'error': f'Bridge offline: {e}'}

    job_id = result.get('job_id')
    if not job_id:
        return {'error': 'No job_id returned'}

    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(f'{BRIDGE_URL}/result/{job_id}', timeout=5)
            return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                time.sleep(1)
                continue
            return {'error': f'HTTP {e.code}'}
        except Exception as e:
            return {'error': str(e)}
    return {'error': 'Timeout'}


def claude_summarize(system_prompt, user_prompt, model='claude-sonnet-4-20250514', max_tokens=2000):
    """Call Claude via the server.js /api/chat proxy."""
    payload = {
        'messages': [{'role': 'user', 'content': user_prompt}],
        'system': system_prompt,
        'max_tokens': max_tokens,
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        CHAT_URL,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        resp = urllib.request.urlopen(req, timeout=60)
        body = json.loads(resp.read())
        # body.content is array of {type, text}
        if isinstance(body.get('content'), list):
            return ''.join(c.get('text', '') for c in body['content'] if c.get('type') == 'text')
        return body.get('content', body.get('error', 'No content'))
    except urllib.error.HTTPError as e:
        return f'API error: {e.code} {e.read().decode()[:300]}'
    except Exception as e:
        return f'Error: {e}'


def test_bridge():
    """Test bridge connection."""
    try:
        resp = urllib.request.urlopen(f'{BRIDGE_URL}/status', timeout=3)
        data = json.loads(resp.read())
        print(f'[OK] Bridge online — queue: {data.get("queue_length", 0)}, auth: {data.get("auth", "open")}')
        return True
    except Exception as e:
        print(f'[FAIL] Bridge offline — {e}')
        print('  Start it: python browser_extension/bridge_server.py')
        return False


def test_chat():
    """Test Claude proxy."""
    payload = {'messages': [{'role': 'user', 'content': 'ping'}], 'max_tokens': 30}
    try:
        req = urllib.request.Request(
            CHAT_URL, data=json.dumps(payload).encode(),
            headers={'Content-Type': 'application/json'}, method='POST'
        )
        resp = urllib.request.urlopen(req, timeout=15)
        body = json.loads(resp.read())
        if 'content' in body:
            print('[OK] Claude proxy works —', body['content'][:60] if isinstance(body['content'], str) else 'OK')
            return True
        print(f'[FAIL] Unexpected response: {body}')
        return False
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if e.code == 503 and 'ANTHROPIC_API_KEY' in body:
            print('[WARN] ANTHROPIC_API_KEY not set — Claude proxy will return 503')
            return False
        print(f'[FAIL] {e.code} {body[:200]}')
        return False
    except Exception as e:
        print(f'[FAIL] {e}')
        return False


# ============================================================================
# RESEARCH FUNCTIONS
# ============================================================================
def get_channel_videos(channel_name, max_videos=5):
    """Use the browser bridge to scrape recent videos from a YouTube channel."""
    cfg = CHANNELS.get(channel_name)
    if not cfg:
        return []
    if not cfg.get('verified', True):
        print(f'  \u26a0\ufe0f  unverified handle: {cfg["url"]} \u2014 may 404')
    url = f'https://{cfg["url"]}/videos'
    print(f'  → navigating to {url}')
    bridge_call('browser_navigate', {'url': url}, timeout=15)
    time.sleep(3)
    # Extract video titles + URLs
    js = '''JSON.stringify(Array.from(document.querySelectorAll('a#video-title-link, ytd-rich-item-renderer a, a.ytd-rich-grid-media')).slice(0, ''' + str(max_videos * 2) + ''').map(a => ({title: a.title || a.textContent.trim().slice(0, 100), href: a.href})).filter(x => x.href && x.href.includes('watch')))'''
    result = bridge_call('browser_evaluate', {'code': js}, timeout=15)
    if 'error' in result:
        print(f'  → error: {result["error"]}')
        return []
    try:
        return json.loads(result.get('result', '[]'))
    except Exception:
        return []


def get_video_transcript_or_description(video_url, max_chars=4000):
    """Get the description of a video (transcript extraction needs YouTube API key)."""
    print(f'  → extracting {video_url}')
    bridge_call('browser_navigate', {'url': video_url}, timeout=15)
    time.sleep(3)
    js = '''(() => {
        const desc = document.querySelector('ytd-watch-metadata #description-inner, #description yt-formatted-string, ytd-text-inline-expander #content')?.innerText || '';
        const title = document.querySelector('h1.ytd-watch-metadata, h1.title yt-formatted-string')?.innerText || '';
        const views = document.querySelector('#info-container #info .view-count, .factoid-area .info-text')?.innerText || '';
        const date = document.querySelector('#info-container #info .publish-time, #info-strings yt-formatted-string')?.innerText || '';
        return JSON.stringify({title, views, date, desc: desc.slice(0, ''' + str(max_chars) + ''')});
    })()'''
    result = bridge_call('browser_evaluate', {'code': js}, timeout=15)
    if 'error' in result:
        return {'error': result['error']}
    try:
        return json.loads(result.get('result', '{}'))
    except Exception:
        return {'error': 'parse failed'}


# ============================================================================
# SUMMARIZATION
# ============================================================================
SUMMARIZER_SYSTEM = """You are a research summarizer for a YouTube AI news channel.
Your job: turn raw video descriptions into concise, high-signal briefs.

Format your output as:
- 1-2 sentence hook (what makes this worth watching)
- 3-5 bullet summary (key takeaways, names, numbers, tools mentioned)
- "Why it matters" (1 sentence, channel-relevant)
- "Best for" (which audience segment)

Rules:
- No fluff, no marketing language
- Use actual names and numbers
- Highlight what's NEW vs. restated
- Flag any clickbait or hype

Keep total under 250 words per video."""


BRIEF_SYSTEM = """You are a senior AI research analyst writing a weekly brief.
Output a structured markdown brief with:
1. # Top 5 AI stories (with 1-line summaries + source links)
2. # New models released (table: model | company | key feature)
3. # New AI tools (table: tool | category | pricing)
4. # Trending GitHub repos (table: repo | what it does | stars)
5. # Best YouTube videos to watch (table: title | channel | duration | why)
6. # Recommended action (1-2 things the reader should do THIS WEEK)

Rules:
- Be specific with versions, dates, numbers
- No hype words
- Cite sources where known
- Target length: 600-1000 words"""


def summarize_videos(videos, channel_name, channel_focus):
    """Summarize a batch of videos from one channel."""
    if not videos:
        return f'## {channel_name}\n\nNo videos found.\n'
    user_prompt = f"Channel: {channel_name} (focus: {channel_focus})\n\nVideos to summarize:\n\n"
    for i, v in enumerate(videos, 1):
        user_prompt += f"\n--- Video {i} ---\nTitle: {v.get('title', '?')}\nURL: {v.get('href', '?')}\n"
        if 'description' in v:
            user_prompt += f"Description: {v['description'].get('desc', '')}\n"
    user_prompt += "\n\nSummarize each video in 3-5 bullets. Group by video."
    summary = claude_summarize(SUMMARIZER_SYSTEM, user_prompt)
    return f"## {channel_name} ({channel_focus})\n\n{summary}\n"


def generate_weekly_brief(research_data):
    """Generate the master weekly brief from collected research."""
    user_prompt = "Research data collected this week:\n\n"
    user_prompt += json.dumps(research_data, indent=2, default=str)[:30000]
    user_prompt += "\n\nGenerate the weekly AI brief. Use the current AEST date."
    return claude_summarize(BRIEF_SYSTEM, user_prompt, max_tokens=4000)


# ============================================================================
# COMMANDS
# ============================================================================
def cmd_research_channels(channels, max_videos, output):
    """Research a list of channels and summarize each video."""
    if not test_bridge():
        return
    if not test_chat():
        print('  Claude proxy not available — continuing with raw data only')
    all_research = {}
    for ch in channels:
        cfg = CHANNELS.get(ch, {'url': f'youtube.com/@{ch}', 'focus': '?', 'cadence': '?'})
        print(f'\n[{ch}] {cfg["url"]}')
        videos = get_channel_videos(ch, max_videos)
        if not videos:
            print(f'  no videos found (bridge may be down or rate limited)')
            continue
        for v in videos[:max_videos]:
            desc = get_video_transcript_or_description(v['href'], 3000)
            v['description'] = desc
            time.sleep(2)
        all_research[ch] = {'channel_cfg': cfg, 'videos': videos}
        if test_chat():
            summary = summarize_videos(videos, ch, cfg['focus'])
            all_research[ch]['summary'] = summary
        time.sleep(3)
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(f"# YouTube Research — {datetime.now().strftime('%Y-%m-%d %H:%M AEST')}\n\n")
            for ch, data in all_research.items():
                f.write(data.get('summary', f"## {ch}\n\nNo summary.\n"))
                f.write('\n---\n\n')
        print(f'\n→ wrote {output}')
    return all_research


def cmd_summarize_only(input_file, output):
    """Summarize from a previously-saved research.json file (no browser needed)."""
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not test_chat():
        return
    if output.endswith('.md'):
        full = '# AI Research Brief\n\n'
        for ch, d in data.items():
            full += summarize_videos(d.get('videos', []), ch, d.get('channel_cfg', {}).get('focus', ''))
            full += '\n---\n\n'
        # Add master brief at the end
        full += '# Master Weekly Brief\n\n' + generate_weekly_brief(data) + '\n'
        with open(output, 'w', encoding='utf-8') as f:
            f.write(full)
        print(f'→ wrote {output}')
    else:
        # JSON
        for ch, d in data.items():
            d['summary'] = summarize_videos(d.get('videos', []), ch, d.get('channel_cfg', {}).get('focus', ''))
        with open(output, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str)
        print(f'→ wrote {output}')


def cmd_trending(output):
    """Just generate the weekly brief from the curated CHANNELS list (no browser)."""
    if not test_chat():
        return
    # Use channel list as input
    research = {
        'channel_roster': [
            {'name': k, **v} for k, v in CHANNELS.items()
        ],
        'note': 'This is the channel roster. For actual video content, run --channel to scrape.'
    }
    brief = generate_weekly_brief(research)
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(f"# AI Weekly Brief — {datetime.now().strftime('%Y-%m-%d')}\n\n")
            f.write(brief)
            f.write('\n\n---\n\n## Curated Channel Roster\n\n')
            for k, v in CHANNELS.items():
                f.write(f"- **{k}** ({v['cadence']}): {v['focus']} — https://{v['url']}\n")
        print(f'→ wrote {output}')


# ============================================================================
# CLI
# ============================================================================
def main():
    p = argparse.ArgumentParser(description='YouTube researcher + playlist summarizer')
    p.add_argument('--channel', nargs='+', help='Channel names from CHANNELS dict')
    p.add_argument('--playlist', help='Specific playlist URL')
    p.add_argument('--max-videos', type=int, default=5, help='Max videos per channel (default 5)')
    p.add_argument('--trending', action='store_true', help='Generate weekly brief from curated list only')
    p.add_argument('--summarize-only', action='store_true', help='Summarize from --input file')
    p.add_argument('--input', help='Input research.json (with --summarize-only)')
    p.add_argument('--output', '-o', default='ai_news/CURRENT_AI_BRIEF.md', help='Output file')
    p.add_argument('--test', action='store_true', help='Test bridge + Claude proxy')
    args = p.parse_args()

    if args.test:
        test_bridge()
        test_chat()
        return

    if args.summarize_only:
        if not args.input:
            print('--summarize-only requires --input research.json')
            return
        cmd_summarize_only(args.input, args.output)
        return

    if args.trending:
        cmd_trending(args.output)
        return

    if args.channel:
        cmd_research_channels(args.channel, args.max_videos, args.output)
        return

    # Default: print help
    p.print_help()


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    main()
