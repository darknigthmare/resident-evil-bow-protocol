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

function validate(value) {
  if (value.schema !== 're.bow.canonical-evidence-index/2' || value.release !== 'R28' || !Array.isArray(value.claims)
    || !Array.isArray(value.sources) || !Array.isArray(value.entries) || value.entries.length !== 389
    || new Set(value.entries.map(e => e.id)).size !== 389 || value.summary.canonical_fidelity_certified !== 0
    || value.summary.new_reviewed_claims !== value.claims.length) throw Error('Format de preuves inattendu');
  const sourceIds = new Set(), claimIds = new Set(), identities = new Set(value.entries.map(e => e.id));
  const entriesById = new Map(value.entries.map(e => [e.id, e])), sourcesById = new Map();
  for (const source of value.sources) {
    const url = new URL(source.url), snapshot = new URL(source.snapshot, location.href);
    if (sourceIds.has(source.id) || url.protocol !== 'https:' || url.username || url.password
      || !['www.evilresource.com', 'blackjackrants.blogspot.com', 'bogleech.com'].includes(url.hostname)
      || snapshot.origin !== location.origin || !['R23', 'R28'].includes(source.snapshot_release)
      || !snapshot.pathname.startsWith('/modules/fidelity-' + source.snapshot_release.toLowerCase() + '/canonical/snapshots/')
      || !Array.isArray(source.game_keys) || !source.game_keys.length || source.game_keys.some(key => typeof key !== 'string')
      || !/^[a-f0-9]{64}$/.test(source.raw_sha256) || !/^[a-f0-9]{64}$/.test(source.snapshot_sha256)) throw Error('Source incompatible');
    sourceIds.add(source.id); sourcesById.set(source.id, source);
  }
  for (const claim of value.claims) {
    if (claimIds.has(claim.id) || !identities.has(claim.uid) || claim.canonical_fidelity_certified !== false
      || claim.actor_uid !== claim.uid || claim.subject_uid !== claim.uid
      || claim.game !== entriesById.get(claim.uid)?.game || claim.game_key !== entriesById.get(claim.uid)?.game_key
      || !['AFFIRMED', 'NEGATED'].includes(claim.polarity) || !labels[claim.type] || !claim.phase
      || !Array.isArray(claim.evidence) || !claim.evidence.length || claim.evidence.some(e => !sourceIds.has(e.source_id)
        || e.game_key !== claim.game_key || !sourcesById.get(e.source_id)?.game_keys.includes(e.game_key) || e.phase !== claim.phase
        || sourcesById.get(e.source_id)?.publisher === 'Evil Resource' && sourcesById.get(e.source_id)?.url !== entriesById.get(claim.uid)?.source_page
        || typeof e.excerpt !== 'string' || !['secondary-location-reference', 'secondary-commentary'].includes(e.layer)
        || e.layer === 'secondary-location-reference' && (!e.location || !e.game_mode || !claim.phase.includes(e.location) || !claim.phase.includes(e.game_mode) || !e.excerpt.startsWith(e.location + ' ' + e.game_mode + ' ')))) throw Error('Assertion incompatible');
    claimIds.add(claim.id);
  }
  for (const entry of value.entries) if (!Array.isArray(entry.new_claim_ids)
    || entry.new_claim_ids.some(id => !value.claims.some(claim => claim.id === id && claim.uid === entry.id))) throw Error('Index des identités incompatible');
  return value;
}

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
  card.append(node('p', source.publisher, 'eyebrow'), node('h4', source.title), node('p', evidence.layer === 'secondary-location-reference' ? 'Rencontre précise · référence secondaire' : 'Commentaire de forme · référence secondaire', 'badge'), node('blockquote', evidence.excerpt));
  const disclosure = node('details'), summary = node('summary', 'Portée, page et copie vérifiable');
  disclosure.append(summary, node('p', evidence.scope, 'muted'), node('p', 'Phase : ' + evidence.phase, 'muted'));
  if (evidence.layer === 'secondary-location-reference') disclosure.append(node('p', 'Lieu : ' + evidence.location + ' · mode : ' + evidence.game_mode, 'phase'));
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
  if (uid === 'rerev-wall-blister') panel.append(node('p', 'Références de ce lot : édition HD/PC. Aucune présence identique sur Nintendo 3DS 2012 certifiée.', 'dimension-note'));
  if (entry.previous_reviewed_claim_count) panel.append(link('Revoir les ' + entry.previous_reviewed_claim_count + ' citations R23/R24/R25/R26/R27 conservées', entry.previous_page));
  for (const claimId of entry.new_claim_ids) {
    const claim = claims.get(claimId), section = node('section', undefined, 'claim');
    section.append(node('p', labels[claim.type], 'eyebrow'), node('h3', claim.label), node('p', 'Phase : ' + claim.phase, 'phase'));
    if (claim.actor_role === 'source_named_actor_not_in_catalogue') section.append(node('p', 'Le Spotter détecte ; le Hunter ou Sweeper est appelé. Ce détecteur n’est pas ajouté au catalogue.', 'dimension-note'));
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
  const gaps = manifest.scope_gaps.filter((gap) => gap.catalogue_uid === uid);
  for (const gap of gaps) {
    const section = node('section', undefined, 'gap');
    section.append(node('p', 'Périmètre à compléter', 'eyebrow'), node('h3', gap.name), node('p', gap.limitation));
    for (const evidence of gap.evidence) section.append(sourceCard(evidence));
    panel.append(section);
  }
  if (focus) panel.focus({preventScroll: false});
}

