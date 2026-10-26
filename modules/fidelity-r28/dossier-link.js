/* Add exact-identity R28 proof links without replacing preserved Dossier sources. */
(function (root) {
  'use strict';
  const doc = root.document, script = doc?.currentScript?.src;
  if (!script || root.RE_DOSSIER_ADDITIONS_R28) return;
  const base = new URL('./', script), actions = doc.getElementById('detailActions'), dialog = doc.getElementById('specimenDialog');
  if (!actions || !dialog || typeof root.MutationObserver !== 'function') return;
  const known = new Set((root.RE_DATA?.catalog || []).map(row => row.id)), entries = new Map();
  const candidates = new Set(['re3r-nemesis', 're3r-stage-2-nemesis', 're3r-stage-3-nemesis', 're3r-ne-alpha-parasite']);
  const state = {loaded: false, failed: false, id: null, sprite: false, fullBody: false, revisedBody: false, canonical: 0, assignedAudio: 0, candidateAudio: 0};
  const host = doc.createElement('section'); host.id = 'detailAdditionsR28'; host.hidden = true;
  host.setAttribute('aria-label', 'Références vérifiées R28 de cette incarnation'); actions.after(host);
  const style = doc.createElement('style');
  style.textContent = '#detailAdditionsR28{border-top:1px solid #738b75;margin-top:1rem;padding-top:1rem;overflow-wrap:anywhere}#detailAdditionsR28[hidden]{display:none}#detailAdditionsR28 h3{font-size:1rem;color:#ead7a4}#detailAdditionsR28 p{font-size:.9rem;line-height:1.6;color:#d0dcca}#detailAdditionsR28 a{display:inline-flex;align-items:center;min-height:44px;color:#d6edcd;text-decoration:underline;overflow-wrap:anywhere}#detailAdditionsR28 a:focus-visible{outline:3px solid #f1d379;outline-offset:3px}'; doc.head.append(style);
  let controller = null, ticket = 0;
  function identity() {
    for (const node of actions.querySelectorAll('a[href]')) {
      const url = new URL(node.href, root.location.href); if (url.origin !== root.location.origin) continue;
      const uid = /\/modules\/versus\.html$/.test(url.pathname) ? url.searchParams.get('uid') : /\/(?:catalog|catalog-encounter)\.html$/.test(url.pathname) ? url.searchParams.get('id') : null;
      if (known.has(uid)) return uid;
    }
    return null;
  }
  function link(label, page, uid, hash = false) {
    const item = doc.createElement('a'), url = new URL(page, base);
    if (hash) url.hash = uid; else url.searchParams.set('identity', uid);
    item.href = url.href; item.textContent = label; return item;
  }
  function paragraph(text) { const item = doc.createElement('p'); item.textContent = text; return item; }
  function sync() {
    const id = identity(); Object.assign(state, {id, sprite: false, fullBody: false, revisedBody: false, canonical: 0, assignedAudio: 0, candidateAudio: 0});
    host.replaceChildren(); host.hidden = true; if (!dialog.open || !known.has(id) || !state.loaded || state.failed) return;
    const row = entries.get(id); if (!row) return;
    const title = doc.createElement('h3'); title.textContent = 'Références de cette incarnation · R28'; host.append(title);
    if (row.sprite) {
      const sprite = row.sprite; state.sprite = true; state.fullBody = sprite.fullBodyReviewed; state.revisedBody = sprite.revisedBodyR28;
      host.append(link(sprite.revisedBodyR28 ? 'Examiner le nouveau corps complet R28' : 'Examiner la pose revue R28', 'sprites/index.html', id));
      host.append(paragraph(sprite.fullBodyReviewed ? 'Corps visible revu dans cette pose. ' + (sprite.availableStates.includes('idle') ? 'Cette vue est admise pour l’attente neutre.' : 'Cette présentation ne déclare aucun état d’attente de combat.') + ' Animations complètes et fidélité 1:1 restent à vérifier.' : 'La région visible est revue ; le corps reste partiel ou non validé. Aucun cycle de combat complet n’est déclaré.'));
      if (sprite.knownAppearanceGaps.length || sprite.revisedBodyR28 && !sprite.equipmentCompletenessReviewed) host.append(paragraph('Des détails d’apparence ou d’équipement restent à confronter aux références. La galerie conserve ces limites.'));
      if (sprite.scope === 'context-encounter') host.append(paragraph('Cette pose appartient à une rencontre de contexte ; elle n’ouvre pas un personnage au duel libre.'));
    }
    if (row.canonicalClaims) { host.append(link('Citations documentaires R28 (' + row.canonicalClaims + ')', 'canonical/index.html', id, true)); state.canonical = row.canonicalClaims; }
    if (row.assignedAudioClips) {
      host.append(link('Sons publiés pour ce sujet (' + row.assignedAudioClips + ')', 'audio/index.html', id), paragraph('Attribution au groupe de publication Licker et au jeu. Actions, variantes individuelles et écoute indépendante restent à vérifier.'));
      state.assignedAudio = row.assignedAudioClips;
    }
    if (row.candidateAudioClips) {
      host.append(link('Références sonores candidates (' + row.candidateAudioClips + ')', 'audio/index.html', id), paragraph('Forme ou hôte non attribué : ces fichiers restent des candidats. Aucun son n’est déclaré propre à cette forme ou au parasite isolé.'));
      state.candidateAudio = row.candidateAudioClips;
    }
    host.hidden = host.childNodes.length === 1;
  }
  function validate(value) {
    if (value.schema !== 're.bow.dossier-additions-r28/1' || value.canonicalFidelityCertified !== false || !Array.isArray(value.identities) || value.identities.length !== 389) throw Error('Index R28 incompatible');
    const next = new Map();
    for (const row of value.identities) {
      if (!known.has(row.id) || next.has(row.id) || ![row.canonicalClaims, row.assignedAudioClips, row.candidateAudioClips].every(count => Number.isSafeInteger(count) && count >= 0 && count < 10000)) throw Error('Identité R28 incompatible');
      if (row.assignedAudioClips && (row.id !== 're3r-licker' || row.candidateAudioClips)) throw Error('Attribution sonore non établie');
      if (row.candidateAudioClips && !candidates.has(row.id)) throw Error('Candidat sonore inconnu');
      const sprite = row.sprite;
      if (sprite !== null && (!sprite || typeof sprite.fullBodyReviewed !== 'boolean' || typeof sprite.revisedBodyR28 !== 'boolean'
          || !['neutral-base', 'source-bind-pose', 'source-presentation', 'unknown'].includes(sprite.poseKind)
          || !Array.isArray(sprite.availableStates) || sprite.availableStates.some(value => value !== 'idle') || !Array.isArray(sprite.knownAppearanceGaps)
          || sprite.availableStates.includes('idle') && (!sprite.fullBodyReviewed || sprite.poseKind !== 'neutral-base' || !['left', 'right'].includes(sprite.sourceFacing) || sprite.scope === 'context-encounter'))) throw Error('Portée de pose incompatible');
      next.set(row.id, row);
    }
    return next;
  }
  async function load() {
    const token = ++ticket; controller?.abort(); controller = new AbortController();
    try {
      const response = await root.fetch(new URL('dossier-additions.json', base), {signal: controller.signal, credentials: 'same-origin'});
      if (!response.ok || Number(response.headers.get('content-length')) > 512 * 1024 || !response.body?.getReader) throw Error('Taille d’index R28 incompatible');
      const reader = response.body.getReader(), chunks = []; let count = 0;
      try { while (true) { const part = await reader.read(); if (part.done) break; count += part.value.length; if (count > 512 * 1024) throw Error('Index R28 trop volumineux'); chunks.push(part.value); } }
      catch (error) { await reader.cancel().catch(() => {}); throw error; } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(count); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const next = validate(JSON.parse(new TextDecoder().decode(bytes))); if (token !== ticket) return;
      entries.clear(); for (const [id, row] of next) entries.set(id, row); state.failed = false;
    } catch (error) { if (token !== ticket || error.name === 'AbortError') return; state.failed = true; entries.clear(); }
    state.loaded = true; sync();
  }
  new MutationObserver(sync).observe(actions, {childList: true}); new MutationObserver(sync).observe(dialog, {attributes: true, attributeFilter: ['open']});
  dialog.addEventListener('close', sync);
  root.addEventListener('pagehide', () => { ticket++; controller?.abort(); host.replaceChildren(); host.hidden = true; });
  root.addEventListener('pageshow', event => { if (event.persisted) { if (!state.loaded || state.failed) load(); else sync(); } });
  root.RE_DOSSIER_ADDITIONS_R28 = Object.freeze({state: () => ({...state}), sync}); load();
})(globalThis);
