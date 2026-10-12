/* Local rehearsal journal. It cannot award campaign wins. Checksums detect damage,
 * not cheating; restoration REPLAYS inputs instead of trusting imported health. */
(function(root){'use strict';
const K=root.RE_CONTEXT_TRIAL,E=root.RE_CATALOG_EXPANSION,KEY='re.bow.context-journal/1',FORMAT='re.bow.context-checkpoint/1',MAX_BYTES=65536,MAX_ACTIONS=181;
const clone=x=>JSON.parse(JSON.stringify(x)),plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),check=(v,m)=>{if(!v)throw Error(m);};
function hash(text){let h=2166136261;for(let n=0;n<text.length;n++)h=Math.imul(h^text.charCodeAt(n),16777619);return(h>>>0).toString(16).padStart(8,'0');}
const rules=()=>root.RE_CONTEXT_CONTRACT?.digest||K.rules+'|'+E.digest;
function createSession(id){
 const record=E.records.find(r=>r.id===id&&r.encounter);check(record,'Dossier contextuel inconnu.');
 const trial=K.create(record),actions=[];
 function act(action){const f=trial.snapshot().frame,ok=trial.act(action);if(ok){check(actions.length<MAX_ACTIONS,'Journal trop long.');actions.push([f,action]);}return ok;}
 function checkpoint(){const s=trial.snapshot();return{format:FORMAT,contract:rules(),id,frame:s.frame,actions:clone(actions),stateHash:hash(JSON.stringify(s))};}
 return Object.freeze({act,tick:n=>trial.tick(n),snapshot:trial.snapshot,unavailableReason:trial.unavailableReason,checkpoint});
}
function restore(value){
 check(plain(value)&&value.format===FORMAT,'Format de session inconnu.');check(value.contract===rules(),'Session conservée mais règles incompatibles.');
 check(Number.isInteger(value.frame)&&value.frame>=0&&value.frame<=K.maxFrames,'Frame de reprise invalide.');
 check(Array.isArray(value.actions)&&value.actions.length<=MAX_ACTIONS,'Liste de commandes trop longue.');check(typeof value.stateHash==='string'&&/^[0-9a-f]{8}$/.test(value.stateHash),'Empreinte d’état absente.');
 let last=-20;
 for(const row of value.actions){check(Array.isArray(row)&&row.length===2&&Number.isInteger(row[0])&&row[0]>=last+20&&row[0]<=value.frame&&K.actions.includes(row[1]),'Chronologie de commandes invalide.');last=row[0];}
 const session=createSession(value.id);
 for(const [frame,action] of value.actions){const before=session.snapshot();check(!before.finished,'Commande après la fin de l’essai.');session.tick(frame-before.frame);check(session.snapshot().frame===frame&&!session.snapshot().finished,'Commande hors de la simulation.');check(session.act(action),'Commande impossible dans le replay.');}
 session.tick(value.frame-session.snapshot().frame);check(session.snapshot().frame===value.frame,'Frame terminale incohérente.');check(session.checkpoint().stateHash===value.stateHash,'État de reprise différent : fichier endommagé ou incompatible.');return session;
}
function decode(text){check(typeof text==='string'&&text.length<=MAX_BYTES,'Fichier absent ou trop volumineux.');const value=JSON.parse(text);restore(value);return value;}
function createVault(storage){
 const available=()=>{if(storage)return storage;try{return root.localStorage;}catch(e){throw Error('Stockage inaccessible');}};
 function read(){const found=[],errors=[];for(const slot of ['a','b'])try{const raw=available().getItem(KEY+'.'+slot);if(!raw)continue;check(raw.length<=MAX_BYTES+2048,'Copie trop volumineuse.');const e=JSON.parse(raw);check(plain(e)&&Number.isInteger(e.revision)&&e.revision>0&&e.revision<1e9,'Révision invalide.');check(e.checksum===hash(JSON.stringify(e.value)),'Copie endommagée.');restore(e.value);found.push({...e,slot});}catch(e){errors.push(String(e.message));}found.sort((a,b)=>b.revision-a.revision);return{...found[0],value:found[0]?.value||null,revision:found[0]?.revision||0,checksum:found[0]?.checksum||null,slot:found[0]?.slot||null,errors,recovered:!!found.length&&!!errors.length};}
 let head=read();
 function save(value){
  restore(value);const current=read();if(current.revision!==head.revision||current.checksum!==head.checksum)return{ok:false,reason:'conflict',message:'Un autre onglet a modifié la reprise. Rechargez sa copie avant de la remplacer.'};
  const envelope={revision:head.revision+1,checksum:hash(JSON.stringify(value)),value:clone(value)},text=JSON.stringify(envelope),slot=head.slot==='a'?'b':'a';
  try{check(envelope.revision<1e9,'Révision maximale atteinte.');available().setItem(KEY+'.'+slot,text);check(available().getItem(KEY+'.'+slot)===text,'Écriture non confirmée.');head={...envelope,slot,errors:[],recovered:false};return{ok:true,revision:head.revision};}catch(e){return{ok:false,reason:'storage',message:'Session non sauvegardée : '+e.message};}
 }
 function adopt(){head=read();return clone(head);}
 function importText(text){return save(decode(text));}
 // Completion records are isolated and capped to known contextual IDs.
 function readRecords(){try{const raw=available().getItem(KEY+'.records');if(!raw)return{};check(raw.length<=32768,'Registre trop long');const env=JSON.parse(raw);check(env.contract===rules()&&env.checksum===hash(JSON.stringify(env.records)),'Registre incompatible');const out={};for(const [id,v] of Object.entries(env.records)){check(E.records.some(r=>r.id===id&&r.encounter)&&plain(v)&&Number.isInteger(v.frame)&&v.frame>=0&&v.frame<=K.maxFrames&&Number.isFinite(v.health)&&v.health>0&&v.health<=100,'Record invalide');out[id]={frame:v.frame,health:v.health};}return out;}catch(e){return{};}}
 function record(value){const session=restore(value),s=session.snapshot();if(s.outcome!=='success')return{ok:false,reason:'not-success'};const records=readRecords(),old=records[s.id];if(old&&old.frame<=s.frame&&old.health>=s.health)return{ok:true,unchanged:true,count:Object.keys(records).length};records[s.id]={frame:old?Math.min(old.frame,s.frame):s.frame,health:old?Math.max(old.health,s.health):s.health};const text=JSON.stringify({contract:rules(),checksum:hash(JSON.stringify(records)),records});try{available().setItem(KEY+'.records',text);check(available().getItem(KEY+'.records')===text,'Écriture non confirmée');return{ok:true,count:Object.keys(records).length};}catch(e){return{ok:false,reason:'storage',message:'Record non sauvegardé : '+e.message};}}
 return Object.freeze({read,save,adopt,importText,readRecords,record});
}
root.RE_CONTEXT_JOURNAL=Object.freeze({createSession,restore,decode,createVault,hash,KEY,FORMAT,MAX_BYTES});
})(globalThis);
