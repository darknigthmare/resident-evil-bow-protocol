/** Generated-base-pose gates, byte verification, cache bounds and immutable actor integration. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadImage} from '@napi-rs/canvas';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const runtimeSource = fs.readFileSync(path.join(root, 'modules/fidelity-r27/combat/sprite-runtime.js'), 'utf8');
const adapterSource = fs.readFileSync(path.join(root, 'modules/fidelity-r27/combat/adapter.js'), 'utf8');
const manifest = read('modules/fidelity-r27/sprites/manifest.json');
const real = manifest.sprites.find(item => item.id === 're1-cerberus');
assert(real, 'Import the actual re1-cerberus imagegen artifact before this suite.');
// This positive metadata fixture explicitly records the neutral stance visually observed in the real Cerberus PNG.
const current = {...JSON.parse(JSON.stringify(real)), poseKind: 'neutral-base', availableStates: ['idle']};
const fixture = {schema: 're.bow.generated-combat-sprites/1', sprites: [current]};
const checks = [];
async function test(name, run) {
  try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
function environment(options = {}) {
  const listeners = new Map(), requests = [], urls = new Set();
  class Image {
    naturalWidth = 0; naturalHeight = 0; onload = null; onerror = null; _src = '';
    set src(value) {
      this._src = value;
      fetch(value).then(response => response.arrayBuffer()).then(bytes => loadImage(Buffer.from(bytes))).then(image => {
        this.naturalWidth = options.wrongDimensions ? 2 : image.width;
        this.naturalHeight = image.height; this.onload?.();
      }).catch(() => this.onerror?.());
    }
    get src() { return this._src; }
    removeAttribute(name) { if (name === 'src') this._src = ''; }
  }
  class LocalURL extends URL {}
  LocalURL.createObjectURL = blob => { const value = URL.createObjectURL(blob); urls.add(value); return value; };
  LocalURL.revokeObjectURL = value => { urls.delete(value); URL.revokeObjectURL(value); };
  const sandbox = {
    URL: LocalURL, Blob, TextDecoder, AbortController, Uint8Array, Date,
    crypto: webcrypto, Image, RE_DATA: read('data/roster.json'),
    document: {currentScript: {src: 'https://sprite.test/modules/fidelity-r27/combat/sprite-runtime.js'}},
    location: {origin: options.opaque ? 'null' : 'https://sprite.test'},
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    dispatchEvent(event) { for (const listener of listeners.get(event.type) || []) listener(event); },
    fetch: async (value, init = {}) => {
      const url = new URL(value); requests.push(url.pathname);
      if (options.beforeFetch) await options.beforeFetch(url, init);
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      let bytes;
      if (url.pathname.endsWith('/fidelity-r27/sprites/manifest.json')) bytes = Buffer.from(JSON.stringify(options.manifest || fixture));
      else bytes = fs.readFileSync(path.join(root, '.' + url.pathname));
      if (options.corruptImage && url.pathname === '/' + current.image) bytes = Buffer.from('not the declared PNG');
      if (options.manifestBodyOverflow && url.pathname.endsWith('/fidelity-r27/sprites/manifest.json')) bytes = Buffer.concat([bytes, Buffer.alloc(4 * 1024 * 1024 + 1, 32)]);
      const length = url.pathname.endsWith('/fidelity-r27/sprites/manifest.json')
        ? options.manifestLength ?? (options.manifestBodyOverflow ? 0 : bytes.length) : bytes.length;
      return new Response(bytes, {headers: {'content-length': String(length)}});
    }
  };
  vm.createContext(sandbox); vm.runInContext(runtimeSource, sandbox);
  return {sandbox, runtime: sandbox.RE_COMBAT_SPRITES_R27, requests, urls, listeners};
}
const context = () => ({calls: [], save() {}, restore() {}, drawImage(...args) { this.calls.push(args); }});
await test('Actual generated Cerberus and four frozen R20 identities retain immutable metadata', async () => {
  const e = environment(); await e.runtime.ready();
  assert.equal(e.runtime.state().loaded, true);
  assert.equal(e.runtime.list().length, 5);
  assert.equal(e.runtime.get(current.id).sha256, current.sha256);
  assert.equal(e.runtime.get('not-a-catalogue-identity'), null);
  assert.throws(() => { e.runtime.get(current.id).availableStates.push('heavy'); }, {name: 'TypeError'});
  assert.throws(() => { e.runtime.get(current.id).bounds.height = 2; }, {name: 'TypeError'});
  e.runtime.clear();
  const all = environment({manifest}); await all.runtime.ready();
  assert.equal(all.runtime.state().loaded, true, all.runtime.state().message);
  assert.equal(all.runtime.state().generated, manifest.sprites.length);
  assert.equal(all.runtime.list().length, manifest.sprites.length + 4);
  for (const item of manifest.sprites) {
    const normalized = all.runtime.get(item.id); assert(normalized, item.id);
    assert.equal(normalized.poseKind, item.poseKind || 'unknown');
    assert.deepEqual(Array.from(normalized.availableStates), item.availableStates);
  }
  all.runtime.clear();
  return {actualGeneratedIdentity: current.id, actualHistoricalIdentities: 4, metadataFrozen: true,
    actualProducedMetadataNormalized: manifest.sprites.length, pendingSpritesNotSynthesized: manifest.pending.length};
});
await test('Actual PNG is SHA and dimension verified before an exact idle draw, without reflection', async () => {
  const e = environment(); await e.runtime.ready(); await e.runtime.load(current.id);
  const ctx = context(), record = e.runtime.get(current.id);
  const result = e.runtime.draw(ctx, current.id, {x: 200, y: 400, height: 200, facing: record.sourceFacing, state: 'idle'});
  assert.equal(result.ok, true); assert.equal(result.mirrored, false); assert.equal(result.frames, 1);
  assert.equal(ctx.calls.length, 1); assert.equal(ctx.calls[0][1], record.bounds.x);
  assert.equal(ctx.calls[0][3], record.bounds.width);
  const expectedScale = 200 / record.bounds.height;
  assert.equal(ctx.calls[0][5], 200 + (record.bounds.x - record.pivot.x) * expectedScale);
  assert.equal(e.runtime.state().canonicalFidelityCertified, false); e.runtime.clear(); assert.equal(e.urls.size, 0);
  return {bytes: current.bytes, sha256: current.sha256, oneFrame: true, noMirror: true};
});
await test('Attack, opposite side and incomplete-body metadata refuse draws without image requests', async () => {
  const e = environment(); await e.runtime.ready(); const ctx = context(), start = e.requests.length;
  assert.equal(e.runtime.draw(ctx, current.id, {state: 'heavy', facing: 'right'}).reason, 'state-not-produced');
  assert.equal(e.runtime.draw(ctx, current.id, {state: 'idle', facing: 'left'}).reason, 'direction-not-produced');
  assert.equal(e.requests.length, start); assert.equal(ctx.calls.length, 0); e.runtime.clear();
  const partial = environment({manifest: {...fixture, sprites: [{...current, fullBodyReviewed: false, availableStates: []}]}}); await partial.runtime.ready();
  assert.equal(partial.runtime.draw(context(), current.id, {state: 'idle', facing: 'right'}).reason, 'full-body-not-reviewed');
  partial.runtime.clear();
  return {unknownStatesSynthesized: 0, leftViewFabricated: false, partialBodyNotPromoted: true};
});
await test('Visual review remains an independent gate and front references never become right views', async () => {
  const e = environment({manifest: {...fixture, sprites: [{...current, reviewStatus: 'needs-visual-review', availableStates: []}]}}); await e.runtime.ready();
  await assert.rejects(e.runtime.load(current.id), /awaiting visual review/);
  assert.equal(e.runtime.draw(context(), current.id, {state: 'idle', facing: 'right'}).reason, 'visual-review-required');
  e.runtime.clear();
  const front = environment({manifest: {...fixture, sprites: [{...current, sourceFacing: 'front', availableStates: []}]}}); await front.runtime.ready();
  assert.equal(front.runtime.state().failed, false);
  assert.equal(front.runtime.get(current.id).sourceFacing, 'front');
  assert.equal(front.runtime.draw(context(), current.id, {state: 'idle', facing: 'right'}).reason, 'state-not-produced'); front.runtime.clear();
  const contextual = environment({manifest: {...fixture, sprites: [{...current, scope: 'context-encounter', availableStates: []}]}}); await contextual.runtime.ready();
  assert.equal(contextual.runtime.draw(context(), current.id, {state: 'idle', facing: 'right'}).reason, 'contextual-illustration'); contextual.runtime.clear();
  const bindPose = environment({manifest: {...fixture, sprites: [{...current, poseKind: 'source-bind-pose', availableStates: []}]}}); await bindPose.runtime.ready();
  assert.equal(bindPose.runtime.state().failed, false);
  assert.equal(bindPose.runtime.get(current.id).fullBodyReviewed, true);
  assert.equal(bindPose.runtime.get(current.id).sourceFacing, 'right');
  assert.equal(bindPose.runtime.draw(context(), current.id, {state: 'idle', facing: 'right'}).reason, 'pose-not-neutral-base');
  await bindPose.runtime.load(current.id); bindPose.runtime.clear();
  return {reviewStatusSeparate: true, sourceFacingPreserved: 'front', contextualIllustrationNotAnActor: true,
    wholeBodyRightBindPoseNotIdle: true, reviewedBindPoseStillLoadableForPresentation: true};
});
await test('Hostile or duplicate manifest data fails closed while frozen R20 remains available', async () => {
  for (const mutation of [
    {...fixture, sprites: [{...current, image: '../../outside.png'}]},
    {...fixture, sprites: [{...current, id: 'invented-new-identity'}]},
    {...fixture, sprites: [current, current]},
    {...fixture, sprites: [{...current, canonicalFidelityCertified: true}]},
    {...fixture, sprites: [{...current, poseKind: 'source-bind-pose', availableStates: ['idle']}]}
  ]) {
    const e = environment({manifest: mutation}); await e.runtime.ready();
    assert.equal(e.runtime.state().failed, true); assert.equal(e.runtime.get(current.id), null);
    assert.equal(e.runtime.get('re2r-tyrant').origin, 'R20'); e.runtime.clear();
  }
  for (const options of [{manifestLength: 4 * 1024 * 1024 + 1}, {manifestBodyOverflow: true}]) {
    const e = environment(options); await e.runtime.ready();
    assert.equal(e.runtime.state().failed, true); assert.equal(e.runtime.get(current.id), null);
    assert.equal(e.runtime.get('re2r-tyrant').origin, 'R20'); e.runtime.clear();
  }
  return {invalidManifestsRejected: 7, manifestBoundBytes: 4 * 1024 * 1024,
    overlargeHeaderRefused: true, oversizedStreamWithLyingHeaderRefused: true, historicalFallbackRetained: true};
});
await test('Corruption and unexpected decoded dimensions never become drawable and release Blobs', async () => {
  for (const options of [{corruptImage: true}, {wrongDimensions: true}]) {
    const e = environment(options); await e.runtime.ready(); await assert.rejects(e.runtime.load(current.id));
    assert.equal(e.runtime.state().cached, 0); assert.equal(e.urls.size, 0);
    assert.equal(e.runtime.draw(context(), current.id, {x: 1, y: 1, height: 100, facing: 'right', state: 'idle'}).ok, false);
    e.runtime.clear();
  }
  return {corruptedBytesRefused: true, decodedSizeRefused: true, retainedBlobs: 0};
});
await test('Concurrent requests share one decode and the actual five PNGs respect a four-image cache', async () => {
  const e = environment(); await e.runtime.ready();
  const before = e.requests.length;
  const [a, b] = await Promise.all([e.runtime.load(current.id), e.runtime.load(current.id)]);
  assert.equal(a, b); assert.equal(e.requests.length - before, 1);
  let peak = 0;
  for (const item of e.runtime.list()) { await e.runtime.load(item.id); peak = Math.max(peak, e.runtime.state().cached); }
  assert.equal(e.runtime.state().cached, 4); assert.equal(peak, 4); assert.equal(e.urls.size, 4);
  e.runtime.clear(); assert.equal(e.urls.size, 0);
  return {sharedConcurrentDecode: true, actualImagesDecoded: 5, maximumDecodedImages: peak};
});
await test('Page departure cancels pending images and opaque replay sandboxes perform no sprite work', async () => {
  let started, release;
  const waiting = new Promise(resolve => { started = resolve; });
  const e = environment({beforeFetch: async (url, init) => {
    if (url.pathname !== '/' + current.image) return;
    started(); await new Promise((resolve, reject) => { release = resolve; init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true}); });
  }});
  await e.runtime.ready(); const promise = e.runtime.load(current.id); await waiting;
  e.sandbox.dispatchEvent({type: 'pagehide'}); await assert.rejects(promise, /Aborted|cancelled/);
  assert.equal(e.runtime.state().active, false); assert.equal(e.runtime.state().cached, 0); assert.equal(e.urls.size, 0); release();
  e.sandbox.dispatchEvent({type: 'pageshow', persisted: true}); assert.equal(e.runtime.state().active, true);
  const opaque = environment({opaque: true}); assert.equal(opaque.runtime, undefined); assert.equal(opaque.requests.length, 0);
  return {pendingLoadAborted: true, cacheReleased: true, opaqueOriginNetworkRequests: 0};
});
await test('Actual renderer globals wrap reversibly and every non-idle actor delegates without state writes', async () => {
  const e = environment(); await e.runtime.ready(); await e.runtime.load(current.id);
  const fallback = [], old = Object.freeze({drawFighter(...args) { fallback.push(args); return 'original'; }, untouched: 'kept'});
  const actors = Object.freeze({draw: old.drawFighter, diagnostics() { return 'old-diagnostics'; }});
  e.sandbox.RE_RENDERER = old; e.sandbox.CQC55_ART = old;
  for (const name of ['CQC_ACTORS_060', 'CQC_ACTORS_059', 'CQC_ACTORS_058']) e.sandbox[name] = actors;
  const actor = Object.freeze({f: {uid: current.id}, state: 'idle', life: 10000, hit: 0, onGround: true, face: 1, vx: 0});
  const fighter = Object.freeze({uid: current.id, visual: Object.freeze({drawHeight: 120})});
  const snapshot = JSON.stringify(actor);
  vm.runInContext(adapterSource, e.sandbox);
  assert.equal(e.sandbox.RE_RENDERER.untouched, 'kept');
  assert.equal(e.sandbox.CQC_ACTORS_058.draw(context(), fighter, 200, 400, 1, 1, {actor}), true);
  assert.equal(e.sandbox.RE_COMBAT_SPRITE_ADAPTER_R27.state().generatedDraws, 1);
  for (const pose of [{attack: true}, {guard: true}, {hit: true}, {walk: true}, {crouch: true}, {jump: true},
    {knockdown: true}, {presentationState: 'intro'}, {animationState: 'matchWin'}, {moveSlot: 'heavy'}, {velocity: 2}]) {
    assert.equal(e.sandbox.RE_RENDERER.drawFighter(context(), fighter, 200, 400, 1, 1, {...pose, actor}), 'original');
  }
  assert.equal(JSON.stringify(actor), snapshot); assert.equal(fallback.length, 11);
  e.sandbox.RE_COMBAT_SPRITE_ADAPTER_R27.uninstall();
  assert.equal(e.sandbox.RE_RENDERER, old); assert.equal(e.sandbox.CQC_ACTORS_058, actors); e.runtime.clear();
  return {declaredIdleIntegrated: true, unsupportedPosesDelegated: 11, actorUnchanged: true, rendererRestored: true};
});
const report = {schema: 're.bow.combat-sprite-contract-r27/1', passed: checks.filter(item => item.pass).length,
  failed: checks.filter(item => !item.pass).length, checks,
  scope: 'Actual generated Cerberus PNG and four actual R20 files; immutable registry and strict idle/facing/full-body gates. No original-game animation or global fidelity certification.'};
fs.writeFileSync(path.join(root, 'docs/R27_COMBAT_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
if (report.failed) process.exitCode = 1;
