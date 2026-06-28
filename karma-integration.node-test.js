// karma-integration.node-test.js — KARMA A/B Test Integration Tests using node:test
// Run with: node --test karma-integration.node-test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { spawn } = require('child_process');

const serverPort = process.env.TEST_PORT || 3456;
const baseUrl = `http://localhost:${serverPort}`;
let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(serverPort) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      resolve(); // server started or timed out — proceed
    }, 15000);
    let started = false;
    serverProcess.stdout.on('data', (data) => {
      if (!started && data.toString().includes('running')) {
        started = true;
        clearTimeout(timer);
        resolve();
      }
    });
    serverProcess.stderr.on('data', () => {}); // silence stderr
    serverProcess.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
}

function httpRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: serverPort,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      timeout: 10000,
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('KARMA Integration Tests', { concurrency: false }, () => {
  before(async () => {
    await startServer();
  });

  after(() => {
    stopServer();
  });

  it('Health check returns 200', async () => {
    const res = await httpRequest('/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  it('Metrics endpoint returns system data', async () => {
    const res = await httpRequest('/metrics');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(typeof res.body.cpu === 'number');
    assert.ok(res.body.hostname);
    assert.ok(typeof res.body.uptime === 'number');
  });

  it('POST /api/abtest/event accepts events', async () => {
    const res = await httpRequest('/api/abtest/event', 'POST', {
      events: [
        { testId: 'integration-test', variant: 'control', event: 'click', userId: 'u1' },
        { testId: 'integration-test', variant: 'treatment', event: 'click', userId: 'u2' },
      ],
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.accepted, 2);
  });

  it('GET /api/abtest/stats returns stats', async () => {
    const res = await httpRequest('/api/abtest/stats');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(typeof res.body.totalEvents === 'number');
  });

  it('GET /api/abtest/results returns results', async () => {
    const res = await httpRequest('/api/abtest/results');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.results);
  });

  it('GET /api/abtest/significance returns significance', async () => {
    const res = await httpRequest('/api/abtest/significance?testId=integration-test&event=click');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.variants);
  });

  it('GET /api/abtest/confidence returns confidence intervals', async () => {
    const res = await httpRequest('/api/abtest/confidence?testId=integration-test&event=click');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.variants);
  });

  it('GET /api/abtest/bayesian returns Bayesian analysis', async () => {
    const res = await httpRequest('/api/abtest/bayesian?testId=integration-test&event=click');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.variants);
  });

  it('POST /api/abtest/reset clears data', async () => {
    const res = await httpRequest('/api/abtest/reset', 'POST');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
  });

  it('Unknown route returns 404 with endpoints list', async () => {
    const res = await httpRequest('/nonexistent');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(Array.isArray(res.body.endpoints));
  });

  it('CORS headers are present', async () => {
    const res = await httpRequest('/health');
    assert.strictEqual(res.headers['access-control-allow-origin'], '*');
  });

  it('POST /api/push/unknown returns 400', async () => {
    const res = await httpRequest('/api/push/unknown', 'POST', { content: 'test' });
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Unknown platform'));
  });

  it('POST /api/research/refresh returns 202', async () => {
    const res = await httpRequest('/api/research/refresh', 'POST');
    assert.ok([202, 500].includes(res.statusCode)); // 202 if python available, 500 if not
  });
});
