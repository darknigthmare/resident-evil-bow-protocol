import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),pack=path.join(root,'modules/fidelity-r27/sources/body-rasters');
const hash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const catalogPath=path.join(root,'modules/fidelity-r26/models/catalog.json'),catalog=JSON.parse(fs.readFileSync(catalogPath));
const ids=['re1r-lisa-trevor-gamecube','re1r-cerberus-1-gamecube','re5-chainsaw-majini-pc-published','re5-executioner-pc-published'];
const port=Number(process.env.BOW_BODY_RASTERS_R27_PORT||5679),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
let browser;
try{
  for(let n=0;n<100;n++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  const page=await browser.newPage();await page.goto(base+'/modules/fidelity-r27/sources/body-rasters/render.html');
  const entries=[];
  for(const id of ids){
    const entry=catalog.entries.find(entry=>entry.id===id);if(!entry)throw Error('Expected exact source body is absent: '+id);
    const result=await page.evaluate(async entry=>{const{renderBody}=await import('./renderer.js');return renderBody(entry);},entry);
    const folder=path.join(pack,entry.subjectId);fs.mkdirSync(folder,{recursive:true});
    const views=result.views.map(view=>{
      const png=Buffer.from(view.png),relative=entry.subjectId+'/source-'+view.angle+'.png';fs.writeFileSync(path.join(pack,relative),png);
      const{png:ignored,...measure}=view;return{...measure,path:relative,bytes:png.length,sha256:hash(png)};
    });
    entries.push({id:entry.subjectId,modelId:entry.id,sourcePage:entry.sourcePage,sourceEdition:entry.sourceEdition||entry.game,platform:entry.platform,
      modelRole:entry.modelRole||'published-body-reference',geometryScope:entry.geometryScope,sourceBase:entry.base,
      sourcePoseScope:'Published rest/base pose, not an attributed neutral combat action.',
      equipmentScope:entry.subjectId==='re5-chainsaw-majini'?'The selected body geometry does not visibly contain the chainsaw; equipment completeness is not certified.':entry.subjectId==='re5-executioner'?'The selected body geometry does not visibly contain the axe; equipment completeness is not certified.':entry.subjectId==='re1r-lisa-trevor'?'The long exported chain below the feet remains in the camera bounds; no anatomy-only crop or chain repositioning is applied.':'Entire selected source body geometry, with no equipment completion claim.',
      model:entry.model,materials:entry.materials,textures:entry.textures,recipe:result.recipe,views,
      classification:'derived-exact-source-geometry-reference',originalGameSprite:false,generatedWithImageGen:false,combatReady:false,canonicalFidelityCertified:false,anatomicalCompletenessIndependentlyCertified:false});
    console.log('RENDERED '+entry.subjectId+' '+views.length+' separate source views');
  }
  const result={schema:'re.bow.source-body-reference-raster-addendum/1',release:'R27',frozenJobsChanged:false,frozenAppearanceIndexChanged:false,
    sourceCatalog:{path:'modules/fidelity-r26/models/catalog.json',sha256:hash(fs.readFileSync(catalogPath))},renderRecipe:{path:'renderer.js',sha256:hash(fs.readFileSync(path.join(pack,'renderer.js')))},
    counts:{identities:entries.length,renderedReferenceImages:entries.reduce((sum,entry)=>sum+entry.views.length,0),imageGenSprites:0,originalGameSprites:0,combatReadySprites:0},
    environment:{browser:browser.version(),backend:'Headless Chromium/software SwiftShader',physicalDeviceCertified:false},
    limits:['Separate512pixelcamera views of already attributed source geometry; source vertices, transforms and poses unchanged.','Angles are source-coordinate camera orbits, not a certification of front/left/right anatomy or physical scale.','Lighting belongs to this recipe, not a native-game rendering certification.','Reference addendum only; original385 generation jobs and their inputs remain frozen.'],entries};
  fs.writeFileSync(path.join(pack,'manifest.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.counts));
}finally{await browser?.close();server.kill('SIGTERM');}
