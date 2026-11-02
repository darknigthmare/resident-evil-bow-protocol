/** Actual default player documents, source PNGs and browser thumbnails. Fault/lifecycle fixtures are explicit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const preview = process.argv.includes('--preview'), out = path.join(root, preview ? 'qa-roster-runtime-r34-preview' : 'qa-roster-runtime-r34');
fs.mkdirSync(out, {recursive: true});
const hash = raw => createHash('sha256').update(raw).digest('hex'), bound = new Map(), changed = new Set(), checks = [], errors = [], missing = new Set();
const manifestPaths = ['modules/fidelity-r34/combat/manifest.json', 'modules/fidelity-r34/selection/manifest.json', 'modules/fidelity-r34/assets/manifest.json'];
for (const name of [...manifestPaths, 'tests/browser-roster-runtime-r34.mjs']) bound.set(name, fs.readFileSync(path.join(root, name)));
const sprites = JSON.parse(bound.get(manifestPaths[0])), registry = JSON.parse(bound.get(manifestPaths[1])), assets = JSON.parse(bound.get(manifestPaths[2]));
const portraits = registry.entries.filter(row => row.sourceKind === 'generated-portrait'); assert(portraits.length >= 2);
const first = portraits[0], second = portraits[1], bodies = sprites.sprites.concat(sprites.historicalReplacements || []).filter(row => row.generatedByR34);
const routes = ['/modules/versus.html', '/catalog-duel.html', '/modules/fidelity-r34/evolutions/index.html'];
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server = http.createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
  if (name === 'favicon.ico') {response.statusCode = 204; return response.end();}
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {missing.add(name); response.statusCode = 404; return response.end('Missing checkout resource');}
  let raw = manifestPaths.includes(name) ? bound.get(name) : fs.readFileSync(file);
  if (/\.(?:js|css|html|json|png|webp|jpe?g)$/.test(name)) {if (bound.has(name) && hash(bound.get(name)) !== hash(raw)) changed.add(name); else if (!bound.has(name)) bound.set(name, raw);}
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); response.setHeader('Content-Length', raw.length); response.end(raw);
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port; let browser;
async function test(name, run, bodyOnly = false) {
  if (bodyOnly && !bodies.length && preview) {checks.push({name, pass:null, skipped:'No actual R34 body produced; preview cannot prove combat-body display.'}); console.log('SKIP ' + name); return;}
  try {const detail = await run(); checks.push({name, pass:true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass:false, error:error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
async function scene(route = routes[1], options = {}) {
  const context = await browser.newContext({viewport:{width:1280,height:1000}, reducedMotion:'reduce'});
  await context.addInitScript(({holdBlob}) => {
    window.__qaHistoricalDraws = []; window.__qaHeldLabels = []; window.__qaImageSources = [];
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage, originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.drawImage = function(source, ...args) {
      if (source instanceof HTMLImageElement) __qaImageSources.push(source.src);
      if (source instanceof HTMLImageElement && source.src.includes('assets/catalog/recv-mutated-steve.png')) __qaHistoricalDraws.push(source.src);
      return originalDrawImage.call(this, source, ...args);
    };
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
      if (text === 'Vue à documenter') __qaHeldLabels.push(text);
      return originalFillText.call(this, text, ...args);
    };
    window.__qaBudgetEvents = []; let managedBudget;
    Object.defineProperty(window, 'RE_IMAGE_BUDGET_R31', {configurable: true, get: () => managedBudget, set: value => {
      managedBudget = Object.freeze({...value, reserve(owner, key, count, onEvict) {const lease = value.reserve(owner,key,count,onEvict); __qaBudgetEvents.push({owner,key,count,accepted:!!lease}); return lease;}});
    }});
    window.__qaHoldBlob = holdBlob; window.__qaBlobCallbacks = []; window.__qaBitmap = []; window.__qaBlobUrls = new Set(); window.__qaPixelEvents = [];
    window.__qaBlobSizes = new Map(); window.__qaHoldSpriteBytes = 0; window.__qaSpriteDecodeCallbacks = [];
    const imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {...imageSrc, set(value) {
      if (__qaHoldSpriteBytes && __qaBlobSizes.get(value) === __qaHoldSpriteBytes) {
        __qaSpriteDecodeCallbacks.push(() => imageSrc.set.call(this, value)); return;
      }
      return imageSrc.set.call(this, value);
    }});
    const originalBitmap = window.createImageBitmap.bind(window);
    window.createImageBitmap = async (...args) => {
      const bitmap = await originalBitmap(...args), sourceSha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await args[0].arrayBuffer()))].map(value=>value.toString(16).padStart(2,'0')).join(''), event = {sourceSha,crop:args.slice(1,5), options:args[5], width:bitmap.width, height:bitmap.height, closed:0};
      const close = bitmap.close.bind(bitmap); bitmap.close = () => {event.closed++; close();}; __qaBitmap.push(event); return bitmap;
    };
    const originalBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback,...args) {
      const canvas = this, wrap = blob => {
        __qaPixelEvents.push({width:canvas.width,height:canvas.height,budget:window.RE_IMAGE_BUDGET_R31?.state()});
        if (__qaHoldBlob) __qaBlobCallbacks.push(() => callback(blob)); else callback(blob);
      }; return originalBlob.call(this,wrap,...args);
    };
    const originalCreate = URL.createObjectURL.bind(URL), originalRevoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => {const url = originalCreate(blob); __qaBlobUrls.add(url); __qaBlobSizes.set(url, blob.size); return url;};
    URL.revokeObjectURL = url => {__qaBlobUrls.delete(url); __qaBlobSizes.delete(url); originalRevoke(url);};
  }, {holdBlob:!!options.holdBlob});
  const page = await context.newPage(); page.on('pageerror', error => errors.push({route,message:error.message}));
  if (options.setup) await options.setup(page);
  await page.goto(origin + route, {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => window.RE_MATCH_SELECTION_R34 && window.RE_SELECTION_AVATARS_R34 && window.RE_COMBAT_SPRITES_R34);
  if (!options.pendingRegistry) await page.waitForFunction(() => RE_SELECTION_AVATARS_R34.status().loaded && RE_COMBAT_SPRITES_R34.state().loaded);
  return {context,page};
}
async function select(page, item) {
  await page.selectOption('#trialSubject', item.id); await page.locator('.r30-selected-visual').first().scrollIntoViewIfNeeded();
}
async function shown(page, item) {
  await page.waitForFunction(uid => [...document.querySelectorAll('.r30-selected-visual img')].some(image => image.dataset.avatarUid === uid && !image.hidden && image.complete && image.naturalWidth > 0),item.id);
  return page.locator('.r30-selected-visual img[data-avatar-uid="'+item.id+'"]').first().evaluate(image => ({width:image.naturalWidth,height:image.naturalHeight,src:image.src,kind:image.dataset.sourceKind,title:image.title,transform:image.style.transform}));
}
const save = page => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
async function releaseBlobs(page) {await page.evaluate(() => {__qaHoldBlob=false; for (const callback of __qaBlobCallbacks.splice(0)) callback();});}
async function probeHeldDraws(page, uid) {
  return page.evaluate(uid => {
    const api = window.RE_CATALOG_DUEL || window.RE_COMBAT;
    const snapshot = () => JSON.stringify({actors: api.getState(), replay: api.exportReplay ? api.exportReplay() : {
      state: api.getReplayState?.(), history: api.getReplays?.(), archive: api.getReplayArchive?.()}, storage: Object.fromEntries(Object.entries(localStorage))});
    const fighter = RE_DATA.fighters.find(row => (row.uid || row.id) === uid) || RE_DATA.catalog.find(row => (row.uid || row.id) === uid);
    if (!fighter) throw Error('The actual held catalogue identity is absent');
    const ctx = document.createElement('canvas').getContext('2d'), before = snapshot();
    const entries = [['renderer', RE_RENDERER.drawFighter], ['art', CQC55_ART.drawFighter],
      ...['060','059','058'].map(value => [value, window['CQC_ACTORS_' + value]?.draw]).filter(([, draw]) => typeof draw === 'function')];
    const states = [...new Set(['idle', 'attack', ...RE_FIGHTER_DIRECTIONS.states, ...RE_FIGHTER_DIRECTIONS.slots, ...RE_FIGHTER_DIRECTIONS.presentationStates])];
    const previous = RE_HELD_PRESENTATION_R34.state(), labels = __qaHeldLabels.length;
    for (const [, draw] of entries) for (const state of states) for (const facing of [-1, 1]) draw(ctx, fighter, 140, 240, facing, 1, {presentationState: state, time: 0, reduceMotion: true});
    const after = RE_HELD_PRESENTATION_R34.state();
    return {entries: entries.map(([name]) => name), states, calls: entries.length * states.length * 2,
      markers: after.markersDrawn - previous.markersDrawn, sprites: after.qualifiedSpritesDrawn - previous.qualifiedSpritesDrawn,
      labels: __qaHeldLabels.length - labels, historicalDraws: [...__qaHistoricalDraws], actorReplayStorageUnchanged: before === snapshot(), state: after};
  }, uid);
}
try {
  browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  await test('Three real player routes mount R34 media readers and stay in character selection without starting combat',async () => {
    const results=[];
    for (const route of routes) {const {context,page}=await scene(route); try {
      const result=await page.evaluate(() => ({flow:RE_MATCH_SELECTION_R34.state(),avatars:RE_SELECTION_AVATARS_R34.status(),sprites:RE_COMBAT_SPRITES_R34.state(),
        readers:[...document.scripts].map(script=>script.src).filter(src=>/fidelity-r34\/(?:selection\/avatars|combat\/generated-runtime|evolutions\/selection)\.js/.test(src)),
        aliases:RE_SELECTION_AVATARS_R34===RE_SELECTION_AVATARS_R33 && RE_COMBAT_SPRITES_R34===RE_COMBAT_SPRITES_R33}));
      assert.equal(result.flow.phase,'characters'); assert.equal(result.flow.starts,0); assert.equal(result.readers.length,3); assert(result.aliases);
      assert.equal(result.avatars.generatedPortraits,portraits.length); assert.equal(result.sprites.failed,false); results.push({route,...result});
    } finally {await context.close();}}
    return {routes:results,legacyBypassUsed:false};
  });
  await test('Every admitted new portrait renders as a real cropped256px browser thumbnail while raw sources remain unchanged',async () => {
    const {context,page}=await scene(); const rows=[];
    try {const before=await save(page);
      for (const item of portraits) {await select(page,item); const mediaBefore=await page.evaluate(()=>({replay:JSON.stringify(RE_CATALOG_DUEL.exportReplay()),actors:JSON.stringify(RE_CATALOG_DUEL.getState())})); const image=await shown(page,item),scale=Math.min(1,256/Math.max(item.crop.width,item.crop.height));
        assert.equal(image.width,Math.max(1,Math.round(item.crop.width*scale))); assert.equal(image.height,Math.max(1,Math.round(item.crop.height*scale)));
        const decode=await page.evaluate(sha=>__qaBitmap.find(row=>row.sourceSha===sha),item.sha256); assert(decode,'The actual original PNG must pass through ImageBitmap.'); assert.deepEqual(decode.crop,[item.crop.x,item.crop.y,item.crop.width,item.crop.height]); assert.equal(decode.options.resizeWidth,image.width); assert.equal(decode.options.resizeHeight,image.height);
        assert.equal(image.kind,'generated-portrait'); assert.equal(image.title,'Portrait de sélection'); assert.equal(image.transform,''); assert(image.src.startsWith('blob:'));
        const mediaAfter=await page.evaluate(()=>({replay:JSON.stringify(RE_CATALOG_DUEL.exportReplay()),actors:JSON.stringify(RE_CATALOG_DUEL.getState())})); assert.deepEqual(mediaAfter,mediaBefore,'Image decoding must not mutate the already selected engine actors or replay.');
        rows.push({id:item.id,sha256:item.sha256,width:image.width,height:image.height});
      }
      assert.equal(await save(page),before); const state=await page.evaluate(() => ({flow:RE_MATCH_SELECTION_R34.state(),budget:RE_IMAGE_BUDGET_R31.state(),avatars:RE_SELECTION_AVATARS_R34.status(),bitmap:__qaBitmap}));
      assert.equal(state.flow.starts,0); assert.equal(state.flow.phase,'characters'); assert(state.bitmap.length>=portraits.length); assert(state.bitmap.every(row=>row.closed>=1));
      assert.equal(state.budget.owners['avatar-decode']?.pixels||0,0); assert(state.budget.reservedPixels<=state.budget.limits.pixels);
      await page.screenshot({path:path.join(out,'actual-portrait-selector.png'),fullPage:true}); return {actualPortraits:rows,steadyBudget:state.budget,rawPngDisplayed:false,storageWrites:0,replayChanged:false,engineActorsChanged:false};
    } finally {await context.close();}
  });
  await test('A held incarnation stays selectable without restoring its unqualified older portrait or combat pose',async () => {
    const holds=assets.retainedPresentationHolds || []; assert(holds.length>0,'The real unresolved source-edition case is required.');
    const {context,page}=await scene(); const rows=[];
    try {const before=await save(page);
      for (const hold of holds) {
        const newPortrait=portraits.some(row=>row.id===hold.id),newBody=bodies.some(row=>row.id===hold.id);
        await page.selectOption('#trialSubject',hold.id);
        if (!newPortrait) await page.waitForFunction(uid=>RE_SELECTION_AVATARS_R34.missing().some(row=>row.id===uid)
          && document.querySelector('.r30-selected-visual')?.dataset.avatarStateR30==='missing',hold.id);
        const state=await page.evaluate(uid=>({chosen:document.getElementById('trialSubject').value,portrait:RE_SELECTION_AVATARS_R34.get(uid),
          body:RE_COMBAT_SPRITES_R34.get(uid),placeholder:document.querySelector('.r30-selected-visual .r30-avatar-missing')?.textContent,
          visibleImages:[...document.querySelectorAll('.r30-selected-visual')][0].querySelectorAll('img:not([hidden])').length,flow:RE_MATCH_SELECTION_R34.state()}),hold.id);
        assert.equal(state.chosen,hold.id); assert.equal(state.flow.phase,'characters'); assert.equal(state.flow.starts,0);
        if (!newPortrait) {assert.equal(state.portrait,null);assert.equal(state.visibleImages,0);assert.equal(state.placeholder,'Vue source à documenter');}
        if (!newBody) assert.equal(state.body,null);
        rows.push({id:hold.id,newQualifiedPortrait:newPortrait,newQualifiedBody:newBody,oldPortraitRestored:false,oldBodyRestored:false});
      }
      assert.equal(await save(page),before);return {actualHolds:rows,catalogueIdentityPreserved:true,storageWrites:0};
    } finally {await context.close();}
  });
  await test('All three actual renderers suppress held Steve media in every state and side before and after source qualification', async () => {
    const hold = assets.retainedPresentationHolds.find(row => row.id === 'recv-mutated-steve'); assert(hold);
    const results = [];
    for (const route of [...routes, ...routes.map(value => value + '?uid=' + encodeURIComponent(hold.id))]) {
      let release; const gate = new Promise(resolve => {release = resolve;});
      const {context, page} = await scene(route, {pendingRegistry: true, setup: page => page.route('**/modules/fidelity-r34/combat/manifest.json', async request => {await gate; await request.continue();})});
      try {
        await page.waitForFunction(() => window.RE_HELD_PRESENTATION_R34);
        assert.equal(await page.evaluate(() => RE_COMBAT_SPRITES_R34.state().presentationSourceValidated), false);
        const pending = await probeHeldDraws(page, hold.id);
        release(); await page.waitForFunction(() => RE_COMBAT_SPRITES_R34.state().loaded);
        const qualified = await probeHeldDraws(page, hold.id);
        await page.waitForTimeout(100); const historicalDraws = await page.evaluate(() => __qaHistoricalDraws);
        for (const result of [pending, qualified]) {
          assert.equal(result.markers, result.calls); assert.equal(result.labels, result.calls); assert.equal(result.sprites, 0);
          assert.equal(result.historicalDraws.length, 0); assert(result.actorReplayStorageUnchanged);
          assert.equal(result.state.markerIsSprite, false); assert(result.entries.includes('renderer') && result.entries.includes('art'));
        }
        assert.equal(historicalDraws.length, 0); results.push({route, pending, qualified});
      } finally {release(); await context.close();}
    }
    return {routes: results, realHistoricalRendererExercised: true, historicalSteveDraws: 0, engineWrites: 0, legacyFixtureUsed: false};
  });
  await test('A new non-held R34 idle stays on a marker during its real Image decode and never flashes the old photograph', async () => {
    const {context,page}=await scene();
    try {
      await page.evaluate(() => RE_NATIVE_SPRITES_R30.ready());
      const body=await page.evaluate(rows=>rows.find(row=>!RE_NATIVE_SPRITES_R30.resolve(row.id,{state:'idle',facing:'right'})),bodies);
      assert(body,'A real new body without a native override is required for this decoder test.');
      const pending=await page.evaluate(async row=>{
        RE_COMBAT_SPRITES_R34.clear(); window.__qaHoldSpriteBytes=row.bytes;
        const fighter=RE_DATA.fighters.find(value=>(value.uid||value.id)===row.id) || RE_DATA.catalog.find(value=>(value.uid||value.id)===row.id);
        const ctx=document.createElement('canvas').getContext('2d'),before=JSON.stringify({actors:RE_CATALOG_DUEL.getState(),replay:RE_CATALOG_DUEL.exportReplay(),storage:Object.fromEntries(Object.entries(localStorage))});
        const oldPath=RE_FIGHTER_DIRECTIONS.resolve(fighter,1,{presentationState:'idle'},140).path;
        window.__qaNewBodyProbe={fighter,ctx,before,uid:row.id,oldSource:new URL(oldPath,location.href).href};
        window.__qaBeforeNewBodyGate=RE_HELD_PRESENTATION_R34.state();window.__qaNewBodyImageStart=__qaImageSources.length;
        const decision=RE_COMBAT_SPRITES_R34.presentationDecision(row.id,{state:'idle',facing:'right'});
        RE_RENDERER.drawFighter(ctx,fighter,140,300,1,1,{presentationState:'idle',time:0});
        return {mode:decision.mode,originalSource:fighter.sprite || null};
      },body);
      assert.equal(pending.mode,'qualified-r34');
      await page.waitForFunction(()=>__qaSpriteDecodeCallbacks.length>0 && RE_COMBAT_SPRITES_R34.state().pending>0);
      const waiting=await page.evaluate(()=>({gate:RE_HELD_PRESENTATION_R34.state(),before:__qaBeforeNewBodyGate,
        draws:__qaImageSources.slice(__qaNewBodyImageStart),pending:RE_COMBAT_SPRITES_R34.state().pending}));
      assert.equal(waiting.gate.historicalDelegations,waiting.before.historicalDelegations); assert(waiting.gate.markersDrawn>waiting.before.markersDrawn);
      assert.equal(waiting.draws.length,0);
      await page.evaluate(()=>{__qaHoldSpriteBytes=0;for(const callback of __qaSpriteDecodeCallbacks.splice(0))callback();});
      await page.waitForFunction(()=>RE_COMBAT_SPRITES_R34.state().cached>0);
      const rendered=await page.evaluate(()=>{
        const p=__qaNewBodyProbe,beforeDraw=RE_HELD_PRESENTATION_R34.state(),imageStart=__qaImageSources.length;
        RE_RENDERER.drawFighter(p.ctx,p.fighter,140,300,1,1,{presentationState:'idle',time:0});
        const after=JSON.stringify({actors:RE_CATALOG_DUEL.getState(),replay:RE_CATALOG_DUEL.exportReplay(),storage:Object.fromEntries(Object.entries(localStorage))});
        return {gate:RE_HELD_PRESENTATION_R34.state(),before:beforeDraw,draws:__qaImageSources.slice(imageStart),
          oldPhotoDraws:__qaImageSources.slice(__qaNewBodyImageStart).filter(src=>src===p.oldSource).length,unchanged:p.before===after};
      });
      assert.equal(rendered.gate.historicalDelegations,rendered.before.historicalDelegations);
      assert(rendered.gate.qualifiedSpritesDrawn>rendered.before.qualifiedSpritesDrawn); assert(rendered.draws.length>0);
      assert(rendered.draws.every(src=>src.startsWith('blob:'))); assert.equal(rendered.oldPhotoDraws,0); assert(rendered.unchanged);
      return {id:body.id,sha256:body.sha256,actualDelayedImageDecode:true,pendingMarker:true,oldPhotographDraws:0,actorReplayStorageUnchanged:true};
    } finally {await page.evaluate(()=>{__qaHoldSpriteBytes=0;for(const callback of __qaSpriteDecodeCallbacks.splice(0))callback();}).catch(()=>{});await context.close();}
  });
  await test('An invalid source manifest keeps the actual renderer on a neutral marker without historical media', async () => {
    const results = [];
    for (const route of routes) {
      const {context, page} = await scene(route, {pendingRegistry: true, setup: page => page.route('**/modules/fidelity-r34/combat/manifest.json', request => request.fulfill({json: {schema: 'invalid-source-fixture'}}))});
      try {
        await page.waitForFunction(() => window.RE_HELD_PRESENTATION_R34 && RE_COMBAT_SPRITES_R34.state().failed);
        const result = await probeHeldDraws(page, 'recv-mutated-steve'); assert.equal(result.markers, result.calls); assert.equal(result.labels, result.calls);
        assert.equal(result.historicalDraws.length, 0); assert(result.actorReplayStorageUnchanged); results.push({route,...result});
      } finally {await context.close();}
    }
    return {routes: results, deliberatelyInvalidManifest: true, failClosed: true};
  });
  await test('Source decoding retains original pixels plus two thumbnails transiently and only thumbnail credit after presentation',async () => {
    const {context,page}=await scene(routes[1],{holdBlob:true});
    try {await select(page,first); await page.waitForFunction(() => __qaBlobCallbacks.length>0);
      const pending=await page.evaluate(() => ({budget:RE_IMAGE_BUDGET_R31.state(),events:__qaPixelEvents,reservations:__qaBudgetEvents,bitmaps:__qaBitmap,visible:[...document.querySelectorAll('img[data-source-kind="generated-portrait"]')].filter(image=>!image.hidden).length}));
      const scale=Math.min(1,256/Math.max(first.crop.width,first.crop.height)),thumb=Math.round(first.crop.width*scale)*Math.round(first.crop.height*scale);
      assert(pending.reservations.some(row=>row.owner==='avatar-decode' && row.key===first.id && row.count===first.width*first.height+2*thumb && row.accepted));
      assert(pending.reservations.some(row=>row.owner==='avatars' && row.key===first.id && row.count===thumb && row.accepted));
      assert((pending.budget.owners['avatar-decode']?.pixels||0)>=first.width*first.height+2*thumb);
      assert(pending.budget.owners.avatars.pixels>=thumb); assert(pending.bitmaps.some(row=>row.width<=256 && row.height<=256));
      await releaseBlobs(page); await shown(page,first); await page.waitForFunction(() => !RE_IMAGE_BUDGET_R31.state().owners['avatar-decode']);
      const steady=await page.evaluate(() => RE_IMAGE_BUDGET_R31.state()); return {sourceDimensions:[first.width,first.height],minimumTransientSourceCredit:first.width*first.height+2*thumb,thumbnailPixels:thumb,pendingBudget:pending.budget,steadyBudget:steady};
    } finally {await releaseBlobs(page).catch(()=>{}); await context.close();}
  });
  await test('A cancelled toBlob closes its actual ImageBitmap and cannot publish a stale thumbnail after pagehide',async () => {
    const {context,page}=await scene(routes[1],{holdBlob:true});
    try {await select(page,first); await page.waitForFunction(() => __qaBlobCallbacks.length>0);
      const before=await save(page); await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))); await releaseBlobs(page);
      await page.waitForFunction(() => RE_SELECTION_AVATARS_R34.status().loadingImages===0);
      const hidden=await page.evaluate(() => ({budget:RE_IMAGE_BUDGET_R31.state(),avatars:RE_SELECTION_AVATARS_R34.status(),bitmap:__qaBitmap,urls:__qaBlobUrls.size,
        visible:[...document.querySelectorAll('img.r30-selection-avatar')].filter(image=>!image.hidden && image.hasAttribute('src')).length}));
      assert.equal(hidden.avatars.active,false); assert.equal(hidden.budget.reservedPixels,0); assert.equal(hidden.urls,0); assert.equal(hidden.visible,0); assert(hidden.bitmap.every(row=>row.closed>=1));
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))); await shown(page,first); assert.equal(await save(page),before);
      return {syntheticLifecycleFixture:true,hiddenBudget:hidden.budget,bitmapsClosed:hidden.bitmap.length,staleThumbnailsDisplayed:0,recovered:true};
    } finally {await releaseBlobs(page).catch(()=>{}); await context.close();}
  });
  await test('Interrupted initial portrait and combat registries restart in a new epoch without old publications',async () => {
    let release; const held=new Promise(resolve=>{release=resolve;}); const counts={};
    const {context,page}=await scene(routes[1],{pendingRegistry:true,setup:async page=>{
      for (const name of manifestPaths.slice(0,2)) await page.route('**/'+name,async route=>{counts[name]=(counts[name]||0)+1; if(counts[name]===1) await held;
        await route.fulfill({status:200,contentType:'application/json',body:bound.get(name)}).catch(()=>{});});
    }});
    try {await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})); dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
      await page.waitForFunction(()=>RE_SELECTION_AVATARS_R34.status().loaded && RE_COMBAT_SPRITES_R34.state().loaded); release();
      await select(page,first); await shown(page,first); assert(Object.values(counts).every(count=>count>=2));
      assert.equal(await page.evaluate(()=>RE_MATCH_SELECTION_R34.state().starts),0); return {syntheticLifecycleFixture:true,requests:counts,supersededInitializationPublished:false};
    } finally {release();await context.close();}
  });
  await test('Corrupt source digest, PNG signature and declared dimensions are refused before any generated portrait is displayed',async () => {
    const cases=[];
    for(const fault of ['digest','signature','dimensions']) {
      const raw=Buffer.from(fs.readFileSync(path.join(root,first.image))),manifest=structuredClone(registry),item=manifest.entries.find(row=>row.id===first.id);
      if(fault==='signature') raw[0]^=1; else if(fault==='dimensions') raw.writeUInt32BE(first.width+1,16); else raw[raw.length-1]^=1;
      if(fault!=='digest') item.sha256=hash(raw);
      const {context,page}=await scene(routes[1],{setup:async page=>{
        await page.route('**/'+manifestPaths[1],route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(manifest)}));
        await page.route('**/'+first.image,route=>route.fulfill({status:200,contentType:'image/png',body:raw}));
      }});
      try {await select(page,first); await page.waitForFunction(()=>RE_SELECTION_AVATARS_R34.status().rememberedErrors>0);
        const result=await page.evaluate(uid=>({visible:[...document.querySelectorAll('img.r30-selection-avatar')].filter(image=>image.dataset.avatarUid===uid && !image.hidden).length,
          bitmapCalls:__qaBitmap.length,phase:RE_MATCH_SELECTION_R34.state().phase,errors:RE_SELECTION_AVATARS_R34.status().rememberedErrors}),first.id);
        assert.equal(result.visible,0); assert.equal(result.phase,'characters'); cases.push({fault,...result,alteredBytesAreExplicitFixture:true});
      } finally {await context.close();}
    }
    return {cases};
  });
  await test('Shared-credit pressure defers portraits without poisoning error state and resumes on release',async()=>{
    const {context,page}=await scene();
    try {await select(page,first);await shown(page,first);
      await page.evaluate(()=>{window.__qaPressure=RE_IMAGE_BUDGET_R31.reserve('qa-pressure','all-pixels',32*1024*1024,()=>{});});
      assert.equal(await page.evaluate(()=>!!__qaPressure),true);await select(page,second);
      await page.waitForFunction(()=>RE_SELECTION_AVATARS_R34.status().waitingForBudget>0);
      const waiting=await page.evaluate(()=>RE_SELECTION_AVATARS_R34.status()); assert.equal(waiting.rememberedErrors,0);
      await page.evaluate(()=>__qaPressure.release());await shown(page,second);
      const resumed=await page.evaluate(()=>({avatars:RE_SELECTION_AVATARS_R34.status(),budget:RE_IMAGE_BUDGET_R31.state()}));assert.equal(resumed.avatars.rememberedErrors,0);
      assert(resumed.budget.reservedPixels<=resumed.budget.limits.pixels);return {explicitPressureFixture:true,waiting,resumed};
    }finally{await context.close();}
  });
  await test('A real new body is used for right idle only and preserves actions, opposite-side and actor/replay bytes',async()=>{
    assert(bodies.length,'No actual R34 body yet; final combat proof requires real output.');const body=bodies[0],{context,page}=await scene();
    try{const result=await page.evaluate(async uid=>{
      const actor=RE_CATALOG_DUEL.getState(),actorBefore=JSON.stringify(actor),replayBefore=JSON.stringify(RE_CATALOG_DUEL.exportReplay()),storageBefore=JSON.stringify(Object.fromEntries(Object.entries(localStorage)));
      await RE_COMBAT_SPRITES_R34.load(uid);const ctx=document.createElement('canvas').getContext('2d');
      const idle=RE_COMBAT_SPRITES_R34.draw(ctx,uid,{x:100,y:300,height:180,facing:'right',state:'idle'});
      const left=RE_COMBAT_SPRITES_R34.draw(ctx,uid,{x:100,y:300,height:180,facing:'left'});
      const actions=['attack','hit','guard','walk','jump'].map(state=>RE_COMBAT_SPRITES_R34.draw(ctx,uid,{state,facing:'right'}));
      return {idle,left,actions,actorUnchanged:JSON.stringify(actor)===actorBefore,replayUnchanged:JSON.stringify(RE_CATALOG_DUEL.exportReplay())===replayBefore,
        storageUnchanged:JSON.stringify(Object.fromEntries(Object.entries(localStorage)))===storageBefore,flow:RE_MATCH_SELECTION_R34.state()};
    },body.id);assert(result.idle.ok);assert.equal(result.idle.origin,'R34');assert.equal(result.idle.mirrored,false);assert.equal(result.left.reason,'direction-not-produced');
    assert(result.actions.every(row=>row.reason==='state-not-produced'));assert(result.actorUnchanged && result.replayUnchanged && result.storageUnchanged);assert.equal(result.flow.starts,0);return {bodyId:body.id,sha256:body.sha256,...result};
    }finally{await context.close();}
  },true);
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
const stale=[...bound].filter(([name,raw])=>hash(fs.readFileSync(path.join(root,name)))!==hash(raw)).map(([name])=>name);
if(!preview && (stale.length||changed.size))checks.push({name:'All executed registry, code and media bytes remain current',pass:false,error:[...new Set([...stale,...changed])].join(', ')});
if(errors.length)checks.push({name:'No uncaught browser errors',pass:false,error:JSON.stringify(errors)});
if(missing.size)checks.push({name:'All requested checkout resources exist',pass:false,error:[...missing].join(', ')});
const report={schema:'re.bow.roster-runtime-browser-r34/1',preview,passed:checks.filter(row=>row.pass===true).length,failed:checks.filter(row=>row.pass===false).length,
 skipped:checks.filter(row=>row.pass===null).length,checks,pageErrors:errors,unavailableResources:[...missing],staleExecutedSources:stale,multipleSourceVersions:[...changed],actualGeneratedPortraits:portraits.length,actualGeneratedBodies:bodies.length,
 environment:{node:process.version,chromium:await browser?.version(),executable:process.env.CHROME_BIN||'/usr/bin/chromium'},
 sourceFiles:[...bound].map(([name,raw])=>({path:name,bytes:raw.length,sha256:hash(raw)})),
 scope:'Default R34 player flow on three actual documents. Exact registry snapshot, genuine raw PNGs and actual ImageBitmap/canvas thumbnails; explicit source-corruption, pressure, delayed callback and synthetic lifecycle fixtures. No original idle-cycle, fullbody portrait, physical-device, or global1:1 certification.'};
const target=preview?path.join(out,'browser-report.json'):path.join(root,'docs/R34_ROSTER_RUNTIME_BROWSER.json');
fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,skipped:report.skipped,preview,report:target}));if(report.failed)process.exitCode=1;
