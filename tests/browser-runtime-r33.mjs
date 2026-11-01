/** Current combat documents, real PNGs, natural actors, keyboard and participating decoder credits. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'qa-runtime-r33'); fs.mkdirSync(out, {recursive: true});
const port = Number(process.env.BOW_RUNTIME_R33_PORT || 5933), base = 'http://127.0.0.1:' + port;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name)));
const registry = read('modules/fidelity-r33/combat/manifest.json');
const dog = registry.sourceEditionVariants.find(item => item.id === 're2-zombie-dog');
const checks = [], routes = ['/modules/versus.html', '/catalog-duel.html', '/modules/fidelity-r33/evolutions/index.html'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function scene(route = routes[1], options = {}) {
  const context = await browser.newContext({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce', ...options});
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('request', r => requests.push(new URL(r.url()).pathname));
  const start = performance.now(); await page.goto(base + route);
  await page.waitForFunction(() => globalThis.RE_COMBAT_SPRITES_R33?.state().loaded || globalThis.RE_COMBAT_SPRITES_R33?.state().failed);
  await page.waitForFunction(() => globalThis.RE_NATIVE_SPRITES_R33?.state().loaded || globalThis.RE_NATIVE_SPRITES_R33?.state().failed);
  await page.waitForFunction(() => globalThis.RE_SELECTION_AVATARS_R33?.status().loaded || globalThis.RE_SELECTION_AVATARS_R33?.status().failed);
  const state = await page.evaluate(() => ({generated: RE_COMBAT_SPRITES_R33.state(), native: RE_NATIVE_SPRITES_R33.state(), avatars: RE_SELECTION_AVATARS_R33.status()}));
  assert.equal(state.generated.failed, false, state.generated.message); assert.equal(state.native.failed, false, state.native.errors.join(' ')); assert.equal(state.avatars.failed, false);
  return {context, page, errors, requests, readyMs: performance.now() - start, state};
}
async function chooseDog(page) {
  await page.selectOption('#trialSubject', dog.id); await page.selectOption('#trialTarget', dog.id); await page.selectOption('#trialMode', 'human');
  await page.locator('#generatedVariantsR31').evaluate(node => {node.open = true;});
  await page.getByLabel('Illustration source du joueur 1').selectOption(dog.variantFamilyId);
}
try {
  for (let i = 0; i < 100; i++) {try {if ((await fetch(base)).ok) break;} catch {} await sleep(60);}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Three actual combat documents load the combined libraries without default edition changes', async () => {
    const observed = [];
    for (const route of routes) {
      const {context, page, errors, state, readyMs} = await scene(route);
      try {
        const result = await page.evaluate(uid => ({generated: RE_COMBAT_SPRITES_R33.list().length,
          nativeSubjects: RE_NATIVE_SPRITES_R33.state().subjects, avatars: RE_SELECTION_AVATARS_R33.list().length,
          selected: RE_COMBAT_SPRITES_R33.selectedVariant(uid), sha: RE_COMBAT_SPRITES_R33.get(uid).sha256,
          aliases: RE_COMBAT_SPRITES_R33 === RE_COMBAT_SPRITES_R27 && RE_NATIVE_SPRITES_R33 === RE_NATIVE_SPRITES_R30 && RE_SELECTION_AVATARS_R33 === RE_SELECTION_AVATARS_R30,
          budget: RE_IMAGE_BUDGET_R31.state()}), dog.id);
        assert.equal(result.generated, 367); assert.equal(result.nativeSubjects, 53); assert.equal(result.avatars, 388);
        assert.equal(result.selected, null); assert.equal(result.sha, dog.comparesAgainstSha256); assert(result.aliases);
        assert(result.budget.reservedPixels <= result.budget.limits.pixels); assert.equal(result.budget.physicalDeviceCertified, false); assert.deepEqual(errors, []);
        observed.push({route, readyMs, counts: {generated: result.generated, nativeSubjects: result.nativeSubjects, avatars: result.avatars}, initialBudget: result.budget});
      } finally {await context.close();}
    }
    return {mounts: observed, defaultEditionPromotions: 0, hardwarePerformanceCertified: false};
  });
  await test('A deliberate GameCube family renders both sides in a natural duel while actors, replay and storage stay exact', async () => {
    const {context, page, errors, requests} = await scene(routes[2] + '?uid=' + dog.id + '&target=' + dog.id);
    try {
      const storage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))); await chooseDog(page);
      const result = await page.evaluate(async uid => {
        const api = RE_CATALOG_DUEL; api.reset(false);
        while (api.getState().frame < 1500) {
          api.tick(1, {held: {}, edges: []}); const s = api.getState();
          if (s.phase === 'fight' && [0, 1].every(slot => RE_COMBAT_SPRITE_ADAPTER_R33.classify({actor: slot ? s.b : s.a, ...RE_MATCH_SEQUENCES.pose(s, slot)}) === 'idle')) break;
        }
        await Promise.all(['left', 'right'].map(facing => RE_COMBAT_SPRITES_R33.load(uid, {facing})));
        const s = api.getState(), actors = JSON.stringify([s.a, s.b]), replay = JSON.stringify(api.exportReplay());
        const before = RE_COMBAT_SPRITE_ADAPTER_R33.state(); api.draw(); const after = RE_COMBAT_SPRITE_ADAPTER_R33.state();
        return {phase: s.phase, ids: [s.a.f.uid, s.b.f.uid], frame: s.frame, drawn: after.generatedDraws - before.generatedDraws,
          sides: ['left', 'right'].map(facing => {const record = RE_COMBAT_SPRITES_R33.get(uid, {facing}); return {facing, sha256: record.sha256, sourceEdition: record.sourceEdition};}),
          actorsPreserved: actors === JSON.stringify([s.a, s.b]), replayPreserved: replay === JSON.stringify(api.exportReplay()),
          storage: JSON.stringify(Object.fromEntries(Object.entries(localStorage)))};
      }, dog.id);
      assert.equal(result.phase, 'fight'); assert(result.drawn >= 2); assert(result.actorsPreserved && result.replayPreserved); assert.equal(result.storage, storage);
      assert.notEqual(result.sides[0].sha256, result.sides[1].sha256); assert.deepEqual(errors, []);
      for (const side of ['left', 'right']) assert(requests.includes('/modules/fidelity-r33/sprites/generated/' + dog.id + '/' + side + '.png'));
      await page.screenshot({path: path.join(out, 'two-side-natural-duel.png'), fullPage: true});
      return {...result, originalIdleCertified: false, framesPerSide: 1, mirrored: false};
    } finally {await context.close();}
  });
  await test('The marine loop is labelled aquatic before selection and retains original source timing after selection', async () => {
    const {context, page, errors} = await scene();
    try {
      await page.selectOption('#trialSubject', 'rerev-sea-creeper'); await page.locator('#nativePresentationR30').evaluate(node => {node.open = true;});
      const select = page.getByLabel('Rendu natif du joueur 1'); assert.match(await select.innerText(), /aquatique observée/);
      const family = 'r33-sea-creeper-pc-2013-observed-swimming-loop'; await select.selectOption(family);
      assert.match(await page.locator('#nativePresentationR30').innerText(), /aucun appui terrestre ou idle original certifié/);
      const result = await page.evaluate(async () => {
        const item = RE_NATIVE_SPRITES_R33.resolve('rerev-sea-creeper', {facing: 'right'}); await RE_NATIVE_SPRITES_R33.preload(item.id, {count: 16});
        const c = document.createElement('canvas'); c.width = 512; c.height = 512; const ctx = c.getContext('2d');
        const a = RE_NATIVE_SPRITES_R33.render(ctx, item.id, {x: 256, y: 480, height: 240, seconds: 0, respectReducedMotion: false});
        const b = RE_NATIVE_SPRITES_R33.render(ctx, item.id, {x: 256, y: 480, height: 240, seconds: .1, respectReducedMotion: false});
        const reduced = RE_NATIVE_SPRITES_R33.render(ctx, item.id, {x: 256, y: 480, height: 240, seconds: .1, reducedMotion: true});
        return {frames: item.frames.length, sampleRate: item.sampleRate, habitat: item.variantHabitat,
          actionCertified: item.sourceActionCertified, admittedTargetEdition: item.admittedTargetEdition, first: a, next: b, reduced};
      });
      assert(result.first.ok && result.next.ok && result.reduced.ok); assert.notEqual(result.first.frame, result.next.frame); assert.equal(result.reduced.frame, 0);
      assert.equal(result.actionCertified, false); assert.equal(result.admittedTargetEdition, false); assert.equal(result.habitat, 'aquatic'); assert.deepEqual(errors, []);
      return result;
    } finally {await context.close();}
  });
  await test('Three new native face crops display in the actual avatar selection with their source edition', async () => {
    const {context, page, errors, requests} = await scene();
    try {
      await page.locator('#avatarSelectionR30').evaluate(node => {node.open = true;}); const result = [];
      for (const uid of ['re0-zombie', 're5-chainsaw-majini', 're5-executioner']) {
        await page.selectOption('#trialSubject', uid); await page.locator('.r30-selected-visual').first().scrollIntoViewIfNeeded();
        await page.waitForFunction(uid => [...document.querySelectorAll('img[data-avatar-uid]')].some(img => img.dataset.avatarUid === uid && !img.hidden && img.naturalWidth === 512), uid);
        const value = await page.evaluate(uid => {const record = RE_SELECTION_AVATARS_R33.get(uid), image = [...document.querySelectorAll('img[data-avatar-uid]')].find(img => img.dataset.avatarUid === uid && !img.hidden); return {id: uid, sourceEdition: record.sourceEdition, title: image.title,
          sourceBodyCompleteCertified: record.sourceBodyCompleteCertified, assigned: record.combatAnimationAssigned, transform: image.style.transform, sourceImage: record.image};}, uid);
        assert.match(value.title, /Rendu du modèle natif/); assert(value.title.includes(value.sourceEdition)); assert.equal(value.sourceBodyCompleteCertified, false); assert.equal(value.assigned, false); assert.match(value.transform, /scale/);
        assert(requests.includes('/' + value.sourceImage)); result.push(value);
      }
      await page.screenshot({path: path.join(out, 'native-source-avatar-crops.png'), fullPage: true}); assert.deepEqual(errors, []); return {portraits: result, originalRasterEdits: 0};
    } finally {await context.close();}
  });
  await test('Actual two-side PNGs and native atlases stay bounded and recover automatically after full credit pressure', async () => {
    const {context, page, errors} = await scene();
    try {
      await chooseDog(page);
      const result = await page.evaluate(async uid => {
        await Promise.all(['left', 'right'].map(facing => RE_COMBAT_SPRITES_R33.load(uid, {facing})));
        const native = RE_NATIVE_SPRITES_R33.list().find(item => item.libraryRelease === 'R33' && item.kind === 'native-static-pose');
        await RE_NATIVE_SPRITES_R33.preload(native.id, {count: 1});
        for (let i = 0; i < 300 && RE_IMAGE_BUDGET_R31.state().pending; i++) await new Promise(r => setTimeout(r, 10));
        const before = RE_IMAGE_BUDGET_R31.state();
        const lease = RE_IMAGE_BUDGET_R31.reserve('qa-pressure', 'whole-budget', 32 * 1024 * 1024, () => {}); if (!lease) throw Error('A settled ready set must be evictable');
        const held = await Promise.allSettled(['left', 'right'].map(facing => RE_COMBAT_SPRITES_R33.load(uid, {facing})));
        const pressure = RE_IMAGE_BUDGET_R31.state(), pendingDirections = RE_COMBAT_SPRITES_R33.state().waitingBudget;
        const start = performance.now(); lease.release();
        for (let i = 0; i < 1000 && RE_COMBAT_SPRITES_R33.state().cached < 2; i++) await new Promise(r => setTimeout(r, 10));
        const recoveryMs = performance.now() - start;
        await RE_NATIVE_SPRITES_R33.preload(native.id, {count: 1}); const ctx = document.createElement('canvas').getContext('2d');
        const drawn = ['left', 'right'].map(facing => RE_COMBAT_SPRITES_R33.draw(ctx, uid, {facing, x: 1, y: 200, height: 120}).ok);
        const samples = []; for (let i = 0; i < 250; i++) {const begin = performance.now(); RE_COMBAT_SPRITES_R33.draw(ctx, uid, {facing: i % 2 ? 'left' : 'right', x: 1, y: 200, height: 120}); samples.push(performance.now() - begin);}
        samples.sort((a, b) => a - b);
        return {before, pressure, pendingDirections, held: held.map(item => item.status), recoveryMs, drawn, recovered: RE_IMAGE_BUDGET_R31.state(),
          warmCanvasCalls: {count: 250, medianMs: samples[125], p95Ms: samples[237]}, generatedErrors: RE_COMBAT_SPRITES_R33.state().errors};
      }, dog.id);
      assert.equal(result.pressure.reservedPixels, 32 * 1024 * 1024); assert(result.pressure.evictions > result.before.evictions);
      assert.deepEqual(result.held, ['rejected', 'rejected']); assert.equal(result.pendingDirections, 2); assert.deepEqual(result.drawn, [true, true]); assert.equal(result.generatedErrors, 0);
      assert(result.recovered.reservedPixels <= result.recovered.limits.pixels); assert.equal(result.recovered.globalMemoryCertified, false); assert.deepEqual(errors, []);
      return {...result, pressureReservationIsFixture: true, measuredScope: 'Participating reader credits and JavaScript Canvas submission only. No physical screen cadence, GPU time or total browser memory certification.'};
    } finally {await context.close();}
  });
  await test('Keyboard edition controls reflow at320px with actual doubled text and pass scoped axe checks', async () => {
    const {context, page, errors} = await scene(routes[1], {viewport: {width: 320, height: 1100}});
    try {
      await page.selectOption('#trialSubject', 're3-zombie'); await page.locator('#generatedVariantsR31 summary').focus(); await page.keyboard.press('Enter');
      const select = page.getByLabel('Illustration source du joueur 1'); await select.focus(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
      assert.equal(await select.evaluate(node => node === document.activeElement), true);
      assert.equal(await page.evaluate(() => RE_COMBAT_SPRITES_R33.selectedVariant('re3-zombie')), 're3-zombie-gamecube-r33');
      await page.locator('#nativePresentationR30').evaluate(node => {node.open = true;}); await page.evaluate(() => {document.documentElement.style.fontSize = '200%';});
      const sizes = await page.evaluate(() => ['generatedVariantsR31', 'nativePresentationR30'].map(id => {const node = document.getElementById(id); return {id, width: node.getBoundingClientRect().width, scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth, font: parseFloat(getComputedStyle(node).fontSize), selectFont: parseFloat(getComputedStyle(node.querySelector('select')).fontSize)};}));
      for (const value of sizes) {assert(value.width <= 320); assert(value.scrollWidth <= value.clientWidth + 1, value.id); assert(value.font >= 24 && value.selectFont >= 24);}
      const axePath = process.env.AXE_CORE_PATH || '/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js'; await page.addScriptTag({path: axePath});
      const audit = await page.evaluate(async () => {const result = await axe.run({include: [['#generatedVariantsR31'], ['#nativePresentationR30']]}, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']}}); return {version: axe.version, violations: result.violations.map(item => ({id: item.id, nodes: item.nodes.map(node => node.target)})), passes: result.passes.length};});
      assert.equal(audit.version, '4.14.0'); assert.deepEqual(audit.violations, []); assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(out, 'variants-320-text200.png'), fullPage: true}); return {viewport: 320, sizes, audit, physicalAssistiveDeviceCertified: false};
    } finally {await context.close();}
  });
  await test('Page lifecycle releases credits and selection stays scoped to this document rather than saved progress', async () => {
    const {context, page, errors} = await scene();
    try {
      await chooseDog(page); const storage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
      const result = await page.evaluate(async uid => {
        await Promise.all(['left', 'right'].map(facing => RE_COMBAT_SPRITES_R33.load(uid, {facing})));
        dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})); const hidden = RE_IMAGE_BUDGET_R31.state();
        dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})); await Promise.all(['left', 'right'].map(facing => RE_COMBAT_SPRITES_R33.load(uid, {facing})));
        return {hidden, resumed: RE_IMAGE_BUDGET_R31.state(), selected: RE_COMBAT_SPRITES_R33.selectedVariant(uid)};
      }, dog.id);
      assert.equal(result.hidden.reservedPixels, 0); assert.equal(result.selected, dog.variantFamilyId); assert(result.resumed.reservedPixels > 0);
      assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))), storage);
      await page.reload(); await page.waitForFunction(() => globalThis.RE_COMBAT_SPRITES_R33?.state().loaded); assert.equal(await page.evaluate(uid => RE_COMBAT_SPRITES_R33.selectedVariant(uid), dog.id), null);
      assert.deepEqual(errors, []); return {documentScopedChoice: true, syntheticLifecycleEvents: true, hiddenPixels: 0, progressWrites: 0, reloadedChoice: null};
    } finally {await context.close();}
  });
  await test('An altered source-side PNG fails its digest while the chosen edition and source links remain visible', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    const raw = Buffer.from(fs.readFileSync(path.join(root, dog.image))); raw[raw.length - 1] ^= 1;
    await page.route('**/' + dog.image, route => route.fulfill({status: 200, contentType: 'image/png', body: raw}));
    try {
      await page.goto(base + routes[1]); await page.waitForFunction(() => globalThis.RE_COMBAT_SPRITES_R33?.state().loaded); await chooseDog(page);
      const result = await page.evaluate(async ({uid, facing}) => {let reason; try {await RE_COMBAT_SPRITES_R33.load(uid, {facing});} catch (error) {reason = error.message;}
        return {reason, selected: RE_COMBAT_SPRITES_R33.selectedVariant(uid), errors: RE_COMBAT_SPRITES_R33.state().errors};}, {uid: dog.id, facing: dog.sourceFacing});
      assert.match(result.reason, /SHA-256/); assert.equal(result.selected, dog.variantFamilyId); assert.equal(result.errors, 1);
      assert.match(await page.getByLabel('Illustration source du joueur 1').innerText(), /GameCube/); assert((await page.locator('#generatedVariantsR31 a').count()) > 0);
      return {...result, alteredPixelsDisplayed: false};
    } finally {await context.close();}
  });
} finally {await browser?.close(); server.kill('SIGTERM');}
const names = ['tests/browser-runtime-r33.mjs', 'modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r33/evolutions/index.html',
  'modules/fidelity-r33/evolutions/selection.js', 'modules/fidelity-r33/combat/generated-runtime.js', 'modules/fidelity-r33/combat/generated-adapter.js',
  'modules/fidelity-r33/combat/native-runtime.js', 'modules/fidelity-r33/combat/native-adapter.js', 'modules/fidelity-r33/combat/manifest.json',
  'modules/fidelity-r33/combat/native-index.json', 'modules/fidelity-r33/selection/avatars.js', 'modules/fidelity-r33/selection/manifest.json',
  'modules/fidelity-r31/performance/image-budget.js'];
const report = {schema: 're.bow.runtime-browser-r33/1', passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length,
  checks, environment: {node: process.version, chromium: await browser?.version(), executable: process.env.CHROME_BIN || '/usr/bin/chromium'},
  sourceFiles: names.map(name => ({path: name, sha256: hash(fs.readFileSync(path.join(root, name)))})),
  scope: 'Real current combat documents/PNG decoders and natural engine actors; voluntary source editions, actual200%text and scoped axe. Credit-pressure/lifecycle events are explicit fixtures. No original idle or physical-device certification.'};
fs.writeFileSync(path.join(root, 'docs/R33_RUNTIME_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
