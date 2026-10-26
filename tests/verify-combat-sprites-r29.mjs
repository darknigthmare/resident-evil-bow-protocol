/** Generated-base-pose gates, byte verification, cache bounds and immutable actor integration. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto, createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadImage} from '@napi-rs/canvas';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const runtimeSource = fs.readFileSync(path.join(root, 'modules/fidelity-r29/combat/sprite-runtime.js'), 'utf8');
const adapterSource = fs.readFileSync(path.join(root, 'modules/fidelity-r27/combat/adapter.js'), 'utf8');
const manifest = read('modules/fidelity-r29/sprites/manifest.json');
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
    document: {currentScript: {src: 'https://sprite.test/modules/fidelity-r29/combat/sprite-runtime.js'}},
    location: {origin: options.opaque ? 'null' : 'https://sprite.test'},
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    dispatchEvent(event) { for (const listener of listeners.get(event.type) || []) listener(event); },
    fetch: async (value, init = {}) => {
      const url = new URL(value); requests.push(url.pathname);
      if (options.beforeFetch) await options.beforeFetch(url, init);
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      let bytes;
      if (url.pathname.endsWith('/fidelity-r29/sprites/manifest.json')) bytes = Buffer.from(JSON.stringify(options.manifest || fixture));
      else bytes = fs.readFileSync(path.join(root, '.' + url.pathname));
      if (options.corruptImage && url.pathname === '/' + current.image) { bytes=Buffer.from(bytes);bytes[bytes.length-1]^=1; }
      if (options.manifestBodyOverflow && url.pathname.endsWith('/fidelity-r29/sprites/manifest.json')) bytes = Buffer.concat([bytes, Buffer.alloc(4 * 1024 * 1024 + 1, 32)]);
      const length = url.pathname.endsWith('/fidelity-r29/sprites/manifest.json')
        ? options.manifestLength ?? (options.manifestBodyOverflow ? 0 : bytes.length) : bytes.length;
      return new Response(bytes, {headers: {'content-length': String(length)}});
    }
  };
  vm.createContext(sandbox); vm.runInContext(runtimeSource, sandbox);
  return {sandbox, runtime: sandbox.RE_COMBAT_SPRITES_R27, requests, urls, listeners};
}
const context = () => ({calls: [], save() {}, restore() {}, drawImage(...args) { this.calls.push(args); }});
await test('All363 active identities normalize with four legacy actors and three compatible API names',async()=>{
  const e=environment({manifest});assert.equal(await e.runtime.ready(),true);
  assert.equal(e.runtime,e.sandbox.RE_COMBAT_SPRITES_R28);assert.equal(e.runtime,e.sandbox.RE_COMBAT_SPRITES_R29);
  assert.equal(e.runtime.list().length,367);assert.equal(e.runtime.state().generated,363);
  for(const record of manifest.sprites){const actual=e.runtime.get(record.id);assert(actual,record.id);assert.equal(actual.sha256,record.sha256);assert.deepEqual(Array.from(actual.availableStates),record.availableStates);if(actual.knownAppearanceGaps.length)assert.equal(actual.availableStates.length,0,record.id);}
  for(const variant of manifest.documentaryVariants){assert.equal(e.runtime.get(variant.variantId),null);assert.notEqual(e.runtime.get(variant.id).image,variant.image);}
  e.runtime.clear();return{active:363,legacy:4,documentaryVariantsNotRegistered:manifest.documentaryVariants.length,aliasesIdentical:true};
});
await test('An actual admitted static idle draws only its produced side and verifies bytes first',async()=>{
  const e=environment({manifest});await e.runtime.ready();const record=e.runtime.get(current.id);await e.runtime.load(record.id);const ctx=context();
  const side=record.sourceFacing;assert.equal(e.runtime.draw(ctx,record.id,{x:200,y:400,height:200,facing:side}).ok,true);assert.equal(ctx.calls.length,1);
  assert.equal(e.runtime.draw(ctx,record.id,{x:200,y:400,height:200,facing:side==='left'?'right':'left'}).reason,'direction-not-produced');
  assert.equal(e.runtime.draw(ctx,record.id,{x:200,y:400,height:200,facing:side,state:'heavy'}).reason,'state-not-produced');e.runtime.clear();
  return{id:record.id,sha256:record.sha256,producedSide:side,mirrored:false};
});
await test('Alcina equipment gap and complete Ant context stay excluded despite neutral whole anatomy',async()=>{
  const e=environment({manifest});await e.runtime.ready();const ctx=context();const alcina=e.runtime.get('revillage-alcina-dimitrescu'),ant=e.runtime.get('recv-ant');
  assert.equal(alcina.fullBodyReviewed,true);assert.equal(alcina.poseKind,'neutral-base');assert(alcina.knownAppearanceGaps.length);
  assert.equal(e.runtime.draw(ctx,alcina.id,{x:200,y:400,height:200,facing:'left'}).reason,'appearance-not-complete');
  assert.equal(ant.fullBodyReviewed,true);assert.equal(ant.poseKind,'neutral-base');assert.equal(e.runtime.draw(ctx,ant.id,{x:200,y:400,height:200,facing:'left'}).reason,'contextual-illustration');
  assert.equal(ctx.calls.length,0);assert(!e.requests.includes('/'+alcina.image));assert(!e.requests.includes('/'+ant.image));e.runtime.clear();
  const legacy=environment({manifest});await legacy.runtime.ready();
  for(const uid of ['rerev-wall-blister','rerev-scagdead']){const record=legacy.runtime.get(uid),source=manifest.sprites.find(s=>s.id===uid);assert.equal(record.fullBodyReviewed,true);assert(record.knownAppearanceGaps.some(gap=>gap.includes('3DS (2012)')));assert.equal(record.availableStates.length,0);assert.equal(record.sha256,source.sha256);assert.equal(legacy.runtime.draw(ctx,uid,{x:200,y:400,height:200,facing:'right'}).reason,'appearance-not-complete');}
  assert.equal(ctx.calls.length,0);legacy.runtime.clear();
  return{wholeNeutralPoseDoesNotCertifyEquipment:true,contextActorCreated:false,unqualifiedPNGRequests:0,archivedPC2013BodiesRetainedWithEditionGap:2};
});
await test('Every actual R29 replacement decodes but its source bind presentation cannot become combat idle',async()=>{
  const e=environment({manifest});await e.runtime.ready();const ctx=context();assert(manifest.replacements.length>0);
  for(const uid of manifest.replacements){const record=e.runtime.get(uid);assert.equal(record.origin,'R29');assert.equal(record.fullBodyReviewed,true);await e.runtime.load(uid);const result=e.runtime.draw(ctx,uid,{x:200,y:400,height:200,facing:record.sourceFacing});assert.equal(result.ok,false,uid);assert(['appearance-not-complete','pose-not-neutral-base','contextual-illustration'].includes(result.reason),uid+': '+result.reason);}
  assert.equal(ctx.calls.length,0);assert(e.runtime.state().cached<=4);assert.equal(e.runtime.state().errors,0);e.runtime.clear();
  return{actualNewPNGs:manifest.replacements.length,onePoseOnly:true,newCombatStates:0};
});
await test('Documentary editions cannot be smuggled into active records even if flags are removed',async()=>{
  assert.equal(manifest.documentaryVariants.length,4);
  for(const removeFlags of [false,true]){const variant=structuredClone(manifest.documentaryVariants[0]);if(removeFlags){delete variant.admittedTargetEdition;delete variant.documentaryVariant;delete variant.targetEditionAdmitted;variant.scope='combatant-neutral-pose';}
    const hostile=structuredClone(manifest);hostile.sprites=hostile.sprites.map(record=>record.id===variant.id?variant:record);
    const e=environment({manifest:hostile});assert.equal(await e.runtime.ready(),false);assert.equal(e.runtime.state().failed,true);assert.match(e.runtime.state().message,/Documentary edition variants/);assert.equal(e.runtime.list().length,4);assert(!e.requests.some(path=>path.includes('/documentary-variants/')));e.runtime.clear();}
  return{explicitFlagsAndReservedPathRefused:true,targetSpritesReplaced:0};
});
await test('Corruption never becomes drawable and releases the untrusted Blob',async()=>{
  const e=environment({manifest,corruptImage:true});await e.runtime.ready();await assert.rejects(e.runtime.load(current.id),/SHA-256/);assert.equal(e.runtime.state().cached,0);assert.equal(e.urls.size,0);e.runtime.clear();return{corruptPNGRefused:true,blobLeaks:0};
});
await test('Initial pageshow and retry share one registry transaction despite documentary duplicate subject IDs',async()=>{
  const e=environment({manifest});const promises=[e.runtime.ready()];for(let i=0;i<4;i++){e.sandbox.dispatchEvent({type:'pageshow'});promises.push(e.runtime.retry());}await Promise.all(promises);
  assert.equal(e.runtime.state().loaded,true);assert.equal(e.runtime.state().failed,false);assert.equal(e.runtime.list().length,367);assert.equal(e.requests.filter(path=>path.endsWith('/fidelity-r29/sprites/manifest.json')).length,1);e.runtime.clear();return{concurrentLifecycleEvents:4,registryRequests:1,duplicateActors:0};
});
await test('Opaque historical replay frames do not install or fetch the R29 registry',async()=>{
  const e=environment({opaque:true});assert.equal(e.runtime,undefined);assert.equal(e.sandbox.RE_COMBAT_SPRITES_R29,undefined);assert.equal(e.requests.length,0);return{opaqueReplayPreserved:true,spriteFetches:0};
});
const paths=['tests/verify-combat-sprites-r29.mjs','modules/fidelity-r29/combat/sprite-runtime.js','modules/fidelity-r29/sprites/manifest.json'];
const report={schema:'re.bow.combat-sprite-tests-r29/1',passed:checks.filter(item=>item.pass).length,failed:checks.filter(item=>!item.pass).length,checks,
  inputs:paths.map(file=>({path:file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),scope:'Actual active PNG decode/draw, source edition and explicit appearance gates; no original-game cycles, world scales or global 1:1 certification.'};
fs.writeFileSync(path.join(root,'docs/R29_COMBAT_SPRITE_TESTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
