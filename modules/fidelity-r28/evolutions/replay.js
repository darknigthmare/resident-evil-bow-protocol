/* R28 replay schema records explicit optional mutations separately from inputs.
 * Reconstructs fresh combat and CPU; never imports health, profiles or rewards. */
(function(root){'use strict';
 const E=root.RE_EVOLUTIONS_R28,C=root.CQCCombat060,SCHEMA='re.bow.evolution-duel-replay/1';
 const MAX_FRAMES=36000,MAX_BYTES=4194304,FLAGS=['left','right','down','guard','jump','dash','tech'];
 const AI=Object.freeze({profile:'balanced',reaction:14,aggression:1.2}),clone=v=>JSON.parse(JSON.stringify(v));
 function keys(v,expected,label){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==expected.length||expected.some(k=>!Object.prototype.hasOwnProperty.call(v,k)))throw Error(label+' : structure inattendue.');}
 function integer(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(label+' hors limites.');return v;}
 function contract(){const d=root.RE_EVOLUTION_CONTRACT_R28?.digest;if(typeof d!=='string'||!/^[a-f0-9]{64}$/.test(d))throw Error('Contrat de replay R28 absent.');return d;}
 function setup(v){
  keys(v,['uid','target','stage','mode','seed'],'Configuration');
  for(const k of ['uid','target'])if(typeof v[k]!=='string'||!root.RE_DATA.fighters.some(f=>f.uid===v[k]))throw Error('Sujet inconnu : '+k+'.');
  if(typeof v.stage!=='string'||!root.RE_DATA.stages.some(s=>s.id===v.stage))throw Error('Arène inconnue.');
  if(!['human','cpu'].includes(v.mode))throw Error('Mode de contrôle inconnu.');integer(v.seed,0,0xffffffff,'Graine');
  return{uid:v.uid,target:v.target,stage:v.stage,mode:v.mode,seed:v.seed};
 }
 function fresh(cfg){
  const s=E.create(root.RE_DATA.fighters.find(f=>f.uid===cfg.uid),root.RE_DATA.fighters.find(f=>f.uid===cfg.target),{skipIntro:true,seed:cfg.seed,rounds:1,seconds:99});
  s.a.ai=cfg.mode==='cpu';s.b.ai=true;return s;
 }
 function encode(input={}){let mask=0;for(let n=0;n<FLAGS.length;n++)if(input[FLAGS[n]]===true)mask|=1<<n;const slot=input.slot==null?-1:C.SLOTS.indexOf(input.slot);if(input.slot!=null&&slot<0)throw Error('Commande inconnue.');return[mask,slot];}
 function decode(mask,slot){const input=C.empty();FLAGS.forEach((k,n)=>input[k]=!!(mask&(1<<n)));input.slot=slot<0?null:C.SLOTS[slot];return input;}
 function advance(s,cfg,mask,slot,evoA,evoB){
  const a=cfg.mode==='cpu'?C.cpu(s,s.a,s.b,AI):decode(mask,slot),b=C.cpu(s,s.b,s.a,AI);
  if(evoA!==null)a.evolve=evoA;if(evoB!==null)b.evolve=evoB;return E.step(s,[a,b]);
 }
 function seal(s){
  const actor=p=>{const{f,...rest}=p;return{uid:f.uid,...rest};};
  const str=JSON.stringify({...s,a:actor(s.a),b:actor(s.b)});let h=2166136261;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');
 }
 function create(value){
  const cfg=setup(value),s=fresh(cfg),runs=[];let frames=0,overflow=false;
  function step(input){
   if(s.finished)return s;
   const[mask,slot]=cfg.mode==='cpu'?[0,-1]:encode(input),[evoA,evoB]=E.commands(s);
   advance(s,cfg,mask,slot,evoA,evoB);
   if(frames<MAX_FRAMES){const tail=runs.at(-1);if(tail&&tail[1]===mask&&tail[2]===slot&&tail[3]===evoA&&tail[4]===evoB)tail[0]++;else runs.push([1,mask,slot,evoA,evoB]);}else overflow=true;
   frames++;return s;
  }
  function exportValue(){
   if(overflow)throw Error('Limite de dix minutes dépassée ; duel conservé, export indisponible.');
   const value={schema:SCHEMA,contract:contract(),setup:clone(cfg),frames,runs:clone(runs),stateDigest:seal(s)};
   if(new TextEncoder().encode(JSON.stringify(value)).length>MAX_BYTES)throw Error('Replay trop volumineux.');return value;
  }
  return Object.freeze({step,requestEvolution:(slot,to)=>E.request(s,slot,to),cancelEvolution:()=>E.cancel(s),getState:()=>s,getSetup:()=>clone(cfg),exportValue,frames:()=>frames,canExport:()=>!overflow});
 }
 function validate(input){
  let value=input;
  if(typeof input==='string'){if(new TextEncoder().encode(input).length>MAX_BYTES)throw Error('Fichier trop volumineux.');try{value=JSON.parse(input);}catch{throw Error('JSON illisible.');}}
  else{let text;try{text=JSON.stringify(input);}catch{throw Error('Replay illisible.');}if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Fichier trop volumineux.');}
  keys(value,['schema','contract','setup','frames','runs','stateDigest'],'Replay');
  if(value.schema!==SCHEMA)throw Error('Format de replay R28 inconnu.');
  if(value.contract!==contract())throw Error('Replay incompatible : utiliser le moteur et le graphe R28 d’origine.');
  const cfg=setup(value.setup);integer(value.frames,0,MAX_FRAMES,'Durée');
  if(typeof value.stateDigest!=='string'||!/^[a-f0-9]{8}$/.test(value.stateDigest))throw Error('Empreinte invalide.');
  if(!Array.isArray(value.runs)||value.runs.length>value.frames)throw Error('Séquence invalide.');
  let total=0;const runs=value.runs.map(run=>{
   if(!Array.isArray(run)||run.length!==5)throw Error('Bloc de commandes invalide.');
   const count=integer(run[0],1,MAX_FRAMES,'Longueur'),mask=integer(run[1],0,127,'Commandes'),slot=integer(run[2],-1,9,'Technique');
   const mutations=run.slice(3);for(const uid of mutations)if(uid!==null&&(typeof uid!=='string'||uid.length>100||!root.RE_EVOLUTION_DATA_R28.edges.some(e=>e.to===uid&&e.playable!==false)))throw Error('Évolution inconnue.');
   if(cfg.mode==='cpu'&&(mask!==0||slot!==-1))throw Error('Commandes humaines dans un replay IA.');
   total+=count;if(total>value.frames)throw Error('Durée incohérente.');return[count,mask,slot,...mutations];
  });
  if(total!==value.frames)throw Error('Séquence tronquée.');
  const s=fresh(cfg);for(const[count,mask,slot,a,b]of runs)for(let n=0;n<count;n++){if(s.finished)throw Error('Commandes après la fin du duel.');advance(s,cfg,mask,slot,a,b);}
  if(seal(s)!==value.stateDigest)throw Error('Le résultat ne correspond pas aux commandes et évolutions rejouées.');
  return{schema:SCHEMA,contract:value.contract,setup:cfg,frames:value.frames,runs,stateDigest:value.stateDigest};
 }
 function createPlayer(input){
  const value=validate(input);let s=fresh(value.setup),frame=0,index=0,offset=0;
  function tick(count=1){integer(count,0,MAX_FRAMES,'Avance');for(let n=0;n<count&&frame<value.frames;n++){const r=value.runs[index];advance(s,value.setup,r[1],r[2],r[3],r[4]);frame++;if(++offset===r[0]){index++;offset=0;}}return s;}
  function seek(target){integer(target,0,value.frames,'Position');if(target<frame){s=fresh(value.setup);frame=index=offset=0;}return tick(target-frame);}
  return Object.freeze({tick,seek,getState:()=>s,getSetup:()=>clone(value.setup),frame:()=>frame,length:()=>value.frames,ended:()=>frame>=value.frames,exportValue:()=>clone(value)});
 }
 root.RE_EVOLUTION_REPLAY_R28=Object.freeze({SCHEMA,MAX_FRAMES,MAX_BYTES,create,validate,createPlayer,seal});
})(globalThis);
