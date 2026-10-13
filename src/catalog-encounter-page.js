(function(root){'use strict';
const E=root.RE_CATALOG_EXPANSION,J=root.RE_CONTEXT_JOURNAL,$=id=>document.getElementById(id),rows=E.records.filter(r=>r.encounter),vault=J.createVault();
let trial=null,playing=false,last=0,acc=0,raf=null,dirty=false,terminalRecorded=false,ioTicket=0,padPrev=[],padID=null;
const PHASE={approach:'APPROCHE',windup:'ATTAQUE ANNONCÉE',strike:'IMPACT',recovery:'OUVERTURE'};
for(const r of rows){const o=document.createElement('option');o.value=r.id;o.textContent=r.name+' / '+r.game;$('encSelect').append(o);}
const requested=new URLSearchParams(location.search).get('id');$('encSelect').value=rows.some(r=>r.id===requested)?requested:rows[0].id;
function status(text){$('encStorageStatus').textContent=text;}
function recordResult(){const s=trial.snapshot();if(!s.finished||terminalRecorded)return;terminalRecorded=true;if(s.outcome==='success'){const result=vault.record(trial.checkpoint());if(!result.ok)status(result.message);} }
function render(){
 const s=trial.snapshot();$('encHealth').textContent=Math.round(s.health);$('encProgress').textContent=Math.round(s.progress);$('encEnergy').textContent=Math.round(s.energy);
 $('encAux').textContent=s.kind==='cocoon'?'INCUBATION '+Math.round(s.incubation)+' %':s.kind==='swarm'?'DENSITÉ '+s.density:s.kind==='explosion'?(s.consumed?'CONSOMMÉ':'INTACT'):s.kind==='sentinel'?'ALERTE '+Math.round(s.noise):'PHASE '+(s.phaseIndex+1);
 $('encPhase').textContent='F'+s.frame+' · '+(s.kind==='cocoon'?'INCUBATION':PHASE[s.phase])+(playing?'':' · PAUSE');$('encCooldown').textContent=s.cooldown+' FRAMES';$('encTime').textContent=Math.ceil(((s.kind==='cocoon'?600:s.limit)-s.frame)/60)+' S';
 $('encResult').textContent=s.finished?(s.outcome==='success'?'ESSAI RÉUSSI · ':'ESSAI ÉCHOUÉ · ')+s.result+' — résultat non canonique':'';
 $('encEvents').textContent=s.events.slice(-8).map(e=>'F'+e.frame+' · '+e.type+' '+e.detail).join('\n');
 if(s.finished){playing=false;recordResult();}$('encPlay').textContent=s.finished?'TERMINÉ':playing?'PAUSE':'LIRE';$('encPlay').disabled=s.finished;$('encStep').disabled=s.finished;
 const records=vault.readRecords();$('encRecords').textContent=Object.keys(records).length+' / '+rows.length+' EXERCICES RÉUSSIS · '+(records[s.id]?'MEILLEUR TEMPS '+records[s.id].frame+' FRAMES / SANTÉ MAX. '+Math.round(records[s.id].health):'AUCUN RECORD LOCAL');
 for(const b of document.querySelectorAll('[data-context-action]')){const reason=trial.unavailableReason(b.dataset.contextAction);b.disabled=!!reason;b.title=reason||'Commande de simulation';}
 const fraction=s.kind==='cocoon'?s.incubation:s.kind==='swarm'?100-s.density:s.progress;$('encObjectiveFill').style.width=fraction+'%';$('encObjective').setAttribute('aria-valuenow',String(Math.round(fraction)));
}
function populate(){const r=rows.find(r=>r.id===trial.snapshot().id);$('encSelect').value=r.id;$('encTitle').textContent=r.name;$('encFacts').textContent=r.facts;$('encBoundary').textContent=r.boundary+' '+r.encounter.description;$('encUV').hidden=!r.encounter.uv;$('encDossier').href='catalog.html?id='+encodeURIComponent(r.id);$('encSource').href=r.source;}
function reset(){ioTicket++;trial=J.createSession($('encSelect').value);playing=false;acc=0;last=0;dirty=false;terminalRecorded=false;populate();status('Prêt. Pause et commandes manuelles n’écoulent pas le temps.');render();}
function pause(){playing=false;acc=0;last=0;render();}
function save(){pause();const result=vault.save(trial.checkpoint());if(result.ok){dirty=false;status('SESSION SAUVEGARDÉE · F'+trial.snapshot().frame);}else status(result.message);return result;}
function install(session,message){ioTicket++;trial=session;playing=false;acc=0;last=0;dirty=false;terminalRecorded=true;populate();status(message+' · F'+trial.snapshot().frame+' · REPRISE EN PAUSE');render();}
function restoreLocal(){const head=vault.adopt();if(!head.value){status(head.errors.length?'Aucune copie valide : '+head.errors.join(' / '):'Aucune session sauvegardée.');return false;}try{install(J.restore(head.value),head.recovered?'COPIE SECONDAIRE RÉCUPÉRÉE':'SESSION RESTAURÉE');return true;}catch(e){status(e.message);return false;}}
function doAction(action){if(!trial.act(action)){status(trial.unavailableReason(action));return false;}dirty=true;render();return true;}
function pollPad(){let p=null;try{p=Array.from(root.navigator?.getGamepads?.()||[]).find(g=>g&&g.connected!==false&&g.mapping==='standard');}catch(e){}if(!p){padPrev=[];padID=null;return;}const b=Array.from(p.buttons||[],x=>!!x?.pressed||(Number(x?.value)||0)>.5),id=String(p.index)+'|'+p.id;if(id!==padID){padID=id;padPrev=b.slice();}const edge=n=>b[n]&&!padPrev[n];if(edge(9))$('encPlay').click();if(playing)for(const[n,a]of [[2,'observe'],[0,'evade'],[3,'counter'],[1,'advance'],[6,'uv']])if(edge(n))doAction(a);padPrev=b;}
function loop(now){const dt=last?Math.max(0,Math.min(100,now-last)):0;last=now;if(!document.hidden){pollPad();if(playing){acc+=dt*60/1000;while(acc>=1){trial.tick();dirty=true;acc--;if(trial.snapshot().finished){playing=false;break;}}render();}}else acc=0;raf=requestAnimationFrame(loop);}
$('encSelect').addEventListener('change',reset);$('encReset').addEventListener('click',reset);$('encPlay').addEventListener('click',()=>{if(!trial.snapshot().finished)playing=!playing;acc=0;last=0;render();});$('encStep').addEventListener('click',()=>{playing=false;trial.tick(15);dirty=true;render();});
for(const b of document.querySelectorAll('[data-context-action]'))b.addEventListener('click',()=>doAction(b.dataset.contextAction));
$('encSave').addEventListener('click',save);$('encLoad').addEventListener('click',restoreLocal);
$('encExport').addEventListener('click',()=>{pause();const text=JSON.stringify(trial.checkpoint(),null,2),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='BOW_essai_'+trial.snapshot().id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Session exportée ; aucun accès au cloud.');});
$('encImport').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;pause();const ticket=++ioTicket;try{if(file.size>J.MAX_BYTES)throw Error('Fichier trop volumineux.');const text=await file.text();if(ticket!==ioTicket)return;const value=J.decode(text),session=J.restore(value),result=vault.save(value);if(!result.ok)throw Error(result.message);install(session,'SESSION IMPORTÉE ET VÉRIFIÉE');}catch(error){if(ticket===ioTicket)status('IMPORT REFUSÉ : '+error.message);}finally{e.target.value='';}});
const codes={KeyO:'observe',KeyE:'evade',KeyC:'counter',KeyA:'advance',KeyU:'uv'};
root.addEventListener('keydown',e=>{if(/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(e.target?.tagName||'')||e.target?.isContentEditable)return;if(e.code==='Escape'){e.preventDefault();pause();}else if(e.code==='KeyP'&&!e.repeat){e.preventDefault();$('encPlay').click();}else if(codes[e.code]&&!e.repeat){e.preventDefault();doAction(codes[e.code]);}});
root.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});root.addEventListener('pagehide',()=>{playing=false;ioTicket++;if(dirty)try{vault.save(trial.checkpoint());}catch(e){}cancelAnimationFrame(raf);raf=null;});
root.addEventListener('pageshow',e=>{if(e.persisted&&raf===null){pause();padPrev=[];padID=null;raf=requestAnimationFrame(loop);}});
root.addEventListener('storage',e=>{if(e.key===null||e.key?.startsWith(J.KEY+'.')){pause();status('Sauvegarde modifiée dans un autre onglet : rechargez-la avant de la remplacer.');}});
root.RE_CONTEXT_PAGE=Object.freeze({getTrial:()=>trial,reset,isPlaying:()=>playing,save,restoreLocal,doAction});reset();if(requested&&!rows.some(r=>r.id===requested))status('IDENTIFIANT INCONNU : première fiche affichée, sans restaurer une autre session.');raf=requestAnimationFrame(loop);
})(globalThis);
