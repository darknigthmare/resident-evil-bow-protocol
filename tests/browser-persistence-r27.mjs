import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {mainFixture} from './persistence-fixtures-r24.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'qa-persistence-r27-browser'); fs.mkdirSync(output, {recursive: true});
const box = {}; vm.createContext(box); vm.runInContext(fs.readFileSync(path.join(root, 'src/save-center-r19.js'), 'utf8'), box); const S = box.RE_SAVE_CENTER;
const current = await mainFixture(), historical = await mainFixture({historical: true}); historical.id += '-old';
const rawCurrent = '\n  ' + JSON.stringify({...current, note: 'garder é 🧟, [ ]'}, null, 2) + '  ', rawHistorical = '\t' + JSON.stringify(historical) + '\n';
const archive = '[' + rawCurrent + ',' + rawHistorical + ']';
const backup = value => S.encode(S.KEYS.map(key => ({key, value: key === 're-bow-v048-replays' ? value : key === 're.bow.audio058' ? ' {"volume":0.2}\n' : null})), 'R27 browser fixture', '2026-10-25T00:00:00.000Z');
const original = backup(null), incoming = backup(archive), checks = [];
const port = Number(process.env.BOW_PERSISTENCE_R27_PORT || 5597), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'}); let browser;
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
async function open(page) { await page.goto(base + '/modules/fidelity-r27/persistence/index.html'); await page.waitForFunction(() => !!window.BOW_RESTORED_REPLAYS_R27); await page.waitForFunction(() => !document.querySelector('#load').disabled || document.querySelector('#status').textContent.startsWith('Lecteur indisponible')); }
async function seed(page, text, revision = 0) {
  return page.evaluate(async ({text, revision}) => { const {createRehearsal} = await import('../../fidelity-r26/persistence/restore.js'); const e = createRehearsal({saveCenter: RE_SAVE_CENTER}); try { return await e.initialize(text, {expectedRevision: revision}); } finally { await e.close(); } }, {text, revision});
}
async function load(page) { await page.click('#load'); await page.waitForFunction(() => BOW_RESTORED_REPLAYS_R27.state().ready && !BOW_RESTORED_REPLAYS_R27.state().busy); }
async function finish(page) { await page.waitForFunction(() => !BOW_RESTORED_REPLAYS_R27.state().busy && !document.querySelector('#results').hidden, null, {timeout: 60000}); }
async function download(page, selector) { const event = page.waitForEvent('download'); await page.click(selector); return fs.readFileSync(await (await event).path()); }
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test('Restored archive directly reaches both exact main engines without a save round trip at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1100}, acceptDownloads: true}), page = await context.newPage(), errors = [], remote = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('blob:')) remote.push(request.url()); });
    try {
      await page.goto(base + '/modules/fidelity-r26/persistence/index.html'); await page.waitForFunction(() => !!window.BOW_RESTORE_R26);
      await page.evaluate(() => { localStorage.setItem('re.bow.audio058', 'GAME STAYS EXACT'); localStorage.setItem('unrelated', 'KEEP'); });
      await page.locator('#baseline').setInputFiles({name: 'before.json', mimeType: 'application/json', buffer: Buffer.from(original)}); await page.waitForFunction(() => !document.querySelector('#initialize').disabled); await page.click('#initialize'); await page.waitForFunction(() => !BOW_RESTORE_R26.state().busy);
      await page.locator('#incoming').setInputFiles({name: 'after.json', mimeType: 'application/json', buffer: Buffer.from(incoming)}); await page.waitForFunction(() => document.querySelectorAll('#group-list input').length === 8);
      await page.locator('#group-list input[value="replays"]').check(); await page.click('#prepare'); await page.waitForFunction(() => !BOW_RESTORE_R26.state().busy); await download(page, '#backup'); await page.locator('#confirm').check(); await page.click('#apply'); await page.waitForFunction(() => !BOW_RESTORE_R26.state().busy); assert.match(await page.locator('#status').textContent(), /validée/);
      await open(page); assert.equal(await page.locator('iframe').count(), 0); assert.equal(await page.locator('#selection').isHidden(), true); await load(page);
      assert.equal(await page.locator('#rows input:checked').count(), 0); assert.equal(await page.locator('#rows .record').count(), 2); assert.match(await page.locator('#source-description').textContent(), /révision 2.*committed/);
      await page.evaluate(() => { const create = URL.createObjectURL, revoke = URL.revokeObjectURL, values = new Set(); window.r27DownloadProbe = {maximum: 0, values}; URL.createObjectURL = function(...args) { const result = create.apply(this,args); values.add(result); r27DownloadProbe.maximum = Math.max(r27DownloadProbe.maximum, values.size); return result; }; URL.revokeObjectURL = function(value) { values.delete(value); return revoke.call(this,value); }; });
      assert.deepEqual(await download(page, '#archive'), Buffer.from(archive)); assert.deepEqual(await download(page, '#rows button >> nth=0'), Buffer.from(rawCurrent)); assert.deepEqual(await download(page, '#archive'), Buffer.from(archive)); assert.equal(await page.evaluate(() => r27DownloadProbe.maximum), 1);
      await page.click('#select'); await page.click('#verify'); await finish(page); const result = JSON.parse(await page.locator('#report').textContent());
      assert.equal(result.verified, true); assert.equal(result.sourceValidatedAfter, true); assert.equal(result.source.revision, 2); assert.equal(result.source.archiveSha256, createHash('sha256').update(archive).digest('hex'));
      assert.deepEqual(result.records.map(r => r.verification.engineSource.id), ['main-current', 'main-pre-r13']); assert(result.records.every(r => r.verification.passes === 2 && r.verification.exactFinalStatesEqual && r.verification.sandbox.isolatedStorage));
      assert.equal(await page.locator('iframe').count(), 0); assert.deepEqual(await page.evaluate(() => ({...localStorage})), {'re.bow.audio058': 'GAME STAYS EXACT', unrelated: 'KEEP'}); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); assert.deepEqual(errors, []); assert.deepEqual(remote, []);
      await page.screenshot({path: path.join(output, 'restored-replays-' + width + '.png'), fullPage: true}); return {width, sourceRevision: 2, exactNestedArchive: true, exactRecordSlice: true, engines: ['main-current', 'main-pre-r13'], independentReconstructions: 4, gameStorageUnchanged: true, maximumSimultaneousDownloadBlobs: 1};
    } finally { await context.close(); }
  });
  await test('A second tab changing the isolated revision refuses launch and requires an explicit reload', async () => {
    const context = await browser.newContext(), page = await context.newPage(), other = await context.newPage();
    try {
      await open(page); await seed(page, incoming); await load(page); await page.click('#select'); await open(other); await seed(other, backup('[]'), 1);
      await page.click('#verify'); await page.waitForFunction(() => BOW_RESTORED_REPLAYS_R27.state().stale); assert.match(await page.locator('#status').textContent(), /changé/); assert.equal(await page.locator('iframe').count(), 0); assert.equal(await page.locator('#verify').isDisabled(), true); assert.equal(await page.locator('#archive').isDisabled(), true);
      await load(page); assert.equal(await page.locator('#rows .record').count(), 0); assert.equal(Bool(await page.locator('#verify').isDisabled()), true); return {staleLaunchRefused: true, sourceRevisionAfterReload: 2, automaticReplayLaunches: 0};
    } finally { await context.close(); }
  });
  await test('A restore while the actual engine loads invalidates the current-source verdict while preserving captured reconstruction details', async () => {
    const context = await browser.newContext(), page = await context.newPage(), other = await context.newPage(); let release, requested;
    const gate = new Promise(resolve => { release = resolve; }), seen = new Promise(resolve => { requested = resolve; });
    try {
      await open(page); await seed(page, incoming); await load(page); await open(other);
      let held = false; await page.route('**/fidelity-r24/persistence/verifier.js', async route => { if (!held) { held = true; requested(); await gate; } await route.continue(); });
      await page.locator('#record-0').check(); await page.click('#verify'); await seen; await seed(other, backup('[]'), 1); release(); await finish(page);
      const result = JSON.parse(await page.locator('#report').textContent()); assert.equal(result.records[0].status, 'verified'); assert.equal(result.records[0].verification.passes, 2); assert.equal(result.verified, false); assert.equal(result.sourceStale, true); assert.equal(result.sourceValidatedAfter, false); assert.equal(result.source.revision, 1); assert.match(await page.locator('#verdict').textContent(), /changé pendant/); assert.equal(await page.locator('iframe').count(), 0);
      return {actualEnginePasses: 2, capturedResultRetained: true, currentSourceVerdictRefused: true};
    } finally { release(); await context.close(); }
  });
  await test('Invalid records stay visible and an outcome falsification cannot pass beside a valid restored replay', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await open(page); const unknown = structuredClone(current); unknown.id = 'unknown'; unknown.meta.runtimeContract = 'unsupported'; const duplicate = {...current, id: 'duplicate'}; const bad = structuredClone(current); bad.id = 'wrong-result'; bad.result.life--;
      await seed(page, backup(JSON.stringify([unknown, false, duplicate, duplicate, bad, current]))); await load(page);
      assert.equal(await page.locator('#rows .record').count(), 6); assert.equal(await page.locator('#rows input:disabled').count(), 4); await page.click('#select'); assert.equal(await page.locator('#rows input:checked').count(), 2); await page.click('#verify'); await finish(page);
      const result = JSON.parse(await page.locator('#report').textContent()); assert.equal(result.verified, false); assert.equal(result.sourceValidatedAfter, true); assert.deepEqual(result.records.map(r => r.status), ['refused', 'verified']); assert.match(result.records[0].reason, /Résultat différent/); return {visibleRecords: 6, refusedBeforeLaunch: 4, falsifiedOutcomeRefused: true, independentValidReplayRetained: true};
    } finally { await context.close(); }
  });
  await test('Pagination keeps at most100 rows and selections remain bounded across pages', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await open(page); await seed(page, backup(JSON.stringify(Array.from({length: 205}, (_, n) => ({...current, id: 'batch-' + n}))))); await load(page);
      assert.equal(await page.locator('#rows .record').count(), 100); await page.click('#select'); assert.equal(await page.locator('#rows input:checked').count(), 30); await page.click('#next'); assert.equal(await page.locator('#rows .record').count(), 100); await page.locator('#rows input').first().check(); assert.equal(await page.locator('#verify').isDisabled(), true); await page.click('#previous'); assert.equal(await page.locator('#rows input:checked').count(), 30); await page.click('#clear'); await page.click('#next'); await page.click('#next'); assert.equal(await page.locator('#rows .record').count(), 5); assert.equal(await page.locator('iframe').count(), 0);
      return {records: 205, renderedPageLimit: 100, maximumSelectedToRun: 30, staleSelectionsNotLost: true};
    } finally { await context.close(); }
  });
  await test('Keyboard, hostile labels and200percent text at320pixels remain usable without markup injection', async () => {
    const context = await browser.newContext({viewport: {width: 320, height: 1100}}), page = await context.newPage();
    try {
      await open(page); const hostile = {...current, id: '<img src=x onerror="window.r27Injected=true">'}; await seed(page, backup(JSON.stringify([hostile])));
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'skip'); await page.keyboard.press('Enter'); await page.waitForURL('**#main'); await load(page);
      await page.evaluate(() => document.documentElement.style.fontSize = '200%'); assert.equal(await page.evaluate(() => getComputedStyle(document.body).fontSize), '32px'); assert.match(await page.locator('#rows').textContent(), /<img src=x/); assert.equal(await page.locator('#rows img').count(), 0); assert.equal(await page.evaluate(() => !!window.r27Injected), false);
      await page.locator('#record-0').focus(); await page.keyboard.press('Space'); assert.equal(await page.locator('#record-0').isChecked(), true); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); await page.screenshot({path: path.join(output, 'keyboard-320-text-200.png'), fullPage: true}); return {width: 320, textPercent: 200, keyboardSelection: true, hostileLabelsInert: true, physicalDevices: false};
    } finally { await context.close(); }
  });
  await test('Missing or denied IndexedDB has a readable refusal and no fallback to game storage', async () => {
    const results = [];
    for (const denied of [false, true]) {
      const context = await browser.newContext(), page = await context.newPage();
      try {
        await page.addInitScript(denied => { Object.defineProperty(window, 'indexedDB', {value: denied ? {open() { throw new DOMException('policy denied', 'SecurityError'); }} : undefined}); }, denied); await open(page);
        if (denied) { await page.click('#load'); await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('REFUSÉ')); assert.match(await page.locator('#status').textContent(), /policy denied/); }
        else { assert.match(await page.locator('#status').textContent(), /IndexedDB indisponible/); assert.equal(await page.locator('#load').isDisabled(), true); }
        assert.equal(await page.locator('iframe').count(), 0); results.push({denied, fallbackWrites: 0});
      } finally { await context.close(); }
    }
    return results;
  });
  await test('Page departure cancels the pending engine and a persisted return requires another explicit source read', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let release, requested;
    const gate = new Promise(resolve => { release = resolve; }), seen = new Promise(resolve => { requested = resolve; });
    try {
      await open(page); await seed(page, incoming); await load(page);
      let held = false; await page.route('**/fidelity-r24/persistence/verifier.js', async route => { if (!held) { held = true; requested(); await gate; } await route.continue().catch(() => {}); });
      await page.locator('#record-0').check(); await page.click('#verify'); await seen;
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}))); release(); await page.waitForTimeout(100);
      assert.equal(await page.locator('iframe').count(), 0); assert.equal(await page.locator('#results').isHidden(), true); assert.equal((await page.evaluate(() => BOW_RESTORED_REPLAYS_R27.state())).ready, false);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}))); await page.waitForFunction(() => !document.querySelector('#load').disabled); assert.equal(await page.locator('#selection').isHidden(), true); await load(page); assert.equal(await page.locator('#rows input:checked').count(), 0); assert.equal(await page.locator('#results').isHidden(), true); assert.equal(await page.locator('iframe').count(), 0);
      return {departureCancelsSandbox: true, capturedBytesReleased: true, persistedReturnNeedsExplicitRead: true, physicalBfCacheCertified: false};
    } finally { release(); await context.close(); }
  });
} finally {
  await browser?.close(); server.kill('SIGTERM'); const report = {schema: 're.bow.persistence-r27-browser-tests/1', passed: checks.filter(x => x.pass).length, failed: checks.filter(x => !x.pass).length, checks,
    scope: 'Real Chromium IndexedDB restore→replay bridge with original current/pre-R13 engine sandboxes; revision and raw-value fences, exact extraction, cancellation and reflow. No game/cloud restoration, physical device or original-game art certification.'};
  fs.writeFileSync(path.join(output, 'R27_PERSISTENCE_BROWSER_RESULTS.json'), JSON.stringify(report, null, 2) + '\n'); fs.writeFileSync(path.join(root, 'docs/R27_PERSISTENCE_BROWSER_TESTS.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
}
function Bool(value) { return Boolean(value); }
