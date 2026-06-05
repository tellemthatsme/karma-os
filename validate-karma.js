#!/usr/bin/env node
/**
 * karma-os-ultimate.html - Headless Validation Script
 * 
 * Usage: node validate-karma.js
 * Requirements: npm install playwright (or it uses the system's chromium via playwright)
 * 
 * This script:
 *  1. Opens karma-os-ultimate.html in a headless browser
 *  2. Checks for zero JS console errors
 *  3. Validates key DOM elements exist
 *  4. Unlocks the gate with OVERRIDE
 *  5. Validates army modal counts
 */

const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve('C:/karma/karma-os-ultimate.html').replace(/\\/g, '/');

async function validate() {
  console.log('=== KARMA OS Ultimate - Headless Validation ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const jsErrors = [];
  const testResults = [];
  
  // Capture JS errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('net::ERR') && !text.includes('404')) {
        jsErrors.push(text);
      }
    }
  });
  
  page.on('pageerror', err => {
    jsErrors.push('PAGE ERROR: ' + err.message);
  });
  
  try {
    // 1. Load the page
    console.log('1. Loading page...');
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    testResults.push({ name: 'Page loads', passed: true });
    
    // 2. Unlock with OVERRIDE
    console.log('2. Unlocking with OVERRIDE...');
    const input = page.locator('#gate-input');
    const btn = page.locator('.gate-btn');
    if (await input.count() > 0) {
      await input.fill('OVERRIDE');
      await btn.click();
      await page.waitForTimeout(1000);
      testResults.push({ name: 'OVERRIDE unlock', passed: true });
    } else {
      testResults.push({ name: 'OVERRIDE unlock', passed: false, reason: 'Gate elements not found' });
    }
    
    // 3. Check stats bar
    console.log('3. Checking stats bar...');
    const agentCount = await page.locator('#agent-count').textContent().catch(() => null);
    const workerCount = await page.locator('#worker-count').textContent().catch(() => null);
    
    const agentOk = agentCount && agentCount.trim() === '25';
    testResults.push({ 
      name: 'Stats bar - 25 agents', 
      passed: agentOk, 
      found: agentCount,
      reason: !agentOk ? `Expected 25, got "${agentCount}"` : null 
    });
    console.log(`   Agent count: "${agentCount}" ${agentOk ? '✓' : '✗'}`);
    
    // 4. Check for JS errors
    console.log('4. Checking for JS errors...');
    const hasErrors = jsErrors.length > 0;
    testResults.push({ 
      name: 'Zero JS errors', 
      passed: !hasErrors, 
      errors: hasErrors ? jsErrors : null 
    });
    if (hasErrors) {
      console.log(`   ✗ Found ${jsErrors.length} errors:`);
      jsErrors.forEach(e => console.log(`     - ${e}`));
    } else {
      console.log('   ✓ No JS errors detected');
    }
    
    // 5. Open army modal
    console.log('5. Opening army modal...');
    const armyBtn = page.locator('button:has-text("ARMY")');
    if (await armyBtn.count() > 0) {
      await armyBtn.click();
      await page.waitForTimeout(1500);
      testResults.push({ name: 'Army modal opens', passed: true });
      
      // 6. Count FOOTCLAN workers
      console.log('6. Counting FOOTCLAN workers...');
      const fcCount = await page.locator('#army-fc-list > div').count();
      const fcOk = fcCount === 20;
      testResults.push({ 
        name: '20 FOOTCLAN workers', 
        passed: fcOk, 
        found: fcCount,
        reason: !fcOk ? `Expected 20, found ${fcCount}` : null 
      });
      console.log(`   FOOTCLAN workers: ${fcCount} ${fcOk ? '✓' : '✗'}`);
      
      // 7. Count specialists
      console.log('7. Counting specialists...');
      const specCount = await page.locator('#army-specialists > div').count();
      const specOk = specCount === 24;
      testResults.push({ 
        name: '24 specialists', 
        passed: specOk, 
        found: specCount,
        reason: !specOk ? `Expected 24, found ${specCount}` : null 
      });
      console.log(`   Specialists: ${specCount} ${specOk ? '✓' : '✗'}`);
      
      // 8. Check army modal count headers
      const specHeader = await page.locator('#army-spec-count').textContent().catch(() => null);
      const fcHeader = await page.locator('#army-fc-count').textContent().catch(() => null);
      testResults.push({ 
        name: 'SPECIALISTS header count', 
        passed: specHeader && specHeader.trim() === '24',
        found: specHeader
      });
      testResults.push({ 
        name: 'FOOTCLAN WORKERS header count', 
        passed: fcHeader && fcHeader.trim() === '20',
        found: fcHeader
      });
    } else {
      testResults.push({ name: 'Army modal opens', passed: false, reason: 'ARMY button not found' });
    }
    
    // Close army modal if still open
    const armyCloseBtn = page.locator('#army-m .mclose');
    if (await armyCloseBtn.count() > 0) await armyCloseBtn.click();
    await page.waitForTimeout(300);
    
    // 9. Check Settings
    console.log('9. Checking Settings...');
    const settingsBtn = page.locator('.topbar-actions button[onclick*="settings-m"]');
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      const n8nStatus = await page.locator('#n8n-status').count();
      testResults.push({ 
        name: 'n8n-status element exists', 
        passed: n8nStatus > 0 
      });
    }
    
  } catch (err) {
    testResults.push({ name: 'Exception', passed: false, reason: err.message });
    console.log('ERROR:', err.message);
  }
  
  await browser.close();
  
  // Summary
  console.log('\n=== VALIDATION SUMMARY ===');
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  
  testResults.forEach(r => {
    const icon = r.passed ? '✓' : '✗';
    const extra = r.errors ? ` (${r.errors.join(', ')})` : '';
    const extra2 = r.found !== undefined && r.found !== null ? ` [found: ${r.found}]` : '';
    const extra3 = r.reason ? ` (${r.reason})` : '';
    console.log(`  ${icon} ${r.name}${extra}${extra2}${extra3}`);
  });
  
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  
  process.exit(failed > 0 ? 1 : 0);
}

validate().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});