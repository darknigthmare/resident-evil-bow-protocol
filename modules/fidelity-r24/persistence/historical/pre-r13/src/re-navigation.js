(function(root){'use strict';const api=root.RE_COMBAT;if(!api)return;const q=new URLSearchParams(location.search);
if(q.get('mode')==='training')document.querySelector('#mode').value='training';if(q.get('mode')==='local')document.querySelector('#mode').value='local';
const uid=q.get('uid');if(uid&&api.fighters.some(f=>f.uid===uid))api.select(uid,api.fighters.find(f=>f.uid!==uid)?.uid||uid);
document.querySelector('#selectScreen .brand')?.setAttribute('title','Resident Evil — B.O.W. Protocol');
const link=document.querySelector('#backCommand');if(link)link.onclick=()=>location.href='../index.html';
if(root.parent!==root)document.querySelector('.re-home-link')?.remove();
})(window);
