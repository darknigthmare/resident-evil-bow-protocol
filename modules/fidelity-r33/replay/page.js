import {createBatchReader, LIMITS} from './batch.js';
const $ = id => document.getElementById(id), reader = createBatchReader();
let plan, task, result, busy = false, active = true, ticket = 0;
const urls = new Set(), status = text => {$('status').textContent = text;};
const labels = {ready: 'Prêt à vérifier', rejected: 'Fichier refusé', duplicate: 'Doublon strict', checking: 'Vérification en cours', verified: 'Deux états finaux vérifiés', refused: 'Contrat refusé', cancelled: 'Vérification annulée', 'not-started': 'Non lancé'};
function controls() {$('replays').disabled = busy; $('verify').disabled = busy || !plan?.rows.some(row => row.status === 'ready'); $('cancel').disabled = !busy;}
function describe(row) {return row.name + ' · ' + labels[row.status] + (row.engine ? ' · ' + row.engine : '') + (row.reason ? ' · ' + row.reason : '') + (row.status === 'duplicate' ? ' · même contenu que le fichier ' + (row.duplicateOf + 1) : '');}
function list(id, rows) {$(id).replaceChildren(); for (const row of rows) {const item = document.createElement('li'); item.textContent = describe(row); $(id).append(item);}}
$('replays').addEventListener('change', async () => {
  const request = ++ticket, files = [...$('replays').files]; plan = result = undefined; $('selection').hidden = $('results').hidden = true; controls();
  try {
    if (!files.length || files.length > LIMITS.files || files.reduce((sum, file) => sum + file.size, 0) > LIMITS.totalBytes) throw Error('Choisissez de 1 à 16 fichiers, dans la limite de 32 Mio au total.');
    const inputs = await Promise.all(files.map(async file => ({name: file.name, text: new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer())})));
    const prepared = await reader.prepare(inputs); if (!active || request !== ticket) return; plan = prepared;
    list('files', plan.rows); $('summary').textContent = plan.rows.length + ' fichiers · ' + plan.totalBytes + ' octets · ' + plan.rows.filter(row => row.status === 'ready').length + ' relectures distinctes possibles.';
    $('selection').hidden = false; status('Fichiers examinés. Lancez la vérification pour reconstruire les contrats reconnus.');
  } catch (error) {if (active && request === ticket) status('LOT REFUSÉ : ' + error.message);}
  controls();
});
$('verify').addEventListener('click', async () => {
  if (!plan || busy) return; const request = ++ticket; busy = true; result = undefined; $('results').hidden = true; $('progress').hidden = false; $('progress').value = 0; controls();
  try {
    task = reader.start(plan, {onRecord: row => {if (active && request === ticket) status('Vérification : ' + row.name);}, onProgress: detail => {
      if (active && request === ticket) $('progress').value = Math.min(99, ((detail.index + ((detail.pass - 1) + (detail.total ? detail.frames / detail.total : 1)) / 2) / detail.files) * 100);
    }});
    const current = task; const report = await current.promise; if (!active || request !== ticket) return; result = report;
    list('outcomes', report.entries); $('report').textContent = JSON.stringify(report, null, 2); $('verdict').textContent = report.verified + ' relectures vérifiées sur ' + report.totalFiles + ' fichiers choisis' + (report.cancelled ? ' · lot annulé.' : '.');
    $('results').hidden = false; $('progress').value = report.cancelled ? $('progress').value : 100; status(report.cancelled ? 'Lot annulé. Les fichiers non lancés restent signalés ; aucune sauvegarde changée.' : 'Vérification terminée. Les sauvegardes du jeu sont inchangées.'); $('result-heading').focus();
  } catch (error) {if (active && request === ticket) status('RELECTURE REFUSÉE : ' + error.message);}
  finally {if (active && request === ticket) {task = null; busy = false; controls();}}
});
$('cancel').addEventListener('click', () => {task?.cancel();});
$('download').addEventListener('click', () => {if (!result) return; const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2) + '\n'], {type: 'application/json'})); urls.add(url); const link = document.createElement('a'); link.href = url; link.download = 'BOW-R33-constat-replays.json'; link.click(); setTimeout(() => {URL.revokeObjectURL(url); urls.delete(url);}, 1000);});
addEventListener('pagehide', () => {active = false; ticket++; task?.cancel(); task = null; busy = false; for (const url of urls) URL.revokeObjectURL(url); urls.clear();});
addEventListener('pageshow', event => {if (event.persisted) {active = true; busy = false; controls(); status('Page retrouvée. Relancez volontairement la vérification ; aucune reprise automatique.');}});
controls();
globalThis.BOW_REPLAY_BATCH_R33 = Object.freeze({reader, state: () => ({busy, plan, result})});
