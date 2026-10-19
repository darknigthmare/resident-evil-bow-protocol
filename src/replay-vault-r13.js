/* Bounded main-replay recording and loss-aware local persistence.
 * Existing JSON stays byte-for-byte intact unless an explicit successful write
 * is possible. No campaign, context or experimental storage key is touched.
 * This is local storage, not a cloud backup or atomic multi-tab database. */
(function(root){'use strict';
 const KEY='re-bow-v048-replays',MAX_FRAMES=216000,MAX_RUNS=80000,MAX_RECORD_CHARS=4194304,MAX_ARCHIVE_CHARS=8388608;
 const clone=v=>JSON.parse(JSON.stringify(v));
 function recorder(options={}){
  const bound=(n,max)=>Number.isInteger(n)&&n>0&&n<=max?n:max;
  const limit=bound(options.maxFrames,MAX_FRAMES),runsLimit=bound(options.maxRuns,MAX_RUNS),runs=[];let frames=0,reason='';
  function append(pair){
   if(reason)return false;
   if(!Array.isArray(pair)||pair.length!==2||pair.some(p=>!Array.isArray(p)||p.length!==2||!Number.isInteger(p[0])||p[0]<0||p[0]>127||!Number.isInteger(p[1])||p[1]<0||p[1]>10))throw Error('Commandes non enregistrables.');
   if(frames>=limit){reason='frame-limit';return false;}
   const a=pair[0],b=pair[1],last=runs.at(-1),same=last&&last[1]===a[0]&&last[2]===a[1]&&last[3]===b[0]&&last[4]===b[1];
   if(!same&&runs.length>=runsLimit){reason='run-limit';return false;}
   if(same)last[0]++;else runs.push([1,a[0],a[1],b[0],b[1]]);frames++;return true;
  }
  return Object.freeze({append,exportRuns:()=>clone(runs),status:()=>({frames,runs:runs.length,complete:!reason,reason,maxFrames:limit,maxRuns:runsLimit})});
 }
 function validateRecord(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.id!=='string'||!value.id||value.id.length>180||!value.meta||typeof value.meta!=='object'||Array.isArray(value.meta)||!Array.isArray(value.frames))throw Error('Structure de replay invalide.');
  let frames=0;if(!value.frames.length||value.frames.length>MAX_FRAMES)throw Error('Durée de replay invalide.');
  for(const r of value.frames){if(!Array.isArray(r)||r.length!==5||!r.every(Number.isInteger)||r[0]<1||r[1]<0||r[1]>127||r[3]<0||r[3]>127||r[2]<0||r[2]>10||r[4]<0||r[4]>10)throw Error('Commandes du replay invalides.');frames+=r[0];if(frames>MAX_FRAMES)throw Error('Replay trop long.');}
  const text=JSON.stringify(value);if(text.length>MAX_RECORD_CHARS)throw Error('Replay trop volumineux.');return{value:JSON.parse(text),text,frames};
 }
 function create(options={}){
  const getStorage=options.storage||(()=>root.localStorage),pending=new Map();let pendingChars=0,writeStatus={state:'idle',message:''};
  const notify=()=>options.onChange?.(status());
  function read(){
   let raw=null;try{raw=getStorage().getItem(KEY);if(raw===null)return{ok:true,raw:null,items:[]};if(typeof raw!=='string'||raw.length>MAX_ARCHIVE_CHARS)return{ok:false,raw,items:[],reason:'oversize'};
    const data=JSON.parse(raw);if(!Array.isArray(data))throw Error('array');const ids=new Set();for(const r of data){validateRecord(r);if(ids.has(r.id))throw Error('duplicate');ids.add(r.id);}return{ok:true,raw,items:data};
   }catch(error){return{ok:false,raw,items:[],reason:raw===null?'unavailable':'corrupt'};}
  }
  function retain(item){
   if(pending.has(item.value.id))return true;
   if(pending.size>=5||pendingChars+item.text.length>MAX_ARCHIVE_CHARS)return false;
   pending.set(item.value.id,item);pendingChars+=item.text.length;return true;
  }
  function release(id){const item=pending.get(id);if(item){pendingChars-=item.text.length;pending.delete(id);}}
  function status(){const r=read();return{readable:r.ok,readError:r.reason||null,stored:r.items.length,pending:pending.size,pendingChars,canCapture:pending.size<5&&pendingChars<=MAX_ARCHIVE_CHARS-MAX_RECORD_CHARS,lastWrite:{...writeStatus}};}
  function report(state,message,record,retained){writeStatus={state,message,id:record?.id||null,retained:!!retained};notify();return{...writeStatus,persisted:state==='saved'};}
  function save(value){
   const item=validateRecord(value),r=read();
   const existing=r.items.find(x=>x.id===item.value.id);
   if(existing&&JSON.stringify(existing)===item.text){release(item.value.id);return report('saved','Replay présent dans les archives locales.',item.value,false);}
   const retained=retain(item);
   if(existing)return report('conflict','Identifiant déjà utilisé : aucune ancienne entrée remplacée. Exportez le replay en mémoire.',item.value,retained);
   if(!r.ok)return report(r.reason,'Archive illisible ou stockage indisponible : rien écrasé. Exportez la copie en mémoire.',item.value,retained);
   if(r.items.length>=30)return report('full','Archives pleines (30) : aucune suppression automatique. Exportez puis retirez une entrée choisie.',item.value,retained);
   const text=JSON.stringify([item.value,...r.items]);if(text.length>MAX_ARCHIVE_CHARS)return report('full','Archives trop volumineuses : replay conservé en mémoire, export manuel nécessaire.',item.value,retained);
   try{
    const storage=getStorage();if(storage.getItem(KEY)!==r.raw)return report('conflict','Archive modifiée pendant la sauvegarde : réessayez, rien remplacé.',item.value,retained);
    storage.setItem(KEY,text);const check=read();
    if(!check.ok||!check.items.some(x=>x.id===item.value.id&&JSON.stringify(x)===item.text))return report('unverified','Écriture non confirmée : gardez un export du replay en mémoire.',item.value,retained);
    release(item.value.id);return report('saved','Replay enregistré localement. Ce stockage n’est pas une sauvegarde cloud.',item.value,false);
   }catch(error){return report('unavailable','Échec de sauvegarde (quota ou accès refusé) : replay en mémoire, export disponible.',item.value,retained);}
  }
  function list(){const r=read(),map=new Map(r.items.map(x=>[x.id,{record:x,persisted:true}]));for(const[id,item]of pending)if(!map.has(id))map.set(id,{record:item.value,persisted:false});return [...map.values()].map(x=>({record:clone(x.record),persisted:x.persisted}));}
  function remove(id){
   const r=read();if(!r.ok)return report('unavailable','Suppression refusée : archive actuelle illisible, sauvegarde brute conservée.');
   const items=r.items.filter(x=>x.id!==id);try{const st=getStorage();if(st.getItem(KEY)!==r.raw)return report('conflict','Archive modifiée : suppression annulée.');if(items.length!==r.items.length)st.setItem(KEY,JSON.stringify(items));const check=read();if(!check.ok||check.items.some(x=>x.id===id))return report('unverified','Suppression non confirmée.');release(id);return report('removed','Entrée choisie retirée ; autres replays et sauvegardes conservés.');}catch(_){return report('unavailable','Suppression impossible : aucune confirmation de suppression.');}
  }
  function clear(){try{const st=getStorage();st.removeItem(KEY);if(st.getItem(KEY)!==null)return report('unverified','Effacement non confirmé.');pending.clear();pendingChars=0;return report('removed','Archives de replays effacées explicitement. Autres clés intactes.');}catch(_){return report('unavailable','Effacement refusé par le stockage. Archives en mémoire conservées.');}}
  function retry(id){const r=pending.get(id);if(!r)return report('missing','Aucun replay en attente pour cet identifiant.');return save(r.value);}
  function rawBackup(){const r=read();if(r.raw===null&&!r.ok)throw Error('Le navigateur refuse la lecture du stockage.');return r.raw===null?'[]':r.raw;}
  return Object.freeze({save,list,remove,clear,retry,status,rawBackup,canCapture:()=>status().canCapture});
 }
 root.RE_REPLAY_VAULT=Object.freeze({KEY,MAX_FRAMES,MAX_RUNS,MAX_RECORD_CHARS,MAX_ARCHIVE_CHARS,recorder,validateRecord,create});
})(globalThis);
