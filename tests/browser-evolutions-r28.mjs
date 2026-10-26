/** R28 real Chromium selection, contact combat, voluntary input and replay.
 * Controller input and the animation clock in its dedicated case are simulated.
 * Combat resources and health are reached only by real engine ticks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-evolutions-r28'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_EVOLUTIONS_R28_PORT || 5728), base = 'http://127.0.0.1:' + port;
const mode = '/modules/fidelity-r28/evolutions/index.html';
const startedAt = new Date().toISOString(), checks = [];
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
let browser;
async function test(name, run) {
  try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function scene(route = mode, options = {}) {
  const context = await browser.newContext({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce', ...options});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + route, {waitUntil: 'networkidle'});
  return {context, page, errors};
}
async function manualInputScene() {
  const context = await browser.newContext({viewport: {width: 1280, height: 1000}});
  await context.addInitScript(() => {
    // Combat advances only through real deterministic ticks in these input cases.
    window.requestAnimationFrame = () => 1;
    window.cancelAnimationFrame = () => {};
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + mode, {waitUntil: 'networkidle'});
  await page.evaluate(() => {RE_EVOLUTION_DUEL_R28.reset(true); RE_EVOLUTION_DUEL_R28.draw();});
  const tick = (count = 1) => page.evaluate(count => {
    const api = RE_EVOLUTION_DUEL_R28; api.tick(count, {held: {}, edges: []}); api.draw();
    return {guard: api.getState().a.block, frame: api.getState().frame, airborne: !api.getState().a.onGround};
  }, count);
  return {context, page, errors, tick};
}
function reachNaturalEligibility() {
  const api = window.RE_EVOLUTION_DUEL_R28;
  api.reset(true);
  const state = api.getState();
  while (state.frame < 3000 && !state.finished && window.RE_EVOLUTIONS_R28.reason(state, 0, 're2r-super-tyrant')) api.tick(1, {held: {}, edges: []});
  api.draw();
  return {frame: state.frame, life: state.a.life, meter: state.a.meter, uid: state.a.f.uid,
    reason: window.RE_EVOLUTIONS_R28.reason(state, 0, 're2r-super-tyrant'), ready: !document.getElementById('evolutionApply0R28').disabled};
}
try {
  for (let n = 0; n < 80; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 75)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Main selection groups exact incarnations and assigns an evolved form without starting combat', async () => {
    const {context, page, errors} = await scene('/modules/versus.html');
    try {
      const before = await page.evaluate(() => ({count: document.getElementById('formPickerR28').options.length, families: document.querySelectorAll('#formPickerR28 optgroup[data-family-id]').length,
        oldIds: [...document.getElementById('formPickerR28').options].map(option => option.value), state: RE_COMBAT.getState()}));
      assert.equal(before.count, 115); assert.equal(new Set(before.oldIds).size, 115); assert.equal(before.state, null); assert(before.families >= 5);
      await page.selectOption('#formPickerR28', 're2r-super-tyrant'); await page.click('#formAssign0R28');
      const selected = await page.evaluate(() => ({uid: document.getElementById('p1Portrait').dataset.reSpecimen,
        url: document.getElementById('evolutionLaunchR28').href, state: RE_COMBAT.getState(), options: [...document.querySelectorAll('#formPickerR28 optgroup[data-family-id="re2r-tyrant"] option')].map(option => option.value)}));
      assert.equal(selected.uid, 're2r-super-tyrant'); assert.equal(selected.state, null);
      assert.deepEqual(selected.options, ['re2r-tyrant', 're2r-super-tyrant']); assert.equal(new URL(selected.url).searchParams.get('uid'), selected.uid);
      assert.equal(await page.locator('#formPickerR28 option[value="re2-tyrant-mutation"]').count(), 1);
      assert.deepEqual(errors, []); return {identitiesRetained: 115, families: before.families, selected: selected.uid};
    } finally { await context.close(); }
  });
  await test('Classic trial keeps all 346 profiles and its historical replay schema while grouping forms', async () => {
    const {context, page, errors} = await scene('/catalog-duel.html');
    try {
      assert.equal(await page.locator('#trialSubject option').count(), 346);
      await page.selectOption('#trialSubject', 're2-tyrant-mutation');
      const result = await page.evaluate(() => ({uid: RE_CATALOG_DUEL.getState().a.f.uid, evolutionState: !!RE_CATALOG_DUEL.getState().evolutionsR28,
        schema: RE_CATALOG_DUEL.exportReplay().schema, link: document.getElementById('evolutionLaunchR28').href,
        unique: new Set([...document.getElementById('trialSubject').options].map(option => option.value)).size}));
      assert.equal(result.uid, 're2-tyrant-mutation'); assert.equal(result.evolutionState, false); assert.equal(result.unique, 346);
      assert.equal(result.schema, 're.bow.catalog-duel-replay/1'); assert.equal(new URL(result.link).searchParams.get('uid'), result.uid);
      assert.deepEqual(errors, []); return result;
    } finally { await context.close(); }
  });
  await test('Main grouped controls remain reachable at 320px with every text size doubled', async () => {
    const {context, page, errors} = await scene('/modules/versus.html', {viewport: {width: 320, height: 1000}});
    try {
      await page.evaluate(() => {
        const elements = [...document.querySelectorAll('body *')].filter(element => !['SCRIPT', 'STYLE'].includes(element.tagName));
        const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
        elements.forEach((element, index) => element.style.setProperty('font-size', sizes[index] * 2 + 'px', 'important'));
      });
      await page.selectOption('#formPickerR28', 're2r-super-tyrant'); await page.click('#formAssign0R28');
      const result = await page.evaluate(() => {
        const link = document.getElementById('evolutionLaunchR28'), rect = link.getBoundingClientRect();
        return {overflow: document.documentElement.scrollWidth > innerWidth + 1, hit: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === link,
          uid: document.getElementById('p1Portrait').dataset.reSpecimen};
      });
      assert.equal(result.overflow, false); assert.equal(result.hit, true); assert.equal(result.uid, 're2r-super-tyrant');
      await page.screenshot({path: path.join(output, 'main-selection-320-200pct.png'), fullPage: true}); assert.deepEqual(errors, []); return result;
    } finally { await context.close(); }
  });
  await test('Evolution selector preserves all profiles and shows context forms under their exact base', async () => {
    const {context, page, errors} = await scene();
    try {
      const result = await page.evaluate(() => ({options: document.getElementById('trialSubject').options.length,
        enabled: [...document.getElementById('trialSubject').options].filter(option => !option.disabled).length,
        ids: [...document.getElementById('trialSubject').options].map(option => option.value),
        families: document.querySelectorAll('#trialSubject optgroup[data-family-id]').length,
        held: [...document.querySelectorAll('#trialSubject option:disabled')].map(option => option.value),
        family: document.querySelector('#trialSubject option[value="recv-alexia-ashford-second-form"]').parentElement.dataset.familyId,
        contexts: [...document.querySelectorAll('.r28-context-forms a')].map(link => new URL(link.href).searchParams.get('id')),
        runtime: RE_COMBAT_SPRITES_R28.state()}));
      assert.equal(result.options, 348); assert.equal(result.enabled, 340); assert.equal(new Set(result.ids).size, result.options); assert.equal(result.families, 15);
      assert(result.held.includes('re3r-stage-3-nemesis')); assert(result.held.includes('recv-alexia-ashford-second-form'));
      assert.equal(result.family, 'recv-alexia'); assert.equal(result.contexts.length, 7); assert.equal(result.runtime.failed, false);
      assert.deepEqual(errors, []); return {options: result.options, freeProfiles: result.enabled, families: result.families, contextFamilyForms: result.contexts.length, runtimeHealthy: true};
    } finally { await context.close(); }
  });
  await test('A natural fight reaches eligibility, stays in its base form, then the real button mutates without healing', async () => {
    const {context, page, errors} = await scene();
    try {
      const result = await page.evaluate(() => {
        const api = RE_EVOLUTION_DUEL_R28; api.reset(true); api.tick(120, {held: {}, edges: []}); api.draw();
        const early = {uid: api.getState().a.f.uid, disabled: document.getElementById('evolutionApply0R28').disabled, history: api.getState().evolutionsR28.history.length};
        while (api.getState().frame < 3000 && RE_EVOLUTIONS_R28.reason(api.getState(), 0, 're2r-super-tyrant')) api.tick(1, {held: {}, edges: []});
        api.draw(); const state = api.getState(), before = {frame: state.frame, uid: state.a.f.uid, life: state.a.life, meter: state.a.meter, history: state.evolutionsR28.history.length, disabled: document.getElementById('evolutionApply0R28').disabled};
        document.getElementById('evolutionQuick0R28').click(); api.tick(1, {held: {}, edges: []}); api.draw();
        const record = api.exportReplay(); window.actualR28Replay = record;
        const after = {frame: state.frame, uid: state.a.f.uid, life: state.a.life, meter: state.a.meter, history: state.evolutionsR28.history,
          hud: document.getElementById('trialHealthA').textContent, moves: document.getElementById('trialMoves').textContent, moveName: state.a.f.combat.moves.light.name};
        return {early, before, after, replayFrames: record.frames, replayDigest: record.stateDigest, mutationCommands: record.runs.filter(run => run[3] !== null).map(run => run[3])};
      });
      assert.equal(result.early.uid, 're2r-tyrant'); assert.equal(result.early.history, 0); assert.equal(result.early.disabled, true);
      assert.deepEqual(result.before, {frame: 678, uid: 're2r-tyrant', life: 3910, meter: 36, history: 0, disabled: false});
      assert.equal(result.after.uid, 're2r-super-tyrant'); assert.equal(result.after.life, result.before.life); assert.equal(result.after.meter, 1); assert.equal(result.after.history.length, 1);
      assert(result.after.hud.includes('SUPER TYRANT')); assert(result.after.moves.includes(result.after.moveName)); assert.deepEqual(result.mutationCommands, ['re2r-super-tyrant']);
      assert.equal(result.replayFrames, 679); assert.equal(result.replayDigest, '68a1966d');
      await page.evaluate(() => document.getElementById('trialPause').click());
      await page.screenshot({path: path.join(output, 'natural-evolution.png'), fullPage: true});
      assert.deepEqual(errors, []); return {naturalHealthAndMeter: true, stateOverrides: 0, before: result.before, after: {uid: result.after.uid, life: result.after.life, meter: result.after.meter}, frames: result.replayFrames, stateDigest: result.replayDigest};
    } finally { await context.close(); }
  });
  await test('Replay seeks across the exact mutation and disables voluntary controls in read-only playback', async () => {
    const {context, page, errors} = await scene();
    try {
      await page.evaluate(reachNaturalEligibility);
      const result = await page.evaluate(() => {
        const api = RE_EVOLUTION_DUEL_R28;
        document.getElementById('evolutionApply0R28').click(); api.tick(1, {held: {}, edges: []}); const record = api.exportReplay();
        api.installReplay(record); const start = api.getState().a.f.uid;
        const seek = document.getElementById('trialReplaySeek'); seek.value = '678'; seek.dispatchEvent(new Event('change')); const before = api.getState().a.f.uid;
        seek.value = '679'; seek.dispatchEvent(new Event('change')); const after = api.getState().a.f.uid;
        const controls = [...document.querySelectorAll('[id^="evolutionApply"][id$="R28"]')].every(button => button.disabled);
        const blocked = api.requestEvolution(1, 're3r-stage-2-nemesis');
        const digest = RE_EVOLUTION_REPLAY_R28.seal(api.getState());
        seek.value = '0'; seek.dispatchEvent(new Event('change'));
        return {start, before, after, controls, blocked, digest, expected: record.stateDigest, rewound: api.getState().a.f.uid};
      });
      assert.equal(result.start, 're2r-tyrant'); assert.equal(result.before, 're2r-tyrant'); assert.equal(result.after, 're2r-super-tyrant'); assert.equal(result.rewound, 're2r-tyrant');
      assert.equal(result.controls, true); assert.equal(result.blocked.ok, false); assert.equal(result.digest, result.expected); assert.deepEqual(errors, []); return result;
    } finally { await context.close(); }
  });
  await test('Corrupt replay is rejected before replacing the current fight', async () => {
    const {context, page, errors} = await scene();
    try {
      const result = await page.evaluate(() => {
        const api = RE_EVOLUTION_DUEL_R28; api.reset(true); api.tick(10, {held: {}, edges: []});
        const before = api.getState(), value = api.exportReplay(); value.stateDigest = '00000000';
        let rejected = ''; try { api.installReplay(value); } catch (error) { rejected = error.message; }
        return {rejected, same: api.getState() === before, frame: api.getState().frame, replay: api.isReplay()};
      });
      assert(result.rejected); assert.equal(result.same, true); assert.equal(result.frame, 10); assert.equal(result.replay, false); assert.deepEqual(errors, []); return result;
    } finally { await context.close(); }
  });
  await test('Pause cancels an accepted request before the next combat tick', async () => {
    const {context, page, errors} = await scene();
    try {
      const result = await page.evaluate(() => {
        const api = RE_EVOLUTION_DUEL_R28; api.reset(true); const state = api.getState();
        while (state.frame < 3000 && RE_EVOLUTIONS_R28.reason(state, 0, 're2r-super-tyrant')) api.tick(1, {held: {}, edges: []});
        api.draw(); const accepted = api.requestEvolution(0, 're2r-super-tyrant');
        document.getElementById('trialPause').click(); const pending = RE_EVOLUTIONS_R28.commands(state);
        api.tick(1, {held: {}, edges: []}); return {accepted, pending, uid: state.a.f.uid, history: state.evolutionsR28.history.length, paused: api.isPaused()};
      });
      assert.equal(result.accepted.ok, true); assert.deepEqual(result.pending, [null, null]); assert.equal(result.uid, 're2r-tyrant'); assert.equal(result.history, 0); assert.equal(result.paused, true); assert.deepEqual(errors, []); return result;
    } finally { await context.close(); }
  });
  await test('Keyboard V chooses the displayed form and repeated keydowns cannot duplicate a mutation', async () => {
    const {context, page, errors} = await scene();
    try {
      const result = await page.evaluate(() => {
        const api = RE_EVOLUTION_DUEL_R28; api.reset(true); const state = api.getState();
        while (state.frame < 3000 && RE_EVOLUTIONS_R28.reason(state, 0, 're2r-super-tyrant')) api.tick(1, {held: {}, edges: []});
        api.draw(); const canvas = document.getElementById('trialCanvas'); canvas.focus();
        canvas.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyV', bubbles: true, cancelable: true}));
        canvas.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyV', repeat: true, bubbles: true, cancelable: true}));
        api.tick(1, {held: {}, edges: []}); api.draw();
        return {uid: state.a.f.uid, history: state.evolutionsR28.history.length, life: state.a.life, meter: state.a.meter};
      });
      assert.deepEqual(result, {uid: 're2r-super-tyrant', history: 1, life: 3910, meter: 1}); assert.deepEqual(errors, []); return result;
    } finally { await context.close(); }
  });
  await test('Focused hold buttons accept Space and Enter, release on keyup/focus loss/pause, and preserve another pointer', async () => {
    const {context, page, errors, tick} = await manualInputScene();
    try {
      const guard = page.locator('[data-hold="guard"]');
      await guard.focus(); await page.keyboard.down('Space'); assert.equal((await tick()).guard, true);
      await page.keyboard.down('Space'); await page.keyboard.down('Space'); assert.equal((await tick(2)).guard, true);
      await page.keyboard.up('Space'); assert.equal((await tick()).guard, false);
      await guard.focus(); await page.keyboard.down('Enter'); assert.equal((await tick()).guard, true);
      await page.locator('#trialStage').focus(); assert.equal((await tick()).guard, false);
      await page.keyboard.up('Enter');
      await guard.focus(); await page.keyboard.down('Space');
      const rect = await guard.boundingBox(); await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down();
      assert.equal((await tick()).guard, true);
      await page.keyboard.up('Space'); assert.equal((await tick()).guard, true, 'Releasing the keyboard must retain an independently held pointer.');
      await page.mouse.up(); assert.equal((await tick()).guard, false);
      await guard.focus(); await page.keyboard.down('Space'); assert.equal((await tick()).guard, true);
      await page.evaluate(() => dispatchEvent(new Event('blur')));
      assert.equal(await page.evaluate(() => RE_EVOLUTION_DUEL_R28.isPaused()), true);
      await page.evaluate(() => RE_EVOLUTION_DUEL_R28.reset(true));
      assert.equal((await tick()).guard, false, 'Pause/reset must discard keyboard button holds.');
      await page.keyboard.up('Space');
      assert.deepEqual(errors, []);
      return {spaceAndEnterGuard: true, repeatDoesNotQueueExtraActions: true, keyupReleases: true, elementBlurReleases: true, windowBlurPausesAndClears: true, pointerHoldIndependent: true, simulatedAnimationClock: true};
    } finally { await context.close(); }
  });
  await test('Keyboard jump buttons emit one edge per press and replay import/reset clears an unfinished hold', async () => {
    const {context, page, errors, tick} = await manualInputScene();
    try {
      const jump = page.locator('[data-hold="jump"]');
      await page.evaluate(() => {
        window.keyboardButtonClicksR28 = 0;
        document.querySelector('[data-hold="jump"]').addEventListener('click', () => keyboardButtonClicksR28++);
      });
      const presses = [];
      for (const key of ['Enter', 'Space']) {
        await page.evaluate(() => RE_EVOLUTION_DUEL_R28.reset(true));
        await jump.focus(); await page.keyboard.down(key); assert.equal((await tick()).airborne, true);
        for (let n = 0; n < 4; n++) {await page.keyboard.down(key); await tick();}
        await page.keyboard.up(key); await tick();
        const result = await page.evaluate(() => {
          const api = RE_EVOLUTION_DUEL_R28, record = api.exportReplay();
          return {jumpInputFrames: record.runs.reduce((sum, run) => sum + ((run[1] & 16) ? run[0] : 0), 0),
            nativeClicks: keyboardButtonClicksR28, playerJumps: api.getState().events.filter(event => event.type === 'jump' && event.actor === 0).length};
        });
        assert.deepEqual(result, {jumpInputFrames: 1, nativeClicks: 0, playerJumps: 1}); presses.push({key, ...result});
      }
      await page.evaluate(() => RE_EVOLUTION_DUEL_R28.reset(true));
      await page.locator('[data-hold="guard"]').focus(); await page.keyboard.down('Enter'); assert.equal((await tick()).guard, true);
      const beforeStorage = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
      await page.evaluate(() => {const api = RE_EVOLUTION_DUEL_R28; const record = api.exportReplay(); api.installReplay(record); api.reset(true);});
      assert.equal((await tick()).guard, false, 'Replay import and exit must not retain a live keyboard button hold.');
      await page.keyboard.up('Enter');
      assert.equal(await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))), beforeStorage);
      assert.deepEqual(errors, []);
      return {presses, replayImportClearsLiveHold: true, localStorageUnchanged: true, simulatedAnimationClock: true, healthOrResourceOverrides: 0};
    } finally { await context.close(); }
  });
  await test('Simulated standard controller Select uses a new press and ignores a held connection', async () => {
    const context = await browser.newContext({viewport: {width: 1280, height: 1000}});
    await context.addInitScript(() => {
      const callbacks = new Map(); let next = 1;
      window.requestAnimationFrame = callback => {const id = next++; callbacks.set(id, callback); return id;};
      window.cancelAnimationFrame = id => callbacks.delete(id);
      window.pumpFrameR28 = () => {const current = [...callbacks.values()]; callbacks.clear(); for (const callback of current) callback(0);};
      const buttons = Array.from({length: 16}, () => ({pressed: false, value: 0}));
      window.simulatedPadR28 = {index: 0, id: 'R28 simulated standard pad', connected: true, mapping: 'standard', buttons, axes: [0, 0]};
      Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => [window.simulatedPadR28]});
    });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + mode, {waitUntil: 'networkidle'}); await page.evaluate(reachNaturalEligibility);
      const result = await page.evaluate(() => {
        const api = RE_EVOLUTION_DUEL_R28, state = api.getState(), button = simulatedPadR28.buttons[8];
        button.pressed = true; button.value = 1; pumpFrameR28(); const first = RE_EVOLUTIONS_R28.commands(state);
        button.pressed = false; button.value = 0; pumpFrameR28(); button.pressed = true; button.value = 1; pumpFrameR28(); const press = RE_EVOLUTIONS_R28.commands(state);
        api.tick(1, {held: {}, edges: []}); pumpFrameR28(); api.tick(1, {held: {}, edges: []});
        return {first, press, uid: state.a.f.uid, history: state.evolutionsR28.history.length};
      });
      assert.deepEqual(result.first, [null, null]); assert.deepEqual(result.press, ['re2r-super-tyrant', null]); assert.equal(result.uid, 're2r-super-tyrant'); assert.equal(result.history, 1);
      assert.deepEqual(errors, []); return {...result, physicalController: false, simulatedAnimationClock: true};
    } finally { await context.close(); }
  });
  await test('Keyboard B voluntarily evolves the opponent during a naturally simulated CPU fight', async () => {
    const {context, page, errors} = await scene();
    try {
      const result = await page.evaluate(() => {
        const api = RE_EVOLUTION_DUEL_R28;
        document.getElementById('trialSubject').value = 're3r-nemesis'; document.getElementById('trialTarget').value = 're2r-tyrant'; document.getElementById('trialMode').value = 'cpu';
        api.reset(true); const state = api.getState();
        while (state.frame < 5000 && !state.finished && RE_EVOLUTIONS_R28.reason(state, 1, 're2r-super-tyrant')) api.tick(1, {held: {}, edges: []});
        api.draw(); const before = {frame: state.frame, uid: state.b.f.uid, life: state.b.life, meter: state.b.meter};
        const canvas = document.getElementById('trialCanvas'); canvas.focus(); canvas.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyB', bubbles: true, cancelable: true}));
        api.tick(1, {held: {}, edges: []}); api.draw(); const record = api.exportReplay();
        return {before, after: {frame: state.frame, uid: state.b.f.uid, life: state.b.life, meter: state.b.meter}, history: state.evolutionsR28.history,
          commands: record.runs.filter(run => run[4] !== null).map(run => run[4])};
      });
      assert.deepEqual(result.before, {frame: 605, uid: 're2r-tyrant', life: 6320, meter: 46});
      assert.deepEqual(result.after, {frame: 606, uid: 're2r-super-tyrant', life: 6320, meter: 11}); assert.equal(result.history.length, 1); assert.equal(result.history[0].slot, 1);
      assert.deepEqual(result.commands, ['re2r-super-tyrant']); assert.deepEqual(errors, []); return result;
    } finally { await context.close(); }
  });
  await test('A source-bound context URL is explicit and opens no fabricated free actor', async () => {
    const {context, page, errors} = await scene(mode + '?uid=re3r-stage-3-nemesis');
    try {
      const result = await page.evaluate(() => ({uid: RE_EVOLUTION_DUEL_R28.getState().a.f.uid, status: document.getElementById('trialReplayStatus').textContent,
        links: [...document.querySelectorAll('a')].map(link => link.href), disabled: document.querySelector('#trialSubject option[value="re3r-stage-3-nemesis"]').disabled}));
      assert.equal(result.uid, 're2r-tyrant'); assert(result.status.includes('FORME DE RENCONTRE')); assert(result.links.some(link => new URL(link).searchParams.get('id') === 're3r-stage-3-nemesis')); assert.equal(result.disabled, true); assert.deepEqual(errors, []); return {uid: result.uid, explicitContextFallback: true};
    } finally { await context.close(); }
  });
  for (const width of [1280, 320]) await test('Evolution mode keyboard and 200% text layout at ' + width + 'px', async () => {
    const {context, page, errors} = await scene(mode, {viewport: {width, height: 1000}});
    try {
      await page.evaluate(() => {
        const elements = [...document.querySelectorAll('body *')].filter(element => !['SCRIPT', 'STYLE'].includes(element.tagName));
        const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
        elements.forEach((element, index) => element.style.setProperty('font-size', sizes[index] * 2 + 'px', 'important'));
      });
      await page.locator('#trialSubject').focus(); await page.keyboard.press('Tab');
      assert.equal(await page.locator('#trialTarget').evaluate(element => document.activeElement === element), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.equal(await page.locator('#trialStart').isVisible(), true); assert.equal(await page.locator('#evolutionApply0R28').isVisible(), true);
      await page.locator('#trialCanvas').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, Math.max(0, document.querySelector('.r28-quick-evolutions').getBoundingClientRect().top) + 20));
      const quick = await page.locator('.r28-quick-evolutions').boundingBox();
      assert(quick.y >= 0 && quick.y < 100, 'Evolution controls stay at the top while viewing the arena.');
      await page.screenshot({path: path.join(output, 'layout-' + width + '-200pct.png'), fullPage: true}); assert.deepEqual(errors, []);
      return {width, textScale: '200% of every computed element font size', overflow: false, keyboardOrder: true, physicalDevices: false};
    } finally { await context.close(); }
  });
} catch (error) { checks.push({name: 'suite setup', pass: false, error: error.stack}); console.error(error.stack); }
finally {
  await browser?.close(); server.kill('SIGTERM');
  const files = ['modules/fidelity-r28/evolutions/index.html', 'modules/fidelity-r28/evolutions/duel.js', 'modules/fidelity-r28/evolutions/selection.js', 'modules/fidelity-r28/evolutions/styles.css', 'modules/fidelity-r28/evolutions/engine.js', 'modules/fidelity-r28/evolutions/replay.js', 'modules/fidelity-r28/evolutions/graph.json', 'modules/fidelity-r28/evolutions/contract.js'];
  const report = {schema: 're.bow.evolutions-browser-r28/1', startedAt, finishedAt: new Date().toISOString(), passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length,
    healthOrResourceOverrides: 0, physicalControllersCertified: false, physicalMobileCertified: false, canonicalGameplayValuesCertified: false, sourceFiles: files.map(file => ({path: file, sha256: hash(file)})), checks};
  fs.writeFileSync(path.join(root, 'docs/R28_EVOLUTIONS_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
}
