// karma-server-regression.spec.js
// Regression tests for server.js — protects against the temporal-dead-zone
// bug where `const url` was used before declaration in the /api/chat handler.
// Run: npx playwright test karma-server-regression.spec.js
// Requires: node server.js running on :8888

const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:8888'

test.describe('server.js — regression: url-before-use bug', () => {
  test('POST /api/chat without API key returns 503, not ReferenceError', async ({ request }) => {
    // The original bug: `const url` was declared AFTER it was used in the
    // /api/chat handler, causing ReferenceError on every request.
    // Fix: move the declaration above the handler.
    // This test ensures the handler is reachable without crashing.
    const res = await request.post(BASE + '/api/chat', {
      data: { messages: [{ role: 'user', content: 'hi' }] },
    })
    // Should be 503 (no API key), 200 (success), or 401 (upstream auth) —
    // never 500 from a ReferenceError.
    expect([200, 401, 503]).toContain(res.status())
  })

  test('POST /api/chat with empty body returns 400, not crash', async ({ request }) => {
    const res = await request.post(BASE + '/api/chat', {
      data: {},
    })
    expect([400, 503]).toContain(res.status())
  })

  test('all endpoints respond (no crash on any route)', async ({ request }) => {
    const routes = [
      { method: 'GET', path: '/health' },
      { method: 'GET', path: '/metrics' },
      { method: 'GET', path: '/github' },
      { method: 'GET', path: '/git' },
      { method: 'GET', path: '/cr' },
      { method: 'GET', path: '/api/research/status' },
      { method: 'GET', path: '/api/research/history' },
      { method: 'GET', path: '/api/research/rss' },
    ]
    for (const { method, path } of routes) {
      const res = await request.fetch(BASE + path, { method })
      // All should return 2xx, never 500 from a JS error
      expect(res.status(), `${method} ${path} should not 500`).toBeLessThan(500)
    }
  })

  test('unknown route returns 404 with endpoints list', async ({ request }) => {
    const res = await request.get(BASE + '/this-does-not-exist')
    expect(res.status()).toBe(404)
    const body = await res.json()
    expect(body.endpoints).toBeDefined()
    expect(body.endpoints).toContain('/health')
    expect(body.endpoints).toContain('/api/research/rss')
  })

  test('POST /api/research/refresh returns 202 with pid', async ({ request }) => {
    const res = await request.post(BASE + '/api/research/refresh')
    expect(res.status()).toBe(202)
    const body = await res.json()
    expect(body.started).toBe(true)
    expect(body.pid).toBeGreaterThan(0)
  })

  test('POST /api/push/unknown returns 400, not crash', async ({ request }) => {
    const res = await request.post(BASE + '/api/push/unknown', {
      data: { content: 'test' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unknown platform/)
  })
})

test.describe('server.js — RSS feed', () => {
  test('RSS feed is valid Atom XML', async ({ request }) => {
    const res = await request.get(BASE + '/api/research/rss')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/atom\+xml/)
    const text = await res.text()
    expect(text).toMatch(/<feed/)
    expect(text).toMatch(/xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/)
  })

  test('RSS feed title is set', async ({ request }) => {
    const res = await request.get(BASE + '/api/research/rss')
    const text = await res.text()
    expect(text).toMatch(/<title>[^<]+<\/title>/)
  })
})

test.describe('server.js — archive endpoint', () => {
  test('GET /_archive/ with traversal attempt returns 400 or 403', async ({ request }) => {
    const res = await request.get(BASE + '/_archive/..%2F..%2Fetc%2Fpasswd')
    expect([400, 403]).toContain(res.status())
  })

  test('GET /api/research/history returns array', async ({ request }) => {
    const res = await request.get(BASE + '/api/research/history')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.history).toBeDefined()
    expect(Array.isArray(body.history)).toBe(true)
  })
})
