# Dashboard & Success Page

> Location: `public/revenue.html` (432 lines) · `public/revenue/success.html` (159 lines)

The Revenue Engine has two frontend surfaces: a live operator dashboard and a Stripe payment success page.

---

## Dashboard (`/revenue`)

### Tabs

| Tab | Purpose | Data source |
|-----|---------|-------------|
| **Overview** | KPI cards, revenue chart, guardrails, Lead Hunter stats | `/api/revenue/status` |
| **Modules** | Toggle each module on/off, manual Run buttons | `/api/revenue/status`, `POST /api/revenue/module/toggle` |
| **Content Bot** | Recent posts, run cycle button | `/api/revenue/content-bot/posts` |
| **Payments** | Stripe revenue, create-checkout button, recent payments | `/api/revenue/status`, `POST /api/revenue/stripe/checkout` |
| **Decisions** | Audit log of all engine actions | `/api/revenue/decisions` |
| **Scheduler** | Live scheduler status + cron task list | `/api/scheduler/status` |
| **Live Log** | Auto-scrolling system log | polled + new events |

### Interactions

- **Refresh button** — top-right, forces immediate reload of all tabs.
- **Tab switch** — clicks switch visible tab panel; no page reload.
- **Toggle module** — buttons in Modules tab flip `enabled` and re-render.
- **Manual Run** — buttons in Modules tab POST to trigger cycle immediately.
- **Create Checkout** — Payments tab opens Stripe URL in new tab (in dev mode, opens demo success page).
- **Toast notifications** — appear top-right for 3s after button actions.

### Auto-refresh

Dashboard polls `/api/revenue/status` every **5 seconds** (configurable). Scheduler tab also pulls `/api/scheduler/status` on manual refresh.

---

## Theming

CSS variables at top of `public/revenue.html`:

```css
:root {
  --bg: #0b0f17;           /* Page background */
  --panel: #111827;        /* Card background */
  --accent: #00e5ff;       /* Primary cyan */
  --accent2: #7c3aed;      /* Violet */
  --accent3: #ec4899;      /* Pink (Stripe) */
  --text: #e2e8f0;
  --muted: #94a3b8;
  --border: rgba(255,255,255,0.08);
}
```

Fallback strategy: cards have `rgba(255,255,255,0.03)` overlays for `/var(--border)` so subtle dividers work in any theme.

### To retheme

1. Change `--accent`, `--accent2`, `--accent3` for a new color palette.
2. Change `--bg` + `--panel` for new depth.
3. Optionally override `--text` and `--muted`.

All components reflow automatically — no inline colors in the HTML.

---

## Component Anatomy

### KPI card

```html
<div class="card">
  <h3>Today Revenue</h3>
  <div class="value">$49.00</div>
  <div class="change up">+12%</div>
</div>
```

### Module row

```html
<div class="module-row">
  <div>
    <div style="font-weight:600">Lead Hunter</div>
    <div style="font-size:.875rem;color:var(--muted)">Daily outbound at 09:00</div>
  </div>
  <div style="display:flex;gap:.5rem;align-items:center">
    <span class="tag tag-on">ON</span>
    <button class="btn btn-sm btn-secondary">Disable</button>
  </div>
</div>
```

### Status tag

```html
<span class="tag tag-on">Active</span>
<span class="tag tag-off">Disabled</span>
```

### Button variants

```html
<button class="btn btn-primary">Primary (cyan)</button>
<button class="btn btn-accent2">Violet</button>
<button class="btn btn-accent3">Pink (Stripe)</button>
<button class="btn btn-secondary">Neutral</button>
<button class="btn btn-sm btn-primary">Small</button>
```

---

## Render Functions

Each tab has its own `renderXxx()` function. They all read from a shared `state` object and write to their respective `<div id="...">` target.

```js
let state = {
  modules: [], guardrails: {}, stats: {},
  decisions: [], leads: [], posts: [], payments: [],
  scheduler: { running: false, tasks: [], schedules: {} }
};

function renderScheduler() {
  const sched = state.scheduler || {};
  // Updates #schedulerStats and #schedulerTasks
}

function renderStats() { /* Updates #statsGrid */ }
function renderModules() { /* Updates #modulesList */ }
function renderGuardrails() { /* Updates #guardrailsList */ }
```

Adding a new tab:
1. Add `<div class="tab" onclick="switchTab('myTab',this)">My Tab</div>` to the tab strip.
2. Add `<div id="myTab" class="tab-content">...</div>` near the bottom.
3. Add a `renderMyTab()` function and call it from `refresh()`.
4. Fetch any required data in `refresh()` and store in `state.myTab`.
5. Document in this file.

---

## Toast notifications

```js
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
```

Use `showToast('Lead Hunter started')` after a successful action. Toasts fade in/out via the `.show` class (CSS handles transition).

---

## Payment Success Page (`/revenue/success`)

Standalone page served from `public/revenue/success.html`. Hit by Stripe redirect with `?session_id=cs_xxx` query param.

### Flow

1. Stripe redirects to `/revenue/success?session_id=cs_test_xyz`
2. JS reads `session_id` from URL via `URLSearchParams`.
3. `fetch('/api/revenue/stripe/verify?session_id=...')`.
4. **Verified:** show success card with plan, amount, email, "Open Dashboard" button.
5. **Not verified / missing:** show error card.
6. **No session_id:** show "No session ID" error.

### Security

- All API responses are rendered via `textContent` — no `innerHTML` with user data. (See REVENUE_ENGINE.md §3.3 for the verify endpoint contract.)
- Error messages use `createElement('span')` + `textContent` to prevent XSS if Stripe webhooks ever return untrusted HTML.

### Demo mode

In development, if Stripe isn't configured and the session isn't in the local DB, the verify endpoint returns a mock verified response (gated by `NODE_ENV !== 'production'`). This lets you click "Create Checkout" and see the success page end-to-end without Stripe keys.

To set up Stripe for real:
```bash
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
node server.js
```

---

## Mobile

Dashboard uses flexbox + Grid with auto-min widths. On narrow viewports (<600px), the 4-column grid collapses to 2 columns. Module rows wrap via `flex-wrap`.

The success page is `max-width: 480px` and centered, so it looks identical on phone and desktop.

---

## Extending

### Add a new KPI

Edit `renderStats()` in `public/revenue.html`:
```js
const items = [
  { label: 'Today Revenue', value: '$' + (s.todayRevenue || 0).toFixed(2), change: '+0%', up: true },
  // Add: { label: 'New KPI', value: '42', change: '+5%', up: true },
];
```

### Add a new tab

Follow the "Adding a new tab" steps above.

### Replace live polling with WebSockets

Replace `refresh()` timeout with a `WebSocket` listener that pushes updates directly into `state`. The render functions don't change.

---

## Files

- `public/revenue.html` — dashboard (432 lines)
- `public/revenue/success.html` — payment success (159 lines)
- `server.js` — serves both as static files

---

## See Also

- [REVENUE_ENGINE.md §6](./REVENUE_ENGINE.md) — dashboard section in architecture
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) — endpoints the dashboard calls
