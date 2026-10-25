'use strict';
(() => {
  const ui = Object.fromEntries(['summary', 'group', 'search', 'clip', 'prepare', 'status', 'audio', 'selection', 'source', 'identitySource', 'publication', 'limitations', 'archive'].map(id => [id, document.getElementById(id)]));
  const base = new URL('./', location.href);
  let manifest, selected, current, objectURL, request, identityFilter, generation = 0;
  const normal = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  function publicLink(node, value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw Error('Lien de référence invalide');
    node.href = url.href; node.rel = 'noopener noreferrer'; node.hidden = false;
  }
  function sourceURL(value) {
    if (typeof value !== 'string' || !value.startsWith('clips/') || /[\\?#\u0000-\u001f]/.test(value)
      || value.split('/').some(p => !p || p === '.' || p === '..') || !value.endsWith('.wav')) throw Error('Chemin source invalide');
    const url = new URL(value.split('/').map(encodeURIComponent).join('/'), base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw Error('Chemin source invalide');
    return url;
  }
  function validate(value) {
    if (value.schema !== 're.bow.audio-documentary-candidates/1' || value.release !== 'R27' || !Array.isArray(value.entries)
      || !value.entries.length || value.entries.length > 2048 || !Array.isArray(value.groups) || !Array.isArray(value.sources)) throw Error('Catalogue incompatible');
    const ids = new Set(), packs = new Map(), groups = new Map(value.groups.map(row => [row.published_group, row]));
    for (const pack of value.sources) {
      if (!Number.isInteger(pack.publication_asset_id) || packs.has(pack.publication_asset_id)
        || pack.archive_path !== `archives/re3-remake-${pack.publication_asset_id}.zip`
        || pack.page_url !== `https://sounds.spriters-resource.com/pc_computer/residentevil3remake/asset/${pack.publication_asset_id}/`) throw Error('Archive source incompatible');
      packs.set(pack.publication_asset_id, pack);
    }
    for (const row of value.entries) {
      sourceURL(row.path);
      if (!/^[a-f0-9]{24}$/.test(row.clip_id) || ids.has(row.clip_id) || !/^[a-f0-9]{64}$/.test(row.sha256)
        || !Number.isInteger(row.bytes) || row.bytes <= 0 || row.bytes > 4 * 1024 * 1024
        || row.identity_id !== groups.get(row.published_group)?.identity_id
        || row.identity_id !== packs.get(row.publication_asset_id)?.identity_id
        || row.source_page !== packs.get(row.publication_asset_id)?.page_url
        || row.independent_listening_completed !== false || row.native_bank_certified !== false
        || row.canonical_fidelity_certified !== false || row.combat_audio_final !== false
        || row.probe.nonzero_pcm_samples_present !== true || !Number.isFinite(row.probe.duration_seconds)) throw Error('Attribution ou fichier incompatible');
      ids.add(row.clip_id);
    }
    if (value.counts.documentary_clips !== value.entries.length || value.counts.publisher_assigned_identities !== new Set(value.entries.map(row => row.identity_id)).size
      || value.counts.independently_listened_clips !== 0 || value.counts.certified_native_clips !== 0) throw Error('Comptage incompatible');
    return value;
  }
  function clearPrepared() {
    generation++; request?.abort(); request = undefined;
    ui.audio.pause(); ui.audio.removeAttribute('src'); ui.audio.load();
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = undefined; current = undefined;
  }
  function choose() {
    clearPrepared(); selected = manifest.entries.find(row => row.clip_id === ui.clip.value);
    ui.prepare.disabled = !selected; ui.source.hidden = ui.identitySource.hidden = !selected;
    ui.status.classList.remove('error');
    ui.status.textContent = selected ? 'Vérifiez le fichier, puis lancez sa lecture avec les commandes audio.' : 'Aucun fichier ne correspond à cette recherche.';
    ui.selection.textContent = selected ? `${selected.published_label} — ${selected.probe.duration_seconds.toFixed(3)} s · ${selected.identity_id} · ${selected.source_edition} · groupe publié, action et phase à vérifier ; écoute indépendante à faire.` : '';
    if (selected) { publicLink(ui.source, selected.source_page); publicLink(ui.identitySource, selected.identity_reference.url); const pack = manifest.sources.find(row => row.publication_asset_id === selected.publication_asset_id); ui.archive.href = new URL(pack.archive_path, base).href; ui.archive.hidden = false; }
  }
  function filter() {
    const query = normal(ui.search.value.trim()), previous = ui.clip.value;
    const matches = manifest.entries.filter(row => (!identityFilter || row.identity_id === identityFilter) && (ui.group.value === 'all' || row.published_group === ui.group.value)
      && normal(row.published_label + ' ' + row.identity_id).includes(query));
    const fragment = document.createDocumentFragment();
    for (const row of matches) {
      const option = document.createElement('option'); option.value = row.clip_id;
      option.textContent = `${row.published_label} · ${row.probe.duration_seconds.toFixed(3)} s`; fragment.append(option);
    }
    ui.clip.replaceChildren(fragment); ui.clip.disabled = !matches.length;
    if (matches.some(row => row.clip_id === previous)) ui.clip.value = previous;
    choose();
  }
  async function boundedBytes(response, row) {
    if (!response.ok) throw Error('Fichier indisponible');
    const length = response.headers.get('Content-Length');
    if (length !== null && Number(length) !== row.bytes) throw Error('Taille du fichier incorrecte');
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try {
      for (;;) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.byteLength;
        if (size > row.bytes) { await reader.cancel(); throw Error('Taille du fichier incorrecte'); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    if (size !== row.bytes) throw Error('Taille du fichier incorrecte');
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
    if (hash !== row.sha256) throw Error('Empreinte du fichier incorrecte');
    return bytes;
  }
  async function prepare() {
    if (!selected) return;
    const row = selected; clearPrepared(); const turn = generation, controller = new AbortController();
    request = controller; ui.prepare.disabled = true; ui.status.classList.remove('error'); ui.status.textContent = 'Vérification des octets publiés…';
    try {
      const response = await fetch(sourceURL(row.path), {signal: controller.signal});
      const bytes = await boundedBytes(response, row);
      if (turn !== generation || controller.signal.aborted) return;
      objectURL = URL.createObjectURL(new Blob([bytes], {type: 'audio/wav'})); ui.audio.src = objectURL;
      ui.audio.load(); current = row.clip_id;
      ui.status.textContent = 'Fichier vérifié. Lancez la lecture avec les commandes audio.';
    } catch (error) {
      if (turn !== generation || error.name === 'AbortError') return;
      ui.status.classList.add('error'); ui.status.textContent = `${error.message}. Aucun fichier n’a été chargé.`;
    } finally { if (turn === generation) { request = undefined; ui.prepare.disabled = !selected; } }
  }
  ui.prepare.addEventListener('click', prepare);
  ui.audio.addEventListener('error', () => { if (current) { ui.status.classList.add('error'); ui.status.textContent = 'Ce navigateur ne décode pas ce fichier ; les octets source restent disponibles.'; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) ui.audio.pause(); });
  window.addEventListener('pagehide', clearPrepared);
  window.RE_AUDIO_R27 = Object.freeze({state: () => ({ready: !!manifest, clips: manifest?.entries.length || 0, identity: identityFilter || null, identities: manifest?.counts.publisher_assigned_identities || 0,
    selected: selected?.clip_id || null, prepared: current || null, playing: !ui.audio.paused, loading: !!request, objectURLs: objectURL ? 1 : 0})});
  fetch('manifest.json').then(async response => {
    if (!response.ok) throw Error('Catalogue indisponible');
    const value = validate(await response.json());
    const identities = new URLSearchParams(location.search).getAll('identity');
    if (identities.length > 1 || (identities[0] && !value.entries.some(row => row.identity_id === identities[0]))) throw Error('Incarnation absente de cette publication');
    identityFilter = identities[0]; manifest = value;
    ui.summary.textContent = identityFilter
      ? `${manifest.entries.filter(row => row.identity_id === identityFilter).length} WAV publiés pour ${identityFilter} · groupe source attribué · écoute indépendante à faire.`
      : `${manifest.entries.length} WAV publiés · ${manifest.counts.publisher_assigned_identities} incarnations reliées aux groupes source · écoute indépendante à faire.`;
    const fragment = document.createDocumentFragment();
    for (const row of manifest.groups.filter(row => !identityFilter || row.identity_id === identityFilter)) { const option = document.createElement('option'); option.value = row.published_group; option.textContent = `${row.published_group} · ${row.delivered_clips} fichiers`; fragment.append(option); }
    ui.group.append(fragment); ui.group.disabled = ui.search.disabled = false;
    for (const limitation of manifest.source.limitations) { const item = document.createElement('li'); item.textContent = limitation; ui.limitations.append(item); }
    publicLink(ui.publication, manifest.source.page_url); filter();
    ui.search.addEventListener('input', filter); ui.group.addEventListener('change', filter); ui.clip.addEventListener('change', choose);
  }).catch(error => { ui.summary.classList.add('error'); ui.summary.textContent = `${error.message}. Aucune lecture disponible.`; });
})();
