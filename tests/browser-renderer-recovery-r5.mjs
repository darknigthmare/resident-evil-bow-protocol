/** Actual HTTP navigation, plus an explicitly injected 503 to exercise recovery. */
import {chromium} from 'playwright';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(R,'qa-renderer-r5');fs.mkdirSync(out,{recursive:true});
const port=5195,base='http://127.0.0.1:'+port,server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});let browser;const checks=[];
async function ready(){for(let i=0;i<100;i++){try{if((await fetch(base+'/directions.html')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Local server did not start');}
try{
 await ready();browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];let broken=true,requests=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/assets/lateral-native/r4/reoutbreak2-zombie-hyena.png',async route=>{requests++;if(broken)await route.fulfill({status:503,body:'R5 controlled failure'});else await route.continue();});
  assert.equal((await page.goto(base+'/directions.html?uid=reoutbreak2-zombie-hyena',{waitUntil:'networkidle'})).status(),200);
  await page.waitForFunction(()=>RE_RENDERER.diagnostics().errors.some(e=>e.path.endsWith('/r4/reoutbreak2-zombie-hyena.png')));
  await page.waitForFunction(()=>RE_RENDERER.diagnostics().assets.some(e=>e.path==='assets/catalog/reoutbreak2-zombie-hyena.png'&&e.state==='ready'));
  assert.equal(await page.locator('#directionRetry').isEnabled(),true);assert.equal(requests,1);await page.waitForTimeout(250);assert.equal(requests,1);
  const before='fallback-'+width+'.png';await page.screenshot({path:path.join(out,before)});
  broken=false;await page.click('#directionRetry');
  await page.waitForFunction(()=>RE_RENDERER.diagnostics().errors.length===0&&RE_RENDERER.diagnostics().assets.some(e=>e.path.endsWith('/r4/reoutbreak2-zombie-hyena.png')&&e.state==='ready'));
  assert.equal(requests,2);assert.equal(await page.locator('#directionRetry').isDisabled(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
  const after='recovered-'+width+'.png';await page.screenshot({path:path.join(out,after)});checks.push({width,pass:true,actualHttpNavigation:true,controlled503:true,requests,buttonRecovery:true,jsErrors:errors,screenshots:[before,after]});await ctx.close();
 }
}catch(e){checks.push({pass:false,error:e.stack});process.exitCode=1;console.error(e.stack);}finally{await browser?.close();server.kill('SIGTERM');fs.writeFileSync(path.join(out,'BROWSER_R5_RESULTS.json'),JSON.stringify({mode:'Chromium on localhost HTTP; 503 fault injection declared',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,physicalDevices:false,newArtCertification:false,checks},null,2)+'\n');console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length}));}
