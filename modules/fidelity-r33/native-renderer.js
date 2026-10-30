import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {verifiedBytes} from '../fidelity-r24/models/verified-assets.js';

const allowed=new URL('../../',import.meta.url);
export const ANGLES=Object.freeze([0,90,180,270]);
const decode=raw=>new TextDecoder('utf-8',{fatal:true}).decode(raw);
const hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');

function admissible(entry){
 if(!entry||!entry.id||entry.format!=='OBJ'||!entry.model||!entry.materials||!Array.isArray(entry.textures))throw Error('Variante source R33 invalide.');
 if(entry.geometry?.bones||entry.geometry?.animationClips)throw Error('R33 attend une géométrie statique sans animation publiée.');
 for(const record of [entry.model,entry.materials,...entry.textures]){
  if(!record.path?.startsWith('modules/fidelity-r26/visual/models/')||!Number.isInteger(record.bytes)||record.bytes<=0||!/^[a-f0-9]{64}$/.test(record.sha256||''))throw Error('Source R26 non bornée.');
 }
 return entry;
}

export async function renderSource(entry,{signal,cellSize=512}={}){
 admissible(entry);
 if(![512,768,1024].includes(cellSize))throw Error('Taille de rendu R33 refusée.');
 const urls=[],textures=new Set(),materials=new Set(),geometries=new Set();let object,renderer;
 const live=()=>{if(signal?.aborted)throw new DOMException('Rendu interrompu.','AbortError');};
 try{
  const [raw,mtl,images]=await Promise.all([
   verifiedBytes(entry.model,allowed,allowed,signal),
   verifiedBytes(entry.materials,allowed,allowed,signal),
   Promise.all(entry.textures.map(record=>verifiedBytes(record,allowed,allowed,signal)))
  ]);
  live();
  const aliases=new Map();
  for(const [index,record] of entry.textures.entries()){
   const name=(record.member||record.path).replaceAll('\\','/').split('/').pop().toLowerCase();
   if(aliases.has(name)&&aliases.get(name).sha!==record.sha256)throw Error('Nom de texture source ambigu.');
   if(!aliases.has(name)){
    const url=URL.createObjectURL(new Blob([images[index]],{type:'image/png'}));urls.push(url);aliases.set(name,{url,sha:record.sha256});
   }
  }
  const manager=new THREE.LoadingManager();let requested=false;
  const loaded=new Promise((resolve,reject)=>{manager.onStart=()=>{requested=true;};manager.onLoad=resolve;manager.onError=url=>reject(Error('Texture source non décodée : '+url));});loaded.catch(()=>{});
  manager.setURLModifier(value=>{
   if(urls.includes(value))return value;
   const name=decodeURIComponent(value).replaceAll('\\','/').split('/').pop().toLowerCase();
   const match=aliases.get(name);if(!match)throw Error('Texture absente des octets R26 vérifiés : '+name);return match.url;
  });
  const creator=new MTLLoader(manager).parse(decode(mtl),'');creator.preload();
  for(const material of Object.values(creator.materials))materials.add(material);
  object=new OBJLoader(manager).setMaterials(creator).parse(decode(raw));
  object.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
  if(requested)await loaded;live();
  const replacements=new Map();
  const unlit=material=>{
   if(!replacements.has(material)){const replacement=new THREE.MeshBasicMaterial({map:material.map||null,color:material.color?.clone()||0xffffff,opacity:material.opacity,transparent:material.transparent,alphaTest:material.alphaTest,side:material.side,vertexColors:material.vertexColors});replacements.set(material,replacement);materials.add(replacement);}
   return replacements.get(material);
  };
  object.traverse(node=>{if(node.material)node.material=Array.isArray(node.material)?node.material.map(unlit):unlit(node.material);});
  object.updateMatrixWorld(true);
  const transforms=[];object.traverse(node=>transforms.push({node,matrix:node.matrix.toArray()}));
  const bounds=new THREE.Box3().setFromObject(object,true),sphere=bounds.getBoundingSphere(new THREE.Sphere());
  if(!Number.isFinite(sphere.radius)||sphere.radius<=0)throw Error('Bornes géométriques source invalides.');
  const scene=new THREE.Scene();scene.add(object);
  const extent=sphere.radius*1.08,camera=new THREE.OrthographicCamera(-extent,extent,extent,-extent,sphere.radius*.001,sphere.radius*12);
  camera.up.set(0,1,0);
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(cellSize,cellSize,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
  const views=[];
  for(const angle of ANGLES){
   live();const radians=angle*Math.PI/180;camera.position.copy(sphere.center).add(new THREE.Vector3(Math.sin(radians),0,Math.cos(radians)).multiplyScalar(sphere.radius*4));camera.lookAt(sphere.center);camera.updateMatrixWorld(true);renderer.render(scene,camera);
   const canvas=document.createElement('canvas');canvas.width=cellSize;canvas.height=cellSize;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(renderer.domElement,0,0);
   const image=context.getImageData(0,0,cellSize,cellSize),rgba=image.data;let visible=0,edge=0,minX=cellSize,minY=cellSize,maxX=-1,maxY=-1;
   for(let index=0;index<rgba.length;index+=4)if(rgba[index+3]){visible++;const pixel=index/4,x=pixel%cellSize,y=Math.floor(pixel/cellSize);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);if(x===0||y===0||x===cellSize-1||y===cellSize-1)edge++;}
   if(visible<20||edge)throw Error('Le corps source complet doit rester cadré sans rognage.');
   const planeBase=sphere.center.clone();planeBase.y=bounds.min.y;const projected=planeBase.project(camera);
   views.push({angle,canvas,width:cellSize,height:cellSize,bounds:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1},pivot:{x:(projected.x+1)*cellSize/2,y:(1-projected.y)*cellSize/2},occupiedPixels:visible,edgePixels:edge,rgbaSha256:await hash(rgba),cameraPosition:camera.position.toArray(),cameraTarget:sphere.center.toArray()});
  }
  if(transforms.some(({node,matrix})=>!node.matrix.toArray().every((value,index)=>value===matrix[index])))throw Error('Transformation source modifiée pendant le rendu.');
  return {entry:{id:entry.id,subjectId:entry.subjectId,label:entry.label,sourceEdition:entry.sourceEdition,sourcePage:entry.sourcePage,modelSha256:entry.model.sha256},views,recipe:{projection:'orthographic',angles:[...ANGLES],cellSize,cameraOrbitOnly:true,geometryMirrored:false,modelTransformsChanged:false,poseChanged:false,sourceUnitsConvertedToMeters:false,renderMaterialMode:'unlit-source-albedo',originalGameLightingCertified:false,originalGameMaterialCertified:false}};
 }finally{
  object?.traverse(node=>node.skeleton?.dispose());for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();renderer?.dispose();renderer?.forceContextLoss();for(const url of urls)URL.revokeObjectURL(url);
 }
}
