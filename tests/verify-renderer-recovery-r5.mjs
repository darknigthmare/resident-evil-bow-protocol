/** Deterministic fault-injection tests for the real shared renderer.
 * Fake transport/timers and a recording canvas are NOT visual certification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/re-renderer.js'),'utf8');
const directions=fs.readFileSync(path.join(root,'src/fighter-directions.js'),'utf8');
const results=[];
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const fighter=(id='fixture')=>({uid:id,name:'TECHNICAL FIXTURE',sprite:`assets/tests/${id}.png`,visual:{height:100,drawHeight:100,sourceFacing:'front'}});
function harness({tainted=false,throwSource=false,synchronous=false}={}){
 let time=0,next=0,reads=0;const timers=new Map(),images=[],events=[],canvases=[];
 function canvas(){const calls=[],cv={width:400,height:300,id:'',dataset:{},calls};const ctx=new Proxy({canvas:cv,globalAlpha:1,drawImage:(...args)=>calls.push(['drawImage',...args]),scale:(...args)=>calls.push(['scale',...args]),getImageData:(x,y,w,h)=>{reads++;if(tainted)throw Error('SecurityError');const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<data.length;i+=4){data[i]=90;data[i+3]=255;}return{data};},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a])});cv.getContext=()=>ctx;canvases.push(cv);return cv;}
 const doc={baseURI:'https://game.test/index.html',currentScript:{src:'https://game.test/src/re-renderer.js'},documentElement:{dataset:{}},createElement:()=>canvas()};
 class Image{
  constructor(){this.naturalWidth=0;this.naturalHeight=0;this.removed=0;images.push(this);}
  set src(value){this.path=value;if(throwSource)throw Error('source assignment failed');if(synchronous)this.ok();}
  get src(){return this.path;}
  removeAttribute(){this.removed++;this.onload=this.onerror=null;}
  ok(w=20,h=40){this.naturalWidth=w;this.naturalHeight=h;this.onload?.();}
  fail(){this.onerror?.();}
 }
 const win={document:doc,Image,URL,performance:{now:()=>time},console:{warn(){}},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},dispatchEvent:e=>events.push(e),setTimeout:(fn,ms)=>{timers.set(++next,{fn,at:time+ms});return next;},clearTimeout:id=>timers.delete(id),RE_DIRECTIONAL_ART:{records:{}},RE_DATA:{fighters:[],stages:[]}};
 win.window=win;win.globalThis=win;vm.createContext(win);vm.runInContext(directions,win);vm.runInContext(source,win);
 const advance=ms=>{const end=time+ms;for(let n=0;n<10000;n++){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;time=due[1].at;timers.delete(due[0]);due[1].fn();}time=end;};
 return{win,renderer:win.RE_RENDERER,images,events,canvas,advance,timers,canvases,get reads(){return reads;},latest:()=>images.at(-1)};
}
async function test(name,run){try{await run();results.push({name,pass:true});console.log('PASS '+name);}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
await test('Six stalled images time out and release the seventh queued request',async()=>{
 const h=harness();let settled=0;for(let i=0;i<7;i++)h.renderer.preloadFighter(fighter('stall'+i)).then(()=>settled++);
 assert.equal(h.images.length,6);h.advance(15001);await flush();assert.equal(h.images.length,7);assert.equal(h.renderer.diagnostics().loading,1);assert.equal(h.renderer.diagnostics().queued,0);h.latest().ok();await flush();assert.equal(settled,7);assert.equal(h.timers.size,0);
});
await test('Timed-out preload resolves false instead of hanging forever',async()=>{
 const h=harness();let value;h.renderer.preloadFighter(fighter()).then(x=>value=x);h.advance(15001);await flush();assert(value,'preload still pending');assert.equal(value[0].ok,false);assert.equal(h.renderer.diagnostics().errors[0].reason,'timeout');
});
await test('Late callbacks from an expired image cannot settle its retry',async()=>{
 const h=harness();h.renderer.preloadFighter(fighter());const stale=h.latest(),late=stale.onload;h.advance(15001);h.renderer.retryAssets();const active=h.latest();assert.notEqual(active,stale);stale.naturalWidth=20;stale.naturalHeight=40;late();assert.equal(h.renderer.diagnostics().loading,1);assert.equal(h.renderer.diagnostics().assets[0].state,'loading');active.ok();assert.equal(h.renderer.diagnostics().loading,0);assert.equal(h.renderer.diagnostics().errors.length,0);
});
await test('Source assignment failures settle as errors without consuming queue capacity',async()=>{
 const h=harness({throwSource:true});const answer=await h.renderer.preloadFighter(fighter());assert.equal(answer[0].ok,false);assert.equal(h.renderer.diagnostics().loading,0);assert.equal(h.timers.size,0);
});
await test('Evicted failed assets stay negative-cached until explicitly retried',async()=>{
 const h=harness();const f=fighter('missing');let p=h.renderer.preloadFighter(f);h.latest().fail();await p;
 for(let i=0;i<10;i++){p=h.renderer.preloadFighter(fighter('good'+i));h.latest().ok();await p;}
 const before=h.images.length;p=h.renderer.preloadFighter(f);assert.equal(h.images.length,before,'failed URL was requested again');assert.equal((await p)[0].ok,false);assert(h.renderer.diagnostics().errors.some(e=>e.path===f.sprite));
});
await test('An explicit retry recovers an evicted failure on its next request',async()=>{
 const h=harness();const f=fighter('missing');let p=h.renderer.preloadFighter(f);h.latest().fail();await p;
 for(let i=0;i<10;i++){p=h.renderer.preloadFighter(fighter('ok'+i));h.latest().ok();await p;}
 h.renderer.retryAssets();p=h.renderer.preloadFighter(f);assert(h.latest().path.endsWith('missing.png'));h.latest().ok();assert.equal((await p)[0].ok,true);assert.equal(h.renderer.diagnostics().errors.length,0);
});
await test('Retry keeps the failure visible until successful image recovery',()=>{
 const h=harness();h.renderer.preloadFighter(fighter());h.latest().fail();h.renderer.retryAssets();assert.equal(h.renderer.diagnostics().errors.length,1);h.latest().ok();assert.equal(h.renderer.diagnostics().errors.length,0);
});
await test('A successful portrait does not erase a failed sprite of the same path',()=>{
 const h=harness(),f=fighter();h.renderer.preloadFighter(f);h.latest().fail();h.renderer.drawPortrait(h.canvas(),f);h.latest().ok();assert(h.renderer.diagnostics().errors.some(e=>e.path===f.sprite&&e.kind==='sprite'));
});
await test('Synchronous image completion does not leak timers or load slots',async()=>{
 const h=harness({synchronous:true});for(let i=0;i<15;i++)assert.equal((await h.renderer.preloadFighter(fighter('sync'+i)))[0].ok,true);assert.equal(h.renderer.diagnostics().loading,0);assert.equal(h.timers.size,0);assert(h.renderer.diagnostics().cached.sprite<=8);
});
await test('Success detaches stale callbacks and cancels the timeout',()=>{
 const h=harness();h.renderer.preloadFighter(fighter());const im=h.latest();im.ok();assert.equal(h.timers.size,0);assert.equal(im.onload,null);assert.equal(im.onerror,null);h.advance(30000);assert.equal(h.renderer.diagnostics().errors.length,0);
});
await test('Tainted matte readback is attempted only once per decoded image/tolerance',async()=>{
 const h=harness({tainted:true}),f=fighter();h.win.RE_DIRECTIONAL_ART.records[f.uid]={referenceBorderKey:0};const p=h.renderer.preloadFighter(f);h.latest().ok();await p;const ctx=h.canvas().getContext('2d');h.renderer.drawFighter(ctx,f,200,200,1,1,{time:0});const first=h.reads;for(let i=0;i<40;i++)h.renderer.drawFighter(ctx,f,200,200,1,1,{time:0});assert.equal(h.reads,first,'failed pixel read repeated every draw');assert(ctx.canvas.calls.some(c=>c[0]==='drawImage'));
});
await test('Changing the reviewed matte tolerance allows exactly one new read attempt',async()=>{
 const h=harness({tainted:true}),f=fighter();h.win.RE_DIRECTIONAL_ART.records[f.uid]={referenceBorderKey:0};const p=h.renderer.preloadFighter(f);h.latest().ok();await p;const ctx=h.canvas().getContext('2d');h.renderer.drawFighter(ctx,f,200,200,1,1,{time:0});const before=h.reads;h.win.RE_DIRECTIONAL_ART.records[f.uid].referenceBorderKey=1;h.renderer.drawFighter(ctx,f,200,200,1,1,{time:0});h.renderer.drawFighter(ctx,f,200,200,1,1,{time:0});assert.equal(h.reads,before+1);
});
await test('Failed matte attempts release temporary canvases without destroying the original',async()=>{
 const h=harness({tainted:true}),f=fighter();h.win.RE_DIRECTIONAL_ART.records[f.uid]={referenceBorderKey:0};const p=h.renderer.preloadFighter(f);h.latest().ok();await p;const original=h.latest(),cv=h.canvas();h.renderer.drawFighter(cv.getContext('2d'),f,200,200,1,1,{time:0});assert(h.canvases.filter(x=>x!==cv).every(x=>x.width===1&&x.height===1));assert.equal(original.removed,0);
});
await test('Fallback to the original re-resolves its own direction, not the failed derivative mirror',async()=>{
 const h=harness(),f=fighter();f.visual.sourceFacing='left';const p=h.renderer.preloadFighter(f);h.latest().ok();await p;
 h.win.RE_DIRECTIONAL_ART.records[f.uid]={referenceFacing:'left',referenceMirrorReviewed:true,referenceImage:{path:'assets/tests/derivative.png',width:20,height:40,anchor:[.5,1],facing:'right',projection:'reference',reviewed:true}};
 const cv=h.canvas(),ctx=cv.getContext('2d');h.renderer.drawFighter(ctx,f,200,200,-1,1,{time:0});h.latest().fail();cv.calls.length=0;h.renderer.drawFighter(ctx,f,200,200,-1,1,{time:0});assert.equal(cv.calls.filter(c=>c[0]==='scale').at(-1)[1],1,'old derivative mirror reused');assert(cv.calls.find(c=>c[0]==='drawImage')[1].path.endsWith('/fixture.png'));assert.equal(h.win.RE_FIGHTER_DIRECTIONS.resolve(f,-1,{},0,{skipReference:true,skipViews:true,skipClips:true}).referenceOverride,false);
});
await test('Cache and failure diagnostics stay bounded across large error sets',async()=>{
 const h=harness();for(let i=0;i<530;i++){const p=h.renderer.preloadFighter(fighter('bad'+i));h.latest().fail();await p;}const d=h.renderer.diagnostics();assert(d.errors.length<=512);assert(d.assets.length<=8);assert.equal(d.loading,0);
});
await test('All body definitions, source images, art metadata and gameplay contracts match R4',()=>{
 const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/RENDERER_RECOVERY_R5_BASELINE.json'),'utf8'));
 for(const [file,expected] of Object.entries(baseline.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),expected,file);
 const files=[];function walk(dir){for(const x of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,x.name);if(x.isDirectory())walk(p);else if(x.isFile())files.push(p);}}walk(path.join(root,'assets'));const digest=crypto.createHash('sha256');for(const f of files.sort()){const rel=path.relative(root,f).split(path.sep).join('/');digest.update(rel+'\0'+crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')+'\n');}assert.equal(files.length,baseline.assetCount);assert.equal(digest.digest('hex'),baseline.assetSetSha256);
 const f=JSON.parse(fs.readFileSync(path.join(root,'data/roster.json'))).fighters,e=JSON.parse(fs.readFileSync(path.join(root,'data/catalog-expansion-v070.json'))).fighters;assert.equal(f.length+e.length,346);
});
const failed=results.filter(x=>!x.pass).length;
fs.writeFileSync(path.join(root,'docs/RENDERER_RECOVERY_R5_TESTS.json'),JSON.stringify({suite:'renderer-recovery-r5',passed:results.length-failed,failed,scope:'Real source in Node VM; fake image transport, virtual timers and recording canvas. Not art or browser certification.',checks:results},null,2)+'\n');
console.log(JSON.stringify({passed:results.length-failed,failed}));if(failed)process.exitCode=1;
