import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-interface-r20'); fs.mkdirSync(output, {recursive:true});
const port = 5210, url = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
let browser; const checks = [];
async function test(name, width, action) {
  try { const detail = await action(); checks.push({name,width,pass:true,...detail}); console.log('PASS ' + name + ' ' + width); }
  catch (error) { checks.push({name,width,pass:false,error:error.stack}); throw error; }
}
const technical = /(?:laboratory|catalog-duel|catalog-encounter|directions|coverage|finishers|sequences|stages|dev)\.html|\.xlsx(?:\?|$)/;
try {
  for (let i=0;i<100;i++) {try {if ((await fetch(url)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve,80));}
  browser = await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
    const page = await context.newPage(), errors = []; page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(() => { window.r20Pad = null; Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.r20Pad?[window.r20Pad]:[]}); });
    await page.goto(url, {waitUntil:'networkidle'});
    await test('Entry screen blocks the background and opens without touching progression',width,async()=>{
      assert(await page.locator('#bootScreen').isVisible());
      assert.equal(await page.locator('#gameShell').evaluate(el=>el.inert),true);
      const before=await page.evaluate(()=>JSON.stringify(localStorage));
      await page.click('#enterProtocol');
      assert(await page.locator('#bootScreen').isHidden());
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.open),'modes');
      assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),before);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.screenshot({path:path.join(output,'menu-'+width+'.png'),fullPage:true});
      return {realClick:true,progressionUntouched:true};
    });
    await test('Player menu and every mode point to real player screens',width,async()=>{
      const links = await page.locator('#mainMenu a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
      assert(links.every(link=>!technical.test(link)));
      await page.keyboard.press('Enter'); assert(await page.locator('#modesView').isVisible());
      const modes=await page.locator('#modesView nav a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
      assert.equal(modes.length,7); assert(modes.every(link=>!technical.test(link)));
      for(const link of modes) assert.equal((await context.request.get(url+'/'+link)).status(),200);
      await page.screenshot({path:path.join(output,'modes-'+width+'.png'),fullPage:true});
      await page.keyboard.press('Escape'); assert.equal(await page.evaluate(()=>document.activeElement.dataset.open),'modes');
      return {modes:modes.length,allDestinations200:true};
    });
    await test('Keyboard navigation, nested back and focus trap keep the current panel',width,async()=>{
      await page.keyboard.press('ArrowDown'); assert.match(await page.evaluate(()=>document.activeElement.href),/chronicles\.html$/);
      await page.click('[data-open="options"]'); await page.click('[data-open="controls"]');
      await page.keyboard.press('Escape'); assert(await page.locator('#optionsView').isVisible());
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.open),'controls');
      await page.locator('#optionsView [data-back]').focus(); await page.keyboard.press('Shift+Tab');
      assert.match(await page.evaluate(()=>document.activeElement.href),/saves\.html$/);
      await page.keyboard.press('Tab'); assert(await page.locator('#optionsView [data-back]').evaluate(el=>el===document.activeElement));
      return {nestedBack:true,tabCycle:true};
    });
    await test('Display choices persist separately and apply to another player screen',width,async()=>{
      await page.evaluate(()=>localStorage.setItem('r20-test-unrelated','keep'));
      await page.selectOption('#motionSetting','reduced'); await page.selectOption('#contrastSetting','high'); await page.selectOption('#textSetting','large');
      assert.equal(await page.locator('html').getAttribute('data-r20-motion'),'reduced');
      assert.equal(await page.locator('html').getAttribute('data-r20-text'),'large');
      assert.equal(await page.locator('html').getAttribute('data-r20-contrast'),'high');
      assert.equal(await page.evaluate(()=>localStorage.getItem('r20-test-unrelated')),'keep');
      assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).sort()),['r20-test-unrelated','re.bow.interface.r20']);
      await page.screenshot({path:path.join(output,'options-accessible-'+width+'.png'),fullPage:true});
      await page.goto(url+'/codex.html',{waitUntil:'networkidle'});
      assert.equal(await page.locator('html').getAttribute('data-r20-text'),'large');
      assert.equal(await page.locator('html').getAttribute('data-r20-contrast'),'high');
      await page.goto(url+'/index.html#options',{waitUntil:'networkidle'});assert(await page.locator('#bootScreen').isHidden());
      await page.selectOption('#contrastSetting','standard');await page.selectOption('#textSetting','normal');await page.keyboard.press('Escape');
      return {separateInterfaceKey:true,crossPage:true};
    });
    await test('A standard gamepad uses edges and back without repeated activation',width,async()=>{
      const set = async buttons => page.evaluate(buttons=>{window.r20Pad={index:0,id:'Test gamepad R20',mapping:'standard',connected:true,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))}},buttons);
      await set([0]); await page.waitForTimeout(90); assert(await page.locator('#homeView').isVisible());
      await set([]);await page.waitForTimeout(50);await page.locator('#mainMenu [data-open="modes"]').focus();
      await set([0]);await page.waitForTimeout(100);assert(await page.locator('#modesView').isVisible());
      await page.waitForTimeout(450);assert(await page.locator('#modesView').isVisible());
      await set([]);await page.waitForTimeout(50);await set([1]);await page.waitForTimeout(90);assert(await page.locator('#homeView').isVisible());
      await set([]); await page.evaluate(()=>window.r20Pad=null);
      return {gamepadApiInjected:true,physicalController:false,heldConfirmBlocked:true};
    });
    await test('Specimen selection loads a different transparent independent PNG',width,async()=>{
      await page.waitForFunction(()=>document.getElementById('menuSpecimen').src.includes('/sprites/bow/')&&document.getElementById('menuSpecimen').complete);
      const first=await page.locator('#menuSpecimen').getAttribute('src');
      await page.click('#nextSpecimen');
      await page.waitForFunction(first=>{const img=document.getElementById('menuSpecimen');return img.getAttribute('src')!==first&&img.complete&&img.naturalWidth>0},first);
      assert.match(await page.locator('#menuSpecimen').getAttribute('src'),/sprites\/bow\/re2r-licker\/idle-right\.png$/);
      assert.equal(await page.locator('#specimenName').innerText(),'LICKER');
      return {independentPng:true};
    });
    await test('Developer shortcut opens the dedicated terminal; tools remain reachable',width,async()=>{
      await page.keyboard.press('Control+Shift+D'); await page.waitForURL('**/dev.html');
      const links=await page.locator('.r20-dev-groups a[href]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
      assert(links.some(href=>href.startsWith('laboratory.html')));assert(links.some(href=>href.startsWith('directions.html')));
      for(const href of links) assert.equal((await context.request.get(new URL(href,page.url()).href)).status(),200,href);
      await page.screenshot({path:path.join(output,'dev-'+width+'.png'),fullPage:true});
      return {toolsChecked:links.length,allDestinations200:true};
    });
    await test('Real navigation opens the versus roster and returns to the menu',width,async()=>{
      await page.goto(url+'/index.html#modes',{waitUntil:'networkidle'});
      await page.locator('#modesView a[href="modules/versus.html"]').click();await page.waitForURL('**/modules/versus.html');
      await page.waitForFunction(()=>document.querySelectorAll('#roster .fighter-card').length>0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.click('#backCommand');await page.waitForURL('**/index.html');assert(await page.locator('#transitionScreen').isHidden());
      assert(await page.locator('#bootScreen').isHidden()); assert.deepEqual(errors,[]);
      return {realRoster:true,noPageErrors:true};
    });
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError')}});
  await page.goto(url+'/index.html#options',{waitUntil:'networkidle'});
  await test('Unavailable storage and fullscreen API report a usable session',390,async()=>{
    await page.selectOption('#motionSetting','reduced');assert.match(await page.locator('#optionsStatus').innerText(),/session/);
    await page.evaluate(()=>{document.documentElement.requestFullscreen=async()=>{throw Error('test refusal')}});
    await page.click('#fullscreen');assert.match(await page.locator('#optionsStatus').innerText(),/pas disponible/);
    assert.equal(await page.locator('html').getAttribute('data-r20-motion'),'reduced');
    return {storageFaultInjected:true,fullscreenRefusalInjected:true};
  });
  await context.close();
} catch(error) {console.error(error.stack);process.exitCode=1;if(!checks.some(c=>!c.pass))checks.push({pass:false,error:error.stack});}
finally {await browser?.close();server.kill('SIGTERM');const report={suite:'game-menu-r20-http',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,physicalController:false,checks};fs.writeFileSync(path.join(output,'GAME_MENU_R20_RESULTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
