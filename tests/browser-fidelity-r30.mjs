/** Real current R30 dashboard and exact-UID Dossier presentation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-fidelity-r30'); fs.mkdirSync(output, {recursive: true});
const base = 'http://127.0.0.1:' + (process.env.BOW_R30_FIDELITY_PORT || 5870);
const progressPath = 'modules/fidelity-r30/progress.json', dossierPath = 'modules/fidelity-r30/dossier-additions.json';
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
  await page.waitForFunction(uid => window.RE_DOSSIER_ADDITIONS_R30?.state().loaded && RE_DOSSIER_ADDITIONS_R30.state().id === uid, uid);
}
async function zoom(page) {
  await page.evaluate(() => {
    const elements = [...document.querySelectorAll('body *')].filter(element => !['STYLE', 'SCRIPT'].includes(element.tagName));
    const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => element.style.setProperty('font-size', sizes[index] * 2 + 'px', 'important'));
  });
}
async function state(page) {
  return page.evaluate(() => ({...RE_DOSSIER_ADDITIONS_R30.state(), text: document.getElementById('detailAdditionsR30').textContent,
    hidden: document.getElementById('detailAdditionsR30').hidden, links: [...document.querySelectorAll('#detailAdditionsR30 a')].map(item => item.href)}));
}
try {
  for (let n = 0; n < 80; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 75)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1280, 320]) await test('dashboard', 'All 17 open criteria, actual counters and doubled text at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + '/modules/fidelity-r30/index.html'); await page.waitForFunction(() => !document.getElementById('search').disabled);
      assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), progress.tasks.map(row => row.id).sort());
      assert.equal(await page.locator('.task .status').evaluateAll(nodes => nodes.every(node => node.textContent === 'EN COURS')), true);
      assert.deepEqual(await page.locator('#statistics strong').allTextContents(), progress.statistics.map(row => String(row.value)));
      const links = await page.locator('main a[href]').evaluateAll(nodes => nodes.map(node => node.href));
      for (const href of links) { assert.equal(new URL(href).origin, base); assert((await context.request.get(href)).ok(), href); }
      await page.selectOption('#category', 'functions'); assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), ['G-REPLAYS', 'G-SAUVES']);
      await page.selectOption('#category', 'all'); await page.fill('#search', 'R20-09'); assert.equal(await page.locator('[data-task-id]').count(), 1);
      await page.locator('.task summary').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.task details').getAttribute('open'), '');
      await page.fill('#search', 'no-such-workstream'); assert.equal(await page.locator('[data-task-id]').count(), 0); await page.fill('#search', '');
      await zoom(page); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'dashboard-' + width + '.png'), fullPage: true}); assert.deepEqual(errors, []);
      return {width, criteria: 17, actualCounters: true, resolvedProofs: links.length, everyComputedFontDoubled: true};
    } finally { await context.close(); }
  });
  await test('dashboard', 'Unavailable progress retries; remote proof and executable markup are rejected', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let payload = null, unavailable = true;
    await page.route('**/fidelity-r30/progress.json', route => unavailable ? route.fulfill({status: 503}) : payload ? route.fulfill({json: payload}) : route.continue());
    try {
      await page.goto(base + '/modules/fidelity-r30/index.html'); await page.waitForFunction(() => !document.getElementById('retry').hidden);
      assert.equal(await page.locator('[data-task-id]').count(), 0); unavailable = false; await page.click('#retry'); await page.waitForFunction(() => !document.getElementById('search').disabled);
      assert.equal(await page.locator('[data-task-id]').count(), 17);
      payload = structuredClone(progress); payload.tasks[0].title = '<img src=x onerror="window.injectedR30=true">';
      await page.reload(); await page.waitForFunction(() => !document.getElementById('search').disabled);
      assert.equal(await page.locator('.task img').count(), 0); assert.equal(await page.evaluate(() => !!window.injectedR30), false);
      payload.tasks[0].evidence[0].href = 'https://example.invalid/untrusted'; await page.reload();
      await page.waitForFunction(() => !document.getElementById('retry').hidden);
      assert.match(await page.locator('#loadStatus').textContent(), /Lien de suivi invalide/);
      return {retry: true, markupInert: true, remoteProofRefused: true};
    } finally { await context.close(); }
  });
  await test('dossier', 'Native evidence keeps its UID, editions and separately qualified idle count without preloading frames', async () => {
    const row = index.identities.find(item => item.nativeEntries.length); assert(row, 'Actual native entries required');
    const context = await browser.newContext(), page = await context.newPage(), nativeRequests = [];
    page.on('request', request => {if (/\/fidelity-r30\/native\/.*\.png(?:\?|$)/.test(request.url())) nativeRequests.push(request.url());});
    try {
      await ready(page, row.id); const actual = await state(page);
      assert.equal(actual.failed, false); assert.equal(actual.nativeFrames, row.nativeFrames);
      assert.equal(actual.combatStances, row.combatStances); assert.equal(actual.verifiedIdleCycles, row.verifiedIdleCycles);
      assert.equal(actual.optionalObservedVariants, row.optionalObservedVariants);
      for (const edition of row.sourceEditions) assert(actual.text.includes(edition));
      assert.match(actual.text, /Une séquence fluide ne devient pas automatiquement/); assert.equal(nativeRequests.length, 0);
      const href = actual.links.find(url => url.includes('/native/index.html')); assert(href);
      assert.equal(new URL(href).searchParams.get('id'), row.id); assert((await context.request.get(href)).ok());
      return {uid: row.id, nativeFrames: actual.nativeFrames, combatStances: row.combatStances, verifiedIdleCycles: row.verifiedIdleCycles, automaticNativePngRequests: 0};
    } finally { await context.close(); }
  });
  await test('dossier', 'Selection portrait links retain exact source bytes and never qualify full body or movement', async () => {
    const row = index.identities.find(item => item.avatarImage && !item.nativeEntries.length); assert(row);
    const avatar = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r30/selection/manifest.json'))).entries.find(item => item.id === row.id); assert(avatar);
    const page = await browser.newPage();
    try {
      await ready(page, row.id); const actual = await state(page); assert.equal(actual.avatar, true); assert.equal(actual.nativeFrames, 0);
      const href = actual.links.find(url => new URL(url).pathname === '/' + row.avatarImage); assert(href);
      const response = await page.request.get(href); assert(response.ok());
      assert.equal(createHash('sha256').update(await response.body()).digest('hex'), avatar.sha256);
      assert.match(actual.text, /ne qualifie pas son corps entier ou ses mouvements/);
      assert.equal(await page.locator('#detailAdditionsR30 img').count(), 0);
      assert.equal(await page.locator('#fidelityR23Link').count(), 1);
      assert.equal(new URL(await page.locator('#fidelityR23Link').getAttribute('href'), base).pathname, '/modules/fidelity-r30/index.html');
      return {uid: row.id, exactAvatarSha256: avatar.sha256, inferredBodyOrAnimation: false, currentHeader: 'R30'};
    } finally { await page.close(); }
  });
  await test('dossier', 'Observed source-edition loops remain voluntary variants with no certified target idle', async () => {
    const rows = index.identities.filter(item => item.optionalObservedVariants > 0);
    assert.equal(rows.length, 5, 'Five source families were actually observed');
    assert.equal(rows.filter(row => row.optionalPlayableVariants > 0).length, 4, 'Four existing actors can use the optional presentation');
    const page = await browser.newPage();
    try {
      for (const row of rows) {
        await ready(page, row.id); const actual = await state(page);
        assert.equal(actual.optionalObservedVariants, row.optionalObservedVariants);
        assert.equal(actual.optionalPlayableVariants, row.optionalPlayableVariants);
        assert.equal(actual.verifiedIdleCycles, row.verifiedIdleCycles); assert.equal(row.verifiedIdleCycles, 0);
        assert.match(actual.text, /geste original et l’équivalence avec l’édition cible restent non certifiés/);
        if (row.optionalPlayableVariants) assert.match(actual.text, /activables volontairement/);
        else {
          assert.equal(row.id, 'rerev-chunk-ooze'); assert.equal(actual.contextOnly, true);
          assert.match(actual.text, /rencontre reste contextuelle/); assert.doesNotMatch(actual.text, /activables volontairement/);
        }
        for (const edition of row.sourceEditions) assert(actual.text.includes(edition));
      }
      return {sourceNeutralFamilies: 5, playableOptionalVariants: 4, heldContext: 'rerev-chunk-ooze', qualifiedTargetIdleCycles: 0, voluntaryScopeExplicit: true};
    } finally { await page.close(); }
  });
  await test('dossier', 'Missing portraits and another UID cannot inherit previous native details', async () => {
    const missing = index.identities.find(item => !item.avatarImage && !item.nativeEntries.length); assert(missing, 'Explicit held avatar expected');
    const page = await browser.newPage();
    try {
      const native = index.identities.find(item => item.nativeEntries.length); assert(native);
      await ready(page, native.id); assert.equal((await state(page)).hidden, false);
      await ready(page, missing.id); const actual = await state(page);
      assert.equal(actual.id, missing.id); assert.equal(actual.avatar, false); assert.equal(actual.nativeFrames, 0); assert.equal(actual.hidden, true);
      return {heldUID: missing.id, previousUIDCleared: true, noGuessedPortrait: true};
    } finally { await page.close(); }
  });
  await test('dossier', 'Remote portraits, duplicate identities and excessive indexes fail while historical sources remain', async () => {
    const row = index.identities.find(item => item.avatarImage); assert(row);
    const mutations = [
      value => {value.identities.find(item => item.id === row.id).avatarImage = 'https://example.invalid/foreign.png';},
      value => {value.identities[1].id = value.identities[0].id;},
      value => {value.identities.find(item => item.id === 'rerev-chunk-ooze').optionalPlayableVariants = 1;}
    ];
    for (const mutate of mutations) {
      const context = await browser.newContext(), page = await context.newPage(), value = structuredClone(index); mutate(value);
      await page.route('**/fidelity-r30/dossier-additions.json', route => route.fulfill({json: value}));
      try { await ready(page, row.id); const actual = await state(page); assert.equal(actual.failed, true); assert.equal(actual.hidden, true); assert(await page.locator('#detailSources a').count() > 0); }
      finally { await context.close(); }
    }
    const context = await browser.newContext(), page = await context.newPage();
    await page.route('**/fidelity-r30/dossier-additions.json', route => route.fulfill({body: ' '.repeat(512 * 1024 + 1), contentType: 'application/json'}));
    try { await ready(page, row.id); assert.equal((await state(page)).failed, true); }
    finally { await context.close(); }
    return {remoteImageRefused: true, duplicateIdentityRefused: true, contextPromotionRefused: true, streamedIndexLimit: 512 * 1024, historicalSourcesRetained: true};
  });
  await test('dossier', 'Source links retain keyboard focus and reflow at 320px with doubled text', async () => {
    const row = index.identities.find(item => item.nativeEntries.length); assert(row);
    const context = await browser.newContext({viewport: {width: 320, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await ready(page, row.id); const link = page.locator('#detailAdditionsR30 a').first(); await link.focus();
      assert.equal(await link.evaluate(element => document.activeElement === element), true);
      await zoom(page); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.equal(await page.locator('#specimenDialog').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
      await page.locator('#detailAdditionsR30').scrollIntoViewIfNeeded();
      await page.screenshot({path: path.join(output, 'dossier-320-200pct.png')}); assert.deepEqual(errors, []);
      return {uid: row.id, keyboardFocus: true, everyComputedFontDoubled: true};
    } finally { await context.close(); }
  });
} catch (error) { checks.dashboard.push({name: 'suite setup', pass: false, error: error.stack}); console.error(error.stack); }
finally {
  await browser?.close(); server.kill('SIGTERM'); let failed = 0;
  const common = ['tests/browser-fidelity-r30.mjs', progressPath, dossierPath, 'modules/fidelity-r30/selection/manifest.json',
    'modules/fidelity-r30/index.html', 'modules/fidelity-r30/dossier-link.js', 'codex.html'];
  for (const [group, entries] of Object.entries(checks)) {
    const report = {schema: 're.bow.' + group + '-browser-r30/1', startedAt, completedAt: new Date().toISOString(),
      passed: entries.filter(row => row.pass).length, failed: entries.filter(row => !row.pass).length, checks: entries,
      sourceFiles: common.map(file => ({path: file, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')})),
      physicalDevicesCertified: false};
    fs.writeFileSync(path.join(root, 'docs/R30_' + (group === 'dashboard' ? 'DASHBOARD' : 'DOSSIER') + '_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({group, passed: report.passed, failed: report.failed})); failed += report.failed;
  }
  if (failed || checks.dossier.length === 0) process.exitCode = 1;
}
