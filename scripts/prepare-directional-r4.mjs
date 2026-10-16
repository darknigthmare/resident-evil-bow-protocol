/** Reproducible derivative PNGs from twelve explicitly reviewed local references.
 * No remote input, new anatomy, colour replacement, warping or generated animation.
 */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(R,p),'utf8'));const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const review=read('data/directional-reference-review-r4.json'),M=read('data/directional-art.json');const reports=[];
const fighters=new Map([...read('data/roster.json').fighters,...read('data/catalog-expansion-v070.json').fighters].map(f=>[f.uid,f]));
for(const item of review.items){
 const {uid,source}=item;if(!fighters.has(uid)||!/^assets\/[\w/-]+\.png$/.test(source)||source.includes('..'))throw Error('Unknown/unsafe reviewed source: '+uid);
 const bytes=fs.readFileSync(path.join(R,source));if(sha(bytes)!==item.sourceSha256)throw Error('Review no longer matches source: '+uid);
 const img=await loadImage(bytes),w=img.width,h=img.height;if(w*h>4194304)throw Error('Oversized reference');
 const cv=createCanvas(w,h),ctx=cv.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,w,h),p=pixels.data;let removed=0;
 if(item.removeBlack){
  const visited=new Uint8Array(w*h),q=new Uint32Array(w*h);let begin=0,end=0;
  const offer=i=>{if(i<0||i>=w*h||visited[i])return;visited[i]=1;const k=i*4;if(p[k+3]===0||(p[k]===0&&p[k+1]===0&&p[k+2]===0)){if(p[k+3])removed++;p[k+3]=0;q[end++]=i;}};
  for(let x=0;x<w;x++){offer(x);offer((h-1)*w+x);}for(let y=0;y<h;y++){offer(y*w);offer(y*w+w-1);}
  while(begin<end){const i=q[begin++],x=i%w;if(x)offer(i-1);if(x<w-1)offer(i+1);offer(i-w);offer(i+w);}
 }
 let l=w,t=h,r=-1,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(p[(y*w+x)*4+3]>0){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
 if(r<l||b<t)throw Error('Empty processed reference: '+uid);
 const pad=8,width=r-l+1+pad*2,height=b-t+1+pad*2,out=createCanvas(width,height),ox=out.getContext('2d');
 ctx.putImageData(pixels,0,0);ox.drawImage(cv,l,t,r-l+1,b-t+1,pad,pad,r-l+1,b-t+1);
 const output='assets/lateral-native/r4/'+uid+'.png',encoded=out.toBuffer('image/png');fs.mkdirSync(path.dirname(path.join(R,output)),{recursive:true});fs.writeFileSync(path.join(R,output),encoded);
 const ref={path:output,facing:item.facing,projection:'reference',reviewed:true,width,height,anchor:[.5,(height-pad)/height],crop:[0,0,width,height],sha256:sha(encoded)};
 const record=M.records[uid]||{};record.referenceFacing=item.facing;record.referenceMirrorReviewed=true;record.referenceImage=ref;
 record.bilateralReview={uid,approved:true,rationale:review.mirrorBoundary};record.reviewScope=item.notes;record.production={status:item.classification==='near-profile'?'native-reference-profile':'three-quarter-reference',newArtwork:false,animated:false,derivativeOnly:true,sourceClipped:item.sourceClipped,source,sourceSha256:item.sourceSha256};
 if(item.classification==='near-profile'){record.views={[item.facing]:{...ref,projection:'side'}};record.mirrorReviewed=true;}
 M.records[uid]=record;reports.push({uid,source,sourceSha256:item.sourceSha256,output,outputSha256:ref.sha256,width,height,sourceBounds:[l,t,r-l+1,b-t+1],padding:pad,blackTolerance:item.removeBlack?0:null,removedPixels:removed,classification:item.classification,sourceClipped:item.sourceClipped,newArtwork:false});
}
M.revision=4;fs.writeFileSync(path.join(R,'data/directional-art.json'),JSON.stringify(M,null,2)+'\n');
fs.writeFileSync(path.join(R,'docs/DIRECTIONAL_R4_ASSETS.json'),JSON.stringify({revision:4,sourceCommit:review.sourceCommit,processedReferences:reports.length,newDrawings:0,newCharacterAnimations:0,records:reports},null,2)+'\n');
console.log(JSON.stringify({processedReferences:reports.length,newNativeNearProfiles:reports.filter(r=>r.classification==='near-profile').length,newDrawings:0}));
