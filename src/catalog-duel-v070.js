/* Isolated duels and read-only replays; never campaign progression. */
(function(root){
'use strict';
const D=root.RE_DATA,C=root.CQCCombat060,E=root.RE_CATALOG_EXPANSION,R=root.RE_CATALOG_REPLAY;
const $=id=>document.getElementById(id),canvas=$('trialCanvas'),ctx=canvas.getContext('2d'),controls=root.RE_TRIAL_INPUT.create();
let s=null,live=null,replay=null,paused=true,last=0,acc=0,pending=null,raf=null,stage=D.stages[0],dirty=true,ioTicket=0;
const names={light:'LÉGER',heavy:'LOURD',low:'BAS',throw:'PRISE',special:'TECHNIQUE NEUTRE',specialDown:'TECHNIQUE BASSE',specialForward:'TECHNIQUE AVANT',specialBack:'TECHNIQUE ARRIÈRE',super:'SUPER',utility:'UTILITAIRE'};
for(const id of ['trialSubject','trialTarget'])for(const f of D.fighters){const o=document.createElement('option');o.value=f.uid;o.textContent=(f.experimental?'ESSAI · ':'BASE · ')+f.name+' / '+f.ep;$(id).append(o);}
for(const st of D.stages){const o=document.createElement('option');o.value=st.id;o.textContent=st.name;$('trialStage').append(o);}
const params=new URLSearchParams(location.search),requested=params.get('uid');
$('trialSubject').value=D.fighters.some(f=>f.uid===requested)?requested:E.fighters[0].uid;
$('trialTarget').value=D.fighters.some(f=>f.uid===params.get('target'))?params.get('target'):'re3r-nemesis';
$('trialStage').value=D.stages.some(st=>st.id===params.get('stage'))?params.get('stage'):D.stages[0].id;
function focusArena(){canvas.focus?.({preventScroll:true});}
function clear(){controls.clear();pending=null;acc=0;last=0;}
function status(message){$('trialReplayStatus').textContent=message;}
function configuration(){return{uid:$('trialSubject').value,target:$('trialTarget').value,stage:$('trialStage').value,mode:$('trialMode').value,seed:7070};}
function rebuildMoves(){
 const f=s.a.f;$('trialMoves').replaceChildren();
 for(const slot of C.SLOTS){const b=document.createElement('button');b.type='button';b.setAttribute('data-slot',slot);b.textContent=names[slot]+' · '+f.combat.moves[slot].name;b.addEventListener('click',()=>{if(!paused&&!s.finished&&!replay){pending=slot;focusArena();}});$('trialMoves').append(b);}
}
function reset(run=false){
 ioTicket++;clear();replay=null;live=R.create(configuration());s=live.getState();stage=D.stages.find(st=>st.id===$('trialStage').value)||D.stages[0];paused=!run;dirty=true;
 $('trialScope').textContent=(s.a.f.assetNote||'Pose de référence')+' '+(s.a.f.fidelity?.balanceBoundary||'');
 $('trialResult').textContent=run?'Duel démarré.':'Prêt. Démarrez le duel.';status('ENREGISTREMENT EN MÉMOIRE · aucun résultat de campagne.');rebuildMoves();draw();if(run)focusArena();
}
function tick(count=1,pad){
 if(!Number.isInteger(count)||count<0||count>R.MAX_FRAMES)throw Error('Avance invalide.');
 pad??=controls.samplePad();
 for(let n=0;n<count;n++){
  if(replay){if(replay.ended())break;s=replay.tick(1);}
  else{if(s.finished)break;let input=C.empty();if(live.getSetup().mode==='cpu')controls.clear();else{input=controls.consume(s.a.face,n===0?pad:{edges:[],held:pad.held});if(pending){input.slot=pending;pending=null;}}s=live.step(input);}
 }
 if(replay&&replay.ended()){paused=true;clear();$('trialResult').textContent=s.finished?'REPLAY TERMINÉ · résultat reconstruit, aucune progression.':'FIN DE L’EXTRAIT · duel incomplet, aucune victoire attribuée.';}
 else if(s.finished){paused=true;clear();$('trialResult').textContent='ESSAI TERMINÉ · '+(s.winner===0?s.a.f.name:s.winner===1?s.b.f.name:'ÉGALITÉ')+' · résultat non enregistré';}
 dirty=true;return s;
}
function unavailable(slot){if(replay)return'Lecture seule du replay.';if(paused)return'Démarrez ou reprenez le duel.';if(s.finished||s.phase!=='fight')return'Duel hors phase de combat.';const why=C.unavailableReason(s,s.a,slot);return why==='busy'?'Action ou récupération en cours.':why;}
function draw(){
 if(!s)return;dirty=false;ctx.clearRect(0,0,1280,720);root.RE_RENDERER.drawStage(ctx,stage,s.frame/60,0,false);
 for(const p of [s.a,s.b])root.RE_RENDERER.drawFighter(ctx,p.f,p.x,p.y,p.face,1,{actor:p,time:s.frame/60,attack:!!p.attack,move:p.attack?.def,moveProgress:p.attack?p.attack.t/(p.attack.def.startup+p.attack.def.active+p.attack.def.recovery):0,guard:p.block,crouch:p.crouch,hit:p.hit>0,jump:!p.onGround});
 root.RE_COMBAT_CUES?.draw(ctx,s,{reducedMotion:!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches});
 $('trialHealthA').textContent=s.a.f.name+' · '+s.a.life+' PV · '+Math.round(s.a.r)+' R';$('trialHealthB').textContent=s.b.f.name+' · '+s.b.life+' PV · '+Math.round(s.b.r)+' R';
 $('trialClock').textContent='F'+s.frame+(replay?' · REPLAY':'')+(paused?' · PAUSE':' · EN COURS');$('trialPause').textContent=paused?'REPRENDRE':'PAUSE';
 const ended=replay?replay.ended():s.finished;$('trialPause').disabled=ended;$('trialStep').disabled=ended;
 $('trialReplayExit').hidden=!replay;$('trialReplayRestart').hidden=!replay;$('trialReplaySeek').disabled=!replay;$('trialReplaySeek').max=String(replay?replay.length():0);
 if(document.activeElement!==$('trialReplaySeek'))$('trialReplaySeek').value=String(replay?replay.frame():0);
 $('trialReplayLength').textContent=replay?replay.frame()+' / '+replay.length()+' FRAMES':live.frames()+' FRAMES ENREGISTRÉES';$('trialReplayExport').disabled=!replay&&!live.canExport();
 for(const b of document.querySelectorAll('[data-slot]')){const why=unavailable(b.dataset.slot);b.disabled=!!why;b.title=why||'Déclencher la commande réelle.';}
 for(const b of document.querySelectorAll('[data-hold]'))b.disabled=paused||!!replay||s.finished;
 $('trialCommandState').textContent=replay?'LECTURE SEULE · commandes humaines désactivées.':s.a.feedbackT>0?s.a.feedback:s.a.attack?names[s.a.attack.name]+' · F'+s.a.attack.t+' · ressource '+Math.round(s.a.r):paused?'Clavier actif dans la zone de combat après Démarrer/Reprendre.':'PRÊT · coûts et délais réels du moveset.';
}
function pause(){paused=true;clear();dirty=true;}
function togglePause(){if(replay?replay.ended():s.finished)return;paused=!paused;clear();dirty=true;if(!paused)focusArena();}
function exportReplay(){return R.validate(replay?replay.exportValue():live.exportValue());}
function installReplay(value){
 // Verification completes before touching the current match or selectors.
 const player=R.createPlayer(value),cfg=player.getSetup();ioTicket++;clear();replay=player;paused=true;s=player.getState();
 $('trialSubject').value=cfg.uid;$('trialTarget').value=cfg.target;$('trialStage').value=cfg.stage;$('trialMode').value=cfg.mode;
 stage=D.stages.find(st=>st.id===cfg.stage);$('trialScope').textContent=(s.a.f.assetNote||'Pose de référence')+' '+(s.a.f.fidelity?.balanceBoundary||'');
 $('trialResult').textContent='REPLAY VÉRIFIÉ · départ en pause à la frame 0.';status('Commandes et empreinte vérifiées · pas de santé importée ni de récompense.');rebuildMoves();dirty=true;draw();return true;
}
function loop(now){
 const dt=last?Math.max(0,Math.min(100,now-last)):0;last=now;const pad=controls.samplePad();
 if(!document.hidden&&pad.edges.includes('pause'))togglePause();
 if(!paused&&!document.hidden){
  if(!replay)for(const edge of pad.edges)if(edge!=='pause')controls.queue(edge);
  const speed=Number($('trialSpeed').value);acc+=dt*60/1000*([.25,.5,1,2].includes(speed)?speed:1);
  while(acc>=1&&!paused){tick(1,{held:pad.held,edges:[]});acc=Math.max(0,acc-1);}
 }else acc=0;
 if(dirty)draw();raf=requestAnimationFrame(loop);
}
$('trialStart').addEventListener('click',()=>reset(true));$('trialPause').addEventListener('click',togglePause);
$('trialStep').addEventListener('click',()=>{pause();tick(1,{held:{},edges:[]});draw();});$('trialSpeed').addEventListener('change',()=>{acc=0;last=0;});
for(const id of ['trialSubject','trialTarget','trialStage','trialMode'])$(id).addEventListener('change',()=>reset(false));
$('trialReplayExit').addEventListener('click',()=>reset(false));$('trialReplayRestart').addEventListener('click',()=>{if(replay){pause();s=replay.seek(0);$('trialResult').textContent='REPLAY · retour au début.';draw();}});
$('trialReplaySeek').addEventListener('change',()=>{if(!replay)return;pause();const n=Number($('trialReplaySeek').value);if(!Number.isInteger(n)||n<0||n>replay.length()){status('Position hors du replay.');$('trialReplaySeek').value=String(replay.frame());draw();return;}s=replay.seek(n);$('trialResult').textContent='REPLAY · position reconstruite F'+n;draw();});
$('trialReplayExport').addEventListener('click',()=>{pause();try{const value=exportReplay(),url=URL.createObjectURL(new Blob([JSON.stringify(value)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='BOW_duel_'+value.setup.uid+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Replay vérifié exporté · '+value.frames+' frames.');}catch(error){status('EXPORT REFUSÉ : '+error.message);}dirty=true;});
$('trialReplayImport').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;const ticket=++ioTicket;try{if(file.size>R.MAX_BYTES)throw Error('Fichier trop volumineux (1 Mio maximum).');const text=await file.text();if(ticket!==ioTicket)return;installReplay(text);}catch(error){if(ticket===ioTicket)status('IMPORT REFUSÉ : '+error.message+' Duel actuel conservé.');}finally{if(ticket===ioTicket||replay)e.target.value='';}});
root.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.altKey||e.metaKey||['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(e.target?.tagName)||e.target?.isContentEditable)return;
 if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){e.preventDefault();if(e.code==='Escape')pause();else togglePause();return;}
 if(controls.controlled(e.code)){e.preventDefault();if(!paused&&!replay)controls.key(e.code,true,e.repeat);}
});
root.addEventListener('keyup',e=>controls.key(e.code,false));
for(const b of document.querySelectorAll('[data-hold]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(!paused&&!replay)controls.pointer(e.pointerId,b.dataset.hold,true);b.setPointerCapture?.(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>controls.pointer(e.pointerId,b.dataset.hold,false));}
root.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
root.addEventListener('pagehide',()=>{ioTicket++;pause();cancelAnimationFrame(raf);raf=null;});root.addEventListener('pageshow',e=>{if(e.persisted&&raf===null){pause();draw();raf=requestAnimationFrame(loop);}});
root.addEventListener('re:assetstatus',()=>dirty=true);
root.RE_CATALOG_DUEL=Object.freeze({reset,tick,getState:()=>s,isPaused:()=>paused,progression:false,exportReplay,installReplay,isReplay:()=>!!replay});
reset(false);if(requested&&!D.fighters.some(f=>f.uid===requested))status('IDENTIFIANT INCONNU : premier essai affiché explicitement.');raf=requestAnimationFrame(loop);
})(globalThis);
