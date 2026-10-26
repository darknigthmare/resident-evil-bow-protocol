import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),output=path.join(root,'qa-canonical-r27');fs.mkdirSync(output,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'modules/fidelity-r27/canonical/manifest.json')));
const base=`http://127.0.0.1:${process.env.BOW_R27_CANONICAL_PORT||5665}`,server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:new URL(base).port},stdio:'ignore'});
const checks=[],startedAt=new Date().toISOString();let browser;const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function test(name,run){try{const detail=await run();checks.push({name,pass:true,detail});console.log('PASS '+name);}catch(e){checks.push({name,pass:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
async function ready(page){await page.waitForFunction(()=>window.RE_CANONICAL_R27?.state().ready);}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await wait(75);}
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of[1440,390])await test(`Eighty-one new subjects, exact source snapshots and form filters at ${width}px`,async()=>{
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/modules/fidelity-r27/canonical/index.html');await ready(page);assert.equal(await page.locator('#results button').count(),81);assert.match(await page.locator('#summary').innerText(),/84 nouvelles citations/);
   await page.fill('#search','re4r-plaga');await page.locator('#results button').click();assert.equal(new URL(page.url()).hash,'#re4r-plaga');assert.match(await page.locator('#details').innerText(),/eight legs/);assert.match(await page.locator('#details').innerText(),/quatre pattes/);
   const links=await page.locator('#details a[download]').evaluateAll(nodes=>nodes.map(n=>n.href));assert.equal(links.length,1);for(const href of links)assert((await context.request.get(href)).ok());
   await page.fill('#search','');await page.selectOption('#filter','scope');assert.equal(await page.locator('#results button').count(),4);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,`canonical-${width}.png`),fullPage:true});assert.deepEqual(errors,[]);
   return{newSubjects:81,newClaims:84,cumulativeReviewedSubjects:356,scopeSubjects:4,localSnapshotsResolved:1};
  }finally{await context.close();}
 });
 await test('Negated human combat, uncertain identity and illusion preserve their scope',async()=>{
  const page=await browser.newPage();try{
   await page.goto(base+'/modules/fidelity-r27/canonical/index.html#re7-lucas-baker');await ready(page);assert.match(await page.locator('#details').innerText(),/Négation limitée/);assert.match(await page.locator('#details').innerText(),/doesn't even fight you/);await page.selectOption('#filter','negative');assert.equal(await page.locator('#results button').count(),1);
   await page.goto(base+'/modules/fidelity-r27/canonical/index.html#rerequiem-the-commander');await ready(page);assert.match(await page.locator('#details').innerText(),/pas un alias HUNK certifié/);assert.match(await page.locator('#details').innerText(),/theorised/);
   await page.goto(base+'/modules/fidelity-r27/canonical/index.html#revillage-baby');await ready(page);assert.match(await page.locator('#details').innerText(),/never stated/);return{negativePredicatesPreserved:true,hypothesisNotAlias:true,illusionNotPhysicalProof:true};
  }finally{await page.close();}
 });
 await test('Original and remake bodies, DLC and asymmetric left hand stay separate',async()=>{
  const page=await browser.newPage();try{
   await page.goto(base+'/modules/fidelity-r27/canonical/index.html#re4-bitores-mendez-mutated');await ready(page);assert.match(await page.locator('#details').innerText(),/human face/);assert.match(await page.locator('#details').innerText(),/jeu2005/);assert.equal(await page.locator('#details .claim').count(),1);
   await page.goto(base+'/modules/fidelity-r27/canonical/index.html#re4r-bitores-mendez-first-mutation');await ready(page);assert.match(await page.locator('#details').innerText(),/legs still look human/);assert.match(await page.locator('#details').innerText(),/Première mutation/);
   await page.goto(base+'/modules/fidelity-r27/canonical/index.html#re7-lucas-baker-mutated');await ready(page);assert.match(await page.locator('#details').innerText(),/left hand/);assert.match(await page.locator('#details').innerText(),/Not a Hero/);return{gameEditionsSeparate:true,dlcExplicit:true,leftHandNotMirrored:true};
  }finally{await page.close();}
 });
 await test('Inert quoted text and malformed or external source indices fail closed',async()=>{
  const context=await browser.newContext(),page=await context.newPage();let mode='text';const changed=structuredClone(manifest);changed.claims[0].label='<img src=x onerror="window.r27Injected=true">';
  await page.route('**/fidelity-r27/canonical/manifest.json',route=>{const value=structuredClone(changed);if(mode==='short')value.entries.pop();if(mode==='remote')value.sources[0].snapshot='https://untrusted.example/capture.gz';return route.fulfill({status:200,json:value});});
  try{
   await page.goto(base+'/modules/fidelity-r27/canonical/index.html#'+changed.claims[0].uid);await ready(page);assert.equal(await page.evaluate(()=>Boolean(window.r27Injected)),false);assert.match(await page.locator('#details').innerText(),/<img src=x/);
   for(mode of['short','remote']){await page.reload();await page.waitForFunction(()=>document.querySelector('#summary').textContent.startsWith('Chargement impossible'));assert.equal(await page.locator('#results button').count(),0);}return{markupInert:true,incompleteIndexRefused:true,remoteSnapshotRefused:true};
  }finally{await context.close();}
 });
}finally{
 const report={schema:'re.bow.canonical-browser-r27/1',startedAt,completedAt:new Date().toISOString(),passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks,primaryCapturesCertified:false,completeMovesetsCertified:false};const raw=JSON.stringify(report,null,2)+'\n';fs.writeFileSync(path.join(output,'R27_CANONICAL_BROWSER_RESULTS.json'),raw);fs.writeFileSync(path.join(root,'docs/R27_CANONICAL_BROWSER.json'),raw);await browser?.close();server.kill();if(report.failed)process.exitCode=1;
}
