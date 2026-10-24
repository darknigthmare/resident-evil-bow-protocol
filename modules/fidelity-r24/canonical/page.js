const $ = (id) => document.getElementById(id);
const labels = {move: 'Geste ou comportement', weakpoint: 'Vulnérabilité décrite', form: 'Forme documentée', scope: 'Périmètre et contexte', dimension: 'Dimension citée', alias: 'Nom et terminologie'};
const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const node = (tag, text, className) => {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = String(text);
  if (className) item.className = className;
  return item;
};
let manifest, sources, claims, selected;

function link(text, href, download = false) {
  const target = new URL(href, location.href), item = node('a', text);
  if (target.protocol !== 'https:' && target.origin !== location.origin) return node('span', text);
  item.href = target.href;
  if (download) item.download = target.pathname.split('/').pop();
  else if (target.origin !== location.origin) { item.target = '_blank'; item.rel = 'noopener noreferrer'; }
  return item;
}

function sourceCard(evidence) {
  const source = sources.get(evidence.source_id), card = node('div', undefined, 'evidence');
  if (!source) return card;
  card.append(node('p', source.publisher, 'eyebrow'), node('h4', source.title), node('p', evidence.layer === 'transcribed-in-game-file' ? 'Transcription d’un fichier en jeu — hébergement tiers' : 'Référence secondaire', 'badge'), node('blockquote', evidence.excerpt));
  const disclosure = node('details'), summary = node('summary', 'Portée, page et copie vérifiable');
  disclosure.append(summary, node('p', evidence.scope, 'muted'), node('p', 'Phase : ' + evidence.phase, 'muted'));
  const links = node('p', undefined, 'source-links');
  links.append(link('Ouvrir la source', source.url), document.createTextNode(' · '), link('Copie gzip', source.snapshot, true));
  disclosure.append(links, node('code', 'SHA-256 : ' + source.raw_sha256), node('p', 'Page conservée en ' + source.snapshot_release + '. Capture directe du jeu : non.', 'muted'));
  card.append(disclosure); return card;
}

function select(uid, focus = false) {
  const entry = manifest.entries.find((item) => item.id === uid); if (!entry) return;
  selected = uid; history.replaceState(null, '', '#' + encodeURIComponent(uid));
  for (const button of $('results').querySelectorAll('button')) button.setAttribute('aria-current', button.dataset.uid === uid ? 'true' : 'false');
  const panel = $('details'); panel.replaceChildren();
  const heading = node('h2', entry.name); heading.id = 'detail-title';
  panel.append(node('p', entry.game, 'eyebrow'), heading, node('code', uid), node('p', 'Fidélité complète non certifiée', 'badge'));
  if (entry.previous_r23_reviewed_claim_count) panel.append(link('Revoir les ' + entry.previous_r23_reviewed_claim_count + ' citations R23 conservées', entry.previous_page));
  for (const claimId of entry.new_claim_ids) {
    const claim = claims.get(claimId), section = node('section', undefined, 'claim');
    section.append(node('p', labels[claim.type], 'eyebrow'), node('h3', claim.label), node('p', 'Phase : ' + claim.phase, 'phase'));
    if (claim.independently_corroborated) {
      section.append(node('p', 'Énoncé recoupé entre éditeurs', 'badge corroborated'), node('p', 'Ce que le recoupement confirme : ' + claim.corroborated_scope, 'shared-scope'));
    }
    if (claim.type === 'dimension') {
      const quantity = claim.quantity;
      const text = quantity.comparison === 'vague_range' ? 'Formulation vague : « ' + quantity.verbatim + ' ». Aucune valeur exacte.' : (quantity.comparison === 'greater_than' ? 'Borne : strictement plus de ' : 'Approximation : presque ') + quantity.value + ' ' + quantity.unit + '. Valeur exacte non établie.';
      section.append(node('p', text, 'dimension-note'));
    }
    if (claim.polarity !== 'AFFIRMED') section.append(node('p', claim.polarity === 'NEGATED' ? 'Négation limitée à la phase indiquée.' : claim.polarity === 'TEMPORARY_STUN_NOT_DEATH' ? 'Effondrement temporaire ; la mort n’est pas établie.' : 'Identité niée explicitement dans le fichier.', 'dimension-note'));
    const evidence = node('div', undefined, 'evidence-grid');
    for (const item of claim.evidence) evidence.append(sourceCard(item));
    section.append(evidence, node('p', claim.limitation, 'limitation'));
    panel.append(section);
  }
  const gaps = manifest.scope_gaps.filter((gap) => gap.catalogue_uid === uid || uid === 're5-u-8' && gap.id === 'R24-SCOPE-U8-PRIME');
  for (const gap of gaps) {
    const section = node('section', undefined, 'gap');
    section.append(node('p', 'Périmètre à compléter', 'eyebrow'), node('h3', gap.name), node('p', gap.limitation));
    for (const evidence of gap.evidence) section.append(sourceCard(evidence));
    panel.append(section);
  }
  if (uid === manifest.conflict_followup.uid) {
    const followup = node('section', undefined, 'gap');
    followup.append(node('h3', 'Désaccord R23 : nouvel élément'), node('p', 'Le journal de Miguel transcrit pour RE5 soutient l’emploi de Progenitor dans les recherches sur les Lickers. Le blog évoquait Uroboros. La transcription tierce doit encore être comparée à une capture du jeu ; les données historiques restent conservées.'));
    panel.append(followup);
  }
  if (focus) panel.focus({preventScroll: false});
}

