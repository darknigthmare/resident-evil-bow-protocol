/* Local workshop audition: trusted activation, no storage/network/reward.
 * A twelve-second solo audition may play with reduced motion; timeline playback
 * remains subject to the original R14 controls. Every timeline edit stops solo.
 */
(function(root){'use strict';
 const $=id=>document.getElementById(id),B=root.RE_BAKER_AMBIENCE;
 let current={stage:null,frame:0,playing:false},key='',enabled=false,solo=false,epoch=0,alive=true;
 const audio=root.CQC_AUDIO_058.create({settings:{enabled:false,master:.38,effects:0,ambience:.55},onAmbienceEnd:()=>{solo=false;update();}});
 function label(id,text){const node=$(id);if(node.textContent!==text)node.textContent=text;}
 function update(){const room=B.describe(current.stage),d=audio.diagnostics();
  $('stageSoundToggle').disabled=!room;$('stageSoundSolo').disabled=!room;$('stageSoundLayer').disabled=!room;$('stageSoundVolume').disabled=!room;
  label('stageSoundToggle',enabled&&d.unlocked?'COUPER LE SON':'ACTIVER LE SON');if($('stageSoundToggle').getAttribute('aria-pressed')!==String(enabled&&d.unlocked))$('stageSoundToggle').setAttribute('aria-pressed',String(enabled&&d.unlocked));
  label('stageSoundSolo',solo&&d.audition?'ARRÊTER L’ÉCOUTE':'ÉCOUTER 12 S');
  const mode=solo&&d.audition?'ÉCOUTE ISOLÉE DE 12 S':d.ambience?'AMBIANCE DU DÉCOR EN LECTURE':enabled&&d.unlocked?'PRÊT — CLIQUEZ LIRE OU ÉCOUTER 12 S':'SON DÉSACTIVÉ';
  label('stageSoundStatus',d.error||(!room?'Aucune composition R15 pour cette salle.':mode+' · '+room.name+' · '+room.provenance));
 }
 function playFrame(){if(!alive)return;if(!enabled||!B.describe(current.stage)){audio.stop();update();return;}audio.previewStage(current.stage,current.frame,{paused:!current.playing,layer:$('stageSoundLayer').value});update();}
 function sync(value){current=value;const room=B.describe(current.stage),next=room?.id||'';
  if(next!==key){epoch++;solo=false;audio.stop();key=next;$('stageSoundLayer').replaceChildren();for(const layer of[{id:'all',name:'MIX COMPLET'},...(room?.layers||[])]){const o=document.createElement('option');o.value=layer.id;o.textContent=layer.name;$('stageSoundLayer').append(o);}$('stageSoundLayer').value='all';}
  if(!solo)playFrame();else update();
 }
 function stopSolo(){epoch++;solo=false;audio.pause(true);audio.stop();update();}
 async function activate(event,preview){if(!B.describe(current.stage)||!alive)return;
  if(preview&&solo){stopSolo();return;}
  if(!preview&&enabled&&audio.diagnostics().unlocked){enabled=false;stopSolo();audio.setSettings({enabled:false});update();return;}
  const ticket=++epoch;const ready=await audio.unlock(event);if(ticket!==epoch||!alive||!ready){update();return;}
  enabled=true;audio.setSettings({enabled:true});
  if(preview){solo=true;audio.previewStage(current.stage,current.frame,{paused:false,layer:$('stageSoundLayer').value,audition:true});update();}else playFrame();
 }
 $('stageSoundToggle').addEventListener('click',e=>activate(e,false));$('stageSoundSolo').addEventListener('click',e=>activate(e,true));
 $('stageSoundLayer').addEventListener('change',()=>{stopSolo();playFrame();});
 $('stageSoundVolume').addEventListener('input',()=>{const n=Number($('stageSoundVolume').value);if(Number.isFinite(n))audio.setSettings({ambience:Math.max(0,Math.min(1,n/100))});$('stageSoundLevel').textContent=Math.round(audio.diagnostics().settings.ambience*100)+' %';update();});
 for(const id of['stagePlay','stageStep','stageReset'])$(id).addEventListener('click',stopSolo);
 for(const id of['stageSeek','stageLayer','stageReduced','stageSelect'])$(id).addEventListener('change',stopSolo);
 $('stageQuery').addEventListener('input',stopSolo);
 function interrupt(){epoch++;solo=false;audio.pause(true);update();}
 root.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
 root.addEventListener('pagehide',e=>{interrupt();if(e.persisted)audio.park();else{alive=false;audio.dispose();}});
 root.addEventListener('pageshow',e=>{if(e.persisted){interrupt();update();}});
 root.RE_STAGE_AUDIO_WORKSHOP=Object.freeze({sync,stop:stopSolo,diagnostics:()=>({...audio.diagnostics(),solo,stage:current.stage,frame:current.frame})});update();
})(globalThis);
