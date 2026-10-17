/* End-of-round presentation only. Does not write actors, scores, inputs or RNG. */
(function(root){'use strict';
 const states=Object.freeze(['intro','roundWin','roundLose','roundDraw','matchWin','matchLose','outro']);
 const labels=Object.freeze({intro:'ENTRÉE DU SUJET',roundWin:'MANCHE GAGNÉE',roundLose:'MANCHE PERDUE · REPRISE POSSIBLE',roundDraw:'MANCHE NULLE',matchWin:'VICTOIRE DU MATCH',matchLose:'DÉFAITE DU MATCH',outro:'SORTIE DU SUJET'});
 const finite=(n,otherwise=0)=>Number.isFinite(n)?n:otherwise;
 function sample(s,p,{resultFrame=0}={}){
  if(!s||!p||(p!==s.a&&p!==s.b)||s.options?.training)return null;
  let state,tick=0,terminal=false;
  if(s.finished===true){
   if(s.winner!==0&&s.winner!==1)return null;
   state=p===(s.winner===0?s.a:s.b)?'matchWin':'matchLose';terminal=true;tick=Math.max(0,Math.floor(finite(resultFrame)));
  }else if(s.phase==='roundEnd'){
   if(![-1,0,1].includes(s.roundWinner))return null;
   state=s.roundWinner<0?'roundDraw':p===(s.roundWinner===0?s.a:s.b)?'roundWin':'roundLose';
   // The last event is authoritative; phaseT is a bounded fallback for fixtures.
   const end=[...(s.events||[])].reverse().find(e=>e.type==='roundEnd'&&e.frame<=s.frame);
   tick=end?Math.max(0,s.frame-end.frame):Math.max(0,Math.min(90,90-finite(s.phaseT,90)));
  }else if(s.phase==='intro'&&s.round===1){state='intro';tick=Math.max(0,Math.floor(finite(s.frame)));}
  else return null;
  return Object.freeze({state,tick,terminal,round:s.round,firstRound:s.round===1,label:labels[state],token:String(s.round)+':'+state});
 }
 function activeFor(p){
  if(!p)return null;
  // Existing public adapters, matched by object identity. Labs never borrow a live match.
  for(const api of [root.__CQC053Versus,root.RE_CATALOG_DUEL]){
   const s=api?.getState?.();if(s&&(p===s.a||p===s.b))return {s,resultFrame:api.getPresentation?.().frame||0};
  }return null;
 }
 function decorate(pose={}){
  if(states.includes(pose.animationState))return pose;
  const active=activeFor(pose.actor),mark=active&&sample(active.s,pose.actor,active);
  if(!mark)return pose;
  return {...pose,animationState:mark.state,animationTick:mark.tick,presentationToken:mark.token,presentation:mark,
   walk:false,attack:false,hit:false,guard:false,jump:false,crouch:false,dash:false,velocity:0,moveKind:null,moveSlot:null,
   // A missing round-loss asset must not reuse a terminal corpse animation.
   knockdown:mark.state==='matchLose'&&pose.actor.life<=0};
 }
 root.RE_ROUND_PRESENTATION=Object.freeze({states,labels,sample,decorate,activeFor,version:'R8',writesGameplay:false});
})(globalThis);
