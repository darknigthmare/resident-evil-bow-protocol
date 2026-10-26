/** R28 progress links, all seventeen criteria, recovery and text reflow. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-r28-dashboard'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_R28_DASHBOARD_PORT || 5768), base = 'http://127.0.0.1:' + port;
const source = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r28/progress.json'))), checks = [], startedAt = new Date().toISOString();
const expected = source.tasks.map(item => item.id).sort();
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page) { await page.waitForFunction(() => !document.getElementById('search').disabled); }
try {
  for (let n = 0; n < 80; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 75)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1280, 320]) await test('All 17 criteria, local proofs and doubled text at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + '/modules/fidelity-r28/index.html'); await ready(page);
      assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), expected);
      assert.deepEqual(await page.locator('#statistics strong').allTextContents(), source.statistics.map(item => String(item.value)));
      assert(await page.locator('.task .status').evaluateAll(nodes => nodes.every(node => node.textContent === 'EN COURS')));
      const links = await page.locator('main a[href]').evaluateAll(nodes => nodes.map(node => node.href));
      for (const href of links) { assert.equal(new URL(href).origin, base); assert((await context.request.get(href)).ok(), href); }
      await page.selectOption('#category', 'functions');
      assert.deepEqual((await page.locator('[data-task-id]').evaluateAll(nodes => nodes.map(node => node.dataset.taskId))).sort(), ['G-REPLAYS', 'G-SAUVES']);
      await page.selectOption('#category', 'all'); await page.fill('#search', 'R20-09'); assert.equal(await page.locator('[data-task-id]').count(), 1);
      await page.locator('.task summary').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.task details').getAttribute('open'), '');
      await page.fill('#search', 'absent-critere'); assert.equal(await page.locator('[data-task-id]').count(), 0); assert.match(await page.locator('#resultCount').textContent(), /^0 chantier sur 17$/);
      await page.fill('#search', '');
      await page.evaluate(() => {const elements = [...document.querySelectorAll('body *')].filter(element => !['SCRIPT', 'STYLE'].includes(element.tagName)); const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize)); elements.forEach((element, index) => element.style.setProperty('font-size', sizes[index] * 2 + 'px', 'important'));});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'dashboard-' + width + '-200pct.png'), fullPage: true}); assert.deepEqual(errors, []);
      return {width, criteria: expected.length, resolvedLocalLinks: links.length, statistics: source.statistics.map(item => item.value), everyComputedFontDoubled: true};
    } finally { await context.close(); }
  });
  await test('A missing progress response stays explicit and retry loads the real file', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let blocked = true;
    try {
      await page.route('**/fidelity-r28/progress.json', route => blocked ? route.fulfill({status: 503, body: 'Unavailable'}) : route.continue());
      await page.goto(base + '/modules/fidelity-r28/index.html'); await page.waitForFunction(() => !document.getElementById('retry').hidden);
      assert.equal(await page.locator('[data-task-id]').count(), 0); blocked = false; await page.click('#retry'); await ready(page);
      assert.equal(await page.locator('[data-task-id]').count(), 17); return {explicitError: true, retry: true};
    } finally { await context.close(); }
  });
  await test('Proof text is inert and a remote evidence link is refused', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      const payload = structuredClone(source); payload.tasks[0].title = '<img src=x onerror="window.injectedR28=true">';
      await page.route('**/fidelity-r28/progress.json', route => route.fulfill({contentType: 'application/json', body: JSON.stringify(payload)}));
      await page.goto(base + '/modules/fidelity-r28/index.html'); await ready(page);
      assert.equal(await page.locator('.task img').count(), 0); assert.equal(await page.evaluate(() => !!window.injectedR28), false);
      payload.tasks[0].evidence[0].href = 'https://example.invalid/untrusted';
      await page.reload(); await page.waitForFunction(() => !document.getElementById('retry').hidden);
      assert.match(await page.locator('#loadStatus').textContent(), /Lien de suivi invalide/); return {textInert: true, remoteProofRefused: true};
    } finally { await context.close(); }
  });
} catch (error) { checks.push({name: 'setup', pass: false, error: error.stack}); console.error(error.stack); }
finally {
  await browser?.close(); server.kill('SIGTERM');
  const paths = ['modules/fidelity-r28/index.html', 'modules/fidelity-r28/progress.json', 'modules/fidelity-r23/dashboard.js'];
  const report = {schema: 're.bow.dashboard-browser-r28/1', startedAt, finishedAt: new Date().toISOString(), passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length,
    sourceFiles: paths.map(file => ({path: file, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')})), checks, physicalDevicesCertified: false};
  fs.writeFileSync(path.join(root, 'docs/R28_DASHBOARD_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
}
