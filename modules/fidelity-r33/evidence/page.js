const el = id => document.getElementById(id);
const state = { api: null, active: true, generation: 0, controller: null, url: null, preparedClipId: null, selection: null,
  initGeneration: 0, initController: null, exportUrls: new Set() };
const audio = el('audio');
function text(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}
function option(select, value, label) {
  const node = text('option', label); node.value = value; select.append(node);
}
function link(label, href) {
  const node = text('a', label); node.href = href; return node;
}
function resetAudio(message = 'Aucune lecture automatique. Préparez un fichier puis utilisez ses commandes de lecture.') {
  state.generation++;
  state.controller?.abort(); state.controller = null;
  audio.pause(); audio.removeAttribute('src'); audio.load();
  if (state.url) URL.revokeObjectURL(state.url);
  state.url = null; state.preparedClipId = null;
  el('audio-status').textContent = message;
}
function selectClip() {
  resetAudio();
  const clip = state.api.clip(el('clip').value);
  el('prepare').disabled = !clip || !state.active;
  el('audio-meta').textContent = clip ? `${clip.publishedGroup} · ${clip.publishedLabel} · ${clip.sourceEdition}. SHA-256 : ${clip.sha256}. Action, phase et locuteur non attribués ; écoute indépendante non certifiée.` : 'Aucun fichier candidat R31 pour cette incarnation.';
}
function selectedClaim() { return state.api.claim(el('claim').value); }
function updateClaimContext() {
  const claim = selectedClaim();
  const phase = el('context-phase'), region = el('context-region'), box = el('conditions');
  phase.replaceChildren(); region.replaceChildren();
  box.replaceChildren(text('legend', 'Conditions effectivement présentes'));
  if (!claim) return;
  option(phase, '', 'Phase non vérifiée'); option(phase, claim.phase, claim.phase);
  option(region, '', 'Partie non vérifiée'); option(region, claim.bodyRegion, claim.bodyRegion);
  for (const condition of claim.requiredConditions) {
    const label = document.createElement('label'), checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.name = 'condition'; checkbox.value = condition;
    label.append(checkbox, text('span', condition)); box.append(label);
  }
  if (!claim.requiredConditions.length) box.append(text('p', 'Aucune condition supplémentaire citée ; le jeu, la phase et l’anatomie doivent toujours correspondre.'));
  el('context-game').value = '';
  el('context-result').textContent = 'Choisissez les conditions observées avant de comparer.';
}
function render(uid, updateUrl = true) {
  const entry = state.api.entry(uid);
  if (!entry) throw new Error('Incarnation inconnue. Aucun alias automatique.');
  el('export').disabled = false;
  state.selection = entry.id;
  el('identity').value = entry.id;
  resetAudio();
  el('name').textContent = entry.name;
  el('edition').textContent = entry.game + ' · UID exact : ' + entry.id;
  const cards = el('claims'); cards.replaceChildren(); el('claim').replaceChildren();
  const claims = state.api.claimsFor(uid);
  for (const claim of claims) {
    const article = document.createElement('article'); article.dataset.claimId = claim.id;
    article.append(text('h3', claim.label), text('p', `${claim.id} · ${claim.sourceLayer} · ${claim.novelty}`, 'tag'));
    const quote = text('blockquote', claim.excerpt); quote.lang = 'en'; article.append(quote);
    const source = state.api.source(claim.sourceId);
    article.append(text('p', `${claim.phase} · ${claim.bodyRegion} · ${claim.sourceEdition}`), text('p', claim.limitation));
    const references = document.createElement('p');
    references.append(link('Page de référence', source.url), document.createTextNode(' · '),
      link('Capture conservée (.html.gz)', new URL('../../../' + source.snapshot, import.meta.url).href));
    article.append(references, text('p', 'SHA-256 de la source décompressée : ' + source.rawSha256, 'tag'));
    cards.append(article); option(el('claim'), claim.id, claim.label);
  }
  if (!claims.length) cards.append(text('p', 'Aucun nouvel extrait documentaire R33 pour cette incarnation. Les sons candidats ci-dessous sont conservés sans nouvelle attribution.'));
  for (const id of ['claim', 'context-game', 'context-phase', 'context-region', 'check-context']) el(id).disabled = !claims.length;
  updateClaimContext();
  el('clip').replaceChildren();
  for (const clip of state.api.audioFor(uid)) option(el('clip'), clip.clipId, `${clip.publishedGroup} · ${clip.publishedLabel}`);
  el('clip').disabled = !state.api.audioFor(uid).length;
  el('audio-review').href = '../../fidelity-r31/audio/index.html?id=' + encodeURIComponent(uid);
  selectClip();
  if (updateUrl) {
    const url = new URL(location.href); url.searchParams.set('id', uid); history.replaceState(null, '', url);
  }
}
async function prepare() {
  const clip = state.api.clip(el('clip').value);
  if (!clip || !state.active) return;
  resetAudio('Vérification du fichier publié…');
  const generation = state.generation, controller = new AbortController(); state.controller = controller;
  el('prepare').disabled = true;
  const current = () => generation === state.generation && state.active && !controller.signal.aborted && el('clip').value === clip.clipId;
  try {
    const response = await fetch(new URL('../../../' + clip.path, import.meta.url), { signal: controller.signal, cache: 'no-store' });
    if (!current()) { await response.body?.cancel(); return; }
    if (!response.ok) throw new Error('Fichier audio indisponible.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Lecture bornée indisponible.');
    const chunks = []; let size = 0;
    try {
      for (;;) {
        const result = await reader.read(); if (result.done) break;
        if (!current()) { await reader.cancel(); return; }
        size += result.value.byteLength;
        if (size > clip.bytes || size > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Taille audio différente de la source.'); }
        chunks.push(result.value);
      }
    } finally { reader.releaseLock(); }
    if (!current()) return;
    if (size !== clip.bytes) throw new Error('Taille audio différente de la source.');
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
    if (!current()) return;
    if (hash !== clip.sha256) throw new Error('Empreinte audio différente de la source.');
    state.url = URL.createObjectURL(new Blob([bytes], { type: clip.path.endsWith('.ogg') ? 'audio/ogg' : 'audio/wav' }));
    state.preparedClipId = clip.clipId; audio.src = state.url; audio.load();
    el('audio-status').textContent = 'Taille et empreinte vérifiées. Utilisez LECTURE pour écouter. Ce contrôle ne certifie ni écoute indépendante ni attribution.';
  } catch (error) {
    if (current()) resetAudio(error.message || 'Préparation audio refusée.');
  } finally {
    if (state.controller === controller) state.controller = null;
    el('prepare').disabled = !state.active || !!state.controller || !state.api.clip(el('clip').value);
  }
}
el('identity').addEventListener('change', () => render(el('identity').value));
el('clip').addEventListener('change', selectClip);
el('claim').addEventListener('change', updateClaimContext);
el('prepare').addEventListener('click', prepare);
el('context-form').addEventListener('submit', event => {
  event.preventDefault();
  const claim = selectedClaim(); if (!claim) return;
  const result = state.api.matchClaim(claim.id, { uid: state.selection, gameKey: el('context-game').value,
    phase: el('context-phase').value, bodyRegion: el('context-region').value,
    conditions: Array.from(el('conditions').querySelectorAll('input:checked'), node => node.value) });
  el('context-result').textContent = result.status === 'DOCUMENTARY_CONTEXT_MATCH'
    ? 'Contexte documentaire correspondant. Édition technique, animation et affectation au combat restent non certifiées.'
    : 'Contexte non prouvé : ' + result.reasons.join(', ') + '. Aucune correspondance automatique.';
});
el('export').addEventListener('click', () => {
  if (!state.api || !state.selection) return;
  const payload = { schema: 're.bow.evidence-dossier-export-r33/1', entry: state.api.entry(state.selection),
    claims: state.api.claimsFor(state.selection), candidateAudio: state.api.audioFor(state.selection),
    sources: state.api.entry(state.selection).sourceIds.map(id => state.api.source(id)),
    independentListeningCertified: false, gameplayAdmitted: false, canonicalFidelityCertified: false };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' }));
  state.exportUrls.add(url);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = state.selection + '-preuves-r33.json'; anchor.click();
  setTimeout(() => { URL.revokeObjectURL(url); state.exportUrls.delete(url); }, 1000);
});
window.addEventListener('pagehide', () => {
  state.active = false; state.initGeneration++; state.initController?.abort(); state.initController = null;
  el('prepare').disabled = true;
  resetAudio('Sortie de page : audio libéré. Préparez un fichier au retour.');
  for (const url of state.exportUrls) URL.revokeObjectURL(url);
  state.exportUrls.clear();
});
window.addEventListener('pageshow', () => {
  state.active = true;
  if (!state.api && !state.initController) init();
  el('prepare').disabled = !!state.controller || !state.api?.clip(el('clip').value);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) audio.pause(); });
