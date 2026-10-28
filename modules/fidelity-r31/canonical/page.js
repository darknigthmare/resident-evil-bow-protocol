import {validate, subject, dimension, conclusion, alias} from './query.js';
const repository = new URL('../../../', import.meta.url);
const $ = id => document.getElementById(id);
const state = {loaded: false, failed: false, uid: null, catalogueVictims: 0};
let pack, catalogue = [];
function node(tag, text, className) {const value = document.createElement(tag); if (text !== undefined) value.textContent = text; if (className) value.className = className; return value;}
function option(value, text) {const item = node('option', text); item.value = value; return item;}
function field(container, title, value) {const label = node('label', title); label.append(value); container.append(label); return value;}
function link(text, href) {const value = node('a', text); value.href = href; return value;}
function proof(claim, container) {
  for (const citation of claim.evidence) {
    const source = pack.sources.find(row => row.id === citation.sourceId);
    const quote = node('blockquote', citation.excerpt); quote.lang = 'en'; container.append(quote);
    const line = node('p'); line.append(link(source.publisher, source.url), document.createTextNode(' · '),
      link('Copie conservée et vérifiée', new URL(source.snapshot, repository).href)); container.append(line);
    container.append(node('p', 'SHA-256 de la réponse : ' + source.rawSha256, 'note'));
    if (citation.sourceLayer === 'secondary-transcription-of-game-file') container.append(node('p', 'Transcription secondaire d’un fichier de jeu ; aucune capture primaire directe revendiquée.', 'note'));
  }
}
function addDimensions(info, holder) {
  for (const item of info.dimensions) {
    const card = node('section', undefined, 'dimension'); card.dataset.dimensionId = item.id;
    card.append(node('h3', 'Dimension : ' + item.bodyRegion));
    const phase = document.createElement('select'); phase.append(option(item.phase, item.phase), option('other-body-stage', 'Autre phase corporelle'));
    const region = document.createElement('select'); region.append(option(item.bodyRegion, item.bodyRegion), option('unverified-body-region', 'Autre partie du corps'));
    field(card, 'Phase de la mesure', phase); field(card, 'Partie mesurée', region);
    const check = node('button', 'Vérifier la portée de cette mesure'); check.type = 'button'; card.append(check);
    const result = node('p', '', 'result'); result.setAttribute('role', 'status'); card.append(result);
    const run = () => {
      const answer = dimension(pack, item.id, {uid: info.entry.id, phase: phase.value, bodyRegion: region.value});
      result.dataset.supported = String(answer.supported);
      const value = item.value === null ? 'Ordre de grandeur qualitatif, sans hauteur exacte.'
        : (item.operator === 'approximately' ? 'Environ ' : 'Plus de ') + item.value + ' ' + item.unit
          + (item.unit === 'cm' ? ' (environ ' + item.siValueMeters + ' m).' : '.');
      result.textContent = answer.supported ? value + ' Cette contrainte ne calibre aucune collision.'
        : 'Mesure retenue : la phase ou la partie demandée ne correspond pas à la source.';
    };
    check.addEventListener('click', run); run(); card.append(node('p', item.reason, 'note')); holder.append(card);
  }
}
function addConclusions(info, holder) {
  for (const rule of info.conclusionRules) {
    const card = node('section', undefined, 'conclusion'); card.dataset.ruleId = rule.id;
    card.append(node('h3', 'Contrôler une conclusion : ' + rule.outcome));
    const victim = document.createElement('select'); victim.append(option('', 'Contexte de victime cité par la source'));
    for (const row of catalogue) victim.append(option(row.id, row.name + ' · ' + row.game));
    field(card, 'Victime : source ou personnage du catalogue', victim);
    const role = document.createElement('select'); role.append(option(rule.victimRole, rule.victimRole), option('other-role', 'Rôle différent'));
    const phase = document.createElement('select'); phase.append(option(rule.phase, rule.phase), option('other-phase', 'Autre phase'));
    const environment = document.createElement('select'); environment.append(option(rule.environment, rule.environment), option('other-environment', 'Autre environnement'));
    field(card, 'Rôle explicitement décrit', role); field(card, 'Phase', phase); field(card, 'Environnement', environment);
    const conditions = node('div', undefined, 'conditions');
    const boxes = rule.requiredConditions.map(value => {
      const input = document.createElement('input'); input.type = 'checkbox'; input.value = value;
      const label = node('label'); label.append(input, document.createTextNode(value)); conditions.append(label); return input;
    });
    card.append(node('p', 'Conditions citées à confirmer :'), conditions);
    const runButton = node('button', 'Vérifier ce contexte'); runButton.type = 'button'; card.append(runButton);
    const result = node('p', 'La vérification conserve les conditions de la source.', 'result'); result.setAttribute('role', 'status'); card.append(result);
    runButton.addEventListener('click', () => {
      const request = {uid: info.entry.id, gameKey: rule.gameKey, victimUid: victim.value || undefined,
        phase: phase.value, victimRole: role.value, environment: environment.value,
        conditions: boxes.filter(box => box.checked).map(box => box.value)};
      const answer = conclusion(pack, rule.id, request); result.dataset.supported = String(answer.documentarySupported);
      result.dataset.reason = answer.reason;
      result.textContent = answer.documentarySupported
        ? 'Correspondance documentaire dans ce contexte source. Aucune conclusion animée ni association de combat n’est admise automatiquement. Létalité décrite : ' + answer.lethality + '.'
        : answer.reason === 'arbitrary-catalogue-victim-not-documented'
          ? 'Association retenue : cette victime du catalogue n’est pas attestée par la source.'
          : 'Contexte retenu : jeu, phase, environnement, rôle ou conditions ne correspondent pas à la preuve.';
    });
    card.append(node('p', 'Une tentative, un empalement décrit et une mort instantanée restent des résultats distincts. La morphologie d’une autre victime ne se déduit pas du nom de l’attaque.', 'note'));
    holder.append(card);
  }
}
function show(uid, updateURL = true) {
  const info = subject(pack, uid); if (!info) return;
  state.uid = uid;
  const holder = $('details'); holder.replaceChildren(node('h2', info.entry.label), node('p', info.entry.game, 'scope'));
  holder.firstElementChild.id = 'detailTitle';
  holder.append(node('p', 'Les faits nouveaux et les preuves antérieures restent séparés. Les citations ne certifient pas un répertoire complet ni la présentation du moteur original.', 'note'));
  for (const claim of info.claims) {
    const card = node('section', undefined, 'fact'); card.dataset.claimId = claim.id;
    card.append(node('span', claim.novelty === 'NEW_DOCUMENTARY_FACT' ? 'Fait documentaire nouveau' : 'Preuve antérieure conservée', 'tag'), node('h3', claim.label));
    const values = node('dl');
    for (const [title, text] of [['Édition source', claim.sourceEdition], ['Phase', claim.phase], ['Conditions', claim.conditions.join(', ') || 'Aucune condition supplémentaire déduite'], ['Partie concernée', claim.bodyRegion || 'Portée décrite par la citation']]) values.append(node('dt', title), node('dd', text));
    card.append(values);
    if (!claim.targetEditionMatched) card.append(node('p', 'Équivalence avec l’édition cible du catalogue non certifiée.', 'scope'));
    proof(claim, card); holder.append(card);
  }
  addDimensions(info, holder); addConclusions(info, holder);
  for (const decision of info.aliasDecisions) {
    const answer = alias(pack, decision.id); const card = node('section', undefined, 'decision'); card.dataset.aliasId = decision.id;
    card.append(node('h3', 'Alias ou édition : ' + answer.status), node('p', decision.reason), node('p', 'Aucune promotion automatique de modèle, de forme ou d’édition.', 'scope')); holder.append(card);
  }
  if (updateURL) {const url = new URL(location.href); url.searchParams.set('id', uid); history.replaceState(null, '', url);}
  for (const button of $('results').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.id === uid));
}
function filter() {
  const search = $('search').value.trim().toLocaleLowerCase('fr');
  const rows = pack.entries.filter(row => [row.id, row.label, row.game].join(' ').toLocaleLowerCase('fr').includes(search));
  $('results').replaceChildren(...rows.map(row => {const li = node('li'), button = node('button', row.label + ' · ' + row.game); button.type = 'button'; button.dataset.id = row.id; button.setAttribute('aria-pressed', String(row.id === state.uid)); button.addEventListener('click', () => {show(row.id); $('details').focus();}); li.append(button); return li;}));
  $('count').textContent = rows.length + ' incarnation(s) affichée(s) sur ' + pack.entries.length;
}
async function jsonFile(url, maximum, expected) {
  const response = await fetch(url, {credentials: 'same-origin'});
  if (!response.ok || !response.body?.getReader) throw Error('Réponse de preuve indisponible');
  const reader = response.body.getReader(), chunks = []; let total = 0;
  try {for (;;) {const {value, done} = await reader.read(); if (done) break; total += value.byteLength; if (total > maximum) {await reader.cancel(); throw Error('Preuve trop volumineuse');} chunks.push(value);}}
  finally {reader.releaseLock();}
  const raw = new Uint8Array(total); let offset = 0; for (const chunk of chunks) {raw.set(chunk, offset); offset += chunk.length;}
  if (expected) {
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(value => value.toString(16).padStart(2, '0')).join('');
    if (raw.length !== expected.bytes || digest !== expected.sha256) throw Error('Le catalogue ne correspond pas à la preuve');
  }
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw));
}
async function setup() {
  try {
    pack = validate(await jsonFile(new URL('./manifest.json', import.meta.url), 2 * 1024 * 1024));
    const binding = pack.inputs.find(row => row.path === 'data/roster.json');
    if (!binding) throw Error('Le lien au catalogue manque');
    const roster = await jsonFile(new URL('data/roster.json', repository), 8 * 1024 * 1024, binding);
    if (!Array.isArray(roster.catalog) || roster.catalog.length !== 389 || new Set(roster.catalog.map(row => row.id)).size !== 389) throw Error('Identités du catalogue invalides');
    catalogue = roster.catalog; state.catalogueVictims = catalogue.length;
    if (pack.entries.some(row => !catalogue.some(identity => identity.id === row.id && identity.gameKey === row.gameKey))) throw Error('La forme source ne correspond pas au catalogue');
    $('search').addEventListener('input', filter); filter();
    const requested = new URL(location.href).searchParams.get('id');
    show(pack.entries.some(row => row.id === requested) ? requested : pack.entries[0].id, false);
    state.loaded = true;
    $('status').textContent = pack.counts.newDocumentaryFacts + ' faits nouveaux, ' + pack.counts.reusedSourceFacts + ' preuves antérieures, ' + pack.counts.sourceDimensionConstraints + ' contraintes de mesure ; aucune fidélité globale 1:1 certifiée.';
  } catch (error) {state.failed = true; $('status').textContent = 'Preuves indisponibles : ' + error.message; $('results').replaceChildren(); const title = node('h2', 'Sources non chargées'); title.id = 'detailTitle'; $('details').replaceChildren(title, node('p', 'Les autres versions documentaires restent disponibles par le lien historique.'));}
}
globalThis.RE_CANONICAL_R31 = Object.freeze({state: () => ({...state}), subject: uid => pack ? subject(pack, uid) : null,
  dimension: (id, request) => pack ? dimension(pack, id, request) : null,
  conclusion: (id, request) => pack ? conclusion(pack, id, request) : null, alias: id => pack ? alias(pack, id) : null});
setup();
