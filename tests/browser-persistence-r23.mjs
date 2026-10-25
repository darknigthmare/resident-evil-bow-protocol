import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-persistence-r23-browser'); fs.mkdirSync(output, {recursive: true});
const checks = [], port = Number(process.env.BOW_PERSISTENCE_R23_PORT || 5278), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
const record = id => JSON.stringify({version: '0.48', id, meta: {p1: 're1-hunter', p2: 're1-zombie', runtimeContract: 'old-fixture-contract'}, frames: [[10, 0, 0, 0, 0]], result: null});
async function ready(page) { await page.goto(base + '/modules/fidelity-r23/persistence/index.html'); await page.waitForFunction(() => document.querySelector('#primary') && document.querySelector('script[type="module"]')); }
async function upload(page, id, text, name = 'fixture.json') { await page.locator('#' + id).setInputFiles({name, mimeType: 'application/json', buffer: Buffer.from(text)}); await page.waitForFunction(() => !document.getElementById('results').hidden); }

try {
  for (let n = 0; n < 100; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Desktop and mobile imports stay local, avoid storage and render untrusted text safely', async () => {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({viewport: {width, height: 900}});
      await context.addInitScript(() => { Object.defineProperty(window, 'localStorage', {get() { throw Error('Storage must remain untouched'); }}); window.injected = false; });
      const page = await context.newPage(), errors = [], remote = [];
      page.on('pageerror', error => errors.push(String(error))); page.on('request', request => { if (!request.url().startsWith(base)) remote.push(request.url()); });
      await ready(page); await upload(page, 'primary', record('<img src=x onerror="window.injected=true">'));
      const report = JSON.parse(await page.locator('#report').textContent()); assert.equal(report.result, 'inspected'); assert.equal(report.records[0].compatibility, 'different-contract'); assert.equal(report.playbackCertified, false);
      assert.equal(await page.evaluate(() => window.injected), false); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'inspection-' + width + '.png'), fullPage: true});
      assert.deepEqual(errors, []); assert.deepEqual(remote, []); await context.close();
    }
    return {widths: [1440, 390], storageAccess: 0, uploads: 0, injectedHTMLExecuted: false};
  });
  await test('Original-file download preserves every byte even when inspection refuses an ambiguous document', async () => {
    const context = await browser.newContext({acceptDownloads: true}), page = await context.newPage(); await ready(page);
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{"id":1,"id":2}\r\n')]);
    await page.locator('#primary').setInputFiles({name: 'ambiguous.json', mimeType: 'application/json', buffer: bytes});
    await page.waitForFunction(() => !document.getElementById('original').disabled);
    assert.equal(JSON.parse(await page.locator('#report').textContent()).result, 'errors');
    const event = page.waitForEvent('download'); await page.click('#original'); const download = await event;
    assert.deepEqual(fs.readFileSync(await download.path()), bytes);
    await context.close(); return {bytes: bytes.length, downloadIdentical: true};
  });
  await test('Comparison flags a conflicting ID and does not select or install either replay', async () => {
    const context = await browser.newContext(), page = await context.newPage(); await ready(page);
    const first = '[' + record('same') + ']', value = JSON.parse(record('same')); value.frames[0][0] = 11;
    await upload(page, 'primary', first); await upload(page, 'secondary', JSON.stringify([value]));
    await page.waitForFunction(() => !document.getElementById('comparison').hidden);
    const compared = JSON.parse(await page.locator('#differences').textContent()); assert.equal(compared.changes[0].state, 'conflicting-replay-id'); assert.equal(compared.resolution, 'none');
    assert.equal(JSON.parse(await page.locator('#report').textContent()).records[0].frames, 10);
    await context.close(); return {conflictDetected: true, automaticResolution: false};
  });
  await test('A delayed earlier read cannot replace the subsequently chosen file', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    await context.addInitScript(() => { const read = File.prototype.arrayBuffer; File.prototype.arrayBuffer = function () { if (this.name === 'delayed.json') return new Promise(resolve => { window.releaseDelayed = () => read.call(this).then(resolve); }); return read.call(this); }; });
    await ready(page);
    await page.locator('#primary').setInputFiles({name: 'delayed.json', mimeType: 'application/json', buffer: Buffer.from(record('old'))});
    await page.waitForFunction(() => typeof window.releaseDelayed === 'function');
    await upload(page, 'primary', record('new'), 'new.json');
    await page.evaluate(() => window.releaseDelayed()); await page.waitForTimeout(100);
    assert.equal(JSON.parse(await page.locator('#report').textContent()).records[0].id, 'new');
    await context.close(); return {latestSelectionRetained: true};
  });
} finally {
  if (browser) await browser.close(); server.kill('SIGTERM');
  const result = {schema: 're.bow.persistence-browser-tests/1', passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length, checks};
  fs.writeFileSync(path.join(output, 'R23_PERSISTENCE_BROWSER_RESULTS.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
}
