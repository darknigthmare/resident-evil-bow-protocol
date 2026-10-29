/** Actual catalogue buttons, trusted Chromium input and RAF combat; artwork is an explicit fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1);
const controller = 'src/catalog-duel-v070.js';
const source = path.resolve(root, arg('--source') || controller);
const output = path.resolve(root, arg('--report') || 'qa-gamedev-r32/catalog-controls.json');
const checks = [], errors = [], served = new Map(), failures = new Set();
const raster = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z6EAAAAASUVORK5CYII=', 'base64');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (/\.(png|webp|jpe?g|gif)$/i.test(pathname)) {
    response.setHeader('Content-Type', 'image/png'); return response.end(raster);
  }
  if (pathname === '/favicon.ico') {response.statusCode = 204; return response.end();}
  const relative = pathname.replace(/^\/+/, '');
  const file = relative === controller ? source : path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !types[path.extname(file)] || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    failures.add(relative); response.statusCode = 404; return response.end('Unavailable in this controls test.');
  }
  served.set(relative, file); response.setHeader('Content-Type', types[path.extname(file)]); response.end(fs.readFileSync(file));
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;
const route = '/catalog-duel.html?uid=re3r-nemesis&target=re3r-stage-2-nemesis&stage=nest2_weapon_test_2020';
const masks = {left: 1, right: 2, down: 4, guard: 8, jump: 16, dash: 32};
let browser;

async function test(name, run) {
  try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
async function scene(width) {
  const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
  await context.addInitScript(() => {
    window.__catalogControlEventsR32 = [];
    for (const type of ['keydown', 'keyup', 'click']) addEventListener(type, event => {
      const button = event.target?.closest?.('[data-hold]');
      if (button) __catalogControlEventsR32.push({type, action: button.dataset.hold,
        code: event.code ?? null, repeat: !!event.repeat, trusted: event.isTrusted});
    }, {capture: true});
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push({width, message: error.message}));
  assert.equal((await page.goto(origin + route)).status(), 200);
  await page.waitForFunction(() => !!window.RE_CATALOG_DUEL && !!window.RE_CATALOG_REPLAY);
  const storage = await page.evaluate(() => JSON.stringify({...localStorage}));
  return {context, page, storage};
}
async function start(page) {
  await page.click('#trialStart'); await page.click('#trialIntroSkip');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'trialCanvas');
  await page.waitForFunction(() => RE_CATALOG_DUEL.getState().frame >= 3);
  await page.evaluate(() => {__catalogControlEventsR32.length = 0;});
}
async function advance(page, count = 4) {
  const frame = await page.evaluate(() => RE_CATALOG_DUEL.getState().frame);
  await page.waitForFunction(({frame, count}) => RE_CATALOG_DUEL.getState().frame >= frame + count, {frame, count}, {timeout: 5000});
}
async function snapshot(page) {
  return page.evaluate(() => {
    const state = RE_CATALOG_DUEL.getState(), record = RE_CATALOG_DUEL.exportReplay();
    return {frame: state.frame, x: state.a.x, y: state.a.y, guard: state.a.block, crouch: state.a.crouch,
      airborne: !state.a.onGround, runs: record.runs, digest: record.stateDigest,
      jumps: state.events.filter(event => event.type === 'jump' && event.actor === 0).length};
  });
}
const inputFrames = (state, mask) => state.runs.reduce((sum, run) => sum + ((run[1] & mask) ? run[0] : 0), 0);
const lastMask = state => state.runs.at(-1)?.[1] ?? 0;
async function verifyReplay(page, storage) {
  // Pause through the delivered control before reading a stable export. Only playback uses manual ticks.
  if (!(await page.evaluate(() => RE_CATALOG_DUEL.isPaused()))) await page.click('#trialPause');
  const result = await page.evaluate(() => {
    const api = RE_CATALOG_DUEL, record = api.exportReplay(); api.installReplay(record); api.tick(record.frames);
    return {schema: record.schema, frames: record.frames, digestMatches: api.exportReplay().stateDigest === record.stateDigest,
      replayReadOnly: api.isReplay(), storage: JSON.stringify({...localStorage})};
  });
  assert.equal(result.schema, 're.bow.catalog-duel-replay/1'); assert.equal(result.digestMatches, true);
  assert.equal(result.replayReadOnly, true); assert.equal(result.storage, storage);
  return {frames: result.frames, verifiedReplayRoundTrip: true, localStorageUnchanged: true};
}

try {
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1280, 390]) {
    const {context, page, storage} = await scene(width);
    try {
      for (const [action, mask] of Object.entries(masks)) for (const key of ['Enter', 'Space']) {
        await test(width + ' ' + action + ' accepts ' + key + ' once per press and releases', async () => {
          try {
            await start(page); const before = await snapshot(page); await page.locator('[data-hold="' + action + '"]').focus();
            await page.keyboard.down(key); await advance(page); const held = await snapshot(page);
            await page.keyboard.down(key); await page.keyboard.down(key); await advance(page, 2);
            await page.keyboard.up(key); await advance(page); const released = await snapshot(page);
            const events = await page.evaluate(() => __catalogControlEventsR32);
            assert(inputFrames(held, mask) > 0, action + ' did not reach the real recorded combat input');
            assert.equal(lastMask(released) & mask, 0, 'Release left an active command');
            if (action === 'left') assert(held.x < before.x);
            if (action === 'right' || action === 'dash') assert(held.x > before.x);
            if (action === 'down') assert.equal(held.crouch, true);
            if (action === 'guard') assert.equal(held.guard, true);
            if (action === 'jump') {assert.equal(held.airborne, true); assert.equal(released.jumps, 1);}
            if (action === 'jump' || action === 'dash') assert.equal(inputFrames(released, mask), 1, 'Repeated keydown duplicated a discrete action');
            assert(events.some(event => event.type === 'keydown' && !event.repeat && event.trusted));
            assert(events.some(event => event.type === 'keydown' && event.repeat && event.trusted));
            assert.equal(events.filter(event => event.type === 'click').length, 0, 'Native button clicks must not duplicate the handled command');
            return {width, action, key, inputFrames: inputFrames(released, mask), trustedKeyboard: true,
              nativeDuplicateClicks: 0, ...(await verifyReplay(page, storage))};
          } finally {await page.keyboard.up(key);}
        });
      }
    } finally {await context.close();}
  }

  const {context, page, storage} = await scene(1280);
  try {
    await test('Keyboard release preserves an independent pointer hold, and pointer release clears it', async () => {
      try {
        await start(page); const guard = page.locator('[data-hold="guard"]'); await guard.focus();
        await page.keyboard.down('Space'); await advance(page); assert.equal((await snapshot(page)).guard, true);
        const rect = await guard.boundingBox(); await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.mouse.down(); await page.keyboard.up('Space'); await advance(page);
        assert.equal((await snapshot(page)).guard, true);
        await page.mouse.up(); await advance(page); assert.equal((await snapshot(page)).guard, false);
        return {independentPointerAndKeyboard: true, ...(await verifyReplay(page, storage))};
      } finally {await page.keyboard.up('Space'); await page.mouse.up();}
    });
    await test('Changing the focused element releases a keyboard hold before keyup', async () => {
      try {
        await start(page); await page.locator('[data-hold="guard"]').focus(); await page.keyboard.down('Enter');
        await advance(page); assert.equal((await snapshot(page)).guard, true);
        await page.locator('#trialStage').focus(); await advance(page); assert.equal((await snapshot(page)).guard, false);
        await page.keyboard.up('Enter');
        return {elementBlurReleases: true, ...(await verifyReplay(page, storage))};
      } finally {await page.keyboard.up('Enter');}
    });
    await test('Pause and reset discard an unfinished button hold without accepting key repeat as a new press', async () => {
      try {
        await start(page); const guard = page.locator('[data-hold="guard"]'); await guard.focus();
        await page.keyboard.down('Space'); await advance(page); assert.equal((await snapshot(page)).guard, true);
        // Programmatic activation preserves button focus here to isolate the pause clear path from element blur.
        await page.evaluate(() => document.getElementById('trialPause').click());
        assert.equal(await page.evaluate(() => RE_CATALOG_DUEL.isPaused()), true);
        await page.evaluate(() => document.getElementById('trialPause').click()); await advance(page);
        assert.equal((await snapshot(page)).guard, false);
        await page.keyboard.up('Space'); await guard.focus(); await page.keyboard.down('Space');
        await advance(page); assert.equal((await snapshot(page)).guard, true);
        await page.evaluate(() => RE_CATALOG_DUEL.reset(true)); await guard.focus();
        await page.keyboard.down('Space'); await advance(page); assert.equal((await snapshot(page)).guard, false);
        await page.keyboard.up('Space'); await page.keyboard.down('Space'); await advance(page);
        assert.equal((await snapshot(page)).guard, true); await page.keyboard.up('Space'); await advance(page);
        return {pauseClears: true, resetClears: true, repeatIgnoredAfterReset: true, ...(await verifyReplay(page, storage))};
      } finally {await page.keyboard.up('Space');}
    });
    await test('Replay installation clears a live hold and leaves disabled controls unable to change recorded input', async () => {
      try {
        await start(page); await page.locator('[data-hold="guard"]').focus(); await page.keyboard.down('Enter');
        await advance(page); assert.equal((await snapshot(page)).guard, true);
        // Import directly while the keyboard hold is still live; no pause/element blur may clear it first.
        const imported = await page.evaluate(() => {
          const api = RE_CATALOG_DUEL, record = api.exportReplay();
          const liveBeforeImport = !api.isPaused() && api.getState().a.block;
          api.installReplay(record); const startsPaused = api.isPaused(); api.tick(record.frames);
          return {liveBeforeImport, startsPaused, frames: record.frames, replayReadOnly: api.isReplay(),
            digestMatches: api.exportReplay().stateDigest === record.stateDigest, storage: JSON.stringify({...localStorage})};
        });
        assert.equal(imported.liveBeforeImport, true); assert.equal(imported.startsPaused, true);
        assert.equal(imported.replayReadOnly, true); assert.equal(imported.digestMatches, true); assert.equal(imported.storage, storage);
        assert.equal(await page.locator('[data-hold]:disabled').count(), 6);
        const digest = await page.evaluate(() => RE_CATALOG_DUEL.exportReplay().stateDigest);
        await page.keyboard.up('Enter'); await page.keyboard.press('Space');
        assert.equal(await page.evaluate(() => RE_CATALOG_DUEL.exportReplay().stateDigest), digest);
        await page.evaluate(() => RE_CATALOG_DUEL.reset(true)); await advance(page);
        assert.equal((await snapshot(page)).guard, false);
        return {disabledReplayControls: 6, importedDuringLiveHold: true, replayInputUnchanged: true, resetReleases: true,
          frames: imported.frames, verifiedReplayRoundTrip: true, localStorageUnchanged: true};
      } finally {await page.keyboard.up('Enter'); await page.keyboard.up('Space');}
    });
    await test('Main and numpad Enter remain independent holds on the same guard button', async () => {
      try {
        await start(page); await page.locator('[data-hold="guard"]').focus();
        await page.keyboard.down('Enter'); await page.keyboard.down('NumpadEnter'); await advance(page);
        assert.equal((await snapshot(page)).guard, true);
        await page.keyboard.up('Enter'); await advance(page); assert.equal((await snapshot(page)).guard, true);
        await page.keyboard.up('NumpadEnter'); await advance(page); assert.equal((await snapshot(page)).guard, false);
        const events = await page.evaluate(() => __catalogControlEventsR32);
        assert(events.some(event => event.code === 'NumpadEnter' && event.type === 'keydown' && event.trusted));
        return {numpadEnterSupported: true, independentKeyboardSources: true, ...(await verifyReplay(page, storage))};
      } finally {await page.keyboard.up('Enter'); await page.keyboard.up('NumpadEnter');}
    });
    await test('Native Tab navigation reaches an actionable hold button from the live arena', async () => {
      try {
        await start(page);
        for (let count = 0; count < 8; count++) {
          await page.keyboard.press('Tab');
          if (await page.evaluate(() => document.activeElement?.dataset.hold === 'left')) break;
        }
        assert.equal(await page.evaluate(() => document.activeElement?.dataset.hold), 'left');
        const before = await snapshot(page); await page.keyboard.down('Enter'); await advance(page);
        assert((await snapshot(page)).x < before.x); await page.keyboard.up('Enter'); await advance(page);
        return {trustedTabNavigation: true, ...(await verifyReplay(page, storage))};
      } finally {await page.keyboard.up('Enter');}
    });
  } finally {await context.close();}
} catch (error) {checks.push({name: 'browser setup', pass: false, error: error.stack}); console.error(error.stack);}
finally {
  const browserVersion = browser?.version() ?? null; await browser?.close(); await new Promise(resolve => server.close(resolve));
  const missingCode = [...failures].filter(file => /\.(js|css|html)$/.test(file));
  const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const report = {schema: 're.bow.catalog-controls-r32/1', browserVersion,
    passed: checks.filter(check => check.pass).length,
    failed: checks.filter(check => !check.pass).length + errors.length + missingCode.length,
    checks, browserErrors: errors, missingCode, unavailableOptionalData: [...failures].filter(file => !missingCode.includes(file)),
    controllerSource: {path: path.relative(root, source), sha256: hash(source)},
    inputs: [...served.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([route, file]) => ({path: route,
      ...(path.relative(root, file) !== route ? {servedFrom: path.relative(root, file)} : {}), sha256: hash(file)})),
    testSource: {path: 'tests/browser-catalog-controls-r32.mjs', sha256: hash(fileURLToPath(import.meta.url))},
    scope: 'Delivered catalogue HTML, controller, automatic RAF loop, real combat and deterministic replay validation. Trusted Chromium keyboard and mouse at 1280/390 px; pause/reset isolation cases explicitly use DOM/API activation. Raster artwork uses a one-pixel fixture. No physical-device, real assistive-technology or artistic-fidelity certification.'};
  fs.mkdirSync(path.dirname(output), {recursive: true}); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed, report: path.relative(root, output)}));
  if (report.failed) process.exitCode = 1;
}
