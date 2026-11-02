/** Actual DEV gallery and PNGs; the manifest is an exact immutable read snapshot for each run. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const preview = process.argv.includes('--preview');
const out = path.join(root, preview ? 'qa-roster-assets-r34-preview' : 'qa-roster-assets-r34'); fs.mkdirSync(out, {recursive: true});
const manifestPath = 'modules/fidelity-r34/assets/manifest.json';
const rawManifest = fs.readFileSync(path.join(root, manifestPath)), manifest = JSON.parse(rawManifest);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const portraits = manifest.portraits; assert(portraits.length >= 2, 'At least two actually generated and reviewed portraits are needed.');
const first = portraits[0], second = portraits.find(item => item.id !== first.id);
const blocked = manifest.entries.find(item => item.portrait.status === 'BLOCKED_HISTORICAL_REFUSAL'); assert(blocked);
fs.writeFileSync(path.join(out, 'tested-manifest.json'), rawManifest);
const port = Number(process.env.BOW_ROSTER_ASSETS_R34_PORT || 5943), base = 'http://127.0.0.1:' + port;
const gallery = '/modules/fidelity-r34/assets/index.html';
const checks = [], sleep = ms => new Promise(resolve => setTimeout(resolve, ms)); let browser;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function scene(options = {}) {
  const context = await browser.newContext({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce', ...options});
  const page = await context.newPage(), requests = [], errors = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname)); page.on('pageerror', error => errors.push(error.message));
  await page.route('**/modules/fidelity-r34/assets/manifest.json', route => route.fulfill({status: 200, contentType: 'application/json', body: rawManifest}));
  return {context, page, requests, errors};
}
async function displayed(page, item = first) {await page.waitForFunction(sha => globalThis.RE_FIGHTER_ASSET_GALLERY_R34?.state().displayed === sha, item.sha256);}
try {
  for (let i = 0; i < 100; i++) {try {if ((await fetch(base)).ok) break;} catch {} await sleep(60);}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('The normal player route does not fetch or expose the production register', async () => {
    const {context, page, requests, errors} = await scene();
    try {await page.goto(base + gallery); assert.equal(await page.locator('#workspace').isVisible(), false); assert.match(await page.locator('#devGate').innerText(), /mode DEV/);
      assert.equal(requests.filter(name => name.endsWith('/manifest.json') || /\/generated\/.+\.png$/.test(name)).length, 0); assert.deepEqual(errors, []);
      return {devOnly: true, registerRequests: 0, generatedPngRequests: 0};
    } finally {await context.close();}
  });
  await test('One real generated portrait is SHA-checked, decoded and presented with truthful provenance', async () => {
    const {context, page, requests, errors} = await scene();
    try {await page.goto(base + gallery + '?dev=1&uid=' + first.id); await displayed(page);
      const info = await page.locator('#asset').evaluate(image => {const c = document.createElement('canvas'); c.width = image.naturalWidth; c.height = image.naturalHeight;
        const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0); const alpha = ctx.getImageData(0, 0, c.width, c.height).data; let zero = 0, visible = 0;
        for (let n = 3; n < alpha.length; n += 4) {zero += alpha[n] === 0; visible += alpha[n] >= 16;} return {width: c.width, height: c.height, zero, visible, alt: image.alt};});
      assert.equal(info.width, first.width); assert.equal(info.height, first.height); assert(info.zero > 0 && info.visible > 0); assert.match(info.alt, /portrait généré/);
      assert.equal(requests.filter(name => /\/assets\/generated\/.+\.png$/.test(name)).length, 1);
      assert.match(await page.locator('#message').innerText(), /aucun idle original certifié/); assert.equal(await page.locator('#links a').count(), 2);
      const credits = await page.evaluate(() => RE_IMAGE_BUDGET_R31.state()); assert.equal(credits.owners['r34-gallery'].assets, 1); assert.equal(credits.pending, 0); assert(credits.reservedPixels <= credits.limits.pixels);
      await page.screenshot({path: path.join(out, 'actual-portrait-gallery.png'), fullPage: true}); assert.deepEqual(errors, []);
      return {id: first.id, sourceSha256: first.sha256, decoded: info, pixels: credits.reservedPixels, generatedPngsInitiallyLoaded: 1, frames: 1};
    } finally {await context.close();}
  });
  await test('Keyboard activation keeps focus and a preserved refusal never loads a generated substitute', async () => {
    const {context, page, requests, errors} = await scene();
    try {await page.goto(base + gallery + '?dev=1&uid=' + first.id); await displayed(page);
      await page.fill('#search', second.id); const button = page.locator('#choices button[data-uid="' + second.id + '"]'); await button.focus(); await page.keyboard.press('Enter'); await displayed(page, second);
      assert.equal(await button.evaluate(node => node === document.activeElement), true); assert.equal(await button.getAttribute('aria-pressed'), 'true');
      await page.fill('#search', blocked.id); const count = requests.filter(name => /\/assets\/generated\/.+\.png$/.test(name)).length;
      await page.locator('#choices button[data-uid="' + blocked.id + '"]').click(); await page.waitForFunction(uid => RE_FIGHTER_ASSET_GALLERY_R34.state().uid === uid, blocked.id);
      assert.equal(await page.locator('#asset').isVisible(), false); assert.equal(await page.evaluate(() => RE_FIGHTER_ASSET_GALLERY_R34.state().displayed), null);
      assert.equal(requests.filter(name => /\/assets\/generated\/.+\.png$/.test(name)).length, count); assert.match(await page.locator('#facts').innerText(), /BLOCKED_HISTORICAL_REFUSAL/); assert.deepEqual(errors, []);
      return {nativeKeyboardActivation: true, focusRetained: true, refusedUid: blocked.id, generatedRefusalSubstitutions: 0};
    } finally {await context.close();}
  });
  await test('A corrupted actual PNG is refused while its source receipt remains reachable', async () => {
    const {context, page, errors} = await scene(); const raw = Buffer.from(fs.readFileSync(path.join(root, first.image))); raw[raw.length - 1] ^= 1;
    await page.route('**/' + first.image, route => route.fulfill({status: 200, contentType: 'image/png', body: raw}));
    try {await page.goto(base + gallery + '?dev=1&uid=' + first.id); await page.waitForFunction(() => globalThis.RE_FIGHTER_ASSET_GALLERY_R34?.state().failed);
      assert.equal(await page.locator('#asset').isVisible(), false); assert.match(await page.locator('#message').innerText(), /SHA-256/); assert.equal(await page.locator('#links a').count(), 2);
      assert.equal(await page.evaluate(() => RE_IMAGE_BUDGET_R31.state().reservedPixels), 0); assert.deepEqual(errors, []); return {alteredPixelsDisplayed: false, receiptLinkKept: true};
    } finally {await context.close();}
  });
  await test('Leaving and returning releases the real decoder credits and reloads the selected portrait', async () => {
    const {context, page, errors} = await scene();
    try {await page.goto(base + gallery + '?dev=1&uid=' + first.id); await displayed(page);
      const storage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
      const hidden = await page.evaluate(() => {dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})); return {budget: RE_IMAGE_BUDGET_R31.state(), state: RE_FIGHTER_ASSET_GALLERY_R34.state()};});
      assert.equal(hidden.budget.reservedPixels, 0); assert.equal(hidden.state.active, false); assert.equal(await page.locator('#asset').isVisible(), false);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}))); await displayed(page);
      assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))), storage); assert.deepEqual(errors, []);
      return {syntheticPageLifecycle: true, hiddenPixels: 0, resumedSha256: first.sha256, saveWrites: 0};
    } finally {await context.close();}
  });
  await test('An interrupted initial register load can restart before its old request completes', async () => {
    const {context, page, errors} = await scene(); let release; const held = new Promise(resolve => {release = resolve;}); let requests = 0;
    await page.unroute('**/modules/fidelity-r34/assets/manifest.json');
    await page.route('**/modules/fidelity-r34/assets/manifest.json', async route => {requests++; if (requests === 1) await held; await route.fulfill({status: 200, contentType: 'application/json', body: rawManifest}).catch(() => {});});
    try {await page.goto(base + gallery + '?dev=1&uid=' + first.id, {waitUntil: 'domcontentloaded'});
      await page.waitForFunction(() => !!globalThis.RE_FIGHTER_ASSET_GALLERY_R34);
      await page.evaluate(() => {dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})); dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));});
      await displayed(page); release(); await page.waitForTimeout(30); assert.equal(await page.evaluate(() => RE_FIGHTER_ASSET_GALLERY_R34.state().displayed), first.sha256);
      assert(requests >= 2); assert.deepEqual(errors, []); return {restartRegisterRequests: requests, supersededInitializationPublished: false, syntheticLifecycle: true};
    } finally {release(); await context.close();}
  });
  await test('A superseded image failure cannot overwrite the currently selected image or URI', async () => {
    const {context, page, errors} = await scene(); let release; const held = new Promise(resolve => {release = resolve;}); let requested = false;
    await page.route('**/' + first.image, async route => {requested = true; await held; await route.fulfill({status: 503, body: 'delayed old request'}).catch(() => {});});
    try {await page.goto(base + gallery + '?dev=1&uid=' + first.id, {waitUntil: 'domcontentloaded'});
      for (let i = 0; i < 100 && !requested; i++) await sleep(10); assert(requested);
      await page.fill('#search', second.id); await page.locator('#choices button[data-uid="' + second.id + '"]').click(); await displayed(page, second); release(); await page.waitForTimeout(30);
      const state = await page.evaluate(() => ({...RE_FIGHTER_ASSET_GALLERY_R34.state(), uriUid: new URL(location.href).searchParams.get('uid')}));
      assert.equal(state.uid, second.id); assert.equal(state.uriUid, second.id); assert.equal(state.failed, false); assert.equal(state.displayed, second.sha256); assert.deepEqual(errors, []);
      return {currentUid: second.id, staleRejectedImagePublished: false};
    } finally {release(); await context.close();}
  });
  await test('The gallery reflows at320px with actual200percent text and passes axe4.14', async () => {
    const {context, page, errors} = await scene({viewport: {width: 320, height: 1100}});
    try {await page.goto(base + gallery + '?dev=1&uid=' + first.id); await displayed(page); await page.evaluate(() => {document.documentElement.style.fontSize = '200%';});
      const sizes = await page.evaluate(() => ({viewport: innerWidth, scroll: document.documentElement.scrollWidth, fontSize: parseFloat(getComputedStyle(document.body).fontSize),
        detail: document.getElementById('detail').getBoundingClientRect().width, detailScroll: document.getElementById('detail').scrollWidth}));
      assert(sizes.fontSize >= 32); assert(sizes.scroll <= sizes.viewport + 1); assert(sizes.detailScroll <= sizes.detail + 1);
      await page.addScriptTag({path: process.env.AXE_CORE_PATH || '/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js'});
      const audit = await page.evaluate(async () => {const result = await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']}});
        return {version: axe.version, violations: result.violations.map(item => ({id: item.id, nodes: item.nodes.map(node => node.target)})), passes: result.passes.length};});
      assert.equal(audit.version, '4.14.0'); assert.deepEqual(audit.violations, []); await page.screenshot({path: path.join(out, 'gallery-320-text200.png'), fullPage: true}); assert.deepEqual(errors, []);
      return {sizes, audit, actualTextSize: '200%', physicalAssistiveDevicesCertified: false};
    } finally {await context.close();}
  });
} finally {await browser?.close(); server.kill('SIGTERM');}
const currentManifest = hash(fs.readFileSync(path.join(root, manifestPath))) === hash(rawManifest);
if (!preview && !currentManifest) checks.push({name: 'The tested source manifest remains current at completion', pass: false, error: 'Production changed the register during this final proof; use --preview or rerun after the generation phase.'});
const names = ['tests/browser-roster-assets-r34.mjs', 'modules/fidelity-r34/assets/index.html', 'modules/fidelity-r34/assets/style.css', 'modules/fidelity-r34/assets/page.js',
  'modules/fidelity-r31/performance/image-budget.js'];
const report = {schema: 're.bow.roster-assets-browser-r34/1', passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks,
  preview, testedManifestSha256: hash(rawManifest), manifestCurrentAtCompletion: currentManifest,
  sourceFiles: names.concat(preview ? [] : [manifestPath]).map(name => ({path: name, sha256: hash(fs.readFileSync(path.join(root, name)))})),
  scope: 'Actual DEV gallery, real generated PNGs and exact read snapshot of the compiler register. Page lifecycle/transport delays are declared fixtures; no body completeness, original-animation, physical-device or global1:1 certification.'};
const reportName = preview ? path.join(out, 'report.json') : path.join(root, 'docs/R34_ASSETS_BROWSER.json');
fs.writeFileSync(reportName, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, failed: report.failed, preview, report: reportName})); if (report.failed) process.exitCode = 1;
