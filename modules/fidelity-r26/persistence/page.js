import {createRehearsal, DATABASE_NAME, SCHEMA} from './restore.js';
const $ = id => document.getElementById(id), S = globalThis.RE_SAVE_CENTER;
let engine, state, baselineText, incomingText, plan, savedBackup = false, busy = false;
let baselineGeneration = 0, incomingGeneration = 0;
const message = text => { $('status').textContent = text; };
function download(text, name) { const blob = new Blob([text], {type: 'application/json;charset=utf-8'}), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function invalidate() { if (plan) engine?.cancel(plan); plan = undefined; savedBackup = false; $('preview').hidden = true; $('confirm').checked = false; }
function controls() {
  $('initialize').disabled = busy || !engine || !baselineText || (state?.initialized && !$('replace').checked);
  $('export-current').disabled = busy || !state?.initialized;
  $('clear').disabled = busy || !state?.initialized || !$('confirm-clear').checked;
  $('groups').disabled = busy || !incomingText;
  $('prepare').disabled = busy || !state?.initialized || !incomingText || !document.querySelector('#group-list input:checked');
  $('backup').disabled = busy || !plan;
  $('cancel').disabled = busy;
  $('apply').disabled = busy || !plan || !savedBackup || !$('confirm').checked;
  $('rollback').disabled = busy || state?.journal?.state !== 'committed' || !$('confirm-rollback').checked;
  $('receipt').disabled = busy || !state?.initialized;
  $('baseline').disabled = busy; $('incoming').disabled = busy;
}
async function refresh() {
  state = await engine.snapshot();
  $('inventory').textContent = state.initialized ? `Atelier isolé : révision ${state.revision}, ${state.entries.filter(row => row.value !== null).length} clés présentes sur ${S.KEYS.length}.` : `Atelier isolé vide · révision ${state.revision}.`;
  $('journal').hidden = !state.journal;
  if (state.journal) $('journal-status').textContent = `Transaction ${state.journal.state === 'committed' ? 'validée' : 'annulée par retour explicite'} · ${state.journal.at} · groupes : ${state.journal.groups.join(', ')}. Ce constat concerne uniquement la base isolée.`;
  controls();
}
async function act(run) { if (busy) return; busy = true; controls(); try { await run(); } catch (error) { message('REFUSÉ : ' + error.message); } finally { busy = false; if (engine) try { await refresh(); } catch (error) { message('Stockage indisponible : ' + error.message); } controls(); } }
async function read(file) { if (!file || file.size > S.MAX_FILE) throw Error('Fichier absent ou supérieur à 32 Mio.'); const text = await file.text(); S.decode(text); return text; }
$('baseline').addEventListener('change', async () => {
  const generation = ++baselineGeneration; baselineText = undefined; invalidate(); controls();
  try { const file = $('baseline').files[0], text = await read(file); if (generation !== baselineGeneration) return; baselineText = text; $('baseline-name').textContent = file.name + ' · copie R19 lisible, non encore importée.'; message('Copie de départ prête. L’import exige votre action.'); }
  catch (error) { if (generation === baselineGeneration) { $('baseline-name').textContent = ''; message('FICHIER REFUSÉ : ' + error.message); } } controls();
});
$('incoming').addEventListener('change', async () => {
  const generation = ++incomingGeneration; incomingText = undefined; invalidate(); $('group-list').replaceChildren(); controls();
  try {
    const file = $('incoming').files[0], text = await read(file); if (generation !== incomingGeneration) return;
    incomingText = text; $('incoming-name').textContent = file.name + ' · ' + S.decode(text).source;
    for (const group of S.describe(S.decode(text).entries)) {
      const label = document.createElement('label'); label.className = 'check'; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = group.id; checkbox.disabled = !group.restorable || group.present === 0;
      checkbox.addEventListener('change', () => { invalidate(); controls(); }); const text = document.createElement('span'); text.textContent = group.label + ` · ${group.present} clés présentes` + (checkbox.disabled ? ' · non sélectionnable (vide ou endommagé)' : ''); label.append(checkbox, text); $('group-list').append(label);
    } message('Choisissez les groupes à essayer. Aucun changement n’est appliqué.');
  } catch (error) { if (generation === incomingGeneration) { $('incoming-name').textContent = ''; message('FICHIER REFUSÉ : ' + error.message); } } controls();
});
for (const id of ['replace', 'confirm-clear', 'confirm', 'confirm-rollback']) $(id).addEventListener('change', controls);
$('initialize').addEventListener('click', () => act(async () => { invalidate(); await engine.initialize(baselineText, {expectedRevision: state.revision}); $('replace').checked = false; message('Copie de départ importée uniquement dans l’atelier IndexedDB isolé.'); }));
$('prepare').addEventListener('click', () => act(async () => {
  invalidate(); const selected = [...document.querySelectorAll('#group-list input:checked')].map(input => input.value); plan = await engine.prepare(incomingText, selected);
  $('changes').replaceChildren(); for (const change of plan.changes) { const item = document.createElement('li'); item.textContent = `${change.key} · ${change.action} · ${change.beforeChars} → ${change.afterChars} caractères`; $('changes').append(item); }
  $('preview-summary').textContent = `${plan.changes.length} clés changeraient dans l’atelier isolé, depuis sa révision ${plan.revision}. Les autres groupes gardent leurs valeurs brutes.`;
  $('preview').hidden = false; message('Aperçu prêt. Conservez la copie avant répétition, puis confirmez la transaction isolée.');
}));
$('backup').addEventListener('click', () => { try { const text = engine.backup(plan); download(text, 'BOW-R26-avant-repetition.json'); engine.acknowledge(plan, text); savedBackup = true; message('Téléchargement de la copie avant répétition demandé. Vérifiez sa conservation avant de confirmer.'); } catch (error) { message('REFUSÉ : ' + error.message); } controls(); });
$('apply').addEventListener('click', () => act(async () => {
  try {
    const result = await engine.apply(plan, {confirmed: $('confirm').checked});
    message(`Transaction isolée validée : ${result.changed} clés modifiées. Le jeu reste intact.`);
  } catch (error) {
    throw Error(error.message + ' Prévisualisez à nouveau les changements avant de réessayer.');
  } finally {
    invalidate();
  }
}));
$('cancel').addEventListener('click', () => { invalidate(); message('Aperçu annulé. Aucun changement validé.'); controls(); });
$('rollback').addEventListener('click', () => act(async () => { invalidate(); await engine.rollback({expectedRevision: state.revision, confirmed: $('confirm-rollback').checked}); $('confirm-rollback').checked = false; message('L’atelier a retrouvé exactement les valeurs brutes qui précédaient la répétition.'); }));
$('export-current').addEventListener('click', () => act(async () => { download(await engine.exportText(), 'BOW-R26-etat-isole.json'); message('État de l’atelier exporté au format R19 ; valeurs brutes conservées.'); }));
$('receipt').addEventListener('click', () => act(async () => { const current = await engine.snapshot(); download(JSON.stringify({schema: SCHEMA, database: DATABASE_NAME, revision: current.revision, isolated: true, gameStorageChanged: false, initialized: current.initialized, journal: current.journal && {state: current.journal.state, at: current.journal.at, groups: current.journal.groups, source: current.journal.source, rolledBackAt: current.journal.rolledBackAt}}, null, 2), 'BOW-R26-constat-isole.json'); }));
$('clear').addEventListener('click', () => act(async () => { invalidate(); await engine.clear({expectedRevision: state.revision, confirmed: $('confirm-clear').checked}); $('confirm-clear').checked = false; message('Seule la base de répétition R26 a été effacée.'); }));
try { engine = createRehearsal({saveCenter: S}); await refresh(); message(state.initialized ? 'Atelier isolé retrouvé après rechargement. Examinez son journal ou importez une nouvelle copie.' : 'Atelier isolé prêt. Choisissez une copie de départ.'); }
catch (error) { message('Atelier indisponible : ' + error.message); }
controls();
globalThis.BOW_RESTORE_R26 = Object.freeze({engine, state: () => ({revision: state?.revision, initialized: state?.initialized, busy, hasPlan: !!plan})});
