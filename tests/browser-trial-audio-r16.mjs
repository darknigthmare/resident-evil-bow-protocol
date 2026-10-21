/** Real HTTP, native controls/download/import and real Web Audio. Accelerated
 * CPU playback, API denial and persisted lifecycle injections are labelled. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{spawn}from'node:child_process';import{fileURLToPath}from'node:url';import{chromium}from'playwright';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(R,'qa-trial-audio-r16'),checks=[];fs.mkdirSync(out,{recursive:true});
const port=5194,base='http://127.0.0.1:'+port,server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});let browser;
async function test(name,width,fn){try{const detail=await fn();checks.push({name,width,pass:true,...detail});console.log('PASS '+name+' '+width);}catch(error){checks.push({name,width,pass:false,error:error.stack});throw error;}}
const diag=page=>page.evaluate(()=>RE_TRIAL_AUDIO_PANEL.diagnostics());
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/catalog-duel.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of[1440,390]){
  let context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await test('No autoplay; native activation and workbook download match the repository',width,async()=>{
   assert.equal((await page.goto(base+'/catalog-duel.html?uid=re5-gatling-gun-majini&target=re6-zombie&stage=baker_garage_2017&sound=1',{waitUntil:'networkidle'})).status(),200);
   await page.evaluate(()=>localStorage.setItem('r16-sentinel','PRESERVE'));assert.equal((await diag(page)).contextState,'uncreated');
   await page.click('#trialSoundPanel summary');await page.click('#trialSoundToggle');await page.waitForFunction(()=>RE_TRIAL_AUDIO_PANEL.diagnostics().unlocked);assert.equal((await diag(page)).ambience,null);assert.equal((await diag(page)).playedCount,0);
   const dlPromise=page.waitForEvent('download');await page.locator('#trialSoundPanel a').click();const dl=await dlPromise,file=path.join(out,'workbook-'+width+'.xlsx');await dl.saveAs(file);assert.deepEqual(fs.readFileSync(file),fs.readFileSync(path.join(R,'docs/planning/BOW_DUELS_AUDIO_R16.xlsx')));
   return{nativeActivation:true,realAudioContext:true,noAutoplay:true,xlsxBytes:fs.statSync(file).size};
  });
  await test('Native attack releases six audible shots; pause and step do not replay pending sound',width,async()=>{
   await page.click('#trialStart');assert.equal((await diag(page)).ambience,null);await page.waitForFunction(()=>!RE_CATALOG_DUEL.getIntro().active&&!RE_CATALOG_DUEL.isPaused());await page.waitForFunction(()=>RE_TRIAL_AUDIO_PANEL.diagnostics().ambience==='baker:baker_garage_2017');
   await page.locator('#trialCanvas').focus();await page.keyboard.press('KeyL');await page.waitForFunction(()=>RE_TRIAL_AUDIO_PANEL.diagnostics().played.filter(e=>e.type==='projectile').length>=6);
   const shots=(await diag(page)).played.filter(e=>e.type==='projectile').slice(0,6);assert.equal(shots.length,6);for(let i=1;i<6;i++)assert.equal(shots[i].frame-shots[i-1].frame,5);
   await page.click('#trialPause');const count=(await diag(page)).playedCount;assert.equal((await diag(page)).ambience,null);assert.equal((await diag(page)).voices,0);
   const frame=await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame);await page.click('#trialStep');assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),frame+1);assert.equal((await diag(page)).playedCount,count);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(out,'duel-audio-'+width+'.png'),fullPage:true});return{nativeKeyboard:true,shots:shots.map(x=>x.frame),singleStepSilent:true};
  });
  await test('Non-real-time speed is silent; bus volumes and resume apply without historical bursts',width,async()=>{
   await page.selectOption('#trialSpeed','0.5');await page.click('#trialPause');await page.waitForFunction(()=>RE_TRIAL_AUDIO_PANEL.diagnostics().mode==='speed');const count=(await diag(page)).playedCount,f=await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame);await page.waitForFunction(frame=>RE_CATALOG_DUEL.getState().frame>frame+8,f);assert.equal((await diag(page)).playedCount,count);assert.equal((await diag(page)).ambience,null);
   await page.selectOption('#trialSpeed','1');await page.waitForFunction(()=>!!RE_TRIAL_AUDIO_PANEL.diagnostics().ambience);
   await page.locator('#trialSoundAmbience').focus();await page.keyboard.press('Home');assert.equal((await diag(page)).ambience,null);assert.equal((await diag(page)).settings.effects,.65);
   for(let n=0;n<15;n++)await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>!!RE_TRIAL_AUDIO_PANEL.diagnostics().ambience);await page.click('#trialPause');return{speedHalfSilent:true,independentVolumes:true};
  });
  await test('Native replay download/import/seek are silent and preserve all existing storage',width,async()=>{
   const before=await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));
   const downloaded=page.waitForEvent('download');await page.click('#trialReplayExport');const dl=await downloaded,file=path.join(out,'replay-'+width+'.json');await dl.saveAs(file);const v=JSON.parse(fs.readFileSync(file,'utf8'));assert(v.frames>60);
   await page.setInputFiles('#trialReplayImport',file);await page.waitForFunction(()=>RE_CATALOG_DUEL.isReplay());assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),0);assert.equal((await diag(page)).ambience,null);
   const seek=Math.floor(v.frames/2),count=(await diag(page)).playedCount;await page.fill('#trialReplaySeek',String(seek));await page.locator('#trialReplaySeek').press('Tab');assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),seek);assert.equal((await diag(page)).playedCount,count);
   const snapshot=await page.evaluate(()=>JSON.stringify(RE_CATALOG_DUEL.getState()));await page.setInputFiles('#trialReplayImport',{name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await page.waitForFunction(()=>document.getElementById('trialReplayStatus').textContent.includes('IMPORT REFUSÉ'));assert.equal(await page.evaluate(()=>JSON.stringify(RE_CATALOG_DUEL.getState())),snapshot);assert.equal((await diag(page)).playedCount,count);
   assert.equal(await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))),before);return{downloadAndImport:true,seek,corruptionInjected:true,storageUnchanged:true};
  });
  await test('Natural CPU result ends ambience once; cached-page fixture requires deliberate reactivation',width,async()=>{
   const result=await page.evaluate(()=>{const a=RE_CATALOG_DUEL;document.getElementById('trialMode').value='cpu';a.reset(true);a.tick(7000);return{finished:a.getState().finished,frame:a.getState().frame,played:RE_TRIAL_AUDIO_PANEL.diagnostics().playedCount};});assert(result.finished);assert.equal((await diag(page)).ambience,null);await page.waitForTimeout(150);assert.equal((await diag(page)).playedCount,result.played);
   await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});assert.equal((await diag(page)).active,false);assert.equal((await diag(page)).ambience,null);assert(!(await diag(page)).disposed);
   await page.click('#trialSoundToggle');await page.waitForFunction(()=>RE_TRIAL_AUDIO_PANEL.diagnostics().unlocked);assert.equal((await diag(page)).ambience,null);assert.deepEqual(errors,[]);return{realCPUAccelerated:true,frame:result.frame,persistedEventsSynthetic:true};
  });
  await context.close();context=await browser.newContext({viewport:{width,height:1000}});page=await context.newPage();errors=[];page.on('pageerror',e=>errors.push(e.message));
  await test('An unavailable AudioContext reports the problem and never prevents play',width,async()=>{
   await page.addInitScript(()=>{window.AudioContext=class{constructor(){throw new Error('R16 declared policy denial');}};window.webkitAudioContext=window.AudioContext;});await page.goto(base+'/catalog-duel.html?uid=re7-lucas-baker',{waitUntil:'networkidle'});await page.click('#trialSoundPanel summary');await page.click('#trialSoundToggle');await page.waitForFunction(()=>document.getElementById('trialSoundStatus').textContent.includes('declared policy denial'));
   await page.click('#trialStart');await page.waitForFunction(()=>RE_CATALOG_DUEL.getState().frame>10);assert.equal((await diag(page)).ambience,null);assert.deepEqual(errors,[]);return{AudioContextDenialInjected:true,gameStillRunning:true};
  });await context.close();
 }
}catch(error){console.error(error.stack);process.exitCode=1;if(!checks.some(x=>!x.pass))checks.push({pass:false,error:error.stack});}finally{await browser?.close();server.kill('SIGTERM');const r={suite:'trial-audio-r16-http',passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,physicalDevices:false,canonAudio:false,checks};fs.writeFileSync(path.join(out,'BROWSER_TRIAL_AUDIO_R16_RESULTS.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({passed:r.passed,failed:r.failed}));}
