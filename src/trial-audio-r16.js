/* R16 read-only sound adapter. No timers, storage, RNG, combat commands or reward
 * channel. Uses the existing original sound bank, NOT canonical creature voices.
 * Experimental policy: effects on emitted projectiles/placed devices, not on an
 * attack request. Intros, seek, single-step and non-real-time speeds stay silent.
 */
(function(root){'use strict';
 function create(options={}){
  const API=options.audioAPI||root.CQC_AUDIO_058;
  let model=null,owner=null,stageKey='',serial=0,epoch=0,enabled=false,alive=true,parked=false,mode='idle',lastFrame=-1;
  const played=[],totals={},pending=new Map();let engineSeq=0,streamSeq=0,stream=[];
  function map(event){
   if(event.type==='activate'&&['projectile','trap'].includes(event.kind))return null;
   if(event.type==='projectile')return API.cueFor({...event,type:'activate'});
   if(event.type==='trapPlaced')return'deploy';
   if(event.type==='deviceArmed')return'reload';
   if(event.type==='trapDestroyed'||event.type==='projectileDestroyed')return'block';
   // explosion already represents a real blast; deviceDetonated and an empty
   // detonator must not create a second explosion or a synthetic healing sound.
   if(['detonator','deviceDetonated','deviceRetired','start','denied'].includes(event.type))return null;
   return API.cueFor(event);
  }
  const audio=API?.create({AudioContext:options.AudioContext,maxVoices:12,settings:{enabled:false,menuEnabled:false,master:.28,effects:.65,ambience:.15},cueFor:map,onCue:(cue,event)=>{
   totals[cue]=(totals[cue]||0)+1;played.push({cue,frame:event?.frame??lastFrame,type:event?.type||'transition',actor:event?.actor??-1});if(played.length>32)played.shift();
  }});
  function packet(s,stage){
   const snapshot=API.snapshot(s,{session:'catalog-audio-r16:'+serial,stage});if(!snapshot)return null;
   const raw=s.events.slice(-180),first=snapshot.eventCount-raw.length+1;
   const push=event=>{stream.push({...event});if(stream.length>180)stream.shift();streamSeq++;};
   for(const event of snapshot.events){
    if(event.seq<=engineSeq)continue;const origin=raw[event.seq-first]||{};
    if(event.type==='projectile'){
     const move=(event.actor===0?s.a:s.b).f.combat.moves[event.slot],q=s.projectiles.find(q=>q.id===origin.id);
     if((origin.index>0&&move?.interval>0)||(q?.delay>0)){
      if(Number.isSafeInteger(origin.id))pending.set(origin.id,{event:{...event},due:event.frame+(origin.index||0)*(move?.interval||0)});
     }else push(event);
    }else if(event.type==='burstRelease'){
     const waiting=pending.get(origin.id);if(waiting){push({...waiting.event,frame:event.frame});pending.delete(origin.id);}
    }else{
     if(event.type==='burstCancelled')pending.delete(origin.id);
     if(event.type==='explosion'&&pending.has(origin.id)){const waiting=pending.get(origin.id);push({...waiting.event,frame:event.frame});pending.delete(origin.id);}
     push(event);
    }
   }
   for(const[id,p]of pending){const q=s.projectiles.find(q=>q.id===id);
    if(q&&!q.scheduled&&q.age>0){push({...p.event,frame:p.due});pending.delete(id);}
    else if(!q)pending.delete(id); // Unknown disappearance never invents a shot.
   }
   while(pending.size>60)pending.delete(pending.keys().next().value);
   engineSeq=snapshot.eventCount;
   return{a:s.a,b:s.b,frame:s.frame,round:s.round,phase:s.phase,finished:s.finished,winner:s.winner,eventCount:streamSeq,events:stream};
  }
  function sync(value){
   if(value)model=value;if(!audio||!alive)return false;
   const s=model?.state,stage=typeof model?.stage==='string'?model.stage:model?.stage?.id||'';
   if(!s?.a?.f||!s?.b?.f){audio.stop();mode='idle';owner=null;return false;}
   if(owner!==s||stageKey!==stage||s.frame<lastFrame){epoch++;audio.stop();audio.pause(true);owner=s;stageKey=stage;serial++;mode='new';lastFrame=-1;pending.clear();stream=[];streamSeq=0;engineSeq=API.snapshot(s)?.eventCount||0;}
   const speed=model.speed===undefined?1:model.speed,hidden=model.hidden===true||parked;
   const blocked=hidden?'hidden':model.intro?'intro':speed!==1?'speed':null;
   const active=enabled&&!blocked&&!model.paused&&!s.finished;
   const context={session:'catalog-audio-r16:'+serial,stage,paused:!active};
   const view=packet(s,stage);if(!view){audio.pause(true);mode='invalid';return false;}
   if(blocked){audio.observe(view,{...context,paused:true});mode=blocked;}
   else if(s.finished){
    // Only a result reached from running playback can sound. Later final-pose
    // rendering cannot repeat that cue or reopen an ambiance loop.
    if(mode==='running'&&s.frame>lastFrame){audio.observe(view,{...context,paused:!enabled});audio.end();}
    else if(mode!=='finished'){audio.observe(view,{...context,paused:true});audio.end();}
    mode='finished';
   }else{audio.observe(view,context);mode=active?'running':model.paused?'paused':'disabled';}
   lastFrame=s.frame;return true;
  }
  async function activate(event){
   if(!audio||!alive)return false;
   if(enabled&&audio.diagnostics().unlocked){disable();return false;}
   const ticket=++epoch,ready=await audio.unlock(event);
   if(ticket!==epoch||!alive||parked)return false;
   if(!ready){enabled=false;audio.setSettings({enabled:false});return false;}
   enabled=true;audio.setSettings({enabled:true});sync();return true;
  }
  function disable(){epoch++;enabled=false;audio?.setSettings({enabled:false});audio?.pause(true);sync();}
  function settings(value){if(!audio)return null;const v={};for(const key of['master','effects','ambience'])if(Number.isFinite(value?.[key]))v[key]=Math.max(0,Math.min(1,value[key]));const result=audio.setSettings(v);sync();return result;}
  function interrupt(){epoch++;audio?.pause(true);mode='paused';}
  function park(){epoch++;enabled=false;parked=true;mode='hidden';audio?.setSettings({enabled:false});return audio?.park();}
  function restore(){parked=false;mode='paused';sync(model?{...model,paused:true}:null);}
  function dispose(){epoch++;alive=false;enabled=false;audio?.dispose();mode='disposed';}
  function diagnostics(){return{...(audio?.diagnostics()||{supported:false,error:'Module audio absent',contextState:'uncreated'}),active:enabled,mode,serial,frame:lastFrame,playedCount:audio?.diagnostics().played||0,pendingShots:pending.size,queuedEvents:stream.length,played:played.map(x=>({...x})),cueTotals:{...totals},disposed:!alive||audio?.diagnostics().disposed===true};}
  return Object.freeze({sync,activate,disable,settings,interrupt,park,restore,dispose,diagnostics});
 }
 root.RE_TRIAL_AUDIO=Object.freeze({create,scope:'Original shared samples; presentation only, no voice or canon certification.'});
})(globalThis);
