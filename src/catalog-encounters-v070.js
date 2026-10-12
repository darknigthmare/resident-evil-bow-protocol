/* Abstract, deterministic scene exercises. NOT original-game boss scripts.
 * No damage or rewards are ever sent to the main game. */
(function(root){'use strict';
const KINDS=['plant','water','swarm','cocoon','vehicle','pursuit','explosion','phases','sentinel'];
function create(record){
 if(!record?.encounter||!KINDS.includes(record.encounter.kind))throw Error('Unsupported contextual dossier');
 const kind=record.encounter.kind,phaseDuration={approach:90,windup:45,strike:20,recovery:55};
 const s={id:record.id,kind,frame:0,phase:'approach',phaseFrame:0,health:100,progress:0,energy:100,integrity:100,incubation:0,density:100,phaseIndex:0,noise:0,avoidUntil:-1,uvUntil:-1,cooldown:0,finished:false,result:null,consumed:false,events:[]};
 function event(type,detail=''){s.events.push({frame:s.frame,type,detail});if(s.events.length>80)s.events.shift();}
 function finish(result){if(s.finished)return;s.finished=true;s.result=result;event('fin',result);}
 function act(action){
  if(s.finished||s.cooldown>0)return false;
  if(!['observe','evade','counter','advance','uv'].includes(action))return false;
  if(action==='uv'&&!record.encounter.uv)return false;
  const cost={observe:0,evade:16,counter:24,advance:13,uv:35}[action];if(s.energy<cost)return false;
  s.energy-=cost;s.cooldown=20;
  if(action==='observe')event('observation',s.phase);
  if(action==='evade'){s.avoidUntil=s.frame+65;s.noise=Math.max(0,s.noise-20);event('évitement');}
  if(action==='uv'){s.uvUntil=s.frame+100;event('UV','Interruption temporaire, pas un KO');}
  if(action==='advance'){
   if(s.phase==='strike'&&s.uvUntil<s.frame){s.health=Math.max(0,s.health-12);event('exposition');}
   else {s.progress=Math.min(100,s.progress+12);s.noise+=kind==='sentinel'?22:5;event('progression');}
  }
  if(action==='counter'){
   const window=s.phase==='recovery'||kind==='cocoon'||s.uvUntil>=s.frame;
   if(!window){event('contre prématuré','Aucun progrès obtenu');return true;}
   if(kind==='cocoon'){s.integrity=Math.max(0,s.integrity-25);if(s.integrity===0)finish('incubation contenue');}
   else if(kind==='pursuit'){s.avoidUntil=s.frame+65;s.progress=Math.min(100,s.progress+8);event('répit','Pas de mort du poursuivant');}
   else if(kind==='swarm'){s.density=Math.max(0,s.density-25);s.progress=Math.min(100,s.progress+18);event('dispersion');}
   else if(kind==='phases'){s.progress=Math.min(100,s.progress+20);s.phaseIndex=Math.min(3,Math.floor(s.progress/25));event('phase de diagnostic',String(s.phaseIndex));}
   else if(kind==='explosion'){s.avoidUntil=s.frame+65;event('mise à distance');}
   else {s.progress=Math.min(100,s.progress+20);event('contre-mesure');}
  }
  if(s.health<=0)finish('échec de l’exercice');else if(s.progress>=100)finish(kind==='pursuit'||kind==='vehicle'||kind==='water'?'sortie atteinte':'objectif de simulation atteint');
  return true;
 }
 function tick(frames=1){if(!Number.isInteger(frames)||frames<0||frames>3600)throw Error('Invalid frame count');
  for(let i=0;i<frames&&!s.finished;i++){
   s.frame++;s.phaseFrame++;s.cooldown=Math.max(0,s.cooldown-1);s.energy=Math.min(100,s.energy+.13);s.noise=Math.max(0,s.noise-.05);
   if(kind==='cocoon'){s.incubation=Math.min(100,s.frame/6);if(s.incubation>=100){event('éclosion','Le descendant nécessite son propre profil');finish('éclosion non contenue');}continue;}
   if(s.phaseFrame<phaseDuration[s.phase])continue;s.phaseFrame=0;
   s.phase=s.phase==='approach'?'windup':s.phase==='windup'?'strike':s.phase==='strike'?'recovery':'approach';event('fenêtre',s.phase);
   if(s.phase==='strike'){
    const safe=s.avoidUntil>=s.frame||s.uvUntil>=s.frame;
    const impact=kind==='swarm'?Math.max(5,Math.ceil(s.density/5)):kind==='sentinel'?Math.max(6,Math.ceil(s.noise/3)):kind==='explosion'?80:25;
    if(!safe){s.health=Math.max(0,s.health-impact);event('impact de simulation',String(impact));}
    if(kind==='explosion'){s.consumed=true;s.integrity=0;finish(safe?'rupture évitée':'rupture subie');}
    else if(s.health<=0)finish('échec de l’exercice');
   }
  }return snapshot();
 }
 function snapshot(){return JSON.parse(JSON.stringify(s));}
 return Object.freeze({act,tick,snapshot});
}
root.RE_CONTEXT_TRIAL=Object.freeze({create,kinds:KINDS.slice()});
})(globalThis);
