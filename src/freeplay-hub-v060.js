/* A single-file entry to the complete Versus and Dojo, preserving the story save. */
(function(root){'use strict';
 const story=root.CQC60,doc=root.document,menu=doc.querySelector('.hero .actions');
 if(!story||!menu)return;
 let panel=null,frame=null,session=null,requestedMode='cpu',selected=null,ping=0,timeout=0,previousFocus=null,prepared=false;
 const button=(label,handler)=>{const b=doc.createElement('button');b.textContent=label;b.type='button';b.onclick=handler;return b;};
 const style=doc.createElement('style');style.textContent='#freeplay60{position:fixed;inset:0;z-index:80;background:#081710;display:flex;flex-direction:column}#freeplay60[hidden]{display:none}#freeplay60 .freeplay-bar{min-height:56px;padding:8px max(12px,env(safe-area-inset-right)) 8px max(12px,env(safe-area-inset-left));display:flex;align-items:center;justify-content:space-between;gap:12px;background:#0c2319;border-bottom:1px solid #637960}#freeplay60 .freeplay-bar strong{font-size:14px;letter-spacing:.06em}#freeplay60 button{min-height:44px}#freeplay60 iframe{width:100%;flex:1;min-height:0;border:0;background:#081710}#freeplay60 .freeplay-status{padding:10px 16px;margin:0;background:#102a1d;font-size:13px}';doc.head.append(style);
 function close(){if(!panel||panel.hidden)return false;clearInterval(ping);clearTimeout(timeout);session=null;prepared=false;frame?.remove();frame=null;panel.hidden=true;for(const [el,old]of panel._inert||[])el.inert=old;panel._inert=[];previousFocus?.focus?.();return true;}
 function send(){if(frame&&session)frame.contentWindow?.postMessage({type:'cqc60.freeplay.prepare',session,uid:selected,mode:requestedMode},'*');}
 function open(mode='cpu'){
  if(doc.querySelector('#modal')?.open||!['cpu','local','training'].includes(mode)||story.snapshot().screen!=='menu'||story.snapshot().pending)return false;
  if(panel&&!panel.hidden)return true;
  requestedMode=mode;selected=story.snapshot().profile.selected;session='freeplay60-'+(root.crypto?.randomUUID?.()||Date.now().toString(36));previousFocus=doc.activeElement;prepared=false;
  if(!panel){panel=doc.createElement('section');panel.id='freeplay60';panel.setAttribute('aria-label','Versus et Dojo');const bar=doc.createElement('div');bar.className='freeplay-bar';const label=doc.createElement('strong');label.id='freeplay-title60';const exit=button('Quitter · Retour aux histoires',close);bar.append(label,exit);panel.append(bar);doc.body.append(panel);}
  panel.querySelector('#freeplay-title60').textContent=mode==='training'?'DOJO · ENTRAÎNEMENT':'VERSUS · COMBAT LIBRE';panel.hidden=false;
  panel._inert=[...doc.body.children].filter(el=>el!==panel).map(el=>[el,!!el.inert]);for(const [el]of panel._inert)el.inert=true;
  const old=panel.querySelector('.freeplay-status');old?.remove();const status=doc.createElement('p');status.className='freeplay-status';status.setAttribute('role','status');status.textContent='Ouverture du mode… Votre parcours Histoire est conservé.';panel.append(status);
  frame=doc.createElement('iframe');frame.id='freeplay-engine60';frame.title=mode==='training'?'B.O.W. Protocol — Laboratoire':'B.O.W. Protocol — Versus';frame.setAttribute('allow','fullscreen; gamepad');frame.onload=()=>{frame?.contentWindow?.postMessage({type:'cqc60.freeplay.ping'},'*');};panel.append(frame);
  if(root.CQC55_ENGINE){const bytes=Uint8Array.from(atob(root.CQC55_ENGINE),c=>c.charCodeAt(0));frame.srcdoc=new TextDecoder().decode(bytes);}else frame.src='versus.html';
  clearInterval(ping);ping=setInterval(()=>frame?.contentWindow?.postMessage({type:'cqc60.freeplay.ping'},'*'),250);clearTimeout(timeout);timeout=setTimeout(()=>{if(!prepared&&session)status.textContent='Le mode ne répond pas encore. Revenez aux histoires puis réessayez ; votre parcours est conservé.';},12000);
  panel.querySelector('button').focus();return true;
 }
 root.addEventListener('message',event=>{
  if(!session||!frame||event.source!==frame.contentWindow)return;const data=event.data||{};
  if(data.type==='cqc60.freeplay.ready'&&data.version==='0.60'){send();return;}
  if(data.type==='cqc60.freeplay.prepared'&&data.session===session){prepared=true;clearInterval(ping);clearTimeout(timeout);panel.querySelector('.freeplay-status').textContent='Choisissez vos règles puis lancez le combat. Retour aux histoires conserve votre parcours.';frame.focus();}
 });
 root.addEventListener('pagehide',close);
 menu.append(button('Versus',()=>open('cpu')),button('Dojo',()=>open('training')));
 root.CQC60_FREEPLAY=Object.freeze({open,close,diagnostics:()=>({open:!!panel&&!panel.hidden,prepared,session,mode:requestedMode,selected})});
})(window);
