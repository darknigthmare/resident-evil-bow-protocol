import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const port = Number(process.env.BOW_VISUAL_R23_PORT || 5293), base = `http://127.0.0.1:${port}`;
const manifest = JSON.parse(fs.readFileSync('modules/fidelity-r23/visual/manifest.json'));
const server = spawn(process.execPath, ['scripts/dev.mjs'], {env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
const checks = [];
async function test(name, run) {
  try { await run(); checks.push({name, pass: true}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: String(error.stack)}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function open(page, uid) {
  await page.goto(`${base}/codex.html?id=${uid}`);
  if (!await page.evaluate(() => !!window.RE_NATIVE_PORTRAITS_R23)) {
    await page.addScriptTag({url: base + '/modules/fidelity-r23/visual/dossier-portraits.js'});
  }
  await page.waitForFunction(() => window.RE_NATIVE_PORTRAITS_R23?.state().loaded);
}
async function choose(page, id, query) {
  if (await page.locator('#specimenDialog').evaluate(el => el.open)) await page.click('#closeSpecimen');
  await page.fill('#catalogSearch', query);
  await page.locator(`.specimen-card[data-id="${id}"]`).click();
}
async function ready(page, id) {
  await page.waitForFunction(uid => window.RE_NATIVE_PORTRAITS_R23?.state().displayed === uid, id);
}
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(r => setTimeout(r, 50)); }
  for (const width of [1440, 390]) await test('Seven native crops match browser-decoded original atlas at ' + width, async () => {
    const page = await browser.newPage({viewport: {width, height: 900}});
    await page.goto(base + '/modules/fidelity-r23/visual/index.html');
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('7 portraits vérifiés'));
    const differences = await page.evaluate(async entries => {
      const atlas = new Image(); atlas.src = 'source/ui4040_thumb_iam.tex.png'; await atlas.decode();
      const imgs = [...document.querySelectorAll('.portrait img')];
      return entries.map((entry, index) => {
        const buffers = [atlas, imgs[index]].map((image, j) => {
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
          const context = canvas.getContext('2d');
          if (j === 0) context.drawImage(image, ...entry.crop, 0, 0, 128, 128);
          else context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, 128, 128).data;
        });
        return buffers[0].some((byte, i) => byte !== buffers[1][i]);
      });
    }, manifest.entries);
    assert.deepEqual(differences, Array(7).fill(false));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width === 390) { fs.mkdirSync('qa-visual-r23', {recursive: true}); await page.screenshot({path: 'qa-visual-r23/mobile.png', fullPage: true}); }
    await page.close();
  });
  await test('All seven exact dossier identities; R22 reload leaves R23 visible; cache bound', async () => {
    const page = await browser.newPage();
    for (const entry of manifest.entries) {
      await open(page, entry.id); await ready(page, entry.id);
      assert.equal(await page.locator('#detailImageR23').isVisible(), true);
      assert.equal(await page.locator('#detailImage').isVisible(), false);
      await page.evaluate(() => RE_NATIVE_PORTRAITS_R22.sync());
      assert.equal(await page.locator('#detailImageR23').isVisible(), true);
      assert.ok((await page.evaluate(() => RE_NATIVE_PORTRAITS_R23.state())).cacheSize <= 2);
    }
    await page.close();
  });
  await test('Corruption fails closed and retry restores verified portrait', async () => {
    const page = await browser.newPage();
    await page.route('**/visual/portraits/re3r-pale-head.png', route => route.fulfill({status: 200, contentType: 'image/png', body: Buffer.from('changed')}));
    await open(page, 're3r-pale-head');
    await page.waitForFunction(() => RE_NATIVE_PORTRAITS_R23.state().status === 'error');
    assert.equal(await page.locator('#detailImageR23').isVisible(), false);
    assert.equal(await page.locator('#detailImage').isVisible(), false);
    await page.unroute('**/visual/portraits/re3r-pale-head.png');
    await page.locator('.r23-native-note button').click(); await ready(page, 're3r-pale-head');
    await page.close();
  });
  await test('A delayed native close cannot clear a reopened R23 dossier', async () => {
    const page = await browser.newPage();
    await open(page, 're3r-pale-head'); await ready(page, 're3r-pale-head');
    await page.evaluate(() => {
      const dialog = document.querySelector('#specimenDialog');
      dialog.close();
      const action = [...document.querySelectorAll('#detailActions a[href]')].find(a => /\/(?:modules\/versus|catalog)\.html/.test(a.href));
      const url = new URL(action.href); url.searchParams.set(url.pathname.endsWith('/catalog.html') ? 'id' : 'uid', 're3r-hunter-beta'); action.href = url.href;
      dialog.showModal(); RE_NATIVE_PORTRAITS_R23.sync();
    });
    await ready(page, 're3r-hunter-beta'); await page.waitForTimeout(100);
    assert.equal((await page.evaluate(() => RE_NATIVE_PORTRAITS_R23.state())).displayed, 're3r-hunter-beta');
    assert.equal(await page.locator('#detailImageR23').isVisible(), true);
    await page.close();
  });
  await test('Delayed response cannot replace another identity; wrong game and omitted form refused', async () => {
    const page = await browser.newPage();
    await page.route('**/visual/portraits/re3r-zombie-dog.png', async route => {
      await new Promise(resolve => setTimeout(resolve, 700));
      await route.fulfill({status: 200, contentType: 'image/png', body: fs.readFileSync('modules/fidelity-r23/visual/portraits/re3r-zombie-dog.png')});
    });
    await open(page, 're3r-zombie-dog');
    await choose(page, 're3r-hunter-beta', 'Hunter'); await ready(page, 're3r-hunter-beta');
    await page.waitForTimeout(800);
    assert.equal((await page.evaluate(() => RE_NATIVE_PORTRAITS_R23.state())).displayed, 're3r-hunter-beta');
    await page.evaluate(() => { document.querySelector('#detailEpisode').textContent = 'Resident Evil 3: Nemesis (1999)'; RE_NATIVE_PORTRAITS_R23.sync(); });
    assert.equal((await page.evaluate(() => RE_NATIVE_PORTRAITS_R23.state())).status, 'game-mismatch');
    assert.equal(await page.locator('#detailImageR23').isVisible(), false);
    await choose(page, 're7-jack-baker-scissor', 'Jack');
    assert.equal(await page.locator('#detailImageR23').isVisible(), false);
    assert.equal(await page.locator('#detailImage').isVisible(), false);
    assert.equal((await page.evaluate(() => RE_NATIVE_PORTRAITS_R22.state())).status, 'view-missing');
    await page.close();
  });
} finally {
  await browser.close(); server.kill(); fs.mkdirSync('qa-visual-r23', {recursive: true});
  fs.writeFileSync('qa-visual-r23/results.json', JSON.stringify({checks}, null, 2) + '\n');
}
if (checks.some(check => !check.pass)) process.exitCode = 1;
