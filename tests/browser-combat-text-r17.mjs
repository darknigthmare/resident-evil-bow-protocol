/** Actual HTTP browser/keyboard. CPU acceleration and short timers are labelled.
 * Verifies accessibility semantics, not screen-reader speech or physical devices. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{spawn}from'node:child_process';import{fileURLToPath}from'node:url';import{chromium}from'playwright';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),O=path.join(R,'qa-combat-text-r17'),base='http://127.0.0.1:5195',checks=[];fs.mkdirSync(O,{recursive:true});let browser;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:'5195'},stdio:'ignore'});
async function test(name,width,fn){try{const detail=await fn();checks.push({name,width,pass:true,...detail});console.log('PASS '+name+' '+width);}catch(e){checks.push({name,width,pass:false,error:e.stack});throw e;}}
try{
 for(let k=0;k<100;k++){try{if((await fetch(base+'/catalog-duel.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',x=>errors.push(x.message));
  await test('Native panel setup, workbook bytes and independent sound-off activation',width,async()=>{
   await page.goto(base+'/modules/versus.html?uid=re7-lucas-baker',{waitUntil:'networkidle'});
   assert.equal(await page.evaluate(()=>RE_MAIN_TEXT_PANEL.view().enabled),false);const saved=await page.evaluate(()=>{localStorage.setItem('r17-sentinel','keep');return JSON.stringify({...localStorage});});
   await page.locator('#selectScreen .ct-open-r17').click();await page.check('#combatTextEnableR17');await page.selectOption('#combatTextSizeR17','large');await page.check('#combatTextAnnounceR17');
   assert.equal(await page.locator('#combatTextPanelR17').getAttribute('aria-modal'),'true');assert.equal(await page.locator('#combatTextListR17').getAttribute('aria-live'),'off');assert.equal(await page.locator('.ct-sr-r17').getAttribute('aria-live'),'polite');
   const xlsx=await context.request.get(base+'/docs/planning/BOW_REPERES_COMBAT_R17.xlsx');assert.equal(xlsx.status(),200);assert.deepEqual(await xlsx.body(),fs.readFileSync(path.join(R,'docs/planning/BOW_REPERES_COMBAT_R17.xlsx')));
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),saved);assert.equal(await page.evaluate(()=>__CQC053Versus.host.audio.diagnostics().unlocked),false);return{nativeControls:true,xlsxBytes:(await xlsx.body()).length,storageUnchanged:true};
  });
  await test('Actual empty detonator gets readable captions with no audio unlock',width,async()=>{
   await page.click('#launch');await page.waitForFunction(()=>__CQC053Versus.getState()?.phase==='fight');await page.keyboard.press('KeyL');await page.waitForFunction(()=>RE_MAIN_TEXT_PANEL.view().totals.empty===1);
   assert.match(await page.locator('#combatTextOverlayR17').innerText(),/Aucune charge armée/);assert.equal(await page.evaluate(()=>__CQC053Versus.host.audio.diagnostics().unlocked),false);
   assert(await page.locator('#combatTextOverlayR17 p').count()<=2);await page.screenshot({path:path.join(O,'main-captions-'+width+'.png')});return{nativeUtility:true,soundDisabled:true,noFakeExplosion:true};
  });
  await test('Native modal keyboard, pause continuity and inert background',width,async()=>{
   await page.locator('#fightScreen .ct-open-r17').click();assert(await page.evaluate(()=>__CQC053Versus.diagnostics().paused));const f=await page.evaluate(()=>__CQC053Versus.getState().frame);await page.waitForTimeout(130);assert.equal(await page.evaluate(()=>__CQC053Versus.getState().frame),f);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'combatTextEnableR17');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'combatTextSizeR17');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'combatTextEnableR17');
   assert(await page.evaluate(()=>{for(let x=document.getElementById('fightScreen');x;x=x.parentElement)if(x.inert)return true;return false;}));await page.screenshot({path:path.join(O,'panel-'+width+'.png')});
   await page.keyboard.press('Escape');assert(!await page.evaluate(()=>__CQC053Versus.diagnostics().paused));assert.equal(await page.evaluate(()=>document.activeElement.id),'game');await page.keyboard.press('Escape');assert(await page.evaluate(()=>__CQC053Versus.diagnostics().paused));await page.locator('#fightScreen .ct-open-r17').click();await page.keyboard.press('Escape');assert(await page.evaluate(()=>__CQC053Versus.diagnostics().paused));return{nativeTab:true,nativeShiftTab:true,restoredFocus:true,preexistingPauseRetained:true};
  });
  await test('Configured real timed match records one textual result without repeating on final draw',width,async()=>{
   const result=await page.evaluate(()=>{const a=__CQC053Versus;a.startExternal({p1:'re7-lucas-baker',p2:'re1-hunter',mode:'local',rounds:1,seconds:1,p2Life:1,finishers:'off'});for(let n=0;n<250&&!a.getState().finished;n++)a.advance(100);const v=RE_MAIN_TEXT_PANEL.view();for(let n=0;n<40;n++)a.draw();return{finished:a.getState().finished,resultCount:RE_MAIN_TEXT_PANEL.view().totals.result,winner:a.getState().winner,unchanged:v.history.length===RE_MAIN_TEXT_PANEL.view().history.length};});assert.deepEqual(result,{finished:true,resultCount:1,winner:0,unchanged:true});return{realEngineStepped:true,shortTimerAndHealthConfigured:true,...result};
  });
  await test('Experimental journal follows CPU events and rejects bad import without replacing its transcript',width,async()=>{
   await page.goto(base+'/catalog-duel.html?uid=re5-gatling-gun-majini&target=re5-big-man-majini',{waitUntil:'networkidle'});const saved=await page.evaluate(()=>JSON.stringify({...localStorage}));
   await page.locator('.ct-open-r17').click();await page.check('#combatTextEnableR17');await page.click('#combatTextCloseR17');
   await page.evaluate(()=>{document.getElementById('trialMode').value='cpu';RE_CATALOG_DUEL.reset(true);RE_CATALOG_DUEL.tick(250);document.getElementById('trialPause').click();});
   assert(await page.evaluate(()=>RE_TRIAL_TEXT_PANEL.view().history.length>0));const history=await page.evaluate(()=>JSON.stringify(RE_TRIAL_TEXT_PANEL.view().history));const state=await page.evaluate(()=>JSON.stringify(RE_CATALOG_DUEL.getState()));
   await page.setInputFiles('#trialReplayImport',{name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{')});await page.waitForFunction(()=>document.getElementById('trialReplayStatus').textContent.includes('IMPORT REFUSÉ'));
   assert.equal(await page.evaluate(()=>JSON.stringify(RE_CATALOG_DUEL.getState())),state);assert.equal(await page.evaluate(()=>JSON.stringify(RE_TRIAL_TEXT_PANEL.view().history)),history);
   assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),saved);await page.locator('.ct-open-r17').click();await page.screenshot({path:path.join(O,'trial-journal-'+width+'.png')});return{CPUAccelerated:true,nativeFileInput:true,storageUnchanged:true};
  });
  await test('Clear affects only the journal; replay seeking resets annotations, not gameplay data',width,async()=>{
   await page.click('#combatTextClearR17');assert.equal(await page.locator('#combatTextListR17 li').count(),0);await page.click('#combatTextCloseR17');
   const replay=await page.evaluate(()=>RE_CATALOG_DUEL.exportReplay());await page.setInputFiles('#trialReplayImport',{name:'actual-replay.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replay))});await page.waitForFunction(()=>RE_CATALOG_DUEL.isReplay());assert.equal(await page.evaluate(()=>RE_TRIAL_TEXT_PANEL.view().history.length),0);
   await page.fill('#trialReplaySeek','120');await page.locator('#trialReplaySeek').dispatchEvent('change');assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),120);assert.equal(await page.evaluate(()=>RE_TRIAL_TEXT_PANEL.view().history.length),0);
   for(const frame of [200,40,180]){await page.fill('#trialReplaySeek',String(frame));await page.locator('#trialReplaySeek').dispatchEvent('change');assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),frame);assert.equal(await page.evaluate(()=>RE_TRIAL_TEXT_PANEL.view().history.length),0);}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);return{nativeImport:true,seekFrame:120,clearIsPresentationOnly:true,consoleErrors:errors.length};
  });await context.close();
 }
}catch(e){console.error(e.stack);process.exitCode=1;if(!checks.some(x=>!x.pass))checks.push({pass:false,error:e.stack});}finally{await browser?.close();server.kill('SIGTERM');const r={suite:'combat-text-r17-http',passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,physicalDevices:false,screenReaderSpeechCertified:false,checks};fs.writeFileSync(path.join(O,'BROWSER_COMBAT_TEXT_R17_RESULTS.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({passed:r.passed,failed:r.failed}));}
