/** Admission/clock/transport tests. Positive eligibility flags below are fixtures, never delivered asset reviews. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto, createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadImage} from '@napi-rs/canvas';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = raw => createHash('sha256').update(raw).digest('hex');
const runtimePath = 'modules/fidelity-r31/combat/native-runtime.js', adapterPath = 'modules/fidelity-r31/combat/native-adapter.js';
const runtimeSource = fs.readFileSync(path.join(root, runtimePath), 'utf8'), adapterSource = fs.readFileSync(path.join(root, adapterPath), 'utf8');
const published = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r29/motion/manifest.json'))).entries[0];
const png = fs.readFileSync(path.join(root, 'modules/fidelity-r29/motion', published.frames[0].path));
const pngInfo = {width: 384, height: 384, bytes: png.length, sha256: hash(png)};
const bounds = published.frames[0].alphaBounds;
function pose(id = 'native-test-pose-right', changes = {}) {
  return {id, subjectId: 'rerev-ooze', label: 'TEST FIXTURE ONLY', sourceEdition: 'Synthetic eligibility fixture; no source admission',
    kind: 'native-static-pose', admittedTargetEdition: true, sourceFacing: 'right', canMirror: false,
    fullBodyReviewed: true, fightingPoseReviewed: true, actionIdentity: 'neutral-stance', actionVerified: false,
    continuityVerified: false, admittedCombatStates: ['idle'], canonicalFidelityCertified: false,
    originalGameFrames: false, knownAppearanceGaps: [], pivot: {x: 192, y: 350}, referenceBounds: bounds,
    frames: [{...pngInfo, path: 'modules/fidelity-r30/native/__fixture__/' + id + '.png', seconds: 0, bounds}], ...changes};
}
function sequence(changes = {}) {
  const item = pose('native-test-sequence-right', {kind: 'native-sequence', actionIdentity: 'idle', actionVerified: true,
    continuityVerified: true, sampleRate: 60, durationSeconds: 1, fullNativeDuration: true, ...changes});
  item.frames = Array.from({length: 60}, (_, index) => ({...pngInfo,
    path: 'modules/fidelity-r30/native/__fixture__/frame-' + index + '.png', seconds: index / 60, bounds}));
  return item;
}
function environment(options = {}) {
  const listeners = new Map(), requests = [], urls = new Set();
  const entries = options.entries || [pose()];
  const lotBytes = Buffer.from(JSON.stringify({schema: 're.bow.native-2d-lot-r30/1', release: 'R30', entries}));
  const indexBytes = Buffer.from(JSON.stringify({schema: 're.bow.native-2d-index-r30/1', release: 'R30', canonicalFidelityCertified: false,
    lots: [{path: 'modules/fidelity-r30/native/__fixture__/manifest.json', bytes: lotBytes.length, sha256: options.wrongLotHash ? '0'.repeat(64) : hash(lotBytes)}]}));
  class Image {
    naturalWidth = 0; naturalHeight = 0; onload = null; onerror = null;
    set src(value) {
      fetch(value).then(response => response.arrayBuffer()).then(bytes => loadImage(Buffer.from(bytes))).then(image => {
        this.naturalWidth = options.wrongDimensions ? 2 : image.width; this.naturalHeight = image.height; this.onload?.();
      }).catch(() => this.onerror?.());
    }
    removeAttribute() {}
  }
  class LocalURL extends URL {}
  LocalURL.createObjectURL = blob => {const value = URL.createObjectURL(blob); urls.add(value); return value;};
  LocalURL.revokeObjectURL = value => {urls.delete(value); URL.revokeObjectURL(value);};
  const oldAliases = Object.freeze({existingGeneratedRuntime: true});
  const sandbox = {URL: LocalURL, Blob, TextDecoder, AbortController, Uint8Array, Date, Image, crypto: webcrypto,
    RE_COMBAT_SPRITES_R27: oldAliases, RE_COMBAT_SPRITES_R28: oldAliases, RE_COMBAT_SPRITES_R29: oldAliases,
    document: {currentScript: {src: 'https://native.test/' + runtimePath}}, location: {origin: options.opaque ? 'null' : 'https://native.test'},
    matchMedia: () => ({matches: options.reducedMotion === true}),
    CustomEvent: class {constructor(type, init) {this.type = type; this.detail = init?.detail;}},
    addEventListener(type, listener) {if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener);},
    dispatchEvent(event) {for (const listener of listeners.get(event.type) || []) listener(event);},
    fetch: async (value, init = {}) => {
      const url = new URL(value); requests.push(url.pathname);
      if (init.signal?.aborted) throw Error('Aborted');
      let bytes = url.pathname.endsWith('/native/manifest.json') ? indexBytes : url.pathname.endsWith('/__fixture__/manifest.json') ? lotBytes : png;
      if (options.corruptImage && url.pathname.endsWith('.png')) {bytes = Buffer.from(bytes); bytes[bytes.length - 1] ^= 1;}
      if (options.overflow && url.pathname.endsWith('/native/manifest.json')) bytes = Buffer.alloc(65537);
      return new Response(bytes, {headers: {'content-length': String(bytes.length)}});
    }};
  vm.createContext(sandbox); vm.runInContext(runtimeSource, sandbox);
  return {runtime: sandbox.RE_NATIVE_SPRITES_R30, sandbox, requests, urls, listeners, oldAliases};
}
function context() {return {calls: [], save() {}, restore() {}, drawImage(...args) {this.calls.push(args);}};}
const checks = [];
async function test(name, run) {try {const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
await test('Opaque contexts do not fetch and R29 generated APIs remain unchanged', async () => {
  const opaque = environment({opaque: true}); assert.equal(opaque.runtime, undefined); assert.equal(opaque.requests.length, 0);
  const e = environment(); assert.equal(await e.runtime.ready(), true);
  for (const alias of ['RE_COMBAT_SPRITES_R27', 'RE_COMBAT_SPRITES_R28', 'RE_COMBAT_SPRITES_R29']) assert.equal(e.sandbox[alias], e.oldAliases);
  e.runtime.clear(); return {opaqueRequests: 0, generatedAliasesPreserved: 3};
});
await test('Index-to-lot SHA binding rejects changed manifests atomically', async () => {
  const e = environment({wrongLotHash: true}); assert.equal(await e.runtime.ready(), false); assert.equal(e.runtime.list().length, 0);
  assert.match(e.runtime.state().errors[0], /SHA-256/); assert.equal(e.urls.size, 0); e.runtime.clear(); return {changedLotRegistered: false};
});
await test('Bounded index transport refuses an oversized body', async () => {
  const e = environment({overflow: true}); assert.equal(await e.runtime.ready(), false); assert.equal(e.runtime.list().length, 0);
  assert.equal(e.requests.length, 1); return {maximumIndexBytes: 65536};
});
await test('Exact static neutral poses draw their actual produced side without claiming animation', async () => {
  const e = environment(); await e.runtime.ready(); const item = e.runtime.list()[0]; await e.runtime.preload(item.id);
  const ctx = context(), result = e.runtime.draw(ctx, item.subjectId, {x: 200, y: 400, height: 200, facing: 'right'});
  assert.equal(result.ok, true); assert.equal(result.animated, false); assert.equal(result.frames, 1); assert.equal(result.mirrored, false);
  assert.equal(e.runtime.draw(ctx, item.subjectId, {x: 200, y: 400, height: 200, facing: 'left'}).ok, false);
  assert.equal(ctx.calls.length, 1); e.runtime.clear(); return {syntheticPositiveAdmissionFixture: true, actualPNG: published.frames[0].sha256, idleAnimationClaimed: false};
});
await test('Bind poses, context poses, appearance gaps and documentary editions cannot silently become combat', async () => {
  for (const changes of [{actionIdentity: 'unassigned'}, {fightingPoseReviewed: false}, {fullBodyReviewed: false},
    {knownAppearanceGaps: ['Source equipment unavailable']}, {admittedTargetEdition: false}, {sourceFacing: 'front'}]) {
    const e = environment({entries: [pose('native-held', changes)]}); assert.equal(await e.runtime.ready(), true);
    assert.equal(e.runtime.resolve('rerev-ooze'), null); assert.equal(e.requests.filter(value => value.endsWith('.png')).length, 0); e.runtime.clear();
  }
  return {independentAdmissionGates: 6, rejectedPNGsDownloaded: 0};
});
await test('Smooth source scenes remain studies until action and complete-loop proofs are present', async () => {
  for (const changes of [{actionIdentity: 'unassigned'}, {actionVerified: false}, {continuityVerified: false}, {fullNativeDuration: false}, {sampleRate: 15}]) {
    const item = sequence(changes); if (changes.sampleRate) item.frames.forEach((frame, i) => frame.seconds = i / 60);
    const e = environment({entries: [item]}); assert.equal(await e.runtime.ready(), true); assert.equal(e.runtime.resolve(item.subjectId), null); e.runtime.clear();
  }
  return {sequenceAdmissionGates: 5, sparseScenesPromoted: 0};
});
await test('Native frame choice follows deterministic combat seconds and never wall clock', async () => {
  const item = sequence(), e = environment({entries: [item]}); await e.runtime.ready(); await e.runtime.preload(item.id, {frame: 15, count: 1});
  const ctx = context();
  assert.equal(e.runtime.draw(ctx, item.subjectId, {x: 0, y: 400, height: 200}).reason, 'deterministic-native-time-required');
  const a = e.runtime.draw(ctx, item.subjectId, {x: 0, y: 400, height: 200, seconds: .25});
  const b = e.runtime.draw(ctx, item.subjectId, {x: 0, y: 400, height: 200, seconds: 1.25});
  assert.equal(a.frame, 15); assert.equal(b.frame, 15); assert.equal(a.animated, true); e.runtime.clear();
  return {seconds: [.25, 1.25], frame: 15, syntheticEligibilityFixtureOnly: true};
});
await test('Reduced motion freezes native playback while explicit preview seeks remain available', async () => {
  const item = sequence(), e = environment({entries: [item], reducedMotion: true}); await e.runtime.ready(); await e.runtime.preload(item.id, {count: 32});
  const options = {x: 0, y: 400, height: 200, seconds: .25};
  assert.equal(e.runtime.draw(context(), item.subjectId, options).frame, 0);
  assert.equal(e.runtime.render(context(), item.id, {...options, respectReducedMotion: false}).frame, 15); e.runtime.clear();
  return {combatFrame: 0, explicitPreviewFrame: 15};
});
await test('Observed neutral source variants require explicit per-UID opt-in and never certify source semantics', async () => {
  const item = sequence({admittedTargetEdition: false, admittedCombatStates: [], actionIdentity: 'observed-neutral-loop', actionVerified: false,
    selectablePresentationVariant: true, variantFamilyId: 'rerev-ooze-pc-neutral', variantCombatStates: ['idle'], observedNeutralLoopReviewed: true, sourceActionCertified: false});
  const e = environment({entries: [item]}); await e.runtime.ready(); assert.equal(e.runtime.resolve(item.subjectId), null);
  assert.equal(e.runtime.selectVariant(item.subjectId, 'unknown-variant'), false);
  assert.equal(e.runtime.selectVariant(item.subjectId, item.variantFamilyId), true);
  assert.equal(e.runtime.resolve(item.subjectId).id, item.id); await e.runtime.preload(item.id, {count: 1});
  const result = e.runtime.draw(context(), item.subjectId, {x: 0, y: 400, height: 200, seconds: 0});
  assert.equal(result.presentationVariant, true); assert.equal(result.sourceActionCertified, false);
  assert.equal(e.runtime.selectVariant(item.subjectId, null), true); assert.equal(e.runtime.resolve(item.subjectId), null); e.runtime.clear();
  return {defaultPromotion: false, optionalObservedLoop: true, originalGameActionCertified: false, persistedSettings: 0};
});
await test('Byte corruption and decoder dimension changes cannot draw a native image', async () => {
  for (const options of [{corruptImage: true}, {wrongDimensions: true}]) {
    const e = environment(options); await e.runtime.ready(); await assert.rejects(e.runtime.preload('native-test-pose-right'));
    assert.equal(e.runtime.draw(context(), 'rerev-ooze', {x: 0, y: 400, height: 200}).ok, false);
    assert.equal(e.runtime.state().errorsRemembered, 1); e.runtime.clear(); assert.equal(e.urls.size, 0);
  }
  return {corruptPNGDrawn: false, wrongDimensionsDrawn: false};
});
await test('A rolling decoded cache stays bounded and pagehide revokes all blobs', async () => {
  const entries = Array.from({length: 40}, (_, i) => pose('native-cache-' + i)), e = environment({entries}); await e.runtime.ready();
  for (const item of entries) await e.runtime.preload(item.id, {count: 1});
  const actual = e.runtime.state(); assert(actual.cached <= actual.limits.decodedImages); assert(actual.decodedPixels <= actual.limits.decodedPixels);
  e.sandbox.dispatchEvent({type: 'pagehide'}); assert.equal(e.urls.size, 0); assert.equal(e.runtime.state().cached, 0); assert.equal(e.runtime.state().active, false);
  e.sandbox.dispatchEvent({type: 'pageshow'}); assert.equal(e.runtime.state().active, true); e.runtime.clear();
  return {loadedImages: 40, maximumCached: actual.cached, maximumPixels: actual.decodedPixels, liveURLsAfterHide: 0};
});
await test('The additive adapter keeps actor/replay state untouched and restores the prior renderer', async () => {
  const e = environment(), calls = []; await e.runtime.ready(); await e.runtime.preload('native-test-pose-right');
  const original = (...args) => {calls.push(args); return 'fallback';};
  e.sandbox.RE_RENDERER = Object.freeze({drawFighter: original}); e.sandbox.CQC_ACTORS_060 = Object.freeze({draw: original});
  vm.runInContext(adapterSource, e.sandbox);
  const fighter = Object.freeze({uid: 'rerev-ooze', visual: Object.freeze({height: 200})});
  const actor = Object.freeze({state: 'idle', life: 100, vx: 0, onGround: true, f: fighter});
  const before = JSON.stringify(actor); assert.equal(e.sandbox.RE_RENDERER.drawFighter(context(), fighter, 200, 400, 1, 1, {actor, time: .25}), true);
  assert.equal(e.sandbox.RE_RENDERER.drawFighter(context(), fighter, 200, 400, 1, 1, {actor, attack: true, time: .25}), 'fallback');
  assert.equal(JSON.stringify(actor), before); assert.equal(calls.length, 1); assert.equal(e.sandbox.RE_NATIVE_ADAPTER_R30.state().nativeStaticDraws, 1);
  e.sandbox.RE_NATIVE_ADAPTER_R30.uninstall(); assert.equal(e.sandbox.RE_RENDERER.drawFighter, original); e.runtime.clear();
  return {frozenActorPreserved: true, nonidleFallbacks: 1, priorRendererRestored: true};
});
await test('The adapter honors the existing main-engine reduceMotion spelling as well as reducedMotion', async () => {
  const item = sequence(), e = environment({entries: [item]}); await e.runtime.ready(); await e.runtime.preload(item.id, {count: 32});
  const original = () => false; e.sandbox.RE_RENDERER = Object.freeze({drawFighter: original}); vm.runInContext(adapterSource, e.sandbox);
  const fighter = Object.freeze({uid: item.subjectId, visual: Object.freeze({height: 200})});
  const ctx = context(), actor = Object.freeze({state: 'idle', life: 100, onGround: true, vx: 0, f: fighter});
  const firstImage = (await e.runtime.preload(item.id, {frame: 0, count: 1}))[0].image;
  for (const setting of [{reduceMotion: true}, {reducedMotion: true}]) {
    e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 200, 400, 1, 1, {actor, time: .25, ...setting});
    assert.equal(ctx.calls.at(-1)[0], firstImage, 'The renderer must draw the actual decoded first frame for both preference spellings.');
  }
  // Rendering each spelling must reuse the decoded first frame, not the animated fifteenth.
  const actual = e.runtime.render(context(), item.id, {x: 0, y: 400, height: 200, seconds: .25, reducedMotion: true});
  assert.equal(actual.frame, 0); e.runtime.clear(); return {legacySetting: 'reduceMotion', currentSetting: 'reducedMotion', frozenNativeFrame: 0};
});
const report = {schema: 're.bow.native-runtime-tests-r31/1', observedAt: new Date().toISOString(),
  fixtureScope: 'Synthetic admission and timeline metadata exercise runtime gates against actual retained PNG bytes. Fixtures are not asset reviews, original-game idles, or delivered animations.',
  inputs: [runtimePath, adapterPath, 'tests/verify-native-runtime-r31.mjs'].map(pathValue => ({path: pathValue, sha256: hash(fs.readFileSync(path.join(root, pathValue)))})),
  total: checks.length, passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks};
fs.writeFileSync(path.join(root, 'docs/R31_NATIVE_RUNTIME_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
if (report.failed) process.exitCode = 1;
