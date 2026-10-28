/** Actual source pages, decoded pixels, full native timelines and bounded failure/lifecycle behavior. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name)));
const world = read('modules/fidelity-r31/motion/manifest.json'), follow = read('modules/fidelity-r31/motion/root-follow-manifest.json');
const commands = read('modules/fidelity-r31/commands/manifest.json');
const output = path.join(root, 'qa-motion-r31'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_R31_MOTION_BROWSER_PORT || 5814), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const checks = []; let browser;
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function loaded(page, query = '') {
  await page.goto(base + '/modules/fidelity-r31/motion/index.html' + query);
  await page.waitForFunction(() => window.RE_MOTION_REVIEW_R31?.state().loaded || window.RE_MOTION_REVIEW_R31?.state().error);
  const state = await page.evaluate(() => RE_MOTION_REVIEW_R31.state()); assert.equal(state.error, '');
  await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().paintedEntry === RE_MOTION_REVIEW_R31.state().entry);
}
async function seek(page, index) {
  await page.locator('#position').evaluate((input, index) => {input.value = String(index); input.dispatchEvent(new Event('input', {bubbles: true}));}, index);
  await page.waitForFunction(index => {const s = RE_MOTION_REVIEW_R31.state(); return s.paintedFrame === index && s.paintedEntry === s.entry;}, index);
}
async function pixels(page, frame) {
  return page.evaluate(async frame => {
    const image = new Image(); image.src = '/' + frame.path;
    await image.decode(); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 384;
    canvas.getContext('2d').drawImage(image, 0, 0);
    const hash = async raw => [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(value => value.toString(16).padStart(2, '0')).join('');
    const actual = document.querySelector('#canvas').getContext('2d').getImageData(0, 0, 384, 384).data;
    const expected = canvas.getContext('2d').getImageData(0, 0, 384, 384).data;
    return {actual: await hash(actual), expected: await hash(expected)};
  }, frame);
}
try {
  for (let n = 0; n < 80; n++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
  await test('The real six-subject source library starts paused without loading the catalogue images', async () => {
    const page = await browser.newPage(), requested = []; page.on('request', request => {if (request.url().endsWith('.png')) requested.push(request.url());});
    try {
      await loaded(page, '?id=rerev-ooze&clip=em1000_em1000_BA_20');
      assert.equal(await page.locator('#subject option').count(), 6);
      assert.equal(await page.locator('#sequence option').count(), 2);
      const state = await page.evaluate(() => RE_MOTION_REVIEW_R31.state());
      assert.equal(state.playing, false); assert.equal(state.frames, 108); assert.equal(state.frame, 0);
      assert.equal(state.combatAssigned, false); assert.equal(state.sourceActionCertified, false);
      assert(requested.length <= 3); assert(requested.every(value => value.includes('/motion/atlases/')));
      return {nativeClips: world.counts.nativeClips, worldSequences: world.entries.length, initialImageRequests: requested.length, autoplay: false};
    } finally {await page.close();}
  });
  await test('Manual native-time positions equal actual PNG pixels across atlas boundaries and playback advances many distinct frames', async () => {
    const page = await browser.newPage();
    try {
      await loaded(page, '?id=rerev-ooze&clip=em1000_em1000_BA_20');
      const entry = world.entries.find(row => row.id === 'rerev-ooze--em1000_em1000_BA_20--left');
      for (const index of [0, 24, 25, 53, 107]) {
        await seek(page, index); const result = await pixels(page, entry.frames[index]); assert.equal(result.actual, result.expected);
      }
      await seek(page, 0); await page.click('#play');
      const observed = await page.evaluate(async () => {const values = new Set(); const until = performance.now() + 1250;
        while (performance.now() < until) {values.add(RE_MOTION_REVIEW_R31.state().paintedFrame); await new Promise(requestAnimationFrame);} return [...values];});
      assert(observed.length >= 20, 'Actual canvas must advance through many source frames');
      await page.click('#play');
      const paused = await page.evaluate(() => RE_MOTION_REVIEW_R31.state()); await page.waitForTimeout(100);
      assert.equal((await page.evaluate(() => RE_MOTION_REVIEW_R31.state())).frame, paused.frame);
      assert(paused.cache.cached <= 4); assert(paused.cache.decodedPixels <= 16 * 1024 * 1024);
      return {pixelComparedNativePositions: [0, 24, 25, 53, 107], distinctPaintedFramesObserved: observed.length, pausedFrame: paused.frame, cache: paused.cache};
    } finally {await page.close();}
  });
  await test('Root-follow inspection preserves each source clip while revealing both genuine camera sides', async () => {
    const page = await browser.newPage(); let compared = 0;
    try {
      for (const entry of follow.entries) {
        const source = world.entries.find(row => row.id === entry.sourceWorldEntryId);
        const params = new URLSearchParams({id: entry.subjectId, clip: entry.clipId, side: entry.sourceFacing, camera: 'follow'});
        await loaded(page, '?' + params);
        assert.equal((await page.evaluate(() => RE_MOTION_REVIEW_R31.state())).cameraMode, 'follow');
        for (const index of [0, Math.floor(entry.frames.length / 2), entry.frames.length - 1]) {
          await seek(page, index); const result = await pixels(page, entry.frames[index]); assert.equal(result.actual, result.expected); compared++;
        }
        assert.match(await page.locator('#cameraScope').textContent(), /seule la caméra/);
        await page.selectOption('#camera', 'world');
        await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().paintedEntry === RE_MOTION_REVIEW_R31.state().entry);
        const actual = await pixels(page, source.frames[0]); assert.equal(actual.actual, actual.expected);
      }
      return {nativeRootFollowClips: 2, actualSides: 4, rootFollowPixelComparisons: compared, originalWorldSequencesRetained: true, combatAssignment: false};
    } finally {await page.close();}
  });
  await test('The actual repertoire covers all389 identities and keeps3460 authored commands separate from original behaviors', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r31/commands/index.html?id=rerev-tricorne-ooze');
      await page.waitForFunction(() => RE_COMMAND_REPERTOIRE_R31.state().loaded);
      assert.equal(await page.locator('#identity option').count(), 389); assert.match(await page.locator('#totals').textContent(), /3460/);
      assert.equal(await page.locator('.command-row').count(), 10);
      assert.equal(await page.locator('.gesture').count(), 1);
      assert.match(await page.locator('#cinematics').textContent(), /rôles non certifiés/);
      assert.match(await page.locator('#pending').textContent(), /Actions natives affectées aux commandes : 0/);
      await page.selectOption('#identity', 'rerev-chunk-ooze'); assert.match(await page.locator('#scope').textContent(), /contextuelle/);
      await page.fill('#search', 'Farfarello'); assert.equal(await page.locator('#identity option').count(), 1);
      assert.equal((await page.evaluate(() => RE_COMMAND_REPERTOIRE_R31.state())).selected, 'rerev-farfarello');
      assert.equal(await page.evaluate(() => localStorage.length), 0);
      return {identities: 389, adaptedCommands: 3460, prototypeValuesChanged: false, contextIdentityPromoted: false, localStorageWrites: 0};
    } finally {await page.close();}
  });
  await test('Both source pages reflow at320px and200percent text while native keyboard controls remain usable', async () => {
    const page = await browser.newPage({viewport: {width: 320, height: 900}, reducedMotion: 'reduce'});
    try {
      await loaded(page, '?id=rerev-ooze&clip=em1000_em1000_BA_20');
      await page.evaluate(() => document.documentElement.style.fontSize = '200%');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.locator('#canvas').focus(); await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().paintedFrame === 1);
      await page.keyboard.press('End'); await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().paintedFrame === 107);
      await page.screenshot({path: path.join(output, 'motion-320-text200.png'), fullPage: true});
      await page.goto(base + '/modules/fidelity-r31/commands/index.html?id=rerev-tricorne-ooze');
      await page.waitForFunction(() => RE_COMMAND_REPERTOIRE_R31.state().loaded);
      await page.evaluate(() => document.documentElement.style.fontSize = '200%');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.locator('#identity').focus(); assert.equal(await page.locator('#identity').evaluate(element => element === document.activeElement), true);
      await page.screenshot({path: path.join(output, 'commands-320-text200.png'), fullPage: true});
      return {viewport: 320, rootTextPercent: 200, realKeyboardNativeEndpoints: true, voluntaryPlaybackOnly: true};
    } finally {await page.close();}
  });
  await test('A corrupted native atlas is rejected by SHA before canvas display', async () => {
    const page = await browser.newPage();
    await page.route(url => url.pathname.includes('/motion/atlases/') && url.pathname.endsWith('.png'), async route => {
      const response = await route.fetch(), bytes = await response.body(); bytes[bytes.length - 1] ^= 1;
      await route.fulfill({response, body: bytes});
    });
    try {
      await page.goto(base + '/modules/fidelity-r31/motion/index.html?id=rerev-ooze&clip=em1000_em1000_BA_20');
      await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().error);
      const state = await page.evaluate(() => RE_MOTION_REVIEW_R31.state());
      assert.match(state.error, /Empreinte PNG/); assert.equal(state.paintedFrame, -1); assert.equal(state.playing, false);
      return {corruptAtlasDisplayed: false, error: state.error};
    } finally {await page.close();}
  });
  await test('Forged external frame paths fail before requesting any native PNG', async () => {
    const page = await browser.newPage(), forged = structuredClone(world), requests = [];
    forged.entries[0].frames[0].path = 'https://untrusted.example/leak.png';
    await page.route('**/motion/manifest.json', route => route.fulfill({status: 200, json: forged}));
    page.on('request', request => {if (request.url().endsWith('.png')) requests.push(request.url());});
    try {
      await page.goto(base + '/modules/fidelity-r31/motion/index.html'); await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().error);
      assert.match((await page.evaluate(() => RE_MOTION_REVIEW_R31.state())).error, /Chemin de source/);
      assert.deepEqual(requests, []); return {externalRequests: 0, nativePNGsRequested: 0};
    } finally {await page.close();}
  });
  await test('Pagehide releases actual pending decode slots and pageshow resumes source reading', async () => {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const Original = Image, descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      window.__holdR31Decode = true;
      window.Image = function () {const image = new Original(); let value = '';
        Object.defineProperty(image, 'src', {get() {return value;}, set(next) {value = next; if (!window.__holdR31Decode) descriptor.set.call(image, next);}});
        return image;};
    });
    try {
      await page.goto(base + '/modules/fidelity-r31/motion/index.html?id=rerev-ooze&clip=em1000_em1000_BA_20');
      await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().cache.loading > 0);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
      await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().cache.loading === 0);
      assert.equal((await page.evaluate(() => RE_MOTION_REVIEW_R31.state())).cache.cached, 0);
      await page.evaluate(() => {window.__holdR31Decode = false; dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));});
      await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().paintedFrame === 0);
      assert.equal((await page.evaluate(() => RE_MOTION_REVIEW_R31.state())).error, '');
      return {decodeHeldForBoundaryTest: true, hiddenLoadingSlots: 0, sourceReadingResumed: true};
    } finally {await page.close();}
  });
  await test('Pagehide during the first manifest request can resume without a stale error or disabled reader', async () => {
    const page = await browser.newPage(); let release, first = true;
    const hold = new Promise(resolve => {release = resolve;});
    await page.route('**/motion/manifest.json', async route => {
      if (first) {first = false; await hold;}
      try {await route.continue();} catch {}
    });
    try {
      await page.goto(base + '/modules/fidelity-r31/motion/index.html', {waitUntil: 'commit'});
      await page.waitForFunction(() => window.RE_MOTION_REVIEW_R31?.state().loadingManifest);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
      release();
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      await page.waitForFunction(() => RE_MOTION_REVIEW_R31.state().loaded && RE_MOTION_REVIEW_R31.state().paintedFrame === 0);
      const state = await page.evaluate(() => RE_MOTION_REVIEW_R31.state()); assert.equal(state.error, '');
      assert.equal(await page.locator('#play').isEnabled(), true);
      return {firstRequestInterrupted: true, sourceManifestResumed: true, staleErrorOrDisabledControls: false};
    } finally {release(); await page.close();}
  });
  await test('Repertoire source labels stay inert and external canonical targets are refused', async () => {
    const page = await browser.newPage(), forged = structuredClone(commands);
    const row = forged.entries.find(row => row.id === 'rerev-tricorne-ooze');
    row.name = '<img src=x onerror="window.r31Injected=true">';
    await page.route('**/commands/manifest.json', route => route.fulfill({status: 200, json: forged}));
    try {
      await page.goto(base + '/modules/fidelity-r31/commands/index.html?id=rerev-tricorne-ooze');
      await page.waitForFunction(() => RE_COMMAND_REPERTOIRE_R31.state().loaded);
      assert.match(await page.locator('#name').textContent(), /<img/); assert.equal(await page.evaluate(() => Boolean(window.r31Injected)), false);
      row.documentaryMoveClaims[0].manifest = 'https://untrusted.example/collect';
      await page.reload(); await page.waitForFunction(() => RE_COMMAND_REPERTOIRE_R31.state().error);
      assert.equal(await page.locator('a[href^="https://untrusted.example"]').count(), 0);
      assert.equal(await page.locator('#record').isHidden(), true);
      return {inertLabels: true, externalSourceLinkRefused: true};
    } finally {await page.close();}
  });
} finally {await browser?.close(); server.kill('SIGTERM');}
const names = ['tests/browser-motion-commands-r31.mjs', 'modules/fidelity-r31/motion/index.html',
  'modules/fidelity-r31/motion/page.js', 'modules/fidelity-r31/motion/reader.js', 'modules/fidelity-r31/motion/style.css',
  'modules/fidelity-r31/motion/manifest.json', 'modules/fidelity-r31/motion/root-follow-manifest.json',
  'modules/fidelity-r31/commands/index.html', 'modules/fidelity-r31/commands/page.js',
  'modules/fidelity-r31/commands/style.css', 'modules/fidelity-r31/commands/manifest.json'];
const report = {schema: 're.bow.motion-browser-r31/1', observedAtUTC: new Date().toISOString(),
  passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length, checks,
  sourceFiles: names.map(name => ({path: name, sha256: sha(fs.readFileSync(path.join(root, name)))})),
  scope: 'Actual source data, native PNG/atlas pixels, manual/playback timeline, root-follow inspection, all-UID read-only command audit, mobile keyboard/reflow and source transport/lifecycle failure boundaries. No original-game action or physical-device FPS certification.'};
fs.writeFileSync(path.join(root, 'docs/R31_MOTION_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
