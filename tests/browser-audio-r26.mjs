import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-audio-r26-browser'); fs.mkdirSync(output, {recursive: true});
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r26/audio/manifest.json')));
const base = `http://127.0.0.1:${process.env.BOW_R26_AUDIO_PORT || 5464}`;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: new URL(base).port}, stdio: 'ignore'});
const checks = [], startedAt = new Date().toISOString(); let browser;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page) { await page.waitForFunction(() => window.RE_AUDIO_R26?.state().ready); }
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(75); }
  browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1440, 390]) await test(`Publisher groups, manual playback and labelled controls at ${width}px`, async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + '/modules/fidelity-r26/audio/index.html'); await ready(page);
      assert.equal((await page.evaluate(() => RE_AUDIO_R26.state())).clips, 1031);
      assert.equal(await page.locator('#group option').count(), 9);
      assert.equal(await page.locator('#clip option').count(), 1031);
      assert.equal(await page.locator('#audio').getAttribute('src'), null);
      assert.equal(await page.locator('#audio').evaluate(el => el.paused), true);
      await page.selectOption('#group', 'Drain Deimos / Voices'); assert.equal(await page.locator('#clip option').count(), 32);
      await page.fill('#search', '113217789'); assert.equal(await page.locator('#clip option').count(), 1);
      await page.getByRole('button', {name: 'Vérifier et charger le fichier'}).click();
      await page.waitForFunction(() => window.RE_AUDIO_R26.state().prepared);
      assert.equal(await page.locator('#audio').evaluate(el => el.paused), true);
      await page.locator('#audio').evaluate(async el => { el.volume = .25; await el.play(); });
      await page.waitForFunction(() => document.querySelector('#audio').currentTime > .01);
      await page.locator('#audio').evaluate(el => el.pause());
      assert.equal(await page.locator('#audio').evaluate(el => el.volume), .25);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, `audio-${width}.png`), fullPage: true});
      assert.deepEqual(errors, []);
      return {clips: 1031, identities: 4, drainDeimosVoiceClips: 32, noAutoplay: true, volumeAndPause: true, physicalListening: false};
    } finally { await context.close(); }
  });
  await test('All 1031 preserved WAVs match their hashes and decode to their exact sample counts', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r26/audio/index.html'); await ready(page);
      const result = await page.evaluate(async entries => {
        const audio = new AudioContext({sampleRate: 48000}), problems = []; let decoded = 0;
        try {
          for (const row of entries) {
            const bytes = await (await fetch(row.path.split('/').map(encodeURIComponent).join('/'))).arrayBuffer();
            const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
            if (bytes.byteLength !== row.bytes || hash !== row.sha256) { problems.push(row.clip_id + ':hash'); continue; }
            const wave = await audio.decodeAudioData(bytes);
            if (wave.sampleRate !== 48000 || wave.numberOfChannels !== row.probe.channels || wave.length !== row.probe.frames) problems.push(row.clip_id + ':samples');
            decoded++;
          }
        } finally { await audio.close(); }
        return {decoded, problems, playbackStarted: !document.querySelector('#audio').paused};
      }, manifest.entries);
      assert.deepEqual(result, {decoded: 1031, problems: [], playbackStarted: false});
      return {...result, independentSemanticListening: false};
    } finally { await page.close(); }
  });
  await test('Identity links filter only their known source group and reject an unknown incarnation', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await page.goto(base + '/modules/fidelity-r26/audio/index.html?identity=re3r-drain-deimos'); await ready(page);
      assert.equal(await page.locator('#clip option').count(), 216); assert.equal(await page.locator('#group option').count(), 3);
      assert.equal(await page.evaluate(() => RE_AUDIO_R26.state().identity), 're3r-drain-deimos');
      assert.equal(await page.locator('#audio').getAttribute('src'), null);
      await page.goto(base + '/modules/fidelity-r26/audio/index.html?identity=re4-dr-salvador');
      await page.waitForFunction(() => document.querySelector('#summary').classList.contains('error'));
      assert.equal(await page.locator('#clip option').count(), 0); assert.equal(await page.locator('#prepare').isDisabled(), true);
      return {drainDeimosClips: 216, voiceAndEffectsGroupsDistinct: true, unknownIdentityRefused: true};
    } finally { await context.close(); }
  });
  await test('Changed source bytes fail before an audio URL is exposed', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      const row = manifest.entries[0], raw = fs.readFileSync(path.join(root, 'modules/fidelity-r26/audio', row.path)); raw[raw.length - 1] ^= 1;
      await page.route('**/fidelity-r26/audio/clips/**', route => route.fulfill({status: 200, contentType: 'audio/wav', body: raw}));
      await page.goto(base + '/modules/fidelity-r26/audio/index.html'); await ready(page); await page.click('#prepare');
      await page.waitForFunction(() => document.querySelector('#status').classList.contains('error'));
      assert.match(await page.locator('#status').innerText(), /Empreinte/);
      assert.equal(await page.locator('#audio').getAttribute('src'), null); assert.equal(await page.evaluate(() => RE_AUDIO_R26.state().objectURLs), 0);
      return {corruptedSourceRefused: true, exposedAudioURLs: 0};
    } finally { await context.close(); }
  });
  await test('Unsafe manifest paths and unsupported native certification cannot expose playback', async () => {
    for (const mode of ['path', 'certification']) {
      const context = await browser.newContext(), page = await context.newPage();
      try {
        const changed = structuredClone(manifest);
        if (mode === 'path') changed.entries[0].path = 'clips/../../outside.wav';
        else changed.entries[0].native_bank_certified = true;
        await page.route('**/fidelity-r26/audio/manifest.json', route => route.fulfill({status: 200, json: changed}));
        await page.goto(base + '/modules/fidelity-r26/audio/index.html');
        await page.waitForFunction(() => document.querySelector('#summary').classList.contains('error'));
        assert.equal(await page.locator('#prepare').isDisabled(), true);
        assert.equal(await page.locator('#audio').getAttribute('src'), null);
        assert.equal(await page.evaluate(() => RE_AUDIO_R26.state().ready), false);
      } finally { await context.close(); }
    }
    return {unsafePathRefused: true, unsupportedCertificationRefused: true};
  });
  await test('A late previous selection cannot replace the current sound', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      const first = manifest.entries[0], second = manifest.entries[1]; let release, entered;
      const arrived = new Promise(resolve => { entered = resolve; }); const held = new Promise(resolve => { release = resolve; });
      await page.route('**/fidelity-r26/audio/clips/**', async route => {
        if (decodeURIComponent(new URL(route.request().url()).pathname).endsWith('/' + first.path)) { entered(); await held; }
        try { await route.continue(); } catch {}
      });
      await page.goto(base + '/modules/fidelity-r26/audio/index.html'); await ready(page); await page.click('#prepare'); await arrived;
      await page.selectOption('#clip', second.clip_id); await page.click('#prepare');
      await page.waitForFunction(id => window.RE_AUDIO_R26.state().prepared === id, second.clip_id);
      release(); await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => RE_AUDIO_R26.state().prepared), second.clip_id);
      assert.equal(await page.evaluate(() => RE_AUDIO_R26.state().objectURLs), 1);
      return {staleSelectionRefused: true, liveAudioURLs: 1};
    } finally { await context.close(); }
  });
} finally {
  const report = {schema: 're.bow.audio-browser-r26/1', startedAt, completedAt: new Date().toISOString(),
    passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks,
    independentSemanticListening: false, nativeGameBanksCertified: false, physicalAudioDevices: false};
  fs.writeFileSync(path.join(output, 'R26_AUDIO_BROWSER_RESULTS.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'docs/R26_AUDIO_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); server.kill(); if (report.failed) process.exitCode = 1;
}
