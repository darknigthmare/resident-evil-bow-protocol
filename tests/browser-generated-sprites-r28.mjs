/** Actual generated-file gallery: bounded loading, truthful counts and source-bound failure paths. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'modules/fidelity-r28/sprites/manifest.json')));
assert(manifest.sprites.length>0,'Import at least one real generated PNG before testing the gallery.');
const first=manifest.sprites[0],output=path.join(root,'qa-generated-sprites-r28');fs.mkdirSync(output,{recursive:true});
const port=Number(process.env.BOW_R28_SPRITES_PORT||5761),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
const checks=[],startedAt=new Date().toISOString();let browser;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function test(name,run){try{const evidence=await run();checks.push({name,pass:true,evidence});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
const route='/modules/fidelity-r28/sprites/index.html';
const ready=page=>page.waitForFunction(()=>RE_GENERATED_SPRITES_R28.state().ready&&!RE_GENERATED_SPRITES_R28.state().loading);
const displayed=(page,id)=>page.waitForFunction(id=>RE_GENERATED_SPRITES_R28.state().displayed===id,id);
try{
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await pause(60);}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  await test('All385UIDremainpagedandfilterablewithonegeneratedimageatmost',async()=>{
    const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),requests=[];
    page.on('request',request=>{if(request.url().includes('/sprites/generated/'))requests.push(request.url());});
    try{
      await page.goto(base+route+'?identity='+first.id);await ready(page);await displayed(page,first.id);await page.fill('#search','');
      assert.equal(await page.locator('#results button').count(),24);
      const seen=[];
      for(;;){seen.push(...await page.locator('#results button').evaluateAll(nodes=>nodes.map(node=>node.dataset.uid)));if(await page.locator('#next').isDisabled())break;await page.click('#next');}
      assert.equal(new Set(seen).size,385);assert.equal(seen.length,385);assert.equal(requests.length,1,'Paging text must notdownload385PNGs.');
      for(const [kind,count] of [['generated',manifest.sprites.length],['pending',manifest.pending.length],['reviewed',manifest.counts.fullBodyReviewedSprites],['context',[...manifest.sprites,...manifest.pending].filter(entry=>entry.scope==='context-encounter').length]]){
        await page.selectOption('#production',kind);assert.equal((await page.evaluate(()=>RE_GENERATED_SPRITES_R28.state())).resultCount,count);
      }
      await page.selectOption('#production','all');await page.fill('#search',first.id);assert.equal(await page.locator('#results button').count(),1);
      await page.fill('#search','no-such-incarnation-or-game');assert.equal(await page.locator('#results button').count(),0);
      return{catalogueUID:385,textPageSize:24,generated:manifest.sprites.length,pending:manifest.pending.length,requests:requests.length,physicalDevice:false};
    }finally{await context.close();}
  });
  await test('DeepLinkselectsexactgeneratedUIDwithverifiedPNGalphaandnameddownload',async()=>{
    const context=await browser.newContext(),page=await context.newPage();
    try{
      await page.goto(base+route+'?identity='+first.id);await ready(page);await displayed(page,first.id);
      assert.equal(await page.inputValue('#search'),first.id);assert.equal(await page.locator('#results button').count(),1);
      const dimensions=await page.locator('#sprite').evaluate(image=>({width:image.naturalWidth,height:image.naturalHeight}));assert.deepEqual(dimensions,{width:first.width,height:first.height});
      const alpha=await page.locator('#sprite').evaluate(image=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d');context.drawImage(image,0,0);const raw=context.getImageData(0,0,canvas.width,canvas.height).data;let zero=0,visible=0;for(let i=3;i<raw.length;i+=4){zero+=raw[i]===0;visible+=raw[i]>=16;}return{transparent:zero,visible};});
      assert(alpha.transparent>0&&alpha.visible>0);assert.equal(await page.locator('#download').getAttribute('download'),first.id+'-generated-r28.png');
      assert.equal((await page.evaluate(()=>RE_GENERATED_SPRITES_R28.state())).blobUrls,1);
      return{id:first.id,sha256:first.sha256,dimensions,alpha,states:first.availableStates,canonicalFidelityCertified:false};
    }finally{await context.close();}
  });
  await test('FournewcompletebodyartifactsreplaceexactUIDswithoutclaimingidleorremovingappearancegaps',async()=>{
    assert.equal(manifest.replacements.length,4);
    const context=await browser.newContext(),page=await context.newPage(),seen=[];
    try {
      for(const id of manifest.replacements) {
        const entry=manifest.sprites.find(item=>item.id===id);
        assert.match(entry.image,new RegExp('modules/fidelity-r28/sprites/generated/'+id+'/full-body\\.png$'));
        await page.goto(base+route+'?identity='+id);await ready(page);await displayed(page,id);
        assert.equal((await page.evaluate(()=>RE_GENERATED_SPRITES_R28.state())).blobUrls,1);
        assert.match(await page.locator('#poseClassification').innerText(),/Capacité admise : aucune/);
        assert.equal(await page.locator('#download').getAttribute('download'),id+'-generated-r28.png');
        assert.equal(await page.locator('#references a').count(),entry.provenance.references.length);
        const dimensions=await page.locator('#sprite').evaluate(image=>[image.naturalWidth,image.naturalHeight]);
        assert.deepEqual(dimensions,[entry.width,entry.height]);
        if(id==='re1r-lisa-trevor')assert.match(await page.locator('#limits').innerText(),/accessor|tentacle/i);
        seen.push({id,sha256:entry.sha256,poseKind:entry.poseKind,sourceFacing:entry.sourceFacing});
        await page.screenshot({path:path.join(output,id+'-complete-body.png'),fullPage:true});
      }
      return{replacements:seen,newTargetIdentities:0,idleCapabilitiesAdded:0,appearanceGapsRemainVisible:true};
    }finally{await context.close();}
  });
  await test('Keyboardselectionkeepsitsresultfocuswithoutstealingfilterorlifecyclefocus',async()=>{
    const context=await browser.newContext(),page=await context.newPage();
    try{
      await page.goto(base+route+'?identity='+first.id);await ready(page);await displayed(page,first.id);
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BODY','Initial loading must not move focus into the results.');
      await page.fill('#search','');
      const result=page.locator('#results button').first(),uid=await result.getAttribute('data-uid');
      await result.focus();await page.keyboard.press('Enter');await ready(page);
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.uid),uid,'Enter must retain the selected logical result after its DOM refresh.');
      const nextUid=await page.locator('#results button').nth(1).getAttribute('data-uid');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.uid),nextUid,'Tab must continue to the next result instead of restarting at the top.');
      await page.locator('#search').focus();
      await page.evaluate(()=>{dispatchEvent(new Event('pagehide'));dispatchEvent(new Event('pageshow'));});
      await page.waitForFunction(uid=>RE_GENERATED_SPRITES_R28.state().selected===uid&&!RE_GENERATED_SPRITES_R28.state().loading,uid);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'search','Automatic lifecycle selection must not take focus from the search field.');
      return{selectedUid:uid,keyboardSelectionFocusRetained:true,sequentialTabRetained:true,initialFocusNotStolen:true,filterFocusNotStolen:true,simulatedLifecycle:true};
    }finally{await context.close();}
  });
  await test('CorruptedPNGisrefusedbeforebeingdisplayedorofferedfordownload',async()=>{
    const context=await browser.newContext(),page=await context.newPage();
    await page.route('**/'+first.image,route=>route.fulfill({status:200,contentType:'image/png',body:'corrupted tool output'}));
    try{
      await page.goto(base+route+'?identity='+first.id);await ready(page);
      const state=await page.evaluate(()=>RE_GENERATED_SPRITES_R28.state());assert.equal(state.displayed,null);assert.equal(state.blobUrls,0);
      assert.equal(await page.locator('#sprite').isHidden(),true);assert.equal(await page.locator('#download').isHidden(),true);assert.match(await page.locator('#assetStatus').innerText(),/Empreinte/);
      return{corruptionRefused:true,blobUrls:state.blobUrls,downloadHidden:true};
    }finally{await context.close();}
  });
  await test('ChangingtoapendingUIDcancelsadelayedgeneratedimagewithoutsubstitution',async()=>{
    const fixture=structuredClone(manifest);let pending=fixture.pending[0];
    if(!pending){const removed=fixture.sprites.find(entry=>entry.id!==first.id);pending={id:removed.id,label:removed.label,incarnation:removed.incarnation,scope:removed.scope};fixture.sprites=fixture.sprites.filter(entry=>entry.id!==removed.id);fixture.pending.push(pending);fixture.counts.generatedSprites--;fixture.counts.pendingSprites++;fixture.counts.fullBodyReviewedSprites=fixture.sprites.filter(entry=>entry.fullBodyReviewed).length;}
    const context=await browser.newContext(),page=await context.newPage();let held;const requested=new Promise(resolve=>held=resolve);
    await page.route('**/sprites/manifest.json',route=>route.fulfill({status:200,json:fixture}));
    await page.route('**/'+first.image,route=>{held(route);});
    try{
      await page.goto(base+route+'?identity='+first.id);const intercepted=await requested;
      await page.fill('#search',pending.id);await page.locator('[data-uid="'+pending.id+'"]').click();
      await intercepted.fulfill({status:200,contentType:'image/png',body:fs.readFileSync(path.join(root,first.image))}).catch(()=>{});
      await page.waitForFunction(id=>RE_GENERATED_SPRITES_R28.state().selected===id&&!RE_GENERATED_SPRITES_R28.state().loading,pending.id);
      const state=await page.evaluate(()=>RE_GENERATED_SPRITES_R28.state());assert.equal(state.displayed,null);assert.equal(state.blobUrls,0);assert.equal((await page.locator('#assetStatus').innerText()).startsWith(pending.generationStatus==='BLOCKED_BY_TOOL'?'Génération refusée':'En attente'),true);
      return{pending:pending.id,previousImageCannotLeak:true,placeholderPortraits:0};
    }finally{await context.close();}
  });
  await test('Malformedregistryfailsclosedandmanualrefreshrecoverswithtextstayinginert',async()=>{
    const context=await browser.newContext(),page=await context.newPage();let mode='duplicate';const injected=structuredClone(manifest);injected.sprites[0].label='<img src=x onerror="window.r28Injected=true">';
    await page.route('**/sprites/manifest.json',route=>mode==='duplicate'?route.fulfill({status:200,json:{...manifest,pending:[...manifest.pending,manifest.sprites[0]]}}):mode==='external'?route.fulfill({status:200,json:{...manifest,sprites:[{...manifest.sprites[0],image:'https://outside.invalid/asset.png'},...manifest.sprites.slice(1)]}}):route.fulfill({status:200,json:injected}));
    try{
      await page.goto(base+route+'?identity='+first.id);await page.waitForFunction(()=>RE_GENERATED_SPRITES_R28.state().failed);assert.equal(await page.locator('#results button').count(),0);
      mode='external';await page.click('#refresh');await page.waitForFunction(()=>RE_GENERATED_SPRITES_R28.state().failed);assert.equal(await page.locator('a[href^="https://outside.invalid"]').count(),0);
      mode='valid';await page.click('#refresh');await ready(page);await displayed(page,first.id);
      assert.equal(await page.evaluate(()=>Boolean(window.r28Injected)),false);assert.match(await page.locator('#detailTitle').innerText(),/<img src=x/);
      return{duplicateRegistryRefused:true,externalImageRefused:true,refreshRecovered:true,textInert:true};
    }finally{await context.close();}
  });
  await test('KeyboardmobiletextreflowandpagehidekeeponlyonespriteBlobalive',async()=>{
    const widths=[];
    for(const width of [1280,390,320]){
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
      try{
        await page.goto(base+route+'?identity='+first.id);await ready(page);await displayed(page,first.id);
        if(width===320)await page.addStyleTag({content:'body{font-size:200%}'});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');await page.keyboard.press('Enter');await page.waitForURL(url=>url.hash==='#main');
        await page.evaluate(()=>dispatchEvent(new Event('pagehide')));assert.equal((await page.evaluate(()=>RE_GENERATED_SPRITES_R28.state())).blobUrls,0);
        await page.evaluate(()=>dispatchEvent(new Event('pageshow')));await displayed(page,first.id);assert.equal((await page.evaluate(()=>RE_GENERATED_SPRITES_R28.state())).blobUrls,1);
        await page.screenshot({path:path.join(output,'gallery-'+width+'.png'),fullPage:true});widths.push({width,textPercent:width===320?200:100,overflow:false});
      }finally{await context.close();}
    }
    return{widths,simulatedLifecycle:true,physicalDevices:false,maximumBlobUrls:1};
  });
}finally{
  const sourceFiles=['modules/fidelity-r28/sprites/index.html','modules/fidelity-r28/sprites/page.js','modules/fidelity-r28/sprites/style.css','modules/fidelity-r28/sprites/manifest.json'].map(file=>({path:file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
  const report={schema:'re.bow.generated-sprite-gallery-tests-r28/1',startedAt,completedAt:new Date().toISOString(),browser:browser?.version(),passed:checks.filter(entry=>entry.pass).length,failed:checks.filter(entry=>!entry.pass).length,generatedFilesInExecutedManifest:manifest.sprites.length,pendingInExecutedManifest:manifest.pending.length,sourceFiles,checks,scope:'Actual generated PNG gallery and failure boundaries; no game-frame, complete-animation or physical-device certification.'};
  await browser?.close();server.kill('SIGTERM');fs.writeFileSync(path.join(root,'docs/R28_SPRITES_BROWSER.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
}
