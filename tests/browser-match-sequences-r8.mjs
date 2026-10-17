/** Real localhost HTTP. Round/final states are explicitly prepared test fixtures,
 * not advertised as an entire human play-through or new character animation. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{spawn}from'node:child_process';import{fileURLToPath}from'node:url';import{chromium}from'playwright';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(R,'qa-sequences-r8');fs.mkdirSync(out,{recursive:true});
const port=5198,base='http://127.0.0.1:'+port,checks=[];let browser;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/sequences.html')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('HTTP test server did not start');}
try{
 await ready();browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\.(png|js|css)(?:\?|$)/.test(r.url()))bad.push(r.url());});
  assert.equal((await page.goto(base+'/sequences.html?uid=re1-crow&state=roundLose',{waitUntil:'networkidle'})).status(),200);
  await page.waitForFunction(()=>RE_RENDERER.diagnostics().loading===0&&RE_RENDERER.diagnostics().queued===0);
  assert.equal(await page.evaluate(()=>RE_SEQUENCE_WORKSHOP.diagnostics().state),'roundLose');
  assert.equal(await page.locator('#sequenceSubject option').count(),346);assert.equal(await page.locator('#sequenceState option').count(),8);
  await page.click('#sequenceStep');assert.equal(await page.evaluate(()=>RE_SEQUENCE_WORKSHOP.diagnostics().tick),1);
  await page.selectOption('#sequenceState','matchLose');assert.equal(await page.evaluate(()=>RE_SEQUENCE_WORKSHOP.diagnostics().tick),0);
  assert((await page.locator('#sequenceDetail').textContent()).includes('SÉQUENCE DISTINCTE'));
  await page.fill('#sequenceTick','24');await page.locator('#sequenceTick').dispatchEvent('change');assert.equal(await page.evaluate(()=>RE_SEQUENCE_WORKSHOP.diagnostics().tick),24);
  assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:path.join(out,'atelier-'+width+'.png'),fullPage:true});
  checks.push({pass:true,width,scenario:'Atelier: 346 sujets, 8 états, changement de séquence et tick; stockage inchangé',missingArtExplicit:true});
  await page.fill('#sequenceSearch','XYZNOTASUBJECTXYZ');assert(await page.locator('#sequenceStep').isDisabled());assert.equal(await page.evaluate(()=>RE_SEQUENCE_WORKSHOP.diagnostics().uid),null);
  await page.fill('#sequenceSearch','re1-crow');await page.click('#sequencePlay');await page.waitForFunction(()=>RE_SEQUENCE_WORKSHOP.diagnostics().tick>1);
  await page.evaluate(()=>dispatchEvent(new Event('blur')));const before=await page.evaluate(()=>RE_SEQUENCE_WORKSHOP.diagnostics().tick);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>RE_SEQUENCE_WORKSHOP.diagnostics().tick),before);
  await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});assert.equal(await page.evaluate(()=>RE_SEQUENCE_WORKSHOP.diagnostics().playing),false);
  checks.push({pass:true,width,scenario:'Recherche vide, lecture, pause de focus et événements de cache synthétiques',actualBFCache:false});
  assert.equal((await page.goto(base+'/modules/versus.html',{waitUntil:'networkidle'})).status(),200);
  const prepared=await page.evaluate(()=>{
   const api=__CQC053Versus;api.startExternal({p1:'re1-cerberus',p2:'re1-hunter',mode:'local',rounds:2,seconds:99,finishers:'off'});api.pause(true);
   const s=api.getState();s.phase='roundEnd';s.phaseT=50;s.roundWinner=0;s.a.wins=1;s.b.life=0;s.b.state='ko';s.finished=false;s.winner=null;
   const description=RE_MATCH_SEQUENCES.describe(s,1);const finish=api.beginFinisher();api.draw();return{description,finish,pose:RE_MATCH_SEQUENCES.pose(s,1)};
  });
  assert.equal(prepared.description.state,'roundLose');assert.equal(prepared.description.reversible,true);assert.equal(prepared.pose.knockdown,false);assert.equal(prepared.finish,false);
  await page.screenshot({path:path.join(out,'manche-preparee-'+width+'.png')});
  const final=await page.evaluate(()=>{const api=__CQC053Versus,s=api.getState();s.finished=true;s.winner=0;s.a.wins=2;api.pause(false);for(let i=0;i<24;i++)api.advance(250);api.pause(true);const frame=api.getPresentation().frame,description=RE_MATCH_SEQUENCES.describe(s,0,{finalTick:frame});const snap=JSON.stringify(s);api.advance(250);api.draw();return{frame,description,pausedFrame:api.getPresentation().frame,unchanged:JSON.stringify(s)===snap};});
  assert(final.frame>96);assert.equal(final.description.state,'outro');assert.equal(final.pausedFrame,final.frame);assert(final.unchanged);
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);checks.push({pass:true,width,scenario:'Vrai contrôleur principal : défaite R1 réversible, conclusion refusée, horloge finale et pause',statePreparation:'État de fin de manche/match injecté explicitement pour le test, pas un combat parcouru',errors,badAssets:bad});
  await context.close();
 }
}catch(e){checks.push({pass:false,error:e.stack});console.error(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill('SIGTERM');const report={scope:'Chromium localhost HTTP. States prepared explicitly, cache events synthetic; no new art or physical-device certification.',passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks};fs.writeFileSync(path.join(out,'BROWSER_R8_RESULTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
