(() => {
  'use strict';
  const D=window.RE_DATA,$=s=>document.querySelector(s),F=D.fighters,S=D.stages;
  const UROBOROS=D.protocols.uroboros;
  const APEX_IDS=['re2r-super-tyrant','re3r-stage-2-nemesis','re3r-stage-3-nemesis','re4r-del-lago','re4r-garrador','re4r-iron-maiden','re4r-ramon-salazar-mutated','re4r-osmund-saddler-mutated','revillage-mutated-dimitrescu','revillage-mutated-moreau','revillage-mutated-heisenberg','re6-ustanak'];
  const FAMILY_IDS=['re7-mia-winters-infected','re7-jack-baker','re7-jack-baker-scissor','re7-marguerite-baker','re7-lucas-baker','re7-eveline','re7-jack-baker-mutated','re7-jack-baker-swamp-man','re7-marguerite-baker-mutated','re7-lucas-baker-mutated','re7-eveline-final','re7-fumer','re7-mama-mold','re7-little-crawler'];
  const FAMILY_STAGES={'re7-mia-winters-infected':'guest_house_attic_2017','re7-jack-baker':'baker_garage_2017','re7-jack-baker-scissor':'processing_area_morgue_2017','re7-marguerite-baker':'old_house_lantern_2017','re7-lucas-baker':'testing_area_2017','re7-eveline':'eveline_corridor_2017'};
  const APEX_STAGES={'re2r-super-tyrant':'nest_escape_2019','re3r-stage-2-nemesis':'clock_tower_plaza_2020','re3r-stage-3-nemesis':'nest2_weapon_test_2020','re4r-del-lago':'village_lake_2023','re4r-garrador':'castle_dungeon_2023','re4r-iron-maiden':'specimen_storage_2023','re4r-ramon-salazar-mutated':'ancient_chantry_2023','re4r-osmund-saddler-mutated':'island_docks_2023','revillage-mutated-dimitrescu':'dimitrescu_battlements_2021','revillage-mutated-moreau':'moreau_reservoir_2021','revillage-mutated-heisenberg':'heisenberg_yard_2021','re6-ustanak':'edonia_crash_2012'};
  const modes={arcade:{title:'ARCADE',description:'Huit rencontres successives. Une réserve de vie complète à chaque duel ; une seule manche pour passer au suivant.'},survival:{title:'SURVIE',description:'Enchaînez les spécimens avec la vie conservée entre les duels. Chaque victoire restaure 12 % de votre réserve maximale. Le record reste enregistré sur cet appareil.'},boss:{title:'BOSS RUSH',description:'Dix confrontations contre les boss disponibles. Une seule manche, une vie complète à chaque rencontre et aucune victoire simulée.'},apex:{title:'APEX MUTATION',description:'Douze formes terminales dans un parcours fixe. Chaque adversaire ouvre sa chambre d’origine et conserve sa phase, son agent et ses techniques propres.'},family:{title:'E-001 FAMILY PROTOCOL',description:'Quatorze sujets de Dulvey, séparés par incarnation.'},uroboros:{title:UROBOROS.title,description:UROBOROS.description}};
  const storage='re.bow.operations.records/1';let records={},storagePort;
  try{storagePort=localStorage;}catch{storagePort={getItem(){throw Error('Stockage inaccessible')},setItem(){throw Error('Stockage inaccessible')}};}
  try{const raw=JSON.parse(storagePort.getItem(storage)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const [key,r]of Object.entries(raw)){if(/^(arcade|survival|boss|family|apex|uroboros)\|(recruit|normal|veteran|legend)$/.test(key)&&r&&Number.isInteger(r.wins)&&r.wins>=0&&r.wins<=1000000&&typeof r.name==='string'&&r.name.length<160&&F.some(f=>f.uid===r.uid))records[key]=r;}}catch{}
  const vault=RE_OPERATION_VAULT.create(storagePort,D,RE_RUNTIME_CONTRACT.digest,{family:FAMILY_IDS,apex:APEX_IDS,uroboros:UROBOROS.ids});
  let vaultHead=vault.getHead(),savingError='',importEpoch=0;
  function storageNotice(message){$('#checkpointStatus').textContent=message;}
  function showCheckpoint(){const cp=vaultHead.value;$('#resumeRun').hidden=!cp;$('#exportRun').disabled=!cp&&!volatileCheckpoint;$('#savedRun').textContent=cp?modes[cp.mode].title+' / '+F.find(f=>f.uid===cp.uid).name+' · RENCONTRE '+(cp.index+1)+' · '+Math.round(cp.health*100)+' %':'AUCUN PARCOURS SUSPENDU';
    $('#launchRunLabel').textContent=cp?'NOUVEAU PARCOURS — REMPLACER LA REPRISE':'LANCER LE PROTOCOLE';
    storageNotice(savingError||(vaultHead.recovered?'Copie de secours récupérée.':vaultHead.unavailable?'Stockage indisponible : utilisez l’export pour conserver votre parcours.':vaultHead.errors.length?vaultHead.errors.join(' / '):cp?'Dernière étape validée conservée. Un combat interrompu reprend depuis son début.':'Les étapes validées sont enregistrées automatiquement.'));
  }
  function persistCheckpoint(){if(!run)return;const value=run.finished?null:{contract:RE_RUNTIME_CONTRACT.digest,mode:run.mode,uid:run.fighter.uid,difficulty:run.difficulty,finishers:run.finishers,route:run.route.slice(),index:run.wins,wins:run.wins,health:run.health,seed:run.seed,savedAt:new Date().toISOString()};
    const result=vault.save(value);if(result.ok){vaultHead=vault.getHead();volatileCheckpoint=null;savingError='';}else{savingError=result.message;if(value){volatileCheckpoint=value;}storageNotice(savingError);}showCheckpoint();
  }
  let volatileCheckpoint=null;
  function exportCheckpoint(){if(volatileCheckpoint){const payload=volatileCheckpoint;return JSON.stringify({format:RE_OPERATION_VAULT.FORMAT,revision:0,checksum:RE_OPERATION_VAULT.checksum(JSON.stringify(payload)),payload},null,2);}return vault.exportText();}
  function importCheckpoint(text){const result=vault.importText(text);if(!result.ok)throw Error(result.message);importEpoch++;vaultHead=vault.getHead();volatileCheckpoint=null;savingError='';if(run)leave();showCheckpoint();return vaultHead.value;}
  function resumeCheckpoint(){vaultHead=vault.adopt();const cp=vaultHead.value;if(!cp){showCheckpoint();return false;}savingError='';run={...cp,fighter:F.find(f=>f.uid===cp.uid),pending:false,finished:false};openRun();return true;}
  function openRun(){importEpoch++;$('#setup').hidden=true;$('#run').hidden=false;$('#runResult').hidden=true;frame.hidden=false;updateRun();
    if(!frame.getAttribute('src')){frame.src='modules/versus.html?embed=battle';clearInterval(pingTimer);pingTimer=setInterval(()=>post('cqc-versus-ping'),500);}else if(ready)startMatch();
    $('#run').scrollIntoView({behavior:'auto'});
  }
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
    if(!run||!ready||run.pending||run.finished)return;
    const id=run.route[run.index%run.route.length],op=F.find(f=>f.uid===id);
    run.requestId='re-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);run.pending=true;run.finished=false;
    $('#runResult').hidden=true;frame.hidden=false;$('#runStatus').textContent=`Préparation : ${run.fighter.name} / ${op.name}`;updateRun();
    const stage=run.mode==='uroboros'?(S.find(x=>x.id===UROBOROS.stages[id])||S[run.index%S.length]):run.mode==='family'?(S.find(x=>x.id===(FAMILY_STAGES[id]||'baker_house'))||S[run.index%S.length]):run.mode==='apex'?(S.find(x=>x.id===APEX_STAGES[id])||S[run.index%S.length]):S[(run.index+(run.mode==='boss'?5:0))%S.length];
    post('cqc-versus-start',{config:{p1:run.fighter.uid,p2:id,stage:stage.id,mode:'cpu',rounds:1,seconds:99,difficulty:run.difficulty,aiProfile:['boss','apex','family','uroboros'].includes(run.mode)?'boss':'balanced',finishers:run.finishers,source:'re-operations',seed:(run.seed+Math.imul(run.index,2654435761))>>>0,requestId:run.requestId,match:run.index+1,route:run.mode,startHealthRatio:run.health}});
    persistCheckpoint();
    clearTimeout(waitingTimer);waitingTimer=setTimeout(()=>{if(run?.pending)$('#runStatus').textContent='Le moteur prend plus de temps à répondre. Vous pouvez revenir au menu et relancer le protocole.'},12000);
  }
  function startRun(e){
    e?.preventDefault();const mode=modeSelect.value,fighter=F.find(f=>f.uid===fighterSelect.value);
    if(!modes[mode]||!fighter)return;run={mode,fighter,difficulty:$('#runDifficulty').value,finishers:$('#runFinishers').value,route:routeFor(mode,fighter.uid),index:0,wins:0,health:1,seed:Math.floor(Math.random()*4294967296)>>>0,pending:false,finished:false};
    volatileCheckpoint=null;persistCheckpoint();openRun();
  }
  function saveRecord(){const key=run.mode+'|'+run.difficulty;const old=records[key];if(!old||run.wins>old.wins){records[key]={wins:run.wins,name:run.fighter.name,uid:run.fighter.uid,date:new Date().toISOString()};try{storagePort.setItem(storage,JSON.stringify(records))}catch{savingError='Record non enregistré : stockage indisponible.';storageNotice(savingError)}}}
  function finishResult(d){
    if(!run||!run.pending||d.requestId!==run.requestId)return;
    if(![0,1].includes(d.winnerSlot)||!Number.isFinite(d.life)||!Number.isFinite(d.maxLife)||d.maxLife<=0||d.maxLife>10000||d.life<=0||d.life>d.maxLife)return;
    const opponent=run.route[run.index%run.route.length],expectedWinner=d.winnerSlot===0?run.fighter.uid:opponent,expectedLoser=d.winnerSlot===0?opponent:run.fighter.uid;if(d.winner!==expectedWinner||d.loser!==expectedLoser)return;run.pending=false;clearTimeout(waitingTimer);const won=d.winnerSlot===0;
    if(won){run.wins++;if(run.mode==='survival')run.health=Math.min(1,Math.max(.001,Number(d.life)/Number(d.maxLife))+.12);else run.health=1;saveRecord()}
    const complete=run.mode!=='survival'&&run.index+1>=run.route.length;
    run.finished=!won||complete;persistCheckpoint();frame.hidden=true;$('#runResult').hidden=false;$('#runStatus').textContent='Résultat enregistré par le moteur de combat.';
    $('#resultEyebrow').textContent=won?'SPÉCIMEN ADVERSE NEUTRALISÉ':'RUPTURE DU PROTOCOLE';
    $('#resultTitle').textContent=!won?'CONFINEMENT ÉCHOUÉ':complete?'PROTOCOLE ACHEVÉ':'ESSAI VALIDÉ';
    $('#resultDescription').textContent=!won?`${run.wins} victoire${run.wins>1?'s':''} dans ce parcours. Un nouvel essai peut être lancé depuis la sélection.`:complete?`${run.wins} victoires avec ${run.fighter.name}. Résultat sauvegardé pour la difficulté ${run.difficulty}.`:run.mode==='survival'?`Vie récupérée après traitement : ${Math.round(run.health*100)} %. La série continue.`:`Rencontre ${run.index+1} terminée. La prochaine chambre est prête.`;
    $('#nextFight').hidden=run.finished;$('#restartRun').textContent=run.finished?'NOUVEAU PARCOURS':'RETOUR À LA SÉLECTION';updateRun();
  }
  addEventListener('message',e=>{
    if(e.source!==frame.contentWindow||(e.origin&&e.origin!==location.origin))return;const d=e.data||{};
    if(d.type==='cqc-versus-ready'){ready=true;clearInterval(pingTimer);if(run&&!run.requestId&&!run.pending&&!run.finished)startMatch()}
    if(d.type==='cqc-versus-started'&&d.requestId===run?.requestId){clearTimeout(waitingTimer);$('#runStatus').textContent='Combat actif · cliquez dans l’arène pour le clavier. F1 : techniques. Échap : pause.';frame.focus()}
    if(d.type==='cqc-versus-result')finishResult(d);if(d.type==='cqc-admin-close'&&run)leave();
    if(d.type==='cqc-versus-error'&&run?.pending&&d.requestId===run.requestId){$('#runStatus').textContent='Le combat n’a pas pu démarrer : '+d.message;run&&(run.pending=false)}
  });
  function leave(){importEpoch++;post('cqc-versus-abort');clearTimeout(waitingTimer);clearInterval(pingTimer);run=null;showCheckpoint();$('#run').hidden=true;$('#setup').hidden=false;showSetup();$('#setup').scrollIntoView({behavior:'smooth'})}
  $('#runForm').addEventListener('submit',startRun);$('#leaveRun').addEventListener('click',leave);$('#restartRun').addEventListener('click',leave);
  $('#nextFight').addEventListener('click',()=>{if(!run||run.finished||run.pending||run.wins!==run.index+1)return;run.index++;startMatch()});
  $('#resumeRun').addEventListener('click',resumeCheckpoint);
  $('#reloadCheckpoint').addEventListener('click',()=>{vaultHead=vault.adopt();savingError='';volatileCheckpoint=null;showCheckpoint();});
  $('#exportRun').addEventListener('click',()=>{try{const blob=new Blob([exportCheckpoint()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BOW_Protocol_Reprise.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){storageNotice(e.message);}});
  $('#importRun').addEventListener('change',async e=>{const token=++importEpoch,file=e.target.files?.[0];if(!file)return;try{if(file.size>RE_OPERATION_VAULT.MAX_BYTES)throw Error('Fichier trop volumineux (256 Ko maximum)');const text=await file.text();if(token!==importEpoch)return;importCheckpoint(text);}catch(err){storageNotice(err.message);}finally{e.target.value='';}});
  addEventListener('pagehide',()=>{importEpoch++;clearInterval(pingTimer);clearTimeout(waitingTimer);post('cqc-versus-pause');});
  addEventListener('storage',e=>{if(e.key?.startsWith(RE_OPERATION_VAULT.KEY+'.')){savingError='Une reprise a changé dans un autre onglet. Rechargez-la avant de remplacer le parcours.';storageNotice(savingError);}});
  window.RE_OPERATIONS={exportCheckpoint,importCheckpoint,resumeCheckpoint,peekCheckpoint:()=>vault.read(),routeFor,uroborosIds:UROBOROS.ids.slice(),uroborosStages:{...UROBOROS.stages},getState:()=>run?{mode:run.mode,index:run.index,wins:run.wins,health:run.health,seed:run.seed,difficulty:run.difficulty,finishers:run.finishers,pending:run.pending,route:run.route.slice(),requestId:run.requestId}:null,apexIds:APEX_IDS.slice(),apexStages:{...APEX_STAGES},familyIds:FAMILY_IDS.slice(),familyStages:{...FAMILY_STAGES}};
  showSetup();showCheckpoint();
})();
