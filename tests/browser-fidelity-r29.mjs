/** Current R29 dashboard and exact-UID Dossier evidence in real Chromium. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-fidelity-r29'); fs.mkdirSync(output, {recursive: true});
const base = 'http://127.0.0.1:' + (process.env.BOW_R29_FIDELITY_PORT || 5869);
const progressPath = 'modules/fidelity-r29/progress.json', dossierPath = 'modules/fidelity-r29/dossier-additions.json';
const progress = JSON.parse(fs.readFileSync(path.join(root, progressPath))), index = JSON.parse(fs.readFileSync(path.join(root, dossierPath)));
const checks = {dashboard: [], dossier: []}, startedAt = new Date().toISOString();
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: new URL(base).port}, stdio: 'ignore'});
let browser;
async function test(group, name, run) {
  try { const evidence = await run(); checks[group].push({name, pass: true, evidence}); console.log('PASS ' + group + ' ' + name); }
  catch (error) { checks[group].push({name, pass: false, error: error.stack}); console.error('FAIL ' + group + ' ' + name + ': ' + error.message); }
}
async function ready(page, uid) {
  await page.goto(base + '/codex.html?id=' + encodeURIComponent(uid), {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(uid => window.RE_DOSSIER_ADDITIONS_R29?.state().loaded && RE_DOSSIER_ADDITIONS_R29.state().id === uid, uid);
}
async function zoom(page) {
  await page.evaluate(() => {const elements = [...document.querySelectorAll('body *')].filter(element => !['STYLE', 'SCRIPT'].includes(element.tagName)); const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize)); elements.forEach((element, i) => element.style.setProperty('font-size', sizes[i] * 2 + 'px', 'important'));});
}
async function state(page) {
  return page.evaluate(() => ({...RE_DOSSIER_ADDITIONS_R29.state(), text: document.getElementById('detailAdditionsR29').textContent,
    hidden: document.getElementById('detailAdditionsR29').hidden, links: [...document.querySelectorAll('#detailAdditionsR29 a')].map(item => item.href)}));
}
try {
  for (let n = 0; n < 80; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 75)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1280, 320]) await test('dashboard', 'All17 open criteria, local proofs and doubled text at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + '/modules/fidelity-r29/index.html'); await page.waitForFunction(() => !document.getElementById('search').disabled);
      assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), progress.tasks.map(row => row.id).sort());
      assert.equal(await page.locator('.task .status').evaluateAll(nodes => nodes.every(node => node.textContent === 'EN COURS')), true);
      assert.deepEqual(await page.locator('#statistics strong').allTextContents(), progress.statistics.map(row => String(row.value)));
      const links = await page.locator('main a[href]').evaluateAll(nodes => nodes.map(node => node.href));
      for (const href of links) { assert.equal(new URL(href).origin, base); assert((await context.request.get(href)).ok(), href); }
      await page.selectOption('#category', 'functions'); assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), ['G-REPLAYS', 'G-SAUVES']);
      await page.selectOption('#category', 'all'); await page.fill('#search', 'R20-09'); assert.equal(await page.locator('[data-task-id]').count(), 1);
      await page.locator('.task summary').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.task details').getAttribute('open'), '');
      await page.fill('#search', 'absent-critere'); assert.equal(await page.locator('[data-task-id]').count(), 0); await page.fill('#search', '');
      await zoom(page); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'dashboard-' + width + '.png'), fullPage: true}); assert.deepEqual(errors, []);
      return {width, criteria: 17, exactCounters: true, resolvedProofs: links.length, everyComputedFontDoubled: true};
    } finally { await context.close(); }
  });
  await test('dashboard', 'Missing progress retries and remote evidence is rejected while markup stays inert', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let payload = null, unavailable = true;
    await page.route('**/fidelity-r29/progress.json', route => unavailable ? route.fulfill({status: 503}) : payload ? route.fulfill({json: payload}) : route.continue());
    try {
      await page.goto(base + '/modules/fidelity-r29/index.html'); await page.waitForFunction(() => !document.getElementById('retry').hidden);
      assert.equal(await page.locator('[data-task-id]').count(), 0); unavailable = false; await page.click('#retry'); await page.waitForFunction(() => !document.getElementById('search').disabled);
      assert.equal(await page.locator('[data-task-id]').count(), 17);
      payload = structuredClone(progress); payload.tasks[0].title = '<img src=x onerror="window.injectedR29=true">'; await page.reload(); await page.waitForFunction(() => !document.getElementById('search').disabled);
      assert.equal(await page.locator('.task img').count(), 0); assert.equal(await page.evaluate(() => !!window.injectedR29), false);
      payload.tasks[0].evidence[0].href = 'https://example.invalid/untrusted'; await page.reload(); await page.waitForFunction(() => !document.getElementById('retry').hidden);
      assert.match(await page.locator('#loadStatus').textContent(), /Lien de suivi invalide/); return {retry: true, markupInert: true, remoteProofRefused: true};
    } finally { await context.close(); }
  });
  await test('dossier', 'Exact source-body links verify SHA without any automatic PNG load', async () => {
    const record = index.identities.find(row => row.bodyViews > 0); assert(record, 'Actual source-body references are required.');
    const context = await browser.newContext(), page = await context.newPage(); const sourcePngs = [];
    page.on('request', request => {if (/\/fidelity-r29\/(?:sources|motion)\/.*\.png(?:\?|$)/.test(request.url())) sourcePngs.push(request.url());});
    try {
      await ready(page, record.id); const actual = await state(page); assert.equal(actual.failed, false); assert.equal(actual.bodyModels, record.bodyModels); assert.equal(sourcePngs.length, 0);
      const expected = record.bodySources.flatMap(source => source.views); assert.equal(expected.length, record.bodyViews);
      for (const view of expected) {
        const url = new URL(view.path, base + '/modules/fidelity-r29/').href; assert(actual.links.includes(url));
        const response = await context.request.get(url); assert(response.ok()); assert.equal(createHash('sha256').update(await response.body()).digest('hex'), view.sha256);
      }
      assert.match(actual.text, /pose de base|variante/); return {uid: record.id, models: record.bodyModels, views: record.bodyViews, automaticSourcePngRequests: 0, exactHashes: true};
    } finally { await context.close(); }
  });
  await test('dossier', 'Native references keep their exact UID and HD edition without an assigned idle cycle', async () => {
    const record = index.identities.find(row => row.nativeClips.length > 0); assert(record, 'Actual native scene evidence is required.');
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await ready(page, record.id); const actual = await state(page);
      assert.equal(actual.nativeFrames, record.nativeClips.reduce((sum, clip) => sum + clip.frameCount, 0)); assert.equal(actual.failed, false);
      for (const clip of record.nativeClips) assert(actual.text.includes(clip.sourceEdition));
      assert.match(actual.text, /non attribué/); assert.match(actual.text, /aucun cycle de combat/);
      const href = actual.links.find(href => href.includes('/motion/index.html')); assert.equal(new URL(href).searchParams.get('id'), record.id); assert((await context.request.get(href)).ok());
      return {uid: record.id, nativeFrames: actual.nativeFrames, exactSourceEditions: true, combatCyclesAssigned: 0};
    } finally { await context.close(); }
  });
  await test('dossier', 'Documentary HD variants remain separate from the original target and use exact gallery variants', async () => {
    const records = index.identities.filter(row => row.documentaryVariants.length); assert(records.length >= 4, 'The four preserved HD interpretations must be exposed.');
    const context = await browser.newContext(), page = await context.newPage();
    try {
      const variants = [];
      for (const record of records) {
        await ready(page, record.id); const actual = await state(page); assert.equal(actual.failed, false); assert.equal(actual.documentaryVariants, record.documentaryVariants.length);
        for (const variant of record.documentaryVariants) {
          const href = actual.links.find(href => new URL(href).searchParams.get('variant') === variant.variantId); assert(href);
          assert.equal(new URL(href).searchParams.get('identity'), record.id); assert(actual.text.includes(variant.sourceEdition)); assert(actual.text.includes(variant.targetIncarnation));
          assert.match(actual.text, /ne remplace pas le PNG actif/); assert((await context.request.get(href)).ok()); variants.push(variant.variantId);
        }
      }
      return {variants, originalTargetBodiesCompleted: 0, documentaryLinksExact: true};
    } finally { await context.close(); }
  });
  await test('dossier', 'Known appearance gaps hold neutral poses and the current header targets R29', async () => {
    const record = index.identities.find(row => row.spriteChange?.poseKind === 'neutral-base' && row.spriteChange.knownAppearanceGaps.length); assert(record, 'The held neutral pose must remain explicit.');
    const page = await browser.newPage();
    try {
      await ready(page, record.id); const actual = await state(page); assert.equal(actual.heldForAppearanceGaps, true); assert.match(actual.text, /pose neutre reste retenue/);
      assert.equal(await page.locator('#fidelityR23Link').count(), 1); assert.equal(new URL(await page.locator('#fidelityR23Link').getAttribute('href'), base).pathname, '/modules/fidelity-r29/index.html');
      return {uid: record.id, heldForAppearanceGaps: true, headerLink: 'R29'};
    } finally { await page.close(); }
  });
  await test('dossier', 'Retained legacy PNGs disclose HD source editions without new pixels or pose reviews', async () => {
    const page = await browser.newPage(), identities = ['rerev-wall-blister', 'rerev-scagdead'];
    try {
      for (const uid of identities) {
        const record = index.identities.find(row => row.id === uid), change = record?.spriteChange;
        assert(change?.sourceEdition && change.sourceVariantLabel); assert.equal(change.pixelRevision, false); assert.deepEqual(change.availableStates, []);
        assert(change.knownAppearanceGaps.length > 0); assert.equal(record.documentaryVariants.length, 0);
        await ready(page, uid); const actual = await state(page); assert.equal(actual.failed, false); assert.equal(actual.pixelRevision, false);
        assert(actual.text.includes(change.sourceEdition)); assert(actual.text.includes(change.sourceVariantLabel));
        const href = actual.links.find(href => new URL(href).pathname.endsWith('/sprites/index.html'));
        assert(href); assert.equal(new URL(href).searchParams.get('identity'), uid); assert.equal(new URL(href).searchParams.has('variant'), false);
      }
      return {identities, sourceEditionDisclosed: true, original3dsEquivalenceCertified: false, newPixels: 0, newPoseReviews: 0};
    } finally { await page.close(); }
  });
  await test('dossier', 'Forged cycles, edition admission and remote body views fail without hiding old sources', async () => {
    const body = index.identities.find(row => row.bodySources.length), native = index.identities.find(row => row.nativeClips.length), variant = index.identities.find(row => row.documentaryVariants.length);
    assert(body && native && variant); const mutations = [
      value => {value.identities.find(row => row.id === native.id).nativeClips[0].availableCombatStates = ['idle'];},
      value => {value.identities.find(row => row.id === variant.id).documentaryVariants[0].admittedTargetEdition = true;},
      value => {value.identities.find(row => row.id === body.id).bodySources[0].views[0].path = 'https://example.invalid/foreign.png';}
    ];
    for (const mutate of mutations) {
      const context = await browser.newContext(), page = await context.newPage(), value = structuredClone(index); mutate(value);
      await page.route('**/fidelity-r29/dossier-additions.json', route => route.fulfill({json: value}));
      try { await ready(page, body.id); const actual = await state(page); assert.equal(actual.failed, true); assert.equal(actual.hidden, true); assert(await page.locator('#detailSources a').count() > 0); }
      finally { await context.close(); }
    }
    return {forgedStatesRejected: true, editionPromotionRejected: true, remoteViewRejected: true, historicalSourcesRetained: true};
  });
  await test('dossier', 'The source details retain keyboard focus and reflow at320px with doubled text', async () => {
    const record = index.identities.find(row => row.bodySources.length); assert(record);
    const context = await browser.newContext({viewport: {width: 320, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await ready(page, record.id); const summary = page.locator('#detailAdditionsR29 summary').first(); await summary.focus(); await page.keyboard.press('Enter');
      assert.equal(await summary.evaluate(element => document.activeElement === element), true); assert.equal(await page.locator('#detailAdditionsR29 details').first().getAttribute('open'), '');
      await zoom(page); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'dossier-320-200pct.png'), fullPage: false}); assert.deepEqual(errors, []); return {uid: record.id, focusRetained: true, everyComputedFontDoubled: true};
    } finally { await context.close(); }
  });
} catch (error) { checks.dashboard.push({name: 'suite setup', pass: false, error: error.stack}); console.error(error.stack); }
finally {
  await browser?.close(); server.kill('SIGTERM'); let failed = 0;
  const common = ['tests/browser-fidelity-r29.mjs', progressPath, dossierPath, 'modules/fidelity-r29/index.html', 'modules/fidelity-r29/dossier-link.js', 'codex.html'];
  for (const [group, entries] of Object.entries(checks)) {
    const report = {schema: 're.bow.' + group + '-browser-r29/1', startedAt, completedAt: new Date().toISOString(),
      passed: entries.filter(row => row.pass).length, failed: entries.filter(row => !row.pass).length, checks: entries,
      sourceFiles: common.map(file => ({path: file, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')})),
      physicalDevicesCertified: false, assignedNativeCombatCycles: 0};
    fs.writeFileSync(path.join(root, 'docs/R29_' + (group === 'dashboard' ? 'DASHBOARD' : 'DOSSIER') + '_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({group, passed: report.passed, failed: report.failed})); failed += report.failed;
  }
  if (failed || checks.dossier.length === 0) process.exitCode = 1;
}
