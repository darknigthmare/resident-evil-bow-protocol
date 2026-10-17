/* Presentation-only directional art. Never changes a combat actor or hitbox.
 * A portrait's pixels cannot be made lateral by rotation, stretching or relabelling.
 * Paired physical sides are required unless this exact drawing was reviewed for reflection.
 */
(function(root){
 'use strict';
 const STATES=Object.freeze(['idle','walk','retreat','dash','jump','crouch','guard','hit','knockdown','win','lose']);
 const PRESENTATION=Object.freeze(['intro','roundWin','roundLose','roundDraw','matchWin','matchLose','outro']);
 const SLOTS=Object.freeze(['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']);
 function side(v){return v===-1||v==='left'||v==='gauche'?-1:v===1||v==='right'||v==='droite'?1:0;}
 function facing(actor,requested=1,x,opponentX){
  const committed=side(actor?.attack?.face);if(committed)return committed;
  const authoritative=side(actor?.face);if(authoritative)return authoritative;
  return Number.isFinite(x)&&Number.isFinite(opponentX)&&Math.abs(opponentX-x)>.001?(opponentX>x?1:-1):(side(requested)||1);
 }
 function safeAsset(p){return typeof p==='string'&&/^assets\/[\w./-]+\.(?:png|webp)$/i.test(p)&&!p.split('/').some(x=>x==='..'||x==='.')&&!p.includes('//');}
 function validAnchor(a){return Array.isArray(a)&&a.length===2&&a.every(v=>Number.isFinite(v)&&v>=0&&v<=1);}
 function validCrop(c,w,h){return Array.isArray(c)&&c.length===4&&c.every(Number.isFinite)&&c[0]>=0&&c[1]>=0&&c[2]>=2&&c[3]>=2&&(!w||c[0]+c[2]<=w)&&(!h||c[1]+c[3]<=h);}
 function validView(v,dir){return !!v&&v.facing===dir&&v.projection==='side'&&v.reviewed===true&&safeAsset(v.path)&&validAnchor(v.anchor||[.5,1])&&(!v.crop||validCrop(v.crop,v.width,v.height));}
 function validReference(v){return !!v&&['left','right'].includes(v.facing)&&v.projection==='reference'&&v.reviewed===true&&safeAsset(v.path)&&Number.isInteger(v.width)&&v.width>1&&Number.isInteger(v.height)&&v.height>1&&validAnchor(v.anchor)&&(!v.crop||validCrop(v.crop,v.width,v.height));}
 function protectedAsymmetry(f){return /BIRKIN|BANDERSNATCH|N[EÉ]M[EÉ]SIS|T[-\s]?002/i.test(f?.name||'');}
 function asymmetric(f){return f?.visual?.asymmetric===true||protectedAsymmetry(f);}
 function mayMirror(f,record){return !protectedAsymmetry(f)&&(!asymmetric(f)||(record?.bilateralReview?.approved===true&&record.bilateralReview.uid===(f.uid||f.id)&&typeof record.bilateralReview.rationale==='string'&&record.bilateralReview.rationale.length>=30));}
 function poseState(pose={}){
  const p=pose.actor;
  // Explicit end-of-round presentation takes precedence over the actor's KO flag.
  if(['win','lose',...PRESENTATION].includes(pose.animationState))return pose.animationState;
  if(pose.knockdown||p?.state==='ko'||(Number.isFinite(p?.life)&&p.life<=0))return 'knockdown';
  if(pose.hit||p?.hit>0)return 'hit';
  if(p?.attack&&SLOTS.includes(p.attack.name))return p.attack.name;
  if(pose.animationState&&[...STATES,...SLOTS].includes(pose.animationState))return pose.animationState;
  if(pose.guard||p?.block||p?.blockstun>0)return 'guard';
  if(pose.jump||p?.onGround===false)return 'jump';
  if(pose.crouch||p?.crouch)return 'crouch';
  if(pose.dash||p?.state==='dash')return 'dash';
  const velocity=Number.isFinite(pose.velocity)?pose.velocity:p?.vx;
  if(pose.walk||p?.state==='walk')return Number.isFinite(velocity)&&velocity*facing(p,1)<0?'retreat':'walk';
  return 'idle';
 }
 // Presentation clock only. Combat actors, resources and replay inputs are never written.
 // A non-looping reaction must start at its own transition, not at the age of the match.
 function createClock(){
  let actors=new WeakMap();
  return Object.freeze({reset(){actors=new WeakMap();},tick(pose={},state=poseState(pose)){
   if(pose.actor?.attack&&state===pose.actor.attack.name)return Math.max(0,pose.actor.attack.t||0);
   if(Number.isFinite(pose.animationTick))return Math.max(0,Math.floor(pose.animationTick));
   const now=Math.max(0,Math.floor((Number.isFinite(pose.time)?pose.time:0)*60+1e-6));
   const key=pose.animationKey||pose.actor;
   if(!key||(typeof key!=='object'&&typeof key!=='function'))return 0;
   const token=pose.presentationToken??(state==='hit'?pose.actor?.lastHit:null);let old=actors.get(key);
   if(!old||old.state!==state||old.token!==token||now<old.last){old={state,token,start:now,last:now};actors.set(key,old);}
   old.last=now;
   return Math.max(0,now-old.start);
  }});
 }
 function validClip(c,dir){return !!c&&validView(c,dir)&&typeof c.loop==='boolean'&&Array.isArray(c.frames)&&c.frames.length>0&&c.frames.length<=240&&c.frames.every(f=>f&&Number.isInteger(f.ticks)&&f.ticks>=1&&f.ticks<=600&&validCrop(f.crop,c.width,c.height)&&(!f.anchor||validAnchor(f.anchor)));}
 function frameOf(c,tick=0){
  const duration=c.frames.reduce((n,f)=>n+f.ticks,0);let t=Math.max(0,Math.floor(Number.isFinite(tick)?tick:0));t=c.loop?t%duration:Math.min(t,duration-1);
  let index=0;while(index<c.frames.length-1&&t>=c.frames[index].ticks)t-=c.frames[index++].ticks;
  return {index,frame:c.frames[index]};
 }
 function frameTick(pose,state){
  if(pose.actor?.attack&&state===pose.actor.attack.name)return Math.max(0,pose.actor.attack.t||0);
  if(Number.isFinite(pose.animationTick))return pose.animationTick;
  return Math.max(0,Math.floor((Number.isFinite(pose.time)?pose.time:0)*60));
 }
 function resolve(f,requested=1,pose={},x,options={}){
  const face=facing(pose.actor,requested,x,pose.opponentX),direction=face===1?'right':'left',opposite=face===1?'left':'right';
  const record=(root.RE_DIRECTIONAL_ART||{}).records?.[f?.uid||f?.id],state=poseState(pose);
  const reference=!options.skipReference&&validReference(record?.referenceImage)?record.referenceImage:null;
  const result={face,direction,state,animationFrame:null,animated:false,borderKey:reference?undefined:record?.referenceBorderKey,referenceOverride:!!reference,path:reference?.path||f?.sprite||f?.visual?.sprite||f?.portrait||'',mirror:1,anchor:reference?.anchor||[.5,1],crop:reference?.crop||f?.spriteCrop||f?.visual?.spriteCrop||null,status:'reference-only',sideProfile:false,oppositeAnatomyValidated:false,reason:'Référence provisoire : le corps latéral de cette incarnation reste à produire.'};
  const canMirror=mayMirror(f,record)&&record?.mirrorReviewed===true;
  // An explicit clip is never synthesized from the idle illustration.
  const clipState=record?.clips?.[state]?state:state==='matchWin'?'win':state==='matchLose'?'lose':state;
  const exactClip=record?.clips?.[clipState]?.[direction],mirrorClip=record?.clips?.[clipState]?.[opposite];
  const clip=options.skipClips?null:validClip(exactClip,direction)?exactClip:canMirror&&validClip(mirrorClip,opposite)?mirrorClip:null;
  if(clip){const selected=frameOf(clip,frameTick(pose,state));return {...result,path:clip.path,borderKey:clip.borderKey,crop:selected.frame.crop,anchor:selected.frame.anchor||clip.anchor||[.5,1],mirror:clip===exactClip?1:-1,animationFrame:selected.index,animated:true,sideProfile:true,status:'side-animation',oppositeAnatomyValidated:validClip(exactClip,direction)&&validClip(mirrorClip,opposite),reason:'Séquence latérale dessinée pour cet état ; aucune image de mouvement inventée.'};}
  const exact=record?.views?.[direction];
  if(!options.skipViews&&validView(exact,direction))return {...result,path:exact.path,borderKey:exact.borderKey,crop:exact.crop||((exact.width&&exact.height)?[0,0,exact.width,exact.height]:null),anchor:exact.anchor||[.5,1],status:'side-view',sideProfile:true,oppositeAnatomyValidated:validView(record?.views?.left,'left')&&validView(record?.views?.right,'right'),reason:'Pose latérale dédiée. Les mouvements utilisent cette pose tant que leurs frames ne sont pas dessinées.'};
  const other=record?.views?.[opposite];
  if(!options.skipViews&&canMirror&&validView(other,opposite))return {...result,path:other.path,borderKey:other.borderKey,crop:other.crop||((other.width&&other.height)?[0,0,other.width,other.height]:null),anchor:other.anchor||[.5,1],mirror:-1,status:'side-view-mirrored',sideProfile:true,reason:'Réflexion explicitement validée pour ce dessin bilatéral ; pas une seconde anatomie reconstituée.'};
  const native=side(reference?.facing||record?.referenceFacing||f?.visual?.sourceFacing);
  if(native){if(native===face){result.status='directional-reference';result.reason='Référence dirigée vers la cible ; profil latéral complet non validé.';}else if(mayMirror(f,record)&&record?.referenceMirrorReviewed===true){result.mirror=-1;result.status='directional-reference';result.reason='Orientation de référence revue ; ce n’est pas un nouveau profil anatomique.';}else{result.status='opposite-view-missing';result.reason='Vue opposée manquante : aucune réflexion anatomique non validée.';}}
  return result;
 }
 function paths(f){const r=(root.RE_DIRECTIONAL_ART||{}).records?.[f?.uid||f?.id],out=new Set();for(const [dir,v]of Object.entries(r?.views||{}))if(validView(v,dir))out.add(v.path);for(const views of Object.values(r?.clips||{}))for(const [dir,v]of Object.entries(views))if(validClip(v,dir))out.add(v.path);return [...out];}
 function audit(f){const l=resolve(f,-1),r=resolve(f,1),record=(root.RE_DIRECTIONAL_ART||{}).records?.[f.uid||f.id];return {uid:f.uid||f.id,name:f.name,asymmetric:!mayMirror(f,record),sourceAsymmetryFlag:f.visual?.asymmetric===true,left:l.status,right:r.status,ready:l.sideProfile&&r.sideProfile,assetLeft:l.path,assetRight:r.path,referenceFacing:record?.referenceFacing||f.visual?.sourceFacing||'unknown',motionClips:Object.keys(record?.clips||{}).length,artStatus:record?.production?.status||'awaiting-side-art'};}
 root.RE_FIGHTER_DIRECTIONS=Object.freeze({resolve,facing,side,audit,validView,validClip,validReference,validCrop,safeAsset,paths,poseState,frameOf,createClock,states:STATES,presentationStates:PRESENTATION,slots:SLOTS,mayMirror,version:'1.4.0'});
})(globalThis);
