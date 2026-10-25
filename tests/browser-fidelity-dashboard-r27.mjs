/** Source-workbench behavior and access checks; desktop and touch emulation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const codex = fs.readFileSync(path.join(root, 'codex.html'), 'utf8');
// The header always points to the latest installed adapter; historical dashboards stay independently checked.
const installedAdapters = [...codex.matchAll(/<script src="modules\/fidelity-r(\d+)\/dossier-link\.js"><\/script>/g)].map(match => Number(match[1]));
const currentRelease = Math.max(24, ...installedAdapters);
const expectedWorkbench = '/modules/fidelity-r' + currentRelease + '/index.html';
const output = path.join(root, 'qa-fidelity-r27-dashboard');
fs.mkdirSync(output, {recursive: true});
const expected = JSON.parse(fs.readFileSync(path.join(root, 'docs/R20_TRACKING.json'))).tasks.filter(item => item.status !== 'VALIDÉ').map(item => item.id).sort();
const progressPath = path.join(root, 'modules/fidelity-r27/progress.json');
assert(fs.existsSync(progressPath), 'Generate modules/fidelity-r27/progress.json before running this suite.');
const progress = JSON.parse(fs.readFileSync(progressPath));
const tracking = JSON.parse(fs.readFileSync(path.join(root, 'docs/R27_TRACKING.json')));
const sprites = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r27/sprites/manifest.json')));
const sources = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r27/sources/manifest.json')));
const canonical = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r27/canonical/manifest.json')));
const motion = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r27/motion/manifest.json')));
const audio = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r27/audio/manifest.json')));
const roster = JSON.parse(fs.readFileSync(path.join(root, 'data/roster.json'))).catalog;
assert.equal(roster.length, 389, 'All catalogue identities remain present');
assert.deepEqual(tracking.identity_updates.map(item => item.id).sort(), roster.map(item => item.id).sort(), 'All 389 identities remain in the R27 tracker');
assert.deepEqual(progress.tasks.map(item => item.id).sort(), expected, 'All seventeen historical workstreams remain open');
assert(tracking.source_rows.length >= sprites.counts.targetIdentities + sources.counts.sourceImageReferences + motion.summary.sourceAnimationFiles + audio.entries.length + canonical.claims.length, 'The source table includes every new model, keyed file and audio reference');
const neutralEligible = sprite => sprite.reviewStatus === 'visually-reviewed' && sprite.fullBodyReviewed === true
  && sprite.poseKind === 'neutral-base' && sprite.scope === 'combatant-neutral-pose'
  && ['left', 'right'].includes(sprite.sourceFacing) && JSON.stringify(sprite.availableStates) === '["idle"]';
const sourceStatistics = [sprites.sprites.length, sprites.sprites.filter(sprite => sprite.fullBodyReviewed).length,
  sprites.sprites.filter(neutralEligible).length, audio.entries.length, canonical.summary.cumulative_reviewed_identities];
assert.deepEqual(progress.statistics.map(item => item.value), sourceStatistics, 'Hub counters match the actual source manifests');
assert.equal(motion.summary.positiveTimePoseFiles, motion.entries.flatMap(entry => entry.clips).filter(clip => clip.positiveTimePoseOnly).length, 'Fixed keyed poses are distinct from actual motion and unkeyed bases');
const startedAt = new Date().toISOString(), checks = [], port = Number(process.env.BOW_R27_DASHBOARD_PORT || 5691);
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page) { await page.waitForFunction(() => !document.querySelector('#search').disabled && document.querySelectorAll('[data-task-id]').length === 17); }
async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); }
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(75); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const touch of [false, true]) {
    const width = touch ? 390 : 1440;
    await test('All 17 workstreams, filters and source links at ' + width + 'px', async () => {
      const context = await browser.newContext({viewport: {width, height: 1000}, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce'});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base + '/modules/fidelity-r27/index.html'); await ready(page);
        assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), expected);
        assert.equal(await page.locator('[data-task-id] .status').evaluateAll(nodes => nodes.every(node => node.textContent === 'EN COURS')), true);
        await noOverflow(page);
        assert.deepEqual(await page.locator('#statistics strong').allTextContents(), sourceStatistics.map(String));
        assert.equal(await page.getByRole('searchbox', {name: 'Rechercher un chantier'}).count(), 1);
        await page.fill('#search', 'R20-09'); assert.equal(await page.locator('[data-task-id]').count(), 1);
        assert.equal(await page.locator('[data-task-id]').getAttribute('data-task-id'), 'R20-09');
        await page.fill('#search', ''); await page.selectOption('#category', 'functions');
        assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), ['G-REPLAYS', 'G-SAUVES']);
        await page.selectOption('#category', 'all');
        const summary = page.locator('[data-task-id="R20-09"] summary');
        if (touch) await summary.tap(); else { await summary.focus(); await page.keyboard.press('Enter'); }
        assert.equal(await page.locator('[data-task-id="R20-09"] details').getAttribute('open'), '');
        const resources = await page.locator('#resources a').evaluateAll(nodes => nodes.map(node => ({label: node.textContent.trim(), href: node.href})));
        assert.equal(resources.length, progress.resources.length, 'Every actual source/review resource is linked');
        const links = await page.locator('main a[href]').evaluateAll(nodes => nodes.map(node => ({label: node.textContent.trim(), href: node.href})));
        for (const item of links) {
          const target = new URL(item.href); assert.equal(target.origin, base, 'Review links are local');
          const response = await context.request.get(item.href);
          assert(response.ok(), item.label + ' resolves (' + response.status() + ')');
        }
        await page.fill('#search', 'aucun-chantier-ne-porte-ce-nom');
        assert.equal(await page.locator('[data-task-id]').count(), 0); assert.match(await page.locator('#resultCount').innerText(), /^0 chantier sur 17$/);
        await page.fill('#search', ''); await noOverflow(page);
        await page.screenshot({path: path.join(output, 'dashboard-' + width + '.png'), fullPage: true});
        assert.deepEqual(errors, []);
        return {width, touchEmulated: touch, ids: expected, functionTasks: ['G-REPLAYS', 'G-SAUVES'], resourceLinks: resources,
          totalResolvedReviewLinks: links.length, emptyResultAnnounced: true, catalogueIdentities: roster.length, sourceRows: tracking.source_rows.length, sourceStatistics};
      } finally { await context.close(); }
    });
  }
  await test('Bestiary retains one visible current sources link after header setup at 1440/390px', async () => {
    const routes = [];
    for (const touch of [false, true]) {
      const width = touch ? 390 : 1440;
      const context = await browser.newContext({viewport: {width, height: 1000}, hasTouch: touch, isMobile: touch});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base + '/codex.html', {waitUntil: 'load'});
        await page.waitForSelector('.r20-header-nav');
        const target = base + expectedWorkbench;
        await page.waitForFunction(href => [...document.querySelectorAll('.r20-header-nav a')].some(node => node.href === href), target);
        assert.equal(await page.locator('#fidelityR23Link').count(), 1, 'The compatible entry ID remains unique after DOMContentLoaded');
        const link = page.getByRole('link', {name: 'Sources et chantiers', exact: true});
        assert.equal(await link.count(), 1, 'One named source entry');
        assert.equal(await link.isVisible(), true, 'Source entry is visible');
        assert.equal(await link.getAttribute('href'), target, 'The source entry reaches the current local delivery');
        assert.equal(await page.locator('a[href]').evaluateAll((nodes, href) => nodes.filter(node => node.href === href).length, target), 1,
          'No duplicate source entry remains elsewhere in the Bestiary');
        await noOverflow(page);
        if (touch) await link.tap(); else await link.click();
        await page.waitForURL(target); await ready(page);
        assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), expected);
        assert.deepEqual(errors, []);
        routes.push({width, touchEmulated: touch, sourceLinks: 1, headerReadyBeforeClick: true, target, workstreams: 17});
      } finally { await context.close(); }
    }
    return {routes, physicalDevices: false};
  });
  await test('Keyboard skip link, named filters and visible focus', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r27/index.html'); await ready(page);
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
      const skip = await page.locator('.skip').boundingBox(); assert(skip.y >= 0);
      await page.keyboard.press('Enter'); await page.waitForURL(url => url.hash === '#main');
      assert.equal(new URL(page.url()).hash, '#main');
      await page.locator('#search').focus();
      const focus = await page.locator('#search').evaluate(el => ({style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth}));
      assert.notEqual(focus.style, 'none'); assert(parseFloat(focus.width) >= 2);
      await page.keyboard.type('G-AUDIO'); assert.equal(await page.locator('[data-task-id]').count(), 1);
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'category');
      assert.equal(await page.getByRole('combobox', {name: 'Domaine'}).count(), 1);
      return {skipLinkVisibleOnFocus: true, fragmentTarget: '#main', namedFilters: true, keyboardSearch: true, focusOutline: focus};
    } finally { await context.close(); }
  });
  await test('404 and malformed progress refuse incomplete data, then retry recovers', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      let mode = '404';
      await page.route('**/fidelity-r27/progress.json', route => mode === '404'
        ? route.fulfill({status: 404, contentType: 'text/plain', body: 'not found'})
        : mode === 'malformed'
          ? route.fulfill({status: 200, json: {...progress, tasks: progress.tasks.slice(0, 16)}})
          : route.continue());
      await page.goto(base + '/modules/fidelity-r27/index.html'); await page.waitForSelector('#retry:not([hidden])');
      assert.match(await page.locator('#loadStatus').innerText(), /indisponible/);
      assert.equal(await page.locator('#search').isDisabled(), true); assert.equal(await page.locator('[data-task-id]').count(), 0);
      mode = 'malformed'; await page.click('#retry'); await page.waitForSelector('#retry:not([hidden])');
      assert.match(await page.locator('#loadStatus').innerText(), /incomplet/);
      assert.equal(await page.locator('[data-task-id]').count(), 0);
      mode = 'ok'; await page.click('#retry'); await ready(page);
      assert.equal(await page.locator('#retry').isHidden(), true);
      return {notFoundRefused: true, sixteenTasksRefused: true, retryRestoredSeventeenTasks: true};
    } finally { await context.close(); }
  });
  await test('Untrusted source text stays text and external review links are refused', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      const injected = structuredClone(progress); injected.tasks[0].title = '<img src=x onerror="window.r27Injected=true">';
      await page.route('**/fidelity-r27/progress.json', route => route.fulfill({status: 200, json: injected}));
      await page.goto(base + '/modules/fidelity-r27/index.html'); await ready(page);
      assert.equal(await page.locator('[data-task-id] h3').first().innerText(), injected.tasks[0].title);
      assert.equal(await page.evaluate(() => Boolean(window.r27Injected)), false);
      injected.resources[0].href = 'https://untrusted.example/collect';
      await page.reload(); await page.waitForSelector('#retry:not([hidden])');
      assert.match(await page.locator('#loadStatus').innerText(), /Lien de suivi invalide/);
      assert.equal(await page.locator('a[href^="https://untrusted.example"]').count(), 0);
      return {markupRenderedAsText: true, scriptNotExecuted: true, externalResourceLinkRefused: true};
    } finally { await context.close(); }
  });
} finally {
  const report = {schema: 're.bow.fidelity-dashboard-browser/1', startedAt, completedAt: new Date().toISOString(),
    environment: {virtualized: true, headless: true, node: process.version, chromium: browser?.version() || null},
    physicalDevices: false, passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks};
  await browser?.close(); server.kill('SIGTERM');
  const data = JSON.stringify(report, null, 2) + '\n';
  fs.writeFileSync(path.join(output, 'R27_DASHBOARD_BROWSER_RESULTS.json'), data);
  fs.writeFileSync(path.join(root, 'docs/R27_DASHBOARD_BROWSER.json'), data);
  console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
  if (report.failed) process.exitCode = 1;
}
