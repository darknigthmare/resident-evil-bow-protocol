import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {mainFixture, catalogFixture} from './persistence-fixtures-r24.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'qa-persistence-r25-browser'); fs.mkdirSync(output, {recursive: true});
const box = {}; box.window = box; vm.createContext(box); vm.runInContext(fs.readFileSync(path.join(root, 'src/save-center-r19.js'), 'utf8'), box); const S = box.RE_SAVE_CENTER;
const main = await mainFixture(), historical = await mainFixture({historical: true}), catalog = catalogFixture(); historical.id += '-historical';
const clone = value => JSON.parse(JSON.stringify(value));
const archive = '\n[\n  ' + JSON.stringify(main, null, 2) + '  ,\n' + JSON.stringify(historical) + '\n]\n';
const backup = raw => S.encode(S.KEYS.map(key => ({key, value: key === 're-bow-v048-replays' ? raw : key === 're.bow.audio058' ? ' {"volume":0.3,"note":"garder é 🧟"}\n' : null})), 'R25 Browser real recordings', '2026-10-24T00:00:00.000Z');
const backupText = backup(archive), checks = [], port = Number(process.env.BOW_PERSISTENCE_R25_PORT || 5385), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
async function open(page) { await page.goto(base + '/modules/fidelity-r25/persistence/index.html'); await page.waitForFunction(() => !!window.BOW_REPLAY_PAGE_R25 && !document.getElementById('replay').disabled); }
async function upload(page, value, name = 'bundle.json') { const text = typeof value === 'string' ? value : JSON.stringify(value); await page.locator('#replay').setInputFiles({name, mimeType: 'application/json', buffer: Buffer.from(text)}); }
async function inspected(page) { await page.waitForFunction(() => !document.getElementById('selection').hidden || document.getElementById('status').textContent.startsWith('INSPECTION REFUSÉE')); }
async function finished(page) { await page.waitForFunction(() => !document.getElementById('results').hidden && !window.BOW_REPLAY_PAGE_R25.state().active, null, {timeout: 60000}); }
async function downloaded(page, selector) { const event = page.waitForEvent('download'); await page.click(selector); return fs.readFileSync(await (await event).path()); }
try {
  for (let n = 0; n < 100; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test('R19 nested archive selection, exact extraction and actual two-engine reconstruction at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, acceptDownloads: true, hasTouch: width === 390}), page = await context.newPage(), errors = [], remote = [];
    try {
      page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('data:')) remote.push(request.url()); });
      await open(page); await page.evaluate(() => { localStorage.setItem('re.bow.chronicles055.a', 'GAME MUST STAY'); localStorage.setItem('unrelated-user-setting', 'KEEP'); });
      await upload(page, backupText, 'sauvegarde.json'); await inspected(page); assert.equal(await page.locator('#rows .record').count(), 2); assert.equal(await page.locator('#rows input:checked').count(), 2); assert.equal(await page.locator('iframe').count(), 0);
      assert.deepEqual(await downloaded(page, '#original'), Buffer.from(backupText)); assert.deepEqual(await downloaded(page, '#archive'), Buffer.from(archive));
      const sourceSlice = '\n  ' + JSON.stringify(main, null, 2) + '  ';
      assert.deepEqual(await downloaded(page, '#rows .extract >> nth=0'), Buffer.from(sourceSlice));
      await page.click('#verify'); await finished(page);
      const result = JSON.parse(await page.locator('#report').textContent()); assert.equal(result.verified, true); assert.equal(result.completed, 2); assert.equal(result.source.sha256, createHash('sha256').update(backupText).digest('hex'));
      assert.deepEqual(result.records.map(r => r.verification.engineSource.id), ['main-current', 'main-pre-r13']); assert(result.records.every(r => r.verification.sandbox.origin === 'null' && r.verification.sandbox.isolatedStorage && r.verification.passes === 2));
      assert.deepEqual(await page.evaluate(() => ({...localStorage})), {'re.bow.chronicles055.a': 'GAME MUST STAY', 'unrelated-user-setting': 'KEEP'}); assert.equal(await page.locator('iframe').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); assert.deepEqual(errors, []); assert.deepEqual(remote, []);
      await page.screenshot({path: path.join(output, 'archive-' + width + '.png'), fullPage: true});
      return {width, exactOriginal: true, exactNestedArchive: true, exactRecordSlice: true, engineRoutes: ['main-current', 'main-pre-r13'], gameSavesUnchanged: true};
    } finally { await context.close(); }
  });
  await test('Individual experimental replay retains its original state-digest verification', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try { await open(page); await upload(page, catalog); await inspected(page); assert.equal(await page.locator('#archive').isDisabled(), true); await page.click('#verify'); await finished(page);
      const result = JSON.parse(await page.locator('#report').textContent()); assert.equal(result.verified, true); assert.equal(result.records[0].verification.kind, 'catalog-r7'); assert.equal(result.records[0].verification.storedStateDigest, catalog.stateDigest); return {route: 'catalog-current', digestCheckedByOriginalEngine: true};
    } finally { await context.close(); }
  });
  await test('Unknown, invalid and duplicate records stay visible while a falsified result cannot pass with a valid neighbour', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await open(page); const unknown = clone(main); unknown.id = 'unknown'; unknown.meta.runtimeContract = 'unsupported-engine'; const falsified = clone(main); falsified.id = 'falsified'; falsified.result.life--;
      const repeated = clone(main); repeated.id = 'duplicate';
      await upload(page, [unknown, false, repeated, repeated, falsified, main]); await inspected(page);
      assert.equal(await page.locator('#rows .record').count(), 6); assert.equal(await page.locator('#rows input:disabled').count(), 4); assert.equal(await page.locator('#rows input:checked').count(), 2);
      await page.click('#verify'); await finished(page); const result = JSON.parse(await page.locator('#report').textContent()); assert.equal(result.verified, false); assert.deepEqual(result.records.map(r => r.status), ['refused', 'verified']); assert.match(result.records[0].reason, /Résultat différent/); assert.equal(await page.locator('iframe').count(), 0); return {visibleRecords: 6, refusedBeforeLaunch: 4, independentlyVerified: 1, falsifiedOutcomeRefused: 1};
    } finally { await context.close(); }
  });
  await test('Transport failures preserve the original and an empty backup never starts a replay', async () => {
    const context = await browser.newContext({acceptDownloads: true}), page = await context.newPage();
    try {
      await open(page); const damaged = backupText.replace('R25 Browser real recordings', 'damaged source'); await upload(page, damaged); await inspected(page);
      assert.match(await page.locator('#status').textContent(), /Empreinte/); assert.equal(await page.locator('#selection').isHidden(), true); assert.deepEqual(await downloaded(page, '#original'), Buffer.from(damaged));
      await upload(page, backup('[]')); await inspected(page); assert.equal(await page.locator('#verify').isDisabled(), true); assert.equal(await page.locator('#rows .record').count(), 0); assert.equal(await page.locator('iframe').count(), 0); return {damagedOriginalPreserved: true, emptyArchiveNoPlayback: true};
    } finally { await context.close(); }
  });
  await test('A 31-record archive is selectable in bounded batches and cannot launch an oversized selection', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await open(page); await upload(page, Array.from({length: 31}, (_, n) => ({...main, id: 'batch-' + n}))); await inspected(page);
      assert.equal(await page.locator('#rows input:checked').count(), 0); await page.click('#select'); assert.equal(await page.locator('#rows input:checked').count(), 30); assert.equal(await page.locator('#verify').isDisabled(), false);
      await page.locator('#rows input').last().check(); assert.equal(await page.locator('#verify').isDisabled(), true); assert.equal(await page.locator('iframe').count(), 0); await page.click('#clear'); assert.equal(await page.locator('#rows input:checked').count(), 0); return {records: 31, batchLimit: 30, oversizedSelectionRefused: true};
    } finally { await context.close(); }
  });
  await test('Large archives keep at most 100 rendered records and retain bounded selections across pages', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await open(page); await upload(page, Array.from({length: 205}, (_, n) => ({...main, id: 'paged-' + n}))); await inspected(page);
      assert.equal(await page.locator('#rows .record').count(), 100); await page.click('#select'); assert.equal(await page.locator('#rows input:checked').count(), 30);
      await page.click('#next'); assert.equal(await page.locator('#rows .record').count(), 100); assert.equal(await page.locator('#rows input:checked').count(), 0); assert.match(await page.locator('#verify').textContent(), /\(30\)/); assert.equal(await page.locator('#verify').isDisabled(), false);
      await page.locator('#rows input').first().check(); assert.match(await page.locator('#verify').textContent(), /\(31\)/); assert.equal(await page.locator('#verify').isDisabled(), true);
      await page.click('#next'); assert.equal(await page.locator('#rows .record').count(), 5); assert.equal(await page.locator('#next').isDisabled(), true); await page.click('#clear'); assert.match(await page.locator('#verify').textContent(), /\(0\)/);
      await page.click('#previous'); await page.click('#previous'); assert.equal(await page.locator('#rows input:checked').count(), 0); assert.equal(await page.locator('iframe').count(), 0); return {inventory: 205, maxRenderedRows: 100, selectionAcrossPages: true, batchLimit: 30};
    } finally { await context.close(); }
  });
  await test('Cancelling before the engine factory responds settles immediately and late work cannot replace another file', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let release, reached;
    const gate = new Promise(resolve => { release = resolve; }), seen = new Promise(resolve => { reached = resolve; });
    try {
      await open(page); await page.route('**/fidelity-r24/persistence/engines.json', async route => { reached(); await gate; try { await route.continue(); } catch {} });
      await upload(page, main); await inspected(page); await page.click('#verify'); await seen; await page.click('#cancel'); await finished(page);
      assert.equal((await page.evaluate(() => window.BOW_REPLAY_PAGE_R25.state())).report.cancelled, true); assert.equal(await page.locator('iframe').count(), 0);
      await upload(page, catalog, 'new-catalog.json'); await inspected(page); await page.click('#verify'); await finished(page); release(); await page.waitForTimeout(350);
      const state = await page.evaluate(() => window.BOW_REPLAY_PAGE_R25.state()); assert.equal(state.report.records[0].verification.kind, 'catalog-r7'); assert.equal(state.report.cancelled, false); assert.equal(await page.locator('iframe').count(), 0); return {factoryCancellationImmediate: true, eventualFactoryCancelled: true, stalePublication: false};
    } finally { release(); await context.close(); }
  });
  await test('Cancellation tears down an active sandbox and leaves completed records separate', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let release, reached;
    const gate = new Promise(resolve => { release = resolve; }), seen = new Promise(resolve => { reached = resolve; });
    try {
      await open(page); await page.route('**/unified-engine-v060.js', async route => { reached(); await gate; try { await route.continue(); } catch {} });
      await upload(page, [main, historical]); await inspected(page); await page.click('#verify'); await seen; assert.equal(await page.locator('iframe').count(), 1); await page.click('#cancel'); await finished(page);
      const value = JSON.parse(await page.locator('#report').textContent()); assert.equal(value.cancelled, true); assert.equal(value.completed, 0); assert.equal(value.verified, false); assert.equal(await page.locator('iframe').count(), 0); release(); return {activeFrameRemoved: true, unstartedRecordsNotCertified: true};
    } finally { release(); await context.close(); }
  });
  await test('Keyboard skip link, named controls and 200 percent text at 320 CSS pixels remain usable', async () => {
    const context = await browser.newContext({viewport: {width: 320, height: 1000}}), page = await context.newPage();
    try {
      await open(page); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'skip'); assert((await page.locator('.skip').boundingBox()).y >= 0); await page.keyboard.press('Enter');
      assert.equal(await page.getByLabel('Replay, archive principale ou sauvegarde R19 (JSON, 32 Mio maximum)').count(), 1);
      await upload(page, backupText); await inspected(page); await page.evaluate(() => document.documentElement.style.fontSize = '200%'); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const checkbox = page.locator('#rows input').first(); await checkbox.focus(); const before = await checkbox.isChecked(); await page.keyboard.press('Space'); assert.equal(await checkbox.isChecked(), !before); await page.screenshot({path: path.join(output, 'keyboard-text-200-320.png'), fullPage: true}); return {width: 320, fontPercent: 200, skipLink: true, keyboardSelection: true, physicalScreenReader: false};
    } finally { await context.close(); }
  });
} finally {
  if (browser) await browser.close(); server.kill('SIGTERM');
  const result = {schema: 're.bow.persistence-r25-browser-tests/1', passed: checks.filter(r => r.pass).length, failed: checks.filter(r => !r.pass).length, checks, scope: 'Local virtualized Chromium and original three B.O.W. engines. Physical crashes, hardware, cloud restoration and unknown historical contracts remain unverified.'};
  fs.writeFileSync(path.join(output, 'R25_PERSISTENCE_BROWSER_RESULTS.json'), JSON.stringify(result, null, 2) + '\n'); fs.writeFileSync(path.join(root, 'docs/R25_PERSISTENCE_BROWSER_TESTS.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
}
