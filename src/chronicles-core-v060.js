/* Pure story progression and save validation. No DOM, no network. */
(function(global){'use strict';
const schema='re.bow.chronicles.save/1',phases=new Set(['intro','pre','fight','post','defeat','outro','finished']);
const settings=()=>({text:24,motion:true,auto:false,audio:false,combatAudio:false,soundMaster:.28,soundEffects:.72,soundAmbience:.12,difficulty:'normal',rounds:1,finishers:'stylized',eraHud:true,noFlash:true});
function fresh(data){return{schema,selected:data.fighters[0].uid,favorites:[],introSeen:[],unlocked:[],records:{},seen:{},active:null,settings:settings()};}
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k),int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
function ensure(ok,m){if(!ok)throw Error(m);}
function checkSettings(v){const s=settings();ensure(v&&typeof v==='object'&&!Array.isArray(v),'Options invalides');ensure([22,24,28,32].includes(v.text),'Taille de texte invalide');s.text=v.text;for(const k of ['motion','auto','audio','eraHud','noFlash']){ensure(typeof v[k]==='boolean','Option invalide : '+k);s[k]=v[k]}for(const k of ['combatAudio'])if(v[k]!==undefined){ensure(typeof v[k]==='boolean','Option invalide : '+k);s[k]=v[k];}for(const k of ['soundMaster','soundEffects','soundAmbience'])if(v[k]!==undefined){ensure(Number.isFinite(v[k])&&v[k]>=0&&v[k]<=1,'Volume invalide : '+k);s[k]=v[k];}ensure(['recruit','normal','veteran','legend'].includes(v.difficulty),'Difficulté invalide');s.difficulty=v.difficulty;ensure([1,2,3].includes(v.rounds),'Manches invalides');s.rounds=v.rounds;ensure(['off','stylized','cinematic'].includes(v.finishers),'Finishers invalides');s.finishers=v.finishers;return s;}
function valid(data,raw){ensure(raw&&typeof raw==='object'&&raw.schema===schema,'Schéma incompatible');const out=fresh(data),known=u=>typeof u==='string'&&own(data.stories,u);ensure(known(raw.selected),'Personnage inconnu');out.selected=raw.selected;
 for(const field of ['favorites','introSeen','unlocked']){ensure(Array.isArray(raw[field])&&raw[field].length<=data.fighters.length,'Liste invalide : '+field);ensure(raw[field].every(known),'Référence inconnue : '+field);ensure(new Set(raw[field]).size===raw[field].length,'Doublon : '+field);out[field]=raw[field].slice()}
 if(raw.seen!==undefined){ensure(raw.seen&&typeof raw.seen==='object'&&!Array.isArray(raw.seen),'Journal de lecture invalide');ensure(Object.keys(raw.seen).length<=data.fighters.length,'Journal de lecture trop grand');for(const [uid,keys]of Object.entries(raw.seen)){ensure(known(uid)&&out.introSeen.includes(uid)&&Array.isArray(keys),'Référence de lecture invalide');const story=data.stories[uid],allowed=new Set([...story.intro.map((_,i)=>'intro:'+i),...story.outro.map((_,i)=>'outro:'+i),...story.route.flatMap((_,i)=>['pre:'+i,'post:'+i])]);ensure(keys.length<=allowed.size&&new Set(keys).size===keys.length&&keys.every(k=>typeof k==='string'&&allowed.has(k)),'Scène lue inconnue');ensure(!keys.some(k=>k.startsWith('outro:'))||out.unlocked.includes(uid),'Lecture d’un épilogue verrouillé');out.seen[uid]=keys.slice();}}
 out.settings=checkSettings(raw.settings);ensure(raw.records&&typeof raw.records==='object'&&!Array.isArray(raw.records),'Historique invalide');ensure(Object.keys(raw.records).length<=data.fighters.length,'Historique trop grand');for(const [uid,r]of Object.entries(raw.records)){ensure(known(uid)&&r&&int(r.clears,1,9999)&&int(r.bestContinues,0,3),'Historique incohérent');out.records[uid]={clears:r.clears,bestContinues:r.bestContinues};}ensure(out.unlocked.every(u=>own(out.records,u)&&out.introSeen.includes(u)),'Épilogue sans parcours terminé');ensure(Object.keys(out.records).every(u=>out.unlocked.includes(u)),'Parcours terminé sans épilogue');
 if(raw.active!==null){const a=raw.active;ensure(a&&known(a.uid)&&phases.has(a.phase),'Parcours inconnu');ensure(int(a.index,0,7)&&int(a.won,0,8)&&int(a.continues,0,3)&&int(a.spent,0,3)&&a.continues+a.spent===3,'Compteurs de parcours invalides');ensure(int(a.page,0,['intro','outro'].includes(a.phase)?data.stories[a.uid][a.phase].length-1:0),'Page de reprise invalide');const expected=['outro','finished'].includes(a.phase)?8:a.phase==='post'?a.index+1:a.index;ensure(a.won===expected,'Victoires de parcours incohérentes');ensure(!['outro','finished'].includes(a.phase)||a.index===7,'Épilogue avant le dernier duel');ensure(!['outro','finished'].includes(a.phase)||out.unlocked.includes(a.uid),'Épilogue verrouillé');ensure(out.introSeen.includes(a.uid),'Parcours sans prologue');ensure(a.phase!=='intro'||a.index===0,'Prologue après le début des combats');ensure(Array.isArray(a.results)&&a.results.length===a.won,'Journal de combats incohérent');const results=a.results.map((r,i)=>{ensure(r.opponent===data.stories[a.uid].route[i].opponent&&int(r.life,0,100)&&int(r.seconds,0,99),'Résultat de combat invalide');return {opponent:r.opponent,life:r.life,seconds:r.seconds};});out.active={uid:a.uid,index:a.index,won:a.won,phase:a.phase,page:a.page,continues:a.continues,spent:a.spent,rules:checkSettings(a.rules),results};}
 return out;
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function begin(data,profile,uid){ensure(own(data.stories,uid),'Personnage absent');const p=clone(profile);p.selected=uid;if(!p.introSeen.includes(uid))p.introSeen.push(uid);p.active={uid,index:0,won:0,phase:'intro',page:0,continues:3,spent:0,results:[],rules:clone(p.settings)};return p;}
function markRead(data,profile,uid,phase,index){
 if(!own(data.stories,uid)||!['intro','outro','pre','post'].includes(phase))return profile;
 const key=phase+':'+index,known=profile.seen?.[uid]||[];
 if(known.includes(key))return profile;
 const limit=['intro','outro'].includes(phase)?data.stories[uid][phase].length:data.stories[uid].route.length;
 ensure(int(index,0,limit-1)&&profile.introSeen.includes(uid),'Scène lue invalide');
 ensure(phase!=='outro'||profile.unlocked.includes(uid),'Épilogue verrouillé');
 const p=clone(profile);p.seen??={};p.seen[uid]=[...known,key];return p;
}
function next(data,profile){const p=clone(profile),a=p.active;if(!a)return p;switch(a.phase){case'intro':if(a.page<data.stories[a.uid].intro.length-1)a.page++;else{a.page=0;a.phase='pre'}break;case'pre':a.phase='fight';break;case'post':if(a.index<7){a.index++;a.phase='pre'}else{a.phase='outro';a.page=0}break;case'defeat':if(a.continues){a.continues--;a.spent++;a.phase='pre'}else p.active=null;break;case'outro':if(a.page<data.stories[a.uid].outro.length-1)a.page++;else{a.phase='finished';a.page=0}break;case'finished':p.active=null;break;}return p;}
function result(data,profile,{winner,loser,life=0,maxLife=100,seconds=0}){const p=clone(profile),a=p.active;ensure(a&&a.phase==='fight','Aucun duel à terminer');const enemy=data.stories[a.uid].route[a.index].opponent;ensure((winner===a.uid&&loser===enemy)||(winner===enemy&&loser===a.uid),'Duel reçu incompatible');if(winner===a.uid){a.won++;a.results.push({opponent:enemy,life:Math.round(Math.max(0,Math.min(100,Number(life)/Math.max(1,Number(maxLife))*100)))||0,seconds:Math.max(0,Math.min(99,Math.ceil(Number(seconds))))||0});a.phase='post';if(a.index===7){if(!p.unlocked.includes(a.uid))p.unlocked.push(a.uid);const r=p.records[a.uid];p.records[a.uid]={clears:Math.min(9999,(r?.clears||0)+1),bestContinues:Math.min(r?.bestContinues??3,a.spent)};}}else a.phase='defeat';return p;}
function checkpoint(data,p){const out=valid(data,p);if(out.active?.phase==='fight')out.active.phase='pre';return out;}
function readScenes(data,profile,uid){
 if(!own(data.stories,uid)||!profile.introSeen.includes(uid))return [];
 const story=data.stories[uid],known=new Set(profile.seen?.[uid]||[]),rows=[];
 const add=(phase,index,title,text)=>{const key=phase+':'+index;if(known.has(key)&&(phase!=='outro'||profile.unlocked.includes(uid)))rows.push({key,phase,index,title,text});};
 story.intro.forEach((card,i)=>add('intro',i,'Prologue '+(i+1)+' · '+card.title,card.text));
 story.route.forEach((match,i)=>{add('pre',i,'Duel '+(i+1)+' · '+match.label,match.before+'\n\n'+match.challenge);add('post',i,'Après le duel '+(i+1)+' · '+match.label,match.after);});
 story.outro.forEach((card,i)=>add('outro',i,'Épilogue '+(i+1)+' · '+card.title,card.text));
 return rows;
}
function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
function envelope(data,p,revision){ensure(int(revision,0,1e9),'Révision locale invalide');p=valid(data,p);const content=JSON.stringify(p);return JSON.stringify({format:'re.bow.save-slot/1',revision,checksum:checksum(content),payload:p});}
function readSlot(data,text){const x=JSON.parse(text);ensure(x.format==='re.bow.save-slot/1'&&int(x.revision,0,1e9),'Sauvegarde locale incompatible');ensure(x.checksum===checksum(JSON.stringify(x.payload)),'Sauvegarde locale endommagée');return{revision:x.revision,payload:valid(data,x.payload)};}
function loadSlots(data,storage,key){
 const found=[],errors=[],unavailable=[];
 for(const slot of ['a','b']){
  let txt;try{txt=storage.getItem(key+'.'+slot);}catch(e){errors.push(slot);unavailable.push(slot);continue;}
  if(txt)try{found.push({...readSlot(data,txt),slot});}catch(e){errors.push(slot);}
 }
 found.sort((a,b)=>b.revision-a.revision);
 return{profile:found.length?checkpoint(data,found[0].payload):fresh(data),revision:found[0]?.revision||0,recovered:!!(found.length&&errors.length),errors,unavailable:unavailable.length>0,slots:found.map(x=>x.slot),signature:found.length?checksum(JSON.stringify(found[0].payload)):null};
}
const api={schema,settings,fresh,validate:valid,begin,markRead,next,result,checkpoint,readScenes,checksum,envelope,readSlot,loadSlots};global.CQC60_CORE=global.CQC58_CORE=global.CQC57_CORE=global.CQC56_CORE=global.CQC55_CORE=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
