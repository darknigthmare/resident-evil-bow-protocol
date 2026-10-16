/* Read-only combat presentation. Geometry follows the simulation, never causes a hit.
 * Authored vector cues are NOT replacement character animation or Capcom assets. */
(function(root){'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const colors=Object.freeze({ballistic:'#f2dc9c',precision:'#deedf1',rail:'#9fc9d7',rocket:'#d5ae74',explosive:'#daa06b',fire:'#dc8a40',burn:'#dc8a40',bio:'#b3b085',poison:'#a6b66c',slow:'#b7bfc5',tentacle:'#a78a81',blade:'#c8ccca',knife:'#c8ccca',electric:'#9bc8d1',emp:'#9bc8d1',grapple:'#b39b87',strike:'#c2b5a0',heavy:'#bca48c',recovery:'#a9c7aa'});
function activeWindow(move,t){
 if(!move||!Number.isFinite(t))return -1;
 const age=t-move.startup;if(age<0||age>=move.active)return -1;
 if(!Array.isArray(move.hitWindows))return 0;
 return move.hitWindows.findIndex(w=>age>=w.start&&age<w.end);
}
function describeAttack(actor){
 const a=actor?.attack;if(!a)return null;const m=a.def;
 const total=m.startup+m.active+m.recovery,window=activeWindow(m,a.t);
 return {slot:a.name,name:m.name,kind:m.kind,tag:m.tag,face:a.face===-1?-1:1,tick:a.t,total,
 phase:a.t<m.startup?'startup':a.t<m.startup+m.active?(window>=0?'active':'gap'):'recovery',
 window,super:(m.meter||0)>0,remaining:Math.max(0,m.startup-a.t),progress:clamp(a.t/Math.max(1,total),0,1),
 burst:m.sustainBurst===true,frames:m.startup,reach:m.reach||0};
}
function draw(ctx,s,options={}){
 if(!ctx||!s)return;
 const z=Number.isFinite(options.zoom)?clamp(options.zoom,.1,5):1,X=options.toX||((x)=>x),Y=options.toY||((y)=>y);
 const reduced=!!options.reducedMotion||!!s.options?.reducedMotion55,noFlash=reduced||!!options.noFlash||!!s.options?.noFlash55;
 const col=m=>colors[m.status]||colors[m.tag]||'#beb69e';
 const line=(x,y,u,v,c,w=2,alpha=1)=>{ctx.strokeStyle=c;ctx.lineWidth=w*z;ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(X(x),Y(y));ctx.lineTo(X(u),Y(v));ctx.stroke();};
 const ellipse=(x,y,rx,ry,c,alpha=1)=>{ctx.fillStyle=c;ctx.globalAlpha=alpha;ctx.beginPath();ctx.ellipse(X(x),Y(y),Math.max(.1,rx*z),Math.max(.1,ry*z),0,0,Math.PI*2);ctx.fill();};
 ctx.save();ctx.lineCap='round';
 for(const p of [s.a,s.b]){
  const a=p.attack,d=describeAttack(p);if(!a||!d)continue;const m=a.def,face=d.face;
  const h=root.CQCCombat060?.box(p)?.h||p.f.visual?.height||220;
  if(d.super&&d.phase==='startup'){
   // A quiet local warning: no full-screen flashes, no time stop or free damage.
   const progress=clamp(a.t/Math.max(1,m.startup),0,1);
   ctx.globalAlpha=.82;ctx.fillStyle='#111713';ctx.fillRect(X(p.x)-100*z,Y(p.y-h)-43*z,200*z,24*z);
   ctx.fillStyle='#d5bf88';ctx.fillRect(X(p.x)-100*z,Y(p.y-h)-20*z,200*z*progress,2*z);
   ctx.font=`${Math.max(9,11*z)}px monospace`;ctx.textAlign='center';ctx.fillText('SUPER · PRÉPARATION '+d.remaining+' F',X(p.x),Y(p.y-h)-27*z);
  }
  if(d.phase==='startup'&&m.telegraph){
   const y=p.y-(m.height||140),end=clamp(p.x+face*Math.min(650,m.reach||450),20,1260);
   ctx.setLineDash([5*z,8*z]);line(p.x+face*45,y,end,y,col(m),1,.55);ctx.setLineDash([]);
  }
  if(m.kind==='melee'&&d.phase==='active'){
   const box=root.CQCCombat060?.hitbox(p);if(!box)continue;
   const start=p.x+face*Math.min(24,(p.f.visual?.width||78)*.2),tip=p.x+face*(m.reach||80)*(p.f.reach||1);
   const y=box.y+box.h*.46,bend=reduced?0:Math.sin((a.t-m.startup)*.28)*14;
   ctx.strokeStyle=col(m);ctx.globalAlpha=.78;ctx.lineWidth=(m.tag==='tentacle'?5:2)*z;
   if(m.tag==='tentacle'){
    ctx.beginPath();ctx.moveTo(X(start),Y(p.y-h*.58));ctx.bezierCurveTo(X(start+face*45),Y(y-36+bend),X(tip-face*50),Y(y+27+bend),X(tip),Y(y));ctx.stroke();
    ctx.lineWidth=1*z;ctx.strokeStyle='#d7bca6';ctx.stroke();
   }else if(m.level==='throw'){
    ctx.beginPath();ctx.arc(X(tip-face*20),Y(y),18*z,face>0?-1.2:1.94,face>0?1.2:4.34);ctx.stroke();
   }else{
    const n=['blade','knife'].includes(m.tag)?3:1;
    for(let i=0;i<n;i++){
     ctx.beginPath();ctx.moveTo(X(start),Y(y-23+i*9));ctx.quadraticCurveTo(X((start+tip)/2),Y(y-36+i*10),X(tip),Y(y+19+i*7));ctx.stroke();
    }
   }
  }
 }
 for(const q of s.projectiles||[]){
  if(q.dead||q.delay>0)continue;const m=q.def,c=col(m),angle=Math.atan2(q.vy||0,q.flightVX??q.vx??1);
  ctx.save();ctx.translate(X(q.x),Y(q.y));ctx.rotate(angle);ctx.scale(z,z);ctx.globalAlpha=1;
  const poly=(pts,fill,alpha=1)=>{ctx.globalAlpha=alpha;ctx.fillStyle=fill;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
  if(m.fuse){ctx.fillStyle='#777c64';ctx.fillRect(-7,-8,14,16);ctx.fillStyle='#d7b66d';ctx.fillRect(0,-11,5,4);}
  else if(m.tag==='rocket'){
   poly([[-16,-5],[10,-5],[20,0],[10,5],[-16,5]],'#aaa38a');poly([[-15,-5],[-24,-10],[-21,0],[-24,10],[-15,5]],'#596466');
   const len=reduced?13:18+Math.sin((q.age||0)*.8)*5;poly([[-17,-3],[-17-len,0],[-17,3]],'#d79251',noFlash?.65:.9);
   if(!reduced){ctx.fillStyle='#aaa9a1';for(let i=0;i<4;i++){ctx.globalAlpha=.11*(1-i/5);ctx.beginPath();ctx.ellipse(-29-i*13,Math.sin(i+q.id)*3,6+i*2,3+i,0,0,Math.PI*2);ctx.fill();}}
  }else if(m.tag==='fire'){
   for(let i=3;i>=0;i--){ctx.fillStyle=i%2?'#a14f2d':'#e09c4b';ctx.globalAlpha=.15+i*.1;ctx.beginPath();ctx.ellipse(-i*6,0,10+i*3,4+i*2,0,0,Math.PI*2);ctx.fill();}
  }else if(['bio','organic','swarm','spore'].includes(m.tag)||['poison','slow'].includes(m.status)){
   ctx.fillStyle=c;ctx.globalAlpha=.85;ctx.beginPath();ctx.ellipse(0,0,10,7,0,0,Math.PI*2);ctx.fill();
   for(let i=0;i<3;i++){ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(-12-i*7,Math.sin(q.id+i)*5,2+i*.4,0,Math.PI*2);ctx.fill();}
  }else if(['electric','emp'].includes(m.tag)){
   ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<6;i++){const x=-28+i*8,y=i%2?4:-4;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
  }else if(m.returnAt){ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,-10);ctx.lineTo(7,0);ctx.lineTo(-10,10);ctx.stroke();}
  else{ctx.fillStyle=c;ctx.globalAlpha=.25;ctx.fillRect(-28,-3,30,6);ctx.globalAlpha=.95;ctx.fillRect(-10,-1.5,20,3);}
  ctx.restore();
  if(q.age<=3&&!reduced&&!noFlash&&['ballistic','precision','rocket'].includes(m.tag)){
   const p=[s.a,s.b][q.owner];if(p?.attack?.id===q.burstId)ellipse(p.x+p.attack.face*48,p.y-(m.height||140),11,3,'#e9c588',.55);
  }
 }
 for(const tr of s.traps||[]){
  if(tr.dead)continue;const active=tr.age>=tr.arm,c=active?col(tr.def):'#788581';
  if(['snare','bio','organic'].includes(tr.def.tag)){
   for(let i=0;i<5;i++)line(tr.x-22+i*11,tr.y,tr.x-16+i*8,tr.y-12-(i%2)*8,c,2,.7);
  }else{ctx.globalAlpha=.9;ctx.fillStyle='#34423c';ctx.fillRect(X(tr.x)-14*z,Y(tr.y)-12*z,28*z,12*z);ellipse(tr.x,tr.y-9,2,2,c);}
  ctx.setLineDash([4*z,7*z]);ctx.strokeStyle=c;ctx.globalAlpha=.35;ctx.lineWidth=z;ctx.beginPath();ctx.ellipse(X(tr.x),Y(tr.y),Math.min(180,tr.def.reach||65)*z,9*z,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 }
 for(const f of s.fx||[]){
  if(f.t<=0)continue;const age=(f.max||40)-f.t,c=colors[f.tag]||'#c9bca4';
  if(f.kind==='text'){ctx.globalAlpha=clamp(f.t/15,0,1);ctx.fillStyle=c;ctx.font=`${Math.max(9,12*z)}px monospace`;ctx.textAlign='center';ctx.fillText(f.text||'',X(f.x),Y(f.y)-(reduced?0:age*.25));continue;}
  const blast=f.kind==='blast',r=blast?14+age*1.6:5+age*.25;
  // Bounded impact marks. Radius is a cue, not a second damage area.
  if(blast){ellipse(f.x,f.y,r,r*.6,'#6d5a48',clamp(f.t/40,0,.45));if(!noFlash)ellipse(f.x,f.y,r*.6,r*.4,c,clamp(f.t/52,0,.35));}
  else if(f.kind==='guard'){ctx.strokeStyle='#a9b8b7';ctx.lineWidth=2*z;ctx.globalAlpha=clamp(f.t/30,0,.7);ctx.beginPath();ctx.arc(X(f.x),Y(f.y),r*z,-1.3,1.3);ctx.stroke();}
  else{for(let i=0;i<(reduced?2:5);i++){const a=i*1.2566;line(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,f.x+Math.cos(a)*(r+9),f.y+Math.sin(a)*(r+9),c,1,clamp(f.t/35,0,.7));}}
 }
 ctx.restore();
}
root.RE_COMBAT_CUES=Object.freeze({describeAttack,activeWindow,draw,colors});
})(globalThis);
