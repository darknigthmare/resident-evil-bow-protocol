/** R32 evolution input regression: exact prior controller versus current source.
 * Eight groups use automatic RAF; the two eligibility groups explicitly simulate RAF.
 * The unchanged 16-group R28 browser recipe is then run on the current checkout.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = 'a8e8996d2a1d50fc99872bf02e4420b44b81167a';
const controller = 'modules/fidelity-r28/evolutions/duel.js';
const mode = '/modules/fidelity-r28/evolutions/index.html';
const previousSource = execFileSync('git', ['show', baseline + ':' + controller], {cwd: root});
const currentSource = fs.readFileSync(path.join(root, controller));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const output = path.join(root, 'qa-gamedev-r32');
fs.mkdirSync(output, {recursive: true});
const served = new Map(), unavailable = new Set(), errors = [], checks = [];
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z6EAAAAASUVORK5CYII=', 'base64');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
let phase = 'before', browser;
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (/\.(png|webp|jpe?g|gif)$/i.test(pathname)) {response.setHeader('Content-Type', 'image/png'); return response.end(pixel);}
  if (pathname === '/favicon.ico') {response.statusCode = 204; return response.end();}
  if (pathname === '/r32-evolution-away.html') {
    response.setHeader('Content-Type', 'text/html');
    return response.end('<!doctype html><meta charset="utf-8"><title>Other focus target</title><p>Local focus and navigation fixture.</p>');
  }
  const relative = pathname.replace(/^\/+/, ''), file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !types[path.extname(file)] || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    unavailable.add(relative); response.statusCode = 404; return response.end('Unavailable in this input regression.');
  }
  const bytes = relative === controller ? (phase === 'before' ? previousSource : currentSource) : fs.readFileSync(file);
  served.set(phase + ':' + relative, {phase, path: relative, sha256: hash(bytes)});
  response.setHeader('Content-Type', types[path.extname(file)]); response.end(bytes);
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;

async function sampled(page, count = 4) {
  if (await page.evaluate(() => __evolutionInputR32.manualClock)) {
    await page.evaluate(count => {for (let n = 0; n < count; n++) __evolutionInputR32.pump();}, count);
    return;
  }
  const before = await page.evaluate(() => __evolutionInputR32.samples);
  await page.waitForFunction(value => __evolutionInputR32.samples >= value, before + count);
}
async function padButton(page, index, pressed) {
  await page.evaluate(({index, pressed}) => {
    const button = __evolutionInputR32.pad.buttons[index]; button.pressed = pressed; button.value = Number(pressed);
  }, {index, pressed});
}
async function observed(page) {
  return page.evaluate(() => ({paused: RE_EVOLUTION_DUEL_R28.isPaused(), frame: RE_EVOLUTION_DUEL_R28.getState().frame,
    hidden: document.hidden, focused: document.hasFocus(), samples: __evolutionInputR32.samples,
    uid: RE_EVOLUTION_DUEL_R28.getState().a.f.uid, history: RE_EVOLUTION_DUEL_R28.getState().evolutionsR28.history.length,
    events: __evolutionInputR32.events}));
}
async function start(page, mode = 'human') {
  if (mode !== 'human') await page.selectOption('#trialMode', mode);
  await page.click('#trialStart'); await page.click('#trialIntroSkip');
  await page.waitForFunction(() => !RE_EVOLUTION_DUEL_R28.isPaused() && RE_EVOLUTION_DUEL_R28.getState().frame >= 3);
  await sampled(page);
}
async function advance(page, count = 4) {
  const frame = (await observed(page)).frame;
  await page.waitForFunction(({frame, count}) => RE_EVOLUTION_DUEL_R28.getState().frame >= frame + count, {frame, count});
}
async function blur(page, away) {
  // Navigation and start clicks can restore Playwright focus emulation. Disable it at this actual boundary.
  for (const target of [page, away]) {
    const session = await page.context().newCDPSession(target);
    await session.send('Emulation.setFocusEmulationEnabled', {enabled: false});
  }
  await page.bringToFront();
  await page.waitForFunction(() => document.hasFocus(), undefined, {polling: 50});
  const previous = await page.evaluate(() => __evolutionInputR32.events.length);
  await away.bringToFront();
  await page.waitForFunction(index => __evolutionInputR32.events.slice(index).some(event => event.type === 'blur' && event.trusted)
    && !document.hasFocus() && !document.hidden && RE_EVOLUTION_DUEL_R28.isPaused(), previous, {polling: 50});
  return (await observed(page)).frame;
}
async function focus(page) {
  const previous = await page.evaluate(() => __evolutionInputR32.events.length);
  await page.bringToFront();
  await page.waitForFunction(index => document.hasFocus()
    && __evolutionInputR32.events.slice(index).some(event => event.type === 'focus' && event.trusted), previous, {polling: 50});
  await sampled(page);
}
async function freshStart(page) {
  await padButton(page, 9, false); await sampled(page);
  const frame = (await observed(page)).frame;
  await padButton(page, 9, true);
  await page.waitForFunction(frame => !RE_EVOLUTION_DUEL_R28.isPaused() && RE_EVOLUTION_DUEL_R28.getState().frame > frame + 3, frame);
}
async function snapshot(page) {
  return page.evaluate(() => {
    const api = RE_EVOLUTION_DUEL_R28, state = api.getState(), record = api.exportReplay();
    return {frame: state.frame, guard: state.a.block, airborne: !state.a.onGround, runs: record.runs,
      jumps: state.events.filter(event => event.type === 'jump' && event.actor === 0).length};
  });
}
const inputFrames = (state, mask) => state.runs.reduce((sum, run) => sum + ((run[1] & mask) ? run[0] : 0), 0);
async function replayRoundTrip(page) {
  return page.evaluate(() => {
    const api = RE_EVOLUTION_DUEL_R28;
    if (!api.isPaused()) document.getElementById('trialPause').click();
    const record = api.exportReplay(); api.installReplay(record); api.tick(record.frames);
    const digest = RE_EVOLUTION_REPLAY_R28.seal(api.getState());
    return {schema: record.schema, frames: record.frames, digest, expected: record.stateDigest,
      readOnly: api.isReplay(), contract: record.contract};
  });
}
async function verifiedReplay(page) {
  const record = await replayRoundTrip(page);
  assert.equal(record.schema, 're.bow.evolution-duel-replay/1');
  assert.equal(record.digest, record.expected); assert.equal(record.readOnly, true);
  return {frames: record.frames, digest: record.digest, contract: record.contract, replayRoundTrip: true};
}
async function reachEligibility(page) {
  const result = await page.evaluate(() => {
    const api = RE_EVOLUTION_DUEL_R28; api.reset(true); const state = api.getState();
    while (state.frame < 3000 && !state.finished && RE_EVOLUTIONS_R28.reason(state, 0, 're2r-super-tyrant'))
      api.tick(1, {held: {}, edges: []});
    api.draw();
    return {frame: state.frame, uid: state.a.f.uid, life: state.a.life, meter: state.a.meter,
      reason: RE_EVOLUTIONS_R28.reason(state, 0, 're2r-super-tyrant'),
      ready: !document.getElementById('evolutionApply0R28').disabled};
  });
  assert.equal(result.frame, 678); assert.equal(result.uid, 're2r-tyrant');
  assert.equal(result.reason, null); assert.equal(result.ready, true);
  await sampled(page);
  return result;
}
const scenarios = [
  {
    id: 'visible-blur-start', realFocus: true, defect: 'Start resumed a visible but unfocused evolution duel',
    async run(page, away) {
      await start(page); const frame = await blur(page, away);
      await padButton(page, 9, true); await sampled(page, 6);
      const state = await observed(page);
      assert.equal(state.hidden, false); assert.equal(state.focused, false);
      assert.equal(state.paused, true, this.defect); assert.equal(state.frame, frame);
      return {trustedVisibleBlur: true, backgroundStartIgnored: true, pausedFrame: frame};
    },
  },
  {
    id: 'held-start-focus-return', realFocus: true, defect: 'Held Start resumed during the evolution focus transition',
    async run(page, away) {
      await start(page); const frame = await blur(page, away);
      await padButton(page, 9, true); await sampled(page);
      await focus(page); const held = await observed(page);
      assert.equal(held.paused, true, this.defect); assert.equal(held.frame, frame);
      await freshStart(page);
      return {trustedBlurAndFocus: true, oldStartIgnored: true, freshPressResumed: true};
    },
  },
  {
    id: 'bfcache-start-boundary', defect: 'An unseen Start edge resumed the restored evolution document',
    async run(page) {
      await start(page);
      const identity = await page.evaluate(() => __evolutionInputR32.identity);
      await Promise.all([
        page.waitForURL(origin + '/r32-evolution-away.html'),
        page.evaluate(destination => {__evolutionInputR32.pressStartOnPagehide = true; location.href = destination;}, origin + '/r32-evolution-away.html'),
      ]);
      await page.goBack({waitUntil: 'commit'});
      await page.waitForFunction(() => __evolutionInputR32.events.some(event => event.type === 'pageshow' && event.persisted && event.trusted));
      assert.equal(await page.evaluate(() => __evolutionInputR32.identity), identity, 'BFCache must restore the same document');
      await sampled(page, 6); const state = await observed(page);
      assert.equal(state.paused, true, this.defect);
      await sampled(page); assert.equal((await observed(page)).frame, state.frame);
      await freshStart(page);
      return {sameDocumentRestored: true, trustedPersistedPageShow: true, oldStartIgnored: true, freshPressResumed: true};
    },
  },
  {
    id: 'cpu-fresh-start',
    async run(page) {
      await start(page, 'cpu'); await padButton(page, 9, true);
      await page.waitForFunction(() => RE_EVOLUTION_DUEL_R28.isPaused());
      const frame = (await observed(page)).frame; await sampled(page, 6);
      assert.equal((await observed(page)).frame, frame);
      await freshStart(page); await sampled(page, 6);
      assert.equal((await observed(page)).paused, false);
      await padButton(page, 9, false); await sampled(page); await padButton(page, 9, true);
      await page.waitForFunction(() => RE_EVOLUTION_DUEL_R28.isPaused());
      const record = await page.evaluate(() => RE_EVOLUTION_DUEL_R28.exportReplay());
      assert.equal(record.setup.mode, 'cpu'); assert(record.runs.every(run => run[1] === 0 && run[2] === -1));
      return {pauseResumePause: true, freshPresses: 3, noRepeatedToggle: true, ...(await verifiedReplay(page))};
    },
  },
  {
    id: 'held-select-voluntary-evolution', realFocus: true, manualClock: true,
    async run(page, away) {
      const natural = await reachEligibility(page); await blur(page, away);
      await padButton(page, 8, true); await sampled(page);
      await focus(page);
      await page.keyboard.press('KeyP'); await sampled(page);
      let state = await observed(page);
      assert.equal(state.paused, false); assert.equal(state.uid, 're2r-tyrant'); assert.equal(state.history, 0);
      assert.deepEqual(await page.evaluate(() => RE_EVOLUTIONS_R28.commands(RE_EVOLUTION_DUEL_R28.getState())), [null, null]);
      await padButton(page, 8, false); await sampled(page);
      await padButton(page, 8, true); await sampled(page);
      assert.deepEqual(await page.evaluate(() => RE_EVOLUTIONS_R28.commands(RE_EVOLUTION_DUEL_R28.getState())), ['re2r-super-tyrant', null]);
      const applied = await page.evaluate(() => {
        const api = RE_EVOLUTION_DUEL_R28; api.tick(1, {held: {}, edges: []}); api.draw();
        const state = api.getState(), record = api.exportReplay();
        return {uid: state.a.f.uid, life: state.a.life, meter: state.a.meter, history: state.evolutionsR28.history.length,
          commands: record.runs.filter(run => run[3] !== null).map(run => run[3])};
      });
      assert.equal(applied.uid, 're2r-super-tyrant'); assert.equal(applied.life, natural.life);
      assert.equal(applied.meter, natural.meter - 35); assert.equal(applied.history, 1);
      assert.deepEqual(applied.commands, ['re2r-super-tyrant']);
      await sampled(page);
      assert.deepEqual(await page.evaluate(() => RE_EVOLUTIONS_R28.commands(RE_EVOLUTION_DUEL_R28.getState())), [null, null]);
      return {natural, heldSelectIgnored: true, freshSelectAppliedOnce: true, simulatedAnimationClock: true,
        healthOrResourceOverrides: 0, ...(await verifiedReplay(page))};
    },
  },
  {
    id: 'blur-cancels-pending-evolution', realFocus: true, manualClock: true,
    async run(page, away) {
      const natural = await reachEligibility(page);
      await page.keyboard.press('KeyV');
      assert.deepEqual(await page.evaluate(() => RE_EVOLUTIONS_R28.commands(RE_EVOLUTION_DUEL_R28.getState())), ['re2r-super-tyrant', null]);
      const frame = await blur(page, away);
      assert.deepEqual(await page.evaluate(() => RE_EVOLUTIONS_R28.commands(RE_EVOLUTION_DUEL_R28.getState())), [null, null]);
      await focus(page); assert.equal((await observed(page)).paused, true);
      await page.keyboard.press('KeyP'); await sampled(page);
      await page.evaluate(() => {RE_EVOLUTION_DUEL_R28.tick(1, {held: {}, edges: []}); RE_EVOLUTION_DUEL_R28.draw();});
      const state = await observed(page);
      assert.equal(state.uid, 're2r-tyrant'); assert.equal(state.history, 0); assert.equal(state.frame, frame + 1);
      return {natural, trustedKeyboardAndBlur: true, pendingMutationCancelled: true, simulatedAnimationClock: true,
        healthOrResourceOverrides: 0, ...(await verifiedReplay(page))};
    },
  },
];
for (const width of [1280, 390]) {
  scenarios.push({
    id: 'native-enter-space-' + width, width,
    async run(page) {
      const evidence = [];
      for (const key of ['Enter', 'Space']) {
        await start(page);
        await page.locator('[data-hold="guard"]').focus();
        await page.keyboard.down(key); await advance(page); assert.equal((await snapshot(page)).guard, true);
        await page.keyboard.down(key); await advance(page);
        await page.keyboard.up(key); await advance(page); assert.equal((await snapshot(page)).guard, false);
        // An element focus change must release the hold even before its keyup arrives.
        await page.keyboard.down(key); await advance(page); assert.equal((await snapshot(page)).guard, true);
        await page.locator('#trialStage').focus(); await advance(page); assert.equal((await snapshot(page)).guard, false);
        await page.keyboard.up(key);
        await start(page); await page.locator('[data-hold="jump"]').focus();
        await page.keyboard.down(key); await advance(page); assert.equal((await snapshot(page)).airborne, true);
        await page.keyboard.down(key); await page.keyboard.down(key); await advance(page);
        await page.keyboard.up(key); await advance(page);
        const jumped = await snapshot(page);
        assert.equal(inputFrames(jumped, 16), 1); assert.equal(jumped.jumps, 1);
        evidence.push({key, guardReleaseAndBlur: true, jumpInputFrames: 1, ...(await verifiedReplay(page))});
      }
      const events = await page.evaluate(() => __evolutionInputR32.events);
      assert(events.some(event => event.type === 'keydown' && event.repeat && event.trusted));
      assert(!events.some(event => event.type === 'click' && event.action), 'Handled hold buttons must not emit duplicate native clicks');
      return {width, trustedKeyboard: true, evidence};
    },
  });
  scenarios.push({
    id: 'numpad-enter-sources-' + width, width, defect: 'NumpadEnter did not hold the evolution guard button',
    async run(page) {
      await start(page); const guard = page.locator('[data-hold="guard"]'); await guard.focus();
      await page.keyboard.down('NumpadEnter'); await advance(page);
      assert.equal((await snapshot(page)).guard, true, this.defect);
      await page.keyboard.down('NumpadEnter'); await page.keyboard.down('Enter'); await advance(page);
      await page.keyboard.up('NumpadEnter'); await advance(page); assert.equal((await snapshot(page)).guard, true);
      await page.keyboard.down('NumpadEnter'); await page.keyboard.up('Enter'); await advance(page);
      assert.equal((await snapshot(page)).guard, true);
      await page.keyboard.up('NumpadEnter'); await advance(page); assert.equal((await snapshot(page)).guard, false);
      // A real pointer remains an independent source when the numpad key is released.
      await guard.scrollIntoViewIfNeeded(); await guard.focus(); await page.keyboard.down('NumpadEnter');
      const box = await guard.boundingBox(); assert(box);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
      await page.keyboard.up('NumpadEnter'); await advance(page); assert.equal((await snapshot(page)).guard, true);
      await page.mouse.up(); await advance(page); assert.equal((await snapshot(page)).guard, false);
      const guardReplay = await verifiedReplay(page);
      await start(page); await page.locator('[data-hold="jump"]').focus();
      await page.keyboard.down('NumpadEnter'); await advance(page); assert.equal((await snapshot(page)).airborne, true);
      await page.keyboard.down('NumpadEnter'); await page.keyboard.down('NumpadEnter'); await advance(page);
      await page.keyboard.up('NumpadEnter'); await advance(page);
      const jumped = await snapshot(page); assert.equal(inputFrames(jumped, 16), 1); assert.equal(jumped.jumps, 1);
      const events = await page.evaluate(() => __evolutionInputR32.events);
      assert(events.some(event => event.type === 'keydown' && event.code === 'NumpadEnter' && event.trusted));
      assert(events.some(event => event.type === 'pointerdown' && event.action === 'guard' && event.trusted));
      assert(!events.some(event => event.type === 'click' && event.action === 'jump'));
      return {width, independentEnterAndNumpad: true, independentPointer: true, jumpInputFrames: 1, guardReplay, ...(await verifiedReplay(page))};
    },
  });
}

async function runScenario(scenario) {
  const label = phase + ' ' + scenario.id;
  let context, page;
  try {
    context = await browser.newContext({viewport: {width: scenario.width || 1280, height: 1000}, reducedMotion: 'reduce'});
    context.setDefaultTimeout(10000);
    await context.addInitScript(({manualClock}) => {
      const callbacks = new Map(); let next = 1;
      const pad = {id: 'R32 evolution standard-pad fixture', index: 0, mapping: 'standard', connected: true,
        axes: [0, 0], buttons: Array.from({length: 17}, () => ({pressed: false, value: 0}))};
      window.__evolutionInputR32 = {identity: crypto.randomUUID(), samples: 0, pad, events: [], manualClock,
        pressStartOnPagehide: false, pump() {
          const pending = [...callbacks.values()]; callbacks.clear(); for (const callback of pending) callback(0);
        }};
      if (manualClock) {
        window.requestAnimationFrame = callback => {const id = next++; callbacks.set(id, callback); return id;};
        window.cancelAnimationFrame = id => callbacks.delete(id);
      }
      Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => {__evolutionInputR32.samples++; return [pad];}});
      for (const type of ['blur', 'focus', 'pageshow', 'pagehide', 'visibilitychange', 'keydown', 'keyup', 'pointerdown', 'click']) {
        addEventListener(type, event => {
          if (__evolutionInputR32.events.length < 600) __evolutionInputR32.events.push({type, trusted: event.isTrusted,
            persisted: event.persisted ?? null, hidden: document.hidden, focused: document.hasFocus(),
            code: event.code ?? null, repeat: !!event.repeat, action: event.target?.closest?.('[data-hold]')?.dataset?.hold || null});
          if (type === 'pagehide' && __evolutionInputR32.pressStartOnPagehide) {
            pad.buttons[9].pressed = true; pad.buttons[9].value = 1;
          }
        }, {capture: true});
      }
    }, {manualClock: !!scenario.manualClock});
    page = await context.newPage(); page.on('pageerror', error => errors.push({phase, scenario: scenario.id, message: error.message}));
    let away;
    if (scenario.realFocus) {
      away = await context.newPage(); await away.goto(origin + '/r32-evolution-away.html'); await page.bringToFront();
    }
    const route = scenario.manualClock ? mode : mode + '?uid=re3r-nemesis&target=re3r-stage-2-nemesis&stage=nest2_weapon_test_2020';
    assert.equal((await page.goto(origin + route, {waitUntil: 'load'})).status(), 200);
    await page.waitForFunction(() => !!window.RE_EVOLUTION_DUEL_R28 && !!window.RE_EVOLUTION_REPLAY_R28, undefined, {polling: 50});
    await sampled(page);
    const storage = await page.evaluate(() => JSON.stringify({...localStorage}));
    const detail = await scenario.run(page, away);
    assert.equal(await page.evaluate(() => JSON.stringify({...localStorage})), storage, 'Input lifecycle must not write progression');
    if (phase === 'before' && scenario.defect) throw new Error('Expected baseline defect did not reproduce: ' + scenario.defect);
    checks.push({phase, scenario: scenario.id, outcome: 'pass', detail}); console.log('PASS ' + label);
  } catch (error) {
    // Only the specified assertion is a baseline witness. Setup, navigation, timeout and page errors never qualify.
    const expected = phase === 'before' && scenario.defect && error.code === 'ERR_ASSERTION'
      && error.message.split('\n')[0] === scenario.defect;
    let state = null; try {if (page) state = await observed(page);} catch {}
    checks.push({phase, scenario: scenario.id, outcome: expected ? 'baseline-defect' : 'failure', error: error.stack, observed: state});
    console[expected ? 'log' : 'error']((expected ? 'BASELINE-DEFECT ' : 'FAIL ') + label + ': ' + error.message);
  } finally {await context?.close();}
}

function runExistingR28() {
  const historicalReport = path.join(root, 'docs/R28_EVOLUTIONS_BROWSER.json');
  const hadReport = fs.existsSync(historicalReport), original = hadReport ? fs.readFileSync(historicalReport) : null;
  const evidence = path.join(output, 'evolutions-existing'); fs.mkdirSync(evidence, {recursive: true});
  const script = 'tests/browser-evolutions-r28.mjs';
  const sourceHash = hash(fs.readFileSync(path.join(root, script)));
  let result, report, error = null;
  try {
    const published = execFileSync('git', ['show', baseline + ':' + script], {cwd: root});
    assert.equal(sourceHash, hash(published), 'The existing R28 browser recipe must remain byte-identical');
    if (hadReport) fs.unlinkSync(historicalReport);
    result = spawnSync(process.execPath, [script], {cwd: root, env: process.env, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024});
    fs.writeFileSync(path.join(evidence, 'stdout.log'), result.stdout || '');
    fs.writeFileSync(path.join(evidence, 'stderr.log'), result.stderr || '');
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (fs.existsSync(historicalReport)) {
      const bytes = fs.readFileSync(historicalReport); fs.writeFileSync(path.join(evidence, 'browser-evolutions-r28.json'), bytes);
      report = JSON.parse(bytes);
    }
    if (result.error) throw result.error;
    assert.equal(result.signal, null, 'Existing R28 browser process was interrupted');
    assert.equal(result.status, 0, 'Existing R28 browser recipe must pass on current source');
    assert(report, 'Existing R28 recipe produced no fresh report');
    assert.equal(report.schema, 're.bow.evolutions-browser-r28/1');
    assert.equal(report.passed, 16); assert.equal(report.failed, 0);
    assert.equal(report.checks.length, 16); assert(report.checks.every(check => check.pass));
    assert.equal(report.sourceFiles.find(file => file.path === controller)?.sha256, hash(currentSource));
  } catch (caught) {error = caught.stack; console.error('FAIL existing R28 current-source recipe: ' + caught.message);}
  finally {
    if (hadReport) fs.writeFileSync(historicalReport, original);
    else if (fs.existsSync(historicalReport)) fs.unlinkSync(historicalReport);
  }
  const restored = hadReport ? fs.existsSync(historicalReport) && fs.readFileSync(historicalReport).equals(original) : !fs.existsSync(historicalReport);
  if (!restored) {error = (error || '') + '\nHistorical report was not restored byte for byte.';}
  return {script, sourceSha256: sourceHash, status: result?.status ?? null, signal: result?.signal ?? null,
    passed: report?.passed ?? 0, failed: report?.failed ?? null, historicalReportRestored: restored,
    currentControllerSha256: hash(currentSource), pass: !error, error,
    evidence: 'qa-gamedev-r32/evolutions-existing', scope: 'The unmodified 16-group R28 browser suite, executed against the current checkout and its real assets.'};
}

let browserVersion = null;
try {
  assert.notEqual(hash(previousSource), hash(currentSource), 'The current evolution controller must differ from the regression baseline');
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || undefined,
    ignoreDefaultArgs: ['--disable-back-forward-cache'], args: ['--no-sandbox', '--disable-dev-shm-usage']});
  browserVersion = browser.version();
  for (phase of ['before', 'after']) for (const scenario of scenarios) await runScenario(scenario);
} catch (error) {checks.push({phase, scenario: 'suite-setup', outcome: 'failure', error: error.stack}); console.error(error.stack);}
finally {await browser?.close(); await new Promise(resolve => server.close(resolve));}

const existing = runExistingR28();
const missingCode = [...unavailable].filter(file => /\.(js|css|html)$/.test(file));
const before = {passed: checks.filter(check => check.phase === 'before' && check.outcome === 'pass').length,
  failed: checks.filter(check => check.phase === 'before' && check.outcome === 'baseline-defect').length};
const after = {passed: checks.filter(check => check.phase === 'after' && check.outcome === 'pass').length,
  failed: checks.filter(check => check.phase === 'after' && check.outcome === 'failure').length};
const complete = checks.length === 20 && before.passed === 5 && before.failed === 5 && after.passed === 10 && after.failed === 0;
const failed = checks.filter(check => check.outcome === 'failure').length + errors.length + missingCode.length + Number(!complete) + Number(!existing.pass);
const report = {schema: 're.bow.evolution-input-r32/1', observedAtUTC: new Date().toISOString(), browserVersion,
  passed: after.passed, failed, before, after, complete, checks, existing,
  baseline: {commit: baseline, controller, sha256: hash(previousSource)},
  current: {controller, sha256: hash(currentSource)},
  inputs: [...served.values()].sort((a, b) => (a.phase + a.path).localeCompare(b.phase + b.path)),
  testSourceSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))), browserErrors: errors, missingCode,
  unavailableOptionalData: [...unavailable].filter(file => !missingCode.includes(file)),
  scope: 'Delivered evolution HTML, controller, engine and deterministic replay; exact prior controller is the only baseline substitution. Eight groups per phase use the production automatic RAF loop. Two eligibility groups explicitly simulate RAF and reach eligibility through real engine ticks without health/resource overrides. Keyboard, pointer, visible blur/focus and BFCache events are generated by Chromium. Standard gamepad and raster artwork are explicit fixtures for this focused suite. The unchanged existing R28 recipe runs separately on current source and real assets. No physical-device or artistic-fidelity certification.'};
fs.writeFileSync(path.join(output, 'evolution-input.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({suite: 'evolution-input-r32', passed: after.passed, failed, before, after,
  existing: {passed: existing.passed, failed: existing.failed, pass: existing.pass}, complete, browserVersion}));
if (failed) process.exitCode = 1;
