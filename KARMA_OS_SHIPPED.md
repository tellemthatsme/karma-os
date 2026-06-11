# KARMA OS v1.3.0 — Shipped

> Production-ready release: 6 bug fixes, 22-tab command center, automated AI research pipeline, cross-browser CI.

## What shipped

### Bug fixes (PR #1 + follow-ups)

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 1 | `server.js` — `ReferenceError` on every request | `url` used before declaration | Moved `const url` above handler |
| 2 | Command center — SyntaxError freezing all 22 tabs | Unescaped `’` in single-quoted string | Replaced with `’` entity |
| 3 | `copyAIResearch` crash on click | Missing `async` keyword on function using `await` | Added `async` |
| 4 | ytresearch tab never showed content | `class="panel"` instead of `class="section"` — `showTab()` only toggles `.section` | Changed to `section` |
| 5 | ytresearch tab still invisible after class fix | Inline `style="display:none"` overrode CSS `.section.active { display:block }` | Removed inline style |
| 6 | `loadAIResearch` failure — no user feedback | Outer catch only logged `console.warn` | Now shows error message + CLI command in brief panel |

### Infrastructure

- **`/media/` static file handler** — serves dashboards via HTTP with path-traversal protection (`startsWith` + `..` stripping + `decodeURIComponent` try/catch)
- **Pre-commit hook** (`.githooks/pre-commit`) — validates ALL `<script>` blocks >50 chars with `node -c`, catching syntax errors before they reach production
- **72 Playwright test cases** — chromium in CI (up from 53). Cross-browser sweep (all 3) available via `npm run test:cross-browser`
- **GitHub Actions CI** — runs all 3 browsers on push/PR with artifact upload
- **Architecture diagram** in README.md

### AI Research Pipeline

- `scripts/youtube_researcher.py` — scrapes trending AI/ML content, generates markdown briefs
- `/api/research/refresh` — triggers research run (background, 120s timeout)
- `/api/research/status` — polls job state + brief metadata
- `/api/research/history` — lists last 30 archived briefs
- `/api/research/rss` — Atom feed for RSS readers (Feedly, NetNewsWire)
- `/api/push/{discord,telegram,slack}` — one-click publish to social platforms
- Archive system — auto-prunes to 30 days

## Verification

```
✅ 22/22 tabs switch correctly (headless via http://localhost:8888)
✅ 72/72 chromium tests passing in CI. Cross-browser (firefox/webkit) runs separately via `test:cross-browser`
✅ Pre-commit hook catches syntax errors in all script blocks
✅ Code reviewer approved on all commits
✅ CI pipeline runs 3 browsers on every push
```

## Quick start

```bash
# Clone and run
npm install
npm run install:browsers    # install Playwright browsers
node server.js               # starts on http://localhost:8888

# Run tests
npm test                     # chromium only
npx playwright test          # all 3 browsers

# Set up pre-commit hook
git config core.hooksPath .githooks

# Generate AI research brief
python scripts/youtube_researcher.py --trending -o ai_news/CURRENT_AI_BRIEF.md
```

## File map

```
karma/
├── server.js                                    # Node.js API server (12 endpoints)
├── media/
│   ├── TELLLEMTHATSME_COMMAND_CENTER.html        # 22-tab command center (179KB)
│   ├── karma-hud.html                           # Floating HUD widget
│   ├── karma-widget.html                        # Compact sidebar widget
│   └── live-desktop.html                        # Matrix rain desktop overlay
├── ai_news/
│   ├── CURRENT_AI_BRIEF.md                      # Latest research brief
│   └── archive/                                 # Last 30 days of briefs
├── scripts/
│   └── youtube_researcher.py                    # AI research pipeline
├── .githooks/
│   └── pre-commit                               # Script block syntax validator
├── .github/workflows/test.yml                   # CI pipeline (3 browsers)
├── karma-server-regression.spec.js              # Server regression tests
├── karma-research.spec.js                       # Research pipeline tests
├── validate-karma.js                            # Local validation script
├── KARMA_OS_SHIPPED.md                          # Release notes (this file)
├── CHANGELOG.md                                 # Version history
├── ARCHITECTURE.md                              # System architecture
├── CONTRIBUTING.md                              # Contributor guide
└── PRD.md                                       # Product requirements
```

---

*v1.3.0 (package version) — 2025-06-12 — 8 commits — 72 tests — 22 tabs — 3 browsers*

> Note: The server system prompt references "KARMA OS v25 ULTIMATE" (UI brand version). Package version tracks code releases.
