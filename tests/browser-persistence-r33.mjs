/** Native Chromium storage recovery and sequential mixed-contract replay files; no live user profile. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {mainFixture, catalogFixture} from './persistence-fixtures-r24.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'qa-persistence-r33'); fs.mkdirSync(output, {recursive: true});
const box = {TextEncoder, console}; box.window = box; box.globalThis = box; vm.createContext(box);
const evolutionSources = ['src/re-data.js','src/catalog-expansion-data.js','src/catalog-trial-adapter.js','src/spatial-weakpoints-v072.js','src/combat-foundation-v060.js','modules/fidelity-r28/evolutions/data.js','modules/fidelity-r28/evolutions/engine.js','modules/fidelity-r28/evolutions/contract.js','modules/fidelity-r28/evolutions/replay.js','src/save-center-r19.js'];
for (const name of evolutionSources) vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), box);
const S = box.RE_SAVE_CENTER, R = box.RE_EVOLUTION_REPLAY_R28, E = box.RE_EVOLUTIONS_R28, C = box.CQCCombat060;
const old = {'re.bow.audio058': ' {"volume":0.2,"note":"é 🧟"}\n', 're-bow-v048-bindings': '{"left":"KeyA"}', 're-bow-v046-dojo': '{"old":true}'};
const encode = values => S.encode(S.KEYS.map(key => ({key, value: values[key] ?? null})), 'R33 navigateur é 🧟', '2026-11-01T10:00:00.000Z');
const incoming = encode({'re.bow.audio058': '\n{"volume":0.8} ', 're-bow-v048-bindings': '{"left":"KeyQ"}', 're-bow-v045-dojo': ' {"new":true}\n'});
const live = R.create({uid:'re2r-tyrant',target:'re3r-nemesis',stage:box.RE_DATA.stages[0].id,mode:'human',seed:7070});
while (live.frames() < 6000 && !live.getState().finished) {if (E.reason(live.getState(),0,'re2r-super-tyrant') === null) {live.requestEvolution(0,'re2r-super-tyrant'); live.step(C.empty()); break;} live.step(C.empty());}
while (!live.getState().finished && live.frames() < 10000) live.step(C.empty());
const evolution = JSON.parse(JSON.stringify(live.exportValue())); assert(evolution.runs.some(row => row[3]));
const port = Number(process.env.BOW_PERSISTENCE_R33_PORT || 5941), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
const checks = []; let browser;
async function test(name, run) {try {const detail = await run(); checks.push({name,pass:true,detail}); console.log('PASS ' + name);} catch (error) {checks.push({name,pass:false,error:error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function open(page) {await page.goto(base + '/modules/fidelity-r33/persistence/index.html'); await page.waitForFunction(() => !!globalThis.BOW_RESTORE_R33?.engine);}
async function idle(page) {await page.waitForFunction(() => !BOW_RESTORE_R33.state().busy);}
async function fillStorage(page) {await page.evaluate(values => {for (const [key,value] of Object.entries(values)) localStorage.setItem(key,value);localStorage.setItem('foreign','KEEP');}, old); await page.reload(); await page.waitForFunction(() => !!globalThis.BOW_RESTORE_R33?.engine);}
async function newPage(options = {}) {const context = await browser.newContext({acceptDownloads:true,...options}), page = await context.newPage(); await open(page); return {context,page};}
async function download(page, selector, keyboard = false) {const event = page.waitForEvent('download'); if (keyboard) {await page.locator(selector).focus(); await page.keyboard.press('Enter');} else await page.click(selector); return fs.readFileSync(await (await event).path(), 'utf8');}
async function apply(page) {
  await page.locator('#incoming').setInputFiles({name:'copie-r33.json',mimeType:'application/json',buffer:Buffer.from(incoming)}); await page.waitForFunction(() => document.querySelectorAll('#group-list input').length === 8);
  await page.check('#group-list input[value="audio"]'); await page.check('#group-list input[value="dojo"]'); await page.click('#prepare'); await idle(page); assert.equal(await page.locator('#changes li').count(), 3);
  const backup = await download(page, '#backup', true); await page.check('#confirm'); await page.click('#apply'); await idle(page); assert.equal((await page.evaluate(() => BOW_RESTORE_R33.state())).journal.state, 'committed'); return backup;
}
async function replayFiles(page, files) {await page.locator('#replays').setInputFiles(files.map(([name,value]) => ({name,mimeType:'application/json',buffer:Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))}))); await page.waitForFunction(() => !!BOW_REPLAY_BATCH_R33.state().plan);}
async function verifyBatch(page) {await page.click('#verify'); await page.waitForFunction(() => !BOW_REPLAY_BATCH_R33.state().busy, null, {timeout:120000}); return page.evaluate(() => BOW_REPLAY_BATCH_R33.state().result);}
try {
  for (let n = 0; n < 100; n++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve,50));}
  browser = await chromium.launch({executablePath:process.env.CHROME_BIN || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  await test('R31 native journal reproduces the unrelated-group block and is recovered by the R33 page', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r31/persistence/index.html'); await page.waitForFunction(() => !!globalThis.BOW_RESTORE_R31?.engine);
      const baseline = await page.evaluate(async ({old,incoming}) => {
        for (const [key,value] of Object.entries(old)) localStorage.setItem(key,value);
        const e = BOW_RESTORE_R31.engine, p = await e.prepare(incoming,['audio','dojo']); e.acknowledge(p,e.backup(p)); await e.apply(p,{confirmed:true});
        localStorage.setItem('re-bow-v048-bindings',' {"later":33}\n'); const before = {...localStorage}, result = await e.recover({direction:'rollback',confirmed:true}); return {before,result,after:{...localStorage}};
      }, {old,incoming});
      assert.equal(baseline.result.ok,false); assert.match(baseline.result.message,/hors de cette restauration/); assert.deepEqual(baseline.after,baseline.before);
      await open(page); await page.waitForFunction(() => BOW_RESTORE_R33.state().journal?.unselectedChanges === 1); assert.match(await page.locator('#recovery-note').textContent(),/seront conservées/);
      await page.check('#confirm-recovery'); await page.click('#rollback'); await idle(page); assert.equal((await page.evaluate(() => BOW_RESTORE_R33.state())).journal.state,'rolled-back');
      const values = await page.evaluate(() => ({...localStorage})); assert.equal(values['re.bow.audio058'],old['re.bow.audio058']); assert.equal(values['re-bow-v048-bindings'],' {"later":33}\n'); assert.equal(values['re-bow-v046-dojo'],old['re-bow-v046-dojo']); assert.equal(values['re-bow-v045-dojo'],undefined);
      return {beforeR31RefusedWithoutWrites:true,publishedJournalReadWithoutMigration:true,selectedUndoSucceeded:true,unselectedRawProgressKept:true};
    } finally {await context.close();}
  });
  for (const width of [1280,320]) await test('Real selective restore, keyboard backup and unrelated-progress undo at ' + width + 'px', async () => {
    const {context,page} = await newPage({viewport:{width,height:1000}}), errors = []; page.on('pageerror',error => errors.push(error.message));
    try {
      await fillStorage(page); const backup = await apply(page); assert.deepEqual(S.decode(backup).entries,S.decode(encode(old)).entries);
      const other = await context.newPage(); await other.goto(base + '/saves.html'); await other.evaluate(() => localStorage.setItem('re-bow-v048-bindings',' {"later":true}\n'));
      await page.reload(); await page.waitForFunction(() => BOW_RESTORE_R33.state().journal?.unselectedChanges === 1); const before = await page.evaluate(() => ({...localStorage})); assert.equal(before['re.bow.audio058'],'\n{"volume":0.8} ');
      await page.check('#confirm-recovery'); await page.click('#rollback'); await idle(page); const values = await page.evaluate(() => ({...localStorage})); assert.deepEqual(values,{...old,'re-bow-v048-bindings':' {"later":true}\n',foreign:'KEEP'});
      await other.evaluate(() => localStorage.setItem('re-bow-v048-bindings',' {"later":2}\n')); await page.check('#confirm-forget'); await page.click('#forget'); await idle(page); assert.equal((await page.evaluate(() => BOW_RESTORE_R33.state())).journal,null); assert.equal(await page.evaluate(() => localStorage.getItem('re-bow-v048-bindings')),' {"later":2}\n');
      if (width === 320) await page.evaluate(() => document.documentElement.style.fontSize = '200%'); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false); assert.deepEqual(errors,[]); await page.screenshot({path:path.join(output,'selected-restore-' + width + '.png'),fullPage:true});
      return {width,nativeKeyboardBackup:true,exactSelectedUndoAfterReload:true,otherTabProgressKept:true,unselectedProgressDoesNotBlockJournalClose:true,textResize:width === 320 ? '200%' : null};
    } finally {await context.close();}
  });
  await test('The real save centre exposes both R33 routes while retaining every R19 control and the published R31 link', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + '/saves.html'); await page.waitForSelector('#restoreResumeR33');
      for (const id of ['exportSaves','importSaves','restoreResumeR31','restoreResumeR33','replayBatchR33']) assert.equal(await page.locator('#' + id).count(),1);
      assert.equal(await page.evaluate(() => RE_SAVE_CENTER.KEYS.length),18); const before = await page.evaluate(() => ({...localStorage}));
      await page.locator('#restoreResumeR33').click(); await page.waitForFunction(() => !!globalThis.BOW_RESTORE_R33?.engine); assert.equal(new URL(page.url()).pathname,'/modules/fidelity-r33/persistence/index.html');
      assert.equal((await page.evaluate(() => BOW_RESTORE_R33.state())).journal,null); await page.goto(base + '/saves.html'); await page.waitForSelector('#replayBatchR33'); await page.locator('#replayBatchR33').click();
      await page.waitForFunction(() => !!globalThis.BOW_REPLAY_BATCH_R33); assert.equal(new URL(page.url()).pathname,'/modules/fidelity-r33/replay/index.html'); assert.equal((await page.evaluate(() => BOW_REPLAY_BATCH_R33.state())).busy,false); assert.equal(await page.locator('iframe').count(),0); assert.deepEqual(await page.evaluate(() => ({...localStorage})),before);
      return {actualSaveCentreMount:true,originalR19ControlsAndR31RouteRetained:true,newRoutes:2,automaticRestoreOrReplayStarts:0};
    } finally {await context.close();}
  });
  await test('An interrupted native journal resumes selected groups after reload and preserves unrelated newer progress', async () => {
    const {context,page} = await newPage();
    try {
      await fillStorage(page); const before = await page.evaluate(async incoming => {
        const {createRestorer} = await import('./restore.js'); let interrupted = false; const e = createRestorer({saveCenter:RE_SAVE_CENTER,afterWrite() {if (!interrupted) {interrupted = true;throw Error('fault after game write before cursor');}}});
        const p = await e.prepare(incoming,['audio','dojo']); e.acknowledge(p,e.backup(p)); const result = await e.apply(p,{confirmed:true}); await e.close(); localStorage.setItem('re-bow-v048-bindings','{"later":33}'); return {result,values:{...localStorage}};
      }, incoming); assert.equal(before.result.ok,false); assert.equal(before.result.changed,1);
      await page.reload(); await page.waitForFunction(() => BOW_RESTORE_R33.state().journal?.state === 'interrupted'); assert.deepEqual(await page.evaluate(() => ({...localStorage})),before.values); assert.equal(await page.locator('#resume').isDisabled(),true);
      await page.check('#confirm-recovery'); await page.click('#resume'); await idle(page); const state = await page.evaluate(() => BOW_RESTORE_R33.state()); assert.equal(state.journal.state,'committed'); assert.equal(await page.evaluate(() => localStorage.getItem('re-bow-v048-bindings')),'{"later":33}'); assert.equal(await page.evaluate(() => localStorage.getItem('re.bow.audio058')),'\n{"volume":0.8} ');
      return {fault:'after-localStorage-before-cursor',reloadGameWrites:0,userInvokedResume:true,unselectedLaterValueKept:true};
    } finally {await context.close();}
  });
  await test('Selected-key conflicts and a real inter-tab Web Lock still prevent unsafe recovery or application', async () => {
    const {context,page} = await newPage(), other = await context.newPage();
    try {
      await fillStorage(page); await apply(page); await other.goto(base + '/saves.html'); await other.evaluate(() => localStorage.setItem('re.bow.audio058','{"outside":true}'));
      const conflict = await page.evaluate(async () => {const before = {...localStorage}, result = await BOW_RESTORE_R33.engine.recover({direction:'rollback',confirmed:true});return {before,result,after:{...localStorage}};}); assert.equal(conflict.result.ok,false); assert.match(conflict.result.message,/groupe choisi/); assert.deepEqual(conflict.after,conflict.before);
      const lockedContext = await browser.newContext(), first = await lockedContext.newPage(), second = await lockedContext.newPage();
      try {
        await open(first); await open(second); await first.evaluate(() => {window.__lock = navigator.locks.request('re.bow.real-restore.r31',() => new Promise(resolve => {window.__release = resolve;}));}); await first.waitForFunction(() => typeof __release === 'function');
        const refused = await second.evaluate(async incoming => {const e = BOW_RESTORE_R33.engine,p = await e.prepare(incoming,['audio']);e.acknowledge(p,e.backup(p));const before = {...localStorage};let error;try {await e.apply(p,{confirmed:true});} catch (caught) {error = caught.message;}return {before,after:{...localStorage},error,journal:(await e.snapshot()).journal};},incoming);
        assert.match(refused.error,/autre page/); assert.deepEqual(refused.after,refused.before); assert.equal(refused.journal,null); await first.evaluate(() => __release());
      } finally {await lockedContext.close();}
      return {chosenWriterValuePreserved:true,selectedConflictGameWrites:0,nativeWebLockDeniesSecondTab:true};
    } finally {await context.close();}
  });
  await test('Injected storage quota and a corrupt native IndexedDB payload retain or reject recovery without overwriting game data', async () => {
    const {context,page} = await newPage();
    try {
      await fillStorage(page); const quota = await page.evaluate(async incoming => {
        const native = Storage.prototype.setItem; Storage.prototype.setItem = function(key,value) {if (key === 're.bow.audio058') throw new DOMException('fixture full','QuotaExceededError');return native.call(this,key,value);};
        try {const e = BOW_RESTORE_R33.engine,p = await e.prepare(incoming,['audio']);e.acknowledge(p,e.backup(p));const result = await e.apply(p,{confirmed:true});return {result,journal:(await e.snapshot()).journal,values:{...localStorage}};} finally {Storage.prototype.setItem = native;}
      }, incoming); assert.equal(quota.result.ok,false); assert.equal(quota.journal.state,'interrupted'); assert.deepEqual(quota.values,{...old,foreign:'KEEP'});
      const undo = await page.evaluate(() => BOW_RESTORE_R33.engine.recover({direction:'rollback',confirmed:true})); assert.equal(undo.ok,true);
      await page.evaluate(async () => {const db = await new Promise((resolve,reject) => {const req = indexedDB.open('re.bow.real-restore.r31',1);req.onsuccess = () => resolve(req.result);req.onerror = () => reject(req.error);});try {await new Promise((resolve,reject) => {const tx = db.transaction('payload','readwrite'), store = tx.objectStore('payload'), req = store.openCursor();req.onsuccess = () => {const cursor = req.result;if (cursor) cursor.update({...cursor.value,beforeText:cursor.value.beforeText + ' '});};tx.oncomplete = resolve;tx.onerror = () => reject(tx.error);});} finally {db.close();}});
      const before = await page.evaluate(() => ({...localStorage})); await page.reload(); await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Empreinte')); assert.deepEqual(await page.evaluate(() => ({...localStorage})),before);
      return {quotaIsExplicitFaultFixture:true,durableJournalRetained:true,undoAfterQuota:true,corruptPayloadRefusedBeforeGameWrites:true};
    } finally {await context.close();}
  });
  await test('A mixed main, pre-R13, catalogue and evolution file batch uses four original routes sequentially without storage writes', async () => {
    const context = await browser.newContext({acceptDownloads:true}), page = await context.newPage();
    try {
      const main = await mainFixture(), historical = await mainFixture({historical:true}), catalog = catalogFixture({frameCount:180});
      await page.goto(base + '/modules/fidelity-r33/replay/index.html'); await page.evaluate(() => {localStorage.setItem('foreign','KEEP');window.__maxFrames = 0;new MutationObserver(() => {__maxFrames = Math.max(__maxFrames,document.querySelectorAll('iframe').length);}).observe(document.body,{childList:true});});
      await replayFiles(page,[['versus.json',main],['pre-r13.json',historical],['catalogue.json',catalog],['evolution.json',evolution],['duplicate.json',evolution],['unsupported-archive.json',[]]]); assert.equal(await page.locator('iframe').count(),0);
      const report = await verifyBatch(page); assert(report,await page.locator('#status').textContent()); assert.equal(report.verified,4); assert.deepEqual(report.entries.map(row => row.status),['verified','verified','verified','verified','duplicate','rejected']);
      const expected = [main.meta.runtimeContract,historical.meta.runtimeContract,catalog.contract,evolution.contract];
      report.entries.slice(0,4).forEach((row,index) => {assert.equal(row.verification.engineContract,expected[index]);assert.equal(row.verification.passes,2);assert.equal(row.verification.exactFinalStatesEqual,true);assert.equal(row.verification.sandbox.origin,'null');assert.equal(row.verification.sandbox.isolatedStorage,true);});
      assert.equal(report.entries[3].verification.storedStateDigest,evolution.stateDigest); assert.equal(await page.evaluate(() => __maxFrames),1); assert.equal(await page.locator('iframe').count(),0); assert.deepEqual(await page.evaluate(() => ({...localStorage})),{foreign:'KEEP'});
      const exported = JSON.parse(await download(page,'#download')); assert.deepEqual(exported,report); assert.equal(report.entries[3].sha256,createHash('sha256').update(JSON.stringify(evolution)).digest('hex')); await page.screenshot({path:path.join(output,'mixed-replay-batch.png'),fullPage:true});
      return {routes:report.entries.slice(0,4).map(row => ({kind:row.kind,contract:row.verification.engineContract,engineId:row.verification.engineSource.id})),peakActiveIframes:1,duplicateNotResimulated:true,unsupportedArchiveExplicit:true,naturalEvolutionDigest:evolution.stateDigest,exactExport:true,gameStorageWrites:0};
    } finally {await context.close();}
  });
  await test('Corrupt evolution results, unknown contracts and altered native engine bytes remain refused inside mixed batches', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r33/replay/index.html'); await replayFiles(page,[['bad-result.json',{...evolution,stateDigest:'00000000'}],['wrong-contract.json',{...evolution,contract:'0'.repeat(64)}],['good.json',evolution]]);
      const report = await verifyBatch(page); assert.deepEqual(report.entries.map(row => row.status),['refused','rejected','verified']); assert.equal(report.verified,1); assert.equal(report.allFilesVerified,false); assert.equal(await page.locator('iframe').count(),0);
      await page.route('**/src/combat-foundation-v060.js',async route => {const response = await route.fetch();await route.fulfill({response,body:(await response.text()) + '\n/* deliberate changed source fixture */'});});
      await replayFiles(page,[['changed-source.json',evolution]]); const changed = await verifyBatch(page); assert.equal(changed.verified,0); assert.match(changed.entries[0].reason,/Source du moteur différente/); assert.equal(await page.locator('iframe').count(),0);
      return {storedDigestRefused:true,unknownContractRejectedBeforeSimulation:true,otherValidFileVerified:true,changedSourceRefusedBeforeIframe:true};
    } finally {await context.close();}
  });
  await test('Cancellation, page lifecycle and late source preparation clean up the batch without automatic replay', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let release, intercepted = false;
    const gate = new Promise(resolve => {release = resolve;});
    try {
      await page.route('**/modules/fidelity-r28/evolutions/contract.json',async route => {intercepted = true;await gate;try {await route.continue();} catch {}});
      await page.goto(base + '/modules/fidelity-r33/replay/index.html'); await replayFiles(page,[['late.json',evolution],['second.json',evolution]]); await page.click('#verify');
      for (let n = 0; n < 100 && !intercepted; n++) await new Promise(resolve => setTimeout(resolve,20)); assert(intercepted); await page.click('#cancel'); await page.waitForFunction(() => !!BOW_REPLAY_BATCH_R33.state().result?.cancelled);
      const cancelled = await page.evaluate(() => JSON.stringify(BOW_REPLAY_BATCH_R33.state().result)); release(); await page.waitForTimeout(1500); assert.equal(await page.locator('iframe').count(),0); assert.equal(await page.evaluate(() => JSON.stringify(BOW_REPLAY_BATCH_R33.state().result)),cancelled);
      await page.evaluate(() => {dispatchEvent(new Event('pagehide'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));}); assert.equal((await page.evaluate(() => BOW_REPLAY_BATCH_R33.state())).busy,false); assert.match(await page.locator('#status').textContent(),/aucune reprise automatique/); assert.equal(await page.locator('iframe').count(),0);
      return {cancelDuringSourcePreparation:true,latePreparedIframeRemoved:true,secondFileNotStarted:true,resultStableAfterCancellation:true,lifecycleEventsAreExplicitSyntheticFixtures:true,automaticResumption:false};
    } finally {release();await context.close();}
  });
  await test('Both new pages remain keyboard accessible at 320px with doubled text and have no axe violations', async () => {
    const axePath = process.env.BOW_AXE_PATH || path.join(root,'node_modules/axe-core/axe.min.js'), fallback = '/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js';
    const axe = fs.existsSync(axePath) ? axePath : fallback; assert(fs.existsSync(axe),'Install axe-core@4.14.0'); const pages = [];
    for (const route of ['/modules/fidelity-r33/persistence/index.html','/modules/fidelity-r33/replay/index.html']) {
      const context = await browser.newContext({viewport:{width:320,height:1000},acceptDownloads:true}), page = await context.newPage();
      try {
        await page.goto(base + route); if (route.includes('/replay/')) {await replayFiles(page,[['evolution.json',evolution]]);await page.locator('#verify').focus();assert.equal(await page.locator('#verify').evaluate(node => node === document.activeElement),true);}
        await page.evaluate(() => document.documentElement.style.fontSize = '200%'); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false);
        await page.addScriptTag({path:axe}); const result = await page.evaluate(() => axe.run(document,{rules:{'color-contrast':{enabled:true}}})); assert.deepEqual(result.violations.map(row => ({id:row.id,impact:row.impact})),[]);
        await page.screenshot({path:path.join(output,route.includes('/replay/') ? 'batch-320-text200.png' : 'restore-320-text200.png'),fullPage:true}); pages.push({route,axeVersion:result.testEngine.version,violations:result.violations.length});
      } finally {await context.close();}
    }
    return {viewport:320,textResize:'200%',pages,screenReaderOrPhysicalDeviceCertified:false};
  });
} finally {await browser?.close();server.kill('SIGTERM');}
const inputs = ['modules/fidelity-r33/persistence/index.html','modules/fidelity-r33/persistence/page.js','modules/fidelity-r33/persistence/restore.js','modules/fidelity-r33/persistence/link.js','saves.html','modules/fidelity-r33/replay/index.html','modules/fidelity-r33/replay/page.js','modules/fidelity-r33/replay/batch.js','modules/fidelity-r31/persistence/index.html','modules/fidelity-r31/persistence/page.js','modules/fidelity-r31/persistence/restore.js','modules/fidelity-r31/persistence/journal.js','modules/fidelity-r31/persistence/style.css','modules/fidelity-r31/replay/verify.js','modules/fidelity-r24/persistence/sandbox.js','modules/fidelity-r24/persistence/bootstrap.js','modules/fidelity-r24/persistence/runner.js','modules/fidelity-r24/persistence/verifier.js','modules/fidelity-r28/evolutions/contract.json','modules/versus.html','tests/browser-persistence-r33.mjs','tests/persistence-fixtures-r24.mjs',...evolutionSources];
const report = {schema:'re.bow.persistence-browser-r33/1',passed:checks.filter(row => row.pass).length,failed:checks.filter(row => !row.pass).length,checks,
  sourceFiles:[...new Set(inputs)].map(name => ({path:name,bytes:fs.statSync(path.join(root,name)).size,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')})),
  scope:'Actual isolated Chromium localStorage, IndexedDB, native Web Locks, old/current restore pages, reload, selected/unselected progress, sequential R13/pre-R13/R7/R28 reconstruction with native contracts and source checks. Quota, interruption and pagehide/pageshow cases are labelled fault/synthetic fixtures. No live user profile, cloud, physical power-loss or physical-device certification.'};
fs.writeFileSync(path.join(root,'docs/R33_PERSISTENCE_BROWSER.json'),JSON.stringify(report,null,2) + '\n'); console.log(JSON.stringify({passed:report.passed,failed:report.failed})); if (report.failed) process.exitCode = 1;
