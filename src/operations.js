(() => {
  'use strict';
  const D=window.RE_DATA,$=s=>document.querySelector(s),F=D.fighters,S=D.stages;
  const modes={arcade:{title:'ARCADE',description:'Huit rencontres successives. Une réserve de vie complète à chaque duel ; une seule manche pour passer au suivant.'},survival:{title:'SURVIE',description:'Enchaînez les spécimens avec la vie conservée entre les duels. Chaque victoire restaure 12 % de votre réserve maximale. Le record reste enregistré sur cet appareil.'},boss:{title:'BOSS RUSH',description:'Dix confrontations contre les boss disponibles. Une seule manche, une vie complète à chaque rencontre et aucune victoire simulée.'}};
  const storage='re.bow.operations.records/1';let records={};try{records=JSON.parse(localStorage.getItem(storage)||'{}')||{}}catch{}
  let run=null,ready=false,pingTimer=null,waitingTimer=null;
  const modeSelect=$('#runMode'),fighterSelect=$('#runFighter'),frame=$('#combatFrame');
  F.forEach(f=>{const o=document.createElement('option');o.value=f.uid;o.textContent=`${f.name} · ${f.source}`;fighterSelect.append(o)});
  const params=new URLSearchParams(location.search);modeSelect.value=modes[params.get('mode')]?params.get('mode'):'arcade';
  if(F.some(f=>f.uid===params.get('uid')))fighterSelect.value=params.get('uid');
  function showSetup(){
    const m=modes[modeSelect.value],f=F.find(f=>f.uid===fighterSelect.value)||F[0];
    $('#operationTitle').textContent=m.title;$('#operationDescription').textContent=m.description;
    $('#selectedSprite').src=f.sprite;$('#selectedSprite').alt=f.name+' — '+f.ep;
    $('#selectedName').textContent=f.name;$('#selectedEpisode').textContent=f.ep;const canonical=Object.values(f.combat?.moves||{}).filter(m=>m.evidence==='canonical').length;$('#selectedRole').textContent=(f.combat?.role||f.role)+' / '+f.bioAgent+'\nLORE AUDITÉ · 10 TECHNIQUES · '+canonical+' CANONIQUES';
    const key=modeSelect.value+'|'+$('#runDifficulty').value;const rec=records[key];
    $('#record').textContent=rec?`MEILLEUR RÉSULTAT · ${rec.wins} victoire${rec.wins>1?'s':''} · ${rec.name}`:'AUCUN RÉSULTAT ENREGISTRÉ';
  }
  for(const selector of ['#runMode','#runFighter','#runDifficulty'])$(selector).addEventListener('change',showSetup);
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  function routeFor(mode,uid){const pool=F.filter(f=>f.uid!==uid&&(mode!=='boss'||f.boss));const count=mode==='boss'?Math.min(10,pool.length):mode==='arcade'?8:Math.max(pool.length,8);const a=shuffle(pool);return Array.from({length:count},(_,i)=>a[i%a.length].uid)}
  function post(type,data={}){if(frame.contentWindow)frame.contentWindow.postMessage({type,...data},'*')}
  function updateRun(){
    $('#runLabel').textContent=modes[run.mode].title+' / '+run.fighter.name;
    $('#runProgress').textContent=run.mode==='survival'?`SÉRIE ${run.wins} · RENCONTRE ${run.wins+1}`:`RENCONTRE ${run.index+1} / ${run.route.length}`;
    $('#runHealth').value=run.health;$('#runHealthText').textContent=Math.round(run.health*100)+' %';const vital=run.health>.60?'FINE':run.health>.35?'CAUTION':'DANGER';document.querySelector('.run-health').dataset.state=vital;
  }
  function startMatch(){
    if(!run||!ready||run.pending)return;
    const id=run.route[run.index%run.route.length],op=F.find(f=>f.uid===id);
    run.requestId='re-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);run.pending=true;run.finished=false;
    $('#runResult').hidden=true;frame.hidden=false;$('#runStatus').textContent=`Préparation : ${run.fighter.name} / ${op.name}`;updateRun();
    const stage=S[(run.index+(run.mode==='boss'?5:0))%S.length];
    post('cqc-versus-start',{config:{p1:run.fighter.uid,p2:id,stage:stage.id,mode:'cpu',rounds:1,seconds:99,difficulty:run.difficulty,aiProfile:run.mode==='boss'?'boss':'balanced',finishers:run.finishers,source:'re-operations',requestId:run.requestId,match:run.index+1,route:run.mode,startHealthRatio:run.health}});
    clearTimeout(waitingTimer);waitingTimer=setTimeout(()=>{if(run?.pending)$('#runStatus').textContent='Le moteur prend plus de temps à répondre. Vous pouvez revenir au menu et relancer le protocole.'},12000);
  }
  function startRun(e){
    e?.preventDefault();const mode=modeSelect.value;const fighter=F.find(f=>f.uid===fighterSelect.value);
    run={mode,fighter,difficulty:$('#runDifficulty').value,finishers:$('#runFinishers').value,route:routeFor(mode,fighter.uid),index:0,wins:0,health:1,pending:false,finished:false};
    $('#setup').hidden=true;$('#run').hidden=false;$('#runResult').hidden=true;frame.hidden=false;updateRun();
    if(!frame.getAttribute('src')){frame.src='modules/versus.html?embed=battle';pingTimer=setInterval(()=>post('cqc-versus-ping'),500);setTimeout(()=>clearInterval(pingTimer),15000)}else if(ready)startMatch();
    $('#run').scrollIntoView({behavior:'smooth'});
  }
  function saveRecord(){const key=run.mode+'|'+run.difficulty;const old=records[key];if(!old||run.wins>old.wins){records[key]={wins:run.wins,name:run.fighter.name,uid:run.fighter.uid,date:new Date().toISOString()};try{localStorage.setItem(storage,JSON.stringify(records))}catch{}}}
  function finishResult(d){
    if(!run||!run.pending||d.requestId!==run.requestId)return;
    const opponent=run.route[run.index%run.route.length];if(!((d.winner===run.fighter.uid&&d.loser===opponent)||(d.loser===run.fighter.uid&&d.winner===opponent)))return;run.pending=false;clearTimeout(waitingTimer);const won=d.winnerSlot===0;
    if(won){run.wins++;if(run.mode==='survival')run.health=Math.min(1,Math.max(.001,Number(d.life)/Number(d.maxLife))+.12);else run.health=1;saveRecord()}
    const complete=run.mode!=='survival'&&run.index+1>=run.route.length;
    run.finished=!won||complete;frame.hidden=true;$('#runResult').hidden=false;$('#runStatus').textContent='Résultat enregistré par le moteur de combat.';
    $('#resultEyebrow').textContent=won?'SPÉCIMEN ADVERSE NEUTRALISÉ':'RUPTURE DU PROTOCOLE';
    $('#resultTitle').textContent=!won?'CONFINEMENT ÉCHOUÉ':complete?'PROTOCOLE ACHEVÉ':'ESSAI VALIDÉ';
    $('#resultDescription').textContent=!won?`${run.wins} victoire${run.wins>1?'s':''} dans ce parcours. Un nouvel essai peut être lancé depuis la sélection.`:complete?`${run.wins} victoires avec ${run.fighter.name}. Résultat sauvegardé pour la difficulté ${run.difficulty}.`:run.mode==='survival'?`Vie récupérée après traitement : ${Math.round(run.health*100)} %. La série continue.`:`Rencontre ${run.index+1} terminée. La prochaine chambre est prête.`;
    $('#nextFight').hidden=run.finished;$('#restartRun').textContent=run.finished?'NOUVEAU PARCOURS':'RETOUR À LA SÉLECTION';updateRun();
  }
  addEventListener('message',e=>{
    if(e.source!==frame.contentWindow)return;const d=e.data||{};
    if(d.type==='cqc-versus-ready'){ready=true;clearInterval(pingTimer);if(run&&!run.requestId&&!run.pending&&!run.finished)startMatch()}
    if(d.type==='cqc-versus-started'&&d.requestId===run?.requestId){clearTimeout(waitingTimer);$('#runStatus').textContent='Combat actif · cliquez dans l’arène pour le clavier. F1 : techniques. Échap : pause.';frame.focus()}
    if(d.type==='cqc-versus-result')finishResult(d);if(d.type==='cqc-admin-close'&&run)leave();
    if(d.type==='cqc-versus-error'&&run?.pending&&d.requestId===run.requestId){$('#runStatus').textContent='Le combat n’a pas pu démarrer : '+d.message;run&&(run.pending=false)}
  });
  function leave(){post('cqc-versus-abort');clearTimeout(waitingTimer);run=null;$('#run').hidden=true;$('#setup').hidden=false;showSetup();$('#setup').scrollIntoView({behavior:'smooth'})}
  $('#runForm').addEventListener('submit',startRun);$('#leaveRun').addEventListener('click',leave);$('#restartRun').addEventListener('click',leave);
  $('#nextFight').addEventListener('click',()=>{if(!run||run.finished||run.pending)return;run.index++;startMatch()});
  addEventListener('pagehide',()=>post('cqc-versus-pause'));
  window.RE_OPERATIONS={getState:()=>run?{mode:run.mode,index:run.index,wins:run.wins,health:run.health,pending:run.pending,route:run.route.slice(),requestId:run.requestId}:null};
  showSetup();
})();
