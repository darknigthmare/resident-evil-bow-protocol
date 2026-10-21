#!/usr/bin/env python3
"""Idempotent, explicit edits to the existing engine; special-device behavior is opt-in."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def change(name,old,new):
 p=R/name;s=p.read_text()
 if new in s:return
 assert s.count(old)==1,(name,old[:100],s.count(old));p.write_text(s.replace(old,new))
core='src/combat-foundation-v060.js'
helper='''// R11 devices occupy the existing trap list and use its destruction/reset paths.
// Only commands carrying lucasDevice opt in; legacy traps retain their behavior.
function fireDeviceR11(s,tr,cause){
 if(tr.dead||tr.deviceFired)return false;
 tr.deviceFired=true;tr.dead=true;
 const a=actors(s)[tr.owner];
 explode(s,{...tr,dead:false,exploded:false,def:{...tr.def,radius:tr.def.blastRadius||140}});
 event(s,'deviceDetonated',a,{id:tr.id,mode:tr.def.lucasDevice,cause});return true;
}
function placeDevicesR11(s,p,d){
 const count=clamp(Math.trunc(d.deviceCount)||1,1,3),facing=p.attack?.face||p.face;
 for(let n=0;n<count;n++){
  const owned=s.traps.filter(t=>t.owner===p.slot&&!t.dead);
  while(owned.length>=3){const expired=owned.shift();expired.dead=true;event(s,'deviceRetired',p,{id:expired.id,cause:'capacity'});}
  const x=clamp(p.x+facing*((d.reach||120)+n*(d.spacing||0)),LEFT,RIGHT);
  s.traps.push({id:s.nextId++,owner:p.slot,x,y:FLOOR,age:0,life:d.duration||480,arm:d.arm||30,hp:d.hp||160,def:d,dead:false,deviceFired:false,deviceFuse:d.lucasDevice==='timed'?(d.fuse||125)+n*(d.fuseInterval||0):null,lastTargetX:other(s,p).x});
  event(s,'trapPlaced',p,{slot:d.slot,mode:d.lucasDevice,x});
 }
}
function stepDeviceR11(s,tr,a,d){
 if(a.life<=0){tr.dead=true;event(s,'deviceRetired',a,{id:tr.id,cause:'owner-ko'});return;}
 const previous=tr.lastTargetX;tr.lastTargetX=d.x;
 if(tr.age===tr.arm)event(s,'deviceArmed',a,{id:tr.id,mode:tr.def.lucasDevice});
 if(tr.age<tr.arm)return;
 if(tr.def.lucasDevice==='timed'){if(tr.age>=tr.deviceFuse)fireDeviceR11(s,tr,'timer');return;}
 if(tr.def.lucasDevice==='remote')return;
 const range=tr.def.triggerRadius||50,body=box(d);
 const near=tr.def.lucasDevice==='wire'?Math.min(previous,d.x)-body.w/2<tr.x+range&&Math.max(previous,d.x)+body.w/2>tr.x-range:Math.abs(tr.x-d.x)<range+body.w/2;
 if(near&&d.y>FLOOR-95)fireDeviceR11(s,tr,'proximity');
}
'''
change(core,'function activate(s,p,a){',helper+'function activate(s,p,a){')
change(core," if(d.kind==='trap'){\n", " if(d.kind==='trap'&&d.lucasDevice)placeDevicesR11(s,p,d);\n if(d.kind==='trap'&&!d.lucasDevice){\n")
change(core," if(d.kind==='detonate'){for(const tr of s.traps)if(tr.owner===p.slot&&!tr.dead&&tr.age>=tr.arm){explode(s,{...tr,def:{...tr.def,radius:tr.def.reach||90}});tr.dead=true;}event(s,'detonator',p);}"," if(d.kind==='detonate'){let count=0;for(const tr of s.traps)if(tr.owner===p.slot&&!tr.dead&&tr.age>=tr.arm){if(d.lucasDevice==='remote-trigger'){if(tr.def.lucasDevice==='remote'){fireDeviceR11(s,tr,'remote');count++;}}else{explode(s,{...tr,def:{...tr.def,radius:tr.def.reach||90}});tr.dead=true;count++;}}if(d.lucasDevice&&count===0){p.feedback='AUCUNE CHARGE TÉLÉCOMMANDÉE ARMÉE';p.feedbackT=80;}event(s,'detonator',p,{count});}")
change(core," if(tr.life<=0){tr.dead=true;continue;}if(tr.age<tr.arm)continue;", " if(tr.life<=0){tr.dead=true;continue;}if(tr.def.lucasDevice){stepDeviceR11(s,tr,a,d);continue;}if(tr.age<tr.arm)continue;")
change(core,"else if(m.kind==='detonate')weight=s.traps.some(t=>t.owner===p.slot&&!t.dead&&t.age>=t.arm&&Math.abs(t.x-o.x)<(t.def.reach||90)+target.w/2&&o.y>FLOOR-95)?4:0;", "else if(m.kind==='detonate')weight=s.traps.some(t=>t.owner===p.slot&&!t.dead&&t.age>=t.arm&&(!m.lucasDevice||t.def.lucasDevice==='remote')&&Math.abs(t.x-o.x)<(t.def.blastRadius||t.def.reach||90)+target.w/2&&o.y>FLOOR-95)?4:0;")
change('src/combat-cues-r6.js',"  if(['snare','bio','organic'].includes(tr.def.tag)){", "  if(tr.def.lucasDevice){\n   const label=tr.def.lucasDevice==='remote'?'RADIO':tr.def.lucasDevice==='wire'?'FIL':tr.def.lucasDevice==='timed'?'RETARD':'CAISSE';\n   ctx.globalAlpha=.9;ctx.fillStyle='#34423c';ctx.fillRect(X(tr.x)-14*z,Y(tr.y)-20*z,28*z,20*z);ctx.strokeStyle=c;ctx.strokeRect(X(tr.x)-14*z,Y(tr.y)-20*z,28*z,20*z);\n   if(tr.def.lucasDevice==='wire')line(tr.x-(tr.def.triggerRadius||50),tr.y-16,tr.x+(tr.def.triggerRadius||50),tr.y-16,c,2,.8);\n   ctx.font=`${Math.max(9,10*z)}px monospace`;ctx.textAlign='center';ctx.fillStyle=c;ctx.fillText('P'+(tr.owner+1)+' '+label+' '+(active?(tr.deviceFuse?Math.max(0,tr.deviceFuse-tr.age)+'F':'ARMÉ'):Math.max(0,tr.arm-tr.age)+'F'),X(tr.x),Y(tr.y)-30*z);\n  }else if(['snare','bio','organic'].includes(tr.def.tag)){")
for name in ['src/technique-lab-v061.js','src/catalog-laboratory-v070.js']:
 change(name,"remoteOnly:true}});", "remoteOnly:true,...(move.lucasDevice?{lucasDevice:'remote',blastRadius:80}:{})}});")
change('scripts/compile-content.py',"'evidence':'lore-audited'", "'evidence':profile['fidelity']['status']")
name='tests/verify-lore.mjs'
change(name,"assert.equal(profile.fidelity.status,'lore-audited');", "assert(['lore-audited','source-review-partial'].includes(profile.fidelity.status));")
change(name,"assert.equal(fighter.combat.evidence,'lore-audited');assert.equal(fighter.fidelity.status,'lore-audited');", "assert.equal(fighter.combat.evidence,profile.fidelity.status);assert.equal(fighter.fidelity.status,profile.fidelity.status);")
change(name,"assert(canonical>=1,fighter.uid+' has no canonical move');", "assert(canonical>=1||profile.fidelity.status==='source-review-partial',fighter.uid+' has no canonical move or explicit unverified status');if(profile.fidelity.status==='source-review-partial')assert(Object.values(fighter.combat.moves).every(m=>m.evidence==='simulation'),fighter.uid+' must not overclaim source verification');")
change('src/combat-cues-r6.js',"Math.min(180,tr.def.reach||65)","Math.min(180,tr.def.lucasDevice?(tr.def.triggerRadius||tr.def.blastRadius||65):(tr.def.reach||65))")
change('src/unified-engine-v060.js',"${m.remoteOnly?'Déclencher avec AVANT + I / T.':'Déclenchement à proximité.'}","${m.lucasDevice==='remote'?'Déclencher avec UTILITAIRE (L / O).':m.lucasDevice==='timed'?'Détonation programmée par la mèche de simulation.':m.remoteOnly?'Déclencher avec AVANT + I / T.':'Déclenchement à proximité.'}")
print('R11 device behavior, cues and truthful source-review state installed.')
