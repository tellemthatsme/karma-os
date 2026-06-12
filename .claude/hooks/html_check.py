#!/usr/bin/env python3
"""
Claude Code HTML Syntax Checker
Called by PostToolUse hook after Write/Edit to .html files.
Checks all <script> blocks >50 chars with node --check.
"""
import re
import subprocess
import sys
import tempfile
import os

if len(sys.argv) < 2:
    sys.exit(0)

filepath = sys.argv[1]
if not filepath.endswith('.html'):
    sys.exit(0)

try:
    html = open(filepath, encoding='utf-8').read()
except Exception:
    sys.exit(0)

scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.S)
if not scripts:
    sys.exit(0)

failed = False
for i, script in enumerate(scripts):
    if len(script.strip()) < 50:
        continue
    tmpdir = tempfile.gettempdir()
    tmpfile = os.path.join(tmpdir, f'_ccheck_{i}.js')
    with open(tmpfile, 'w', encoding='utf-8') as f:
        f.write(script)
    r = subprocess.run(['node', '--check', tmpfile], capture_output=True, text=True)
    if r.returncode != 0:
        print(f'  SyntaxError in {filepath} (script block {i}):')
        print(r.stderr[:500])
        failed = True
    else:
        print(f'  ok: {filepath} script block {i}')
    try:
        os.unlink(tmpfile)
    except Exception:
        pass

if failed:
    print(f'\nWARNING: Syntax errors found in {filepath}. Fix before committing.')
    # Don't exit 1 in Claude Code hooks — it would abort the agent turn.
    # Instead, print the warning so the agent can fix it.

sys.exit(0)
