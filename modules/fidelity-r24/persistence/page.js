import {parseStrict} from '../../fidelity-r23/persistence/inspector.js';
import {createVerification} from './sandbox.js';
const $ = id => document.getElementById(id);
let active = null, original = null, report = null, ticket = 0;
function progress(detail) {
  $('progress').hidden = false;
  $('progress').value = ((detail.pass - 1) * 50) + (detail.total ? detail.frames / detail.total * 50 : 50);
  $('status').textContent = 'Relecture ' + detail.pass + ' sur 2 · ' + detail.frames.toLocaleString('fr-FR') + ' / ' + detail.total.toLocaleString('fr-FR') + ' commandes temporelles.';
}
function show(value) {
  report = value; $('results').hidden = false; $('summary').replaceChildren(); $('limits').replaceChildren();
  $('verdict').textContent = value.result?.claimed ? 'Les résultats déclarés concordent avec la simulation ; les deux relectures aboutissent au même état.' : value.kind === 'catalog-r7' ? 'L’empreinte enregistrée concorde avec la simulation ; les deux relectures aboutissent au même état.' : 'Extrait reconstruit deux fois avec le même état final. Aucune victoire n’est certifiée pour cet extrait.';
  for (const [label, content] of [['Moteur', value.engineSource?.label || (value.kind === 'main-r13' ? 'Versus principal R13' : 'Duel expérimental R7')], ['Commandes temporelles', value.commandFrames], ['Relectures identiques', value.passes], ['Espace de stockage', 'Copie privée en mémoire ; sauvegardes du jeu inaccessibles']]) { const term = document.createElement('dt'), definition = document.createElement('dd'); term.textContent = label; definition.textContent = String(content); $('summary').append(term, definition); }
  for (const text of value.limits) { const item = document.createElement('li'); item.textContent = text; $('limits').append(item); }
  $('report').textContent = JSON.stringify(value, null, 2);
}
async function verify(file) {
  const request = ++ticket; active?.cancel(); active = null; report = null; original = file;
  $('results').hidden = true; $('progress').hidden = true; $('original').disabled = !file; $('cancel').disabled = false; $('filename').textContent = file.name; $('status').textContent = 'Lecture locale du fichier…';
  try {
    if (file.size > 4194304) throw Error('Fichier trop volumineux : 4 Mio maximum.');
    const text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(await file.arrayBuffer());
    if (request !== ticket) return;
    const value = parseStrict(text, 4194304);
    if (value?.schema === 're.bow.catalog-duel-replay/1' && file.size > 1048576) throw Error('Un replay expérimental est limité à 1 Mio dans son moteur.');
    $('status').textContent = 'Chargement du moteur local dans un espace isolé…';
    const task = await createVerification(value, {onProgress: detail => { if (request === ticket) progress(detail); }});
    if (request !== ticket) { task.cancel(); task.promise.catch(() => {}); return; }
    active = task; const result = await task.promise;
    if (request !== ticket) return;
    show(result); $('progress').value = 100; $('status').textContent = 'Vérification terminée. Aucune sauvegarde du jeu modifiée.';
  } catch (error) { if (request === ticket) $('status').textContent = 'VÉRIFICATION REFUSÉE : ' + error.message; }
  finally { if (request === ticket) { active = null; $('cancel').disabled = true; } }
}
function download(value, name) { const url = URL.createObjectURL(new Blob([value], {type: 'application/json'})); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
$('replay').addEventListener('change', event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) verify(file); });
$('cancel').addEventListener('click', () => { ticket++; active?.cancel(); active = null; $('cancel').disabled = true; $('progress').hidden = true; $('status').textContent = 'Relecture annulée. Aucune sauvegarde modifiée.'; });
$('original').addEventListener('click', () => { if (original) download(original, 'BOW_REPLAY_ORIGINAL.json'); });
$('download').addEventListener('click', () => { if (report) download(JSON.stringify(report, null, 2) + '\n', 'BOW_RELECTURE_R24.json'); });
window.BOW_REPLAY_PAGE_R24 = Object.freeze({state: () => ({active: !!active, report})});
