const cron = require('node-cron');
const { runLeadHunterCycle, runContentBotCycle } = require('./routes/revenue');

// Env overrides for cron expressions
const ENV_SCHEDULES = {
  leadHunter: process.env.LEAD_HUNTER_CRON,
  contentBot: process.env.CONTENT_BOT_CRON,
};

// ── KARMA Revenue Engine Scheduler ───────────────────────────────────────────
// Schedules autonomous revenue modules on configurable cron intervals.

const DEFAULT_SCHEDULES = {
  leadHunter: {
    enabled: true,
    cron: '0 9 * * *',   // Daily at 09:00
    description: 'Lead Hunter daily sweep',
  },
  contentBot: {
    enabled: true,
    cron: '0 */6 * * *', // Every 6 hours
    description: 'Content Bot publishing cycle',
  },
};

let tasks = [];
let isRunning = false;
let runningConfig = null;

function startScheduler(db, config = {}) {
  if (isRunning) {
    console.warn('[Scheduler] Already running — stop first to restart');
    return { started: false, reason: 'Already running' };
  }

  const schedules = config.schedules || DEFAULT_SCHEDULES;
  // (functions imported at top of file)

  // ── Lead Hunter ────────────────────────────────────────────────────────────
  if (schedules.leadHunter?.enabled !== false) {
    const lhCron = ENV_SCHEDULES.leadHunter || schedules.leadHunter?.cron || DEFAULT_SCHEDULES.leadHunter.cron;
    const lhTask = cron.schedule(lhCron, async () => {
      console.log(`[Scheduler] ${schedules.leadHunter?.description || DEFAULT_SCHEDULES.leadHunter.description}`);
      try {
        const result = await runLeadHunterCycle(db, { modules: { leadHunter: { enabled: true } } });
        console.log(`[Scheduler] Lead Hunter result:`, result.ran ? 'ran' : 'skipped', result.reason || '');
      } catch (e) {
        console.error('[Scheduler] Lead Hunter error:', e.message);
      }
    }, { scheduled: true, timezone: config.timezone || 'UTC' });
    tasks.push({ name: 'leadHunter', task: lhTask });
    console.log(`[Scheduler] Lead Hunter scheduled: ${lhCron}`);
  }

  // ── Content Bot ────────────────────────────────────────────────────────────
  if (schedules.contentBot?.enabled !== false) {
    const cbCron = ENV_SCHEDULES.contentBot || schedules.contentBot?.cron || DEFAULT_SCHEDULES.contentBot.cron;
    const cbTask = cron.schedule(cbCron, async () => {
      console.log(`[Scheduler] ${schedules.contentBot?.description || DEFAULT_SCHEDULES.contentBot.description}`);
      try {
        const result = await runContentBotCycle(db, { modules: { contentBot: { enabled: true } } });
        console.log(`[Scheduler] Content Bot result:`, result.postsPublished || 0, 'posts published');
      } catch (e) {
        console.error('[Scheduler] Content Bot error:', e.message);
      }
    }, { scheduled: true, timezone: config.timezone || 'UTC' });
    tasks.push({ name: 'contentBot', task: cbTask });
    console.log(`[Scheduler] Content Bot scheduled: ${cbCron}`);
  }

  runningConfig = schedules;
  isRunning = true;
  return { started: true, tasks: tasks.map(t => t.name) };
}

function stopScheduler() {
  for (const { task } of tasks) {
    task.stop();
  }
  tasks = [];
  runningConfig = null;
  isRunning = false;
  console.log('[Scheduler] All tasks stopped');
  return { stopped: true };
}

function getSchedulerStatus() {
  return {
    running: isRunning,
    tasks: tasks.map(t => ({ name: t.name, running: true })),
    schedules: runningConfig || DEFAULT_SCHEDULES,
  };
}

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  DEFAULT_SCHEDULES,
};
