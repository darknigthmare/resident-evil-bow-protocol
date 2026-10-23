/* CQC v0.60 — observateur d'entraînement. Aucun contrôle, temps ou dégât simulé ici. */
(function(root){'use strict';
const VERSION='0.60', SPECIALS=['special','specialDown','specialForward','specialBack'];
const LABEL={light:'LÉGER',heavy:'LOURD',low:'BAS + LÉGER',throw:'SAISIE',special:'TECHNIQUE',specialDown:'BAS + TECHNIQUE',specialForward:'AVANT + TECHNIQUE',specialBack:'ARRIÈRE + TECHNIQUE',super:'SUPER',utility:'RESSOURCE'};
const num=n=>Number.isFinite(n)?n:0;
const copy=x=>JSON.parse(JSON.stringify(x));
const total=s=>Object.values(s.metrics||{}).reduce((n,v)=>n+Math.max(0,num(v)),0);
const actor=(s,p)=>p===1?s.b:s.a;
function attack(a){return a?{id:a.id,name:a.name,t:num(a.t),confirmed:!!a.confirmed, startup:num(a.def?.startup),active:num(a.def?.active),recovery:num(a.def?.recovery)}:null;}
function take(p){return {uid:p.f.uid,slot:p.slot,life:p.life,r:p.r,max:p.f.combat.resource.max,hit:num(p.hit),blockstun:num(p.blockstun),cool:num(p.cool),onGround:!!p.onGround,attack:attack(p.attack),chainDepth:num(p.chainDepth)};}
function normalize(input){input=input||{};return {left:!!input.left,right:!!input.right,down:!!input.down,guard:!!input.guard,jump:!!input.jump,dash:!!input.dash,tech:!!input.tech,slot:typeof input.slot==='string'?input.slot:null};}
function capture(s,input,player=0){const p=player===1?1:0;return {frame:s.frame,round:s.round,player:p,eventCount:total(s),self:take(actor(s,p)),opponent:take(actor(s,1-p)),input:normalize(input),freeResource:!!s.options?.freeResource};}
function catalog(f){const moves=f?.combat?.moves||{},res=f?.combat?.resource||{},throws=Object.keys(moves).filter(k=>moves[k].level==='throw'&&moves[k].damage>0),technical=SPECIALS.filter(k=>moves[k]?.damage>0),utility=Object.keys(moves).filter(k=>['reload','recover'].includes(moves[k].kind));
 const low=Object.keys(moves).find(k=>moves[k].level==='low'&&moves[k].damage>0);
 const close=throws.length?{id:'throw',title:'Réussir une projection',slots:throws,instruction:'À portée, toucher avec une véritable projection. Une saisie déchoppée ne valide rien.',command:throws.map(k=>LABEL[k]||k).join(' / ')}:{id:'low',title:'Toucher avec une attaque basse',slots:low?[low]:[],instruction:'Ce profil ne possède pas de projection dans ses règles de combat. Faire toucher son attaque basse.',command:low?LABEL[low]||low:'INDISPONIBLE'};
 return [
  {id:'impact',title:'Confirmer un coup',slots:['light','heavy','low'].filter(k=>moves[k]?.damage>0),instruction:'Faire toucher un léger, un lourd ou un coup bas. Un coup arrêté par la garde ne compte pas.',command:'LÉGER / LOURD / BAS + LÉGER',dummy:'idle'},
  {id:'guard',title:'Arrêter une attaque',slots:[],instruction:'Face à une attaque du mannequin CPU, garder. Pour une attaque basse, maintenir aussi BAS. Le contact sur la garde valide cet exercice.',command:'GARDE · BAS contre une attaque basse',dummy:'cpu'},
  {...close,dummy:'idle'},
  {id:'technique',title:'Faire toucher une technique',slots:technical,instruction:'Faire toucher une technique offensive du profil. Le démarrage, un buff et un tir qui passe à côté ne suffisent pas.',command:technical.map(k=>LABEL[k]).join(' / '),dummy:'idle'},
  {id:'resource',title:res.kind==='ammo'?'Recharger après un tir':['heat','cost'].includes(res.kind)?'Réduire la charge accumulée':'Récupérer sa ressource',slots:utility,instruction:'Dépenser '+(res.label||'la ressource')+', puis achever '+utility.map(k=>moves[k].name).join(' / ')+'. La jauge doit réellement évoluer. Désactiver la ressource libre.',command:utility.map(k=>LABEL[k]||k).join(' / '),dummy:'idle'},
  {id:'punish',title:'Toucher pendant une récupération',slots:[],instruction:'Laisser le CPU finir les images actives d’une attaque, puis le toucher avant la fin de sa récupération. Le contact doit être mesuré pendant cette fenêtre.',command:'COUP après les images actives adverses',dummy:'cpu'}
 ].map(x=>({...x,available:x.id==='guard'||x.id==='punish'||x.slots.length>0,done:false,evidence:null}));
}
function command(i){const direction=(i.down?'↓':'')+(i.left&&!i.right?'←':i.right&&!i.left?'→':'');return [direction,i.guard?'GARDE':'',i.jump?'SAUT':'',i.dash?'DASH':'',i.slot?LABEL[i.slot]||i.slot:i.tech?'DÉCHOPE':''].filter(Boolean).join(' + ')||'NEUTRE';}
function create({player=0,historyLimit=10,sequenceIdle=90}={}){
 player=player===1?1:0;historyLimit=Math.max(4,Math.min(20,Math.floor(num(historyLimit)||10)));sequenceIdle=Math.max(45,Math.min(180,Math.floor(num(sequenceIdle)||90)));
 let stateRef=null,actorRef=null,cursor=0,frame=-1,round=0,paused=false,enabled=false,exercises=[],selected='impact',history=[],current=null,last=null,lastMove=null,diagnostic=null,combo=0,comboLive=false,gap=false,resource=null,fighter=null,opponent=null;
 function end(reason,at){if(current){current.endFrame=at;current.reason=reason;last=current;current=null;}combo=0;comboLive=false;}
 function reset(s){stateRef=s;actorRef=actor(s,player);cursor=total(s);frame=s.frame;round=s.round;paused=false;enabled=!!s.options?.training;fighter=actorRef.f;opponent=actor(s,1-player).f;exercises=catalog(fighter);selected=exercises.some(e=>e.id===selected)?selected:'impact';history=[];current=null;last=null;lastMove=null;diagnostic=null;combo=0;comboLive=false;gap=false;readResource(s);return describe();}
 function readResource(s){const p=actor(s,player),r=p.f.combat.resource;resource={label:r.label,kind:r.kind,value:p.r,max:r.max,free:!!s.options.freeResource};}
 function begin(at){if(!current)current={startFrame:at,endFrame:null,lastActivityFrame:at,started:0,hits:0,blocked:0,damage:0,chip:0,comboMax:0,moves:[],reason:null};return current;}
 function complete(id,e,details={}){const q=exercises.find(x=>x.id===id);if(q&&q.available&&!q.done){q.done=true;q.evidence={frame:e.frame,type:e.type,...details};}}
 function addInput(input,s,events,before){const i=normalize(input),label=command(i),previous=history[history.length-1];let entry=previous;
  if(!previous||previous.command!==label){entry={frame:s.frame,endFrame:s.frame,frames:1,command:label,slot:i.slot,status:label==='NEUTRE'?'neutre':'reçu',move:i.slot?fighter.combat.moves[i.slot]?.name||null:null,reason:null};history.push(entry);if(history.length>historyLimit)history.shift();}
  else {entry.endFrame=s.frame;entry.frames++;}
  if(!i.slot)return;
  const started=events.find(e=>e.type==='start'&&e.actor===player&&e.slot===i.slot),denied=events.find(e=>e.type==='denied'&&e.actor===player);
  if(started){entry.status='démarré';diagnostic=null;return;}
  if(denied){entry.status='refusé';entry.reason=String(denied.why||'Commande refusée');diagnostic={frame:s.frame,kind:'engine',message:entry.reason};return;}
  if(!before)return;
  const p=before.self;let why=null;
  if(p.hit>1)why='Commande reçue pendant l’étourdissement d’un impact adverse.';
  else if(p.blockstun>1)why='Commande reçue pendant la récupération de la garde.';
  else if(p.cool>1)why='Commande reçue pendant une récupération encore active.';
  else if(p.attack){const a=p.attack,links=fighter.combat.links||[],legal=a.confirmed&&links.some(l=>l[0]===a.name&&l[1]===i.slot)&&p.chainDepth<2&&a.t>=a.startup&&a.t<a.startup+a.active+12;if(!legal)why='Le mouvement précédent n’autorise pas cette annulation à cette image.';}
  if(why){entry.status='indisponible';entry.reason=why;diagnostic={frame:s.frame,kind:'state',message:why};}
 }
 function pause(on,s=stateRef){const changed=paused!==!!on;paused=!!on;if(s){cursor=total(s);frame=s.frame;readResource(s);}if(changed){end('pause',s?.frame??frame);history=[];diagnostic=null;gap=false;}return describe();}
 function observe(s,{input=null,before=null,paused:pauseOption}={}){
  if(!s?.a?.f?.combat||!s?.b?.f?.combat)return describe();
  if(!stateRef||s!==stateRef||actor(s,player)!==actorRef||s.round!==round||s.frame<frame||total(s)<cursor)return reset(s);
  if(typeof pauseOption==='boolean'&&pauseOption!==paused)pause(pauseOption,s);
  readResource(s);enabled=!!s.options?.training;
  const count=total(s),list=s.events||[],first=count-list.length;
  if(paused||!enabled||s.phase!=='fight'||s.finished){cursor=count;frame=s.frame;return describe();}
  if(s.frame===frame&&count===cursor)return describe();
  gap=cursor<first||s.frame>frame+1;
  if(gap){end('observation interrompue',frame);history=[];}
  const events=list.slice(Math.max(0,cursor-first));cursor=count;
  const validBefore=before&&before.player===player&&before.frame===s.frame-1&&before.round===s.round&&before.self?.uid===fighter.uid&&before.opponent?.uid===opponent.uid&&before.eventCount>=first&&before.eventCount<=count?before:null;
  // Un intervalle non observé ne permet pas d'affirmer une continuité de combo.
  if(!validBefore||!comboLive||validBefore.opponent.hit<=1){combo=0;comboLive=false;}
  addInput(input||validBefore?.input,s,events,validBefore);
  let absorbedContact=false;
  for(const e of events){
   if(['armor','reactive'].includes(e.type)&&e.actor===1-player)absorbedContact=true;
   if(e.type==='roundReset'){reset(s);return describe();}
   if(e.type==='denied'&&e.actor===player)diagnostic={frame:e.frame,kind:'engine',message:String(e.why||'Commande refusée')};
   if(e.type==='start'&&e.actor===player){const q=begin(e.frame),m=fighter.combat.moves[e.slot];q.started++;q.lastActivityFrame=e.frame;if(q.moves.length<12)q.moves.push(m?.name||e.name||e.slot);lastMove=m?{slot:e.slot,name:m.name,startup:m.startup,active:m.active,recovery:m.recovery,cost:num(m.cost),meter:num(m.meter)}:null;}
   if(e.type==='block'&&e.actor===player)complete('guard',e,{level:e.level,chip:num(e.damage)});
   if((e.type==='reload'||e.type==='recover')&&e.actor===player&&validBefore&&!s.options.freeResource&&!validBefore.freeResource){const r=fighter.combat.resource,change=(actor(s,player).r-validBefore.self.r)*(['heat','cost'].includes(r.kind)?-1:1);if(change>.001)complete('resource',e,{amount:change,resource:r.label,before:validBefore.self.r,after:actor(s,player).r});}
   if(e.type!=='damage'||e.actor!==player||e.target!==1-player||!(e.amount>0))continue;
   const q=begin(e.frame),m=fighter.combat.moves[e.slot];q.lastActivityFrame=e.frame;
   if(e.blocked){q.blocked++;q.chip+=e.amount;continue;}
   q.hits++;q.damage+=e.amount;if(!comboLive)combo=0;combo++;q.comboMax=Math.max(q.comboMax,combo);if(!absorbedContact)comboLive=true;absorbedContact=false;
   if(['light','heavy','low'].includes(e.slot))complete('impact',e,{slot:e.slot,amount:e.amount});
   if(m?.level==='throw')complete('throw',e,{slot:e.slot,amount:e.amount});
   if(m?.level==='low')complete('low',e,{slot:e.slot,amount:e.amount});
   if(SPECIALS.includes(e.slot))complete('technique',e,{slot:e.slot,amount:e.amount});
   const a=validBefore?.opponent.attack;
   // action() avance d'une image puis retire l'attaque à la fin de recovery.
   // Seule une attaque encore présente dans cette fenêtre autorise le terme « récupération ».
   if(a&&a.t+1>=a.startup+a.active&&a.t+1<a.startup+a.active+a.recovery&&validBefore.opponent.hit<=1&&!events.some(x=>x.type==='confirmCancel'&&x.actor===1-player))complete('punish',e,{slot:e.slot,enemyMove:a.name,enemyFrame:a.t+1,recoveryStart:a.startup+a.active,recoveryEnd:a.startup+a.active+a.recovery,amount:e.amount});
  }
  if(actor(s,1-player).hit<=0){combo=0;comboLive=false;}
  if(current&&!actor(s,player).attack&&s.frame-current.lastActivityFrame>=sequenceIdle)end('repos',s.frame);
  frame=s.frame;return describe();
 }
 function select(id){if(exercises.some(e=>e.id===id))selected=id;return describe();}
 function describe(){const goals=exercises.map(e=>({...e,available:e.available&&!(e.id==='resource'&&resource?.free),hint:e.id==='resource'&&resource?.free?'Désactiver « Ressource libre » pour mesurer une récupération.':null}));return copy({version:VERSION,enabled,paused,player,frame,round,fighter:fighter?{uid:fighter.uid,name:fighter.name}:null,resource,history,currentSequence:current,lastSequence:last,lastMove,diagnostic:diagnostic&&frame-diagnostic.frame<=180?diagnostic:null,combo,selected,exercises:goals,completed:goals.filter(e=>e.done).length,total:goals.length,observationGap:gap,sequenceIdle,sequenceLabel:'Dégâts et impacts de la séquence ; combo = impacts sans sortie de l’étourdissement observée.'});}
 return Object.freeze({reset,observe,pause,select,describe});
}
function draw(ctx,description,{x=24,y=618,width=1232,height=78}={}){if(!ctx||!description?.enabled)return;const d=description,seq=d.currentSequence||d.lastSequence,goal=d.exercises.find(e=>e.id===d.selected);const fit=(text,max)=>{text=String(text||'');while(text.length>3&&ctx.measureText(text).width>max)text=text.slice(0,-2);return text;};ctx.save();ctx.fillStyle='#06120eee';ctx.fillRect(x,y,width,height);ctx.strokeStyle='#577967';ctx.strokeRect(x,y,width,height);ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='700 12px Arial, DejaVu Sans, sans-serif';ctx.fillStyle='#e7d599';ctx.fillText(fit('DOJO · '+d.completed+'/'+d.total+' · '+(goal?.title||'Entraînement')+(d.paused?' · PAUSE':''),width-24),x+12,y+20);ctx.fillStyle='#e5eee5';ctx.fillText(fit(seq?seq.hits+' IMPACTS · '+seq.damage+' DÉGÂTS · COMBO '+seq.comboMax+' · '+seq.blocked+' SUR GARDE / '+seq.chip+' GRATTÉS':'Faire toucher une attaque pour mesurer la séquence.',width-24),x+12,y+41);ctx.fillStyle=d.diagnostic?'#f0b48c':'#9fc6b2';ctx.font='11px Arial, DejaVu Sans, sans-serif';ctx.fillText(fit(d.diagnostic?.message||d.history.slice(-6).map(e=>e.command+(e.frames>1?' ['+e.frames+' i]':'')).join('  ›  '),width-24),x+12,y+62);ctx.restore();}
const api=Object.freeze({version:VERSION,create,capture,catalog,draw,labels:Object.freeze({...LABEL})});root.CQC_DOJO_060=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
