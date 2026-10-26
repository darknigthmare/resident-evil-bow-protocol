import {renderSheet, validateEntry} from './renderer.js';
import {verifiedBytes} from '../../fidelity-r24/models/verified-assets.js';
const $ = id => document.getElementById(id);
const base = new URL('./', import.meta.url);
let entries = [], sheets = [], abort = null, serial = 0, blobURL = null;
const release = () => {if (blobURL) URL.revokeObjectURL(blobURL); blobURL = null;};
function showBlob(blob, label) {
  release(); blobURL = URL.createObjectURL(blob); $('sheet').src = blobURL;
  $('sheet').alt = 'Planche dérivée de ' + label + ', huit orientations de la pose source'; $('sheet').hidden = false;
  $('download').href = blobURL; $('download').download = $('model').value + '.png'; $('download').hidden = false;
}
async function select() {
  abort?.abort(); const token = ++serial; abort = new AbortController(); release();
  $('sheet').hidden = true; $('download').hidden = true; $('cancel').disabled = true; $('render').disabled = false; $('model').disabled = false;
  const entry = entries.find(item => item.id === $('model').value);
  if (!entry) return;
  $('attribution').textContent = entry.label + ' · ' + entry.game + ' · ' + entry.platform;
  $('limits').replaceChildren(...entry.limitations.map(text => {const li = document.createElement('li'); li.textContent = text; return li;}));
  $('source').href = '../models/index.html?model=' + encodeURIComponent(entry.id);
  const record = sheets.find(item => item.id === entry.id)?.sheet;
  if (!record) { $('status').textContent = 'Aucune planche conservée ; le calcul est disponible.'; return; }
  $('status').textContent = 'Vérification de la planche conservée…';
  try {
    const data = await verifiedBytes(record, base, base, abort.signal);
    if (token !== serial) return;
    showBlob(new Blob([data], {type: 'image/png'}), entry.label);
    $('status').textContent = 'Planche conservée vérifiée : huit vues dérivées, aucune animation certifiée.';
  } catch (error) {if (token === serial && error.name !== 'AbortError') $('status').textContent = 'La planche conservée ne peut pas être vérifiée. Le recalcul depuis les sources reste disponible.';}
}
$('model').addEventListener('change', select);
$('nativeSize').addEventListener('change', () => $('sheetFrame').classList.toggle('native-size', $('nativeSize').checked));
$('render').addEventListener('click', async () => {
  abort?.abort(); abort = new AbortController(); const token = ++serial;
  const entry = entries.find(item => item.id === $('model').value);
  $('render').disabled = true; $('cancel').disabled = false; $('model').disabled = true;
  $('status').textContent = 'Vérification des sources et calcul des huit orientations…';
  try {
    const result = await renderSheet(entry, {signal: abort.signal});
    if (token !== serial) return;
    showBlob(result.blob, entry.label); $('status').textContent = 'Huit vues recalculées depuis les sources vérifiées. Aucun miroir ni mouvement ajouté.';
  } catch (error) {if (token === serial) $('status').textContent = error.name === 'AbortError' ? 'Calcul annulé.' : 'Le calcul est indisponible. La planche conservée et les sources restent consultables.';}
  finally {if (token === serial) {$('render').disabled = false; $('cancel').disabled = true; $('model').disabled = false;}}
});
$('cancel').addEventListener('click', () => abort?.abort());
addEventListener('pagehide', () => {serial++; abort?.abort(); release();});
addEventListener('pageshow', event => {if (event.persisted && entries.length) select();});
try {
  const [source, derived] = await Promise.all([fetch('../visual/manifest.json').then(r => {if (!r.ok) throw Error(); return r.json();}), fetch('manifest.json').then(r => {if (!r.ok) throw Error(); return r.json();})]);
  if (source.schema !== 're.bow.native-model-reference-pack/1' || derived.schema !== 're.bow.source-pose-sheets/1' || source.entries.length > 64 || derived.entries.length > 64) throw Error();
  entries = source.entries.map(validateEntry); sheets = derived.entries;
  const fragment = document.createDocumentFragment();
  entries.forEach(entry => {const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.label; fragment.append(option);});
  $('model').replaceChildren(fragment); $('model').disabled = false;
  const query = new URL(location.href).searchParams;
  const wanted = entries.find(item => item.id === query.get('model')) || entries.find(item => (item.subjectId || item.candidateUid) === query.get('identity'));
  if (wanted) $('model').value = wanted.id;
  await select();
} catch {$('status').textContent = 'Les références ne sont pas disponibles. Consultez les modèles et les notices sources.';}
