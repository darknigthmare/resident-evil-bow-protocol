/** Real localhost HTTP. CPU flags are test setup, not injected life/winners. */
import {chromium} from 'playwright';import {spawn} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir=path.join(R,'qa-round-r8');fs.mkdirSync(dir,{recursive:true});const port=5198,base='http://127.0.0.1:'+port,server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});let browser;const checks=[];
try{for(let i=0;i<100;i++){try{if((await fetch(base+'/directions.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.equal((await page.goto(base+'/directions.html?uid=re3r-nemesis',{waitUntil:'networkidle'})).status(),200);assert.equal(await page.locator('#directionState option').count(),28);
  await page.selectOption('#directionState','roundLose');await page.click('#directionStep');assert.equal(await page.evaluate(()=>RE_DIRECTIONS_PAGE.snapshot().tick),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(dir,'atelier-'+width+'.png')});
  assert.equal((await page.goto(base+'/modules/versus.html',{waitUntil:'networkidle'})).status(),200);
  const result=await page.evaluate(()=>{const api=__CQC053Versus,F=api.fighters;api.startExternal({p1:F[0].uid,p2:F[1].uid,stage:api.stages[0].id,mode:'local',rounds:2,seconds:99,seed:8091,finishers:'off'});let s=api.getState();s.a.ai=s.b.ai=true;api.pause(false);
   for(let i=0;i<14000&&!(s.phase==='roundEnd'&&s.round===1);i++)api.advance(1000/60);
   if(s.round!==1||s.phase!=='roundEnd')throw Error('First actual round did not terminate');api.pause(true);api.draw();
   const states=[RE_ROUND_PRESENTATION.sample(s,s.a).state,RE_ROUND_PRESENTATION.sample(s,s.b).state];return{states,firstRound:s.round,finished:s.finished,finisher:api.getFinisherState().window,frame:s.frame};});
  assert(!result.finished);assert.equal(result.finisher,null);assert(result.states.every(s=>['roundWin','roundLose','roundDraw'].includes(s)));
  await page.screenshot({path:path.join(dir,'round1-'+width+'.png')});
  const final=await page.evaluate(()=>{const api=__CQC053Versus;api.pause(false);for(let i=0;i<28000&&!api.getState().finished;i++)api.advance(1000/60);const s=api.getState();api.pause(true);api.draw();return{finished:s.finished,states:[RE_ROUND_PRESENTATION.sample(s,s.a).state,RE_ROUND_PRESENTATION.sample(s,s.b).state],scores:[s.a.wins,s.b.wins],frame:s.frame};});
  assert(final.finished);assert.deepEqual([...final.states].sort(),['matchLose','matchWin']);assert.deepEqual(errors,[]);await page.screenshot({path:path.join(dir,'match-'+width+'.png')});
  checks.push({width,pass:true,realHttp:true,setup:'Two CPU-controlled actors; no health/winner injected',result,final,jsErrors:errors});await context.close();
 }
}catch(error){checks.push({pass:false,error:error.stack});console.error(error.stack);process.exitCode=1;}finally{await browser?.close();server.kill('SIGTERM');fs.writeFileSync(path.join(dir,'BROWSER_R8_RESULTS.json'),JSON.stringify({passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,scope:'Actual localhost HTTP Chromium; not physical phone/controller validation or new art certification',checks},null,2)+'\n');}
