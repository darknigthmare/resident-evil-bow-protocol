/* Exact-identity source portraits in the existing selectors; no combat/save writes. */
(function (root) {
  'use strict';
  const doc = root.document, script = doc?.currentScript?.src;
  if (!doc || !script || root.RE_SELECTION_AVATARS_R30 || typeof root.fetch !== 'function'
      || !['http:', 'https:'].includes(root.location?.protocol) || root.location.origin === 'null') return;
  const repository = new URL('../../../', script), manifestURL = new URL('../../fidelity-r30/selection/manifest.json', script);
  const limits = Object.freeze({manifestBytes: 2 * 1024 * 1024, imageBytes: 20 * 1024 * 1024,
    imagePixels: 16 * 1024 * 1024, decodedImages: 32, concurrentImages: 3, rememberedErrors: 32, pageSize: 24});
  const entries = new Map(), missing = new Map(), cache = new Map(), errors = new Map(), bindings = new Map();
  const controllers = new Set(), queue = [];
  const waitingBudget = new Set();
  let active = true, loaded = false, failed = false, pending = 0, epoch = 0, scanning = false;
  let grid = null, observer = null, intersection = null, resize = null;
  const counts = {avatars: 0, nativeMenuThumbnails: 0, nativeModelRenders: 0, missing: 0, loadedImages: 0};
  function local(path) {
    if (typeof path !== 'string' || !/^(?:assets|modules)\/[A-Za-z0-9_./-]+\.(?:png|webp|jpe?g)$/.test(path)
        || path.split('/').some(part => !part || part === '.' || part === '..')
        || /\/(?:generated|documentary-variants)\//.test(path)) throw Error('Invalid portrait path');
    const value = new URL(path, repository);
    if (value.origin !== repository.origin || !value.pathname.startsWith(repository.pathname)) throw Error('Portrait leaves this checkout');
    return value.href;
  }
  function validId(value) {return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);}
  function freeze(value) {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;}
  function integer(value, low, high) {return Number.isInteger(value) && value >= low && value <= high;}
  async function bounded(response, maximum, exact, signal) {
    if (!response.ok) throw Error('Portrait request failed');
    const header = response.headers.get('content-length'), length = header === null ? null : Number(header);
    if (length !== null && (!integer(length, 0, maximum) || exact !== undefined && length !== exact)) throw Error('Unexpected portrait byte count');
    if (!response.body?.getReader) {
      if (length === null) throw Error('Bounded portrait stream required');
      const data = new Uint8Array(await response.arrayBuffer());
      if (signal.aborted || data.length > maximum || exact !== undefined && data.length !== exact) throw Error('Unexpected portrait size');
      return data;
    }
    const reader = response.body.getReader(), chunks = []; let total = 0;
    try {
      while (true) {
        if (signal.aborted) throw Error('Portrait cancelled');
        const {done, value} = await reader.read(); if (done) break;
        total += value.length;
        if (total > maximum || exact !== undefined && total > exact) throw Error('Portrait exceeds declared size');
        chunks.push(value);
      }
    } catch (error) {await reader.cancel().catch(() => {}); throw error;}
    finally {reader.releaseLock();}
    if (exact !== undefined && total !== exact) throw Error('Truncated portrait');
    const data = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) {data.set(chunk, offset); offset += chunk.length;}
    return data;
  }
  function sourceLabel(record) {return record?.sourceKind === 'native-menu-thumbnail' ? 'Vignette du menu d’origine'
    : record?.sourceKind === 'native-model-render' ? 'Rendu du modèle natif' : 'Référence de cette incarnation';}
  function position(binding, record) {
    const bounds = record?.crop;
    if (!bounds) {binding.image.style.transform = ''; return;}
    const box = binding.host.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const base = Math.min(box.width / record.width, box.height / record.height);
    const desired = .92 * Math.min(box.width / bounds.width, box.height / bounds.height);
    const factor = desired / base;
    const dx = -(bounds.x + bounds.width / 2 - record.width / 2) * desired;
    const dy = -(bounds.y + bounds.height / 2 - record.height / 2) * desired;
    binding.image.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + factor + ')';
  }
  function discard(item) {
    item.lease?.release(); item.lease = null;
    for (const binding of bindings.values()) if (binding.uid === item.uid) {
      binding.image.hidden = true; binding.image.removeAttribute('src');
      binding.host.dataset.avatarStateR30 = entries.has(binding.uid) ? 'waiting' : 'missing';
      if (binding.canvas) binding.canvas.style.visibility = '';
    }
    item.controller.abort();
    if (item.url) root.URL.revokeObjectURL(item.url);
    if (item.image) {item.image.onload = null; item.image.onerror = null; item.image.src = '';}
  }
  function cleanCache() {
    const wanted = new Set([...bindings.values()].filter(item => item.visible && item.host.isConnected).map(item => item.uid));
    for (const [uid, item] of cache) {
      if (!wanted.has(uid) && (cache.size >= limits.decodedImages || item.state === 'loading')) {discard(item); cache.delete(uid);}
    }
  }
  function remember(uid) {
    errors.delete(uid); errors.set(uid, true);
    while (errors.size > limits.rememberedErrors) errors.delete(errors.keys().next().value);
  }
  function enqueue(binding) {
    if (!active || !loaded || !binding.visible || !binding.host.isConnected || !entries.has(binding.uid)) return;
    for (let index = queue.length - 1; index >= 0; index--) if (!queue[index].host.isConnected || !queue[index].visible) queue.splice(index, 1);
    if (!queue.includes(binding)) queue.push(binding);
    drain();
  }
  function drain() {
    if (!active) return;
    while (pending < limits.concurrentImages && queue.length) {
      const binding = queue.shift();
      if (!binding.host.isConnected || !binding.visible || bindings.get(binding.host) !== binding) continue;
      const record = entries.get(binding.uid);
      if (!record || errors.has(record.id)) continue;
      const previous = cache.get(record.id);
      if (previous) {present(binding, record, previous); continue;}
      cleanCache();
      if (cache.size >= limits.decodedImages) continue;
      const controller = new root.AbortController(), token = epoch;
      const item = {uid: record.id, controller, image: null, url: null, state: 'loading', promise: null};
      cache.set(record.id, item); controllers.add(controller); pending++;
      item.promise = (async () => {
        const response = await root.fetch(local(record.image), {signal: controller.signal, credentials: 'same-origin'});
        const raw = await bounded(response, limits.imageBytes, record.bytes, controller.signal);
        if (!root.crypto?.subtle) throw Error('Portrait verification unavailable');
        const digest = [...new Uint8Array(await root.crypto.subtle.digest('SHA-256', raw))].map(value => value.toString(16).padStart(2, '0')).join('');
        if (digest !== record.sha256 || controller.signal.aborted || token !== epoch || !active) throw Error('Portrait source differs');
        if (root.RE_IMAGE_BUDGET_R31) {
          item.lease = root.RE_IMAGE_BUDGET_R31.reserve('avatars', record.id, record.width * record.height, () => {
            waitingBudget.add(record.id); if (cache.get(record.id) === item) cache.delete(record.id); discard(item);
          });
          if (!item.lease) {waitingBudget.add(record.id); throw Error('Managed image pixel budget busy');}
        }
        item.url = root.URL.createObjectURL(new root.Blob([raw], {type: record.format === 'WEBP' ? 'image/webp' : record.format === 'JPEG' ? 'image/jpeg' : 'image/png'}));
        const image = new root.Image(); item.image = image;
        await new Promise((resolve, reject) => {
          const finish = error => {
            image.onload = null; image.onerror = null; controller.signal.removeEventListener('abort', cancelled);
            if (error) reject(error); else resolve();
          };
          const cancelled = () => finish(Error('Portrait decode cancelled'));
          controller.signal.addEventListener('abort', cancelled, {once: true});
          if (controller.signal.aborted) {cancelled(); return;}
          image.onload = () => finish(); image.onerror = () => finish(Error('Portrait decode failed')); image.src = item.url;
        });
        image.onload = null; image.onerror = null;
        if (image.naturalWidth !== record.width || image.naturalHeight !== record.height || controller.signal.aborted || token !== epoch || !active) throw Error('Portrait dimensions differ');
        item.state = 'ready'; item.lease?.ready(); waitingBudget.delete(record.id); counts.loadedImages++;
        return item;
      })();
      item.promise.catch(error => {
        if (!controller.signal.aborted && error.message !== 'Managed image pixel budget busy') remember(record.id);
        if (cache.get(record.id) === item) {discard(item); cache.delete(record.id);}
      }).finally(() => {controllers.delete(controller); pending--; drain();});
      present(binding, record, item);
    }
  }
  function present(binding, record, item) {
    const token = epoch;
    const apply = () => {
      if (!active || token !== epoch || !binding.host.isConnected || bindings.get(binding.host) !== binding
          || binding.uid !== record.id || !binding.visible || item.state !== 'ready') return;
      item.lease?.touch(); binding.image.src = item.url; binding.image.hidden = false;
      binding.image.dataset.avatarUid = record.id; binding.image.dataset.sourceKind = record.sourceKind;
      binding.image.title = sourceLabel(record);
      binding.host.dataset.avatarStateR30 = 'ready';
      position(binding, record);
      if (binding.canvas) binding.canvas.style.visibility = 'hidden';
    };
    if (item.state === 'ready') apply(); else item.promise.then(apply).catch(() => {});
  }
  function remove(binding) {
    intersection?.unobserve(binding.host); resize?.unobserve(binding.host); binding.image.removeAttribute('src'); binding.image.remove();
    binding.placeholder?.remove();
    if (binding.canvas) binding.canvas.style.visibility = '';
    delete binding.host.dataset.avatarStateR30; bindings.delete(binding.host);
    binding.host.classList.remove('r30-avatar-host');
  }
  function bind(host, uid, canvas = null, css = '') {
    if (!validId(uid) || !host) return;
    const previous = bindings.get(host);
    if (previous?.uid === uid && previous.canvas === canvas) return;
    if (previous) remove(previous);
    const image = doc.createElement('img'); image.className = 'r30-selection-avatar ' + css;
    image.alt = ''; image.decoding = 'async'; image.hidden = true; image.draggable = false;
    const binding = {host, uid, canvas, image, visible: !intersection, placeholder: null};
    bindings.set(host, binding); host.classList.add('r30-avatar-host'); host.append(image); host.dataset.avatarStateR30 = entries.has(uid) ? 'waiting' : 'missing';
    if (missing.has(uid)) {
      const placeholder = doc.createElement('span'); placeholder.className = 'r30-avatar-missing';
      placeholder.textContent = 'Vue source à documenter'; host.append(placeholder); binding.placeholder = placeholder;
      if (canvas) canvas.style.visibility = 'hidden';
    }
    if (intersection) intersection.observe(host); else enqueue(binding);
    resize?.observe(host);
  }
  function scan() {
    scanning = false;
    if (!active || !loaded) return;
    for (const binding of bindings.values()) if (!binding.host.isConnected) remove(binding);
    for (const canvas of doc.querySelectorAll('#roster .fighter-card canvas[data-re-specimen], #p1Portrait[data-re-specimen], #p2Portrait[data-re-specimen]')) {
      const card = canvas.closest('.fighter-card'); bind(card || canvas.parentElement, canvas.dataset.reSpecimen, canvas, card ? 'r30-card-avatar' : 'r30-side-avatar');
    }
    if (grid) grid.syncSelection();
    cleanCache();
  }
  function schedule() {if (!scanning) {scanning = true; root.queueMicrotask(scan);}}
  function mountGrid() {
    const subject = doc.getElementById('trialSubject'), target = doc.getElementById('trialTarget');
    if (!subject || !target || doc.getElementById('avatarSelectionR30')) return;
    const details = doc.createElement('details'); details.id = 'avatarSelectionR30'; details.className = 'r30-avatar-picker';
    const summary = doc.createElement('summary'); summary.textContent = 'CHOISIR AVEC LES AVATARS'; details.append(summary);
    const selected = doc.createElement('div'); selected.className = 'r30-selected-avatars';
    const selectedHosts = [];
    for (const [index, select] of [subject, target].entries()) {
      const card = doc.createElement('div'); card.className = 'r30-selected-avatar';
      const visual = doc.createElement('div'); visual.className = 'r30-selected-visual';
      const text = doc.createElement('span'); text.className = 'r30-selected-name';
      const caption = doc.createElement('small'); caption.textContent = index === 0 ? 'SPÉCIMEN' : 'ADVERSAIRE';
      card.append(visual, caption, text); selected.append(card); selectedHosts.push({select, visual, text});
    }
    const toolbar = doc.createElement('div'); toolbar.className = 'r30-avatar-toolbar';
    const slotLabel = doc.createElement('label'); slotLabel.textContent = 'CHOISIR POUR';
    const slot = doc.createElement('select'); slot.id = 'avatarSlotR30';
    for (const [value, label] of [['0', 'SPÉCIMEN'], ['1', 'ADVERSAIRE']]) {const option = doc.createElement('option'); option.value = value; option.textContent = label; slot.append(option);}
    slotLabel.append(slot);
    const filterLabel = doc.createElement('label'); filterLabel.textContent = 'FAMILLE';
    const family = doc.createElement('select'); family.id = 'avatarFamilyR30';
    const all = doc.createElement('option'); all.value = ''; all.textContent = 'TOUS LES PERSONNAGES'; family.append(all);
    for (const group of subject.querySelectorAll('optgroup')) {const option = doc.createElement('option'); option.value = group.label; option.textContent = group.label; family.append(option);}
    filterLabel.append(family);
    const searchLabel = doc.createElement('label'); searchLabel.textContent = 'RECHERCHER';
    const search = doc.createElement('input'); search.type = 'search'; search.id = 'avatarSearchR30'; search.placeholder = 'Nom ou jeu'; searchLabel.append(search);
    toolbar.append(slotLabel, filterLabel, searchLabel);
    const list = doc.createElement('div'); list.id = 'avatarGridR30'; list.className = 'r30-avatar-grid'; list.setAttribute('aria-label', 'Personnages et formes');
    const pager = doc.createElement('div'); pager.className = 'r30-avatar-pager';
    const prev = doc.createElement('button'); prev.type = 'button'; prev.textContent = '←'; prev.setAttribute('aria-label', 'Page précédente');
    const next = doc.createElement('button'); next.type = 'button'; next.textContent = '→'; next.setAttribute('aria-label', 'Page suivante');
    const status = doc.createElement('span'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.id = 'avatarPageR30'; pager.append(prev, status, next);
    const retry = doc.createElement('button'); retry.type = 'button'; retry.textContent = 'Réessayer les portraits';
    retry.addEventListener('click', retryImages); pager.append(retry);
    const feedback = doc.createElement('p'); feedback.id = 'avatarFeedbackR30'; feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
    details.append(toolbar, list, pager, feedback); doc.querySelector('.trial-form').after(selected, details);
    let page = 0;
    const normalize = value => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    function options() {
      const query = normalize(search.value.trim());
      return [...(Number(slot.value) ? target : subject).options].filter(option => (!family.value || option.parentElement.label === family.value)
        && (!query || normalize(option.textContent).includes(query) || normalize(option.value.replaceAll('-', ' ')).includes(query)));
    }
    function syncSelection() {
      for (const item of selectedHosts) {
        const option = item.select.selectedOptions[0], uid = item.select.value;
        if (item.text.textContent !== option?.textContent) item.text.textContent = option?.textContent || '';
        bind(item.visual, uid, null, 'r30-picker-avatar');
      }
      const selectedUid = (Number(slot.value) ? target : subject).value;
      for (const button of list.querySelectorAll('button[data-avatar-choice]')) button.setAttribute('aria-pressed', String(button.dataset.avatarChoice === selectedUid));
    }
    function render() {
      const rows = options(), pages = Math.max(1, Math.ceil(rows.length / limits.pageSize));
      page = Math.max(0, Math.min(page, pages - 1)); list.replaceChildren();
      for (const option of rows.slice(page * limits.pageSize, (page + 1) * limits.pageSize)) {
        const button = doc.createElement('button'); button.type = 'button'; button.className = 'r30-avatar-choice';
        button.dataset.avatarChoice = option.value; button.disabled = option.disabled;
        const visual = doc.createElement('span'); visual.className = 'r30-avatar-visual';
        const copy = doc.createElement('span'); copy.className = 'r30-avatar-copy'; copy.textContent = option.textContent;
        const record = entries.get(option.value), note = doc.createElement('small');
        note.textContent = record ? sourceLabel(record) : 'Vue source à documenter';
        button.append(visual, copy, note); list.append(button); bind(visual, option.value, null, 'r30-picker-avatar');
        button.addEventListener('click', () => {
          const select = Number(slot.value) ? target : subject;
          const current = [...select.options].find(row => row.value === option.value);
          if (!current || current.disabled) return;
          select.value = current.value; select.dispatchEvent(new root.Event('change', {bubbles: true}));
          syncSelection(); feedback.textContent = (Number(slot.value) ? 'Adversaire : ' : 'Spécimen : ') + current.textContent;
        });
      }
      prev.disabled = page === 0; next.disabled = page === pages - 1;
      status.textContent = (page + 1) + ' / ' + pages + ' · ' + rows.length + ' personnages';
      syncSelection(); cleanCache(); schedule();
    }
    for (const element of [slot, family]) element.addEventListener('change', () => {page = 0; render();});
    search.addEventListener('input', () => {page = 0; render();});
    prev.addEventListener('click', () => {page--; render(); if (prev.disabled) next.focus();});
    next.addEventListener('click', () => {page++; render(); if (next.disabled) prev.focus();});
    for (const select of [subject, target]) select.addEventListener('change', syncSelection);
    details.addEventListener('toggle', () => {if (details.open && !list.children.length) render();});
    grid = {syncSelection, render}; syncSelection();
  }
  function style() {
    const node = doc.createElement('link'); node.rel = 'stylesheet'; node.href = new URL('../../fidelity-r30/selection/avatars.css', script).href; doc.head.append(node);
  }
  function observe() {
    if (!observer) observer = new root.MutationObserver(schedule);
    for (const element of [doc.getElementById('roster'), doc.getElementById('p1Portrait'), doc.getElementById('p2Portrait')].filter(Boolean)) {
      observer.observe(element, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-re-specimen']});
    }
  }
  function suspend() {
    if (!active) return;
    active = false; epoch++; observer?.disconnect(); intersection?.disconnect(); resize?.disconnect(); queue.length = 0;
    for (const controller of controllers) controller.abort();
    for (const binding of bindings.values()) {binding.image.hidden = true; binding.image.removeAttribute('src'); binding.visible = false; if (binding.canvas) binding.canvas.style.visibility = '';}
    for (const item of cache.values()) discard(item); cache.clear(); errors.clear(); waitingBudget.clear();
  }
  function resume() {
    if (active) return;
    active = true; epoch++; observe();
    for (const binding of bindings.values()) {binding.visible = !intersection; resize?.observe(binding.host); if (intersection) intersection.observe(binding.host); else enqueue(binding);}
    schedule();
    if (!loaded) initialize();
  }
  let initialization;
  async function initialize() {
    if (initialization) return initialization;
    initialization = (async () => {
      const controller = new root.AbortController(); controllers.add(controller);
      try {
        const raw = await bounded(await root.fetch(manifestURL, {signal: controller.signal, credentials: 'same-origin'}), limits.manifestBytes, undefined, controller.signal);
        const value = JSON.parse(new root.TextDecoder().decode(raw));
        if (value.schema !== 're.bow.selection-avatars-r30/1' || value.canonicalFidelityCertified !== false
            || !Array.isArray(value.entries) || value.entries.length > 389 || !Array.isArray(value.missing)) throw Error('Invalid portrait registry');
        const registry = new Map();
        for (const record of value.entries) {
          if (!validId(record.id) || registry.has(record.id) || !integer(record.bytes, 1, limits.imageBytes)
              || !integer(record.width, 1, 8192) || !integer(record.height, 1, 8192)
              || record.width * record.height > limits.imagePixels || !/^[a-f0-9]{64}$/.test(record.sha256)
              || !['native-menu-thumbnail', 'native-model-render', 'reviewed-secondary-reference', 'documented-secondary-reference'].includes(record.sourceKind)
              || record.selectionOnly !== true || record.combatAnimationAssigned !== false || record.canonicalFidelityCertified !== false
              || (record.nativeAssetCertified === true) !== (record.sourceKind === 'native-menu-thumbnail')
              || (record.derivedNativeModelRender === true) !== (record.sourceKind === 'native-model-render')) throw Error('Invalid portrait reference');
          if (record.crop && (!integer(record.crop.x, 0, record.width - 1) || !integer(record.crop.y, 0, record.height - 1)
              || !integer(record.crop.width, 1, record.width - record.crop.x) || !integer(record.crop.height, 1, record.height - record.crop.y))) throw Error('Invalid portrait alpha crop');
          local(record.image); registry.set(record.id, freeze(record));
        }
        if (!active) return false;
        for (const [uid, record] of registry) entries.set(uid, record);
        for (const row of value.missing) if (validId(row.id) && !entries.has(row.id)) missing.set(row.id, freeze(row));
        counts.avatars = entries.size; counts.missing = missing.size;
        counts.nativeMenuThumbnails = [...entries.values()].filter(row => row.sourceKind === 'native-menu-thumbnail').length;
        counts.nativeModelRenders = [...entries.values()].filter(row => row.sourceKind === 'native-model-render').length;
        loaded = true; failed = false; mountGrid(); observe(); scan(); return true;
      } catch {failed = true; return false;}
      finally {controllers.delete(controller); if (!loaded) initialization = null;}
    })();
    return initialization;
  }
  if (typeof root.IntersectionObserver === 'function') intersection = new root.IntersectionObserver(rows => {
    for (const row of rows) {
      const binding = bindings.get(row.target); if (!binding) continue;
      binding.visible = row.isIntersecting;
      if (binding.visible) enqueue(binding);
    }
  }, {rootMargin: '80px'});
  if (typeof root.ResizeObserver === 'function') resize = new root.ResizeObserver(rows => {
    for (const row of rows) {const binding = bindings.get(row.target); if (binding) position(binding, entries.get(binding.uid));}
  });
  function retryImages() {errors.clear(); waitingBudget.clear(); for (const binding of bindings.values()) enqueue(binding);}
  root.RE_IMAGE_BUDGET_R31?.subscribe(() => {
    if (!active) return;
    for (const binding of bindings.values()) if (waitingBudget.has(binding.uid) && binding.visible && !cache.has(binding.uid)) enqueue(binding);
  });
  style(); root.addEventListener('pagehide', suspend); root.addEventListener('pageshow', resume);
  root.RE_SELECTION_AVATARS_R31 = root.RE_SELECTION_AVATARS_R30 = Object.freeze({initialize, get: uid => entries.get(uid) || null,
    list: () => [...entries.values()], missing: () => [...missing.values()], limits, retry: retryImages,
    status: () => ({loaded, failed, active, ...counts, cachedImages: cache.size, loadingImages: pending,
      queuedImages: queue.length, bindings: bindings.size, waitingForBudget: waitingBudget.size, rememberedErrors: errors.size})});
  initialize();
})(typeof window === 'object' ? window : globalThis);
