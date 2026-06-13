const fs = require('fs');

let spec = fs.readFileSync('karma-abtest.spec.js', 'utf8');

const newTest = `  // 15. Rate limiter respects x-forwarded-for header
  test('Rate limiter respects x-forwarded-for header', () => {
    const { handleAbtestRoutes } = require('./src/routes/abtest');
    const mockDb = { all: () => {}, prepare: () => ({ run: () => {}, finalize: () => {} }) };
    const req = mockRequest({ url: '/api/abtest/stats', method: 'GET', headers: { 'x-forwarded-for': '10.0.0.5, 192.168.1.1' } });
    const res = mockResponse();
    const result = handleAbtestRoutes(req, res, Date.now(), createDeps(mockDb));
    assert.strictEqual(result, true);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['X-RateLimit-Remaining'] !== undefined);
  });

runTests();`;

if (!spec.includes('Rate limiter respects x-forwarded-for header')) {
  spec = spec.replace('runTests();', newTest);
  fs.writeFileSync('karma-abtest.spec.js', spec);
  console.log('Added x-forwarded-for test');
} else {
  console.log('Test already exists');
}
