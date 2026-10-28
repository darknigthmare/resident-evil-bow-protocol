/** Actual generated PNG admission, voluntary source variant, transport and shared-budget lifecycle. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadImage} from '@napi-rs/canvas';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,name))),hash=raw=>createHash('sha256').update(raw).digest('hex');
const runtimePath='modules/fidelity-r31/combat/generated-runtime.js',budgetPath='modules/fidelity-r31/performance/image-budget.js',adapterPath='modules/fidelity-r27/combat/adapter.js';
const runtimeSource=fs.readFileSync(path.join(root,runtimePath),'utf8'),budgetSource=fs.readFileSync(path.join(root,budgetPath),'utf8');
const manifest=read('modules/fidelity-r31/sprites/manifest.json'),variant=manifest.sameEditionVariants[0],checks=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate){for(let i=0;i<200;i++){if(predicate())return;await pause(10);}throw Error('Expected decoder state was not reached');}
function environment(options={}){
 const listeners=new Map(),requests=[],urls=new Set(),images=[];let heldDecodes=[];
 class Image{
  naturalWidth=0;naturalHeight=0;onload=null;onerror=null;_src='';
  set src(value){this._src=value;const complete=()=>fetch(value).then(response=>response.arrayBuffer()).then(bytes=>loadImage(Buffer.from(bytes))).then(decoded=>{if(this._src!==value)return;this.naturalWidth=options.wrongDimensions?2:decoded.width;this.naturalHeight=decoded.height;this.onload?.();}).catch(()=>this.onerror?.());if(options.holdDecodes)heldDecodes.push(complete);else complete();}
  get src(){return this._src;}
  removeAttribute(name){if(name==='src')this._src='';}
  constructor(){images.push(this);}
 }
 class LocalURL extends URL{}
 LocalURL.createObjectURL=blob=>{const url=URL.createObjectURL(blob);urls.add(url);return url;};LocalURL.revokeObjectURL=url=>{urls.delete(url);URL.revokeObjectURL(url);};
 const sandbox={URL:LocalURL,Blob,TextDecoder,AbortController,Uint8Array,Date,Image,crypto:webcrypto,queueMicrotask,
  RE_DATA:read('data/roster.json'),document:{currentScript:{src:'https://sprites.test/'+runtimePath},readyState:'loading',addEventListener(){}},
  location:{origin:options.opaque?'null':'https://sprites.test'},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
  addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(listener);},
  dispatchEvent(event){for(const listener of listeners.get(event.type)||[])listener(event);},
  fetch:async value=>{const url=new URL(value);requests.push(url.pathname);let raw=url.pathname.endsWith('/fidelity-r31/sprites/manifest.json')?Buffer.from(JSON.stringify(options.manifest||manifest)):fs.readFileSync(path.join(root,'.'+url.pathname));
   if(options.corruptImage&&url.pathname==='/'+variant.image){raw=Buffer.from(raw);raw[raw.length-1]^=1;}
   if(options.overflow&&url.pathname.endsWith('/fidelity-r31/sprites/manifest.json'))raw=Buffer.alloc(4*1024*1024+1);
   return new Response(raw,{headers:{'content-length':String(raw.length)}});}
 };
 vm.createContext(sandbox);if(options.budget!==false)vm.runInContext(budgetSource,sandbox);vm.runInContext(runtimeSource,sandbox);
 return{sandbox,runtime:sandbox.RE_COMBAT_SPRITES_R31,budget:sandbox.RE_IMAGE_BUDGET_R31,requests,urls,images,listeners,releaseDecodes:()=>{const pending=heldDecodes;heldDecodes=[];for(const run of pending)run();}};
}
const context=()=>({calls:[],save(){},restore(){},drawImage(...args){this.calls.push(args);}});
async function test(name,run){try{const evidence=await run();checks.push({name,pass:true,evidence});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
await test('All367 defaults and four API aliases preserve explicit voluntary source variants',async()=>{
 const e=environment();assert.equal(await e.runtime.ready(),true);assert.equal(e.runtime.list().length,367);
 for(const name of ['RE_COMBAT_SPRITES_R27','RE_COMBAT_SPRITES_R28','RE_COMBAT_SPRITES_R29'])assert.equal(e.sandbox[name],e.runtime);
 assert.equal(e.runtime.get(variant.id).sha256,variant.comparesAgainstSha256);assert.equal(e.runtime.selectedVariant(variant.id),null);
 assert.equal(e.runtime.availableVariants(variant.id).length,1);assert.equal(e.requests.filter(name=>name.endsWith('.png')).length,0);e.runtime.clear();
 return{defaults:367,initialImageRequests:0,newSourceVariantDefault:false};
});
await test('Opaque contexts and oversized manifests fail without generated-image requests',async()=>{
 const opaque=environment({opaque:true});assert.equal(opaque.runtime,undefined);assert.equal(opaque.requests.length,0);
 const e=environment({overflow:true});assert.equal(await e.runtime.ready(),false);assert.equal(e.requests.filter(name=>name.endsWith('.png')).length,0);e.runtime.clear();
 return{opaqueFetches:0,maximumManifestBytes:4*1024*1024};
});
await test('Two complete frontal presentations remain unavailable as side combat idle',async()=>{
 const e=environment();await e.runtime.ready();for(const id of manifest.replacements){assert.equal(e.runtime.get(id).fullBodyReviewed,true);assert.equal(e.runtime.draw(context(),id,{x:1,y:2,height:200,facing:'right',state:'idle'}).ok,false);}
 assert.equal(e.requests.filter(name=>name.endsWith('.png')).length,0);e.runtime.clear();return{sourcePresentations:2,extraCombatIdleStates:0};
});
await test('Explicit same-edition pose draws one actual right-side PNG without mirroring or animation',async()=>{
 const e=environment();await e.runtime.ready();assert.equal(e.runtime.selectVariant(variant.id,variant.variantId),true);await e.runtime.load(variant.id);const ctx=context();
 const result=e.runtime.draw(ctx,variant.id,{x:300,y:500,height:220,facing:'right',state:'idle'});assert.equal(result.ok,true);assert.equal(result.frames,1);assert.equal(result.mirrored,false);assert.equal(result.origin,'R31');assert.equal(ctx.calls.length,1);
 assert.equal(e.runtime.draw(ctx,variant.id,{x:300,y:500,height:220,facing:'left',state:'idle'}).ok,false);assert.equal(e.runtime.draw(ctx,variant.id,{x:300,y:500,height:220,facing:'right',state:'attack'}).ok,false);
 assert.equal(e.runtime.selectVariant('re0-stinger',variant.variantId),false);assert.equal(e.runtime.selectVariant(variant.id,null),true);assert.equal(e.runtime.get(variant.id).sha256,variant.comparesAgainstSha256);
 const budget=e.budget.state();assert(budget.owners.generated.pixels===variant.width*variant.height);e.runtime.clear();assert.equal(e.budget.state().reservedPixels,0);
 return{actualPng:variant.sha256,frames:1,missingSidesSynthesized:0};
});
await test('Wrong edition, changed target, automatic promotion or appearance gaps reject source variants',async()=>{
 for(const patch of [{admittedTargetEdition:false},{targetIncarnation:'wrong original game'},{comparesAgainstSha256:'0'.repeat(64)},{defaultAdmission:true},{knownAppearanceGaps:['unverified attachment']}]){
  const changed=structuredClone(manifest);Object.assign(changed.sameEditionVariants[0],patch);const e=environment({manifest:changed});assert.equal(await e.runtime.ready(),false);assert.equal(e.runtime.availableVariants(variant.id).length,0);e.runtime.clear();
 }
 return{independentVariantScopeGates:5};
});
await test('Corrupted PNGs are negative-cached as errors until an explicit retry',async()=>{
 const options={corruptImage:true},e=environment(options);await e.runtime.ready();e.runtime.selectVariant(variant.id,variant.variantId);
 await assert.rejects(e.runtime.load(variant.id),/SHA-256/);const count=e.requests.length;assert.equal(e.runtime.state().errors,1);
 await assert.rejects(e.runtime.load(variant.id),/SHA-256/);assert.equal(e.requests.length,count);assert.equal(e.urls.size,0);
 options.corruptImage=false;e.runtime.retry();await e.runtime.load(variant.id);assert.equal(e.runtime.state().errors,0);e.runtime.clear();return{failedBytesDrawn:0,explicitRecovery:true};
});
await test('Shared-budget pressure is deferred without a15second error cache or repeated downloads',async()=>{
 const e=environment();await e.runtime.ready();const hold=e.budget.reserve('fixture','all-pending',e.budget.state().limits.pixels,()=>{});assert(hold);
 e.runtime.selectVariant(variant.id,variant.variantId);await assert.rejects(e.runtime.load(variant.id),/Managed image pixel budget busy/);const requests=e.requests.length;
 assert.equal(e.runtime.state().errors,0);assert.equal(e.runtime.state().waitingBudget,1);assert.equal(e.urls.size,0);
 await assert.rejects(e.runtime.load(variant.id),/Managed image pixel budget busy/);assert.equal(e.requests.length,requests);
 hold.release();await until(()=>e.runtime.state().cached===1);assert.equal(e.runtime.state().waitingBudget,0);assert.equal(e.runtime.state().errors,0);e.runtime.clear();assert.equal(e.budget.state().reservedPixels,0);
 return{busyIsNotCorruption:true,repeatedBusyDownloads:0,automaticResumeOnReleasedCredit:true};
});
await test('Pagehide aborts pending image decode, releases shared credit and allows pageshow reload',async()=>{
 const options={holdDecodes:true},e=environment(options);await e.runtime.ready();e.runtime.selectVariant(variant.id,variant.variantId);
 const pending=e.runtime.load(variant.id);pending.catch(()=>{});await until(()=>e.images.length===1);assert(e.budget.state().pendingPixels>0);
 e.sandbox.dispatchEvent({type:'pagehide'});await assert.rejects(pending,/cancelled/);assert.equal(e.runtime.state().loading,0);assert.equal(e.images[0].src,'');assert.equal(e.images[0].onload,null);assert.equal(e.budget.state().reservedPixels,0);assert.equal(e.urls.size,0);
 options.holdDecodes=false;e.sandbox.dispatchEvent({type:'pageshow'});await e.runtime.load(variant.id);assert.equal(e.runtime.state().cached,1);e.runtime.clear();
 return{pendingDecodeCancelled:true,creditReleased:true,bfcacheReentry:true};
});
await test('The frozen original adapter changes presentation while preserving actor data and other-state fallback',async()=>{
 const e=environment();await e.runtime.ready();e.runtime.selectVariant(variant.id,variant.variantId);await e.runtime.load(variant.id);let fallbacks=0;
 e.sandbox.RE_RENDERER=Object.freeze({drawFighter(){fallbacks++;return'original-fallback';}});vm.runInContext(fs.readFileSync(path.join(root,adapterPath),'utf8'),e.sandbox);
 const actor=Object.freeze({state:'idle',life:100,onGround:true,hit:0,blockstun:0,vx:0}),fighter=Object.freeze({uid:variant.id,visual:Object.freeze({height:200})}),before=JSON.stringify(actor),ctx=context();
 assert.equal(e.sandbox.RE_RENDERER.drawFighter(ctx,fighter,200,400,1,1,{actor}),true);assert.equal(ctx.calls.length,1);
 assert.equal(e.sandbox.RE_RENDERER.drawFighter(ctx,fighter,200,400,1,1,{actor,attack:true}),'original-fallback');assert.equal(fallbacks,1);assert.equal(JSON.stringify(actor),before);e.runtime.clear();
 return{frozenActorUnchanged:true,originalAdapterByteSource:adapterPath,otherStateFallback:true};
});
const sourceNames=[runtimePath,budgetPath,adapterPath,'tests/verify-generated-sprites-r31.mjs','modules/fidelity-r31/sprites/manifest.json'];
const report={schema:'re.bow.generated-runtime-tests-r31/1',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks,sourceFiles:sourceNames.map(name=>({path:name,sha256:hash(fs.readFileSync(path.join(root,name)))})),scope:'ActualR31sourcebodyPNG byte transport/decoding, explicit same-edition static variant, unchanged legacy/defaults, real shared32Mpixelbroker and pendingdecode lifecycle. No native animation or physical-device certification.'};
fs.writeFileSync(path.join(root,'docs/R31_GENERATED_RUNTIME_TESTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
