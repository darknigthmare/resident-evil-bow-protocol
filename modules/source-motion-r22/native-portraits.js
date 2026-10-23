/* Reviewed source images for exact dossier identities; no combat data is changed. */
(function (root) {
  'use strict';
  const doc = root.document;
  if (!doc || typeof root.MutationObserver !== 'function' || typeof root.fetch !== 'function'
    || !doc.currentScript?.src || root.RE_NATIVE_PORTRAITS_R22) return;
  const base = new URL('./', doc.currentScript.src), actions = doc.getElementById('detailActions');
  const image = doc.getElementById('detailImage'), dialog = doc.getElementById('specimenDialog');
  if (!actions || !image || !dialog) return;
  const host = image.parentElement, entries = new Map(), cache = new Map();
  const expected = new Set(['re7-fumer', 're7-mama-mold', 're7-little-crawler', 're7-mia-winters-infected',
    're7-jack-baker', 're7-jack-baker-mutated', 're7-jack-baker-swamp-man', 're7-marguerite-baker',
    're7-marguerite-baker-mutated', 're7-lucas-baker', 're7-lucas-baker-mutated', 're7-eveline',
    're7-eveline-final', 'revillage-alcina-dimitrescu', 'revillage-donna-angie', 'revillage-salvatore-moreau',
    'revillage-salvatore-moreau-exposed', 'revillage-karl-heisenberg', 'revillage-mother-miranda', 're4-bitores-mendez-mutated']);
  const blocked = new Set(['re7-jack-baker-scissor']);
  const state = {id: null, displayed: null, status: 'original', token: 0, loaded: false};
  const note = doc.createElement('p'); note.className = 'r22-native-note'; note.hidden = true; note.setAttribute('role', 'status');
  const citation = doc.createElement('a'); citation.target = '_blank'; citation.rel = 'noopener noreferrer';
  citation.textContent = 'Source de l’image ↗'; citation.hidden = true;
  const retry = doc.createElement('button'); retry.type = 'button'; retry.textContent = 'Réessayer l’image'; retry.hidden = true;
  note.append(doc.createElement('span'), doc.createTextNode(' '), citation, doc.createTextNode(' '), retry); host.append(note);
  const style = doc.createElement('style');
  style.textContent = '.detail-image.r22-native-reference{align-content:center;gap:10px}.r22-native-note{margin:0;padding:4px 12px;color:#c5cfc5;font:12px/1.5 system-ui,sans-serif;text-align:center;overflow-wrap:anywhere}.r22-native-note a{color:#c8d8cc}.r22-native-note button{padding:5px 8px;margin:5px;background:#17262a;color:#e8ebe1;border:1px solid #7c9189;font:inherit}.r22-native-note a:focus-visible,.r22-native-note button:focus-visible{outline:3px solid #e4be7b;outline-offset:3px}.detail-image.r22-native-reference img{max-height:460px}@media(max-width:760px){.detail-image.r22-native-reference img{max-height:240px}}';
  doc.head.append(style);
  function id() {
    for (const anchor of actions.querySelectorAll('a[href]')) {
      try {
        const url = new URL(anchor.href, root.location.href);
        if (url.origin === root.location.origin && /\/modules\/versus\.html$/.test(url.pathname)) return url.searchParams.get('uid');
      } catch {}
    }
    return null;
  }
  function local(path) {
    if (typeof path !== 'string' || !/^[a-z0-9_./-]+\.png$/i.test(path) || path.split('/').some(p => p === '..' || p === '.')) throw Error('Chemin d’image source invalide.');
    const target = new URL(path, base);
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) throw Error('Chemin d’image source invalide.');
    return target;
  }
  function message(text, canRetry = false) {
    note.firstChild.textContent = text; note.hidden = false; retry.hidden = !canRetry;
  }
  function dispose(entry) {
    entry.abort.abort(); if (entry.url) URL.revokeObjectURL(entry.url); if (entry.preload) entry.preload.src = '';
  }
  async function load(record) {
    if (cache.has(record.id)) {
      const entry = cache.get(record.id); cache.delete(record.id); cache.set(record.id, entry); return entry.promise;
    }
    while (cache.size >= 2) { const key = cache.keys().next().value; dispose(cache.get(key)); cache.delete(key); }
    const entry = {abort: new AbortController(), url: null, preload: null, promise: null};
    cache.set(record.id, entry);
    entry.promise = (async () => {
      if (!root.crypto?.subtle) throw Error('Vérification de l’image indisponible.');
      const response = await fetch(local(record.image), {signal: entry.abort.signal});
      if (!response.ok) throw Error('Image source indisponible.');
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 20 * 1024 * 1024) throw Error('Image source trop volumineuse.');
      const actual = [...new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
      if (actual !== record.sha256) throw Error('L’image reçue ne correspond pas à sa source.');
      const preload = new Image(); entry.preload = preload;
      entry.url = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
      await new Promise((resolve, reject) => {
        preload.onload = resolve; preload.onerror = () => reject(Error('Image source illisible.')); preload.src = entry.url;
      });
      if (preload.naturalWidth !== record.width || preload.naturalHeight !== record.height) throw Error('Dimensions de l’image source inattendues.');
      return entry;
    })();
    entry.promise.catch(() => { if (cache.get(record.id) === entry) { dispose(entry); cache.delete(record.id); } });
    return entry.promise;
  }
  function original() {
    image.onload = null; image.onerror = null;
    state.displayed = null; state.status = 'original'; note.hidden = true; citation.hidden = true; retry.hidden = true;
    host.classList.remove('r22-native-reference'); delete image.dataset.nativePortraitR22; delete image.dataset.nativeSourceScope;
  }
  async function sync(force = false) {
    const uid = id();
    if (!force && uid === state.id) return;
    state.id = uid; state.token++; const token = state.token;
    original();
    if (blocked.has(uid)) {
      image.hidden = true; host.classList.add('r22-native-reference'); state.status = 'view-missing';
      message('Vue d’origine à documenter.'); return;
    }
    const record = entries.get(uid);
    if (!record) {
      if (expected.has(uid)) {
        image.hidden = true; host.classList.add('r22-native-reference');
        state.status = state.loaded ? 'source-missing' : 'loading-metadata';
        message(state.loaded ? 'Image source indisponible.' : 'Chargement de l’image source…', state.loaded);
      } else if (uid) image.hidden = !image.getAttribute('src');
      return;
    }
    image.hidden = true; host.classList.add('r22-native-reference'); state.status = 'loading';
    message('Chargement de l’image source…');
    const currentGame = doc.getElementById('detailEpisode')?.textContent.trim().toLocaleLowerCase();
    if (currentGame !== record.source_game.trim().toLocaleLowerCase()) {
      state.status = 'game-mismatch'; message('Vue de cette incarnation à documenter.'); return;
    }
    const current = () => state.token === token && id() === uid && dialog.open;
    try {
      const entry = await load(record);
      if (!current()) return;
      image.onload = () => {
        if (!current()) return;
        image.hidden = false; state.displayed = uid; state.status = 'ready';
        image.dataset.nativePortraitR22 = uid; image.dataset.nativeSourceScope = record.view_scope;
        message(record.view_scope === 'scene' ? 'Scène du jeu d’origine — incarnation et forme documentées.' : 'Référence de cette incarnation.');
        const source = new URL(record.source_page.url);
        if (source.protocol === 'https:') { citation.href = source.href; citation.hidden = false; }
      };
      image.onerror = () => {
        if (!current()) return;
        image.hidden = true; state.displayed = null; state.status = 'error'; message('Image source indisponible.', true);
        if (cache.has(uid)) { dispose(cache.get(uid)); cache.delete(uid); }
      };
      image.src = entry.url;
      if (image.complete && image.naturalWidth === record.width && image.naturalHeight === record.height) image.onload();
    } catch (error) {
      if (current() && error.name !== 'AbortError') {
        image.hidden = true; state.displayed = null; state.status = 'error'; message('Image source indisponible.', true);
      }
    }
  }
  const observer = new root.MutationObserver(() => sync()); observer.observe(actions, {childList: true});
  retry.addEventListener('click', () => entries.has(id()) ? sync(true) : loadPack());
  dialog.addEventListener('close', () => { state.token++; state.id = null; image.onload = null; image.onerror = null; });
  root.addEventListener('pagehide', () => {
    state.token++; state.id = null; image.onload = null; image.onerror = null;
    for (const entry of cache.values()) dispose(entry); cache.clear();
  });
  root.addEventListener('pageshow', event => { if (event.persisted) sync(true); });
  root.RE_NATIVE_PORTRAITS_R22 = Object.freeze({
    state: () => ({...state, cacheSize: cache.size}), sync: () => sync(true)
  });
  function loadPack() {
    state.loaded = false; sync(true);
    return fetch(new URL('native-portraits.json', base)).then(response => {
    if (!response.ok) throw Error('Source references unavailable'); return response.json();
  }).then(pack => {
    if (pack.schema !== 're.bow.native-portrait-presentation/1' || !Array.isArray(pack.entries)) throw Error('Invalid portrait pack');
    for (const record of pack.entries) {
      if (!/^[a-z0-9-]+$/.test(record.id) || !expected.has(record.id) || typeof record.source_game !== 'string' || !record.source_game.trim()
        || !['portrait', 'body', 'scene'].includes(record.view_scope)
        || !Number.isInteger(record.width) || !Number.isInteger(record.height)
        || record.width < 1 || record.height < 1 || record.width * record.height > 8 * 1024 * 1024
        || !/^[a-f0-9]{64}$/.test(record.sha256) || record.visible_review?.identity_and_form_reviewed !== true
        || record.visible_review?.phase_ambiguity !== false || record.final_art !== false || record.canonical_fidelity_certified !== false) continue;
      local(record.image); entries.set(record.id, record);
    }
      state.loaded = true; sync(true);
    }).catch(() => { state.loaded = true; sync(true); });
  }
  loadPack();
  sync();
})(window);
