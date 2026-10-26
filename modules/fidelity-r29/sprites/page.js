/** Bounded gallery of actual generated files; no portrait substitutes or fabricated completion. */
const $ = id => document.getElementById(id);
const base = new URL('./', import.meta.url), root = new URL('../../../', base);
const pageSize = 24;
let manifest, entries = [], filtered = [], page = 0, generation = 0, active;
let imageUrl = '', connected = true;
const state = {ready:false,failed:false,generated:0,pending:385,selected:null,selectedVariant:null,displayed:null,displayedVariant:null,loading:false,page:0,resultCount:0,blobUrls:0};
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
    if(entry.admittedTargetEdition===false||entry.targetEditionAdmitted===false||entry.documentaryVariant===true)throw Error('Une variante documentaire ne peut pas remplacer la vue active.');
    if(!Number.isInteger(entry.width)||!Number.isInteger(entry.height)||entry.width<64||entry.height<64||entry.width*entry.height>32000000||!Number.isInteger(entry.bytes)||entry.bytes<=0||entry.bytes>33554432||!/^[a-f0-9]{64}$/.test(entry.sha256)||entry.canonicalFidelityCertified!==false||entry.canMirror!==false||!Array.isArray(entry.availableStates)||!(entry.availableStates.length===0||entry.availableStates.length===1&&entry.availableStates[0]==='idle')||!['neutral-base','source-bind-pose','source-presentation','unknown'].includes(entry.poseKind))throw Error('Déclaration de sprite invalide.');
    if(entry.sourceVariantLabel!==undefined&&(typeof entry.sourceVariantLabel!=='string'||entry.sourceVariantLabel.length>500))throw Error('Variante source invalide.');
    const gaps=entry.knownAppearanceGaps===undefined?[]:entry.knownAppearanceGaps;
    if(!Array.isArray(gaps)||gaps.length>64||gaps.some(value=>typeof value!=='string'||!value.trim()||value.length>2000))throw Error('Lacunes d’apparence invalides.');
    const eligible=!gaps.length&&entry.scope==='combatant-neutral-pose'&&entry.poseKind==='neutral-base'&&entry.reviewStatus==='visually-reviewed'&&entry.fullBodyReviewed===true&&['left','right'].includes(entry.sourceFacing);
    if((entry.availableStates.length===1)!==eligible)throw Error('Capacité d’attente déclarée sans pose neutre et revue admissibles.');
    const oldImage='modules/fidelity-r27/sprites/generated/'+entry.id+'/idle-right.png';
    const priorImage='modules/fidelity-r28/sprites/generated/'+entry.id+'/full-body.png';
    const newImage='modules/fidelity-r29/sprites/generated/'+entry.id+'/full-body.png';
    if(entry.image!==oldImage&&entry.image!==priorImage&&entry.image!==newImage)throw Error('Le PNG ne correspond pas à cette incarnation.');
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
  value.documentaryVariants=value.documentaryVariants||[];
  if(!Array.isArray(value.documentaryVariants)||value.documentaryVariants.length>385)throw Error('Variantes documentaires invalides.');
  if(value.counts.documentaryVariants!==value.documentaryVariants.length)throw Error('Compteur documentaire incohérent.');
  const variantIds=new Set();
  for(const entry of value.documentaryVariants){
    const target=value.sprites.find(item=>item.id===entry.id),key=entry.documentaryVariantKey;
    if(!target||typeof key!=='string'||!/^[a-z0-9-]{1,100}$/.test(key)||entry.variantId!==entry.id+'-'+key||variantIds.has(entry.variantId)
      ||entry.documentaryVariant!==true||entry.admittedTargetEdition!==false||entry.scope!=='documentary-edition-variant'
      ||entry.targetIncarnation!==target.incarnation||entry.targetScope!==target.scope||entry.targetFullBodyReviewed!==false
      ||entry.comparesAgainstSha256!==target.sha256||entry.supersedesSha256!==undefined||entry.canonicalFidelityCertified!==false
      ||!['left','right','front','unknown'].includes(entry.sourceFacing)||entry.canMirror!==false||entry.reviewStatus!=='visually-reviewed'||entry.fullBodyReviewed!==true
      ||!Array.isArray(entry.availableStates)||entry.availableStates.length||!['neutral-base','source-bind-pose','source-presentation','unknown'].includes(entry.poseKind)
      ||typeof entry.sourceEdition!=='string'||!entry.sourceEdition.trim()||entry.sourceEdition.length>500||entry.incarnation!==entry.sourceEdition
      ||!Number.isInteger(entry.width)||!Number.isInteger(entry.height)||entry.width<64||entry.height<64||entry.width*entry.height>32000000
      ||!Number.isInteger(entry.bytes)||entry.bytes<1||entry.bytes>33554432||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Une variante documentaire doit garder son édition et sa comparaison non admise.');
    const expected='modules/fidelity-r29/sprites/documentary-variants/'+entry.id+'/'+key+'.png';
    if(entry.image!==expected)throw Error('Fichier de variante documentaire incorrect.');
    local(entry.image,'modules/fidelity-r29/sprites/documentary-variants/');
    if(entry.knownAppearanceGaps!==undefined&&(!Array.isArray(entry.knownAppearanceGaps)||entry.knownAppearanceGaps.length>64||entry.knownAppearanceGaps.some(gap=>typeof gap!=='string'||!gap.trim()||gap.length>2000)))throw Error('Lacunes de variante invalides.');
    if(!Array.isArray(entry.provenance?.references)||!entry.provenance.references.length)throw Error('Références documentaires absentes.');
    for(const ref of entry.provenance.references){if(typeof ref.path!=='string'||!/^(?:assets|modules)\//.test(ref.path)||!/^[a-f0-9]{64}$/.test(ref.sha256))throw Error('Référence documentaire invalide.');local(ref.path,'');}
    variantIds.add(entry.variantId);
  }
  value.revisionFailures=value.revisionFailures||[];
  if(!Array.isArray(value.revisionFailures)||value.revisionFailures.length>385)throw Error('Révisions refusées invalides.');
  for(const entry of value.revisionFailures){const target=value.sprites.find(item=>item.id===entry.id);if(!target||entry.revisionOnly!==true||entry.existingActiveSpritePreserved!==true||entry.retryPerformed!==false||entry.preservedActiveSha256!==target.sha256||entry.path!=='modules/fidelity-r29/sprites/revision-failures/'+entry.id+'.json'||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Une révision refusée doit conserver son fichier actif.');}
  return value;
}
function clearImage() {
  $('sprite').hidden=true;$('sprite').removeAttribute('src');$('download').hidden=true;$('download').removeAttribute('href');
  if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl='';state.blobUrls=0;state.displayed=null;state.displayedVariant=null;
}
function text(tag, value) {const node=document.createElement(tag);node.textContent=String(value);return node;}
function renderList() {
  const query=$('search').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(), kind=$('production').value;
  filtered=entries.filter(entry=>{
    const haystack=[entry.id,entry.label,entry.incarnation,entry.sourceVariantLabel||''].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
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
function renderVariantChoices(id, selectedVariant){
  const host=$('variantChoices'),variants=manifest.documentaryVariants.filter(item=>item.id===id);
  const focused=host.contains(document.activeElement)?document.activeElement?.dataset.variant:undefined;
  host.replaceChildren();host.hidden=!variants.length;
  if(!variants.length)return;
  const activeButton=text('button','Vue active du catalogue');activeButton.type='button';activeButton.dataset.variant='';activeButton.setAttribute('aria-pressed',String(!selectedVariant));activeButton.addEventListener('click',()=>select(id));host.append(activeButton);
  for(const entry of variants){const button=text('button',entry.sourceEdition+' — comparaison 3DS ouverte');button.type='button';button.dataset.variant=entry.variantId;button.setAttribute('aria-pressed',String(selectedVariant===entry.variantId));button.addEventListener('click',()=>select(id,entry.variantId));host.append(button);}
  if(focused!==undefined)[...host.children].find(button=>button.dataset.variant===focused)?.focus({preventScroll:true});
}
async function select(id, variantId='') {
  const activeEntry=entries.find(item=>item.id===id);if(!activeEntry)return;
  const variant=variantId?manifest.documentaryVariants.find(item=>item.id===id&&item.variantId===variantId):null;
  if(variantId&&!variant)throw Error('Cette variante documentaire ne correspond pas à cette incarnation.');
  const entry=variant?{...variant,generated:true}:activeEntry;
  renderVariantChoices(id,variantId);
  const keepResultFocus=document.activeElement?.parentElement===$('results')&&document.activeElement.dataset.uid===id;
  active?.abort();active=new AbortController();const signal=active.signal, token=++generation;
  clearImage();state.selected=id;state.selectedVariant=variantId||null;state.loading=Boolean(entry.generated);$('detail').setAttribute('aria-busy',String(state.loading));
  $('detailTitle').textContent=entry.label;$('identity').textContent=entry.incarnation+' · '+id+(entry.sourceVariantLabel?' · '+entry.sourceVariantLabel:'');
  const poseLabels={'neutral-base':'base neutre revue','source-bind-pose':'pose de liaison de la source','source-presentation':'pose de présentation de la source','unknown':'pose à identifier'};
  $('poseClassification').textContent=entry.generated?'Pose : '+poseLabels[entry.poseKind]+'. État demandé : attente. Capacité admise : '+(entry.availableStates.length?'attente dans le côté revu':'aucune')+'.':'';
  if(variant)$('poseClassification').textContent='Variante documentaire '+entry.sourceEdition+' — comparaison avec '+entry.targetIncarnation+' ouverte. Aucun état de combat admis.';
  $('dossier').href=new URL('codex.html?id='+encodeURIComponent(id),root).href;$('dossier').hidden=false;
  $('limits').replaceChildren(...(entry.limitations||['Aucun fichier généré importé pour cette incarnation.']).map(value=>text('li',value)));
  for(const gap of entry.knownAppearanceGaps||[])$('limits').append(text('li','Apparence à compléter : '+gap));
  const revision=manifest.revisionFailures.find(item=>item.id===id);
  if(revision&&!variant){const li=text('li','La révision R29 a été refusée ; la pose active est conservée. '),link=text('a','Lire la preuve du refus');link.href=local(revision.path,'modules/fidelity-r29/sprites/revision-failures/').href;li.append(link);$('limits').append(li);}
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
    $('download').href=url;$('download').download=(variantId||id)+'-generated-r29.png';$('download').hidden=false;
    state.displayed=id;state.displayedVariant=variantId||null;
    $('assetStatus').textContent=variant?'PNG de l’édition source vérifié ; le corps et l’apparence du catalogue cible restent à compléter.':entry.availableStates.length?'Base neutre générée revue pour le corps et ce côté ; cycles de combat et fidélité 1:1 non certifiés.':entry.fullBodyReviewed?'Corps généré revu ; cette pose ne déclare aucun état d’attente de combat.':entry.reviewStatus==='visually-reviewed'?'Région visible revue ; source ou corps incomplet, aucun état de combat admis.':'Pose générée à revoir ; aucun corps complet ou cycle de combat n’est certifié par cette image.';
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
    $('search').disabled=false;$('production').disabled=false;$('loadStatus').textContent=state.generated+' fichier(s) généré(s), '+state.pending+' en attente, '+manifest.documentaryVariants.length+' variante(s) documentaire(s). Aucun cycle complet de combat certifié.';
    const params=new URL(location.href).searchParams,requested=params.get('identity')||params.get('id');
    const requestedEntry=entries.find(entry=>entry.id===requested);
    if(requestedEntry)$('search').value=requestedEntry.id;
    renderList();const selected=requestedEntry||entries.find(entry=>entry.id===state.selected)||entries.find(entry=>entry.generated)||entries[0];
    const selectedVariant=params.has('variant')?params.get('variant'):(selected.id===state.selected?state.selectedVariant:'');
    await select(selected.id,selectedVariant||'');
  } catch(error){if(signal.aborted||token!==generation)return;state.failed=true;state.ready=false;$('loadStatus').textContent=error.message;$('results').replaceChildren();}
  finally{$('refresh').disabled=false;}
}
$('filters').addEventListener('submit',event=>event.preventDefault());for(const id of ['search','production'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;renderList();});
$('previous').addEventListener('click',()=>{page--;renderList();});$('next').addEventListener('click',()=>{page++;renderList();});$('refresh').addEventListener('click',load);
addEventListener('pagehide',()=>{connected=false;active?.abort();++generation;clearImage();state.loading=false;});
addEventListener('pageshow',()=>{if(!connected){connected=true;if(state.ready&&state.selected)select(state.selected,state.selectedVariant||'');else load();}});
window.RE_GENERATED_SPRITES_R29=Object.freeze({state:()=>({...state})});load();
