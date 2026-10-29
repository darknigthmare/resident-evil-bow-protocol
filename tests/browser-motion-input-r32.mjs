/** Real motion HTML, source manifests, decoded native atlases and trusted keyboard activation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'modules/fidelity-r31/motion/page.js';
const baselineCommit = '7c777b8f29292e0eded224cda2abc06ae8796bc9';
const baselineSource = execFileSync('git', ['show', baselineCommit + ':' + sourcePath], {cwd: root, encoding: 'utf8'});
const currentSource = fs.readFileSync(path.join(root, sourcePath), 'utf8');
assert.notEqual(currentSource, baselineSource, 'The delivered reader must include the reviewed keyboard correction');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const output = path.join(root, 'qa-gamedev-r32/motion-input.json');
const checks = [], pageErrors = [], missing = new Set(), inputs = {before: new Map(), after: new Map()};
let phase = 'before', servedSource = baselineSource, browser;
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2'};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (pathname === '/favicon.ico') {response.statusCode = 204; return response.end();}
  const relative = pathname.replace(/^\/+/, ''), file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !types[path.extname(file)] || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    missing.add(relative); response.statusCode = 404; return response.end('Missing source resource');
  }
  const bytes = relative === sourcePath ? Buffer.from(servedSource) : fs.readFileSync(file);
  inputs[phase].set(relative, sha(bytes));
  response.setHeader('Content-Type', types[path.extname(file)]);
  response.setHeader('Cache-Control', 'no-store'); response.end(bytes);
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;
const state = page => page.evaluate(() => RE_MOTION_REVIEW_R31.state());
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const clicks = page => page.evaluate(() => __motionKeysR32.filter(event => event.type === 'click' && event.target === 'play'));
async function paused(page, value) {await page.waitForFunction(value => RE_MOTION_REVIEW_R31.state().playing === !value, value);}
async function painted(page, frame) {await page.waitForFunction(frame => RE_MOTION_REVIEW_R31.state().paintedFrame === frame, frame);}
async function repeats(page, key, expectedPlaying, count = 2) {
  for (let n = 0; n < count; n++) {
    await page.keyboard.down(key); await settle(page);
    assert.equal((await state(page)).playing, expectedPlaying, 'An OS key repeat changed playback state');
  }
}
async function one(name, width, run) {
  const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
  context.setDefaultTimeout(10000);
  await context.addInitScript(() => {
    window.__motionKeysR32 = [];
    for (const type of ['keydown', 'keyup', 'click']) addEventListener(type, event => {
      const detail = {type, key: event.key || null, code: event.code || null, repeat: !!event.repeat,
        trusted: event.isTrusted, target: event.target?.id || null,
        ctrlKey: !!event.ctrlKey, altKey: !!event.altKey, metaKey: !!event.metaKey};
      // Observe after the target handlers; a capture-phase microtask can run too early.
      if (__motionKeysR32.length < 500) __motionKeysR32.push({...detail, defaultPrevented: event.defaultPrevented});
    });
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push({phase, width, name, error: error.message}));
  try {
    const response = await page.goto(origin + '/modules/fidelity-r31/motion/index.html?id=rerev-ooze&clip=em1000_em1000_BA_20');
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => globalThis.RE_MOTION_REVIEW_R31?.state().loaded || globalThis.RE_MOTION_REVIEW_R31?.state().error);
    assert.equal((await state(page)).error, '');
    await painted(page, 0); await page.selectOption('#speed', '0.5');
    const storage = await page.evaluate(() => JSON.stringify({...localStorage}));
    const detail = await run(page);
    assert.equal((await state(page)).error, '');
    assert.equal(await page.evaluate(() => JSON.stringify({...localStorage})), storage);
    const events = await page.evaluate(() => __motionKeysR32);
    assert(events.some(event => event.type === 'keydown' && event.trusted), 'The scenario must use trusted browser keys');
    assert(events.every(event => event.trusted), 'Recorded keyboard and click events must be browser generated');
    checks.push({phase, width, name, pass: true, detail, trustedEvents: true, storageUnchanged: true});
    console.log('PASS ' + phase + ' ' + width + ' ' + name);
  } catch (error) {
    const expectedBaselineDefect = phase === 'before' && expectedBeforeFailures.get(name)?.test(error.message) === true;
    checks.push({phase, width, name, pass: false, expectedBaselineDefect, error: error.stack});
    console.log((expectedBaselineDefect ? 'BASELINE-DEFECT ' : 'FAIL ') + phase + ' ' + width + ' ' + name + ': ' + error.message);
  } finally {await context.close();}
}
const expectedBeforeFailures = new Map([
  ['canvas-space-repeat', /An OS key repeat changed playback state/],
  ['play-enter-repeat', /An OS key repeat changed playback state/],
  ['modified-and-consumed-shortcuts', /Control must not (toggle|seek) the canvas/],
]);
let setupError = null;
try {
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const currentPhase of ['before', 'after']) {
    phase = currentPhase; servedSource = phase === 'before' ? baselineSource : currentSource;
    for (const width of [1280, 390]) {
      await one('canvas-space-repeat', width, async page => {
        await page.locator('#canvas').focus(); await page.keyboard.down('Space'); await paused(page, false);
        await repeats(page, 'Space', true);
        await page.keyboard.up('Space'); assert.equal((await state(page)).playing, true);
        await page.keyboard.down('Space'); await paused(page, true);
        await repeats(page, 'Space', false); await page.keyboard.up('Space');
        const events = await page.evaluate(() => __motionKeysR32.filter(event => event.target === 'canvas' && event.code === 'Space' && event.type === 'keydown'));
        assert(events.some(event => event.repeat)); assert(events.every(event => event.defaultPrevented));
        assert.equal((await clicks(page)).length, 0);
        return {pressStarts: true,repeatDoesNotToggle: true,newPressStops: true,nativeButtonClicks: 0};
      });
      await one('play-enter-repeat', width, async page => {
        await page.locator('#play').focus();
        for (const key of ['Enter', 'NumpadEnter']) {
          const before = (await clicks(page)).length;
          await page.keyboard.down(key); await paused(page, false);
          await repeats(page, key, true); await page.keyboard.up(key);
          assert.equal((await clicks(page)).length, before + 1, 'Enter must produce one native click at initial keydown');
          await page.keyboard.down(key); await paused(page, true);
          await repeats(page, key, false); await page.keyboard.up(key);
          assert.equal((await clicks(page)).length, before + 2, 'Fresh Enter must produce one native pause click');
        }
        const events = await page.evaluate(() => __motionKeysR32.filter(event => event.target === 'play' && event.type === 'keydown'));
        assert(events.filter(event => event.repeat).every(event => event.defaultPrevented));
        assert(events.filter(event => !event.repeat).every(event => !event.defaultPrevented));
        return {nativeEnterClicks: 4, numericEnterCovered: true, repeatedClicks: 0};
      });
      await one('play-space-native-release', width, async page => {
        await page.locator('#play').focus();
        for (const expectedPlaying of [true, false]) {
          const before = (await clicks(page)).length;
          await page.keyboard.down('Space'); await repeats(page, 'Space', !expectedPlaying);
          assert.equal((await clicks(page)).length, before, 'Space must not click before release');
          await page.keyboard.up('Space'); await paused(page, !expectedPlaying);
          assert.equal((await clicks(page)).length, before + 1, 'Space release must preserve one native activation');
        }
        return {nativeReleaseClicks: 2, beforeReleaseClicks: 0, repeatedSpacePreservesActivation: true};
      });
      await one('frame-navigation-and-native-controls', width, async page => {
        await page.locator('#canvas').focus();
        for (const frame of [1, 2, 3]) {await page.keyboard.down('ArrowRight'); await painted(page, frame);}
        await page.keyboard.up('ArrowRight');
        for (const frame of [2, 1]) {await page.keyboard.down('ArrowLeft'); await painted(page, frame);}
        await page.keyboard.up('ArrowLeft');
        const last = (await state(page)).frames - 1;
        await page.keyboard.press('End'); await painted(page, last);
        await page.keyboard.press('Home'); await painted(page, 0);
        await page.locator('#position').focus(); await page.keyboard.press('ArrowRight'); await painted(page, 1);
        await page.locator('#speed').focus(); await page.keyboard.press('ArrowDown');
        assert.equal(await page.locator('#speed').inputValue(), '1');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'speed');
        assert.equal((await state(page)).playing, false);
        const events = await page.evaluate(() => __motionKeysR32);
        assert(events.some(event => event.target === 'canvas' && event.key === 'ArrowRight' && event.repeat));
        return {repeatedFrameSteps: [1,2,3,2,1], endpoints: [last,0], nativeSliderMovedTo: 1, nativeSpeed: '1'};
      });
      await one('modified-and-consumed-shortcuts', width, async page => {
        await page.locator('#canvas').focus();
        for (const modifier of ['Control', 'Alt', 'Meta']) {
          await page.keyboard.down(modifier); await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight');
          await page.keyboard.up(modifier); await settle(page);
          const current = await state(page); assert.equal(current.playing, false, modifier + ' must not toggle the canvas');
          assert.equal(current.frame, 0, modifier + ' must not seek the canvas');
        }
        let events = await page.evaluate(() => __motionKeysR32.filter(event => event.target === 'canvas' && event.type === 'keydown' && [' ', 'ArrowRight'].includes(event.key)));
        assert.equal(events.length, 6); assert(events.every(event => !event.defaultPrevented));
        await page.evaluate(() => document.getElementById('canvas').addEventListener('keydown', event => {
          if ([' ', 'ArrowRight'].includes(event.key)) event.preventDefault();
        }, {capture: true}));
        await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight'); await settle(page);
        const current = await state(page); assert.equal(current.playing, false); assert.equal(current.frame, 0);
        events = await page.evaluate(() => __motionKeysR32.filter(event => event.target === 'canvas' && event.type === 'keydown').slice(-2));
        assert(events.every(event => event.defaultPrevented));
        return {modifierChords: 6, browserShortcutsNotConsumed: true, previouslyConsumedKeys: 2, readerStateUnchanged: true};
      });
    }
  }
} catch (error) {setupError = error.stack; console.error(error.stack);}
finally {
  const browserVersion = browser?.version() || null; await browser?.close(); await new Promise(resolve => server.close(resolve));
  const before = checks.filter(row => row.phase === 'before'), after = checks.filter(row => row.phase === 'after');
  const unexpectedBefore = before.filter(row => row.pass ? expectedBeforeFailures.has(row.name) : !row.expectedBaselineDefect);
  const complete = before.length === 10 && after.length === 10;
  const failed = after.filter(row => !row.pass).length + unexpectedBefore.length + pageErrors.length + missing.size + (setupError ? 1 : 0) + (complete ? 0 : 1);
  const report = {schema: 're.bow.motion-keyboard-browser-r32/1', observedAtUTC: new Date().toISOString(), browserVersion,
    baselineCommit, baselineControllerSha256: sha(baselineSource), currentControllerSha256: sha(currentSource),
    passed: after.filter(row => row.pass).length, failed, expectedBeforeFailures: [...expectedBeforeFailures.keys()],
    before: {passed: before.filter(row => row.pass).length, failed: before.filter(row => !row.pass).length},
    after: {passed: after.filter(row => row.pass).length, failed: after.filter(row => !row.pass).length},
    complete, unexpectedBefore, setupError, pageErrors, missingResources: [...missing], checks,
    inputs: Object.fromEntries(Object.entries(inputs).map(([name, files]) => [name, [...files].sort(([a],[b]) => a.localeCompare(b)).map(([file, digest]) => ({path: file,sha256: digest}))])),
    testSourceSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
    scope: 'Actual motion page, original reader, native manifests and SHA-verified decoded atlases. Trusted Chromium keyboard, native button click synthesis and native select/slider behavior at1280/390px. Only the page-controller source is substituted for the exact baseline phase. Baseline failures are required for the three known defects; all baseline controls and all current cases must pass. No physical-device or assistive-technology certification.'};
  fs.mkdirSync(path.dirname(output), {recursive: true}); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({suite:'motion-keyboard-r32',passed:report.passed,failed:report.failed,before:report.before,after:report.after,
    baselineCommit,baselineControllerSha256:report.baselineControllerSha256,currentControllerSha256:report.currentControllerSha256,
    browserVersion,complete,report:path.relative(root,output)}));
  if (failed) process.exitCode = 1;
}
