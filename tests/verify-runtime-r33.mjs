/** Real PNG decoding and explicit edition/side choice. No synthetic asset qualification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto, createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadImage} from '@napi-rs/canvas';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimePath = 'modules/fidelity-r33/combat/generated-runtime.js';
const nativePath = 'modules/fidelity-r33/combat/native-runtime.js';
const adapterPath = 'modules/fidelity-r33/combat/generated-adapter.js';
const budgetPath = 'modules/fidelity-r31/performance/image-budget.js';
const manifestPath = 'modules/fidelity-r33/combat/manifest.json';
const indexPath = 'modules/fidelity-r33/combat/native-index.json';
const read = name => JSON.parse(fs.readFileSync(path.join(root, name)));
const hash = raw => createHash('sha256').update(raw).digest('hex');
const manifest = read(manifestPath), checks = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate) {for (let i = 0; i < 300; i++) {if (predicate()) return; await sleep(10);} throw Error('Expected decoder state was not reached');}
function environment(options = {}) {
  const listeners = new Map(), requests = [], urls = new Set(), images = [], held = [];
  class Image {
    naturalWidth = 0; naturalHeight = 0; onload = null; onerror = null; _src = '';
    constructor() {images.push(this);}
    set src(value) {
      this._src = value;
      const run = () => fetch(value).then(r => r.arrayBuffer()).then(raw => loadImage(Buffer.from(raw))).then(image => {
        if (this._src !== value) return;
        this.naturalWidth = image.width; this.naturalHeight = image.height; this.onload?.();
      }).catch(() => this.onerror?.());
      if (options.holdDecodes) held.push(run); else run();
    }
    get src() {return this._src;}
    removeAttribute(name) {if (name === 'src') this._src = '';}
  }
  class LocalURL extends URL {}
  LocalURL.createObjectURL = blob => {const value = URL.createObjectURL(blob); urls.add(value); return value;};
  LocalURL.revokeObjectURL = value => {urls.delete(value); URL.revokeObjectURL(value);};
  const sandbox = {URL: LocalURL, Blob, TextDecoder, AbortController, Uint8Array, Date, Image, crypto: webcrypto, queueMicrotask,
    RE_DATA: read('data/roster.json'), document: {currentScript: {src: 'https://assets.test/' + runtimePath}, readyState: 'loading', addEventListener() {}},
    location: {origin: options.opaque ? 'null' : 'https://assets.test'}, matchMedia: () => ({matches: false}),
    CustomEvent: class {constructor(type, init) {this.type = type; this.detail = init?.detail;}},
    addEventListener(type, fn) {if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn);},
    dispatchEvent(event) {for (const fn of listeners.get(event.type) || []) fn(event);},
    fetch: async (value, init = {}) => {
      const url = new URL(value), name = url.pathname.slice(1); requests.push(name);
      if (init.signal?.aborted) throw Error('Aborted');
      let raw = name === manifestPath ? Buffer.from(JSON.stringify(options.manifest || manifest)) : fs.readFileSync(path.join(root, name));
      if (options.corrupt === name) {raw = Buffer.from(raw); raw[raw.length - 1] ^= 1;}
      return new Response(raw, {headers: {'content-length': String(raw.length)}});
    }};
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync(path.join(root, budgetPath), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, runtimePath), 'utf8'), sandbox);
  if (options.native) {sandbox.document.currentScript.src = 'https://assets.test/' + nativePath; vm.runInContext(fs.readFileSync(path.join(root, nativePath), 'utf8'), sandbox);}
  return {sandbox, runtime: sandbox.RE_COMBAT_SPRITES_R33, native: sandbox.RE_NATIVE_SPRITES_R33,
    budget: sandbox.RE_IMAGE_BUDGET_R31, requests, urls, images, options,
    event(type) {sandbox.dispatchEvent({type});}, releaseDecodes() {for (const run of held.splice(0)) run();}};
}
const canvas = () => ({calls: [], save() {}, restore() {}, drawImage(...args) {this.calls.push(args);}});
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
const familyFor = (e, uid = 're2-zombie-dog') => {
  const value = e.runtime.availableVariants(uid).find(item => item.documentaryVariant);
  assert(value, 'A genuinely reviewed two-side source family is required'); return value;
};

await test('Preserved defaults stay lazy and all generated API aliases share the same bounded reader', async () => {
  const e = environment(); assert.equal(await e.runtime.ready(), true);
  assert.equal(e.runtime.list().length, 367); assert(e.runtime.sourceEditionVariants().length > 0);
  for (const name of ['RE_COMBAT_SPRITES_R27', 'RE_COMBAT_SPRITES_R28', 'RE_COMBAT_SPRITES_R29', 'RE_COMBAT_SPRITES_R31']) assert.equal(e.sandbox[name], e.runtime);
  for (const item of manifest.sprites) {assert.equal(e.runtime.get(item.id).sha256, item.sha256); assert.equal(e.runtime.selectedVariant(item.id), null);}
  assert.equal(e.requests.filter(name => name.endsWith('.png')).length, 0); e.runtime.clear();
  return {defaults: 367, defaultEditionPromotions: 0, initialPngRequests: 0};
});
await test('Each explicitly chosen direction decodes its own generated PNG without mirroring', async () => {
  const e = environment(); await e.runtime.ready(); const family = familyFor(e); assert.equal(e.runtime.selectVariant(family.id, family.variantId), true);
  const sides = [];
  for (const facing of ['right', 'left']) {
    const record = e.runtime.get(family.id, {facing}); assert.equal(record.sourceFacing, facing);
    assert.equal(record.admittedTargetEdition, false); await e.runtime.load(family.id, {facing});
    const ctx = canvas(), output = e.runtime.draw(ctx, family.id, {facing, state: 'idle', x: 300, y: 500, height: 180});
    assert.equal(output.ok, true); assert.equal(output.origin, 'R33'); assert.equal(output.mirrored, false); assert.equal(output.frames, 1); assert.equal(ctx.calls.length, 1);
    sides.push({facing, sha256: record.sha256, bytes: record.bytes, width: record.width, height: record.height});
  }
  assert.notEqual(sides[0].sha256, sides[1].sha256); assert.equal(e.runtime.selectVariant(family.id, null), true);
  assert.equal(e.runtime.get(family.id).sha256, manifest.sprites.find(item => item.id === family.id).sha256);
  e.runtime.clear(); assert.equal(e.budget.state().reservedPixels, 0); return {sides, nativeIdleClaimed: false};
});
await test('Contextual alligator and unassigned moth studies never become selectable combat presentations', async () => {
  const e = environment(); await e.runtime.ready();
  for (const uid of ['re2-giant-alligator', 're2-giant-moth']) {
    assert.equal(e.runtime.availableVariants(uid).filter(item => item.documentaryVariant).length, 0);
    const study = e.runtime.sourceEditionVariants().find(item => item.id === uid); assert(study); assert.equal(study.availableStates.length, 0);
    assert.equal(e.runtime.selectVariant(uid, study.variantFamilyId), false);
  }
  e.runtime.clear(); return {contextCombatPromotions: 0, unassignedActionPromotions: 0};
});
await test('Edition, target, duplicate-side, default-admission and family-identifier faults are rejected', async () => {
  const patches = [item => {item.defaultAdmission = true;}, item => {item.admittedTargetEdition = true;},
    item => {item.targetIncarnation = 'Other edition';}, item => {item.comparesAgainstSha256 = '0'.repeat(64);},
    item => {item.variantFamilyId = item.variantId;}];
  for (const patch of patches) {
    const changed = structuredClone(manifest); patch(changed.sourceEditionVariants[0]);
    const e = environment({manifest: changed}); assert.equal(await e.runtime.ready(), false); assert.equal(e.runtime.sourceEditionVariants().length, 0); e.runtime.clear();
  }
  const changed = structuredClone(manifest); changed.sourceEditionVariants.push({...changed.sourceEditionVariants[0], variantId: 'r33-duplicate-side-test'});
  const e = environment({manifest: changed}); assert.equal(await e.runtime.ready(), false); e.runtime.clear();
  return {heldInvalidContracts: patches.length + 1, faultyImagesRequested: 0};
});
await test('A shared-budget refusal preserves both pending directions and automatically resumes actual decodes', async () => {
  const e = environment(); await e.runtime.ready(); const family = familyFor(e); e.runtime.selectVariant(family.id, family.variantId);
  const hold = e.budget.reserve('qa-pressure', 'pending', 32 * 1024 * 1024, () => {}); assert(hold);
  const results = await Promise.allSettled(['left', 'right'].map(facing => e.runtime.load(family.id, {facing})));
  assert(results.every(item => item.status === 'rejected')); assert.equal(e.runtime.state().waitingBudget, 2); assert.equal(e.runtime.state().errors, 0);
  const start = performance.now(); hold.release(); await until(() => e.runtime.state().cached === 2);
  const recoveryMs = performance.now() - start; assert.equal(e.runtime.state().waitingBudget, 0); assert.equal(e.runtime.state().errors, 0);
  for (const facing of ['left', 'right']) assert.equal(e.runtime.draw(canvas(), family.id, {facing, x: 1, y: 200, height: 120}).ok, true);
  assert(e.budget.state().reservedPixels <= 32 * 1024 * 1024); e.runtime.clear(); return {recoveryMs, directionsRecovered: 2, errorBackoffRequired: false};
});
await test('Corruption is refused and a cancelled decoder releases credit before pageshow recovery', async () => {
  const e = environment(); await e.runtime.ready(); const family = familyFor(e); e.runtime.selectVariant(family.id, family.variantId);
  e.options.corrupt = e.runtime.get(family.id).image;
  await assert.rejects(e.runtime.load(family.id), /SHA-256/); assert.equal(e.runtime.state().errors, 1); assert.equal(e.urls.size, 0);
  e.options.corrupt = null; e.runtime.retry(); e.options.holdDecodes = true;
  const pending = e.runtime.load(family.id); const settled = Promise.allSettled([pending]); await until(() => e.budget.state().pending === 1);
  e.event('pagehide'); assert.equal((await settled)[0].status, 'rejected'); assert.equal(e.budget.state().reservedPixels, 0); assert.equal(e.urls.size, 0);
  e.options.holdDecodes = false; e.releaseDecodes(); e.event('pageshow'); await e.runtime.load(family.id); assert.equal(e.runtime.state().cached, 1); e.runtime.clear();
  return {corruptImagesDrawn: 0, pendingDecodeCancelled: true, resumedOnPageshow: true};
});
await test('The generated adapter fits the actual selected side and preserves every non-idle fallback and actor byte', async () => {
  const e = environment(); await e.runtime.ready(); const family = familyFor(e, 're3-zombie'); e.runtime.selectVariant(family.id, family.variantId);
  await e.runtime.load(family.id, {facing: 'left'}); let fallbacks = 0;
  e.sandbox.RE_RENDERER = Object.freeze({drawFighter() {fallbacks++; return 'source-fallback';}});
  vm.runInContext(fs.readFileSync(path.join(root, adapterPath), 'utf8'), e.sandbox);
  const actor = Object.freeze({state: 'idle', life: 100, onGround: true, hit: 0, blockstun: 0, vx: 0});
  const fighter = Object.freeze({uid: family.id, visual: Object.freeze({drawHeight: 225, maxDrawWidth: 130})});
  const before = JSON.stringify(actor), ctx = canvas(); assert.equal(e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 200, 400, -1, 1, {actor}), true);
  assert(ctx.calls[0][7] <= 130 + 1e-8);
  for (const state of ['attack', 'hit', 'guard', 'walk', 'knockdown']) assert.equal(e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 200, 400, -1, 1, {actor, presentationState: state}), 'source-fallback');
  assert.equal(fallbacks, 5); assert.equal(JSON.stringify(actor), before); e.runtime.clear(); return {side: 'left', maximumDrawWidth: 130, nonIdleFallbacks: 5, actorChanged: false};
});
await test('The composite native library adds source studies without admitting missing equipment or editions', async () => {
  const e = environment({native: true}); assert.equal(await e.native.ready(), true); assert.equal(await e.runtime.ready(), true);
  const extra = read('modules/fidelity-r33/native/manifest.json');
  for (const item of extra.entries.filter(item => item.kind === 'native-static-pose')) {
    assert(e.native.get(item.id)); assert.equal(e.native.resolve(item.subjectId, {state: 'idle', facing: item.sourceFacing}), null);
  }
  const item = extra.entries.find(item => item.kind === 'native-static-pose'); await e.native.preload(item.id, {count: 1});
  const result = e.native.render(canvas(), item.id, {x: 200, y: 400, height: 180}); assert.equal(result.ok, true); assert.equal(result.origin, 'R33-native');
  assert.equal(result.animated, false); e.native.clear(); e.runtime.clear(); return {newStudies: extra.entries.length, directStudyRender: true, defaultMissingEquipmentAdmissions: 0};
});
await test('The marine source loop needs a deliberate edition choice and retains its real timeline', async () => {
  const e = environment({native: true}); assert.equal(await e.native.ready(), true); await e.runtime.ready();
  const uid = 'rerev-sea-creeper'; assert.equal(e.native.resolve(uid, {facing: 'right'}), null);
  const family = e.native.availableVariants(uid).find(item => item.id.startsWith('r33-')); assert(family); assert.equal(e.native.selectVariant(uid, family.id), true);
  const item = e.native.resolve(uid, {facing: 'right'}); assert.equal(item.admittedTargetEdition, false); assert.equal(item.sourceActionCertified, false);
  assert(item.frames.length > 100 && item.sampleRate === 60); await e.native.preload(item.id, {count: 16});
  const first = e.native.render(canvas(), item.id, {x: 200, y: 400, height: 180, seconds: 0, respectReducedMotion: false});
  const next = e.native.render(canvas(), item.id, {x: 200, y: 400, height: 180, seconds: 0.1, respectReducedMotion: false});
  assert.equal(first.ok, true); assert.equal(next.ok, true); assert.notEqual(first.frame, next.frame); assert.equal(next.mirrored, false);
  assert.equal(e.native.resolve(uid, {facing: 'right', state: 'attack'}), null); assert.equal(e.native.selectVariant(uid, null), true);
  assert.equal(e.native.resolve(uid, {facing: 'right'}), null); e.native.clear(); e.runtime.clear();
  return {frames: item.frames.length, sampleRate: 60, changedFrame: next.frame, originalIdleCertified: false, variantHabitat: item.variantHabitat};
});
await test('Three source-rendered selection crops preserve identity coverage and all incomplete-body reservations', async () => {
  const now = read('modules/fidelity-r33/selection/manifest.json'), old = read('modules/fidelity-r30/selection/manifest.json');
  assert.equal(now.entries.length, 388); assert.deepEqual(now.missing, old.missing);
  const changed = now.entries.filter(item => item.provenance?.some(source => source.kind === 'r33-native-model-render'));
  assert.equal(changed.length, 3);
  for (const item of changed) {
    assert.equal(hash(fs.readFileSync(path.join(root, item.image))), item.sha256);
    assert.equal(item.sourceBodyCompleteCertified, false); assert.equal(item.targetEditionMatched, false);
    assert.equal(item.selectionOnly, true); assert.equal(item.combatAnimationAssigned, false); assert(item.sourceAppearanceGaps.length > 0);
    assert(item.crop.width > 0 && item.crop.x + item.crop.width <= item.width && item.crop.y + item.crop.height <= item.height);
  }
  return {sourceRenderedPortraits: 3, coveredIdentities: 388, exactMissingAvatar: now.missing.map(item => item.id), imageBytesEdited: false};
});
const names = [runtimePath, nativePath, adapterPath, 'modules/fidelity-r33/combat/native-adapter.js', budgetPath, manifestPath, indexPath, 'modules/fidelity-r33/selection/avatars.js',
  'modules/fidelity-r33/selection/manifest.json', 'modules/fidelity-r33/native/manifest.json', 'tests/verify-runtime-r33.mjs'];
const report = {schema: 're.bow.runtime-tests-r33/1', passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length,
  checks, sourceFiles: names.map(name => ({path: name, sha256: hash(fs.readFileSync(path.join(root, name)))})),
  scope: 'Actual delivered PNG bytes decoded with canvas; selected source editions and sides; held contexts/equipment/actions; shared image credits and cancellations. Marine source movement is voluntary and does not certify original idle or physical devices.'};
fs.writeFileSync(path.join(root, 'docs/R33_RUNTIME_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
