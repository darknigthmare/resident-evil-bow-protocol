import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'qa-canonical-r31'); fs.mkdirSync(out, {recursive: true});
const port = Number(process.env.BOW_R31_CANONICAL_PORT || 5847), base = 'http://127.0.0.1:' + port;
const route = '/modules/fidelity-r31/canonical/index.html';
const pack = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r31/canonical/manifest.json')));
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const checks = []; let browser;
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function loaded(page, uid = 'rerev-malacoda') {
  const response = await page.goto(base + route + '?id=' + uid); assert.equal(response.status(), 200);
  await page.waitForFunction(() => RE_CANONICAL_R31.state().loaded || RE_CANONICAL_R31.state().failed);
  assert.equal(await page.evaluate(() => RE_CANONICAL_R31.state().failed), false);
  assert.equal(await page.evaluate(() => RE_CANONICAL_R31.state().uid), uid);
}
try {
  for (let attempt = 0; attempt < 80; attempt++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('The real source viewer loads17 exact identities and389 victim references without images or gameplay writes', async () => {
    const context = await browser.newContext(), page = await context.newPage(), images = [];
    page.on('request', request => {if (/\.(png|jpe?g|webp|wav|ogg)(?:\?|$)/i.test(request.url())) images.push(request.url());});
    try {
      await loaded(page); assert.equal(await page.locator('#results button').count(), 17);
      assert.equal((await page.evaluate(() => RE_CANONICAL_R31.state())).catalogueVictims, 389);
      assert.match(await page.locator('#status').innerText(), /20 faits nouveaux, 10 preuves antérieures/);
      assert.deepEqual(images, []); assert.deepEqual(await page.evaluate(() => ({local: localStorage.length, session: sessionStorage.length})), {local: 0, session: 0});
      const hrefs = await page.locator('#details blockquote + p a').evaluateAll(nodes => nodes.map(node => node.href));
      assert(hrefs.length); assert(hrefs.every(href => new URL(href).protocol.startsWith('http')));
      await page.screenshot({path: path.join(out, 'real-source-view.png'), fullPage: false});
      return {identities: 17, catalogueVictims: 389, imageOrAudioRequests: 0, storageWrites: 0};
    } finally {await context.close();}
  });
  await test('Original and remake Gamma keep their own exact text and source routes', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await loaded(page, 're3r-hunter-gamma'); assert.match(await page.locator('#details').innerText(), /2020/);
      assert.match(await page.locator('#details').innerText(), /Specimen is now able to move quickly and swallow prey whole/);
      await page.fill('#search', 're3-hunter-gamma'); await page.locator('#results button[data-id="re3-hunter-gamma"]').click();
      assert.match(await page.locator('#details').innerText(), /1999/); assert.match(await page.locator('#details').innerText(), /aquatic environments/);
      assert(!/swallow prey whole/.test(await page.locator('#details').innerText()));
      assert.equal(new URL(page.url()).searchParams.get('id'), 're3-hunter-gamma');
      return {editionTransfers: 0, exactUidRouteUpdated: true};
    } finally {await context.close();}
  });
  await test('The actual dimension control refuses an adult transfer and retains approximate centimetres', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await loaded(page); const card = page.locator('[data-dimension-id="malacoda-larva-length"]');
      assert.match(await card.innerText(), /Environ 1 cm \(environ 0.01 m\)/); assert.equal(await card.locator('.result').getAttribute('data-supported'), 'true');
      await card.locator('select').first().selectOption('other-body-stage'); await card.locator('button').click();
      assert.equal(await card.locator('.result').getAttribute('data-supported'), 'false');
      assert.match(await card.innerText(), /ne correspond pas/);
      await loaded(page, 're5-u-8'); assert.match(await page.locator('[data-dimension-id="u8-body-height"]').innerText(), /sans hauteur exacte/);
      return {larvalToAdultRejected: true, qualitativeHeightNotCalibrated: true};
    } finally {await context.close();}
  });
  await test('Real conclusion controls require every source condition and reject arbitrary BOW victims', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await loaded(page, 're3r-hunter-gamma'); const card = page.locator('[data-rule-id="gamma-worker-swallow"]');
      assert.equal(await card.locator('select').first().locator('option').count(), 390);
      await card.locator('button').click(); assert.equal(await card.locator('.result').getAttribute('data-supported'), 'false');
      for (const checkbox of await card.locator('input[type=checkbox]').all()) await checkbox.check();
      await card.locator('button').click(); assert.equal(await card.locator('.result').getAttribute('data-supported'), 'true');
      assert.match(await card.locator('.result').innerText(), /Aucune conclusion animée/);
      await card.locator('select').first().selectOption('re5-u-8'); await card.locator('button').click();
      assert.equal(await card.locator('.result').getAttribute('data-supported'), 'false');
      assert.equal(await card.locator('.result').getAttribute('data-reason'), 'arbitrary-catalogue-victim-not-documented');
      return {requiredConditionsObserved: true, catalogueVictimChoices: 389, arbitraryPairAdmitted: false};
    } finally {await context.close();}
  });
  await test('Keyboard search and held alias cards preserve exact subject focus without hidden promotion', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await loaded(page); await page.fill('#search', 'Duvalia');
      await page.locator('#results button').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'details');
      assert.equal(await page.evaluate(() => RE_CANONICAL_R31.state().uid), 're5-duvalia');
      assert.match(await page.locator('[data-alias-id="plaga-c-to-duvalia"]').innerText(), /HELD_ALIAS_NOT_PROVEN/);
      assert.match(await page.locator('[data-alias-id="plaga-c-to-duvalia"]').innerText(), /Aucune promotion/);
      return {exactSubjectFocus: true, unprovedAliasPromotion: false};
    } finally {await context.close();}
  });
  await test('Actual320px and1280px views reflow with text doubled and retain visible keyboard focus', async () => {
    const observed = [];
    for (const width of [1280, 320]) {
      const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage();
      try {
        await loaded(page, 're3r-hunter-gamma');
        for (const textScale of ['100%', '200%']) {
          await page.evaluate(value => {document.documentElement.style.fontSize = value;}, textScale);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          const overflow = await page.locator('#details').evaluate(article => [...article.querySelectorAll('section,select,button,dl,dd')].filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.tagName + ':' + node.className));
          assert.deepEqual(overflow, []);
          await page.locator('#search').focus(); assert.equal(await page.evaluate(() => document.activeElement.id), 'search');
          observed.push({width, textScale, internalOverflow: 0});
        }
        await page.screenshot({path: path.join(out, 'source-reflow-' + width + '.png'), fullPage: false});
      } finally {await context.close();}
    }
    return observed;
  });
  await test('Source quotations remain inert text when metadata contains markup', async () => {
    const context = await browser.newContext(), page = await context.newPage(), changed = structuredClone(pack);
    changed.claims.find(row => row.uid === 're3r-hunter-gamma').evidence[0].excerpt = '<img src=x onerror="window.r31Injected=true">';
    await page.route('**/canonical/manifest.json', route => route.fulfill({json: changed}));
    try {
      await loaded(page, 're3r-hunter-gamma'); assert.equal(await page.evaluate(() => Boolean(window.r31Injected)), false);
      assert.match(await page.locator('#details').innerText(), /<img src=x/); assert.equal(await page.locator('#details img').count(), 0);
      return {markupExecuted: false, quotePresentedAsText: true};
    } finally {await context.close();}
  });
  await test('External snapshot paths and changed catalogue bytes fail closed before presenting evidence', async () => {
    const observed = [];
    for (const attack of ['snapshot', 'catalogue']) {
      const context = await browser.newContext(), page = await context.newPage();
      try {
        if (attack === 'snapshot') {const changed = structuredClone(pack); changed.sources[0].snapshot = 'https://untrusted.test/evidence'; await page.route('**/canonical/manifest.json', route => route.fulfill({json: changed}));}
        else await page.route('**/data/roster.json', route => route.fulfill({json: {catalog: []}}));
        await page.goto(base + route); await page.waitForFunction(() => RE_CANONICAL_R31.state().failed);
        assert.equal(await page.locator('#results button').count(), 0); assert.equal(await page.locator('#details blockquote').count(), 0);
        assert.equal(await page.locator('a[href^="https://untrusted.test"]').count(), 0); observed.push({attack, evidencePresented: false});
      } finally {await context.close();}
    }
    return observed;
  });
} finally {await browser?.close(); server.kill('SIGTERM');}
const names = ['tests/browser-canonical-r31.mjs', 'modules/fidelity-r31/canonical/index.html', 'modules/fidelity-r31/canonical/page.js',
  'modules/fidelity-r31/canonical/query.js', 'modules/fidelity-r31/canonical/style.css', 'modules/fidelity-r31/canonical/manifest.json', 'data/roster.json'];
const report = {schema: 're.bow.canonical-browser-r31/1', passed: checks.filter(row => row.pass).length,
  failed: checks.filter(row => !row.pass).length, checks, sourceFiles: names.map(name => ({path: name, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')})),
  scope: 'Actual source viewer, phase and victim controls, all389 reference choices, keyboard and320px/200%text reflow, inert quotations and hostile source bindings. No screen-reader or physical-device certification.'};
fs.writeFileSync(path.join(root, 'docs/R31_CANONICAL_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
