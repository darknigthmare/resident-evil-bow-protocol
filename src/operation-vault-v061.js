/* Versioned checkpoints. Integrity checks detect damaged local writes, not cheating.
 * No network, no execution of imported content, no mutation of story save slots. */
(function(root){'use strict';
const KEY='re.bow.operations.checkpoint/1', FORMAT='re.bow.operation-slot/1', MAX_BYTES=262144;
const MODES=['arcade','survival','boss','family','apex','uroboros'], DIFFICULTY=['recruit','normal','veteran','legend'];
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const requireValue=(ok,msg)=>{if(!ok)throw Error(msg);};
const int=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const clone=x=>JSON.parse(JSON.stringify(x));
function checksum(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
function validate(raw,data,contract,fixed){
 if(raw===null)return null;
 requireValue(plain(raw),'Point de reprise invalide');
 requireValue(raw.contract===contract,'Règles de combat différentes : reprise conservée mais incompatible');
 const known=new Set(data.fighters.map(f=>f.uid));
 requireValue(MODES.includes(raw.mode)&&known.has(raw.uid),'Protocole ou spécimen inconnu');
 requireValue(DIFFICULTY.includes(raw.difficulty)&&['off','stylized','cinematic'].includes(raw.finishers),'Réglages de reprise invalides');
 requireValue(Array.isArray(raw.route)&&raw.route.length>=1&&raw.route.length<=data.fighters.length&&raw.route.every(id=>known.has(id)),'Adversaires inconnus');
 const expected=fixed?.[raw.mode];
 if(expected)requireValue(JSON.stringify(raw.route)===JSON.stringify(expected),'Ordre du protocole fixe incompatible');
 else{
  const n=raw.mode==='arcade'?8:raw.mode==='boss'?Math.min(10,data.fighters.filter(f=>f.uid!==raw.uid&&f.boss).length):Math.max(8,data.fighters.length-1);
  requireValue(raw.route.length===n&&!raw.route.includes(raw.uid),'Parcours aléatoire incompatible');
  requireValue(new Set(raw.route).size===raw.route.length,'Adversaire répété');
  if(raw.mode==='boss')requireValue(raw.route.every(id=>data.fighters.find(f=>f.uid===id).boss),'Adversaire non boss');
 }
 requireValue(int(raw.index,0,raw.mode==='survival'?1000000:raw.route.length-1)&&raw.wins===raw.index,'Victoires ou étape incohérentes');
 requireValue(Number.isFinite(raw.health)&&raw.health>0&&raw.health<=1,'Vie de reprise invalide');
 requireValue(raw.mode==='survival'||raw.health===1,'Vie incompatible avec ce protocole');
 requireValue(int(raw.seed,0,4294967295),'Graine de simulation invalide');
 requireValue(typeof raw.savedAt==='string'&&raw.savedAt.length<=40&&Number.isFinite(Date.parse(raw.savedAt)),'Date de reprise invalide');
 return{contract,mode:raw.mode,uid:raw.uid,difficulty:raw.difficulty,finishers:raw.finishers,route:raw.route.slice(),index:raw.index,wins:raw.wins,health:raw.health,seed:raw.seed,savedAt:raw.savedAt};
}
function create(storage,data,contract,fixed){
 function decode(text){requireValue(typeof text==='string'&&text.length<=MAX_BYTES,'Fichier absent ou trop volumineux');const e=JSON.parse(text);requireValue(plain(e)&&e.format===FORMAT&&int(e.revision,0,1000000000),'Format de reprise incompatible');requireValue(e.checksum===checksum(JSON.stringify(e.payload)),'Copie de reprise endommagée');return{revision:e.revision,signature:e.checksum,value:validate(e.payload,data,contract,fixed)};}
 function read(){const found=[],errors=[];let unavailable=false;
  for(const slot of ['a','b']){let text;try{text=storage.getItem(KEY+'.'+slot);}catch(e){unavailable=true;errors.push('Stockage inaccessible');continue;}if(text)try{found.push({...decode(text),slot});}catch(e){errors.push(e.message);}}
  found.sort((a,b)=>b.revision-a.revision);
  return{value:found[0]?.value??null,revision:found[0]?.revision||0,signature:found[0]?.signature||null,slot:found[0]?.slot||null,recovered:!!found.length&&errors.length>0,unavailable,errors};
 }
 let head=read();
 function save(raw){
  const value=validate(raw,data,contract,fixed),latest=read();
  if(latest.revision!==head.revision||latest.signature!==head.signature)return{ok:false,reason:'conflict',message:'Un autre onglet a enregistré une reprise. Elle n’a pas été écrasée.'};
  const revision=head.revision+1;requireValue(revision<=1000000000,'Révision maximale atteinte');
  const text=JSON.stringify({format:FORMAT,revision,checksum:checksum(JSON.stringify(value)),payload:value});
  // Preserve the only known-good copy even when recovering a damaged slot.
  const slot=head.slot==='a'?'b':'a';
  try{storage.setItem(KEY+'.'+slot,text);requireValue(storage.getItem(KEY+'.'+slot)===text,'Écriture non confirmée');const saved=decode(text);head={...saved,slot,recovered:false,unavailable:false,errors:[]};return{ok:true,...clone(head)};}
  catch(e){return{ok:false,reason:'storage',message:'Reprise non enregistrée : '+String(e.message||e)};}
 }
 function adopt(){head=read();return clone(head);}
 function exportText(){requireValue(head.value!==null,'Aucune reprise disponible');return JSON.stringify({format:FORMAT,revision:head.revision,checksum:checksum(JSON.stringify(head.value)),payload:head.value},null,2);}
 function importText(text){const incoming=decode(text);requireValue(incoming.value!==null,'Ce fichier ne contient pas de parcours à reprendre');return save(incoming.value);}
 return Object.freeze({read,save,adopt,exportText,importText,decode,getHead:()=>clone(head)});
}
root.RE_OPERATION_VAULT=Object.freeze({create,validate,checksum,KEY,FORMAT,MAX_BYTES});
})(typeof window==='undefined'?globalThis:window);
