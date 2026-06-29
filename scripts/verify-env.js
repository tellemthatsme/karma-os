#!/usr/bin/env node
// Audit Quick Win: CI-safe .env presence check.
// Honors SKIP_ENV_CHECK=1 to bypass in CI environments.
const fs = require('fs');
const path = require('path');

if (process.env.SKIP_ENV_CHECK === '1') {
  console.log('SKIP_ENV_CHECK=1 -- skipping .env check');
  process.exit(0);
}

const envPath = path.join(__dirname, '..', '.env');
const examplePath = path.join(__dirname, '..', '.env.example');

try {
  fs.accessSync(envPath, fs.constants.F_OK);
  console.log('.env present -- OK');
  process.exit(0);
} catch (e) {
  console.error('Missing .env file.');
  if (fs.existsSync(examplePath)) {
    console.error('Fix: copy ' + examplePath + ' to ' + envPath);
    console.error('Or set SKIP_ENV_CHECK=1 in CI environments.');
  }
  process.exit(1);
}
