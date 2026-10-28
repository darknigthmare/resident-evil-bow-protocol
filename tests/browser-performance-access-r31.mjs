/** Real coordinated readers, voluntary measurements and the existing paused text dialog. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.BOW_PERFORMANCE_ACCESS_R31_PORT || 5898), base = 'http://127.0.0.1:' + port;
const out = path.join(root, 'qa-performance-access-r31'); fs.mkdirSync(out, {recursive: true});
const require = createRequire(import.meta.url);
const axePath = process.env.AXE_CORE_PATH || (() => {try {return require.resolve('axe-core/axe.min.js');} catch {return '/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js';}})();
assert(fs.existsSync(axePath), 'Pinned axe-core4.14.0 is required.'); const axeSource = fs.readFileSync(axePath, 'utf8');
const routes = ['/modules/versus.html', '/catalog-duel.html', '/modules/fidelity-r31/evolutions/index.html'];
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const checks = [], startedAt = new Date().toISOString(); let browser;
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function scene(route, options = {}) {
  const context = await browser.newContext({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce', ...options});
  const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(String(error)));
  await page.goto(base + route);
  await page.waitForFunction(() => globalThis.RE_COMBAT_SPRITES_R31?.state().loaded || globalThis.RE_COMBAT_SPRITES_R31?.state().failed);
  await page.waitForFunction(() => globalThis.RE_NATIVE_SPRITES_R31?.state().loaded || globalThis.RE_NATIVE_SPRITES_R31?.state().failed);
  await page.waitForFunction(() => globalThis.RE_SELECTION_AVATARS_R31?.status().loaded || globalThis.RE_SELECTION_AVATARS_R31?.status().failed);
  const state = await page.evaluate(() => ({generated: RE_COMBAT_SPRITES_R31.state(), native: RE_NATIVE_SPRITES_R31.state(), avatars: RE_SELECTION_AVATARS_R31.status()}));
  assert.equal(state.generated.failed, false, state.generated.message); assert.equal(state.native.failed, false, state.native.errors.join(' ')); assert.equal(state.avatars.failed, false);
  return {context, page, errors};
}
async function warm(page) {
  if (await page.locator('#avatarSelectionR30').count()) {
    await page.locator('#avatarSelectionR30').evaluate(element => {element.open = true;});
    await page.locator('.r30-selected-visual').first().scrollIntoViewIfNeeded();
  }
  await page.waitForFunction(() => RE_SELECTION_AVATARS_R31.status().loadedImages > 0);
  const result = await page.evaluate(async () => {
    const native = RE_NATIVE_SPRITES_R31.list().find(item => item.kind === 'native-sequence' && item.sourceFacing === 'right');
    const generated = RE_COMBAT_SPRITES_R31.list().find(item => item.id === 're0-stinger') || RE_COMBAT_SPRITES_R31.list()[0];
    await RE_NATIVE_SPRITES_R31.preload(native.id, {count: 1}); await RE_COMBAT_SPRITES_R31.load(generated.id);
    return {nativeId: native.id, generatedId: generated.id};
  });
  await page.waitForFunction(() => RE_IMAGE_BUDGET_R31.state().pending === 0 && !RE_NATIVE_SPRITES_R31.state().loading
    && !RE_SELECTION_AVATARS_R31.status().loadingImages && !RE_COMBAT_SPRITES_R31.state().loading);
  return result;
}
async function axe(page, target = 'document') {
  await page.evaluate(axeSource); assert.equal(await page.evaluate(() => globalThis.axe.version), '4.14.0');
  return page.evaluate(async target => {
    const scope = target === 'document' ? {exclude: [['#game']]} : {include: [[target]]};
    const result = await globalThis.axe.run(scope, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']}});
    return {violations: result.violations.map(row => ({id: row.id, impact: row.impact, nodes: row.nodes.map(node => ({target: node.target, summary: node.failureSummary}))})),
      incomplete: result.incomplete.map(row => ({id: row.id, nodes: row.nodes.length})), passes: result.passes.length};
  }, target);
}
try {
  for (let attempt = 0; attempt < 100; attempt++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 60));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('All three actual combat mounts coordinate native, generated and portrait PNG credits', async () => {
    const observed = [];
    for (const route of routes) {
      const {context, page, errors} = await scene(route);
      try {
        const assets = await warm(page), budget = await page.evaluate(() => RE_IMAGE_BUDGET_R31.state());
        for (const owner of ['native', 'avatars', 'generated']) assert(budget.owners[owner]?.pixels > 0, route + ':' + owner);
        assert(budget.reservedPixels <= 32 * 1024 * 1024); assert(budget.assets <= 64); assert.equal(budget.pending, 0);
        assert.equal(budget.physicalDeviceCertified, false); assert.equal(budget.globalMemoryCertified, false);
        const aliases = await page.evaluate(() => RE_COMBAT_SPRITES_R31 === RE_COMBAT_SPRITES_R27 && RE_COMBAT_SPRITES_R31 === RE_COMBAT_SPRITES_R29
          && RE_NATIVE_SPRITES_R31 === RE_NATIVE_SPRITES_R30 && RE_SELECTION_AVATARS_R31 === RE_SELECTION_AVATARS_R30);
        assert.equal(aliases, true); assert.deepEqual(errors, []); observed.push({route, assets, owners: budget.owners, reservedPixels: budget.reservedPixels});
      } finally {await context.close();}
    }
    return {mounts: observed, measuredScope: 'Participating readers only; existing canvases, browser and GPU memory remain unmeasured.'};
  });
  await test('Real images evicted by a32MP pressure reservation recover after release without negative-cache retries', async () => {
    const {context, page, errors} = await scene('/catalog-duel.html');
    try {
      const assets = await warm(page);
      const pressure = await page.evaluate(async assets => {
        const before = RE_IMAGE_BUDGET_R31.state(), avatars = RE_SELECTION_AVATARS_R31.status();
        window.__r31Pressure = RE_IMAGE_BUDGET_R31.reserve('qa-pressure', 'complete-budget', 32 * 1024 * 1024, () => {});
        if (!__r31Pressure) throw Error('A settled ready-image set must be evictable.');
        const attempts = await Promise.allSettled([RE_NATIVE_SPRITES_R31.preload(assets.nativeId, {count: 1}), RE_COMBAT_SPRITES_R31.load(assets.generatedId)]);
        return {before, avatars, full: RE_IMAGE_BUDGET_R31.state(), failures: attempts.map(row => row.status),
          native: RE_NATIVE_SPRITES_R31.state(), generated: RE_COMBAT_SPRITES_R31.state()};
      }, assets);
      assert(pressure.full.evictions > pressure.before.evictions); assert.equal(pressure.full.reservedPixels, 32 * 1024 * 1024);
      assert.deepEqual(pressure.failures, ['rejected', 'rejected']); assert.equal(pressure.native.errorsRemembered, 0); assert.equal(pressure.generated.errors, 0);
      const recovered = await page.evaluate(async assets => {
        const begin = performance.now(); __r31Pressure.release(); delete window.__r31Pressure; await Promise.resolve();
        await RE_NATIVE_SPRITES_R31.preload(assets.nativeId, {count: 1}); await RE_COMBAT_SPRITES_R31.load(assets.generatedId);
        return {milliseconds: performance.now() - begin, budget: RE_IMAGE_BUDGET_R31.state()};
      }, assets);
      await page.waitForFunction(count => RE_SELECTION_AVATARS_R31.status().loadedImages > count && document.querySelector('[data-avatar-state-r30="ready"]'), pressure.avatars.loadedImages);
      assert(recovered.milliseconds < 15000, 'Recovery must not wait for the image-error backoff.');
      const final = await page.evaluate(() => ({budget: RE_IMAGE_BUDGET_R31.state(), avatars: RE_SELECTION_AVATARS_R31.status(), native: RE_NATIVE_SPRITES_R31.state(), generated: RE_COMBAT_SPRITES_R31.state()}));
      assert(final.budget.reservedPixels <= final.budget.limits.pixels); assert.equal(final.native.errorsRemembered, 0); assert.equal(final.generated.errors, 0); assert.deepEqual(errors, []);
      return {actualReaderEvictions: pressure.full.evictions - pressure.before.evictions, fullReservedPixels: pressure.full.reservedPixels,
        nativeAndGeneratedRecoveryMs: recovered.milliseconds, portraitAutoRecovery: true, final: final.budget, pressureIsFaultInjection: true,
        pressureReservationStayedPendingUntilRelease: true};
    } finally {await context.close();}
  });
  await test('Page lifecycle releases ready and controlled pending native decode credits then resumes actual PNG loading', async () => {
    const {context, page, errors} = await scene('/catalog-duel.html');
    try {
      const assets = await warm(page);
      await page.evaluate(assets => {
        RE_NATIVE_SPRITES_R31.clear(); window.__r31OriginalImage = window.Image; window.__r31HeldDecodeCount = 0;
        const OriginalImage = window.Image;
        window.Image = function () {const image = new OriginalImage(); let source = '';
          Object.defineProperty(image, 'src', {configurable: true, get: () => source, set: value => {source = value; __r31HeldDecodeCount++;}}); return image;};
        window.__r31HeldNative = RE_NATIVE_SPRITES_R31.preload(assets.nativeId, {count: 1}).then(() => 'unexpectedly-decoded', () => 'cancelled');
      }, assets);
      await page.waitForFunction(() => RE_IMAGE_BUDGET_R31.state().owners.native?.pending > 0 && __r31HeldDecodeCount > 0);
      const pending = await page.evaluate(() => RE_IMAGE_BUDGET_R31.state());
      assert(pending.pendingPixels > 0); assert(pending.reservedPixels <= pending.limits.pixels);
      const hidden = await page.evaluate(async () => {dispatchEvent(new Event('pagehide')); const settled = await __r31HeldNative; await Promise.resolve();
        return {settled, budget: RE_IMAGE_BUDGET_R31.state(), native: RE_NATIVE_SPRITES_R31.state(), generated: RE_COMBAT_SPRITES_R31.state(), avatars: RE_SELECTION_AVATARS_R31.status()};});
      assert.equal(hidden.settled, 'cancelled'); assert.equal(hidden.budget.reservedPixels, 0); assert.equal(hidden.budget.pendingPixels, 0); assert.equal(hidden.budget.assets, 0);
      assert.equal(hidden.native.active, false); assert.equal(hidden.generated.active, false); assert.equal(hidden.avatars.active, false);
      const resumed = await page.evaluate(async assets => {window.Image = __r31OriginalImage; delete window.__r31OriginalImage;
        dispatchEvent(new Event('pageshow')); await RE_NATIVE_SPRITES_R31.preload(assets.nativeId, {count: 1});
        return {budget: RE_IMAGE_BUDGET_R31.state(), native: RE_NATIVE_SPRITES_R31.state()};}, assets);
      assert.equal(resumed.native.active, true); assert(resumed.native.cached > 0); assert(resumed.budget.reservedPixels > 0); assert.deepEqual(errors, []);
      return {pendingPixelsBeforeHide: pending.pendingPixels, reservedAfterHide: 0, decodedAgainAfterShow: true, simulatedPendingDecodeAndLifecycle: true};
    } finally {await context.close();}
  });
  await test('The real combat summary uses R17 pause, exact actor values and evolution reasons without replay mutation', async () => {
    const {context, page, errors} = await scene('/modules/fidelity-r31/evolutions/index.html?uid=re2r-tyrant&target=re3r-nemesis');
    try {
      await page.waitForFunction(() => RE_MATCH_SUMMARY_R31?.state().installed);
      await page.evaluate(() => {const api = RE_CATALOG_DUEL; api.reset(false); for (let index = 0; index < 180; index++) api.tick(1, {held: {}, edges: []});
        document.querySelector('.r31-match-open').addEventListener('click', () => {window.__r31SummaryBefore = {state: JSON.stringify(api.getState()), replay: JSON.stringify(api.exportReplay()), paused: api.isPaused()};}, {capture: true, once: true});});
      await page.getByRole('button', {name: 'BILAN DU COMBAT', exact: true}).click();
      await page.screenshot({path: path.join(out, 'real-match-summary.png'), fullPage: false});
      const result = await page.evaluate(() => {
        const api = RE_CATALOG_DUEL, state = api.getState(), summary = RE_MATCH_SUMMARY_R31.snapshot();
        return {summary, actors: [state.a, state.b].map(actor => ({uid: actor.f.uid, life: Math.round(actor.life), max: Math.round(actor.max), meter: Math.round(actor.meter), resource: Math.round(actor.r)})),
          reasons: [0, 1].map(slot => RE_EVOLUTIONS_R28.available(state, slot).map(option => ({label: option.target?.name || option.to, available: option.reason === null, reason: option.reason || 'Disponible'}))),
          statePreserved: __r31SummaryBefore.state === JSON.stringify(state), replayPreserved: __r31SummaryBefore.replay === JSON.stringify(api.exportReplay()),
          paused: api.isPaused(), open: RE_TRIAL_TEXT_PANEL.isOpen(), focused: document.activeElement.textContent,
          text: document.getElementById('matchSummaryStatusR31').textContent, automaticAnnouncements: RE_MATCH_SUMMARY_R31.state().automaticAnnouncements};
      });
      assert.equal(result.paused, true); assert.equal(result.open, true); assert.match(result.focused, /Actualiser le bilan/);
      assert.equal(result.statePreserved, true); assert.equal(result.replayPreserved, true); assert.equal(result.automaticAnnouncements, false);
      assert(result.summary.fighters[0].evolutions.length > 0, 'The chosen base form must expose real evolution reasons.');
      for (const [slot, actor] of result.actors.entries()) {
        const summary = result.summary.fighters[slot]; assert.equal(summary.uid, actor.uid); assert.equal(summary.life, actor.life);
        assert.equal(summary.maximum, actor.max); assert.equal(summary.meter, actor.meter); assert.equal(summary.resource, actor.resource);
        assert.deepEqual(summary.evolutions, result.reasons[slot]); assert(result.text.includes(summary.name));
      }
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.closest('#combatTextPanelR17') !== null), true);
      await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => RE_TRIAL_TEXT_PANEL.isOpen()), false);
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('r31-match-open') || document.activeElement.id === 'trialCanvas'), true); assert.deepEqual(errors, []);
      return {actorsCompared: 2, exactEvolutionReasons: result.reasons, frame: result.summary.frame, replayPreserved: true, pausedDialogFocusAndEscape: true};
    } finally {await context.close();}
  });
  await test('A voluntary one-second monitor observes callbacks while paused engine state and replay stay identical', async () => {
    const {context, page, errors} = await scene('/modules/fidelity-r31/evolutions/index.html');
    try {
      const result = await page.evaluate(async () => {
        const api = RE_CATALOG_DUEL; api.reset(false); if (!api.isPaused()) document.getElementById('trialPause').click();
        const before = {state: JSON.stringify(api.getState()), replay: JSON.stringify(api.exportReplay()), storage: JSON.stringify({...localStorage})};
        const activeBefore = RE_PERFORMANCE_R31.state().active, report = await RE_PERFORMANCE_R31.start({durationMs: 1000});
        return {activeBefore, report, activeAfter: RE_PERFORMANCE_R31.state().active,
          statePreserved: before.state === JSON.stringify(api.getState()), replayPreserved: before.replay === JSON.stringify(api.exportReplay()),
          storagePreserved: before.storage === JSON.stringify({...localStorage})};
      });
      assert.equal(result.activeBefore, false); assert.equal(result.activeAfter, false); assert.equal(result.report.reason, 'duration');
      assert(result.report.callbackIntervals > 0 && result.report.callbackIntervals <= 7200); assert(result.report.durationMs >= 900);
      assert(result.report.medianCallbackMs > 0); assert(result.report.p95CallbackMs >= result.report.medianCallbackMs);
      assert.equal(result.report.sameEngineSession, true); assert.equal(result.report.observedEngineTicks, 0);
      assert.equal(result.report.physicalDeviceCertified, false); assert.equal(result.report.gpuAllocationsMeasured, false);
      assert.equal(result.statePreserved, true); assert.equal(result.replayPreserved, true); assert.equal(result.storagePreserved, true); assert.deepEqual(errors, []);
      return {...result.report, statePreserved: true, replayPreserved: true, storagePreserved: true};
    } finally {await context.close();}
  });
  await test('The actual performance page measures only after a click and exports the observed iframe session', async () => {
    const context = await browser.newContext({viewport: {width: 1280, height: 1000}}), page = await context.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r31/performance/index.html');
      await page.waitForFunction(() => !document.getElementById('measure').disabled);
      assert.equal(await page.locator('#game').evaluate(frame => frame.contentWindow.RE_PERFORMANCE_R31.state().active), false);
      assert.equal(await page.locator('#download').isDisabled(), true); await page.click('#measure');
      await page.waitForFunction(() => document.getElementById('game').contentWindow.RE_PERFORMANCE_R31.state().active);
      await page.waitForTimeout(1000); await page.click('#stop'); await page.waitForFunction(() => !document.getElementById('download').disabled);
      const result = await page.locator('#game').evaluate(frame => frame.contentWindow.RE_PERFORMANCE_R31.state().last);
      assert.equal(result.reason, 'manual'); assert(result.callbackIntervals > 0); assert.equal(result.physicalDeviceCertified, false);
      const downloadEvent = page.waitForEvent('download'); await page.click('#download'); const download = await downloadEvent;
      const file = await download.path(); const exported = JSON.parse(fs.readFileSync(file, 'utf8')); assert.deepEqual(exported, result);
      await page.screenshot({path: path.join(out, 'voluntary-performance-results.png'), fullPage: false});
      return {autostart: false, voluntaryManualStop: true, exportedEqualsObservedReport: true, callbackIntervals: result.callbackIntervals, iframeHasRunningCombat: result.sameEngineSession};
    } finally {await context.close();}
  });
  await test('New performance controls pass axe4.14 and320px reflow with actual root text doubled', async () => {
    const context = await browser.newContext({viewport: {width: 320, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r31/performance/index.html'); await page.waitForFunction(() => !document.getElementById('measure').disabled);
      await page.evaluate(() => {document.documentElement.style.fontSize = '200%';});
      await page.screenshot({path: path.join(out, 'performance-320-text200.png'), fullPage: false});
      const layout = await page.evaluate(() => ({width: innerWidth, scroll: document.documentElement.scrollWidth, font: parseFloat(getComputedStyle(document.body).fontSize),
        clipped: [...document.querySelectorAll('main label,main button,main select')].filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.tagName)}));
      assert(layout.font >= 32); assert(layout.scroll <= layout.width + 1); assert.deepEqual(layout.clipped, []);
      await page.locator('#mode').focus(); await page.keyboard.press('ArrowDown'); assert.equal(await page.evaluate(() => document.activeElement.id), 'mode');
      const access = await axe(page); assert.deepEqual(access.violations, []);
      return {width: layout.width, rootTextPixels: layout.font, keyboardSelectRetained: true, axe: access, frameScopeExcluded: 'Embedded old game is checked separately.'};
    } finally {await context.close();}
  });
  await test('The new paused summary region remains accessible at320px with its real text doubled', async () => {
    const {context, page, errors} = await scene('/modules/fidelity-r31/evolutions/index.html?uid=re2r-tyrant&target=re3r-nemesis', {viewport: {width: 320, height: 1000}});
    try {
      await page.waitForFunction(() => RE_MATCH_SUMMARY_R31?.state().installed);
      await page.getByRole('button', {name: 'BILAN DU COMBAT', exact: true}).click();
      const size = await page.locator('#matchSummaryR31').evaluate(region => {
        const rows = [region, ...region.querySelectorAll('*')].map(node => [node, parseFloat(getComputedStyle(node).fontSize)]);
        for (const [node, size] of rows) node.style.fontSize = size * 2 + 'px';
        return {before: rows[0][1], after: parseFloat(getComputedStyle(region).fontSize)};
      });
      await page.screenshot({path: path.join(out, 'summary-320-text200.png'), fullPage: false});
      const layout = await page.locator('#matchSummaryR31').evaluate(region => ({width: region.clientWidth, scroll: region.scrollWidth,
        children: [...region.querySelectorAll('h3,p,button,dt,dd')].filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.tagName)}));
      assert.equal(size.after, size.before * 2); assert(layout.scroll <= layout.width + 1); assert.deepEqual(layout.children, []);
      const access = await axe(page, '#combatTextPanelR17'); assert.deepEqual(access.violations, []);
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.closest('#combatTextPanelR17') !== null), true);
      await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => RE_TRIAL_TEXT_PANEL.isOpen()), false); assert.deepEqual(errors, []);
      return {width: 320, actualSummaryTextBefore: size.before, actualSummaryTextAfter: size.after, scopedAxe: access, physicalScreenReaderCertified: false};
    } finally {await context.close();}
  });
} finally {await browser?.close(); server.kill('SIGTERM');}
const names = ['tests/browser-performance-access-r31.mjs', 'modules/fidelity-r31/performance/image-budget.js', 'modules/fidelity-r31/performance/monitor.js',
  'modules/fidelity-r31/performance/index.html', 'modules/fidelity-r31/performance/page.js', 'modules/fidelity-r31/performance/style.css',
  'modules/fidelity-r31/access/match-summary.js', 'modules/fidelity-r31/combat/generated-runtime.js', 'modules/fidelity-r31/combat/native-runtime.js',
  'modules/fidelity-r31/selection/avatars.js', 'modules/fidelity-r31/sprites/manifest.json', 'modules/fidelity-r30/native/manifest.json',
  'modules/fidelity-r30/selection/manifest.json', 'modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r31/evolutions/index.html'];
const report = {schema: 're.bow.performance-access-browser-r31/1', startedAt, finishedAt: new Date().toISOString(),
  passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length, checks,
  sourceFiles: names.map(name => ({path: name, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')})),
  physicalDeviceCertified: false, physicalScreenReaderCertified: false, gpuMemoryCertified: false,
  scope: 'Actual three combat mounts and decoded participating readers, controlled pressure and decode cancellation, real paused summary and replay preservation, voluntary session callbacks, targeted axe4.14 and320px actual text200%. Synthetic pressure/lifecycle branches do not certify real devices or total browser/GPU memory.'};
fs.writeFileSync(path.join(root, 'docs/R31_PERFORMANCE_ACCESS_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
