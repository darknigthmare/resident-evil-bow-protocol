/* R28 voluntary mutations. The preserved CQC 0.60 engine remains untouched.
 * Conditions are authored duel rules; source stories do not certify these costs.
 * No mutation ever restores life, guard, status, or regeneration budgets. */
(function(root){'use strict';
 const C=root.CQCCombat060,D=root.RE_EVOLUTION_DATA_R28;
 if(!C||!D)throw Error('Moteur ou graphe des évolutions absent.');
 const pending=new WeakMap(),clone=v=>JSON.parse(JSON.stringify(v));
 const fighter=uid=>root.RE_DATA.fighters.find(f=>f.uid===uid);
 const actors=s=>[s.a,s.b];
 function create(a,b,options={}){
  if([a,b].some(f=>D.contextOnlyUids.includes(f?.uid)))throw Error('Cette forme reste une rencontre de contexte.');
  const s=C.create(a,b,options);
  s.evolutionsR28={schema:'re.bow.evolution-state/1',counts:[0,0],history:[],lastResults:[null,null]};
  pending.set(s,[null,null]);return s;
 }
 function edge(s,slot,to){return D.edges.find(e=>e.from===actors(s)[slot]?.f.uid&&e.to===to);}
 function reason(s,slot,to){
  if(!s?.evolutionsR28)return'Ce duel ne permet pas les évolutions R28.';
  if(slot!==0&&slot!==1)return'Joueur inconnu.';
  if(typeof to!=='string')return'Forme inconnue.';
  const e=edge(s,slot,to),p=actors(s)[slot];
  if(!e)return'Aucune évolution directe vérifiée vers cette forme.';
  if(e.playable===false||!fighter(to))return'Cette phase reste une rencontre de contexte.';
  if(s.finished||s.phase!=='fight'||p.life<=0)return'Évolution disponible uniquement pendant le combat.';
  if(s.frame<e.conditions.minimumFrame)return'Attendre '+e.conditions.minimumFrame+' ticks de combat.';
  if(p.life>p.max*e.conditions.maxLifeRatio)return'Vie requise : '+Math.round(e.conditions.maxLifeRatio*100)+' % ou moins.';
  if(p.meter<e.conditions.meterCost)return'Jauge requise : '+e.conditions.meterCost+' points.';
  if(!p.onGround||p.y!==C.FLOOR||p.vy!==0)return'Revenir au sol.';
  if(p.attack||p.hit>0||p.blockstun>0||p.cool>0||p.block||p.crouch||Math.abs(p.vx)>.2)return'Revenir à une posture neutre, hors récupération.';
  if(s.projectiles.some(q=>q.owner===slot&&!q.dead)||s.traps.some(q=>q.owner===slot&&!q.dead))return'Attendre la fin de vos projectiles et dispositifs.';
  return null;
 }
 function available(s,slot){
  if(slot!==0&&slot!==1||!s?.a||!s?.b)return[];
  return D.edges.filter(e=>e.from===actors(s)[slot].f.uid).map(e=>({...clone(e),target:fighter(e.to)||null,reason:reason(s,slot,e.to)}));
 }
 function request(s,slot,to){
  const why=reason(s,slot,to);if(why)return{ok:false,reason:why};
  const q=pending.get(s);if(!q)return{ok:false,reason:'Session d’évolution inconnue.'};
  if(q[slot]!==null)return{ok:false,reason:'Une demande attend déjà le prochain tick.'};
  q[slot]=to;return{ok:true,reason:null};
 }
 function cancel(s){const q=pending.get(s);if(q)q.fill(null);}
 function commands(s){return[...(pending.get(s)||[null,null])];}
 function emit(s,type,p,extra){
  s.events.push({frame:s.frame,type,actor:p.slot,...extra});if(s.events.length>180)s.events.shift();
  s.metrics[type]=(s.metrics[type]||0)+1;
 }
 function apply(s,slot,to){
  const p=actors(s)[slot],why=reason(s,slot,to);
  if(why){s.evolutionsR28.lastResults[slot]={ok:false,reason:why,to,frame:s.frame};emit(s,'evolutionDeniedR28',p,{to,why});return false;}
  const e=edge(s,slot,to),f=fighter(to),from=p.f.uid;
  const oldResource=p.f.combat.resource,nextResource=f.combat.resource;
  // Preserve spent resource fraction, including inverted heat/cost resources.
  const oldAvailable=['heat','cost'].includes(oldResource.kind)?1-p.r/oldResource.max:p.r/oldResource.max;
  const fraction=Math.max(0,Math.min(1,oldAvailable));
  p.f=f;p.r=nextResource.max*(['heat','cost'].includes(nextResource.kind)?1-fraction:fraction);
  p.meter-=e.conditions.meterCost;p.resourceDelay=Math.max(p.resourceDelay,e.conditions.recoveryFrames);
  p.cool=e.conditions.recoveryFrames;p.vx=p.vy=0;p.block=p.crouch=p.steady=false;p.still=0;p.buffs={};
  p.state='idle';p.lastStarted=p.lastActivation=null;p.chainDepth=p.chainQuiet=0;
  // A source form's weapon cooldowns remain: a mutation cannot bypass cooldown.
  p.cpu59=null;p.cpuWait=p.cpuGuard=0;
  s.evolutionsR28.counts[slot]++;
  const entry={frame:s.frame+1,slot,from,to,edgeId:e.id,meterCost:e.conditions.meterCost};
  s.evolutionsR28.history.push(entry);if(s.evolutionsR28.history.length>64)s.evolutionsR28.history.shift();
  s.evolutionsR28.lastResults[slot]={ok:true,reason:null,to,frame:s.frame+1,recoveryUntil:s.frame+e.conditions.recoveryFrames};
  emit(s,'evolutionR28',p,{...entry,frame:s.frame+1});return true;
 }
 function step(s,inputs=[C.empty(),C.empty()]){
  if(!s?.evolutionsR28)throw Error('Session R28 requise.');
  const q=commands(s);cancel(s);
  if(s.finished)return s;
  const before=actors(s),next=inputs.map(i=>({...C.empty(),...(i||{})}));
  for(let slot=0;slot<2;slot++){
   const to=typeof next[slot]?.evolve==='string'?next[slot].evolve:q[slot];
   if(to!==null&&to!==undefined){if(apply(s,slot,to))next[slot]=C.empty();}
   if(actors(s)[slot].cool>0&&s.evolutionsR28.lastResults[slot]?.ok&&s.frame<s.evolutionsR28.lastResults[slot].recoveryUntil)next[slot]=C.empty();
  }
  C.step(s,next);
  // Legacy round reset keeps the selected current profile. Persist only the
  // R28 history and let the unchanged engine initialise the new actors normally.
  if(before[0]!==s.a||before[1]!==s.b)cancel(s);
  return s;
 }
 function snapshot(s){return s?.evolutionsR28?clone(s.evolutionsR28):null;}
 root.RE_EVOLUTIONS_R28=Object.freeze({version:'R28',create,step,available,reason,request,cancel,commands,snapshot,graph:D});
})(globalThis);
