/* Native controls for the isolated duel. Preferences live only in this page. */
(function(root){'use strict';
 const $=id=>document.getElementById(id),sound=root.RE_TRIAL_AUDIO.create();
 const modes={idle:'PRÊT — démarrez le duel',new:'PRÊT',paused:'SILENCE — duel en pause',intro:'SILENCE — présentation avant combat',speed:'SILENCE — audio disponible à vitesse ×1',hidden:'SILENCE — page masquée',finished:'DUEL TERMINÉ — pas de répétition des sons de résultat',disposed:'AUDIO ARRÊTÉ',running:'AUDIO DU DUEL — événements réels et ambiance',disabled:'SON DÉSACTIVÉ'};
 function label(id,text){const e=$(id);if(e&&e.textContent!==text)e.textContent=text;}
 function refresh(){const d=sound.diagnostics();const on=d.active&&d.unlocked;
  label('trialSoundToggle',on?'COUPER LE SON':'ACTIVER LE SON');$('trialSoundToggle').setAttribute('aria-pressed',String(on));
  label('trialSoundStatus',d.error||(!on?'SON DÉSACTIVÉ — activation volontaire, aucun réglage sauvegardé.':modes[d.mode]||modes.idle));
  for(const[id,key]of[['Master','master'],['Effects','effects'],['Ambience','ambience']])label('trialSound'+id+'Level',Math.round((d.settings?.[key]||0)*100)+' %');
 }
 $('trialSoundToggle').addEventListener('click',async e=>{await sound.activate(e);refresh();});
 for(const[id,key]of[['Master','master'],['Effects','effects'],['Ambience','ambience']])$('trialSound'+id).addEventListener('input',()=>{const v=Number($('trialSound'+id).value);if(Number.isFinite(v))sound.settings({[key]:v/100});refresh();});
 function sync(v){sound.sync(v);refresh();}
 root.addEventListener('blur',()=>{sound.interrupt();refresh();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){sound.interrupt();refresh();}});
 root.addEventListener('pagehide',e=>{if(e.persisted)sound.park();else sound.dispose();refresh();});
 root.addEventListener('pageshow',e=>{if(e.persisted){sound.restore();refresh();}});
 root.RE_TRIAL_AUDIO_PANEL=Object.freeze({sync,diagnostics:sound.diagnostics});refresh();
})(globalThis);
