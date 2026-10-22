(() => {
 'use strict';
 const DEV=window.RE_PLAYER_SHELL?.isDev===true;
 const D=window.RE_DATA,$=s=>document.querySelector(s),catalog=D.catalog,F=new Map(D.fighters.map(f=>[f.uid,f]));
 const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const imagePath=x=>x.portrait||F.get(x.id)?.portrait||'';
 let page=0,filtered=[],focusId=null;const PAGE=24;
 const games=new Map;catalog.forEach(x=>games.set(x.gameKey,x.game));for(const [id,name]of games){const o=document.createElement('option');o.value=id;o.textContent=name;$('#catalogGame').append(o)}
 $('#catalogCount').textContent=catalog.length;
 function render(){
  const query=fold($('#catalogSearch').value),game=$('#catalogGame').value,status=$('#catalogStatus').value;
  filtered=catalog.filter(x=>(game==='all'||x.gameKey===game)&&(status==='all'||(status==='playable'===F.has(x.id)))&&fold(x.name+' '+x.game+' '+(x.bioAgent||'')).includes(query));
  page=Math.max(0,Math.min(page,Math.ceil(filtered.length/PAGE)-1));const entries=filtered.slice(page*PAGE,(page+1)*PAGE);
  $('#catalogGrid').innerHTML=entries.map(x=>`<button class="specimen-card" data-id="${escape(x.id)}"><span class="specimen-picture">${imagePath(x)?`<img src="${escape(imagePath(x))}" loading="lazy" alt="${escape(x.name)}">`:'<span class="missing-reference">ARCHIVE TEXTUELLE</span>'}<span class="specimen-state ${F.has(x.id)?'is-playable':''}">${F.has(x.id)?'● JOUABLE':'DOCUMENTÉ'}</span></span><span class="specimen-info"><small>${escape(x.game)}</small><b>${escape(x.name)}</b><span>OUVRIR LE DOSSIER ↗</span></span></button>`).join('');
  $('#catalogGrid').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>open(b.dataset.id)));
  $('#catalogGrid').querySelectorAll('img').forEach(im=>im.addEventListener('error',()=>{im.hidden=true;const note=document.createElement('span');note.className='missing-reference';note.textContent='VISUEL INDISPONIBLE';im.parentElement.append(note)},{once:true}));
  $('#catalogResults').textContent=`${filtered.length} dossier${filtered.length>1?'s':''} · ${filtered.filter(x=>F.has(x.id)).length} jouable${filtered.filter(x=>F.has(x.id)).length>1?'s':''}`;
  $('#catalogPage').textContent=`${filtered.length?page+1:0} / ${Math.ceil(filtered.length/PAGE)}`;$('#catalogPrev').disabled=page===0;$('#catalogNext').disabled=(page+1)*PAGE>=filtered.length;$('#noResults').hidden=!!filtered.length;
 }
 function link(label,href,external=false){const a=document.createElement('a');a.textContent=label;a.href=href;if(external){a.target='_blank';a.rel='noopener noreferrer'}return a}
 function open(id){
  const x=catalog.find(x=>x.id===id),f=F.get(id);if(!x)return;focusId=id;
  $('#detailImage').src=f?.sprite||imagePath(x);$('#detailImage').alt=x.name;$('#detailImage').hidden=!imagePath(x)&&!f;
  $('#detailStatus').textContent=f?(DEV?'SPÉCIMEN JOUABLE / '+(f.fidelity?.visualStatus?.includes('provisional')?'VISUEL PROVISOIRE':'POSE DE RÉFÉRENCE')+' / MOVESET 10 SUR 10 AUDITÉ':'SPÉCIMEN JOUABLE'):'ARCHIVE DOCUMENTAIRE';$('#detailName').textContent=x.name;$('#detailEpisode').textContent=x.game;
  $('#detailDescription').textContent=f?.morphology||x.description||'Référence visuelle de la créature dans cet épisode.';
  const facts=f?{'Agent biologique':f.bioAgent,'Profil de combat':f.combat?.role||f.role,'Incarnation':f.ep,...(DEV?{'Fidélité':'LORE AUDITÉ · POUVOIRS CLOISONNÉS'}:{}),'Techniques':Object.keys(f.combat?.moves||{}).length+' / 10','Actions de référence':(f.combat?.canonicalAttacks||[]).join(' · ')||'Voir les sources du dossier'}:{'Version':x.game,'Statut':DEV?'Référence consultable ; représentation de combat à intégrer':'Archive documentaire'};
  $('#detailFacts').replaceChildren();for(const[k,v]of Object.entries(facts)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;$('#detailFacts').append(dt,dd)}
  $('#detailScope').textContent=f?(f.combat?.fidelity?.rule||'Les capacités restent propres à cette incarnation.')+' '+(f.combat?.fidelity?.balanceBoundary||'Les commandes, frames et dégâts sont adaptés au moteur 2D.')+' '+f.assetNote:'Cette entrée documente l’apparence du jeu indiqué. Un portrait ne remplace pas un corps entier ni ses animations.';
  $('#detailActions').replaceChildren();if(f){const play=link('JOUER CE SPÉCIMEN →','modules/versus.html?uid='+encodeURIComponent(id));play.className='primary-action';$('#detailActions').append(play,link('ENTRAÎNEMENT','modules/versus.html?mode=training&uid='+encodeURIComponent(id)))}
  if(!f)$('#detailActions').append(link(DEV?'FICHE ENRICHIE ET ESSAI →':'CONSULTER LES OBSERVATIONS →','catalog.html?id='+encodeURIComponent(id)));
  $('#detailSources').replaceChildren();const urls=[['DOSSIER DE RÉFÉRENCE',x.sourcePage],['SOURCE DU RENDU',f?.spriteSource||x.spriteSource],...((f?.combat?.sources||[]).map((u,i)=>['RÉFÉRENCE LORE '+String(i+1).padStart(2,'0'),u]))].filter(([,u])=>/^https?:\/\//.test(u||''));const used=new Set;for(const[label,url]of urls){if(used.has(url))continue;used.add(url);$('#detailSources').append(link(label+' ↗',url,true))}
  $('#specimenDialog').showModal();
 }
 $('#closeSpecimen').addEventListener('click',()=>$('#specimenDialog').close());$('#specimenDialog').addEventListener('click',e=>{if(e.target===$('#specimenDialog'))$('#specimenDialog').close()});
 $('#specimenDialog').addEventListener('close',()=>{const button=Array.from($('#catalogGrid').querySelectorAll('button')).find(b=>b.dataset.id===focusId);button?.focus()});
 for(const sel of ['#catalogSearch','#catalogGame','#catalogStatus'])$(sel).addEventListener(sel.includes('Search')?'input':'change',()=>{page=0;render()});
 document.querySelector('.codex-filters').addEventListener('submit',e=>e.preventDefault());
 $('#catalogPrev').addEventListener('click',()=>{page--;render();$('#catalogGrid').scrollIntoView({behavior:'smooth'})});$('#catalogNext').addEventListener('click',()=>{page++;render();$('#catalogGrid').scrollIntoView({behavior:'smooth'})});
 render();const initial=new URLSearchParams(location.search).get('id');if(initial)open(initial);
})();
