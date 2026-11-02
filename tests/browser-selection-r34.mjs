/** Default player flow on actual documents. Standard pads are explicit fixtures; images are real. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routes = ['/modules/versus.html', '/catalog-duel.html', '/modules/fidelity-r34/evolutions/index.html'];
const served = new Map(), sourceVersionsChanged = new Set(), checks = [], pageErrors = [], unavailable = new Set(), out = path.join(root, 'qa-selection-r34');
fs.mkdirSync(out, {recursive: true});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
served.set('tests/browser-selection-r34.mjs', fs.readFileSync(fileURLToPath(import.meta.url)));
for (const route of routes) {
  const source = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
  assert(source.includes('fidelity-r34/selection/flow.js'), 'The actual R34 flow must be mounted: ' + route);
  assert(source.indexOf('fidelity-r34/selection/prepare.js') > 0 && source.indexOf('fidelity-r34/selection/prepare.js') < source.indexOf('</head>'), 'The setup input owner must precede the controllers: ' + route);
}
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.wav': 'audio/wav'};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (pathname === '/favicon.ico') {response.statusCode = 204; return response.end();}
  if (pathname === '/r34-selection-away.html') {response.setHeader('Content-Type', 'text/html'); return response.end('<!doctype html><meta charset="utf-8"><title>Selection navigation fixture</title><p>Local BFCache navigation target.</p>');}
  if (pathname === '/r34-without-prepare.html') {
    const source = fs.readFileSync(path.join(root, 'catalog-duel.html'), 'utf8');
    const altered = source.replace(/<script src="[^"]*fidelity-r34\/selection\/prepare\.js"><\/script>/, ''); assert.notEqual(altered, source);
    response.setHeader('Content-Type', 'text/html'); return response.end(altered);
  }
  const relative = pathname.replace(/^\/+/, ''), file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {unavailable.add(relative); response.statusCode = 404; return response.end('Missing checkout resource');}
  const bytes = fs.readFileSync(file);
  if (['.html', '.js', '.css'].includes(path.extname(file))) {
    if (served.has(relative) && hash(served.get(relative)) !== hash(bytes)) sourceVersionsChanged.add(relative);
    else if (!served.has(relative)) served.set(relative, bytes);
  }
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); response.end(bytes);
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function open(route, options = {}) {
  const context = await browser.newContext({viewport: {width: 1280, height: 950}, reducedMotion: 'reduce', ...options});
  await context.addInitScript(() => {
    const pad = {id: 'R34_STANDARD_PAD_FIXTURE', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}))};
    window.__r34RawPad = pad; window.__r34NativeGetPads = () => [pad]; window.__r34Keys = []; window.__r34Life = []; window.__r34DocumentId = Math.random().toString(36);
    Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: window.__r34NativeGetPads});
    addEventListener('keydown', event => {if (__r34Keys.length < 150) __r34Keys.push({code: event.code, repeat: event.repeat, trusted: event.isTrusted});}, {capture: true});
    for (const type of ['blur', 'focus', 'visibilitychange', 'pagehide', 'pageshow']) addEventListener(type, event => {
      __r34Life.push({type: event.type, persisted: event.persisted, trusted: event.isTrusted, hidden: document.hidden, focused: document.hasFocus()});
      if (type === 'pagehide' && window.__r34PressStartAtHide) {pad.buttons[9].pressed = true; pad.buttons[9].value = 1;}
    });
  });
  const page = await context.newPage(); page.on('pageerror', error => pageErrors.push({route, message: error.message}));
  const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', {enabled: false});
  await page.goto(origin + route); await page.bringToFront();
  if (!route.includes('selection=direct')) await page.waitForFunction(() => !!globalThis.RE_MATCH_SELECTION_R34);
  return {context, page};
}
const observe = page => page.evaluate(() => {
  const main = !!document.getElementById('selectScreen'), api = main ? RE_COMBAT : RE_CATALOG_DUEL;
  return {flow: globalThis.RE_MATCH_SELECTION_R34?.state() || null, frame: api.getState()?.frame ?? null,
    phase: api.getState()?.phase ?? null, paused: main ? api.diagnostics().paused : api.isPaused(), running: main ? api.diagnostics().running : !api.isPaused(),
    intro: main ? null : api.getIntro(), stage: main ? api.getState()?.stage?.id || null : api.exportReplay().setup.stage,
    storage: JSON.stringify(Object.fromEntries(Object.entries(localStorage))), padVisibleToCombat: navigator.getGamepads().length,
    focused: document.activeElement?.id || document.activeElement?.dataset?.r34Stage || document.activeElement?.tagName};
});
async function continueCharacters(page) {await page.locator(await page.locator('#launch').count() ? '#launch' : '#charactersConfirmR34').click(); await page.waitForFunction(() => RE_MATCH_SELECTION_R34.state().phase === 'stages');}
async function rawButton(page, index, down) {await page.evaluate(({index, down}) => {const button = __r34RawPad.buttons[index]; button.pressed = down; button.value = Number(down);}, {index, down}); await page.waitForTimeout(100);}
async function choosePair(page) {
  if (await page.locator('#trialSubject').count()) {await page.selectOption('#trialSubject', 're1r-zombie'); await page.selectOption('#trialTarget', 're3r-nemesis'); await page.selectOption('#trialMode', 'human');}
  else {
    const ids = await page.evaluate(() => RE_COMBAT.fighters.slice(2, 4).map(item => item.uid));
    for (const [slot, uid] of ids.entries()) {await page.selectOption('#formPickerR28', uid); await page.locator('#formAssign' + slot + 'R28').click();}
  }
}
function sourceRefs() {
  const names = ['tests/browser-selection-r34.mjs', 'modules/fidelity-r34/selection/prepare.js', 'modules/fidelity-r34/selection/flow.js', 'modules/fidelity-r34/selection/flow.css', ...routes.map(route => route.slice(1)), 'src/unified-engine-v060.js', 'src/catalog-duel-v070.js', 'modules/fidelity-r28/evolutions/duel.js'];
  return [...new Set([...names, ...served.keys()])].sort().map(name => ({path: name, sha256: hash(served.get(name) || fs.readFileSync(path.join(root, name)))}));
}
try {
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', ignoreDefaultArgs: ['--disable-back-forward-cache'], args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Head preparation blocks the reproduced late-script start race while the complete flow is still downloading', async () => {
    const result = [];
    for (const withoutPreparation of [true, false]) {
      const context = await browser.newContext(), page = await context.newPage(); let release;
      await context.addInitScript(() => {
        window.__r34DelayPad = {id: 'R34_DELAY_PAD_FIXTURE', index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({length: 17}, () => ({pressed: false, value: 0}))};
        Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => [__r34DelayPad]});
      });
      await page.route('**/selection/flow.js', async route => {await new Promise(resolve => {release = resolve;}); await route.continue();});
      const navigation = page.goto(origin + (withoutPreparation ? '/r34-without-prepare.html' : routes[1]));
      try {
        await page.waitForFunction(() => !!globalThis.RE_CATALOG_DUEL); await page.waitForTimeout(100);
        await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('KeyP');
        // Observe the P defect before pressing Start; otherwise Start can cancel it in the same frame.
        if (withoutPreparation) await page.waitForFunction(() => !RE_CATALOG_DUEL.isPaused() && RE_CATALOG_DUEL.getState().frame > 0);
        else await page.waitForTimeout(150);
        const keyboard = await page.evaluate(() => ({frame: RE_CATALOG_DUEL.getState().frame, paused: RE_CATALOG_DUEL.isPaused()}));
        await page.evaluate(() => {__r34DelayPad.buttons[9].pressed = true; __r34DelayPad.buttons[9].value = 1;}); await page.waitForTimeout(200);
        const pending = await page.evaluate(() => ({frame: RE_CATALOG_DUEL.getState().frame, paused: RE_CATALOG_DUEL.isPaused(),
          ready: !!globalThis.RE_MATCH_SELECTION_R34, stageVisible: !!document.getElementById('trialStage').getClientRects().length,
          preparation: globalThis.RE_SELECTION_PREPARE_R34?.state() || null, padVisibleToCombat: navigator.getGamepads().length}));
        if (withoutPreparation) {assert(keyboard.frame > 0 && !keyboard.paused, 'The omitted-bootstrap fixture must reproduce the actual start race'); assert(pending.stageVisible);}
        else {assert.equal(pending.frame, 0); assert.equal(pending.paused, true); assert.equal(pending.stageVisible, false); assert.equal(pending.padVisibleToCombat, 0); assert.equal(pending.preparation.pending, true);}
        assert.equal(pending.ready, false); release(); await navigation; await page.waitForFunction(() => !!globalThis.RE_MATCH_SELECTION_R34);
        if (!withoutPreparation) {await page.waitForTimeout(150); assert.equal((await observe(page)).flow.phase, 'characters'); assert.equal((await observe(page)).frame, 0);}
        result.push({omittedBootstrapIsExplicitNegativeFixture: withoutPreparation, keyboardAfterP: keyboard, pending});
      } finally {release?.(); await navigation.catch(() => {}); await context.close();}
    }
    return {cases: result, expectedDefectIsNotCurrentFailure: true, delayedFlowScript: true};
  });
  await test('All three actual documents initially expose characters only, with no running combat or stage selector', async () => {
    const result = [];
    for (const route of routes) {const {context, page} = await open(route); try {
      const before = await observe(page); await page.waitForTimeout(250); const after = await observe(page);
      assert.equal(after.flow.phase, 'characters'); assert.equal(after.flow.starts, 0); assert.equal(after.frame, before.frame); assert.equal(after.running, false);
      assert.equal(after.padVisibleToCombat, 0); assert.equal(await page.locator('#stageSelectionR34').isVisible(), false);
      if (await page.locator('#trialStage').count()) {assert.equal(await page.locator('#trialStage').isVisible(), false); assert.equal(await page.locator('#trialCanvas').isVisible(), false); assert.equal(after.frame, 0);}
      else {assert.equal(after.frame, null); assert.equal(await page.locator('#nextStage').isVisible(), false); assert.equal(await page.locator('#openGallery').isVisible(), false);}
      result.push({route, before, after});
    } finally {await context.close();}}
    return {documents: result, stageControlsBeforeValidation: 0};
  });
  await test('Validation opens a distinct52-arena step; Back preserves both characters, forms and chosen stage', async () => {
    const result = [];
    for (const route of routes) {const {context, page} = await open(route); try {
      await choosePair(page); const before = await observe(page); await continueCharacters(page);
      assert.equal(await page.locator('#stageGridR34 [role=radio]').count(), 52);
      assert.equal(await page.locator('#stageSelectionR34').isVisible(), true);
      if (await page.locator('#trialSubject').count()) assert.equal(await page.locator('#trialSubject').isVisible(), false);
      else assert.equal(await page.locator('#roster').isVisible(), false);
      await page.locator('[data-r34-stage="rpd_hall"]').click(); const selected = await observe(page); assert.equal(selected.flow.selectedStage, 'rpd_hall');
      assert.equal(selected.frame, before.frame); assert.equal(selected.storage, before.storage);
      await page.locator('#stageBackR34').click(); const back = await observe(page);
      assert.equal(back.flow.phase, 'characters'); assert.deepEqual(back.flow.selectedCharacters, before.flow.selectedCharacters); assert.equal(back.flow.selectedStage, 'rpd_hall');
      assert.equal(back.frame, before.frame); assert.equal(back.storage, before.storage); await continueCharacters(page);
      assert.equal(await page.locator('[data-r34-stage="rpd_hall"]').getAttribute('aria-checked'), 'true'); result.push({route, pair: before.flow.selectedCharacters, chosenStage: back.flow.selectedStage});
    } finally {await context.close();}}
    return {documents: result, implicitStarts: 0};
  });
  await test('Search and episode filters operate on real arena cards and renderer previews without touching the match', async () => {
    const {context, page} = await open(routes[1]); try {
      await continueCharacters(page); const before = await observe(page);
      await page.fill('#stageSearchR34', 'spencer'); assert.equal(await page.locator('[data-r34-stage]:visible').count(), 1);
      await page.fill('#stageSearchR34', 'rpd'); await page.locator('#stageEpisodeR34').focus(); await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.r34Stage), 'rpd_hall');
      await page.fill('#stageSearchR34', 'no-such-stage-r34'); assert.equal(await page.locator('[data-r34-stage]:visible').count(), 0); assert.match(await page.locator('#stageResultsR34').innerText(), /Aucune arène/);
      await page.fill('#stageSearchR34', ''); await page.selectOption('#stageEpisodeR34', 'RE1'); assert((await page.locator('[data-r34-stage]:visible').count()) > 0);
      await page.selectOption('#stageEpisodeR34', ''); assert.equal(await page.locator('[data-r34-stage]:visible').count(), 52);
      const pixels = await page.locator('[data-r34-stage="spencer_hall"] canvas').evaluate(canvas => {const raw = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; let alpha = 0, sum = 0; for (let i = 0; i < raw.length; i += 4) {alpha += raw[i + 3] > 0; sum += raw[i] + raw[i + 1] + raw[i + 2];} return {width: canvas.width, height: canvas.height, alpha, sum};});
      assert(pixels.alpha > 1000 && pixels.sum > 0); const after = await observe(page); assert.equal(after.frame, before.frame); assert.equal(after.storage, before.storage);
      await page.screenshot({path: path.join(out, 'actual-arena-step-desktop.png'), fullPage: true}); return {cards: 52, preview: pixels, matchFrameUnchanged: true, storageWrites: 0};
    } finally {await context.close();}
  });
  await test('Arena confirmation alone starts each original controller once with the selected pair and arena', async () => {
    const result = [];
    for (const route of routes) {const {context, page} = await open(route); try {
      await choosePair(page); const pair = (await observe(page)).flow.selectedCharacters; await continueCharacters(page); await page.locator('[data-r34-stage="rpd_hall"]').click();
      await page.locator('#stageConfirmR34').click(); const after = await observe(page); assert.equal(after.flow.phase, 'combat'); assert.equal(after.flow.starts, 1); assert.equal(after.stage, 'rpd_hall');
      const identity = await page.evaluate(() => {const api = globalThis.RE_CATALOG_DUEL || RE_COMBAT; window.__r34StartedState = api.getState(); return [api.getState().a.f.uid, api.getState().b.f.uid];}); assert.deepEqual(identity, pair);
      await page.locator('#stageConfirmR34').evaluate(node => {node.click(); node.click();});
      assert.equal(await page.evaluate(() => __r34StartedState === (globalThis.RE_CATALOG_DUEL || RE_COMBAT).getState()), true); assert.equal((await observe(page)).flow.starts, 1);
      if (await page.locator('#trialSubject').count()) {assert(after.intro.active); assert.equal(await page.locator('#trialSubject').isVisible(), false);}
      else {assert.equal(after.running, true); assert.equal(await page.locator('#selectScreen').isVisible(), false);}
      result.push({route, pair, stage: after.stage, successfulStarts: 1});
    } finally {await context.close();}}
    return {documents: result, duplicateStartEvents: 0};
  });
  await test('A held native Enter advances one screen and cannot confirm the new screen by key repeat', async () => {
    const result = [];
    for (const route of routes) {const {context, page} = await open(route); try {
      const next = page.locator(route === routes[0] ? '#launch' : '#charactersConfirmR34'); await next.focus(); await page.keyboard.down('Enter');
      await page.waitForFunction(() => RE_MATCH_SELECTION_R34.state().phase === 'stages'); await page.keyboard.down('Enter'); await page.keyboard.down('Enter');
      assert.equal((await observe(page)).flow.phase, 'stages'); assert.equal((await observe(page)).flow.starts, 0); await page.keyboard.up('Enter');
      await page.locator('#stageConfirmR34').focus(); await page.keyboard.down('Enter'); await page.waitForFunction(() => RE_MATCH_SELECTION_R34.state().phase === 'combat'); await page.keyboard.down('Enter'); await page.keyboard.up('Enter');
      assert.equal((await observe(page)).flow.starts, 1); const trusted = await page.evaluate(() => __r34Keys.some(event => event.code === 'Enter' && event.repeat && event.trusted)); assert(trusted); result.push({route, trustedRepeat: true, oneScreenPerFreshActivation: true});
    } finally {await context.close();}}
    return {documents: result};
  });
  await test('Escape returns from the arena step, and native arrow navigation chooses only a produced arena', async () => {
    const {context, page} = await open(routes[2]); try {
      await continueCharacters(page); await page.locator('[data-r34-stage="spencer_hall"]').focus(); await page.keyboard.press('ArrowRight');
      assert.equal((await observe(page)).flow.selectedStage, 'spencer_lab'); assert.equal(await page.locator('[data-r34-stage="spencer_lab"]').getAttribute('aria-checked'), 'true');
      await page.keyboard.down('Escape'); await page.keyboard.down('Escape'); await page.keyboard.up('Escape'); const after = await observe(page);
      assert.equal(after.flow.phase, 'characters'); assert.equal(after.flow.starts, 0); assert.equal(after.paused, true); assert.equal(after.focused, 'trialSubject');
      return {selectedByTrustedArrow: 'spencer_lab', returnedTo: after.focused, combatStarted: false};
    } finally {await context.close();}
  });
  await test('Held Start cannot chain characters and arena or reach the old combat gamepad reader', async () => {
    const result = [];
    for (const route of routes) {const {context, page} = await open(route); try {
      await page.waitForFunction(() => RE_MATCH_SELECTION_R34.state().menuPolls >= 2); await rawButton(page, 9, true);
      assert.equal((await observe(page)).flow.phase, 'stages'); assert.equal((await observe(page)).flow.starts, 0); assert.equal((await observe(page)).padVisibleToCombat, 0);
      await page.waitForTimeout(250); assert.equal((await observe(page)).flow.phase, 'stages'); await rawButton(page, 9, false);
      await rawButton(page, 9, true); const held = await observe(page); assert.equal(held.flow.phase, 'combat'); assert.equal(held.flow.starts, 1); assert.equal(held.padVisibleToCombat, 0); assert.equal(held.flow.waitingForNeutral, true);
      await rawButton(page, 9, false); await page.waitForFunction(() => !RE_MATCH_SELECTION_R34.state().waitingForNeutral);
      assert.equal((await observe(page)).padVisibleToCombat, 1); result.push({route, actualBrowserPadMask: true, menuStartHeldDidNotChain: true, combatSawStartBeforeRelease: false});
    } finally {await context.close();}}
    return {documents: result, physicalPadCertified: false};
  });
  await test('A used to confirm the arena is withheld until neutral and cannot become a combat command', async () => {
    const result = [];
    for (const route of routes) {const {context, page} = await open(route); try {
      if (await page.locator('#trialMode').count()) await page.selectOption('#trialMode', 'human'); else await page.selectOption('#mode', 'local');
      await continueCharacters(page); await page.locator('#stageConfirmR34').focus(); await page.waitForTimeout(100); await rawButton(page, 0, true);
      const held = await observe(page); assert.equal(held.flow.phase, 'combat'); assert.equal(held.padVisibleToCombat, 0);
      if (await page.locator('#trialSubject').count()) {
        await page.evaluate(() => RE_CATALOG_DUEL.skipIntro()); await page.waitForTimeout(100); const state = await page.evaluate(() => ({input: RE_CATALOG_DUEL.exportReplay().runs, starts: RE_CATALOG_DUEL.getState().a.stats.starts}));
        assert(state.input.every(row => row[1] === 0 && row[2] === -1)); assert.equal(state.starts, 0);
      } else {await page.waitForTimeout(250); assert.equal(await page.evaluate(() => RE_COMBAT.getState().a.stats.starts), 0);}
      await rawButton(page, 0, false); await page.waitForFunction(() => !RE_MATCH_SELECTION_R34.state().waitingForNeutral);
      result.push({route, attacksCausedByMenuConfirm: 0, passedThroughOnlyAfterNeutral: true});
    } finally {await context.close();}}
    return {documents: result, standardGamepadFixture: true};
  });
  await test('Gamepad B returns to characters and the chosen arena remains available for the next visit', async () => {
    const {context, page} = await open(routes[1]); try {
      await continueCharacters(page); await page.locator('[data-r34-stage="nest"]').click(); await page.waitForTimeout(100); await rawButton(page, 1, true);
      assert.equal((await observe(page)).flow.phase, 'characters'); await rawButton(page, 1, false); await continueCharacters(page);
      assert.equal((await observe(page)).flow.selectedStage, 'nest'); assert.equal((await observe(page)).flow.starts, 0);
      return {backAction: 'B', retainedArena: 'nest', implicitMatchStarts: 0};
    } finally {await context.close();}
  });
  await test('Returning from real tab visibility does not consume a Start press made while the menu was hidden', async () => {
    const {context, page} = await open(routes[1]); try {
      const other = await context.newPage(); await other.goto(origin + '/r34-selection-away.html'); await other.bringToFront();
      for (const target of [page, other]) {const cdp = await context.newCDPSession(target); await cdp.send('Emulation.setFocusEmulationEnabled', {enabled: false});}
      await page.bringToFront(); await page.waitForFunction(() => document.hasFocus()); await other.bringToFront();
      await page.waitForFunction(() => document.hidden || !document.hasFocus()); await rawButton(page, 9, true); await page.bringToFront(); await page.waitForTimeout(250);
      assert.equal((await observe(page)).flow.phase, 'characters'); assert.equal((await observe(page)).flow.starts, 0);
      await rawButton(page, 9, false); await rawButton(page, 9, true); assert.equal((await observe(page)).flow.phase, 'stages'); await other.close();
      return {realBrowserTabTransition: true, heldStartIgnoredAfterReturn: true, newEdgeRequired: true};
    } finally {await context.close();}
  });
  await test('Actual BFCache restores the arena screen, pair and reversible gamepad mask without starting a match', async () => {
    const result = [];
    for (const route of [routes[0], routes[2]]) {const {context, page} = await open(route); try {
      await choosePair(page); await continueCharacters(page); await page.locator('[data-r34-stage="rpd_hall"]').click();
      const before = await page.evaluate(() => ({id: __r34DocumentId, state: RE_MATCH_SELECTION_R34.state()}));
      await Promise.all([page.waitForURL(origin + '/r34-selection-away.html'), page.evaluate(url => {window.__r34PressStartAtHide = true; location.href = url;}, origin + '/r34-selection-away.html')]);
      await page.goBack({waitUntil: 'commit'}); await page.waitForFunction(() => __r34Life.some(event => event.type === 'pageshow' && event.persisted && event.trusted));
      const after = await page.evaluate(() => ({id: __r34DocumentId, state: RE_MATCH_SELECTION_R34.state(), life: __r34Life}));
      assert.equal(after.id, before.id); assert.equal(after.state.phase, 'stages'); assert.equal(after.state.selectedStage, 'rpd_hall'); assert.deepEqual(after.state.confirmedPair, before.state.confirmedPair); assert(after.state.padMaskInstalled); assert.equal(after.state.starts, 0);
      await page.waitForTimeout(250); assert.equal((await observe(page)).flow.phase, 'stages'); result.push({route, sameDocument: true, trustedPersistedPageShow: true, stage: after.state.selectedStage});
    } finally {await context.close();}}
    return {documents: result, rawPadPressIsFixture: true};
  });
  await test('At320px and genuinely doubled text, all arena controls remain reachable with no horizontal clipping', async () => {
    const result = [];
    for (const route of routes) {const {context, page} = await open(route, {viewport: {width: 320, height: 1000}}); try {
      await continueCharacters(page); await page.evaluate(() => {document.documentElement.style.fontSize = '200%';}); await page.fill('#stageSearchR34', 'spencer');
      const size = await page.evaluate(() => {const area = document.getElementById('stageSelectionR34'), grid = document.getElementById('stageGridR34'), controls = ['stageSearchR34', 'stageEpisodeR34', 'stageBackR34', 'stageConfirmR34'].map(id => {const node = document.getElementById(id), box = node.getBoundingClientRect();let textLines = null;if (node.tagName === 'BUTTON') {const range = document.createRange();range.selectNodeContents(node);textLines = range.getClientRects().length;}return {id, width: box.width, fontSize: parseFloat(getComputedStyle(node).fontSize), textLines};});return {inner: innerWidth, documentScroll: document.documentElement.scrollWidth, pageWidth: area.getBoundingClientRect().width, pageScroll: area.scrollWidth, pageClient: area.clientWidth, gridWidth: grid.getBoundingClientRect().width, controls};});
      assert(size.pageWidth <= 320 + 1); assert(size.pageScroll <= size.pageClient + 1); for (const control of size.controls) {assert(control.width <= 320); assert(control.fontSize >= 25); if (control.textLines !== null) assert.equal(control.textLines, 1, 'The doubled action label must remain a whole word: ' + control.id);}
      await page.locator('#stageBackR34').focus(); await page.keyboard.press('Enter'); assert.equal((await observe(page)).flow.phase, 'characters');
      await continueCharacters(page); await page.locator('#stageSearchR34').scrollIntoViewIfNeeded(); await page.screenshot({path: path.join(out, 'arena-320-text200-' + (route === routes[0] ? 'main' : route === routes[1] ? 'classic' : 'evolution') + '.png'), fullPage: true});
      result.push({route, size, trustedKeyboardBack: true});
    } finally {await context.close();}}
    return {documents: result, actualRootTextSize: '200%'};
  });
  await test('The actual arena selection passes scoped axe4.14 checks on desktop and narrow screens', async () => {
    const axePath = process.env.AXE_CORE_PATH || '/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js', result = [];
    for (const width of [1280, 320]) {const {context, page} = await open(routes[2], {viewport: {width, height: 1000}}); try {
      await continueCharacters(page); await page.locator('#stageConfirmR34').hover(); await page.addScriptTag({path: axePath}); const audit = await page.evaluate(async () => {const result = await axe.run({include: [['#stageSelectionR34']]}, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']}}); return {version: axe.version, violations: result.violations.map(row => ({id: row.id, impact: row.impact, nodes: row.nodes.map(node => node.target)})), passes: result.passes.length};});
      assert.equal(audit.version, '4.14.0'); assert.deepEqual(audit.violations, []); result.push({width, audit});
    } finally {await context.close();}}
    return {audits: result, realScreenReaderCertified: false};
  });
  await test('Only explicit DEV direct mode bypasses the new screen flow and restores the original pad transport', async () => {
    const result = [];
    for (const suffix of ['?dev=1', '?selection=direct', '?embed=unknown', '?dev=1&selection=direct']) {const {context, page} = await open(routes[1] + suffix); try {
      const value = await page.evaluate(() => ({flow: !!globalThis.RE_MATCH_SELECTION_R34, stageVisible: !!document.getElementById('trialStage').getClientRects().length, originalPad: navigator.getGamepads === __r34NativeGetPads}));
      const direct = suffix === '?dev=1&selection=direct'; assert.equal(value.flow, !direct); assert.equal(value.stageVisible, direct); assert.equal(value.originalPad, direct); result.push({suffix, ...value});
    } finally {await context.close();}}
    return {modes: result, directModeIsLegacyFixtureNotDefaultFlowProof: true};
  });
  await test('Returning from combat reopens characters and keeps appearance choices without an automatic rematch', async () => {
    const result = [];
    for (const route of routes) {const {context, page} = await open(route); try {
      await choosePair(page); await continueCharacters(page); await page.locator('#stageConfirmR34').click(); const before = await observe(page);
      await page.locator(route === routes[0] ? '#leaveFight' : '#combatSelectionR34').click(); const after = await observe(page);
      assert.equal(after.flow.phase, 'characters'); assert.deepEqual(after.flow.selectedCharacters, before.flow.selectedCharacters); assert.equal(after.flow.starts, 1); assert.equal(after.running, false); await page.waitForTimeout(150); assert.equal((await observe(page)).flow.starts, 1); result.push({route, selectedPair: after.flow.selectedCharacters, starts: after.flow.starts});
    } finally {await context.close();}}
    return {documents: result, automaticRematches: 0};
  });
} finally {
  const version = browser?.version(); await browser?.close(); await new Promise(resolve => server.close(resolve));
  const changed = [...new Set([...sourceVersionsChanged, ...[...served].filter(([name, bytes]) => !fs.existsSync(path.join(root, name)) || hash(fs.readFileSync(path.join(root, name))) !== hash(bytes)).map(([name]) => name)])];
  const report = {schema: 're.bow.selection-browser-r34/1', passed: checks.filter(item => item.pass).length,
    failed: checks.filter(item => !item.pass).length + pageErrors.length + changed.length,
    checks, pageErrors, staleExecutedSources: changed, unavailableResources: [...unavailable].sort(), browserVersion: version,
    sourceFiles: sourceRefs(), environment: {node: process.version, executable: process.env.CHROME_BIN || '/usr/bin/chromium'},
    scope: 'Default actual player documents and original controllers, trusted keyboard/pointer, real renderer images, separate character/arena/combat phases and actual BFCache. Standard gamepad data and one away document are explicit fixtures. DEV direct mode is checked separately; it is not evidence for the new default flow. No physical gamepad, screen-reader or artistic fidelity certification.'};
  const selected = process.argv.find(value => value.startsWith('--report='))?.slice(9) || 'docs/R34_SELECTION_BROWSER.json';
  assert(selected === 'docs/R34_SELECTION_BROWSER.json' || /^qa-selection-r34\/[A-Za-z0-9_./-]+\.json$/.test(selected), 'Only this report or owned diagnostic JSON may be written');
  assert(!selected.split('/').includes('..'));
  const output = path.join(root, selected); fs.mkdirSync(path.dirname(output), {recursive: true}); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed, report: selected})); if (report.failed) process.exitCode = 1;
}
