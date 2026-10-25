import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-canonical-r23'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_CANONICAL_R23_PORT || 5327), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const checks = []; let browser;
async function test(name, run) {
  try { await run(); checks.push({name, pass: true}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: String(error.stack)}); console.error('FAIL ' + name + ': ' + error.message); }
}
try {
  for (let attempt = 0; attempt < 60; attempt++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test('Catalogue, dimension scope and source downloads at ' + width + 'px', async () => {
    const page = await browser.newPage({viewport: {width, height: 900}}), errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/modules/fidelity-r23/canonical/index.html');
    await page.waitForFunction(() => document.querySelectorAll('#results button').length === 389);
    await page.selectOption('#filter', 'dimension');
    assert.equal(await page.locator('#results button').count(), 1);
    await page.locator('#results button').click();
    assert.match(await page.locator('#details').innerText(), /Longueur maximale annoncée : 3 m, pinces comprises/);
    assert.match(await page.locator('#details').innerText(), /ni hauteur/);
    const download = page.waitForEvent('download'); await page.locator('#details a[download]').first().click();
    assert.match((await download).suggestedFilename(), /\.html\.gz$/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []);
    await page.screenshot({path: path.join(output, 'canonical-' + width + '.png'), fullPage: true});
    await page.close();
  });
  await test('Source disagreements, negations and keyboard selection remain readable', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/modules/fidelity-r23/canonical/index.html');
    await page.waitForFunction(() => document.querySelectorAll('#results button').length === 389);
    await page.selectOption('#filter', 'conflict');
    assert.equal(await page.locator('#results button').count(), 1);
    await page.focus('#filter'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#details h2')?.textContent === 'Licker beta');
    assert.match(await page.locator('.conflict').innerText(), /Progenitor/);
    assert.match(await page.locator('.conflict').innerText(), /Uroboros/);
    assert.equal(await page.locator('.conflict a[download]').count(), 2);
    await page.goto(base + '/modules/fidelity-r23/canonical/index.html#re1-tyrant');
    await page.waitForFunction(() => document.querySelector('#details h2')?.textContent === 'Tyrant');
    assert.match(await page.locator('#details').innerText(), /source nie explicitement cette vulnérabilité/);
    assert.match(await page.locator('#details blockquote').last().innerText(), /doesn't make it vulnerable/);
    await page.close();
  });
  await test('Untrusted quotation text cannot create HTML elements', async () => {
    const page = await browser.newPage();
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r23/canonical/manifest.json')));
    const entry = manifest.entries.find((item) => item.id === 're0-stinger');
    const attack = '<img src=x onerror="window.untrustedExecuted=true">'; entry.claims[0].excerpt = attack;
    await page.route('**/canonical/manifest.json', (route) => route.fulfill({json: manifest}));
    await page.goto(base + '/modules/fidelity-r23/canonical/index.html#re0-stinger');
    await page.waitForFunction(() => document.querySelector('#details h2')?.textContent === 'Stinger');
    assert.equal(await page.locator('#details blockquote').first().innerText(), attack);
    assert.equal(await page.locator('#details img').count(), 0);
    assert.equal(await page.evaluate(() => window.untrustedExecuted), undefined);
    await page.close();
  });
} finally {
  await browser?.close(); server.kill('SIGTERM');
  fs.writeFileSync(path.join(output, 'RESULTS.json'), JSON.stringify({passed: checks.every((item) => item.pass), checks}, null, 2) + '\n');
}
if (checks.some((item) => !item.pass)) process.exitCode = 1;
