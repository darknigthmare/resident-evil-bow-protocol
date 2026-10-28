const byId = id => document.getElementById(id), repository = new URL('../../../', import.meta.url);
let entries = [], current = null, loaded = false, error = '';
const controller = new AbortController();
function text(tag, content) {const element = document.createElement(tag); element.textContent = content; return element;}
async function read() {
  const response = await fetch(new URL('manifest.json', import.meta.url), {signal: controller.signal, credentials: 'same-origin'});
  if (!response.ok || response.type === 'opaque') throw Error('Répertoire indisponible.');
  const reader = response.body?.getReader(); if (!reader) throw Error('Lecture bornée indisponible.');
  const parts = []; let total = 0;
  try {for (;;) {const part = await reader.read(); if (part.done) break; total += part.value.length; if (total > 16 * 1024 * 1024) throw Error('Répertoire trop volumineux.'); parts.push(part.value);}}
  catch (reason) {await reader.cancel().catch(() => {}); throw reason;} finally {reader.releaseLock();}
  const raw = new Uint8Array(total); let offset = 0; for (const part of parts) {raw.set(part, offset); offset += part.length;}
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw));
}
function sourceLink(path) {
  if (typeof path !== 'string' || !/^modules\/fidelity-r(?:24|25|26|27|28|31)\/canonical\/manifest\.json$/.test(path)) throw Error('Source documentaire invalide.');
  return new URL(path, repository).href;
}
function show(id) {
  current = entries.find(row => row.id === id); if (!current) return;
  const row = current;
  byId('name').textContent = row.name; byId('edition').textContent = row.game + ' · ' + row.id;
  byId('scope').textContent = row.contextOnlyEvolutionIdentity ? 'Cette identité reste contextuelle dans le mode avec évolutions. Son répertoire n’ajoute aucun acteur jouable.'
    : row.hasPrototypeProfile ? 'Profil de prototype existant ; le présent audit ne modifie aucune commande.' : 'Aucun profil de commande jouable dans les données conservées.';
  byId('pending').textContent = 'Répertoire original exhaustif : non certifié. Actions natives affectées aux commandes : 0.';
  const dossier = new URL('codex.html', repository); dossier.searchParams.set('id', row.id); byId('dossier').href = dossier.href;
  byId('adaptedScope').textContent = row.adaptedCommandCount + ' commande(s) déjà adaptée(s). Noms, valeurs et boutons appartiennent au prototype ; aucun bouton original d’ennemi n’est déduit.';
  byId('commands').replaceChildren(...row.adaptedCommands.map(command => {
    const holder = document.createElement('div'); holder.className = 'command-row';
    holder.append(text('b', command.slot), text('span', command.label), text('span', command.kind + ' · adaptation')); return holder;
  }));
  byId('claims').replaceChildren(...(row.documentaryMoveClaims.length ? row.documentaryMoveClaims.map(claim => {
    const item = document.createElement('li'), link = text('a', claim.claimId + ' · source conservée'); link.href = sourceLink(claim.manifest);
    const qualification = claim.polarity === 'NEGATED' ? 'Revendication négative ou limitée · ' : '';
    item.append(text('span', qualification + claim.label + (claim.phase ? ' · ' + claim.phase : '') + ' '), link);
    if (claim.conditions?.length) item.append(text('p', 'Conditions : ' + claim.conditions.join(' · ')));
    if (claim.limitation) item.append(text('p', claim.limitation));
    return item;
  }) : [text('li', 'Aucune revendication de mouvement documentaire liée dans les manifestes retenus pour cette fiche.')]));
  byId('gestures').replaceChildren(...(row.nativeObservedGestures.length ? row.nativeObservedGestures.map(gesture => {
    const holder = document.createElement('article'); holder.className = 'gesture';
    const link = text('a', 'EXAMINER LES DEUX VUES ET LA DURÉE COMPLÈTE');
    const url = new URL('../motion/index.html', import.meta.url); url.searchParams.set('id', row.id); url.searchParams.set('clip', gesture.clipId); link.href = url.href;
    holder.append(text('h3', gesture.label), text('p', gesture.summary), text('p', row.nativeSourceEdition), link); return holder;
  }) : [text('p', 'Aucune scène native complète observée pour cette incarnation dans ce lot.')]));
  byId('cinematics').textContent = 'Introduction, outro, victoire et défaite d’origine : rôles non certifiés. Les extrémités d’une scène ou un corps au sol ne prouvent pas son déclencheur, sa victime, son environnement ou sa bande sonore.';
  const address = new URL(location.href); address.searchParams.set('id', row.id); history.replaceState(null, '', address);
  byId('status').textContent = row.name + ' : répertoire documentaire affiché.';
}
function filter(preferred) {
  const query = byId('search').value.trim().toLocaleLowerCase('fr');
  const rows = entries.filter(row => !query || (row.name + ' ' + row.game + ' ' + row.id).toLocaleLowerCase('fr').includes(query));
  const prior = preferred || byId('identity').value;
  byId('identity').replaceChildren(...rows.map(row => {const option = document.createElement('option'); option.value = row.id; option.textContent = row.name + ' · ' + row.game; return option;}));
  if (rows.some(row => row.id === prior)) byId('identity').value = prior;
  byId('identity').disabled = !rows.length; byId('record').hidden = !rows.length;
  if (rows.length) show(byId('identity').value); else byId('status').textContent = 'Aucune incarnation ne correspond à cette recherche.';
}
byId('identity').addEventListener('change', () => show(byId('identity').value));
byId('search').addEventListener('input', () => filter());
globalThis.RE_COMMAND_REPERTOIRE_R31 = Object.freeze({state: () => ({loaded, error, identities: entries.length,
  selected: current?.id || null, adaptedCommands: current?.adaptedCommandCount || 0,
  nativeObservedScenes: current?.nativeClipIds.length || 0, gameplayDataChanged: false, originalCommandInventoryCertified: false})});
try {
  const value = await read();
  if (value.schema !== 're.bow.command-repertoire-r31/1' || value.release !== 'R31' || value.canonicalFidelityCertified !== false
      || value.gameplayDataChanged !== false || !Array.isArray(value.entries) || value.entries.length !== 389) throw Error('Contrat de répertoire invalide.');
  const known = new Set();
  for (const row of value.entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id) || known.has(row.id) || !Array.isArray(row.adaptedCommands)
        || row.adaptedCommands.length > 32 || row.adaptedCommands.length !== row.adaptedCommandCount
        || !Array.isArray(row.documentaryMoveClaims) || !Array.isArray(row.nativeObservedGestures)
        || row.officialCommandInventoryComplete !== false || row.originalGameClipAssignments.length) throw Error('Fiche de répertoire invalide.');
    for (const claim of row.documentaryMoveClaims) sourceLink(claim.manifest);
    known.add(row.id);
  }
  entries = value.entries; loaded = true;
  byId('totals').textContent = value.counts.catalogueIdentities + ' identités · ' + value.counts.prototypeProfiles + ' profils de prototype · '
    + value.counts.adaptedCommands + ' commandes adaptées · ' + value.counts.identitiesWithNativeObservedScenes + ' identités avec scènes natives observées.';
  filter(new URL(location.href).searchParams.get('id'));
} catch (reason) {error = reason.message; byId('status').textContent = error; byId('identity').disabled = true; byId('record').hidden = true;}
