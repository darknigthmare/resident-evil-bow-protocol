/* Exact-identity native menu portraits; preserved source pixels, partial views. */
(function (root) {
  'use strict';
  const doc = root.document;
  if (!doc?.currentScript?.src || !root.MutationObserver || root.RE_NATIVE_PORTRAITS_R23) return;
  const actions = doc.getElementById('detailActions'), original = doc.getElementById('detailImage');
  const dialog = doc.getElementById('specimenDialog');
  if (!actions || !original || !dialog) return;
  const base = new URL('./', doc.currentScript.src), host = original.parentElement;
  const expected = new Set(['re3r-zombie-dog', 're3r-ne-alpha-parasite', 're3r-drain-deimos',
    're3r-hunter-beta', 're3r-pale-head', 're3r-stage-2-nemesis', 're3r-stage-3-nemesis']);
  const entries = new Map(), cache = new Map();
  const state = {id: null, displayed: null, status: 'original', token: 0, loaded: false};
  const image = doc.createElement('img'); image.id = 'detailImageR23'; image.hidden = true; image.width = 128; image.height = 128;
  const note = doc.createElement('p'); note.setAttribute('role', 'status'); note.hidden = true; note.className = 'r23-native-note';
  const message = doc.createElement('span');
  const link = doc.createElement('a'); link.textContent = 'Voir l’atlas et ses sources'; link.href = new URL('index.html', base).href;
  const retry = doc.createElement('button'); retry.type = 'button'; retry.textContent = 'Réessayer'; retry.hidden = true;
  note.append(message, doc.createTextNode(' '), link, doc.createTextNode(' '), retry); host.append(image, note);
  const style = doc.createElement('style');
  style.textContent = '.detail-image.r23-native-reference>#detailImage{display:none!important}.detail-image #detailImageR23{width:128px;height:128px;min-width:128px;min-height:128px;object-fit:contain;flex:none;filter:none;transform:none}.detail-image #detailImageR23[hidden]{display:none}.detail-image.r23-native-reference{align-content:center;gap:12px}.r23-native-note{font:12px/1.5 system-ui,sans-serif;text-align:center;color:#d4ddd4;padding:6px 12px;margin:0;overflow-wrap:anywhere}.r23-native-note[hidden]{display:none}.r23-native-note a{color:#c8e9cf}.r23-native-note button{font:inherit;color:#eef5ee;background:#17262a;border:1px solid #80978a;padding:6px 10px}.r23-native-note a:focus-visible,.r23-native-note button:focus-visible{outline:3px solid #e4be7b;outline-offset:3px}';
  doc.head.append(style);
  function uid() {
    for (const anchor of actions.querySelectorAll('a[href]')) {
      try {
        const url = new URL(anchor.href, root.location.href);
        if (url.origin !== root.location.origin) continue;
        if (/\/modules\/versus\.html$/.test(url.pathname)) return url.searchParams.get('uid');
        if (/\/catalog\.html$/.test(url.pathname)) return url.searchParams.get('id');
      } catch {}
    }
    return null;
  }
  function local(path) {
    if (typeof path !== 'string' || !/^portraits\/[a-z0-9-]+\.png$/.test(path)) throw Error('Chemin de portrait refusé.');
    const url = new URL(path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw Error('Chemin de portrait refusé.');
    return url;
  }
  function clear() {
    state.displayed = null; image.hidden = true; image.removeAttribute('src'); image.onload = image.onerror = null;
    host.classList.remove('r23-native-reference'); note.hidden = true; retry.hidden = true; delete image.dataset.nativePortraitR23;
  }
  function show(text, failed = false) {
    message.textContent = text; note.hidden = false; retry.hidden = !failed;
  }
  function dispose(entry) {
    entry.abort.abort();
    if (entry.url) URL.revokeObjectURL(entry.url);
  }
  function load(record) {
    if (cache.has(record.id)) {
      const entry = cache.get(record.id); cache.delete(record.id); cache.set(record.id, entry); return entry.promise;
    }
    while (cache.size >= 2) { const key = cache.keys().next().value; dispose(cache.get(key)); cache.delete(key); }
    const entry = {abort: new AbortController(), url: null, promise: null};
    cache.set(record.id, entry);
    entry.promise = (async () => {
      if (!root.crypto?.subtle) throw Error('Vérification de la source indisponible.');
      const response = await root.fetch(local(record.image), {signal: entry.abort.signal});
      if (!response.ok) throw Error('Portrait natif indisponible.');
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 1024 * 1024) throw Error('Portrait trop volumineux.');
      const hash = [...new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
      if (hash !== record.sha256) throw Error('Portrait différent de sa source.');
      entry.url = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
      const preload = new Image(); preload.src = entry.url; await preload.decode();
      if (preload.naturalWidth !== 128 || preload.naturalHeight !== 128) throw Error('Dimensions natives incorrectes.');
      return entry;
    })();
    entry.promise.catch(() => { if (cache.get(record.id) === entry) { dispose(entry); cache.delete(record.id); } });
    return entry.promise;
  }
  async function sync(force = false) {
    const id = uid();
    if (!force && id === state.id) return;
    state.id = id; state.token++; const token = state.token; clear(); state.status = 'original';
    if (!expected.has(id) || !dialog.open) return;
    host.classList.add('r23-native-reference');
    const record = entries.get(id);
    if (!record) {
      state.status = state.loaded ? 'metadata-error' : 'loading-metadata';
      show(state.loaded ? 'Portrait natif indisponible.' : 'Chargement de la provenance…', state.loaded); return;
    }
    const game = doc.getElementById('detailEpisode')?.textContent.trim();
    if (game !== record.game) { state.status = 'game-mismatch'; show('Vue de cette incarnation à documenter.'); return; }
    state.status = 'loading'; show('Vérification du portrait natif…');
    const current = () => state.token === token && uid() === id && dialog.open;
    try {
      const entry = await load(record);
      if (!current()) return;
      image.alt = record.visual_review;
      image.onload = () => {
        if (!current()) return;
        image.hidden = false; image.dataset.nativePortraitR23 = id; state.displayed = id; state.status = 'ready';
        show('Vignette native, vue partielle de 128 × 128 pixels. Corps complet et mouvements à produire.');
      };
      image.onerror = () => {
        if (!current()) return;
        image.hidden = true; state.displayed = null; state.status = 'error'; show('Portrait natif indisponible.', true);
        if (cache.has(id)) { dispose(cache.get(id)); cache.delete(id); }
      };
      image.src = entry.url;
      if (image.complete && image.naturalWidth === 128) image.onload();
    } catch (error) {
      if (current() && error.name !== 'AbortError') { image.hidden = true; state.status = 'error'; show('Portrait natif indisponible.', true); }
    }
  }
  async function loadPack() {
    state.loaded = false; sync(true);
    try {
      const response = await root.fetch(new URL('manifest.json', base));
      if (!response.ok) throw Error('Provenance unavailable');
      const pack = await response.json();
      if (pack.schema !== 're.bow.visual-source-index/1' || !Array.isArray(pack.entries)) throw Error('Invalid provenance');
      for (const record of pack.entries) {
        if (!expected.has(record.id) || record.reviewed !== true || typeof record.game !== 'string'
          || !record.game.trim() || typeof record.specific_form !== 'string' || !record.specific_form.trim()
          || record.width !== 128 || record.height !== 128 || !/^[a-f0-9]{64}$/.test(record.sha256)
          || record.full_body_sprite !== false || record.rig_complete !== false
          || record.canonical_fidelity_certified !== false || record.source_scope !== 'native-menu-thumbnail') continue;
        local(record.image); entries.set(record.id, record);
      }
    } catch {}
    state.loaded = true; sync(true);
  }
  new root.MutationObserver(() => sync()).observe(actions, {childList: true});
  dialog.addEventListener('close', () => {
    // A native close event may arrive after the next dossier has already opened.
    if (dialog.open) { sync(true); return; }
    state.token++; state.id = null; clear(); state.status = 'original';
  });
  retry.addEventListener('click', () => entries.has(uid()) ? sync(true) : loadPack());
  root.addEventListener('pagehide', () => {
    state.token++; state.id = null; clear(); for (const entry of cache.values()) dispose(entry); cache.clear();
  });
  root.addEventListener('pageshow', event => { if (event.persisted) sync(true); });
  root.RE_NATIVE_PORTRAITS_R23 = Object.freeze({state: () => ({...state, cacheSize: cache.size}), sync: () => sync(true)});
  loadPack();
})(window);
