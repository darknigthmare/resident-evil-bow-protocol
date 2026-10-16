import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {assertDistinctSides} from '../scripts/directional-pair-validation.mjs';
const require=createRequire(import.meta.url),{loadGame,native}=require('./engine-vm.cjs');
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8'),json=p=>JSON.parse(read(p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const M=json('data/directional-art.json'),review=json('data/directional-reference-review-r4.json'),report=json('docs/DIRECTIONAL_R4_ASSETS.json'),F=[...json('data/roster.json').fighters,...json('data/catalog-expansion-v070.json').fighters],find=uid=>F.find(f=>f.uid===uid);
const box={RE_DIRECTIONAL_ART:M};box.globalThis=box;vm.createContext(box);vm.runInContext(read('src/fighter-directions.js'),box);const A=box.RE_FIGHTER_DIRECTIONS;
const checks=[];async function test(name,fn){try{const details=await fn();checks.push({name,passed:true,details});console.log('PASS '+name);}catch(e){checks.push({name,passed:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);}}
async function bitmap(p){const img=await native.loadImage(fs.readFileSync(path.join(R,p))),c=native.createCanvas(img.width,img.height),ctx=c.getContext('2d');ctx.drawImage(img,0,0);return{width:img.width,height:img.height,pixels:ctx.getImageData(0,0,img.width,img.height).data};}
async function solid(color){const c=native.createCanvas(20,40),ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,20,40);return await c.toDataURL('image/png');}
async function atlas(){const c=native.createCanvas(40,40),ctx=c.getContext('2d');ctx.fillStyle='#e02020';ctx.fillRect(0,0,20,40);ctx.fillStyle='#20e020';ctx.fillRect(20,0,20,40);return await c.toDataURL('image/png');}
const fixture={uid:'fixture-r4',name:'TECHNICAL PIXEL FIXTURE',sprite:'assets/tests/r4-reference.png',portrait:'assets/tests/r4-reference.png',visual:{height:100,drawHeight:100,asymmetric:false,sourceFacing:'front'}};
const view=(side,name=side)=>({path:'assets/tests/r4-'+name+'.png',facing:side,projection:'side',reviewed:true,width:20,height:40,anchor:[.5,1]});
const clip=(side)=>({...view(side,side+'-action'),width:40,loop:false,frames:[{crop:[0,0,20,40],ticks:3},{crop:[20,0,20,40],ticks:3}]});
const rgb=(ctx,x=200,y=150)=>[...ctx.getImageData(x,y,1,1).data];
await test('Twelve processed references match reviewed source hashes and emitted PNG metadata',async()=>{
 assert.equal(report.processedReferences,12);assert.equal(M.revision,4);let n=0;
 for(const r of report.records){assert.equal(hash(fs.readFileSync(path.join(R,r.source))),r.sourceSha256);assert.equal(hash(fs.readFileSync(path.join(R,r.output))),r.outputSha256);const b=await bitmap(r.output);assert.equal(b.width,r.width);assert.equal(b.height,r.height);assert.equal(M.records[r.uid].referenceImage.path,r.output);assert.equal(r.newArtwork,false);n++;}
 return{processed:n,newDrawings:0};
});
await test('Derived references have transparent padding, without removing opaque nonblack source pixels',async()=>{
 let protectedPixels=0;
 for(const r of report.records){const src=await bitmap(r.source),dst=await bitmap(r.output);const [sx,sy,w,h]=r.sourceBounds,pad=r.padding;assert.equal(dst.width,w+2*pad);assert.equal(dst.height,h+2*pad);
  for(let y=0;y<dst.height;y++)for(let x=0;x<dst.width;x++)if(x<pad||x>=dst.width-pad||y<pad||y>=dst.height-pad)assert.equal(dst.pixels[(y*dst.width+x)*4+3],0,r.uid+' border');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((y+sy)*src.width+x+sx)*4,j=((y+pad)*dst.width+x+pad)*4;if(src.pixels[i+3]===255&&(src.pixels[i]||src.pixels[i+1]||src.pixels[i+2])){assert.deepEqual([...dst.pixels.slice(j,j+4)],[...src.pixels.slice(i,i+4)],r.uid+' original pixel');protectedPixels++;}}
 }
 return{opaqueNonblackPixelsPreserved:protectedPixels};
});
await test('Hyena dark belly survives exact-black processing and source-clipped art stays flagged',()=>{
 const h=report.records.find(r=>r.uid==='reoutbreak2-zombie-hyena');assert.equal(h.blackTolerance,0);assert(h.removedPixels>0);
 for(const uid of ['recv-moth','re4-colmillos','reoutbreak2-horn-bill']){assert.equal(M.records[uid].production.sourceClipped,true);assert.equal(A.audit(find(uid)).ready,false);}
});
await test('Ten oblique images face their target without becoming validated lateral silhouettes',()=>{
 const items=review.items.filter(i=>i.classification==='oblique');assert.equal(items.length,10);
 for(const i of items)for(const face of[-1,1]){const p=A.resolve(find(i.uid),face);assert.equal(p.sideProfile,false,i.uid);assert.equal(p.status,'directional-reference');assert.equal(p.path,M.records[i.uid].referenceImage.path);assert.equal(p.mirror,face===A.side(i.facing)?1:-1);}
});
await test('Two existing near-profile poses join the three earlier reference poses, not five new drawings',()=>{
 assert.equal(F.filter(f=>A.audit(f).ready).length,5);
 for(const uid of['re6-strelat','reoutbreak2-zombie-hyena']){assert(A.audit(find(uid)).ready);for(const dir of[-1,1]){const p=A.resolve(find(uid),dir);assert.equal(p.animated,false);assert.equal(p.oppositeAnatomyValidated,false);}}
 assert.equal(Object.values(M.records).flatMap(r=>Object.keys(r.clips||{})).length,0);return{readyNativeReferencePoses:5,newIndependentAnatomicalPairs:0,newAnimationSheets:0};
});
await test('Reviewed reference descriptors reject unsafe or unreviewed inputs',()=>{
 const v={...M.records['re6-strelat'].referenceImage};assert(A.validReference(v));
 for(const bad of[{reviewed:false},{projection:'side'},{path:'https://example.test/foreign.png'},{path:'assets/../foreign.png'},{width:0},{height:NaN},{anchor:[2,1]},{crop:[0,0,v.width+1,v.height]}])assert.equal(A.validReference({...v,...bad}),false);
});
await test('Protected asymmetric subjects cannot receive an automatic bilateral exemption',()=>{
 for(const name of['BIRKIN','BANDERSNATCH','NEMESIS','TYRANT T-002']){const f={...fixture,name,visual:{asymmetric:false}},r={mirrorReviewed:true,referenceMirrorReviewed:true,bilateralReview:{uid:f.uid,approved:true,rationale:'An incorrect exemption must not override a protected asymmetric family.'}};assert.equal(A.mayMirror(f,r),false);}
});
await test('Identical atlas pixels cannot claim two anatomical sides by changing names, timings or anchors',()=>{
 const l={...clip('left'),sha256:'a'.repeat(64)},r={...clip('right'),sha256:'a'.repeat(64),anchor:[.2,.8]};r.frames=r.frames.map(f=>({...f,ticks:f.ticks+1}));assert.throws(()=>assertDistinctSides(l,r,'fixture'),/Duplicate anatomical pixels/);
 assert.doesNotThrow(()=>assertDistinctSides(l,{...r,frames:[{crop:[20,0,20,40],ticks:3}]}));assert.doesNotThrow(()=>assertDistinctSides(l,{...r,sha256:'b'.repeat(64)}));
});
await test('Action preloading also warms the same-side idle fallback, bounded to four unique images',async()=>{
 const e=await loadGame(path.join(R,'laboratory.html'));try{e.window.RE_ASSET_DATA={};for(const side of['left','right']){e.window.RE_ASSET_DATA[view(side).path]=await solid('#2040e0');e.window.RE_ASSET_DATA[clip(side).path]=await atlas();}
 e.window.RE_DIRECTIONAL_ART.records[fixture.uid]={views:{left:view('left'),right:view('right')},clips:{heavy:{left:clip('left'),right:clip('right')}}};const results=await e.window.RE_RENDERER.preloadFighter(fixture,{animationState:'heavy'});await e.images();assert.equal(results.length,4);assert(results.every(r=>r.ok));
 const paths=new Set(e.window.RE_RENDERER.diagnostics().assets.filter(a=>a.path.startsWith('assets/tests/r4-')).map(a=>a.path));assert.equal(paths.size,4);
 }finally{e.dispose();}
});
await test('Missing processed reference falls back to its original image and retains the error',async()=>{
 const e=await loadGame(path.join(R,'laboratory.html'));try{e.window.RE_ASSET_DATA={[fixture.sprite]:await solid('#2040e0')};e.window.RE_DIRECTIONAL_ART.records[fixture.uid]={referenceFacing:'left',referenceImage:{...view('left','missing'),projection:'reference'}};
 const c=e.document.createElement('canvas');c.width=400;c.height=300;const ctx=c.getContext('2d');for(let i=0;i<3;i++){ctx.clearRect(0,0,400,300);e.window.RE_RENDERER.drawFighter(ctx,fixture,200,200,-1,1,{time:0});await e.images();}
 const p=rgb(ctx);assert(p[2]>150&&p[0]<90);assert(e.window.RE_RENDERER.diagnostics().errors.some(x=>x.path.endsWith('r4-missing.png')));return{expectedMissingFixture:true};
 }finally{e.dispose();}
});
await test('Dossier outcome clips advance through real renderer pixels and restart on a new page',async()=>{
 const e=await loadGame(path.join(R,'laboratory.html'));try{e.window.RE_ASSET_DATA={[fixture.sprite]:await solid('#2020e0'),[view('right').path]:await solid('#2020e0'),[clip('right').path]:await atlas()};
 e.window.RE_DIRECTIONAL_ART.records[fixture.uid]={views:{right:view('right')},clips:{win:{right:clip('right')}}};await e.window.RE_RENDERER.preloadFighter(fixture,{animationState:'win'});await e.images();
 const c=e.document.createElement('canvas');c.width=1280;c.height=720;const cx=c.getContext('2d'),story={uid:fixture.uid,intro:[{}],outro:[{},{}],route:[]},options={fighters:{[fixture.uid]:fixture},motion:true,time:80};
 e.window.RE_RENDERER.drawCinema(c,story,'outro',0,0,options);let p=rgb(cx,318,480);assert(p[0]>p[1]*2,'first red frame');
 e.window.RE_RENDERER.drawCinema(c,story,'outro',0,0,{...options,time:80.1});p=rgb(cx,318,480);assert(p[1]>p[0]*2,'green frame after six ticks');
 e.window.RE_RENDERER.drawCinema(c,story,'outro',0,1,{...options,time:81});p=rgb(cx,318,480);assert(p[0]>p[1]*2,'new page restarts');
 e.window.RE_RENDERER.drawCinema(c,story,'outro',0,1,{...options,motion:false,time:99});p=rgb(cx,318,480);assert(p[0]>p[1]*2,'motion disabled remains first frame');
 }finally{e.dispose();}
});
await test('All 346 body definitions and combat/replay contracts remain unchanged',()=>{
 const base=json('docs/DIRECTIONAL_R3_PRESERVATION.json');for(const [file,sha]of Object.entries(base.files))assert.equal(hash(fs.readFileSync(path.join(R,file))),sha,file);
 assert.equal(F.length,346);assert.equal(json('package.json').version,'0.7.3');return{unchangedFiles:Object.keys(base.files).length,combatIdentities:F.length};
});
const failed=checks.filter(c=>!c.passed).length;fs.writeFileSync(path.join(R,'docs/DIRECTIONAL_R4_TESTS.json'),JSON.stringify({revision:4,passed:checks.length-failed,failed,backend:native.__binding,scope:'Shared production renderer, actual processed native PNGs and synthetic pixel fixtures. No new source-game animation or exhaustive lore certification.',checks},null,2)+'\n');console.log(JSON.stringify({passed:checks.length-failed,failed}));if(failed)process.exitCode=1;
