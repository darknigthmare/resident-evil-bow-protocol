/** Actual HTTP. Original rooms, native controls, paused-state checks.
 * A restarted match or selected stage is not a claimed manual walkthrough. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{spawn}from'node:child_process';import{fileURLToPath}from'node:url';import{chromium}from'playwright';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),O=path.join(R,'qa-baker-r14-http'),base='http://127.0.0.1:5196',checks=[];fs.mkdirSync(O,{recursive:true});let browser;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:'5196'},stdio:'ignore'});
async function test(name,width,fn){try{const detail=await fn();checks.push({name,width,pass:true,...detail});console.log('PASS '+name+' '+width);}catch(e){checks.push({name,width,pass:false,error:e.stack});throw e;}}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/stages.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of[1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'no-preference'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const id of['baker_garage_2017','guest_house_attic_2017','testing_area_2017'])await test('Distinct room, layers and exact shared frame / '+id,width,async()=>{
   assert.equal((await p.goto(base+'/stages.html?stage='+id,{waitUntil:'networkidle'})).status(),200);assert.equal(await p.locator('#stageSelect option').count(),52);assert.match(await p.locator('#stageDescription').textContent(),/R14/);
   const book=await p.request.get(base+'/docs/planning/BOW_STAGES_BAKER_R14.xlsx');assert.equal(book.status(),200);assert.deepEqual(await book.body(),fs.readFileSync(path.join(R,'docs/planning/BOW_STAGES_BAKER_R14.xlsx')));
   await p.fill('#stageSeek','120');await p.locator('#stageSeek').dispatchEvent('change');assert.equal(await p.evaluate(()=>RE_STAGE_WORKSHOP.getState().frame),120);
   await p.locator('#stageCanvas').screenshot({path:path.join(O,id+'-'+width+'.png')});
   const before=await p.evaluate(()=>document.getElementById('stageCanvas').toDataURL());await p.selectOption('#stageLayer','architecture');const bare=await p.evaluate(()=>document.getElementById('stageCanvas').toDataURL());assert.notEqual(bare,before);
   await p.selectOption('#stageLayer','light');await p.click('#stageShare');await p.waitForLoadState('networkidle');const s=await p.evaluate(()=>RE_STAGE_WORKSHOP.getState());assert.equal(s.stage,id);assert.equal(s.frame,120);assert.equal(s.layer,'light');assert(!s.playing);
   await p.click('#stageStep');assert.equal(await p.evaluate(()=>RE_STAGE_WORKSHOP.getState().frame),121);await p.click('#stagePlay');await p.waitForFunction(()=>RE_STAGE_WORKSHOP.getState().frame>124);await p.click('#stagePlay');const paused=await p.evaluate(()=>RE_STAGE_WORKSHOP.getState().frame);await p.waitForTimeout(110);assert.equal(await p.evaluate(()=>RE_STAGE_WORKSHOP.getState().frame),paused);
   await p.check('#stageReduced');const reduced=await p.evaluate(()=>document.getElementById('stageCanvas').toDataURL());await p.fill('#stageSeek','999');await p.locator('#stageSeek').dispatchEvent('change');assert.equal(await p.evaluate(()=>document.getElementById('stageCanvas').toDataURL()),reduced);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await p.evaluate(()=>localStorage.length),0);
   return{stage:id,nativeControls:true,sharedFrame:120,rewindAndReduced:true,canvasScreenshot:true};
  });
  await test('Main Versus and laboratories render rooms without advancing paused combat',width,async()=>{
   await p.goto(base+'/modules/versus.html',{waitUntil:'networkidle'});const result=await p.evaluate(()=>{const a=__CQC053Versus;a.startExternal({p1:'re7-lucas-baker',p2:'re7-flying-bug',stage:'testing_area_2017',mode:'local',rounds:2,seconds:99,finishers:'off'});a.pause(true);const before=JSON.stringify(a.getState());a.draw();a.draw();return{unchanged:before===JSON.stringify(a.getState()),room:RE_BAKER_STAGES.describe(RE_DATA.stages.find(s=>s.id==='testing_area_2017')).revision};});assert(result.unchanged);assert.equal(result.room,'R14');await p.locator('#game').screenshot({path:path.join(O,'versus-'+width+'.png')});
   for(const page of['laboratory.html','catalog-laboratory.html']){await p.goto(base+'/'+page+'?uid=re7-lucas-baker&stage=testing_area_2017&slot=special',{waitUntil:'networkidle'});assert(await p.evaluate(()=>!!RE_BAKER_STAGES));const stable=await p.evaluate(()=>JSON.stringify(RE_TECHNIQUE_LAB.getBench().getState()));await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>JSON.stringify(RE_TECHNIQUE_LAB.getBench().getState())),stable);}return{pausedDraw:true,actualControllers:true};
  });
  assert.deepEqual(errors,[]);await context.close();
 }
}catch(e){console.error(e.stack);process.exitCode=1;if(!checks.some(c=>!c.pass))checks.push({pass:false,error:e.stack});}finally{await browser?.close();server.kill('SIGTERM');const r={suite:'baker-r14-http',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,physicalDevices:false,canonicalArt:false,checks};fs.writeFileSync(path.join(O,'BROWSER_BAKER_R14_RESULTS.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({passed:r.passed,failed:r.failed}));}
