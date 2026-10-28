/** Current R31 owners, partial lot deliveries and inert exact-identity Dossier proof. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-fidelity-r31'); fs.mkdirSync(output, {recursive: true});
const base = 'http://127.0.0.1:' + (process.env.BOW_R31_FIDELITY_PORT || 5891);
const progressPath = 'modules/fidelity-r31/progress.json', dossierPath = 'modules/fidelity-r31/dossier-additions.json';
const progress = JSON.parse(fs.readFileSync(path.join(root, progressPath))), index = JSON.parse(fs.readFileSync(path.join(root, dossierPath)));
const reviewedRow = () => index.identities.filter(row => row.hasAdditions && row.artifacts.length).sort((a, b) => b.artifacts.length - a.artifacts.length)[0];
const checks = {dashboard: [], dossier: []};
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: new URL(base).port}, stdio: 'ignore'});
let browser;
async function test(group, name, run) {
  try {const evidence = await run(); checks[group].push({name, pass: true, evidence}); console.log('PASS ' + group + ' ' + name);}
  catch (error) {checks[group].push({name, pass: false, error: error.stack}); console.error('FAIL ' + group + ' ' + name + ': ' + error.message);}
}
async function ready(page, uid) {
  await page.goto(base + '/codex.html?id=' + encodeURIComponent(uid), {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(uid => window.RE_DOSSIER_ADDITIONS_R31?.state().loaded && RE_DOSSIER_ADDITIONS_R31.state().id === uid, uid);
}
async function doubled(page) {
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('body *')].filter(node => !['STYLE', 'SCRIPT'].includes(node.tagName));
    const sizes = nodes.map(node => parseFloat(getComputedStyle(node).fontSize));
    nodes.forEach((node, n) => node.style.setProperty('font-size', sizes[n] * 2 + 'px', 'important'));
  });
}
async function state(page) {
  return page.evaluate(() => ({...RE_DOSSIER_ADDITIONS_R31.state(), hidden: document.querySelector('#detailAdditionsR31').hidden,
    text: document.querySelector('#detailAdditionsR31').textContent, links: [...document.querySelectorAll('#detailAdditionsR31 a')].map(node => node.href)}));
}
try {
  for (let n = 0; n < 80; n++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1280, 320]) await test('dashboard', 'All17 open tasks retain their actual owner, proof routes and doubled text at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + '/modules/fidelity-r31/index.html'); await page.waitForFunction(() => !document.querySelector('#owner').disabled);
      const tasks = await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => ({id: node.dataset.taskId, owner: node.dataset.owner, lot: node.dataset.lotId})));
      assert.deepEqual(tasks.sort((a, b) => a.id.localeCompare(b.id)), progress.tasks.map(row => ({id: row.id, owner: row.owner, lot: row.lotId})).sort((a, b) => a.id.localeCompare(b.id)));
      assert.equal(await page.locator('.task .status').evaluateAll(nodes => nodes.every(node => node.textContent === 'EN COURS')), true);
      for (const lot of new Set(progress.tasks.map(row => row.lotId))) {
        await page.selectOption('#owner', lot); const ids = await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId));
        assert.deepEqual(ids.sort(), progress.tasks.filter(row => row.lotId === lot).map(row => row.id).sort());
      }
      await page.selectOption('#owner', 'all'); await page.selectOption('#category', 'functions');
      assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), ['G-REPLAYS', 'G-SAUVES']);
      await page.selectOption('#category', 'all'); await page.fill('#search', 'R20-09'); assert.equal(await page.locator('[data-task-id]').count(), 1);
      await page.locator('.task summary').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.task details').getAttribute('open'), '');
      await page.fill('#search', ''); assert.deepEqual(await page.locator('#statistics strong').allTextContents(), progress.statistics.map(row => String(row.value)));
      const links = await page.locator('main a[href]').evaluateAll(nodes => nodes.map(node => node.href));
      for (const href of links) {assert.equal(new URL(href).origin, base); assert((await context.request.get(href)).ok(), href);}
      await doubled(page); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, []); await page.screenshot({path: path.join(output, 'dashboard-' + width + '.png'), fullPage: true});
      return {width, openTasks: tasks.length, ownedLots: new Set(tasks.map(row => row.lot)).size, actualProofRoutes: links.length, everyComputedFontDoubled: true};
    } finally {await context.close();}
  });
  await test('dashboard', 'Retry works and forged ownership, remote proof and executable markup cannot become current progress', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let unavailable = true, payload = null;
    await page.route('**/fidelity-r31/progress.json', route => unavailable ? route.fulfill({status: 503}) : payload ? route.fulfill({json: payload}) : route.continue());
    try {
      await page.goto(base + '/modules/fidelity-r31/index.html'); await page.waitForFunction(() => !document.querySelector('#retry').hidden);
      assert.equal(await page.locator('[data-task-id]').count(), 0); unavailable = false; await page.click('#retry'); await page.waitForFunction(() => !document.querySelector('#owner').disabled);
      assert.equal(await page.locator('[data-task-id]').count(), 17);
      payload = structuredClone(progress); payload.tasks[0].title = '<img src=x onerror="window.injectedR31=true">'; await page.reload();
      await page.waitForFunction(() => !document.querySelector('#owner').disabled); assert.equal(await page.locator('.task img').count(), 0); assert.equal(await page.evaluate(() => !!window.injectedR31), false);
      payload.tasks[0].lotId = 'unassigned-owner'; await page.reload(); await page.waitForFunction(() => !document.querySelector('#retry').hidden);
      assert.equal(await page.locator('[data-task-id]').count(), 0);
      payload = structuredClone(progress); payload.tasks[0].evidence[0].href = 'https://example.invalid/collect'; await page.reload();
      await page.waitForFunction(() => !document.querySelector('#retry').hidden); assert.match(await page.locator('#loadStatus').textContent(), /Lien de suivi invalide/);
      return {retry: true, sourceMarkupInert: true, unassignedOwnerRejected: true, remoteProofRejected: true};
    } finally {await context.close();}
  });
  await test('dossier', 'Actual lot artifacts stay exact-UID and retain editions without loading media', async () => {
    const row = reviewedRow(); assert(row, 'Actual delivered identity evidence required');
    const context = await browser.newContext(), page = await context.newPage(), requests = [];
    page.on('request', request => {if (/\/fidelity-r31\/.*\.(png|wav|ogg|zip)(?:\?|$)/i.test(request.url())) requests.push(request.url());});
    try {
      await ready(page, row.id); const actual = await state(page); assert.equal(actual.failed, false); assert.equal(actual.hidden, false);
      assert.equal(actual.lots, row.lots.length); assert.equal(actual.artifacts, row.artifacts.length); assert.equal(actual.sourceEditions, row.sourceEditions.length);
      for (const edition of row.sourceEditions) assert(actual.text.includes(edition));
      assert.match(actual.text, /rendu généré, une source native, un geste observé/); assert.equal(requests.length, 0);
      for (const proof of row.artifacts.slice(0, 24)) {
        assert(actual.links.includes(new URL(proof.href || proof.path, base + '/').href));
        const response = await context.request.get(base + '/' + proof.path); assert(response.ok(), proof.path);
        assert.equal(createHash('sha256').update(await response.body()).digest('hex'), proof.sha256);
      }
      return {uid: row.id, linkedArtifacts: row.artifacts.length, lots: row.lots, automaticallyLoadedMedia: 0};
    } finally {await context.close();}
  });
  await test('dossier', 'A documentary-only identity does not acquire another form’s media and old source cards remain available', async () => {
    const row = index.identities.find(item => !item.hasAdditions)
      || index.identities.find(item => item.lots.length === 1 && item.lots[0] === 'motion' && item.artifacts.length === 1);
    assert(row, 'An unchanged or actual documentary-only identity is required');
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await ready(page, row.id); const actual = await state(page); assert.equal(actual.failed, false);
      assert.equal(actual.hidden, !row.hasAdditions); assert.equal(actual.artifacts, row.artifacts.length);
      if (row.hasAdditions) {
        const expected = row.artifacts.map(proof => new URL(proof.href || proof.path, base + '/').href);
        assert.deepEqual(actual.links.filter(href => !href.endsWith('/fidelity-r31/index.html')), expected);
      }
      assert.equal(await page.locator('#detailAdditionsR31 img,#detailAdditionsR31 audio,#detailAdditionsR31 video').count(), 0);
      assert.equal(await page.locator('#detailAdditionsR30').count(), 1);
      assert.equal(new URL(await page.locator('#fidelityR23Link').getAttribute('href'), page.url()).pathname, '/modules/fidelity-r31/index.html');
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#specimenDialog').evaluate(node => node.open), false);
      return {uid: row.id, actualDocumentaryArtifacts: row.artifacts.length, inventedMedia: 0, originalSourceHostRetained: true, newestHeaderLink: true};
    } finally {await context.close();}
  });
  for (const width of [1280, 320]) await test('dossier', 'Current proof card fits the actual dialog and remains keyboard accessible at ' + width + 'px', async () => {
    const row = reviewedRow(); assert(row);
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage();
    try {
      await ready(page, row.id); await doubled(page);
      const overflow = await page.locator('#specimenDialog').evaluate(node => ({scroll: node.scrollWidth, client: node.clientWidth}));
      assert(overflow.scroll <= overflow.client + 1, JSON.stringify(overflow));
      const link = page.locator('#detailAdditionsR31 a').first(); await link.focus(); assert(await link.evaluate(node => node === document.activeElement));
      const box = await link.boundingBox(); assert(box.width > 0 && box.width <= width && box.x >= 0);
      await page.screenshot({path: path.join(output, 'dossier-' + width + '.png'), fullPage: false});
      return {uid: row.id, width, everyComputedFontDoubled: true, dialogContentFits: true, keyboardFocusRetained: true};
    } finally {await context.close();}
  });
  await test('dossier', 'Corrupt proof routes, mismatched UID coverage and oversized transport fail without hiding older evidence', async () => {
    const row = reviewedRow(); assert(row);
    const cases = ['external', 'duplicate', 'oversized']; const evidence = [];
    for (const kind of cases) {
      const context = await browser.newContext(), page = await context.newPage(), payload = structuredClone(index);
      if (kind === 'external') payload.identities.find(item => item.id === row.id).artifacts[0].path = 'https://example.invalid/collect';
      if (kind === 'duplicate') payload.identities[1] = structuredClone(payload.identities[0]);
      await page.route('**/fidelity-r31/dossier-additions.json', route => kind === 'oversized'
        ? route.fulfill({status: 200, contentType: 'application/json', body: ' '.repeat(768 * 1024 + 1)}) : route.fulfill({json: payload}));
      try {
        await ready(page, row.id); const actual = await state(page); assert.equal(actual.failed, true); assert.equal(actual.hidden, true); assert.equal(actual.artifacts, 0);
        assert.equal(await page.locator('#detailAdditionsR30').count(), 1); assert.equal(await page.locator('a[href^="https://example.invalid/collect"]').count(), 0);
        evidence.push({kind, failedClosed: true, olderHostRetained: true});
      } finally {await context.close();}
    }
    return evidence;
  });
} finally {
  await browser?.close(); server.kill('SIGTERM');
  const names = ['tests/browser-fidelity-r31.mjs', 'modules/fidelity-r31/index.html', 'modules/fidelity-r31/dashboard.js',
    'modules/fidelity-r31/dossier-link.js', progressPath, dossierPath, 'codex.html'];
  for (const group of Object.keys(checks)) {
    const report = {schema: 're.bow.' + group + '-browser-r31/1', passed: checks[group].filter(row => row.pass).length,
      failed: checks[group].filter(row => !row.pass).length, checks: checks[group],
      sourceFiles: names.map(name => ({path: name, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')})),
      scope: 'Actual current R31 dashboard ownership and exact-UID source links, real HTTP, source hashes, bounded failures and dialog reflow; no physical-device or global1:1 certification.'};
    fs.writeFileSync(path.join(root, 'docs/R31_' + (group === 'dashboard' ? 'DASHBOARD' : 'DOSSIER') + '_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
  }
  const passed = Object.values(checks).flat().filter(row => row.pass).length, failed = Object.values(checks).flat().filter(row => !row.pass).length;
  console.log(JSON.stringify({passed, failed})); if (failed || !passed) process.exitCode = 1;
}
