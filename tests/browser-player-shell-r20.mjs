/** R20 native player/DEV routing and layouts. No gamepad or physical-device certification. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'qa-player-shell-r20');fs.mkdirSync(out,{recursive:true});
const port=Number(process.env.BOW_R20_SHELL_PORT||5208),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
const checks=[];let browser,page;
const technical=/\/(?:laboratory|catalog-laboratory|catalog-duel|catalog-encounter|directions|coverage|finishers|sequences|stages|dev)\.html|\/docs\/planning\/.*\.xlsx/;
async function test(name,width,fn){try{const detail=await fn();checks.push({name,width,pass:true,...detail});console.log('PASS '+name+' '+width);}catch(e){checks.push({name,width,pass:false,error:e.stack});throw e;}}
async function layout(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal page overflow');}
async function playerLinks(){const links=await page.locator('a[href]').evaluateAll(a=>a.filter(x=>x.getClientRects().length&&!x.hidden).map(x=>x.href));assert.deepEqual(links.filter(x=>technical.test(x)),[],'Player navigation never exposes the technical tools');}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/codex.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});page=await context.newPage();let errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await test('Versus selection remains playable with no audit badges',width,async()=>{
   await page.goto(base+'/modules/versus.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__CQC055Versus&&document.querySelector('#roster button'));
   await layout();await playerLinks();assert.equal(await page.locator('.combat-audit-badge').isVisible(),false);assert.equal(await page.locator('#finishArchive46').isVisible(),false);
   assert.equal(await page.locator('#launch').isVisible(),true);await page.screenshot({path:path.join(out,'versus-'+width+'.png')});
   await page.click('#launch');await page.waitForFunction(()=>!document.querySelector('#fightScreen').classList.contains('hidden'));await page.click('#pauseBtn');
   assert.equal(await page.locator('#pause43').isVisible(),true);await page.click('#resume43');assert.equal(await page.locator('#pause43').isVisible(),false);
   assert.deepEqual(errors,[]);return{nativeLaunchAndPause:true};
  });
  await test('Dossiers retain their accessible menu and options',width,async()=>{
   errors=[];await page.goto(base+'/modules/chronicles.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.CQC60&&document.querySelector('#roster button'));await layout();await playerLinks();
   await page.click('#optionsBtn');assert.equal(await page.locator('#modal').evaluate(e=>e.open),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#modal').evaluate(e=>e.open),false);
   await page.screenshot({path:path.join(out,'dossiers-'+width+'.png')});assert.deepEqual(errors,[]);return{nativeOptionsDialog:true};
  });
  await test('Bestiary keeps search and playable dossier actions without production status',width,async()=>{
   errors=[];await page.goto(base+'/codex.html',{waitUntil:'networkidle'});await page.fill('#catalogSearch','Nemesis');await page.locator('#catalogGrid button').first().click();
   assert.equal(await page.locator('#specimenDialog').evaluate(e=>e.open),true);assert.doesNotMatch(await page.locator('#detailStatus').innerText(),/AUDIT|PROVISOIRE/);await playerLinks();await page.click('#closeSpecimen');await layout();
   await page.screenshot({path:path.join(out,'archives-'+width+'.png')});assert.deepEqual(errors,[]);return{nativeSearchAndDossier:true};
  });
  await test('Complementary archive creates no experimental launch links',width,async()=>{
   errors=[];await page.goto(base+'/catalog.html',{waitUntil:'networkidle'});await page.locator('#catGrid button').nth(1).click();await playerLinks();await layout();
   assert.equal(await page.locator('#catMoves').isVisible(),false);assert.equal(await page.locator('#catActions a').count(),1);assert.match(await page.locator('#catActions a').getAttribute('href'),/^codex\.html$/);assert.deepEqual(errors,[]);return{informationOnlyArchive:true};
  });
  await test('Combat protocols expose training and tactics without technical lab links',width,async()=>{
   errors=[];await page.goto(base+'/movesets.html?uid=re3r-nemesis',{waitUntil:'networkidle'});await playerLinks();await layout();
   assert.equal(await page.locator('.lab-link').count(),0);assert.equal(await page.locator('#movesetRows tr').count(),10);assert.equal(await page.locator('#movesetTrain').isVisible(),true);assert.deepEqual(errors,[]);return{tenTechniquesAndTraining:true};
  });
  await test('Operations and typewriter keep saves outside development navigation',width,async()=>{
   errors=[];await page.goto(base+'/operations.html?mode=family',{waitUntil:'networkidle'});await layout();await playerLinks();assert.equal(await page.locator('#runMode').inputValue(),'family');assert.doesNotMatch(await page.locator('#selectedRole').innerText(),/AUDIT/);
   await page.goto(base+'/saves.html',{waitUntil:'networkidle'});await layout();await playerLinks();assert.equal(await page.locator('a[download="BOW_SAUVEGARDES_R19.xlsx"]').count(),0);assert.equal(await page.locator('#exportSaves').isVisible(),true);assert.deepEqual(errors,[]);return{saveActionsPresent:true};
  });
  await test('DEV centre and explicit diagnostic mode preserve technical links',width,async()=>{
   errors=[];await page.goto(base+'/dev.html',{waitUntil:'networkidle'});await layout();assert.equal(await page.evaluate(()=>RE_PLAYER_SHELL.isDev&&RE_PLAYER_SHELL.isTool),true);
   await page.locator('a[href="movesets.html?dev=1"]').click();await page.waitForURL('**/movesets.html?dev=1');assert.equal(await page.locator('.lab-link').count(),10);assert.equal(await page.locator('.r20-dev-bar').isVisible(),true);
   await page.goto(base+'/saves.html?dev=1',{waitUntil:'networkidle'});assert.equal(await page.locator('a[download="BOW_SAUVEGARDES_R19.xlsx"]').isVisible(),true);assert.deepEqual(errors,[]);return{explicitDevelopmentMode:true};
  });
  await test('Large text keeps Dossier header hit targets and Versus launch accessible',width,async()=>{
   errors=[];await page.evaluate(()=>RE_INTERFACE_R20.save({text:'large',contrast:'high',motion:'reduced'}));
   await page.goto(base+'/modules/chronicles.html',{waitUntil:'networkidle'});await layout();
   const targets=await page.locator('#app>header nav button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{visible:r.width>0&&r.height>=40,left:r.left,right:r.right,owned:hit===b||b.contains(hit)};}));
   for(const t of targets)assert(t.visible&&t.owned&&t.left>=0&&t.right<=width+1,JSON.stringify(t));
   await page.click('#optionsBtn');assert.equal(await page.locator('#modal').evaluate(e=>e.open),true);await page.keyboard.press('Escape');
   await page.goto(base+'/modules/versus.html',{waitUntil:'networkidle'});await layout();await page.click('#launch');await page.waitForFunction(()=>!document.querySelector('#fightScreen').classList.contains('hidden'));
   assert.deepEqual(errors,[]);return{largeText:true,highContrast:true,nativeClicks:true};
  });
  await context.close();
 }
}catch(e){if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(e.stack);process.exitCode=1;if(!checks.some(c=>!c.pass))checks.push({pass:false,error:e.stack});}
finally{await browser?.close();server.kill('SIGTERM');const result={suite:'player-shell-r20-http',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,physicalDevices:false,checks};fs.writeFileSync(path.join(out,'BROWSER_PLAYER_SHELL_R20_RESULTS.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed}));}
