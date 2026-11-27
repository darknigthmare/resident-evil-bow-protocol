import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.dirname(fileURLToPath(import.meta.url));
const reports = path.join(root, 'reports');
await fs.mkdir(reports, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [], requests = [], cases = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  // This demonstration is expected to need zero network requests.
  await context.route(/^https?:\/\//, async route => { requests.push(route.request().url()); await route.abort(); });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => { if (request.url().startsWith('file:')) errors.push('Local resource failed: ' + request.url()); });
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForSelector('.slot');
  await page.waitForFunction(() => [...document.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator('.slot').count(), 7);
  const secret = page.locator('[data-slot="dossier-03"]');
  assert.doesNotMatch(await secret.innerText(), /Billy|Coen/i);
  assert.doesNotMatch(await secret.getAttribute('aria-label'), /Billy|Coen/i);
  assert.equal(await secret.locator('img').count(), 0);
  cases.push({ name: 'secret_dom_and_accessibility', passed: true });

  await page.locator('[data-slot="dossier-01"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.slot), 'dossier-02');
  assert.equal(await page.locator('#detail-title').innerText(), 'Dossier médical');
  await page.locator('#confirm').click();
  assert.match(await page.locator('#message').innerText(), /dossier à compléter/i);
  cases.push({ name: 'keyboard_and_locked_information', passed: true });

  await page.selectOption('#scenario', 'claim');
  assert.equal(await page.locator('#claim').isVisible(), true);
  await page.locator('#claim').click();
  assert.match(await page.locator('#axes').innerText(), /Acquisition permanente/);
  assert.equal(await page.locator('#claim').isVisible(), false);
  await page.locator('#confirm').click();
  assert.equal(await page.locator('#phase').innerText(), 'CONFIRMÉ');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#phase').innerText(), 'RETIRÉ');
  assert.equal(await page.locator('#preview img').count(), 0);
  assert.equal(await page.locator('.slot[aria-pressed="true"]').count(), 0);
  cases.push({ name: 'claim_confirm_cancel', passed: true });

  const expectations = [
    ['costume-first', /personnage requis indisponible/i, false],
    ['support-active', /accès temporaire actif/i, true],
    ['support-expired', /accès temporaire terminé/i, false],
    ['permanent-retained', /sélection autorisée/i, true],
    ['offline-cache', /justificatif hors ligne valide/i, true],
    ['offline-pending', /service indisponible/i, false],
    ['missing-files', /installation nécessaire/i, false],
    ['wrong-mode', /indisponible dans ce mode/i, false],
    ['duplicate', /déjà choisi/i, false],
    ['rule-or', /récompense disponible/i, false]
  ];
  for (const [scenario, message, allowed] of expectations) {
    await page.selectOption('#scenario', scenario);
    const result = await page.locator('#detail-status').innerText();
    assert.match(result, message);
    if (scenario !== 'rule-or') assert.equal(await page.locator('#confirm').getAttribute('data-can-select'), String(allowed));
    cases.push({ name: scenario, passed: true, observedStatus: result });
  }
  await page.selectOption('#scenario', 'permanent-retained');
  await page.locator('[data-filter="costume"]').click();
  await page.locator('#next-valid').click();
  assert.match(await page.locator('#detail-status').innerText(), /sélection autorisée/i);
  cases.push({ name: 'filtered_catalogue_keeps_parent_dependency', passed: true });

  await page.selectOption('#scenario', 'arrival');
  await page.screenshot({ path: path.join(reports, 'desktop-1440.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(reports, 'mobile-390.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => document.documentElement.style.fontSize = '32px');
  await page.screenshot({ path: path.join(reports, 'text-200pct-320.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  cases.push({ name: 'responsive_1440_390_320_and_text_200_percent', passed: true });
  assert.equal(await page.locator('#reduce').isChecked(), true);
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  cases.push({ name: 'no_page_errors_and_zero_network_requests', passed: true });
  const report = { schema: 'rec-v23-prototype-browser-qa/1', date: new Date().toISOString(), urlMode: 'file', browser: await browser.version(), runtime: process.version, playwright: require('playwright/package.json').version, cases, errors, externalRequests: requests, limitations: ['No physical gamepad or real screen reader tested.', 'No runtime combat, real payments or game-save integration.', 'CSS reduced motion inspected through media preference; no animation frames certified.'] };
  await fs.writeFile(path.join(reports, 'BROWSER_QA.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: cases.length, errors, externalRequests: requests, report: 'reports/BROWSER_QA.json' }));
} finally { await browser.close(); }
