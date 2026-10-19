/* Conservative choreography compatibility, NOT a biology or lore certificate.
 * Dimensions are the game's envelopes; unknown rigs require dedicated art.
 * No target receives a replacement anatomy and no profile is modified. */
(function(root){'use strict';
 const F=root.RE_DATA?.fighters||[],P=root.CQC_FINISHERS_053?.profiles||{};
 const byUID=new Map(F.map(f=>[f.uid,f]));
 const bipeds=new Set(['humanoid','tyrant','zombie','regenerator','molded','hunched','reptilian','asymmetric','four-armed']);
 const lowBodies=new Set(['canid','crawler','quadruped']);
 const excluded=Object.freeze({
  're7-eveline':'projection', 'revillage-donna-angie':'collective',
  're6-strelat':'unreviewed', 're2-g-fourth-form':'low',
  're7-marguerite-baker-mutated':'unreviewed', 're7-lucas-baker-mutated':'unreviewed'
 });
 const rejected=Object.freeze({unknown:'Incarnation inconnue.',unreviewed:'Gabarit non qualifié pour cette chorégraphie.',
  projection:'Projection : aucune prise corporelle générique.',collective:'Sujet collectif : scène dédiée requise.',
  aquatic:'Sujet aquatique : scène et surface dédiées requises.',plant:'Organisme végétal : scène dédiée requise.',
  giant:'Géant : échelle et points de contact spécifiques requis.',winged:'Morphologie volante : scène dédiée requise.',
  colony:'Masse ou colonie : la chute générique est inadaptée.',mechanical:'Corps mécanique : conclusion spécifique requise.'});
 function body(uid){
  const f=typeof uid==='string'?byUID.get(uid):null;
  if(!f)return Object.freeze({uid:typeof uid==='string'?uid:'',rig:'unknown',height:0,width:0,reason:rejected.unknown});
  const v=f.visual||{},m=v.morphology;let rig=excluded[uid];
  if(!rig){
   if(['aquatic','amphibian'].includes(m))rig='aquatic';
   else if(m==='plant')rig='plant';
   else if(m==='giant')rig='giant';
   else if(['winged','flying'].includes(m))rig='winged';
   else if(['colony','leech-colony'].includes(m))rig='colony';
   else if(['cyborg','mechanical'].includes(m))rig='mechanical';
   else if(bipeds.has(m)&&v.kind==='human')rig='biped';
   else if(lowBodies.has(m))rig='low';
   else rig='unreviewed';
  }
  const height=Number.isFinite(v.height)&&v.height>0?v.height:0,width=Number.isFinite(v.width)&&v.width>0?v.width:0;
  if(!height||!width)rig='unreviewed';
  return Object.freeze({uid,rig,height,width,reason:rejected[rig]||'',canonical:false,
   source:'Gabarit déclaré dans data/roster.json ; pas des mesures Capcom.'});
 }
 function evaluate(attackerUID,victimUID,finisherID){
  const a=body(attackerUID),b=body(victimUID),profile=P[attackerUID],fin=profile?.finishers?.find(f=>f.id===finisherID);
  const result=(allowed,code,reason)=>Object.freeze({allowed,code,reason,attacker:a.rig,victim:b.rig,canonical:false,
   scope:'Compatibilité technique de la chorégraphie héritée, à valider artistiquement ; aucune fatalité canonique certifiée.'});
  if(!fin)return result(false,'unknown-conclusion','Conclusion absente de cette incarnation.');
  if(a.reason)return result(false,'attacker-'+a.rig,a.reason);
  if(b.reason)return result(false,'victim-'+b.rig,b.reason);
  // Current files declare three inherited phase lists. Anything else fails closed.
  const phases=(fin.phases||[]).join('/');
  if(!['approach/grapple/impact/fall','approach/grab/impact/fall','approach/pounce/impact/fall'].includes(phases))
   return result(false,'unreviewed-sequence','Enchaînement non qualifié : validation spécifique requise.');
  const grasp=phases.includes('/grapple/')||phases.includes('/grab/');
  if(grasp&&(a.rig!=='biped'||b.rig!=='biped'))return result(false,'grasp-rig','La saisie générique exige deux gabarits bipèdes compatibles.');
  if(!grasp&&a.rig!=='low')return result(false,'pounce-rig','Le bond générique n’est pas qualifié pour ce gabarit attaquant.');
  const ratio=b.height/a.height,widthRatio=b.width/a.width,min=grasp?.5:.35,max=grasp?1.5:3;
  if(ratio<min||ratio>max||widthRatio<.35||widthRatio>2.5)return result(false,'size-envelope','Écart de gabarit hors du domaine testé : scène adaptée nécessaire.');
  return result(true,'prototype-compatible','PROTOTYPE COMPATIBLE · points de contact et animation finale non certifiés.');
 }
 function options(attackerUID,victimUID){return(P[attackerUID]?.finishers||[]).map(f=>Object.freeze({id:f.id,...evaluate(attackerUID,victimUID,f.id)}));}
 root.RE_FINISHER_COMPATIBILITY=Object.freeze({version:'R10',body,evaluate,options});
})(globalThis);
