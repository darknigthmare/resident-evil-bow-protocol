/** Real gallery DOM/controller with an explicit deferred-registry and one-pixel image fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'modules/fidelity-r31/sprites/page.js';
const baselineCommit = '1250b586509fb45de1a3d8efd24c73739733e418';
const baselineSha256 = '8aadabb00b8c7879f7db7b5e63e54a8b25bf18610842a19facb83e68a1e92cd6';
const option = name => process.argv.find(value => value.startsWith('--' + name + '='))?.slice(name.length + 3);
const baselineFile = option('baseline-source');
const baselineSource = baselineFile ? fs.readFileSync(path.resolve(baselineFile), 'utf8') :
  execFileSync('git', ['show', baselineCommit + ':' + sourcePath], {cwd: root, encoding: 'utf8'});
const currentSource = fs.readFileSync(path.join(root, sourcePath), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(baselineSource), baselineSha256, 'The baseline must be the exact published gallery controller');
assert.notEqual(currentSource, baselineSource, 'The current controller must contain the gallery correction');
const manifestPath = 'modules/fidelity-r31/sprites/manifest.json';
const manifestBytes = fs.readFileSync(path.join(root, manifestPath));
const manifest = JSON.parse(manifestBytes);
const mainEntries = manifest.sprites.filter(entry => manifest.replacements.includes(entry.id));
const variant = manifest.sameEditionVariants[0];
assert.equal(mainEntries.length, 2); assert(variant?.variantId);
const compact = entry => Object.fromEntries(['id', 'label', 'image', 'sha256', 'sourceEdition', 'sourceFacing',
  'variantId', 'sameEditionVariant', 'sourceVariantLabel', 'limitations', 'sourceCompletenessEvidence', 'provenance']
  .map(key => [key, key === 'provenance' ? {references: entry.provenance.references.map(({path}) => ({path}))} : entry[key]]));
const fixtureEntries = [...mainEntries, manifest.sprites.find(entry => entry.id === variant.id), variant].map(compact);
const outputDirectory = path.join(root, 'qa-gamedev-r32');
const reportPath = path.join(outputDirectory, 'sprite-gallery.json');
const checks = [], pageErrors = [], invariantErrors = [], missing = new Set();
const inputs = {before: new Map(), after: new Map()};
let phase = 'before', servedSource = baselineSource, browser, setupError = null;

// This substitutes the image registry, not the page. It does not verify image provenance,
// native pixel content, hashes, cache eviction or the real registry's resource budget.
function installRegistry(entries) {
  const [first, second, defaultVariantEntry, variantEntry] = entries;
  const variants = new Map(), requests = [], preparations = [], events = [];
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  for (const type of ['keydown', 'keyup', 'click', 'pagehide', 'pageshow']) addEventListener(type, event => {
    const button = event.target?.closest?.('#choices button');
    if (button || type === 'pagehide' || type === 'pageshow') events.push({type, trusted: event.isTrusted,
      key: event.key || null, target: button?.dataset.key || null, persisted: event.persisted ?? null});
  });
  globalThis.RE_COMBAT_SPRITES_R31 = Object.freeze({
    ready: () => globalThis.__galleryDeferReadyR32 ?
      new Promise(resolve => preparations.push({resolve, outcome: 'pending'})) : Promise.resolve(true),
    list: () => [first, second, defaultVariantEntry],
    availableVariants: id => id === variantEntry.id ? [variantEntry] : [],
    selectVariant: (id, key) => variants.set(id, key),
    load(id) {
      const entry = variants.get(id) ? variantEntry : [first, second, defaultVariantEntry].find(value => value.id === id);
      if (!entry) throw Error('Unknown fixture entry');
      return new Promise((resolve, reject) => requests.push({id, key: entry.variantId || entry.id, entry, resolve, reject, outcome: 'pending'}));
    },
  });
  globalThis.__galleryFixtureR32 = {
    requests: () => requests.map(({id, key, outcome}) => ({id, key, outcome})),
    preparations: () => preparations.map(({outcome}) => ({outcome})),
    events: () => events.map(value => ({...value})),
    async settleReady(index, value) {
      const preparation = preparations[index];
      if (!preparation || preparation.outcome !== 'pending') throw Error('The fixture preparation must exist and be pending');
      preparation.outcome = value; preparation.resolve(value);
      await Promise.resolve(); await Promise.resolve();
    },
    async settle(index, outcome = 'resolve') {
      const request = requests[index];
      if (!request || request.outcome !== 'pending') throw Error('The fixture request must exist and be pending');
      request.outcome = outcome;
      if (outcome === 'reject') request.reject(new Error('Controlled gallery image failure'));
      else {
        const image = new Image(); image.src = pixel; await image.decode();
        request.resolve({image, entry: request.entry});
      }
      // Let the real async choose() handler finish without a wall-clock sleep.
      await Promise.resolve(); await Promise.resolve();
    },
  };
}
const registryFixture = '(' + installRegistry.toString() + ')(' + JSON.stringify(fixtureEntries) + ');';
const registryPath = 'modules/fidelity-r31/combat/generated-runtime.js';
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2'};
const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
  if (relative === 'favicon.ico') {response.statusCode = 204; return response.end();}
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !types[path.extname(file)] || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    missing.add(relative); response.statusCode = 404; return response.end('Missing source resource');
  }
  const bytes = relative === sourcePath ? Buffer.from(servedSource) : relative === registryPath ?
    Buffer.from(registryFixture) : fs.readFileSync(file);
  inputs[phase].set(relative, {sha256: hash(bytes), fixture: relative === registryPath});
  response.setHeader('Content-Type', types[path.extname(file)]);
  response.setHeader('Cache-Control', 'no-store'); response.end(bytes);
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;
const galleryPath = '/modules/fidelity-r31/sprites/index.html';
const keyOf = entry => entry.variantId || entry.id;
const state = page => page.evaluate(() => RE_SPRITE_GALLERY_R31.state());
const requests = page => page.evaluate(() => __galleryFixtureR32.requests());
const settle = (page, index, outcome = 'resolve') => page.evaluate(([index, outcome]) => __galleryFixtureR32.settle(index, outcome), [index, outcome]);
const button = (page, entry) => page.locator('#choices button[data-key="' + keyOf(entry) + '"]');
async function loaded(page, entry) {
  await page.waitForFunction(expected => globalThis.RE_SPRITE_GALLERY_R31?.state().displayed === expected, entry.sha256);
}
async function assertSelection(page, entry) {
  const result = await state(page), url = new URL(page.url());
  assert.equal(result.selected, entry.id); assert.equal(result.variant, entry.variantId || null);
  assert.equal(result.displayed, entry.sha256); assert.equal(result.frames, 1); assert.equal(result.animated, false);
  assert.equal(url.searchParams.get('identity'), entry.id); assert.equal(url.searchParams.get('variant'), entry.variantId || null);
  assert.equal(await page.locator('#image img').count(), 1);
  assert.equal(await page.locator('#generatedSpriteR31').getAttribute('data-sha256'), entry.sha256);
  assert.equal(await page.locator('#choices button[aria-current="true"]').getAttribute('data-key'), keyOf(entry));
  assert.equal(await page.locator('#title').textContent(), entry.label);
}
const scenarios = [
  {name: 'late-rejection-keeps-current-link', width: 1280,
    defect: 'A stale rejection replaced the selected illustration URL', async run(page) {
      await button(page, mainEntries[1]).click(); await button(page, variant).click();
      await settle(page, 2); await loaded(page, variant); const selectedUrl = page.url();
      await settle(page, 1, 'reject');
      assert.equal(page.url(), selectedUrl, this.defect); await assertSelection(page, variant);
      assert.equal((await state(page)).failed, false);
      return {order: ['old pending', 'new resolved', 'old rejected'], selectionPreserved: true};
    }},
  {name: 'late-success-keeps-current-selection', width: 1280, async run(page) {
    await button(page, mainEntries[1]).click(); await button(page, variant).click();
    await settle(page, 2); await loaded(page, variant); await settle(page, 1);
    await assertSelection(page, variant); assert.equal((await state(page)).failed, false);
    return {order: ['old pending', 'new resolved', 'old resolved'], selectionPreserved: true};
  }},
  {name: 'hidden-rejection-keeps-current-link', width: 1280,
    defect: 'A hidden rejection changed the gallery URL', async run(page) {
      const previousUrl = page.url(); await button(page, mainEntries[1]).click();
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
      await settle(page, 1, 'reject');
      assert.equal(page.url(), previousUrl, this.defect);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      assert.equal((await requests(page)).length, 3); await settle(page, 2); await loaded(page, mainEntries[1]);
      await assertSelection(page, mainEntries[1]);
      return {lifecycle: 'explicit synthetic pagehide/pageshow', resumedSelection: mainEntries[1].id};
    }},
  {name: 'pending-selection-has-no-displayed-frame', width: 1280,
    defect: 'A pending selection still reported a displayed frame', async run(page) {
      await button(page, mainEntries[1]).click();
      assert.equal(await page.locator('#image img').count(), 0); assert.equal((await state(page)).displayed, null);
      assert.equal((await state(page)).frames, 0, this.defect);
      await settle(page, 1); await loaded(page, mainEntries[1]); await assertSelection(page, mainEntries[1]);
      return {framesWhilePending: 0, framesAfterDisplay: 1};
    }},
  {name: 'new-selection-clears-prior-error', width: 1280,
    defect: 'A new selection retained the prior image failure', async run(page) {
      await button(page, mainEntries[1]).click(); await settle(page, 1, 'reject');
      assert.equal((await state(page)).failed, true); await button(page, variant).click();
      assert.equal((await state(page)).failed, false, this.defect);
      await settle(page, 2); await loaded(page, variant); await assertSelection(page, variant);
      assert.equal((await state(page)).failed, false);
      await button(page, mainEntries[1]).click(); await settle(page, 3, 'reject');
      assert.equal((await state(page)).failed, true); await button(page, mainEntries[1]).click();
      assert.equal((await state(page)).failed, false); await settle(page, 4); await loaded(page, mainEntries[1]);
      await assertSelection(page, mainEntries[1]);
      return {errorVisibleBeforeSelection: true, errorClearedAtSelection: true, sameSelectionRetry: true, recovered: true};
    }},
  {name: 'first-load-interruption-retries-on-return', width: 1280, initialPending: true,
    defect: 'Returning after an interrupted first load did not retry the illustration', async run(page) {
      assert.equal((await requests(page)).length, 1);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
      await settle(page, 0, 'reject'); await page.waitForFunction(() => !!globalThis.RE_SPRITE_GALLERY_R31);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      assert.equal((await requests(page)).length, 2, this.defect);
      assert.equal((await state(page)).failed, false); await settle(page, 1); await loaded(page, mainEntries[0]);
      await assertSelection(page, mainEntries[0]);
      const lifecycle = (await page.evaluate(() => __galleryFixtureR32.events())).filter(event => event.type.startsWith('page') && !event.trusted);
      assert.deepEqual(lifecycle.map(({type, persisted}) => ({type, persisted})), [
        {type: 'pagehide', persisted: true}, {type: 'pageshow', persisted: true}]);
      return {lifecycle: 'explicit synthetic pagehide/pageshow during initial await', requests: 2, recovered: true};
    }},
  {name: 'initial-registry-interruption-restarts-preparation', width: 1280, initialRegistryPending: true,
    defect: 'Returning after an interrupted registry preparation did not retry initialization', async run(page) {
      assert.equal((await requests(page)).length, 0);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
      await page.evaluate(() => __galleryFixtureR32.settleReady(0, false));
      await page.waitForFunction(() => !!globalThis.RE_SPRITE_GALLERY_R31);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      assert.equal(await page.evaluate(() => __galleryFixtureR32.preparations().length), 2, this.defect);
      assert.equal((await state(page)).ready, false); assert.equal((await state(page)).failed, false);
      assert.equal(await page.locator('#choices button').count(), 0);
      // A second interrupted preparation must not invalidate the newer successful one.
      await page.evaluate(() => {
        dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}));
        dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));
      });
      assert.equal(await page.evaluate(() => __galleryFixtureR32.preparations().length), 3);
      await page.evaluate(() => __galleryFixtureR32.settleReady(2, true));
      await page.waitForFunction(() => __galleryFixtureR32.requests().length === 1);
      await settle(page, 0); await loaded(page, mainEntries[0]);
      await page.evaluate(() => __galleryFixtureR32.settleReady(1, false));
      await assertSelection(page, mainEntries[0]); assert.equal((await state(page)).failed, false);
      assert.equal((await state(page)).ready, true);
      return {lifecycle: 'explicit synthetic pagehide/pageshow during initial registry await', preparations: 3,
        cancelledPreparation: false, stalePreparationIgnored: true, recovered: true};
    }},
  {name: 'current-error-retains-provenance-and-selection', width: 1280, async run(page) {
    await button(page, mainEntries[1]).click(); await settle(page, 1, 'reject');
    const result = await state(page); assert.equal(result.failed, true); assert.equal(result.displayed, null);
    assert.equal(result.selected, mainEntries[1].id); assert.equal(await page.locator('#image img').count(), 0);
    assert.match(await page.locator('#message').textContent(), /Image refusée ou indisponible : Controlled gallery image failure/);
    assert((await page.locator('#sources a').count()) >= 2);
    assert.equal(new URL(page.url()).searchParams.get('identity'), mainEntries[1].id);
    return {currentFailureReported: true, provenanceAvailable: true};
  }},
  {name: 'variant-link-reloads-the-same-selection', width: 390, initialEntry: variant, async run(page) {
    await assertSelection(page, variant); const url = page.url();
    await page.reload({waitUntil: 'commit'}); await page.waitForFunction(() => globalThis.__galleryFixtureR32?.requests().length === 1);
    assert.equal((await requests(page))[0].key, variant.variantId); await settle(page, 0); await loaded(page, variant);
    assert.equal(page.url(), url); await assertSelection(page, variant);
    return {querySelection: variant.variantId, reloadPreserved: true};
  }},
  ...[1280, 390].map(width => ({name: 'native-keyboard-and-mouse-' + width, width, async run(page) {
    await button(page, mainEntries[1]).click(); await settle(page, 1); await loaded(page, mainEntries[1]);
    await button(page, variant).focus(); await page.keyboard.press('Enter'); await settle(page, 2); await loaded(page, variant);
    assert.equal(await button(page, variant).evaluate(node => node === document.activeElement), true);
    await button(page, mainEntries[0]).focus(); await page.keyboard.down('Space');
    assert.equal((await requests(page)).length, 3, 'Native Space must activate at key release');
    await page.keyboard.up('Space'); await settle(page, 3); await loaded(page, mainEntries[0]);
    await assertSelection(page, mainEntries[0]);
    const events = (await page.evaluate(() => __galleryFixtureR32.events())).filter(event => ['keydown', 'keyup', 'click'].includes(event.type));
    assert(events.length > 0 && events.every(event => event.trusted));
    assert.equal(events.filter(event => event.type === 'click').length, 3);
    assert(events.some(event => event.type === 'keydown' && event.key === 'Enter'));
    assert(events.some(event => event.type === 'keyup' && event.key === ' '));
    return {trustedClicks: 3, keyboardFocusRetained: true, spaceActivatesOnRelease: true};
  }})),
];

async function one(scenario) {
  const context = await browser.newContext({viewport: {width: scenario.width, height: 1000}, reducedMotion: 'reduce'});
  context.setDefaultTimeout(10000);
  await context.addInitScript(defer => {globalThis.__galleryDeferReadyR32 = defer;}, !!scenario.initialRegistryPending);
  const page = await context.newPage(); let originalStorage = null;
  page.on('pageerror', error => pageErrors.push({phase, scenario: scenario.name, error: error.message}));
  try {
    const initialEntry = scenario.initialEntry || mainEntries[0];
    const query = scenario.initialEntry ? '?identity=' + encodeURIComponent(initialEntry.id) + '&variant=' + encodeURIComponent(initialEntry.variantId) : '';
    const response = await page.goto(origin + galleryPath + query, {waitUntil: 'commit'}); assert.equal(response.status(), 200);
    if (scenario.initialRegistryPending) {
      await page.waitForFunction(() => globalThis.__galleryFixtureR32?.preparations().length === 1);
    } else {
      await page.waitForFunction(() => globalThis.__galleryFixtureR32?.requests().length === 1 && document.querySelectorAll('#choices button').length === 3);
    }
    originalStorage = await page.evaluate(() => JSON.stringify({...localStorage}));
    if (!scenario.initialPending && !scenario.initialRegistryPending) {await settle(page, 0); await loaded(page, initialEntry); await assertSelection(page, initialEntry);}
    const detail = await scenario.run(page);
    checks.push({phase, name: scenario.name, width: scenario.width, pass: true, detail});
    console.log('PASS ' + phase + ' ' + scenario.name);
  } catch (error) {
    const expectedBaselineDefect = phase === 'before' && !!scenario.defect && error.code === 'ERR_ASSERTION' && error.message.split('\n')[0] === scenario.defect;
    let observed = null;
    try {observed = await page.evaluate(() => ({url: location.href, state: globalThis.RE_SPRITE_GALLERY_R31?.state() || null,
      message: document.getElementById('message')?.textContent, requests: globalThis.__galleryFixtureR32?.requests() || []}));} catch {}
    checks.push({phase, name: scenario.name, width: scenario.width, pass: false, expectedBaselineDefect, error: error.stack, observed});
    console.log((expectedBaselineDefect ? 'BASELINE-DEFECT ' : 'FAIL ') + phase + ' ' + scenario.name + ': ' + error.message.split('\n')[0]);
  } finally {
    if (originalStorage !== null) {
      try {assert.equal(await page.evaluate(() => JSON.stringify({...localStorage})), originalStorage);}
      catch (error) {invariantErrors.push({phase, scenario: scenario.name, invariant: 'localStorage unchanged', error: error.message});}
    }
    await context.close();
  }
}
try {
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const currentPhase of ['before', 'after']) {
    phase = currentPhase; servedSource = phase === 'before' ? baselineSource : currentSource;
    for (const scenario of scenarios) await one(scenario);
  }
} catch (error) {setupError = error.stack; console.error(error.stack);}
finally {
  const browserVersion = browser?.version() || null; await browser?.close(); await new Promise(resolve => server.close(resolve));
  const before = checks.filter(row => row.phase === 'before'), after = checks.filter(row => row.phase === 'after');
  const expected = new Set(scenarios.filter(row => row.defect).map(row => row.name));
  const unexpectedBefore = before.filter(row => row.pass ? expected.has(row.name) : !row.expectedBaselineDefect);
  const complete = before.length === scenarios.length && after.length === scenarios.length;
  const failed = after.filter(row => !row.pass).length + unexpectedBefore.length + pageErrors.length + invariantErrors.length + missing.size + (setupError ? 1 : 0) + (complete ? 0 : 1);
  const require = createRequire(import.meta.url);
  const report = {schema: 're.bow.sprite-gallery-browser-r32/1', observedAtUTC: new Date().toISOString(), browserVersion,
    nodeVersion: process.version, playwrightVersion: require('playwright/package.json').version,
    baselineCommit, baselineControllerSha256: hash(baselineSource), currentControllerSha256: hash(currentSource),
    baselineRead: baselineFile ? 'explicit file with pinned SHA-256' : 'git show pinned commit',
    passed: after.filter(row => row.pass).length, failed, complete,
    before: {passed: before.filter(row => row.pass).length, failed: before.filter(row => !row.pass).length},
    after: {passed: after.filter(row => row.pass).length, failed: after.filter(row => !row.pass).length},
    expectedBeforeFailures: [...expected], unexpectedBefore, setupError, pageErrors, invariantErrors, missingResources: [...missing], checks,
    inputs: Object.fromEntries(Object.entries(inputs).map(([name, files]) => [name, [...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, detail]) => ({path: file, ...detail}))])),
    manifestSha256: hash(manifestBytes), registryFixtureSha256: hash(registryFixture), testSourceSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
    scope: 'Actual gallery HTML, CSS and page controller; metadata comes from the unchanged R31 manifest. The registry API, asynchronous outcomes and decoded one-pixel images are explicit fixtures. Trusted Chromium mouse and native keyboard activation at1280/390px. Synthetic pagehide/pageshow test controller boundaries, not actual BFCache eligibility. Before and after differ only in the page-controller response. No original image provenance, visual fidelity, physical device, real registry budget, combat or replay certification. The unchanged R31 browser recipe separately covers actual media in CI.'};
  fs.mkdirSync(outputDirectory, {recursive: true}); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({suite: 'sprite-gallery-r32', passed: report.passed, failed, before: report.before, after: report.after, complete, browserVersion,
    baselineControllerSha256: report.baselineControllerSha256, currentControllerSha256: report.currentControllerSha256, report: path.relative(root, reportPath)}));
  if (failed) process.exitCode = 1;
}
