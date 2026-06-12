---
name: karma-theme-system
description: KARMA OS 6-theme design system — CSS variables, color palettes, effects library, and localStorage conventions.
---

# KARMA OS Theme System

## Overview

All 5 dashboards share a single design system via CSS custom properties. The active theme is controlled by the `data-theme` attribute on `<html>` and persists via `localStorage`.

## Theme Application

```html
<html data-theme="stealth">  <!-- Explicit theme -->
<html>                        <!-- Defaults to Cyberpunk -->
```

JavaScript to set theme:
```javascript
document.documentElement.setAttribute('data-theme', 'matrix')
localStorage.setItem('ko_theme', 'matrix')
```

## 6 Theme Palettes

| Theme | `--ac` | `--ac2` | `--ac3` | `--bg` | Vibe |
|-------|--------|---------|---------|--------|------|
| Cyberpunk | `#00d4ff` | `#b347ff` | `#00ff9d` | `#060a14` | Default neon |
| Stealth | `#64ffda` | `#a8b2d1` | `#8892b0` | `#0a0e14` | Muted teal |
| Alert | `#ff3366` | `#ff6b35` | `#ffbd00` | `#14060a` | High-contrast red |
| Matrix | `#00ff41` | `#008f11` | `#00ff41` | `#000300` | Classic green |
| Aurora | `#a78bfa` | `#34d399` | `#f9a8d4` | `#0d0d1a` | Soft purple |
| Light | `#0077cc` | `#7c3aed` | `#059669` | `#f0f4f8` | Clean light |

## CSS Variables Reference

```css
/* Colors */
--ac          /* Primary accent */
--ac2         /* Secondary accent */
--ac3         /* Tertiary accent (green in most themes) */
--bg          /* Page background */
--panel       /* Card/panel background */
--border      /* Border color */
--text        /* Primary text */
--muted       /* Muted/secondary text */
--warn        /* Warning (orange) */
--danger      /* Error/danger (red) */
```

## Effects Library

| Effect | CSS/JS | Usage |
|--------|--------|-------|
| Border glow | `@keyframes` `box-shadow` shift | `.glow-border` |
| Breathing dot | `@keyframes breathe` opacity pulse | Agent status |
| Glow pulse | `text-shadow` animation | Clock, headings |
| NITRO flash | `box-shadow` scale pulse | Boost mode |
| Scanlines | `repeating-linear-gradient` overlay | CRT effect |
| Spotlight | `radial-gradient` mouse-follow | Hero sections |
| Matrix rain | Canvas + JS falling chars | Background |
| Slide-in | `@keyframes slideIn` transform | Feed entries |
| Toast | Fixed + translateY animation | Notifications |

## localStorage Conventions

```javascript
ko_theme          // Current theme name (string)
ko_muted          // Sound muted (boolean string)
ko_gh             // GitHub username
ko_start          // Startup timestamp
```

## Fonts

- **Display/Headings**: `'Orbitron', monospace`
- **Body/UI**: `'Inter', sans-serif`

## Rules

1. **Always** use `var(--variable)` — never hardcode `#00d4ff`
2. **Never** use inline `style="display:none"` — use classes
3. **After adding** a new CSS variable: test all 6 themes
4. **Theme switching**: emit `storage` event for cross-tab sync
5. **Light theme**: test contrast on `--bg: #f0f4f8`
