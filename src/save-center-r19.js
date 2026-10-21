/* R19 — explicit, bounded, loss-aware backup of B.O.W. storage only.
 * Raw values are preserved. FNV detects accidental damage, NOT authenticity.
 * localStorage is not a transactional database: close other game tabs first.
 * No loader, replay, reward or migration is executed by this module. */
(function(root){'use strict';
 const FORMAT='re.bow.backup/1',VERSION=1,MAX_VALUE=8388608,MAX_TOTAL=12582912,MAX_FILE=33554432;
 const GROUPS=Object.freeze([
  {id:'dossiers',label:'Dossiers · progression',keys:['re.bow.chronicles055','re.bow.chronicles055.a','re.bow.chronicles055.b']},
  {id:'operations',label:'Opérations · reprise et records',keys:['re.bow.operations.checkpoint/1.a','re.bow.operations.checkpoint/1.b','re.bow.operations.records/1']},
  {id:'contexts',label:'Exercices · reprise et records',keys:['re.bow.context-journal/1.a','re.bow.context-journal/1.b','re.bow.context-journal/1.records']},
  {id:'replays',label:'Archives des replays principaux',keys:['re-bow-v048-replays']},
  {id:'conclusions',label:'Conclusions · historique et réglages',keys:['re-bow-v046-finishers','re-bow-v046-finisher-settings']},
  {id:'controls',label:'Commandes clavier',keys:['re-bow-v048-bindings']},
  {id:'dojo',label:'Dojo · réglages actuels et anciens',keys:['re-bow-v046-dojo','re-bow-v045-dojo','re-bow-v044-dojo','re-bow-v043-dojo']},
  {id:'audio',label:'Volumes audio',keys:['re.bow.audio058']}
 ].map(g=>Object.freeze({...g,keys:Object.freeze(g.keys)})));
 const KEYS=Object.freeze(GROUPS.flatMap(g=>g.keys)),known=new Set(KEYS),byGroup=new Map(GROUPS.map(g=>[g.id,g]));
 const check=(ok,text)=>{if(!ok)throw Error(text);},plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 function hash(text){const imul=Math.imul;let n=2166136261;for(let i=0;i<text.length;i++)n=imul(n^text.charCodeAt(i),16777619);return(n>>>0).toString(16).padStart(8,'0');}
 function exact(obj,keys){return plain(obj)&&Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));}
 function content(e){return JSON.stringify([e.format,e.version,e.createdAt,e.source,e.entries]);}
 function values(rows){return new Map(rows.map(e=>[e.key,e.value]));}
 function rawValid(key,raw){
  if(raw===null)return{restorable:true,state:'absent'};
  try{const data=JSON.parse(raw);if(key==='re-bow-v048-replays')check(Array.isArray(data),'collection attendue');else check(plain(data),'objet attendu');
   // Known double-slot envelopes must also have intact internal checksums.
   if(key==='re.bow.chronicles055.a'||key==='re.bow.chronicles055.b'||key.startsWith('re.bow.operations.checkpoint/1.')){
    check(Number.isInteger(data.revision)&&data.revision>=0&&Object.hasOwn(data,'payload'),'enveloppe invalide');
    check(typeof data.checksum==='string'&&data.checksum===hash(JSON.stringify(data.payload)),'empreinte interne invalide');
   }
   if(key==='re.bow.context-journal/1.a'||key==='re.bow.context-journal/1.b'){
    check(Number.isInteger(data.revision)&&data.revision>0&&Object.hasOwn(data,'value'),'enveloppe invalide');
    check(data.checksum===hash(JSON.stringify(data.value)),'empreinte interne invalide');
   }
   if(key==='re.bow.context-journal/1.records')check(plain(data.records)&&data.checksum===hash(JSON.stringify(data.records)),'empreinte du registre invalide');
   return{restorable:true,state:'copie lisible',note:'Structure extérieure lisible ; règles et contenu revalidés par le mode au chargement.'};
  }catch(_){return{restorable:false,state:'endommagé / structure inconnue',note:'Export brut conservé ; restauration de ce groupe bloquée.'};}
 }
 function validateEntries(rows){
  check(Array.isArray(rows)&&rows.length===KEYS.length,'Inventaire incomplet ou trop long.');
  let total=0;const seen=new Set();
  for(const row of rows){check(exact(row,['key','value'])&&known.has(row.key)&&!seen.has(row.key),'Clé inconnue ou répétée.');seen.add(row.key);
   check(row.value===null||typeof row.value==='string','Une valeur doit être une copie brute ou nulle.');
   if(row.value!==null){check(row.value.length<=MAX_VALUE,'Une entrée dépasse la limite.');total+=row.value.length;}
  }
  check(total<=MAX_TOTAL,'Le contenu cumulé dépasse la limite.');
 }
 function bytes(text){let n=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)n++;else if(c<2048)n+=2;else if(c>=55296&&c<=56319&&i+1<text.length&&text.charCodeAt(i+1)>=56320&&text.charCodeAt(i+1)<=57343){n+=4;i++;}else n+=3;if(n>MAX_FILE)return n;}return n;}
 function decode(text){
  check(typeof text==='string'&&text.length<=MAX_FILE&&bytes(text)<=MAX_FILE,'Archive absente ou trop volumineuse.');
  let e;try{e=JSON.parse(text);}catch(_){throw Error('Fichier JSON illisible. Aucune donnée remplacée.');}
  check(exact(e,['format','version','createdAt','source','entries','checksum'])&&e.format===FORMAT&&e.version===VERSION,'Format ou version de sauvegarde inconnu.');
  check(typeof e.createdAt==='string'&&e.createdAt.length<=40&&Number.isFinite(Date.parse(e.createdAt)),'Date de sauvegarde invalide.');
  check(typeof e.source==='string'&&e.source.length<=240,'Origine descriptive invalide.');
  validateEntries(e.entries);
  check(typeof e.checksum==='string'&&/^[0-9a-f]{8}$/.test(e.checksum)&&e.checksum===hash(content(e)),'Empreinte de transport incorrecte.');
  return e;
 }
 function encode(entries,source='B.O.W. Protocol',date=new Date().toISOString()){
  validateEntries(entries);
  const e={format:FORMAT,version:VERSION,createdAt:date,source,entries:entries.map(r=>({key:r.key,value:r.value})),checksum:''};e.checksum=hash(content(e));
  const text=JSON.stringify(e,null,2);decode(text);return text;
 }
 function describe(entries){const map=values(entries);return GROUPS.map(g=>{const rows=g.keys.map(key=>({key,chars:map.get(key)?.length||0,...rawValid(key,map.get(key))}));return{id:g.id,label:g.label,present:g.keys.filter(k=>map.get(k)!==null).length,chars:rows.reduce((n,r)=>n+r.chars,0),restorable:rows.every(r=>r.restorable),rows};});}
 function create(options={}){
  const storage=()=>typeof options.storage==='function'?options.storage():options.storage||root.localStorage,plans=new WeakMap();let busy=false;
  function read(){const s=storage();check(s&&typeof s.getItem==='function','Stockage inaccessible.');const rows=KEYS.map(key=>{const value=s.getItem(key);check(value===null||typeof value==='string','Lecture du stockage invalide.');return{key,value};});
   let size=0;for(const r of rows){check((r.value?.length||0)<=MAX_VALUE,'Entrée locale trop volumineuse : export individuel nécessaire.');size+=r.value?.length||0;}check(size<=MAX_TOTAL,'Stockage cumulé trop volumineux.');check(rows.every(r=>s.getItem(r.key)===r.value),'Stockage modifié pendant la lecture. Réessayez après fermeture des autres onglets.');return rows;}
  function snapshot(){const entries=read();return{entries,groups:describe(entries)};}
  function exportText(){return encode(read(),options.source||'B.O.W. Protocol');}
  function prepare(text,ids){
   const incoming=decode(text);check(Array.isArray(ids)&&ids.length>0&&ids.length<=GROUPS.length&&new Set(ids).size===ids.length&&ids.every(id=>byGroup.has(id)),'Choisissez au moins un groupe connu, sans doublon.');
   const im=values(incoming.entries),selected=describe(incoming.entries).filter(g=>ids.includes(g.id));
   check(selected.every(g=>g.present>0&&g.restorable),'Groupe vide, endommagé ou de structure inconnue : aucune restauration autorisée.');
   const before=read(),bm=values(before),keySet=new Set(ids.flatMap(id=>byGroup.get(id).keys)),after=before.map(r=>({key:r.key,value:keySet.has(r.key)?im.get(r.key):r.value}));
   const changes=after.filter(r=>r.value!==bm.get(r.key)).map(r=>Object.freeze({key:r.key,action:r.value===null?'retirer':bm.get(r.key)===null?'ajouter':'remplacer',beforeChars:bm.get(r.key)?.length||0,afterChars:r.value?.length||0}));
   const plan=Object.freeze({groups:Object.freeze(ids.slice()),changes:Object.freeze(changes),source:incoming.source,createdAt:incoming.createdAt});
   plans.set(plan,{before,after,backup:encode(before,options.source||'B.O.W. Protocol'),ack:false,used:false});return plan;
  }
  function entry(plan){const p=plans.get(plan);check(p&&!p.used,'Aperçu absent, périmé ou déjà utilisé.');return p;}
  function backup(plan){return entry(plan).backup;}
  function acknowledge(plan,text){const p=entry(plan);check(text===p.backup,'Copie de sécurité différente de l’état prévisualisé.');p.ack=true;return true;}
  function cancel(plan){const p=plans.get(plan);if(p)p.used=true;}
  function apply(plan,confirmed=false){
   const p=entry(plan);check(p.ack&&confirmed===true,'Exportez la copie de sécurité et confirmez le remplacement.');check(!busy,'Une restauration est déjà en cours.');p.used=true;busy=true;
   const written=[],before=values(p.before),expected=values(p.before);let recovery=[];
   const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
   function verify(){const now=read();check(now.every(r=>r.value===expected.get(r.key)),'Stockage modifié depuis l’aperçu : opération interrompue.');}
   try{
    verify();
    for(const row of p.after){if(row.value===before.get(row.key))continue;verify();written.push(row);const s=storage();if(row.value===null)s.removeItem(row.key);else s.setItem(row.key,row.value);check(s.getItem(row.key)===row.value,'Écriture non confirmée.');expected.set(row.key,row.value);}
    check(same(read(),p.after),'État final non confirmé.');return{ok:true,state:'restored',changed:written.length,message:'Copie locale restaurée. Rechargez les modes concernés ; ils vérifieront leurs propres formats et règles.'};
   }catch(error){
    // Never overwrite a value from another writer while trying to roll back.
    for(const row of written.slice().reverse())try{const s=storage(),current=s.getItem(row.key),old=before.get(row.key);if(current===old)continue;check(current===row.value,'Modification extérieure conservée.');if(old===null)s.removeItem(row.key);else s.setItem(row.key,old);check(s.getItem(row.key)===old,'Retour non confirmé.');}catch(_){recovery.push(row.key);}
    return{ok:false,state:recovery.length?'recovery-required':written.length?'rolled-back':'refused',changed:written.length,recovery,backup:p.backup,message:recovery.length?'Restauration incomplète : retour de sécurité impossible pour certaines clés. Conservez la copie avant restauration.':'Restauration refusée ou annulée ; les écritures de cette tentative ont été retirées.',detail:String(error.message||error)};
   }finally{busy=false;}
  }
  return Object.freeze({snapshot,exportText,prepare,backup,acknowledge,cancel,apply});
 }
 root.RE_SAVE_CENTER=Object.freeze({FORMAT,VERSION,GROUPS,KEYS,MAX_VALUE,MAX_TOTAL,MAX_FILE,hash,decode,encode,describe,create});
})(globalThis);
