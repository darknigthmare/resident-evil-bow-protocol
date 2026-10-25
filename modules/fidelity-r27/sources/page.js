import {verifiedBytes} from '../../fidelity-r24/models/verified-assets.js';
const $ = id => document.getElementById(id);
const root = new URL('../../../', import.meta.url);
const roles = {'portrait':'Portrait', 'full-body-reference':'Corps entier déclaré', 'partial-body-reference':'Corps partiel',
  'scene-reference':'Vue de scène', 'model-preview':'Aperçu publié du modèle', 'source-model-render':'Vues dérivées de géométrie complète'};
let data, entries = [], urls = [], generation = 0, abort;
function node(tag, text) {const value = document.createElement(tag); if (text != null) value.textContent = String(text); return value;}
function local(value) {
  if (typeof value !== 'string' || !value || value.startsWith('/') || value.includes('\\') || value.split('/').includes('..')) throw Error('Chemin de source invalide.');
  const url = new URL(value, root);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname) || !/\/(?:assets|modules)\//.test(url.pathname)) throw Error('Source extérieure refusée.');
  return url;
}
async function verifiedImage(record, token, signal) {
  if (!Number.isInteger(record.bytes) || record.bytes <= 0 || record.bytes > 12 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(record.sha256)) throw Error('Métadonnées d’image invalides.');
  local(record.path);
  const raw = await verifiedBytes(record,root,root,signal);
  if (token !== generation) return null;
  const mime = /\.webp$/i.test(record.path) ? 'image/webp' : /\.jpe?g$/i.test(record.path) ? 'image/jpeg' : 'image/png';
  const url = URL.createObjectURL(new Blob([raw], {type:mime})); urls.push(url); return url;
}
function clear() {generation++;abort?.abort();abort=new AbortController();for(const url of urls)URL.revokeObjectURL(url);urls=[];$('references').replaceChildren();$('models').replaceChildren();}
function visible(record) {
  const scope=$('scope').value;
  return scope==='all' || scope==='complete' && record.bodyCoverage==='complete' || scope==='portrait' && record.role==='portrait'
    || scope==='models' && ['model-preview','source-model-render'].includes(record.role);
}
async function show() {
  clear(); const token=generation, signal=abort.signal;
  const entry=entries.find(item=>item.id===$('identity').value);
  if(!entry){$('identityTitle').textContent='Aucune incarnation trouvée';$('edition').textContent='';$('metadataNote').hidden=true;$('status').textContent='Aucune référence pour cette recherche.';return;}
  $('identityTitle').textContent=entry.name;$('edition').textContent=entry.edition+' · '+entry.id;
  const drift=entry.references.some(record=>record.historicalMetadataMatchesCurrentFile===false);
  $('metadataNote').hidden=!drift;$('metadataNote').textContent=drift?'L’empreinte historique du portrait diffère du fichier actuel. L’index conserve les deux valeurs ; les références revues restent présentées séparément.':'';
  const selected=entry.references.filter(visible);
  $('status').textContent=selected.length+' référence(s) pour cette incarnation ; vérification des fichiers…';
  const cards=selected.map(record=>{
    const card=node('article');card.className='source-card';card.append(node('h3',roles[record.role]||'Référence'));
    const text=node('p',record.edition);card.append(text);
    const image=node('img');image.alt=entry.name+' — '+(roles[record.role]||'référence');image.hidden=true;
    const state=node('p','Vérification de l’image…');state.setAttribute('role','status');
    const link=node('a','Ouvrir le fichier source');link.href=local(record.path).href;card.append(image,state,link);
    if(record.candidate)card.append(node('p','Référence candidate : édition ou forme à confirmer pour cette incarnation.'));
    if(record.derived)card.append(node('p','Rendu dérivé d’un modèle publié ; éclairage et angles de la recette, pas ceux du jeu certifiés.'));
    $('references').append(card);return{record,image,state};
  });
  for(const info of [...entry.exactModels,...entry.candidateModels]){
    const row=node('li'),link=node('a',info.id+(info.candidate?' — candidat':' — attribution publiée'));
    link.href=local(info.viewer).href;row.append(link,node('span',' · '+info.sourceEdition+' · '+info.modelRole));$('models').append(row);
  }
  if(!$('models').children.length)$('models').append(node('li','Aucun modèle attribué ou candidat dans les lots importés.'));
  let verified=0;
  await Promise.all(cards.map(async({record,image,state})=>{
    try{
      const url=await verifiedImage(record,token,signal);if(!url||token!==generation)return;
      image.src=url;await image.decode();if(token!==generation)return;
      if(image.naturalWidth!==record.width||image.naturalHeight!==record.height)throw Error('Dimensions de source inattendues.');
      image.hidden=false;verified++;state.textContent='Fichier vérifié à l’octet · '+record.width+' × '+record.height;
    }catch(error){if(token===generation&&error.name!=='AbortError')state.textContent=error.message;}
  }));
  if(token===generation)$('status').textContent=verified+' fichier(s) vérifié(s) sur '+selected.length+' référence(s).';
}
function filter(){
  const previous=$('identity').value,q=$('search').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  entries=data.entries.filter(entry=>(entry.id+' '+entry.name+' '+entry.edition).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
  $('identity').replaceChildren(...entries.map(entry=>{const option=node('option',entry.name+' · '+entry.edition);option.value=entry.id;return option;}));
  if(entries.some(entry=>entry.id===previous))$('identity').value=previous;show();
}
async function load(){
  $('retry').hidden=true;
  try{
    const response=await fetch('manifest.json');if(!response.ok)throw Error('Index d’apparence indisponible.');
    const value=await response.json();
    if(value.schema!=='re.bow.appearance-source-index/1'||value.canonicalFidelityCertified!==false||value.entries.length!==389||new Set(value.entries.map(entry=>entry.id)).size!==389)throw Error('Index d’apparence incomplet.');
    for(const entry of value.entries){
      if(!/^[a-z0-9-]+$/.test(entry.id)||!Array.isArray(entry.references)||!Array.isArray(entry.exactModels)||!Array.isArray(entry.candidateModels))throw Error('Incarnation d’apparence invalide.');
      for(const record of entry.references)local(record.path);
      for(const model of [...entry.exactModels,...entry.candidateModels])local(model.viewer);
    }
    data=value;for(const id of ['search','identity','scope'])$(id).disabled=false;filter();
    const requested=new URL(location.href).searchParams.get('identity');if(requested&&entries.some(entry=>entry.id===requested)){$('identity').value=requested;show();}
  }catch(error){clear();$('status').textContent=error.message;$('retry').hidden=false;}
}
$('filters').addEventListener('submit',event=>event.preventDefault());$('search').addEventListener('input',filter);$('identity').addEventListener('change',show);$('scope').addEventListener('change',show);$('retry').addEventListener('click',load);
addEventListener('pagehide',clear);addEventListener('pageshow',event=>{if(event.persisted&&data)show();});load();
