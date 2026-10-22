/** Real Chromium loading/presentation; lifecycle events below are explicitly simulated. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-sprites-r20'); fs.mkdirSync(output, { recursive: true });
const port = Number(process.env.BOW_SPRITE_R20_PORT || 5212), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], { cwd: root, env: { ...process.env, RE_BOW_PORT: String(port) }, stdio: 'ignore' });
const checks = []; let browser, page;
async function test(name, width, run) {
  try { const detail = await run(); checks.push({ name, width, pass: true, ...detail }); console.log('PASS ' + name + ' ' + width); }
  catch (error) { checks.push({ name, width, pass: false, error: error.stack }); throw error; }
}
async function selection() {
  await page.goto(base + '/modules/versus.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.RE_COMBAT && window.RE_SPRITE_PRESENTATION_R20);
}
try {
  for (let n = 0; n < 80; n++) { try { if ((await fetch(base + '/dev-sprites.html')).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}), args: ['--no-sandbox'] });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await test('Selection displays the exact Tyrant and Nemesis incarnation with original canvas retained', width, async () => {
      await selection();
      await page.evaluate(() => RE_COMBAT.select('re2r-tyrant', 're3r-nemesis'));
      await page.waitForFunction(() => RE_SPRITE_PRESENTATION_R20.state().slots.every(slot => slot.status === 'ready'));
      const state = await page.evaluate(() => ({ slots: RE_SPRITE_PRESENTATION_R20.state().slots, overlays: document.querySelectorAll('.r20-sprite-presentation').length,
        canvases: ['p1Portrait', 'p2Portrait'].map(id => ({ retained: !!document.getElementById(id), visibility: getComputedStyle(document.getElementById(id)).visibility })), state: RE_COMBAT.getState() }));
      assert.deepEqual(state.slots.map(slot => slot.displayed), ['re2r-tyrant', 're3r-nemesis']); assert.equal(state.overlays, 2);
      assert(state.canvases.every(canvas => canvas.retained && canvas.visibility === 'hidden')); assert.equal(state.state, null);
      if (width === 390 && await page.locator('#mobileP1').isVisible()) await page.click('#mobileP1');
      await page.screenshot({ path: path.join(output, 'selection-' + width + '.png') });
      assert.deepEqual(errors, []); return { exactIds: true, combatStateCreated: false };
    });
    await test('Unsupported identities restore original portraits and simulated page restoration adds no duplicates', width, async () => {
      await page.evaluate(() => RE_COMBAT.select('re2-licker', 're1-hunter'));
      await page.waitForFunction(() => RE_SPRITE_PRESENTATION_R20.state().slots.every(slot => slot.status === 'original'));
      assert.equal(await page.locator('.r20-sprite-active').count(), 0);
      assert.equal(await page.locator('#p1Portrait').evaluate(canvas => getComputedStyle(canvas).visibility), 'visible');
      await page.evaluate(() => {
        RE_COMBAT.select('re2r-tyrant', 're3r-nemesis');
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      });
      await page.waitForFunction(() => RE_SPRITE_PRESENTATION_R20.state().slots.every(slot => slot.status === 'ready'));
      assert.equal(await page.locator('.r20-sprite-presentation').count(), 2); assert.deepEqual(errors, []);
      return { originalIncarnationsPreserved: true, simulatedLifecycle: true };
    });
    await test('Four independent images load in the DEV viewer with real alpha and working controls', width, async () => {
      await page.goto(base + '/dev-sprites.html?dev=1', { waitUntil: 'networkidle' });
      const ids = await page.locator('#spriteSelect option').evaluateAll(options => options.map(option => option.value));
      assert.deepEqual(ids, ['re2r-tyrant', 're2r-licker', 're1r-hunter', 're3r-nemesis']);
      for (const id of ids) {
        await page.selectOption('#spriteSelect', id);
        await page.waitForFunction(() => document.getElementById('spriteStatus').textContent.startsWith('Image chargée'));
        const expected = await page.evaluate(id => BOWSpritesR20.url(id), id);
        assert.equal(await page.locator('#spriteNative').getAttribute('href'), expected);
      }
      await page.selectOption('#spriteBackground', 'light'); await page.uncheck('#spritePivot');
      assert.equal(await page.locator('#spritePreview').getAttribute('data-background'), 'light');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: path.join(output, 'viewer-' + width + '.png') }); assert.deepEqual(errors, []);
      return { realImages: 4, nativeControls: true };
    });
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); page = await context.newPage();
  await test('Delayed image completion cannot overwrite a newer selection', 1440, async () => {
    let release, requested;
    const requestSeen = new Promise(resolve => { requested = resolve; });
    const waiting = new Promise(resolve => { release = resolve; });
    await page.route('**/assets/sprites/bow/re2r-tyrant/idle-right.png', async route => { requested(); await waiting; await route.continue(); });
    await selection();
    await page.evaluate(() => RE_COMBAT.select('re2r-tyrant', 're1-hunter'));
    await requestSeen;
    await page.evaluate(() => RE_COMBAT.select('re2-licker', 're1-hunter'));
    release();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.evaluate(() => RE_SPRITE_PRESENTATION_R20.state().slots[0].displayed), '');
    assert.equal(await page.locator('.r20-sprite-active').count(), 0);
    return { delayedNativeImage: true };
  });
  await context.close();
  const failureContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); page = await failureContext.newPage();
  await test('Blocked PNG retains original canvas and permits retry after a new selection', 1440, async () => {
    await page.route('**/assets/sprites/bow/re2r-tyrant/idle-right.png', route => route.abort());
    await selection(); await page.evaluate(() => RE_COMBAT.select('re2r-tyrant', 're1-hunter'));
    await page.waitForFunction(() => RE_SPRITE_PRESENTATION_R20.state().slots[0].status === 'error');
    assert.equal(await page.locator('#p1Portrait').evaluate(canvas => getComputedStyle(canvas).visibility), 'visible');
    await page.unroute('**/assets/sprites/bow/re2r-tyrant/idle-right.png');
    await page.evaluate(() => RE_COMBAT.select('re2-licker', 're1-hunter'));
    await page.waitForFunction(() => RE_SPRITE_PRESENTATION_R20.state().slots[0].status === 'original');
    await page.evaluate(() => RE_COMBAT.select('re2r-tyrant', 're1-hunter'));
    await page.waitForFunction(() => RE_SPRITE_PRESENTATION_R20.state().slots[0].status === 'ready');
    assert.equal(await page.locator('#p1Portrait').evaluate(canvas => getComputedStyle(canvas).visibility), 'hidden');
    return { explicitNetworkFailure: true, fallbackAndRetry: true };
  });
  await failureContext.close();
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  console.error(error.stack); process.exitCode = 1;
  if (!checks.some(check => !check.pass)) checks.push({ pass: false, error: error.stack });
} finally {
  await browser?.close(); server.kill('SIGTERM');
  const result = { suite: 'sprite-presentation-r20-http', passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length, physicalDevices: false, checks };
  fs.writeFileSync(path.join(output, 'BROWSER_SPRITES_R20_RESULTS.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ passed: result.passed, failed: result.failed }));
}
