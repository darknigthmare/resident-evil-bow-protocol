import {r6Expected} from './r6-baseline.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{loadGame,native}=require('./engine-vm.cjs');
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const box={RE_DIRECTIONAL_ART:{records:{}}};box.globalThis=box;vm.createContext(box);vm.runInContext(read('src/fighter-directions.js'),box);const A=box.RE_FIGHTER_DIRECTIONS;
const checks=[];async function test(name,fn){try{const details=await fn();checks.push({name,passed:true,details});console.log('PASS '+name);}catch(e){checks.push({name,passed:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);}}
const fixture={uid:'fixture-r3',name:'BILATERAL TEST TEXTURE',sprite:'assets/tests/reference.png',visual:{drawHeight:100,asymmetric:false,sourceFacing:'front'}};
const view=(side)=>({path:'assets/tests/'+side+'.png',facing:side,projection:'side',reviewed:true,width:20,height:40,anchor:[.5,1]});
async function image(color){const c=native.createCanvas(20,40),cx=c.getContext('2d');cx.fillStyle=color;cx.fillRect(0,0,20,40);return await c.toDataURL('image/png');}
const pixel=(ctx)=>[...ctx.getImageData(200,150,1,1).data];
await test('Shared selector infers walking, retreat, air, crouch and blockstun from actual actor fields',()=>{
 for(const face of[-1,1]){assert.equal(A.poseState({actor:{face,state:'walk',vx:-face*3}}),'retreat');assert.equal(A.poseState({actor:{face,state:'walk',vx:face*3}}),'walk');}
 assert.equal(A.poseState({actor:{onGround:false}}),'jump');assert.equal(A.poseState({actor:{crouch:true}}),'crouch');assert.equal(A.poseState({actor:{blockstun:8}}),'guard');
});
await test('Terminal poses and attack locking do not depend on absolute sprite position',()=>{
 assert.equal(A.poseState({actor:{life:0},animationState:'lose'}),'lose');assert.equal(A.poseState({actor:{life:0}}),'knockdown');
 for(const face of[-1,1]){const p={face:-face,state:'walk',vx:face,attack:{name:'special',face,t:3}};assert.equal(A.poseState({actor:p}),'special');assert.equal(A.resolve(fixture,-face,{actor:p,opponentX:-face*300},0).face,face);}
});
await test('Reaction clock begins on its state transition instead of final frame at match age',()=>{
 const c=A.createClock(),p={face:1};assert.equal(c.tick({actor:p,time:500}),0);assert.equal(c.tick({actor:p,time:500.1}),6);p.hit=4;p.lastHit=30010;assert.equal(c.tick({actor:p,time:500.2}),0);assert.equal(c.tick({actor:p,time:500.25}),3);
 p.lastHit=30016;assert.equal(c.tick({actor:p,time:500.3}),0);
});
await test('Clock pauses with simulation time and resets on seek or a new actor without mutation',()=>{
 const c=A.createClock(),p={face:1,hit:5,lastHit:600},before=JSON.stringify(p);c.tick({actor:p,time:10});assert.equal(c.tick({actor:p,time:10.1}),6);assert.equal(c.tick({actor:p,time:10.1}),6);assert.equal(c.tick({actor:p,time:9}),0);assert.equal(c.tick({actor:{...p},time:80}),0);assert.equal(JSON.stringify(p),before);c.reset();assert.equal(c.tick({actor:p,time:90}),0);
});
await test('Explicit frame scrub and committed attack tick override the passive clock',()=>{
 const c=A.createClock();assert.equal(c.tick({animationTick:19.9,time:300}),19);assert.equal(c.tick({time:300}),0);
 assert.equal(c.tick({animationTick:999,actor:{attack:{name:'heavy',t:4}}},'heavy'),4);
});
await test('Clip-disabled fallback keeps the requested anatomical side and never a second reflection',()=>{
 const r={views:{left:view('left'),right:view('right')},clips:{heavy:{left:{...view('left'),path:'assets/tests/left-action.png',loop:false,frames:[{crop:[0,0,20,40],ticks:3}]}}}};box.RE_DIRECTIONAL_ART.records[fixture.uid]=r;
 const p=A.resolve({...fixture,name:'BANDERSNATCH'},-1,{animationState:'heavy'},0,{skipClips:true});assert.equal(p.path,r.views.left.path);assert.equal(p.mirror,1);assert.equal(p.animated,false);
 assert.equal(A.resolve(fixture,-1,{},0,{skipClips:true,skipViews:true}).sideProfile,false);
});
await test('A loading attack atlas renders the already-loaded same-side idle pixels',async()=>{
 const env=await loadGame(path.join(R,'laboratory.html'));try{
  env.window.RE_ASSET_DATA={'assets/tests/left.png':await image('#2040e0'),'assets/tests/right.png':await image('#e04020'),'assets/tests/action.png':await image('#20e040')};
  env.window.RE_DIRECTIONAL_ART.records[fixture.uid]={views:{left:view('left'),right:view('right')}};
  await env.window.RE_RENDERER.preloadFighter(fixture);await env.images();
  env.window.RE_DIRECTIONAL_ART.records[fixture.uid].clips={heavy:{left:{...view('left'),path:'assets/tests/action.png',loop:false,frames:[{crop:[0,0,20,40],ticks:9}]}}};
  const target=env.document.createElement('canvas');target.width=400;target.height=300;const cx=target.getContext('2d');
  env.window.RE_RENDERER.drawFighter(cx,fixture,200,200,-1,1,{time:0,animationState:'heavy'});let px=pixel(cx);assert(px[2]>200&&px[0]<70,'idle left pixels must remain during load');
  await env.images();cx.clearRect(0,0,400,300);env.window.RE_RENDERER.drawFighter(cx,fixture,200,200,-1,1,{time:0,animationState:'heavy'});px=pixel(cx);assert(px[1]>200&&px[2]<70,'actual action bitmap loaded');
 }finally{env.dispose();}
});
await test('Broken directional action keeps valid lateral idle instead of a frontal reference',async()=>{
 const env=await loadGame(path.join(R,'laboratory.html'));try{
  env.window.RE_ASSET_DATA={'assets/tests/left.png':await image('#2040e0'),'assets/tests/reference.png':await image('#e04020')};
  env.window.RE_DIRECTIONAL_ART.records[fixture.uid]={views:{left:view('left')},clips:{heavy:{left:{...view('left'),path:'assets/tests/missing-r3.png',loop:false,frames:[{crop:[0,0,20,40],ticks:2}]}}}};
  const target=env.document.createElement('canvas');target.width=400;target.height=300;const cx=target.getContext('2d');
  await env.window.RE_RENDERER.preloadFighter(fixture);env.window.RE_RENDERER.drawFighter(cx,fixture,200,200,-1,1,{time:0,animationState:'heavy'});await env.images();cx.clearRect(0,0,400,300);env.window.RE_RENDERER.drawFighter(cx,fixture,200,200,-1,1,{time:0,animationState:'heavy'});
  const px=pixel(cx);assert(px[2]>200&&px[0]<70);assert(env.window.RE_RENDERER.diagnostics().errors.some(e=>e.path.endsWith('missing-r3.png')));return{expectedMissingFixture:true};
 }finally{env.dispose();}
});
await test('Native RE2 larva uses a measured complete silhouette and a declared bilateral reflection',()=>{
 const m=JSON.parse(read('data/directional-art.json')),f=JSON.parse(read('data/catalog-expansion-v070.json')).fighters.find(f=>f.uid==='re2-larvae');box.RE_DIRECTIONAL_ART=m;
 const l=A.resolve(f,-1),r=A.resolve(f,1);assert(l.sideProfile&&r.sideProfile);assert.equal(l.mirror,1);assert.equal(r.mirror,-1);assert(!r.oppositeAnatomyValidated);const v=m.records[f.uid].views.left;assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(R,v.path))).digest('hex'),v.sha256);
 const frames=Object.values(m.records).flatMap(r=>Object.keys(r.clips||{}));assert.equal(frames.length,0,'no new animation sheets claimed');
});
await test('Oblique animal references stay oblique even when approved to face the opponent',()=>{
 const F=JSON.parse(read('data/catalog-expansion-v070.json')).fighters;for(const uid of['re1-adder','re0-leech','reoutbreak-small-leech','re4r-colmillos','rerequiem-garmr']){const f=F.find(f=>f.uid===uid);assert(f);for(const face of[-1,1]){const p=A.resolve(f,face);assert.equal(p.sideProfile,false);assert.equal(p.status,'directional-reference');}}
});
await test('Atelier exposes all 21 states, exact stepping, scrub limits and real laboratory links',async()=>{
 const env=await loadGame(path.join(R,'directions.html'),{search:'?uid=re2-larvae'});try{
  const d=env.document,$=id=>d.getElementById(id),api=env.window.RE_DIRECTIONS_PAGE;await env.images();assert.equal($('directionState').children.length,21);assert.equal(api.counts.ready,5);
  $('directionState').value='heavy';$('directionState').dispatchEvent({type:'change'});assert.equal(api.snapshot().tick,0);$('directionStep').click();assert.equal(api.snapshot().tick,1);assert($('directionLab').href.includes('catalog-laboratory.html?uid=re2-larvae&slot=heavy'));assert.match($('directionLeft').textContent,/POSE STATIQUE/);
  $('directionTick').value='-2';$('directionTick').dispatchEvent({type:'input'});assert.equal(api.snapshot().tick,0);$('directionTick').value='50000';$('directionTick').dispatchEvent({type:'input'});assert.equal(api.snapshot().tick,36000);$('directionReset').click();assert.equal(api.snapshot().tick,0);
 }finally{env.dispose();}
});
await test('Atelier pauses on blur and hides stale actions for an empty search',async()=>{
 const env=await loadGame(path.join(R,'directions.html'));try{const d=env.document,api=env.window.RE_DIRECTIONS_PAGE;d.getElementById('directionAnimate').click();env.tick();env.tick();assert(api.snapshot().tick>0);env.window.dispatchEvent({type:'blur'});const t=api.snapshot().tick;env.tick(200);assert.equal(api.snapshot().tick,t);assert.equal(api.snapshot().playing,false);
  d.getElementById('directionSearch').value='zzzz_no_match_zzzz';d.getElementById('directionSearch').dispatchEvent({type:'input'});assert.equal(api.snapshot().uid,null);assert(d.getElementById('directionPlay').hidden);assert(d.getElementById('directionStep').disabled);
 }finally{env.dispose();}
});
await test('Historical R3 preservation with explicitly checked R6 combat delta',()=>{
 const baseline=JSON.parse(read('docs/DIRECTIONAL_R3_PRESERVATION.json'));for(const [file,hash]of Object.entries(baseline.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(R,file))).digest('hex'),r6Expected(R,file,hash),file);
 return{unchangedFiles:Object.keys(baseline.files).length};
});
const failed=checks.filter(c=>!c.passed).length;fs.writeFileSync(path.join(R,'docs/DIRECTIONAL_R3_TESTS.json'),JSON.stringify({revision:3,passed:checks.length-failed,failed,backend:native.__binding,scope:'Real shared renderer and native Canvas pixels plus controlled DOM. Fixtures are not character art.',checks},null,2)+'\n');if(failed)process.exitCode=1;
