#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
//  Karma Revenue Engine — Scheduler CLI
//  Usage: node cli/scheduler.js <start|stop|status>
// ═══════════════════════════════════════════════════════════════════════════════

const { startScheduler, stopScheduler, getSchedulerStatus } = require('../src/scheduler');

const cmd = process.argv[2];

function printHelp() {
  console.log(`
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
`);
}

function printStatus(status) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           KARMA Revenue Engine Scheduler Status              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Running:     ${status.running ? '✅ YES' : '❌ STOPPED'}${' '.repeat(36 - (status.running ? 7 : 10))}║`);
  console.log(`║  Tasks:       ${status.tasks.length}${' '.repeat(44 - String(status.tasks.length).length)}║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const sch = status.schedules || {};
  if (sch.leadHunter) {
    const enabled = sch.leadHunter.enabled !== false ? '✅' : '❌';
    console.log(`║  Lead Hunter   ${enabled}  cron: ${sch.leadHunter.cron || '0 9 * * *'}${' '.repeat(Math.max(0, 28 - (sch.leadHunter.cron || '0 9 * * *').length))}║`);
  }
  if (sch.contentBot) {
    const enabled = sch.contentBot.enabled !== false ? '✅' : '❌';
    console.log(`║  Content Bot   ${enabled}  cron: ${sch.contentBot.cron || '0 */6 * * *'}${' '.repeat(Math.max(0, 26 - (sch.contentBot.cron || '0 */6 * * *').length))}║`);
  }

  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

async function run() {
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp();
    process.exit(0);
  }

  if (cmd === 'status') {
    const status = getSchedulerStatus();
    printStatus(status);
    process.exit(0);
  }

  if (cmd === 'stop') {
    const result = stopScheduler();
    console.log(result.stopped ? '✅ Scheduler stopped' : '⚠️  Scheduler was not running');
    process.exit(0);
  }

  if (cmd === 'start') {
    // Create a minimal in-memory-like db stub for CLI usage
    const dbStub = {
      get: () => {},
      run: () => {},
      all: () => {},
    };
    const result = startScheduler(dbStub, { timezone: 'UTC' });
    if (result.started) {
      console.log('✅ Scheduler started');
      console.log('   Tasks:', result.tasks.join(', '));
      console.log('   Press Ctrl+C to stop');
      // Keep process alive so cron tasks can run
      setInterval(() => {}, 1 << 30);
    } else {
      console.log('⚠️ ', result.reason);
      process.exit(1);
    }
    return;
  }

  console.error(`❌ Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
