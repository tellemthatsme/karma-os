// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('KARMA Visual Regression', () => {
  test('main OS dashboard loads without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + __dirname.replace(/\\/g, '/') + '/karma-os-ultimate.html');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/visual-main-os.png', fullPage: true });
    expect(errors.filter(e => !e.includes('Failed to fetch'))).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('HUD widget renders correctly', async ({ page }) => {
    await page.goto('file://' + __dirname.replace(/\\/g, '/') + '/karma-hud.html');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/visual-hud.png', fullPage: true });
    await expect(page.locator('.hud')).toBeVisible();
  });

  test('widget renders correctly', async ({ page }) => {
    await page.goto('file://' + __dirname.replace(/\\/g, '/') + '/karma-widget.html');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/visual-widget.png', fullPage: true });
    await expect(page.locator('.w')).toBeVisible();
  });

  test('live desktop renders correctly', async ({ page }) => {
    await page.goto('file://' + __dirname.replace(/\\/g, '/') + '/live-desktop.html');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/visual-desktop.png', fullPage: true });
    const firstPanel = page.locator('.sc, .p').first();
    await expect(firstPanel).toBeVisible();
  });

  test('unified dashboard renders all cards', async ({ page }) => {
    await page.goto('file://' + __dirname.replace(/\\/g, '/') + '/index.html');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/visual-unified.png', fullPage: true });
    await expect(page.locator('.logo')).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(6);
  });

  test('unified theme switching works', async ({ page }) => {
    await page.goto('file://' + __dirname.replace(/\\/g, '/') + '/index.html');
    await page.waitForTimeout(500);

    // Click stealth theme
    await page.click('.theme-pill[data-theme="stealth"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/visual-unified-stealth.png' });
    await expect(page.locator('.theme-pill[data-theme="stealth"]')).toHaveClass(/active/);

    // Click matrix theme
    await page.click('.theme-pill[data-theme="matrix"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/visual-unified-matrix.png' });
    await expect(page.locator('.theme-pill[data-theme="matrix"]')).toHaveClass(/active/);
  });

  test('command palette opens and closes', async ({ page }) => {
    await page.goto('file://' + __dirname.replace(/\\/g, '/') + '/index.html');
    await page.waitForTimeout(500);

    // Open with Ctrl+K
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);
    await expect(page.locator('#cmdOverlay')).toHaveClass(/open/);
    await page.screenshot({ path: 'test-results/visual-cmd-palette.png' });

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(page.locator('#cmdOverlay')).not.toHaveClass(/open/);
  });

  test('toast notifications appear on load', async ({ page }) => {
    await page.goto('file://' + __dirname.replace(/\\/g, '/') + '/index.html');
    await page.waitForTimeout(2000);
    // There should be at least one toast
    const toasts = page.locator('.toast');
    await expect(toasts.first()).toBeVisible();
  });
});
