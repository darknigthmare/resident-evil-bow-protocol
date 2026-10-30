/** Delivered catalogue page, engine and replay with trusted keyboard input; raster artwork is an explicit fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [], errors = [], served = new Set(), failures = new Set();
const fixture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z6EAAAAASUVORK5CYII=', 'base64');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (/\.(png|webp|jpe?g|gif)$/i.test(pathname)) {
    response.setHeader('Content-Type', 'image/png'); return response.end(fixture);
  }
  if (pathname === '/favicon.ico') {response.statusCode = 204; return response.end();}
  const relative = pathname.replace(/^\/+/, ''), file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !types[path.extname(file)] || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    failures.add(relative); response.statusCode = 404; return response.end('Unavailable in this source/input test.');
  }
  served.add(relative); response.setHeader('Content-Type', types[path.extname(file)]); response.end(fs.readFileSync(file));
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
const scenarios = [
  {name: 'neutral', held: [], expected: 'special'},
  {name: 'left', held: ['KeyQ'], expected: 'specialBack'},
  {name: 'right', held: ['KeyD'], expected: 'specialForward'},
  {name: 'opposite', held: ['KeyQ', 'KeyD'], expected: 'special'},
  {name: 'opposite-and-down', held: ['KeyQ', 'KeyD', 'KeyS'], expected: 'specialDown'},
  {name: 'release-left', held: ['KeyQ', 'KeyD'], release: 'KeyQ', expected: 'specialForward'},
];
try {
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
    await context.addInitScript(() => {
      window.__inputKeysR32 = [];
      addEventListener('keydown', event => {
        if (__inputKeysR32.length < 300) __inputKeysR32.push({code: event.code, trusted: event.isTrusted, target: event.target?.id});
      }, {capture: true});
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push({width, message: error.message}));
    try {
      assert.equal((await page.goto(origin + '/catalog-duel.html?uid=re3r-nemesis&target=re3r-stage-2-nemesis&stage=nest2_weapon_test_2020')).status(), 200);
      await page.waitForFunction(() => !!window.RE_CATALOG_DUEL && !!window.RE_CATALOG_REPLAY);
      const storage = await page.evaluate(() => JSON.stringify({...localStorage}));
      for (const scenario of scenarios) {
        try {
          // Exercise the production start/skip flow, focus, RAF loop and DOM key handlers on every case.
          await page.click('#trialStart'); await page.click('#trialIntroSkip');
          assert.equal(await page.evaluate(() => document.activeElement.id), 'trialCanvas');
          assert.equal(await page.evaluate(() => RE_CATALOG_DUEL.getState().a.face), 1);
          for (const key of scenario.held) await page.keyboard.down(key);
          if (scenario.release) await page.keyboard.up(scenario.release);
          await page.keyboard.press('KeyL');
          await page.waitForFunction(() => RE_CATALOG_DUEL.getState().a.stats.attempts > 0);
          await page.keyboard.press('Escape');
          for (const key of scenario.held) await page.keyboard.up(key);
          const actual = await page.evaluate(() => {
            const value = RE_CATALOG_DUEL.exportReplay(); // Includes deterministic validation against a fresh engine match.
            const slots = value.runs.filter(run => run[2] >= 0).map(run => ({count: run[0], slot: CQCCombat060.SLOTS[run[2]]}));
            const state = RE_CATALOG_DUEL.getState(), attack = state.a.attack?.name ?? null;
            const key = __inputKeysR32.filter(event => event.code === 'KeyL').at(-1);
            RE_CATALOG_DUEL.installReplay(value);
            RE_CATALOG_DUEL.tick(value.frames);
            return {slots, attack, key, frames: value.frames, starts: state.a.stats.starts,
              replayDigestMatches: RE_CATALOG_DUEL.exportReplay().stateDigest === value.stateDigest,
              replayReadOnly: RE_CATALOG_DUEL.isReplay(), storage: JSON.stringify({...localStorage})};
          });
          assert.deepEqual(actual.slots, [{count: 1, slot: scenario.expected}], 'Actual recorded input differs');
          assert.equal(actual.starts, 1, 'The production engine must start exactly one attack');
          assert.equal(actual.key?.trusted, true); assert.equal(actual.key?.target, 'trialCanvas');
          assert.equal(actual.replayDigestMatches, true); assert.equal(actual.replayReadOnly, true);
          assert.equal(actual.storage, storage, 'Catalogue duels must not change progression');
          checks.push({width, scenario: scenario.name, pass: true, expected: scenario.expected,
            actual: actual.slots[0].slot, engineStarts: actual.starts, frames: actual.frames,
            trustedKeyboard: true, verifiedReplayRoundTrip: true});
          console.log('PASS ' + width + ' ' + scenario.name);
        } catch (error) {
          for (const key of [...scenario.held, 'KeyL']) await page.keyboard.up(key);
          checks.push({width, scenario: scenario.name, pass: false, error: error.stack});
          console.error('FAIL ' + width + ' ' + scenario.name + ': ' + error.message);
        }
      }
    } finally {await context.close();}
  }
} catch (error) {checks.push({scenario: 'browser setup', pass: false, error: error.stack}); console.error(error.stack);}
finally {
  const browserVersion = browser?.version() ?? null; await browser?.close(); await new Promise(resolve => server.close(resolve));
  const missingCode = [...failures].filter(file => /\.(js|css|html)$/.test(file));
  const report = {schema: 're.bow.input-browser-r32/1', browserVersion,
    passed: checks.filter(check => check.pass).length,
    failed: checks.filter(check => !check.pass).length + errors.length + missingCode.length,
    checks, browserErrors: errors, missingCode, unavailableOptionalData: [...failures].filter(file => !missingCode.includes(file)),
    inputs: [...new Set([...served, 'tests/browser-input-r32.mjs'])].sort().map(file => ({path: file,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')})),
    scope: 'Delivered catalogue HTML, controllers, combat engine, automatic RAF loop and replay validation. Trusted Chromium keyboard at desktop and narrow viewports. Raster artwork uses a one-pixel fixture; this is not visual-fidelity, physical-device or touch certification. Unit cases separately cover both facings and mixed input devices.'};
  const selected = process.argv.find(argument => argument.startsWith('--report='))?.slice('--report='.length) || 'qa-gamedev-r32/browser-input.json';
  const output = path.resolve(root, selected); fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed, report: path.relative(root, output)}));
  if (report.failed) process.exitCode = 1;
}
