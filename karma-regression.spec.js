// karma-os-ultimate.html - Full Regression Test Suite
// Run with: npx playwright test karma-regression.spec.js
// Run specific project: npx playwright test --project=chromium

const { test, expect } = require('@playwright/test');
const FILE_URL = 'http://localhost:8888/media/karma-os-ultimate.html';

test.describe('KARMA OS Ultimate - Full Regression Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Attach error listeners BEFORE navigation so initial-load errors are captured
    page._jsErrors = [];
    page._consoleErrors = [];
    page.on('pageerror', err => page._jsErrors.push('PAGE ERROR: ' + err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('404') && !text.includes('net::ERR')
            && !text.includes('CORS') && !text.includes('coingecko') && !text.includes('429')
            && !text.includes('bov.wav') && !text.includes('screech.wav')
            && !text.includes('Could not connect to server')) {
          page._consoleErrors.push(text);
        }
      }
    });
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(500);
    await page.locator('#gate-input').fill('OVERRIDE');
    await page.locator('.gate-btn').click();
    // WebKit needs extra time for gate unlock on file:// protocol
    await page.waitForTimeout(2000);
  });

  // ───────────────────────────────────────────────────────────
  // SYSTEM HEALTH
  // ───────────────────────────────────────────────────────────

  test('should have zero console errors on load', async ({ page }) => {
    await page.waitForTimeout(3000);
    expect(page._consoleErrors, `Console errors: ${page._consoleErrors.join(', ')}`).toHaveLength(0);
  });

  test('should have zero JS errors on load', async ({ page }) => {
    await page.waitForTimeout(3000);
    expect(page._jsErrors, `JS errors: ${page._jsErrors.join(', ')}`).toHaveLength(0);
  });

  test('should display 25 agents in stats bar', async ({ page }) => {
    const agentCount = await page.locator('#agent-count').textContent();
    expect(agentCount.trim()).toBe('25');
  });

  test('should display correct agent badge in sidebar', async ({ page }) => {
    const badge = await page.locator('#agent-badge').textContent();
    expect(badge.trim()).toBe('25');
  });

  // ───────────────────────────────────────────────────────────
  // ARMY MODAL
  // ───────────────────────────────────────────────────────────

  test('should open army modal and show 20 FOOTCLAN workers', async ({ page }) => {
    await page.click('button:has-text("ARMY")');
    await page.waitForTimeout(1000);
    const fcItems = await page.locator('#army-fc-list > div').count();
    expect(fcItems, `Expected 20 FOOTCLAN, got ${fcItems}`).toBe(20);
  });

  test('should show 24 specialists in army modal', async ({ page }) => {
    await page.click('button:has-text("ARMY")');
    await page.waitForTimeout(1000);
    const specItems = await page.locator('#army-specialists > div').count();
    expect(specItems, `Expected 24 specialists, got ${specItems}`).toBe(24);
  });

  test('should show correct counts in army modal headers', async ({ page }) => {
    await page.click('button:has-text("ARMY")');
    await page.waitForTimeout(1200);
    const specCount = await page.locator('#army-spec-count').textContent();
    const fcCount = await page.locator('#army-fc-count').textContent();
    expect(specCount.trim()).toBe('24');
    expect(fcCount.trim()).toBe('20');
  });

  test('should not duplicate content when army modal reopened', async ({ page }) => {
    await page.click('button:has-text("ARMY")');
    await page.waitForTimeout(1000);
    const firstOpen = await page.locator('#army-fc-list > div').count();
    await page.click('#army-m .mclose');
    await page.waitForTimeout(300);
    await page.click('button:has-text("ARMY")');
    await page.waitForTimeout(1000);
    const secondOpen = await page.locator('#army-fc-list > div').count();
    expect(secondOpen, `Content duplicated: first=${firstOpen}, second=${secondOpen}`).toBe(firstOpen);
  });

  // ───────────────────────────────────────────────────────────
  // KARMA AI MODAL
  // ───────────────────────────────────────────────────────────

  test('should open KARMA AI modal with chat interface', async ({ page }) => {
    await page.click('button:has-text("KARMA")');
    await page.waitForTimeout(800);
    await expect(page.locator('#karma-m')).toBeVisible();
    const msgs = await page.locator('#karma-msgs .chat-bubble').count();
    expect(msgs).toBeGreaterThanOrEqual(2);
    const input = await page.locator('#karma-in');
    await expect(input).toBeVisible();
    await page.click('#karma-m .mclose');
  });

  // ───────────────────────────────────────────────────────────
  // IMPOSSIBLE DESK MODAL
  // ───────────────────────────────────────────────────────────

  test('should open Impossible Desk modal with input and output', async ({ page }) => {
    await page.click('button:has-text("IMPOSSIBLE")');
    // Use waitForSelector instead of fixed timeout for reliability
    await page.waitForSelector('#imp-m', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#imp-in', { state: 'visible', timeout: 10000 });
    await expect(page.locator('#imp-m')).toBeVisible();
    const out = await page.locator('#imp-out').textContent();
    expect(out).toContain('IMPOSSIBLE DESK');
    const input = await page.locator('#imp-in');
    await expect(input).toBeVisible();
    await page.click('#imp-m .mclose');
  });

  // ───────────────────────────────────────────────────────────
  // VOICE MODAL
  // ───────────────────────────────────────────────────────────

  test('should open Voice modal with mic button', async ({ page }) => {
    await page.click('button:has-text("VOICE")');
    await page.waitForTimeout(800);
    await expect(page.locator('#voice-m')).toBeVisible();
    const ring = await page.locator('#voice-ring');
    await expect(ring).toBeVisible();
    const cmds = await page.locator('.voice-cmd-list .vcmd').count();
    expect(cmds).toBeGreaterThanOrEqual(10);
    await page.click('#voice-m .mclose');
  });

  // ───────────────────────────────────────────────────────────
  // HERMES MODAL
  // ───────────────────────────────────────────────────────────

  test('should open Hermes modal and show Broadcast All with 25 agents', async ({ page }) => {
    await page.click('button:has-text("HERMES")');
    await page.waitForTimeout(800);
    await expect(page.locator('#hermes-m')).toBeVisible();
    const broadcastOption = await page.locator('#hermes-to option[value="all"]').textContent();
    expect(broadcastOption).toContain('25 agents');
    const threadMsgs = await page.locator('#hermes-thread .agent-msg').count();
    expect(threadMsgs).toBeGreaterThanOrEqual(4);
    await page.click('#hermes-m .mclose');
  });

  // ───────────────────────────────────────────────────────────
  // OPENHUMAN MODAL
  // ───────────────────────────────────────────────────────────

  test('should open OpenHuman modal and show pending approvals', async ({ page }) => {
    await page.click('a.qb:has-text("Human")');
    await page.waitForTimeout(800);
    await expect(page.locator('#openhuman-m')).toBeVisible();
    const panel = await page.locator('#approval-panel');
    await expect(panel).toBeVisible();
    const approveBtns = await page.locator('#approval-panel .approval-btn.allow').count();
    expect(approveBtns).toBeGreaterThanOrEqual(2);
    await page.click('#openhuman-m .mclose');
  });

  // ───────────────────────────────────────────────────────────
  // SETTINGS MODAL
  // ───────────────────────────────────────────────────────────

  test('should open settings modal and show n8n-status element', async ({ page }) => {
    await page.click('button[onclick*="settings-m"]');
    await page.waitForTimeout(800);
    await expect(page.locator('#settings-m')).toBeVisible();
    const n8nStatus = await page.locator('#settings-m #n8n-status').count();
    expect(n8nStatus).toBe(1);
    await page.click('#settings-m .mclose');
  });

  test('should have 4 theme buttons in settings', async ({ page }) => {
    await page.click('button[onclick*="settings-m"]');
    await page.waitForTimeout(800);
    const themes = await page.locator('#settings-m .theme-btn').count();
    expect(themes).toBe(4);
    await page.click('#settings-m .mclose');
  });

  // ───────────────────────────────────────────────────────────
  // NAV / TOPBAR
  // ───────────────────────────────────────────────────────────

  test('should have all 6 topbar action buttons', async ({ page }) => {
    const btns = await page.locator('.topbar-actions .tb-btn').count();
    expect(btns).toBe(6);
  });

  test('should have correct page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('KARMA OS');
  });

});
