import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'qa-source-appearance-r27');fs.mkdirSync(output,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'modules/fidelity-r27/sources/manifest.json')));
const port=Number(process.env.BOW_SOURCE_APPEARANCE_R27_PORT||5667),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
let browser;const checks=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function test(name,fn){try{const evidence=await fn();checks.push({name,pass:true,evidence});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
async function ready(page){await page.waitForFunction(()=>!document.querySelector('#identity').disabled&&/fichier\(s\) vérifié\(s\)/.test(document.querySelector('#status').textContent));}
async function select(page,id){await page.selectOption('#identity',id);await ready(page);}
try{
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await delay(50);}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  await test('All389 identities retain source scopes, original image dimensions and model candidates',async()=>{
    const context=await browser.newContext(),page=await context.newPage();
    try{
      await page.goto(base+'/modules/fidelity-r27/sources/index.html');await ready(page);
      assert.equal(await page.locator('#identity option').count(),389);
      assert.deepEqual(await page.locator('#identity option').evaluateAll(nodes=>nodes.map(node=>node.value)),manifest.entries.map(entry=>entry.id));
      await page.fill('#search','mia winters');await ready(page);assert.equal(await page.locator('#identity option').count(),1);
      assert.match(await page.locator('#identityTitle').innerText(),/Mia/i);
      assert.equal(await page.locator('#metadataNote').isVisible(),true);
      await page.selectOption('#scope','complete');await ready(page);assert.equal(await page.locator('.source-card').count(),0,'A reviewed close portrait is not a complete body.');
      await page.fill('#search','');await ready(page);await page.selectOption('#scope','all');await ready(page);
      await select(page,'re0-lurker');assert(await page.locator('.source-card').count()>1);
      const expected=manifest.entries.find(entry=>entry.id==='re0-lurker').references;
      const images=await page.locator('.source-card img:not([hidden])').evaluateAll(nodes=>nodes.map(node=>({width:node.naturalWidth,height:node.naturalHeight})));
      assert.deepEqual(images,expected.map(ref=>({width:ref.width,height:ref.height})));
      await select(page,'re0-proto-tyrant');assert.match(await page.locator('#models').innerText(),/candidat/);
      return{identities:389,partialPortraitNotPromoted:true,verifiedLurkerImages:images.length,candidatesDistinct:true};
    }finally{await context.close();}
  });
  await test('Keyboard skip, narrow320px and actual200percent text retain readable references',async()=>{
    const context=await browser.newContext({viewport:{width:320,height:900}}),page=await context.newPage();
    try{
      await page.goto(base+'/modules/fidelity-r27/sources/index.html?identity=re0-lurker');await ready(page);
      await page.addStyleTag({content:'body{font-size:32px!important}input,select,button{font:inherit!important}'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).fontSize),'32px');
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
      await page.keyboard.press('Enter');await page.waitForURL(url=>url.hash==='#main');
      await page.locator('#search').focus();await page.keyboard.type('fumer');await ready(page);assert.match(await page.locator('#identityTitle').innerText(),/Fumer/);
      await page.screenshot({path:path.join(output,'sources-320-text200.png'),fullPage:true});
      return{width:320,bodyFontPixels:32,skipTarget:'#main',overflow:false};
    }finally{await context.close();}
  });
  await test('Corrupted source bytes are refused and source labels stay inert',async()=>{
    const context=await browser.newContext(),page=await context.newPage();
    try{
      await page.route('**/assets/catalog/re3r-zombie.png',route=>route.fulfill({status:200,body:'modified source'}));
      await page.goto(base+'/modules/fidelity-r27/sources/index.html');await ready(page);
      assert.equal(await page.locator('.source-card img:not([hidden])').count(),0);
      assert.match(await page.locator('.source-card').innerText(),/source|Taille|octets/);
      await page.unroute('**/assets/catalog/re3r-zombie.png');
      const poisoned=structuredClone(manifest);poisoned.entries[0].name='<img src=x onerror="window.injected=true">';
      await page.route('**/sources/manifest.json',route=>route.fulfill({status:200,json:poisoned}));
      await page.reload();await ready(page);assert.equal(await page.evaluate(()=>Boolean(window.injected)),false);
      assert.match(await page.locator('#identityTitle').innerText(),/<img src=x/);
      return{corruptedBytesRefused:true,sourceTextInert:true};
    }finally{await context.close();}
  });
  await test('External resource manifests fail before image fetch and retry restores the exact index',async()=>{
    const context=await browser.newContext(),page=await context.newPage();let foreign=0;
    const poisoned=structuredClone(manifest);poisoned.entries[0].references[0].path='https://untrusted.example/image.png';
    try{
      page.on('request',request=>{if(request.url().includes('untrusted.example'))foreign++;});
      await page.route('**/sources/manifest.json',route=>route.fulfill({status:200,json:poisoned}));
      await page.goto(base+'/modules/fidelity-r27/sources/index.html');await page.waitForSelector('#retry:not([hidden])');
      assert.equal(await page.locator('.source-card').count(),0);assert.equal(foreign,0);
      await page.unroute('**/sources/manifest.json');await page.click('#retry');await ready(page);assert.equal(await page.locator('#identity option').count(),389);
      return{foreignRequests:foreign,retryRecovered:true};
    }finally{await context.close();}
  });
  await test('A delayed prior image cannot replace a newly selected incarnation',async()=>{
    const context=await browser.newContext(),page=await context.newPage();let release;
    try{
      await page.route('**/assets/catalog/re3r-zombie.png',async route=>{await new Promise(resolve=>{release=resolve;});await route.continue();});
      await page.goto(base+'/modules/fidelity-r27/sources/index.html');await page.waitForFunction(()=>!document.querySelector('#identity').disabled);
      await select(page,'re0-lurker');release?.();await delay(100);
      assert.equal(await page.locator('#identity').inputValue(),'re0-lurker');assert.match(await page.locator('#identityTitle').innerText(),/Lurker/);
      assert(await page.locator('.source-card img:not([hidden])').evaluateAll(nodes=>nodes.every(node=>node.alt.startsWith('Lurker'))));
      return{staleImageRejected:true,selected:'re0-lurker'};
    }finally{release?.();await context.close();}
  });
}finally{
  await browser?.close();server.kill('SIGTERM');
  const report={schema:'re.bow.appearance-sources-browser-r27/1',passed:checks.filter(check=>check.pass).length,failed:checks.filter(check=>!check.pass).length,checks,
    scope:'Existing source reference bytes and scope presentation; no generated sprite, anatomical1:1 or physical-device certification.'};
  fs.writeFileSync(path.join(root,'docs/R27_SOURCES_BROWSER.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
}
