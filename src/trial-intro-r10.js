/* A presentation-only lead-in. It owns no combat time, commands or replay data. */
(function(root){'use strict';
 const LENGTH=100;
 function create(){
  let active=false,frame=0,paused=true;
  const snapshot=()=>Object.freeze({active,frame:Math.floor(frame),paused,max:LENGTH,canonical:false});
  function reset(){active=false;frame=0;paused=true;return snapshot();}
  function start(){active=true;frame=0;paused=false;return snapshot();}
  function pause(){paused=true;return snapshot();}
  function toggle(){if(active)paused=!paused;return snapshot();}
  function advance(ms,speed=1){
   if(active&&!paused&&Number.isFinite(ms)&&ms>=0){
    frame=Math.min(LENGTH,frame+Math.min(100,ms)*60/1000*([.25,.5,1,2].includes(speed)?speed:1));
    if(frame>=LENGTH){active=false;paused=true;}
   }return snapshot();
  }
  function step(){if(active){paused=true;frame=Math.min(LENGTH,Math.floor(frame)+1);if(frame===LENGTH)active=false;}return snapshot();}
  function skip(){if(!active)return false;frame=LENGTH;active=false;paused=true;return true;}
  function pose(s,slot,reducedMotion=false){
   if(!active)return{};
   // Only the facade has an intro phase: the real engine remains at frame zero.
   return root.RE_MATCH_SEQUENCES.pose({...s,finished:false,phase:'intro',round:1,phaseT:LENGTH-Math.floor(frame)},slot,{reducedMotion});
  }
  return Object.freeze({snapshot,reset,start,pause,toggle,advance,step,skip,pose});
 }
 root.RE_TRIAL_INTRO=Object.freeze({version:'R10',create,length:LENGTH});
})(globalThis);
