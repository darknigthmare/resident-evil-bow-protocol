import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const option=name=>{const at=process.argv.indexOf(name);return at<0?null:process.argv[at+1];};
const requestPath=path.resolve(root,option('--request')||'docs/R29_BODY_RENDER_REQUEST.json');
const request=JSON.parse(fs.readFileSync(requestPath));
if(request.schema!=='re.bow.body-raster-render-request-r29/1'||!Array.isArray(request.entries)||!request.entries.length)throw Error('A nonempty explicit R29 source-body render request is required.');
const destination=path.resolve(root,request.output);
if(!destination.startsWith(path.join(root,'modules/fidelity-r29/sources')+path.sep))throw Error('Source raster output must remain in the R29 source pack.');
const roster=new Map(JSON.parse(fs.readFileSync(path.join(root,'data/roster.json'))).catalog.map(item=>[item.id,item]));
const port=Number(process.env.BOW_BODY_RASTERS_R29_PORT||5697),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let n=0;n<100;n++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
  if(!ready)throw Error('Native-body reference render server did not become ready.');
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  const page=await browser.newPage();await page.goto(base+'/modules/fidelity-r29/sources/body-rasters/render.html');
  const entries=[],ids=new Set();
  for(const item of request.entries){
    const catalogPath=path.resolve(root,item.catalogPath);
    if(!catalogPath.startsWith(root+path.sep)||!catalogPath.endsWith('.json'))throw Error('Catalog must be a retained local JSON file.');
    const catalogRaw=fs.readFileSync(catalogPath),catalog=JSON.parse(catalogRaw),entry=catalog.entries.find(entry=>entry.id===item.modelId);
    if(!entry||ids.has(entry.id)||!roster.has(entry.subjectId)||entry.candidateUid||entry.game!==roster.get(entry.subjectId).game)throw Error('Repeated, missing, candidate-only or wrong-incarnation model: '+item.modelId);
    ids.add(entry.id);
    const catalogRecord={path:path.relative(root,catalogPath).split(path.sep).join('/'),bytes:catalogRaw.length,sha256:hash(catalogRaw)};
    const options={catalog:catalogRecord,cameraUpAxis:item.cameraUpAxis||'Y',cellSize:item.cellSize||768,materialMode:item.materialMode||'published-materials'};
    const result=await page.evaluate(async({entry,options})=>{const{renderBody}=await import('./renderer.js');return renderBody(entry,options);},{entry,options});
    const folder=path.join(destination,entry.id);fs.mkdirSync(folder,{recursive:true});
    const views=result.views.map(view=>{
      const png=Buffer.from(view.png),relative=entry.id+'/source-'+view.angle+'.png';fs.writeFileSync(path.join(destination,relative),png);
      const{png:ignored,...measure}=view;return{...measure,path:relative,bytes:png.length,sha256:hash(png)};
    });
    entries.push({id:entry.subjectId,modelId:entry.id,sourcePage:entry.sourcePage,sourceEdition:entry.sourceEdition||entry.game,platform:entry.platform,
      sourceCatalog:catalogRecord,sourceBase:entry.base,model:entry.model,materials:entry.materials,textures:entry.textures,
      sourcePoseScope:'Published rest/base pose only; no native action name or neutral combat idle inferred.',
      equipmentScope:item.equipmentScope||'Complete selected source geometry is framed; independently certified original-game equipment remains open.',
      sourceVariantScope:item.sourceVariantScope||'The exact retained source model variant; no other outfit, port or phase inferred.',
      geometryScope:entry.geometryScope,recipe:result.recipe,views,
      classification:'derived-exact-source-geometry-reference',originalGameSprite:false,generatedWithImageGen:false,combatReady:false,
      canonicalFidelityCertified:false,anatomicalCompletenessIndependentlyCertified:false});
    console.log('RENDERED '+entry.subjectId+' / '+entry.id+' '+views.length+' separate source views');
  }
  const rendererPath='modules/fidelity-r29/sources/body-rasters/renderer.js';
  const result={schema:'re.bow.source-body-reference-raster-addendum/1',release:'R29',
    request:{path:path.relative(root,requestPath).split(path.sep).join('/'),sha256:hash(fs.readFileSync(requestPath))},
    renderRecipe:{path:rendererPath,sha256:hash(fs.readFileSync(path.join(root,rendererPath)))},
    frozenPreviousReleasesChanged:false,counts:{identities:new Set(entries.map(entry=>entry.id)).size,sourceBodyModels:entries.length,
      renderedReferenceImages:entries.reduce((sum,entry)=>sum+entry.views.length,0),imageGenSprites:0,originalGameSprites:0,combatReadySprites:0},
    environment:{browser:browser.version(),backend:'Headless Chromium/software SwiftShader',physicalDeviceCertified:false},
    limits:['Separate camera views of the retained attributed source models; vertices, transforms and poses unchanged.',
      'Orbit angles are source-coordinate views, not a certification of canonical front/left/right, physical scale or an animation action.',
      'Rendering and lighting belong to this reference recipe; original-game rendering and material interpretation remain uncertified.',
      'Models from other ports, candidate identities and partial source components cannot be promoted as complete exact-incarnation bodies.'],entries};
  fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.counts));
}finally{await browser?.close();server.kill('SIGTERM');}
