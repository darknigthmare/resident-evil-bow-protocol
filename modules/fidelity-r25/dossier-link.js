/* Add reviewed source links without changing catalogue images or combat state. */
(function (root) {
  'use strict';
  const doc = root.document, scriptURL = doc?.currentScript?.src;
  if (!scriptURL || root.RE_DOSSIER_SOURCES_R25) return;
  const base = new URL('./', scriptURL), actions = doc.getElementById('detailActions');
  const dialog = doc.getElementById('specimenDialog');
  const entries = new Map(), state = {id: null, loaded: false, failed: false, exact: 0, candidates: 0, audio: 0, canonical: 0};
  let abort = null, host = null;
  function installHeader() {
    const header = doc.querySelector('.global-header'); if (!header) return;
    let link = doc.getElementById('fidelityR23Link');
    if (!link) { link = doc.createElement('a'); link.id = 'fidelityR23Link'; link.className = 'quiet-link'; }
    link.href = new URL('index.html', base).href; link.textContent = 'Sources et chantiers';
    (header.querySelector('.r20-header-nav') || header).append(link);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', installHeader, {once: true}); else installHeader();
  if (!actions || !dialog || typeof root.fetch !== 'function' || typeof root.AbortController !== 'function'
    || typeof root.MutationObserver !== 'function' || typeof actions.after !== 'function') return;
  abort = new root.AbortController();
  host = doc.createElement('section'); host.id = 'detailSourceModelsR25'; host.hidden = true;
  host.setAttribute('aria-label', 'Modèles et mouvements sources'); actions.after(host);
  const style = doc.createElement('style'); style.textContent = '#detailSourceModelsR25{margin-top:1rem;padding-top:1rem;border-top:1px solid #58686a}#detailSourceModelsR25[hidden]{display:none}#detailSourceModelsR25 h3{font-size:1rem;margin:.5rem 0}#detailSourceModelsR25 p{font-size:.85rem;line-height:1.5;color:#c2ccc8}#detailSourceModelsR25 ul{padding-left:1.3rem;margin:.4rem 0}#detailSourceModelsR25 a{display:inline-flex;align-items:center;min-height:44px;color:#bde4cc;text-decoration:underline;overflow-wrap:anywhere}#detailSourceModelsR25 a:focus-visible{outline:3px solid #ffd688;outline-offset:3px}'; doc.head.append(style);
  function uid() {
    for (const anchor of actions.querySelectorAll('a[href]')) {
      const url = new URL(anchor.href, root.location.href);
      if (url.origin !== root.location.origin) continue;
      if (/\/modules\/versus\.html$/.test(url.pathname)) return url.searchParams.get('uid');
      if (/\/catalog\.html$/.test(url.pathname)) return url.searchParams.get('id');
    }
    return null;
  }
  function group(title, values, candidate) {
    const section = doc.createElement('div'), heading = doc.createElement('h3'); heading.textContent = title; section.append(heading);
    if (candidate) { const note = doc.createElement('p'); note.textContent = 'La plateforme ou la forme de ces références reste à confirmer pour cette incarnation. Leur équivalence 1:1 n’est pas certifiée.'; section.append(note); }
    const list = doc.createElement('ul');
    for (const entry of values) {
      const row = doc.createElement('li'), link = doc.createElement('a');
      const url = new URL('models/index.html', base); url.searchParams.set('model', entry.id);
      link.href = url.href; link.textContent = entry.label + (entry.platform ? ' — ' + entry.platform : '');
      link.dataset.r25SourceScope = candidate ? 'candidate' : 'exact'; row.append(link); list.append(row);
    }
    section.append(list); return section;
  }
  function sync() {
    const id = uid(); state.id = id; state.exact = 0; state.candidates = 0; state.audio = 0; state.canonical = 0; host.replaceChildren(); host.hidden = true;
    if (!dialog.open || !id || !state.loaded || state.failed) return;
    const record = entries.get(id); if (!record) return;
    const values = record.models, exact = values.filter(item => item.relation === 'exact'), candidates = values.filter(item => item.relation === 'candidate');
    state.exact = exact.length; state.candidates = candidates.length;
    if (exact.length) host.append(group('Modèles attribués à cette incarnation', exact, false));
    if (candidates.length) host.append(group('Références candidates', candidates, true));
    for (const [name, target, count] of [['Écouter les références', record.audio?.href, record.audio?.clips], ['Sources documentaires', record.canonical?.href, record.canonical?.claims]]) {
      if (!target || !Number.isSafeInteger(count) || count < 1 || count > 10000) continue;
      const link = doc.createElement('a'); link.href = localHref(target); link.textContent = name + ' (' + count + ')';
      const row = doc.createElement('p'); row.append(link); host.append(row);
    }
    state.audio = record.audio?.clips || 0; state.canonical = record.canonical?.claims || 0;
    if (record.audio) { const note = doc.createElement('p'); note.textContent = 'Sons regroupés par sujet par la publication. Attribution précise et écoute indépendante restent à vérifier ; aucune lecture automatique.'; host.append(note); }
    host.hidden = !(exact.length || candidates.length || state.audio || state.canonical);
  }
  function localHref(value) {
    if (typeof value !== 'string' || !value || value.includes('\\') || value.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(value)) throw Error('Source link must remain local');
    const url = new URL(value, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw Error('Source link leaves the release');
    return url.href;
  }
  async function load() {
    state.loaded = false; state.failed = false; entries.clear();
    try {
      const response = await root.fetch(new URL('dossier-index.json', base), {signal: abort.signal});
      if (!response.ok) throw Error('Source index unavailable');
      const text = await response.text(); if (text.length > 2 * 1024 * 1024) throw Error('Source index too large');
      const pack = JSON.parse(text), known = new Set((root.RE_DATA?.catalog || []).map(item => item.id));
      if (pack.schema !== 're.bow.dossier-source-index/1' || !Array.isArray(pack.identities) || pack.identities.length !== known.size
        || new Set(pack.identities.map(item => item.id)).size !== known.size) throw Error('Invalid source index');
      for (const entry of pack.identities) {
        if (!known.has(entry.id) || !Array.isArray(entry.models) || entry.models.length > 100) throw Error('Unknown catalogue identity');
        for (const model of entry.models) {
          if (!/^[a-z0-9-]+$/.test(model.id) || typeof model.label !== 'string' || model.label.length > 1000 || !['exact','candidate'].includes(model.relation)) throw Error('Invalid source identity');
          localHref(model.href);
        }
        if (entry.audio) { localHref(entry.audio.href); if (entry.audio.scope !== 'publisher-subject-group' || entry.audio.independentListeningCompleted !== false) throw Error('Unsupported audio attribution'); }
        if (entry.canonical) localHref(entry.canonical.href);
        entries.set(entry.id, entry);
      }
    } catch (error) {
      entries.clear();
      if (error.name === 'AbortError') { state.loaded = false; sync(); return; }
      state.failed = true;
    }
    state.loaded = true; sync();
  }
  new root.MutationObserver(sync).observe(actions, {childList: true});
  new root.MutationObserver(sync).observe(dialog, {attributes: true, attributeFilter: ['open']});
  dialog.addEventListener('close', sync);
  root.addEventListener('pagehide', () => { abort.abort(); host.replaceChildren(); host.hidden = true; });
  root.addEventListener('pageshow', event => { if (event.persisted) { abort = new root.AbortController(); if (!state.loaded) load(); else sync(); } });
  root.RE_DOSSIER_SOURCES_R25 = Object.freeze({state: () => ({...state}), sync}); load();
})(window);
