/* R31: separately owned, exact-UID additions; evidence links do not preload assets. */
(function (root) {
  'use strict';
  const doc = root.document, source = doc?.currentScript?.src;
  if (!source || root.RE_DOSSIER_ADDITIONS_R31) return;
  const base = new URL('./', source), repository = new URL('../../', source);
  function header() {
    const host = doc.querySelector?.('.global-header'); if (!host) return;
    let link = doc.getElementById('fidelityR23Link');
    if (!link) {link = doc.createElement('a'); link.id = 'fidelityR23Link'; link.className = 'quiet-link';}
    link.href = new URL('index.html', base).href; link.textContent = 'Sources et chantiers'; (host.querySelector('.r20-header-nav') || host).append(link);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', header, {once: true}); else header();
  const actions = doc.getElementById('detailActions'), dialog = doc.getElementById('specimenDialog');
  if (!actions || !dialog || typeof actions.after !== 'function' || typeof root.fetch !== 'function'
      || typeof root.AbortController !== 'function' || typeof root.MutationObserver !== 'function') return;
  const known = new Set((root.RE_DATA?.catalog || []).map(item => item.id));
  const host = doc.createElement('section'); host.id = 'detailAdditionsR31'; host.hidden = true;
  host.setAttribute('aria-label', 'Ajouts R31 par lot pour cette incarnation'); actions.after(host);
  const style = doc.createElement('style');
  style.textContent = '#detailAdditionsR31{border-top:1px solid #93a888;margin-top:1rem;padding-top:1rem;overflow-wrap:anywhere;min-width:0}#detailAdditionsR31[hidden]{display:none}#detailAdditionsR31 h3{font-size:1rem;color:#ecdda8}#detailAdditionsR31 h4{font-size:.95rem;color:#d5e6c3}#detailAdditionsR31 p,#detailAdditionsR31 li{font-size:.9rem;line-height:1.6;color:#d6e0ce}#detailAdditionsR31 a{display:inline-flex;align-items:center;min-height:44px;color:#daf1d2;text-decoration:underline;overflow-wrap:anywhere}#detailAdditionsR31 a:focus-visible{outline:3px solid #f2d97d;outline-offset:3px}';
  doc.head.append(style);
  let entries = new Map(), controller, ticket = 0;
  const state = {loaded: false, failed: false, id: null, lots: 0, artifacts: 0, sourceEditions: 0};
  function identity() {
    for (const link of actions.querySelectorAll('a[href]')) {
      const url = new URL(link.href, root.location.href); if (url.origin !== root.location.origin) continue;
      const uid = /\/modules\/versus\.html$/.test(url.pathname) ? url.searchParams.get('uid')
        : /\/(?:catalog|catalog-encounter)\.html$/.test(url.pathname) ? url.searchParams.get('id') : null;
      if (known.has(uid)) return uid;
    }
    return null;
  }
  function node(tag, text) {const value = doc.createElement(tag); value.textContent = text; return value;}
  function sync() {
    const id = identity(); Object.assign(state, {id, lots: 0, artifacts: 0, sourceEditions: 0}); host.replaceChildren(); host.hidden = true;
    const row = entries.get(id); if (!dialog.open || !state.loaded || state.failed || !row?.hasAdditions) return;
    Object.assign(state, {lots: row.lots.length, artifacts: row.artifacts.length, sourceEditions: row.sourceEditions.length});
    host.append(node('h3', 'Ajouts et preuves par lot · R31'));
    row.summaries.forEach(text => host.append(node('p', text)));
    if (row.sourceEditions.length) host.append(node('p', 'Éditions sources : ' + row.sourceEditions.join(' ; ')));
    const list = doc.createElement('ul');
    for (const proof of row.artifacts.slice(0, 24)) {
      const item = doc.createElement('li'), link = node('a', proof.label + ' · ' + proof.kind);
      link.href = new URL(proof.href || proof.path, repository).href; item.append(link); list.append(item);
    }
    host.append(list, node('p', 'Les preuves gardent leur édition et leur portée. Un rendu généré, une source native, un geste observé et un idle qualifié restent des critères distincts ; aucun lot ne certifie la fidélité globale 1:1.'));
    const link = node('a', 'Consulter les responsables et les critères encore ouverts'); link.href = new URL('index.html', base).href; host.append(link); host.hidden = false;
  }
  function validPath(value) {
    return typeof value === 'string' && value.length <= 2048 && /^(?:assets|modules|docs)\//.test(value)
      && !/[%\\?#:\u0000-\u001f\u007f]/.test(value)
      && value.split('/').every(part => part && part !== '.' && part !== '..');
  }
  function stringList(value, maximum) {return Array.isArray(value) && value.length <= maximum && value.every(text => typeof text === 'string' && text.length <= 10000);}
  function validate(value) {
    if (value.schema !== 're.bow.dossier-additions-r31/1' || value.canonicalFidelityCertified !== false
        || !Array.isArray(value.identities) || value.identities.length !== 389) throw Error('Invalid R31 dossier index');
    const next = new Map();
    for (const row of value.identities) {
      if (!known.has(row.id) || next.has(row.id) || !stringList(row.lots, 7) || !stringList(row.workstreams, 17)
          || !stringList(row.summaries, 7) || !stringList(row.sourceEditions, 64) || typeof row.hasAdditions !== 'boolean'
          || row.hasAdditions !== !!row.lots.length || !Array.isArray(row.artifacts) || row.artifacts.length > 256) throw Error('Invalid R31 dossier identity');
      for (const proof of row.artifacts) {
        if (!validPath(proof.path) || typeof proof.label !== 'string' || proof.label.length > 2000 || typeof proof.kind !== 'string'
            || typeof proof.sourceEdition !== 'string' || !/^[a-f0-9]{64}$/.test(proof.sha256 || '')
            || !Number.isSafeInteger(proof.bytes) || proof.bytes < 0 || proof.bytes > 1024 * 1024 * 1024) throw Error('Invalid R31 dossier proof');
        const route = new URL(proof.href || proof.path, repository), file = new URL(proof.path, repository);
        if (route.origin !== repository.origin || route.pathname !== file.pathname
            || ['id', 'uid', 'subjectId', 'identity'].some(key => route.searchParams.getAll(key).some(id => id !== row.id))) throw Error('Invalid R31 exact-identity route');
      }
      next.set(row.id, row);
    }
    return next;
  }
  async function load() {
    const token = ++ticket; controller?.abort(); controller = new root.AbortController();
    try {
      const response = await root.fetch(new URL('dossier-additions.json', base), {signal: controller.signal, credentials: 'same-origin'}), maximum = 768 * 1024;
      if (!response.ok || Number(response.headers.get('content-length')) > maximum || !response.body?.getReader) throw Error('R31 dossier unavailable');
      const reader = response.body.getReader(), chunks = []; let length = 0;
      try {for (;;) {const part = await reader.read(); if (part.done) break; length += part.value.byteLength;
        if (length > maximum) throw Error('R31 dossier too large'); chunks.push(part.value);}}
      catch (error) {await reader.cancel().catch(() => {}); throw error;} finally {reader.releaseLock();}
      const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength;}
      const next = validate(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes))); if (token !== ticket) return;
      entries = next; state.failed = false;
    } catch (error) {if (token !== ticket || error.name === 'AbortError') return; entries.clear(); state.failed = true;}
    state.loaded = true; sync();
  }
  new root.MutationObserver(sync).observe(actions, {childList: true});
  new root.MutationObserver(sync).observe(dialog, {attributes: true, attributeFilter: ['open']}); dialog.addEventListener('close', sync);
  root.addEventListener('pagehide', () => {ticket++; controller?.abort(); host.replaceChildren(); host.hidden = true;});
  root.addEventListener('pageshow', event => {if (event.persisted) {if (!state.loaded || state.failed) load(); else sync();}});
  root.RE_DOSSIER_ADDITIONS_R31 = Object.freeze({state: () => ({...state}), sync}); load();
})(globalThis);
