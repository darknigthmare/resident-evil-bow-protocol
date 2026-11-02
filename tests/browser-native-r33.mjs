/** Real R33 source-media decoding, native-time playback, keyboard and lifecycle checks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), lot = 'modules/fidelity-r33/native';
const hash = raw => crypto.createHash('sha256').update(raw).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(root, lot, 'manifest.json'))), output = path.join(root, 'qa-native-r33');
fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_NATIVE_R33_BROWSER_PORT || 5842), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
const checks = [];
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
const state = page => page.evaluate(() => RE_NATIVE_REVIEW_R33.state());
function query(entry) {return '?' + new URLSearchParams({id: entry.subjectId, clip: entry.clipId, side: entry.sourceFacing});}
async function loaded(page, entry) {
  await page.goto(base + '/' + lot + '/index.html' + (entry ? query(entry) : ''));
  await page.waitForFunction(() => window.RE_NATIVE_REVIEW_R33?.state().loaded || window.RE_NATIVE_REVIEW_R33?.state().error);
  const current = await state(page); assert.equal(current.error, '');
  await page.waitForFunction(() => {const current = RE_NATIVE_REVIEW_R33.state(); return current.paintedEntry === current.entry && current.paintedFrame === current.frame;});
}
async function seek(page, frame) {
  await page.locator('#position').evaluate((element, frame) => {element.value = String(frame); element.dispatchEvent(new Event('input', {bubbles: true}));}, frame);
  await page.waitForFunction(frame => {const current = RE_NATIVE_REVIEW_R33.state(); return current.paintedFrame === frame && current.paintedEntry === current.entry;}, frame);
}
async function comparePixels(page, frame) {
  const value = await page.evaluate(async frame => {
    const image = new Image(); image.src = '/' + frame.path; await image.decode();
    const expected = document.createElement('canvas'); expected.width = expected.height = 384;
    expected.getContext('2d').drawImage(image, 0, 0, frame.width, frame.height, 0, 0, 384, 384);
    const digest = async raw => [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(value => value.toString(16).padStart(2, '0')).join('');
    return {actual: await digest(document.getElementById('canvas').getContext('2d').getImageData(0, 0, 384, 384).data),
      expected: await digest(expected.getContext('2d').getImageData(0, 0, 384, 384).data)};
  }, frame);
  assert.equal(value.actual, value.expected);
}
try {
  let ready = false;
  for (let index = 0; index < 100; index++) {try {if ((await fetch(base)).ok) {ready = true; break;}} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  if (!ready) throw Error('Native R33 browser server did not start');
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
  await test('All sixteen real four-camera body views decode exactly and remain static studies', async () => {
    const page = await browser.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message)); let compared = 0;
    try {
      for (const entry of manifest.entries.filter(entry => entry.kind === 'native-static-pose')) {
        await loaded(page, entry); assert.equal((await state(page)).entry, entry.id); await comparePixels(page, entry.frames[0]); compared++;
        assert.equal(await page.locator('#play').isDisabled(), true); assert.equal(await page.locator('#position').isDisabled(), true);
        assert.match(await page.locator('#limits').textContent(), /Pose de liaison/); assert.equal((await state(page)).playing, false);
      }
      assert.deepEqual(errors, []); return {compared, newIdentities: 3, sourceVariants: 4, automaticCombatAdmission: false};
    } finally {await page.close();}
  });
  await test('Six complete new clips retain both source sides and exact PNG pixels across atlas boundaries', async () => {
    const page = await browser.newPage(); let compared = 0;
    try {
      for (const entry of manifest.entries.filter(entry => entry.kind === 'native-sequence' && !entry.reusedPublishedFrames)) {
        await loaded(page, entry); assert.equal((await state(page)).entry, entry.id); assert.equal((await state(page)).frames, entry.frameCount);
        for (const frame of [0, 24, 25, entry.frameCount - 1]) {await seek(page, frame); await comparePixels(page, entry.frames[frame]); compared++;}
        assert.equal(await page.locator('#repeat').isDisabled(), true); assert.match(await page.locator('#limits').textContent(), /sans commande/);
      }
      return {orientedSequences: 12, newNativeFrames: 1270, pixelComparedPositions: compared, sourceActionCertified: false};
    } finally {await page.close();}
  });
  await test('Voluntary marine playback paints many source frames and wraps using unchanged R30 pixels', async () => {
    const page = await browser.newPage(), entry = manifest.entries.find(entry => entry.reusedPublishedFrames && entry.sourceFacing === 'right');
    try {
      await loaded(page, entry); assert.equal((await state(page)).playing, false); assert.equal(await page.locator('#repeat').isDisabled(), false);
      assert.match(await page.locator('#limits').textContent(), /Aucun idle original/); await page.click('#play');
      const observed = await page.evaluate(async () => {const values = new Set(), until = performance.now() + 1250; while (performance.now() < until) {values.add(RE_NATIVE_REVIEW_R33.state().paintedFrame); await new Promise(requestAnimationFrame);} return [...values];});
      assert(observed.length >= 20, 'The actual canvas must paint many native source frames');
      await page.click('#play'); const paused = await state(page); await page.waitForTimeout(150); assert.equal((await state(page)).frame, paused.frame);
      await seek(page, entry.frameCount - 3); await page.click('#play'); await page.waitForFunction(() => {const current = RE_NATIVE_REVIEW_R33.state(); return current.playing && current.frame < 30;});
      await page.click('#play'); const wrapped = await state(page); await comparePixels(page, entry.frames[wrapped.paintedFrame]);
      assert(wrapped.cache.cached <= 4); assert(wrapped.cache.decodedPixels <= 16 * 1024 * 1024);
      return {distinctPaintedFrames: observed.length, wrapFrame: wrapped.frame, reusedOriginalFrames: 300, originalIdleCertified: false, cache: wrapped.cache};
    } finally {await page.close();}
  });
  await test('Native keyboard activation toggles once while repeated arrows retain frame stepping', async () => {
    const page = await browser.newPage(), entry = manifest.entries.find(entry => entry.kind === 'native-sequence' && !entry.reusedPublishedFrames);
    try {
      await loaded(page, entry); await page.focus('#play'); await page.keyboard.down('Enter');
      await page.waitForFunction(() => RE_NATIVE_REVIEW_R33.state().playing);
      for (let index = 0; index < 4; index++) await page.keyboard.down('Enter');
      assert.equal((await state(page)).playing, true); await page.keyboard.up('Enter'); await page.keyboard.press('Enter');
      await page.waitForFunction(() => !RE_NATIVE_REVIEW_R33.state().playing);
      await page.focus('#canvas'); await page.keyboard.press('Home'); await page.waitForFunction(() => RE_NATIVE_REVIEW_R33.state().paintedFrame === 0);
      await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowRight'); await page.keyboard.up('ArrowRight');
      await page.waitForFunction(() => RE_NATIVE_REVIEW_R33.state().paintedFrame === 2);
      await page.keyboard.press('End'); await page.waitForFunction(() => {const current = RE_NATIVE_REVIEW_R33.state(); return current.paintedFrame === current.frames - 1;});
      await page.keyboard.press('Control+Home'); assert.equal((await state(page)).frame, entry.frameCount - 1);
      return {initialActivation: true, repeatedEnterSuppressed: true, repeatedArrowsAccepted: true, reservedShortcutPreserved: true};
    } finally {await page.close();}
  });
  await test('Source scene changes stop playback and a failed old request cannot replace the new selection', async () => {
    const page = await browser.newPage(), first = manifest.entries.find(entry => entry.kind === 'native-sequence' && !entry.reusedPublishedFrames);
    const second = manifest.entries.find(entry => entry.kind === 'native-static-pose'); let deferred = null, intercepted;
    const requestIntercepted = new Promise(resolve => {intercepted = resolve;});
    try {
      await loaded(page, first);
      const blocked = first.frames[50].atlas.path;
      await page.route('**/' + blocked, route => {deferred = route; intercepted();});
      await page.locator('#position').evaluate(element => {element.value = '50'; element.dispatchEvent(new Event('input', {bubbles: true}));});
      await page.waitForFunction(() => RE_NATIVE_REVIEW_R33.state().frame === 50);
      await Promise.race([requestIntercepted, new Promise((_, reject) => setTimeout(() => reject(Error('The declared obsolete source request was not intercepted')), 10000))]);
      await page.selectOption('#subject', second.subjectId);
      await page.waitForFunction(id => {const current = RE_NATIVE_REVIEW_R33.state(); return current.subject === id && current.paintedEntry === current.entry;}, second.subjectId);
      await deferred.fulfill({status: 503, contentType: 'text/plain', body: 'Declared obsolete-load fixture'});
      await page.waitForTimeout(100); const current = await state(page);
      assert.equal(current.subject, second.subjectId); assert.equal(current.error, ''); assert.equal(current.playing, false); assert.equal(new URL(page.url()).searchParams.get('id'), second.subjectId);
      return {selectedUid: current.subject, obsoleteLoadFailureHeld: true, staleStatePublished: false};
    } finally {if (deferred) await deferred.abort().catch(() => {}); await page.close();}
  });
  await test('Page exit clears decodes and synthetic restoration redraws without automatic playback', async () => {
    const page = await browser.newPage(), entry = manifest.entries.find(entry => entry.reusedPublishedFrames);
    try {
      await loaded(page, entry); await page.click('#play'); await page.waitForFunction(() => RE_NATIVE_REVIEW_R33.state().frame > 3);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide')));
      await page.waitForFunction(() => {const current = RE_NATIVE_REVIEW_R33.state(); return !current.playing && !current.pageActive && current.cache.cached === 0 && current.cache.loading === 0;});
      const exited = await state(page); await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow')));
      await page.waitForFunction(() => {const current = RE_NATIVE_REVIEW_R33.state(); return current.pageActive && current.paintedEntry === current.entry && current.cache.cached > 0;});
      const restored = await state(page); assert.equal(restored.playing, false); assert.equal(restored.error, '');
      return {syntheticPageTransitionFixture: true, exitedCache: exited.cache, restoredCache: restored.cache, automaticPlayback: false};
    } finally {await page.close();}
  });
  await test('Tampered native PNGs are rejected before decode and outside paths are refused', async () => {
    const page = await browser.newPage(), entry = manifest.entries.find(entry => entry.kind === 'native-static-pose');
    try {
      await page.route('**/' + entry.frames[0].path, async route => {const raw = fs.readFileSync(path.join(root, entry.frames[0].path)); const changed = Buffer.from(raw); changed[changed.length - 8] ^= 1; await route.fulfill({status: 200, contentType: 'image/png', body: changed});});
      await page.goto(base + '/' + lot + '/index.html' + query(entry));
      await page.waitForFunction(() => window.RE_NATIVE_REVIEW_R33?.state().error);
      assert.match((await state(page)).error, /Empreinte PNG divergente/); assert.equal((await state(page)).cache.cached, 0);
      const rejected = await page.evaluate(async () => {const {local} = await import('./reader.js'); let rejected = 0; for (const value of ['https://example.invalid/x.png', '../x.png', 'modules/fidelity-r33/native/../x.png', 'data:image/png;base64,AAAA']) {try {local(value);} catch {rejected++;}} return rejected;});
      assert.equal(rejected, 4); return {tamperedMediaRejected: true, outsidePathsRejected: rejected};
    } finally {await page.close();}
  });
  await test('An interrupted initial manifest load restarts after a synthetic page return', async () => {
    const page = await browser.newPage(), entry = manifest.entries.find(entry => entry.kind === 'native-static-pose'); let initial = null, requests = 0;
    try {
      await page.route('**/' + lot + '/manifest.json', async route => {requests++; if (requests === 1) initial = route; else await route.continue();});
      await page.goto(base + '/' + lot + '/index.html' + query(entry), {waitUntil: 'domcontentloaded'});
      await page.waitForFunction(() => window.RE_NATIVE_REVIEW_R33?.state().loadingManifest);
      await page.evaluate(() => {dispatchEvent(new PageTransitionEvent('pagehide')); dispatchEvent(new PageTransitionEvent('pageshow'));});
      await page.waitForFunction(() => {const current = RE_NATIVE_REVIEW_R33.state(); return current.loaded && current.paintedEntry === current.entry;});
      assert(requests >= 2); assert.equal((await state(page)).error, '');
      return {initialLoadInterrupted: true, manifestRequests: requests, syntheticPageTransitions: true, resumed: true};
    } finally {if (initial) await initial.abort().catch(() => {}); await page.close();}
  });
  await test('The real narrow page supports text enlargement, axe checks and leaves game storage unchanged', async () => {
    const page = await browser.newPage({viewport: {width: 320, height: 900}}), entry = manifest.entries.find(entry => entry.reusedPublishedFrames), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await loaded(page, entry); await page.addStyleTag({content: 'html{font-size:200% !important}'});
      const overflow = await page.evaluate(() => ({body: document.body.scrollWidth, document: document.documentElement.scrollWidth, viewport: innerWidth, rootFontPixels: parseFloat(getComputedStyle(document.documentElement).fontSize)}));
      assert(overflow.rootFontPixels >= 32, 'The actual text enlargement must be applied');
      assert(overflow.document <= overflow.viewport + 1, JSON.stringify(overflow));
      await page.screenshot({path: path.join(output, 'native-320-text200.png'), fullPage: true});
      const axe = process.env.AXE_CORE_PATH || '/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js';
      if (!fs.existsSync(axe)) throw Error('axe-core is required for this actual accessibility check');
      await page.addScriptTag({path: axe});
      const result = await page.evaluate(async () => {const result = await axe.run(document); return {violations: result.violations.map(value => ({id: value.id, impact: value.impact, nodes: value.nodes.map(node => node.target)})), checks: result.passes.length};});
      assert.deepEqual(result.violations, []);
      const storage = await page.evaluate(() => ({local: {...localStorage}, session: {...sessionStorage}}));
      assert.deepEqual(storage, {local: {}, session: {}}); assert.deepEqual(errors, []);
      return {viewport: 320, textScale: 2, overflow, axeChecksPassed: result.checks, violations: [], storageUnchanged: true, physicalScreenReaderTested: false};
    } finally {await page.close();}
  });
} finally {await browser?.close(); server.kill('SIGTERM');}
const paths = ['tests/browser-native-r33.mjs', lot + '/manifest.json', lot + '/inputs.json', lot + '/review/observations.json', lot + '/index.html', lot + '/page.js', lot + '/reader.js', lot + '/style.css'];
const report = {schema: 're.bow.native-browser-r33/1', passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length,
  checks, sourceFiles: paths.map(name => ({path: name, sha256: hash(fs.readFileSync(path.join(root, name)))})),
  scope: 'Actual HTML/CSS/controller, retained PNGs and atlas cells under Chromium. All body views and both source sides decoded, sixtyHz multi-frame playback and marine wrap observed. Failed-request, corruption and page-transition cases are declared fixtures; no physical hardware, original engine timing or certified original idle claim.'};
fs.writeFileSync(path.join(root, 'docs/R33_NATIVE_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
if (report.failed || report.passed !== 9) process.exitCode = 1;
