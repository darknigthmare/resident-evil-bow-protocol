/** 1,000 verified manual source-frame requests, native bitmap accounting and return navigation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-perf-r24'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_R24_PERF_PORT || 5285), base = 'http://127.0.0.1:' + port;
const source = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r23/motion/malacoda/manifest.json')));
const actions = Number(process.env.BOW_R24_PERF_ACTIONS || 1000);
assert(Number.isInteger(actions) && actions >= 1000 && actions <= 5000, 'Use 1000–5000 actions for this bounded stress run.');
const startedAt = new Date().toISOString(), checks = [];
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const percentile = (values, p) => { const a = [...values].sort((x, y) => x - y); return a[Math.floor((a.length - 1) * p)] ?? null; };
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function pixelHash(page) {
  return page.evaluate(async () => {
    const canvas = document.querySelector('#frame');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', pixels))].map(n => n.toString(16).padStart(2, '0')).join('');
  });
}
async function ready(page, index = 0) {
  await page.waitForFunction(index => document.querySelector('#caption')?.textContent === `Image ${index + 1} / 218 — pixels d’origine vérifiés`, index);
}
try {
  for (let attempt = 0; attempt < 80; attempt++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(75); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('1,000 sequential source-frame actions retain exact pixels and at most two decoded atlases', async () => {
    const context = await browser.newContext({viewport: {width: 1280, height: 900}}), page = await context.newPage();
    const session = await context.newCDPSession(page), errors = [], measurements = [], latencies = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__R24bitmaps = {created: 0, closed: 0, active: 0, peak: 0, activePixels: 0, peakPixels: 0};
      window.__R24pageEvents = []; window.__R24longTasks = [];
      const original = window.createImageBitmap.bind(window);
      window.createImageBitmap = async (...args) => {
        const bitmap = await original(...args), close = bitmap.close.bind(bitmap), pixels = bitmap.width * bitmap.height;
        const stats = window.__R24bitmaps; let closed = false;
        stats.created++; stats.active++; stats.activePixels += pixels;
        stats.peak = Math.max(stats.peak, stats.active); stats.peakPixels = Math.max(stats.peakPixels, stats.activePixels);
        bitmap.close = () => { if (!closed) { closed = true; stats.closed++; stats.active--; stats.activePixels -= pixels; } close(); };
        return bitmap;
      };
      addEventListener('pageshow', event => window.__R24pageEvents.push({type: 'pageshow', persisted: event.persisted, bitmaps: {...window.__R24bitmaps}}));
      addEventListener('pagehide', event => window.__R24pageEvents.push({type: 'pagehide', persisted: event.persisted}));
      try { new PerformanceObserver(list => window.__R24longTasks.push(...list.getEntries().map(item => ({startTime: item.startTime, duration: item.duration})))).observe({type: 'longtask', buffered: true}); } catch {}
    });
    try {
      const start = performance.now(); await page.goto(base + '/modules/fidelity-r23/motion/index.html'); await ready(page);
      await session.send('HeapProfiler.collectGarbage');
      measurements.push({action: 0, heap: await session.send('Runtime.getHeapUsage'), dom: await session.send('Memory.getDOMCounters'), bitmaps: await page.evaluate(() => ({...window.__R24bitmaps}))});
      for (let first = 0; first < actions; first += 100) {
        const count = Math.min(100, actions - first);
        latencies.push(...await page.evaluate(async ({first, count}) => {
          const times = [], input = document.querySelector('#position'), caption = document.querySelector('#caption');
          for (let n = first + 1; n <= first + count; n++) {
            const index = n % 218, expected = `Image ${index + 1} / 218 — pixels d’origine vérifiés`, started = performance.now();
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => { observer.disconnect(); reject(Error('Timed out at source request ' + n)); }, 15_000);
              const observer = new MutationObserver(() => {
                if (caption.textContent === expected) { clearTimeout(timeout); observer.disconnect(); resolve(); }
              });
              observer.observe(caption, {childList: true, characterData: true, subtree: true});
              input.value = index; input.dispatchEvent(new Event('input', {bubbles: true}));
            });
            times.push(performance.now() - started);
          }
          return times;
        }, {first, count}));
        const done = first + count, stats = await page.evaluate(() => ({...window.__R24bitmaps}));
        assert(stats.active <= 2 && stats.peak <= 2); assert.equal(stats.created - stats.closed, stats.active);
        const index = done % 218; assert.equal(await pixelHash(page), source.frames[index].rgbaSha256, 'Source pixels after request ' + done);
        measurements.push({action: done, heap: await session.send('Runtime.getHeapUsage'), dom: await session.send('Memory.getDOMCounters'), bitmaps: stats});
        console.log('MEASURE ' + done + '/' + actions + ' active=' + stats.active + ' created=' + stats.created);
      }
      const elapsedMs = performance.now() - start, beforeGc = await session.send('Runtime.getHeapUsage');
      await session.send('HeapProfiler.collectGarbage'); const afterGc = await session.send('Runtime.getHeapUsage');
      const final = await page.evaluate(() => ({bitmaps: {...window.__R24bitmaps}, longTasks: window.__R24longTasks,
        resources: performance.getEntriesByType('resource').filter(item => /\/atlas-\d+\.png$/.test(new URL(item.name).pathname))
          .map(item => ({path: new URL(item.name).pathname, encodedBodySize: item.encodedBodySize, transferSize: item.transferSize}))}));
      assert.deepEqual(errors, []);
      const beforeReturn = actions % 218; await page.goto(base + '/modules/fidelity-r23/index.html'); await page.goBack();
      await page.waitForFunction(() => document.querySelector('#caption')?.textContent.includes('pixels d’origine vérifiés'));
      const returned = await page.evaluate(() => ({events: window.__R24pageEvents, bitmaps: {...window.__R24bitmaps},
        caption: document.querySelector('#caption').textContent, navigation: performance.getEntriesByType('navigation')[0].type}));
      const restored = returned.events.some(event => event.type === 'pageshow' && event.persisted);
      const expectedFrame = restored ? beforeReturn : 0; await ready(page, expectedFrame);
      assert.equal(await pixelHash(page), source.frames[expectedFrame].rgbaSha256);
      const next = (expectedFrame + 1) % 218;
      await page.locator('#position').evaluate((element, value) => { element.value = value; element.dispatchEvent(new Event('input')); }, next);
      await ready(page, next); assert.equal(await pixelHash(page), source.frames[next].rgbaSha256);
      return {actions, sourceFrames: 218, pixelCheckpoints: measurements.map(item => item.action), elapsedMs: Math.round(elapsedMs),
        latencyMs: {median: percentile(latencies, .5), p95: percentile(latencies, .95), maximum: Math.max(...latencies)},
        measurements, beforeExplicitFinalGc: beforeGc, afterExplicitFinalGc: afterGc,
        decodedBitmapAccounting: {...final.bitmaps, peakRgbaByteEstimate: final.bitmaps.peakPixels * 4,
          estimateMeaning: '4 bytes per currently live application-owned ImageBitmap pixel; excludes GPU/process/canvas duplicates.'},
        atlasRequests: final.resources.length, atlasEncodedBodyBytes: final.resources.reduce((sum, item) => sum + item.encodedBodySize, 0),
        longTasks: final.longTasks, realBackNavigation: {...returned, restoredFromBackForwardCache: restored, expectedFrame, nextFrameVerified: next},
        limits: ['1000 bounded sequential actions, not an overnight endurance test.', 'Loopback HTTP and a virtual host do not represent target hardware or a mobile network.',
          'Native bitmap ownership accounting does not measure total GPU, browser image cache or process RSS.',
          'Explicit garbage collection is used only before action zero and after the final action; both final heap snapshots are retained.']};
    } finally { await context.close(); }
  });
  await test('Three-minute paced source inspection keeps decoded ownership and DOM counts bounded', async () => {
    const context = await browser.newContext(), page = await context.newPage(), session = await context.newCDPSession(page);
    const checkpoints = [], durationMs = Number(process.env.BOW_R24_PERF_DWELL_MS || 180000);
    assert(Number.isInteger(durationMs) && durationMs >= 60000 && durationMs <= 300000);
    await page.addInitScript(() => {
      window.__R24bitmaps = {created: 0, closed: 0, active: 0, peak: 0, activePixels: 0, peakPixels: 0};
      const original = window.createImageBitmap.bind(window);
      window.createImageBitmap = async (...args) => {
        const bitmap = await original(...args), close = bitmap.close.bind(bitmap), pixels = bitmap.width * bitmap.height;
        let closed = false; const stats = window.__R24bitmaps;
        stats.created++; stats.active++; stats.activePixels += pixels;
        stats.peak = Math.max(stats.peak, stats.active); stats.peakPixels = Math.max(stats.peakPixels, stats.activePixels);
        bitmap.close = () => { if (!closed) { closed = true; stats.closed++; stats.active--; stats.activePixels -= pixels; } close(); };
        return bitmap;
      };
    });
    try {
      await page.goto(base + '/modules/fidelity-r23/motion/index.html'); await ready(page);
      await session.send('HeapProfiler.collectGarbage');
      const started = performance.now();
      const attachedNodes = () => page.evaluate(() => {
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL); let count = 0;
        while (walker.nextNode()) count++; return count;
      });
      checkpoints.push({elapsedMs: 0, actions: 0, heap: await session.send('Runtime.getHeapUsage'), dom: await session.send('Memory.getDOMCounters'), attachedDomNodes: await attachedNodes()});
      for (let stage = 1; stage <= 6; stage++) {
        const deadline = started + durationMs * stage / 6;
        while (performance.now() < deadline) await wait(Math.min(30000, Math.max(1, deadline - performance.now())));
        await page.evaluate(async stage => {
          const input = document.querySelector('#position'), caption = document.querySelector('#caption');
          for (let n = (stage - 1) * 170 + 1; n <= stage * 170; n++) {
            const index = n % 218, expected = `Image ${index + 1} / 218 — pixels d’origine vérifiés`;
            await new Promise((resolve, reject) => {
              const timer = setTimeout(() => { observer.disconnect(); reject(Error('Paced request stalled')); }, 15000);
              const observer = new MutationObserver(() => { if (caption.textContent === expected) { clearTimeout(timer); observer.disconnect(); resolve(); } });
              observer.observe(caption, {childList: true, subtree: true}); input.value = index; input.dispatchEvent(new Event('input'));
            });
          }
        }, stage);
        const count = stage * 170, bitmaps = await page.evaluate(() => ({...window.__R24bitmaps}));
        assert(bitmaps.active <= 2 && bitmaps.peak <= 2); assert.equal(bitmaps.created - bitmaps.closed, bitmaps.active);
        assert.equal(await pixelHash(page), source.frames[count % 218].rgbaSha256);
        checkpoints.push({elapsedMs: Math.round(performance.now() - started), actions: count,
          heap: await session.send('Runtime.getHeapUsage'), dom: await session.send('Memory.getDOMCounters'), attachedDomNodes: await attachedNodes(), bitmaps});
        fs.writeFileSync(path.join(output, 'R24_PACED_CHECKPOINTS.json'), JSON.stringify(checkpoints, null, 2) + '\n');
        console.log('PACED ' + stage + '/6 elapsed=' + Math.round(performance.now() - started) + 'ms');
      }
      const initialNodes = checkpoints[0].attachedDomNodes, maximumNodes = Math.max(...checkpoints.map(item => item.attachedDomNodes));
      assert.equal(maximumNodes, initialNodes, 'Frame inspection must not accumulate attached DOM nodes');
      const beforeGc = await session.send('Runtime.getHeapUsage'); await session.send('HeapProfiler.collectGarbage');
      const afterGc = await session.send('Runtime.getHeapUsage'), domAfterGc = await session.send('Memory.getDOMCounters');
      return {requestedDurationMs: durationMs, observedDurationMs: Math.round(performance.now() - started), actions: 1020,
        checkpoints, maximumAttachedDomNodes: maximumNodes, initialAttachedDomNodes: initialNodes,
        beforeFinalGc: beforeGc, afterFinalGc: afterGc, domAfterFinalGc: domAfterGc,
        domCounterMeaning: 'CDP nodes includes detached nodes awaiting collection; only document-attached TreeWalker counts are asserted stable.',
        physicalDeviceOrOvernightCertification: false};
    } finally { await context.close(); }
  });
} finally {
  const report = {schema: 're.bow.performance-evidence-r24/1', startedAt, completedAt: new Date().toISOString(),
    environment: {node: process.version, chromium: browser?.version() || null, virtualized: true, headless: true, os: os.release()},
    passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks};
  await browser?.close(); server.kill('SIGTERM');
  const data = JSON.stringify(report, null, 2) + '\n';
  fs.writeFileSync(path.join(output, 'R24_PERFORMANCE_RESULTS.json'), data);
  fs.writeFileSync(path.join(root, 'docs/R24_ACCESS_PERFORMANCE.json'), data);
  console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
  if (report.failed) process.exitCode = 1;
}
