/* Read-only DEV gallery: one verified PNG at a time; no actor or save writes. */
(function (root) {
  'use strict';
  const doc = root.document, script = doc.currentScript?.src;
  if (!script || !['http:', 'https:'].includes(root.location.protocol) || root.location.origin === 'null') return;
  const params = new URL(root.location.href).searchParams;
  if (params.get('dev') !== '1') return;
  const repository = new URL('../../../', script), $ = id => doc.getElementById(id);
  const maximum = 16 * 1024 * 1024, pageSize = 20;
  let manifest, active = true, generation = 0, controller = null, imageURL = null, lease = null;
  let selected = params.get('uid') || '', kind = params.get('kind') === 'idle' ? 'idle' : 'portrait', page = 0;
  const state = {loaded: false, failed: false, uid: '', kind, displayed: null, status: '', active: true};
  function local(name) {
    if (typeof name !== 'string' || !/^(?:assets|modules)\/[A-Za-z0-9_./-]+\.(?:png|json|webp|jpe?g)$/.test(name)
        || name.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Invalid asset path');
    const url = new URL(name, repository);
    if (url.origin !== repository.origin || !url.pathname.startsWith(repository.pathname)) throw Error('Asset leaves the current checkout');
    return url;
  }
  async function bounded(response, limit, exact, signal) {
    if (!response.ok || response.type === 'opaque' || !response.body?.getReader) throw Error('Source indisponible');
    const length = response.headers.get('content-length');
    if (length !== null && (!Number.isSafeInteger(Number(length)) || Number(length) > limit || exact !== undefined && Number(length) !== exact)) throw Error('Taille source incorrecte');
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try {
      for (;;) {
        if (signal.aborted) throw Error('Chargement annulé');
        const part = await reader.read(); if (part.done) break;
        size += part.value.length; if (size > limit || exact !== undefined && size > exact) throw Error('Source trop grande'); chunks.push(part.value);
      }
    } catch (error) {await reader.cancel().catch(() => {}); throw error;} finally {reader.releaseLock();}
    if (exact !== undefined && size !== exact) throw Error('Source tronquée');
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;} return bytes;
  }
  async function digest(bytes) {return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');}
  function clearImage() {
    controller?.abort(); controller = null;
    const image = $('asset'); image.hidden = true; image.removeAttribute('src'); image.onload = image.onerror = null;
    if (imageURL) root.URL.revokeObjectURL(imageURL); imageURL = null; lease?.release(); lease = null; state.displayed = null;
  }
  function link(name, label) {const a = doc.createElement('a'); a.href = local(name); a.textContent = label; return a;}
  function filtered() {
    const query = $('search').value.trim().toLocaleLowerCase(), lot = $('lot').value, status = $('status').value;
    return manifest.entries.filter(entry => (!lot || entry.lotId === lot) && (!status || entry[kind].status === status)
      && (!query || (entry.id + ' ' + entry.label + ' ' + entry.incarnation).toLocaleLowerCase().includes(query)));
  }
  function render() {
    const rows = filtered(), pages = Math.max(1, Math.ceil(rows.length / pageSize)); page = Math.min(Math.max(page, 0), pages - 1);
    $('choices').replaceChildren(...rows.slice(page * pageSize, (page + 1) * pageSize).map(entry => {
      const button = doc.createElement('button'); button.type = 'button'; button.dataset.uid = entry.id;
      button.setAttribute('aria-pressed', String(entry.id === selected)); button.textContent = entry.label;
      const small = doc.createElement('small'); small.textContent = entry.incarnation + ' · ' + entry[kind].status; button.append(small);
      button.addEventListener('click', () => {selected = entry.id; for (const node of $('choices').querySelectorAll('button[data-uid]')) node.setAttribute('aria-pressed', String(node.dataset.uid === selected)); show();}); return button;
    }));
    $('previous').disabled = page === 0; $('next').disabled = page === pages - 1; $('page').textContent = (page + 1) + ' / ' + pages + ' · ' + rows.length;
  }
  async function show() {
    const token = ++generation; clearImage();
    const entry = manifest?.entries.find(item => item.id === selected); if (!entry) return;
    const item = entry[kind]; state.uid = entry.id; state.kind = kind; state.status = item.status; state.failed = false;
    $('name').textContent = entry.label; $('identity').textContent = entry.incarnation + ' · ' + entry.id;
    $('facts').replaceChildren(); $('notes').replaceChildren(); $('links').replaceChildren();
    const fact = (label, value) => {const dt = doc.createElement('dt'), dd = doc.createElement('dd'); dt.textContent = label; dd.textContent = value; $('facts').append(dt, dd);};
    fact('Sortie', kind === 'portrait' ? 'Portrait de sélection' : 'Corps entier en pose fixe'); fact('État', item.status); fact('Lot', entry.lotId);
    if (item.status !== 'GENERATED') {
      $('message').textContent = item.reason || 'Aucune sortie nouvelle livrée pour ce choix.';
      const fallback = entry.fallbacks[kind]; if (fallback) $('links').append(link(fallback.image, 'Voir la référence réutilisée (pas une génération R34)'));
      updateURL(); return;
    }
    fact('Dimensions source', item.width + ' × ' + item.height); fact('Images', '1 · statique');
    if (kind === 'portrait') fact('Cadre de sélection', [item.crop.x, item.crop.y, item.crop.width, item.crop.height].join(' / ') + ' · pixels source ; PNG brut affiché ci-dessous');
    fact('Édition cible', item.targetEditionMatched ? 'Références admises pour cette incarnation' : 'Équivalence non admise');
    for (const text of [...item.observations, ...item.knownAppearanceGaps]) {const li = doc.createElement('li'); li.textContent = text; $('notes').append(li);}
    $('links').append(link(item.receipt.path, 'Reçu et références'), link(item.image, 'PNG brut'));
    $('message').textContent = 'Vérification du PNG brut…';
    controller = new root.AbortController(); const current = controller;
    try {
      const bytes = await bounded(await root.fetch(local(item.image), {signal: current.signal, credentials: 'same-origin'}), maximum, item.bytes, current.signal);
      if (await digest(bytes) !== item.sha256) throw Error('Empreinte SHA-256 différente');
      if (!active || token !== generation || current.signal.aborted) return;
      lease = root.RE_IMAGE_BUDGET_R31?.reserve('r34-gallery', item.sha256, item.width * item.height, () => clearImage());
      if (root.RE_IMAGE_BUDGET_R31 && !lease) throw Error('Budget d’images occupé ; sélectionner à nouveau après libération');
      imageURL = root.URL.createObjectURL(new root.Blob([bytes], {type: 'image/png'})); const image = $('asset');
      await new Promise((resolve, reject) => {
        const finish = error => {image.onload = image.onerror = null; current.signal.removeEventListener('abort', cancel); if (error) reject(error); else resolve();};
        const cancel = () => finish(Error('Décodage annulé'));
        current.signal.addEventListener('abort', cancel, {once: true});
        if (current.signal.aborted) {cancel(); return;}
        image.onload = () => finish(); image.onerror = () => finish(Error('PNG non décodable')); image.src = imageURL;
      });
      if (!active || token !== generation || current.signal.aborted) return;
      if (image.naturalWidth !== item.width || image.naturalHeight !== item.height) throw Error('Dimensions différentes');
      lease?.ready(); image.dataset.kind = kind; image.alt = entry.label + ' — ' + (kind === 'portrait' ? 'portrait généré' : 'pose entière générée'); image.hidden = false;
      state.displayed = item.sha256; $('message').textContent = 'Nouvelle image générée · une pose fixe, aucun idle original certifié.'; updateURL();
    } catch (error) {
      if (!active || token !== generation) return;
      clearImage(); state.failed = true; $('message').textContent = error.message; updateURL();
    }
  }
  function updateURL() {const url = new URL(root.location.href); url.searchParams.set('uid', selected); url.searchParams.set('kind', kind); root.history.replaceState(null, '', url);}
  $('kind').value = kind;
  for (const name of ['search', 'lot', 'status']) $(name).addEventListener(name === 'search' ? 'input' : 'change', () => {page = 0; render();});
  $('kind').addEventListener('change', () => {kind = $('kind').value; page = 0; render(); show();});
  $('previous').addEventListener('click', () => {page--; render();}); $('next').addEventListener('click', () => {page++; render();});
  $('filters').addEventListener('submit', event => event.preventDefault());
  let initialization = null, initializationGeneration = -1;
  async function initialize() {
    if (initialization && initializationGeneration === generation) return initialization;
    const token = generation, current = new root.AbortController(); controller = current;
    const task = (async () => {
      try {
        const raw = await bounded(await root.fetch(new URL('manifest.json', script), {signal: current.signal}), 8 * 1024 * 1024, undefined, current.signal);
        const value = JSON.parse(new TextDecoder().decode(raw));
        if (value.schema !== 're.bow.fighter-assets-r34/1' || !Array.isArray(value.entries) || value.entries.length !== 346) throw Error('Registre de production incorrect');
        if (!active || token !== generation) return;
        manifest = value; state.loaded = true; state.failed = false; $('devGate').hidden = true; $('workspace').hidden = false;
        $('summary').textContent = '346 combattants · ' + value.counts.newGeneratedPortraits + ' portraits et ' + value.counts.newGeneratedIdlePoses + ' poses R34 réellement générés. Les médias réutilisés restent séparés.';
        if (!manifest.entries.some(item => item.id === selected)) selected = manifest.entries.find(item => item[kind].status === 'GENERATED')?.id || manifest.entries[0].id;
        render(); await show();
      } catch (error) {if (active && token === generation) {state.failed = true; $('devGate').textContent = error.message;}}
    })();
    initialization = task; initializationGeneration = token;
    task.finally(() => {if (initialization === task) initialization = null;});
    return task;
  }
  root.RE_FIGHTER_ASSET_GALLERY_R34 = Object.freeze({state: () => ({...state}), retry: () => manifest ? show() : initialize()});
  root.addEventListener('pagehide', () => {active = false; state.active = false; generation++; clearImage();});
  root.addEventListener('pageshow', () => {if (active) return; active = true; state.active = true; manifest ? show() : initialize();});
  initialize();
})(globalThis);
