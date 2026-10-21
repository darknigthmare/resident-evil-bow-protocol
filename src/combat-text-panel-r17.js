/* Optional UI, no clock or persistent settings. Uses the owning page's steps. */
(function(root){'use strict';
 function create(options){
  const D=root.document,C=root.RE_COMBAT_TEXT;if(!D||!C)return null;
  const observer=C.create(),panel=D.createElement('section'),overlay=D.createElement('div'),live=D.createElement('p');
  panel.id='combatTextPanelR17';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','combatTextTitleR17');
  panel.innerHTML='<header><h2 id="combatTextTitleR17">REPÈRES TEXTUELS DU COMBAT</h2><button id="combatTextCloseR17" type="button">FERMER · ÉCHAP</button></header><p>Événements réellement observés : action engagée, tir émis, impact, garde, dispositif et résultat. Les noms des techniques proviennent du profil de cette incarnation. Ce ne sont pas des dialogues ni des sous-titres officiels.</p><div class="ct-options"><label><input id="combatTextEnableR17" type="checkbox">AFFICHER LES ÉVÉNEMENTS</label><label>TAILLE<select id="combatTextSizeR17"><option value="normal">Normale</option><option value="large">Grande</option></select></label><label><input id="combatTextAnnounceR17" type="checkbox">ANNONCER LES RÉSULTATS ET RUPTURES DE GARDE</label><button id="combatTextClearR17" type="button">EFFACER CE JOURNAL</button></div><p id="combatTextStatusR17" role="status" aria-live="polite"></p><ol id="combatTextListR17" aria-label="Derniers événements observés" aria-live="off"></ol><p class="ct-boundary-r17">Deux lignes à l’écran ; 60 entrées au maximum dans ce journal de session. Les répétitions proches sont regroupées. Une recherche dans le replay ou une nouvelle partie ouvre un journal neuf. Aucun fichier, préférence, résultat ou récompense enregistré.</p><p><a id="combatTextWorkbookR17" href="'+(options.prefix||'')+'docs/planning/BOW_REPERES_COMBAT_R17.xlsx" download>SUIVI EXCEL R17</a></p>';
  overlay.id='combatTextOverlayR17';overlay.className='ct-overlay-r17';overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
  live.className='ct-sr-r17';live.setAttribute('aria-live','off');live.setAttribute('aria-atomic','true');
  D.body.append(panel,live);options.overlayTarget.append(overlay);
  const $=id=>D.getElementById(id),buttons=[];let model={},oldState=null,oldPause=true,revisionAtOpen=0,interrupted=false,returnFocus=null,viewRevision=-1,overlaySignature='',announced=-1,inert=[];
  const visible=()=>!panel.hidden;
  function render(){const v=observer.view();$('combatTextEnableR17').checked=v.enabled;
   const signature=v.overlay.map(x=>x.label).join('\n');if(signature!==overlaySignature){overlay.replaceChildren();for(const item of v.overlay){const p=D.createElement('p');p.textContent=item.label;overlay.append(p);}overlaySignature=signature;}
   overlay.hidden=!v.enabled||!v.overlay.length||visible();overlay.classList.toggle('large',$('combatTextSizeR17').value==='large');
   if(visible()&&v.revision!==viewRevision){$('combatTextListR17').replaceChildren();for(const item of v.history.slice().reverse()){const li=D.createElement('li'),time=D.createElement('time');time.textContent='F'+item.frame+(item.lastFrame!==item.frame?'–'+item.lastFrame:'')+' · ';li.append(time,D.createTextNode(item.label));$('combatTextListR17').append(li);}viewRevision=v.revision;}
   const text=!v.enabled?'DÉSACTIVÉ — réglage en mémoire de cette page.':v.skipped?'JOURNAL PARTIEL : '+v.skipped+' événements du moteur hors de la fenêtre observée.':v.history.length?'ACTIF — '+v.history.length+' entrées au maximum 60. Le journal ne remplace pas un replay.':'ACTIF — seuls les nouveaux événements seront affichés.';
   if(visible()&&$('combatTextStatusR17').textContent!==text)$('combatTextStatusR17').textContent=text;
   for(const b of buttons)b.setAttribute('aria-pressed',String(v.enabled));
   const notify=$('combatTextAnnounceR17').checked;live.setAttribute('aria-live',notify?'polite':'off');
   if(!visible()&&notify&&v.announcement&&v.announcementCount!==announced){live.textContent=v.announcement.label;announced=v.announcementCount;}
  }
  function sync(value){model=value||{};observer.observe(model);render();}
  function setInert(on){if(on){inert=[...D.body.children].filter(x=>x!==panel&&x!==live).map(x=>[x,!!x.inert]);for(const[x]of inert)x.inert=true;}else{for(const[x,old]of inert)x.inert=old;inert=[];}}
  function open(event){if(visible())return;returnFocus=event?.currentTarget||D.activeElement;oldState=options.state();oldPause=options.isPaused();interrupted=false;
   options.pause();revisionAtOpen=options.revision?.()??0;panel.hidden=false;setInert(true);viewRevision=-1;render();$('combatTextEnableR17').focus();}
  function close(restore=true){if(!visible())return;panel.hidden=true;setInert(false);
   const resumed=restore&&!interrupted&&!!oldState&&oldState===options.state()&&revisionAtOpen===(options.revision?.()??0)&&!oldPause;if(resumed)options.resume();
   oldState=null;if(restore){const target=resumed?options.focusTarget:returnFocus?.isConnected?returnFocus:options.focusTarget;target?.focus?.();}returnFocus=null;render();}
  function interrupt(){interrupted=true;live.textContent='';}
  $('combatTextEnableR17').addEventListener('change',()=>{observer.configure($('combatTextEnableR17').checked);sync(model);});
  $('combatTextSizeR17').addEventListener('change',render);
  $('combatTextAnnounceR17').addEventListener('change',()=>{announced=observer.view().announcementCount;live.textContent='';render();});
  $('combatTextClearR17').addEventListener('click',()=>{observer.clear();viewRevision=-1;live.textContent='';render();});
  $('combatTextCloseR17').addEventListener('click',()=>close());
  panel.addEventListener('keydown',event=>{event.stopPropagation();if(event.code==='Escape'||event.key==='Escape'){event.preventDefault();close();}else if(event.code==='Tab'||event.key==='Tab'){const all=[...panel.querySelectorAll('button,input,select,a')].filter(x=>!x.disabled&&!x.hidden),i=all.indexOf(D.activeElement);event.preventDefault();all[(i+(event.shiftKey?-1:1)+all.length)%all.length]?.focus();}});
  for(const target of options.buttonTargets){const b=D.createElement('button');b.type='button';b.className='ct-open-r17'+(target===options.overlayTarget?' ct-float-r17':'');b.textContent='TEXTE';b.setAttribute('aria-label','Régler les repères textuels du combat');b.onclick=open;target.append(b);buttons.push(b);}
  root.addEventListener('blur',interrupt);D.addEventListener('visibilitychange',()=>{if(D.hidden)interrupt();});root.addEventListener('pagehide',()=>{interrupt();close(false);observer.observe({...model,hidden:true});render();});
  const api=Object.freeze({sync,open,close,reset:()=>{close(false);observer.reset();render();},isOpen:visible,view:observer.view,clear:()=>{observer.clear();render();}});render();return api;
 }
 root.RE_COMBAT_TEXT_UI=Object.freeze({create});
})(globalThis);
