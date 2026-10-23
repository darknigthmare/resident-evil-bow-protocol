import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-manual-motion-r23-browser');
fs.mkdirSync(output, {recursive:true});
const checks = [], port = Number(process.env.BOW_MANUAL_R23_PORT || 5257);
const base = `http://127.0.0.1:${port}`;
const url = base + '/modules/fidelity-r23/motion/index.html';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r23/motion/malacoda/manifest.json')));
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd:root, env:{...process.env, RE_BOW_PORT:String(port)}, stdio:'ignore'});
let browser;
async function test(name, run) {
  try {checks.push({name, pass:true, detail:await run()}); console.log('PASS ' + name);}
  catch(error) {checks.push({name, pass:false, error:error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
async function frame(page, index) {await page.waitForFunction(index => document.getElementById('caption').textContent === `Image ${index + 1} / 218 — pixels d’origine vérifiés`, index);}
async function seek(page, index) {await page.locator('#position').evaluate((element,index) => {element.value=index;element.dispatchEvent(new Event('input',{bubbles:true}));},index); await frame(page,index);}
async function hash(page) {return page.evaluate(async () => {const c=document.getElementById('frame');return [...new Uint8Array(await crypto.subtle.digest('SHA-256', c.getContext('2d').getImageData(0,0,c.width,c.height).data))].map(x=>x.toString(16).padStart(2,'0')).join('');});}
try {
  for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
  browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_BIN || '/usr/bin/chromium', args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [1440,390]) await test(`Pixels, manual timing and layout at ${width}px`, async () => {
    const context = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}), page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.clock.install(); await page.goto(url); await frame(page,0);
    for(const index of [0,23,24,50,100,150,217]) {await seek(page,index); assert.equal(await hash(page),manifest.frames[index].rgbaSha256);}
    await page.clock.runFor(10_000); await frame(page,217);
    assert.equal(await page.getByRole('button',{name:/lecture|pause/i}).count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(output,`manual-${width}.png`),fullPage:true}); await context.close();
    return {framesCompared:[0,23,24,50,100,150,217],autoplay:false,timingDefined:false};
  });
  await test('Keyboard navigation and bounded decoded atlas cache', async () => {
    const context=await browser.newContext(),page=await context.newPage();
    await page.addInitScript(()=>{const native=window.createImageBitmap.bind(window);window.__bitmaps={active:0,peak:0};window.createImageBitmap=async(...args)=>{const image=await native(...args),close=image.close.bind(image);window.__bitmaps.active++;window.__bitmaps.peak=Math.max(window.__bitmaps.peak,window.__bitmaps.active);image.close=()=>{window.__bitmaps.active--;close();};return image;};});
    await page.goto(url); await frame(page,0); await page.locator('#position').focus();await page.keyboard.press('ArrowRight');await frame(page,1);
    for(const index of [24,50,100,150,217,0])await seek(page,index);
    const counts=await page.evaluate(()=>window.__bitmaps);assert(counts.peak<=2);assert(counts.active<=2);
    await page.click('#last');await frame(page,217);assert.equal(await page.locator('#next').isDisabled(),true);
    await page.click('#first');await frame(page,0);assert.equal(await page.locator('#previous').isDisabled(),true);
    await context.close();return counts;
  });
  await test('Corrupt atlas is refused without replacing verified pixels, then retry succeeds', async () => {
    const context=await browser.newContext(),page=await context.newPage();
    await page.goto(url);await frame(page,0);const original=await hash(page);
    await page.route('**/malacoda/atlas-01.png',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('corrupted pixels')}));
    await page.locator('#position').evaluate(element=>{element.value=24;element.dispatchEvent(new Event('input'));});
    await page.getByRole('button',{name:'Réessayer le chargement'}).waitFor();assert.equal(await hash(page),original);
    assert.match(await page.locator('#status').textContent(),/empreinte/);
    await page.unroute('**/malacoda/atlas-01.png');await page.click('#retry');await frame(page,24);
    assert.equal(await hash(page),manifest.frames[24].rgbaSha256);await context.close();return {refused:true,recovered:true};
  });
  await test('A later manual request wins after a delayed source load',async()=>{
    const context=await browser.newContext(),page=await context.newPage();let release,seen;
    const wait=new Promise(resolve=>release=resolve),reached=new Promise(resolve=>seen=resolve);
    await page.route('**/malacoda/atlas-01.png',async route=>{seen();await wait;await route.continue();});
    await page.goto(url);await frame(page,0);
    await page.locator('#position').evaluate(element=>{element.value=24;element.dispatchEvent(new Event('input'));});await reached;
    await page.locator('#position').evaluate(element=>{element.value=217;element.dispatchEvent(new Event('input'));});release();await frame(page,217);
    assert.equal(await hash(page),manifest.frames[217].rgbaSha256);await context.close();return {latestFrame:217};
  });
} finally {
  if(browser)await browser.close();server.kill();
  fs.writeFileSync(path.join(output,'R23_MANUAL_MOTION_BROWSER_RESULTS.json'),JSON.stringify({checks,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length},null,2)+'\n');
}
if(checks.some(x=>!x.pass))process.exitCode=1;
