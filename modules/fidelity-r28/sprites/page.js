/** Bounded gallery of actual generated files; no portrait substitutes or fabricated completion. */
const $ = id => document.getElementById(id);
const base = new URL('./', import.meta.url), root = new URL('../../../', base);
const pageSize = 24;
let manifest, entries = [], filtered = [], page = 0, generation = 0, active;
let imageUrl = '', connected = true;
const state = {ready:false,failed:false,generated:0,pending:385,selected:null,displayed:null,loading:false,page:0,resultCount:0,blobUrls:0};
const local = (value, prefix) => {
  if(typeof value !== 'string' || value.includes('\\')) throw Error('Chemin de ressource invalide.');
  const url = new URL(value, root);
  if(url.origin !== root.origin || !url.pathname.startsWith(new URL(prefix, root).pathname) || url.search || url.hash) throw Error('Ressource extérieure au registre refusée.');
  return url;
};
async function bytes(url, limit, signal) {
  const response = await fetch(url, {signal,cache:'no-store'});
  if(!response.ok || response.type === 'opaque') throw Error('Ressource indisponible.');
  const declared = Number(response.headers.get('content-length'));
  if(Number.isFinite(declared) && declared > limit) throw Error('Ressource trop volumineuse.');
  const reader = response.body?.getReader();
  if(!reader) throw Error('Lecture bornée indisponible.');
  const chunks=[]; let length=0;
  try {
    for(;;) {const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw Error('Ressource trop volumineuse.');}chunks.push(value);}
  } finally {reader.releaseLock();}
  const result = new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
