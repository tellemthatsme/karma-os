// karma-hud.spec.js — Playwright tests for karma-hud.html
// Tests: 10 — HUD load, header, clock, agents, crypto, system bars, feed, buttons, NITRO, console
const { test, expect } = require('@playwright/test');

const HUD_URL = 'file:///C:/karma/karma-hud.html';
// Filter environment noise: CORS (CoinGecko file://), missing audio files, unavailable localhost
const IGNORE_PATTERNS = ['CORS', 'coingecko', 'fetch', 'ERR_FILE_NOT_FOUND', 'ERR_CONNECTION_REFUSED', 'ERR_FAILED'];

test.describe('Karma HUD', () => {

  test('loads without crash', async ({ page }) => {
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.hud-wrap', { timeout: 5000 });
    await page.waitForSelector('.hud', { timeout: 3000 });
  });

  test('header renders with logo + clock', async ({ page }) => {
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.hud-wrap', { timeout: 5000 });
    await page.waitForSelector('.logo', { timeout: 3000 });
    const logo = await page.textContent('.logo');
    expect(logo).toContain('KARMA');
    const clock = await page.textContent('#ct');
    expect(clock).toMatch(/\b[0-9]{2}:[0-9]{2}/);
  });

  test('agent dots render (8 agents)', async ({ page }) => {
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#al', { timeout: 5000 });
    await page.waitForTimeout(500);
    const agents = await page.locator('#al .ad').count();
    expect(agents).toBe(8);
  });

  test('crypto section renders (BTC/ETH/SOL)', async ({ page }) => {
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.hud-wrap', { timeout: 5000 });
    await page.waitForTimeout(1000);
    const btcEl = await page.locator('#b');
    const ethEl = await page.locator('#e');
    const solEl = await page.locator('#s');
    await expect(btcEl).toBeVisible();
    await expect(ethEl).toBeVisible();
    await expect(solEl).toBeVisible();
  });

  test('system bars exist (CPU + Memory)', async ({ page }) => {
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.hud-wrap', { timeout: 5000 });
    await page.waitForTimeout(500);
    const cpuVal = await page.locator('#cv');
    const memVal = await page.locator('#mv');
    const cpuBar = await page.locator('#cb');
    const memBar = await page.locator('#mb');
    await expect(cpuVal).toBeVisible();
    await expect(memVal).toBeVisible();
    await expect(cpuBar).toBeVisible();
    await expect(memBar).toBeVisible();
    const cpuText = await cpuVal.textContent();
    expect(cpuText).toMatch(/%/);
  });

  test('activity feed renders entries', async ({ page }) => {
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#fl', { timeout: 5000 });
    await page.waitForTimeout(1000);
    const entries = await page.locator('#fl .fi').count();
    expect(entries).toBeGreaterThan(0);
  });

  test('control buttons exist (pin/min/NITRO)', async ({ page }) => {
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.hud-wrap', { timeout: 5000 });
    const pinBtn = await page.locator('#pinBtn');
    const minBtn = await page.locator('#minBtn');
    const nitroBtn = await page.locator('#nitroBtn');
    await expect(pinBtn).toBeVisible();
    await expect(minBtn).toBeVisible();
    await expect(nitroBtn).toBeVisible();
  });

  test('minimize button collapses HUD', async ({ page }) => {
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#minBtn', { timeout: 5000 });
    // Click minimize
    await page.click('#minBtn');
    await page.waitForTimeout(400);
    const hud = await page.locator('.hud');
    const classes = await hud.getAttribute('class');
    expect(classes).toContain('collapsed');
    // Click again to expand
    await page.click('#minBtn');
    await page.waitForTimeout(400);
    const classes2 = await hud.getAttribute('class');
    expect(classes2).not.toContain('collapsed');
  });

  test('turbo button triggers NITRO state', async ({ page }) => {
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#nitroBtn', { timeout: 5000 });
    await page.click('#nitroBtn');
    await page.waitForTimeout(300);
    const hud = await page.locator('.hud');
    const classes = await hud.getAttribute('class');
    expect(classes).toContain('nitro');
    // Wait for 2s NITRO cycle to complete
    await page.waitForTimeout(2200);
    const classes2 = await hud.getAttribute('class');
    expect(classes2).not.toContain('nitro');
  });

  test('no unexpected console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(HUD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.hud-wrap', { timeout: 10000 });
    await page.waitForTimeout(3000);
    const realErrors = errors.filter(
      e => !IGNORE_PATTERNS.some(p => e.includes(p))
    );
    expect(realErrors).toEqual([]);
  });

});