function filter() {
  const text = normalize($('search').value), kind = $('filter').value;
  const entries = manifest.entries.filter((entry) => {
    const rows = entry.new_claim_ids.map((id) => claims.get(id));
    const searchable = normalize([entry.id, entry.name, entry.game, ...rows.flatMap((claim) => [claim.label, ...claim.evidence.map((e) => e.excerpt)])].join(' '));
    const matches = kind === 'all' || kind === 'new' && !entry.previous_r23_reviewed_claim_count || kind === 'corroborated' && rows.some((claim) => claim.independently_corroborated) || kind === 'transcribed' && rows.some((claim) => claim.evidence.some((e) => e.layer === 'transcribed-in-game-file')) || kind === 'dimension' && rows.some((claim) => claim.type === 'dimension') || kind === 'scope' && manifest.scope_gaps.some((gap) => gap.catalogue_uid === entry.id || entry.id === 're5-u-8' && gap.id === 'R24-SCOPE-U8-PRIME');
    return matches && searchable.includes(text);
  });
  $('count').textContent = entries.length + ' identité(s) affichée(s)';
  const fragment = document.createDocumentFragment();
  for (const entry of entries) {
    const item = node('li'), button = node('button'); button.type = 'button'; button.dataset.uid = entry.id;
    button.setAttribute('aria-current', entry.id === selected ? 'true' : 'false');
    button.append(node('strong', entry.name), node('span', entry.game), node('small', entry.new_claim_ids.length + ' nouvelle(s) citation(s)'));
    button.addEventListener('click', () => select(entry.id, true)); item.append(button); fragment.append(item);
  }
  $('results').replaceChildren(fragment);
}

function fromHash() {
  let uid; try { uid = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (manifest.entries.some((entry) => entry.id === uid)) select(uid);
}

async function main() {
  const response = await fetch('manifest.json'); if (!response.ok) throw new Error('Références indisponibles (' + response.status + ')');
  manifest = await response.json();
  if (manifest.schema !== 're.bow.canonical-evidence-index/2' || !Array.isArray(manifest.claims) || !Array.isArray(manifest.sources)) throw new Error('Format de preuves inattendu');
  sources = new Map(manifest.sources.map((source) => [source.id, source])); claims = new Map(manifest.claims.map((claim) => [claim.id, claim]));
  const s = manifest.summary;
  $('summary').textContent = s.new_reviewed_claims + ' nouvelles citations · ' + s.newly_reviewed_identities + ' nouvelles identités relues · ' + s.independently_corroborated_claims + ' énoncés recoupés · ' + s.claims_with_transcribed_in_game_evidence + ' citations de fichiers en jeu transcrits';
  $('search').addEventListener('input', filter); $('filter').addEventListener('change', filter); window.addEventListener('hashchange', fromHash);
  filter(); fromHash();
}
main().catch((error) => { $('summary').textContent = 'Chargement impossible : ' + error.message; });
