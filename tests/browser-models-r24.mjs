import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-models-r24-browser'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_MODELS_R24_PORT || 5352), base = 'http://127.0.0.1:' + port;
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r24/models/catalog.json'))).entries;
const rig = catalog.find(item => item.clips.length), staticModels = catalog.filter(item => !item.clips.length);
const checks = [], startedAt = new Date().toISOString();
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: String(error.stack)}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page, id, clip) {
  await page.waitForFunction(({id, clip}) => { const state = window.RE_SOURCE_MODELS_R24?.state(); return state?.id === id && state.ready && (!clip || state.clip === clip) || !document.querySelector('#retry').hidden; }, {id, clip}, {timeout: 45000});
  const state = await page.evaluate(() => RE_SOURCE_MODELS_R24.state());
  assert.equal(state.ready, true, await page.locator('#modelStatus').textContent()); assert.equal(state.id, id); if (clip) assert.equal(state.clip, clip);
  return state;
}
async function open(page, id) { await page.goto(base + '/modules/fidelity-r24/models/index.html?model=' + id); return ready(page, id); }
try {
  for (let n = 0; n < 80; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
  await test('All published static variants and weighted Tyrant load without source changes', async () => {
    const page = await browser.newPage({viewport: {width: 1280, height: 950}}), errors = []; page.on('pageerror', error => errors.push(error.message));
    await open(page, staticModels[0].id); let maximumTextures = 0;
    for (const entry of staticModels) {
      await page.selectOption('#modelSelect', entry.id); const state = await ready(page, entry.id);
      assert(state.stats.meshes > 0 && state.stats.triangles > 0); assert(state.stats.texturedMeshes > 0);
      assert.equal(state.playing, false); assert.equal(state.sourceFilesRewritten, false);
      maximumTextures = Math.max(maximumTextures, state.render.textures);
      if (entry.geometryScope === 'published-weighted-rig-reference') { assert.equal(state.stats.bones, 34); assert.equal(state.stats.skinnedMeshes, 11); }
    }
    assert.deepEqual(errors, []); await page.close(); return {models: staticModels.length, maximumTextures, sourcesRewritten: false};
  });
  await test('48 source files distinguish 47 motions and one post-zero pose with native targets and bounded resources', async () => {
    const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await open(page, rig.id); let maximumTextures = 0, maximumGeometries = 0, archiveReads = 0;
    page.on('request', request => { if (request.url().endsWith('/sea-creeper/source/original.zip')) archiveReads++; });
    for (const clip of rig.clips) {
      await page.selectOption('#clipSelect', clip.id); const state = await ready(page, rig.id, clip.id);
      assert.equal(state.playing, false); assert.equal(state.stats.meshes, 9); assert.equal(state.stats.skinnedMeshes, 9);
      assert.equal(state.stats.bones, 33); assert.equal(state.stats.texturedMeshes, 9); assert.equal(state.stats.animationTracks, 102);
      assert(Math.abs(state.duration - clip.lastNativeTimeSeconds) < 1e-5); assert(state.archiveCacheBytes <= 40 * 1024 * 1024);
      const before = await page.evaluate(() => RE_SOURCE_MODELS_R24.animatedTransforms());
      let changed = false;
      for (const portion of [.25, .5, .75, 1]) {
        await page.evaluate(time => RE_SOURCE_MODELS_R24.seek(time), state.duration * portion);
        if (JSON.stringify(await page.evaluate(() => RE_SOURCE_MODELS_R24.animatedTransforms())) !== JSON.stringify(before)) changed = true;
      }
      assert.equal(changed, !clip.positiveTimePoseOnly, 'Source classification must agree with decoded transforms: ' + clip.id);
      if (clip.positiveTimePoseOnly) { assert.equal(await page.locator('#playToggle').isDisabled(), true); await page.evaluate(() => RE_SOURCE_MODELS_R24.play()); assert.equal((await page.evaluate(() => RE_SOURCE_MODELS_R24.state())).playing, false); }
      maximumTextures = Math.max(maximumTextures, state.render.textures); maximumGeometries = Math.max(maximumGeometries, state.render.geometries);
      assert(state.render.textures <= 24, 'Disposed motion textures must not accumulate'); assert(state.render.geometries <= 12);
    }
    assert.equal(archiveReads, 1, 'Selected ZIP is cached once'); assert.deepEqual(errors, []); await page.close();
    return {sourceFiles: rig.clips.length, motions: rig.clips.filter(clip => !clip.positiveTimePoseOnly).length,
      poses: rig.clips.filter(clip => clip.positiveTimePoseOnly).length, maximumTextures, maximumGeometries,
      archiveReads, retargeting: false, softwareRenderer: true};
  });
  for (const width of [1280, 390]) await test('Camera inspection, skin overlay and native movement controls at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 900}, hasTouch: width === 390, reducedMotion: 'reduce'}), page = await context.newPage();
    const state = await open(page, rig.id), initial = state.camera;
    await page.click('#opposite'); assert.notDeepEqual((await page.evaluate(() => RE_SOURCE_MODELS_R24.state())).camera, initial);
    await page.click('#resetView'); assert.deepEqual((await page.evaluate(() => RE_SOURCE_MODELS_R24.state())).camera, initial);
    await page.check('#showBones'); await page.locator('#nextKey').focus(); await page.keyboard.press('Enter');
    assert((await page.evaluate(() => RE_SOURCE_MODELS_R24.state())).time > 0);
    await page.locator('#playToggle').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150); await page.evaluate(() => RE_SOURCE_MODELS_R24.pause());
    assert.equal((await page.evaluate(() => RE_SOURCE_MODELS_R24.state())).playing, false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({path: path.join(output, 'model-' + width + '.png'), fullPage: true}); await context.close();
    return {width, keyboard: true, reducedMotion: true, physicalDevice: false};
  });
  await test('Changed source bytes fail closed and a new load recovers', async () => {
    const page = await browser.newPage(); const first = staticModels.find(item => item.format === 'OBJ');
    const sourcePath = first.model.path.split('/').map(encodeURIComponent).join('/');
    await page.route('**/' + sourcePath, route => route.fulfill({status: 200, body: 'unreviewed mesh'}));
    await page.goto(base + '/modules/fidelity-r24/models/index.html?model=' + first.id);
    await page.waitForSelector('#retry:not([hidden])'); assert.equal((await page.evaluate(() => RE_SOURCE_MODELS_R24.state())).ready, false);
    await page.unroute('**/' + sourcePath); await page.click('#retry'); await ready(page, first.id); await page.close();
    return {changedSourceRefused: true, retryRecovered: true};
  });
  await test('A late previous model never replaces the selected identity', async () => {
    const page = await browser.newPage(); let release, reached;
    const gate = new Promise(resolve => { release = resolve; }), seen = new Promise(resolve => { reached = resolve; });
    const first = staticModels[0], second = staticModels[1], sourcePath = first.model.path.split('/').map(encodeURIComponent).join('/');
    await page.route('**/' + sourcePath, async route => { reached(); await gate; await route.continue().catch(() => {}); });
    await page.goto(base + '/modules/fidelity-r24/models/index.html?model=' + first.id); await seen;
    await page.selectOption('#modelSelect', second.id); await ready(page, second.id); release(); await page.waitForTimeout(150);
    assert.equal((await page.evaluate(() => RE_SOURCE_MODELS_R24.state())).id, second.id); await page.close();
    return {staleResponseRejected: true};
  });
} finally {
  await browser?.close(); server.kill();
  const report = {schema: 're.bow.model-view-browser/1', startedAt, completedAt: new Date().toISOString(),
    softwareRenderer: true, physicalDevices: false, nativeGameRenderingCertified: false,
    passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks};
  const text = JSON.stringify(report, null, 2) + '\n';
  fs.writeFileSync(path.join(output, 'R24_MODELS_BROWSER_RESULTS.json'), text); fs.writeFileSync(path.join(root, 'docs/R24_MODELS_BROWSER.json'), text);
  if (report.failed) process.exitCode = 1;
}
