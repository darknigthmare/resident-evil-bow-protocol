/** R33 current source coverage: real UI, verified archived models and deterministic presentation framing. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'qa-gamedev-r33');fs.mkdirSync(output,{recursive:true});
const port=Number(process.env.BOW_R33_PORT||5993),origin='http://127.0.0.1:'+port;
const checks=[],pageErrors=[];let browser,server;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
async function available(){try{return (await fetch(origin+'/modules/fidelity-r33/index.html')).ok;}catch{return false;}}
async function test(name,run){try{const detail=await run();checks.push({name,pass:true,detail});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
async function open(width=1280){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',error=>pageErrors.push({width,message:error.message}));
 const response=await page.goto(origin+'/modules/fidelity-r33/index.html');assert.equal(response.status(),200);
 await page.waitForFunction(()=>globalThis.RE_FIDELITY_R33?.state().ready===true,undefined,{timeout:30000});
 return{context,page};
}
async function resetFilters(page){
 await page.locator('#search').fill('');await page.selectOption('#kind','all');await page.selectOption('#coverage','all');
 await page.waitForFunction(()=>RE_FIDELITY_R33.state().filtered===389);
}
async function filtered(page,value){await page.waitForFunction(expected=>RE_FIDELITY_R33.state().filtered===expected,value);return page.evaluate(()=>RE_FIDELITY_R33.state());}
async function canvasAlpha(page,selector){
 return page.locator(selector).evaluate(canvas=>{const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;let visible=0,edge=0;for(let i=3;i<data.length;i+=4)if(data[i]){visible++;const p=(i-3)/4,x=p%canvas.width,y=Math.floor(p/canvas.width);if(x===0||y===0||x===canvas.width-1||y===canvas.height-1)edge++;}return{visible,edge,width:canvas.width,height:canvas.height};});
}
try{
 server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let ready=false;for(let i=0;i<120;i++){if(await available()){ready=true;break;}await pause(100);}assert(ready,'R33 dev server did not start');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader']});
 await test('R33 loads the complete 389-identity inventory without changing progression storage',async()=>{
  const {context,page}=await open();try{
   const storage=await page.evaluate(()=>JSON.stringify({...localStorage})),state=await page.evaluate(()=>RE_FIDELITY_R33.state());
   assert.equal(state.identityCount,389);assert.equal(state.filtered,389);assert.equal(state.pages,Math.ceil(389/24));
   assert.equal(await page.locator('#inventory article').count(),24);
   assert.match(await page.locator('#status').innerText(),/389 incarnations/);
   assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),storage);
   return{identities:state.identityCount,pageSize:24,pages:state.pages,localStorageUnchanged:true};
  }finally{await context.close();}
 });
 await test('Category filters retain 115 main, 231 prototype and 43 contextual identities',async()=>{
  const {context,page}=await open();try{
   const result={};
   for(const [kind,count] of [['main',115],['prototype',231],['context',43]]){await page.selectOption('#kind',kind);await filtered(page,count);result[kind]=count;}
   await resetFilters(page);return result;
  }finally{await context.close();}
 });
 await test('R33 coverage filters expose only the explicitly delivered identities',async()=>{
  const {context,page}=await open();try{
   const expected={native:2,source:1,framing:1,r33:4,open:385},result={};
   for(const [coverage,count] of Object.entries(expected)){await page.selectOption('#coverage',coverage);await filtered(page,count);result[coverage]=count;}
   await page.selectOption('#coverage','native');
   const text=await page.locator('#inventory').innerText();assert(text.includes('re0-zombie'));assert(text.includes('reoutbreak-zombie'));
   await resetFilters(page);return result;
  }finally{await context.close();}
 });
 await test('Search, pagination and native keyboard focus remain usable',async()=>{
  const {context,page}=await open();try{
   const search=page.locator('#search');await search.focus();await page.keyboard.type('re1r-zombie');await filtered(page,1);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'search');assert.match(await page.locator('#inventory').innerText(),/re1r-zombie/);
   await resetFilters(page);const before=await page.evaluate(()=>RE_FIDELITY_R33.state().page);
   await page.locator('#next').focus();await page.keyboard.press('Enter');await page.waitForFunction(value=>RE_FIDELITY_R33.state().page===value,before+1);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'next');
   await page.locator('#previous').click();await page.waitForFunction(()=>RE_FIDELITY_R33.state().page===0);
   return{trustedKeyboardSearch:true,nativeButtonActivation:true,pageChanged:true};
  }finally{await context.close();}
 });
 await test('The GameCube zombie left source view is SHA-verified, nonmirrored and not promoted to combat idle',async()=>{
  const {context,page}=await open();try{
   const state=await page.evaluate(()=>RE_FIDELITY_R33.state().sourceLeft),pixels=await canvasAlpha(page,'#sourceLeft');
   assert.equal(state.ready,true);assert.equal(state.sha256,'079c75e094ad3ee0c79445b30d6aa19f76878876a406ce901a31e58342910fda');
   assert.equal(state.width,768);assert.equal(state.height,768);assert.equal(state.mirrored,false);assert.equal(state.combatIdleCertified,false);
   assert(pixels.visible>1000);assert.equal(pixels.edge,0);
   return{...state,visiblePixels:pixels.visible,edgePixels:pixels.edge};
  }finally{await context.close();}
 });
 await test('Lucas R33 framing verifies the R31 PNG and adds transparent margin without new anatomy',async()=>{
  const {context,page}=await open();try{
   const state=await page.evaluate(()=>RE_FIDELITY_R33.state().lucas),pixels=await canvasAlpha(page,'#lucasFrame');
   assert.equal(state.ready,true);assert.equal(state.sourceSha256,'c52ea3e524fed6230118d609bc8434f6e52790575c02892287acaff44e52d414');
   assert.equal(state.sourcePixelsAltered,false);assert.equal(state.newAnatomyGenerated,false);assert(Math.min(...Object.values(state.margins))>=59,state.margins);
   assert(pixels.visible>1000);assert.equal(pixels.edge,0);
   return{margins:state.margins,minMargin:Math.min(...Object.values(state.margins)),sourcePixelsAltered:false,newAnatomyGenerated:false};
  }finally{await context.close();}
 });
 await test('All four archived OBJ variants render sixteen source views without mirroring, pose edits or clipping',async()=>{
  const {context,page}=await open();try{
   const manifest=JSON.parse(fs.readFileSync(path.join(root,'modules/fidelity-r33/manifest.json'),'utf8')),results=[];
   for(const entry of manifest.nativeViews.entries){
    await page.evaluate(id=>RE_FIDELITY_R33.renderNative(id),entry.id);
    await page.waitForFunction(id=>{const value=RE_FIDELITY_R33.state().native;return value.status==='ready'&&value.id===id;},entry.id,{timeout:60000});
    const state=await page.evaluate(()=>RE_FIDELITY_R33.state().native);
    assert.equal(state.views.length,4);assert.deepEqual(state.views.map(view=>view.angle),[0,90,180,270]);
    assert(state.views.every(view=>view.edgePixels===0&&view.occupiedPixels>20));
    assert.equal(state.recipe.geometryMirrored,false);assert.equal(state.recipe.modelTransformsChanged,false);assert.equal(state.recipe.poseChanged,false);
    assert.equal(state.modelSha256,entry.model.sha256);assert.equal(await page.locator('#nativeViews canvas').count(),4);
    const alpha=await page.locator('#nativeViews canvas').evaluateAll(canvases=>canvases.map(canvas=>{const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;let visible=0,edge=0;for(let i=3;i<data.length;i+=4)if(data[i]){visible++;const p=(i-3)/4,x=p%canvas.width,y=Math.floor(p/canvas.width);if(x===0||y===0||x===canvas.width-1||y===canvas.height-1)edge++;}return{visible,edge};}));
    assert(alpha.every(value=>value.visible>20&&value.edge===0));
    results.push({id:entry.id,subjectId:entry.subjectId,modelSha256:state.modelSha256,views:state.views.map(view=>({angle:view.angle,occupiedPixels:view.occupiedPixels,edgePixels:view.edgePixels,rgbaSha256:view.rgbaSha256}))});
   }
   assert.equal(results.reduce((sum,row)=>sum+row.views.length,0),16);
   await page.screenshot({path:path.join(output,'native-r33-last-model.png'),fullPage:true});
   return{models:results.length,nativeViews:16,geometryMirrored:false,poseChanged:false,results};
  }finally{await context.close();}
 });
 await test('R33 reflows at 320px with actual 200 percent root text without hiding overflow',async()=>{
  const {context,page}=await open(320);try{
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   await page.waitForTimeout(50);
   const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,rootFont:getComputedStyle(document.documentElement).fontSize,hidden:[...document.querySelectorAll('main *')].filter(node=>['hidden','clip'].includes(getComputedStyle(node).overflowX)).length}));
   assert.equal(size.rootFont,'32px');assert(size.scroll<=size.width+1,JSON.stringify(size));assert.equal(size.hidden,0);
   await page.locator('#search').focus();await page.keyboard.type('Lucas');assert((await page.evaluate(()=>RE_FIDELITY_R33.state().filtered))>=1);
   await page.screenshot({path:path.join(output,'r33-320-text200.png'),fullPage:true});
   return{...size,keyboardFilterAt200Percent:true};
  }finally{await context.close();}
 });
 await test('The DEV center exposes R33 without changing the player-facing menu',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();try{
   await page.goto(origin+'/dev.html');const link=page.locator('a[href="modules/fidelity-r33/index.html?dev=1"]');assert.equal(await link.count(),1);assert.match(await link.innerText(),/R33/);
   return{devLink:true,playerMenuFilesChanged:false};
  }finally{await context.close();}
 });
}finally{
 const browserVersion=browser?.version()||null;await browser?.close();server?.kill('SIGTERM');
 const sourceFiles=['modules/fidelity-r33/index.html','modules/fidelity-r33/style.css','modules/fidelity-r33/page.js','modules/fidelity-r33/native-renderer.js','modules/fidelity-r33/manifest.json','modules/fidelity-r24/models/verified-assets.js','data/roster.json','data/catalog-expansion-v070.json','modules/fidelity-r31/dossier-additions.json','modules/fidelity-r31/sprites/sources/views/re1r-zombie-naked-gc-r31/source-90.png','modules/fidelity-r31/sprites/generated/re7-lucas-baker-mutated/full-body.png','tests/browser-r33.mjs'];
 const report={schema:'re.bow.browser-r33/1',observedAtUTC:new Date().toISOString(),browserVersion,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length+pageErrors.length,checks,browserErrors:pageErrors,sourceFiles:sourceFiles.map(file=>({path:file,sha256:hash(file)})),scope:'Real Chromium R33 workbench, current 389-identity data and verified archived OBJ/MTL/PNG source bytes. All four R26 model variants are rendered through the delivered source-preserving renderer for sixteen total views. The GameCube left view and R31 Lucas PNG are SHA-verified before presentation. Community model exports are not certified as raw Capcom package bytes; static source views do not certify original animations, lighting, timing or global 1:1 fidelity. No physical-device certification.'};
 fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({suite:'browser-r33',passed:report.passed,failed:report.failed,browserVersion}));if(report.failed)process.exitCode=1;
}
