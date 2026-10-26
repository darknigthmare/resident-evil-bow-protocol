/** Actual bounded native-frame viewer, byte failures, keyboard and reflow. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'qa-native-frames-r29'); fs.mkdirSync(output, {recursive: true});
const pack = path.join(root, 'modules/fidelity-r29/motion'), manifest = JSON.parse(fs.readFileSync(path.join(pack, 'manifest.json')));
const port = Number(process.env.BOW_NATIVE_FRAMES_TEST_PORT || 5786), base = 'http://127.0.0.1:' + port, route = '/modules/fidelity-r29/motion/index.html';
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex'), checks = [], startedAt = new Date().toISOString();
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function scene(options = {}) {const context = await browser.newContext({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce', ...options}), page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message)); return {context, page, errors};}
async function ready(page, query = '') {await page.goto(base + route + query); await page.waitForFunction(() => RE_NATIVE_FRAMES_R29.state().displayed);}
try {
  for (let attempt = 0; attempt < 80; attempt++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('All24 actual source scenes retain exact UID and idle is never implied', async () => {
    const {context, page, errors} = await scene();
    try {
      await ready(page, '?identity=rerev-ooze'); assert.equal(await page.locator('#clip option').count(), 24);
      for (const uid of [...new Set(manifest.entries.map(entry => entry.subjectId))]) {
        const entry = manifest.entries.find(entry => entry.subjectId === uid); await page.selectOption('#clip', entry.id);
        await page.waitForFunction(id => RE_NATIVE_FRAMES_R29.state().displayed === id + ':0', entry.id);
        const state = await page.evaluate(() => RE_NATIVE_FRAMES_R29.state()); assert.equal(state.selected, entry.id); assert.equal(state.playing, false); assert.equal(state.blobUrls, 1);
        assert.match(await page.locator('#scope').textContent(), /aucun état de combat admis/); assert.equal(new URL(await page.locator('#dossier').getAttribute('href')).searchParams.get('id'), uid);
      }
      await page.screenshot({path: path.join(output, 'native-frames-1280.png'), fullPage: true}); assert.deepEqual(errors, []);
      return {scenes: 24, exactIdentities: 6, autoplay: false, blobUrls: 1, combatStatesAssigned: 0};
    } finally {await context.close();}
  });
  await test('Keyboard frame stepping, voluntary playback and page lifecycle preserve one image', async () => {
    const {context, page, errors} = await scene();
    try {
      await ready(page, '?id=rerev-ooze'); await page.focus('#next'); await page.keyboard.press('Enter');
      await page.waitForFunction(() => RE_NATIVE_FRAMES_R29.state().displayed?.endsWith(':1'));
      const first = await page.evaluate(() => RE_NATIVE_FRAMES_R29.state()); assert.equal(first.frame, 1);
      await page.click('#play'); await page.waitForFunction(() => RE_NATIVE_FRAMES_R29.state().frame > 1); await page.click('#play');
      assert.equal(await page.evaluate(() => RE_NATIVE_FRAMES_R29.state().playing), false);
      await page.evaluate(() => {window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}));});
      assert.equal(await page.evaluate(() => RE_NATIVE_FRAMES_R29.state().blobUrls), 0);
      await page.evaluate(() => {window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));});
      await page.waitForFunction(() => RE_NATIVE_FRAMES_R29.state().displayed); assert.equal(await page.evaluate(() => RE_NATIVE_FRAMES_R29.state().blobUrls), 1); assert.equal(await page.evaluate(() => RE_NATIVE_FRAMES_R29.state().playing), false);
      assert.deepEqual(errors, []); return {nativeKeyboardActivation: true, explicitPlay: true, simulatedLifecycle: true, duplicateUrls: false};
    } finally {await context.close();}
  });
  await test('320px and doubled computed text retain visible reachable controls', async () => {
    const {context, page, errors} = await scene({viewport: {width: 320, height: 1000}});
    try {
      await ready(page); await page.evaluate(() => {const elements = [...document.querySelectorAll('body *')].filter(element => !['SCRIPT', 'STYLE'].includes(element.tagName));const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));elements.forEach((element, index) => element.style.setProperty('font-size', sizes[index] * 2 + 'px', 'important'));});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.focus('#next'); await page.keyboard.press('Space'); await page.waitForFunction(() => RE_NATIVE_FRAMES_R29.state().frame === 1 && RE_NATIVE_FRAMES_R29.state().displayed?.endsWith(':1'));
      const rect = await page.locator('#next').boundingBox(); assert(rect.x >= 0 && rect.x + rect.width <= 321);
      await page.screenshot({path: path.join(output, 'native-frames-320-200pct.png'), fullPage: true}); assert.deepEqual(errors, []);
      return {width: 320, everyComputedFontDoubled: true, horizontalOverflow: false, keyboardReachable: true};
    } finally {await context.close();}
  });
  await test('Changed PNG bytes are refused before any image URL or download', async () => {
    const {context, page, errors} = await scene();
    try {
      const entry = manifest.entries[0], target = entry.frames[0];
      await page.route('**/' + target.path, request => request.fulfill({contentType: 'image/png', body: Buffer.concat([fs.readFileSync(path.join(pack, target.path)), Buffer.from([0])])}));
      await page.goto(base + route); await page.waitForFunction(() => document.getElementById('assetStatus').textContent.includes('incorrecte'));
      const state = await page.evaluate(() => RE_NATIVE_FRAMES_R29.state()); assert.equal(state.displayed, null); assert.equal(state.blobUrls, 0); assert.equal(await page.locator('#download').isVisible(), false); assert.deepEqual(errors, []);
      return {corruptImageRefused: true, downloadExposed: false, blobUrls: 0};
    } finally {await context.close();}
  });
  await test('Action promotion, associated objects, mirroring and external frame paths are refused', async () => {
    const changes = [value => value.entries[0].actionIdentity = 'attack', value => value.entries[0].availableCombatStates = ['idle'], value => value.entries[0].modelRole = 'associated-object', value => value.entries[0].recipe.geometryMirrored = true, value => value.entries[0].frames[0].path = 'https://example.invalid/wrong.png'];
    for (const change of changes) {
      const {context, page, errors} = await scene();
      try {
        const value = structuredClone(manifest); change(value);
        await page.route('**/motion/manifest.json', request => request.fulfill({contentType: 'application/json', body: JSON.stringify(value)}));
        await page.goto(base + route); await page.waitForFunction(() => RE_NATIVE_FRAMES_R29.state().failed);
        assert.equal(await page.evaluate(() => RE_NATIVE_FRAMES_R29.state().displayed), null); assert.equal(await page.evaluate(() => RE_NATIVE_FRAMES_R29.state().blobUrls), 0); assert.deepEqual(errors, []);
      } finally {await context.close();}
    }
    return {hostileAttributionsRefused: 5, fabricatedCombatState: false};
  });
  await test('A late previous frame cannot replace a newly selected subject', async () => {
    const {context, page, errors} = await scene(); let release;
    try {
      const first = manifest.entries[0], next = manifest.entries.find(entry => entry.subjectId !== first.subjectId), target = first.frames[0];
      await page.route('**/' + target.path, async request => {await new Promise(resolve => release = resolve); await request.fulfill({contentType: 'image/png', body: fs.readFileSync(path.join(pack, target.path))}).catch(() => {});});
      await page.goto(base + route, {waitUntil: 'domcontentloaded'}); await page.waitForFunction(() => RE_NATIVE_FRAMES_R29.state().ready);
      for (let attempt = 0; attempt < 50 && !release; attempt++) await page.waitForTimeout(10);
      assert.equal(typeof release, 'function');
      await page.selectOption('#clip', next.id); await page.waitForFunction(id => RE_NATIVE_FRAMES_R29.state().displayed === id + ':0', next.id);
      release(); await page.waitForTimeout(75); const state = await page.evaluate(() => RE_NATIVE_FRAMES_R29.state());
      assert.equal(state.selected, next.id); assert.equal(state.displayed, next.id + ':0'); assert.equal(state.blobUrls, 1); assert.deepEqual(errors, []);
      return {selected: next.id, stalePreviousFrameInstalled: false, blobUrls: 1};
    } finally {release?.(); await context.close();}
  });
  await test('All384 exported frame payloads verify and decode, and an unknown UID stays explicit', async () => {
    const {context, page, errors} = await scene();
    try {
      await ready(page); const frames = manifest.entries.flatMap(entry => entry.frames);
      const count = await page.evaluate(async frames => {
        const digest = async raw => [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(value => value.toString(16).padStart(2, '0')).join('');
        let decoded = 0;
        for (let offset = 0; offset < frames.length; offset += 4) await Promise.all(frames.slice(offset, offset + 4).map(async frame => {
          const response = await fetch(frame.path), raw = await response.arrayBuffer(); if (raw.byteLength !== frame.bytes || await digest(raw) !== frame.sha256) throw Error('Frame hash mismatch');
          const bitmap = await createImageBitmap(new Blob([raw], {type: 'image/png'})); if (bitmap.width !== 384 || bitmap.height !== 384) throw Error('Frame decode mismatch'); bitmap.close(); decoded++;
        }));
        return decoded;
      }, frames);
      assert.equal(count, 384);
      await page.goto(base + route + '?id=re7-jack-baker'); await page.waitForFunction(() => RE_NATIVE_FRAMES_R29.state().failed);
      assert.match(await page.locator('#status').textContent(), /Aucune séquence source/); assert.equal(await page.evaluate(() => RE_NATIVE_FRAMES_R29.state().displayed), null); assert.deepEqual(errors, []);
      return {decodedSourceFrames: count, unrelatedIdentitySubstituted: false};
    } finally {await context.close();}
  });
} catch (error) {checks.push({name: 'setup', pass: false, error: error.stack});}
finally {
  await browser?.close(); server.kill('SIGTERM');
  const paths = ['modules/fidelity-r29/motion/index.html', 'modules/fidelity-r29/motion/page.js', 'modules/fidelity-r29/motion/style.css', 'modules/fidelity-r29/motion/manifest.json', 'tests/browser-native-frames-r29.mjs'];
  const report = {schema: 're.bow.native-frame-browser-r29/1', startedAt, completedAt: new Date().toISOString(), passed: checks.filter(value => value.pass).length, failed: checks.filter(value => !value.pass).length, checks, sourceFiles: paths.map(file => ({path: file, sha256: sha(fs.readFileSync(path.join(root, file)))})), physicalDevicesCertified: false, autoplay: false, originalGameFramesCertified: false};
  fs.writeFileSync(path.join(root, 'docs/R29_NATIVE_FRAMES_BROWSER.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
}
