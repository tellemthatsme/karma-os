const http = require('http');
const assert = require('assert');

// Integration tests for karma A/B test endpoints

let serverProcess;
const serverPort = 3456;
const baseUrl = `http://localhost:${serverPort}`;

function startServer() {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(serverPort) },
    });
    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Server running')) {
        resolve();
      }
    });
    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });
    setTimeout(() => resolve(), 3000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
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
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed++;
    console.error('  ✗ ' + name);
    console.error('    ' + e.message);
  }
}

async function runTests() {
  console.log('\n🔬 Karma A/B Test Integration Tests\n');

  await startServer();
  console.log('Server started on port ' + serverPort);

  // 1. Health check
  await test('Health check returns 200', async () => {
    const res = await httpRequest('/health');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.status === 'ok' || body.status === 'healthy');
  });

  // 2. Post events
  await test('POST /api/abtest/event accepts events', async () => {
    const res = await httpRequest('/api/abtest/event', 'POST', {
      events: [
        { testId: 'integration-test', variant: 'control', event: 'click', userId: 'u1' },
        { testId: 'integration-test', variant: 'treatment', event: 'click', userId: 'u2' },
      ],
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.accepted, 2);
  });

  // 3. Get stats
  await test('GET /api/abtest/stats returns stats', async () => {
    const res = await httpRequest('/api/abtest/stats');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(typeof body.totalEvents === 'number');
  });

  // 4. Get results
  await test('GET /api/abtest/results returns results', async () => {
    const res = await httpRequest('/api/abtest/results');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.results);
  });

  // 5. Get significance
  await test('GET /api/abtest/significance returns significance', async () => {
    const res = await httpRequest('/api/abtest/significance?testId=integration-test&event=click');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.variants);
  });

  // 6. Get confidence
  await test('GET /api/abtest/confidence returns confidence intervals', async () => {
    const res = await httpRequest('/api/abtest/confidence?testId=integration-test&event=click');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.variants);
  });

  // 7. Get Bayesian
  await test('GET /api/abtest/bayesian returns Bayesian analysis', async () => {
    const res = await httpRequest('/api/abtest/bayesian?testId=integration-test&event=click');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.ok(body.variants);
  });

  // 8. Reset
  await test('POST /api/abtest/reset clears data', async () => {
    const res = await httpRequest('/api/abtest/reset', 'POST');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
  });

  // 9. Rate limit
  await test('Rate limit returns 429 after too many requests', async () => {
    for (let i = 0; i < 65; i++) {
      await httpRequest('/api/abtest/stats');
    }
    const res = await httpRequest('/api/abtest/stats');
    assert.strictEqual(res.statusCode, 429);
    assert.ok(res.headers['retry-after']);
  });

  stopServer();

  console.log('\n📊 Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

runTests();
