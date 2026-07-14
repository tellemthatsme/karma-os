# Scheduler — Cron + CLI Reference

> Location: `src/scheduler.js` · CLI: `cli/scheduler.js` · Tests: `karma-revenue.spec.js` (4 tests)

The scheduler drives Lead Hunter and Content Bot on a configurable cron schedule using [`node-cron`](https://www.npmjs.com/package/node-cron).

---

## Default Schedules

Defined at top of `src/scheduler.js`:

| Task | Cron | Description |
|------|------|-------------|
| `leadHunter` | `0 9 * * *` | Daily at 09:00 (UTC) |
| `contentBot` | `0 */6 * * *` | Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC) |

---

## Cron Format (node-cron)

Standard 5-field cron expression:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ day of week   (0-7, Sun=0 or 7)
│ │ │ └─── month          (1-12)
│ │ └───── day of month   (1-31)
│ └─────── hour           (0-23)
└───────── minute         (0-59)
```

**Examples:**
- `0 9 * * *` — every day at 09:00
- `0 */6 * * *` — every 6 hours
- `*/15 * * * *` — every 15 minutes
- `30 8 * * 1-5` — weekdays at 08:30
- `0 0 1 * *` — first of every month at midnight

---

## Environment Variable Overrides

Override any module's cron via env var (no code changes):

```bash
# Run Lead Hunter twice a day instead of once
export LEAD_HUNTER_CRON="0 9,15 * * *"

# Run Content Bot every 3 hours
export CONTENT_BOT_CRON="0 */3 * * *"

node server.js    # Scheduler picks up overrides at startup
```

The env vars are read once at module load. To change them, restart the process.

---

## Programmatic API

### `startScheduler(db, config)`

Start the scheduler with optional config overrides.

**Parameters:**
- `db` — DB instance with `.get`, `.run`, `.all` methods (or a stub for CLI use)
- `config` (optional):
  - `config.schedules` — override any module's `{ enabled, cron, description }`
  - `config.timezone` — cron timezone (default `'UTC'`)

**Returns:** `{ started: true, tasks: ['leadHunter', 'contentBot'] }` or `{ started: false, reason: 'Already running' }` if a previous start is active.

**Example:**
```js
const { startScheduler } = require('./src/scheduler');

startScheduler(db, {
  timezone: 'America/New_York',
  schedules: {
    leadHunter: { enabled: true, cron: '0 9 * * *' },
    contentBot: { enabled: true, cron: '0 */6 * * *' },
  },
});
```

---

### `stopScheduler()`

Stop all running tasks.

**Returns:** `{ stopped: true }`

**Side effects:**
- Calls `.stop()` on every `cron` task
- Clears the `tasks` array
- Resets `isRunning` flag and active config

**Example:**
```js
const { stopScheduler } = require('./src/scheduler');
stopScheduler();
// Output: '[Scheduler] All tasks stopped'
```

---

### `getSchedulerStatus()`

Snapshot of current scheduler state.

**Returns:**
```js
{
  running: boolean,      // true if startScheduler was called and not stopped
  tasks: [{ name, running }],  // currently active tasks
  schedules: { leadHunter: {...}, contentBot: {...} }  // active config
}
```

Used by `/api/scheduler/status` endpoint and dashboard.

---

## CLI Usage

**Binary:** `node cli/scheduler.js` (or `chmod +x cli/scheduler.js && ./cli/scheduler.js`)

### `start`

```bash
$ node cli/scheduler.js start
✅ Scheduler started
   Tasks: leadHunter, contentBot
   Press Ctrl+C to stop
```

Creates a `dbStub` (no real DB), starts cron tasks, keeps the process alive. Press `Ctrl+C` to stop.

### `stop`

```bash
$ node cli/scheduler.js stop
✅ Scheduler stopped
```

### `status`

```bash
$ node cli/scheduler.js status

╔══════════════════════════════════════════════════════════════╗
║           KARMA Revenue Engine Scheduler Status              ║
╠══════════════════════════════════════════════════════════════╣
║  Running:     ✅ YES                                         ║
║  Tasks:       2                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Lead Hunter   ✅  cron: 0 9 * * *                           ║
║  Content Bot   ✅  cron: 0 */6 * * *                         ║
╚══════════════════════════════════════════════════════════════╝
```

### `help`

```bash
$ node cli/scheduler.js help

Karma Revenue Engine — Scheduler CLI

Usage:
  node cli/scheduler.js <command>

Commands:
  start   Start the scheduler (Lead Hunter daily + Content Bot every 6h)
  stop    Stop all scheduled tasks
  status  Show current scheduler status and next run times

Examples:
  node cli/scheduler.js start
  node cli/scheduler.js stop
  node cli/scheduler.js status
```

---

## Lifecycle

### Production (server.js)

```js
// In server.listen callback:
startScheduler(db, { timezone: 'UTC' });
// Tasks now run forever, until process exit.
```

### Test

```js
const { startScheduler, stopScheduler } = require('./src/scheduler');

// Test sequence: start → verify → stop
const result = startScheduler(mockDb, { timezone: 'UTC' });
assert(result.started);

// ... assertions ...

stopScheduler();
```

Tests use `stopScheduler` in a `finally` block to ensure cleanup even on assertion failure.

### CLI

Process stays alive after `start` via a no-op `setInterval(() => {}, 1 << 30)`. Send `SIGINT` (`Ctrl+C`) to gracefully stop tasks and exit.

---

## Edge Cases

- **Re-starting without stopping:** `startScheduler` returns `{ started: false, reason: 'Already running' }` — no exception thrown.
- **Stopping when not running:** `stopScheduler` still clears state and logs `'[Scheduler] All tasks stopped'`. Safe idempotent.
- **DB errors during cron tick:** Errors are caught and logged with `[Scheduler] Lead Hunter error: ...`. The next tick still runs.
- **Timezone:** Set `config.timezone` to IANA name (`America/New_York`, `Europe/London`, etc.). Validated by node-cron at task creation.

---

## Files

- `src/scheduler.js` — module (100 lines, 4 exports)
- `cli/scheduler.js` — CLI binary (98 lines)
- `karma-revenue.spec.js` — 4 tests (lines 287–325): start, double-start, status, stop
- `server.js` — wired into `server.listen()` callback with UTC timezone

---

## See Also

- [REVENUE_ENGINE.md §3](./REVENUE_ENGINE.md) — module overview (Lead Hunter, Content Bot)
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) — `/api/scheduler/status` endpoint shape
- [TESTING.md](./TESTING.md) — scheduler test patterns
