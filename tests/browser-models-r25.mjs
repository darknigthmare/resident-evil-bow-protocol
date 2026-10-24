import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-models-r25-browser'); fs.mkdirSync(path.join(output, 'static'), {recursive: true});
const port = Number(process.env.BOW_MODELS_R25_PORT || 5362), base = 'http://127.0.0.1:' + port;
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r25/models/catalog.json')));
const catalog = catalogue.entries, rigs = catalog.filter(item => item.clips.length), staticModels = catalog.filter(item => !item.clips.length);
const rig = rigs.find(item => item.id === 'rerev-sea-creeper') || rigs[0];
const checks = [], startedAt = new Date().toISOString();
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: String(error.stack)}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function ready(page, id, clip) {
  await page.waitForFunction(({id, clip}) => {
    const state = window.RE_SOURCE_MODELS_R25?.state();
    return state?.id === id && state.ready && (!clip || state.clip === clip) || !document.querySelector('#retry').hidden;
  }, {id, clip}, {timeout: 60000});
  const state = await page.evaluate(() => RE_SOURCE_MODELS_R25.state());
  assert.equal(state.ready, true, await page.locator('#modelStatus').textContent()); assert.equal(state.id, id); if (clip) assert.equal(state.clip, clip);
  return state;
}
async function open(page, id) { await page.goto(base + '/modules/fidelity-r25/models/index.html?model=' + id); return ready(page, id); }
async function denyWebGL(context) {
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (name, ...args) {
      return /^(webgl2?|experimental-webgl)$/.test(name) ? null : original.call(this, name, ...args);
    };
  });
}
try {
  for (let n = 0; n < 80; n++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
  await test('Every static source and published weighted rig loads with explicit incomplete materials', async () => {
    const page = await browser.newPage({viewport: {width: 1280, height: 950}}), errors = []; page.on('pageerror', error => errors.push(error.message));
    await open(page, staticModels[0].id); let maximumTextures = 0; const incomplete = [], models = [];
    for (const entry of staticModels) {
      await page.selectOption('#modelSelect', entry.id); const state = await ready(page, entry.id);
      assert(state.stats.meshes > 0 && state.stats.triangles > 0); assert.equal(state.playing, false); assert.equal(state.sourceFilesRewritten, false);
      const framing=await page.evaluate(()=>RE_SOURCE_MODELS_R25.framing());
      assert(framing.min[0]>-1&&framing.max[0]<1&&framing.min[1]>-1&&framing.max[1]<1,entry.id+' initial framing must contain the whole posed bounds');
      maximumTextures = Math.max(maximumTextures, state.render.textures);
      const expectedIncomplete = new Set((entry.unresolvedTextureReferences || []).flatMap(item => item.meshNames)).size;
      assert.equal(state.stats.incompleteMaterialMeshes, expectedIncomplete, entry.id + ' missing textures remain explicit');
      if (expectedIncomplete) { assert.equal(await page.locator('#materialNotice').isVisible(), true); incomplete.push({id:entry.id,meshes:expectedIncomplete}); }
      await page.screenshot({path: path.join(output, 'static', entry.id + '.png'), fullPage: true});
      models.push({id:entry.id,meshes:state.stats.meshes,bones:state.stats.bones,skins:state.stats.skinnedMeshes,textured:state.stats.texturedMeshes});
    }
    assert.deepEqual(errors, []); await page.close(); return {models:staticModels.length,maximumTextures,incomplete,sourceBytesRewritten:false,details:models};
  });
  await test('All source motion files retain their targets, positive-time classification and a single archive cache', async () => {
    const page = await browser.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    const subjects = []; let sourceFiles = 0, motions = 0, poses = 0, maximumCache = 0, maximumTextures = 0;
    for (const entry of rigs) {
      await open(page, entry.id); const visited = [];
      for (const clip of entry.clips) {
        await page.selectOption('#clipSelect', clip.id); const state = await ready(page, entry.id, clip.id);
        assert.equal(state.playing, false); assert(state.stats.skinnedMeshes > 0); assert(state.stats.animationTracks > 0);
        assert(state.archiveCacheBytes <= 80 * 1024 * 1024); maximumCache = Math.max(maximumCache,state.archiveCacheBytes);
        maximumTextures = Math.max(maximumTextures,state.render.textures);
        const before = await page.evaluate(() => RE_SOURCE_MODELS_R25.animatedTransforms()); let changed = false;
        for (const portion of [.25,.5,.75,1]) {
          await page.evaluate(time => RE_SOURCE_MODELS_R25.seek(time),state.duration*portion);
          if (JSON.stringify(await page.evaluate(() => RE_SOURCE_MODELS_R25.animatedTransforms()))!==JSON.stringify(before)) changed=true;
        }
        assert.equal(changed,!clip.positiveTimePoseOnly,entry.id+'/'+clip.id);
        if (clip.positiveTimePoseOnly) { poses++; assert.equal(await page.locator('#playToggle').isDisabled(),true); await page.evaluate(()=>RE_SOURCE_MODELS_R25.play()); assert.equal((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).playing,false); }
        else motions++;
        sourceFiles++; visited.push(clip.id);
        assert(state.render.geometries <= state.stats.meshes+4,'Geometry must be released between scenes');
        assert(state.render.textures <= Math.max(32,entry.textures.length*2+4),'Texture resources must not accumulate');
      }
      subjects.push({id:entry.id,files:visited.length});
    }
    assert.deepEqual(errors,[]); await page.close(); return {rigEntries:subjects,sourceSubjectUids:[...new Set(rigs.map(entry=>entry.subjectId||entry.id))],sourceFiles,motions,poses,maximumCache,maximumTextures,retargeting:false};
  });
  for (const width of [1280,390]) await test('Canvas and semantic camera controls work by keyboard at '+width+'px',async()=>{
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390,reducedMotion:'reduce'}),page=await context.newPage();
    const state=await open(page,rig.id),initial=state.camera;
    await page.locator('canvas').focus(); await page.keyboard.press('ArrowLeft');
    assert.notDeepEqual((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).camera,initial);
    await page.keyboard.press('Home'); assert.deepEqual((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).camera,initial);
    await page.keyboard.press('ArrowUp'); assert.notDeepEqual((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).camera,initial);
    await page.keyboard.press('Home'); await page.keyboard.press('+');
    assert.notDeepEqual((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).camera,initial);
    await page.click('#resetView'); assert.deepEqual((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).camera,initial);
    await page.click('#tiltDown'); assert.notDeepEqual((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).camera,initial);
    assert.equal((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).playing,false,'Reduced motion never auto-starts playback');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:path.join(output,'keyboard-'+width+'.png'),fullPage:true});await context.close();return {width,keyboard:true,reducedMotion:true};
  });
  await test('Unavailable WebGL retains verified publisher preview and source links without downloading geometry',async()=>{
    const context=await browser.newContext(),page=await context.newPage();await denyWebGL(context);
    const entry=catalog.find(item=>item.preview);let modelRequests=0;
    page.on('request',request=>{if(request.url().endsWith('/'+entry.model.path.split('/').map(encodeURIComponent).join('/'))) modelRequests++;});
    await page.goto(base+'/modules/fidelity-r25/models/index.html?model='+entry.id);
    await page.waitForFunction(()=>RE_SOURCE_MODELS_R25.state().previewVerified);
    const state=await page.evaluate(()=>RE_SOURCE_MODELS_R25.state());assert.equal(state.graphicsState,'unavailable');assert.equal(state.ready,false);assert.equal(modelRequests,0);
    assert.equal(await page.locator('#sourceFallback').isVisible(),true);assert.equal(await page.locator('#cameraControls button:enabled').count(),0);
    assert((await page.locator('#sourceLinks a').count())>=2);assert.equal(await page.locator('canvas').count(),0);
    await page.screenshot({path:path.join(output,'no-webgl.png'),fullPage:true});await context.close();return {source:entry.id,previewHashVerified:true,geometryRequests:modelRequests,automaticPlayback:false};
  });
  await test('A corrupt fallback preview is refused and an explicit retry recovers it',async()=>{
    const context=await browser.newContext(),page=await context.newPage();await denyWebGL(context);const entry=catalog.find(item=>item.preview);
    const previewPath=entry.preview.path.split('/').map(encodeURIComponent).join('/');await page.route('**/'+previewPath,route=>route.fulfill({status:200,body:'changed preview'}));
    await page.goto(base+'/modules/fidelity-r25/models/index.html?model='+entry.id);await page.waitForSelector('#retry:not([hidden])');await page.waitForTimeout(100);
    assert.equal((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).previewVerified,false);assert.equal(await page.locator('#sourceFallback').isHidden(),true);
    await page.unroute('**/'+previewPath);await page.click('#retry');await page.waitForFunction(()=>RE_SOURCE_MODELS_R25.state().previewVerified);
    await context.close();return {changedPreviewRefused:true,retryRecovered:true};
  });
  await test('Real WebGL context loss releases the scene and recovery preserves time without autoplay',async()=>{
    const page=await browser.newPage();const state=await open(page,rig.id);await page.evaluate(t=>RE_SOURCE_MODELS_R25.seek(t),state.duration*.5);
    const time=(await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).time;
    const supported=await page.evaluate(()=>{window.r25TestLoseContext=document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context');return !!window.r25TestLoseContext;});assert.equal(supported,true);
    await page.evaluate(()=>window.r25TestLoseContext.loseContext());await page.waitForFunction(()=>RE_SOURCE_MODELS_R25.state().graphicsState==='lost');
    const lost=await page.evaluate(()=>RE_SOURCE_MODELS_R25.state());assert.equal(lost.ready,false);assert.equal(lost.playing,false);assert.equal(await page.locator('#cameraControls button:enabled').count(),0);
    await page.waitForTimeout(150);await page.evaluate(()=>window.r25TestLoseContext.restoreContext());
    await page.waitForFunction(()=>RE_SOURCE_MODELS_R25.state().graphicsState==='ready'&&RE_SOURCE_MODELS_R25.state().ready,null,{timeout:60000});
    const restored=await ready(page,rig.id);
    assert.equal(restored.graphicsState,'ready');assert.equal(restored.playing,false);assert(Math.abs(restored.time-time)<1e-6);assert.equal(await page.locator('canvas').count(),1);
    await page.close();return {extension:'WEBGL_lose_context',timePreserved:time,automaticPlayback:false};
  });
  await test('Changed geometry and delayed previous responses cannot replace a verified selection',async()=>{
    const page=await browser.newPage(),first=staticModels[0],second=staticModels[1],source=first.model.path.split('/').map(encodeURIComponent).join('/');
    await page.route('**/'+source,route=>route.fulfill({status:200,body:'unreviewed mesh'}));await page.goto(base+'/modules/fidelity-r25/models/index.html?model='+first.id);await page.waitForSelector('#retry:not([hidden])');
    assert.equal((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).ready,false);await page.unroute('**/'+source);await page.click('#retry');await ready(page,first.id);
    let release,reached;const gate=new Promise(resolve=>{release=resolve;}),seen=new Promise(resolve=>{reached=resolve;});
    await page.route('**/'+source,async route=>{reached();await gate;await route.continue().catch(()=>{});});
    await page.selectOption('#modelSelect',first.id);await seen;await page.selectOption('#modelSelect',second.id);await ready(page,second.id);release();await page.waitForTimeout(100);
    assert.equal((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).id,second.id);await page.close();return {changedSourceRefused:true,retryRecovered:true,staleResponseRefused:true};
  });
  await test('Leaving the page releases GPU objects and archive cache; returning stays paused',async()=>{
    const page=await browser.newPage();await open(page,rig.id);
    const archived=rig.clips.find(clip=>!clip.path);
    if(archived){await page.selectOption('#clipSelect',archived.id);await ready(page,rig.id,archived.id);assert((await page.evaluate(()=>RE_SOURCE_MODELS_R25.state())).archiveCacheBytes>0);}
    // A private test-only key records the synchronous lifecycle result: DevTools
    // console/binding messages from the departing execution context can be lost.
    await page.evaluate(()=>{sessionStorage.removeItem('bow.r25.test.pagehide');window.addEventListener('pagehide',()=>sessionStorage.setItem('bow.r25.test.pagehide',JSON.stringify(RE_SOURCE_MODELS_R25.state())),{once:true});});
    await page.goto(base+'/codex.html');const departed=await page.evaluate(()=>{const value=sessionStorage.getItem('bow.r25.test.pagehide');sessionStorage.removeItem('bow.r25.test.pagehide');return value&&JSON.parse(value);});
    assert(departed,'Actual navigation must run pagehide');assert.equal(departed.render,null);assert.equal(departed.archiveCacheBytes,0);assert.equal(departed.ready,false);
    await page.goBack();const returned=await ready(page,rig.id);assert.equal(returned.playing,false);await page.close();return {actualNavigation:true,gpuDisposed:true,archiveCacheReleased:true,automaticPlayback:false,lifecycleRecordedInPrivateTestContext:true,productionReaderStorageAccess:false};
  });
} finally {
  await browser?.close();server.kill();
  const report={schema:'re.bow.model-reader-r25-browser/1',startedAt,completedAt:new Date().toISOString(),softwareRenderer:true,physicalDevices:false,originalGameRenderingCertified:false,
    catalogueEntries:catalog.length,passed:checks.filter(item=>item.pass).length,failed:checks.filter(item=>!item.pass).length,checks};
  const text=JSON.stringify(report,null,2)+'\n';fs.writeFileSync(path.join(output,'R25_READER_BROWSER_RESULTS.json'),text);fs.writeFileSync(path.join(root,'docs/R25_READER_BROWSER.json'),text);if(report.failed)process.exitCode=1;
}
