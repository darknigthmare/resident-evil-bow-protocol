/* Keep the current workbook and exact-identity sprite review reachable from a Dossier. */
(function (root) {
  'use strict';
  const doc = root.document, script = doc?.currentScript?.src;
  if (!script || root.RE_DOSSIER_SPRITES_R27) return;
  const base = new URL('./', script);
  function header() {
    const host = doc.querySelector('.global-header'); if (!host) return;
    let link = doc.getElementById('fidelityR23Link');
    if (!link) { link = doc.createElement('a'); link.id = 'fidelityR23Link'; link.className = 'quiet-link'; }
    link.href = new URL('index.html', base).href; link.textContent = 'Sources et chantiers';
    (host.querySelector('.r20-header-nav') || host).append(link);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', header, { once: true }); else header();
  const actions = doc.getElementById('detailActions'), dialog = doc.getElementById('specimenDialog');
  if (!actions || !dialog || typeof actions.after !== 'function' || typeof root.fetch !== 'function'
      || typeof root.AbortController !== 'function' || typeof root.MutationObserver !== 'function') return;
  const known = new Set((root.RE_DATA?.catalog || []).map(item => item.id));
  const historical = new Set(['re2r-tyrant', 're2r-licker', 're1r-hunter', 're3r-nemesis']);
  const target = new Set([...known].filter(id => !historical.has(id))), entries = new Map(), additions = new Map();
  const state = { loaded: false, failed: false, id: null, status: 'none', generated: 0, pending: 385,
    sourceIndexLoaded: false, sourceIndexFailed: false, audio: 0, canonical: 0 };
  const host = doc.createElement('section'); host.id = 'detailGeneratedSpriteR27'; host.hidden = true;
  host.setAttribute('aria-label', 'Ajouts de cette incarnation'); actions.after(host);
  const style = doc.createElement('style');
  style.textContent = '#detailGeneratedSpriteR27{margin-top:1rem;padding-top:1rem;border-top:1px solid #58686a}#detailGeneratedSpriteR27[hidden]{display:none}#detailGeneratedSpriteR27 p{font-size:.85rem;line-height:1.5;color:#c2ccc8}#detailGeneratedSpriteR27 a{display:inline-flex;align-items:center;min-height:44px;color:#bde4cc;text-decoration:underline;overflow-wrap:anywhere}#detailGeneratedSpriteR27 a:focus-visible{outline:3px solid #ffd688;outline-offset:3px}';
  doc.head.append(style);
  let controller = null, ticket = 0, sourcesController = null, sourceTicket = 0;
  function identity() {
    for (const node of actions.querySelectorAll('a[href]')) {
      const url = new URL(node.href, root.location.href);
      if (url.origin !== root.location.origin) continue;
      const id = /\/modules\/versus\.html$/.test(url.pathname) ? url.searchParams.get('uid')
        : /\/(?:catalog|catalog-encounter)\.html$/.test(url.pathname) ? url.searchParams.get('id') : null;
      if (known.has(id)) return id;
    }
    return null;
  }
  function sync() {
    const id = identity(); state.id = id; state.status = historical.has(id) ? 'historical' : 'none'; state.audio = 0; state.canonical = 0;
    host.replaceChildren(); host.hidden = true;
    if (!dialog.open || !known.has(id)) return;
    if (state.loaded && !state.failed && target.has(id)) {
      const record = entries.get(id);
      state.status = record ? 'generated' : 'pending';
      const link = doc.createElement('a'), url = new URL('sprites/index.html', base);
      url.searchParams.set('identity', id); link.href = url.href;
      link.textContent = record ? 'Examiner la pose générée de cette incarnation' : 'Suivre la production du sprite de cette incarnation';
      const note = doc.createElement('p');
      note.textContent = record ? (record.fullBodyReviewed
        ? 'Pose générée à partir des références documentées. Les mouvements et la fidélité complète restent à vérifier.'
        : 'Cette illustration conserve les limites de la référence. Le corps entier et les animations de combat ne sont pas déclarés produits.')
        : 'La galerie indique si un fichier a réellement été produit ; une tâche en attente ne remplace pas un sprite.';
      host.append(link, note);
    }
    const source = additions.get(id);
    if (state.sourceIndexLoaded && !state.sourceIndexFailed && source) {
      for (const [key, label, field] of [['audio', 'Écouter les références R27', 'clips'], ['canonical', 'Citations documentaires R27', 'claims']]) {
        if (!source[key]) continue;
        const row = doc.createElement('p'), link = doc.createElement('a');
        link.href = new URL(source[key].href, base).href;
        link.textContent = label + ' (' + source[key][field] + ')';
        row.append(link); host.append(row); state[key] = source[key][field];
      }
      if (state.audio) {
        const note = doc.createElement('p'); note.textContent = 'Groupe sonore publié ; action et écoute indépendante restent à vérifier. Aucune lecture automatique.'; host.append(note);
      }
    }
    host.hidden = host.childNodes.length === 0;
  }
  async function load() {
    const token = ++ticket; controller?.abort(); controller = new root.AbortController();
    try {
      const response = await root.fetch(new URL('sprites/manifest.json', base), { signal: controller.signal, credentials: 'same-origin' });
      if (!response.ok) throw Error('Sprite manifest unavailable');
      const length = Number(response.headers.get('content-length'));
      if (length > 4 * 1024 * 1024 || !response.body?.getReader) throw Error('Sprite manifest exceeds its bound');
      const reader = response.body.getReader(), chunks = []; let count = 0;
      try {
        while (true) {
          const value = await reader.read(); if (value.done) break;
          count += value.value.length; if (count > 4 * 1024 * 1024) throw Error('Sprite manifest exceeds its bound');
          chunks.push(value.value);
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      finally { reader.releaseLock(); }
      const bytes = new Uint8Array(count); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const manifest = JSON.parse(new TextDecoder().decode(bytes));
      if (manifest.schema !== 're.bow.generated-combat-sprites/1' || !Array.isArray(manifest.sprites)
          || !Array.isArray(manifest.pending) || manifest.sprites.length + manifest.pending.length !== 385) throw Error('Incomplete sprite progress');
      const seen = new Set(), next = new Map();
      for (const [kind, values] of [['generated', manifest.sprites], ['pending', manifest.pending]]) for (const item of values) {
        if (!target.has(item.id) || seen.has(item.id)) throw Error('Unknown or repeated sprite identity');
        seen.add(item.id);
        if (kind === 'generated') {
          if (item.canonicalFidelityCertified !== false || !['needs-visual-review', 'visually-reviewed'].includes(item.reviewStatus)
              || typeof item.fullBodyReviewed !== 'boolean') throw Error('Unsupported sprite certification');
          next.set(item.id, { fullBodyReviewed: item.fullBodyReviewed });
        }
      }
      if (token !== ticket) return;
      entries.clear(); for (const [id, item] of next) entries.set(id, item);
      state.generated = manifest.sprites.length; state.pending = manifest.pending.length; state.failed = false;
    } catch (error) {
      if (token !== ticket || error.name === 'AbortError') return;
      state.failed = true; entries.clear();
    }
    state.loaded = true; sync();
  }
  async function loadSources() {
    const token = ++sourceTicket; sourcesController?.abort(); sourcesController = new root.AbortController();
    try {
      const response = await root.fetch(new URL('dossier-additions.json', base), {signal: sourcesController.signal, credentials: 'same-origin'});
      if (!response.ok || Number(response.headers.get('content-length')) > 256 * 1024 || !response.body?.getReader) throw Error('Invalid source additions size');
      const reader = response.body.getReader(), chunks = []; let count = 0;
      try {
        while (true) {
          const value = await reader.read(); if (value.done) break;
          count += value.value.length; if (count > 256 * 1024) throw Error('Source additions exceed their bound');
          chunks.push(value.value);
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      finally { reader.releaseLock(); }
      const bytes = new Uint8Array(count); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const index = JSON.parse(new TextDecoder().decode(bytes)), next = new Map();
      if (index.schema !== 're.bow.dossier-additions-r27/1' || index.canonicalFidelityCertified !== false
          || !Array.isArray(index.identities) || index.identities.length !== 389) throw Error('Invalid source additions schema');
      for (const item of index.identities) {
        if (!known.has(item.id) || next.has(item.id)) throw Error('Unknown source additions identity');
        for (const [key, field, scope, expected] of [
          ['audio', 'clips', 'publisher-subject-group', 'audio/index.html?identity=' + encodeURIComponent(item.id)],
          ['canonical', 'claims', 'quoted-documentary-evidence', 'canonical/index.html#' + encodeURIComponent(item.id)]
        ]) {
          const value = item[key]; if (value === null) continue;
          if (!value || !Number.isSafeInteger(value[field]) || value[field] < 1 || value[field] > 10000
              || value.scope !== scope || value.href !== expected) throw Error('Invalid local source additions link');
          if (key === 'audio' && (value.independentListeningCompleted !== false || value.nativeBankCertified !== false)) throw Error('Unsupported audio certification');
          if (key === 'canonical' && value.directPrimaryCapture !== false) throw Error('Unsupported primary evidence certification');
        }
        next.set(item.id, item);
      }
      if (token !== sourceTicket) return;
      additions.clear(); for (const [id, item] of next) additions.set(id, item);
      state.sourceIndexFailed = false;
    } catch (error) {
      if (token !== sourceTicket || error.name === 'AbortError') return;
      state.sourceIndexFailed = true; additions.clear();
    }
    state.sourceIndexLoaded = true; sync();
  }
  new root.MutationObserver(sync).observe(actions, { childList: true });
  new root.MutationObserver(sync).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  dialog.addEventListener('close', sync);
  root.addEventListener('pagehide', () => { ticket++; sourceTicket++; controller?.abort(); sourcesController?.abort(); host.replaceChildren(); host.hidden = true; });
  root.addEventListener('pageshow', event => { if (event.persisted) { if (!state.loaded) load(); if (!state.sourceIndexLoaded) loadSources(); sync(); } });
  root.RE_DOSSIER_SPRITES_R27 = Object.freeze({ state: () => ({ ...state }), sync });
  load(); loadSources();
})(globalThis);
