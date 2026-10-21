/** Real HTTP, file imports/downloads and native controls; Storage faults injected explicitly. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{spawn}from'node:child_process';import{fileURLToPath}from'node:url';import{chromium}from'playwright';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),O=path.join(R,'qa-saves-r19'),base='http://127.0.0.1:5193',checks=[];fs.mkdirSync(O,{recursive:true});let browser;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:R,env:{...process.env,RE_BOW_PORT:'5193'},stdio:'ignore'});
async function test(name,width,fn){try{const detail=await fn();checks.push({name,width,pass:true,...detail});console.log('PASS '+name+' '+width);}catch(e){checks.push({name,width,pass:false,error:e.stack});throw e;}}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/saves.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox']});
 for(const width of[1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/saves.html',{waitUntil:'networkidle'});
  const all=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));
  const importFile=async text=>{await page.locator('#importSaves').setInputFiles({name:'sauvegarde-test.json',mimeType:'application/json',buffer:Buffer.from(text)});await page.waitForFunction(()=>document.getElementById('importSaves').value==='');};
  const fixture=async entries=>page.evaluate(entries=>RE_SAVE_CENTER.encode(RE_SAVE_CENTER.KEYS.map(key=>({key,value:entries[key]??null})),'Fixture navigateur R19','2026-10-21T15:00:00.000Z'),entries);
  const download=async(id,file)=>{const promise=page.waitForEvent('download');await page.click(id);const d=await promise,p=path.join(O,file+'-'+width+'.json');await d.saveAs(p);return fs.readFileSync(p,'utf8');};
  await test('Native export preserves game raw values and excludes unrelated credentials',width,async()=>{
   await page.evaluate(()=>{localStorage.setItem('re.bow.audio058',' {"master":0.25} ');localStorage.setItem('re-bow-v048-bindings','{"j1":{"light":"KeyJ"}}');localStorage.setItem('unrelated-auth','DO-NOT-EXPORT');});await page.click('#refreshSaves');const before=await all(),text=await download('#exportSaves','complete');assert(!text.includes('DO-NOT-EXPORT'));const e=JSON.parse(text);assert.equal(e.entries.find(x=>x.key==='re.bow.audio058').value,' {"master":0.25} ');assert.deepEqual(await all(),before);assert.equal(await page.locator('#localInventory .card').count(),8);return{nativeDownload:true,untouchedStorage:true};
  });
  let incoming;
  await test('Import, unchecked groups and preview are read-only until an explicit decision',width,async()=>{
   incoming=await fixture({'re.bow.audio058':'{"master":0.4}','re-bow-v048-bindings':'{"j1":{"light":"KeyK"}}'});const before=await all();await importFile(incoming);assert(await page.locator('#previewSaves').isDisabled());await page.check('#restore-audio');await page.click('#previewSaves');assert(await page.locator('#applySaves').isDisabled());assert(await page.locator('#confirmRestore').isDisabled());assert.match(await page.locator('#changeList').innerText(),/re.bow.audio058/);assert.deepEqual(await all(),before);await page.screenshot({path:path.join(O,'preview-'+width+'.png'),fullPage:true});return{selectedGroup:'audio',noWrites:true};
  });
  await test('Before-copy download then native confirmation restores only the chosen group',width,async()=>{
   const before=await all(),text=await download('#exportBefore','before'),e=JSON.parse(text);assert.equal(e.entries.find(x=>x.key==='re.bow.audio058').value,before['re.bow.audio058']);await page.check('#confirmRestore');await page.click('#applySaves');const after=await all();assert.equal(after['re.bow.audio058'],'{"master":0.4}');assert.equal(after['re-bow-v048-bindings'],before['re-bow-v048-bindings']);assert.equal(after['unrelated-auth'],'DO-NOT-EXPORT');assert.match(await page.locator('#saveStatus').innerText(),/restaurée/);return{nativeConfirmation:true,changedKeys:1};
  });
  await test('Corrupted imports and malformed copies cannot overwrite a good local group',width,async()=>{
   const before=await all();await importFile('{broken');assert.match(await page.locator('#saveStatus').innerText(),/illisible/);assert.deepEqual(await all(),before);await importFile(await fixture({'re.bow.audio058':'{broken'}));assert(await page.locator('#restore-audio').isDisabled());assert.deepEqual(await all(),before);return{corruptionInjected:true};
  });
  await test('An actual second browser tab invalidates a stale preview via the storage event',width,async()=>{
   await importFile(incoming);await page.check('#restore-audio');await page.click('#previewSaves');const other=await ctx.newPage();await other.goto(base+'/saves.html');await other.evaluate(()=>localStorage.setItem('re.bow.audio058','{"other-tab":true}'));await page.waitForFunction(()=>document.getElementById('previewSection').hidden);assert.match(await page.locator('#saveStatus').innerText(),/autre onglet/);assert.equal((await all())['re.bow.audio058'],'{"other-tab":true}');await other.close();return{realSecondTab:true};
  });
  await test('A quota error on a later write rolls back earlier keys with an honest failure message',width,async()=>{
   await page.evaluate(()=>localStorage.setItem('re.bow.audio058','{}'));await importFile(incoming);await page.check('#restore-audio');await page.check('#restore-controls');await page.click('#previewSaves');await download('#exportBefore','before-fault');await page.check('#confirmRestore');const before=await all();await page.evaluate(()=>{const original=Storage.prototype.setItem;let calls=0;Storage.prototype.setItem=function(k,v){if(++calls===2)throw new DOMException('test quota','QuotaExceededError');return original.call(this,k,v)};window.restoreStoragePort=()=>{Storage.prototype.setItem=original};});await page.click('#applySaves');assert.deepEqual(await all(),before);assert.match(await page.locator('#saveStatus').innerText(),/refusée ou annulée/);await page.evaluate(()=>restoreStoragePort());return{faultInjected:true,oldValuesRestored:true};
  });
  await test('Native keyboard navigation, mobile layout and cancellation preserve the session',width,async()=>{
   await importFile(incoming);await page.check('#restore-audio');await page.click('#previewSaves');const before=await all();await page.locator('#cancelRestore').focus();await page.keyboard.press('Enter');assert(await page.locator('#previewSection').isHidden());assert.equal(await page.evaluate(()=>document.activeElement.id),'previewSaves');assert.deepEqual(await all(),before);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);await page.screenshot({path:path.join(O,'center-'+width+'.png'),fullPage:true});return{keyboardEnter:true,noHorizontalOverflow:true};
  });
  await test('The Excel link downloads the exact shipped tracking workbook',width,async()=>{
   const promise=page.waitForEvent('download');await page.locator('a[download="BOW_SAUVEGARDES_R19.xlsx"]').click();const d=await promise,p=path.join(O,'workbook-'+width+'.xlsx');await d.saveAs(p);assert(fs.readFileSync(p).equals(fs.readFileSync(path.join(R,'docs/planning/BOW_SAUVEGARDES_R19.xlsx'))));return{exactWorkbook:true};
  });
  await ctx.close();
 }
}catch(e){console.error(e.stack);process.exitCode=1;if(!checks.some(c=>!c.pass))checks.push({pass:false,error:e.stack});}
finally{await browser?.close();server.kill('SIGTERM');const result={suite:'save-center-r19-http',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,physicalDevice:false,checks};fs.writeFileSync(path.join(O,'BROWSER_SAVES_R19_RESULTS.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed:result.failed}));}