const digest = async raw => [...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(value=>value.toString(16).padStart(2,'0')).join('');
function validate(value) {
  if(value?.schema !== 're.bow.generated-combat-sprites/1' || value.counts?.targetIdentities !== 385 || !Array.isArray(value.sprites) || !Array.isArray(value.pending)) throw Error('Registre de sprites incomplet.');
  const ids = [...value.sprites,...value.pending].map(entry=>entry.id);
  if(ids.length !== 385 || new Set(ids).size !== 385 || ids.some(id=>typeof id!=='string'||!/^[a-z0-9-]+$/.test(id))) throw Error('Identités répétées ou manquantes.');
  if(value.counts.generatedSprites !== value.sprites.length || value.counts.pendingSprites !== value.pending.length || value.counts.canonicalFidelityCertified !== 0 || value.counts.originalGameSprites !== 0 || value.counts.completeCombatAnimationSets !== 0) throw Error('Compteurs ou certification non pris en charge.');
  for(const entry of value.sprites) {
    if(!Number.isInteger(entry.width)||!Number.isInteger(entry.height)||entry.width<64||entry.height<64||entry.width*entry.height>32000000||!Number.isInteger(entry.bytes)||entry.bytes<=0||entry.bytes>33554432||!/^[a-f0-9]{64}$/.test(entry.sha256)||entry.canonicalFidelityCertified!==false||entry.canMirror!==false||!Array.isArray(entry.availableStates)||!(entry.availableStates.length===0||entry.availableStates.length===1&&entry.availableStates[0]==='idle')||!['neutral-base','source-bind-pose','source-presentation','unknown'].includes(entry.poseKind))throw Error('Déclaration de sprite invalide.');
    const eligible=entry.scope==='combatant-neutral-pose'&&entry.poseKind==='neutral-base'&&entry.reviewStatus==='visually-reviewed'&&entry.fullBodyReviewed===true&&['left','right'].includes(entry.sourceFacing);
    if((entry.availableStates.length===1)!==eligible)throw Error('Capacité d’attente déclarée sans pose neutre et revue admissibles.');
    const oldImage='modules/fidelity-r27/sprites/generated/'+entry.id+'/idle-right.png';
    const newImage='modules/fidelity-r28/sprites/generated/'+entry.id+'/full-body.png';
    if(entry.image!==oldImage&&entry.image!==newImage)throw Error('Le PNG ne correspond pas à cette incarnation.');
    if(entry.image===newImage&&!/^[a-f0-9]{64}$/.test(entry.supersedesSha256||''))throw Error('Le remplacement ne lie pas la version antérieure.');
    local(entry.image,'modules/');
    if(!Array.isArray(entry.provenance?.references))throw Error('Références de génération absentes.');
    for(const ref of entry.provenance.references) {
      if(typeof ref.path!=='string'||!/^(?:assets|modules)\//.test(ref.path)||!/^[a-f0-9]{64}$/.test(ref.sha256))throw Error('Référence de génération invalide.');
      local(ref.path,'');
    }
    if(typeof entry.fullBodyReviewed!=='boolean'||entry.fullBodyReviewed&&entry.reviewStatus!=='visually-reviewed')throw Error('Revue du corps incohérente.');
  }
  if(value.counts.fullBodyReviewedSprites!==value.sprites.filter(entry=>entry.fullBodyReviewed).length)throw Error('Compteur de corps revus incorrect.');
  return value;
}
function clearImage() {
  $('sprite').hidden=true;$('sprite').removeAttribute('src');$('download').hidden=true;$('download').removeAttribute('href');
  if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl='';state.blobUrls=0;state.displayed=null;
}
function text(tag, value) {const node=document.createElement(tag);node.textContent=String(value);return node;}
function renderList() {
  const query=$('search').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(), kind=$('production').value;
  filtered=entries.filter(entry=>{
    const haystack=[entry.id,entry.label,entry.incarnation].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return haystack.includes(query)&&(kind==='all'||kind==='generated'&&entry.generated||kind==='pending'&&!entry.generated||kind==='reviewed'&&entry.fullBodyReviewed===true||kind==='context'&&entry.scope==='context-encounter');
  });
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages-1);
  $('results').replaceChildren(...filtered.slice(page*pageSize,(page+1)*pageSize).map(entry=>{
    const button=text('button',entry.label);button.type='button';button.dataset.uid=entry.id;button.setAttribute('aria-current',String(state.selected===entry.id));
    const detail=text('span',entry.incarnation+' · '+(entry.generated?'PNG généré':'En attente'));detail.className='sub';button.append(detail);button.addEventListener('click',()=>select(entry.id));return button;
  }));
  $('resultCount').textContent=filtered.length+' incarnation'+(filtered.length>1?'s':'')+' sur 385';$('pageLabel').textContent='Page '+(page+1)+' sur '+pages;
  $('previous').disabled=page===0;$('next').disabled=page>=pages-1;state.page=page;state.resultCount=filtered.length;
}
async function select(id) {
  const entry=entries.find(item=>item.id===id);if(!entry)return;
  const keepResultFocus=document.activeElement?.parentElement===$('results')&&document.activeElement.dataset.uid===id;
  active?.abort();active=new AbortController();const signal=active.signal, token=++generation;
  clearImage();state.selected=id;state.loading=Boolean(entry.generated);$('detail').setAttribute('aria-busy',String(state.loading));
  $('detailTitle').textContent=entry.label;$('identity').textContent=entry.incarnation+' · '+id;
  const poseLabels={'neutral-base':'base neutre revue','source-bind-pose':'pose de liaison de la source','source-presentation':'pose de présentation de la source','unknown':'pose à identifier'};
  $('poseClassification').textContent=entry.generated?'Pose : '+poseLabels[entry.poseKind]+'. État demandé : attente. Capacité admise : '+(entry.availableStates.length?'attente dans le côté revu':'aucune')+'.':'';
  $('dossier').href=new URL('codex.html?id='+encodeURIComponent(id),root).href;$('dossier').hidden=false;
  $('limits').replaceChildren(...(entry.limitations||['Aucun fichier généré importé pour cette incarnation.']).map(value=>text('li',value)));
  const references=entry.provenance?.references||[];$('references').replaceChildren();$('emptyReferences').hidden=references.length>0;
  for(const ref of references) {
    const li=document.createElement('li'), link=text('a',ref.role+' · '+ref.path);
    link.href=local(ref.path,'').href;li.append(link);$('references').append(li);
  }
  renderList();
  if(keepResultFocus)[...$('results').children].find(button=>button.dataset.uid===id)?.focus({preventScroll:true});
  if(!entry.generated){$('assetStatus').textContent=entry.generationStatus==='BLOCKED_BY_TOOL'?'Génération refusée par l’outil : '+entry.reason:'En attente : aucun PNG généré ne remplace cette incarnation.';$('detail').setAttribute('aria-busy','false');return;}
  $('assetStatus').textContent='Vérification du PNG généré…';
  try {
    const raw=await bytes(local(entry.image,'modules/'),33554432,signal);
    if(raw.byteLength!==entry.bytes||await digest(raw)!==entry.sha256)throw Error('Empreinte du PNG incorrecte ; affichage refusé.');
    if(token!==generation||!connected)return;
    const url=URL.createObjectURL(new Blob([raw],{type:'image/png'}));imageUrl=url;state.blobUrls=1;
    $('sprite').src=url;await $('sprite').decode();
    if(token!==generation||!connected)return;
    if($('sprite').naturalWidth!==entry.width||$('sprite').naturalHeight!==entry.height)throw Error('Dimensions du PNG incorrectes.');
    $('sprite').alt='Pose générée de '+entry.label+' — '+entry.incarnation;$('sprite').hidden=false;
    $('download').href=url;$('download').download=id+'-generated-r28.png';$('download').hidden=false;
    state.displayed=id;
    $('assetStatus').textContent=entry.availableStates.length?'Base neutre générée revue pour le corps et ce côté ; cycles de combat et fidélité 1:1 non certifiés.':entry.fullBodyReviewed?'Corps généré revu ; cette pose ne déclare aucun état d’attente de combat.':entry.reviewStatus==='visually-reviewed'?'Région visible revue ; source ou corps incomplet, aucun état de combat admis.':'Pose générée à revoir ; aucun corps complet ou cycle de combat n’est certifié par cette image.';
  } catch(error) {
    if(token!==generation||signal.aborted)return;clearImage();$('assetStatus').textContent=error.message;
  } finally {if(token===generation){state.loading=false;$('detail').setAttribute('aria-busy','false');}}
}
async function load() {
  active?.abort();active=new AbortController();const signal=active.signal,token=++generation;clearImage();state.ready=false;state.failed=false;$('search').disabled=true;$('production').disabled=true;
  $('loadStatus').textContent='Chargement du registre…';$('refresh').disabled=true;
  try {
    const received=await bytes(new URL('manifest.json',base),8388608,signal);
    if(token!==generation||!connected)return;
    manifest=validate(JSON.parse(new TextDecoder().decode(received)));
    entries=[...manifest.sprites.map(entry=>({...entry,generated:true})),...manifest.pending.map(entry=>({...entry,generated:false}))].sort((a,b)=>a.label.localeCompare(b.label,'fr')||a.id.localeCompare(b.id));
    state.generated=manifest.counts.generatedSprites;state.pending=manifest.counts.pendingSprites;state.ready=true;
    $('generatedCount').textContent=state.generated;$('pendingCount').textContent=state.pending;$('reviewedCount').textContent=manifest.counts.fullBodyReviewedSprites||0;
    $('search').disabled=false;$('production').disabled=false;$('loadStatus').textContent=state.generated+' fichier(s) généré(s), '+state.pending+' en attente. Aucun cycle complet de combat certifié.';
    const params=new URL(location.href).searchParams,requested=params.get('identity')||params.get('id');
    const requestedEntry=entries.find(entry=>entry.id===requested);
    if(requestedEntry)$('search').value=requestedEntry.id;
    renderList();const selected=requestedEntry||entries.find(entry=>entry.id===state.selected)||entries.find(entry=>entry.generated)||entries[0];await select(selected.id);
  } catch(error){if(signal.aborted||token!==generation)return;state.failed=true;$('loadStatus').textContent=error.message;$('results').replaceChildren();}
  finally{$('refresh').disabled=false;}
}
$('filters').addEventListener('submit',event=>event.preventDefault());for(const id of ['search','production'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;renderList();});
$('previous').addEventListener('click',()=>{page--;renderList();});$('next').addEventListener('click',()=>{page++;renderList();});$('refresh').addEventListener('click',load);
addEventListener('pagehide',()=>{connected=false;active?.abort();++generation;clearImage();state.loading=false;});
addEventListener('pageshow',()=>{if(!connected){connected=true;if(state.ready&&state.selected)select(state.selected);else load();}});
window.RE_GENERATED_SPRITES_R28=Object.freeze({state:()=>({...state})});load();
