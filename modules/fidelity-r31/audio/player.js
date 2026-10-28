import {validateManifest, validateNotes, documentFor} from './review-format.js';

const repository = new URL('../../../', import.meta.url), manifestURL = new URL('manifest.json', import.meta.url);
const byId = id => document.getElementById(id);
const elements = Object.fromEntries(['identity','group','search','clip','summary','candidateScope','facts','prepare','clear','audio','source','playStatus','reviewForm','heard','reviewIdentity','speaker','phase','action','note','saveNote','noteStatus','export','import','importStatus','provenance'].map(id=>[id,byId(id)]));
const limits = Object.freeze({manifestBytes: 2 * 1024 * 1024, clipBytes: 4 * 1024 * 1024, noteBytes: 256 * 1024});
let manifest = null, manifestSha256 = '', selected = null, active = true, generation = 0, controller = null, objectURL = null, manifestController = null;
let ready, notes = new Map(), downloadedBytes = 0, preparedClips = 0, sourceRequests = 0;
elements.audio.volume = .25;
const sha = async raw => [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(n=>n.toString(16).padStart(2,'0')).join('');
function local(path) {
  if (!/^modules\/fidelity-r31\/audio\/(?:clips\/[0-9]+\/[a-f0-9]{24}\.(?:wav|ogg)|archives\/asset-[0-9]+\.zip)$/.test(path)) throw Error('Chemin audio local non valide.');
  const result = new URL(path,repository);
  if (result.origin !== repository.origin || !result.pathname.startsWith(repository.pathname)) throw Error('Le fichier quitte cette bibliothèque.');
  return result;
}
async function bounded(response, maximum, exact, signal) {
  if (!response.ok || response.type === 'opaque') throw Error('Le fichier audio n’est pas disponible.');
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength)>maximum || exact!==undefined&&Number(contentLength)!==exact)) throw Error('La taille du fichier ne correspond pas à la bibliothèque.');
  const reader = response.body?.getReader();
  if (!reader) throw Error('Lecture bornée indisponible.');
  const chunks=[];let length=0;
  try {
    for (;;) {
      if (signal?.aborted) throw Error('Chargement annulé.');
      const part=await reader.read();if(part.done)break;length+=part.value.byteLength;
      if(length>maximum||exact!==undefined&&length>exact)throw Error('Le fichier dépasse sa taille déclarée.');chunks.push(part.value);
    }
  } catch(error){await reader.cancel().catch(()=>{});throw error;} finally{reader.releaseLock();}
  if(exact!==undefined&&length!==exact)throw Error('Le fichier est incomplet.');
  const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
}
function stop() {
  generation++; controller?.abort();controller=null;
  elements.audio.pause();elements.audio.removeAttribute('src');elements.audio.load();
  if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
  elements.clear.disabled=true;elements.prepare.disabled=!active||!selected;
}
function fillFacts(clip) {
  const rows=[['Groupe publié',clip.publishedGroup],['Édition source',clip.sourceEdition],['Fichier publié',clip.publishedLabel],
    ['Format',clip.probe.format.toUpperCase()+' · '+clip.probe.sampleRate+' Hz · '+clip.probe.channels+' canal(aux)'],
    ['Durée mesurée',clip.probe.durationSeconds.toFixed(3)+' s'],['Voix, phase et geste','À vérifier par écoute et séquence du jeu']];
  elements.facts.replaceChildren(...rows.flatMap(([key,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;return[dt,dd];}));
}
function showNote() {
  const previous=notes.get(selected?.clipId);
  elements.heard.checked=previous?.heard||false;
  for(const key of ['speaker','phase','action','note'])elements[key].value=previous?.[key]||'';
  const unknown=document.createElement('option');unknown.value='';unknown.textContent='À déterminer';
  elements.reviewIdentity.replaceChildren(unknown,...(selected?.candidateIdentityIds||[]).map(id=>{const option=document.createElement('option');option.value=id;option.textContent=manifest.identities.find(row=>row.id===id).name;return option;}));
  elements.reviewIdentity.value=previous?.candidateIdentityId||'';elements.saveNote.disabled=!selected;
}
function selectClip() {
  stop();selected=manifest?.entries.find(row=>row.clipId===elements.clip.value)||null;
  elements.prepare.disabled=!active||!selected;elements.saveNote.disabled=!selected;
  if(!selected){elements.facts.replaceChildren();elements.candidateScope.textContent='Aucun extrait ne correspond à cette recherche.';elements.source.hidden=true;return;}
  fillFacts(selected);showNote();
  elements.candidateScope.textContent='Candidats : '+selected.candidateIdentityIds.map(id=>manifest.identities.find(row=>row.id===id).name).join(' · ')+'. Le groupe publié ne détermine pas l’incarnation, la phase ou l’action de chaque fichier.';
  elements.source.href=selected.sourcePage;elements.source.hidden=false;
  elements.playStatus.textContent='Extrait sélectionné ; aucun son n’est encore préparé ni lu.';
  const url=new URL(location.href);url.searchParams.set('clip',selected.clipId);
  if(elements.identity.value)url.searchParams.set('id',elements.identity.value);else url.searchParams.delete('id');
  history.replaceState(null,'',url);
}
function filter(preferred) {
  const current=preferred||elements.clip.value, needle=elements.search.value.trim().toLocaleLowerCase();
  const entries=manifest.entries.filter(row=>(!elements.identity.value||row.candidateIdentityIds.includes(elements.identity.value))
    &&(!elements.group.value||String(row.assetId)===elements.group.value)&&(!needle||row.publishedLabel.toLocaleLowerCase().includes(needle)));
  elements.clip.replaceChildren(...entries.map(row=>{const option=document.createElement('option');option.value=row.clipId;option.textContent=row.publishedGroup+' · '+row.publishedLabel;return option;}));
  if(entries.some(row=>row.clipId===current))elements.clip.value=current;
  else if(entries.length)elements.clip.value=entries[0].clipId;
  selectClip();
}
function noteCount() {elements.noteStatus.textContent=notes.size+' note(s) personnelle(s) conservée(s) dans cette page. Attribution officielle et combat inchangés.';elements.export.disabled=!notes.size;}
async function prepare() {
  if(!active||!selected)return false;
  stop();const token=generation,clip=selected;controller=new AbortController();const current=controller;
  elements.prepare.disabled=true;elements.playStatus.textContent='Vérification et préparation de l’extrait…';sourceRequests++;
  try{
    const raw=await bounded(await fetch(local(clip.path),{signal:current.signal,credentials:'same-origin'}),limits.clipBytes,clip.bytes,current.signal);
    if(await sha(raw)!==clip.sha256)throw Error('L’empreinte de cet extrait ne correspond pas à la source conservée.');
    if(!active||token!==generation||current.signal.aborted)return false;
    objectURL=URL.createObjectURL(new Blob([raw],{type:clip.probe.format==='ogg'?'audio/ogg':'audio/wav'}));
    elements.audio.src=objectURL;elements.audio.load();elements.clear.disabled=false;downloadedBytes+=raw.length;preparedClips++;
    elements.playStatus.textContent='Extrait vérifié et préparé. Utilisez les commandes du lecteur pour l’écouter.';return true;
  }catch(error){if(active&&token===generation&&!current.signal.aborted)elements.playStatus.textContent=error.message;return false;}
  finally{if(controller===current)controller=null;if(token===generation)elements.prepare.disabled=!active||!selected;}
}
async function initialize() {
  const current = new AbortController(); manifestController = current;
  try{
    if(!crypto?.subtle)throw Error('Vérification SHA-256 indisponible dans ce contexte.');
    const raw=await bounded(await fetch(manifestURL,{credentials:'same-origin',signal:current.signal}),limits.manifestBytes,undefined,current.signal);
    const parsed=validateManifest(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))), hash=await sha(raw);
    if(!active||current.signal.aborted)return false;
    manifest=parsed;manifestSha256=hash;
    const names=manifest.identities;
    for(const row of names){const option=document.createElement('option');option.value=row.id;option.textContent=row.name+' · '+row.targetGame;elements.identity.append(option);}
    for(const row of manifest.sources){const option=document.createElement('option');option.value=String(row.assetId);option.textContent=row.title+' · '+row.platform;elements.group.append(option);}
    elements.summary.textContent=manifest.counts.publishedAudioFiles+' fichiers publiés dans '+manifest.counts.sourceArchives+' archives ; '+manifest.counts.distinctDecodedPcmMeasurements+' empreintes PCM mesurées distinctes. '+manifest.counts.candidateCatalogueIdentities+' incarnations candidates ; aucune attribution finale au combat.';
    const list=document.createElement('ul');
    for(const source of manifest.sources){const li=document.createElement('li'),link=document.createElement('a'),archive=document.createElement('a');
      link.href=source.url;link.textContent=source.title+' — '+source.sourceEdition;
      archive.href=local(source.archive.path).href;archive.download='audio-source-'+source.assetId+'.zip';archive.textContent='Archive publiée ('+source.audioFiles+' fichiers)';
      li.append(link,document.createTextNode(' · '),archive);list.append(li);}
    const screenings=document.createElement('p');screenings.textContent=manifest.screening.length+' pages de jeux ont été vérifiées sans ressource audio publiée. Ce constat ne signifie pas que ces jeux ne contiennent pas de sons.';
    elements.provenance.replaceChildren(list,screenings);
    const query=new URLSearchParams(location.search),uid=query.get('id');
    if(uid&&!names.some(row=>row.id===uid))throw Error('Cette incarnation n’est pas présente dans le lot audio R31.');
    if(uid)elements.identity.value=uid;
    filter(query.get('clip'));noteCount();return true;
  }catch(error){if(active&&!current.signal.aborted){elements.summary.textContent=error.message;elements.prepare.disabled=true;}return false;}
  finally{if(manifestController===current)manifestController=null;}
}
elements.prepare.addEventListener('click',prepare);
elements.clear.addEventListener('click',()=>{stop();elements.playStatus.textContent='Extrait libéré ; aucune lecture en cours.';});
elements.clip.addEventListener('change',selectClip);
for(const id of ['identity','group'])elements[id].addEventListener('change',()=>filter());
elements.search.addEventListener('input',()=>filter());
elements.reviewForm.addEventListener('submit',event=>{
  event.preventDefault();if(!selected)return;
  const note={clipId:selected.clipId,sourceSha256:selected.sha256,candidateIdentityId:elements.reviewIdentity.value||null,
    heard:elements.heard.checked,speaker:elements.speaker.value,phase:elements.phase.value,action:elements.action.value,note:elements.note.value};
  try{documentFor([note],manifest,manifestSha256);notes.set(note.clipId,note);noteCount();}
  catch(error){elements.noteStatus.textContent=error.message;}
});
elements.export.addEventListener('click',()=>{
  if(!manifest||!notes.size)return;
  const raw=JSON.stringify(documentFor(notes.values(),manifest,manifestSha256),null,2)+'\n';
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');
  link.href=url;link.download='bow-r31-notes-audio-'+manifestSha256.slice(0,12)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
});
elements.import.addEventListener('change',async()=>{
  const file=elements.import.files?.[0];if(!file||!manifest)return;
  try{
    if(file.size>limits.noteBytes)throw Error('Le fichier de notes dépasse 256 Kio.');
    const proposed=validateNotes(JSON.parse(await file.text()),manifest,manifestSha256);
    notes=new Map(proposed.map(note=>[note.clipId,note]));showNote();noteCount();
    elements.importStatus.textContent='Notes personnelles importées après vérification des fichiers et incarnations. Aucune attribution au combat.';
  }catch(error){elements.importStatus.textContent=error.message+' Les notes de cette page sont conservées.';}
  finally{elements.import.value='';}
});
window.addEventListener('pagehide',()=>{active=false;manifestController?.abort();stop();});
window.addEventListener('pageshow',()=>{active=true;elements.prepare.disabled=!selected;if(!manifest&&(!manifestController||manifestController.signal.aborted))ready=initialize();});
ready=initialize();
window.RE_AUDIO_R31=Object.freeze({ready:()=>ready,state:()=>({loaded:!!manifest,active,selectedClip:selected?.clipId||null,
  manifestSha256,prepared:!!objectURL,loading:!!controller,preparedClips,sourceRequests,downloadedBytes,notes:notes.size,
  currentCandidateIdentityIds:[...(selected?.candidateIdentityIds||[])],gameStorageWrites:0,combatAudioAssigned:false,limits}),
  review:()=>manifest?documentFor(notes.values(),manifest,manifestSha256):null});
