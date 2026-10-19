/* A controlled bench using the shipped combat rules, not hand-authored move videos.
 * Test injuries/full gauge are explicit fixtures. No saves, rewards or result packets. */
(function(root){'use strict';
const D=root.RE_DATA,C=root.CQCCombat060;
function makeBench(config={}){
 const f=D.fighters.find(f=>f.uid===config.uid)||D.fighters[0],target=D.fighters.find(f=>f.uid===config.target)||D.fighters.find(x=>x.uid!==f.uid)||f;
 const slot=C.SLOTS.includes(config.slot)?config.slot:'special',move=f.combat.moves[slot];
 const face=config.face===-1?-1:1,distance=Math.max(70,Math.min(750,Number(config.distance)||210));
 const s=C.create(f,target,{training:true,autoheal:false,freeMeter:false,freeResource:false,seed:61061,skipIntro:true});
 s.a.x=face===1?240:1040;s.b.x=s.a.x+face*distance;s.a.face=face;s.b.face=config.targetSide==='rear'?face:-face;
 s.options.dummyFacing=s.b.face;
 const testOpening=config.targetOpening===true&&!!root.RE_SPATIAL?.profile(s.b);
 if(testOpening)s.b.statuses.exposed={t:600};
 s.a.meter=100;s.a.life=7000;s.a.gray=2200;
 if(move.kind==='reload')s.a.r=0;
 if(move.kind==='recover'&&['heat','cost'].includes(f.combat.resource.kind))s.a.r=f.combat.resource.max*.8;
 else if(move.kind==='recover')s.a.r=Math.min(f.combat.resource.max*.3,f.combat.resource.max);
 if(move.requiresStagger){s.b.hit=40;s.b.lastHit=s.frame;}
 // A detonation needs an armed test object. It is labelled as a laboratory fixture.
 if(move.kind==='detonate')s.traps.push({id:s.nextId++,owner:0,x:s.b.x,y:C.FLOOR,age:99,life:400,arm:1,hp:100,dead:false,def:{kind:'trap',tag:'explosive',damage:600,radius:80,reach:80,remoteOnly:true,...(move.lucasDevice?{lucasDevice:'remote',blastRadius:80}:{})}});
 const mode=['idle','guard','crouch','jump'].includes(config.dummy)?config.dummy:'idle';
 const begun=C.start(s,s.a,slot),denied=begun?null:C.unavailableReason(s,s.a,slot);
 let ticks=0;
 function tick(count=1){const n=Math.max(0,Math.min(1200,Math.trunc(count)||0));for(let i=0;i<n;i++){
  const input=C.empty();input.guard=mode==='guard'||mode==='crouch';input.down=mode==='crouch';input.jump=mode==='jump'&&ticks===0;C.step(s,[C.empty(),input]);ticks++;
 }return snapshot();}
 function snapshot(){const total=move.startup+move.active+move.recovery,window=root.RE_COMBAT_CUES?.activeWindow(move,ticks)??0,phase=ticks<move.startup?'DÉMARRAGE':ticks<move.startup+move.active?(window<0?'INTERVALLE':'ACTIF'):ticks<total?'RÉCUPÉRATION':'TERMINÉ';return{uid:f.uid,target:target.uid,slot,frame:ticks,total,phase,started:begun,denied,damage:s.a.stats.damage,hits:s.a.stats.hits,resource:s.a.r,life:s.a.life,targetLife:s.b.life,activations:s.a.stats.activations,projectiles:s.projectiles.length,traps:s.traps.length,statuses:JSON.parse(JSON.stringify(s.b.statuses)),events:s.events.slice(-10),lastImpact:s.lastImpact?JSON.parse(JSON.stringify(s.lastImpact)):null,weakpointHits:s.metrics.weakpointHit||0,targetZones:root.RE_SPATIAL?.zones(s.b,C.box(s.b),{includeClosed:true})||[],testOpening,hashContract:root.RE_RUNTIME_CONTRACT?.digest||null};}
 return Object.freeze({tick,snapshot,getState:()=>s,move,slot,face,distance});
}
root.RE_TECHNIQUE_BENCH=Object.freeze({create:makeBench});
if(!root.document||!document.getElementById('labCanvas'))return;
const $=id=>document.getElementById(id),canvas=$('labCanvas'),ctx=canvas.getContext('2d'),renderer=root.RE_RENDERER;
const params=new URLSearchParams(location.search);let bench=null,playing=false,last=0,acc=0,raf=null,dirty=true;
for(const id of ['labSubject','labTarget'])for(const f of D.fighters){const o=document.createElement('option');o.value=f.uid;o.textContent=f.name+' / '+f.source;$(id).append(o);}
$('labSubject').value=D.fighters.some(f=>f.uid===params.get('uid'))?params.get('uid'):'re3r-nemesis';
$('labTarget').value=D.fighters.some(f=>f.uid===params.get('target'))?params.get('target'):'re5-uroboros-mkono';
for(const [param,id,values]of [['side','labTargetSide',['front','rear']],['face','labFacing',['1','-1']],['dummy','labDummy',['idle','guard','crouch','jump']]])if(values.includes(params.get(param)))$(id).value=params.get(param);
if(params.get('opening')==='1')$('labTargetOpening').checked=true;
const linkedDistance=Number(params.get('distance'));if(params.has('distance')&&Number.isFinite(linkedDistance))$('labDistance').value=String(Math.round(Math.max(70,Math.min(750,linkedDistance))/10)*10);
function fillMoves(){const f=D.fighters.find(f=>f.uid===$('labSubject').value);$('labMove').replaceChildren();for(const slot of C.SLOTS){const o=document.createElement('option');o.value=slot;o.textContent=slot+' · '+f.combat.moves[slot].name;$('labMove').append(o);}}
fillMoves();$('labMove').value=C.SLOTS.includes(params.get('slot'))?params.get('slot'):'special';
function updateReadout(){const x=bench.snapshot();root.RE_LAB_CONTACT?.readout(x,bench);$('labFrame').textContent=x.frame+' F / '+x.phase;$('labDamage').textContent=x.damage+' DÉGÂTS · '+x.hits+' IMPACTS';$('labResource').textContent=Math.round(x.resource*10)/10+' / '+bench.getState().a.f.combat.resource.max+' RESSOURCE';$('labLife').textContent='VIE CIBLE '+x.targetLife+' / 10000';if($('labWeakpoints'))$('labWeakpoints').textContent=x.targetZones.length?x.weakpointHits+' IMPACTS LOCALISÉS · '+(x.testOpening?'OUVERTURE DE TEST (600 F)':'OUVERTURE NATURELLE'):'AUCUNE ZONE SPATIALE CONFIGURÉE POUR CETTE INCARNATION';$('labEvents').textContent=x.events.map(e=>'F'+e.frame+' · '+e.type+(e.amount!==undefined?' · '+e.amount:'')).join('\n')||'Prêt';$('labPhase').value=Math.min(x.frame,x.total);$('labPhase').max=x.total;$('labToggle').textContent=playing?'PAUSE':'LIRE';}
function redraw(){if(!bench)return;dirty=false;const s=bench.getState();ctx.clearRect(0,0,1280,720);const gradient=ctx.createLinearGradient(0,0,0,720);gradient.addColorStop(0,'#071318');gradient.addColorStop(1,'#203332');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);ctx.strokeStyle='#547072';ctx.lineWidth=1;for(let x=0;x<1280;x+=80){ctx.beginPath();ctx.moveTo(x,130);ctx.lineTo(x,635);ctx.stroke();}ctx.beginPath();ctx.moveTo(0,C.FLOOR);ctx.lineTo(1280,C.FLOOR);ctx.stroke();
 for(const p of[s.a,s.b]){renderer.drawFighter(ctx,p.f,p.x,p.y,p.face,1,{actor:p,time:s.frame/60,attack:!!p.attack,move:p.attack?.def,moveProgress:p.attack?p.attack.t/(p.attack.def.startup+p.attack.def.active+p.attack.def.recovery):0,hit:p.hit>0,guard:p.block,crouch:p.crouch,jump:!p.onGround,reduceMotion:!playing});
  if($('labBoxes').checked){const body=C.box(p);ctx.strokeStyle=p.slot?'#61b9d0':'#76cd9b';ctx.lineWidth=2;ctx.strokeRect(body.x,body.y,body.w,body.h);const h=C.hitbox(p);if(h){ctx.fillStyle='#dd65454a';ctx.fillRect(h.x,h.y,h.w,h.h);ctx.strokeStyle='#f79b5e';ctx.strokeRect(h.x,h.y,h.w,h.h);}}}
 root.RE_COMBAT_CUES?.draw(ctx,s,{reducedMotion:!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches});
 ctx.fillStyle='#d4dfd8';ctx.font='18px monospace';ctx.textAlign='left';ctx.fillText(bench.move.name,30,47);ctx.font='13px monospace';ctx.fillText('POSES DE RÉFÉRENCE · HITBOXES DU PROTOTYPE · ÉCHELLE DE COMBAT ADAPTÉE',30,80);ctx.fillText('DÉMARRAGE '+bench.move.startup+' / ACTIF '+bench.move.active+' / RÉCUPÉRATION '+bench.move.recovery+' F',30,666);
 if($('labBoxes').checked)root.RE_LAB_CONTACT?.draw(ctx,s.lastImpact);
 updateReadout();
}
function reset(){playing=false;acc=0;bench=makeBench({uid:$('labSubject').value,target:$('labTarget').value,slot:$('labMove').value,distance:Number($('labDistance').value),face:Number($('labFacing').value),dummy:$('labDummy').value,targetSide:$('labTargetSide')?.value,targetOpening:!!$('labTargetOpening')?.checked});const f=bench.getState().a.f;$('labTitle').textContent=f.name;$('labEvidence').textContent=(bench.move.evidence||'simulation').toUpperCase()+' — '+bench.move.loreBasis;$('labBoundary').textContent=bench.move.adaptation+' '+(f.assetNote||'')+' Le rendu anime une pose de référence ; ce n’est pas l’animation originale de cette technique.';$('labArchive').href='movesets.html?uid='+encodeURIComponent(f.uid);$('labDistanceText').textContent=bench.distance+' UNITÉS';redraw();}
function loop(now){const delta=Math.max(0,Math.min(100,now-last));last=now;if(playing){dirty=true;acc+=delta*60/1000*Number($('labSpeed').value);while(acc>=1){bench.tick();acc--;if(bench.snapshot().frame>=bench.snapshot().total+240){playing=false;break;}}}if(playing||dirty)redraw();raf=requestAnimationFrame(loop);}
$('labSubject').addEventListener('change',()=>{fillMoves();reset();});for(const id of ['labTarget','labMove','labDummy','labFacing','labDistance','labTargetSide','labTargetOpening'])$(id).addEventListener('change',reset);
$('labReset').addEventListener('click',reset);$('labToggle').addEventListener('click',()=>{playing=!playing;acc=0;dirty=true;});$('labStep').addEventListener('click',()=>{playing=false;bench.tick();redraw();});$('labActivation').addEventListener('click',()=>{reset();bench.tick(bench.move.startup);redraw();});$('labBoxes').addEventListener('change',redraw);
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;acc=0;}});root.addEventListener('blur',()=>{playing=false;acc=0;dirty=true;});root.addEventListener('pagehide',()=>{playing=false;acc=0;last=0;cancelAnimationFrame(raf);raf=null;});
root.addEventListener('pageshow',e=>{if(e.persisted&&raf===null){playing=false;acc=0;last=performance.now();dirty=true;redraw();raf=requestAnimationFrame(loop);}});
root.addEventListener('re:assetstatus',()=>{dirty=true;});
root.RE_TECHNIQUE_LAB=Object.freeze({getBench:()=>bench,reset});reset();raf=requestAnimationFrame(loop);
})(typeof window==='undefined'?globalThis:window);
