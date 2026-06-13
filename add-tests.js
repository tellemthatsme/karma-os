const fs = require('fs');
const path = require('path');

let spec = fs.readFileSync(path.join(__dirname, 'karma-abtest.spec.js'), 'utf8');

const newTests = `
  // 11. Rate limiter allows requests under threshold
  test('Rate limiter allows requests under threshold', () => {
    const { checkAbtestRateLimit } = require('./src/routes/abtest');
    const result = checkAbtestRateLimit('10.0.0.1');
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.remaining, 59);
  });

  // 12. Rate limiter blocks requests over threshold
  test('Rate limiter blocks requests over threshold', () => {
    const { checkAbtestRateLimit } = require('./src/routes/abtest');
    for (let i = 0; i < 60; i++) {
      checkAbtestRateLimit('10.0.0.2');
    }
    const result = checkAbtestRateLimit('10.0.0.2');
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.remaining, 0);
    assert.ok(result.retryAfter > 0);
  });

  // 13. handleAbtestRoutes returns 429 when rate limited
  test('handleAbtestRoutes returns 429 when rate limited', () => {
    const { handleAbtestRoutes, checkAbtestRateLimit } = require('./src/routes/abtest');
    const mockDb = { all: () => {}, prepare: () => ({ run: () => {}, finalize: () => {} }) };
    const req = mockRequest({ url: '/api/abtest/event', method: 'POST' });
    const res = mockResponse();
    for (let i = 0; i < 60; i++) {
      checkAbtestRateLimit('10.0.0.3');
    }
    req.connection.remoteAddress = '10.0.0.3';
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 429);
    const body = JSON.parse(res.body);
    assert.ok(body.error.includes('Too many requests'));
  });

  // 14. Significance endpoint returns chi-square and p-value
  test('Significance endpoint returns chi-square and p-value', () => {
    const mockDb = {
      all: (q, p, cb) => {
        if (q.includes('GROUP BY')) {
          cb(null, [
            { testId: 't1', variant: 'control', event: 'click', count: 10, users: 100 },
            { testId: 't1', variant: 'treatment', event: 'click', count: 20, users: 100 },
          ]);
        } else {
          cb(null, []);
        }
      },
    };
    const req = mockRequest({ url: '/api/abtest/significance?testId=t1&event=click', method: 'GET' });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.testId, 't1');
    assert.strictEqual(body.event, 'click');
    assert.ok(body.variants.control);
    assert.ok(body.variants.treatment);
    assert.ok(body.variants.significance);
    assert.ok(typeof body.variants.significance.chiSquare === 'number');
    assert.ok(typeof body.variants.significance.pValue === 'number');
  });
`;

// Insert before the runTests() call
const oldTail = `  console.log('\\n📊 Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

runTests();`;

const newTail = newTests + `\n  console.log('\\n📊 Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

runTests();`;

if (spec.includes(oldTail)) {
  spec = spec.replace(oldTail, newTail);
  fs.writeFileSync(path.join(__dirname, 'karma-abtest.spec.js'), spec);
  console.log('Added 4 new tests');
} else {
  console.log('Could not find insertion point');
}
