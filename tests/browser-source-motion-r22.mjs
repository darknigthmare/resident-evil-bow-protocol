import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-source-motion-r22-browser');
fs.mkdirSync(output, {recursive: true});
const startedAt = new Date().toISOString(), checks = [], port = Number(process.env.BOW_SOURCE_R22_PORT || 5246);
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const motion = JSON.parse(fs.readFileSync(path.join(root, 'modules/source-motion-r22/media/nemesis-infection/manifest.json')));
const portraits = JSON.parse(fs.readFileSync(path.join(root, 'modules/source-motion-r22/native-portraits.json'))).entries;
let browser;
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page) {
  await page.waitForFunction(() => window.RE_SOURCE_MOTION_R22?.state().frameCount === 150 && !RE_SOURCE_MOTION_R22.state().buffering);
}
async function canvasHash(page) {
  return page.evaluate(async () => {
    const canvas = document.getElementById('motionCanvas');
    const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
  });
}
async function openCodex(page, id) {
  await page.goto(base + '/codex.html?id=' + id, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.RE_NATIVE_PORTRAITS_R22?.state().loaded);
}
async function choose(page, id, query) {
  if (await page.locator('#specimenDialog').evaluate(el => el.open)) await page.click('#closeSpecimen');
  await page.fill('#catalogSearch', query);
  await page.locator('.specimen-card[data-id="' + id + '"]').click();
}
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(r => setTimeout(r, 50)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox','--disable-dev-shm-usage']});
  for (const width of [1440, 390]) {
    await test('Native source pixels, frames and bounded cache at ' + width + 'px', async () => {
      const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(base + '/modules/source-motion-r22/index.html'); await ready(page);
      assert.equal(await page.evaluate(() => RE_SOURCE_MOTION_R22.state().playing), false);
      for (const frame of [0, 13, 31, 32, 75, 149]) {
        await page.evaluate(frame => RE_SOURCE_MOTION_R22.seekFrame(frame), frame);
        assert.equal(await canvasHash(page), motion.frames[frame].rgbaSha256, 'Native RGBA frame ' + frame);
        const state = await page.evaluate(() => RE_SOURCE_MOTION_R22.state());
        assert.equal(state.frame, frame); assert.equal(state.positionMs, frame * 40);
        assert(state.cacheSize <= 2);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'native-motion-' + width + '.png'), fullPage: true});
      assert.deepEqual(errors, []); await context.close();
      return {framesCompared: [0,13,31,32,75,149], durationMs: 6000, maximumAtlasCache: 2, reducedMotion: true};
    });
  }
  await test('Source clock keeps 40ms frame timing and manual pause', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    // Keep actionability and CDP round trips outside the native playback clock.
    // An installed clock still advances in real time until it is paused.
    await page.clock.install({time: new Date('2026-10-24T00:00:00.000Z')});
    await page.clock.pauseAt(new Date('2026-10-24T00:00:01.000Z'));
    await page.goto(base + '/modules/source-motion-r22/index.html'); await ready(page);
    await page.click('#playToggle'); await page.clock.runFor(240); await page.evaluate(() => RE_SOURCE_MOTION_R22.pause());
    const state = await page.evaluate(() => RE_SOURCE_MOTION_R22.state());
    assert.equal(state.playing, false); assert.equal(state.positionMs, 240);
    assert.equal(state.frame, 6);
    const before = state.frame; await page.clock.runFor(200); assert.equal(await page.evaluate(() => RE_SOURCE_MOTION_R22.state().frame), before);
    await context.close(); return {positionMs: state.positionMs, frame: state.frame};
  });
  await test('Paused or hidden playback never resumes after delayed atlas loading', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    let release1, release2, reached1, reached2;
    const gate1 = new Promise(r => {release1 = r}), gate2 = new Promise(r => {release2 = r});
    const seen1 = new Promise(r => {reached1 = r}), seen2 = new Promise(r => {reached2 = r});
    await page.route('**/atlas-01.png', async route => { reached1(); await gate1; await route.continue(); });
    await page.route('**/atlas-02.png', async route => { reached2(); await gate2; await route.continue(); });
    await page.clock.install(); await page.goto(base + '/modules/source-motion-r22/index.html'); await ready(page);
    await page.evaluate(() => RE_SOURCE_MOTION_R22.seekFrame(31)); await seen1;
    await page.click('#playToggle'); await page.clock.runFor(80);
    await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().buffering);
    await page.evaluate(() => RE_SOURCE_MOTION_R22.pause()); release1();
    await page.waitForFunction(() => !RE_SOURCE_MOTION_R22.state().buffering);
    assert.equal(await page.evaluate(() => RE_SOURCE_MOTION_R22.state().playing), false);
    await page.evaluate(() => RE_SOURCE_MOTION_R22.seekFrame(63)); await seen2;
    await page.click('#playToggle'); await page.clock.runFor(80);
    await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().buffering);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
    release2(); await page.waitForFunction(() => !RE_SOURCE_MOTION_R22.state().buffering);
    await page.evaluate(() => RE_SOURCE_MOTION_R22.play());
    assert.equal(await page.evaluate(() => RE_SOURCE_MOTION_R22.state().playing), false);
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.evaluate(() => RE_SOURCE_MOTION_R22.state().playing), false);
    await context.close(); return {manualPauseRetained: true, hiddenPauseRetained: true};
  });
  await test('Corrupt atlas bytes are refused and a new attempt recovers', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    await page.route('**/atlas-00.png', async route => route.fulfill({status: 200, contentType: 'image/png', body: Buffer.from('not the reviewed image')}));
    await page.goto(base + '/modules/source-motion-r22/index.html'); await page.waitForSelector('#retry:not([hidden])');
    assert.equal(await page.locator('#motionCanvas').isHidden(), true);
    assert.match(await page.locator('#motionStatus').innerText(), /ne correspond pas/);
    await page.unroute('**/atlas-00.png'); await page.click('#retry'); await ready(page);
    assert.equal(await canvasHash(page), motion.frames[0].rgbaSha256);
    await context.close(); return {wrongHashRefused: true, retryRecovered: true};
  });
  await test('All 20 dossier images display the exact reviewed identity and dimensions', async () => {
    const context = await browser.newContext(), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    for (const record of portraits) {
      await openCodex(page, record.id);
      await page.waitForFunction(id => RE_NATIVE_PORTRAITS_R22.state().displayed === id, record.id);
      const dimensions = await page.locator('#detailImage').evaluate(el => [el.naturalWidth, el.naturalHeight]);
      assert.deepEqual(dimensions, [record.width, record.height], record.id);
      assert.equal(await page.locator('#detailImage').getAttribute('data-native-portrait-r22'), record.id);
      assert.equal(await page.locator('#detailImage').isVisible(), true);
    }
    assert.deepEqual(errors, []); await page.screenshot({path: path.join(output, 'reviewed-portrait.png'), fullPage: true});
    await context.close(); return {images: portraits.length, crossGameSubstitution: false};
  });
  await test('Scissor placeholder, uncovered identity restoration and exact motion link', async () => {
    const context = await browser.newContext({viewport: {width: 390, height: 900}}), page = await context.newPage();
    await openCodex(page, 're7-jack-baker-scissor');
    await page.waitForFunction(() => RE_NATIVE_PORTRAITS_R22.state().status === 'view-missing');
    assert.equal(await page.locator('#detailImage').isHidden(), true);
    assert.match(await page.locator('.r22-native-note').innerText(), /Vue d’origine à documenter/);
    await choose(page, 're3r-nemesis', 'Nemesis');
    await page.waitForFunction(() => RE_NATIVE_PORTRAITS_R22.state().id === 're3r-nemesis');
    assert.equal(await page.locator('#detailImage').isVisible(), true);
    assert.equal(await page.locator('#detailImage').getAttribute('data-native-portrait-r22'), null);
    assert.equal(await page.locator('[data-source-motion-r22]').count(), 1);
    await page.click('#closeSpecimen'); await page.locator('.specimen-card[data-id="re3r-nemesis"]').click();
    assert.equal(await page.locator('[data-source-motion-r22]').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({path: path.join(output, 'nemesis-dossier-mobile.png'), fullPage: true});
    await page.click('[data-source-motion-r22]'); await ready(page);
    assert.match(page.url(), /re3r-nemesis-infection/);
    await context.close(); return {missingPhaseSuppressed: true, originalRestored: true, sourceLinkUnique: true};
  });
  await test('Delayed or failed native images cannot overwrite another dossier', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    let release, reached;
    const gate = new Promise(r => {release = r}), seen = new Promise(r => {reached = r});
    await page.route('**/native-portraits/re7-jack-baker.png', async route => { reached(); await gate; await route.continue(); });
    await openCodex(page, 're7-jack-baker'); await seen;
    await choose(page, 're3r-nemesis', 'Nemesis'); const original = await page.locator('#detailImage').getAttribute('src');
    release(); await page.waitForTimeout(100);
    assert.equal(await page.locator('#detailImage').getAttribute('src'), original);
    assert.equal(await page.locator('#detailImage').isVisible(), true);
    await page.unroute('**/native-portraits/re7-jack-baker.png');
    await page.route('**/native-portraits/re7-marguerite-baker.png', route => route.fulfill({status: 503, body: 'temporarily unavailable'}));
    await choose(page, 're7-marguerite-baker', 'Marguerite');
    await page.waitForFunction(() => RE_NATIVE_PORTRAITS_R22.state().status === 'error');
    assert.equal(await page.locator('#detailImage').isHidden(), true);
    await choose(page, 're3r-nemesis', 'Nemesis');
    assert.equal(await page.locator('#detailImage').isVisible(), true);
    assert.equal(await page.locator('#detailImage').getAttribute('data-native-portrait-r22'), null);
    await context.close(); return {staleLoadRefused: true, failureDoesNotLeak: true};
  });
} finally {
  await browser?.close(); server.kill('SIGTERM');
  const report = {suite: 'source-motion-native-dossiers-r22-http', startedAt, completedAt: new Date().toISOString(),
    passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks};
  fs.writeFileSync(path.join(output, 'R22_BROWSER_RESULTS.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
  if (report.failed) process.exitCode = 1;
}
