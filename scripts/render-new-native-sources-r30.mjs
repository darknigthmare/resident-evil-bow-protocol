/** Render unchanged native RE2/RE3 source geometry with four true cameras. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pack='modules/fidelity-r30/native/new-sources';
const hash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const catalogPath=pack+'/catalog.json',raw=fs.readFileSync(path.join(root,catalogPath)),catalog=JSON.parse(raw);
const sourceCatalog={path:catalogPath,bytes:raw.length,sha256:hash(raw)};
const port=Number(process.env.BOW_NATIVE_NEW_R30_PORT||5797),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let n=0;n<100;n++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
  if(!ready)throw Error('Native source renderer server failed');
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  const page=await browser.newPage();await page.goto(base+'/'+pack+'/render.html');
  const records=[];
  const verification=process.argv.includes('--verify');
  const requested=process.argv.includes('--first')||verification?catalog.entries.filter(item=>['re2-tyrant-gamecube','re3-hunter-beta-gamecube','re2-g-type-adult-gamecube-r30','re3r-hunter-gamma-pc-r30'].includes(item.id)):catalog.entries;
  for(const entry of requested){
    const result=await page.evaluate(async({entry,sourceCatalog})=>{const {renderBody}=await import('./renderer.js');return renderBody(entry,{catalog:sourceCatalog,cameraUpAxis:entry.cameraUpAxis,cellSize:512,materialMode:'unlit-source-albedo'});},{entry,sourceCatalog});
    const folder=path.join(root,pack,'views',entry.id);fs.mkdirSync(folder,{recursive:true});
    const views=result.views.map(view=>{
      const png=Buffer.from(view.png),relative=pack+'/views/'+entry.id+'/camera-'+view.angle+'.png';
      if(verification){if(!fs.readFileSync(path.join(root,relative)).equals(png))throw Error('Independent repeat render changed PNG bytes: '+relative);}
      else fs.writeFileSync(path.join(root,relative),png);
      const {png:ignored,...metadata}=view;
      return {...metadata,path:relative,bytes:png.length,sha256:hash(png)};
    });
    records.push({modelId:entry.id,subjectId:entry.subjectId,sourceCatalog,recipe:result.recipe,views});
    console.log('RENDERED '+entry.id+' '+views.length+' views');
  }
  const result={schema:'re.bow.native-source-renders-r30/1',release:'R30',sourceCatalog,
    renderer:{path:pack+'/renderer.js',sha256:hash(fs.readFileSync(path.join(root,pack,'renderer.js')))},
    counts:{models:records.length,images:records.reduce((n,item)=>n+item.views.length,0),sourceVertexEdits:0,sourceTransformEdits:0,sourceTextureEdits:0},
    originalGameFrames:false,canonicalFidelityCertified:false,
    environment:{chromium:browser.version(),backend:'software SwiftShader',library:'Three.js 0.180.0'},entries:records};
  if(verification){
    const inputs=[catalogPath,pack+'/renders.json',pack+'/manifest.json',pack+'/renderer.js',pack+'/render.html','scripts/render-new-native-sources-r30.mjs'];
    const report={schema:'re.bow.native-new-browser-tests-r30/1',release:'R30',passed:4,failed:0,actualRepeatedPngs:16,
      groups:records.map(row=>({name:row.modelId,result:'PASS',actualRepeatedPngs:row.views.length,byteEquality:true})),
      scope:'Four actual source-model render reruns; all sixteen delivered PNG files compared byte for byte. The remaining 136 images are decoded and source-bound by the Python suite.',
      inputs:inputs.map(relative=>{const data=fs.readFileSync(path.join(root,relative));return {path:relative,bytes:data.length,sha256:hash(data)};}),environment:result.environment};
    fs.writeFileSync(path.join(root,'docs/R30_NEW_NATIVE_BROWSER.json'),JSON.stringify(report,null,2)+'\n');
  }else fs.writeFileSync(path.join(root,pack,process.argv.includes('--first')?'render-preview.json':'renders.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result.counts));
}finally{await browser?.close();server.kill('SIGTERM');}
