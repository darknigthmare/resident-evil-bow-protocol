import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-audio-r24-browser');
fs.mkdirSync(output, {recursive: true});
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r24/audio/manifest.json')));
const port = Number(process.env.BOW_AUDIO_R24_PORT || 5288);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
const checks = [];
async function test(name, run) {
  try { checks.push({name, pass: true, detail: await run()}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function open(page) {
  await page.goto(base + '/modules/fidelity-r24/audio/index.html');
  await page.waitForFunction(() => window.RE_AUDIO_R24?.state().ready);
}
async function prepare(page) {
  await page.click('#prepare');
  await page.waitForFunction(() => !!RE_AUDIO_R24.state().prepared && !RE_AUDIO_R24.state().loading);
  await page.waitForFunction(() => Number.isFinite(document.getElementById('audio').duration));
}
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test('Manual playback, volume, pause and labelled controls at ' + width + 'px', async () => {
    const page = await browser.newPage({viewport: {width, height: 900}}), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await open(page);
    assert.equal(await page.locator('#clip option').count(), manifest.entries.length);
    assert.equal(await page.evaluate(() => RE_AUDIO_R24.state().playing), false);
    assert.equal(await page.evaluate(() => document.getElementById('audio').hasAttribute('src')), false);
    assert.equal(await page.locator('audio[autoplay]').count(), 0);
    assert(await page.locator('#audio').getAttribute('aria-label'));
    await prepare(page);
    assert.equal(await page.evaluate(() => RE_AUDIO_R24.state().playing), false);
    await page.evaluate(async () => { const audio = document.getElementById('audio'); audio.volume = 0.25; await audio.play(); });
    await page.waitForFunction(() => document.getElementById('audio').currentTime > 0.08);
    const playback = await page.evaluate(() => { const audio = document.getElementById('audio'); audio.pause(); return {time: audio.currentTime, volume: audio.volume, paused: audio.paused}; });
    assert.equal(playback.volume, 0.25); assert.equal(playback.paused, true);
    await page.fill('#search', 'forastero'); assert.equal(await page.locator('#clip option').count(), 1);
    assert.equal(await page.evaluate(() => RE_AUDIO_R24.state().prepared), null);
    await page.fill('#search', 'NO_MATCH_AUDIO_R24'); assert.equal(await page.locator('#clip option').count(), 0); assert(await page.locator('#prepare').isDisabled());
    await page.fill('#search', '');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []);
    await page.screenshot({path: path.join(output, `audio-${width}.png`), fullPage: true});
    await page.close(); return {clips: manifest.entries.length, initialAutoplay: false, playback, noPageOverflow: true};
  });
  await test('All published MP3 files match their hashes and decode without playback', async () => {
    const page = await browser.newPage(); await open(page);
    const decoded = await page.evaluate(async () => {
      const value = await (await fetch('manifest.json')).json();
      const context = new AudioContext();
      const rows = [];
      try {
        for (const row of value.entries) {
          const bytes = await (await fetch(row.path)).arrayBuffer();
          const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
          if (hash !== row.sha256 || bytes.byteLength !== row.bytes) throw new Error('Source bytes mismatch: ' + row.clip_id);
          const pcm = await context.decodeAudioData(bytes.slice(0));
          if (pcm.length <= 0 || !pcm.numberOfChannels) throw new Error('Empty decoded clip');
          rows.push({clip: row.clip_id, sampleFrames: pcm.length, channels: pcm.numberOfChannels});
        }
      } finally { await context.close(); }
      return rows;
    });
    assert.equal(decoded.length, 57); assert.equal(await page.evaluate(() => RE_AUDIO_R24.state().playing), false);
    await page.close(); return {decodedClips: decoded.length, playbackStarted: false};
  });
  await test('Corrupted source bytes are refused before audio loading', async () => {
    const page = await browser.newPage();
    await page.route('**/audio/clips/aca.mp3', route => route.fulfill({status: 200, contentType: 'audio/mpeg', body: Buffer.alloc(manifest.entries[0].bytes)}));
    await open(page); await page.click('#prepare');
    await page.waitForFunction(() => !RE_AUDIO_R24.state().loading && document.querySelector('#status').classList.contains('error'));
    assert.equal(await page.evaluate(() => RE_AUDIO_R24.state().prepared), null);
    assert.equal(await page.evaluate(() => document.getElementById('audio').hasAttribute('src')), false);
    await page.close(); return {corruptionRefused: true};
  });
  await test('A delayed previous selection cannot replace the current source', async () => {
    const page = await browser.newPage(); let release, arrived;
    const reached = new Promise(resolve => { arrived = resolve; });
    const pending = new Promise(resolve => { release = resolve; });
    await page.route('**/audio/clips/aca.mp3', async route => { arrived(); await pending; try { await route.continue(); } catch {} });
    await open(page); await page.click('#prepare'); await reached;
    await page.selectOption('#clip', 'agarrenlo'); await prepare(page); release();
    assert.equal(await page.evaluate(() => RE_AUDIO_R24.state().prepared), 'agarrenlo');
    assert.equal(await page.evaluate(() => RE_AUDIO_R24.state().objectURLs), 1);
    await page.close(); return {currentClip: 'agarrenlo', maximumObjectURLs: 1};
  });
} finally {
  await browser?.close(); server.kill();
  fs.writeFileSync(path.join(output, 'R24_AUDIO_BROWSER_RESULTS.json'), JSON.stringify({passed: checks.every(row => row.pass), checks}, null, 2) + '\n');
}
if (checks.some(row => !row.pass)) process.exitCode = 1;
