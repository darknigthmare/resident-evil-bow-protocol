/** Real localhost HTTP browser tests; scenario fixtures are prepared by the shipped lab. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.BOW_PLAYWRIGHT_MODULE?pathToFileURL(process.env.BOW_PLAYWRIGHT_MODULE).href:'playwright');
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(R,'qa-combat-stage-r6');fs.mkdirSync(out,{recursive:true});const port=5196,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});let browser;const checks=[];
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/stages.html')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Local server unavailable');}
try{await ready();browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'no-preference'}),page=await context.newPage(),errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\.(?:png|js|css)(?:\?|$)/.test(r.url()))bad.push(r.url());});
  for(const stage of ['nest_escape_2019','nest2_weapon_test_2020','village_lake_2023','processing_area_morgue_2017']){
   assert.equal((await page.goto(base+'/stages.html?stage='+stage,{waitUntil:'networkidle'})).status(),200);await page.waitForFunction(()=>!!globalThis.RE_STAGE_WORKSHOP);
   assert.equal(await page.evaluate(()=>RE_STAGE_WORKSHOP.getState().stage),stage);
   await page.click('#stagePlay');await page.waitForFunction(()=>RE_STAGE_WORKSHOP.getState().frame>=25);await page.click('#stagePlay');const frame=await page.evaluate(()=>RE_STAGE_WORKSHOP.getState().frame);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>RE_STAGE_WORKSHOP.getState().frame),frame);
   await page.click('#stageStep');await page.waitForFunction(f=>RE_STAGE_WORKSHOP.getState().frame===f+1,frame);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const shot=stage+'-'+width+'.png';await page.screenshot({path:path.join(out,shot),fullPage:true});checks.push({page:'stages.html',stage,width,pass:true,realHttp:true,pauseAndStep:true,screenshot:shot});
  }
  assert.equal((await page.goto(base+'/laboratory.html?uid=re3r-nemesis&slot=super&distance=500',{waitUntil:'networkidle'})).status(),200);await page.waitForFunction(()=>RE_TECHNIQUE_LAB.getBench().snapshot().uid==='re3r-nemesis');await page.click('#labActivation');
  assert.equal(await page.evaluate(()=>RE_TECHNIQUE_LAB.getBench().getState().a.r),52);
  assert.equal(await page.evaluate(()=>RE_TECHNIQUE_LAB.getBench().snapshot().projectiles),3);
  for(let i=0;i<8;i++)await page.click('#labStep');assert.equal(await page.evaluate(()=>RE_TECHNIQUE_LAB.getBench().snapshot().frame),56);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const shot='nemesis-salvo-'+width+'.png';await page.screenshot({path:path.join(out,shot),fullPage:true});checks.push({page:'laboratory.html',uid:'re3r-nemesis',slot:'super',width,pass:true,realHttp:true,frame:56,screenshot:shot});
  await page.goto(base+'/laboratory.html?uid=re3r-stage-2-nemesis&slot=super&distance=170',{waitUntil:'networkidle'});await page.click('#labActivation');for(let i=0;i<8;i++)await page.click('#labStep');
  const gap=await page.evaluate(()=>RE_TECHNIQUE_LAB.getBench().snapshot());assert.equal(gap.phase,'INTERVALLE');assert.equal(gap.hits,1);for(let i=0;i<6;i++)await page.click('#labStep');assert.equal(await page.evaluate(()=>RE_TECHNIQUE_LAB.getBench().snapshot().hits),2);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const shot2='nemesis-quadruped-'+width+'.png';await page.screenshot({path:path.join(out,shot2),fullPage:true});checks.push({page:'laboratory.html',uid:'re3r-stage-2-nemesis',width,pass:true,realHttp:true,gapThenSecondHit:true,screenshot:shot2});
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await context.close();
 }
}catch(e){checks.push({pass:false,error:e.stack});console.error(e.stack);process.exitCode=1;}finally{await browser?.close();server.kill('SIGTERM');const report={scope:'Actual HTTP navigation on localhost. Prepared gameplay states use shipped laboratory controls. Not a physical mobile or original-game 1:1 certification.',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks};fs.writeFileSync(path.join(out,'BROWSER_R6_RESULTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
