/** Actual R31 candidate audio, portable user review and bounded voluntary playback. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),pack='modules/fidelity-r31/audio/';
const manifest=JSON.parse(fs.readFileSync(path.join(root,pack,'manifest.json'))),sha=raw=>createHash('sha256').update(raw).digest('hex');
const output=path.join(root,'qa-audio-r31');fs.mkdirSync(output,{recursive:true});
const port=Number(process.env.BOW_R31_AUDIO_PORT||5819),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
let browser;const checks=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function test(name,run){try{const evidence=await run();checks.push({name,pass:true,evidence});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
async function context(options={}){
 const ctx=await browser.newContext({acceptDownloads:true,...options});
 await ctx.addInitScript(()=>{
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);window.__r31urls=new Set();
  URL.createObjectURL=blob=>{const url=create(blob);window.__r31urls.add(url);return url;};
  URL.revokeObjectURL=url=>{window.__r31urls.delete(url);revoke(url);};
  window.__r31storageWrites=0;const prior=Storage.prototype.setItem;
  Storage.prototype.setItem=function(...args){window.__r31storageWrites++;return prior.apply(this,args);};
 });return ctx;
}
async function loaded(page,query=''){
 const response=await page.goto(base+'/'+pack+'index.html'+query);assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.RE_AUDIO_R31?.state().loaded);await page.evaluate(()=>RE_AUDIO_R31.ready());
}
async function prepare(page){await page.click('#prepare');await page.waitForFunction(()=>RE_AUDIO_R31.state().prepared);await page.waitForFunction(()=>Number.isFinite(document.querySelector('audio').duration));}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await wait(75);}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 await test('Initial library exposes218source files without any sound request, autoplay or game-storage write',async()=>{
  const ctx=await context(),page=await ctx.newPage(),requests=[];
  page.on('request',request=>{if(/\/clips\/.*\.(wav|ogg)$/.test(request.url()))requests.push(request.url());});
  try{await loaded(page);assert.equal(await page.locator('#clip option').count(),218);assert.equal(await page.locator('#identity option').count(),8);
   assert.equal(requests.length,0);assert.equal(await page.locator('audio').getAttribute('src'),null);
   assert.equal(await page.locator('audio').evaluate(audio=>audio.paused),true);assert.equal(await page.evaluate(()=>window.__r31storageWrites),0);
   const state=await page.evaluate(()=>RE_AUDIO_R31.state());assert.equal(state.combatAudioAssigned,false);assert.equal(state.prepared,false);
   return{publishedFiles:218,candidateIdentities:7,initialAudioRequests:0,autoplay:false,gameStorageWrites:0};
  }finally{await ctx.close();}
 });
 await test('All seven exact-UID queries keep shared groups and source editions candidate-only',async()=>{
  const ctx=await context(),page=await ctx.newPage(),observed=[];
  try{for(const identity of manifest.identities){await loaded(page,'?id='+identity.id);
    const expected=manifest.entries.filter(clip=>clip.candidateIdentityIds.includes(identity.id));
    assert.equal(await page.locator('#clip option').count(),expected.length);assert.equal(await page.inputValue('#identity'),identity.id);
    assert.match(await page.locator('#candidateScope').innerText(),/ne détermine pas l’incarnation/);
    assert.match(await page.locator('#facts').innerText(),/non vérifiée/);
    assert.equal(await page.locator('audio').getAttribute('src'),null);observed.push({id:identity.id,candidateFiles:expected.length});}
   return{observed,exactPhaseAssignments:0};
  }finally{await ctx.close();}
 });
 await test('Real PCM and Vorbis bytes prepare in the browser while playback stays voluntary',async()=>{
  const ctx=await context(),page=await ctx.newPage(),observed=[];
  try{for(const format of ['ogg','wav']){const clip=manifest.entries.find(row=>row.probe.format===format);
    await loaded(page,'?clip='+clip.clipId);await prepare(page);
    const measured=await page.locator('audio').evaluate(audio=>({duration:audio.duration,paused:audio.paused,src:audio.src}));
    assert.equal(measured.paused,true);assert(measured.src.startsWith('blob:'));
    assert(Math.abs(measured.duration-clip.probe.durationSeconds)<.06,JSON.stringify({measured,probe:clip.probe}));
    const raw=await page.evaluate(async()=>Array.from(new Uint8Array(await(await fetch(document.querySelector('audio').src)).arrayBuffer())));
    assert.equal(sha(Buffer.from(raw)),clip.sha256);assert.equal(raw.length,clip.bytes);
    assert.equal(await page.evaluate(()=>window.__r31urls.size),1);observed.push({format,sourceSha256:clip.sha256,browserDuration:measured.duration,paused:true});}
   assert.equal(await page.evaluate(()=>window.__r31storageWrites),0);return{observed};
  }finally{await ctx.close();}
 });
 await test('Personal listening notes export and reimport actual SHA-bound files with inert text',async()=>{
  const ctx=await context(),page=await ctx.newPage();
  try{await loaded(page);await page.check('#heard');await page.selectOption('#reviewIdentity','re4-dr-salvador');
   await page.fill('#speaker','Hypothèse utilisateur');await page.fill('#phase','À vérifier dans la séquence');
   await page.fill('#action','Observation personnelle');const inert='<img src=x onerror="window.audioInjected=true">';await page.fill('#note',inert);
   await page.click('#saveNote');assert.equal((await page.evaluate(()=>RE_AUDIO_R31.review())).notes.length,1);
   const downloadPromise=page.waitForEvent('download');await page.click('#export');const download=await downloadPromise;
   const raw=fs.readFileSync(await download.path()),value=JSON.parse(raw);assert.equal(value.notes[0].note,inert);
   assert.equal(value.canonicalFidelityCertified,false);assert.equal(value.combatAudioAssigned,false);
   await page.reload();await page.waitForFunction(()=>RE_AUDIO_R31?.state().loaded);assert.equal((await page.evaluate(()=>RE_AUDIO_R31.review())).notes.length,0);
   await page.setInputFiles('#import',{name:'notes.json',mimeType:'application/json',buffer:raw});
   await page.waitForFunction(()=>RE_AUDIO_R31.state().notes===1);assert.equal(await page.inputValue('#note'),inert);
   assert.equal(await page.evaluate(()=>!!window.audioInjected),false);assert.equal(await page.evaluate(()=>window.__r31storageWrites),0);
   assert.equal(await page.locator('audio').getAttribute('src'),null);return{downloadedBytes:raw.length,userReportedNotes:1,inertText:true,combatAttributionChanged:false};
  }finally{await ctx.close();}
 });
 await test('Incorrect-source and oversized note imports preserve current notes atomically',async()=>{
  const ctx=await context(),page=await ctx.newPage();
  try{await loaded(page);await page.fill('#note','Note à conserver');await page.click('#saveNote');
   const before=await page.evaluate(()=>RE_AUDIO_R31.review()),wrong=structuredClone(before);wrong.notes[0].sourceSha256='0'.repeat(64);
   await page.setInputFiles('#import',{name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(wrong))});
   await page.waitForFunction(()=>document.querySelector('#importStatus').textContent.includes('sont conservées'));
   assert.deepEqual(await page.evaluate(()=>RE_AUDIO_R31.review()),before);
   await page.setInputFiles('#import',{name:'large.json',mimeType:'application/json',buffer:Buffer.alloc(256*1024+1,32)});
   await page.waitForFunction(()=>document.querySelector('#importStatus').textContent.includes('256 Kio'));
   assert.deepEqual(await page.evaluate(()=>RE_AUDIO_R31.review()),before);return{wrongSourceRejected:true,byteLimit:256*1024,oldNotesRetained:true};
  }finally{await ctx.close();}
 });
 await test('A corrupted real audio file fails SHA validation and never becomes playable',async()=>{
  const ctx=await context(),page=await ctx.newPage(),clip=manifest.entries[0];
  await page.route('**/'+clip.path,route=>{const changed=Buffer.from(fs.readFileSync(path.join(root,clip.path)));changed[changed.length-1]^=1;return route.fulfill({status:200,body:changed,contentType:'audio/ogg'});});
  try{await loaded(page,'?clip='+clip.clipId);await page.click('#prepare');
   await page.waitForFunction(()=>document.querySelector('#playStatus').textContent.includes('empreinte'));
   assert.equal(await page.locator('audio').getAttribute('src'),null);assert.equal(await page.evaluate(()=>window.__r31urls.size),0);
   assert.equal((await page.evaluate(()=>RE_AUDIO_R31.state())).prepared,false);return{actualCorruptedSource:clip.sha256,unverifiedAudioPrepared:false};
  }finally{await ctx.close();}
 });
 await test('Page lifecycle releases prepared URLs and cancels an in-flight source without blocking retry',async()=>{
  const ctx=await context(),page=await ctx.newPage(),clip=manifest.entries[0];
  try{await loaded(page);await prepare(page);assert.equal(await page.evaluate(()=>window.__r31urls.size),1);
   await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.evaluate(()=>window.__r31urls.size),0);
   assert.equal((await page.evaluate(()=>RE_AUDIO_R31.state())).prepared,false);
   await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
   let release;const pending=new Promise(resolve=>{release=resolve;});let delayed=true;
   await page.route('**/'+clip.path,async route=>{if(delayed)await pending;try{await route.fulfill({status:200,body:fs.readFileSync(path.join(root,clip.path)),contentType:'audio/ogg'});}catch{}});
   await page.click('#prepare');await page.waitForFunction(()=>RE_AUDIO_R31.state().loading);
   await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal((await page.evaluate(()=>RE_AUDIO_R31.state())).loading,false);
   delayed=false;release();await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await prepare(page);
   assert.equal((await page.evaluate(()=>RE_AUDIO_R31.state())).prepared,true);assert.equal(await page.evaluate(()=>window.__r31urls.size),1);
   return{preparedUrlReleased:true,pendingSourceCancelled:true,retryPrepared:true,lifecycleEventsDispatched:true};
  }finally{await ctx.close();}
 });
 await test('Keyboard and expanded provenance reflow at320pixels with200percent root text',async()=>{
  const ctx=await context({viewport:{width:320,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage();
  try{await loaded(page);await page.keyboard.press('Tab');assert.equal(await page.locator('.skip').evaluate(node=>node===document.activeElement),true);
   await page.keyboard.press('Enter');assert.equal(await page.locator('#main').evaluate(node=>node===document.activeElement),true);
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';document.querySelector('details').open=true;});
   const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth>innerWidth+1,
    controls:[...document.querySelectorAll('input,select,textarea,audio,button')].filter(node=>node.getBoundingClientRect().width>innerWidth+1).map(node=>node.id)}));
   assert.equal(overflow.document,false);assert.deepEqual(overflow.controls,[]);
   await page.locator('#prepare').focus();assert.equal(await page.locator('#prepare').evaluate(node=>node===document.activeElement),true);
   await page.screenshot({path:path.join(output,'audio-320-text200.png'),fullPage:true});return{viewport:320,rootTextPercent:200,keyboardSkipWorks:true,overflow};
  }finally{await ctx.close();}
 });
 await test('Unknown incarnation links fail closed without loading an unrelated voice',async()=>{
  const ctx=await context(),page=await ctx.newPage();
  try{await loaded(page,'?id=re7-jack-baker-scissor');assert.match(await page.locator('#summary').innerText(),/n’est pas présente/);
   const state=await page.evaluate(()=>RE_AUDIO_R31.state());assert.equal(state.selectedClip,null);assert.equal(state.sourceRequests,0);
   assert.equal(await page.locator('audio').getAttribute('src'),null);return{unrelatedIdentityRejected:true,sourceRequests:0};
  }finally{await ctx.close();}
 });
}finally{await browser?.close();server.kill('SIGTERM');}
const names=['tests/browser-audio-r31.mjs',pack+'index.html',pack+'style.css',pack+'player.js',pack+'review-format.js',pack+'manifest.json'];
const report={schema:'re.bow.audio-browser-tests-r31/1',passed:checks.filter(row=>row.pass).length,failed:checks.filter(row=>!row.pass).length,checks,
 inputs:names.map(name=>({path:name,sha256:sha(fs.readFileSync(path.join(root,name)))})),scope:'Actual218file library, realPCM/Vorbis preparations, voluntaryplayback, user-note downloads/imports, corruptsourceSHA, lifecycle and320px200percent reflow. No physical listening or original-game action certification.'};
fs.writeFileSync(path.join(root,'docs/R31_AUDIO_BROWSER.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
