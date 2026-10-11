(() => {
  'use strict';
  const D=window.RE_DATA,$=s=>document.querySelector(s),F=D.fighters,S=D.stages;
  const UROBOROS=D.protocols.uroboros;
  const APEX_IDS=['re2r-super-tyrant','re3r-stage-2-nemesis','re3r-stage-3-nemesis','re4r-del-lago','re4r-garrador','re4r-iron-maiden','re4r-ramon-salazar-mutated','re4r-osmund-saddler-mutated','revillage-mutated-dimitrescu','revillage-mutated-moreau','revillage-mutated-heisenberg','re6-ustanak'];
  const FAMILY_IDS=['re7-mia-winters-infected','re7-jack-baker','re7-jack-baker-scissor','re7-marguerite-baker','re7-lucas-baker','re7-eveline','re7-jack-baker-mutated','re7-jack-baker-swamp-man','re7-marguerite-baker-mutated','re7-lucas-baker-mutated','re7-eveline-final','re7-fumer','re7-mama-mold','re7-little-crawler'];
  const FAMILY_STAGES={'re7-mia-winters-infected':'guest_house_attic_2017','re7-jack-baker':'baker_garage_2017','re7-jack-baker-scissor':'processing_area_morgue_2017','re7-marguerite-baker':'old_house_lantern_2017','re7-lucas-baker':'testing_area_2017','re7-eveline':'eveline_corridor_2017'};
  const APEX_STAGES={'re2r-super-tyrant':'nest_escape_2019','re3r-stage-2-nemesis':'clock_tower_plaza_2020','re3r-stage-3-nemesis':'nest2_weapon_test_2020','re4r-del-lago':'village_lake_2023','re4r-garrador':'castle_dungeon_2023','re4r-iron-maiden':'specimen_storage_2023','re4r-ramon-salazar-mutated':'ancient_chantry_2023','re4r-osmund-saddler-mutated':'island_docks_2023','revillage-mutated-dimitrescu':'dimitrescu_battlements_2021','revillage-mutated-moreau':'moreau_reservoir_2021','revillage-mutated-heisenberg':'heisenberg_yard_2021','re6-ustanak':'edonia_crash_2012'};
  const modes={arcade:{title:'ARCADE',description:'Huit rencontres successives. Une réserve de vie complète à chaque duel ; une seule manche pour passer au suivant.'},survival:{title:'SURVIE',description:'Enchaînez les spécimens avec la vie conservée entre les duels. Chaque victoire restaure 12 % de votre réserve maximale. Le record reste enregistré sur cet appareil.'},boss:{title:'BOSS RUSH',description:'Dix confrontations contre les boss disponibles. Une seule manche, une vie complète à chaque rencontre et aucune victoire simulée.'},apex:{title:'APEX MUTATION',description:'Douze formes terminales dans un parcours fixe. Chaque adversaire ouvre sa chambre d’origine et conserve sa phase, son agent et ses techniques propres.'},family:{title:'E-001 FAMILY PROTOCOL',description:'Quatorze sujets de Dulvey, séparés par incarnation.'},uroboros:{title:UROBOROS.title,description:UROBOROS.description}};
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
    const fixed=['family','apex','uroboros'].includes(modeSelect.value),preview=$('#routePreview');
    if(preview){const ids=fixed?routeFor(modeSelect.value,f.uid):[];preview.textContent=fixed?ids.length+' RENCONTRES · ORDRE FIXE (duel miroir conservé)\n'+ids.map(id=>F.find(x=>x.uid===id).name).join(' → '):'Parcours aléatoire ; les résultats proviennent du moteur de combat.';}
    const key=modeSelect.value+'|'+$('#runDifficulty').value;const rec=records[key];
    $('#record').textContent=rec?`MEILLEUR RÉSULTAT · ${rec.wins} victoire${rec.wins>1?'s':''} · ${rec.name}`:'AUCUN RÉSULTAT ENREGISTRÉ';
  }
  for(const selector of ['#runMode','#runFighter','#runDifficulty'])$(selector).addEventListener('change',showSetup);
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  function routeFor(mode,uid){
    const fixed=mode==='uroboros'?UROBOROS.ids:mode==='family'?FAMILY_IDS:mode==='apex'?APEX_IDS:null;
    if(fixed){if(fixed.some(id=>!F.some(f=>f.uid===id)))throw Error('Dossier requis manquant');return fixed.slice();}
    const pool=F.filter(f=>f.uid!==uid&&(mode!=='boss'||f.boss));
    if(!pool.length)throw Error('Aucun adversaire disponible');
    const count=mode==='boss'?Math.min(10,pool.length):mode==='arcade'?8:Math.max(pool.length,8),a=shuffle(pool);
    return Array.from({length:count},(_,i)=>a[i%a.length].uid);
  }
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
    const stage=run.mode==='uroboros'?(S.find(x=>x.id===UROBOROS.stages[id])||S[run.index%S.length]):run.mode==='family'?(S.find(x=>x.id===(FAMILY_STAGES[id]||'baker_house'))||S[run.index%S.length]):run.mode==='apex'?(S.find(x=>x.id===APEX_STAGES[id])||S[run.index%S.length]):S[(run.index+(run.mode==='boss'?5:0))%S.length];
    post('cqc-versus-start',{config:{p1:run.fighter.uid,p2:id,stage:stage.id,mode:'cpu',rounds:1,seconds:99,difficulty:run.difficulty,aiProfile:['boss','apex','family','uroboros'].includes(run.mode)?'boss':'balanced',finishers:run.finishers,source:'re-operations',requestId:run.requestId,match:run.index+1,route:run.mode,startHealthRatio:run.health}});
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
    if(![0,1].includes(d.winnerSlot)||!Number.isFinite(d.life)||!Number.isFinite(d.maxLife)||d.maxLife<=0||d.life<0||d.life>d.maxLife)return;
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
  window.RE_OPERATIONS={routeFor,uroborosIds:UROBOROS.ids.slice(),uroborosStages:{...UROBOROS.stages},getState:()=>run?{mode:run.mode,index:run.index,wins:run.wins,health:run.health,pending:run.pending,route:run.route.slice(),requestId:run.requestId}:null,apexIds:APEX_IDS.slice(),apexStages:{...APEX_STAGES},familyIds:FAMILY_IDS.slice(),familyStages:{...FAMILY_STAGES}};
  showSetup();
})();
