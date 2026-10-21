(function(root){'use strict';
 const D=root.document,canvas=D.getElementById('trialCanvas'),holder=canvas.parentElement;
 holder.classList.add('ct-host-r17');
 const api=()=>root.RE_CATALOG_DUEL;
 const paused=()=>{const a=api();if(!a)return true;const intro=a.getIntro(),final=a.getPresentation();return intro.active?intro.paused:final.active?final.paused:a.isPaused();};
 const toggle=()=>D.getElementById('trialPause').click();
 root.RE_TRIAL_TEXT_PANEL=root.RE_COMBAT_TEXT_UI.create({state:()=>api()?.getState(),isPaused:paused,pause:()=>{if(!paused())toggle();},resume:()=>{if(paused())toggle();},overlayTarget:holder,buttonTargets:[holder],focusTarget:canvas,prefix:''});
})(globalThis);
