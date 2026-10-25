import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-canonical-r24'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_CANONICAL_R24_PORT || 5427), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const checks = []; let browser;
async function test(name, run) {
  try { await run(); checks.push({name, pass: true}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: String(error.stack)}); console.error('FAIL ' + name + ': ' + error.message); }
}
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test('Independent publisher comparison and linked R23 download at ' + width + 'px', async () => {
    const page = await browser.newPage({viewport: {width, height: 900}}), errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/modules/fidelity-r24/canonical/index.html#re4-regenerator');
    await page.waitForFunction(() => document.querySelector('#details h2')?.textContent === 'Regenerator');
    const first = page.locator('.claim').first();
    assert.equal(await first.locator('.evidence').count(), 2);
    assert.match(await first.innerText(), /Evil Resource/i); assert.match(await first.innerText(), /Bogleech/i);
    assert.match(await first.innerText(), /Ce que le recoupement confirme/);
    await first.locator('summary').first().click();
    const downloaded = page.waitForEvent('download'); await first.locator('a[download]').first().click();
    assert.match((await downloaded).suggestedFilename(), /\.html\.gz$/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []);
    await page.screenshot({path: path.join(output, 'canonical-r24-' + width + '.png'), fullPage: true});
    await page.close();
  });
  await test('Dimension bounds, transcript context, variant gap and existing conflict stay explicit', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/modules/fidelity-r24/canonical/index.html#re5-u-8');
    await page.waitForFunction(() => document.querySelector('#details h2')?.textContent === 'U-8');
    assert.match(await page.locator('#details').innerText(), /Formulation vague/);
    assert.match(await page.locator('#details').innerText(), /strictement plus de 3 m/);
    assert.match(await page.locator('#details').innerText(), /U-8 Prime/);
    assert.match(await page.locator('#details').innerText(), /Identité niée explicitement/);
    await page.selectOption('#filter', 'dimension'); assert.equal(await page.locator('#results button').count(), 3);
    await page.goto(base + '/modules/fidelity-r24/canonical/index.html#re5-licker-beta');
    await page.waitForFunction(() => document.querySelector('#details h2')?.textContent === 'Licker beta');
    assert.match(await page.locator('#details').innerText(), /Progenitor/);
    assert.match(await page.locator('#details').innerText(), /Uroboros/);
    assert.match(await page.locator('#details').innerText(), /transcription tierce doit encore être comparée/);
    await page.selectOption('#filter', 'new'); await page.fill('#search', 'Proto-Tyrant');
    assert.equal(await page.locator('#results button').count(), 1);
    await page.focus('#filter'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#details h2')?.textContent === 'Proto-Tyrant');
    assert.match(await page.locator('#details').innerText(), /right arm/);
    await page.close();
  });
  await test('Quotation markup remains inert and does not create remote HTML', async () => {
    const page = await browser.newPage();
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r24/canonical/manifest.json')));
    const attack = '<img src=x onerror="window.quoteExecuted=true">'; manifest.claims.find((claim) => claim.uid === 're4-regenerator').evidence[0].excerpt = attack;
    await page.route('**/canonical/manifest.json', (route) => route.fulfill({json: manifest}));
    await page.goto(base + '/modules/fidelity-r24/canonical/index.html#re4-regenerator');
    await page.waitForFunction(() => document.querySelector('#details h2')?.textContent === 'Regenerator');
    assert.equal(await page.locator('#details blockquote').first().innerText(), attack);
    assert.equal(await page.locator('#details img').count(), 0); assert.equal(await page.evaluate(() => window.quoteExecuted), undefined);
    await page.close();
  });
} finally {
  await browser?.close(); server.kill('SIGTERM');
  fs.writeFileSync(path.join(output, 'RESULTS.json'), JSON.stringify({passed: checks.every((item) => item.pass), checks}, null, 2) + '\n');
}
if (checks.some((item) => !item.pass)) process.exitCode = 1;
