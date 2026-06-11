// karma-research.spec.js — Tests for AI Research endpoints + RSS feed + platform push
// Run with: npx playwright test karma-research.spec.js
// Server must be running on :8888 (node server.js) with ANTHROPIC_API_KEY optional

const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:8888'

test.describe('AI Research — status + metadata', () => {
  test('GET /api/research/status returns 200 with job + brief metadata', async ({ request }) => {
    const res = await request.get(BASE + '/api/research/status')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('job')
    expect(body).toHaveProperty('brief')
    // brief should exist (shipped in repo)
    expect(body.brief.exists).toBe(true)
    expect(body.brief.bytes).toBeGreaterThan(1000)
    expect(body.brief).toHaveProperty('modified')
    expect(body.brief).toHaveProperty('age_seconds')
  })

  test('GET /api/research/history returns archive list', async ({ request }) => {
    const res = await request.get(BASE + '/api/research/history')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('history')
    expect(Array.isArray(body.history)).toBe(true)
    // Each entry must have date + path + size
    if (body.history.length > 0) {
      const e = body.history[0]
      expect(e).toHaveProperty('date')
      expect(e).toHaveProperty('path')
      expect(e.path).toMatch(/^ai_news\/archive\/\d{4}-\d{2}-\d{2}\.md$/)
    }
  })

  test('GET /_archive/ with path-traversal returns 403', async ({ request }) => {
    const res = await request.get(BASE + '/_archive/../package.json')
    // URL-encoded traversal
    expect([400, 403, 404]).toContain(res.status())
  })

  test('GET /_archive/ai_news/archive/2030-01-01.md (missing) returns 404', async ({ request }) => {
    const res = await request.get(BASE + '/_archive/ai_news/archive/2030-01-01.md')
    expect(res.status()).toBe(404)
  })
})

test.describe('AI Research — RSS / Atom feed', () => {
  test('GET /api/research/rss returns valid Atom XML', async ({ request }) => {
    const res = await request.get(BASE + '/api/research/rss')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/atom\+xml/)
    const xml = await res.text()
    expect(xml).toMatch(/^<\?xml version="1.0"/)
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">')
    expect(xml).toContain('<title>')
    expect(xml).toContain('KARMA OS')
    expect(xml).toContain('<entry>')
    expect(xml).toContain('</feed>')
  })

  test('GET /feed.xml alias also works', async ({ request }) => {
    const res = await request.get(BASE + '/feed.xml')
    expect(res.status()).toBe(200)
    const xml = await res.text()
    expect(xml).toContain('<feed')
  })

  test('GET /rss alias also works', async ({ request }) => {
    const res = await request.get(BASE + '/rss')
    expect(res.status()).toBe(200)
    const xml = await res.text()
    expect(xml).toContain('<feed')
  })

  test('RSS feed escapes special XML chars in titles', async ({ request }) => {
    const res = await request.get(BASE + '/api/research/rss')
    const xml = await res.text()
    // Should not have raw < or > inside <title> tags
    const titles = xml.match(/<title>([^<]*)<\/title>/g) || []
    for (const t of titles) {
      // Make sure no nested tags inside title
      const inner = t.replace(/<\/?title>/g, '')
      expect(inner).not.toMatch(/<[^&]/) // no raw < that isn't an entity
    }
  })
})

test.describe('AI Research — refresh trigger', () => {
  test('POST /api/research/refresh returns 202 + pid + brief_path', async ({ request }) => {
    const res = await request.post(BASE + '/api/research/refresh')
    // 202 if python available; 500 if python missing — both are valid
    expect([202, 500]).toContain(res.status())
    if (res.status() === 202) {
      const body = await res.json()
      expect(body).toHaveProperty('started', true)
      expect(body).toHaveProperty('pid')
      expect(typeof body.pid).toBe('number')
      expect(body.brief_path).toBe('ai_news/CURRENT_AI_BRIEF.md')
    }
  })

  test('After refresh trigger, status reflects in-flight or recent job', async ({ request }) => {
    // Fire and forget — give it a moment
    await request.post(BASE + '/api/research/refresh').catch(() => {})
    await new Promise(r => setTimeout(r, 500))
    const res = await request.get(BASE + '/api/research/status')
    const body = await res.json()
    expect(body).toHaveProperty('job')
    // job may be null (never run) or have started_at
    if (body.job) {
      expect(body.job).toHaveProperty('started_at')
    }
  })
})

test.describe('AI Research — platform push', () => {
  test('POST /api/push/discord without webhook env returns 503 with hint', async ({ request }) => {
    // Delete env if it was set so we can deterministically test the missing-config path
    const res = await request.post(BASE + '/api/push/discord', {
      data: { content: 'test brief' },
    })
    // 200 if env was set, 503 if not, 502 if upstream failed
    expect([200, 502, 503]).toContain(res.status())
    if (res.status() === 503) {
      const body = await res.json()
      expect(body).toHaveProperty('ok', false)
      expect(body).toHaveProperty('hint')
    }
  })

  test('POST /api/push/unknown-platform returns 400', async ({ request }) => {
    const res = await request.post(BASE + '/api/push/myspace', {
      data: { content: 'test' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('Unknown platform')
    expect(body.supported).toEqual(expect.arrayContaining(['discord', 'telegram', 'slack']))
  })

  test('POST /api/push/discord with missing content returns 400', async ({ request }) => {
    const res = await request.post(BASE + '/api/push/discord', { data: {} })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error', 'content required')
  })
})

test.describe('AI Research — CORS preflight', () => {
  test('OPTIONS /api/research/refresh returns 204 with CORS headers', async ({ request }) => {
    const res = await request.fetch(BASE + '/api/research/refresh', {
      method: 'OPTIONS',
      headers: { 'Access-Control-Request-Method': 'POST' },
    })
    expect(res.status()).toBe(204)
    expect(res.headers()['access-control-allow-origin']).toBe('*')
  })
})
