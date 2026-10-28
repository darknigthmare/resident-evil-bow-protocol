/** Render attributed native source meshes with flat, independent orthographic cameras. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pack='modules/fidelity-r30/native/other-games';
const hash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const catalogPath='modules/fidelity-r26/models/catalog.json';
const catalogRaw=fs.readFileSync(path.join(root,catalogPath)),catalog=JSON.parse(catalogRaw);
const request=JSON.parse(fs.readFileSync(path.join(root,pack,'request.json')));
const port=Number(process.env.BOW_NATIVE_OTHER_PORTRAIT_R30_PORT||5794),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
const catalogProof={path:catalogPath,bytes:catalogRaw.length,sha256:hash(catalogRaw)};
let browser;
try{
  let ready=false;
  for(let n=0;n<100;n++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
  if(!ready)throw Error('Native other-game source render server did not start.');
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  const page=await browser.newPage();await page.goto(base+'/'+pack+'/render.html');
  const results=[],failures=[];
  for(const item of request.entries.filter(item=>['re0-lurker','re0-centurion','re0-stinger'].includes(item.subjectId))){
    const entry=catalog.entries.find(entry=>entry.id===item.modelId);
    if(!entry)throw Error('Unknown preserved source model '+item.modelId);
    const options={catalog:catalogProof,cameraUpAxis:item.cameraUpAxis||'Y',cellSize:512,materialMode:'unlit-source-albedo'};
    let result;
    try{result=await page.evaluate(async({entry,options})=>{const {renderBody}=await import('./portrait-renderer.js');return renderBody(entry,options);},{entry,options});}
    catch(error){failures.push({modelId:entry.id,subjectId:item.subjectId,sourcePage:entry.sourcePage,
      reason:String(error.message).split('\n')[0],sourceModelSha256:entry.model.sha256,rendererSha256:hash(fs.readFileSync(path.join(root,pack,'portrait-renderer.js'))),
      inventedTextureReplacement:false,combatReady:false,generatedOutput:false});
      fs.writeFileSync(path.join(root,pack,'portrait-render-failures.json'),JSON.stringify({schema:'re.bow.native-other-render-failures-r30/1',entries:failures},null,2)+'\n');
      console.log('HELD '+entry.id+' '+failures.at(-1).reason);continue;}
    const folder=path.join(root,pack,'portrait-views',entry.id);fs.mkdirSync(folder,{recursive:true});
    const views=result.views.map(view=>{
      const png=Buffer.from(view.png),relative=pack+'/portrait-views/'+entry.id+'/native-'+view.angle+'.png';fs.writeFileSync(path.join(root,relative),png);
      const {png:ignored,...measure}=view;return{...measure,path:relative,bytes:png.length,sha256:hash(png)};
    });
    const sourceBase=path.resolve(root,path.dirname(catalogPath),entry.base);
    const sourceProof=record=>{if(!record)return null;const file=path.resolve(sourceBase,record.path);const raw=fs.readFileSync(file);if(raw.length!==record.bytes||hash(raw)!==record.sha256)throw Error('Source differs: '+record.path);return{...record,path:path.relative(root,file).split(path.sep).join('/')};};
    results.push({modelId:entry.id,subjectId:item.subjectId,label:entry.label,sourceGame:entry.game,platform:entry.platform,
      sourceEdition:item.sourceEdition||entry.sourceEdition||entry.game,sourcePage:entry.sourcePage,identityCandidate:!!entry.candidateUid,
      sourceCatalog:catalogProof,model:sourceProof(entry.model),materials:sourceProof(entry.materials),textures:entry.textures.map(sourceProof),
      nativeClipCount:entry.clips?.length||0,sourcePoseRetained:true,sourceTransformsRetained:true,sourceBytesRewritten:false,
      sourceLimitations:entry.limitations||[],recipe:result.recipe,views});
    fs.writeFileSync(path.join(root,pack,'portrait-renders.json'),JSON.stringify({schema:'re.bow.native-other-renders-r30/1',release:'R30',
      request:{path:pack+'/request.json',sha256:hash(fs.readFileSync(path.join(root,pack,'request.json')))},
      renderer:{path:pack+'/portrait-renderer.js',sha256:hash(fs.readFileSync(path.join(root,pack,'portrait-renderer.js')))},
      browser:browser.version(),entries:results},null,2)+'\n');
    console.log('RENDERED '+entry.id+' views='+views.length);
  }
}finally{await browser?.close();server.kill('SIGTERM');}
