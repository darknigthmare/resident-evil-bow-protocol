/** Real menu DOM and controllers with nonfunctional image fixtures; keyboard lifecycle regressions only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFiles = ['index.html', 'styles/game-menu-r20.css', 'src/interface-preferences-r20.js',
  'src/menu-navigation-r20.js', 'src/bow-sprite-library-r20.js', 'src/game-menu-r20.js'];
const sources = new Map(sourceFiles.map(file => ['/' + file, fs.readFileSync(path.join(root, file))]));
const imageFixture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z6EAAAAASUVORK5CYII=', 'base64');
const checks = [], errors = [];
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (sources.has(pathname)) {
    response.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript' : pathname.endsWith('.css') ? 'text/css' : 'text/html');
    return response.end(sources.get(pathname));
  }
  if (pathname.startsWith('/assets/')) {response.setHeader('Content-Type', 'image/png'); return response.end(imageFixture);}
  if (pathname === '/favicon.ico') {response.statusCode = 204; return response.end();}
  response.statusCode = 404; response.end('No gameplay page is mounted in this menu-input test.');
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage']});

async function observed(page) {
  return page.evaluate(() => ({view: window.RE_GAME_MENU_R20?.view ?? null,
    bootHidden: document.getElementById('bootScreen')?.hidden ?? null,
    focusedId: document.activeElement?.id, focusedTag: document.activeElement?.tagName,
    pathname: location.pathname, events: window.__menuKeysR32}));
}
async function view(page, expected) {
  assert.equal(await page.evaluate(() => RE_GAME_MENU_R20.view), expected, JSON.stringify(await observed(page)));
}
async function trustedRepeat(page, key) {
  assert(await page.evaluate(value => __menuKeysR32.some(event => event.key === value && event.repeat && event.trusted), key));
}
async function test(name, suffix, run) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  await context.addInitScript(() => {
    window.__menuKeysR32 = [];
    addEventListener('keydown', event => {
      if (__menuKeysR32.length < 100) __menuKeysR32.push({key: event.key, repeat: event.repeat, trusted: event.isTrusted});
    }, {capture: true});
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push({test: name, message: error.message}));
  try {
    await page.goto(origin + '/index.html' + suffix);
    await page.waitForFunction(() => !!window.RE_GAME_MENU_R20);
    checks.push({name, pass: true, detail: await run(page)}); console.log('PASS ' + name);
  } catch (error) {
    let state = null; try {state = await observed(page);} catch {}
    checks.push({name, pass: false, error: error.stack, observed: state}); console.error('FAIL ' + name + ': ' + error.message);
  } finally {await context.close();}
}

try {
  await test('Held Enter leaves the boot screen once and requires a fresh press to open modes', '', async page => {
    assert.equal((await observed(page)).bootHidden, false);
    await page.keyboard.down('Enter'); await view(page, 'home'); assert.equal((await observed(page)).bootHidden, true);
    await page.keyboard.down('Enter'); await trustedRepeat(page, 'Enter'); await view(page, 'home');
    await page.keyboard.up('Enter'); await page.keyboard.press('Enter'); await view(page, 'modes');
    return {trustedRepeat: true, oneViewPerPress: true, newPressOpensModes: true};
  });

  await test('Held Escape returns one level from controls and requires release before leaving options', '#controls', async page => {
    await view(page, 'controls'); await page.keyboard.down('Escape'); await view(page, 'options');
    await page.keyboard.down('Escape'); await trustedRepeat(page, 'Escape'); await view(page, 'options');
    await page.keyboard.up('Escape'); await page.keyboard.press('Escape'); await view(page, 'home');
    return {trustedRepeat: true, controlsToOptionsOnly: true, freshPressReturnsHome: true};
  });

  await test('Held Space from the boot screen cannot arm the newly focused Play button', '', async page => {
    await page.keyboard.down('Space'); await view(page, 'home');
    await page.keyboard.down('Space'); await trustedRepeat(page, ' '); await view(page, 'home');
    await page.keyboard.up('Space'); await view(page, 'home');
    await page.keyboard.press('Space'); await view(page, 'modes');
    return {trustedRepeat: true, bootReleaseDoesNotActivatePlay: true, freshSpacePressWorks: true};
  });

  await test('Native button activation by a fresh Enter or Space still fires exactly once', '#home', async page => {
    await page.evaluate(() => {
      window.__playClicksR32 = [];
      document.querySelector('#homeView [data-open="modes"]').addEventListener('click', event => __playClicksR32.push(event.isTrusted));
    });
    await page.focus('#homeView [data-open="modes"]'); await page.keyboard.press('Enter'); await view(page, 'modes');
    await page.keyboard.press('Escape'); await view(page, 'home');
    await page.focus('#homeView [data-open="modes"]'); await page.keyboard.press('Space'); await view(page, 'modes');
    const clicks = await page.evaluate(() => __playClicksR32); assert.deepEqual(clicks, [true, true]);
    return {trustedNativeButtonClicks: clicks.length, syntheticClickSubstitution: false};
  });

  await test('Repeated arrow presses continue navigating menu items', '#home', async page => {
    await page.focus('#homeView [data-open="modes"]'); await page.keyboard.down('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), 'modules/chronicles.html');
    await page.keyboard.down('ArrowDown'); await trustedRepeat(page, 'ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), 'modules/versus.html?mode=training');
    await page.keyboard.up('ArrowDown'); await view(page, 'home');
    return {trustedRepeat: true, twoDownEventsMoveTwoItems: true};
  });

  await test('Native select navigation keeps repeated arrows and updates the saved setting', '#options', async page => {
    await page.focus('#motionSetting'); await page.keyboard.down('ArrowDown');
    assert.equal(await page.inputValue('#motionSetting'), 'reduced');
    await page.keyboard.down('ArrowDown'); await page.keyboard.up('ArrowDown'); await trustedRepeat(page, 'ArrowDown');
    assert.equal(await page.inputValue('#motionSetting'), 'full'); await view(page, 'options');
    assert.equal(await page.evaluate(() => RE_INTERFACE_R20.get().motion), 'full');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'motionSetting');
    return {nativeSelectRetainsFocus: true, settingPersistedThroughRealController: true};
  });

  await test('Events already consumed by a capture handler cannot navigate the menu', '#controls', async page => {
    await page.evaluate(() => {
      window.__capturedKeysR32 = [];
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' || event.key === 'Enter') {event.preventDefault(); __capturedKeysR32.push(event.key);}
      }, {capture: true});
    });
    for (const key of ['Escape', 'Enter']) {
      await page.keyboard.down(key); await page.keyboard.down(key); await page.keyboard.up(key); await view(page, 'controls');
    }
    assert.deepEqual(await page.evaluate(() => __capturedKeysR32), ['Escape', 'Escape', 'Enter', 'Enter']);
    return {captureHandlerFixture: true, defaultPreventedHonored: true, fullRemappingFlowClaimed: false};
  });
} finally {
  const browserVersion = browser.version(); await browser.close(); await new Promise(resolve => server.close(resolve));
  const report = {schema: 're.bow.menu-input-browser-r32/1',
    passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length + errors.length,
    browserVersion, checks, browserErrors: errors,
    inputs: [...sourceFiles, 'tests/browser-menu-input-r32.mjs'].map(file => ({path: file,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')})),
    scope: 'Delivered menu HTML, CSS and controllers with trusted Chromium keyboard events. Image requests use a one-pixel fixture; no visual-art fidelity, full combat, hardware keyboard, physical gamepad or complete remapping certification.'};
  const selected = process.argv.find(argument => argument.startsWith('--report='))?.slice('--report='.length)
    || 'qa-gamedev-r32/menu-input.json';
  const output = path.resolve(root, selected); fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed, report: path.relative(root, output)}));
  if (report.failed) process.exitCode = 1;
}
