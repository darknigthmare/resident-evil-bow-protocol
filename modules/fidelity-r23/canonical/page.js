const $ = (id) => document.getElementById(id);
const labels = {alias: 'Alias documentaire', move: 'Geste décrit', weakpoint: 'Point faible décrit', dimension: 'Dimension citée'};
const normalize = (text) => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const node = (tag, text, className) => {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = String(text);
  if (className) result.className = className;
  return result;
};
let manifest, sources, current;

function link(text, href, download = false) {
  const result = node('a', text);
  const destination = new URL(href, location.href);
  if (destination.protocol !== 'https:' && destination.origin !== location.origin) return node('span', text);
  result.href = destination.href;
  if (download) result.download = destination.pathname.split('/').pop();
  else { result.target = '_blank'; result.rel = 'noopener noreferrer'; }
  return result;
}

function showSource(parent, sourceId) {
  const source = sources.get(sourceId);
  if (!source) return;
  const row = node('p', undefined, 'source-links');
  row.append(link('Consulter la page source', source.url), document.createTextNode(' · '), link('Télécharger la copie gzip', source.snapshot, true));
  parent.append(row, node('p', source.title, 'source-title'), node('code', 'SHA-256 de la page : ' + source.raw_sha256), node('p', 'Consultée le ' + new Date(source.observed_at_utc).toLocaleString('fr-FR', {timeZone: 'Europe/Paris'}) + ' (Paris). Source secondaire.', 'muted'));
}

function select(uid, focus = false) {
  const entry = manifest.entries.find((row) => row.id === uid);
  if (!entry) return;
  current = uid;
  history.replaceState(null, '', '#' + encodeURIComponent(uid));
  for (const button of $('results').querySelectorAll('button')) button.setAttribute('aria-current', button.dataset.uid === uid ? 'true' : 'false');
  const panel = $('details');
  panel.replaceChildren();
  const heading = node('h2', entry.name); heading.id = 'detail-title';
  panel.append(node('p', entry.game, 'eyebrow'), heading, node('code', entry.id), node('p', 'Fidélité complète non certifiée', 'badge'));
  const identity = node('section');
  identity.append(node('h3', 'Titre et jeu de la référence'), node('p', entry.source_title), node('p', 'La page est liée à cette entrée dans le catalogue. Son titre ne prouve pas les phases, les variantes ni un alias officiel.', 'muted'));
  showSource(identity, entry.source_id);
  panel.append(identity);
  const claims = node('section'); claims.append(node('h3', 'Citations revues (' + entry.claims.length + ')'));
  if (!entry.claims.length) claims.append(node('p', 'Aucun geste, point faible ou alias de cette fiche n’a encore fait l’objet d’une revue textuelle R23. La source reste consultable.'));
  for (const claim of entry.claims) {
    const card = node('section', undefined, 'claim');
    card.append(node('p', labels[claim.type], 'eyebrow'), node('h4', claim.label), node('blockquote', claim.excerpt), node('p', claim.limitation, 'limitation'));
    if (claim.actor_uid !== entry.id) card.append(node('p', 'Action de ' + claim.actor_uid + ' décrivant la création de cet hôte ; ce n’est pas une commande de l’hôte.', 'badge'));
    if (claim.polarity === 'NEGATED') card.append(node('p', 'La source nie explicitement cette vulnérabilité.', 'badge'));
    if (claim.type === 'dimension') card.append(node('p', 'Longueur maximale annoncée : ' + claim.maximum + ' ' + claim.unit + ', pinces comprises. Mesure indépendante absente.', 'badge'));
    card.append(node('p', 'Citation secondaire vérifiée dans le texte conservé. Ni répertoire complet, ni animation finale, ni corroboration primaire.', 'muted'));
    showSource(card, claim.source_id);
    claims.append(card);
  }
  panel.append(claims);
  for (const conflict of manifest.conflicts.filter((item) => item.uid === uid)) {
    const section = node('section', undefined, 'conflict');
    section.append(node('h3', 'Désaccord à résoudre'), node('p', 'L’origine virale attribuée au Licker beta diffère selon les deux sources.'));
    for (const item of conflict.sources) {
      const block = node('div'); block.append(node('blockquote', item.excerpt)); showSource(block, item.source_id); section.append(block);
    }
    section.append(node('p', 'Progenitor et Uroboros ne sont pas interchangeables. Une source officielle ou issue du jeu est requise avant correction.', 'limitation'));
    panel.append(section);
  }
  const additional = node('section'); additional.append(node('h3', 'Autres mentions documentaires (' + entry.additional_documentary_mentions.length + ')'));
  additional.append(node('p', 'Ces articles peuvent mélanger originaux et remakes. Une mention du nom ne corrobore pas les citations ou la forme exacte.', 'muted'));
  if (!entry.additional_documentary_mentions.length) additional.append(node('p', 'Aucune mention supplémentaire reliée dans le lot collecté.'));
  for (const mention of entry.additional_documentary_mentions) {
    const item = node('div', undefined, 'mention'); showSource(item, mention.source_id); additional.append(item);
  }
  panel.append(additional);
  if (focus) panel.focus({preventScroll: true});
}

function filter() {
  const query = normalize($('search').value), kind = $('filter').value;
  const conflicts = new Set(manifest.conflicts.map((item) => item.uid));
  const entries = manifest.entries.filter((item) => {
    const text = normalize([item.id, item.name, item.game, ...item.claims.flatMap((claim) => [claim.label, claim.excerpt])].join(' '));
    return text.includes(query) && (kind === 'all' || kind === 'reviewed' && item.claims.length || kind === 'conflict' && conflicts.has(item.id) || item.claims.some((claim) => claim.type === kind));
  });
  $('count').textContent = entries.length + ' identité' + (entries.length > 1 ? 's' : '') + ' affichée' + (entries.length > 1 ? 's' : '');
  const fragment = document.createDocumentFragment();
  for (const entry of entries) {
    const item = node('li'), button = node('button');
    button.type = 'button'; button.dataset.uid = entry.id; button.setAttribute('aria-current', current === entry.id ? 'true' : 'false');
    button.append(node('strong', entry.name), node('span', entry.game), node('small', entry.claims.length ? entry.claims.length + ' citation(s) revue(s)' : 'Titre source conservé · revue ouverte'));
    button.addEventListener('click', () => select(entry.id, true));
    item.append(button); fragment.append(item);
  }
  $('results').replaceChildren(fragment);
}

function selectFromHash() {
  let uid; try { uid = decodeURIComponent(location.hash.slice(1)); } catch { uid = ''; }
  if (manifest.entries.some((item) => item.id === uid)) select(uid);
}

async function main() {
  const response = await fetch('manifest.json');
  if (!response.ok) throw new Error('Références indisponibles (' + response.status + ')');
  manifest = await response.json();
  if (manifest.schema !== 're.bow.canonical-evidence-index/1' || !Array.isArray(manifest.entries) || !Array.isArray(manifest.sources)) throw new Error('Format des références inattendu');
  sources = new Map(manifest.sources.map((source) => [source.id, source]));
  const summary = manifest.summary;
  $('summary').textContent = summary.catalogue_identities + ' identités · ' + summary.reviewed_documentary_claims + ' citations revues · ' + summary.raw_source_snapshots + ' copies de pages · ' + summary.unresolved_secondary_source_conflicts + ' désaccord documenté';
  $('search').addEventListener('input', filter); $('filter').addEventListener('change', filter);
  filter();
  window.addEventListener('hashchange', selectFromHash);
  selectFromHash();
}
main().catch((error) => { $('summary').textContent = 'Chargement impossible : ' + error.message; });
