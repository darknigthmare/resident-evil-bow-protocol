import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'qa-canonical-r25');
fs.mkdirSync(output, {recursive: true});
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r25/canonical/manifest.json')));
const base = `http://127.0.0.1:${process.env.BOW_R25_CANONICAL_PORT || 5365}`;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: new URL(base).port}, stdio: 'ignore'});
const startedAt = new Date().toISOString(), checks = []; let browser;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page) { await page.waitForFunction(() => window.RE_CANONICAL_R25?.state().ready); }
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(75); }
  browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test(`Eighty new identities, quotations and source links at ${width}px`, async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + '/modules/fidelity-r25/canonical/index.html'); await ready(page);
      assert.equal(await page.locator('#results button').count(), 80);
      assert.match(await page.locator('#summary').innerText(), /109 nouvelles citations/);
      await page.fill('#search', 'recv-bandersnatch'); await page.locator('#results button').click();
      assert.equal(new URL(page.url()).hash, '#recv-bandersnatch');
      assert.equal(await page.locator('#details .claim').count(), 2);
      assert.equal(await page.locator('#details .corroborated').count(), 1);
      assert.match(await page.locator('#details').innerText(), /absence|lacks a left arm|Asymétrie/);
      const links = await page.locator('#details a[download]').evaluateAll(nodes => nodes.map(node => node.href));
      assert.equal(links.length, 3);
      for (const href of links) assert((await context.request.get(href)).ok());
      await page.fill('#search', ''); await page.selectOption('#filter', 'corroborated');
      assert.equal(await page.locator('#results button').count(), 10);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, `canonical-${width}.png`), fullPage: true});
      assert.deepEqual(errors, []);
      return {newIdentities: 80, assertions: 109, corroboratedIdentities: 10, verifiedLocalCopies: 3, sourceTextInert: true};
    } finally { await context.close(); }
  });
  await test('Negative predicates and game modes retain their original scope', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r25/canonical/index.html#re1-yawn'); await ready(page);
      assert.equal(await page.locator('#details .claim').count(), 2);
      assert.match(await page.locator('#details').innerText(), /Second combat uniquement/);
      assert.match(await page.locator('#details').innerText(), /Négation limitée à la phase/);
      await page.selectOption('#filter', 'negative'); assert.equal(await page.locator('#results button').count(), 3);
      await page.selectOption('#filter', 'scope'); assert.equal(await page.locator('#results button').count(), 2);
      await page.locator('[data-uid="rerev-wall-blister"]').click();
      assert.match(await page.locator('#details').innerText(), /édition HD\/PC/);
      assert.match(await page.locator('#details').innerText(), /Nintendo 3DS 2012/);
      await page.locator('[data-uid="re1-forest-speyer-zombie"]').click();
      assert.match(await page.locator('#details').innerText(), /Arranged\/Advanced/);
      return {negativeIdentities: 3, scopeGaps: 2, hdAndDirectorsCutRemainExplicit: true};
    } finally { await context.close(); }
  });
  await test('Named source actors do not inherit the subject identity', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r25/canonical/index.html#recv-hunter'); await ready(page);
      assert.match(await page.locator('#details').innerText(), /Le Spotter détecte ; le Hunter ou Sweeper est appelé/);
      assert.match(await page.locator('#details').innerText(), /Ce détecteur n’est pas ajouté au catalogue/);
      return {spotterIsDetector: true, hunterIsCalled: true, catalogueUnchanged: true};
    } finally { await page.close(); }
  });
  await test('Markup stays inert and an incomplete or remote source index is refused', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let mode = 'text';
    try {
      const changed = structuredClone(manifest); changed.claims[0].label = '<img src=x onerror="window.r25Injected=true">';
      await page.route('**/fidelity-r25/canonical/manifest.json', route => {
        const value = structuredClone(changed);
        if (mode === 'short') value.entries.pop();
        if (mode === 'remote') value.sources[0].snapshot = 'https://untrusted.example/source.gz';
        return route.fulfill({status: 200, json: value});
      });
      await page.goto(base + '/modules/fidelity-r25/canonical/index.html#' + changed.claims[0].uid); await ready(page);
      assert.equal(await page.evaluate(() => Boolean(window.r25Injected)), false);
      assert.equal(await page.locator('#details h3').first().innerText(), changed.claims[0].label);
      for (mode of ['short', 'remote']) {
        await page.reload(); await page.waitForFunction(() => document.querySelector('#summary').textContent.startsWith('Chargement impossible'));
        assert.equal(await page.locator('#results button').count(), 0);
        assert.equal(await page.locator('a[href^="https://untrusted.example"]').count(), 0);
      }
      return {markupIsText: true, missingIdentityRefused: true, remoteSnapshotRefused: true};
    } finally { await context.close(); }
  });
} finally {
  const report = {schema: 're.bow.canonical-browser-r25/1', startedAt, completedAt: new Date().toISOString(),
    passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks,
    primaryCapturesAdded: 0, completeMoveSetsCertified: 0, physicalDevices: false};
  fs.writeFileSync(path.join(output, 'R25_CANONICAL_BROWSER_RESULTS.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'docs/R25_CANONICAL_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); server.kill(); if (report.failed) process.exitCode = 1;
}
