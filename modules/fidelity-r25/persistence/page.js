import {createBundleReader, createBatch, LIMITS} from './bundle.js';
import {createVerification} from '../../fidelity-r24/persistence/sandbox.js';
const $ = id => document.getElementById(id);
let reader = null, bundle = null, original = null, active = null, report = null, ticket = 0, pageIndex = 0;
const chosen = new Set(), pageSize = 100;
const selected = () => bundle.records.filter(row => chosen.has(row.key));
function controls() {
  const count = bundle ? selected().length : 0;
  $('verify').disabled = !!active || !count || count > LIMITS.batch;
  $('verify').textContent = 'Vérifier la sélection (' + count + ')';
  $('cancel').disabled = !active; $('records').disabled = !!active; $('select').disabled = !!active; $('clear').disabled = !!active;
  $('previous').disabled = !!active || pageIndex === 0; $('next').disabled = !!active || (pageIndex + 1) * pageSize >= (bundle?.records.length || 0);
}
function download(content, name) {
  const url = URL.createObjectURL(new Blob([content], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderRows() {
  $('rows').replaceChildren();
  for (const row of bundle.records.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)) {
    const item = document.createElement('div'); item.className = 'record ' + row.status;
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = row.key; input.id = 'record-' + row.key; input.disabled = row.status !== 'ready'; input.checked = chosen.has(row.key); input.addEventListener('change', () => { input.checked ? chosen.add(row.key) : chosen.delete(row.key); controls(); });
    const content = document.createElement('div'), label = document.createElement('label'); label.htmlFor = input.id;
    const title = document.createElement('strong'); title.textContent = row.id;
    const detail = document.createElement('small'); detail.textContent = row.path + ' · ' + (row.engine?.label || row.reason);
    label.append(title, detail); content.append(label);
    const extract = document.createElement('button'); extract.type = 'button'; extract.className = 'extract'; extract.textContent = 'Extraire ce replay exact'; extract.addEventListener('click', () => download(row.raw, 'BOW_REPLAY_' + row.key + '.json')); content.append(extract); item.append(input, content); $('rows').append(item);
  }
  $('pages').hidden = bundle.records.length <= pageSize;
  $('page-status').textContent = bundle.records.length ? 'Entrées ' + (pageIndex * pageSize + 1) + ' à ' + Math.min((pageIndex + 1) * pageSize, bundle.records.length) + ' sur ' + bundle.records.length : 'Aucune entrée';
  controls();
}
function showBundle() {
  $('selection').hidden = false; pageIndex = 0; chosen.clear();
  const ready = bundle.records.filter(r => r.status === 'ready').length;
  $('inventory').textContent = bundle.records.length + ' replay(s) trouvé(s), ' + ready + ' disponible(s), ' + (bundle.records.length - ready) + ' refusé(s).';
  if (ready <= LIMITS.batch) for (const row of bundle.records) if (row.status === 'ready') chosen.add(row.key);
  renderRows();
  $('backup-notes').hidden = !bundle.backupInspection;
  $('issues').replaceChildren();
  for (const issue of bundle.backupInspection?.issues || []) { const item = document.createElement('li'); item.textContent = issue.path + ' : ' + issue.detail; $('issues').append(item); }
  $('archive').disabled = bundle.archiveText === null;
  $('status').textContent = bundle.records.length ? 'Fichier inspecté. Choisissez les replays puis lancez la vérification.' : bundle.issues.map(i => i.detail).join(' ') || 'Ce fichier ne contient aucun replay.';
  controls();
}
async function load(file) {
  const request = ++ticket; active?.cancel(); active = null; bundle = null; report = null; original = file;
  $('original').disabled = false; $('archive').disabled = true; $('selection').hidden = true; $('results').hidden = true; $('progress').hidden = true; $('cancel').disabled = true;
  $('filename').textContent = file.name; $('status').textContent = 'Lecture locale du fichier…';
  try {
    if (file.size > LIMITS.fileBytes) throw Error('Fichier trop volumineux : 32 Mio maximum.');
    const bytes = await file.arrayBuffer(), text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
    if (request !== ticket) return;
    const inspected = reader.inspect(text);
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
    if (request !== ticket) return;
    bundle = inspected; bundle.originalSha256 = digest; showBundle();
  } catch (error) { if (request === ticket) $('status').textContent = 'INSPECTION REFUSÉE : ' + error.message; }
}
function renderReport(value) {
  report = value; $('results').hidden = false; $('outcomes').replaceChildren();
  $('verdict').textContent = value.cancelled ? 'Lot annulé : ' + value.completed + ' replay(s) terminé(s) sur ' + value.total + '.' : value.verified ? 'Tous les replays choisis concordent avec deux reconstructions identiques.' : 'Lot terminé avec au moins un replay refusé. Les autres résultats restent séparés.';
  for (const row of value.records) {
    const article = document.createElement('article'); article.className = 'outcome ' + row.status;
    const title = document.createElement('h3'); title.textContent = row.id;
    const text = document.createElement('p'); text.textContent = row.status === 'verified' ? row.verification.result?.claimed ? 'Résultat déclaré concordant ; deux états reconstruits identiques.' : row.verification.kind === 'catalog-r7' ? 'Empreinte enregistrée vérifiée ; deux états reconstruits identiques.' : 'Extrait reconstruit ; aucune victoire certifiée.' : 'REFUSÉ : ' + row.reason;
    article.append(title, text); $('outcomes').append(article);
  }
  $('report').textContent = JSON.stringify(value, null, 2);
}
async function verify() {
  const records = selected(); if (!records.length || records.length > LIMITS.batch || active) return;
  const request = ++ticket, source = {kind: bundle.kind, bytes: bundle.originalBytes, sha256: bundle.originalSha256, originalRewritten: false};
  $('results').hidden = true; $('progress').hidden = false; $('progress').value = 0;
  active = createBatch(records, createVerification, {
    onRecord: ({index, total, record}) => { if (request === ticket) $('status').textContent = 'Replay ' + (index + 1) + ' sur ' + total + ' : ' + record.id; },
    onProgress: ({index, totalRecords, pass, frames, total}) => { if (request === ticket) $('progress').value = (index + ((pass - 1) + (total ? frames / total : 1)) / 2) / totalRecords * 100; }
  });
  controls();
  try {
    const value = await active.promise;
    if (request !== ticket) return;
    renderReport({...value, source}); $('progress').value = value.completed / value.total * 100;
    $('status').textContent = value.cancelled ? 'Lot annulé. Aucun fichier ni sauvegarde modifié.' : 'Lot terminé. Aucun fichier ni sauvegarde modifié.';
  } catch (error) { if (request === ticket) $('status').textContent = 'VÉRIFICATION REFUSÉE : ' + error.message; }
  finally { if (request === ticket) { active = null; controls(); } }
}
$('replay').disabled = true;
$('replay').addEventListener('change', event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) load(file); });
$('select').addEventListener('click', () => { chosen.clear(); for (const row of bundle.records) if (row.status === 'ready' && chosen.size < LIMITS.batch) chosen.add(row.key); renderRows(); });
$('clear').addEventListener('click', () => { chosen.clear(); renderRows(); });
$('previous').addEventListener('click', () => { if (pageIndex > 0) { pageIndex--; renderRows(); } });
$('next').addEventListener('click', () => { if ((pageIndex + 1) * pageSize < bundle.records.length) { pageIndex++; renderRows(); } });
$('verify').addEventListener('click', verify); $('cancel').addEventListener('click', () => { active?.cancel(); $('status').textContent = 'Annulation du lot…'; });
$('original').addEventListener('click', () => { if (original) download(original, 'BOW_FICHIER_ORIGINAL.json'); });
$('archive').addEventListener('click', () => { if (bundle && bundle.archiveText !== null) download(bundle.archiveText, 'BOW_ARCHIVE_EXACTE.json'); });
$('download').addEventListener('click', () => { if (report) download(JSON.stringify(report, null, 2) + '\n', 'BOW_RELECTURE_LOT_R25.json'); });
window.BOW_REPLAY_PAGE_R25 = Object.freeze({state: () => ({active: !!active, report, inventory: bundle && {kind: bundle.kind, total: bundle.records.length, ready: bundle.records.filter(r => r.status === 'ready').length}})});
try {
  const response = await fetch('../../fidelity-r24/persistence/engines.json');
  if (!response.ok) throw Error('Index des moteurs indisponible.');
  reader = createBundleReader({saveCenter: globalThis.RE_SAVE_CENTER, replayVault: globalThis.RE_REPLAY_VAULT, catalogContract: globalThis.RE_CATALOG_REPLAY_CONTRACT.digest, engineIndex: await response.json()});
  $('replay').disabled = false;
} catch (error) { $('status').textContent = error.message; }
