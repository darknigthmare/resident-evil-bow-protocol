/** Derive four reviewed source-body views without editing native geometry or textures. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),pack='modules/fidelity-r31/sprites/sources';
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const catalogPath=pack+'/catalog.json',raw=fs.readFileSync(path.join(root,catalogPath)),catalog=JSON.parse(raw);
const catalogRecord={path:catalogPath,bytes:raw.length,sha256:sha(raw)},port=5806,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,60));}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 const page=await browser.newPage();await page.goto(base+'/'+pack+'/render.html');const entries=[];
 for(const entry of catalog.entries){
  const result=await page.evaluate(async({entry,catalog})=>{const {renderBody}=await import('../../../fidelity-r30/native/other-games/renderer.js');return renderBody(entry,{catalog,cameraUpAxis:'Y',cellSize:768,materialMode:'unlit-source-albedo'});},{entry,catalog:catalogRecord});
  const folder=pack+'/views/'+entry.id;fs.mkdirSync(path.join(root,folder),{recursive:true});
  const views=result.views.map(view=>{const png=Buffer.from(view.png),name=folder+'/source-'+view.angle+'.png';fs.writeFileSync(path.join(root,name),png);const {png:ignored,...measurement}=view;return{...measurement,path:name,bytes:png.length,sha256:sha(png)};});
  entries.push({id:entry.subjectId,modelId:entry.id,sourceEdition:entry.sourceEdition,sourcePage:entry.sourcePage,sourceCatalog:catalogRecord,recipe:result.recipe,views});
 }
 const renderer='modules/fidelity-r30/native/other-games/renderer.js';
 fs.writeFileSync(path.join(root,pack,'renders.json'),JSON.stringify({schema:'re.bow.sprite-source-body-rasters-r31/1',release:'R31',renderer:{path:renderer,sha256:sha(fs.readFileSync(path.join(root,renderer)))},browser:browser.version(),nativeGeometryEdited:false,nativeTexturesEdited:false,entries},null,2)+'\n');
 console.log(JSON.stringify({models:entries.length,views:entries.reduce((sum,entry)=>sum+entry.views.length,0)}));
}finally{await browser?.close();server.kill('SIGTERM');}
