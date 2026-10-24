/** Real Chromium measurements on a virtual host; no physical-device certification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-fidelity-r23-browser');
fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_R23_ACCESS_PORT || 5269), base = 'http://127.0.0.1:' + port;
const roster = JSON.parse(fs.readFileSync(path.join(root, 'data/roster.json')));
const catalog = new Map(roster.catalog.map(item => [item.id, item]));
const fighters = roster.fighters.map(item => catalog.get(item.uid));
const portraits = JSON.parse(fs.readFileSync(path.join(root, 'modules/source-motion-r22/native-portraits.json'))).entries;
const reviewed = new Map(portraits.map(item => [item.id, item]));
const startedAt = new Date().toISOString(), checks = [];
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root,
  env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
function percentile(values, p) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * p))];
}
async function ready(page) {
  await page.waitForFunction(() => window.RE_SOURCE_MOTION_R22?.state().frameCount === 150 && !RE_SOURCE_MOTION_R22.state().buffering);
}
async function choose(page, item, touch = false) {
  if (await page.locator('#specimenDialog').evaluate(el => el.open)) await page.keyboard.press('Escape');
  await page.fill('#catalogSearch', item.name);
  await page.selectOption('#catalogGame', item.gameKey);
  const card = page.locator('.specimen-card[data-id="' + item.id + '"]');
  assert.equal(await card.count(), 1, item.id + ' must have a visible filter result');
  if (touch) await card.tap();
  else { await card.focus(); await page.keyboard.press('Enter'); }
  await page.waitForFunction(() => document.querySelector('#specimenDialog').open);
  await page.waitForFunction(id => RE_NATIVE_PORTRAITS_R22.state().id === id, item.id);
  if (reviewed.has(item.id)) await page.waitForFunction(id => RE_NATIVE_PORTRAITS_R22.state().displayed === id, item.id);
  return card;
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal page overflow');
}
async function accessibleDialog(session) {
  const tree = await session.send('Accessibility.getFullAXTree');
  return tree.nodes.filter(item => !item.ignored && item.role?.value === 'dialog').map(item => ({name: item.name?.value, description: item.description?.value}));
}
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(75); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const touch of [false, true]) {
    const width = touch ? 390 : 1440;
    await test('All 115 exact Dossiers: accessible dialog, ' + (touch ? 'touch emulation' : 'keyboard') + ' at ' + width + 'px', async () => {
      const context = await browser.newContext({viewport: {width, height: 1000}, hasTouch: touch,
        isMobile: touch, reducedMotion: 'reduce'});
      const page = await context.newPage(), session = await context.newCDPSession(page), errors = [], visits = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base + '/codex.html', {waitUntil: 'domcontentloaded'});
        await page.waitForFunction(() => window.RE_NATIVE_PORTRAITS_R22?.state().loaded);
        for (const item of fighters) {
          const before = performance.now(), card = await choose(page, item, touch);
          assert.equal(await page.locator('#detailName').innerText(), item.name);
          assert.equal(await page.locator('#detailEpisode').innerText(), item.game);
          const ax = await accessibleDialog(session);
          assert.deepEqual(ax, [{name: item.name, description: item.game}], item.id + ' accessible identity and game');
          for (let step = 0; step < 7; step++) {
            await page.keyboard.press('Tab');
            assert.equal(await page.evaluate(() => document.activeElement === document.body || document.querySelector('#specimenDialog').contains(document.activeElement)), true,
              item.id + ' modal background controls stay unreachable; browser chrome is allowed');
          }
          const nativeState = await page.evaluate(() => RE_NATIVE_PORTRAITS_R22.state());
          assert(nativeState.cacheSize <= 2, 'Reviewed image cache stays bounded');
          if (reviewed.has(item.id)) {
            const dimensions = await page.locator('#detailImage').evaluate(el => [el.naturalWidth, el.naturalHeight]);
            assert.deepEqual(dimensions, [reviewed.get(item.id).width, reviewed.get(item.id).height]);
            assert.equal(await page.locator('#detailImage').getAttribute('data-native-portrait-r22'), item.id);
          }
          await noOverflow(page);
          if (touch) await page.locator('#closeSpecimen').tap();
          else await page.keyboard.press('Escape');
          await page.waitForFunction(() => !document.querySelector('#specimenDialog').open);
          assert.equal(await card.evaluate(el => el === document.activeElement), true, item.id + ' focus returns to opener');
          visits.push({id: item.id, name: item.name, game: item.game,
            reviewedImage: reviewed.has(item.id), interactionMs: Math.round(performance.now() - before),
            accessibleName: ax[0].name, accessibleDescription: ax[0].description});
        }
        assert.deepEqual(errors, []);
        assert.equal(visits.filter(item => item.reviewedImage).length, 20);
        await page.screenshot({path: path.join(output, 'dossiers-' + width + '.png'), fullPage: false});
        return {width, touchEmulated: touch, reducedMotion: true, total: visits.length,
          reviewedImages: 20, backgroundControlsUnreachable: true, browserChromeFocusAllowed: true, focusRestoration: true, visits};
      } finally { await context.close(); }
    });
  }
  await test('Queued native close cannot invalidate a quickly reopened source Dossier', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + '/codex.html');
      await page.waitForFunction(() => RE_NATIVE_PORTRAITS_R22.state().loaded);
      const item = catalog.get('re7-fumer'); await choose(page, item);
      for (let i = 0; i < 10; i++) {
        await page.evaluate(id => {
          document.querySelector('#specimenDialog').close();
          document.querySelector('[data-id="' + id + '"]').click();
        }, item.id);
        await page.waitForFunction(id => RE_NATIVE_PORTRAITS_R22.state().displayed === id && RE_NATIVE_PORTRAITS_R22.state().id === id, item.id);
        await page.waitForTimeout(25);
        assert.equal(await page.locator('#specimenDialog').evaluate(el => el.open), true);
        assert.equal(await page.evaluate(() => RE_NATIVE_PORTRAITS_R22.state().status), 'ready');
        assert.equal(await page.locator('#detailImage').getAttribute('data-native-portrait-r22'), item.id);
      }
      return {rapidReopens: 10, originalIdentityRetained: item.id, nativeCloseEventDelivered: true};
    } finally { await context.close(); }
  });
  await test('Source player keyboard transport, range and focus visibility', async () => {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    try {
      await page.goto(base + '/modules/source-motion-r22/index.html'); await ready(page);
      assert.equal(await page.evaluate(() => RE_SOURCE_MOTION_R22.state().playing), false, 'No autoplay');
      await page.locator('#nextFrame').focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().frame === 1);
      await page.locator('#framePosition').focus(); await page.keyboard.press('End');
      await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().frame === 149 && !RE_SOURCE_MOTION_R22.state().buffering);
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().frame === 148);
      await page.keyboard.press('Home');
      await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().frame === 0 && !RE_SOURCE_MOTION_R22.state().buffering);
      await page.locator('#playToggle').focus(); await page.keyboard.press('Space');
      await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().playing);
      await page.waitForTimeout(240); await page.keyboard.press('Space');
      const stopped = await page.evaluate(() => RE_SOURCE_MOTION_R22.state()); assert.equal(stopped.playing, false);
      await page.waitForTimeout(150); assert.equal(await page.evaluate(() => RE_SOURCE_MOTION_R22.state().frame), stopped.frame);
      const outline = await page.locator('#playToggle').evaluate(el => ({style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth}));
      assert.notEqual(outline.style, 'none'); assert(parseFloat(outline.width) >= 2);
      await page.locator('summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('details').getAttribute('open'), '');
      assert.equal(await page.locator('#sourceLink').isVisible(), true);
      await page.screenshot({path: path.join(output, 'motion-keyboard.png'), fullPage: true});
      return {noAutoplay: true, enterStep: true, homeEndArrows: true, spaceToggle: true, pauseStable: true, focusOutline: outline};
    } finally { await context.close(); }
  });
  await test('Buffered seek preserves deliberate focus navigation and hidden-page pause', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    let release, reached;
    const gate = new Promise(resolve => { release = resolve; }), seen = new Promise(resolve => { reached = resolve; });
    try {
      await page.route('**/atlas-04.png', async route => { reached(); await gate; await route.continue(); });
      await page.goto(base + '/modules/source-motion-r22/index.html'); await ready(page);
      await page.locator('#framePosition').focus(); await page.keyboard.press('End'); await seen;
      await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().buffering);
      assert.equal(await page.locator('#framePosition').isDisabled(), true);
      const retainedDisabledRange = await page.evaluate(() => {
        const range = document.getElementById('framePosition');
        if (document.activeElement !== range && document.activeElement !== document.body) throw Error('Focus moved to an unrelated target before deliberate navigation.');
        const retained = document.activeElement === range;
        // Exercise the BODY-focus branch deliberately: Chrome versions differ
        // in when a disabled input loses focus, which is not the user contract.
        if (retained) range.blur();
        return retained;
      });
      assert.equal(await page.evaluate(() => document.activeElement === document.body), true);
      await page.keyboard.press('Tab');
      const focusBefore = await page.evaluate(() => document.activeElement.outerHTML);
      assert.equal(await page.evaluate(() => document.activeElement === document.body), false);
      release(); await page.waitForFunction(() => !RE_SOURCE_MOTION_R22.state().buffering);
      assert.equal(await page.evaluate(() => document.activeElement.outerHTML), focusBefore, 'Do not steal focus after intentional Tab');
      await page.locator('#framePosition').focus(); await page.keyboard.press('Home');
      await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().frame === 0 && !RE_SOURCE_MOTION_R22.state().buffering);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'framePosition');
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
        document.dispatchEvent(new Event('visibilitychange')); RE_SOURCE_MOTION_R22.play();
      });
      assert.equal(await page.evaluate(() => RE_SOURCE_MOTION_R22.state().playing), false);
      return {deferredAtlas: 4, controlledBodyFocusPrecondition: true, browserInitiallyRetainedDisabledRange: retainedDisabledRange,
        deliberateTabRetained: true, laterKeyboardSeekFocusRestored: true, hiddenCannotAutoplay: true};
    } finally { release?.(); await context.close(); }
  });
  await test('Source player touch targets, tap transport and 200% text', async () => {
    const context = await browser.newContext({viewport: {width: 390, height: 1000}, hasTouch: true, isMobile: true, reducedMotion: 'reduce'});
    const page = await context.newPage();
    try {
      await page.goto(base + '/modules/source-motion-r22/index.html'); await ready(page);
      await page.locator('#nextFrame').tap(); await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().frame === 1);
      await page.locator('#previousFrame').tap(); await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().frame === 0);
      await page.locator('#playToggle').tap(); await page.waitForFunction(() => RE_SOURCE_MOTION_R22.state().playing);
      await page.locator('#playToggle').tap(); assert.equal(await page.evaluate(() => RE_SOURCE_MOTION_R22.state().playing), false);
      const targets = await page.locator('.transport button,#framePosition').evaluateAll(elements => elements.map(el => {
        const rect = el.getBoundingClientRect(); return {id: el.id, width: rect.width, height: rect.height};
      }));
      for (const item of targets) assert(item.width >= 24 && item.height >= 24, item.id + ' 24px minimum target');
      await page.addStyleTag({content: 'body{font-size:32px}'}); await noOverflow(page);
      assert.equal(await page.locator('#playToggle').isVisible(), true);
      await page.screenshot({path: path.join(output, 'motion-touch-200-text.png'), fullPage: true});
      return {touchEmulated: true, physicalTouchTested: false, tapsWork: true, minimumTargetCssPx: 24, targets,
        textResize: 'body font-size 16px to 32px; viewport unchanged', horizontalOverflow: false};
    } finally { await context.close(); }
  });
  await test('Measured loading, source playback and 40 repeated source-image switches', async () => {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    const page = await context.newPage(), session = await context.newCDPSession(page);
    await page.addInitScript(() => {
      window.__R23_LONG_TASKS = [];
      try { new PerformanceObserver(list => window.__R23_LONG_TASKS.push(...list.getEntries().map(item => ({startTime: item.startTime, duration: item.duration})))).observe({type: 'longtask', buffered: true}); } catch {}
    });
    try {
      const before = performance.now(); await page.goto(base + '/modules/source-motion-r22/index.html'); await ready(page);
      const loadReadyMs = performance.now() - before;
      const navigation = await page.evaluate(() => {
        const n = performance.getEntriesByType('navigation')[0];
        return {domContentLoadedMs: n.domContentLoadedEventEnd, loadEventMs: n.loadEventEnd,
          resources: performance.getEntriesByType('resource').map(r => ({name: new URL(r.name).pathname, encodedBodySize: r.encodedBodySize,
            decodedBodySize: r.decodedBodySize, transferSize: r.transferSize, duration: r.duration}))};
      });
      const heapBefore = await session.send('Runtime.getHeapUsage');
      await page.evaluate(() => RE_SOURCE_MOTION_R22.play());
      const frames = await page.evaluate(() => new Promise(resolve => {
        const deltas = []; let last = performance.now(), started = last, maximumCache = 0, previous = 0, advances = 0;
        function frame(now) {
          deltas.push(now - last); last = now;
          const state = RE_SOURCE_MOTION_R22.state(); maximumCache = Math.max(maximumCache, state.cacheSize);
          if (state.frame !== previous) advances++; previous = state.frame;
          if (now - started < 6500) requestAnimationFrame(frame);
          else resolve({deltas, maximumCache, advances, state});
        }
        requestAnimationFrame(frame);
      }));
      assert(frames.maximumCache <= 2); assert.equal(frames.state.playing, false); assert.equal(frames.state.frame, 149);
      const heapAfter = await session.send('Runtime.getHeapUsage');
      const playbackLongTasks = await page.evaluate(() => window.__R23_LONG_TASKS);
      await page.goto(base + '/codex.html'); await page.waitForFunction(() => RE_NATIVE_PORTRAITS_R22.state().loaded);
      const portraitHeapBefore = await session.send('Runtime.getHeapUsage'), cacheSizes = [];
      for (let i = 0; i < 40; i++) {
        const item = catalog.get(portraits[i % portraits.length].id);
        await choose(page, item); cacheSizes.push(await page.evaluate(() => RE_NATIVE_PORTRAITS_R22.state().cacheSize));
      }
      assert(Math.max(...cacheSizes) <= 2);
      const portraitHeapAfter = await session.send('Runtime.getHeapUsage');
      return {loadReadyMs: Math.round(loadReadyMs), navigation, sourcePlayback: {observedMs: 6500, sampledRaf: frames.deltas.length,
        medianRafIntervalMs: percentile(frames.deltas, .5), p95RafIntervalMs: percentile(frames.deltas, .95),
        intervalsOver50ms: frames.deltas.filter(n => n > 50).length, observedFrameAdvances: frames.advances,
        maximumAtlasCache: frames.maximumCache, finalFrame: frames.state.frame, heapBefore, heapAfter, longTasks: playbackLongTasks},
        repeatedPortraitSwitches: {switches: 40, identities: 20, maximumCache: Math.max(...cacheSizes),
          heapBefore: portraitHeapBefore, heapAfter: portraitHeapAfter},
        measurementLimits: ['Loopback HTTP, no network throttling; local cache and virtual-host scheduling affect timings.',
          'CDP Runtime.getHeapUsage measures JavaScript heap/backing storage, not process RSS, GPU memory or total decoded image retention.',
          'requestAnimationFrame samples reflect this headless virtual browser; they do not certify physical-device performance.',
          'A bounded application cache does not prove bounded browser-native image memory. No long-session or crash-resilience certification.']};
    } finally { await context.close(); }
  });
} finally {
  const report = {schema: 're.bow.access-perf-evidence/1', suite: 'fidelity-r23-access-perf-http', startedAt,
    completedAt: new Date().toISOString(), environment: {virtualized: true, headless: true, platform: process.platform,
      architecture: process.arch, node: process.version, chromium: browser?.version() || null,
      executable: process.env.CHROME_BIN || '/usr/bin/chromium', osRelease: os.release()},
    certification: {physicalDevices: false, screenReaders: false, gamepads: false, canonicalArt: false},
    passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks};
  await browser?.close(); server.kill('SIGTERM');
  const data = JSON.stringify(report, null, 2) + '\n';
  fs.writeFileSync(path.join(output, 'R23_ACCESS_PERF_RESULTS.json'), data);
  fs.writeFileSync(path.join(root, 'docs/R23_ACCESS_PERF.json'), data);
  console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
  if (report.failed) process.exitCode = 1;
}
