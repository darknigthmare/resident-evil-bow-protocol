import {createInspector, LIMITS} from './inspector.js';
const inspector = createInspector({saveCenter: globalThis.RE_SAVE_CENTER, replayVault: globalThis.RE_REPLAY_VAULT, runtimeContract: globalThis.RE_RUNTIME_CONTRACT.digest, catalogContract: globalThis.RE_CATALOG_REPLAY_CONTRACT.digest});
const $ = id => document.getElementById(id);
let primary = null, secondary = null, report = null, sequence = 0;
const descriptions = {'backup-r19': 'Sauvegarde R19', 'main-replay-archive': 'Archive de replays principaux', 'main-replay-r13': 'Replay principal', 'catalog-replay-r7': 'Replay expérimental', unknown: 'Format non reconnu'};
function render() {
  $('results').hidden = !report;
  $('download').disabled = !report;
  $('original').disabled = !primary;
  if (!report) return;
  const rows = [['Fichier', primary.file.name], ['Document', descriptions[report.kind]], ['Taille', report.bytes.toLocaleString('fr-FR') + ' octets'], ['Entrées reconnues', report.records.length], ['Contrôle', report.result === 'errors' ? 'Anomalies détectées — aucune restauration' : 'Inspection terminée — relecture non certifiée']];
  $('summary').replaceChildren();
  for (const [label, value] of rows) { const term = document.createElement('dt'), definition = document.createElement('dd'); term.textContent = label; definition.textContent = String(value); $('summary').append(term, definition); }
  $('issues').replaceChildren();
  for (const item of report.issues) { const node = document.createElement('li'); node.textContent = item.detail; if (item.severity === 'error') node.className = 'error'; $('issues').append(node); }
  $('report').textContent = JSON.stringify(report, null, 2);
  $('comparison').hidden = !secondary;
  if (secondary) try { const comparison = inspector.compare(primary.text, secondary.text); $('differences').textContent = comparison.changes.length ? JSON.stringify(comparison, null, 2) : comparison.byteIdentical ? 'Les deux fichiers sont identiques octet par octet.' : 'Les valeurs inspectées concordent ; la présentation des fichiers diffère.'; } catch (error) { $('differences').textContent = error.message; }
}
async function load(input, side) {
  const file = input.files?.[0]; input.value = '';
  const ticket = ++sequence;
  if (!file) return;
  $('status').textContent = 'Lecture locale du fichier…';
  try {
    if (file.size > LIMITS.fileBytes) throw Error('Fichier trop volumineux : 32 Mio maximum.');
    const bytes = await file.arrayBuffer();
    const text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
    if (ticket !== sequence) return;
    if (side === 'primary') { primary = {text, file}; report = inspector.inspect(text); }
    else { secondary = {text, name: file.name}; if (!primary) throw Error('Choisissez d’abord la copie à inspecter.'); }
    render();
    $('status').textContent = report.result === 'errors' ? 'Inspection terminée avec anomalies. Aucune donnée modifiée.' : 'Inspection terminée. Aucune donnée modifiée.';
  } catch (error) { if (ticket === sequence) { $('status').textContent = error.message; if (side === 'secondary') { secondary = null; $('comparison').hidden = true; } } }
}
function download(content, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('primary').addEventListener('change', event => load(event.target, 'primary'));
$('secondary').addEventListener('change', event => load(event.target, 'secondary'));
$('download').addEventListener('click', () => { if (report) download(JSON.stringify(report, null, 2) + '\n', 'BOW_INSPECTION_R23.json'); });
$('original').addEventListener('click', () => { if (primary) download(primary.file, 'BOW_COPIE_ORIGINALE.json'); });
