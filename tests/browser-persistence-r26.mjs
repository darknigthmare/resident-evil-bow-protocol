import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-persistence-r26-browser'); fs.mkdirSync(output, {recursive: true});
const box = {}; vm.createContext(box); vm.runInContext(fs.readFileSync(path.join(root, 'src/save-center-r19.js'), 'utf8'), box); const S = box.RE_SAVE_CENTER;
const encode = values => S.encode(S.KEYS.map(key => ({key, value: values[key] ?? null})), 'R26 fixture <script> inert é 🧟', '2026-10-25T00:00:00.000Z');
const baseline = encode({'re.bow.audio058': ' {"volume":0.2,"note":"garder é 🧟"}\n', 're-bow-v048-bindings': '{"left":"KeyA"}', 're-bow-v046-dojo': '{"old":true}'});
const incoming = encode({'re.bow.audio058': '\n{"volume":0.8,"note":"nouveau é 🧟"}  ', 're-bow-v048-bindings': '{"left":"KeyQ"}', 're-bow-v045-dojo': ' {"new":true}\n'});
const checks = [], port = Number(process.env.BOW_PERSISTENCE_R26_PORT || 5496), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'}); let browser;
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
async function open(page) { await page.goto(base + '/modules/fidelity-r26/persistence/index.html'); await page.waitForFunction(() => !!window.BOW_RESTORE_R26); }
async function upload(page, id, text) { await page.locator('#' + id).setInputFiles({name: id + '.json', mimeType: 'application/json', buffer: Buffer.from(text)}); }
async function idle(page) { await page.waitForFunction(() => !BOW_RESTORE_R26.state().busy); }
async function download(page, selector) { const event = page.waitForEvent('download'); await page.click(selector); return fs.readFileSync(await (await event).path(), 'utf8'); }
async function contextPage(options = {}) { const context = await browser.newContext(options), page = await context.newPage(); await open(page); return {context, page}; }
try {
  for (let n = 0; n < 100; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test('Selective atomic restore, exact raw values and explicit rollback at ' + width + 'px', async () => {
    const {context, page} = await contextPage({viewport: {width, height: 1000}, acceptDownloads: true}), errors = [], remote = [];
    try {
      page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('blob:')) remote.push(request.url()); });
      await page.evaluate(() => { localStorage.setItem('re.bow.audio058', 'GAME STAYS EXACT'); localStorage.setItem('other', 'KEEP'); });
      await upload(page, 'baseline', baseline); await page.waitForFunction(() => !document.getElementById('initialize').disabled); assert.equal((await page.evaluate(() => BOW_RESTORE_R26.state())).initialized, false);
      await page.click('#initialize'); await idle(page); await upload(page, 'incoming', incoming); await page.waitForFunction(() => document.querySelectorAll('#group-list input').length === 8);
      await page.locator('#group-list input[value="audio"]').check(); await page.locator('#group-list input[value="dojo"]').check(); await page.click('#prepare'); await idle(page);
      assert.equal(await page.locator('#changes li').count(), 3); assert.equal(await page.locator('#apply').isDisabled(), true);
      const beforeText = await download(page, '#backup'); assert.deepEqual(S.decode(beforeText).entries, S.decode(baseline).entries);
      await page.locator('#confirm').check(); await page.click('#apply'); await idle(page);
      const current = S.decode(await download(page, '#export-current')), map = new Map(current.entries.map(r => [r.key, r.value]));
      assert.equal(map.get('re.bow.audio058'), S.decode(incoming).entries.find(r => r.key === 're.bow.audio058').value); assert.equal(map.get('re-bow-v048-bindings'), '{"left":"KeyA"}'); assert.equal(map.get('re-bow-v046-dojo'), null); assert.equal(map.get('re-bow-v045-dojo'), ' {"new":true}\n');
      await page.reload(); await page.waitForFunction(() => !!window.BOW_RESTORE_R26); assert.match(await page.locator('#status').textContent(), /retrouvé/); assert.match(await page.locator('#journal-status').textContent(), /validée/);
      const receipt = JSON.parse(await download(page, '#receipt')); assert.equal(receipt.isolated, true); assert.equal(receipt.gameStorageChanged, false); assert.equal(receipt.journal.state, 'committed');
      await page.locator('#confirm-rollback').check(); await page.click('#rollback'); await idle(page); assert.deepEqual(S.decode(await download(page, '#export-current')).entries, S.decode(baseline).entries); assert.equal(await page.locator('#rollback').isDisabled(), true);
      assert.deepEqual(await page.evaluate(() => ({...localStorage})), {'re.bow.audio058': 'GAME STAYS EXACT', other: 'KEEP'}); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); assert.deepEqual(errors, []); assert.deepEqual(remote, []);
      await page.screenshot({path: path.join(output, 'restore-' + width + '.png'), fullPage: true}); return {width, changedKeys: 3, valuesExact: true, durableJournalAfterReload: true, selectiveGroups: ['audio', 'dojo'], gameStorageUnchanged: true};
    } finally { await context.close(); }
  });
  await test('Original R19 validation rejects damaged transport, unknown keys and un-restorable selected groups', async () => {
    const {context, page} = await contextPage();
    try {
      const result = await page.evaluate(async ({baseline, incoming}) => {
        const e = BOW_RESTORE_R26.engine, S = RE_SAVE_CENTER, failures = [];
        await e.initialize(baseline); const previous = await e.snapshot();
        const invalid = [incoming.replace('R26 fixture', 'tampered'), '{"format":"re.bow.backup/2"}', '{broken', incoming.replace('\"format\":', '\"format\":\"ignored\",\"format\":')];
        for (const text of invalid) try { await e.prepare(text, ['audio']); failures.push(false); } catch { failures.push(true); }
        const rows = S.decode(incoming).entries; rows.find(r => r.key === 're.bow.audio058').value = '{broken';
        try { await e.prepare(S.encode(rows), ['audio']); failures.push(false); } catch { failures.push(true); }
        rows.find(r => r.key === 're.bow.audio058').value = '{"volume":0.2,"volume":0.8}';
        try { await e.prepare(S.encode(rows), ['audio']); failures.push(false); } catch { failures.push(true); }
        for (const ids of [[], ['unknown'], ['audio', 'audio'], ['replays']]) try { await e.prepare(incoming, ids); failures.push(false); } catch { failures.push(true); }
        return {failures, unchanged: JSON.stringify(previous) === JSON.stringify(await e.snapshot())};
      }, {baseline, incoming}); assert(result.failures.every(Boolean)); assert.equal(result.unchanged, true); return {refusedInputs: result.failures.length, stateUnchanged: true};
    } finally { await context.close(); }
  });
  await test('Foreign, cancelled, used and unacknowledged plans cannot write; stale second tabs refuse before replacing', async () => {
    const {context, page} = await contextPage();
    try {
      const result = await page.evaluate(async ({baseline, incoming}) => {
        const {createRehearsal} = await import('./restore.js'), e = BOW_RESTORE_R26.engine, other = createRehearsal({saveCenter: RE_SAVE_CENTER});
        await e.initialize(baseline); const plan = await e.prepare(incoming, ['audio']); let refused = 0;
        for (const candidate of [{...plan}, plan]) try { await e.apply(candidate, {confirmed: true}); } catch { refused++; }
        const cancelled = await e.prepare(incoming, ['audio']); e.cancel(cancelled); try { await e.apply(cancelled, {confirmed: true}); } catch { refused++; }
        const stale = await e.prepare(incoming, ['audio']); e.acknowledge(stale, e.backup(stale));
        await other.initialize(incoming, {expectedRevision: 1}); try { await e.apply(stale, {confirmed: true}); } catch { refused++; }
        const after = await e.snapshot(); try { await e.apply(stale, {confirmed: true}); } catch { refused++; } await other.close();
        return {refused, revision: after.revision, after: after.entries};
      }, {baseline, incoming}); assert.equal(result.refused, 5); assert.equal(result.revision, 2); assert.deepEqual(result.after, JSON.parse(JSON.stringify(S.decode(incoming).entries))); return {refusedPlans: 5, staleSnapshotPreserved: true};
    } finally { await context.close(); }
  });
  await test('Real IndexedDB abort after three queued writes rolls back values and journal together', async () => {
    const {context, page} = await contextPage();
    try {
      const result = await page.evaluate(async ({baseline, incoming}) => {
        const {createRehearsal} = await import('./restore.js'); const name = 're.bow.restore-rehearsal.r26.abort'; let armed = false, writes = 0;
        function wrapDb(db) { return new Proxy(db, {get(target, prop) { if (prop === 'transaction') return (...args) => { const tx = target.transaction(...args); if (!armed || args[1] !== 'readwrite') return tx; return new Proxy(tx, {get(t, p) { if (p === 'objectStore') return key => { const store = t.objectStore(key); return new Proxy(store, {get(s, method) { if (method === 'put') return (...params) => { const request = s.put(...params); if (++writes === 3) t.abort(); return request; }; const value = Reflect.get(s, method, s); return typeof value === 'function' ? value.bind(s) : value; }}); }; const value = Reflect.get(t, p, t); return typeof value === 'function' ? value.bind(t) : value; }, set(t, p, value) { t[p] = value; return true; }}); }; const value = Reflect.get(target, prop, target); return typeof value === 'function' ? value.bind(target) : value; }, set(target, prop, value) { target[prop] = value; return true; }}); }
        const factory = {open(...args) { const request = indexedDB.open(...args); return new Proxy(request, {get(target, prop) { if (prop === 'result') return wrapDb(target.result); const value = Reflect.get(target, prop, target); return typeof value === 'function' ? value.bind(target) : value; }, set(target, prop, value) { target[prop] = value; return true; }}); }};
        const e = createRehearsal({saveCenter: RE_SAVE_CENTER, indexedDB: factory, name}); await e.initialize(baseline); const before = await e.snapshot(), plan = await e.prepare(incoming, ['audio', 'dojo']); e.acknowledge(plan, e.backup(plan)); armed = true; let rejected = false;
        try { await e.apply(plan, {confirmed: true}); } catch { rejected = true; } armed = false; const after = await e.snapshot(); await e.close();
        const restarted = createRehearsal({saveCenter: RE_SAVE_CENTER, name}), restartState = await restarted.snapshot(); await restarted.close(); return {rejected, writes, sameBeforeAfter: JSON.stringify(before) === JSON.stringify(after), sameAfterRestart: JSON.stringify(before) === JSON.stringify(restartState)};
      }, {baseline, incoming}); assert.equal(result.rejected, true); assert.equal(result.writes, 3); assert.equal(result.sameBeforeAfter, true); assert.equal(result.sameAfterRestart, true);
      // Exercise the same partial-write interruption through the actual UI. A
      // consumed preview must disappear even when apply rejects, so retrying
      // requires a new explicit preview, backup request and confirmation.
      await upload(page, 'baseline', baseline); await page.waitForFunction(() => !document.getElementById('initialize').disabled); await page.click('#initialize'); await idle(page);
      await upload(page, 'incoming', incoming); await page.waitForFunction(() => document.querySelectorAll('#group-list input').length === 8); await page.locator('#group-list input[value="audio"]').check(); await page.click('#prepare'); await idle(page);
      await download(page, '#backup'); await page.locator('#confirm').check();
      await page.evaluate(() => {
        const original = IDBObjectStore.prototype.put; let queued = 0;
        IDBObjectStore.prototype.put = function (...args) {
          const request = original.apply(this, args);
          if (this.name === 'values' && ++queued === 3) { IDBObjectStore.prototype.put = original; this.transaction.abort(); }
          return request;
        };
      });
      await page.click('#apply'); await idle(page);
      assert.equal((await page.evaluate(() => BOW_RESTORE_R26.state())).hasPlan, false);
      assert.equal(await page.locator('#preview').isHidden(), true); assert.equal(await page.locator('#apply').isDisabled(), true); assert.equal(await page.locator('#backup').isDisabled(), true); assert.equal(await page.locator('#confirm').isChecked(), false);
      assert.match(await page.locator('#status').textContent(), /REFUSÉ.*Prévisualisez à nouveau/);
      assert.deepEqual(S.decode(await download(page, '#export-current')).entries, S.decode(baseline).entries);
      await page.click('#prepare'); await idle(page); assert.equal(await page.locator('#apply').isDisabled(), true); assert.equal(await page.locator('#confirm').isChecked(), false);
      await download(page, '#backup'); await page.locator('#confirm').check(); await page.click('#apply'); await idle(page);
      assert.match(await page.locator('#status').textContent(), /Transaction isolée validée/);
      const retried = S.decode(await download(page, '#export-current')); assert.equal(retried.entries.find(row => row.key === 're.bow.audio058').value, S.decode(incoming).entries.find(row => row.key === 're.bow.audio058').value);
      return {...result, failedUiPlanInvalidated: true, retryRequiredNewPreviewBackupAndConfirmation: true, explicitRetryCommitted: true};
    } finally { await context.close(); }
  });
  await test('Pre-aborted operation and refused storage policy never publish a commit', async () => {
    const {context, page} = await contextPage();
    try {
      const result = await page.evaluate(async ({baseline, incoming}) => {
        const {createRehearsal} = await import('./restore.js'), e = BOW_RESTORE_R26.engine; await e.initialize(baseline); const before = await e.snapshot(), plan = await e.prepare(incoming, ['audio']); e.acknowledge(plan, e.backup(plan)); const controller = new AbortController(); controller.abort(); let refused = false;
        try { await e.apply(plan, {confirmed: true, signal: controller.signal}); } catch (error) { refused = error.name === 'AbortError'; }
        let blocked = false; const fake = createRehearsal({saveCenter: RE_SAVE_CENTER, indexedDB: {open() { throw new DOMException('policy denied', 'SecurityError'); }}, name: 're.bow.restore-rehearsal.r26.denied'});
        try { await fake.initialize(incoming); } catch { blocked = true; } return {refused, blocked, unchanged: JSON.stringify(before) === JSON.stringify(await e.snapshot())};
      }, {baseline, incoming}); assert.equal(result.refused, true); assert.equal(result.blocked, true); assert.equal(result.unchanged, true); return {preAbortRefused: true, storagePolicyRefused: true, stateUnchanged: true};
    } finally { await context.close(); }
  });
  await test('Rollback refuses concurrent raw value changes without overwriting another writer', async () => {
    const {context, page} = await contextPage();
    try {
      const result = await page.evaluate(async ({baseline, incoming}) => {
        const e = BOW_RESTORE_R26.engine; await e.initialize(baseline); const plan = await e.prepare(incoming, ['audio']); e.acknowledge(plan, e.backup(plan)); await e.apply(plan, {confirmed: true});
        const db = await new Promise((resolve, reject) => { const r = indexedDB.open('re.bow.restore-rehearsal.r26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
        await new Promise((resolve, reject) => { const tx = db.transaction('values', 'readwrite'); tx.objectStore('values').put({key: 're.bow.audio058', value: '{"external":true}'}); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); });
        let refused = false; try { await e.rollback({expectedRevision: 2, confirmed: true}); } catch { refused = true; } const current = await e.snapshot(); db.close(); return {refused, raw: current.entries.find(r => r.key === 're.bow.audio058').value, journalState: current.journal.state};
      }, {baseline, incoming}); assert.equal(result.refused, true); assert.equal(result.raw, '{"external":true}'); assert.equal(result.journalState, 'committed'); return {externalWriterValuePreserved: true, falseRollbackNotRecorded: true};
    } finally { await context.close(); }
  });
  await test('Abandoning preview, explicit clear and stale clear preserve isolation boundaries', async () => {
    const {context, page} = await contextPage();
    try {
      const result = await page.evaluate(async ({baseline, incoming}) => {
        const e = BOW_RESTORE_R26.engine; await e.initialize(baseline); const p = await e.prepare(incoming, ['audio']); e.cancel(p); let unconfirmed = false, stale = false;
        try { await e.clear({expectedRevision: 1}); } catch { unconfirmed = true; }
        await e.clear({expectedRevision: 1, confirmed: true}); try { await e.clear({expectedRevision: 1, confirmed: true}); } catch { stale = true; } const current = await e.snapshot(); return {unconfirmed, stale, initialized: current.initialized, entries: current.entries, revision: current.revision};
      }, {baseline, incoming}); assert.equal(result.unconfirmed, true); assert.equal(result.stale, true); assert.equal(result.initialized, false); assert.equal(result.entries.length, 0); assert.equal(result.revision, 2); return {clearExplicit: true, staleClearRefused: true, cancelledPreviewWrites: 0};
    } finally { await context.close(); }
  });
  await test('Keyboard and 200 percent text at 320 CSS pixels; hostile metadata stays inert', async () => {
    const {context, page} = await contextPage({viewport: {width: 320, height: 1100}});
    try {
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'skip'); await page.keyboard.press('Enter'); await page.waitForURL('**#main');
      await upload(page, 'baseline', baseline); await page.waitForFunction(() => !document.getElementById('initialize').disabled); await page.click('#initialize'); await idle(page); await upload(page, 'incoming', incoming); await page.waitForFunction(() => document.querySelectorAll('#group-list input').length === 8);
      assert.match(await page.locator('#incoming-name').textContent(), /<script>/); assert.equal(await page.locator('#incoming-name script').count(), 0); await page.evaluate(() => document.documentElement.style.fontSize = '200%');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); await page.locator('#group-list input[value="audio"]').focus(); await page.keyboard.press('Space'); assert.equal(await page.locator('#group-list input[value="audio"]').isChecked(), true);
      await page.screenshot({path: path.join(output, 'keyboard-320-text-200.png'), fullPage: true}); return {width: 320, textPercent: 200, keyboardSelection: true, hostileMetadataInert: true, realScreenReader: false};
    } finally { await context.close(); }
  });
  await test('Missing IndexedDB provides a readable refusal with no fallback to game storage', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try { await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', {value: undefined})); await open(page); assert.match(await page.locator('#status').textContent(), /IndexedDB indisponible/); assert.equal(await page.locator('#initialize').isDisabled(), true); assert.equal(await page.locator('#apply').isDisabled(), true); return {unavailableRefused: true, fallbackGameStorageWrites: 0}; } finally { await context.close(); }
  });
} finally {
  if (browser) await browser.close(); server.kill('SIGTERM'); const result = {schema: 're.bow.persistence-r26-browser-tests/1', passed: checks.filter(r => r.pass).length, failed: checks.filter(r => !r.pass).length, checks, scope: 'Real Chromium IndexedDB atomic transactions, partial-write abort and durable reload; original R19 validation. Isolated rehearsal only; no game storage, cloud or physical crash certification.'};
  fs.writeFileSync(path.join(output, 'R26_PERSISTENCE_BROWSER_RESULTS.json'), JSON.stringify(result, null, 2) + '\n'); fs.writeFileSync(path.join(root, 'docs/R26_PERSISTENCE_BROWSER_TESTS.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
}
