/* R30 exact-identity native motion and selection evidence. No image preloading. */
(function (root) {
  'use strict';
  const doc = root.document, source = doc?.currentScript?.src;
  if (!source || root.RE_DOSSIER_ADDITIONS_R30) return;
  const base = new URL('./', source), repository = new URL('../../', source);
  function header() {
    const host = doc.querySelector?.('.global-header'); if (!host) return;
    let link = doc.getElementById('fidelityR23Link');
    if (!link) { link = doc.createElement('a'); link.id = 'fidelityR23Link'; link.className = 'quiet-link'; }
    link.href = new URL('index.html', base).href; link.textContent = 'Sources et chantiers';
    (host.querySelector('.r20-header-nav') || host).append(link);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', header, {once: true}); else header();
  const actions = doc.getElementById('detailActions'), dialog = doc.getElementById('specimenDialog');
  if (!actions || !dialog || typeof actions.after !== 'function' || typeof root.fetch !== 'function'
      || typeof root.AbortController !== 'function' || typeof root.MutationObserver !== 'function') return;
  const known = new Set((root.RE_DATA?.catalog || []).map(item => item.id));
  const host = doc.createElement('section'); host.id = 'detailAdditionsR30'; host.hidden = true;
  host.setAttribute('aria-label', 'Sprites natifs, avatars et mouvements R30 de cette incarnation'); actions.after(host);
  doc.body.classList.add('r30-dossier-proof');
  const style = doc.createElement('style');
  style.textContent = '.r30-dossier-proof .specimen-detail,.r30-dossier-proof .specimen-detail>*{min-width:0}.r30-dossier-proof .specimen-detail dl{grid-template-columns:minmax(0,110px) minmax(0,1fr)}.r30-dossier-proof .specimen-detail dt,.r30-dossier-proof .specimen-detail dd{min-width:0;overflow-wrap:anywhere}#detailAdditionsR30{border-top:1px solid #93a888;margin-top:1rem;padding-top:1rem;overflow-wrap:anywhere}#detailAdditionsR30[hidden]{display:none}#detailAdditionsR30 h3{font-size:1rem;color:#ecdda8}#detailAdditionsR30 p{font-size:.9rem;line-height:1.6;color:#d6e0ce}#detailAdditionsR30 a{display:inline-flex;align-items:center;min-height:44px;color:#daf1d2;text-decoration:underline;overflow-wrap:anywhere}#detailAdditionsR30 a:focus-visible{outline:3px solid #f2d97d;outline-offset:3px}';
  doc.head.append(style);
  let entries = new Map(), controller = null, ticket = 0;
  const state = {loaded: false, failed: false, id: null, nativeFrames: 0, combatStances: 0, verifiedIdleCycles: 0, optionalObservedVariants: 0, optionalPlayableVariants: 0, contextOnly: false, avatar: false};
  const integer = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
  function identity() {
    for (const link of actions.querySelectorAll('a[href]')) {
      const url = new URL(link.href, root.location.href); if (url.origin !== root.location.origin) continue;
      const uid = /\/modules\/versus\.html$/.test(url.pathname) ? url.searchParams.get('uid')
        : /\/(?:catalog|catalog-encounter)\.html$/.test(url.pathname) ? url.searchParams.get('id') : null;
      if (known.has(uid)) return uid;
    }
    return null;
  }
  function paragraph(text) { const item = doc.createElement('p'); item.textContent = text; return item; }
  function link(text, url) { const item = doc.createElement('a'); item.textContent = text; item.href = url.href; return item; }
  function sync() {
    const id = identity();
    Object.assign(state, {id, nativeFrames: 0, combatStances: 0, verifiedIdleCycles: 0, optionalObservedVariants: 0, optionalPlayableVariants: 0, contextOnly: false, avatar: false});
    host.replaceChildren(); host.hidden = true;
    if (!dialog.open || !state.loaded || state.failed || !known.has(id)) return;
    const row = entries.get(id); if (!row || !row.nativeEntries.length && !row.avatarImage) return;
    const heading = doc.createElement('h3'); heading.textContent = 'Sprites natifs et sélection · R30'; host.append(heading);
    if (row.nativeEntries.length) {
      Object.assign(state, {nativeFrames: row.nativeFrames, combatStances: row.combatStances, verifiedIdleCycles: row.verifiedIdleCycles,
        optionalObservedVariants: row.optionalObservedVariants, optionalPlayableVariants: row.optionalPlayableVariants, contextOnly: row.contextOnly});
      const url = new URL('native/index.html', base); url.searchParams.set('id', id);
      host.append(link('Examiner les poses et mouvements natifs de cette incarnation', url));
      host.append(paragraph(row.nativeFrames + ' images dérivées ; ' + row.smoothSequences + ' séquences complètes fluides ; ' + row.combatStances + ' postures combattantes admissibles ; ' + row.verifiedIdleCycles + ' véritables idles natifs qualifiés.'));
      host.append(paragraph('Éditions sources : ' + row.sourceEditions.join(' ; ')));
      if (row.optionalObservedVariants) {
        host.append(paragraph(row.optionalObservedVariants + ' familles de boucles neutres observées dans l’édition source. Le geste original et l’équivalence avec l’édition cible restent non certifiés.'));
        host.append(paragraph(row.optionalPlayableVariants ? row.optionalPlayableVariants + ' variantes sont activables volontairement sur l’acteur existant.'
          : 'Cette rencontre reste contextuelle : aucun acteur de duel ni variante jouable n’est créé par ces références.'));
      }
      host.append(paragraph('Les gestes non attribués et les variantes d’édition restent des références. Une séquence fluide ne devient pas automatiquement une boucle idle de combat.'));
    }
    if (row.avatarImage) {
      state.avatar = true;
      host.append(link('Examiner la référence de l’avatar de sélection', new URL(row.avatarImage, repository)));
      host.append(paragraph('L’avatar sert uniquement à identifier cette incarnation dans la sélection ; il ne qualifie pas son corps entier ou ses mouvements.'));
    }
    host.hidden = false;
  }
  function validate(value) {
    if (value.schema !== 're.bow.dossier-additions-r30/1' || value.canonicalFidelityCertified !== false
        || !Array.isArray(value.identities) || value.identities.length !== 389) throw Error('Invalid R30 dossier index');
    const result = new Map();
    for (const row of value.identities) {
      if (!known.has(row.id) || result.has(row.id) || !Array.isArray(row.nativeEntries) || row.nativeEntries.length > 512
          || row.nativeEntries.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_.-]{1,256}$/.test(id))
          || ![row.nativeFrames, row.combatStances, row.smoothSequences, row.verifiedIdleCycles, row.optionalObservedVariants, row.optionalPlayableVariants].every(integer)
          || typeof row.contextOnly !== 'boolean' || row.optionalPlayableVariants > row.optionalObservedVariants
          || row.contextOnly && row.optionalPlayableVariants > 0
          || !Array.isArray(row.sourceEditions) || row.sourceEditions.length > 64
          || row.sourceEditions.some(edition => typeof edition !== 'string' || edition.length > 10000)
          || typeof row.avatarImage !== 'string' || row.avatarImage && (!/^(?:assets|modules)\/[a-zA-Z0-9_./-]+\.png$/.test(row.avatarImage)
            || row.avatarImage.split('/').some(part => !part || part === '.' || part === '..'))) throw Error('Invalid R30 dossier identity');
      result.set(row.id, row);
    }
    return result;
  }
  async function load() {
    const token = ++ticket; controller?.abort(); controller = new root.AbortController();
    try {
      const response = await root.fetch(new URL('dossier-additions.json', base), {signal: controller.signal, credentials: 'same-origin'});
      const maximum = 512 * 1024;
      if (!response.ok || Number(response.headers.get('content-length')) > maximum || !response.body?.getReader) throw Error('R30 dossier unavailable');
      const reader = response.body.getReader(), chunks = []; let length = 0;
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break;
          length += part.value.byteLength; if (length > maximum) throw Error('R30 dossier too large'); chunks.push(part.value);
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const next = validate(JSON.parse(new TextDecoder().decode(bytes))); if (token !== ticket) return;
      entries = next; state.failed = false;
    } catch (error) {
      if (token !== ticket || error.name === 'AbortError') return;
      entries.clear(); state.failed = true;
    }
    state.loaded = true; sync();
  }
  new root.MutationObserver(sync).observe(actions, {childList: true});
  new root.MutationObserver(sync).observe(dialog, {attributes: true, attributeFilter: ['open']});
  dialog.addEventListener('close', sync);
  root.addEventListener('pagehide', () => { ticket++; controller?.abort(); host.replaceChildren(); host.hidden = true; });
  root.addEventListener('pageshow', event => { if (event.persisted) { if (!state.loaded || state.failed) load(); else sync(); } });
  root.RE_DOSSIER_ADDITIONS_R30 = Object.freeze({state: () => ({...state}), sync}); load();
})(globalThis);
