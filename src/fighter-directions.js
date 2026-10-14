/* Actual runtime sprite selection. Orientation is not a 2-D rotation of a portrait.
 * The combat engine owns actor.face (including attack-direction lock).
 * Opposite anatomical sides require independent art unless mirroring was reviewed.
 */
(function(root){
  'use strict';
  const manifest = root.RE_DIRECTIONAL_ART || {records:{}};
  const SIDES = Object.freeze({left:-1,right:1});
  function side(value) {
    if (value === -1 || value === 'left' || value === 'gauche') return -1;
    if (value === 1 || value === 'right' || value === 'droite') return 1;
    return 0;
  }
  function facing(actor, requested=1, x, opponentX) {
    // Never turn a committed attack with its opponent or with backward velocity.
    const committed = side(actor?.attack?.face);
    if (committed) return committed;
    const authoritative = side(actor?.face);
    if (authoritative) return authoritative;
    if (Number.isFinite(x) && Number.isFinite(opponentX) && Math.abs(opponentX-x)>.001)
      return opponentX>x ? 1 : -1;
    return side(requested)||1;
  }
  function safeAsset(path) {
    return typeof path==='string' && /^assets\/[\w./-]+\.(?:png|webp)$/i.test(path)
      && !path.split('/').some(p=>p==='..'||p==='.') && !path.includes('//');
  }
  function validView(view, expectedSide) {
    if (!view || view.facing!==expectedSide || view.projection!=='side' || view.reviewed!==true
        || !safeAsset(view.path)) return false;
    const a=view.anchor||[.5,1];
    return Array.isArray(a) && a.length===2 && a.every(v=>Number.isFinite(v)&&v>=0&&v<=1);
  }
  function asymmetric(f) {
    return f?.visual?.asymmetric===true || /BIRKIN|BANDERSNATCH|N[EÉ]M[EÉ]SIS|T[-\s]?002/i.test(f?.name||'');
  }
  function resolve(f, requested=1, pose={}, x) {
    const face=facing(pose.actor,requested,x,pose.opponentX), direction=face===1?'right':'left';
    const record=manifest.records[f?.uid||f?.id];
    const result={face,direction,path:f?.sprite||f?.visual?.sprite||f?.portrait||'',mirror:1,
      anchor:[.5,1],crop:f?.spriteCrop||f?.visual?.spriteCrop||null,
      status:'reference-only',sideProfile:false,oppositeAnatomyValidated:false,
      reason:'Vue latérale non livrée : la référence existante est conservée, pas transformée en faux profil.'};
    const exact=record?.views?.[direction];
    if(validView(exact,direction))return {...result,path:exact.path,crop:exact.crop||null,
      anchor:exact.anchor||[.5,1],status:'side-view',sideProfile:true,
      oppositeAnatomyValidated:validView(record?.views?.left,'left')&&validView(record?.views?.right,'right'),
      reason:'Vue latérale dédiée à cette orientation, sans miroir.'};
    const opposite=record?.views?.[face===1?'left':'right'];
    // No regexp exemption can silently promote an asymmetric creature to mirroring.
    if(!asymmetric(f)&&record?.mirrorReviewed===true&&validView(opposite,face===1?'left':'right'))
      return {...result,path:opposite.path,crop:opposite.crop||null,
        anchor:opposite.anchor||[.5,1],mirror:-1,status:'side-view-mirrored',sideProfile:true,
        oppositeAnatomyValidated:false,reason:'Miroir autorisé explicitement pour ce dessin bilatéral.'};
    const native=side(record?.referenceFacing||f?.visual?.sourceFacing);
    if(native){
      if(native===face){result.status='directional-reference';result.reason='Référence orientée : profil strict non validé.';}
      else if(!asymmetric(f)){
        result.mirror=-1;result.status='directional-reference';
        result.reason='Référence orientée vers la cible ; ce miroir ne constitue pas une reconstruction latérale.';
      }else{result.status='opposite-view-missing';result.reason='Vue opposée manquante : aucun miroir anatomique automatique.';}
    }
    return result;
  }
  function audit(f) {
    const left=resolve(f,-1),right=resolve(f,1),r=manifest.records[f.uid||f.id];
    return {uid:f.uid||f.id,name:f.name,asymmetric:asymmetric(f),
      left:left.status,right:right.status,ready:left.sideProfile&&right.sideProfile,
      assetLeft:left.path,assetRight:right.path,
      referenceFacing:r?.referenceFacing||f.visual?.sourceFacing||'unknown'};
  }
  root.RE_FIGHTER_DIRECTIONS=Object.freeze({resolve,facing,side,audit,validView,safeAsset,version:'1.0.0'});
})(globalThis);
