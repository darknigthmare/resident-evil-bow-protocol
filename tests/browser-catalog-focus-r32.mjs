/** Real catalogue/engine/RAF lifecycle, trusted Chromium focus, and an explicit standard-pad fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argument = name => process.argv.find(value => value.startsWith('--' + name + '='))?.slice(name.length + 3);
const replacement = argument('catalog-source');
const override = replacement ? fs.readFileSync(path.resolve(root, replacement)) : null;
const served = new Map(), unavailable = new Set(), errors = [], checks = [];
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z6EAAAAASUVORK5CYII=', 'base64');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (/\.(png|webp|jpe?g|gif)$/i.test(pathname)) {response.setHeader('Content-Type', 'image/png'); return response.end(pixel);}
  if (pathname === '/favicon.ico') {response.statusCode = 204; return response.end();}
  if (pathname === '/r32-focus-away.html') {
    response.setHeader('Content-Type', 'text/html');
    return response.end('<!doctype html><meta charset="utf-8"><title>Other focus target</title><p>Local navigation and focus fixture.</p>');
  }
  const relative = pathname.replace(/^\/+/, ''), file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !types[path.extname(file)] || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    unavailable.add(relative); response.statusCode = 404; return response.end('Unavailable in this input lifecycle test.');
  }
  const bytes = relative === 'src/catalog-duel-v070.js' && override ? override : fs.readFileSync(file);
  served.set(relative, bytes); response.setHeader('Content-Type', types[path.extname(file)]); response.end(bytes);
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;

async function sampleFrames(page, count = 4) {
  const before = await page.evaluate(() => __catalogFocusR32.samples);
  await page.waitForFunction(value => __catalogFocusR32.samples >= value, before + count);
}
async function button(page, pressed) {
  await page.evaluate(value => {const button = __catalogFocusR32.pad.buttons[9]; button.pressed = value; button.value = Number(value);}, pressed);
}
async function observed(page) {
  return page.evaluate(() => ({paused: RE_CATALOG_DUEL.isPaused(), frame: RE_CATALOG_DUEL.getState().frame,
    hidden: document.hidden, focused: document.hasFocus(), samples: __catalogFocusR32.samples,
    startHeld: __catalogFocusR32.pad.buttons[9].pressed, events: __catalogFocusR32.events}));
}
async function start(page, mode = 'human') {
  if (mode !== 'human') await page.selectOption('#trialMode', mode);
  await page.click('#trialStart'); await page.click('#trialIntroSkip');
  await page.waitForFunction(() => !RE_CATALOG_DUEL.isPaused() && RE_CATALOG_DUEL.getState().frame >= 3);
  await sampleFrames(page);
}
async function blur(page, away) {
  // Navigation can reapply Playwright's focus emulation to the new document.
  // Disable it at the actual boundary, after the production start/skip clicks.
  for (const target of [page, away]) {
    const session = await page.context().newCDPSession(target);
    await session.send('Emulation.setFocusEmulationEnabled', {enabled: false});
  }
  await page.bringToFront();
  await page.waitForFunction(() => document.hasFocus());
  const previous = await page.evaluate(() => __catalogFocusR32.events.length);
  await away.bringToFront();
  await page.waitForFunction(index => __catalogFocusR32.events.slice(index).some(event => event.type === 'blur' && event.trusted)
    && !document.hasFocus() && !document.hidden && RE_CATALOG_DUEL.isPaused(), previous);
  return (await observed(page)).frame;
}
async function focus(page) {
  const previous = await page.evaluate(() => __catalogFocusR32.events.length);
  await page.bringToFront();
  await page.waitForFunction(index => document.hasFocus()
    && __catalogFocusR32.events.slice(index).some(event => event.type === 'focus' && event.trusted), previous);
  await sampleFrames(page);
}
async function resumeWithFreshStart(page) {
  await button(page, false); await sampleFrames(page);
  const frame = (await observed(page)).frame;
  await button(page, true);
  await page.waitForFunction(before => !RE_CATALOG_DUEL.isPaused() && RE_CATALOG_DUEL.getState().frame > before + 3, frame);
}
async function neutralTail(page, from) {
  return page.evaluate(from => {
    const value = RE_CATALOG_DUEL.exportReplay(); let cursor = 0;
    const tail = value.runs.filter(run => {const end = cursor + run[0], include = end > from; cursor = end; return include;});
    return {frames: value.frames, tail, verifiedDigest: value.stateDigest};
  }, from);
}
async function test(name, run, realFocus = true) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  context.setDefaultTimeout(10000);
  await context.addInitScript(() => {
    const pad = {id: 'R32 lifecycle standard-pad fixture', index: 0, mapping: 'standard', connected: true,
      axes: [0, 0], buttons: Array.from({length: 17}, () => ({pressed: false, value: 0}))};
    window.__catalogFocusR32 = {identity: crypto.randomUUID(), samples: 0, pad, events: [], pressStartOnPagehide: false};
    Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => {__catalogFocusR32.samples++; return [pad];}});
    for (const type of ['blur', 'focus', 'pageshow', 'pagehide', 'visibilitychange', 'keydown', 'pointerdown']) {
      addEventListener(type, event => {
        if (__catalogFocusR32.events.length < 200) __catalogFocusR32.events.push({type, trusted: event.isTrusted,
          persisted: event.persisted ?? null, hidden: document.hidden, focused: document.hasFocus(),
          code: event.code ?? null, target: event.target?.id || event.target?.dataset?.hold || null});
        if (type === 'pagehide' && __catalogFocusR32.pressStartOnPagehide) {
          // Device fixture changes after the final active RAF, at the trusted lifecycle boundary.
          pad.buttons[9].pressed = true; pad.buttons[9].value = 1;
        }
      }, {capture: true});
    }
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push({name, message: error.message}));
  let away;
  try {
    if (realFocus) {
      away = await context.newPage(); await away.goto(origin + '/r32-focus-away.html');
      // Playwright otherwise forces every headless page to appear focused. Removing that emulation
      // allows actual browser-generated blur/focus while both pages remain visible to their renderers.
      for (const target of [page, away]) {
        const session = await context.newCDPSession(target);
        await session.send('Emulation.setFocusEmulationEnabled', {enabled: false});
      }
      await page.bringToFront();
    }
    assert.equal((await page.goto(origin + '/catalog-duel.html?uid=re3r-nemesis&target=re3r-stage-2-nemesis&stage=nest2_weapon_test_2020')).status(), 200);
    await page.waitForFunction(() => !!window.RE_CATALOG_DUEL && __catalogFocusR32.samples >= 2);
    const storage = await page.evaluate(() => JSON.stringify({...localStorage}));
    const detail = await run(page, away);
    assert.equal(await page.evaluate(() => JSON.stringify({...localStorage})), storage, 'Lifecycle must not write progression');
    checks.push({name, pass: true, detail}); console.log('PASS ' + name);
  } catch (error) {
    let state = null; try {state = await observed(page);} catch {}
    checks.push({name, pass: false, error: error.stack, observed: state}); console.error('FAIL ' + name + ': ' + error.message);
  } finally {await context.close();}
}

try {
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || undefined,
    ignoreDefaultArgs: ['--disable-back-forward-cache'], args: ['--no-sandbox', '--disable-dev-shm-usage']});

  await test('A trusted visible-window blur pauses the duel and Start cannot resume it in the background', async (page, away) => {
    await start(page); const frame = await blur(page, away);
    await button(page, true); await sampleFrames(page, 6);
    const state = await observed(page);
    assert.equal(state.hidden, false); assert.equal(state.focused, false);
    assert.equal(state.paused, true, 'Start resumed a visible but unfocused duel'); assert.equal(state.frame, frame);
    return {trustedBlur: true, pageStayedVisible: true, pausedFrame: frame, backgroundStartIgnored: true, padIsFixture: true};
  });

  await test('Holding Start through a trusted focus return requires release and a new press before resuming', async (page, away) => {
    await start(page); const frame = await blur(page, away);
    await button(page, true); await sampleFrames(page);
    await focus(page); const held = await observed(page);
    assert.equal(held.paused, true, 'Held Start resumed during the focus transition'); assert.equal(held.frame, frame);
    await resumeWithFreshStart(page);
    const resumed = await observed(page); assert.equal(resumed.paused, false);
    return {trustedBlurAndFocus: true, heldStartDidNotResume: true, releaseThenNewPressResumed: true,
      pausedFrame: frame, resumedFrame: resumed.frame};
  });

  await test('Keyboard movement held before a trusted blur is cleared before voluntary resume', async (page, away) => {
    await start(page); await page.keyboard.down('KeyD');
    await page.waitForFunction(() => RE_CATALOG_DUEL.exportReplay().runs.at(-1)?.[1] & 2);
    const frame = await blur(page, away); await focus(page);
    assert.equal((await observed(page)).paused, true);
    await page.keyboard.press('KeyP');
    await page.waitForFunction(before => RE_CATALOG_DUEL.getState().frame > before + 6, frame);
    await page.keyboard.press('Escape'); await page.keyboard.up('KeyD');
    const tail = await neutralTail(page, frame);
    assert(tail.tail.length > 0); assert(tail.tail.every(run => !(run[1] & 2)), 'A pre-blur keyboard hold leaked into resumed frames');
    assert(await page.evaluate(() => __catalogFocusR32.events.some(event => event.type === 'keydown' && event.code === 'KeyD' && event.trusted)));
    return {trustedKeyboard: true, trustedBlurAndFocus: true, staleRightInputCleared: true, replayValidated: true, resumedFrames: tail.frames - frame};
  });

  await test('A captured pointer hold is cleared by a trusted blur before voluntary resume', async (page, away) => {
    await start(page); const control = page.locator('[data-hold="right"]'); await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox(); assert(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.waitForFunction(() => RE_CATALOG_DUEL.exportReplay().runs.at(-1)?.[1] & 2);
    const frame = await blur(page, away); await focus(page);
    await page.keyboard.press('KeyP');
    await page.waitForFunction(before => RE_CATALOG_DUEL.getState().frame > before + 6, frame);
    await page.keyboard.press('Escape'); await page.mouse.up();
    const tail = await neutralTail(page, frame);
    assert(tail.tail.length > 0); assert(tail.tail.every(run => !(run[1] & 2)), 'A captured pointer hold leaked into resumed frames');
    assert(await page.evaluate(() => __catalogFocusR32.events.some(event => event.type === 'pointerdown' && event.target === 'right' && event.trusted)));
    return {trustedPointer: true, trustedBlurAndFocus: true, staleRightInputCleared: true, replayValidated: true, resumedFrames: tail.frames - frame};
  });

  await test('CPU mode still pauses and resumes once per fresh Start press despite per-tick input clearing', async page => {
    await start(page, 'cpu'); await button(page, true);
    await page.waitForFunction(() => RE_CATALOG_DUEL.isPaused());
    const frame = (await observed(page)).frame; await sampleFrames(page); assert.equal((await observed(page)).frame, frame);
    await resumeWithFreshStart(page); await sampleFrames(page, 6);
    assert.equal((await observed(page)).paused, false, 'Holding Start must not pause repeatedly in CPU mode');
    await button(page, false); await sampleFrames(page); await button(page, true);
    await page.waitForFunction(() => RE_CATALOG_DUEL.isPaused());
    const replay = await page.evaluate(() => RE_CATALOG_DUEL.exportReplay());
    assert.equal(replay.setup.mode, 'cpu'); assert(replay.runs.every(run => run[1] === 0 && run[2] === -1));
    return {padIsFixture: true, freshPresses: 3, pauseResumePause: true, heldPressDidNotRepeat: true, cpuReplayValidated: true};
  });

  await test('Synthetic hidden/visible boundaries preserve pause and require a new Start press', async page => {
    await start(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
      document.dispatchEvent(new Event('visibilitychange'));
      const button = __catalogFocusR32.pad.buttons[9]; button.pressed = true; button.value = 1;
    });
    const frame = (await observed(page)).frame; await sampleFrames(page);
    assert.equal((await observed(page)).paused, true);
    await page.evaluate(() => {delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));});
    await sampleFrames(page); const restored = await observed(page);
    assert.equal(restored.paused, true); assert.equal(restored.frame, frame);
    await resumeWithFreshStart(page);
    return {syntheticVisibilityEvents: true, hiddenPropertyFixture: true, automaticResume: false, freshStartResumed: true};
  });

  await test('Real BFCache restoration retains the duel in pause and rebases a Start press made before navigation', async page => {
    await start(page);
    const identity = await page.evaluate(() => __catalogFocusR32.identity);
    await Promise.all([
      page.waitForURL(origin + '/r32-focus-away.html'),
      page.evaluate(destination => {
        // Mark the fixture to press Start at pagehide, after the final pre-navigation RAF.
        __catalogFocusR32.pressStartOnPagehide = true;
        location.href = destination;
      }, origin + '/r32-focus-away.html'),
    ]);
    await page.goBack({waitUntil: 'commit'});
    await page.waitForFunction(() => __catalogFocusR32.events.some(event => event.type === 'pageshow' && event.persisted && event.trusted));
    assert.equal(await page.evaluate(() => __catalogFocusR32.identity), identity, 'The original document must be restored, not reloaded');
    await sampleFrames(page, 6); const restored = await observed(page);
    assert.equal(restored.paused, true, 'An unseen Start edge resumed a restored document');
    const frame = restored.frame; await sampleFrames(page); assert.equal((await observed(page)).frame, frame);
    await resumeWithFreshStart(page);
    return {sameDocumentRestored: true, trustedPersistedPageShow: true, heldStartDidNotResume: true,
      pausedFrame: frame, newStartRequired: true, browserVisibilityLifecycle: true};
  }, false);
} catch (error) {
  checks.push({name: 'browser setup', pass: false, error: error.stack}); console.error(error.stack);
} finally {
  const browserVersion = browser?.version() ?? null; await browser?.close(); await new Promise(resolve => server.close(resolve));
  const missingCode = [...unavailable].filter(file => /\.(js|css|html)$/.test(file));
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  served.set('tests/browser-catalog-focus-r32.mjs', fs.readFileSync(fileURLToPath(import.meta.url)));
  const report = {schema: 're.bow.catalog-focus-browser-r32/1', observedAtUTC: new Date().toISOString(), browserVersion,
    passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length + errors.length + missingCode.length,
    checks, browserErrors: errors, missingCode, unavailableOptionalData: [...unavailable].filter(file => !missingCode.includes(file)),
    sourceOverride: replacement || null,
    inputs: [...served].sort(([a], [b]) => a.localeCompare(b)).map(([file, bytes]) => ({path: file, sha256: sha(bytes)})),
    scope: 'Delivered catalogue HTML, controllers, combat engine, replay validation and automatic RAF loop. Browser-generated visible blur/focus with focus emulation explicitly disabled, trusted keyboard/pointer events, actual BFCache restoration, and separately labelled synthetic visibility boundaries. Standard gamepad and raster images are explicit fixtures; no physical controller, touch-device, or visual-fidelity certification.'};
  const selected = argument('report') || 'qa-gamedev-r32/browser-catalog-focus.json', output = path.resolve(root, selected);
  fs.mkdirSync(path.dirname(output), {recursive: true}); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed, report: path.relative(root, output)}));
  if (report.failed) process.exitCode = 1;
}
