/* CQC 0.60 — deterministic framing of the existing 1280 × 720 combat world.
 * No DOM, RAF, input, physics, hit-stop, random source or wall clock is owned here.
 * update() is a pure transition. Call once after each actual simulation tick;
 * repeated frames and pause return the same snapshot. The ground stays y = 568.
 */
(function (root) {
  'use strict';
  const WIDTH = 1280, HEIGHT = 720, FLOOR = 568, ACTOR_SCALE = 1.12;
  const SAFE = Object.freeze({left: 40, top: 130, right: 1240, bottom: 660});
  const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const freeze = Object.freeze;
  function copyRect(b) { return {left:b.left, top:b.top, right:b.right, bottom:b.bottom}; }
  function union(a, b) { return {left:Math.min(a.left,b.left), top:Math.min(a.top,b.top), right:Math.max(a.right,b.right), bottom:Math.max(a.bottom,b.bottom)}; }
  function validActor(p) { return p && p.f && Number.isFinite(p.x) && Number.isFinite(p.y); }
  function weaponFor(p) {
    const f=p.f||{}, v=f.visual||{}, m=p.attack&&p.attack.def;
    if (!m) return v.weapon||'fists';
    if (f.combat?.key==='small_drone'||v.species==='monkey') return 'fists';
    if (['strike','grapple','movement','counter','recovery','reload'].includes(m.tag)) return 'fists';
    if(m.tag==='ballistic'&&['pistol','revolver','rifle','shotgun','smg','minigun'].includes(v.weapon))return v.weapon;
    return ({ballistic:'rifle',precision:'sniper',tranq:'pistol',knife:'knife',blade:'blade',tentacle:'tentacle',rail:'sniper',rocket:'cannon',explosive:'grenade',boomerang:'boomerang',psychic:'psychic',voice:'psychic',swarm:'psychic',fire:'fire',electric:'stunrod',hoof:'fists',grapple:'fists'})[m.tag]||v.weapon||'fists';
  }
  function localBounds(p) {
    // Conservative silhouette envelopes, measured against the shipped renderer.
    // They include equipment, cloth and the supported pose extremes, not only
    // Combat.box(): a collision rectangle is deliberately smaller than the art.
    const f=p?.f||{},v=f.visual||{},kind=v.kind||'human',weapon=weaponFor(p||{}),m=p?.attack?.def;
    const guard=!!p?.block||m?.kind==='parry',attack=!!p?.attack,down=p?.life<=0;
    let left=-124,right=230,top=-278,bottom=24;
    if(v.species==='bird'){left=-92;right=92;top=-126;bottom=12;}
    else if(v.species==='monkey'){left=-111;right=137;top=-168;bottom=12;}
    else if(kind==='quadruped'){
      const horse=v.species==='horse'||f.id==='dhorse';
      left=-178;right=horse?175:weapon==='blade'?306:weapon==='sniper'?208:205;top=horse?-281:-196;bottom=13;
    }else if(kind==='machine'){
      const name=String(f.name||f.id||'').toUpperCase();
      if(/MK\. II|MK\. III/.test(name)||f.combat?.key==='small_drone'){left=-91;right=122;top=-140;bottom=12;}
      else if(/DWARF/.test(name)){left=-126;right=128;top=-123;bottom=12;}
      else if(v.variant==='support-core'||v.variant==='virgil'){left=-110;right=110;top=-187;bottom=13;}
      else {left=-144;right=235;top=-265;bottom=14;}
    }else{
      const height=v.body==='child'?.68:v.body==='small'?.82:v.body==='tall'?1.07:1;
      const width=v.body==='heavy'?1.1:v.body==='broad'?1.06:1;
      const long=/blade|machete|spear|stunrod|sniper|rifle|shotgun|heavy|minigun|fire|cannon/.test(weapon);
      if(guard&&long){top=weapon==='spear'?-430:-388;right=230;}
      else if(guard&&!['fists','cqc','none',''].includes(weapon)){top=-350;}
      else if(attack&&/blade|machete|knife|spear|stunrod/.test(weapon)&&m?.kind!=='mobility'){
        top=weapon==='spear'?-451:weapon==='knife'?-356:-402;right=weapon==='spear'?340:300;
      }else if(attack){right=/sniper|minigun/.test(weapon)?301:long?279:244;}
      if(weapon==='spear'&&!attack&&!guard)right=252;
      if(weapon==='minigun')right=Math.max(right,264);
      if(v.back==='wings'||v.back==='tentacles')left=-186;
      left*=height*width;right*=height*width;top*=height;bottom*=height;
    }
    if(down){left=Math.min(left,-310);right=Math.max(right,286);top=Math.min(top,-322);bottom=14;}
    // Nonhuman recoil shears the upper silhouette horizontally about the feet.
    if(kind!=='human'&&!down){const shear=p?.hit>0?.12:p?.state==='dash'?-.16:0;left+=Math.min(0,shear*top);right+=Math.max(0,shear*top);}
    return freeze({left,top,right,bottom});
  }
  function actorBounds(p, options) {
    if(!validActor(p))return null;
    options=options||{};
    const scale=clamp(finite(options.actorScale,ACTOR_SCALE),.1,10),b=localBounds(p),face=p.face<0?-1:1;
    const left=face<0?-b.right:b.left,right=face<0?-b.left:b.right;
    return freeze({left:p.x+left*scale,top:p.y+b.top*scale,right:p.x+right*scale,bottom:p.y+b.bottom*scale});
  }
  function collect(state, options) {
    const players=[state.a,state.b],bounds=players.map(p=>actorBounds(p,options));
    let actual=union(bounds[0],bounds[1]),predicted=copyRect(actual);
    const predict=clamp(finite(options.lookAheadTicks,8),0,18),low=(state.options?.mutators49||[]).includes('low_gravity'),gravity=low?.38:.72;
    for(let i=0;i<2;i++){
      const p=players[i],b=bounds[i],dx=clamp(finite(p.vx,0)*predict,-100,100);
      const dy=p.onGround===false?Math.min(0,finite(p.vy,0)*predict+gravity*predict*predict*.5):0;
      predicted=union(predicted,{left:b.left+Math.min(0,dx),top:b.top+dy,right:b.right+Math.max(0,dx),bottom:b.bottom});
    }
    let projectiles=0;
    const minX=Math.min(state.a.x,state.b.x)-180,maxX=Math.max(state.a.x,state.b.x)+180;
    // Outgoing shots far beyond both fighters do not drag the duel off-screen.
    for(const q of (Array.isArray(state.projectiles)?state.projectiles:[])){
      if(!q||q.dead||q.delay>0||!Number.isFinite(q.x)||!Number.isFinite(q.y)||q.x<minX||q.x>maxX||q.y>FLOOR+24||q.y<actual.top-96)continue;
      const b={left:q.x-42,top:q.y-24,right:q.x+42,bottom:q.y+24};actual=union(actual,b);predicted=union(predicted,b);projectiles++;
    }
    return {actual,predicted,actors:bounds,projectiles};
  }
  function fitZoom(bounds,safe,maxZoom){
    const horizontal=(safe.right-safe.left)/Math.max(1,bounds.right-bounds.left);
    const upper=(FLOOR-safe.top)/Math.max(1,FLOOR-bounds.top);
    const lower=bounds.bottom>FLOOR?(safe.bottom-FLOOR)/(bounds.bottom-FLOOR):Infinity;
    return Math.max(1e-6,Math.min(maxZoom,horizontal,upper,lower));
  }
  function fitCenter(center,zoom,bounds,safe){
    const low=bounds.right-(safe.right-WIDTH/2)/zoom;
    const high=bounds.left+(WIDTH/2-safe.left)/zoom;
    return low>high?(low+high)/2:clamp(center,low,high);
  }
  function settings(state,options){
    const supplied=options?.safe||{};
    const safe={left:clamp(finite(supplied.left,SAFE.left),0,WIDTH*.3),right:clamp(finite(supplied.right,SAFE.right),WIDTH*.7,WIDTH),
      top:clamp(finite(supplied.top,SAFE.top),0,FLOOR-100),bottom:clamp(finite(supplied.bottom,SAFE.bottom),FLOOR+30,HEIGHT)};
    return {safe,maxZoom:clamp(finite(options?.maxZoom,1.5),.4,2),reducedMotion:options?.reducedMotion===true||!!state.options?.reducedMotion55};
  }
  function update(previous,state,options){
    options=options||{};
    if(!state||!validActor(state.a)||!validActor(state.b))return previous||null;
    const frame=Math.max(0,Math.floor(finite(state.frame,0))),session=String(options.session??''),config=settings(state,options);
    if(previous&&!options.reset&&previous.session===session){
      if(options.paused===true||frame===previous.frame)return previous;
    }
    const reset=!previous||options.reset||previous.session!==session||frame<previous.frame;
    const boxes=collect(state,options),mid=(state.a.x+state.b.x)/2;
    const maxFit=fitZoom(boxes.actual,config.safe,config.maxZoom);
    let goalZoom=fitZoom(boxes.predicted,config.safe,config.maxZoom),goalCenter=fitCenter(mid,goalZoom,boxes.predicted,config.safe);
    if(config.reducedMotion){
      // A fixed wide view removes habitual tracking and breathing/zoom motion.
      // For a custom oversized actor, the safety constraint may widen once.
      goalZoom=Math.min(.78,goalZoom,reset ? .78 : previous.zoom);goalCenter=640;
    }
    const elapsed=reset?0:Math.max(1,frame-previous.frame),toward=(a,b,tau)=>a+(b-a)*(1-Math.exp(-elapsed/tau));
    let zoom=reset||config.reducedMotion?goalZoom:toward(previous.zoom,goalZoom,goalZoom<previous.zoom?5:22);
    zoom=Math.min(zoom,maxFit); // Never sacrifice a visible fighter for smoothing.
    let center=reset||config.reducedMotion?goalCenter:toward(previous.centerX,goalCenter,12);
    center=fitCenter(center,zoom,boxes.actual,config.safe);
    const result={version:'0.60',frame,session,round:Math.max(1,Math.floor(finite(state.round,1))),zoom,centerX:center,ground:FLOOR,
      actorScale:clamp(finite(options.actorScale,ACTOR_SCALE),.1,10),stagePan:clamp(center-640,-220,220),
      targetZoom:goalZoom,targetCenterX:goalCenter,reducedMotion:config.reducedMotion,safe:freeze(config.safe),
      bounds:freeze(boxes.actual),predictedBounds:freeze(boxes.predicted),actors:freeze(boxes.actors),projectiles:boxes.projectiles};
    return freeze(result);
  }
  function getTransform(snapshot){
    const s=snapshot||{zoom:1,centerX:640,ground:FLOOR,actorScale:ACTOR_SCALE,stagePan:0};
    const zoom=s.zoom,tx=640-s.centerX*zoom,ty=FLOOR-FLOOR*zoom;
    const toX=x=>x*zoom+tx,toY=y=>y*zoom+ty;
    const transform={zoom,tx,ty,cam:s.centerX-640,stagePan:s.stagePan,actorScale:s.actorScale,
      toX,toY,worldToScreen:(x,y)=>({x:toX(x),y:toY(y)}),screenToWorld:(x,y)=>({x:(x-tx)/zoom,y:(y-ty)/zoom}),
      rect:b=>({x:toX(b.x),y:toY(b.y),w:b.w*zoom,h:b.h*zoom}),
      apply:c=>{c.transform(zoom,0,0,zoom,tx,ty);},
      withWorld:(c,draw)=>{c.save();try{c.transform(zoom,0,0,zoom,tx,ty);return draw(c);}finally{c.restore();}}};
    return freeze(transform);
  }
  const api=freeze({version:'0.60',WIDTH,HEIGHT,FLOOR,ACTOR_SCALE,SAFE,localBounds,actorBounds,
    create:(state,options)=>update(null,state,options),update,getTransform});
  root.CQC_CAMERA_060=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
