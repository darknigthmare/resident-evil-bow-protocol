/* Read-only descriptions of the contextual exercise, never the original boss.
 * No mutation of sessions, saved journals, phase timing or campaign state.
 * Context snapshots have bounded events without sequence IDs: exact overlap is
 * checked; if lost, explicitly mark a partial journal rather than inventing it.
 */
(function(root){'use strict';
 const LIMIT=60,TTL=180,integer=x=>Number.isSafeInteger(x)&&x>=0;
 const clean=x=>typeof x==='string'?x.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,180):'';
 const phase={approach:'approche',windup:'attaque annoncée',strike:'impact',recovery:'ouverture de contre-mesure'};
 const descriptions={observation:e=>'Observation : '+(phase[e.detail]||'phase en cours'),'évitement':()=> 'Évitement engagé',UV:()=> 'Projecteur UV activé — appareil de cet exercice',exposition:()=> 'Exposition pendant le passage : dégâts de simulation','passage fermé':()=> 'Passage fermé — attendre la récupération',progression:()=> 'Progression de l’objectif confirmée','contre prématuré':()=> 'Contre-mesure prématurée — aucun progrès obtenu','répit':()=> 'Répit obtenu — le poursuivant n’est pas éliminé',dispersion:()=> 'Dispersion de l’essaim confirmée','phase de diagnostic':e=>'Nouvelle phase du diagnostic : '+clean(e.detail),'mise à distance':()=> 'Mise à distance engagée','contre-mesure':()=> 'Contre-mesure confirmée','éclosion':()=> 'Éclosion du scénario — ce n’est pas une nouvelle créature jouable',fenêtre:e=>'Fenêtre : '+(phase[e.detail]||'phase inconnue'),'impact de simulation':e=>'Impact de simulation : '+clean(e.detail)+' dégâts',fin:e=>'Fin de l’exercice : '+clean(e.detail)+' — résultat non canonique'};
 const equal=(a,b)=>a.frame===b.frame&&a.type===b.type&&a.detail===b.detail;
 function create(){
  let enabled=false,owner=null,prior=[],lastFrame=-1,history=[],serial=0,revision=0,skipped=0,mode='off',counts={},announcement=null,announcementCount=0;
  function push(frame,type,text,important=false,live=false){const p=history.at(-1),key=type+'|'+text;
   if(p?.key===key&&frame-p.lastFrame<=12&&frame>=p.lastFrame){p.count++;p.lastFrame=frame;}else{history.push({id:++serial,key,type,actor:null,frame,lastFrame:frame,count:1,text});if(history.length>LIMIT)history.shift();}
   counts[type]=(counts[type]||0)+1;revision++;if(important&&live){announcement={...history.at(-1),label:text};announcementCount++;}
  }
  function reset(){owner=null;prior=[];history=[];counts={};lastFrame=-1;serial=0;skipped=0;announcement=null;revision++;return view();}
  function observe(model={}){
   const s=model.state,session=model.session;if(!session||!s||!integer(s.frame)||!Array.isArray(s.events)){reset();mode='idle';return view();}
   if(owner!==session||s.frame<lastFrame){reset();owner=session;prior=s.events.slice(-80).map(e=>({...e}));lastFrame=s.frame;}
   const raw=s.events.slice(-80).filter(e=>integer(e.frame)&&e.frame<=s.frame&&typeof e.type==='string');
   if(!enabled||model.hidden){prior=raw.map(e=>({...e}));lastFrame=s.frame;mode=enabled?'hidden':'off';return view();}
   let overlap=0;
   if(prior.length)for(let n=Math.min(prior.length,raw.length);n>=1;n--)if(prior.slice(-n).every((e,i)=>equal(e,raw[i]))){overlap=n;break;}
   if(prior.length&&!overlap){skipped++;revision++;push(s.frame,'partial','JOURNAL PARTIEL — événements intermédiaires non observés');}
   // Activation/reconstruction begins at the current snapshot, not an old replay.
   for(const event of raw.slice(overlap)){const make=Object.hasOwn(descriptions,event.type)?descriptions[event.type]:null;if(make)push(event.frame,event.type,make(event),event.type==='fin',!model.paused&&!model.hidden&&s.frame-lastFrame<=6);}
   prior=raw.map(e=>({...e}));lastFrame=s.frame;mode=s.finished?'finished':model.paused?'paused':'running';return view();
  }
  function denied(reason,frame){if(enabled&&integer(frame)&&owner)push(frame,'denied','Commande refusée : '+clean(reason));return view();}
  function view(){const items=history.map(({key,...x})=>({...x,label:x.text+(x.count>1?' ×'+x.count:'')}));return{enabled,mode,frame:lastFrame,revision,history:items,overlay:enabled&&mode!=='hidden'?items.filter(x=>lastFrame-x.lastFrame<=TTL).slice(-2):[],announcement,announcementCount,skipped,pending:0,totals:{...counts}};}
  function configure(on){if(enabled!==!!on){enabled=!!on;history=[];announcement=null;revision++;}return view();}
  function clear(){history=[];announcement=null;revision++;return view();}
  return Object.freeze({observe,configure,clear,reset,view,denied});
 }
 root.RE_CONTEXT_TEXT=Object.freeze({create,types:Object.keys(descriptions),limits:{history:LIMIT,overlay:2,lifetimeTicks:TTL},scope:'Aide de lecture du scénario abstrait ; aucun sous-titre ou geste canonique.'});
})(globalThis);
