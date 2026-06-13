/**
 * A/B Testing Framework Tests
 */
const { test, expect } = require('@playwright/test');
const MEDIA = 'http://localhost:8888/media/';
test.describe('ABTest Framework', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEDIA + 'index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { if (window.ABTest) window.ABTest.reset(); });
  });
  test('module loads and exposes API', async ({ page }) => {
    const hasAPI = await page.evaluate(() => {
      return typeof window.ABTest === 'object'
        && typeof window.ABTest.getVariant === 'function'
        && typeof window.ABTest.track === 'function'
        && typeof window.ABTest.flush === 'function';
    });
    expect(hasAPI).toBe(true);
  });
  test('getVariant returns a valid variant from the list', async ({ page }) => {
    const result = await page.evaluate(() => {
      const v = window.ABTest.getVariant('test_hero', ['control', 'variant_a', 'variant_b']);
      return { variant: v, valid: ['control', 'variant_a', 'variant_b'].includes(v) };
    });
    expect(result.valid).toBe(true);
  });
  test('assignments are persistent across calls', async ({ page }) => {
    const stable = await page.evaluate(() => {
      const v1 = window.ABTest.getVariant('persistence_test', ['a', 'b', 'c']);
      const v2 = window.ABTest.getVariant('persistence_test', ['a', 'b', 'c']);
      const v3 = window.ABTest.getVariant('persistence_test', ['a', 'b', 'c']);
      return { v1: v1, v2: v2, v3: v3, allSame: v1 === v2 && v2 === v3 };
    });
    expect(stable.allSame).toBe(true);
  });
  test('isEnabled returns boolean for feature flags', async ({ page }) => {
    const result = await page.evaluate(() => {
      const v = window.ABTest.isEnabled('feature_x');
      return { value: v, isBoolean: typeof v === 'boolean' };
    });
    expect(result.isBoolean).toBe(true);
  });
  test('track queues events with correct shape', async ({ page }) => {
    const queueLen = await page.evaluate(() => {
      window.ABTest.getVariant('queue_test', ['a', 'b']);
      window.ABTest.track('queue_test', 'impression');
      window.ABTest.track('queue_test', 'click', { button: 'cta' });
      return window.ABTest.debug().queueLength;
    });
    expect(queueLen).toBe(2);
  });
  test('server /api/abtest/event accepts batches', async ({ request }) => {
    const res = await request.post('http://localhost:8888/api/abtest/event', {
      data: { events: [
        { testId: 'server_test', variant: 'control', event: 'impression', ts: Date.now(), userId: 'u1' },
        { testId: 'server_test', variant: 'control', event: 'click', ts: Date.now(), userId: 'u1' },
      ] },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.accepted).toBe(2);
  });
  test('server /api/abtest/results aggregates correctly', async ({ request }) => {
    await request.post('http://localhost:8888/api/abtest/event', {
      data: { events: [
        { testId: 'agg_test', variant: 'a', event: 'impression', ts: Date.now(), userId: 'u1' },
        { testId: 'agg_test', variant: 'a', event: 'impression', ts: Date.now(), userId: 'u2' },
        { testId: 'agg_test', variant: 'b', event: 'conversion', ts: Date.now(), userId: 'u3' },
      ] },
    });
    const res = await request.get('http://localhost:8888/api/abtest/results');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results.agg_test.a.impression).toBeGreaterThanOrEqual(2);
    expect(body.results.agg_test.b.conversion).toBeGreaterThanOrEqual(1);
  });
  test('server rejects malformed payloads', async ({ request }) => {
    const res = await request.post('http://localhost:8888/api/abtest/event', {
      data: { events: 'not an array' },
    });
    expect(res.status()).toBe(400);
  });
  test('hash function is deterministic', async ({ page }) => {
    const result = await page.evaluate(() => {
      const a = window.ABTest._hash('test_string');
      const b = window.ABTest._hash('test_string');
      return { a: a, b: b, equal: a === b };
    });
    expect(result.equal).toBe(true);
    expect(result.a).toBeGreaterThan(0);
  });
});
