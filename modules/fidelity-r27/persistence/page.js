import {createRehearsal} from '../../fidelity-r26/persistence/restore.js';
import {createVerification} from '../../fidelity-r24/persistence/sandbox.js';
import {createRestoredReplayBridge, LIMITS} from './bridge.js';
const $ = id => document.getElementById(id), selected = new Set(), pageSize = 100;
let bridge, page = 0, report, actionBusy = false, lifecycle = 0, downloadUrl, downloadTimer;
function clearDownload() { clearTimeout(downloadTimer); if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = undefined; }
function download(content, name) {
  clearDownload();
  const url = URL.createObjectURL(new Blob([content], {type: 'application/json;charset=utf-8'})), link = document.createElement('a');
  downloadUrl = url; link.href = url; link.download = name; link.click(); downloadTimer = setTimeout(clearDownload, 1000);
}
function controls() {
  const state = bridge?.state(), busy = actionBusy || state?.busy, usable = state?.ready && !state.stale;
  $('load').disabled = !bridge || busy;
  for (const id of ['select', 'clear', 'records']) $(id).disabled = busy || !usable;
  $('archive').disabled = busy || !usable || !state.source?.archiveSha256;
  $('verify').disabled = busy || !usable || selected.size === 0 || selected.size > LIMITS.batch;
  $('verify').textContent = `Vérifier la sélection (${selected.size})`;
  $('cancel').disabled = !state?.busy;
  $('previous').disabled = busy || !usable || page === 0;
  $('next').disabled = busy || !usable || (page + 1) * pageSize >= (state?.records.length || 0);
}
async function act(run) {
  if (actionBusy) return;
  const generation = lifecycle;
  actionBusy = true; controls();
  try { await run(); } catch (error) { if (generation === lifecycle) $('status').textContent = 'REFUSÉ : ' + error.message; }
  finally { actionBusy = false; controls(); }
}
function renderRows() {
  const state = bridge.state(); $('rows').replaceChildren();
  for (const row of state.records.slice(page * pageSize, (page + 1) * pageSize)) {
    const item = document.createElement('div'), input = document.createElement('input'), content = document.createElement('div'), label = document.createElement('label'), title = document.createElement('strong'), detail = document.createElement('small'), extract = document.createElement('button');
    item.className = 'record'; input.type = 'checkbox'; input.id = 'record-' + row.key; input.value = row.key; input.disabled = row.status !== 'ready'; input.checked = selected.has(row.key);
    input.addEventListener('change', () => { input.checked ? selected.add(row.key) : selected.delete(row.key); controls(); });
    label.htmlFor = input.id; title.textContent = row.id; detail.textContent = row.path + ' · ' + (row.engine?.label || row.reason); label.append(title, detail);
    extract.type = 'button'; extract.textContent = 'Extraire ce replay exact'; extract.addEventListener('click', () => act(async () => { download(await bridge.record(row.key), 'BOW-R27-replay-' + row.key + '.json'); $('status').textContent = 'Tranche source exacte extraite après contrôle de la révision.'; }));
    content.append(label, extract); item.append(input, content); $('rows').append(item);
  }
  $('pages').hidden = state.records.length <= pageSize;
  $('page-status').textContent = state.records.length ? `Entrées ${page * pageSize + 1} à ${Math.min((page + 1) * pageSize, state.records.length)} sur ${state.records.length}` : 'Aucune entrée';
  controls();
}
function renderSource() {
  const state = bridge.state(), ready = state.records.filter(row => row.status === 'ready').length;
  page = 0; selected.clear(); report = undefined; $('results').hidden = true; $('progress').hidden = true;
  $('source').hidden = false; $('selection').hidden = false;
  $('source-description').textContent = `Base isolée R26 · révision ${state.source.revision}` + (state.source.journalState ? ` · journal ${state.source.journalState}` : '') + '. Les extractions et résultats sont liés à cette capture.';
  $('source-digest').textContent = state.source.archiveSha256 ? `Archive : ${state.source.archiveBytes} octets · SHA-256 ${state.source.archiveSha256}` : 'Cette révision ne contient aucune archive de replays.';
  $('inventory').textContent = `${state.records.length} replay(s), ${ready} disponible(s), ${state.records.length - ready} refusé(s).`;
  $('status').textContent = state.records.length ? 'Révision capturée. Choisissez les replays à reconstruire.' : state.issues.map(item => item.detail).join(' ') || 'Aucun replay dans cette révision.';
  renderRows();
}
function renderReport(value) {
  report = value; $('results').hidden = false; $('outcomes').replaceChildren();
  $('verdict').textContent = value.cancelled ? 'Lot annulé. Les replays non terminés ne sont pas certifiés.' : value.sourceStale ? 'La base isolée a changé pendant la relecture. Les résultats des octets capturés restent détaillés, mais aucun verdict ne certifie sa révision actuelle. Rechargez la révision.' : value.verified ? 'Deux reconstructions identiques pour tous les replays choisis ; la révision isolée est toujours inchangée.' : 'Lot terminé avec au moins un refus. Les autres résultats restent séparés.';
  for (const row of value.records) {
    const card = document.createElement('article'), title = document.createElement('h3'), description = document.createElement('p'); card.className = 'outcome'; title.textContent = row.id;
    description.textContent = row.status === 'verified' ? row.verification.result?.claimed ? 'Résultat déclaré concordant pour la capture ; deux états reconstruits identiques.' : 'Extrait reconstruit pour la capture ; aucune victoire certifiée.' : 'REFUSÉ : ' + row.reason;
    card.append(title, description); $('outcomes').append(card);
  }
  $('report').textContent = JSON.stringify(value, null, 2);
}
$('load').addEventListener('click', () => act(async () => { $('selection').hidden = true; $('source').hidden = true; $('results').hidden = true; selected.clear(); await bridge.open(); renderSource(); }));
$('archive').addEventListener('click', () => act(async () => { download(await bridge.archive(), 'BOW-R27-archive-exacte.json'); $('status').textContent = 'Archive imbriquée exacte extraite après contrôle de la révision.'; }));
$('select').addEventListener('click', () => { selected.clear(); for (const row of bridge.state().records) if (row.status === 'ready' && selected.size < LIMITS.batch) selected.add(row.key); renderRows(); });
$('clear').addEventListener('click', () => { selected.clear(); renderRows(); });
$('previous').addEventListener('click', () => { if (page > 0) { page--; renderRows(); } });
$('next').addEventListener('click', () => { if ((page + 1) * pageSize < bridge.state().records.length) { page++; renderRows(); } });
$('verify').addEventListener('click', () => act(async () => {
  const generation = lifecycle;
  $('results').hidden = true; $('progress').hidden = false; $('progress').value = 0;
  const promise = bridge.verify([...selected], {
    onRecord: ({index, total, record}) => { if (generation === lifecycle) $('status').textContent = `Replay ${index + 1} sur ${total} : ${record.id}`; },
    onProgress: ({index, totalRecords, pass, frames, total}) => { if (generation === lifecycle) $('progress').value = (index + ((pass - 1) + (total ? frames / total : 1)) / 2) / totalRecords * 100; }
  });
  controls(); const result = await promise; if (generation !== lifecycle) return; renderReport(result); $('progress').value = result.total ? result.completed / result.total * 100 : 0;
  $('status').textContent = result.sourceStale ? 'Révision modifiée : rechargez l’atelier isolé.' : result.cancelled ? 'Relecture annulée. Aucune sauvegarde modifiée.' : 'Relecture terminée. Aucune sauvegarde modifiée.';
}));
$('cancel').addEventListener('click', () => { bridge.cancel(); $('status').textContent = 'Annulation de la relecture…'; });
$('download').addEventListener('click', () => { if (report) download(JSON.stringify(report, null, 2) + '\n', 'BOW-R27-relecture-revision.json'); });
async function start() {
  const generation = lifecycle;
  try {
    const response = await fetch('../../fidelity-r24/persistence/engines.json'); if (!response.ok) throw Error('Index local des moteurs indisponible.');
    const engineIndex = await response.json(); if (generation !== lifecycle) return;
    bridge = createRestoredReplayBridge({rehearsal: createRehearsal({saveCenter: globalThis.RE_SAVE_CENTER}), saveCenter: globalThis.RE_SAVE_CENTER, replayVault: globalThis.RE_REPLAY_VAULT,
      catalogContract: globalThis.RE_CATALOG_REPLAY_CONTRACT.digest, engineIndex, createVerification});
    $('status').textContent = 'Lecteur prêt. La base isolée est lue uniquement lorsque vous le demandez.';
  } catch (error) { if (generation === lifecycle) $('status').textContent = 'Lecteur indisponible : ' + error.message; }
  controls();
}
addEventListener('pagehide', () => { lifecycle++; clearDownload(); bridge?.close().catch(() => {}); bridge = undefined; selected.clear(); report = undefined; $('source').hidden = true; $('selection').hidden = true; $('results').hidden = true; controls(); });
addEventListener('pageshow', event => { if (event.persisted) { selected.clear(); $('source').hidden = true; $('selection').hidden = true; $('results').hidden = true; start(); } });
globalThis.BOW_RESTORED_REPLAYS_R27 = Object.freeze({state: () => bridge?.state() || {ready: false, busy: false, records: []}, bridge: () => bridge});
await start();
