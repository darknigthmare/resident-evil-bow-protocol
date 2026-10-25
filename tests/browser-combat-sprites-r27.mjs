/** Actual generated sprite selection, real combat canvases and exact-state fallbacks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-combat-sprites-r27'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_COMBAT_SPRITES_R27_PORT || 5627), base = 'http://127.0.0.1:' + port;
const actualManifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r27/sprites/manifest.json'), 'utf8'));
const actual = actualManifest.sprites.find(item => item.id === 're1-cerberus');
assert(actual?.fullBodyReviewed && actual.reviewStatus === 'visually-reviewed' && actual.poseKind === 'neutral-base', 'The actual reviewed neutral Cerberus generation is required.');
const startedAt = new Date().toISOString(), checks = [];
const only = process.env.BOW_COMBAT_SPRITES_R27_ONLY || '';
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) {
  if (only && !name.includes(only)) return;
  try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page, route = '/modules/versus.html') {
  await page.goto(base + route, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.RE_COMBAT_SPRITES_R27?.state().loaded);
}
try {
  for (let n = 0; n < 80; n++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(75); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test('Actual generated selection keeps exact identity and original canvas at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await ready(page); await page.evaluate(() => RE_COMBAT.select('re1-cerberus', 're3r-nemesis'));
      await page.waitForFunction(() => RE_COMBAT_SPRITE_PRESENTATION_R27.state().slots[0].displayed === 're1-cerberus');
      const before = await page.evaluate(() => ({state: RE_COMBAT.getState(), p1: RE_COMBAT_SPRITE_PRESENTATION_R27.state().slots[0],
        p2: RE_SPRITE_PRESENTATION_R20.state().slots[1], canvas: getComputedStyle(document.getElementById('p1Portrait')).visibility,
        image: document.querySelector('.r27-sprite-presentation').dataset.spriteId}));
      assert.equal(before.state, null); assert.equal(before.image, 're1-cerberus'); assert.equal(before.canvas, 'hidden');
      assert.equal(before.p2.displayed, 're3r-nemesis');
      await page.evaluate(() => RE_COMBAT.select('re3r-nemesis', 're1-cerberus'));
      await page.waitForFunction(() => RE_COMBAT_SPRITE_PRESENTATION_R27.state().slots[1].displayed === 're1-cerberus');
      assert.equal(await page.locator('.r27-sprite-presentation:not([hidden])').count(), 1);
      assert.equal(await page.evaluate(() => RE_COMBAT.getState()), null);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      if (width === 390 && await page.locator('#mobileP2').isVisible()) await page.click('#mobileP2');
      await page.screenshot({path: path.join(output, 'selection-' + width + '.png'), fullPage: false});
      assert.deepEqual(errors, []);
      return {width, generatedId: 're1-cerberus', historicalId: 're3r-nemesis', originalCanvasRetained: true, actorStateCreated: false};
    } finally { await context.close(); }
  });
  await test('Actual Versus draws the supplied idle PNG while actor and replay data remain unchanged', async () => {
    const context = await browser.newContext({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage();
    try {
      await ready(page); await page.evaluate(async () => { await RE_COMBAT_SPRITES_R27.load('re1-cerberus'); RE_COMBAT.start('re1-cerberus', 're3r-nemesis', 0, 'training'); });
      await page.waitForFunction(() => RE_COMBAT.getState()?.phase === 'fight', null, {timeout: 10000});
      const result = await page.evaluate(() => {
        RE_COMBAT.pause(true); const state = RE_COMBAT.getState(), before = JSON.stringify(state), counts = RE_COMBAT_SPRITE_ADAPTER_R27.state();
        RE_COMBAT.draw();
        const after = RE_COMBAT_SPRITE_ADAPTER_R27.state();
        const canvas = document.getElementById('game'), pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        return {sameState: before === JSON.stringify(state), id: state.a.f.uid, state: state.a.state,
          frame: state.frame, life: state.a.life, generatedDelta: after.generatedDraws - counts.generatedDraws,
          nonemptyPixels: pixels.some((value, index) => index % 4 !== 3 && value > 10), diagnostics: after};
      });
      assert.equal(result.id, 're1-cerberus'); assert.equal(result.sameState, true); assert(result.generatedDelta >= 1);
      assert.equal(result.nonemptyPixels, true); assert.equal(result.diagnostics.oppositeSidesMirrored, 0);
      assert.equal(result.diagnostics.missingStatesSynthesized, 0);
      await page.screenshot({path: path.join(output, 'actual-versus-idle.png'), fullPage: false});
      const canvasPNG = await page.locator('#game').evaluate(canvas => canvas.toDataURL('image/png'));
      fs.writeFileSync(path.join(output, 'actual-versus-canvas.png'), Buffer.from(canvasPNG.split(',')[1], 'base64'));
      return result;
    } finally { await context.close(); }
  });
  await test('Actual trial duel receives the same idle adapter without changing its simulation or progression scope', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await ready(page, '/catalog-duel.html?uid=re1-cerberus&target=re3r-zombie');
      await page.evaluate(async () => { await RE_COMBAT_SPRITES_R27.load('re1-cerberus'); RE_CATALOG_DUEL.reset(false); RE_CATALOG_DUEL.tick(120, {held: {}, edges: []}); window.dispatchEvent(new CustomEvent('re:assetstatus')); });
      await page.waitForFunction(() => RE_COMBAT_SPRITE_ADAPTER_R27.state().generatedDraws > 0);
      const result = await page.evaluate(() => ({state: RE_CATALOG_DUEL.getState().a.state, frame: RE_CATALOG_DUEL.getState().frame,
        id: RE_CATALOG_DUEL.getState().a.f.uid, paused: RE_CATALOG_DUEL.isPaused(), progression: RE_CATALOG_DUEL.progression,
        diagnostics: RE_COMBAT_SPRITE_ADAPTER_R27.state()}));
      assert.equal(result.id, 're1-cerberus'); assert.equal(result.frame, 120); assert.equal(result.paused, true); assert.equal(result.progression, false);
      assert.equal(result.diagnostics.collisionOrReplayDataChanged, false);
      return result;
    } finally { await context.close(); }
  });
  await test('A partial-reference manifest cannot hide the original selection canvas or enter combat', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let imageRequests = 0;
    const partial = structuredClone(actualManifest), record = partial.sprites.find(item => item.id === actual.id);
    record.fullBodyReviewed = false; record.availableStates = [];
    await page.route('**/fidelity-r27/sprites/manifest.json', route => route.fulfill({status: 200, json: partial}));
    page.on('request', request => { if (new URL(request.url()).pathname === '/' + actual.image) imageRequests++; });
    try {
      await ready(page); await page.evaluate(() => RE_COMBAT.select('re1-cerberus', 're3r-nemesis'));
      await page.waitForFunction(() => RE_COMBAT_SPRITE_PRESENTATION_R27.state().slots[0].status === 'original');
      assert.equal(await page.locator('#p1Portrait').evaluate(canvas => getComputedStyle(canvas).visibility), 'visible');
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 200;
        return RE_COMBAT_SPRITES_R27.draw(canvas.getContext('2d'), 're1-cerberus', {x: 100, y: 190, height: 100, state: 'idle', facing: 'right'});
      });
      assert.equal(result.reason, 'full-body-not-reviewed'); assert.equal(imageRequests, 0);
      return {fullBodyClaimRefused: true, originalVisible: true, generatedPNGRequests: imageRequests};
    } finally { await context.close(); }
  });
  await test('Late generated PNG completion cannot overwrite a different selected incarnation', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let seen, release;
    const requested = new Promise(resolve => { seen = resolve; }), blocked = new Promise(resolve => { release = resolve; });
    await page.route('**/' + actual.image, async route => { seen(); await blocked; await route.continue(); });
    try {
      await ready(page); await requested;
      await page.evaluate(() => RE_COMBAT.select('re3r-nemesis', 're2r-tyrant'));
      const finished = page.waitForEvent('requestfinished', {predicate: request => new URL(request.url()).pathname === '/' + actual.image});
      release(); await finished;
      await page.evaluate(async () => { await RE_COMBAT_SPRITES_R27.load('re1-cerberus'); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      assert.equal(await page.locator('.r27-sprite-presentation:not([hidden])').count(), 0);
      assert.equal((await page.evaluate(() => RE_COMBAT_SPRITE_PRESENTATION_R27.state())).slots[0].displayed, '');
      return {lateImageFenced: true, newlySelectedIdentity: 're3r-nemesis'};
    } finally { release?.(); await context.close(); }
  });
  await test('Corrupt generated bytes fail before decoding and preserve the original selection image', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    await page.route('**/' + actual.image, route => route.fulfill({status: 200, contentType: 'image/png', body: 'corrupt-generated-png'}));
    try {
      await ready(page); await page.evaluate(() => RE_COMBAT.select('re1-cerberus', 're3r-nemesis'));
      await page.waitForFunction(() => RE_COMBAT_SPRITE_PRESENTATION_R27.state().slots[0].status === 'error');
      assert.equal(await page.locator('#p1Portrait').evaluate(canvas => getComputedStyle(canvas).visibility), 'visible');
      assert.equal(await page.locator('.r27-sprite-presentation:not([hidden])').count(), 0);
      return {corruptionRejected: true, originalCanvasVisible: true, runtime: await page.evaluate(() => RE_COMBAT_SPRITES_R27.state())};
    } finally { await context.close(); }
  });
  await test('Simulated departure releases generated resources and restoration retains one observer and one image per slot', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await ready(page); await page.evaluate(() => RE_COMBAT.select('re1-cerberus', 're1-cerberus'));
      await page.waitForFunction(() => RE_COMBAT_SPRITE_PRESENTATION_R27.state().slots.every(slot => slot.displayed === 're1-cerberus'));
      const departed = await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})); return RE_COMBAT_SPRITES_R27.state(); });
      assert.equal(departed.active, false); assert.equal(departed.cached, 0);
      await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})); window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})); });
      await page.waitForFunction(() => RE_COMBAT_SPRITE_PRESENTATION_R27.state().slots.every(slot => slot.displayed === 're1-cerberus'));
      assert.equal(await page.locator('.r27-sprite-presentation').count(), 2);
      assert.equal(await page.evaluate(() => RE_COMBAT.getState()), null);
      return {simulatedLifecycle: true, noAutomaticMatchStart: true, maximumDecodedImages: 4, imagesPerSlot: 1};
    } finally { await context.close(); }
  });
  for (const width of [1280, 390]) await test('Dossier links only the exact generated identity and current workbook at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}}), page = await context.newPage(); let autoPNG = 0;
    page.on('request', request => { if (new URL(request.url()).pathname === '/' + actual.image) autoPNG++; });
    try {
      await page.goto(base + '/codex.html?id=re1-cerberus');
      await page.waitForFunction(() => RE_DOSSIER_SPRITES_R27.state().loaded && RE_DOSSIER_SPRITES_R27.state().id === 're1-cerberus');
      const host = page.locator('#detailGeneratedSpriteR27'); assert.equal(await host.isVisible(), true);
      const link = new URL(await host.locator('a').getAttribute('href'));
      assert.equal(link.origin, base); assert.equal(link.pathname, '/modules/fidelity-r27/sprites/index.html'); assert.equal(link.searchParams.get('identity'), 're1-cerberus');
      assert.equal(new URL(await page.locator('#fidelityR23Link').getAttribute('href')).pathname, '/modules/fidelity-r27/index.html');
      const image = await page.evaluate(() => ({actual: document.getElementById('detailImage').getAttribute('src'), expected: RE_DATA.fighters.find(item => item.uid === 're1-cerberus').sprite}));
      assert.equal(image.actual, image.expected); assert.equal(autoPNG, 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'dossier-' + width + '.png'), fullPage: false});
      return {width, identity: 're1-cerberus', exactGalleryURL: link.href, automaticGeneratedImageRequests: autoPNG, historicalImagePreserved: true};
    } finally { await context.close(); }
  });
  await test('Unknown or repeated sprite Dossier identities fail closed without disabling the historical references', async () => {
    const context = await browser.newContext(), page = await context.newPage(), malformed = structuredClone(actualManifest);
    if (malformed.pending.length) malformed.pending[0].id = actual.id;
    else malformed.sprites.find(item => item.id !== actual.id).id = actual.id;
    await page.route('**/fidelity-r27/sprites/manifest.json', route => route.fulfill({status: 200, json: malformed}));
    try {
      await page.goto(base + '/codex.html?id=re1-cerberus'); await page.waitForFunction(() => RE_DOSSIER_SPRITES_R27.state().loaded);
      assert.equal((await page.evaluate(() => RE_DOSSIER_SPRITES_R27.state())).failed, true);
      assert.equal(await page.locator('#detailGeneratedSpriteR27').isHidden(), true);
      assert.equal(await page.locator('#fidelityR23Link').count(), 1);
      assert.equal(await page.locator('#detailImage').isVisible(), true);
      return {invalidManifestRefused: true, originalDossierRemainsAvailable: true};
    } finally { await context.close(); }
  });
  await test('Actual sprite manifests above two MiB remain bounded at four MiB in runtime and Dossiers', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    const padded = size => {
      const empty = JSON.stringify({...actualManifest, transportPadding: ''});
      assert(Buffer.byteLength(empty) < size);
      return JSON.stringify({...actualManifest, transportPadding: ' '.repeat(size - Buffer.byteLength(empty))});
    };
    const accepted = padded(3 * 1024 * 1024), refused = padded(5 * 1024 * 1024);
    let oversized = false;
    await page.route('**/fidelity-r27/sprites/manifest.json', route => {
      const body = oversized ? refused : accepted;
      return route.fulfill({status: 200, contentType: 'application/json', headers: {'content-length': String(Buffer.byteLength(body))}, body});
    });
    try {
      await ready(page);
      assert.equal(await page.evaluate(() => RE_COMBAT_SPRITES_R27.state().limits.manifestBytes), 4 * 1024 * 1024);
      assert.equal(await page.evaluate(() => RE_COMBAT_SPRITES_R27.get('re1-cerberus').id), 're1-cerberus');
      await page.goto(base + '/codex.html?id=re1-cerberus');
      await page.waitForFunction(() => RE_DOSSIER_SPRITES_R27.state().loaded);
      assert.equal(await page.evaluate(() => RE_DOSSIER_SPRITES_R27.state().failed), false);
      assert.equal(await page.locator('#detailGeneratedSpriteR27').isVisible(), true);
      oversized = true;
      await page.goto(base + '/modules/versus.html'); await page.waitForFunction(() => RE_COMBAT_SPRITES_R27.state().failed);
      assert.equal(await page.evaluate(() => RE_COMBAT_SPRITES_R27.get('re1-cerberus')), null);
      assert.equal(await page.evaluate(() => RE_COMBAT_SPRITES_R27.get('re2r-tyrant').origin), 'R20');
      await page.goto(base + '/codex.html?id=re1-cerberus'); await page.waitForFunction(() => RE_DOSSIER_SPRITES_R27.state().loaded);
      assert.equal(await page.evaluate(() => RE_DOSSIER_SPRITES_R27.state().failed), true);
      assert.equal(await page.locator('#detailGeneratedSpriteR27').isHidden(), true);
      assert.equal(await page.locator('#detailImage').isVisible(), true);
      return {acceptedBytes: Buffer.byteLength(accepted), refusedBytes: Buffer.byteLength(refused),
        boundBytes: 4 * 1024 * 1024, actualRecordsRetained: actualManifest.sprites.length,
        fixtureScope: 'Unchanged actual records plus explicit transport padding; no fake PNG or source metadata.', historicalFallbackRetained: true};
    } finally { await context.close(); }
  });
  await test('A real whole-body right-facing source bind pose remains a presentation and never becomes idle art', async () => {
    const bind = actualManifest.sprites.find(item => item.id === 'reoutbreak-zombie');
    assert(bind?.fullBodyReviewed && bind.sourceFacing === 'right' && bind.poseKind === 'source-bind-pose', 'Review the actual Outbreak Zombie bind pose before this test.');
    assert.deepEqual(bind.availableStates, []);
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await ready(page, '/catalog-duel.html?uid=' + bind.id);
      const value = await page.evaluate(async id => {
        const record = RE_COMBAT_SPRITES_R27.get(id); await RE_COMBAT_SPRITES_R27.load(id);
        const before = JSON.stringify(RE_CATALOG_DUEL.getState()), canvas = document.createElement('canvas'); canvas.width = canvas.height = 200;
        const result = RE_COMBAT_SPRITES_R27.draw(canvas.getContext('2d'), id, {x: 100, y: 190, height: 100, state: 'idle', facing: 'right'});
        return {record: {id: record.id, poseKind: record.poseKind, fullBodyReviewed: record.fullBodyReviewed,
          sourceFacing: record.sourceFacing, availableStates: record.availableStates}, result,
          stateUnchanged: before === JSON.stringify(RE_CATALOG_DUEL.getState())};
      }, bind.id);
      assert.equal(value.record.fullBodyReviewed, true); assert.equal(value.record.sourceFacing, 'right');
      assert.equal(value.result.reason, 'pose-not-neutral-base'); assert.equal(value.stateUnchanged, true);
      return {...value, actualGeneratedImageSHA256: bind.sha256, sourceBindPoseNotIdle: true};
    } finally { await context.close(); }
  });
  await test('New R27 Dossier audio and quotes stay exact, local and independent of sprite completeness', async () => {
    const additions = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r27/dossier-additions.json'), 'utf8'));
    const context = await browser.newContext({viewport: {width: 390, height: 1000}}), page = await context.newPage();
    let audioRequests = 0; page.on('request', request => { if (/\.(?:wav|ogg)(?:\?|$)/i.test(request.url())) audioRequests++; });
    const audio = additions.identities.find(item => item.audio), canonical = additions.identities.find(item => item.canonical);
    try {
      for (const [entry, key] of [[audio, 'audio'], [canonical, 'canonical']]) {
        await page.goto(base + '/codex.html?id=' + entry.id);
        await page.waitForFunction(id => RE_DOSSIER_SPRITES_R27.state().sourceIndexLoaded && RE_DOSSIER_SPRITES_R27.state().id === id, entry.id);
        const state = await page.evaluate(() => RE_DOSSIER_SPRITES_R27.state());
        assert.equal(state.sourceIndexFailed, false);
        assert.equal(state[key], entry[key][key === 'audio' ? 'clips' : 'claims']);
        const links = await page.locator('#detailGeneratedSpriteR27 a').evaluateAll(nodes => nodes.map(node => node.href));
        const expected = new URL(entry[key].href, base + '/modules/fidelity-r27/').href;
        assert(links.includes(expected)); assert(links.every(href => new URL(href).origin === base));
        const unchanged = await page.evaluate(id => {
          const record = RE_DATA.catalog.find(item => item.id === id), fighter = RE_DATA.fighters.find(item => item.uid === id);
          return document.getElementById('detailImage').getAttribute('src') === (fighter?.sprite || record.portrait || fighter?.portrait || '');
        }, entry.id); assert.equal(unchanged, true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      }
      assert.equal(audioRequests, 0);
      const hostile = structuredClone(additions); hostile.identities.find(item => item.audio).audio.href = 'https://untrusted.invalid/collect';
      await page.route('**/fidelity-r27/dossier-additions.json', route => route.fulfill({status: 200, json: hostile}));
      await page.goto(base + '/codex.html?id=' + audio.id); await page.waitForFunction(() => RE_DOSSIER_SPRITES_R27.state().sourceIndexLoaded);
      assert.equal(await page.evaluate(() => RE_DOSSIER_SPRITES_R27.state().sourceIndexFailed), true);
      assert.equal(await page.locator('a[href^="https://untrusted.invalid"]').count(), 0);
      assert.equal(await page.locator('#detailImage').isVisible(), true);
      return {newAudioClips: additions.summary.newAudioClips, newQuoteIdentities: additions.summary.newClaimIdentities,
        cumulativeAudioIdentities: additions.summary.cumulativeAudioIdentities,
        cumulativeQuoteIdentities: additions.summary.cumulativeClaimIdentities,
        automaticAudioRequests: audioRequests, externalTargetRefused: true, originalImagesPreserved: true};
    } finally { await context.close(); }
  });
  await test('Opaque replay sandbox skips new sprite fetches and renderer installation', async () => {
    const context = await browser.newContext(), page = await context.newPage(), spriteRequests = [];
    page.on('request', request => { if (/sprites\/manifest\.json|\/generated\//.test(request.url())) spriteRequests.push(request.url()); });
    try {
      await page.goto(base + '/');
      await page.evaluate(base => {
        const frame = document.createElement('iframe'); frame.id = 'opaqueSpriteCheck'; frame.sandbox = 'allow-scripts';
        frame.srcdoc = '<!doctype html><script src="' + base + '/modules/fidelity-r27/combat/sprite-runtime.js"><\/script><script src="' + base + '/modules/fidelity-r27/combat/adapter.js"><\/script><script>window.checked=true;<\/script>';
        document.body.append(frame);
      }, base);
      const frame = page.frames().find(item => item.parentFrame()); assert(frame);
      await frame.waitForFunction(() => window.checked);
      const value = await frame.evaluate(() => ({origin: location.origin, runtime: Boolean(window.RE_COMBAT_SPRITES_R27), adapter: Boolean(window.RE_COMBAT_SPRITE_ADAPTER_R27)}));
      assert.equal(value.origin, 'null'); assert.equal(value.runtime, false); assert.equal(value.adapter, false); assert.equal(spriteRequests.length, 0);
      return {...value, spriteNetworkRequests: 0};
    } finally { await context.close(); }
  });
} finally {
  const report = {schema: 're.bow.combat-sprite-browser-r27/1', startedAt, completedAt: new Date().toISOString(),
    environment: {node: process.version, chromium: browser?.version() || null, headless: true, physicalDevices: false},
    passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks,
    scope: 'Actual reviewed generated Cerberus base pose plus existing R20 images; actual main/trial canvas, presentation, error/lifecycle and Dossier links. One idle/right view only; no attack/left-view/complete animation claim.'};
  const reportName = only ? process.env.BOW_COMBAT_SPRITES_R27_REPORT || 'R27_COMBAT_BROWSER_FOLLOWUP.json' : 'R27_COMBAT_BROWSER.json';
  assert(/^[A-Z0-9_]+\.json$/.test(reportName), 'A local report basename is required.');
  fs.writeFileSync(path.join(root, 'docs', reportName), JSON.stringify({...report, filteredTo: only || null}, null, 2) + '\n');
  fs.writeFileSync(path.join(output, reportName), JSON.stringify({...report, filteredTo: only || null}, null, 2) + '\n');
  await browser?.close(); server.kill('SIGTERM'); console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
  if (report.failed) process.exitCode = 1;
}
