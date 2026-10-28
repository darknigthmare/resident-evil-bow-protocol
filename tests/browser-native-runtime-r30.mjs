/** Actual R30 native PNG/atlas playback and additive live combat mounts. No synthetic asset admission. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = value => JSON.parse(fs.readFileSync(path.join(root, value), 'utf8'));
const hash = raw => createHash('sha256').update(raw).digest('hex');
const indexPath = 'modules/fidelity-r30/native/manifest.json', index = read(indexPath);
const entries = index.lots.flatMap(lot => read(lot.path).entries);
const observed = entries.find(item => item.actionIdentity === 'observed-neutral-loop' && item.sourceFacing === 'right' && item.selectablePresentationVariant);
assert(observed, 'An actually reviewed optional neutral-loop variant is required; do not turn fixture flags into production assets.');
const other = entries.find(item => item.kind === 'native-static-pose' && item.admittedTargetEdition && item.admittedCombatStates.includes('idle'));
assert(other, 'An actual source-reviewed static neutral pose is required.');
const port = Number(process.env.BOW_NATIVE_RUNTIME_R30_PORT || 5894), base = 'http://127.0.0.1:' + port;
const output = path.join(root, 'qa-native-runtime-r30'); fs.mkdirSync(output, {recursive: true});
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const checks = [], startedAt = new Date().toISOString(); let browser;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) {try {const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function scene(route, options = {}) {
  const context = await browser.newContext({viewport: {width: 1280, height: 1000}, ...options}), page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(String(error))); await page.goto(base + route);
  await page.waitForFunction(() => globalThis.RE_NATIVE_SPRITES_R30?.state().loaded || globalThis.RE_NATIVE_SPRITES_R30?.state().failed);
  const runtime = await page.evaluate(() => RE_NATIVE_SPRITES_R30.state());
  assert.equal(runtime.failed, false, runtime.errors.join(' ')); return {context, page, errors};
}
try {
  for (let attempt = 0; attempt < 100; attempt++) {try {if ((await fetch(base)).ok) break;} catch {} await pause(60);}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Native preview decodes the actual atlas and reproduces the selected PNG pixels', async () => {
    const {context, page, errors} = await scene('/modules/fidelity-r30/native/index.html?id=' + observed.subjectId + '&sequence=' + encodeURIComponent(observed.id));
    try {
      await page.waitForFunction(id => globalThis.RE_NATIVE_PREVIEW_R30?.state().displayed === id + ':0', observed.id);
      const result = await page.evaluate(async () => {
        const canvas = document.getElementById('frame'), raw = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        return {width: canvas.width, height: canvas.height,
          rgbaSha256: [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(value => value.toString(16).padStart(2, '0')).join(''),
          selected: RE_NATIVE_PREVIEW_R30.state().selected, playing: RE_NATIVE_PREVIEW_R30.state().playing,
          options: document.getElementById('subject').options.length, edition: document.getElementById('edition').textContent};
      });
      assert.equal(result.selected, observed.id); assert.equal(result.options, entries.length); assert.equal(result.playing, false);
      assert.equal(result.width, observed.frames[0].width); assert.equal(result.height, observed.frames[0].height);
      if (observed.frames[0].rgbaSha256) assert.equal(result.rgbaSha256, observed.frames[0].rgbaSha256);
      assert.equal(result.edition, observed.sourceEdition); assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(output, 'native-preview.png'), fullPage: true}); return result;
    } finally {await context.close();}
  });
  await test('Full native playback crosses atlas cells smoothly while maintaining a bounded rolling cache', async () => {
    const {context, page, errors} = await scene('/modules/fidelity-r30/native/index.html?id=' + observed.subjectId + '&sequence=' + encodeURIComponent(observed.id));
    try {
      await page.waitForFunction(() => RE_NATIVE_PREVIEW_R30.state().displayed?.endsWith(':0'));
      await page.evaluate(() => {window.__nativeFrames = []; window.__nativeProbe = setInterval(() => __nativeFrames.push(RE_NATIVE_PREVIEW_R30.state().frame), 12);});
      await page.click('#play'); await page.waitForTimeout(1100); await page.click('#play');
      const result = await page.evaluate(() => {clearInterval(__nativeProbe); return {observedFrames: [...new Set(__nativeFrames)],
        playing: RE_NATIVE_PREVIEW_R30.state().playing, runtime: RE_NATIVE_SPRITES_R30.state()};});
      assert(result.observedFrames.length >= 12, 'Headless playback must advance through many actual poses, not a handful of sparse samples.');
      assert(Math.max(...result.observedFrames) >= 30, 'Playback must pass the 25-frame atlas boundary.');
      assert.equal(result.playing, false); assert(result.runtime.cached <= result.runtime.limits.decodedImages);
      assert(result.runtime.decodedPixels <= result.runtime.limits.decodedPixels); assert.equal(result.runtime.errorsRemembered, 0); assert.deepEqual(errors, []);
      return {nominalSourceSampleRate: observed.sampleRate, actualDistinctObservedFrames: result.observedFrames.length,
        maximumFrame: Math.max(...result.observedFrames), cache: result.runtime.cached, decodedPixels: result.runtime.decodedPixels,
        benchmarkScope: 'Headless functional sampling only; no physical-device frame-rate certification.'};
    } finally {await context.close();}
  });
  await test('Main, classic and voluntary-evolution mounts preserve default source editions and old runtime APIs', async () => {
    const results = [];
    for (const route of ['/modules/versus.html', '/catalog-duel.html', '/modules/fidelity-r30/evolutions/index.html']) {
      const {context, page, errors} = await scene(route);
      try {
        const result = await page.evaluate(uid => ({route: location.pathname, controls: document.querySelectorAll('#nativePresentationR30').length,
          oldAliases: RE_COMBAT_SPRITES_R27 === RE_COMBAT_SPRITES_R28 && RE_COMBAT_SPRITES_R28 === RE_COMBAT_SPRITES_R29,
          selectedVariant: RE_NATIVE_SPRITES_R30.selectedVariant(uid), defaultRecord: RE_NATIVE_SPRITES_R30.resolve(uid, {facing: 'right'})?.id || null,
          runtime: RE_NATIVE_SPRITES_R30.state(), adapter: RE_NATIVE_ADAPTER_R30.state()}), observed.subjectId);
        assert.equal(result.controls, 1); assert.equal(result.oldAliases, true); assert.equal(result.selectedVariant, null); assert.equal(result.defaultRecord, null);
        assert.equal(result.adapter.collisionOrReplayDataChanged, false); assert.equal(result.runtime.entries, entries.length); assert.deepEqual(errors, []); results.push(result);
      } finally {await context.close();}
    }
    return {mounts: results.map(value => value.route), controlsPerMount: 1, documentaryEditionDefaultPromotions: 0, generatedAliasesPreserved: true};
  });
  await test('Explicit native source-variant selection animates idle artwork using the actual duel clock without changing replay data', async () => {
    const {context, page, errors} = await scene('/modules/fidelity-r30/evolutions/index.html');
    try {
      await page.selectOption('#trialSubject', observed.subjectId); await page.selectOption('#trialMode', 'human');
      await page.locator('#nativePresentationR30 summary').click();
      const picker = page.getByLabel('Rendu natif du joueur 1'); await picker.selectOption(observed.variantFamilyId);
      const result = await page.evaluate(async variant => {
        const api = RE_CATALOG_DUEL; api.reset(false);
        while (api.getState().frame < 600) {
          api.tick(1, {held: {}, edges: []}); const live = api.getState();
          if (live.phase === 'fight' && RE_NATIVE_ADAPTER_R30.classify({actor: live.a, ...RE_MATCH_SEQUENCES.pose(live, 0)}) === 'idle') break;
        }
        const state = api.getState(), item = RE_NATIVE_SPRITES_R30.resolve(state.a.f.uid, {facing: state.a.face});
        if (!item) throw Error('Actual selected actor has no admitted source variant.');
        await RE_NATIVE_SPRITES_R30.preload(item.id, {seconds: state.frame / 60, count: 32});
        const before = JSON.stringify(api.exportReplay()), actor = JSON.stringify(state.a), snapshot = RE_NATIVE_ADAPTER_R30.state(); api.draw();
        const after = JSON.stringify(api.exportReplay()), next = RE_NATIVE_ADAPTER_R30.state();
        return {selectedVariant: RE_NATIVE_SPRITES_R30.selectedVariant(state.a.f.uid), expectedVariant: variant, uid: state.a.f.uid, frame: state.frame,
          actorPreserved: actor === JSON.stringify(state.a), replayPreserved: before === after, nativeAnimatedDraws: next.nativeAnimatedDraws - snapshot.nativeAnimatedDraws,
          idleState: state.a.state, action: item.actionIdentity, sourceActionCertified: item.sourceActionCertified, sourceEdition: item.sourceEdition};
      }, observed.variantFamilyId);
      assert.equal(result.selectedVariant, observed.variantFamilyId); assert.equal(result.actorPreserved, true); assert.equal(result.replayPreserved, true);
      assert(result.nativeAnimatedDraws >= 1, 'The actual duel render must draw the qualified selected native sequence: ' + JSON.stringify(result));
      assert.equal(result.action, 'observed-neutral-loop'); assert.equal(result.sourceActionCertified, false); assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(output, 'native-variant-combat.png'), fullPage: true});
      await page.reload(); await page.waitForFunction(() => RE_NATIVE_SPRITES_R30.state().loaded);
      assert.equal(await page.evaluate(uid => RE_NATIVE_SPRITES_R30.selectedVariant(uid), observed.subjectId), null);
      return {...result, persistedAcrossReload: false};
    } finally {await context.close();}
  });
  await test('The actual exact-edition native stance remains static and preserves attack fallback', async () => {
    const {context, page, errors} = await scene('/catalog-duel.html');
    try {
      const result = await page.evaluate(async id => {
        const item = RE_NATIVE_SPRITES_R30.get(id); await RE_NATIVE_SPRITES_R30.preload(id);
        const fighter = RE_DATA.fighters.find(value => value.uid === item.subjectId); if (!fighter) throw Error('Native stance actor missing.');
        const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600;
        const actor = Object.freeze({state: 'idle', life: 100, vx: 0, onGround: true, f: fighter});
        const before = RE_NATIVE_ADAPTER_R30.state(); RE_RENDERER.drawFighter(canvas.getContext('2d'), fighter, 300, 500, item.sourceFacing, 1, {actor, time: .5});
        const neutral = RE_NATIVE_ADAPTER_R30.state(); RE_RENDERER.drawFighter(canvas.getContext('2d'), fighter, 300, 500, item.sourceFacing, 1, {actor, attack: true, time: .5});
        const attack = RE_NATIVE_ADAPTER_R30.state(); return {id: item.id, uid: item.subjectId, neutralDraws: neutral.nativeStaticDraws - before.nativeStaticDraws,
          animatedDraws: neutral.nativeAnimatedDraws - before.nativeAnimatedDraws, attackFallbacks: attack.generatedOrProceduralFallbacks - neutral.generatedOrProceduralFallbacks};
      }, other.id);
      assert.equal(result.neutralDraws, 1); assert.equal(result.animatedDraws, 0); assert.equal(result.attackFallbacks, 1); assert.deepEqual(errors, []); return result;
    } finally {await context.close();}
  });
  await test('Unknown deep links fail explicitly and small-screen preview remains readable with keyboard seek', async () => {
    const bad = await scene('/modules/fidelity-r30/native/index.html?id=unregistered-form');
    try {await bad.page.waitForFunction(() => globalThis.RE_NATIVE_PREVIEW_R30?.state().failed); assert.match(await bad.page.textContent('#status'), /Aucun lot/); assert.deepEqual(bad.errors, []);} finally {await bad.context.close();}
    const {context, page, errors} = await scene('/modules/fidelity-r30/native/index.html?id=' + observed.subjectId + '&sequence=' + encodeURIComponent(observed.id), {viewport: {width: 320, height: 900}, reducedMotion: 'reduce'});
    try {
      await page.waitForFunction(() => RE_NATIVE_PREVIEW_R30.state().displayed?.endsWith(':0'));
      await page.focus('#seek'); await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => RE_NATIVE_PREVIEW_R30.state().frame === 1);
      const result = await page.evaluate(() => ({scrollWidth: document.documentElement.scrollWidth, width: innerWidth, frame: RE_NATIVE_PREVIEW_R30.state().frame,
        playing: RE_NATIVE_PREVIEW_R30.state().playing, focused: document.activeElement.id}));
      assert(result.scrollWidth <= result.width + 1); assert.equal(result.focused, 'seek'); assert.equal(result.playing, false); assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(output, 'native-preview-320.png'), fullPage: true}); return result;
    } finally {await context.close();}
  });
  await test('Actual PNG corruption is refused and pagehide releases all decoded source images', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    await page.route('**/' + observed.frames[0].atlas.path, route => route.fulfill({status: 200, contentType: 'image/png', body: Buffer.alloc(observed.frames[0].atlas.bytes)}));
    try {
      await page.goto(base + '/modules/fidelity-r30/native/index.html?id=' + observed.subjectId + '&sequence=' + encodeURIComponent(observed.id));
      await page.waitForFunction(() => globalThis.RE_NATIVE_SPRITES_R30?.state().errorsRemembered > 0);
      assert.equal(await page.evaluate(() => RE_NATIVE_PREVIEW_R30.state().displayed), null);
      const result = await page.evaluate(() => {dispatchEvent(new Event('pagehide')); return RE_NATIVE_SPRITES_R30.state();});
      assert.equal(result.active, false); assert.equal(result.cached, 0); assert.equal(result.decodedPixels, 0); return {corruptAtlasDisplayed: false, cachedAfterHide: result.cached};
    } finally {await context.close();}
  });
} finally {await browser?.close(); server.kill('SIGTERM');}
const inputs = [indexPath, ...index.lots.map(lot => lot.path), 'modules/fidelity-r30/combat/native-runtime.js', 'modules/fidelity-r30/combat/native-adapter.js',
  'modules/fidelity-r30/native/index.html', 'modules/fidelity-r30/native/page.js', 'modules/fidelity-r30/native/style.css', 'tests/browser-native-runtime-r30.mjs',
  'modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r30/evolutions/index.html'];
const report = {schema: 're.bow.native-runtime-browser-r30/1', startedAt, finishedAt: new Date().toISOString(), browser: 'Chromium headless', physicalDevice: false,
  inputs: inputs.map(value => ({path: value, sha256: hash(fs.readFileSync(path.join(root, value)))})),
  total: checks.length, passed: checks.filter(value => value.pass).length, failed: checks.filter(value => !value.pass).length, checks};
fs.writeFileSync(path.join(root, 'docs/R30_NATIVE_RUNTIME_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
if (report.failed) process.exitCode = 1;
