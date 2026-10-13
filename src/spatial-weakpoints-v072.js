/* Collision-space target zones, not extracted Capcom hitboxes or artwork.
 * Profiles are opt-in by exact incarnation. All coordinates/thresholds are
 * authored 2D approximations. No limb destruction or new canon power is implied. */
(function(root){'use strict';
 const VERSION='spatial-zones/2';
 const profiles={
  're5-uroboros':{label:'Noyaux des appendices',source:'https://www.evilresource.com/resident-evil-5/enemies/uroboros',zones:[
   {id:'arm-front',label:'Noyau antérieur',x:.72,y:.30,w:.28,h:.24,side:'front'},
   {id:'arm-back',label:'Noyau postérieur',x:0,y:.30,w:.28,h:.24,side:'rear'}]},
  're5-uroboros-mkono':{label:'Noyaux filamenteux',source:'https://www.evilresource.com/resident-evil-5/enemies/uroboros-mkono',zones:[
   {id:'core-front',label:'Noyau antérieur',x:.72,y:.12,w:.28,h:.23,side:'front'},
   {id:'core-top',label:'Noyau supérieur',x:.36,y:0,w:.28,h:.18,side:'either'},
   {id:'core-back',label:'Noyau postérieur',x:0,y:.12,w:.28,h:.23,side:'rear'}]},
  're5-reaper':{label:'Sac abdominal',source:'https://residentevil.fandom.com/wiki/Reaper/gameplay',zones:[
   {id:'abdomen',label:'Sac abdominal exposé',x:.66,y:.40,w:.34,h:.27,side:'front'}]},
  're5-popokarimu':{label:'Face interne de la queue',source:'https://www.evilresource.com/resident-evil-5/enemies/popokarimu',zones:[
   {id:'tail-under',label:'Queue vulnérable',x:0,y:.42,w:.35,h:.29,side:'rear'}]},
  're5-u-8':{label:'Ouverture de la gueule',source:'https://www.evilresource.com/resident-evil-5/enemies/u-8',zones:[
   {id:'mouth',label:'Gueule ouverte',x:.68,y:.28,w:.32,h:.27,side:'front'}]}
 };
 const finite=Number.isFinite;
 function validBox(b){return b&&[b.x,b.y,b.w,b.h].every(finite)&&b.w>0&&b.h>0;}
 function overlap(a,b){return validBox(a)&&validBox(b)&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
 // Slab intersection against the actual segment, not its bounding rectangle.
 // x/y are the projectile centre at first contact; padding represents its radius.
 function sweep(x0,y0,x1,y1,box,padX=0,padY=0){
  if(![x0,y0,x1,y1,padX,padY].every(finite)||padX<0||padY<0||!validBox(box))return null;
  let enter=0,exit=1;const delta=[x1-x0,y1-y0],origin=[x0,y0];
  const lo=[box.x-padX,box.y-padY],hi=[box.x+box.w+padX,box.y+box.h+padY];
  for(let k=0;k<2;k++){
   if(Math.abs(delta[k])<1e-10){if(origin[k]<lo[k]||origin[k]>hi[k])return null;continue;}
   let a=(lo[k]-origin[k])/delta[k],b=(hi[k]-origin[k])/delta[k];if(a>b)[a,b]=[b,a];
   enter=Math.max(enter,a);exit=Math.min(exit,b);if(enter>exit)return null;
  }
  return {t:enter,x:x0+(x1-x0)*enter,y:y0+(y1-y0)*enter};
 }
 function profile(p){return profiles[p?.f?.uid]||null;}
 function zones(p,body,{includeClosed=false}={}){
  const f=profile(p);if(!f||!validBox(body))return [];
  const open=p.statuses?.exposed?.t>0;
  if(!open&&!includeClosed)return [];
  return f.zones.map(z=>({...z,open,x:body.x+(p.face<0?1-z.x-z.w:z.x)*body.w,y:body.y+z.y*body.h,w:z.w*body.w,h:z.h*body.h}));
 }
 function resolve(p,body,move,contact,blocked=false){
  if(!profile(p))return null;
  const result={id:null,critical:false,reason:'closed'};
  if(blocked||move.level==='throw'){result.reason=blocked?'guarded':'throw';return result;}
  if(!(p.statuses?.exposed?.t>0))return result;
  if(!contact||!['melee','projectile'].includes(contact.kind)||!finite(contact.fromX)){result.reason='unlocalized';return result;}
  result.reason='body';const front=(contact.fromX-p.x)*p.face>=0;
  const entry=contact.kind==='projectile'?sweep(contact.x0,contact.y0,contact.x1,contact.y1,body,contact.padX??8,contact.padY??7):null;
  if(contact.kind==='projectile'&&!entry)return result;
  for(const z of zones(p,body)){
   if(z.side!=='either'&&(z.side==='front')!==front)continue;
   const hit=contact.kind==='melee'?overlap(contact.box,z):
    sweep(contact.x0,contact.y0,contact.x1,contact.y1,z,contact.padX??8,contact.padY??7);
   // A non-piercing shot stops at its first body contact: deeper zones cannot
   // grant a critical through an intervening part of the body.
   if(hit&&entry&&hit.t>entry.t+1e-8){result.reason='occluded';continue;}
   if(hit)return {id:z.id,label:z.label,critical:true,reason:'zone',point:contact.kind==='projectile'?hit:null};
  }
  return result;
 }
 // Called in world-space after the artwork transform has been restored. The
 // overlay follows collision geometry and is intentionally not painted on art.
 function draw(ctx,p,body,x=p.x,y=p.y,scale=1,{closed=false}={}){
  const list=zones(p,body,{includeClosed:closed});if(!list.length)return;
  ctx.save();ctx.translate(x-p.x*scale,y-p.y*scale);ctx.scale(scale,scale);
  ctx.lineWidth=2;ctx.font='10px monospace';ctx.textAlign='center';
  for(const z of list){
   ctx.strokeStyle=z.open?'#f0cc79':'#8c9ea4';ctx.fillStyle=z.open?'#eac1642c':'#66828c16';
   ctx.fillRect(z.x,z.y,z.w,z.h);ctx.strokeRect(z.x,z.y,z.w,z.h);
   ctx.fillStyle=z.open?'#ffe1a0':'#bbcbcf';ctx.fillText(z.open?'CIBLE OUVERTE':'FERMÉE',z.x+z.w/2,z.y-5);
  }
  ctx.restore();
 }
 for(const p of Object.values(profiles)){for(const z of p.zones)Object.freeze(z);Object.freeze(p.zones);Object.freeze(p);}
 root.RE_SPATIAL=Object.freeze({version:VERSION,profiles:Object.freeze(profiles),sweep,overlap,zones,resolve,draw,profile});
})(globalThis);
