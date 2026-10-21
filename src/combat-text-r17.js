/* R17 — read-only event descriptions, not dialogue subtitles or canon evidence.
 * No audio dependency, wall clock, DOM, storage, RNG or game writes. */
(function(root){'use strict';
 const HISTORY=60,PENDING=60,TTL=180;
 const clean=(v,n=64)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,n):'';
 const integer=v=>Number.isSafeInteger(v)&&v>=0;
 function create(){
  let enabled=false,owner=null,lastFrame=-1,cursor=0,revision=0,lastAnnouncement=-1,serial=0,skipped=0;
  let history=[],pending=new Map(),counts={},context={},lastKind='off',announcements=0;
  const total=s=>{let n=0;for(const v of Object.values(s.metrics||{})){if(!integer(v))return null;n+=v;}return integer(n)?n:null;};
  const actor=(s,id)=>id===0?s.a:id===1?s.b:null;
  const name=(s,id)=>{const p=actor(s,id);return p?'J'+(id+1)+' · '+clean(p.f.name,45):'DUEL';};
  const move=(s,event)=>clean(actor(s,event.actor)?.f?.combat?.moves?.[event.slot]?.name,72);
  function push(s,event,type,text,important=false){
   counts[type]=(counts[type]||0)+1;
   const previous=history.at(-1),key=event.actor+'|'+type+'|'+text,frame=integer(event.frame)?event.frame:s.frame;
   if(previous?.key===key&&frame>=previous.lastFrame&&frame-previous.lastFrame<=12){previous.count++;previous.lastFrame=frame;}
   else {history.push({id:++serial,key,type,actor:event.actor,frame,lastFrame:frame,count:1,text:name(s,event.actor)+' : '+text});if(history.length>HISTORY)history.shift();}
   revision++;
   if(important&&!context.paused&&!context.intro&&!context.hidden&&context.speed===1&&s.frame-lastFrame<=6){lastAnnouncement=serial;announcements++;}
  }
  function describe(s,e){
   const m=move(s,e),target=e.target===0||e.target===1?' → '+name(s,e.target):'';
   switch(e.type){
    case 'activate':if(!['projectile','trap','reload','recover','heal','detonate'].includes(e.kind))push(s,e,'action','Action engagée'+(m?' — '+m:''));break;
    case 'projectile':push(s,e,'shot','Tir émis'+(m?' — '+m:''));break;
    case 'damage':if(!e.blocked)push(s,e,'hit',(e.weakpoint?'Point faible touché':'Impact confirmé')+target+(integer(e.amount)?' · '+e.amount+' dégâts':''));break;
    case 'block':push(s,e,'block','Coup bloqué'+(integer(e.damage)?' · '+e.damage+' dégâts subis malgré la garde':''));break;
    case 'parry':push(s,e,'parry','Parade confirmée'+target);break;
    case 'guardBreak':push(s,{...e,actor:e.actor===0?1:e.actor===1?0:-1},'guard-break','Garde rompue',true);break;
    case 'trapPlaced':push(s,e,'placed','Dispositif posé'+(m?' — '+m:''));break;
    case 'deviceArmed':push(s,e,'armed','Dispositif armé');break;
    case 'trapDestroyed':push(s,e,'destroyed','Dispositif adverse détruit');break;
    case 'projectileDestroyed':push(s,e,'destroyed','Projectile adverse détruit');break;
    case 'explosion':push(s,e,'explosion','Explosion déclenchée');break;
    case 'detonator':if(e.count===0)push(s,e,'empty','Aucune charge armée à déclencher');break;
    case 'deviceRetired':push(s,e,'retired','Dispositif retiré'+(e.cause==='capacity'?' — limite atteinte':e.cause==='owner-ko'?' — propriétaire neutralisé':''));break;
    case 'heal':if(e.amount>0)push(s,e,'heal','Vie réellement restaurée · '+Math.round(e.amount));break;
    case 'reload':push(s,e,'reload','Rechargement effectué');break;
    case 'recover':push(s,e,'resource','Ressource récupérée');break;
    case 'mark':push(s,e,'mark','Cible marquée'+target);break;
    case 'poison':push(s,e,'status','Empoisonnement appliqué'+target);break;
    case 'burn':push(s,e,'status','Brûlure appliquée'+target);break;
    case 'shock':case 'emp':push(s,e,'status','Choc appliqué'+target);break;
    case 'slow':push(s,e,'status','Ralentissement appliqué'+target);break;
    case 'denied':push(s,e,'denied','Commande refusée'+({energy:' — ressource insuffisante',meter:' — jauge insuffisante',busy:' — action en cours',airborne:' — corps en l’air'}[e.why]||''));break;
    case 'roundEnd':push(s,{...e,actor:e.winner},'round',e.winner===-1?'Manche nulle':'Manche remportée',true);break;
    case 'matchEnd':push(s,{...e,actor:s.winner},'result',s.winner===-1?'Duel nul':'Duel remporté',true);break;
    // Start/reservations, damage-over-time ticks, extra blast/weakpoint bookkeeping
    // and unknown events deliberately do not invent dialogue or duplicate cues.
   }
  }
  function observe(model={}){
   context={paused:!!model.paused,intro:!!model.intro,hidden:!!model.hidden,speed:model.speed===undefined?1:model.speed};
   const s=model.state,n=s&&total(s);
   if(!s?.a?.f||!s?.b?.f||!integer(s.frame)||n===null||!Array.isArray(s.events)){owner=null;history=[];pending.clear();lastKind='idle';revision++;return view();}
   if(owner!==s||s.frame<lastFrame||n<cursor){owner=s;cursor=n;lastFrame=s.frame;history=[];pending.clear();lastAnnouncement=-1;serial=0;counts={};skipped=0;revision++;}
   if(!enabled){cursor=n;lastFrame=s.frame;pending.clear();lastKind='off';return view();}
   lastKind=context.hidden?'hidden':context.intro?'intro':s.finished?'finished':context.paused?'paused':context.speed!==1?'speed':'running';
   if(context.hidden||context.intro){cursor=n;lastFrame=s.frame;pending.clear();return view();}
   const raw=s.events.slice(-180),first=n-raw.length+1;
   if(cursor<first-1){skipped+=first-1-cursor;pending.clear();revision++;}
   for(let i=0;i<raw.length;i++){
    const sequence=first+i,e=raw[i];if(sequence<=cursor||!e||!integer(e.frame)||e.frame>s.frame)continue;
    if(e.type==='projectile'){
     const d=actor(s,e.actor)?.f.combat?.moves?.[e.slot],q=s.projectiles?.find(q=>q.id===e.id);
     if((e.index>0&&d?.interval>0)||(q?.delay>0)){if(integer(e.id))pending.set(e.id,{event:{...e},due:e.frame+(e.index||0)*(d?.interval||0)});}
     else describe(s,e);
    }else if(e.type==='burstRelease'){
     const p=pending.get(e.id);if(p){describe(s,{...p.event,frame:e.frame});pending.delete(e.id);}
    }else{
     if(e.type==='burstCancelled')pending.delete(e.id);
     if(e.type==='explosion'&&pending.has(e.id)){describe(s,{...pending.get(e.id).event,frame:e.frame});pending.delete(e.id);}
     describe(s,e);
    }
   }
   for(const[id,p]of pending){const q=s.projectiles?.find(q=>q.id===id);if(q&&!q.scheduled&&q.age>0){describe(s,{...p.event,frame:p.due});pending.delete(id);}else if(!q)pending.delete(id);}
   while(pending.size>PENDING)pending.delete(pending.keys().next().value);
   cursor=n;lastFrame=s.frame;return view();
  }
  function view(){const visible=enabled&&lastKind!=='hidden'&&lastKind!=='intro';const items=history.map(({key,...x})=>({...x,label:x.text+(x.count>1?' ×'+x.count:'')}));return{enabled,mode:lastKind,frame:lastFrame,revision,session:owner?.a?.f.uid+'/'+owner?.b?.f.uid,history:items,overlay:visible?items.filter(x=>lastFrame-x.lastFrame<=TTL).slice(-2):[],announcement:items.find(x=>x.id===lastAnnouncement)||null,announcementCount:announcements,skipped,pending:pending.size,totals:{...counts}};}
  function configure(on){if(enabled===!!on)return view();enabled=!!on;history=[];pending.clear();lastAnnouncement=-1;revision++;lastKind=enabled?'ready':'off';return view();}
  function clear(){history=[];lastAnnouncement=-1;revision++;return view();}
  function reset(){owner=null;history=[];pending.clear();counts={};cursor=0;lastFrame=-1;skipped=0;lastAnnouncement=-1;revision++;return view();}
  return Object.freeze({observe,configure,clear,reset,view});
 }
 root.RE_COMBAT_TEXT=Object.freeze({create,limits:Object.freeze({history:HISTORY,pending:PENDING,overlay:2,lifetimeTicks:TTL}),scope:'Descriptions originales des événements du moteur. Aucun dialogue ou son officiel transcrit.'});
})(globalThis);
