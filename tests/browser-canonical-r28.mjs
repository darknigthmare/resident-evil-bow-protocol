import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'qa-canonical-r28'); fs.mkdirSync(output, {recursive: true});
const sourcePath = 'modules/fidelity-r28/canonical/manifest.json', manifest = JSON.parse(fs.readFileSync(path.join(root, sourcePath)));
const base = `http://127.0.0.1:${process.env.BOW_R28_CANONICAL_PORT || 5765}`, route = '/modules/fidelity-r28/canonical/index.html';
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: new URL(base).port}, stdio: 'ignore'});
const checks = [], startedAt = new Date().toISOString(); let browser;
const sha = raw => createHash('sha256').update(raw).digest('hex');
async function test(name, run) { try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
async function ready(page) { await page.waitForFunction(() => window.RE_CANONICAL_R28?.state().ready); }
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 75)); }
  browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1280, 320]) await test('Thirty-three exact reviews, encounter filters and doubled text at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + route); await ready(page); assert.equal(await page.locator('#results button').count(), 33); assert.match(await page.locator('#summary').innerText(), /42 nouvelles citations/); assert.match(await page.locator('#summary').innerText(), /389 identités/);
      await page.selectOption('#filter', 'location'); assert.equal(await page.locator('#results button').count(), 31);
      await page.fill('#search', 're3r-licker'); await page.locator('#results button').click(); assert.match(await page.locator('#details').innerText(), /North West Hallway/); assert.match(await page.locator('#details').innerText(), /Nightmare/); assert.match(await page.locator('#details').innerText(), /Smashes through the northern windows/);
      await page.evaluate(() => { const elements = [...document.querySelectorAll('body *')].filter(element => !['SCRIPT', 'STYLE'].includes(element.tagName)); const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize)); elements.forEach((element, index) => element.style.setProperty('font-size', sizes[index] * 2 + 'px', 'important')); });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'canonical-' + width + '-200pct.png'), fullPage: true}); assert.deepEqual(errors, []);
      return {newSubjects: 33, newClaims: 42, cumulativeDocumentarySubjects: 389, encounterTableSubjects: 31, everyComputedFontDoubled: true, overflow: false};
    } finally { await context.close(); }
  });
  await test('The downloaded local source is the exact captured gzip and raw HTML', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + route + '#rerequiem-blister-head'); await ready(page);
      const source = manifest.sources.find(source => source.id === 'R28-S-rerequiem-blister-head');
      const link = await page.locator('#details a[download]').first().getAttribute('href'), response = await context.request.get(link); assert(response.ok());
      const packed = await response.body(), raw = gunzipSync(packed); assert.equal(sha(packed), source.snapshot_sha256); assert.equal(sha(raw), source.raw_sha256);
      assert.match(await page.locator('#details').innerText(), /destroy a blister on the Blister Borne/); assert.match(await page.locator('#details').innerText(), /Standard \(Modern\)/);
      return {gzipSha256: sha(packed), rawSha256: sha(raw), bytes: raw.length, exactLocationAndMode: true};
    } finally { await context.close(); }
  });
  await test('The two negations retain the precise passage or staircase rather than becoming global incapabilities', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(base + route + '#re4r-zealot'); await ready(page); assert.match(await page.locator('#details').innerText(), /They don't attack you/); assert.match(await page.locator('#details').innerText(), /Passageway - Castle Entry/); assert.match(await page.locator('#details').innerText(), /quatre zélotes de ce passage/);
      await page.selectOption('#filter', 'negative'); assert.equal(await page.locator('#results button').count(), 2);
      await page.goto(base + route + '#rerequiem-tyrant-t-501'); await ready(page); assert.match(await page.locator('#details').innerText(), /It will not follow you up the stairs however/); assert.match(await page.locator('#details').innerText(), /East Stairway 1F/); assert.match(await page.locator('#details').innerText(), /aucune incapacité générale/);
      return {negativeClaims: 2, roomAndModeRetained: true, noGlobalInabilityClaim: true};
    } finally { await page.close(); }
  });
  await test('Strong Threat variants and human/mutated phases expose their own source and trigger', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(base + route + '#re4r-colmillos-strong-threat'); await ready(page); assert.match(await page.locator('#details').innerText(), /A Savage Mutt/);
      const urls = await page.locator('#details a[target="_blank"]').evaluateAll(links => links.map(link => link.href)); assert(urls.every(url => url.endsWith('/colmillos-strong-threat')));
      await page.goto(base + route + '#re4r-bitores-mendez-second-mutation'); await ready(page); assert.match(await page.locator('#details').innerText(), /after a certain amount of damage/); assert.match(await page.locator('#details').innerText(), /n’est pas chiffré/);
      await page.goto(base + route + '#re4r-jack-krauser'); await ready(page); assert.match(await page.locator('#details').innerText(), /Fires at you/); assert.doesNotMatch(await page.locator('#details').innerText(), /both his arms/);
      return {strongThreatPageExact: true, damageThresholdUnquantified: true, humanDidNotInheritMutatedArms: true};
    } finally { await page.close(); }
  });
  await test('A previously reviewed identity keeps its historical route without inventing a new quotation', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(base + route + '#re1-cerberus'); await ready(page); assert.equal(await page.locator('#details .claim').count(), 0);
      const links = await page.locator('#details a').evaluateAll(nodes => nodes.map(node => node.href)); assert(links.some(link => link.includes('/fidelity-r27/canonical/index.html#re1-cerberus')));
      return {newQuotesForOldIdentity: 0, exactPreviousVersionLink: true};
    } finally { await page.close(); }
  });
  await test('Markup stays inert and altered room/mode, game edition, variant, remote snapshot or oversize manifests are refused', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let mode = 'text';
    const changed = structuredClone(manifest); changed.claims[0].label = '<img src=x onerror="window.r28Injected=true">';
    await page.route('**/fidelity-r28/canonical/manifest.json', route => {
      const value = structuredClone(changed), claim = value.claims[0];
      if (mode === 'room') claim.evidence[0].game_mode = 'Undocumented mode';
      if (mode === 'edition') claim.evidence[0].game_key = 'resident-evil-3';
      if (mode === 'variant') claim.evidence[0].source_id = value.claims.find(item => item.uid === 're3r-hunter-beta').evidence[0].source_id;
      if (mode === 'remote') value.sources[0].snapshot = 'https://untrusted.example/capture.gz';
      if (mode === 'large') value.padding = 'x'.repeat(2 * 1024 * 1024);
      return route.fulfill({status: 200, json: value});
    });
    try {
      await page.goto(base + route + '#' + changed.claims[0].uid); await ready(page); assert.equal(await page.evaluate(() => Boolean(window.r28Injected)), false); assert.match(await page.locator('#details').innerText(), /<img src=x/);
      for (mode of ['room', 'edition', 'variant', 'remote', 'large']) { await page.reload(); await page.waitForFunction(() => document.getElementById('summary').textContent.startsWith('Chargement impossible')); assert.equal(await page.locator('#results button').count(), 0); }
      return {markupInert: true, roomModeMismatchRefused: true, editionMismatchRefused: true, wrongVariantRefused: true, remoteSnapshotRefused: true, manifest2MiBBound: true};
    } finally { await context.close(); }
  });
} catch (error) { checks.push({name: 'suite setup', pass: false, error: error.stack}); console.error(error.stack); }
finally {
  const paths = [sourcePath, 'modules/fidelity-r28/canonical/page.js', 'modules/fidelity-r28/canonical/index.html', 'tests/browser-canonical-r28.mjs'];
  const report = {schema: 're.bow.canonical-browser-r28/1', startedAt, completedAt: new Date().toISOString(), passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length,
    checks, sourceFiles: paths.map(file => ({path: file, sha256: sha(fs.readFileSync(path.join(root, file)))})), primaryCapturesCertified: false, completeMovesetsCertified: false, physicalDevicesCertified: false};
  const raw = JSON.stringify(report, null, 2) + '\n'; fs.writeFileSync(path.join(output, 'R28_CANONICAL_BROWSER_RESULTS.json'), raw); fs.writeFileSync(path.join(root, 'docs/R28_CANONICAL_BROWSER.json'), raw);
  await browser?.close(); server.kill(); if (report.failed) process.exitCode = 1;
}
