/* Public archive for the existing stylized conclusions; no new canon is claimed. */
(function(root){'use strict';
const D=root.RE_DATA,P=root.CQC_FINISHERS_053.profiles,$=id=>document.getElementById(id),PAGE=24;
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const rows=D.fighters.flatMap(f=>(P[f.uid]?.finishers||[]).map(m=>({f,m})));let page=0;
for(const f of D.fighters){const o=document.createElement('option');o.value=f.uid;o.textContent=f.name+' / '+f.source;$('finishSubject').append(o);}
for(const f of D.fighters){const o=document.createElement('option');o.value=f.uid;o.textContent=f.name+' / '+f.source;$('finishVictim').append(o);}
const q=new URLSearchParams(location.search).get('uid');if(D.fighters.some(f=>f.uid===q))$('finishSubject').value=q;
$('finishTotal').textContent=rows.length;
function render(){const uid=$('finishSubject').value,search=fold($('finishSearch').value),filtered=rows.filter(r=>(uid==='all'||r.f.uid===uid)&&fold(r.f.name+' '+r.f.ep+' '+r.m.name+' '+r.m.description).includes(search));const pages=Math.ceil(filtered.length/PAGE);page=Math.max(0,Math.min(page,Math.max(0,pages-1)));$('finishCards').replaceChildren();
 for(const {f,m}of filtered.slice(page*PAGE,page*PAGE+PAGE)){
  const card=document.createElement('article');card.className='finish-card';card.dataset.id=m.id;
  const img=document.createElement('img');img.src=f.portrait;img.alt='';img.loading='lazy';img.decoding='async';
  const body=document.createElement('div'),name=document.createElement('h2'),subject=document.createElement('p'),desc=document.createElement('p'),limit=document.createElement('small'),link=document.createElement('a');
  name.textContent=m.name;subject.textContent=f.name+' / '+f.ep;desc.textContent=m.description||'Conclusion de duel adaptée au moteur 2D.';limit.textContent='SIMULATION STYLISÉE — ni fatalité canonique ni animation extraite.';link.href='modules/versus.html?uid='+encodeURIComponent(f.uid);link.textContent='CHOISIR CE SPÉCIMEN →';const verdict=document.createElement('p');verdict.className='asset-warning';const uid=$('finishVictim').value;verdict.textContent=uid==='none'?'Choisissez une victime pour contrôler la compatibilité technique.':root.RE_FINISHER_COMPATIBILITY.evaluate(f.uid,uid,m.id).reason;body.append(verdict);body.append(name,subject,desc,limit,link);card.append(img,body);$('finishCards').append(card);
 }
 $('finishResults').textContent=filtered.length+' CONCLUSION'+(filtered.length>1?'S':'')+' · PAGE '+(pages?page+1:0)+' / '+pages;$('finishPrev').disabled=page===0;$('finishNext').disabled=page+1>=pages;
}
$('finishVictim').addEventListener('change',render);
$('finishSubject').addEventListener('change',()=>{page=0;render();});$('finishSearch').addEventListener('input',()=>{page=0;render();});$('finishPrev').addEventListener('click',()=>{page--;render();});$('finishNext').addEventListener('click',()=>{page++;render();});root.RE_FINISHER_ARCHIVE=Object.freeze({count:rows.length});render();
})(window);
