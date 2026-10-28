/** Actual three generated source-body images, voluntary static variant and current combat mounts. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'modules/fidelity-r31/sprites/manifest.json'))),variant=manifest.sameEditionVariants[0];
const entries=[...manifest.sprites.filter(item=>manifest.replacements.includes(item.id)),variant],output=path.join(root,'qa-generated-sprites-r31');fs.mkdirSync(output,{recursive:true});
const port=Number(process.env.BOW_GENERATED_R31_PORT||5893),base='http://127.0.0.1:'+port,checks=[];let browser;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'}),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
async function test(name,run){try{const evidence=await run();checks.push({name,pass:true,evidence});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
const gallery='/modules/fidelity-r31/sprites/index.html';
async function displayed(page,sha){await page.waitForFunction(sha=>globalThis.RE_SPRITE_GALLERY_R31?.state().displayed===sha,sha,{timeout:30000});}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await pause(60);}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 await test('The actual three generated PNGs retain alpha, exact dimensions and truthful single-image provenance',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),requests=[],errors=[];
  page.on('request',request=>{if(/\/fidelity-r31\/sprites\/(?:generated|same-edition-variants)\/.+\.png$/.test(new URL(request.url()).pathname))requests.push(request.url());});page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+gallery);await displayed(page,entries[0].sha256);assert.equal(await page.locator('#choices button').count(),3);assert.equal(requests.length,1);
   const results=[];
   for(const entry of entries){
    await page.locator('[data-key="'+(entry.variantId||entry.id)+'"]').click();await displayed(page,entry.sha256);
    const result=await page.locator('#generatedSpriteR31').evaluate(image=>{const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,c.width,c.height).data;let zero=0,visible=0;for(let n=3;n<rgba.length;n+=4){zero+=rgba[n]===0;visible+=rgba[n]>=16;}return{width:image.naturalWidth,height:image.naturalHeight,sha:image.dataset.sha256,zero,visible};});
    assert.equal(result.sha,entry.sha256);assert.equal(result.width,entry.width);assert.equal(result.height,entry.height);assert(result.zero>0&&result.visible>0);
    assert.equal(await page.locator('#image img').count(),1);assert.equal((await page.evaluate(()=>RE_SPRITE_GALLERY_R31.state())).frames,1);assert.equal((await page.evaluate(()=>RE_SPRITE_GALLERY_R31.state())).animated,false);
    if(entry.id==='re7-lucas-baker-mutated')assert.match(await page.locator('#notes').innerText(),/only2pixels/);
    if(entry.sameEditionVariant)assert.match(await page.locator('#scope').innerText(),/choix initial/);
    else assert.equal(entry.availableStates.length,0);
    results.push({id:entry.id,variant:entry.variantId||null,...result});
   }
   assert.equal(requests.length,3);assert.deepEqual(errors,[]);await page.screenshot({path:path.join(output,'actual-source-pose-variant.png'),fullPage:true});
   return{images:results,initialImageRequests:1,totalProducedImageRequests:3,generatedNotNative:true};
  }finally{await context.close();}
 });
 await test('Current main, classic and evolution pages load the new generated registry without default costume promotion',async()=>{
  const routes=['/modules/versus.html','/catalog-duel.html','/modules/fidelity-r31/evolutions/index.html'],seen=[];
  for(const route of routes){const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   try{await page.goto(base+route);await page.waitForFunction(()=>globalThis.RE_COMBAT_SPRITES_R31?.state().loaded);const result=await page.evaluate(uid=>({route:location.pathname,count:RE_COMBAT_SPRITES_R31.list().length,aliases:RE_COMBAT_SPRITES_R31===RE_COMBAT_SPRITES_R29&&RE_COMBAT_SPRITES_R29===RE_COMBAT_SPRITES_R28&&RE_COMBAT_SPRITES_R28===RE_COMBAT_SPRITES_R27,selected:RE_COMBAT_SPRITES_R31.selectedVariant(uid),defaultSha:RE_COMBAT_SPRITES_R31.get(uid).sha256,budget:RE_IMAGE_BUDGET_R31.state()}),variant.id);
    assert.equal(result.count,367);assert.equal(result.aliases,true);assert.equal(result.selected,null);assert.equal(result.defaultSha,variant.comparesAgainstSha256);assert(result.budget.reservedPixels<=result.budget.limits.pixels);assert.deepEqual(errors,[]);seen.push(route);
   }finally{await context.close();}
  }
  return{actualMounts:seen,defaultSourceVariantPromotions:0};
 });
 await test('Voluntary same-edition static pose draws in a natural real duel without modifying actor, replay or saved keys',async()=>{
  const context=await browser.newContext(),page=await context.newPage();
  try{
   await page.goto(base+'/modules/fidelity-r31/evolutions/index.html?uid='+variant.id+'&target=re1r-hunter');await page.waitForFunction(()=>globalThis.RE_COMBAT_SPRITES_R31?.state().loaded&&globalThis.RE_CATALOG_DUEL);
   const beforeStorage=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage))));await page.selectOption('#trialSubject',variant.id);await page.selectOption('#trialMode','human');
   await page.locator('#generatedVariantsR31 summary').click();await page.getByLabel('Illustration source du joueur 1').selectOption(variant.variantId);
   const result=await page.evaluate(async variant=>{
    const api=RE_CATALOG_DUEL;api.reset(false);while(api.getState().frame<1200){api.tick(1,{held:{},edges:[]});const s=api.getState();if(s.phase==='fight'&&RE_COMBAT_SPRITE_ADAPTER_R27.classify({actor:s.a,...RE_MATCH_SEQUENCES.pose(s,0)})==='idle')break;}
    const s=api.getState();await RE_COMBAT_SPRITES_R31.load(variant.id);const before=JSON.stringify(api.exportReplay()),actor=JSON.stringify(s.a),old=RE_COMBAT_SPRITE_ADAPTER_R27.state();api.draw();const next=RE_COMBAT_SPRITE_ADAPTER_R27.state();
    return{uid:s.a.f.uid,frame:s.frame,state:s.a.state,selected:RE_COMBAT_SPRITES_R31.selectedVariant(variant.id),sha:RE_COMBAT_SPRITES_R31.get(variant.id).sha256,generatedDraws:next.generatedDraws-old.generatedDraws,actorPreserved:actor===JSON.stringify(s.a),replayPreserved:before===JSON.stringify(api.exportReplay()),storage:JSON.stringify(Object.fromEntries(Object.entries(localStorage)))};
   },variant);
   assert.equal(result.uid,variant.id);assert.equal(result.selected,variant.variantId);assert.equal(result.sha,variant.sha256);assert(result.generatedDraws>0,'Actual source variant must draw during a naturally neutral state');assert.equal(result.actorPreserved,true);assert.equal(result.replayPreserved,true);assert.equal(result.storage,beforeStorage);
   await page.getByLabel('Illustration source du joueur 1').selectOption('');assert.equal(await page.evaluate(uid=>RE_COMBAT_SPRITES_R31.get(uid).sha256,variant.id),variant.comparesAgainstSha256);
   return{...result,animated:false,frames:1,oppositeSideNotInvented:true};
  }finally{await context.close();}
 });
 await test('Keyboard selection and actual200percent text remain usable at320px without masking overflow',async()=>{
  const context=await browser.newContext({viewport:{width:320,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  try{await page.goto(base+gallery);await displayed(page,entries[0].sha256);const button=page.locator('#choices button').last();await button.focus();await page.keyboard.press('Enter');await displayed(page,variant.sha256);assert.equal(await button.evaluate(node=>node===document.activeElement),true);
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,detail:document.querySelector('#detail').scrollWidth,detailWidth:document.querySelector('#detail').getBoundingClientRect().width}));assert(size.scroll<=size.width+1);assert(size.detail<=size.detailWidth+1);assert.equal(await page.locator('#image img').count(),1);await page.screenshot({path:path.join(output,'gallery-320-text200.png'),fullPage:true});return{viewport:size,keyboardFocusRetained:true,actualTextResize:'200%'};
  }finally{await context.close();}
 });
 await test('Corrupted actual PNG bytes are refused before display and leave provenance text available',async()=>{
  const context=await browser.newContext(),page=await context.newPage(),first=entries[0],raw=Buffer.from(fs.readFileSync(path.join(root,first.image)));raw[raw.length-1]^=1;
  await page.route('**/'+first.image,route=>route.fulfill({status:200,contentType:'image/png',body:raw}));
  try{await page.goto(base+gallery+'?identity='+first.id);await page.waitForFunction(()=>globalThis.RE_SPRITE_GALLERY_R31?.state().failed);assert.equal(await page.locator('#image img').count(),0);assert.match(await page.locator('#message').innerText(),/SHA-256/);assert((await page.locator('#sources a').count())>=2);return{alteredImageDrawn:false,corruptionRecorded:true,sourceLinksRetained:true};}
  finally{await context.close();}
 });
}finally{await browser?.close();server.kill('SIGTERM');}
const sourceNames=['tests/browser-generated-sprites-r31.mjs','modules/fidelity-r31/sprites/manifest.json','modules/fidelity-r31/sprites/index.html','modules/fidelity-r31/sprites/page.js','modules/fidelity-r31/sprites/style.css','modules/fidelity-r31/combat/generated-runtime.js','modules/fidelity-r31/performance/image-budget.js','modules/versus.html','catalog-duel.html','modules/fidelity-r31/evolutions/index.html'];
const report={schema:'re.bow.generated-source-body-browser-r31/1',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks,sourceFiles:sourceNames.map(name=>({path:name,sha256:hash(fs.readFileSync(path.join(root,name)))})),scope:'Real Chromium, three actual image_gen outputs, exact same-edition voluntary static pose in real duel, unchanged actor/replay/saved keys, three current mounts,320px actual200%text and corruption. Static images do not certify original idle animation or physical-device rendering.'};
fs.writeFileSync(path.join(root,'docs/R31_SPRITES_BROWSER.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
