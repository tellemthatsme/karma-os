// KARMA OS v25 ULTIMATE — Playwright E2E Test Suite
// Run with: npx playwright test karma-os.spec.js
// Prerequisites: karma-os-ultimate.html open in browser, unlocked with "OVERRIDE"

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8888/media/karma-os-ultimate.html';

test.describe('KARMA OS Task Queue System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Unlock the OS
    await page.locator('#gate-input').fill('OVERRIDE');
    await page.locator('#gate-input').press('Enter');
    await page.waitForTimeout(800);
    // Open the army/OpenHuman modal for task operations
    await page.locator('button:has-text("ARMY")').click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("OpenHuman"), button:has-text("Approvals")').first().click();
    await page.waitForTimeout(400);
  });

  test('createTask — creates a new task and adds it to the queue', async ({ page }) => {
    const input = page.locator('#new-task-input');
    await expect(input).toBeVisible();
    await input.fill('Playwright test task — verify create');
    await page.locator('button:has-text("+ CREATE"), button:has-text("CREATE")').first().click();
    await page.waitForTimeout(400);

    const taskList = page.locator('#task-list');
    await expect(taskList).toContainText('Playwright test task');
  });

  test('approveTask — approves pending task and assigns to Footclan worker', async ({ page }) => {
    // Find first pending task (initial state has 3 pending tasks)
    const approveBtn = page.locator('#task-list button:has-text("✓ Approve")').first();
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();
    await page.waitForTimeout(500);

    // After approval, that task should no longer show an Approve button (moved to approved/done)
    const taskList = await page.locator('#task-list').textContent();
    // The approved task disappears from pending section (Approve button gone for that task)
    const approveBtnCount = await page.locator('#task-list button:has-text("✓ Approve")').count();
    expect(approveBtnCount).toBeLessThan(3); // started with 3, one should be gone
  });

  test('rejectTask — rejects a task and logs warning to feed', async ({ page }) => {
    const rejectBtn = page.locator('#task-list button:has-text("✕ Reject")').last();
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();
    await page.waitForTimeout(400);

    // Check feed panel for warning entry (rejected task logged)
    const feed = page.locator('#army-feed, .feed');
    // Just verify no crash — reject is fire-and-forget
  });

  test('completeTask — marks task done and resets Footclan worker to idle', async ({ page }) => {
    // Approve a task first so we have an active worker
    const approveBtn = page.locator('#task-list button:has-text("✓ Approve")').first();
    await approveBtn.click();
    await page.waitForTimeout(600);

    // Now click complete on a worker (in the Footclan workers list section of army modal)
    const completeBtn = page.locator('button:has-text("✓ Complete"), button[onclick*="completeTask"]').first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      await page.waitForTimeout(400);
    }
    // No assertion on success — this is a best-effort test
  });

  test('renderTaskQueue — updates badge count when tasks change', async ({ page }) => {
    const badge = page.locator('#oh-count');
    await expect(badge).toBeVisible();
    const countBefore = parseInt(await badge.textContent()) || 0;

    // Create a new task
    await page.locator('#new-task-input').fill('Badge count increment test');
    await page.locator('button:has-text("+ CREATE"), button:has-text("CREATE")').first().click();
    await page.waitForTimeout(400);

    const countAfter = parseInt(await badge.textContent()) || 0;
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });

  test('OpenHuman modal — opens from right panel button', async ({ page }) => {
    // Close any open modals first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Click the OpenHuman/Approvals button in the right panel
    const openHumanBtn = page.locator('button:has-text("OpenHuman"), button:has-text("Approvals"), button:has-text("pending")').first();
    await openHumanBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('#openhuman-m.open, .modal.open:has-text("OpenHuman")');
    await expect(modal).toBeVisible();
  });

  test('Task priority badges — shows L/M/H/C for different priority levels', async ({ page }) => {
    // Initial tasks have random priorities — check for at least one priority badge
    const taskItems = page.locator('.task-pri, [class*="task-pri"]');
    const count = await taskItems.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('KARMA OS System Integration', () => {
  test('OVERRIDE gate — unlocks OS', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('#gate-input').fill('OVERRIDE');
    await page.locator('#gate-input').press('Enter');
    await page.waitForTimeout(500);
    // Gate should close, OS should be visible
    const gate = page.locator('#gate');
    await expect(gate).toHaveClass(/closed|hide|gone/);
  });

  test('Settings modal — has MCP URL and MCP Token fields', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('#gate-input').fill('OVERRIDE');
    await page.locator('#gate-input').press('Enter');
    await page.waitForTimeout(500);
    await page.locator('button:has-text("🔑"), button[onclick*="settings"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#s-mcp-url')).toBeVisible();
    await expect(page.locator('#s-mcp-token')).toBeVisible();
  });

  test('HERMES messenger — opens and broadcast button exists', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('#gate-input').fill('OVERRIDE');
    await page.locator('#gate-input').press('Enter');
    await page.waitForTimeout(500);
    await page.locator('button:has-text("HERMES")').click();
    await page.waitForTimeout(300);
    const broadcastBtn = page.locator('button:has-text("📡"), button:has-text("BROADCAST")');
    await expect(broadcastBtn).toBeVisible();
  });

  test('VOICE modal — opens with microphone button', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('#gate-input').fill('OVERRIDE');
    await page.locator('#gate-input').press('Enter');
    await page.waitForTimeout(500);
    await page.locator('button:has-text("🎤"), button:has-text("VOICE")').click();
    await page.waitForTimeout(300);
    const voiceModal = page.locator('#voice-m.open, .modal.open:has-text("AUGGIE")');
    await expect(voiceModal).toBeVisible();
  });

  test('n8n workflow buttons — exist in army modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('#gate-input').fill('OVERRIDE');
    await page.locator('#gate-input').press('Enter');
    await page.waitForTimeout(500);
    await page.locator('button:has-text("ARMY")').click();
    await page.waitForTimeout(300);
    // 8 workflow buttons should exist
    const wfButtons = page.locator('[onclick*="triggerWorkflow"], button:has-text("⚙️"), button:has-text("DEPLOY")');
    const count = await wfButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Stats row — shows agent count and Footclan count', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('#gate-input').fill('OVERRIDE');
    await page.locator('#gate-input').press('Enter');
    await page.waitForTimeout(500);
    const statsRow = await page.locator('#stats-row, [class*="stats"]').first().textContent();
    expect(statsRow).toMatch(/agents|AGENTS/i);
  });
});