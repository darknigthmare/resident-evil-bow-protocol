/** Real R34 registry/media bytes; explicitly labelled contract and decoder-delay fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash, webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {loadImage} from '@napi-rs/canvas';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const preview = process.argv.includes('--preview'), checks = [], bound = new Map();
const runtimePath = 'modules/fidelity-r34/combat/generated-runtime.js', avatarPath = 'modules/fidelity-r34/selection/avatars.js';
const heldPath = 'modules/fidelity-r34/combat/held-presentation.js';
const manifestPath = 'modules/fidelity-r34/combat/manifest.json', avatarManifestPath = 'modules/fidelity-r34/selection/manifest.json';
const assetPath = 'modules/fidelity-r34/assets/manifest.json', budgetPath = 'modules/fidelity-r31/performance/image-budget.js';
const hash = data => createHash('sha256').update(data).digest('hex');
function bytes(name) {if (!bound.has(name)) bound.set(name, fs.readFileSync(path.join(root, name))); return bound.get(name);}
bytes('tests/verify-roster-runtime-r34.mjs');
const read = name => JSON.parse(bytes(name));
const sprites = read(manifestPath), avatars = read(avatarManifestPath), assets = read(assetPath), old = read('modules/fidelity-r33/combat/manifest.json');
const bodies = [...sprites.sprites, ...(sprites.historicalReplacements || [])].filter(row => row.generatedByR34);
const portraits = avatars.entries.filter(row => row.sourceKind === 'generated-portrait');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) {for (let i = 0; i < 400; i++) {if (fn()) return; await sleep(10);} throw Error('Expected asynchronous decoder state was not reached');}
async function test(name, run, bodyOnly = false) {
  if (bodyOnly && !bodies.length && preview) {checks.push({name, pass: null, skipped: 'No generated body has been produced; preview cannot prove body behavior.'}); console.log('SKIP ' + name); return;}
  try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
function environment(options = {}) {
  const listeners = new Map(), requests = [], urls = new Set(), held = [], images = [];
  class Image {
    naturalWidth = 0; naturalHeight = 0; _src = ''; onload = null; onerror = null;
    constructor() {images.push(this);}
    set src(value) {this._src = value; const run = () => fetch(value).then(response => response.arrayBuffer()).then(raw => loadImage(Buffer.from(raw))).then(image => {
      if (this._src !== value) return; this.naturalWidth = image.width; this.naturalHeight = image.height; this.onload?.();
    }).catch(() => this.onerror?.()); if (options.holdDecodes) held.push(run); else run();}
    get src() {return this._src;}
    removeAttribute(name) {if (name === 'src') this._src = '';}
  }
  class LocalURL extends URL {}
  LocalURL.createObjectURL = blob => {const value = URL.createObjectURL(blob); urls.add(value); return value;};
  LocalURL.revokeObjectURL = value => {urls.delete(value); URL.revokeObjectURL(value);};
  const sandbox = {URL: LocalURL, URLSearchParams, Blob, TextDecoder, AbortController, Uint8Array, Image, crypto: webcrypto, queueMicrotask,
    RE_DATA: read('data/roster.json'), location: new URL('https://assets.test/catalog-duel.html' + (options.query || '')),
    document: {currentScript: {src: 'https://assets.test/' + runtimePath}, readyState: 'loading', addEventListener() {}},
    CustomEvent: class {constructor(type, init) {this.type = type; this.detail = init?.detail;}},
    addEventListener(type, fn) {if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn);},
    dispatchEvent(event) {for (const fn of listeners.get(event.type) || []) fn(event);},
    fetch: async (value, init = {}) => {
      const name = new URL(value).pathname.slice(1); requests.push(name); if (init.signal?.aborted) throw Error('Aborted');
      if (options.holdManifest && name === manifestPath) await options.holdManifest;
      let raw = name === manifestPath && options.manifest ? Buffer.from(JSON.stringify(options.manifest)) : bytes(name);
      if (options.corrupt === name) {raw = Buffer.from(raw); raw[raw.length - 1] ^= 1;}
      return new Response(raw, {headers: {'content-length': String(raw.length)}});
    }};
  vm.createContext(sandbox); vm.runInContext(bytes(budgetPath).toString(), sandbox); vm.runInContext(bytes(runtimePath).toString(), sandbox);
  return {sandbox, runtime: sandbox.RE_COMBAT_SPRITES_R34, budget: sandbox.RE_IMAGE_BUDGET_R31, requests, urls, images, options,
    event: type => sandbox.dispatchEvent({type}), release: () => {for (const run of held.splice(0)) run();}};
}
const canvas = () => ({calls: [], save() {}, restore() {}, drawImage(...args) {this.calls.push(args);}});
function contractFixture() {
  const value = structuredClone(sprites), source = value.sprites.find(row => row.id === 're2-zombie-dog') || value.sprites[0];
  Object.assign(source, {image: 'modules/fidelity-r34/assets/generated/' + source.id + '/idle-right.png', width: portraits[0].width, height: portraits[0].height, bytes: portraits[0].bytes, sha256: portraits[0].sha256,
    bounds: {x: 0, y: 0, width: portraits[0].width, height: portraits[0].height}, pivot: {x: 627, y: 1254}, sourceFacing: 'right',
    canMirror: false, fullBodyVisible: true, fullBodyReviewed: true, completeBodyReferenceVerified: true, fightingPoseReviewed: true,
    reviewStatus: 'visually-reviewed', knownAppearanceGaps: [], availableStates: ['idle'], poseKind: 'neutral-base', scope: 'combatant-neutral-pose',
    canonicalFidelityCertified: false, generatedByR34: true, generatedBytesEdited: false, sourceKind: 'generated-whole-body-idle-pose', originalIdleAnimationCertified: false, admittedTargetEdition: true, targetEditionAdmitted: true, originalGameSprite: false,
    animationFrames: 1, animated: false});
  value.sameEditionVariants = value.sameEditionVariants.filter(row => row.id !== source.id);
  value.sourceEditionVariants = value.sourceEditionVariants.filter(row => row.id !== source.id);
  return {manifest: value, record: source};
}
await test('Actual generated portraits bind unchanged PNG sources and retain selection-only, edition and crop scope', async () => {
  assert(portraits.length > 0); const reviewed = new Map(assets.portraits.filter(row => row.defaultAdmission === true).map(row => [row.id, row]));
  for (const row of portraits) {
    const raw = bytes(row.image), image = await loadImage(raw), source = reviewed.get(row.id); assert(source);
    assert.equal(hash(raw), row.sha256); assert.equal(raw.length, row.bytes); assert.equal(image.width, row.width); assert.equal(image.height, row.height);
    assert.equal(row.sha256, source.sha256); assert.equal(row.generatedBytesEdited, false); assert.equal(row.portraitIdentityReviewed, true);
    assert.equal(row.targetEditionMatched, true); assert.equal(row.selectionOnly, true); assert.equal(row.combatAnimationAssigned, false);
    assert.equal(row.sourceBodyCompleteCertified, false); assert.equal(row.canonicalFidelityCertified, false);
    assert(row.crop.x >= 0 && row.crop.y >= 0 && row.crop.x + row.crop.width <= row.width && row.crop.y + row.crop.height <= row.height);
  }
  assert.equal(portraits.length, reviewed.size); return {actualPngsDecoded: portraits.length, sourcePixelsEdited: false, bodyCertification: false};
});
await test('The composite preserves older defaults except qualified R34 replacements and explicit source-edition holds', async () => {
  const actual = new Map(sprites.sprites.map(row => [row.id, row]));
  const holds = new Map((assets.retainedPresentationHolds || []).map(row => [row.id, row]));
  const held = old.sprites.filter(row => holds.has(row.id) && !actual.get(row.id)?.generatedByR34);
  assert.equal(actual.size, old.sprites.length - held.length);
  assert.deepEqual(sprites.retainedPresentationHolds || [], assets.retainedPresentationHolds || []);
  for (const before of old.sprites) {const now = actual.get(before.id);
    if (held.some(row => row.id === before.id)) {
      assert.equal(now, undefined); const hold = holds.get(before.id); assert(hold.reason); assert.equal(hash(bytes(hold.reference.path)), hold.reference.sha256);
      assert(!avatars.entries.some(row => row.id === before.id && row.sourceKind !== 'generated-portrait'), 'A held old portrait must not return as fallback.');
      continue;
    }
    assert(now); if (!now.generatedByR34) assert.deepEqual(now, before);
  }
  const historical = new Map(read('assets/sprites/bow/manifest.json').sprites.map(row => [row.id, row]));
  for (const row of bodies) {
    const source = assets.sprites.find(value => value.id === row.id && value.defaultAdmission === true); assert(source);
    const raw=bytes(row.image), image=await loadImage(raw); assert.equal(hash(raw),row.sha256); assert.equal(raw.length,row.bytes); assert.equal(image.width,row.width); assert.equal(image.height,row.height);
    assert.equal(row.sha256, source.sha256); assert.equal(row.fullBodyReviewed, true); assert.equal(row.completeBodyReferenceVerified, true); assert.equal(row.fightingPoseReviewed, true);
    assert.equal(row.fullBodyVisible, true); assert.equal(row.sourceFacing, 'right'); assert.equal(row.canMirror, false); assert.deepEqual(row.knownAppearanceGaps, []); assert.deepEqual(row.availableStates, ['idle']);
    assert.equal(row.animationFrames, 1); assert.equal(row.animated, false); assert.equal(row.canonicalFidelityCertified, false);
    if (historical.has(row.id)) assert.equal(row.replacesHistoricalSha256, historical.get(row.id).sha256);
  }
  return {publishedBaseSlots: old.sprites.length, retainedBaseSlots: actual.size, explicitSourceHolds: held.map(row => row.id), actualNewDefaults: bodies.length, historicalReplacements: sprites.historicalReplacements?.length || 0};
});
await test('A final proof contains at least one actual generated and reviewed R34 combat body', async () => {
  assert(bodies.length > 0, 'No actual R34 body yet; this is not a final combat-runtime proof.'); return {actualBodies: bodies.length};
}, true);
await test('The default resolver stays lazy, preserves current registry identity and all stable aliases', async () => {
  const e = environment(); assert.equal(await e.runtime.ready(), true); assert.equal(e.runtime.state().failed, false);
  for (const name of ['RE_COMBAT_SPRITES_R27', 'RE_COMBAT_SPRITES_R28', 'RE_COMBAT_SPRITES_R29', 'RE_COMBAT_SPRITES_R31', 'RE_COMBAT_SPRITES_R33']) assert.equal(e.sandbox[name], e.runtime);
  for (const row of sprites.sprites.concat(sprites.historicalReplacements || [])) assert.equal(e.runtime.get(row.id).sha256, row.sha256);
  assert.equal(e.requests.filter(name => name.endsWith('.png')).length, 0); e.runtime.clear();
  return {records: e.runtime.list().length, initialPngRequests: 0};
});
await test('New R34 defaults reject missing full-body reference, combat-pose, direction and appearance qualifications', async () => {
  const valid = contractFixture(), baseline = environment({manifest: valid.manifest}); assert.equal(await baseline.runtime.ready(), true, 'The deliberately synthetic valid contract must be accepted before its faults are tested.'); baseline.runtime.clear();
  const patches = [row => {row.fullBodyVisible = false;}, row => {row.completeBodyReferenceVerified = false;}, row => {row.fightingPoseReviewed = false;}, row => {row.fullBodyReviewed = false;},
    row => {row.sourceFacing = 'left';}, row => {row.knownAppearanceGaps = ['missing lower body'];}, row => {row.canMirror = true;}];
  const accepted = [];
  for (const [index, patch] of patches.entries()) {const fixture = contractFixture(); patch(fixture.record); const e = environment({manifest: fixture.manifest});
    if (await e.runtime.ready()) accepted.push(index); e.runtime.clear();}
  assert.deepEqual(accepted, [], 'A malformed R34 default entered the resolver'); return {malformedContractsRefused: patches.length, fixturesAreNewMediaEvidence: false};
});
await test('Historical presentation fails closed before qualification and keeps held media separate from a future qualified body', async () => {
  let release; const pending = new Promise(resolve => {release = resolve;}), e = environment({holdManifest: pending});
  assert.equal(e.runtime.presentationDecision('recv-mutated-steve').mode, 'source-unvalidated');
  assert.equal(e.runtime.presentationDecision('re1-tyrant').blockHistoricalFallback, true);
  release(); assert.equal(await e.runtime.ready(), true);
  const hold = sprites.retainedPresentationHolds[0]; assert(hold);
  for (const state of ['idle', 'attack', 'hit', 'guard', 'walk', 'jump', 'knockdown', 'intro', 'win']) for (const facing of ['left', 'right']) {
    assert.equal(e.runtime.presentationDecision(hold.id, {state, facing}).mode, 'held-source');
  }
  const retained = sprites.sprites.find(row => !row.generatedByR34); assert(retained);
  assert.equal(e.runtime.presentationDecision(retained.id).blockHistoricalFallback, false); e.runtime.clear();
  const future = structuredClone(sprites), body = future.sprites.find(row => row.generatedByR34) || future.historicalReplacements.find(row => row.generatedByR34);
  assert(body); future.retainedPresentationHolds.push({...hold, id: body.id});
  const qualified = environment({manifest: future}); assert.equal(await qualified.runtime.ready(), true);
  assert.equal(qualified.runtime.presentationDecision(body.id, {state: 'idle', facing: 'right'}).mode, 'qualified-r34');
  assert.equal(qualified.runtime.presentationDecision(body.id, {state: 'idle', facing: 'left'}).mode, 'held-source');
  assert.equal(qualified.runtime.presentationDecision(body.id, {state: 'attack', facing: 'right'}).mode, 'held-source'); qualified.runtime.clear();
  for (const patch of [value => {delete value.retainedPresentationHolds;}, value => {value.retainedPresentationHolds.push(value.retainedPresentationHolds[0]);}, value => {value.retainedPresentationHolds[0].reference.sha256 = 'invalid';}]) {
    const manifest = structuredClone(sprites); patch(manifest); const invalid = environment({manifest});
    assert.equal(await invalid.runtime.ready(), false); assert.equal(invalid.runtime.presentationDecision(body.id).mode, 'source-unvalidated'); invalid.runtime.clear();
  }
  const legacy = environment({query: '?dev=1&selection=direct'}); assert.equal(await legacy.runtime.ready(), true);
  assert.equal(legacy.runtime.presentationDecision(hold.id).blockHistoricalFallback, false); legacy.runtime.clear();
  return {pendingAndInvalidSourceFailClosed: true, heldStatesAndSides: 18, qualifiedFutureSideOnly: true, exactLegacyViewPreserved: true};
});
await test('The held-media boundary wraps every render entry and never delegates a blocked or loading qualified pose', async () => {
  const source = bytes(heldPath).toString(); let delegated = 0, drawn = 0, mode = 'source-unvalidated', ready = false;
  const original = () => {delegated++; return true;}, record = bodies[0]; assert(record);
  const sandbox = {URLSearchParams, location: new URL('https://assets.test/catalog-duel.html'), RE_DATA: {fighters: [{uid: record.id}]},
    RE_RENDERER: {drawFighter: original}, CQC55_ART: {drawFighter: original}, CQC_ACTORS_060: {draw: original}, CQC_ACTORS_059: {draw: original}, CQC_ACTORS_058: {draw: original},
    RE_COMBAT_SPRITES_R34: {presentationDecision: () => ({mode, blockHistoricalFallback: mode !== 'historical-allowed', record}), draw: () => {drawn++; return {ok: ready, reason: 'not-ready'};}}};
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  const ctx = {save() {}, restore() {}, translate() {}, scale() {}, fillRect() {}, strokeRect() {}, fillText() {}};
  const entries = [sandbox.RE_RENDERER.drawFighter, sandbox.CQC55_ART.drawFighter, ...['060', '059', '058'].map(value => sandbox['CQC_ACTORS_' + value].draw)];
  for (const draw of entries) draw(ctx, record.id, 100, 300); assert.equal(delegated, 0);
  mode = 'qualified-r34'; for (const draw of entries) draw(ctx, record.id, 100, 300); assert.equal(delegated, 0); assert.equal(drawn, 5);
  ready = true; for (const draw of entries) draw(ctx, record.id, 100, 300); assert.equal(delegated, 0);
  mode = 'historical-allowed'; for (const draw of entries) draw(ctx, record.id, 100, 300); assert.equal(delegated, 5);
  const state = sandbox.RE_HELD_PRESENTATION_R34.state(); assert.equal(state.markersDrawn, 10); assert.equal(state.qualifiedSpritesDrawn, 5); assert.equal(state.markerIsSprite, false);
  const legacy = {URLSearchParams, location: new URL('https://assets.test/?dev=1&selection=direct'), RE_RENDERER: {drawFighter: original}};
  vm.createContext(legacy); vm.runInContext(source, legacy); assert.equal(legacy.RE_RENDERER.drawFighter, original); assert.equal(legacy.RE_HELD_PRESENTATION_R34, undefined);
  return {wrappedEntries: entries.length, markerDraws: state.markersDrawn, qualifiedDraws: state.qualifiedSpritesDrawn, originalDelegations: delegated};
});
await test('An early boundary survives later real adapter installation and repeated tail mounts without exposing held media', async () => {
  let release; const pending = new Promise(resolve => {release = resolve;}), e = environment({holdManifest: pending});
  let originalDraws = 0;
  const original = () => {originalDraws++; return 'old-photo';};
  for (const [name, method] of [['RE_RENDERER','drawFighter'],['CQC55_ART','drawFighter'],['CQC_ACTORS_060','draw'],['CQC_ACTORS_059','draw'],['CQC_ACTORS_058','draw']]) e.sandbox[name] = {[method]: original};
  const ctx = {save() {}, restore() {}, translate() {}, scale() {}, fillRect() {}, strokeRect() {}, fillText() {}};
  const fighter = Object.freeze({uid: 'recv-mutated-steve'});
  vm.runInContext(bytes(heldPath).toString(), e.sandbox);
  e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 100, 300);
  assert.equal(originalDraws, 0); assert.equal(e.sandbox.RE_HELD_PRESENTATION_R34.state().markersDrawn, 1);
  vm.runInContext(bytes('modules/fidelity-r33/combat/generated-adapter.js').toString(), e.sandbox);
  const beforeTail = e.sandbox.RE_RENDERER.drawFighter;
  vm.runInContext(bytes(heldPath).toString(), e.sandbox);
  assert.notEqual(e.sandbox.RE_RENDERER.drawFighter, beforeTail);
  const afterTail = e.sandbox.RE_RENDERER.drawFighter, installed = e.sandbox.RE_HELD_PRESENTATION_R34.state();
  vm.runInContext(bytes(heldPath).toString(), e.sandbox);
  assert.equal(e.sandbox.RE_RENDERER.drawFighter, afterTail); assert.equal(e.sandbox.RE_HELD_PRESENTATION_R34.state().wrappersInstalled, installed.wrappersInstalled);
  release(); assert.equal(await e.runtime.ready(), true);
  for (const facing of [-1,1]) for (const presentationState of ['idle','attack']) e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 100, 300, facing, 1, {presentationState});
  assert.equal(originalDraws, 0); assert.equal(e.sandbox.RE_HELD_PRESENTATION_R34.state().installationPasses, 2); e.runtime.clear();
  return {earlyActualAdapterAndTail: true, repeatedMountIdempotent: true, oldPhotoDraws: originalDraws, installationPasses: installed.installationPasses};
});
await test('A real unheld R34 idle never falls back while decoding and qualified native choices retain priority', async () => {
  const body = bodies[0]; assert(body); const e = environment({holdDecodes: true}); await e.runtime.ready();
  let originalDraws = 0, nativeDraws = 0, nativeReady = false;
  e.sandbox.RE_RENDERER = {drawFighter() {originalDraws++; return 'old-photo';}};
  vm.runInContext(bytes('modules/fidelity-r33/combat/generated-adapter.js').toString(), e.sandbox);
  vm.runInContext(bytes(heldPath).toString(), e.sandbox);
  const ctx = {...canvas(), translate() {}, scale() {}, fillRect() {}, strokeRect() {}, fillText() {}};
  const fighter = Object.freeze({uid: body.id, visual: Object.freeze({drawHeight: 180})});
  assert.equal(e.runtime.presentationDecision(body.id, {state: 'idle', facing: 'right'}).mode, 'qualified-r34');
  e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 100, 300);
  await until(() => e.runtime.state().pending > 0); assert.equal(originalDraws, 0); assert.equal(e.sandbox.RE_HELD_PRESENTATION_R34.state().markersDrawn, 1);
  e.options.holdDecodes = false; e.release(); await until(() => e.runtime.state().cached === 1);
  e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 100, 300); assert.equal(originalDraws, 0);
  const nativeRecord = {...body, referenceBounds: body.bounds};
  e.sandbox.RE_NATIVE_SPRITES_R30 = {resolve: (uid, options) => uid === body.id && (options.state || 'idle') === 'idle' && options.facing !== -1 && options.facing !== 'left' ? nativeRecord : null,
    draw() {nativeDraws++; return {ok: nativeReady, reason: 'native-not-ready'};}};
  assert.equal(e.runtime.presentationDecision(body.id, {state: 'idle', facing: 'right'}).mode, 'qualified-native');
  e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 100, 300); assert.equal(originalDraws, 0);
  nativeReady = true; e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 100, 300);
  const result = e.sandbox.RE_HELD_PRESENTATION_R34.state();
  assert.equal(nativeDraws, 2); assert.equal(result.qualifiedNativeDraws, 1); assert.equal(result.qualifiedSpritesDrawn, 1); assert.equal(result.markersDrawn, 2);
  e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 100, 300, 1, 1, {presentationState: 'attack'}); assert.equal(originalDraws, 1);
  e.runtime.clear(); return {actualR34Id: body.id, actualPngSha256: body.sha256, pendingPhotoFallbacks: 0, nativePriorityContractFixture: true, actionFallbackPreserved: true};
});
await test('The builder derives visible-body scope only from all reviewed source qualifications and rejects opposite default direction', async () => {
  const exercise = [
    'import copy, importlib.util, json',
    'spec=importlib.util.spec_from_file_location("r34_builder", "scripts/build-roster-runtime-r34.py")',
    'module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)',
    'source=json.load(open("modules/fidelity-r34/assets/manifest.json"))["portraits"][0]',
    'source.update(fullBodyReviewed=True, completeBodyReferenceVerified=True, fightingPoseReviewed=True, sourceFacing="right", availableStates=["idle"], status="GENERATED", canonicalFidelityCertified=False, targetEditionMatched=True)',
    'valid=module.pose(source); assert valid["fullBodyVisible"] is True and valid["sourceKind"] == "generated-whole-body-idle-pose"',
    'patches=[{"fullBodyReviewed":False},{"completeBodyReferenceVerified":False},{"fightingPoseReviewed":False},{"sourceFacing":"left"},{"knownAppearanceGaps":["missing body"]},{"availableStates":["attack"]},{"targetEditionMatched":False}]',
    'for patch in patches:',
    ' row=copy.deepcopy(source); row.update(patch)',
    ' try: module.pose(row)',
    ' except (AssertionError,ValueError): continue',
    ' raise AssertionError("Builder accepted malformed contract: "+repr(patch))',
    'print(json.dumps({"syntheticSourceContractsOnly":True,"refused":len(patches),"sourceBytesWritten":False}))'
  ].join('\n');
  const result=spawnSync('python3',['-c',exercise],{cwd:root,encoding:'utf8'}); assert.equal(result.status,0,result.stderr); return JSON.parse(result.stdout);
});
await test('Historical replacements require the exact retained SHA and cannot create or duplicate a fighter', async () => {
  const original = read('assets/sprites/bow/manifest.json').sprites[0], fixture = contractFixture();
  const row = {...fixture.record, id: original.id, replacesHistoricalSha256: original.sha256};
  for (const patch of [item => {item.replacesHistoricalSha256 = '0'.repeat(64);}, item => {item.id = 'unlisted-r34-fighter';}, item => {item.completeBodyReferenceVerified = false;}]) {
    const manifest = structuredClone(sprites), item = structuredClone(row); patch(item); manifest.historicalReplacements = [item];
    const e = environment({manifest}); assert.equal(await e.runtime.ready(), false); e.runtime.clear();
  }
  const manifest = structuredClone(sprites); manifest.historicalReplacements = [row, row]; const e = environment({manifest}); assert.equal(await e.runtime.ready(), false); e.runtime.clear();
  return {invalidHistoricalReplacementsRefused: 4, syntheticContractsOnly: true};
});
await test('An actual new whole-body PNG draws one right-facing idle and keeps all action, side and actor fallbacks', async () => {
  assert(bodies.length); const body = bodies[0], e = environment(); await e.runtime.ready(); await e.runtime.load(body.id);
  const ctx = canvas(), result = e.runtime.draw(ctx, body.id, {state: 'idle', facing: 'right', x: 100, y: 300, height: 180});
  assert.equal(result.ok, true); assert.equal(result.origin, 'R34'); assert.equal(result.mirrored, false); assert.equal(result.frames, 1);
  for (const state of ['attack', 'hit', 'guard', 'walk', 'jump', 'crouch', 'knockdown']) assert.equal(e.runtime.draw(ctx, body.id, {state, facing: 'right'}).reason, 'state-not-produced');
  assert.equal(e.runtime.draw(ctx, body.id, {facing: 'left'}).reason, 'direction-not-produced'); assert.equal(ctx.calls.length, 1);
  let fallbacks = 0; e.sandbox.RE_RENDERER = Object.freeze({drawFighter() {fallbacks++; return 'native-fallback';}});
  vm.runInContext(bytes('modules/fidelity-r33/combat/generated-adapter.js').toString(), e.sandbox);
  const actor = Object.freeze({state: 'idle', life: 100, onGround: true, vx: 0, hit: 0}); const actorBefore = JSON.stringify(actor);
  const fighter = Object.freeze({uid: body.id, visual: Object.freeze({drawHeight: 200, maxDrawWidth: 160})});
  assert.equal(e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 100, 300, 1, 1, {actor}), true);
  for (const state of ['attack', 'hit', 'guard', 'walk', 'jump', 'knockdown']) assert.equal(e.sandbox.RE_RENDERER.drawFighter(ctx, fighter, 100, 300, 1, 1, {actor, presentationState: state}), 'native-fallback');
  assert.equal(JSON.stringify(actor), actorBefore); e.runtime.clear(); assert.equal(e.budget.state().reservedPixels, 0);
  return {id: body.id, actualSha256: body.sha256, frames: 1, actionFallbacks: fallbacks, actorChanged: false};
}, true);
await test('Actual optional source decoding recovers from credit pressure without changing its default or edition admission', async () => {
  const e = environment(); await e.runtime.ready(); const variant = e.runtime.availableVariants('re2-zombie-dog').find(row => row.documentaryVariant);
  assert(variant, 'The retained optional source family is needed for this decoder exercise.'); e.runtime.selectVariant(variant.id, variant.variantId);
  const hold = e.budget.reserve('qa-pressure', 'pending', 32 * 1024 * 1024, () => {}); assert(hold);
  await assert.rejects(e.runtime.load(variant.id), /budget busy/); assert.equal(e.runtime.state().errors, 0); assert.equal(e.runtime.state().waitingBudget, 1);
  hold.release(); await until(() => e.runtime.state().cached === 1); assert.equal(e.runtime.state().waitingBudget, 0);
  assert.equal(e.runtime.get(variant.id).admittedTargetEdition, false); e.runtime.selectVariant(variant.id, null);
  assert.equal(e.runtime.get(variant.id).sha256, sprites.sprites.find(row => row.id === variant.id).sha256); e.runtime.clear();
  return {actualRetainedSourcePng: true, creditRecovery: true, promotedDefault: false};
});
await test('Actual new body corruption, pending-decode cancellation and page restoration release all credits', async () => {
  assert(bodies.length); const body = bodies[0], e = environment(); await e.runtime.ready(); e.options.corrupt = body.image;
  await assert.rejects(e.runtime.load(body.id), /SHA-256/); assert.equal(e.urls.size, 0); assert.equal(e.budget.state().reservedPixels, 0);
  e.options.corrupt = null; e.runtime.retry(); e.options.holdDecodes = true; const load = e.runtime.load(body.id), settled = Promise.allSettled([load]);
  await until(() => e.budget.state().pending > 0); e.event('pagehide'); assert.equal((await settled)[0].status, 'rejected');
  assert.equal(e.urls.size, 0); assert.equal(e.budget.state().reservedPixels, 0); e.options.holdDecodes = false; e.release(); e.event('pageshow');
  await e.runtime.load(body.id); assert.equal(e.runtime.state().cached, 1); e.runtime.clear(); return {corruptionDrawn: false, cancelledCredits: 0, pageshowRecovered: true};
}, true);
await test('Only both explicit DEV parameters select the exact legacy registry', async () => {
  for (const query of ['', '?dev=1', '?selection=direct', '?dev=1&selection=direct']) {const e = environment({query}); await e.runtime.ready();
    const direct = query === '?dev=1&selection=direct'; assert(e.requests.includes(direct ? 'modules/fidelity-r33/combat/manifest.json' : manifestPath));
    if (direct) for (const row of old.sprites) assert.equal(e.runtime.get(row.id).sha256, row.sha256); e.runtime.clear();}
  return {explicitLegacyFixture: '?dev=1&selection=direct', legacyIsNewMediaProof: false};
});
for (const name of [avatarPath, heldPath, 'modules/fidelity-r34/evolutions/selection.js', 'scripts/build-roster-runtime-r34.py', 'tests/verify-roster-runtime-r34.mjs']) bytes(name);
const stale = [...bound].filter(([name, raw]) => hash(fs.readFileSync(path.join(root, name))) !== hash(raw)).map(([name]) => name);
if (!preview && stale.length) checks.push({name: 'Executed sources remain current', pass: false, error: stale.join(', ')});
const report = {schema: 're.bow.roster-runtime-tests-r34/1', preview, passed: checks.filter(row => row.pass === true).length, failed: checks.filter(row => row.pass === false).length,
  skipped: checks.filter(row => row.pass === null).length, checks, actualGeneratedPortraits: portraits.length, actualGeneratedBodies: bodies.length, staleSources: stale,
  sourceFiles: [...bound].map(([name, raw]) => ({path: name, bytes: raw.length, sha256: hash(raw)})),
  scope: 'Actual PNG bytes decoded by @napi-rs/canvas; current composite registry, lazy resolver, qualification faults, explicit historical and legacy contracts. Body-specific proof requires actual generated R34 body output. Synthetic contracts and delayed decoders are labelled fixtures; no original-game pixel, idle-cycle or global1:1 certification.'};
const target = preview ? 'qa-roster-runtime-r34-preview/node-report.json' : 'docs/R34_ROSTER_RUNTIME_TESTS.json';
fs.mkdirSync(path.dirname(path.join(root, target)), {recursive: true}); fs.writeFileSync(path.join(root, target), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed, skipped: report.skipped, preview, report: target})); if (report.failed) process.exitCode = 1;
