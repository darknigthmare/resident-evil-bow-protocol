/* Excel Q11 / FIN: a presentation is not an achievement until it completes.
 * Pure validation only. No actor changes, clock, RNG, storage or source-lore claim. */
(function(root){'use strict';
 const validWinner=(s,w)=>root.RE_MATCH_SEQUENCES?.canFinish(s,w)===true&&s._resultSent55!==true;
 const id=f=>typeof f?.uid==='string'?f.uid:null;
 function select(s,w,profile,index,multiplier=1){
  if(!validWinner(s,w)||!Number.isInteger(index)||index<0||index>3||!profile||profile.uid!==id(w.f))return null;
  const fin=profile.finishers?.[index],victim=w.slot===0?s.b:s.a;
  if(!fin||typeof fin.id!=='string'||!fin.id.startsWith(profile.uid+'::')||!Number.isFinite(fin.duration)||fin.duration<=0||fin.duration>3600||!Array.isArray(fin.phases)||!fin.phases.length||fin.phases.some(p=>typeof p!=='string'))return null;
  if(!Number.isFinite(multiplier)||multiplier<1||multiplier>1.25||!id(victim?.f))return null;
  return Object.freeze({match:s,winner:w,loser:victim,winnerUid:id(w.f),loserUid:id(victim.f),round:s.round,finisherId:fin.id,duration:fin.duration*multiplier,index});
 }
 function valid(s,token){
  if(!token||s!==token.match||!validWinner(s,token.winner))return false;
  const victim=token.winner.slot===0?s.b:s.a;
  return victim===token.loser&&id(token.winner.f)===token.winnerUid&&id(victim.f)===token.loserUid&&s.round===token.round;
 }
 function complete(s,token,elapsed){return valid(s,token)&&Number.isFinite(elapsed)&&elapsed>=token.duration;}
 function record(s,token,elapsed,fin,profile,timestamp){
  if(!complete(s,token,elapsed)||fin?.id!==token.finisherId||profile?.uid!==token.winnerUid||!profile.finishers?.some(f=>f===fin)||typeof timestamp!=='string')return null;
  return Object.freeze({id:fin.id,fighter:String(profile.fighterName||token.winnerUid),name:String(fin.name||fin.id),date:timestamp});
 }
 root.RE_FINISHER_SESSION=Object.freeze({revision:'Excel-R8B',select,valid,complete,record});
})(globalThis);
