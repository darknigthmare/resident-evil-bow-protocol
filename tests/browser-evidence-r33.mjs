import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packPath = 'modules/fidelity-r33/evidence', routePath = '/' + packPath + '/index.html';
const pack = JSON.parse(fs.readFileSync(path.join(root, packPath, 'manifest.json')));
const out = path.join(root, 'qa-evidence-r33'); fs.mkdirSync(out, {recursive: true});
const port = Number(process.env.BOW_R33_EVIDENCE_PORT || 5907), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const checks = []; let browser;
async function test(name, run) {
  try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
async function loaded(page, uid = 're0-stinger') {
  const response = await page.goto(base + routePath + '?id=' + uid); assert.equal(response.status(), 200);
  await page.locator('#identity:not([disabled])').waitFor();
  assert.equal(await page.locator('#identity').inputValue(), uid);
  assert.match(await page.locator('#edition').innerText(), new RegExp(uid));
}
async function prepared(page) {
  await page.locator('#prepare').click();
  await page.waitForFunction(() => document.getElementById('audio-status').textContent.includes('Taille et empreinte vérifiées'));
  assert.equal(await page.locator('#audio').evaluate(node => node.paused), true);
  assert.match(await page.locator('#audio').getAttribute('src'), /^blob:/);
}
async function decoded(page) {
  await page.locator('#audio').evaluate(node => node.play());
  await page.waitForFunction(() => Number.isFinite(document.getElementById('audio').duration) && document.getElementById('audio').duration > 0);
  const result = await page.locator('#audio').evaluate(node => ({duration: node.duration, readyState: node.readyState}));
  await page.locator('#audio').evaluate(node => node.pause());
  return result;
}
function errors(page) {const found = []; page.on('pageerror', error => found.push(error.message)); return found;}
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {if ((await fetch(base + routePath)).ok) {ready = true; break;}} catch {}
    await new Promise(resolve => setTimeout(resolve, 75));
  }
  assert(ready, 'Local evidence server did not start');
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  await test('Actual documentary viewer presents13 source identities and18 total dossiers without eager media or storage writes', async () => {
    const context = await browser.newContext(), page = await context.newPage(), media = [], pageErrors = errors(page);
    page.on('request', request => {if (/\.(png|jpe?g|webp|ogg|wav)(?:\?|$)/.test(request.url())) media.push(request.url());});
    try {
      await loaded(page); assert.equal(await page.locator('#identity option').count(), 18);
      assert.equal(await page.locator('#claims article').count(), 4);
      assert.match(await page.locator('#status').innerText(), /13 incarnations documentées · 20 sources conservées · 35 extraits/);
      assert.match(await page.locator('#claims').innerText(), /up to three meters, including its pincers/);
      assert.deepEqual(media, []); assert.deepEqual(pageErrors, []);
      assert.deepEqual(await page.evaluate(() => ({local: localStorage.length, session: sessionStorage.length})), {local: 0, session: 0});
      await page.screenshot({path: path.join(out, 'stinger-source.png'), fullPage: false});
      return {documentedIdentities: 13, dossiers: 18, eagerMediaRequests: 0, storageWrites: 0};
    } finally {await context.close();}
  });
  await test('Native keyboard selection keeps the exact UID, own anatomy and source edition visible', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await loaded(page, 're6-ubistvo'); assert.match(await page.locator('#claims').innerText(), /right hand/);
      await page.locator('#identity').focus(); await page.keyboard.press('ArrowDown');
      const selected = await page.locator('#identity').inputValue(); assert.notEqual(selected, 're6-ubistvo');
      assert.equal(new URL(page.url()).searchParams.get('id'), selected);
      assert.match(await page.locator('#edition').innerText(), new RegExp(selected));
      assert.equal(await page.evaluate(() => document.activeElement.id), 'identity');
      await page.selectOption('#identity', 'recv-nosferatu');
      assert.match(await page.locator('#claims').innerText(), /locuteur non identifié/);
      assert.match(await page.locator('#audio-meta').innerText(), /équivalence Dreamcast/);
      assert.match(await page.locator('#qualification').innerText(), /Aucune affectation automatique/);
      return {trustedKeyboardSelection: true, automaticEditionEquivalence: false};
    } finally {await context.close();}
  });
  await test('Real context controls require the cited game, phase, anatomy and each condition', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await loaded(page, 're6-napad'); await page.selectOption('#claim', 'R33-EVID-023');
      await page.locator('#check-context').click(); assert.match(await page.locator('#context-result').innerText(), /Contexte non prouvé/);
      await page.selectOption('#context-game', 'resident-evil-6');
      await page.selectOption('#context-phase', 'documented-encounter');
      await page.selectOption('#context-region', 'nerve-center-under-back-shell');
      await page.locator('#conditions input').first().check(); await page.locator('#check-context').click();
      assert.match(await page.locator('#context-result').innerText(), /missing-condition:nerve-center-hit/);
      await page.locator('#conditions input').last().check(); await page.locator('#check-context').click();
      assert.match(await page.locator('#context-result').innerText(), /Contexte documentaire correspondant/);
      assert.match(await page.locator('#context-result').innerText(), /restent non certifiées/);
      await page.selectOption('#context-game', 'resident-evil-zero'); await page.locator('#check-context').click();
      assert.match(await page.locator('#context-result').innerText(), /game-mismatch/);
      return {missingConditionsRejected: true, wrongGameRejected: true, gameplayAssignments: 0};
    } finally {await context.close();}
  });
  await test('Published WAV and OGG are hash-verified on demand and really decoded without automatic playback', async () => {
    const context = await browser.newContext(), page = await context.newPage(), observed = [];
    try {
      for (const uid of ['recv-nosferatu', 're4-dr-salvador']) {
        await loaded(page, uid); assert.equal(await page.locator('#audio').getAttribute('src'), null);
        await prepared(page); const playback = await decoded(page);
        assert(playback.duration > 0 && playback.readyState >= 2);
        assert.match(await page.locator('#audio-meta').innerText(), /Action, phase et locuteur non attribués/);
        observed.push({uid, ...playback, automaticPlayback: false, independentHumanListening: false});
      }
      return observed;
    } finally {await context.close();}
  });
  await test('Changed audio bytes and oversized streams are rejected before a Blob can reach the player', async () => {
    const observed = [];
    for (const attack of ['hash', 'oversized']) {
      const context = await browser.newContext(), page = await context.newPage();
      const clip = pack.audioReviewQueue.find(item => item.candidateIdentityIds.includes('recv-nosferatu'));
      const raw = fs.readFileSync(path.join(root, clip.path));
      const changed = attack === 'hash' ? Buffer.from(raw) : Buffer.concat([raw, Buffer.alloc(1)]);
      if (attack === 'hash') changed[0] ^= 1;
      await page.route('**/' + clip.path, route => route.fulfill({status: 200, body: changed, contentType: 'audio/wav'}));
      try {
        await loaded(page, 'recv-nosferatu'); await page.locator('#prepare').click();
        await page.waitForFunction(() => /différente de la source/.test(document.getElementById('audio-status').textContent));
        assert.equal(await page.locator('#audio').getAttribute('src'), null);
        observed.push({attack, playerSourceAdmitted: false});
      } finally {await context.close();}
    }
    return observed;
  });
  await test('A stale audio response cannot replace a newer selection or disable its preparation', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    const clips = pack.audioReviewQueue.filter(item => item.candidateIdentityIds.includes('recv-nosferatu'));
    let release, seen; const started = new Promise(resolve => {seen = resolve;});
    const delayed = new Promise(resolve => {release = resolve;});
    await page.route('**/' + clips[0].path, async route => {seen(); await delayed; try {await route.fulfill({status: 503, body: 'late failure'});} catch {}});
    try {
      await loaded(page, 'recv-nosferatu'); await page.locator('#prepare').click(); await started;
      await page.selectOption('#clip', clips[1].clipId); await prepared(page); release();
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#clip').inputValue(), clips[1].clipId);
      assert.match(await page.locator('#audio-meta').innerText(), new RegExp(clips[1].sha256));
      assert.match(await page.locator('#audio-status').innerText(), /Taille et empreinte vérifiées/);
      assert.match(await page.locator('#audio').getAttribute('src'), /^blob:/);
      assert.equal(await page.locator('#prepare').isEnabled(), true);
      return {lateFailureIgnored: true, selectedSourceKept: clips[1].clipId};
    } finally {release(); await context.close();}
  });
  await test('Page exit cancels a pending setup and releases a prepared audio source; return never starts playback', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await loaded(page, 'recv-nosferatu'); await prepared(page);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
      assert.equal(await page.locator('#audio').getAttribute('src'), null);
      assert.equal(await page.locator('#prepare').isEnabled(), false);
      assert.equal(await page.locator('#audio').evaluate(node => node.paused), true);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      assert.equal(await page.locator('#prepare').isEnabled(), true);
      assert.equal(await page.locator('#audio').getAttribute('src'), null);
      await prepared(page);
      return {syntheticPageTransitions: true, sourceReleased: true, automaticPlaybackOnReturn: false};
    } finally {await context.close();}
  });
  await test('Initialization interrupted before the manifest returns restarts without duplicate choices or stale publication', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    let count = 0, release, first; const started = new Promise(resolve => {first = resolve;});
    const delayed = new Promise(resolve => {release = resolve;});
    await page.route('**/evidence/manifest.json', async route => {
      count++; if (count === 1) {first(); await delayed;}
      try {await route.fulfill({json: pack});} catch {}
    });
    try {
      await page.goto(base + routePath + '?id=recv-nosferatu'); await started;
      await page.evaluate(() => {window.dispatchEvent(new PageTransitionEvent('pagehide')); window.dispatchEvent(new PageTransitionEvent('pageshow'));});
      await page.locator('#identity:not([disabled])').waitFor(); release(); await page.waitForTimeout(100);
      assert.equal(await page.locator('#identity option').count(), 18);
      assert.equal(await page.locator('#identity').inputValue(), 'recv-nosferatu');
      assert.equal(await page.locator('#claims article').count(), 3);
      assert.equal(new URL(page.url()).searchParams.get('id'), 'recv-nosferatu');
      return {manifestResponses: count, syntheticPageTransitions: true, duplicateChoices: 0};
    } finally {release(); await context.close();}
  });
  await test('Real JSON dossier export preserves source hashes and unresolved listening/edition status', async () => {
    const context = await browser.newContext({acceptDownloads: true}), page = await context.newPage();
    try {
      await loaded(page, 'recv-nosferatu'); await page.locator('#export').focus();
      const downloadPromise = page.waitForEvent('download'); await page.keyboard.press('Enter'); const download = await downloadPromise;
      const file = await download.path(); const data = JSON.parse(fs.readFileSync(file));
      assert.equal(data.schema, 're.bow.evidence-dossier-export-r33/1'); assert.equal(data.entry.id, 'recv-nosferatu');
      assert.equal(data.candidateAudio.length, 5); assert.equal(data.sources.length, 2);
      assert.equal(data.independentListeningCertified, false); assert.equal(data.canonicalFidelityCertified, false);
      assert(data.candidateAudio.every(item => item.action === null && item.speaker === null));
      assert(data.sources.every(item => /^[a-f0-9]{64}$/.test(item.rawSha256)));
      return {trustedKeyboardDownload: true, candidates: 5, attributionsAdded: 0};
    } finally {await context.close();}
  });
  await test('Source text stays inert and invalid paths or promoted source fields cannot enter the actual page', async () => {
    const context = await browser.newContext(), page = await context.newPage(), changed = structuredClone(pack);
    changed.claims[0].excerpt = '<img src=x onerror="window.injectedR33=true">';
    await page.route('**/evidence/manifest.json', route => route.fulfill({json: changed}));
    try {
      await loaded(page); assert.match(await page.locator('#claims').innerText(), /<img src=x/);
      assert.equal(await page.locator('#claims img').count(), 0);
      assert.equal(await page.evaluate(() => Boolean(window.injectedR33)), false);
    } finally {await context.close();}
    for (const attack of ['path', 'promotion']) {
      const context = await browser.newContext(), page = await context.newPage(), changed = structuredClone(pack);
      if (attack === 'path') changed.sources[0].snapshot = 'https://untrusted.invalid/source';
      else changed.claims[0].gameplayAdmitted = true;
      await page.route('**/evidence/manifest.json', route => route.fulfill({json: changed}));
      try {
        await page.goto(base + routePath); await page.waitForFunction(() => /non qualifié/.test(document.getElementById('status').textContent));
        assert.equal(await page.locator('#claims article').count(), 0); assert.equal(await page.locator('#export').isEnabled(), false);
      } finally {await context.close();}
    }
    const missingContext = await browser.newContext(), missingPage = await missingContext.newPage();
    try {
      await missingPage.goto(base + routePath + '?id=re7-jack-baker-scissor');
      await missingPage.locator('#identity:not([disabled])').waitFor();
      assert.match(await missingPage.locator('#status').innerText(), /UID inconnu/);
      assert.equal(await missingPage.locator('#identity').inputValue(), '');
      assert.equal(await missingPage.locator('#claims article').count(), 0);
      assert.equal(await missingPage.locator('#export').isEnabled(), false);
      await missingPage.selectOption('#identity', 're6-ubistvo');
      assert.equal(await missingPage.locator('#export').isEnabled(), true);
      assert.equal(new URL(missingPage.url()).searchParams.get('id'), 're6-ubistvo');
    } finally {await missingContext.close();}
    return {markupExecuted: false, unsafeSourcePathRejected: true, sourcePromotionRejected: true, unknownUidFallback: false};
  });
  await test('Actual320px and1280px views retain keyboard focus and pass axe with text doubled', async () => {
    const axePath = [process.env.AXE_PATH, path.join(root, 'node_modules/axe-core/axe.min.js'), '/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js'].filter(Boolean).find(file => fs.existsSync(file));
    assert(axePath, 'axe-core@4.14.0 is required for this executed accessibility check');
    const observed = [];
    for (const width of [320, 1280]) {
      const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage();
      try {
        await loaded(page, 'recv-nosferatu');
        for (const font of ['100%', '200%']) {
          await page.evaluate(value => {document.documentElement.style.fontSize = value;}, font);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          const overflow = await page.locator('main').evaluate(main => [...main.querySelectorAll('section,select,button,fieldset')].filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.id || node.tagName));
          assert.deepEqual(overflow, []);
          await page.locator('#identity').focus(); assert.equal(await page.evaluate(() => document.activeElement.id), 'identity');
          observed.push({width, font, overflow: 0});
        }
        await page.addScriptTag({path: axePath}); const audit = await page.evaluate(() => axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
        assert.deepEqual(audit.violations.map(item => ({id: item.id, nodes: item.nodes.length})), []);
        await page.screenshot({path: path.join(out, 'source-reflow-' + width + '.png'), fullPage: false});
      } finally {await context.close();}
    }
    return {views: observed, axeViolations: 0, screenReaderOrHardwareCertified: false};
  });
} finally {await browser?.close(); server.kill('SIGTERM');}
const names = ['tests/browser-evidence-r33.mjs', packPath + '/index.html', packPath + '/query.js', packPath + '/page.js', packPath + '/style.css', packPath + '/manifest.json', 'modules/fidelity-r31/audio/manifest.json'];
const report = {schema: 're.bow.evidence-browser-r33/1', passed: checks.filter(x => x.pass).length,
  failed: checks.filter(x => !x.pass).length, checks,
  sourceFiles: names.map(file => {const bytes = fs.readFileSync(path.join(root, file)); return {path: file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')};}),
  scope: 'Actual source UI and published WAV/OGG decode, native keyboard actions, context comparisons, source-bound export, rejected corrupt bytes, asynchronous selection and synthetic page lifecycle, real320px/200%text and axe checks. No independent human listening, physical screen reader or native action attribution.'};
fs.writeFileSync(path.join(root, 'docs/R33_EVIDENCE_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
