/** Current HTTP selection and real opaque original-engine replay boundaries. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {mainFixture} from './persistence-fixtures-r24.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-selection-r29'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_SELECTION_R29_PORT || 5779), base = 'http://127.0.0.1:' + port;
const checks = [], startedAt = new Date().toISOString();
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) {
  try {const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
async function scene(route) {
  const context = await browser.newContext({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce'});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(base + route, {waitUntil: 'networkidle'});
  return {context, page, errors};
}
try {
  for (let n = 0; n < 80; n++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Normal HTTP main selector remains active and launches the exact selected form in R29', async () => {
    const {context, page, errors} = await scene('/modules/versus.html');
    try {
      await page.selectOption('#formPickerR28', 're2r-super-tyrant'); await page.click('#formAssign0R28');
      const result = await page.evaluate(() => ({
        alias: RE_EVOLUTION_SELECTION_R29 === RE_EVOLUTION_SELECTION_R28,
        state: RE_EVOLUTION_SELECTION_R29.state(), selected: document.getElementById('p1Portrait').dataset.reSpecimen,
        launch: document.getElementById('evolutionLaunchR28').href, combat: RE_COMBAT.getState()
      }));
      assert.equal(result.alias, true); assert.equal(result.state.mainMounted, true); assert.equal(result.state.groupedOptions, 115);
      assert.equal(result.selected, 're2r-super-tyrant'); assert.equal(result.combat, null);
      const url = new URL(result.launch); assert.equal(url.origin, base); assert.equal(url.pathname, '/modules/fidelity-r29/evolutions/index.html');
      assert.equal(url.searchParams.get('uid'), result.selected); assert.deepEqual(errors, []); return result;
    } finally {await context.close();}
  });
  await test('Normal HTTP classic duel retains 346 profiles and sends exact actors and stage to R29', async () => {
    const {context, page, errors} = await scene('/catalog-duel.html');
    try {
      await page.selectOption('#trialSubject', 're2r-super-tyrant');
      const result = await page.evaluate(() => ({options: document.getElementById('trialSubject').options.length,
        subject: document.getElementById('trialSubject').value, target: document.getElementById('trialTarget').value,
        stage: document.getElementById('trialStage').value, launch: document.getElementById('evolutionLaunchR28').href,
        replaySchema: RE_CATALOG_DUEL.exportReplay().schema}));
      assert.equal(result.options, 346); assert.equal(result.replaySchema, 're.bow.catalog-duel-replay/1');
      const url = new URL(result.launch); assert.equal(url.pathname, '/modules/fidelity-r29/evolutions/index.html');
      for (const [key, value] of [['uid', result.subject], ['target', result.target], ['stage', result.stage]]) assert.equal(url.searchParams.get(key), value);
      assert.deepEqual(errors, []); return result;
    } finally {await context.close();}
  });
  await test('R29 mode uses the real selection API with the preserved evolution engine', async () => {
    const {context, page, errors} = await scene('/modules/fidelity-r29/evolutions/index.html?uid=re2r-tyrant&target=re3r-nemesis');
    try {
      const result = await page.evaluate(() => ({
        family: RE_EVOLUTION_SELECTION_R29.family('re2r-super-tyrant').id,
        families: document.querySelectorAll('#trialSubject optgroup[data-family-id]').length,
        uid: RE_EVOLUTION_DUEL_R28.getState().a.f.uid, target: RE_EVOLUTION_DUEL_R28.getState().b.f.uid,
        choices: RE_EVOLUTIONS_R28.available(RE_EVOLUTION_DUEL_R28.getState(), 0).map(edge => edge.to)
      }));
      assert.equal(result.family, 're2r-tyrant'); assert.equal(result.families, 15);
      assert.equal(result.uid, 're2r-tyrant'); assert.equal(result.target, 're3r-nemesis');
      assert.deepEqual(result.choices, ['re2r-super-tyrant']); assert.deepEqual(errors, []); return result;
    } finally {await context.close();}
  });
  await test('The current R29 mode naturally mutates without healing and replays the exact chosen tick', async () => {
    const {context, page, errors} = await scene('/modules/fidelity-r29/evolutions/index.html?uid=re2r-tyrant&target=re3r-nemesis&seed=7070');
    try {
      const result = await page.evaluate(() => {
        const api = RE_EVOLUTION_DUEL_R28; api.reset(true);
        while (api.getState().frame < 3000 && !api.getState().finished && RE_EVOLUTIONS_R28.reason(api.getState(), 0, 're2r-super-tyrant')) api.tick(1, {held: {}, edges: []});
        api.draw(); const state = api.getState();
        const before = {frame: state.frame, uid: state.a.f.uid, life: state.a.life, meter: state.a.meter, ready: !document.getElementById('evolutionApply0R28').disabled};
        document.getElementById('evolutionApply0R28').click(); api.tick(1, {held: {}, edges: []}); api.draw();
        const after = {frame: state.frame, uid: state.a.f.uid, life: state.a.life, meter: state.a.meter};
        const replay = api.exportReplay(); api.installReplay(replay);
        const seek = document.getElementById('trialReplaySeek'); seek.value = '678'; seek.dispatchEvent(new Event('change'));
        const replayBefore = api.getState().a.f.uid;
        seek.value = '679'; seek.dispatchEvent(new Event('change'));
        const replayAfter = api.getState().a.f.uid, digest = RE_EVOLUTION_REPLAY_R28.seal(api.getState());
        return {before, after, replayBefore, replayAfter, digest, recordedDigest: replay.stateDigest, frames: replay.frames};
      });
      assert.deepEqual(result.before, {frame: 678, uid: 're2r-tyrant', life: 3910, meter: 36, ready: true});
      assert.deepEqual(result.after, {frame: 679, uid: 're2r-super-tyrant', life: 3910, meter: 1});
      assert.equal(result.replayBefore, 're2r-tyrant'); assert.equal(result.replayAfter, 're2r-super-tyrant');
      assert.equal(result.frames, 679); assert.equal(result.digest, '68a1966d'); assert.equal(result.recordedDigest, result.digest);
      assert.deepEqual(errors, []); return {...result, actorStateOverrides: 0};
    } finally {await context.close();}
  });
  await test('Actual principal replay reconstructs twice in an opaque srcdoc without launchers or URL errors', async () => {
    const fixture = await mainFixture();
    const {context, page, errors} = await scene('/modules/fidelity-r24/persistence/index.html');
    try {
      await page.waitForFunction(() => !!window.BOW_REPLAY_PAGE_R24);
      await page.evaluate(() => {localStorage.setItem('re.bow.chronicles055.a', 'KEEP GAME SAVE'); localStorage.setItem('r29-unrelated', 'KEEP');});
      await page.locator('#replay').setInputFiles({name: 'actual-r29-main.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture))});
      await page.waitForFunction(() => !document.getElementById('results').hidden || document.getElementById('status').textContent.startsWith('VÉRIFICATION REFUSÉE'), {timeout: 55000});
      assert.equal(await page.locator('#results').isHidden(), false, await page.locator('#status').textContent());
      const result = JSON.parse(await page.locator('#report').textContent());
      assert.equal(result.verified, true); assert.equal(result.passes, 2); assert.equal(result.sandbox.origin, 'null'); assert.equal(result.sandbox.isolatedStorage, true);
      assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))),
        {'r29-unrelated': 'KEEP', 're.bow.chronicles055.a': 'KEEP GAME SAVE'});
      assert.equal(await page.locator('iframe').count(), 0); assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(output, 'opaque-replay-fixed.png'), fullPage: true});
      return {passes: result.passes, opaqueOrigin: result.sandbox.origin, isolatedStorage: true, pageErrors: errors.length};
    } finally {await context.close();}
  });
} catch (error) {checks.push({name: 'setup', pass: false, error: error.stack}); console.error(error.stack);}
finally {
  await browser?.close(); server.kill('SIGTERM');
  const paths = ['modules/fidelity-r29/evolutions/selection.js', 'tests/browser-selection-boundaries-r29.mjs',
    'modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r29/evolutions/index.html',
    'modules/fidelity-r29/combat/sprite-runtime.js', 'modules/fidelity-r29/sprites/manifest.json',
    'modules/fidelity-r28/evolutions/contract.json'];
  const report = {schema: 're.bow.selection-boundaries-browser-r29/1', startedAt, finishedAt: new Date().toISOString(),
    passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length, checks,
    sourceFiles: paths.map(file => ({path: file, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')})),
    preservedLegacyEngines: true, storedGameDataWrittenByVerifier: false};
  fs.writeFileSync(path.join(root, 'docs/R29_SELECTION_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
}
