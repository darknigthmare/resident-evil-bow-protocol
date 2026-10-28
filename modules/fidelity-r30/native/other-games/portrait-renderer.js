import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {verifiedBytes} from '../../../fidelity-r24/models/verified-assets.js';

const allowed=new URL('../../../../',import.meta.url);
const hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
const decode=raw=>new TextDecoder('utf-8',{fatal:true}).decode(raw);

export const ANGLES=Object.freeze([45,315]);

export async function renderBody(entry,{signal,catalog,cameraUpAxis='Y',cellSize=512,materialMode='unlit-source-albedo'}={}){
  if(!entry||!entry.id||entry.modelRole==='associated-object'||String(entry.geometryScope||'').includes('part')||!['OBJ','FBX'].includes(entry.format))throw Error('Only attributed whole-body native model entries are admitted.');
  if(!catalog||!['Y','Z'].includes(cameraUpAxis)||![512,768,1024].includes(cellSize)||!['published-materials','unlit-source-albedo'].includes(materialMode))throw Error('Explicit catalog binding and bounded camera recipe required.');
  const catalogBytes=await verifiedBytes(catalog,allowed,allowed,signal);
  const parsed=JSON.parse(decode(catalogBytes));
  const original=parsed.entries?.find(item=>item.id===entry.id);
  if(!original||JSON.stringify(original)!==JSON.stringify(entry))throw Error('The render entry differs from the SHA-bound retained catalog.');
  const catalogBase=new URL('./',new URL(catalog.path,allowed));
  const sourceBase=new URL(entry.base,catalogBase),urls=[],textures=new Set(),materials=new Set(),geometries=new Set();let object,renderer;
  const live=()=>{if(signal?.aborted)throw new DOMException('Rendu interrompu.','AbortError');};
  try{
    const [raw,mtl,images]=await Promise.all([verifiedBytes(entry.model,sourceBase,allowed,signal),entry.materials?verifiedBytes(entry.materials,sourceBase,allowed,signal):null,Promise.all(entry.textures.map(record=>verifiedBytes(record,sourceBase,allowed,signal)))]);
    live();const aliases=new Map();
    for(const [index,record] of entry.textures.entries()){
      const name=(record.name||record.path.split('/').pop()).toLowerCase();
      if(aliases.has(name)){if(aliases.get(name).sha!==record.sha256)throw Error('Ambiguous source texture names.');continue;}
      const url=URL.createObjectURL(new Blob([images[index]],{type:'image/png'}));urls.push(url);aliases.set(name,{url,sha:record.sha256});
    }
    const manager=new THREE.LoadingManager();let requested=false;
    const loaded=new Promise((resolve,reject)=>{manager.onStart=()=>{requested=true;};manager.onLoad=resolve;manager.onError=()=>reject(Error('Native source texture failed to decode.'));});loaded.catch(()=>{});
    manager.setURLModifier(value=>{
      if(urls.includes(value))return value;
      const name=decodeURIComponent(value).replaceAll('\\','/').split('/').pop().toLowerCase();
      if(!aliases.has(name))throw Error('Texture not present in verified source bytes: '+name);
      return aliases.get(name).url;
    });
    if(entry.format==='OBJ'){
      if(!mtl)throw Error('Native OBJ body requires its source MTL.');
      const creator=new MTLLoader(manager).parse(decode(mtl),'');creator.preload();for(const material of Object.values(creator.materials))materials.add(material);
      object=new OBJLoader(manager).setMaterials(creator).parse(decode(raw));
    }else object=new FBXLoader(manager).parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
    object.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
    if(requested)await loaded;live();
    if(materialMode==='unlit-source-albedo'){
      const replacements=new Map();
      const unlit=material=>{if(!replacements.has(material)){const replacement=new THREE.MeshBasicMaterial({map:material.map||null,color:material.color?.clone()||0xffffff,opacity:material.opacity,transparent:material.transparent,alphaTest:material.alphaTest,side:material.side,vertexColors:material.vertexColors});replacements.set(material,replacement);materials.add(replacement);}return replacements.get(material);};
      object.traverse(node=>{if(node.material)node.material=Array.isArray(node.material)?node.material.map(unlit):unlit(node.material);});
    }
    object.updateMatrixWorld(true);
    const originalTransforms=[];object.traverse(node=>originalTransforms.push({node,matrix:node.matrix.toArray()}));
    const bounds=new THREE.Box3().setFromObject(object,true),sphere=bounds.getBoundingSphere(new THREE.Sphere());
    if(!Number.isFinite(sphere.radius)||sphere.radius<=0)throw Error('Invalid complete source geometry bounds.');
    const scene=new THREE.Scene();scene.add(object);scene.add(new THREE.AmbientLight(0xffffff,2));
    const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(1,2,3);scene.add(light);
    const isZUp=cameraUpAxis==='Z';
    const extent=sphere.radius*1.08,camera=new THREE.OrthographicCamera(-extent,extent,extent,-extent,sphere.radius*.001,sphere.radius*12);camera.up.set(...(isZUp?[0,0,1]:[0,1,0]));
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(cellSize,cellSize,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
    const views=[];
    for(const angle of ANGLES){
      live();const radians=angle*Math.PI/180;camera.position.copy(sphere.center).add(new THREE.Vector3(...(isZUp?[Math.sin(radians),Math.cos(radians),1]:[Math.sin(radians),1,Math.cos(radians)])).multiplyScalar(sphere.radius*4));camera.lookAt(sphere.center);camera.updateMatrixWorld(true);renderer.render(scene,camera);
      const canvas=document.createElement('canvas');canvas.width=cellSize;canvas.height=cellSize;const context=canvas.getContext('2d');context.drawImage(renderer.domElement,0,0);
      const rgba=context.getImageData(0,0,cellSize,cellSize).data;let visible=0,edge=0,minX=cellSize,minY=cellSize,maxX=-1,maxY=-1;
      for(let index=0;index<rgba.length;index+=4)if(rgba[index+3]){visible++;const pixel=index/4,x=pixel%cellSize,y=Math.floor(pixel/cellSize);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);if(x===0||y===0||x===cellSize-1||y===cellSize-1)edge++;}
      if(visible<20||edge)throw Error('The entire published source body must be framed without clipping.');
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('PNG export failed.')),'image/png'));
      const planeBase=sphere.center.clone();if(isZUp)planeBase.z=bounds.min.z;else planeBase.y=bounds.min.y;const projectedBase=planeBase.project(camera);
      views.push({angle,bounds:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1},pivot:{x:(projectedBase.x+1)*cellSize/2,y:(1-projectedBase.y)*cellSize/2},pivotScope:'Projection of source bounding-box horizontal center at lowest source geometry; anatomical contact reviewed separately.',png:[...new Uint8Array(await blob.arrayBuffer())],width:cellSize,height:cellSize,occupiedPixels:visible,edgePixels:edge,rgbaSha256:await hash(rgba),cameraPosition:camera.position.toArray(),cameraTarget:sphere.center.toArray()});
    }
    if(originalTransforms.some(({node,matrix})=>!node.matrix.toArray().every((value,index)=>value===matrix[index])))throw Error('Source transforms changed during camera rendering.');
    return{views,recipe:{projection:'orthographic',cameraUp:isZUp?[0,0,1]:[0,1,0],angles:[...ANGLES],cameraElevation:45,cellSize,portraitOnly:true,cameraOrbitOnly:true,geometryMirrored:false,modelTransformsChanged:false,poseChanged:false,sourceUnitsConvertedToMeters:false,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},lighting:{ambientIntensity:2,directionalIntensity:2,directionalPosition:[1,2,3],nativeGameLightingCertified:false},renderMaterialMode:materialMode,sourceMaterialsBytesRewritten:false,originalGameMaterialCertified:false,sourceCatalog:catalog,library:'Three.js0.180.0',outputColorSpace:'sRGB',alpha:true}};
  }finally{
    object?.traverse(node=>node.skeleton?.dispose());for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();renderer?.dispose();renderer?.forceContextLoss();for(const url of urls)URL.revokeObjectURL(url);
  }
}
