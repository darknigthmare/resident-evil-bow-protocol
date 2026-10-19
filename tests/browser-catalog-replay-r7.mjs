/** Real localhost HTTP, keyboard, download and file input. Cache events are synthetic. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{spawn}from'node:child_process';import{fileURLToPath,pathToFileURL}from'node:url';
const{chromium}=await import(process.env.BOW_PLAYWRIGHT_MODULE?pathToFileURL(process.env.BOW_PLAYWRIGHT_MODULE).href:'playwright');
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(R,'qa-catalog-replay-r7');fs.mkdirSync(out,{recursive:true});
const port=5197,base='http://127.0.0.1:'+port,checks=[];let browser;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/catalog-duel.html')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Local server unavailable');}
try{
 await ready();browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\.(png|js|css)(?:\?|$)/.test(r.url()))bad.push(r.url());});
  assert.equal((await page.goto(base+'/catalog-duel.html?uid=re3r-nemesis&target=re3r-stage-2-nemesis&stage=nest2_weapon_test_2020',{waitUntil:'networkidle'})).status(),200);
  assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().a.f.uid),'re3r-nemesis');
  const storage=await page.evaluate(()=>JSON.stringify({...localStorage}));
  await page.click('#trialStart');await page.click('#trialIntroSkip'); // R10: focus/replay test begins after the presentation.
assert.equal(await page.evaluate(()=>document.activeElement.id),'trialCanvas');
  await page.keyboard.press('KeyJ');await page.waitForFunction(()=>RE_CATALOG_DUEL.getState().a.stats.starts>=1);
  await page.waitForFunction(()=>RE_CATALOG_DUEL.getState().frame>=70);await page.click('#trialPause');
  const value=await page.evaluate(()=>RE_CATALOG_DUEL.exportReplay());assert(value.frames>=70);
  const pending=page.waitForEvent('download');await page.click('#trialReplayExport');const download=await pending;
  const file=path.join(out,'keyboard-recording-'+width+'.json');await download.saveAs(file);
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),value);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:path.join(out,'duel-keyboard-'+width+'.png'),fullPage:true});checks.push({width,pass:true,scenario:'HTTP keyboard focus, real command and downloaded replay',frames:value.frames});
  await page.setInputFiles('#trialReplayImport',{name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await page.waitForFunction(()=>RE_CATALOG_DUEL.isReplay());assert(await page.evaluate(()=>RE_CATALOG_DUEL.isPaused()));assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),0);
  await page.click('#trialStep');assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),1);
  await page.fill('#trialReplaySeek',String(value.frames));await page.locator('#trialReplaySeek').dispatchEvent('change');
  assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),value.frames);
  assert.equal(await page.locator('[data-slot="super"]').isDisabled(),true);
  await page.click('#trialReplayRestart');assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),0);
  await page.screenshot({path:path.join(out,'replay-import-'+width+'.png'),fullPage:true});checks.push({width,pass:true,scenario:'Actual JSON input, paused playback, one-frame step, seek and restart'});
  const before=await page.evaluate(()=>JSON.stringify(RE_CATALOG_DUEL.getState()));
  await page.setInputFiles('#trialReplayImport',{name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{')});
  await page.waitForFunction(()=>document.getElementById('trialReplayStatus').textContent.includes('IMPORT REFUSÉ'));
  assert.equal(await page.evaluate(()=>JSON.stringify(RE_CATALOG_DUEL.getState())),before);assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:path.join(out,'replay-rejected-'+width+'.png'),fullPage:true});checks.push({width,pass:true,scenario:'Malformed file leaves current replay and state intact',consoleErrors:errors.length,failedAssets:bad.length});
  await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  assert(await page.evaluate(()=>RE_CATALOG_DUEL.isPaused()));assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),storage);
  await page.click('#trialReplayExit');assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.isReplay()),false);assert(await page.evaluate(()=>RE_CATALOG_DUEL.isPaused()));
  checks.push({width,pass:true,scenario:'Synthetic cached-page lifecycle, exit and unchanged browser storage',actualBFCacheCertified:false});await context.close();
 }
}catch(e){checks.push({pass:false,error:e.stack});console.error(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill('SIGTERM');const d={scope:'Actual localhost HTTP Chromium; keyboard, download and file input. Cache events synthetic. No physical-device or canon certification.',passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks};fs.writeFileSync(path.join(out,'BROWSER_R7_RESULTS.json'),JSON.stringify(d,null,2)+'\n');console.log(JSON.stringify({passed:d.passed,failed:d.failed}));}
