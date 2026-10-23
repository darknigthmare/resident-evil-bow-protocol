'use strict';
(() => {
  const ui = Object.fromEntries(['summary', 'search', 'clip', 'prepare', 'status', 'audio', 'selection', 'source', 'publication', 'limitations'].map(id => [id, document.getElementById(id)]));
  let manifest, selected, current, objectURL, request, generation = 0;
  const normal = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  function publicLink(node, value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Lien source invalide');
    node.href = url.href;
    node.rel = 'noopener noreferrer';
  }
  function clearPrepared() {
    generation++;
    request?.abort();
    request = undefined;
    ui.audio.pause();
    ui.audio.removeAttribute('src');
    ui.audio.load();
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = undefined;
    current = undefined;
  }
  function choose() {
    clearPrepared();
    selected = manifest.entries.find(row => row.clip_id === ui.clip.value);
    ui.prepare.disabled = !selected;
    ui.source.hidden = !selected;
    ui.status.classList.remove('error');
    ui.status.textContent = selected ? 'Extrait sélectionné. Chargez-le, puis lancez la lecture avec les commandes audio.' : 'Aucun extrait ne correspond à cette recherche.';
    ui.selection.textContent = selected ? `${selected.published_label} — ${selected.probe.duration_seconds.toFixed(2)} s · libellé de l’auteur · voix non attribuée à une incarnation précise.` : '';
    if (selected) publicLink(ui.source, `https://github.com/juliani91/resident-evil-4-soundboard/blob/${manifest.source.publication_commit}/res/raw/${selected.clip_id}.mp3`);
  }
  function filter() {
    const query = normal(ui.search.value.trim());
    const previous = ui.clip.value;
    const matches = manifest.entries.filter(row => normal(row.published_label + ' ' + row.clip_id).includes(query));
    const fragment = document.createDocumentFragment();
    for (const row of matches) {
      const option = document.createElement('option');
      option.value = row.clip_id;
      option.textContent = `${row.published_label} · ${row.probe.duration_seconds.toFixed(2)} s`;
      fragment.append(option);
    }
    ui.clip.replaceChildren(fragment);
    ui.clip.disabled = !matches.length;
    if (matches.some(row => row.clip_id === previous)) ui.clip.value = previous;
    choose();
  }
  async function prepare() {
    if (!selected) return;
    const row = selected;
    clearPrepared();
    const turn = generation;
    const controller = new AbortController();
    request = controller;
    ui.prepare.disabled = true;
    ui.status.classList.remove('error');
    ui.status.textContent = 'Vérification du fichier publié…';
    try {
      const response = await fetch(row.path, {signal: controller.signal});
      if (!response.ok) throw new Error('Fichier indisponible');
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== row.bytes) throw new Error('Taille du fichier incorrecte');
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
      if (hash !== row.sha256) throw new Error('Empreinte du fichier incorrecte');
      if (turn !== generation || controller.signal.aborted) return;
      objectURL = URL.createObjectURL(new Blob([bytes], {type: 'audio/mpeg'}));
      ui.audio.src = objectURL;
      ui.audio.load();
      current = row.clip_id;
      ui.status.textContent = 'Fichier vérifié. Lancez la lecture avec les commandes audio.';
    } catch (error) {
      if (turn !== generation || error.name === 'AbortError') return;
      ui.status.classList.add('error');
      ui.status.textContent = `${error.message}. L’extrait n’a pas été chargé.`;
    } finally {
      if (turn === generation) {
        request = undefined;
        ui.prepare.disabled = !selected;
      }
    }
  }
  ui.prepare.addEventListener('click', prepare);
  ui.audio.addEventListener('error', () => {
    if (current) {
      ui.status.classList.add('error');
      ui.status.textContent = 'Ce navigateur ne peut pas décoder cet extrait. Le fichier source reste disponible.';
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) ui.audio.pause(); });
  window.addEventListener('pagehide', clearPrepared);
  window.RE_AUDIO_R24 = Object.freeze({state: () => ({ready: !!manifest, clips: manifest?.entries.length || 0, selected: selected?.clip_id || null, prepared: current || null, playing: !ui.audio.paused, loading: !!request, objectURLs: objectURL ? 1 : 0})});
  fetch('manifest.json').then(async response => {
    if (!response.ok) throw new Error('Catalogue indisponible');
    const value = await response.json();
    if (value.schema !== 're.bow.audio-documentary-candidates/1' || !Array.isArray(value.entries) || value.entries.some(row => !/^clips\/[a-z0-9_]+\.mp3$/.test(row.path) || !/^[a-f0-9]{64}$/.test(row.sha256) || !Number.isFinite(row.bytes) || row.bytes <= 0 || row.bytes > 32 * 1024 * 1024 || row.identity_id !== null)) throw new Error('Catalogue incompatible');
    manifest = value;
    ui.summary.textContent = `${value.entries.length} extraits publiés disponibles · aucune attribution certifiée par incarnation.`;
    for (const limitation of value.source.limitations) {
      const item = document.createElement('li');
      item.textContent = limitation;
      ui.limitations.append(item);
    }
    publicLink(ui.publication, value.source.page_url);
    filter();
    ui.search.addEventListener('input', filter);
    ui.clip.addEventListener('change', choose);
  }).catch(error => {
    ui.summary.classList.add('error');
    ui.summary.textContent = `${error.message}. Aucune lecture disponible.`;
  });
})();
