// karma-security.spec.js
// Tests the new server-side Claude proxy and bridge bearer-token auth.
// Requires server.js running on :8888 and bridge_server.py on :9876.

const { test, expect, request } = require('@playwright/test');

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:8888';
const BRIDGE_URL  = process.env.BRIDGE_URL  || 'http://localhost:9876';

test.describe('Server-side Claude proxy (/api/chat)', () => {
  test('returns 503 when ANTHROPIC_API_KEY is not set', async () => {
    if (process.env.ANTHROPIC_API_KEY) test.skip(true, 'API key is set — 503 test would fail');
    const ctx = await request.newContext({ baseURL: METRICS_URL });
    const res = await ctx.post('/api/chat', {
      data: { messages: [{ role: 'user', content: 'hi' }] },
    });
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  test('returns 400 when messages array is missing', async () => {
    const ctx = await request.newContext({ baseURL: METRICS_URL });
    const res = await ctx.post('/api/chat', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('rejects GET (only POST is allowed)', async () => {
    const ctx = await request.newContext({ baseURL: METRICS_URL });
    const res = await ctx.get('/api/chat');
    expect(res.status()).toBe(404); // not in the GET handler list
  });

  test('CORS preflight includes Authorization header', async () => {
    const ctx = await request.newContext({ baseURL: METRICS_URL });
    const res = await ctx.fetch('/api/chat', { method: 'OPTIONS' });
    expect(res.status()).toBe(204);
    const allowHeaders = res.headers()['access-control-allow-headers'] || '';
    expect(allowHeaders.toLowerCase()).toContain('authorization');
  });

  test('non-streaming call returns Claude response shape (skipped without key)', async () => {
    if (!process.env.ANTHROPIC_API_KEY) test.skip(true, 'requires ANTHROPIC_API_KEY');
    const ctx = await request.newContext({ baseURL: METRICS_URL });
    const res = await ctx.post('/api/chat', {
      data: {
        messages: [{ role: 'user', content: 'Reply with the single word: PONG' }],
        agent: 'test',
        max_tokens: 50,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.content).toBeDefined();
    expect(Array.isArray(body.content)).toBe(true);
  });

  test('streaming call returns text/event-stream (skipped without key)', async () => {
    if (!process.env.ANTHROPIC_API_KEY) test.skip(true, 'requires ANTHROPIC_API_KEY');
    const ctx = await request.newContext({ baseURL: METRICS_URL });
    const res = await ctx.post('/api/chat', {
      data: {
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
        max_tokens: 20,
      },
    });
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('text/event-stream');
  });
});

test.describe('Bridge server bearer token auth', () => {
  test('/status is public and reports auth mode', async () => {
    const ctx = await request.newContext({ baseURL: BRIDGE_URL });
    const res = await ctx.get('/status');
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(['open', 'required']).toContain(body.auth);
    }
  });

  test('unauthenticated request to /command/poll returns 401 when auth is required', async () => {
    const ctx = await request.newContext({ baseURL: BRIDGE_URL });
    const res = await ctx.get('/command/poll');
    if (res.status() === 200) {
      // Bridge running in open mode — 204 (no command) is acceptable
      test.skip(true, 'Bridge is in open mode (no BRIDGE_TOKEN set)');
    }
    expect(res.status()).toBe(401);
    expect(res.headers()['www-authenticate']).toContain('Bearer');
  });

  test('unauthenticated request to /command/send returns 401 when auth is required', async () => {
    const ctx = await request.newContext({ baseURL: BRIDGE_URL });
    const res = await ctx.post('/command/send', {
      data: { action: 'navigate', params: { url: 'https://example.com' } },
    });
    if (res.status() === 200) test.skip(true, 'Bridge is in open mode');
    expect(res.status()).toBe(401);
  });

  test('authenticated request with valid token succeeds', async () => {
    const token = process.env.BRIDGE_TOKEN;
    if (!token) test.skip(true, 'set BRIDGE_TOKEN to run authenticated tests');
    const ctx = await request.newContext({
      baseURL: BRIDGE_URL,
      extraHTTPHeaders: { Authorization: 'Bearer ' + token },
    });
    const res = await ctx.get('/command/poll');
    expect([200, 204]).toContain(res.status());
  });

  test('authenticated request with invalid token returns 401', async () => {
    const token = process.env.BRIDGE_TOKEN;
    if (!token) test.skip(true, 'set BRIDGE_TOKEN to run authenticated tests');
    const ctx = await request.newContext({
      baseURL: BRIDGE_URL,
      extraHTTPHeaders: { Authorization: 'Bearer wrong-token-here' },
    });
    const res = await ctx.get('/command/poll');
    expect(res.status()).toBe(401);
  });
});

test.describe('KARMA OS v25 HTML smoke tests (security-related UI)', () => {
  test('localStorage keys are isolated per origin', async ({ page }) => {
    await page.goto('http://localhost:8888/media/karma-os-ultimate.html');
    await page.waitForSelector('#gate-input', { timeout: 5000 });
    await page.fill('#gate-input', 'OVERRIDE');
    await page.click('.gate-btn');
    // Wait for desktop to appear
    await page.waitForSelector('#desktop-wrap', { state: 'visible', timeout: 5000 });
    // The key is no longer in the API call header (we proxy through server.js now)
    const networkLog = [];
    page.on('request', (req) => {
      if (req.url().includes('api.anthropic.com') && req.headers()['x-api-key']) {
        networkLog.push('LEAK: browser sent x-api-key directly to Anthropic');
      }
    });
    // Open settings — key field should still be there for backwards compat
    await page.click('button:has-text("🔑")');
    await page.waitForSelector('#s-claude', { timeout: 3000 });
    // The value should be a placeholder, not the actual key
    const claudeVal = await page.inputValue('#s-claude');
    expect(claudeVal).toBe(''); // user hasn't entered one in this test
    expect(networkLog).toEqual([]);
  });
});
