/* Experimental-duel recordings: replay real inputs and CPU from a fresh match.
 * No trusted imported health, paths, profile objects, or campaign result channel.
 * Integrity checksum detects corruption, not cheating by a hostile local user. */
(function(root){
'use strict';
const SCHEMA='re.bow.catalog-duel-replay/1',MAX_FRAMES=36000,MAX_BYTES=1048576;
const FLAGS=['left','right','down','guard','jump','dash','tech'];
const AI=Object.freeze({profile:'balanced',reaction:14,aggression:1.2});
const clone=x=>JSON.parse(JSON.stringify(x)),C=()=>root.CQCCombat060,D=()=>root.RE_DATA;
function keys(v,expected,label){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==expected.length||expected.some(k=>!Object.prototype.hasOwnProperty.call(v,k)))throw Error(label+' : structure inattendue.');
}
function integer(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(label+' hors limites.');return v;}
function contract(){const c=root.RE_CATALOG_REPLAY_CONTRACT;if(!c||typeof c.digest!=='string'||!/^[a-f0-9]{64}$/.test(c.digest))throw Error('Contrat de replay absent.');return c.digest;}
function setup(v){
 keys(v,['uid','target','stage','mode','seed'],'Configuration');
 for(const k of ['uid','target'])if(typeof v[k]!=='string'||!D().fighters.some(f=>f.uid===v[k]))throw Error('Sujet inconnu : '+k+'.');
 if(typeof v.stage!=='string'||!D().stages.some(s=>s.id===v.stage))throw Error('Arène inconnue.');
 if(!['human','cpu'].includes(v.mode))throw Error('Mode de contrôle inconnu.');
 integer(v.seed,0,0xffffffff,'Graine');
 return{uid:v.uid,target:v.target,stage:v.stage,mode:v.mode,seed:v.seed};
}
function fresh(cfg){return C().create(D().fighters.find(f=>f.uid===cfg.uid),D().fighters.find(f=>f.uid===cfg.target),{skipIntro:true,seed:cfg.seed,rounds:1,seconds:99});}
function encode(input={}){
 let mask=0;FLAGS.forEach((k,n)=>{if(input[k]===true)mask|=1<<n;});
 const slot=input.slot==null?-1:C().SLOTS.indexOf(input.slot);
 if(input.slot!=null&&slot<0)throw Error('Commande inconnue.');return[mask,slot];
}
function decode(mask,slot){const i=C().empty();FLAGS.forEach((k,n)=>i[k]=!!(mask&(1<<n)));i.slot=slot<0?null:C().SLOTS[slot];return i;}
function advance(s,cfg,mask,slot){
 const a=cfg.mode==='cpu'?C().cpu(s,s.a,s.b,AI):decode(mask,slot);
 const b=C().cpu(s,s.b,s.a,AI);C().step(s,[a,b]);
}
// Include RNG, CPU memory, collisions, resources and transient effects. Omit only
// immutable fighter definitions, already covered by the compatibility contract.
function seal(s){
 const actor=p=>{const{f,...rest}=p;return{uid:f.uid,...rest};};
 const str=JSON.stringify({...s,a:actor(s.a),b:actor(s.b)});let h=2166136261;
 for(let n=0;n<str.length;n++){h^=str.charCodeAt(n);h=Math.imul(h,16777619);}
 return(h>>>0).toString(16).padStart(8,'0');
}
function create(value){
 const cfg=setup(value),s=fresh(cfg),runs=[];let frames=0,overflow=false;
 function step(input){
  if(s.finished)return s;
  const[mask,slot]=cfg.mode==='cpu'?[0,-1]:encode(input);advance(s,cfg,mask,slot);
  if(frames<MAX_FRAMES){const tail=runs.at(-1);if(tail&&tail[1]===mask&&tail[2]===slot)tail[0]++;else runs.push([1,mask,slot]);}else overflow=true;
  frames++;return s;
 }
 function exportValue(){if(overflow)throw Error('Limite de dix minutes dépassée ; duel conservé, export indisponible.');return{schema:SCHEMA,contract:contract(),setup:clone(cfg),frames,runs:clone(runs),stateDigest:seal(s)};}
 return Object.freeze({step,getState:()=>s,getSetup:()=>clone(cfg),exportValue,frames:()=>frames,canExport:()=>!overflow});
}
function validate(input){
 let v=input;
 if(typeof input==='string'){if(new TextEncoder().encode(input).length>MAX_BYTES)throw Error('Fichier trop volumineux.');try{v=JSON.parse(input);}catch{throw Error('JSON illisible.');}}
 keys(v,['schema','contract','setup','frames','runs','stateDigest'],'Replay');
 if(v.schema!==SCHEMA)throw Error('Format de replay inconnu.');
 if(v.contract!==contract())throw Error('Replay incompatible : utiliser sa version de combat et son annexe d’origine.');
 const cfg=setup(v.setup);integer(v.frames,0,MAX_FRAMES,'Durée');
 if(typeof v.stateDigest!=='string'||!/^[0-9a-f]{8}$/.test(v.stateDigest))throw Error('Empreinte invalide.');
 if(!Array.isArray(v.runs)||v.runs.length>v.frames)throw Error('Séquence invalide.');
 let total=0;const runs=v.runs.map(run=>{
  if(!Array.isArray(run)||run.length!==3)throw Error('Bloc de commandes invalide.');
  const count=integer(run[0],1,MAX_FRAMES,'Longueur'),mask=integer(run[1],0,127,'Commandes'),slot=integer(run[2],-1,9,'Technique');
  total+=count;if(total>v.frames)throw Error('Durée incohérente.');
  if(cfg.mode==='cpu'&&(mask!==0||slot!==-1))throw Error('Commandes humaines dans un replay IA.');return[count,mask,slot];
 });
 if(total!==v.frames)throw Error('Séquence tronquée.');
 const s=fresh(cfg);for(const[count,mask,slot]of runs)for(let n=0;n<count;n++){if(s.finished)throw Error('Commandes après la fin du duel.');advance(s,cfg,mask,slot);}
 if(seal(s)!==v.stateDigest)throw Error('Le résultat ne correspond pas à la relecture des commandes.');
 return{schema:SCHEMA,contract:v.contract,setup:cfg,frames:v.frames,runs,stateDigest:v.stateDigest};
}
function createPlayer(input){
 const v=validate(input);let s=fresh(v.setup),frame=0,index=0,offset=0;
 function tick(count=1){integer(count,0,MAX_FRAMES,'Avance');for(let n=0;n<count&&frame<v.frames;n++){const r=v.runs[index];advance(s,v.setup,r[1],r[2]);frame++;if(++offset===r[0]){index++;offset=0;}}return s;}
 function seek(target){integer(target,0,v.frames,'Position');if(target<frame){s=fresh(v.setup);frame=index=offset=0;}return tick(target-frame);}
 return Object.freeze({tick,seek,getState:()=>s,getSetup:()=>clone(v.setup),frame:()=>frame,length:()=>v.frames,ended:()=>frame>=v.frames,exportValue:()=>clone(v)});
}
root.RE_CATALOG_REPLAY=Object.freeze({SCHEMA,MAX_FRAMES,MAX_BYTES,create,validate,createPlayer});
})(globalThis);
