/** Render full native-duration sixty-Hz FBX curves in two actual side projections. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pack=path.join(root,'modules/fidelity-r30/native/other-games');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const inputsPath=path.join(pack,'motion-inputs.json');
const input=JSON.parse(fs.readFileSync(inputsPath));
const jobs=input.jobs;
const port=Number(process.env.BOW_NATIVE_OTHER_MOTION_R30_PORT||5793),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
const records=[]; let browser;
const rootRecord=(record,job)=>{const sourceBase=path.resolve(root,path.dirname(job.sourceCatalog.path),job.entry.base);return {...record,path:path.relative(root,path.resolve(sourceBase,record.path)).split(path.sep).join('/')};};
function writeManifest(){
 const manifest={schema:'re.bow.native-2d-lot-r30/1',release:'R30',lot:'other-native-motion',
  inputs:{path:path.relative(root,inputsPath),sha256:sha(fs.readFileSync(inputsPath))},renderer:{path:'modules/fidelity-r30/native/revelations/renderer.js',sha256:sha(fs.readFileSync(path.join(root,'modules/fidelity-r30/native/revelations/renderer.js')))},
  counts:{subjects:new Set(records.map(e=>e.subjectId)).size,nativeClips:new Set(records.map(e=>e.clipId)).size,orientedSequences:records.length,nativeRenderedFrames:records.reduce((s,e)=>s+e.frames.length,0),endpointReferenceFrames:records.length,admittedIdleSequences:records.filter(e=>e.admittedCombatStates.includes('idle')).length,originalGameFrames:0},
  sourceFilesRewritten:false,canonicalFidelityCertified:false,
  scope:'Full native-duration 60Hz side-view derivations from the preserved PC/HD2013 FBX curves and textures; no guessed game action, original-game lighting, 3DS equivalence, or invented motion. Loop seam measurements do not establish an action identity.',entries:records};
 fs.writeFileSync(path.join(pack,'motion-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,75));}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 const page=await browser.newPage();await page.goto(base+'/modules/fidelity-r30/native/other-games/render.html');
 page.on('console',message=>{if(message.type()==='error')console.error('BROWSER '+message.text());});
 for(const job of jobs){
  const result=await page.evaluate(async job=>{const {renderNative}=await import('../revelations/renderer.js');return renderNative(job);},job);
  for(const view of result.views){
   const facing=view.angle===90?'left':'right',id=job.subjectId+'--'+job.sourceClip.id+'--'+facing,folder='modules/fidelity-r30/native/other-games/sequences/'+id;
   fs.mkdirSync(path.join(root,folder),{recursive:true});
   const save=(value,relative)=>{const png=Buffer.from(value.png,'base64');fs.writeFileSync(path.join(root,relative),png);const {png:ignored,alphaBounds,...metadata}=value;return {...metadata,bounds:alphaBounds,path:relative,bytes:png.length,sha256:sha(png)};};
   const frames=view.frames.map((f,i)=>save(f,folder+'/frame-'+String(i).padStart(3,'0')+'.png'));
   const endpoint=save(view.endpoint,folder+'/endpoint-reference.png');
   const record={id,subjectId:job.subjectId,kind:'native-sequence',label:job.entry.label,game:job.entry.game,sourceEdition:job.entry.sourceEdition||'PC/HD2013 source publication; 3DS2012 equivalence unverified',targetIncarnation:'Nintendo3DS2012 catalogue identity; PC/HD2013 native publication shown separately.',admittedTargetEdition:false,
    modelId:job.entry.id,modelRole:job.entry.modelRole,clipId:job.sourceClip.id,sourcePage:job.entry.sourcePage,sourceFacing:facing,canMirror:false,
    actionIdentity:'unassigned',actionVerified:false,admittedCombatStates:[],availableCombatStates:[],continuityVerified:false,fightingPoseReviewed:false,fullBodyReviewed:false,knownAppearanceGaps:[],
    frameCount:frames.length,sampleRate:60,frameDurationSeconds:1/60,durationSeconds:Number(job.sourceClip.keyTimeEnd)/job.sourceClip.ticksPerSecond,fullNativeDuration:true,
    originalGameFrames:false,canonicalFidelityCertified:false,
    nativeSource:{catalog:job.sourceCatalog,model:rootRecord(job.entry.model,job),clip:job.clipFile,publishedClip:{member:job.sourceClip.member,bytes:job.sourceClip.bytes,sha256:job.sourceClip.sha256},bindings:rootRecord(job.entry.materialBindings,job),textures:job.entry.textures.map(t=>rootRecord(t,job)),archive:{sha256:job.entry.archive.sha256,bytes:job.entry.archive.bytes}},
    ticksPerSecond:job.sourceClip.ticksPerSecond,sourceNativeSampleTicks:job.nativeSampleTicks,
    pivot:view.pivot,pivotScope:'Fixed projection of source x/z zero at the all-frame source-space minimum Y; floor proxy, not independently verified anatomical foot contact.',referenceBounds:view.referenceBounds,
    recipe:{...result.recipe,cameraAngle:view.angle,cameraPosition:view.cameraPosition,sourceOriginPivot:view.sourceOriginPivot},measurements:result.measurements,frames,endpoint,
    limitations:['Opaque published clip codes are retained without guessing an action.','Every exported frame is sampled from the native FBX skeleton at a distinct native key time; the duplicate clip endpoint is retained separately for loop seam review.','Side views use actual opposing cameras; no image or geometry is mirrored.','A fixed source-bounds floor proxy is not an original game collision/foot contact.','Three.js does not support the published FBX SpecularFactor texture channel; original game lighting/material appearance remains unverified.','Published PC/HD2013 source geometry and motion are not silently promoted to Nintendo3DS2012.']};
   records.push(record);writeManifest();console.log('RENDERED '+id+' frames='+frames.length+' seam='+record.measurements.seamRmsBodyHeightRatio);
  }
 }
 console.log(JSON.stringify({subjects:new Set(records.map(e=>e.subjectId)).size,orientedSequences:records.length,frames:records.reduce((s,e)=>s+e.frames.length,0)}));
}finally{await browser?.close();server.kill('SIGTERM');}
