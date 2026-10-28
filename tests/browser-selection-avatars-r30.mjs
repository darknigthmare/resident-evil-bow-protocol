/** Real mounted selectors, exact identity display, transport and lifecycle limits. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.BOW_AVATARS_R30_PORT || 5892), base = 'http://127.0.0.1:' + port;
const qa = path.join(root, 'qa-selection-avatars-r30'); fs.mkdirSync(qa, {recursive: true});
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const checks = [], startedAt = new Date().toISOString();
const digest = value => createHash('sha256').update(value).digest('hex');
let browser;
async function test(name, action) {
  try {const evidence = await action(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
async function scene(route, options = {}, prepare = null) {
  const context = await browser.newContext({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce', ...options});
  const page = await context.newPage(), errors = [], writes = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    window.__r30AvatarStorageWrites = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {window.__r30AvatarStorageWrites.push(key); return original.call(this, key, value);};
  });
  if (prepare) await prepare(page);
  await page.goto(base + route, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.RE_SELECTION_AVATARS_R30?.status().loaded || window.RE_SELECTION_AVATARS_R30?.status().failed);
  return {context, page, errors, writes};
}
async function settled(page) {await page.waitForFunction(() => !RE_SELECTION_AVATARS_R30.status().loadingImages && !RE_SELECTION_AVATARS_R30.status().queuedImages);}
try {
  for (let attempt = 0; attempt < 80; attempt++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Main selector shows SHA-verified source avatars and retains all 115 fighters', async () => {
    const {context, page, errors} = await scene('/modules/versus.html');
    try {
      await settled(page);
      const result = await page.evaluate(() => ({status: RE_SELECTION_AVATARS_R30.status(), fighters: RE_COMBAT.fighters.length,
        state: RE_COMBAT.getState(), cards: [...document.querySelectorAll('#roster .fighter-card')].map(card => ({
          uid: card.querySelector('canvas').dataset.reSpecimen, avatar: card.querySelector('img.r30-selection-avatar')?.dataset.avatarUid,
          visible: !card.querySelector('img.r30-selection-avatar')?.hidden})), writes: __r30AvatarStorageWrites}));
      assert.equal(result.fighters, 115); assert.equal(result.state, null); assert.equal(result.status.avatars, 388);
      assert.equal(result.status.nativeMenuThumbnails, 7); assert.equal(result.status.nativeModelRenders, 7);
      assert.ok(result.cards.length >= 12); assert.ok(result.cards.every(card => card.uid === card.avatar && card.visible));
      assert.ok(result.status.cachedImages <= 32); assert.deepEqual(result.writes, []); assert.deepEqual(errors, []);
      const duplicated = await page.evaluate(() => [...document.querySelectorAll('.portrait[data-avatar-state-r30=ready]')].flatMap(host =>
        [...host.querySelectorAll('.r20-sprite-presentation,.r27-sprite-presentation')].filter(image => getComputedStyle(image).display !== 'none' && !image.hidden)));
      assert.deepEqual(duplicated, []);
      await page.screenshot({path: path.join(qa, 'main-avatars.png'), fullPage: true}); return result;
    } finally {await context.close();}
  });
  await test('Main exact-form choice updates the native avatar and preserves family selection', async () => {
    const {context, page, errors} = await scene('/modules/versus.html');
    try {
      await page.selectOption('#formPickerR28', 're3r-hunter-gamma'); await page.click('#formAssign0R28');
      await page.waitForFunction(() => document.querySelector('#p1Portrait').parentElement.querySelector('img.r30-selection-avatar')?.dataset.avatarUid === 're3r-hunter-gamma');
      const result = await page.evaluate(() => ({selected: document.querySelector('#p1Portrait').dataset.reSpecimen,
        avatar: document.querySelector('#p1Portrait').parentElement.querySelector('img.r30-selection-avatar').dataset.sourceKind,
        launch: document.querySelector('#evolutionLaunchR28').href, families: RE_EVOLUTION_SELECTION_R30?.state?.() || RE_EVOLUTION_SELECTION_R28.state(),
        record: RE_SELECTION_AVATARS_R30.get('re3r-hunter-gamma')}));
      assert.equal(result.selected, 're3r-hunter-gamma'); assert.equal(result.avatar, 'native-model-render');
      assert.equal(result.record.originalGame2DFrame, false); assert.equal(result.record.combatAnimationAssigned, false);
      assert.equal(new URL(result.launch).pathname, '/modules/fidelity-r30/evolutions/index.html');
      assert.equal(result.families.groupedOptions, 115); assert.deepEqual(errors, []); return result;
    } finally {await context.close();}
  });
  await test('Classic visual picker preserves 346 profiles and selects the exact form with keyboard focus', async () => {
    const {context, page, errors} = await scene('/catalog-duel.html');
    try {
      const before = await page.evaluate(() => ({options: document.querySelector('#trialSubject').options.length,
        groups: document.querySelectorAll('#trialSubject optgroup').length, status: RE_SELECTION_AVATARS_R30.status()}));
      assert.equal(before.options, 346); assert.ok(before.status.cachedImages <= 2);
      await page.locator('#avatarSelectionR30 summary').click(); await page.fill('#avatarSearchR30', 'Super Tyrant');
      const button = page.locator('[data-avatar-choice="re2r-super-tyrant"]'); await button.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.r30-selected-visual img')?.dataset.avatarUid === 're2r-super-tyrant');
      const result = await page.evaluate(() => ({subject: document.querySelector('#trialSubject').value,
        activeUid: document.activeElement.dataset.avatarChoice,
        pressed: document.querySelector('[data-avatar-choice="re2r-super-tyrant"]').getAttribute('aria-pressed'),
        groups: document.querySelectorAll('#trialSubject optgroup').length,
        record: RE_CATALOG_DUEL.exportReplay().schema, writes: __r30AvatarStorageWrites,
        status: RE_SELECTION_AVATARS_R30.status()}));
      assert.equal(result.subject, 're2r-super-tyrant'); assert.equal(result.activeUid, result.subject);
      assert.equal(result.pressed, 'true'); assert.equal(result.groups, before.groups);
      assert.equal(result.record, 're.bow.catalog-duel-replay/1'); assert.deepEqual(result.writes, []); assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(qa, 'classic-picker.png'), fullPage: true}); return {before, ...result};
    } finally {await context.close();}
  });
  await test('Evolution picker retains 15 families, selectable forms and disabled contextual encounters', async () => {
    const {context, page, errors} = await scene('/modules/fidelity-r30/evolutions/index.html?uid=re2r-tyrant&target=re3r-nemesis');
    try {
      await page.locator('#avatarSelectionR30 summary').click();
      const group = await page.locator('#trialSubject optgroup[data-family-id="re2r-tyrant"]').getAttribute('label');
      await page.selectOption('#avatarFamilyR30', group);
      await page.locator('[data-avatar-choice="re2r-super-tyrant"]').click();
      const result = await page.evaluate(() => ({families: document.querySelectorAll('#trialSubject optgroup[data-family-id]').length,
        options: document.querySelector('#trialSubject').options.length, disabled: [...document.querySelector('#trialSubject').options].filter(option => option.disabled).map(option => option.value),
        selection: document.querySelector('#trialSubject').value, actor: RE_EVOLUTION_DUEL_R28.getState().a.f.uid,
        grid: [...document.querySelectorAll('#avatarGridR30 button')].map(button => button.dataset.avatarChoice), writes: __r30AvatarStorageWrites}));
      assert.equal(result.families, 15); assert.equal(result.options, 348); assert.equal(result.disabled.length, 8);
      assert.equal(result.selection, 're2r-super-tyrant'); assert.equal(result.actor, result.selection);
      assert.deepEqual(result.grid, ['re2r-tyrant', 're2r-super-tyrant']); assert.deepEqual(result.writes, []); assert.deepEqual(errors, []); return result;
    } finally {await context.close();}
  });
  await test('The unverified scissor-saw composite stays hidden with an explicit missing source', async () => {
    const {context, page, errors} = await scene('/modules/versus.html');
    try {
      await page.selectOption('#formPickerR28', 're7-jack-baker-scissor'); await page.click('#formAssign0R28');
      await page.waitForFunction(() => document.querySelector('#p1Portrait').parentElement.dataset.avatarStateR30 === 'missing');
      const result = await page.evaluate(() => ({missing: RE_SELECTION_AVATARS_R30.missing().map(item => item.id),
        uid: document.querySelector('#p1Portrait').dataset.reSpecimen,
        text: document.querySelector('#p1Portrait').parentElement.querySelector('.r30-avatar-missing')?.textContent,
        oldCanvas: getComputedStyle(document.querySelector('#p1Portrait')).visibility,
        image: document.querySelector('#p1Portrait').parentElement.querySelector('img.r30-selection-avatar')?.getAttribute('src')}));
      assert.deepEqual(result.missing, ['re7-jack-baker-scissor']); assert.equal(result.oldCanvas, 'hidden');
      assert.equal(result.image, null); assert.match(result.text, /documenter/); assert.deepEqual(errors, []); return result;
    } finally {await context.close();}
  });
  await test('Corrupt source bytes never become a displayed source avatar', async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r30/selection/manifest.json')));
    const record = manifest.entries.find(item => item.id === 're1-cerberus');
    const {context, page, errors} = await scene('/modules/versus.html', {}, async page => {
      await page.route('**/' + record.image, route => route.fulfill({status: 200, contentType: 'image/png', body: Buffer.alloc(record.bytes)}));
    });
    try {
      await settled(page);
      const result = await page.evaluate(() => ({status: RE_SELECTION_AVATARS_R30.status(),
        displayed: document.querySelectorAll('img.r30-selection-avatar[data-avatar-uid="re1-cerberus"]').length,
        state: RE_COMBAT.getState()}));
      assert.equal(result.displayed, 0); assert.ok(result.status.rememberedErrors >= 1); assert.equal(result.state, null);
      assert.deepEqual(errors, []); return result;
    } finally {await context.close();}
  });
  await test('An invalid generated/external reference rejects the registry without altering the original selector', async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r30/selection/manifest.json')));
    manifest.entries[0].image = 'modules/fidelity-r27/sprites/generated/re0-bat/idle-right.png';
    const {context, page, errors} = await scene('/modules/versus.html', {}, page => page.route('**/fidelity-r30/selection/manifest.json', route => route.fulfill({json: manifest})));
    try {
      const result = await page.evaluate(() => ({status: RE_SELECTION_AVATARS_R30.status(), fighters: RE_COMBAT.fighters.length,
        avatars: document.querySelectorAll('img.r30-selection-avatar').length, state: RE_COMBAT.getState()}));
      assert.equal(result.status.failed, true); assert.equal(result.status.avatars, 0); assert.equal(result.avatars, 0);
      assert.equal(result.fighters, 115); assert.equal(result.state, null); assert.deepEqual(errors, []); return result;
    } finally {await context.close();}
  });
  await test('Visible paging and pagehide/pageshow stay bounded and resume exact portraits', async () => {
    const {context, page, errors} = await scene('/modules/versus.html');
    try {
      for (let index = 0; index < 6; index++) {await page.click('#nextPage'); await settled(page);}
      const before = await page.evaluate(() => RE_SELECTION_AVATARS_R30.status());
      const hidden = await page.evaluate(() => {dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})); return RE_SELECTION_AVATARS_R30.status();});
      assert.equal(hidden.active, false); assert.equal(hidden.cachedImages, 0);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      await page.waitForFunction(() => document.querySelector('#roster img.r30-selection-avatar')?.hidden === false); await settled(page);
      const after = await page.evaluate(() => ({status: RE_SELECTION_AVATARS_R30.status(), cards: [...document.querySelectorAll('#roster .fighter-card')].map(card => ({
        uid: card.querySelector('canvas').dataset.reSpecimen, avatar: card.querySelector('img.r30-selection-avatar')?.dataset.avatarUid})), writes: __r30AvatarStorageWrites}));
      assert.ok(before.cachedImages <= 32); assert.ok(after.status.cachedImages <= 32); assert.ok(after.status.loadingImages <= 3);
      assert.ok(after.cards.every(card => card.uid === card.avatar)); assert.deepEqual(after.writes, []); assert.deepEqual(errors, []);
      return {before, hidden, after};
    } finally {await context.close();}
  });
  await test('Suspending during image decoding releases all slots and pageshow can decode again', async () => {
    const {context, page} = await scene('/modules/versus.html', {}, page => page.addInitScript(() => {
      // Keep transport and SHA verification real; deterministically pause only
      // the browser image decoder at the exact cancellation boundary.
      window.__pendingAvatarDecodesR30 = 0;
      window.Image = class {
        onload = null; onerror = null; naturalWidth = 0; naturalHeight = 0;
        set src(value) {this._src = value; if (value.startsWith('blob:')) __pendingAvatarDecodesR30++;}
        get src() {return this._src;}
      };
    }));
    try {
      await page.waitForFunction(() => RE_SELECTION_AVATARS_R30.status().loadingImages === 3 && __pendingAvatarDecodesR30 >= 3);
      const before = await page.evaluate(() => RE_SELECTION_AVATARS_R30.status());
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
      await page.waitForFunction(() => RE_SELECTION_AVATARS_R30.status().loadingImages === 0);
      const hidden = await page.evaluate(() => ({status: RE_SELECTION_AVATARS_R30.status(), decodes: __pendingAvatarDecodesR30}));
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      await page.waitForFunction(previous => __pendingAvatarDecodesR30 >= previous + 3, hidden.decodes);
      const after = await page.evaluate(() => ({status: RE_SELECTION_AVATARS_R30.status(), decodes: __pendingAvatarDecodesR30}));
      assert.equal(before.loadingImages, 3); assert.equal(hidden.status.cachedImages, 0); assert.equal(hidden.status.loadingImages, 0);
      assert.equal(after.status.loadingImages, 3); assert.ok(after.decodes > hidden.decodes);
      return {scope: 'Controlled pending decoder, real fetch/SHA path; no historical pre-fix run is claimed.', before, hidden, after};
    } finally {await context.close();}
  });
  await test('320pixel and 200percent text classic picker keeps native portraits, controls and focus visible', async () => {
    const {context, page, errors} = await scene('/catalog-duel.html', {viewport: {width: 320, height: 900}});
    try {
      await page.addStyleTag({content: '.r30-avatar-picker,.r30-avatar-picker input,.r30-avatar-picker select,.r30-avatar-choice,.r30-avatar-pager,.r30-selected-avatars{font-size:26px!important}.r30-avatar-toolbar label{font-size:22px!important}.r30-avatar-choice small,.r30-selected-avatar small{font-size:20px!important}'});
      await page.locator('#avatarSelectionR30 summary').click();
      await page.fill('#avatarSearchR30', 'Hunter Gamma');
      const button = page.locator('[data-avatar-choice="re3r-hunter-gamma"]'); await button.focus(); await page.keyboard.press('Enter');
      await page.locator('.r30-selected-avatars').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.r30-selected-visual img')?.dataset.avatarUid === 're3r-hunter-gamma');
      const result = await page.evaluate(() => ({width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
        pickerOverflow: document.querySelector('#avatarSelectionR30').scrollWidth > document.querySelector('#avatarSelectionR30').clientWidth,
        focused: document.activeElement.dataset.avatarChoice, source: RE_SELECTION_AVATARS_R30.get('re3r-hunter-gamma').sourceKind,
        imageSize: [...document.querySelectorAll('.r30-selected-visual img')].map(image => ({width: image.naturalWidth, height: image.naturalHeight}))}));
      assert.equal(result.overflow, false, JSON.stringify(result)); assert.equal(result.pickerOverflow, false, JSON.stringify(result)); assert.equal(result.focused, 're3r-hunter-gamma');
      assert.equal(result.source, 'native-model-render'); assert.equal(result.imageSize[0].width, 512); assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(qa, 'mobile-native-avatar.png'), fullPage: true}); return result;
    } finally {await context.close();}
  });
} finally {
  await browser?.close(); server.kill('SIGTERM');
  const inputPaths = ['modules/fidelity-r30/selection/avatars.js', 'modules/fidelity-r30/selection/avatars.css',
    'modules/fidelity-r30/selection/manifest.json', 'modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r30/evolutions/index.html',
    'tests/browser-selection-avatars-r30.mjs'];
  const report = {schema: 're.bow.selection-avatars-browser-r30/1', startedAt, finishedAt: new Date().toISOString(),
    browser: '/usr/bin/chromium', scope: 'Actual HTTP game mounts; source avatars do not certify original game 2D combat frames or idles.',
    inputs: inputPaths.map(file => ({path: file, sha256: digest(fs.readFileSync(path.join(root, file)))})),
    passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks};
  fs.writeFileSync(path.join(root, 'docs/R30_AVATARS_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.failed) process.exitCode = 1;
}
