import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const port = Number(process.env.BOW_VISUAL_MODELS_R24_PORT || 5383);
const base = `http://127.0.0.1:${port}`;
const manifest = JSON.parse(fs.readFileSync('modules/fidelity-r24/visual/manifest.json'));
const output = 'qa-visual-models-r24'; fs.mkdirSync(output, {recursive: true});
const server = spawn(process.execPath, ['scripts/dev.mjs'], {env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const checks = [], unexpectedDestinations = [], pageErrors = [];
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page, id) {
  await page.waitForFunction(uid => { const s = window.RE_SOURCE_MODELS_R24?.state(); return s?.id === uid && !s.loading; }, id, {timeout: 20000});
  const state = await page.evaluate(() => RE_SOURCE_MODELS_R24.state());
  assert.equal(state.ready, true, await page.locator('#modelStatus').textContent());
  return state;
}
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  const page = await browser.newPage({viewport: {width: 1000, height: 950}});
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== base) unexpectedDestinations.push(url.origin);
  });
  await page.goto(base + '/modules/fidelity-r24/models/index.html');
  await page.waitForFunction(() => window.RE_SOURCE_MODELS_R24);
  for (const entry of manifest.entries) await test('Preserved OBJ and published textures: ' + entry.id, async () => {
    await page.evaluate(id => RE_SOURCE_MODELS_R24.select(id), entry.id);
    const state = await ready(page, entry.id);
    assert.ok(state.stats.meshes > 0);
    assert.ok(state.stats.triangles > 0);
    assert.equal(state.stats.bones, 0);
    assert.equal(state.sourceFilesRewritten, false);
    assert.equal(state.playing, false);
    assert.equal(await page.locator('#animationSection').isVisible(), false);
    await page.locator('#viewport').screenshot({path: output + '/' + entry.id + '.png'});
    return {meshes: state.stats.meshes, triangles: state.stats.triangles, geometryScope: entry.geometryScope};
  });
  await test('Tyrant published weighted armature remains inspectable and has no invented clip', async () => {
    const entry = manifest.entries.find(item => item.publishedRig);
    const id = entry.id + '-published-rig';
    await page.evaluate(uid => RE_SOURCE_MODELS_R24.select(uid), id);
    const state = await ready(page, id);
    assert.equal(state.stats.bones, entry.publishedRig.structure.jointNodes);
    assert.equal(state.stats.skinnedMeshes, entry.publishedRig.structure.skinControllers);
    assert.equal(await page.locator('#animationSection').isVisible(), false);
    assert.equal(state.duration, 0);
    assert.equal(state.playing, false);
    assert.equal(state.sourceFilesRewritten, false);
    // Collada may instantiate a source joint for multiple controllers; count source names.
    assert.equal(new Set((await page.evaluate(() => RE_SOURCE_MODELS_R24.bones())).map(bone => bone.name)).size, 34);
    await page.check('#showBones');
    await page.locator('#viewport').screenshot({path: output + '/tyrant-published-armature.png'});
    return state.stats;
  });
  await test('Source examination needs no remote runtime fetch and produces no page exception', async () => {
    assert.deepEqual(unexpectedDestinations, []);
    assert.deepEqual(pageErrors, []);
  });
} finally {
  await browser.close(); server.kill();
  fs.writeFileSync(output + '/browser-results.json', JSON.stringify({checks}, null, 2) + '\n');
}
if (checks.some(check => !check.pass)) process.exitCode = 1;
