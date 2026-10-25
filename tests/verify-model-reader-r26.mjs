import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {verifiedArchive,MAX_ARCHIVE_BYTES} from '../modules/fidelity-r26/models/bounded-archive.js';

import {positionURL, requestedPosition} from '../modules/fidelity-r26/models/position-reference.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=new URL('https://source.example/modules/fidelity-r26/motion/'),allowed=new URL('https://source.example/modules/');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),checks=[];
async function test(name,run){try{const detail=await run();checks.push({name,pass:true,detail});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:String(error.stack)});console.error('FAIL '+name+': '+error.message);}}
const small=new TextEncoder().encode('original published archive bytes'),record={path:'source/original.zip',bytes:small.length,sha256:digest(small)};
await test('Small original archives retain the unchanged R24 length, hash and path guards',async()=>{
 const result=await verifiedArchive(record,base,allowed,undefined,async url=>{assert.equal(url.href,new URL(record.path,base).href);return new Response(small);});assert.deepEqual(result,small);
 await assert.rejects(()=>verifiedArchive({...record,sha256:'0'.repeat(64)},base,allowed,undefined,async()=>new Response(small)),/octets/);
 return {legacyLimitUnchanged:40*1024*1024};
});
await test('Oversized archive declarations and traversal are refused before any network call',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return new Response(small);};
 for(const bad of [{...record,bytes:MAX_ARCHIVE_BYTES+1},{...record,path:'../escape.zip'},{...record,path:'https://untrusted.example/archive.zip'}])await assert.rejects(()=>verifiedArchive(bad,base,allowed,undefined,fetcher));
 assert.equal(calls,0);return {maximumBytes:MAX_ARCHIVE_BYTES,calls};
});
await test('A large stream ending early or exceeding its declaration is refused and cancelled',async()=>{
 const declared={...record,bytes:40*1024*1024+1};
 await assert.rejects(()=>verifiedArchive(declared,base,allowed,undefined,async()=>new Response(small)),/Taille/);
 let cancelled=false;const chunk=new Uint8Array(1024*1024);
 const stream=new ReadableStream({pull(controller){controller.enqueue(chunk);},cancel(){cancelled=true;}});
 await assert.rejects(()=>verifiedArchive(declared,base,allowed,undefined,async()=>new Response(stream)),/Taille/);assert.equal(cancelled,true);
 return {truncatedRefused:true,overrunCancelled:true};
});
await test('A complete original-sized stream above 40 MiB is accepted only with its exact SHA-256',async()=>{
 const chunk=new Uint8Array(1024*1024);for(let n=0;n<chunk.length;n++)chunk[n]=n%251;
 const chunks=41,hasher=crypto.createHash('sha256');for(let n=0;n<chunks;n++)hasher.update(chunk);
 const sha256=hasher.digest('hex'),large={...record,bytes:chunk.length*chunks,sha256};
 function response(){let sent=0;return new Response(new ReadableStream({pull(controller){if(sent++<chunks)controller.enqueue(chunk);else controller.close();}}));}
 const bytes=await verifiedArchive(large,base,allowed,undefined,async()=>response());assert.equal(bytes.length,large.bytes);assert.equal(digest(bytes),sha256);
 await assert.rejects(()=>verifiedArchive({...large,sha256:'0'.repeat(64)},base,allowed,undefined,async()=>response()),/octets/);
 return {verifiedBytes:bytes.length,changedDigestRefused:true};
});
await test('Large archives require a bounded streaming body',async()=>{
 let reads=0;await assert.rejects(()=>verifiedArchive({...record,bytes:40*1024*1024+1},base,allowed,undefined,async()=>({ok:true,body:null,arrayBuffer:async()=>{reads++;return small.buffer;}})),/borné/);assert.equal(reads,0);
 return {unboundedFallbackRefused:true};
});
await test('Dossier header remains available when optional DOM or fetch capabilities are absent',async()=>{
 const source=fs.readFileSync(path.join(root,'modules/fidelity-r26/dossier-link.js'),'utf8'),results=[];
 for(const missing of ['network','dom-after']){
  const links=[];let controllerCalls=0,fetchCalls=0,observerCalls=0;
  const actions=missing==='dom-after'?{}:{after(){throw Error('Optional index must not be installed');}};
  const nav={append(link){links.push(link);}},header={querySelector(){return nav;}};
  const document={currentScript:{src:'https://source.example/modules/fidelity-r26/dossier-link.js'},readyState:'complete',
   getElementById(id){return id==='detailActions'?actions:id==='specimenDialog'?{}:null;},querySelector(){return header;},createElement(){return {};}};
  const window={document};
  if(missing==='dom-after')Object.assign(window,{fetch(){fetchCalls++;},AbortController:class{constructor(){controllerCalls++;}},MutationObserver:class{constructor(){observerCalls++;}}});
  vm.runInNewContext(source,{window,URL,Map,Set});
  assert.equal(links.length,1);assert.equal(links[0].href,'https://source.example/modules/fidelity-r26/index.html');
  assert.equal(window.RE_DOSSIER_SOURCES_R26,undefined);assert.equal(controllerCalls+fetchCalls+observerCalls,0);
  results.push({missing,headerAvailable:true,optionalRequests:fetchCalls});
 }
 return results;
});
await test('Source position links round-trip native floating-point time without action aliases or autoplay',()=>{
 const entry={id:'rerev-test',model:{sha256:digest(small)}},clip={id:'native-clip',sha256:digest(small)},time=1/60;
 const url=positionURL(new URL('https://source.example/modules/fidelity-r26/models/index.html?old=1#old'),entry,clip,time);
 assert.equal(url.hash,'');assert.equal(url.searchParams.has('old'),false);assert.equal(url.searchParams.has('play'),false);
 const result=requestedPosition(url,entry,clip,10);assert.equal(result.status,'accepted');assert.equal(result.time,time);
 assert.equal(requestedPosition(positionURL(new URL(url),entry,null,0),entry,null,0).status,'accepted');
 return {nativeTime:time,sourceHashBound:true,automaticPlayback:false};
});
await test('Changed hashes, duplicate parameters, wrong clips and invalid/out-of-range positions are refused',()=>{
 const entry={id:'rerev-test',model:{sha256:digest(small)}},clip={id:'native-clip',sha256:digest(small)},url=positionURL(new URL('https://source.example/modules/fidelity-r26/models/index.html'),entry,clip,1);
 const cases=[['source','0'.repeat(64)],['model','wrong-model'],['clip','wrong-clip'],['time','Infinity'],['time','-1'],['time','11'],['time','0x10'],['time','1e999']];
 for(const [key,value] of cases){const changed=new URL(url);changed.searchParams.set(key,value);assert.equal(requestedPosition(changed,entry,clip,10).status,'refused',key+value);}
 const duplicate=new URL(url);duplicate.searchParams.append('time','2');assert.equal(requestedPosition(duplicate,entry,clip,10).status,'refused');
 assert.equal(requestedPosition(new URL('https://source.example/'),entry,clip,10).status,'none');
 return {rejected:cases.length+1,unknownTimesNeverApplied:true};
});
await test('Aborting a streamed archive cancels its reader before bytes can be accepted',async()=>{
 const controller=new AbortController();let cancelled=false;
 const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(1024));controller.abort();},cancel(){cancelled=true;}});
 await assert.rejects(()=>verifiedArchive({...record,bytes:40*1024*1024+1},base,allowed,controller.signal,async()=>new Response(stream)),error=>error.name==='AbortError');
 assert.equal(cancelled,true);return {cancelled:true,accepted:false};
});
const report={schema:'re.bow.model-reader-transport-r26/1',passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks};
fs.writeFileSync(path.join(root,'docs/R26_READER_ASSET_TESTS.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;
