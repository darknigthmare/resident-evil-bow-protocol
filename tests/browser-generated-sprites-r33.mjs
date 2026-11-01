/** Real R33 gallery with all eight actual PNGs; edition holds and lifecycle remain explicit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r33/sprites/manifest.json')));
const output = path.join(root, 'qa-generated-sprites-r33'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_SPRITES_R33_PORT || 5943), base = 'http://127.0.0.1:' + port, gallery = '/modules/fidelity-r33/sprites/index.html', checks = [];
const hash = raw => createHash('sha256').update(raw).digest('hex'), pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
async function displayed(page, sha) { await page.waitForFunction(sha => globalThis.RE_SPRITE_GALLERY_R33?.state().displayed === sha, sha, {timeout: 30000}); }
function entry(uid, facing) { return manifest.variants.find(value => value.id === uid && value.sourceFacing === facing); }
try {
  for (let n = 0; n < 100; n++) { try { if ((await fetch(base)).ok) break; } catch {} await pause(60); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Eight actual generated PNGs decode lazily with alpha and complete visible bounds', async () => {
    const context = await browser.newContext({viewport: {width: 1280, height: 1000}}), page = await context.newPage(), imageRequests = [], errors = [], images = [];
    page.on('request', request => { if (/\/fidelity-r33\/sprites\/generated\/.+\.png$/.test(new URL(request.url()).pathname)) imageRequests.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + gallery); await displayed(page, manifest.variants[0].sha256);
      assert.equal(imageRequests.length, 1); assert.equal(await page.locator('#choices button').count(), 4);
      for (const item of manifest.variants) {
        if ((await page.evaluate(() => RE_SPRITE_GALLERY_R33.state())).displayed !== item.sha256) await page.evaluate(value => RE_SPRITE_GALLERY_R33.choose(value.variantFamilyId, value.sourceFacing), item);
        await displayed(page, item.sha256);
        const decoded = await page.locator('#generatedSpriteR33').evaluate(image => {
          const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); const raw = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let transparent = 0, visible = 0, minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) { const a = raw[(y * canvas.width + x) * 4 + 3]; transparent += a === 0; if (a >= 16) { visible++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); } }
          return {width: canvas.width, height: canvas.height, transparent, visible, bounds: {x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1}, sha: image.dataset.sha256};
        });
        assert.equal(decoded.sha, item.sha256); assert.equal(decoded.width, item.width); assert.equal(decoded.height, item.height); assert(decoded.transparent > 0 && decoded.visible > 0); assert.deepEqual(decoded.bounds, item.bounds);
        assert.equal(await page.locator('#image img').count(), 1); assert.equal((await page.evaluate(() => RE_SPRITE_GALLERY_R33.state())).frames, 1);
        assert.match(await page.locator('#edition').innerText(), /GameCube.+PlayStation non assimilée/);
        if (!item.availableStates.length) assert.match(await page.locator('#scope').innerText(), /documentaire|pose source compacte/);
        await page.screenshot({path: path.join(output, item.id + '-' + item.sourceFacing + '.png'), fullPage: true}); images.push({uid: item.id, facing: item.sourceFacing, ...decoded});
      }
      assert.equal(imageRequests.length, 8); assert.deepEqual(errors, []);
      return {actualPngs: images, initialImageRequests: 1, totalActualImageRequests: 8, generatedNotNative: true, animationFramesPerSide: 1};
    } finally { await context.close(); }
  });
  await test('Native keyboard buttons and radio controls change only the documented profile', async () => {
    const context = await browser.newContext(), page = await context.newPage(), trusted = [];
    try {
      await page.goto(base + gallery); await displayed(page, manifest.variants[0].sha256);
      const beforeStorage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
      await page.evaluate(() => { globalThis.__r33Trusted = []; document.addEventListener('click', event => { if (event.target.closest('#choices button') || event.target.closest('#sides')) __r33Trusted.push(event.isTrusted); }); });
      const last = page.locator('#choices button').last(); await last.focus(); await page.keyboard.press('Enter'); await displayed(page, entry('re3-zombie', 'right').sha256);
      const left = page.getByRole('radio', {name: 'Gauche'}); await left.focus(); await page.keyboard.press('Space'); await displayed(page, entry('re3-zombie', 'left').sha256);
      assert.equal(await left.isChecked(), true); assert.equal(await left.evaluate(node => node === document.activeElement), true);
      const state = await page.evaluate(() => ({...RE_SPRITE_GALLERY_R33.state(), storage: JSON.stringify(Object.fromEntries(Object.entries(localStorage))), trusted: __r33Trusted}));
      assert.equal(state.storage, beforeStorage); assert.equal(state.editionPromoted, false); assert.equal(state.animated, false); assert(state.trusted.length >= 2 && state.trusted.every(Boolean));
      trusted.push(...state.trusted); return {trustedActivations: trusted.length, storageUnchanged: true, editionPromoted: false};
    } finally { await context.close(); }
  });
  await test('Actual text at200percent remains usable at320px without masked overflow', async () => {
    const context = await browser.newContext({viewport: {width: 320, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage();
    try {
      await page.goto(base + gallery + '?family=re2-giant-alligator-gamecube-r33&side=left'); await displayed(page, entry('re2-giant-alligator', 'left').sha256);
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await page.locator('#detail details summary').click();
      const size = await page.evaluate(() => ({width: innerWidth, scroll: document.documentElement.scrollWidth, detailWidth: document.querySelector('#detail').getBoundingClientRect().width, detailScroll: document.querySelector('#detail').scrollWidth, overflowX: getComputedStyle(document.documentElement).overflowX}));
      assert(size.scroll <= size.width + 1); assert(size.detailScroll <= size.detailWidth + 1); assert.notEqual(size.overflowX, 'hidden');
      assert.equal(await page.locator('#detail details').getAttribute('open'), ''); assert.equal(await page.locator('#sources a').count(), 7);
      await page.screenshot({path: path.join(output, 'gallery-320-text200.png'), fullPage: true}); return {size, actualTextResize: '200%', contextualSubjectPreserved: true};
    } finally { await context.close(); }
  });
  await test('Altered real PNG bytes are refused before display while source links remain available', async () => {
    const context = await browser.newContext(), page = await context.newPage(), item = manifest.variants[0], raw = Buffer.from(fs.readFileSync(path.join(root, item.image))); raw[raw.length - 1] ^= 1;
    await page.route('**/' + item.image, route => route.fulfill({status: 200, contentType: 'image/png', body: raw}));
    try {
      await page.goto(base + gallery); await page.waitForFunction(() => RE_SPRITE_GALLERY_R33.state().failed);
      assert.equal(await page.locator('#image img').count(), 0); assert.match(await page.locator('#message').innerText(), /SHA-256/); assert.equal(await page.locator('#sources a').count(), 7);
      const state = await page.evaluate(() => RE_SPRITE_GALLERY_R33.state()); assert.equal(state.frames, 0); return {corruptionRejected: true, displayed: state.displayed, provenanceLinks: 7};
    } finally { await context.close(); }
  });
  await test('An obsolete selection cannot publish its image, error or address after the current one', async () => {
    const context = await browser.newContext(), page = await context.newPage(), delayed = entry('re2-zombie-dog', 'left'); let requested = false;
    try {
      await page.goto(base + gallery); await displayed(page, manifest.variants[0].sha256);
      await page.route('**/' + delayed.image, async route => { requested = true; await pause(400); try { await route.fulfill({status: 500, contentType: 'text/plain', body: 'Explicit delayed old-choice failure fixture'}); } catch {} });
      await page.getByRole('radio', {name: 'Gauche'}).check(); await page.waitForFunction(() => RE_SPRITE_GALLERY_R33.state().frames === 0);
      await page.getByRole('radio', {name: 'Droite'}).check(); await page.locator('[data-family="re2-giant-moth-gamecube-r33"]').click();
      await displayed(page, entry('re2-giant-moth', 'right').sha256); await pause(450);
      const state = await page.evaluate(() => ({...RE_SPRITE_GALLERY_R33.state(), address: location.search}));
      assert(requested); assert.equal(state.failed, false); assert.match(state.address, /family=re2-giant-moth-gamecube-r33/); assert.match(state.address, /side=right/); assert.equal(state.displayed, entry('re2-giant-moth', 'right').sha256);
      return {oldRequestWasReal: requested, delayedFailureFixture: true, currentImageAndAddressPreserved: true};
    } finally { await context.close(); }
  });
  await test('Explicit page lifecycle fixtures release the decoded image and recover the same chosen side', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + gallery + '?family=re3-zombie-gamecube-r33&side=left'); await displayed(page, entry('re3-zombie', 'left').sha256);
      const storage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
      assert.equal(await page.locator('#image img').count(), 0); assert.equal((await page.evaluate(() => RE_SPRITE_GALLERY_R33.state())).frames, 0);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}))); await displayed(page, entry('re3-zombie', 'left').sha256);
      assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))), storage);
      return {syntheticLifecycleEvents: true, actualPngDecodedAfterResume: true, chosenSide: 'left', physicalBfCacheCertified: false};
    } finally { await context.close(); }
  });
  await test('Sixteen exact retained views and the four native archives are reachable with matching SHA', async () => {
    const refs = new Map(); for (const family of manifest.families) { for (const source of family.sourceFiles) refs.set(source.path, source); refs.set(family.sourceArchive.path, family.sourceArchive); }
    for (const source of refs.values()) { const response = await fetch(base + '/' + source.path); assert(response.ok, source.path); assert.equal(hash(Buffer.from(await response.arrayBuffer())), source.sha256); }
    return {retainedNativeViews: 16, retainedArchives: 4, referenceFilesFetchedAndHashed: refs.size};
  });
} finally { await browser?.close(); server.kill('SIGTERM'); }
const sources = ['tests/browser-generated-sprites-r33.mjs', 'modules/fidelity-r33/sprites/manifest.json', 'modules/fidelity-r33/sprites/index.html', 'modules/fidelity-r33/sprites/style.css', 'modules/fidelity-r33/sprites/library.js', 'modules/fidelity-r33/sprites/page.js'];
const report = {schema: 're.bow.generated-sprites-browser-r33/1', passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length, checks, sourceFiles: sources.map(name => ({path: name, sha256: hash(fs.readFileSync(path.join(root, name)))})), scope: 'Actual Chromium gallery and8true image_gen PNGs, lazy decode, native keyboard controls,320px actual200percent text, corruption and obsolete responses, explicit synthetic lifecycle fixtures and exact retained references. No physical BFCache, original animation, combat assignment or PlayStation equivalence claimed.'};
fs.writeFileSync(path.join(root, 'docs/R33_SPRITES_BROWSER.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
