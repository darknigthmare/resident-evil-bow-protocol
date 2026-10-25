import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'qa-motion-r27-browser');fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'modules/fidelity-r27/motion/manifest.json')));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'modules/fidelity-r27/motion/catalog.json')));
const port=Number(process.env.BOW_MOTION_R27_PORT||5671),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
let browser;const checks=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function test(name,run){try{const evidence=await run();checks.push({name,pass:true,evidence});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
async function ready(page,id,clip){await page.waitForFunction(({id,clip})=>{const s=window.RE_SOURCE_MODELS_R27?.state();return s?.ready&&s.id===id&&(!clip||s.clip===clip);},{id,clip},{timeout:60000});return page.evaluate(()=>RE_SOURCE_MODELS_R27.state());}
try{
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await wait(50);}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  await test('All120 exact native keyed files render directly with original body textures and no archive loading',async()=>{
    const context=await browser.newContext(),page=await context.newPage(),records=[];let partRequests=0;
    page.on('request',request=>{if(/original\.zip(?:\.part|$)/.test(new URL(request.url()).pathname))partRequests++;});
    try{
      await page.goto(base+'/modules/fidelity-r27/motion/index.html');await ready(page,catalog.entries[0].id);
      for(const entry of catalog.entries){
        await page.selectOption('#modelSelect',entry.id);await ready(page,entry.id);
        assert.equal(await page.locator('#sourceLinks a[download]').count(),3);
        for(const clip of entry.clips){
          await page.selectOption('#clipSelect',clip.id);const state=await ready(page,entry.id,clip.id);
          assert.equal(state.playing,false);assert(state.stats.meshes>0);assert(state.stats.skinnedMeshes>0);assert(state.stats.texturedMeshes>0);
          assert.equal(state.archiveCacheBytes,0);assert(Math.abs(state.duration-clip.duration)<.003);
          await page.evaluate(t=>RE_SOURCE_MODELS_R27.seek(t),state.duration*.5);
          const transforms=await page.evaluate(()=>RE_SOURCE_MODELS_R27.animatedTransforms());
          assert(transforms.length>0);assert(transforms.every(item=>[...item.position,...item.quaternion,...item.scale].every(Number.isFinite)));
          records.push({model:entry.id,clip:clip.id,duration:state.duration,texturedMeshes:state.stats.texturedMeshes,poseOnly:clip.positiveTimePoseOnly});
        }
      }
      assert.equal(records.length,120);assert.equal(records.filter(item=>item.poseOnly).length,2);assert.equal(partRequests,0);
      await page.selectOption('#modelSelect','rerev-ooze');await ready(page,'rerev-ooze');await page.screenshot({path:path.join(out,'ooze-native-body.png'),fullPage:true});
      return{keyedFiles:records.length,motions:118,fixedPoses:2,archiveRequests:partRequests,records};
    }finally{await context.close();}
  });
  await test('Zero-duration fixed poses remain paused and hash-bound position links replay the same source',async()=>{
    const context=await browser.newContext(),page=await context.newPage();
    try{
      const pose=manifest.entries[0].clips.find(clip=>clip.positiveTimePoseOnly);
      await page.goto(base+'/modules/fidelity-r27/motion/index.html?model=rerev-ooze&clip='+pose.id);let state=await ready(page,'rerev-ooze',pose.id);
      assert.equal(state.duration,0);assert.equal(await page.locator('#playToggle').isDisabled(),true);
      await page.click('#sharePosition');const url=await page.locator('#positionLink').inputValue();assert(url.includes(pose.sha256));
      await page.goto(url);state=await ready(page,'rerev-ooze',pose.id);assert.equal(state.playing,false);assert.equal(state.time,0);assert.equal(state.referenceStatus,'accepted');
      return{pose:pose.id,nativePreRollSeconds:pose.nativePreRollSeconds,duration:0,acceptedHashLink:true};
    }finally{await context.close();}
  });
  await test('Corrupted direct FBX bytes are refused before source decoding',async()=>{
    const context=await browser.newContext(),page=await context.newPage();const clip=manifest.entries[0].clips[0];
    try{
      await page.route('**/motion/'+clip.path,route=>route.fulfill({status:200,body:'changed native source'}));
      await page.goto(base+'/modules/fidelity-r27/motion/index.html');await page.waitForSelector('#retry:not([hidden])');
      assert.equal((await page.evaluate(()=>RE_SOURCE_MODELS_R27.state())).ready,false);assert.match(await page.locator('#modelStatus').innerText(),/source|octets|ressource/i);
      return{changedSourceRefused:true};
    }finally{await context.close();}
  });
  await test('NoWebGL keeps the verified published preview and never fetches body geometry',async()=>{
    const context=await browser.newContext(),page=await context.newPage();let geometryRequests=0;
    try{
      await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return get.call(this,type,...args);};});
      page.on('request',request=>{if(/\.fbx$/i.test(new URL(request.url()).pathname))geometryRequests++;});
      await page.goto(base+'/modules/fidelity-r27/motion/index.html');await page.waitForFunction(()=>RE_SOURCE_MODELS_R27?.state().previewVerified);
      const state=await page.evaluate(()=>RE_SOURCE_MODELS_R27.state());assert.equal(state.graphicsState,'unavailable');assert.equal(geometryRequests,0);
      return{publishedPreviewVerified:true,geometryRequests};
    }finally{await context.close();}
  });
  await test('Keyboard controls and source-part links remain usable at320px with200percent text',async()=>{
    const context=await browser.newContext({viewport:{width:320,height:950}}),page=await context.newPage();
    try{
      await page.goto(base+'/modules/fidelity-r27/motion/index.html');await ready(page,'rerev-ooze');
      await page.addStyleTag({content:'body{font-size:32px!important}input,select,button{font:inherit!important}'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
      await page.keyboard.press('Enter');await page.waitForURL(url=>url.hash==='#main');
      await page.locator('#turnRight').focus();await page.keyboard.press('Enter');assert.equal((await page.evaluate(()=>RE_SOURCE_MODELS_R27.state())).playing,false);
      for(const href of await page.locator('#sourceLinks a[download]').evaluateAll(nodes=>nodes.map(node=>node.href)))assert(new URL(href).origin===base&&/\.part\d+$/.test(new URL(href).pathname));
      await page.screenshot({path:path.join(out,'ooze-320-text200.png'),fullPage:true});
      return{width:320,bodyFontPixels:32,originalArchiveSegments:3,keyboardCamera:true};
    }finally{await context.close();}
  });
}finally{
  const report={schema:'re.bow.native-motion-browser-r27/1',passed:checks.filter(check=>check.pass).length,failed:checks.filter(check=>!check.pass).length,checks,
    scope:'All120 direct native scenes and source materials; cloud software rendering, no original-game rendering, action-semantic or physical-device certification.'};
  await browser?.close();server.kill('SIGTERM');fs.writeFileSync(path.join(root,'docs/R27_MOTION_BROWSER.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
}
