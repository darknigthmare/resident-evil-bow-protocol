/* R8: presentation only. This module does not advance or mutate the match.
 * Round recovery, final defeat and an outro are separate art slots. Missing art
 * remains a static reference; a terminal death clip is never reused for round 1. */
(function(root){'use strict';
 const states=Object.freeze(['intro','roundWin','roundLose','roundDraw','matchWin','matchLose','matchDraw','outro']);
 const labels=Object.freeze({intro:'ENTRÉE DU SUJET',roundWin:'MANCHE REMPORTÉE',roundLose:'REPLI ENTRE MANCHES',roundDraw:'MANCHE INDÉCISE',matchWin:'VICTOIRE DU DUEL',matchLose:'DÉFAITE DU DUEL',matchDraw:'DUEL INDÉCIS',outro:'SORTIE DU VAINQUEUR'});
 const tick=n=>Number.isFinite(n)?Math.max(0,Math.min(36000,Math.floor(n))):0;
 const slot=n=>n===0||n===1;
 function describe(s,which,options={}){
  if(!s||!s.a?.f||!s.b?.f||!slot(which))return null;
  const p=which===0?s.a:s.b;let state=null,t=0,reversible=false;
  if(s.finished===true){
   if(options.finishPending===true)return null;
   if(s.winner!==-1&&!slot(s.winner))return null;
   t=tick(options.finalTick);
   state=s.winner===-1?'matchDraw':s.winner===which?'matchWin':'matchLose';
   if(state==='matchWin'&&t>=90){state='outro';t-=90;}
  }else if(s.phase==='intro'){
   state='intro';t=Math.max(0,(s.round===1?100:90)-tick(s.phaseT));reversible=true;
  }else if(s.phase==='roundEnd'){
   if(s.roundWinner!==-1&&!slot(s.roundWinner))return null;
   state=s.roundWinner===-1?'roundDraw':s.roundWinner===which?'roundWin':'roundLose';
   t=Math.max(0,90-tick(s.phaseT));reversible=true;
  }else return null;
  if(options.reducedMotion===true)t=0;
  return Object.freeze({uid:p.f.uid||p.f.id,slot:which,state,tick:t,reversible,
   label:labels[state],canonical:false,scope:'Emplacement de présentation du versus ; dessin et source à valider séparément.'});
 }
 function pose(s,which,options={}){
  const d=describe(s,which,options);if(!d)return {};
  return {presentationState:d.state,animationState:d.state,animationTick:d.tick,
   presentationNeutral:true,presentationReversible:d.reversible,
   attack:false,hit:false,walk:false,dash:false,guard:false,crouch:false,jump:false,
   knockdown:false};
 }
 function canFinish(s,actor){
  return !!s&&s.finished===true&&s._resultSent55!==true&&slot(s.winner)&&actor===(s.winner===0?s.a:s.b)&&
   s.a!==s.b&&!!actor?.f&&actor.slot===s.winner;
 }
 function coverage(f){
  const A=root.RE_FIGHTER_DIRECTIONS;
  return states.map(state=>{const left=A.resolve(f,-1,{presentationState:state}),right=A.resolve(f,1,{presentationState:state});
   return {uid:f.uid||f.id,state,label:labels[state],left:left.animated,right:right.animated,
    ready:left.animated&&right.animated,artStatus:'Validation du dessin distincte de la présence technique du clip.'};});
 }
 root.RE_MATCH_SEQUENCES=Object.freeze({version:'R8',states,labels,describe,pose,canFinish,coverage});
})(globalThis);
