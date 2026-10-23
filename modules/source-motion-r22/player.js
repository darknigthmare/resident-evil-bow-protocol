/* Original source frames only: native timing, verified atlases, bounded cache. */
(function (root) {
  'use strict';
  const doc = root.document, base = new URL('./', doc.currentScript.src);
  const $ = id => doc.getElementById(id);
  const canvas = $('motionCanvas'), context = canvas.getContext('2d');
  const controls = ['previousFrame', 'playToggle', 'nextFrame', 'restart', 'framePosition'];
  const state = {catalog: [], selected: null, clip: null, frame: 0, position: 0, playing: false,
    buffering: false, started: 0, origin: 0, raf: 0, generation: 0, seek: 0, intent: 0, cache: new Map()};
  let manifestRequest = null;
  function local(value, relative = base) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_./-]+$/.test(value)
      || value.split('/').some(part => part === '..' || part === '.')) throw Error('Chemin de séquence invalide.');
    const url = new URL(value, relative);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw Error('Chemin de séquence invalide.');
    return url;
  }
  function status(text) { $('motionStatus').textContent = text; }
  function pending(message) {
    canvas.hidden = true; $('screenMessage').hidden = false; $('screenMessage').textContent = message;
  }
  function updateControls() {
    const ready = !!state.clip && !state.buffering;
    for (const id of controls) $(id).disabled = !ready;
    $('previousFrame').disabled = !ready || state.frame === 0;
    $('nextFrame').disabled = !ready || state.frame === (state.clip?.frames.length || 0) - 1;
    $('playToggle').textContent = state.playing ? 'Pause' : state.position >= (state.clip?.totalDurationMs || Infinity) ? 'Relire' : 'Lire';
  }
  function pause(announce = true) {
    state.intent++;
    if (state.playing && state.clip) {
      state.position = Math.min(state.clip.totalDurationMs, state.origin + performance.now() - state.started);
      const index = frameAt(state.position), entry = state.cache.get(state.clip.frames[index].atlas);
      if (entry?.ready) display(index, entry.image);
      else state.position = state.clip.starts[state.frame];
    }
    state.playing = false; root.cancelAnimationFrame(state.raf); state.raf = 0;
    updateControls(); if (announce && state.clip) status('Lecture en pause.');
  }
  function disposeEntry(entry) {
    entry.abort.abort();
    if (entry.image) entry.image.src = '';
    if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl);
  }
  function clearCache() { for (const entry of state.cache.values()) disposeEntry(entry); state.cache.clear(); }
  function failed(error) {
    pause(false); state.buffering = false;
    pending('La séquence est indisponible.');
    status(error?.message || 'La séquence ne peut pas être chargée.'); $('retry').hidden = false;
    for (const id of controls) $(id).disabled = true;
  }
  async function verifiedBytes(url, expected, signal) {
    if (!root.crypto?.subtle) throw Error('La vérification des images nécessite une connexion sécurisée.');
    const response = await fetch(url, {signal});
    if (!response.ok) throw Error('Une image de la séquence ne peut pas être chargée.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 24 * 1024 * 1024) throw Error('Le fichier de séquence dépasse la taille attendue.');
    const hash = [...new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
    if (hash !== expected) throw Error('L’image reçue ne correspond pas à la source vérifiée.');
    return bytes;
  }
  async function atlas(index) {
    if (state.cache.has(index)) {
      const entry = state.cache.get(index); state.cache.delete(index); state.cache.set(index, entry);
      return entry.promise;
    }
    const clip = state.clip, generation = state.generation, record = clip.atlases[index];
    const current = clip.frames[state.frame]?.atlas;
    while (state.cache.size >= 2) {
      const key = [...state.cache.keys()].find(key => key !== current) ?? state.cache.keys().next().value;
      disposeEntry(state.cache.get(key)); state.cache.delete(key);
    }
    const entry = {abort: new AbortController(), image: null, blobUrl: null, ready: false, promise: null};
    state.cache.set(index, entry);
    entry.promise = (async () => {
      const bytes = await verifiedBytes(local(record.path, clip.mediaBase), record.sha256, entry.abort.signal);
      if (generation !== state.generation || !state.cache.has(index)) throw new DOMException('Chargement interrompu.', 'AbortError');
      const image = new Image(); entry.image = image;
      entry.blobUrl = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(Error('Une image de la séquence est illisible.'));
        image.src = entry.blobUrl;
      });
      URL.revokeObjectURL(entry.blobUrl); entry.blobUrl = null;
      if (image.naturalWidth !== record.width || image.naturalHeight !== record.height) throw Error('Les dimensions de la séquence ne correspondent pas à la source.');
      entry.ready = true;
      return image;
    })();
    return entry.promise;
  }
  function frameAt(position) {
    const starts = state.clip.starts; let low = 0, high = starts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (starts[mid] <= position) low = mid; else high = mid - 1;
    }
    return low;
  }
  function display(index, image) {
    const clip = state.clip, frame = clip.frames[index], [x, y, width, height] = frame.crop;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, x, y, width, height, 0, 0, clip.width, clip.height);
    canvas.hidden = false; $('screenMessage').hidden = true; state.frame = index;
    canvas.setAttribute('aria-label', state.selected.label + ', image ' + (index + 1) + ' sur ' + clip.frames.length);
    $('framePosition').value = String(index);
    $('framePosition').setAttribute('aria-valuetext', 'Image ' + (index + 1) + ' sur ' + clip.frames.length);
    $('frameCounter').textContent = 'Image ' + (index + 1) + ' / ' + clip.frames.length;
    const time = value => (value / 1000).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    $('timeCounter').textContent = time(Math.min(state.position, clip.totalDurationMs)) + ' s / ' + time(clip.totalDurationMs) + ' s';
    updateControls();
    // Only the current atlas and one upcoming atlas are retained.
    const upcoming = clip.frames[Math.min(index + 8, clip.frames.length - 1)].atlas;
    if (upcoming !== frame.atlas && !state.cache.has(upcoming)) atlas(upcoming).catch(() => {});
  }
  async function seek(index, announce = true) {
    if (!state.clip) return false;
    pause(false); const generation = state.generation, token = ++state.seek;
    index = Math.max(0, Math.min(state.clip.frames.length - 1, Math.round(Number(index) || 0)));
    state.position = state.clip.starts[index]; state.buffering = true; updateControls();
    try {
      const image = await atlas(state.clip.frames[index].atlas);
      if (generation !== state.generation || token !== state.seek) return false;
      state.buffering = false; display(index, image);
      if (announce) status('Image ' + (index + 1) + ' de la séquence.');
      return true;
    } catch (error) {
      if (generation === state.generation && token === state.seek && error.name !== 'AbortError') failed(error);
      return false;
    }
  }
  async function tick(now) {
    if (!state.playing || !state.clip) return;
    const generation = state.generation, position = Math.min(state.clip.totalDurationMs, state.origin + now - state.started);
    state.position = position;
    const index = frameAt(position), target = state.clip.frames[index].atlas;
    const entry = state.cache.get(target);
    if (!entry?.ready) {
      // Buffering pauses the source clock; missing frames are never synthesized.
      state.playing = false; state.buffering = true; const intent = state.intent, request = ++state.seek;
      updateControls(); status('Chargement des images suivantes…');
      try {
        const image = await atlas(target);
        if (generation !== state.generation || request !== state.seek) return;
        state.buffering = false; display(index, image);
        if (intent === state.intent && !doc.hidden) start(false);
        else status('Lecture en pause.');
      } catch (error) { if (generation === state.generation && error.name !== 'AbortError') failed(error); }
      return;
    }
    display(index, entry.image);
    if (position >= state.clip.totalDurationMs) {
      state.playing = false; state.raf = 0; updateControls(); status('Séquence terminée.'); return;
    }
    state.raf = root.requestAnimationFrame(tick);
  }
  function start(announce = true) {
    if (!state.clip || state.buffering || doc.hidden) return;
    state.intent++;
    if (state.position >= state.clip.totalDurationMs) {
      const generation = state.generation, request = seek(0, false), intent = state.intent;
      request.then(ready => { if (ready && generation === state.generation && intent === state.intent && !state.buffering && !doc.hidden) start(announce); }); return;
    }
    state.playing = true; state.origin = state.position; state.started = performance.now(); updateControls();
    if (announce) status('Lecture de la séquence d’origine. Séquence muette.');
    state.raf = root.requestAnimationFrame(tick);
  }
  function validateClip(clip, manifestUrl) {
    if (clip.schema !== 're.bow.source-motion/1' || clip.combatIntegrated !== false || clip.canonicalFidelityCertified !== false
      || !Array.isArray(clip.frames) || !clip.frames.length || clip.frames.length > 2400
      || !Array.isArray(clip.atlases) || !clip.atlases.length || clip.atlases.length > 100
      || !Number.isInteger(clip.width) || !Number.isInteger(clip.height) || clip.width < 1 || clip.height < 1
      || clip.width * clip.height > 8 * 1024 * 1024) throw Error('La description de la séquence est invalide.');
    clip.mediaBase = new URL('./', manifestUrl);
    for (const image of clip.atlases) {
      local(image.path, clip.mediaBase);
      if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1
        || image.width > 4096 || image.height > 4096 || image.width * image.height > 8 * 1024 * 1024
        || !/^[a-f0-9]{64}$/.test(image.sha256)) throw Error('Une image de la séquence est invalide.');
    }
    let elapsed = 0; clip.starts = [];
    for (const frame of clip.frames) {
      const image = clip.atlases[frame.atlas], c = frame.crop;
      if (!Number.isInteger(frame.atlas) || !image || !Array.isArray(c) || c.length !== 4 || !c.every(Number.isInteger)
        || c[0] < 0 || c[1] < 0 || c[2] !== clip.width || c[3] !== clip.height
        || c[0] + c[2] > image.width || c[1] + c[3] > image.height
        || !Number.isInteger(frame.durationMs) || frame.durationMs < 1 || frame.durationMs > 60000) throw Error('Une image ou sa durée est invalide.');
      clip.starts.push(elapsed); elapsed += frame.durationMs;
    }
    if (elapsed !== clip.totalDurationMs) throw Error('La durée de la séquence ne correspond pas à ses images.');
    return clip;
  }
  async function select(id) {
    const selected = state.catalog.find(item => item.id === id);
    if (!selected) return;
    pause(false); state.generation++; state.seek++; state.clip = null; state.selected = selected;
    state.frame = 0; state.position = 0; state.buffering = true; clearCache(); updateControls();
    manifestRequest?.abort(); manifestRequest = new AbortController();
    const generation = state.generation;
    $('retry').hidden = true; pending('Chargement de la séquence…'); status('Vérification des images d’origine…');
    $('sequenceTitle').textContent = selected.label; $('sequenceGame').textContent = selected.game;
    $('sequenceDescription').textContent = selected.description || 'Scène du jeu d’origine, avec décor et caméra. Séquence muette.';
    $('returnLink').href = '../../codex.html?id=' + encodeURIComponent(selected.subjectId);
    try {
      const manifestUrl = local(selected.manifest);
      const response = await fetch(manifestUrl, {signal: manifestRequest.signal});
      if (!response.ok) throw Error('La description de la séquence est indisponible.');
      const clip = validateClip(await response.json(), manifestUrl);
      if (generation !== state.generation) return;
      state.clip = clip; canvas.width = clip.width; canvas.height = clip.height;
      canvas.style.aspectRatio = clip.width + ' / ' + clip.height;
      $('framePosition').max = String(clip.frames.length - 1);
      $('sourceDescription').textContent = selected.game + ' — ' + selected.label + '. Images conservées dans leur ordre et avec les durées de la source. Séquence muette.';
      const source = clip.source?.sourcePageUrl || clip.source?.pageUrl || clip.source?.url;
      let sourceUrl;
      try { sourceUrl = new URL(source); } catch {}
      $('sourceLink').hidden = sourceUrl?.protocol !== 'https:';
      if (sourceUrl?.protocol === 'https:') $('sourceLink').href = sourceUrl.href;
      const original = clip.source?.path || clip.originalPath || 'original.gif';
      $('sourceDownload').href = local(original, clip.mediaBase).href; $('sourceDownload').hidden = false;
      const ready = await seek(0, false);
      if (ready && generation === state.generation) status('Séquence prête. Lancez la lecture ou examinez les images.');
    } catch (error) { if (generation === state.generation && error.name !== 'AbortError') failed(error); }
  }
  $('playToggle').addEventListener('click', () => state.playing ? pause() : start());
  $('previousFrame').addEventListener('click', () => seek(state.frame - 1));
  $('nextFrame').addEventListener('click', () => seek(state.frame + 1));
  $('restart').addEventListener('click', () => seek(0));
  $('framePosition').addEventListener('input', event => seek(event.target.value));
  $('sequenceSelect').addEventListener('change', event => select(event.target.value));
  $('retry').addEventListener('click', () => select(state.selected?.id));
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) pause(false); });
  root.addEventListener('pagehide', () => { pause(false); state.generation++; manifestRequest?.abort(); clearCache(); });
  root.addEventListener('pageshow', event => { if (event.persisted) select(state.selected?.id); });
  root.RE_SOURCE_MOTION_R22 = Object.freeze({
    state: () => ({id: state.selected?.id || null, frame: state.frame, positionMs: state.position,
      playing: state.playing, buffering: state.buffering, cacheSize: state.cache.size,
      frameCount: state.clip?.frames.length || 0, durationMs: state.clip?.totalDurationMs || 0}),
    seekFrame: index => seek(index), pause: () => pause(), play: () => start()
  });
  (async () => {
    try {
      const response = await fetch(local('manifest.json'));
      if (!response.ok) throw Error('Les séquences sont indisponibles.');
      const catalog = await response.json();
      if (catalog.schema !== 're.bow.source-motion-catalog/1' || !Array.isArray(catalog.clips) || !catalog.clips.length) throw Error('Aucune séquence disponible.');
      state.catalog = catalog.clips.filter(item => /^[a-z0-9-]+$/.test(item.id) && /^[a-z0-9-]+$/.test(item.subjectId)
        && typeof item.label === 'string' && typeof item.game === 'string');
      if (!state.catalog.length) throw Error('Aucune séquence disponible.');
      $('sequenceSelect').replaceChildren();
      for (const item of state.catalog) {
        local(item.manifest); const option = doc.createElement('option'); option.value = item.id; option.textContent = item.game + ' — ' + item.label; $('sequenceSelect').append(option);
      }
      const requested = new URLSearchParams(root.location.search).get('clip');
      const id = state.catalog.some(item => item.id === requested) ? requested : state.catalog[0].id;
      $('sequenceSelect').value = id; $('sequenceSelect').disabled = false; await select(id);
    } catch (error) { failed(error); }
  })();
})(window);
