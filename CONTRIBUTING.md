# Contributing to KARMA OS

Thanks for your interest in contributing! Here's how to get started.

## Quick Start

```bash
git clone <repo-url>
cd karma-os
npm install
npx playwright install chromium
```

## Development

1. Open any dashboard HTML file directly in Chrome
2. Make changes — they're single-file HTML apps, no build step needed
3. Run tests: `npm test`
4. Run validation: `npm run validate`

## Testing

All PRs must pass the 45-test Playwright suite:

```bash
npm test           # Run all tests
npm run test:hud   # HUD widget tests
npm run validate   # Structural validation
```

## Code Style

- Use Prettier for formatting (`npx prettier --write .`)
- Follow existing patterns in the codebase
- Keep dashboards as self-contained single HTML files where possible
- Use CSS custom properties (variables) for theming
- Use `Orbitron` for display text, `Inter` for body text

## Pull Requests

1. Create a feature branch
2. Make your changes
3. Run tests and ensure they pass
4. Submit PR with a clear description

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the project structure.
