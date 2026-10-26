import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-dossier-additions-r28'); fs.mkdirSync(output, {recursive: true});
const indexPath = 'modules/fidelity-r28/dossier-additions.json', index = JSON.parse(fs.readFileSync(path.join(root, indexPath)));
const base = `http://127.0.0.1:${process.env.BOW_R28_DOSSIER_PORT || 5778}`;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: new URL(base).port}, stdio: 'ignore'});
const checks = [], startedAt = new Date().toISOString(); let browser;
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
async function ready(page, uid) {
  await page.goto(base + '/codex.html?id=' + encodeURIComponent(uid), {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(uid => window.RE_DOSSIER_ADDITIONS_R28?.state().loaded && RE_DOSSIER_ADDITIONS_R28.state().id === uid, uid);
}
try {
  for (let n = 0; n < 80; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 75)); }
  browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const width of [1280, 320]) await test('Exact revised body opens its R28 gallery while old sources remain at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await ready(page, 're1r-cerberus');
      const state = await page.evaluate(() => ({r28: RE_DOSSIER_ADDITIONS_R28.state(), retained: !!document.querySelector('script[src="modules/fidelity-r27/dossier-link.js"]'), text: document.getElementById('detailAdditionsR28').textContent,
        links: [...document.querySelectorAll('#detailAdditionsR28 a')].map(link => link.href), audio: document.querySelectorAll('audio[autoplay]').length}));
      assert.equal(state.r28.failed, false); assert.equal(state.r28.fullBody, true); assert.equal(state.r28.revisedBody, true); assert.equal(state.retained, true); assert.equal(state.audio, 0);
      assert(state.links.some(href => new URL(href).pathname.endsWith('/fidelity-r28/sprites/index.html') && new URL(href).searchParams.get('identity') === 're1r-cerberus'));
      assert.match(state.text, /aucun état d’attente/); assert.match(state.text, /équipement/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({path: path.join(output, 'dossier-body-' + width + '.png'), fullPage: false}); assert.deepEqual(errors, []); return state;
    } finally { await context.close(); }
  });
  await test('Licker retains an exact 301-clip publisher group and its R28 documentary route', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await ready(page, 're3r-licker'); const state = await page.evaluate(() => ({state: RE_DOSSIER_ADDITIONS_R28.state(), links: [...document.querySelectorAll('#detailAdditionsR28 a')].map(link => ({text: link.textContent, href: link.href}))}));
      assert.equal(state.state.assignedAudio, 301); assert.equal(state.state.candidateAudio, 0); assert.equal(state.state.canonical, 1);
      const audio = state.links.find(link => link.href.includes('/audio/')), canonical = state.links.find(link => link.href.includes('/canonical/'));
      assert(audio); assert.equal(new URL(audio.href).searchParams.get('identity'), 're3r-licker'); assert.equal(new URL(canonical.href).hash, '#re3r-licker');
      const detail = await context.newPage(); await detail.goto(canonical.href); await detail.waitForFunction(() => window.RE_CANONICAL_R28?.state().selected === 're3r-licker'); await detail.close();
      return {assignedClips: 301, canonicalClaims: 1, exactCanonicalViewerReached: true, autoplay: false};
    } finally { await context.close(); }
  });
  await test('Nemesis forms and the NE-alpha parasite keep candidate-only audio with explicit host limits', async () => {
    const page = await browser.newPage();
    try {
      const records = [];
      for (const [uid, expected] of [['re3r-nemesis', 1005], ['re3r-stage-2-nemesis', 1005], ['re3r-stage-3-nemesis', 1005], ['re3r-ne-alpha-parasite', 144]]) {
        await ready(page, uid); const value = await page.evaluate(() => ({...RE_DOSSIER_ADDITIONS_R28.state(), text: document.getElementById('detailAdditionsR28').textContent, href: [...document.querySelectorAll('#detailAdditionsR28 a')].find(link => link.href.includes('/audio/'))?.href}));
        assert.equal(value.assignedAudio, 0); assert.equal(value.candidateAudio, expected); assert.match(value.text, /candidates/); assert.match(value.text, /parasite isolé/); assert.equal(new URL(value.href).searchParams.get('identity'), uid); records.push({uid, candidateClips: expected, assignedClips: 0});
      }
      return {identities: records, candidateAssociationsAreNotDistinctFiles: true};
    } finally { await page.close(); }
  });
  await test('A delayed index binds the latest real Dossier selection and never restores the previous identity', async () => {
    const context = await browser.newContext(), page = await context.newPage(); let release, observed;
    const pending = new Promise(resolve => release = resolve), seen = new Promise(resolve => observed = resolve);
    await page.route('**/fidelity-r28/dossier-additions.json', async route => { observed(); await pending; await route.continue(); });
    try {
      await page.goto(base + '/codex.html?id=re3r-licker', {waitUntil: 'domcontentloaded'}); await seen;
      await page.click('#closeSpecimen'); await page.fill('#catalogSearch', 'Nemesis'); await page.locator('.specimen-card[data-id="re3r-nemesis"]').click();
      release(); await page.waitForFunction(() => window.RE_DOSSIER_ADDITIONS_R28?.state().loaded && RE_DOSSIER_ADDITIONS_R28.state().id === 're3r-nemesis');
      const value = await page.evaluate(() => ({state: RE_DOSSIER_ADDITIONS_R28.state(), links: [...document.querySelectorAll('#detailAdditionsR28 a')].map(link => link.href)}));
      assert.equal(value.state.assignedAudio, 0); assert.equal(value.state.candidateAudio, 1005); assert(value.links.every(link => !link.includes('re3r-licker'))); return {latestUid: value.state.id, delayedIndex: true, noStaleAttribution: true};
    } finally { release(); await context.close(); }
  });
  await test('A forged exact Nemesis attribution is refused while preserved Dossier data remain reachable', async () => {
    const context = await browser.newContext(), page = await context.newPage(), changed = structuredClone(index);
    changed.identities.find(row => row.id === 're3r-nemesis').assignedAudioClips = 1005;
    await page.route('**/fidelity-r28/dossier-additions.json', route => route.fulfill({status: 200, json: changed}));
    try {
      await ready(page, 're3r-nemesis'); const value = await page.evaluate(() => ({state: RE_DOSSIER_ADDITIONS_R28.state(), hidden: document.getElementById('detailAdditionsR28').hidden,
        name: document.getElementById('detailName').textContent, oldSources: document.getElementById('detailSources').querySelectorAll('a').length, oldScript: !!window.RE_DOSSIER_SPRITES_R27}));
      assert.equal(value.state.failed, true); assert.equal(value.hidden, true); assert(value.name.includes('Nemesis')); assert(value.oldSources > 0); assert.equal(value.oldScript, true); return {forgedExactAttributionRefused: true, previousSourcesPreserved: true};
    } finally { await context.close(); }
  });
} catch (error) { checks.push({name: 'suite setup', pass: false, error: error.stack}); console.error(error.stack); }
finally {
  const paths = ['codex.html', indexPath, 'modules/fidelity-r28/dossier-link.js', 'scripts/build-dossier-additions-r28.py', 'tests/browser-dossier-additions-r28.mjs'];
  const report = {schema: 're.bow.dossier-additions-browser-r28/1', startedAt, completedAt: new Date().toISOString(), passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length,
    checks, sourceFiles: paths.map(file => ({path: file, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')})), autoplay: false, candidateAudioPromoted: false};
  fs.writeFileSync(path.join(root, 'docs/R28_DOSSIER_BROWSER.json'), JSON.stringify(report, null, 2) + '\n'); await browser?.close(); server.kill(); if (report.failed) process.exitCode = 1;
}
