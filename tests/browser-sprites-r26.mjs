import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-sprites-r26-browser'); fs.mkdirSync(output, {recursive: true});
const port = Number(process.env.BOW_SPRITES_R26_PORT || 5582), base = 'http://127.0.0.1:' + port;
const source = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r26/visual/manifest.json')));
const sheets = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r26/sprites/manifest.json')));
const checks = [], startedAtUtc = new Date().toISOString();
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) {try {checks.push({name, pass:true, detail:await run()}); console.log('PASS '+name);} catch(error) {checks.push({name,pass:false,error:String(error.stack)});console.error('FAIL '+name+': '+error.message);}}
const url = base+'/modules/fidelity-r26/sprites/index.html';
async function ready(page) {await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Planche conservée vérifiée')); await page.locator('#sheet').evaluate(image => image.decode());}
try {
  for (let n=0;n<100;n++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve=>setTimeout(resolve,50));}
  browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  await test('All nine original-source-derived sheets load manually with exact model attribution', async()=>{
    const page=await browser.newPage({viewport:{width:1280,height:900}}), errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await ready(page);
    assert.equal(await page.locator('#model option').count(),9);
    for(const entry of source.entries){
      await page.selectOption('#model',entry.id);await ready(page);
      assert.equal(await page.locator('#source').getAttribute('href'),'../models/index.html?model='+entry.id);
      const dimensions=await page.locator('#sheet').evaluate(image=>[image.naturalWidth,image.naturalHeight]);assert.deepEqual(dimensions,[1024,512]);
      assert.equal(await page.locator('#download').getAttribute('download'),entry.id+'.png');
      assert((await page.locator('.limit').textContent()).includes('ne sont pas des sprites originaux'));
    }
    await page.selectOption('#model','re0-stinger-gc-r26-1');await ready(page);
    await page.screenshot({path:path.join(output,'stinger-desktop.png'),fullPage:true});assert.deepEqual(errors,[]);await page.close();
    return {sheets:9,views:72,combatReadySprites:0,manualOnly:true};
  });
  await test('A real recalculation preserves eight distinct full-frame views from verified textures',async()=>{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'?identity=re0-zombie');await ready(page);
    assert.equal(await page.locator('#model').inputValue(),'re0-zombie-gc-r26-1');await page.click('#render');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Huit vues recalculées'),null,{timeout:60000});
    const rendered=await page.locator('#sheet').evaluate(async image=>{await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d');context.drawImage(image,0,0);const records=[];for(let i=0;i<8;i++){const data=context.getImageData((i%4)*256,Math.floor(i/4)*256,256,256).data;let occupied=0;for(let p=3;p<data.length;p+=4)if(data[p])occupied++;records.push({occupied,sha:[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('')});}return records;});
    assert(rendered.every(view=>view.occupied>20));assert.equal(new Set(rendered.map(view=>view.sha)).size,8);assert.equal(await page.locator('#render').isEnabled(),true);assert.equal(await page.locator('#cancel').isDisabled(),true);assert.deepEqual(errors,[]);await page.close();return {views:8,distinctViews:8,sourceTexturesVerified:true};
  });
  await test('Cancellation during delayed source loading leaves the page usable',async()=>{
    const page=await browser.newPage();await page.goto(url);await ready(page);
    let observed=0;await page.route('**/visual/models/**',async route=>{observed++;await new Promise(resolve=>setTimeout(resolve,250));try{await route.continue();}catch{}});
    await page.click('#render');await page.waitForFunction(()=>!document.querySelector('#cancel').disabled);await page.click('#cancel');await page.waitForFunction(()=>document.querySelector('#status').textContent==='Calcul annulé.');
    assert.equal(await page.locator('#model').isEnabled(),true);assert.equal(await page.locator('#render').isEnabled(),true);assert.equal(await page.locator('#sheet').isVisible(),true);await page.close();return {observedSourceRequests:observed,cancellation:true,previousSheetRetained:true};
  });
  await test('Corrupted stored PNG bytes are rejected without displaying an unverified image',async()=>{
    const page=await browser.newPage();await page.route('**/sprites/sheets/*.png',async route=>{const response=await route.fetch();const body=Buffer.from(await response.body());body[body.length-8]^=1;await route.fulfill({response,body});});await page.goto(url);await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('La planche conservée ne peut pas'));
    assert.equal(await page.locator('#sheet').isHidden(),true);assert.equal(await page.locator('#download').isHidden(),true);assert.equal(await page.locator('#render').isEnabled(),true);await page.close();return {tamperingRejected:true};
  });
  await test('Corrupted OBJ bytes fail recalculation while the verified sheet remains available',async()=>{
    const page=await browser.newPage();await page.goto(url);await ready(page);await page.route('**/visual/models/**/*.obj',async route=>{const response=await route.fetch();const body=Buffer.from(await response.body());body[0]^=1;await route.fulfill({response,body});});await page.click('#render');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Le calcul est indisponible.'));
    assert.equal(await page.locator('#sheet').isVisible(),true);assert.equal(await page.locator('#render').isEnabled(),true);await page.close();return {sourceHashFailureRejected:true,verifiedSheetRetained:true};
  });
  await test('Invalid resource paths and invented input kinds never leave the source pack',async()=>{
    const page=await browser.newPage();await page.goto(url);await ready(page);
    const outcomes=await page.evaluate(async()=>{const {renderSheet}=await import('./renderer.js');const manifest=await fetch('../visual/manifest.json').then(r=>r.json());const entry=manifest.entries[0],results=[];for(const changed of [{...entry,format:'FBX'},{...entry,model:{...entry.model,path:'../outside.obj'}},{...entry,model:{...entry.model,path:'https://example.invalid/model.obj'}}]){try{await renderSheet(changed);results.push(false);}catch{results.push(true);}}return results;});assert.deepEqual(outcomes,[true,true,true]);await page.close();return {rejectedCases:3};
  });
  await test('Page lifecycle events release and reacquire the verified sheet without restarting a render',async()=>{
    const page=await browser.newPage();await page.goto(url);await ready(page);const before=await page.locator('#sheet').getAttribute('src');
    await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await ready(page);
    const after=await page.locator('#sheet').getAttribute('src');assert.notEqual(after,before);assert(after.startsWith('blob:'));assert.equal(await page.locator('#render').isEnabled(),true);assert.equal(await page.locator('#model').isEnabled(),true);assert.equal(await page.locator('#cancel').isDisabled(),true);await page.close();return {simulatedLifecycleEvents:true,sheetReverified:true,automaticRender:false,nativeBfcacheCertified:false};
  });
  await test('Keyboard, narrow layouts and missing WebGL retain the verified inspection sheet',async()=>{
    const context=await browser.newContext({viewport:{width:320,height:900}});await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(name,...args){return /^(webgl2?|experimental-webgl)$/.test(name)?null:original.call(this,name,...args);};});const page=await context.newPage();await page.goto(url+'?model=%3Cscript%3E');await ready(page);await page.addStyleTag({content:':root{font-size:200%}'});
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'32px');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');await page.keyboard.press('Enter');await page.waitForFunction(()=>location.hash==='#main');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');await page.click('#render');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Le calcul est indisponible.'));assert.equal(await page.locator('#sheet').isVisible(),true);await page.check('#nativeSize');assert(await page.locator('#sheetFrame').evaluate(node=>node.scrollWidth>node.clientWidth));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.uncheck('#nativeSize');await page.screenshot({path:path.join(output,'narrow-no-webgl.png'),fullPage:true});await context.close();return {viewport:320,textPercent:200,horizontalOverflow:false,webglFallback:true};
  });
} finally {await browser?.close();server.kill();const report={schema:'re.bow.source-pose-sheet-browser/1',startedAtUtc,finishedAtUtc:new Date().toISOString(),passed:checks.filter(item=>item.pass).length,failed:checks.filter(item=>!item.pass).length,originalGameSprites:0,combatReadySprites:0,physicalDeviceCertified:false,checks};fs.writeFileSync(path.join(root,'docs/R26_SPRITES_BROWSER.json'),JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;}