function filter() {
  const text = normalize($('search').value), kind = $('filter').value;
  const entries = manifest.entries.filter((entry) => {
    const rows = entry.new_claim_ids.map((id) => claims.get(id));
    const searchable = normalize([entry.id, entry.name, entry.game, ...rows.flatMap((claim) => [claim.label, ...claim.evidence.map((e) => e.excerpt)])].join(' '));
    const matches = kind === 'location' && rows.some(claim => claim.evidence.some(e => e.layer === 'secondary-location-reference')) || kind === 'all' || kind === 'new' && !entry.previous_reviewed_claim_count || kind === 'corroborated' && rows.some((claim) => claim.independently_corroborated) || kind === 'negative' && rows.some((claim) => claim.polarity === 'NEGATED') || kind === 'scope' && manifest.scope_gaps.some((gap) => gap.catalogue_uid === entry.id);
    return rows.length > 0 && matches && searchable.includes(text);
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
  if (Number(response.headers.get('content-length')) > 2 * 1024 * 1024 || !response.body?.getReader) throw Error('Manifest trop volumineux');
  const reader = response.body.getReader(), chunks = []; let count = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; count += part.value.length; if (count > 2 * 1024 * 1024) throw Error('Manifest trop volumineux'); chunks.push(part.value); } }
  catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(count); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  manifest = validate(JSON.parse(new TextDecoder().decode(bytes)));
  sources = new Map(manifest.sources.map((source) => [source.id, source])); claims = new Map(manifest.claims.map((claim) => [claim.id, claim]));
  const s = manifest.summary;
  $('summary').textContent = s.new_reviewed_claims + ' nouvelles citations · ' + s.newly_reviewed_identities + ' nouvelles identités relues · ' + s.encounter_scoped_location_claims + ' citations de rencontres · ' + s.cumulative_reviewed_identities + ' identités avec une revue documentaire ; répertoires complets non certifiés';
  $('search').addEventListener('input', filter); $('filter').addEventListener('change', filter); window.addEventListener('hashchange', fromHash);
  window.RE_CANONICAL_R28 = Object.freeze({state: () => ({ready: true, selected: selected || null, identities: manifest.entries.length, claims: manifest.claims.length, displayed: $('results').children.length})});
  filter(); fromHash();
}
main().catch((error) => { $('summary').textContent = 'Chargement impossible : ' + error.message; });
