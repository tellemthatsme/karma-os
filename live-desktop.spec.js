const { test, expect } = require('@playwright/test');

test.describe('live-desktop.html', () => {
  test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://localhost:8888/media/live-desktop.html');
    await page.waitForTimeout(1500);
    test._consoleErrors = errors;
  });

  test('loads without crash', async ({ page }) => {
    await expect(page.locator('.desktop')).toBeVisible();
  });

  test('topbar renders — logo, clock, crypto prices', async ({ page }) => {
    await expect(page.locator('.logo')).toContainText('KARMA');
    await expect(page.locator('#clkt')).toBeVisible();
    await expect(page.locator('#bp')).toBeVisible(); // BTC price
    await expect(page.locator('#ep')).toBeVisible(); // ETH price
  });

  test('theme switcher buttons exist', async ({ page }) => {
    const buttons = page.locator('.btn-icon');
    expect(await buttons.count()).toBeGreaterThanOrEqual(3);
  });

  test('agent list renders', async ({ page }) => {
    await expect(page.locator('#al')).toBeVisible();
    const agents = page.locator('#al .ac');
    expect(await agents.count()).toBeGreaterThan(0);
  });

  test('stat cards render — repos, agents, boost', async ({ page }) => {
    await expect(page.locator('#repo-count')).toBeVisible();
    await expect(page.locator('#agent-count')).toBeVisible();
    await expect(page.locator('#boost-timer')).toBeVisible();
  });

  test('feed panel renders', async ({ page }) => {
    await expect(page.locator('#fl')).toBeVisible();
    const entries = page.locator('#fl .fi');
    expect(await entries.count()).toBeGreaterThan(0);
  });

  test('CR analysis panel renders', async ({ page }) => {
    await expect(page.locator('#cr-panel')).toBeVisible();
    await expect(page.locator('#cr-total')).toBeVisible();
    await expect(page.locator('#cr-health')).toBeVisible();
  });

  test('terminal HUD renders', async ({ page }) => {
    await page.waitForSelector('#matrix-canvas', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#hud-content', { state: 'visible', timeout: 15000 });
    await expect(page.locator('#matrix-canvas')).toBeVisible();
    await expect(page.locator('#hud-content')).toBeVisible();
  });

  test('system health bars exist — CPU, Memory, Disk', async ({ page }) => {
    await page.waitForSelector('#cv', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('#mv', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('#dv', { state: 'visible', timeout: 10000 });
    await expect(page.locator('#cv')).toBeVisible();
    await expect(page.locator('#mv')).toBeVisible();
    await expect(page.locator('#dv')).toBeVisible();
  });

  test('no console errors (ignoring CORS/CoinGecko/fetch)', async ({ page }) => {
    const realErrors = (test._consoleErrors || []).filter(
      e => !e.includes('CORS') &&
           !e.includes('coingecko') &&
           !e.includes('fetch') &&
           !e.includes('Failed to fetch') &&
           !e.includes('ERR_FILE_NOT_FOUND') &&
           !e.includes('ERR_FAILED') &&
           !e.includes('ERR_CONNECTION_REFUSED') &&
           !e.includes('429') &&
           !e.includes('bov.wav') &&
           !e.includes('screech.wav') &&
           !e.includes('Could not connect to server')
    );
    expect(realErrors).toHaveLength(0);
  });
});