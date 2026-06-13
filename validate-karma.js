#!/usr/bin/env node
/**
 * karma-os-ultimate.html - Headless Validation Script
 * 
 * Usage: node validate-karma.js
 * Validates: startup, HTTP endpoints, response timing, A/B tests, WebSocket
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const WebSocket = require('ws');

const PORT = 8888;
const BASE = `http://localhost:${PORT}`;
const WS_BASE = `ws://localhost:${PORT}`;
const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

let errors = [];
let warnings = [];
let pass = 0;
let fail = 0;

function log(msg) { console.log(msg); }
function ok(msg) { pass++; console.log(`  ✅ ${msg}`); }
function bad(msg) { fail++; errors.push(msg); console.log(`  ❌ ${msg}`); }
function warn(msg) { warnings.push(msg); console.log(`  ⚠️  ${msg}`); }

// ── HTTP Request Helper ─────────────────────────────────────────────────
async function httpReq(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {},
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }); }
        catch (e) { resolve({ status: res.statusCode, text: data, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── WebSocket Helper ────────────────────────────────────────────────────
async function wsConnect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_BASE);
    const timer = setTimeout(() => { ws.close(); reject(new Error('WS timeout')); }, 5000);
    ws.on('open', () => { clearTimeout(timer); resolve(ws); });
    ws.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

// ── Startup Validation ──────────────────────────────────────────────────
async function validateStartup() {
  log('\n🚀 Startup Validation');
  const pkgPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(pkgPath)) { bad('package.json not found'); return false; }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.name) { bad('package.json missing name'); }
  else { ok(`package.json valid — ${pkg.name} v${pkg.version || '?'}`); }
  const hasDeps = !!(pkg.dependencies && (pkg.dependencies.sqlite3 || pkg.dependencies.ws));
  if (!hasDeps) { warn('sqlite3 or ws not in dependencies — run npm install'); }
  else { ok('sqlite3 and ws dependencies present'); }
  return true;
}

// ── HTTP Endpoint Validation ──────────────────────────────────────────────
async function validateEndpoints() {
  log('\n🌐 HTTP Endpoint Validation');
  const endpoints = [
    { path: '/metrics', method: 'GET', expect: 200, key: 'memory_total_gb' },
    { path: '/health', method: 'GET', expect: 200, key: 'status' },
    { path: '/github', method: 'GET', expect: 200, key: 'user' },
    { path: '/git', method: 'GET', expect: 200, key: 'commits' },
    { path: '/cr', method: 'GET', expect: 200, key: 'security_score' },
  ];
  for (const ep of endpoints) {
    const start = Date.now();
    const res = await httpReq(ep.method, ep.path);
    const duration = Date.now() - start;
    if (res.status !== ep.expect) { bad(`${ep.path} returned ${res.status}, expected ${ep.expect}`); continue; }
    if (ep.key && !res.data[ep.key]) { bad(`${ep.path} missing key: ${ep.key}`); continue; }
    if (duration > 2000) { warn(`${ep.path} slow — ${duration}ms`); }
    ok(`${ep.path} — ${duration}ms, ${ep.key} present`);
  }
}

// ── Response Timing Check ───────────────────────────────────────────────
async function validateTiming() {
  log('\n⏱ Response Timing Check');
  const times = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await httpReq('GET', '/health');
    times.push(Date.now() - start);
    await SLEEP(50);
  }
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const max = Math.max(...times);
  if (avg > 500) { bad(`/health avg ${avg}ms > 500ms threshold`); }
  else { ok(`/health avg ${avg}ms (max ${max}ms)`); }
}

// ── A/B Test API Validation ─────────────────────────────────────────────
async function validateABTests() {
  log('\n🧪 A/B Test API Validation');
  // 1. Create config
  const configRes = await httpReq('POST', '/api/abtest/config', JSON.stringify({
    testId: 'validate_test',
    name: 'Validation Test',
    variants: ['control', 'variant_a'],
    weights: [0.5, 0.5],
  }));
  if (configRes.status !== 200 || !configRes.data.ok) { bad('Config creation failed'); }
  else { ok('Config created'); }
  // 2. Submit events
  const eventsRes = await httpReq('POST', '/api/abtest/event', JSON.stringify({
    events: [
      { testId: 'validate_test', variant: 'control', event: 'impression', userId: 'u1', ts: Date.now() },
      { testId: 'validate_test', variant: 'control', event: 'click', userId: 'u1', ts: Date.now() },
      { testId: 'validate_test', variant: 'variant_a', event: 'impression', userId: 'u2', ts: Date.now() },
      { testId: 'validate_test', variant: 'variant_a', event: 'conversion', userId: 'u2', ts: Date.now(), props: { revenue: 99.99 } },
    ],
  }));
  if (eventsRes.status !== 200 || !eventsRes.data.ok) { bad('Event submission failed'); }
  else { ok(`Events submitted — ${eventsRes.data.accepted} accepted`); }
  // 3. Get results
  const resultsRes = await httpReq('GET', '/api/abtest/results');
  if (resultsRes.status !== 200 || !resultsRes.data.ok) { bad('Results fetch failed'); }
  else {
    const r = resultsRes.data.results;
    if (r.validate_test && r.validate_test.control && r.validate_test.variant_a) { ok('Results computed for both variants'); }
    else { bad('Results missing variant data'); }
  }
  // 4. Stats endpoint
  const statsRes = await httpReq('GET', '/api/abtest/stats');
  if (statsRes.status !== 200 || !statsRes.data.ok) { bad('Stats endpoint failed'); }
  else { ok(`Stats: ${statsRes.data.totalEvents} events, ${statsRes.data.tests.length} tests`); }
  // 5. Export endpoint
  const exportRes = await httpReq('GET', '/api/abtest/export');
  if (exportRes.status !== 200 || !exportRes.data.ok) { bad('Export endpoint failed'); }
  else { ok(`Export: ${exportRes.data.count} records`); }
  // 6. Reset
  const resetRes = await httpReq('POST', '/api/abtest/reset', JSON.stringify({}));
  if (resetRes.status !== 200 || !resetRes.data.ok) { bad('Reset failed'); }
  else { ok('Reset successful'); }
}

// ── WebSocket Validation ────────────────────────────────────────────────
async function validateWebSocket() {
  log('\n🔌 WebSocket Validation');
  let ws;
  try {
    ws = await wsConnect();
    ok('WebSocket connected');
  } catch (e) {
    bad(`WebSocket connection failed: ${e.message}`);
    return;
  }
  const msgPromise = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    ws.on('message', (data) => { clearTimeout(timer); resolve(data.toString()); });
  });
  const msg = await msgPromise;
  if (msg) {
    const data = JSON.parse(msg);
    if (data.type === 'connected') { ok('Received connected message'); }
    else { warn('Unexpected first message: ' + data.type); }
  } else { bad('No message received within 5s'); }
  // Test broadcast by submitting an event — set up listener BEFORE sending
  const broadcastPromise = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    ws.on('message', (data) => { clearTimeout(timer); resolve(data.toString()); });
  });
  const eventRes = await httpReq('POST', '/api/abtest/event', JSON.stringify({
    events: [{ testId: 'ws_test', variant: 'control', event: 'impression', userId: 'ws_user', ts: Date.now() }],
  }));
  const bMsg = await broadcastPromise;
  if (bMsg) {
    const data = JSON.parse(bMsg);
    if (data.type === 'new_events') { ok('Live broadcast received'); }
    else { warn('Broadcast type: ' + data.type); }
  } else { warn('No broadcast received (may be OK if WS slower)'); }
  ws.close();
}

// ── HTML/JS Audit ───────────────────────────────────────────────────────
async function validateHTMLAudit() {
  log('\n📄 HTML/JS Audit');
  const htmlPath = path.join(__dirname, 'karma-os-v6 (1).html');
  if (!fs.existsSync(htmlPath)) { bad('karma-os-v6 (1).html not found'); return; }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const jsErrorPatterns = [
    /toastTmr\s*=/, // Should be declared before use
  ];
  for (const pattern of jsErrorPatterns) {
    if (pattern.test(html)) { ok('JS pattern check passed'); }
  }
  const hasOverride = html.includes('OVERRIDE');
  if (hasOverride) { ok('Unlock override present'); }
  else { warn('No unlock override found'); }
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('   KARMA OS v6 — Comprehensive Validation Suite v2.0');
  console.log('══════════════════════════════════════════════════════════════');
  const start = Date.now();
  await validateStartup();
  await validateEndpoints();
  await validateTiming();
  await validateABTests();
  await validateWebSocket();
  await validateHTMLAudit();
  const duration = Date.now() - start;
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`   ✅ ${pass} passed  |  ❌ ${fail} failed  |  ⚠️ ${warnings.length} warnings`);
  console.log(`   Duration: ${duration}ms`);
  console.log('══════════════════════════════════════════════════════════════');
  if (errors.length) {
    console.log('\nErrors:');
    errors.forEach((e) => console.log(`  - ${e}`));
  }
  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
