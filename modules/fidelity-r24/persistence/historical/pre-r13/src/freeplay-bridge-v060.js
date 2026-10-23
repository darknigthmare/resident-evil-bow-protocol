/* The embedded free-play selector is separate from the story combat channel. */
(function(root){'use strict';
 const api=root.__CQC060Versus,doc=root.document;
 if(!api||root.parent===root||root.frameElement?.dataset?.story55==='1'||new URLSearchParams(root.location.search).get('embed')==='story55')return;
 const send=data=>root.parent.postMessage(data,'*');
 let session=null;
 root.addEventListener('message',event=>{
  if(event.source!==root.parent)return;
  const data=event.data||{};
  if(data.type==='cqc60.freeplay.ping'){send({type:'cqc60.freeplay.ready',version:'0.60'});return;}
  if(data.type==='cqc60.freeplay.prepare'){
   if(typeof data.session!=='string'||data.session.length<8||data.session.length>120||!['cpu','local','training'].includes(data.mode)||!api.fighters.some(f=>f.uid===data.uid))return;
   if(session===data.session){send({type:'cqc60.freeplay.prepared',session});return;}
   if(api.diagnostics().running)return;
   session=data.session;const other=api.fighters.find(f=>f.uid!==data.uid);api.select(data.uid,other.uid);doc.querySelector('#mode').value=data.mode;
   send({type:'cqc60.freeplay.prepared',session});
  }
 });
 send({type:'cqc60.freeplay.ready',version:'0.60'});
})(window);
