const { test, expect } = require('@playwright/test');

test.describe('karma-widget.html', () => {
  test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://localhost:8888/media/karma-widget.html');
    await page.waitForTimeout(1500);
    test._consoleErrors = errors;
  });

  test('loads without crash', async ({ page }) => {
    await expect(page.locator('.w-wrap')).toBeVisible();
    await expect(page.locator('.w')).toBeVisible();
  });

  test('header renders — logo and clock', async ({ page }) => {
    const logo = page.locator('.lg');
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('KARMA OS');

    const clock = page.locator('#ct');
    await expect(clock).toBeVisible();
    // Clock should show --:-- initially then update
    const clockText = await clock.textContent();
    expect(clockText).toMatch(/\b[0-9]{2}:[0-9]{2}\b/);
  });

  test('agent dots render — 8 agents', async ({ page }) => {
    const agents = page.locator('#al .ad');
    await expect(agents).toHaveCount(8);
  });

  test('crypto section renders — BTC/ETH/SOL cards', async ({ page }) => {
    await expect(page.locator('#b')).toBeVisible(); // BTC price
    await expect(page.locator('#e')).toBeVisible(); // ETH price
    await expect(page.locator('#s')).toBeVisible(); // SOL price
  });

  test('system bars exist — CPU and Memory', async ({ page }) => {
    // Wait for async metrics to render before asserting visibility
    await page.waitForSelector('#cv', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('#mv', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#cv')).toBeVisible();
    await expect(page.locator('#mv')).toBeVisible(); // Memory value
    await expect(page.locator('#cb')).toBeVisible(); // CPU bar
    await expect(page.locator('#mb')).toBeVisible(); // Memory bar
  });

  test('activity feed renders entries', async ({ page }) => {
    await expect(page.locator('#fl')).toBeVisible();
    const entries = page.locator('#fl .fi');
    expect(await entries.count()).toBeGreaterThan(0);
  });

  test('turbo button triggers NITRO state', async ({ page }) => {
    const btn = page.locator('.s[onclick="tB()"]');
    await expect(btn).toBeVisible();
    await btn.click();
    const label = page.locator('#bn');
    await expect(label).toContainText('NITRO');
    // Returns to BOOT after 2s
    await page.waitForTimeout(2500);
    await expect(label).toContainText('BOOT');
  });

  test('no console errors (ignoring CORS/CoinGecko)', async ({ page }) => {
    const realErrors = (test._consoleErrors || []).filter(
      e => !e.includes('CORS') &&
           !e.includes('coingecko') &&
           !e.includes('fetch') &&
           !e.includes('ERR_FILE_NOT_FOUND') &&
           !e.includes('ERR_CONNECTION_REFUSED') &&
           !e.includes('ERR_FAILED') &&
           !e.includes('429') &&
           !e.includes('bov.wav') &&
           !e.includes('screech.wav') &&
           !e.includes('Could not connect to server')
    );
    expect(realErrors).toHaveLength(0);
  });
});