async function init() {
  if (!state.active) return;
  const generation = ++state.initGeneration, controller = new AbortController(); state.initController = controller;
  const current = () => state.active && state.initGeneration === generation && !controller.signal.aborted;
  try {
    const response = await fetch('manifest.json', { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('Références indisponibles.');
    const raw = await response.json();
    if (!current()) return;
    state.api = globalThis.RE_EVIDENCE_R33.create(raw);
    const manifest = state.api.manifest;
    el('identity').replaceChildren(); el('context-game').replaceChildren();
    for (const entry of manifest.entries) option(el('identity'), entry.id, `${entry.name} · ${entry.game}`);
    option(el('context-game'), '', 'Jeu non vérifié');
    for (const key of new Set(manifest.entries.map(entry => entry.gameKey))) {
      option(el('context-game'), key, manifest.entries.find(entry => entry.gameKey === key).game);
    }
    el('identity').disabled = false; el('export').disabled = false;
    const requested = new URLSearchParams(location.search).get('id');
    if (requested && !state.api.entry(requested)) {
      el('status').textContent = 'UID inconnu dans ce lot : aucun alias ni remplacement automatique. Choisissez une incarnation.';
      const placeholder = text('option', 'Choisissez une incarnation présente dans ce lot');
      placeholder.value = ''; placeholder.disabled = true; placeholder.selected = true;
      el('identity').prepend(placeholder); el('export').disabled = true;
    } else {
      render(requested || manifest.entries[0].id);
      el('status').textContent = `${manifest.counts.documentedIdentities} incarnations documentées · ${manifest.counts.sourceResponses} sources conservées · ${manifest.counts.newCuratedDocumentaryExcerpts} extraits nouvellement structurés · aucun nouveau média audio.`;
    }
  } catch (error) { if (current()) el('status').textContent = error.message || 'Préparation des preuves refusée.'; }
  finally { if (state.initController === controller) state.initController = null; }
}
init();
