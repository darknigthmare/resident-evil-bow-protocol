/** Independent reconstruction of every native sixty-Hz source pose in the R30 Revelations lot. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {registerHooks} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const vendor=path.join(root,'modules/fidelity-r24/models/vendor/three');
const lot='modules/fidelity-r30/native/revelations',manifestPath=lot+'/manifest.json';
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const manifest=read(manifestPath),checks=[];
const hook=registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:pathToFileURL(path.join(vendor,'build/three.module.min.js')).href,shortCircuit:true}:next(specifier,context);}});
function source(record){const raw=fs.readFileSync(path.join(root,record.path));if(record.bytes!==undefined)assert.equal(raw.length,record.bytes);assert.equal(sha(raw),record.sha256,record.path);return raw;}
function rms(a,b){let square=0;for(let i=0;i<a.length;i++)square+=(a[i]-b[i])**2;return Math.sqrt(square/(a.length/3));}
try{
 const THREE=await import(pathToFileURL(path.join(vendor,'build/three.module.min.js')).href);
 const {FBXLoader}=await import(pathToFileURL(path.join(vendor,'examples/jsm/loaders/FBXLoader.js')).href);
 assert.equal(manifest.schema,'re.bow.native-2d-lot-r30/1');assert.equal(manifest.entries.length,12);source(manifest.inputs);source(manifest.renderer);
 for(const subjectId of new Set(manifest.entries.map(e=>e.subjectId))){
  try{
   const entries=manifest.entries.filter(e=>e.subjectId===subjectId),entry=entries[0];assert.equal(entries.length,2);assert.deepEqual(entries.map(e=>e.sourceFacing).sort(),['left','right']);
   const native=entry.nativeSource;source(native.catalog);const raw=source(native.clip),bodyRaw=source(native.model),proof=JSON.parse(source(native.bindings).toString('utf8'));for(const t of native.textures)source(t);assert.equal(sha(raw),native.publishedClip.sha256);
   const manager=new THREE.LoadingManager();manager.addHandler(/.*/,{path:'',setPath(value){this.path=value;return this;},load(){return new THREE.Texture();}});
   const loader=new FBXLoader(manager),object=loader.parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),''),body=loader.parse(bodyRaw.buffer.slice(bodyRaw.byteOffset,bodyRaw.byteOffset+bodyRaw.byteLength),'');
   const skin=[],bones=[];object.traverse(n=>{if(n.isSkinnedMesh)skin.push(n);if(n.isBone)bones.push(n);});assert(skin.length>0);assert.equal(object.animations.length,1);
   const binding=proof.clips.find(v=>v.clipSourceSha256===native.clip.sha256&&v.bodySourceSha256===native.model.sha256);assert(binding);assert.equal(binding.matchedMeshes.length,skin.length);
   for(const pair of binding.matchedMeshes){const left=body.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(pair.bodyMeshName)),right=object.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(pair.clipMeshName));assert(left?.isMesh&&right?.isMesh);assert.deepEqual(left.geometry.getAttribute('uv').array,right.geometry.getAttribute('uv').array);}
   const mixer=new THREE.AnimationMixer(object),action=mixer.clipAction(object.animations[0]);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
   const v=new THREE.Vector3(),bounds=new THREE.Box3();let first=null,previous=null,last=null,firstBonePositions=null,footIndices=null,maximumAdjacentRms=0,maximumBottomSliceHorizontalDrift=0,maximumBottomSliceVerticalDrift=0,maxBoneTranslationDelta=0;const changedBones=new Set(),frameCoordinates=[];
   for(const [index,frame]of [...entry.frames,entry.endpoint].entries()){
    const endpoint=index===entry.frames.length;assert.equal(frame.seconds,Number(frame.ticks)/entry.ticksPerSecond);if(!endpoint)assert(Math.abs(frame.seconds-index/60)<1e-12);
    action.reset().play();mixer.setTime(frame.seconds);object.updateMatrixWorld(true);const coordinates=[];
    for(const mesh of skin){const p=mesh.geometry.getAttribute('position');for(let vertex=0;vertex<p.count;vertex++){v.fromBufferAttribute(p,vertex);mesh.applyBoneTransform(vertex,v);v.applyMatrix4(mesh.matrixWorld);assert(v.toArray().every(Number.isFinite));bounds.expandByPoint(v);coordinates.push(v.x,v.y,v.z);}}
    assert.equal(frame.skinnedVertexCount,coordinates.length/3);assert.equal(frame.measurementQuantizationSourceUnits,.0001);assert.equal(sha(Buffer.from(new Int32Array(coordinates.map(n=>Math.round(n*10000))).buffer)),frame.quantizedSkinnedVertexSha256,subjectId+' nativepose '+index);
    const bonePositions=bones.map(b=>new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).toArray());
    if(first===null){
     first=coordinates;firstBonePositions=bonePositions;
     const ys=coordinates.filter((_,i)=>i%3===1),min=Math.min(...ys),max=Math.max(...ys);footIndices=[];for(let i=1;i<coordinates.length;i+=3)if(coordinates[i]<=min+(max-min)*.05)footIndices.push(i-1);
    }else{
     maximumAdjacentRms=Math.max(maximumAdjacentRms,rms(previous,coordinates));
     bonePositions.forEach((values,i)=>{const d=Math.hypot(...values.map((x,n)=>x-firstBonePositions[i][n]));if(d>1e-7)changedBones.add(bones[i].name);maxBoneTranslationDelta=Math.max(maxBoneTranslationDelta,d);});
     for(const i of footIndices){maximumBottomSliceHorizontalDrift=Math.max(maximumBottomSliceHorizontalDrift,Math.hypot(coordinates[i]-first[i],coordinates[i+2]-first[i+2]));maximumBottomSliceVerticalDrift=Math.max(maximumBottomSliceVerticalDrift,Math.abs(coordinates[i+1]-first[i+1]));}
    }
    if(!endpoint){last=coordinates;frameCoordinates.push(coordinates);}previous=coordinates;
    for(const peer of entries){const target=endpoint?peer.endpoint:peer.frames[index];assert.equal(target.quantizedSkinnedVertexSha256,frame.quantizedSkinnedVertexSha256);source(target);assert.deepEqual(target.pivot,peer.pivot);}
   }
   const height=bounds.max.y-bounds.min.y,endpointToFirstRms=rms(first,previous),playbackSeamRms=rms(first,last);
   assert(Math.abs(endpointToFirstRms-entry.measurements.seamRmsVertexDistance)<1e-7);assert(Math.abs(height-entry.measurements.sourceBodyHeight)<1e-7);assert(changedBones.size>=3,'Native deformation must involve several real source bones.');
   for(const peer of entries){assert.equal(peer.sampleRate,60);assert.equal(peer.fullNativeDuration,true);assert(Math.abs(peer.durationSeconds*60-peer.frameCount)<1e-9);assert.equal(peer.frameCount,peer.frames.length);assert.equal(peer.recipe.geometryMirrored,false);assert.equal(peer.recipe.framesInterpolatedFromPng,false);assert.equal(peer.recipe.sourceGeometryEdited,false);assert.equal(peer.admittedTargetEdition,false);assert.deepEqual(peer.admittedCombatStates,[]);assert.equal(peer.originalGameFrames,false);assert.equal(peer.canonicalFidelityCertified,false);assert.equal(peer.recipe.animationCameraFixed,true);}
   const measured={sourceBodyHeight:height,endpointToFirstRms,playbackSeamRms,maximumAdjacentRms,endpointToFirstBodyHeightRatio:endpointToFirstRms/height,playbackSeamBodyHeightRatio:playbackSeamRms/height,playbackSeamToMaximumAdjacentRatio:playbackSeamRms/maximumAdjacentRms,bottomFivePercentSourceVertexCount:footIndices.length,maximumBottomSliceHorizontalDrift,maximumBottomSliceVerticalDrift,bottomSliceDriftScope:'Fixed vertices lying in the first-pose bottom5percent of sourceheight; an anatomical foot-contact approximation, not bone semantics or original collision.',nativeMovingBoneCount:changedBones.size,nativeMovingBones:[...changedBones].sort(),maxBoneTranslationDelta};
   checks.push({name:subjectId,pass:true,reconstructedFrames:entry.frames.length+1,orientedPngs:entries.reduce((s,e)=>s+e.frames.length+1,0),measurements:measured});console.log('PASS '+subjectId+' '+JSON.stringify(measured));
   mixer.stopAllAction();mixer.uncacheRoot(object);for(const model of [object,body])model.traverse(n=>{n.geometry?.dispose();n.skeleton?.dispose();for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])m.dispose();});
  }catch(error){checks.push({name:subjectId,pass:false,error:error.stack});console.error('FAIL '+subjectId+': '+error.message);}
 }
}finally{hook.deregister();}
const paths=['tests/verify-native-revelations-r30.mjs',manifestPath,lot+'/renderer.js',lot+'/inputs.json'];
const report={schema:'re.bow.native-revelations-rig-tests-r30/1',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks,sourceFiles:paths.map(p=>({path:p,sha256:sha(fs.readFileSync(path.join(root,p)))})),scope:'Independent full-mesh reconstruction of every native60Hz export time and endpoint, multi-bone motion, actual last-frame-to-first seam, source/material/texture bytes, opposing source cameras. Quantized hashes measure1e-4native units only; geometry unmodified. Measurements do not certify the source action label, anatomical contacts or original engine presentation.'};
fs.writeFileSync(path.join(root,'docs/R30_NATIVE_REVELATIONS_RIG_TESTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed||report.passed!==6)process.exitCode=1;
