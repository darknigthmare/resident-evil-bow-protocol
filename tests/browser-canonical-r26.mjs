import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'qa-canonical-r26');
fs.mkdirSync(output, {recursive: true});
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r26/canonical/manifest.json')));
const base = `http://127.0.0.1:${process.env.BOW_R26_CANONICAL_PORT || 5465}`;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: new URL(base).port}, stdio: 'ignore'});
const startedAt = new Date().toISOString(), checks = []; let browser;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page) { await page.waitForFunction(() => window.RE_CANONICAL_R26?.state().ready); }
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(75); }
  browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test(`Ninety-nine new identities, quotations and source links at ${width}px`, async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + '/modules/fidelity-r26/canonical/index.html'); await ready(page);
      assert.equal(await page.locator('#results button').count(), 99);
      assert.match(await page.locator('#summary').innerText(), /110 nouvelles citations/);
      await page.fill('#search', 're2r-tyrant'); await page.locator('#results button').click();
      assert.equal(new URL(page.url()).hash, '#re2r-tyrant');
      assert.equal(await page.locator('#details .claim').count(), 3);
      assert.equal(await page.locator('#details .corroborated').count(), 0);
      assert.match(await page.locator('#details').innerText(), /running footsteps/);
      const links = await page.locator('#details a[download]').evaluateAll(nodes => nodes.map(node => node.href));
      assert.equal(links.length, 3);
      for (const href of links) assert((await context.request.get(href)).ok());
      await page.fill('#search', ''); await page.selectOption('#filter', 'scope');
      assert.equal(await page.locator('#results button').count(), 12);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, `canonical-${width}.png`), fullPage: true});
      assert.deepEqual(errors, []);
      return {newIdentities: 99, assertions: 110, scopeIdentities: 12, verifiedLocalCopies: 3, sourceTextInert: true};
    } finally { await context.close(); }
  });
  await test('Infant negative predicate and difficulty conditions retain their scope', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r26/canonical/index.html#recv-albinoid-infant'); await ready(page);
      assert.equal(await page.locator('#details .claim').count(), 2);
      assert.match(await page.locator('#details').innerText(), /Négation limitée à la phase/);
      assert.match(await page.locator('#details').innerText(), /ability to shock you/);
      assert.match(await page.locator('#details').innerText(), /does not possess this power until its fully grown/);
      await page.selectOption('#filter', 'negative'); assert.equal(await page.locator('#results button').count(), 1);
      await page.selectOption('#filter', 'scope'); assert.equal(await page.locator('#results button').count(), 12);
      await page.locator('[data-uid="reoutbreak-scissor-worm"]').click();
      assert.match(await page.locator('#details').innerText(), /Hard et Very Hard/);
      return {negativeIdentities: 1, scopeGaps: 12, infantAndAdultSeparate: true, difficultyExplicit: true};
    } finally { await context.close(); }
  });
  await test('Original and remake attacks and asymmetric subjects are kept apart', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r26/canonical/index.html#re2-giant-alligator'); await ready(page);
      assert.match(await page.locator('#details').innerText(), /gas canister/);
      await page.goto(base + '/modules/fidelity-r26/canonical/index.html#re2r-alligator'); await ready(page);
      assert.match(await page.locator('#details').innerText(), /gas pipe/);
      assert.match(await page.locator('#details').innerText(), /ne pas remplacer par la bonbonne/);
      await page.goto(base + '/modules/fidelity-r26/canonical/index.html#reoutbreak-thanatos-r'); await ready(page);
      assert.match(await page.locator('#details').innerText(), /right arm completely/);
      return {originalCanister: true, remakePipe: true, lostRightArmPreserved: true};
    } finally { await page.close(); }
  });
  await test('Markup stays inert and an incomplete or remote source index is refused', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let mode = 'text';
    try {
      const changed = structuredClone(manifest); changed.claims[0].label = '<img src=x onerror="window.r26Injected=true">';
      await page.route('**/fidelity-r26/canonical/manifest.json', route => {
        const value = structuredClone(changed);
        if (mode === 'short') value.entries.pop();
        if (mode === 'remote') value.sources[0].snapshot = 'https://untrusted.example/source.gz';
        return route.fulfill({status: 200, json: value});
      });
      await page.goto(base + '/modules/fidelity-r26/canonical/index.html#' + changed.claims[0].uid); await ready(page);
      assert.equal(await page.evaluate(() => Boolean(window.r26Injected)), false);
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
  const report = {schema: 're.bow.canonical-browser-r26/1', startedAt, completedAt: new Date().toISOString(),
    passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks,
    primaryCapturesAdded: 0, completeMoveSetsCertified: 0, physicalDevices: false};
  fs.writeFileSync(path.join(output, 'R26_CANONICAL_BROWSER_RESULTS.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'docs/R26_CANONICAL_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); server.kill(); if (report.failed) process.exitCode = 1;
}
