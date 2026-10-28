import {createRestorer} from './restore.js';
const $ = id => document.getElementById(id), S = globalThis.RE_SAVE_CENTER;
let engine, state, incoming, plan, busy = false, ticket = 0, active = true, controller;
const urls = new Set();
const status = text => {$('status').textContent = text;};
function download(text, name) {const url = URL.createObjectURL(new Blob([text], {type: 'application/json;charset=utf-8'})); urls.add(url); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => {URL.revokeObjectURL(url); urls.delete(url);}, 10000);}
function invalidate() {if (plan) engine.cancel(plan); plan = null; $('preview').hidden = true; $('confirm').checked = false; $('confirm').disabled = true;}
function controls() {
  const saved = state?.journal, terminal = saved && ['committed', 'rolled-back'].includes(saved.state);
  $('incoming').disabled = busy || !engine || !!saved; $('groups').disabled = busy || !engine || !!saved || !incoming;
  $('prepare').disabled = busy || !!saved || !incoming || !document.querySelector('#group-list input:checked');
  $('backup').disabled = busy || !plan; $('apply').disabled = busy || !plan || !$('confirm').checked || $('confirm').disabled;
  $('refresh').disabled = busy; $('export').disabled = busy || !engine; $('cancel').disabled = busy;
  $('export-before').disabled = busy || !saved;
  $('resume').disabled = busy || !saved || terminal || !$('confirm-recovery').checked;
  $('rollback').disabled = busy || !saved || saved.state === 'rolled-back' || !$('confirm-recovery').checked;
  $('forget').disabled = busy || !terminal || !$('confirm-forget').checked;
}
async function refresh() {
  state = await engine.snapshot(); $('inventory').textContent = state.groups.reduce((sum, group) => sum + group.present, 0) + ' copies présentes dans ' + state.groups.length + ' groupes du jeu.';
  $('recovery').hidden = !state.journal;
  if (state.journal) {
    const labels = {'prepared': 'Préparée avant les écritures', 'applying': 'Écritures en cours ou page interrompue', 'rolling-back': 'Retour en cours ou page interrompue', 'interrupted': 'Interrompue : choisir une reprise ou un retour', 'committed': 'Restauration terminée, retour disponible', 'rolled-back': 'Retour terminé'};
    $('journal-status').textContent = labels[state.journal.state] + ' · ' + state.journal.changes + ' changements prévus · ' + state.journal.createdAt;
    $('recovery-note').textContent = ['committed', 'rolled-back'].includes(state.journal.state) ? 'Vous pouvez conserver ce journal ou le clore après vérification de la partie.' : 'Les groupes du jeu peuvent être partiellement remplacés. Ne relancez pas le jeu avant d’avoir choisi une reprise ou un retour.';
  }
  controls();
}
async function act(action) {if (busy) return; busy = true; controller = new AbortController(); controls(); try {await action(controller.signal);} catch (error) {if (active) status('REFUSÉ : ' + error.message);} finally {if (active) try {await refresh();} catch (error) {status('Stockage ou journal indisponible : ' + error.message);} busy = false; controls();}}
function groups(text) {
  const value = S.decode(text); $('group-list').replaceChildren();
  for (const group of S.describe(value.entries)) {const label = document.createElement('label'), checkbox = document.createElement('input'), text = document.createElement('span'); checkbox.type = 'checkbox'; checkbox.value = group.id; checkbox.disabled = !group.present || !group.restorable; text.textContent = group.label + ' · ' + group.present + ' copies' + (checkbox.disabled ? ' · indisponible' : ''); checkbox.addEventListener('change', () => {invalidate(); controls();}); label.append(checkbox, text); $('group-list').append(label);}
}
$('incoming').addEventListener('change', async () => {const request = ++ticket, file = $('incoming').files[0]; incoming = undefined; invalidate(); controls(); try {if (!file || file.size > S.MAX_FILE) throw Error('Fichier absent ou supérieur à 32 Mio.'); const text = new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer()); if (request !== ticket || !active) return; S.decode(text); incoming = text; groups(text); $('filename').textContent = file.name + ' · ' + S.decode(text).source; status('Copie examinée. Aucun groupe du jeu n’a été remplacé.');} catch (error) {if (request === ticket && active) status('FICHIER REFUSÉ : ' + error.message);} controls();});
$('refresh').addEventListener('click', () => act(async () => {invalidate(); await refresh(); status('Inventaire relu. Aucun remplacement automatique.');}));
$('export').addEventListener('click', () => {try {download(engine.exportText(), 'BOW-R31-copie-locale.json'); status('Téléchargement de la copie actuelle demandé.');} catch (error) {status('EXPORT REFUSÉ : ' + error.message);}});
$('prepare').addEventListener('click', () => act(async () => {invalidate(); const ids = [...document.querySelectorAll('#group-list input:checked')].map(input => input.value); plan = await engine.prepare(incoming, ids); $('changes').replaceChildren(); for (const change of plan.changes) {const item = document.createElement('li'); item.textContent = change.key + ' · ' + change.action + ' · ' + change.beforeChars + ' → ' + change.afterChars + ' caractères'; $('changes').append(item);} $('preview-summary').textContent = plan.changes.length + ' clés changeraient dans ' + plan.groups.length + ' groupes choisis.'; $('preview').hidden = false; $('preview-heading').focus(); status('Aperçu prêt. Conservez la copie avant restauration avant de confirmer.');}));
$('backup').addEventListener('click', () => {try {const text = engine.backup(plan); download(text, 'BOW-R31-AVANT-restauration.json'); engine.acknowledge(plan, text); $('confirm').disabled = false; status('Copie avant restauration envoyée au téléchargement. Vérifiez sa conservation.');} catch (error) {status('REFUSÉ : ' + error.message);} controls();});
$('confirm').addEventListener('change', controls);
$('apply').addEventListener('click', () => act(async signal => {try {const result = await engine.apply(plan, {confirmed: $('confirm').checked, signal}); status(result.ok ? 'Restauration terminée. Rechargez les modes concernés ; le retour reste disponible ici.' : result.message + ' Le journal et la copie avant restauration sont conservés.');} finally {invalidate();}}));
$('cancel').addEventListener('click', () => {invalidate(); controls(); status('Aperçu annulé. Aucune nouvelle écriture.');});
$('export-before').addEventListener('click', () => act(async () => {download(await engine.exportBefore(), 'BOW-R31-AVANT-operation.json'); status('Copie avant cette opération envoyée au téléchargement.');}));
for (const id of ['confirm-recovery', 'confirm-forget']) $(id).addEventListener('change', controls);
for (const [id, direction] of [['resume', 'apply'], ['rollback', 'rollback']]) $(id).addEventListener('click', () => act(async signal => {const result = await engine.recover({direction, confirmed: $('confirm-recovery').checked, signal}); $('confirm-recovery').checked = false; status(result.ok ? result.state === 'committed' ? 'Restauration reprise et terminée.' : 'Les valeurs exactes avant restauration ont été rétablies.' : result.message);}));
$('forget').addEventListener('click', () => act(async () => {await engine.forget({confirmed: $('confirm-forget').checked}); $('confirm-forget').checked = false; status('Journal terminé retiré. La copie téléchargée reste disponible.');}));
addEventListener('storage', event => {if (event.key === null || S.KEYS.includes(event.key)) {ticket++; invalidate(); refresh().catch(error => status(error.message)); status('Le jeu a changé dans un autre onglet : relisez l’inventaire avant toute opération.');}});
addEventListener('pagehide', () => {active = false; ticket++; controller?.abort(); invalidate(); for (const url of urls) URL.revokeObjectURL(url); urls.clear(); engine?.close();});
addEventListener('pageshow', event => {if (event.persisted) {active = true; refresh().then(() => status(state.journal ? 'Journal retrouvé. Choisissez une reprise ou un retour ; aucune écriture automatique.' : 'Inventaire relu.')).catch(error => status(error.message));}});
try {engine = createRestorer({saveCenter: S}); await refresh(); status(state.journal ? 'Journal retrouvé. Aucune reprise automatique : choisissez la suite ci-dessous.' : 'Inventaire local lu. Aucun remplacement automatique.');} catch (error) {status('Indisponible : ' + error.message);}
controls();
globalThis.BOW_RESTORE_R31 = Object.freeze({engine, state: () => ({busy, hasPlan: !!plan, journal: state?.journal || null})});
