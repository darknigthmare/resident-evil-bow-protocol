import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {mainFixture, catalogFixture} from './persistence-fixtures-r24.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'qa-persistence-r24-browser'); fs.mkdirSync(output, {recursive: true});
const checks = [], port = Number(process.env.BOW_PERSISTENCE_R24_PORT || 5284), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const main = await mainFixture(), catalog = catalogFixture(), historical = await mainFixture({historical: true}), clone = value => JSON.parse(JSON.stringify(value));
let browser;
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
async function open(page) { await page.goto(base + '/modules/fidelity-r24/persistence/index.html'); await page.waitForFunction(() => !!window.BOW_REPLAY_PAGE_R24); }
async function upload(page, value, name = 'replay.json') { await page.locator('#replay').setInputFiles({name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value))}); }
async function settled(page) { await page.waitForFunction(() => !document.getElementById('results').hidden || document.getElementById('status').textContent.startsWith('VÉRIFICATION REFUSÉE'), {timeout: 55000}); }

try {
  for (let n = 0; n < 100; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Actual principal replay is reconstructed twice in an opaque sandbox on desktop and mobile with unchanged game saves', async () => {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({viewport: {width, height: 900}}), page = await context.newPage(), errors = [], remote = [];
      page.on('pageerror', error => errors.push(String(error))); page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('data:')) remote.push(request.url()); });
      await open(page); await page.evaluate(() => { localStorage.setItem('re.bow.chronicles055.a', 'ORIGINAL GAME COPY'); localStorage.setItem('unrelated-setting', 'KEEP'); });
      await upload(page, main); await settled(page);
      assert.equal(await page.locator('#results').isHidden(), false, await page.locator('#status').textContent());
      const result = JSON.parse(await page.locator('#report').textContent()); assert.equal(result.verified, true); assert.equal(result.passes, 2); assert.equal(result.result.claimed, true); assert.equal(result.sandbox.origin, 'null'); assert.equal(result.sandbox.isolatedStorage, true);
      assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))), {'re.bow.chronicles055.a': 'ORIGINAL GAME COPY', 'unrelated-setting': 'KEEP'});
      assert.equal(await page.locator('iframe').count(), 0); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'main-verification-' + width + '.png'), fullPage: true}); assert.deepEqual(errors, []); assert.deepEqual(remote, []); await context.close();
    }
    return {widths: [1440, 390], opaqueOrigin: true, gameStorageUnchanged: true, replays: 2};
  });
  await test('Experimental replay verifies its stored state digest with the actual R7 browser engine', async () => {
    const context = await browser.newContext(), page = await context.newPage(); await open(page); await upload(page, catalog); await settled(page);
    assert.equal(await page.locator('#results').isHidden(), false, await page.locator('#status').textContent());
    const result = JSON.parse(await page.locator('#report').textContent()); assert.equal(result.kind, 'catalog-r7'); assert.equal(result.storedStateDigestVerifiedByOriginalEngine, true); assert.equal(result.storedStateDigest, catalog.stateDigest); assert.equal(result.exactFinalStatesEqual, true); assert.equal(result.sandbox.origin, 'null');
    await page.screenshot({path: path.join(output, 'catalog-verification.png'), fullPage: true}); await context.close(); return {frames: catalog.frames, storedDigestVerified: true};
  });
  await test('A falsified principal result and experimental state digest are rejected after real reconstruction', async () => {
    const context = await browser.newContext(), page = await context.newPage(); await open(page);
    const badMain = clone(main); badMain.result.life--;
    await upload(page, badMain); await settled(page); assert.equal(await page.locator('#results').isHidden(), true); assert.match(await page.locator('#status').textContent(), /Résultat différent/);
    const badCatalog = clone(catalog); badCatalog.stateDigest = '00000000';
    await upload(page, badCatalog); await settled(page); assert.equal(await page.locator('#results').isHidden(), true); assert.match(await page.locator('#status').textContent(), /résultat ne correspond pas/);
    assert.equal(await page.locator('iframe').count(), 0); await context.close();
  });
  await test('An older replay contract is preserved and refused without launching under current rules', async () => {
    const context = await browser.newContext({acceptDownloads: true}), page = await context.newPage(); await open(page);
    const value = clone(main); value.meta.runtimeContract = 'historical-runtime'; const bytes = Buffer.from(JSON.stringify(value));
    await page.locator('#replay').setInputFiles({name: 'historical.json', mimeType: 'application/json', buffer: bytes}); await settled(page);
    assert.match(await page.locator('#status').textContent(), /moteur d’origine/); assert.equal(await page.locator('#results').isHidden(), true);
    const wait = page.waitForEvent('download'); await page.click('#original'); const download = await wait; assert.deepEqual(fs.readFileSync(await download.path()), bytes); await context.close();
  });
  await test('A genuine pre-R13 recording selects its frozen original engine and reconstructs its own outcome', async () => {
    const context = await browser.newContext(), page = await context.newPage(); await open(page); await upload(page, historical, 'replay-pre-r13.json'); await settled(page);
    assert.equal(await page.locator('#results').isHidden(), false, await page.locator('#status').textContent());
    const result = JSON.parse(await page.locator('#report').textContent()); assert.equal(result.engineSource.id, 'main-pre-r13'); assert.equal(result.engineSource.commit, '31671fecf53a26d81f77d2cb13a5ff61f15ef363'); assert.equal(result.engineContract, historical.meta.runtimeContract); assert.equal(result.exactFinalStatesEqual, true); assert.equal(result.result.claimed, true); assert.equal(result.sandbox.origin, 'null');
    await page.screenshot({path: path.join(output, 'historical-verification.png'), fullPage: true}); await context.close();
    return {sourceCommit: result.engineSource.commit, contract: result.engineContract, commandFrames: result.commandFrames};
  });
  await test('Cancellation tears down a pending sandbox and delayed loading cannot publish a stale result', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let release, seen;
    const wait = new Promise(resolve => { release = resolve; }), reached = new Promise(resolve => { seen = resolve; });
    await page.route('**/unified-engine-v060.js', async route => { seen(); await wait; try { await route.continue(); } catch {} });
    await open(page); await upload(page, main); await reached; await page.click('#cancel'); assert.equal(await page.locator('iframe').count(), 0); release();
    await page.waitForTimeout(100); assert.match(await page.locator('#status').textContent(), /annulée/); assert.equal(await page.locator('#results').isHidden(), true);
    await page.unroute('**/unified-engine-v060.js'); await upload(page, catalog); await settled(page); assert.equal(JSON.parse(await page.locator('#report').textContent()).kind, 'catalog-r7'); await context.close();
  });
} finally {
  if (browser) await browser.close(); server.kill('SIGTERM');
  const result = {schema: 're.bow.persistence-r24-browser-tests/1', passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length, checks, scope: 'Local headless Chromium with original current source engines. No cloud backend, physical crash or unknown historical engine certification.'};
  fs.writeFileSync(path.join(output, 'R24_PERSISTENCE_BROWSER_RESULTS.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
}
