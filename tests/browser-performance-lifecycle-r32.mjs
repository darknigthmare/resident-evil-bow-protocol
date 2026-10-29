/** Exercise the delivered measurement UI/monitor lifecycle; iframe game content is a named fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = 'modules/fidelity-r31/performance/';
const sourceFiles = ['index.html', 'page.js', 'monitor.js', 'style.css'].map(name => directory + name);
const servedFiles = new Map(sourceFiles.map(name => ['/' + name, fs.readFileSync(path.join(root, name))]));
const modes = new Set(['/modules/versus.html', '/catalog-duel.html', '/modules/fidelity-r31/evolutions/index.html']);
const results = [], errors = [];
const fixture = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fixture de cycle de vie</title></head><body>'
  + '<p>Iframe de test du moniteur : aucun moteur ou asset du jeu complet.</p>'
  + '<script src="/' + directory + 'monitor.js"></script></body></html>';
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript' : pathname.endsWith('.css') ? 'text/css' : 'text/html');
  if (servedFiles.has(pathname)) return response.end(servedFiles.get(pathname));
  if (modes.has(pathname)) return response.end(fixture);
  if (pathname === '/away.html') return response.end('<!doctype html><title>Navigation de test</title><p>Autre page du test.</p>');
  if (pathname === '/favicon.ico') {response.statusCode = 204; return response.end();}
  response.statusCode = 404; response.end('Not found');
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || undefined,
  ignoreDefaultArgs: ['--disable-back-forward-cache'], args: ['--no-sandbox', '--disable-dev-shm-usage']});

async function state(page) {
  return page.evaluate(() => {
    const get = id => document.getElementById(id), monitor = get('game').contentWindow.RE_PERFORMANCE_R31;
    return {measureDisabled: get('measure').disabled, stopDisabled: get('stop').disabled,
      downloadDisabled: get('download').disabled, resultRows: get('results').children.length,
      status: get('status').textContent, active: monitor?.state().active ?? null, reason: monitor?.state().last?.reason ?? null};
  });
}
async function ready(page, pathname = '/modules/versus.html') {
  await page.waitForFunction(expected => {
    const frame = document.getElementById('game');
    return !document.getElementById('measure').disabled && frame.contentWindow.location.pathname === expected
      && !!frame.contentWindow.RE_PERFORMANCE_R31;
  }, pathname);
}
async function start(page) {
  await page.click('#measure');
  await page.waitForFunction(() => document.getElementById('game').contentWindow.RE_PERFORMANCE_R31.state().active);
}
async function exported(page) {
  const pending = page.waitForEvent('download'); await page.click('#download'); const download = await pending;
  const stream = await download.createReadStream(), parts = [];
  for await (const part of stream) parts.push(part);
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
async function test(name, run) {
  const context = await browser.newContext({acceptDownloads: true});
  await context.addInitScript(() => {
    globalThis.__r32Lifecycle = {identity: crypto.randomUUID(), events: []};
    for (const type of ['pageshow', 'pagehide']) addEventListener(type, event => {
      globalThis.__r32Lifecycle.events.push({type, persisted: event.persisted, trusted: event.isTrusted});
    });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push({test: name, message: error.message}));
  try {
    await page.goto(origin + '/' + directory + 'index.html'); await ready(page);
    const detail = await run(page);
    results.push({name, pass: true, detail}); console.log('PASS ' + name);
  } catch (error) {
    let observed = null; try {observed = await state(page);} catch {}
    results.push({name, pass: false, error: error.stack, observed}); console.error('FAIL ' + name + ': ' + error.message);
  } finally {await context.close();}
}

try {
  await test('Manual stop produces an exportable partial measurement and allows a new run', async page => {
    const initial = await state(page); assert.equal(initial.active, false); assert.equal(initial.stopDisabled, true);
    await start(page); await page.waitForTimeout(100); await page.click('#stop');
    await page.waitForFunction(() => !document.getElementById('download').disabled);
    const completed = await state(page), report = await exported(page);
    assert.equal(completed.measureDisabled, false); assert.equal(completed.stopDisabled, true); assert.equal(completed.active, false);
    assert.equal(report.reason, 'manual'); assert.equal(report.physicalDeviceCertified, false); assert.equal(report.gpuAllocationsMeasured, false);
    await start(page); await page.click('#stop');
    return {reportReason: report.reason, secondRunStarted: true, actualGameMounted: false};
  });

  await test('A persisted lifecycle interruption retains its partial report and restores controls', async page => {
    await start(page); await page.waitForTimeout(100);
    await page.evaluate(() => {
      dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}));
      dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));
    });
    await page.waitForTimeout(30);
    const restored = await state(page);
    assert.equal(restored.measureDisabled, false, JSON.stringify(restored)); assert.equal(restored.stopDisabled, true);
    assert.equal(restored.active, false); assert.equal(restored.downloadDisabled, false); assert(restored.resultRows > 0);
    assert(!restored.status.includes('Mesure en cours'));
    const report = await exported(page); assert.equal(report.reason, 'parent-pagehide');
    await start(page); await page.click('#stop');
    return {syntheticPageTransitionEvents: true, actualMonitor: true, interruptedReportRetained: true, restartedOnlyByClick: true};
  });

  await test('Actual browser back/forward-cache restoration keeps an interrupted measurement usable', async page => {
    await start(page); await page.waitForTimeout(100);
    const identity = await page.evaluate(() => __r32Lifecycle.identity);
    await page.goto(origin + '/away.html'); await page.goBack({waitUntil: 'commit'});
    await page.waitForFunction(() => globalThis.__r32Lifecycle?.events.some(event => event.type === 'pageshow' && event.persisted && event.trusted));
    assert.equal(await page.evaluate(() => __r32Lifecycle.identity), identity, 'The page must be restored, not freshly loaded');
    const restored = await state(page);
    assert.equal(restored.measureDisabled, false, JSON.stringify(restored)); assert.equal(restored.stopDisabled, true);
    assert.equal(restored.active, false); assert.equal(restored.downloadDisabled, false); assert(restored.resultRows > 0);
    const report = await exported(page);
    assert(['parent-pagehide', 'pagehide', 'hidden'].includes(report.reason));
    await start(page); await page.click('#stop');
    return {trustedPersistedPageShow: true, sameDocumentRestored: true, interruptedReason: report.reason, automaticRestart: false};
  });

  await test('Changing mode clears the previous report and ignores completion from the outgoing frame', async page => {
    await start(page); await page.click('#stop');
    await page.waitForFunction(() => !document.getElementById('download').disabled);
    await start(page);
    const loading = await page.evaluate(() => {
      const mode = document.getElementById('mode'); mode.value = 'catalog-duel.html'; mode.dispatchEvent(new Event('change'));
      return {downloadDisabled: document.getElementById('download').disabled, resultRows: document.getElementById('results').children.length};
    });
    assert.equal(loading.downloadDisabled, true); assert.equal(loading.resultRows, 0);
    await ready(page, '/catalog-duel.html');
    const changed = await state(page);
    assert.equal(changed.stopDisabled, true); assert.equal(changed.downloadDisabled, true); assert.equal(changed.resultRows, 0);
    assert.equal(changed.active, false); assert(changed.status.startsWith('Mode prêt.'));
    await start(page); await page.click('#stop');
    return {oldReportClearedBeforeLoad: true, newModeIdle: true, oldCompletionIgnored: true};
  });

  await test('Reloading the embedded document resets report ownership and both measurement controls', async page => {
    await start(page);
    const identity = await page.evaluate(() => document.getElementById('game').contentWindow.__r32Lifecycle.identity);
    await page.evaluate(() => document.getElementById('game').contentWindow.location.reload());
    await page.waitForFunction(previous => {
      const frame = document.getElementById('game');
      return frame.contentWindow.__r32Lifecycle?.identity !== previous && frame.contentWindow.RE_PERFORMANCE_R31
        && !document.getElementById('measure').disabled;
    }, identity);
    const reloaded = await state(page);
    assert.equal(reloaded.stopDisabled, true, JSON.stringify(reloaded)); assert.equal(reloaded.active, false);
    assert.equal(reloaded.downloadDisabled, true); assert.equal(reloaded.resultRows, 0); assert(reloaded.status.startsWith('Mode prêt.'));
    await start(page); await page.click('#stop');
    return {iframeDocumentReplaced: true, oldReportCleared: true, freshRunAvailable: true};
  });
} finally {
  const browserVersion = browser.version(); await browser.close(); await new Promise(resolve => server.close(resolve));
  const report = {schema: 're.bow.performance-lifecycle-browser-r32/1',
    passed: results.filter(result => result.pass).length, failed: results.filter(result => !result.pass).length + errors.length,
    browserVersion, checks: results, browserErrors: errors,
    inputs: [...sourceFiles, 'tests/browser-performance-lifecycle-r32.mjs'].map(file => ({path: file,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')})),
    scope: 'Delivered performance page and monitor in Chromium, with explicit same-origin iframe fixtures in place of game modes. Includes trusted BFCache restoration and separate synthetic lifecycle coverage. No full-game, physical-FPS, GPU-memory or real-device certification.'};
  const selected = process.argv.find(argument => argument.startsWith('--report='))?.slice('--report='.length)
    || 'qa-gamedev-r32/performance-lifecycle.json';
  const output = path.resolve(root, selected); fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed, report: path.relative(root, output)}));
  if (report.failed) process.exitCode = 1;
}
