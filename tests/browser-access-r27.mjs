/** Accessible new R27 workbenches. Software browser checks do not certify devices or screen readers. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'qa-access-r27'); fs.mkdirSync(output, {recursive: true});
const require = createRequire(import.meta.url), axePath = process.env.AXE_CORE_PATH || (() => { try { return require.resolve('axe-core/axe.min.js'); } catch { return '/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js'; } })();
assert(fs.existsSync(axePath), 'Install axe-core@4.14.0 and set AXE_CORE_PATH.'); const axeSource = fs.readFileSync(axePath, 'utf8');
const port = Number(process.env.BOW_ACCESS_R27_PORT || 5598), base = 'http://127.0.0.1:' + port, checks = [];
const expected = ['index.html', 'sprites/index.html', 'sources/index.html', 'motion/index.html', 'audio/index.html', 'canonical/index.html', 'persistence/index.html'];
const selected = process.env.BOW_ACCESS_R27_PAGES ? process.env.BOW_ACCESS_R27_PAGES.split(',') : expected;
assert(selected.every(name => expected.includes(name)), 'Only the listed local R27 workbenches may be selected.');
assert.equal(new Set(selected).size, selected.length, 'A page must not be counted more than once.');
for (const name of selected) assert(fs.existsSync(path.join(root, 'modules/fidelity-r27', name)), 'Finish the R27 page before running its access check: ' + name);
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'}); let browser, axeVersion;
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
async function loaded(page, name) {
  const response = await page.goto(base + '/modules/fidelity-r27/' + name); assert.equal(response.status(), 200);
  await page.waitForLoadState('networkidle');
  if (name === 'index.html') await page.waitForFunction(() => document.querySelectorAll('[data-task-id]').length === 17);
  if (name === 'sprites/index.html') await page.waitForFunction(() => window.RE_GENERATED_SPRITES_R27?.state().ready);
  if (name === 'persistence/index.html') await page.waitForFunction(() => !!window.BOW_RESTORED_REPLAYS_R27);
}
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  for (const name of selected) for (const width of [1280, 320]) await test(name + ' accessible names, contrast and reflow at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1100}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await loaded(page, name); if (width === 320) await page.evaluate(() => document.documentElement.style.fontSize = '200%');
      await page.evaluate(axeSource);
      const result = await page.evaluate(() => axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']}})); axeVersion = result.testEngine.version;
      assert.deepEqual(result.violations.map(row => ({id: row.id, impact: row.impact, nodes: row.nodes.map(node => node.target)})), [], 'Automated WCAG checks must not have violations.');
      const size = await page.evaluate(() => ({width: innerWidth, scroll: document.documentElement.scrollWidth, font: getComputedStyle(document.body).fontSize})); assert(size.scroll <= size.width + 1, JSON.stringify(size));
      if (width === 320) assert.equal(size.font, '32px', 'The inherited workbench type actually scales to 200%.');
      assert.equal(await page.locator('h1').count(), 1); assert.equal(await page.locator('main').count(), 1); assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(output, name.replaceAll('/', '-').replace('.html', '') + '-' + width + '.png'), fullPage: true});
      return {page: name, width, textPercent: width === 320 ? 200 : 100, violations: 0, incompleteRulesRequiringHumanReview: result.incomplete.map(item => item.id), horizontalOverflow: false, pageErrors: errors};
    } finally { await context.close(); }
  });
  for (const name of selected) await test(name + ' has a visible keyboard skip link and local focus target', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await loaded(page, name); await page.keyboard.press('Tab');
      const target = await page.evaluate(() => { const node = document.activeElement, box = node.getBoundingClientRect(); return {tag: node.tagName, href: node.getAttribute('href'), name: node.textContent.trim(), y: box.y, height: box.height, outline: getComputedStyle(node).outlineStyle}; });
      assert.equal(target.tag, 'A'); assert(target.href?.startsWith('#'), JSON.stringify(target)); assert(target.name && target.y >= 0 && target.height > 0, JSON.stringify(target)); assert.notEqual(target.outline, 'none');
      await page.keyboard.press('Enter'); await page.waitForURL(url => Boolean(url.hash)); const hash = new URL(page.url()).hash;
      assert(await page.locator(hash).count(), 'The skip link points to an actual element'); return {page: name, skipName: target.name, target: hash, visibleFocus: true};
    } finally { await context.close(); }
  });
  if (selected.includes('sprites/index.html')) await test('Sprite gallery keeps one selected image and never eagerly downloads all385 sprites', async () => {
    const context = await browser.newContext({viewport: {width: 390, height: 1100}}), page = await context.newPage(), spriteRequests = [];
    page.on('request', request => { if (/\/sprites\/generated\/.*\.png(?:\?|$)/.test(request.url())) spriteRequests.push(request.url()); });
    try {
      await loaded(page, 'sprites/index.html'); const state = await page.evaluate(() => RE_GENERATED_SPRITES_R27.state());
      assert((state.blobUrls ?? 0) <= 1); assert(spriteRequests.length <= 1, 'Only the explicitly selected sprite may be prepared.');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      return {generatedAtObservation: state.generated, pendingAtObservation: state.pending, requestsOnInitialVisit: spriteRequests.length, blobUrls: state.blobUrls, eagerAll385Load: false};
    } finally { await context.close(); }
  });
} finally {
  await browser?.close(); server.kill('SIGTERM'); const report = {schema: 're.bow.accessibility-r27/1', passed: checks.filter(x => x.pass).length, failed: checks.filter(x => !x.pass).length,
    pages: selected, expectedPages: expected, completeWorkbenchSet: expected.every(name => selected.includes(name)), axeVersion: axeVersion || null,
    physicalDevicesCertified: false, physicalGamepadsCertified: false, realScreenReadersCertified: false, completeWcagConformanceCertified: false,
    checks, scope: 'Automated WCAG rules, CSS320px/200percent text and keyboard skip links in headless software Chromium. Incomplete axe rules need human review; no art, motion, sound semantics or device certification.'};
  const filename = process.env.BOW_ACCESS_R27_REPORT || 'R27_ACCESS_BROWSER.json'; assert(/^[A-Z0-9_]+\.json$/.test(filename));
  fs.writeFileSync(path.join(output, filename), JSON.stringify(report, null, 2) + '\n'); fs.writeFileSync(path.join(root, 'docs', filename), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, failed: report.failed, pages: selected.length})); if (report.failed) process.exitCode = 1;
}
