/** Real HTTP browser/controllers. Laboratory objects and CPU acceleration labelled. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import{fileURLToPath}from'node:url';import{chromium}from'playwright';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(R,'qa-lucas-r11'),checks=[];fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:5197',server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:'5197'},stdio:'ignore'});let browser;
async function test(name,width,fn){try{const detail=await fn();checks.push({name,width,pass:true,...detail});console.log('PASS '+name+' '+width);}catch(e){checks.push({name,width,pass:false,error:e.stack});throw e;}}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/index.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of[1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await test('Compiled moveset and manual laboratory detonation agree',width,async()=>{
   assert.equal((await page.goto(base+'/laboratory.html?uid=re7-lucas-baker&slot=utility',{waitUntil:'networkidle'})).status(),200);
   assert.match(await page.locator('#labMove option:checked').textContent(),/Mise à feu/);await page.click('#labActivation');
   const snap=await page.evaluate(()=>RE_TECHNIQUE_LAB.getBench().snapshot());assert.equal(snap.activations,1);assert.equal(snap.life,7000);assert(snap.damage>0);assert.equal(snap.statuses.poison,undefined);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
   await page.screenshot({path:path.join(out,'detonator-'+width+'.png')});return{explicitLabChargeFixture:true,damage:snap.damage,life:snap.life};
  });
  await test('Timed super remains visible before fuse and emits three real explosions',width,async()=>{
   await page.selectOption('#labMove','super');await page.click('#labActivation');let state=await page.evaluate(()=>{const s=RE_TECHNIQUE_LAB.getBench().getState();return{traps:s.traps.length,explosions:s.metrics.explosion||0,meter:s.a.meter};});assert.deepEqual(state,{traps:3,explosions:0,meter:50});
   await page.screenshot({path:path.join(out,'network-'+width+'.png')});const result=await page.evaluate(()=>{const b=RE_TECHNIQUE_LAB.getBench();b.tick(170);return{explosions:b.getState().metrics.explosion,heal:b.getState().a.stats.healed,poison:b.getState().b.statuses.poison||null};});assert.deepEqual(result,{explosions:3,heal:0,poison:null});return{labTimeAccelerated:true,...result};
  });
  await test('Main menu selects exact Lucas, while frame-zero profile has no mutated utility',width,async()=>{
   await page.goto(base+'/modules/versus.html?uid=re7-lucas-baker',{waitUntil:'networkidle'});await page.click('#launch');await page.waitForFunction(()=>__CQC053Versus.getState()?.phase==='fight');await page.keyboard.press('Escape');
   const info=await page.evaluate(()=>{const a=__CQC053Versus,s=a.getState();return{uid:s.a.f.uid,utility:s.a.f.combat.moves.utility.kind,sourceStatus:s.a.f.fidelity.status,poison:Object.values(s.a.f.combat.moves).some(m=>m.status==='poison'),paused:a.diagnostics().paused};});assert.deepEqual(info,{uid:'re7-lucas-baker',utility:'detonate',sourceStatus:'source-review-partial',poison:false,paused:true});return info;
  });
  await test('Experimental replay reconstructs a complete Lucas CPU duel including network objects',width,async()=>{
   await page.goto(base+'/catalog-duel.html?uid=re7-lucas-baker&target=re5-big-man-majini',{waitUntil:'networkidle'});
   const result=await page.evaluate(()=>{const a=RE_CATALOG_DUEL;document.getElementById('trialMode').value='cpu';a.reset(true);a.tick(7000);const done=JSON.stringify(a.getState()),v=a.exportReplay(),finished=a.getState().finished,devices=a.getState().metrics.trapPlaced||0;a.installReplay(v);a.tick(v.frames);return{finished,devices,same:JSON.stringify(a.getState())===done,frames:v.frames,storage:localStorage.length};});assert(result.finished&&result.same);assert(result.devices>0);assert.equal(result.storage,0);assert.deepEqual(errors,[]);return{realCPUAccelerated:true,...result};
  });
  await context.close();
 }
}catch(e){console.error(e.stack);process.exitCode=1;if(!checks.some(c=>!c.pass))checks.push({pass:false,error:e.stack});}finally{await browser?.close();server.kill('SIGTERM');const r={suite:'lucas-r11-http',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,physicalDevices:false,canonicalArt:false,checks};fs.writeFileSync(path.join(out,'BROWSER_LUCAS_R11_RESULTS.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({passed:r.passed,failed:r.failed}));}
