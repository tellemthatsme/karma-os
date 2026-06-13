const fs = require('fs');

let abtest = fs.readFileSync('/c/karma/src/routes/abtest.js', 'utf8');

// Insert rate limiter after the first line
const rateLimiter = `// -- A/B Test Rate Limiter ------------------------------------------------
const abtestRateLimitMap = new Map(); // ip -> { count, resetTime }
const ABTEST_WINDOW_MS = 60 * 1000;   // 1 minute
const ABTEST_MAX_REQUESTS = 60;        // 60 requests per minute

function checkAbtestRateLimit(ip) {
  const now = Date.now();
  const entry = abtestRateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    abtestRateLimitMap.set(ip, { count: 1, resetTime: now + ABTEST_WINDOW_MS });
    return { allowed: true, remaining: ABTEST_MAX_REQUESTS - 1, retryAfter: 0 };
  }
  entry.count++;
  if (entry.count > ABTEST_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }
  return { allowed: true, remaining: ABTEST_MAX_REQUESTS - entry.count, retryAfter: 0 };
}

`;

if (!abtest.includes('abtestRateLimitMap')) {
  const idx = abtest.indexOf('\n');
  if (idx !== -1) {
    abtest = abtest.slice(0, idx + 1) + rateLimiter + abtest.slice(idx + 1);
    console.log('Inserted rate limiter after first line');
  }
}

// Insert rate limit check at the start of handleAbtestRoutes
const rateLimitCheck = `  // -- Rate limit check --------------------------------------------------
  const rateLimit = checkAbtestRateLimit(req.connection.remoteAddress || 'unknown');
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfter);
    res.writeHead(429, { 'Content-Type': 'application/json' });
    logRequest(req, res, startTime, { error: 'Too many requests' });
    metrics.activeConnections--;
    res.end(JSON.stringify({ error: 'Too many requests', retryAfter: rateLimit.retryAfter }));
    return true;
  }
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);

`;

if (!abtest.includes('checkAbtestRateLimit')) {
  const insertPoint = abtest.indexOf('  // -- A/B Test Routes');
  if (insertPoint !== -1) {
    abtest = abtest.slice(0, insertPoint) + rateLimitCheck + abtest.slice(insertPoint);
    console.log('Inserted rate limit check');
  } else {
    console.log('Could not find insert point');
  }
}

fs.writeFileSync('/c/karma/src/routes/abtest.js', abtest);
console.log('Done');
