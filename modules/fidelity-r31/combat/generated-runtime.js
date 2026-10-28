/* R31: immutable, lazily decoded generated base poses. No actor or replay writes. */
(function (root) {
  'use strict';
  if (root.RE_COMBAT_SPRITES_R31) return;
  const doc = root.document;
  const script = doc?.currentScript?.src;
  if (!doc || !script || typeof root.URL !== 'function' || root.location?.origin === 'null') return;
  const repository = new URL('../../../', script);
  const manifestURL = new URL('../sprites/manifest.json', script);
  const limits = Object.freeze({ manifestBytes: 4 * 1024 * 1024, imageBytes: 16 * 1024 * 1024,
    imagePixels: 16 * 1024 * 1024, decodedImages: 4, concurrentImages: 2, rememberedErrors: 32 });
  const records = new Map(), cache = new Map(), failures = new Map();
  const sameEditionVariants = new Map(), selectedVariants = new Map(), waitingBudget = new Map();
  let unsubscribeBudget = null;
  const controllers = new Set();
  const knownIdentities = new Set((root.RE_DATA?.catalog || []).map(item => item.id));
  let active = true, generation = 0, used = 0, loading = 0, unreviewedEnabled = false;
  const status = { loaded: false, failed: false, generated: 0, historical: 0, drawn: 0, message: '' };
  function local(value) {
    if (typeof value !== 'string' || !/^(?:assets|modules)\/[A-Za-z0-9_./-]+\.png$/.test(value)
        || value.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Invalid sprite path');
    const url = new URL(value, repository);
    if (url.origin !== repository.origin || !url.pathname.startsWith(repository.pathname)) throw Error('Sprite leaves this checkout');
    return url.href;
  }
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  function integer(value, low, high) { return Number.isInteger(value) && value >= low && value <= high; }
  function normalize(value, historical) {
    const item = JSON.parse(JSON.stringify(value));
    if (!historical && (item.admittedTargetEdition === false || item.targetEditionAdmitted === false || item.documentaryVariant === true || item.scope === 'documentary-edition-variant' || String(item.image || '').includes('/documentary-variants/'))) throw Error('Documentary edition variants cannot enter the active combat registry');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || '') || !['right', 'left', 'front', 'unknown'].includes(item.sourceFacing)
        || !integer(item.width, 2, 8192) || !integer(item.height, 2, 8192)
        || item.width * item.height > limits.imagePixels || !integer(item.bytes, 1, limits.imageBytes)
        || !/^[a-f0-9]{64}$/.test(item.sha256 || '') || item.canMirror !== false
        || !Array.isArray(item.availableStates) || item.availableStates.length > 1
        || item.availableStates.length === 1 && item.availableStates[0] !== 'idle') throw Error('Invalid base-pose contract');
    if (knownIdentities.size && !knownIdentities.has(item.id)) throw Error('Unknown catalogue sprite identity');
    local(item.image);
    const bounds = item.bounds, pivot = item.pivot;
    if (!bounds || !pivot || !integer(bounds.x, 0, item.width - 1) || !integer(bounds.y, 0, item.height - 1)
        || !integer(bounds.width, 1, item.width - bounds.x) || !integer(bounds.height, 1, item.height - bounds.y)
        || !Number.isFinite(pivot.x) || !Number.isFinite(pivot.y) || pivot.x < 0 || pivot.x > item.width
        || pivot.y < 0 || pivot.y > item.height) throw Error('Invalid sprite bounds or pivot');
    if (!historical && (item.canonicalFidelityCertified !== false
        || !['needs-visual-review', 'visually-reviewed'].includes(item.reviewStatus))) throw Error('Invalid generated sprite review scope');
    item.reviewStatus = historical ? 'visually-reviewed' : item.reviewStatus;
    item.fullBodyReviewed = historical || item.fullBodyReviewed === true;
    item.scope = historical ? 'combatant-neutral-pose' : item.scope;
    if (!historical && item.poseKind !== undefined && !['neutral-base', 'source-bind-pose', 'source-presentation', 'unknown'].includes(item.poseKind)) throw Error('Invalid pose classification');
    item.poseKind = historical ? 'neutral-base' : item.poseKind || 'unknown';
    const gaps = item.knownAppearanceGaps === undefined ? [] : item.knownAppearanceGaps;
    if (!Array.isArray(gaps) || gaps.length > 64 || gaps.some(value => typeof value !== 'string' || !value.trim() || value.length > 2000)) throw Error('Invalid appearance gap observations');
    item.knownAppearanceGaps = gaps;
    const eligible = !gaps.length && item.reviewStatus === 'visually-reviewed' && item.fullBodyReviewed
      && ['left', 'right'].includes(item.sourceFacing) && item.poseKind === 'neutral-base' && item.scope === 'combatant-neutral-pose';
    if (eligible !== (item.availableStates.length === 1 && item.availableStates[0] === 'idle')) throw Error('Pose classification and declared idle capability disagree');
    item.canonicalFidelityCertified = false;
    item.origin = historical ? 'R20' : item.image.startsWith('modules/fidelity-r31/') ? 'R31' : item.image.startsWith('modules/fidelity-r29/') ? 'R29' : item.image.startsWith('modules/fidelity-r28/') ? 'R28' : 'R27';
    return freeze(item);
  }
  async function bounded(response, maximum, exact, signal) {
    if (!response.ok) throw Error('Sprite request failed');
    const rawLength = response.headers.get('content-length');
    const length = rawLength === null ? null : Number(rawLength);
    if ((length !== null && (!integer(length, 0, maximum) || (exact !== undefined && length !== exact)))
        || (exact !== undefined && exact > maximum)) throw Error('Unexpected sprite byte count');
    let total = 0;
    const chunks = [];
    if (!response.body?.getReader) {
      if (length === null) throw Error('A bounded response stream is required');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (signal.aborted || bytes.length > maximum || (exact !== undefined && bytes.length !== exact)) throw Error('Unexpected sprite byte count');
      return bytes;
    }
    const reader = response.body.getReader();
    try {
      while (true) {
        if (signal.aborted) throw Error('Sprite load cancelled');
        const value = await reader.read();
        if (value.done) break;
        total += value.value.byteLength;
        if (total > maximum || (exact !== undefined && total > exact)) throw Error('Sprite exceeds its declared size');
        chunks.push(value.value);
      }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    finally { reader.releaseLock(); }
    if (exact !== undefined && total !== exact) throw Error('Truncated sprite');
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  }
  async function requestJSON(url) {
    const controller = new root.AbortController(); controllers.add(controller);
    try {
      const response = await root.fetch(url, { signal: controller.signal, credentials: 'same-origin' });
      return JSON.parse(new TextDecoder().decode(await bounded(response, limits.manifestBytes, undefined, controller.signal)));
    } finally { controllers.delete(controller); }
  }
  let initialization = null, initializationGeneration = -1;
  function initialize() {
    if (initialization && initializationGeneration === generation) return initialization;
    const task = initializeOnce();
    initialization = task; initializationGeneration = generation;
    task.finally(() => { if (initialization === task) initialization = null; });
    return task;
  }
  async function initializeOnce() {
    if (typeof root.fetch !== 'function' || typeof root.AbortController !== 'function') return false;
    const token = generation;
    try {
      const old = root.BOWSpritesR20?.list ? { sprites: root.BOWSpritesR20.list() }
        : await requestJSON(new URL('assets/sprites/bow/manifest.json', repository));
      if (!active || token !== generation) return false;
      for (const value of old.sprites || []) {
        const item = normalize(value, true);
        const existing = records.get(item.id);
        if (existing) {
          if (existing.origin !== 'R20' || existing.sha256 !== item.sha256) throw Error('Duplicate historical sprite');
          continue;
        }
        records.set(item.id, item); status.historical++;
      }
      const manifest = await requestJSON(manifestURL);
      if (!active || token !== generation) return false;
      if (manifest.schema !== 're.bow.generated-combat-sprites/1' || !Array.isArray(manifest.sprites)
          || manifest.sprites.length > 385) throw Error('Unexpected R31 sprite manifest');
      const next = [];
      for (const value of manifest.sprites) {
        const item = normalize(value, false);
        if (records.has(item.id) || next.some(oldItem => oldItem.id === item.id)) throw Error('Duplicate generated sprite');
        next.push(item);
      }
      const nextVariants = [];
      if (!Array.isArray(manifest.sameEditionVariants) || manifest.sameEditionVariants.length > 385) throw Error('Invalid same-edition variant list');
      for (const value of manifest.sameEditionVariants) {
        const target = next.find(item => item.id === value.id);
        if (!target || value.sameEditionVariant !== true || value.defaultAdmission !== false
            || value.admittedTargetEdition !== true || value.targetEditionAdmitted !== true
            || value.targetIncarnation !== target.incarnation || value.comparesAgainstSha256 !== target.sha256
            || value.targetFullBodyReviewed !== false || typeof value.sourceVariantLabel !== 'string'
            || !value.sourceVariantLabel.trim() || value.sourceVariantLabel.length > 500
            || typeof value.sourceEdition !== 'string' || !value.sourceEdition.trim() || value.sourceEdition.length > 500
            || !/^[a-z0-9-]{1,160}$/.test(value.variantId || '') || nextVariants.some(item => item.variantId === value.variantId)
            || value.animated !== false || value.animationFrames !== 1) throw Error('A static source variant needs an exact target and explicit voluntary scope');
        const item = normalize(value, false);
        if (!item.fullBodyReviewed || item.poseKind !== 'neutral-base' || item.availableStates.length !== 1
            || item.availableStates[0] !== 'idle' || item.knownAppearanceGaps.length) throw Error('Unqualified static source variant');
        nextVariants.push(item);
      }
      for (const item of next) records.set(item.id, item);
      sameEditionVariants.clear();
      for (const item of nextVariants) sameEditionVariants.set(item.variantId, item);
      status.generated = next.length; status.loaded = true;
      status.failed = false; status.message = '';
      publish();
      return true;
    } catch (error) {
      if (!active || token !== generation) return false;
      status.failed = true; status.message = error.message;
      return false;
    }
  }
  function publish() {
    if (typeof root.CustomEvent !== 'function' || typeof root.dispatchEvent !== 'function') return;
    root.dispatchEvent(new root.CustomEvent('re:r27spritestatus', { detail: { ...status } }));
    root.dispatchEvent(new root.CustomEvent('re:r31spritestatus', { detail: { ...status } }));
    root.dispatchEvent(new root.CustomEvent('re:assetstatus', { detail: { source: 'r27-base-poses', loading, errors: failures.size } }));
  }
  function dispose(entry) {
    entry.controller?.abort();
    if (entry.url) root.URL.revokeObjectURL(entry.url);
    for (const image of [entry.image, entry.pendingImage]) if (image) { image.onload = image.onerror = null; image.removeAttribute?.('src'); }
    entry.image = null; entry.pendingImage = null; entry.url = null;
    entry.lease?.release(); entry.lease = null;
  }
  function trim() {
    const ready = [...cache.entries()].filter(([, value]) => value.image).sort((a, b) => a[1].used - b[1].used);
    while (ready.length > limits.decodedImages) {
      const [key, entry] = ready.shift(); cache.delete(key); dispose(entry);
    }
  }
  function get(id) {
    const uid = String(id), selected = sameEditionVariants.get(selectedVariants.get(uid));
    return selected?.id === uid ? selected : records.get(uid) || null;
  }
  function availableVariants(id) { return [...sameEditionVariants.values()].filter(item => item.id === String(id)); }
  function selectVariant(id, variantId) {
    const uid = String(id);
    if (variantId === null || variantId === '') { selectedVariants.delete(uid); publish(); return true; }
    const item = sameEditionVariants.get(String(variantId));
    if (!item || item.id !== uid || !records.has(uid)) return false;
    selectedVariants.set(uid, item.variantId); publish(); return true;
  }
  function permitted(record, allowUnreviewed) { return record && (record.reviewStatus === 'visually-reviewed' || allowUnreviewed === true || unreviewedEnabled); }
  function load(id, options = {}) {
    const record = get(id);
    if (!active || !record || !permitted(record, options.allowUnreviewed)) return Promise.reject(Error('Sprite unavailable or awaiting visual review'));
    if (!root.crypto?.subtle || typeof root.Image !== 'function') return Promise.reject(Error('Verified sprite decoding is unavailable'));
    const key = record.image + ':' + record.sha256 + ':' + record.bytes;
    const previous = cache.get(key);
    if (previous) { previous.used = ++used; previous.lease?.touch(); return previous.promise; }
    if (loading >= limits.concurrentImages) return Promise.reject(Error('Sprite decoder busy'));
    if (waitingBudget.has(key)) return Promise.reject(Error('Managed image pixel budget busy'));
    const failed = failures.get(key);
    if (failed && Date.now() - failed.time < 15000) return Promise.reject(Error(failed.message));
    const token = generation, controller = new root.AbortController();
    const entry = { record, controller, image: null, pendingImage: null, url: null, lease: null, used: ++used, promise: null };
    controllers.add(controller); loading++;
    entry.promise = (async () => {
      const response = await root.fetch(local(record.image), { signal: controller.signal, credentials: 'same-origin' });
      const bytes = await bounded(response, limits.imageBytes, record.bytes, controller.signal);
      const hash = [...new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
      if (hash !== record.sha256) throw Error('Sprite SHA-256 differs from its manifest');
      if (controller.signal.aborted || !active || token !== generation) throw Error('Sprite load cancelled');
      entry.url = root.URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      const budget = root.RE_IMAGE_BUDGET_R31;
      if (budget) {
        entry.lease = budget.reserve('generated', key, record.width * record.height, () => {
          if (cache.get(key) === entry) cache.delete(key);
          dispose(entry);
        });
        if (!entry.lease) throw Error('Managed image pixel budget busy');
      }
      const image = new root.Image(); entry.pendingImage = image;
      await new Promise((resolve, reject) => {
        image.onload = resolve; image.onerror = () => reject(Error('Sprite PNG decoding failed'));
        const abort = () => reject(Error('Sprite load cancelled'));
        controller.signal.addEventListener('abort', abort, { once: true });
        image.src = entry.url;
      });
      image.onload = image.onerror = null;
      if (!active || token !== generation || controller.signal.aborted || image.naturalWidth !== record.width || image.naturalHeight !== record.height) {
        image.removeAttribute('src'); throw Error('Sprite dimensions changed or load cancelled');
      }
      entry.pendingImage = null; entry.image = image; entry.lease?.ready(); failures.delete(key); trim(); publish();
      return Object.freeze({ record, image });
    })().catch(error => {
      const cancelled = controller.signal.aborted || token !== generation;
      if (cache.get(key) === entry) cache.delete(key);
      dispose(entry);
      if (!cancelled && error.message === 'Managed image pixel budget busy') {
        waitingBudget.set(key, String(id));
        while (waitingBudget.size > 32) waitingBudget.delete(waitingBudget.keys().next().value);
      } else if (!cancelled) {
        failures.delete(key); failures.set(key, { time: Date.now(), message: error.message });
        while (failures.size > limits.rememberedErrors) failures.delete(failures.keys().next().value);
      }
      throw error;
    }).finally(() => { controllers.delete(controller); loading--; });
    cache.set(key, entry);
    return entry.promise;
  }
  function loaded(id) {
    const record = get(id);
    if (!record) return null;
    const entry = cache.get(record.image + ':' + record.sha256 + ':' + record.bytes);
    if (entry?.image) { entry.used = ++used; entry.lease?.touch(); return entry; }
    return null;
  }
  function draw(ctx, id, options = {}) {
    const record = get(id), state = options.state || 'idle';
    if (!ctx || !record) return { ok: false, reason: 'unknown-sprite' };
    if (!permitted(record, options.allowUnreviewed)) return { ok: false, reason: 'visual-review-required' };
    if (record.scope !== 'combatant-neutral-pose') return { ok: false, reason: 'contextual-illustration' };
    if (record.fullBodyReviewed !== true) return { ok: false, reason: 'full-body-not-reviewed' };
    if (record.knownAppearanceGaps.length) return { ok: false, reason: 'appearance-not-complete' };
    if (record.poseKind !== 'neutral-base') return { ok: false, reason: 'pose-not-neutral-base' };
    if (state !== 'idle' || !record.availableStates.includes(state)) return { ok: false, reason: 'state-not-produced' };
    const facing = options.facing === -1 || options.facing === 'left' ? 'left' : 'right';
    if (facing !== record.sourceFacing) return { ok: false, reason: 'direction-not-produced' };
    const entry = loaded(id);
    if (!entry || !active) { load(id, options).catch(() => {}); return { ok: false, reason: 'not-ready' }; }
    const bounds = record.bounds;
    const height = Number(options.height);
    if (!Number.isFinite(height) || height <= 0 || height > 8192 || !Number.isFinite(options.x) || !Number.isFinite(options.y)) return { ok: false, reason: 'invalid-placement' };
    const scale = height / bounds.height;
    ctx.save();
    try {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(entry.image, bounds.x, bounds.y, bounds.width, bounds.height,
        options.x + (bounds.x - record.pivot.x) * scale, options.y + (bounds.y - record.pivot.y) * scale,
        bounds.width * scale, bounds.height * scale);
      status.drawn++;
    } finally { ctx.restore(); }
    return { ok: true, frames: 1, state: 'idle', direction: facing, mirrored: false,
      originalGameSprite: false, canonicalFidelityCertified: false, origin: record.origin };
  }
  function clear() {
    generation++;
    for (const controller of controllers) controller.abort();
    for (const entry of cache.values()) dispose(entry);
    cache.clear(); failures.clear(); waitingBudget.clear();
  }
  let ready = initialize();
  root.RE_COMBAT_SPRITES_R31 = Object.freeze({ ready: () => ready, get, load, draw,
    list: () => [...records.values()], clear, availableVariants, selectVariant, selectedVariant: id => selectedVariants.get(String(id)) || null,
    setUnreviewedEnabled(value) { unreviewedEnabled = value === true; },
    retry() { failures.clear(); if (!status.loaded && active) ready = initialize(); return ready; },
    state: () => ({ ...status, active, loading, cached: [...cache.values()].filter(item => item.image).length,
      pending: [...cache.values()].filter(item => !item.image).length, errors: failures.size, waitingBudget: waitingBudget.size,
      unreviewedEnabled, limits, sameEditionVariants: sameEditionVariants.size, selectedVariants: Object.fromEntries(selectedVariants), canonicalFidelityCertified: false, missingAnimationsSynthesized: 0 }) });
  // Existing rendering adapters read the stable R27 interface; all names expose the same bounded R31 resolver.
  root.RE_COMBAT_SPRITES_R29 = root.RE_COMBAT_SPRITES_R31;
  root.RE_COMBAT_SPRITES_R28 = root.RE_COMBAT_SPRITES_R31;
  root.RE_COMBAT_SPRITES_R27 = root.RE_COMBAT_SPRITES_R31;
  function retryBudgetWaiters() {
    if (!active) return;
    for (const [key, id] of [...waitingBudget]) {
      const record = get(id);
      if (!record || record.image + ':' + record.sha256 + ':' + record.bytes !== key) { waitingBudget.delete(key); continue; }
      if (loading >= limits.concurrentImages) break;
      waitingBudget.delete(key); load(id).catch(() => {});
    }
  }
  function watchBudget() {
    if (!unsubscribeBudget && root.RE_IMAGE_BUDGET_R31?.subscribe) unsubscribeBudget = root.RE_IMAGE_BUDGET_R31.subscribe(retryBudgetWaiters);
  }
  watchBudget();
  root.addEventListener?.('pagehide', () => { active = false; unsubscribeBudget?.(); unsubscribeBudget = null; clear(); });
  root.addEventListener?.('pageshow', () => { active = true; watchBudget(); if (!status.loaded) ready = initialize(); });

  function mountVariantChoices() {
    if (typeof doc.createElement !== 'function' || typeof doc.getElementById !== 'function') return;
    const trial = doc.getElementById('trialSubject'), filters = doc.getElementById('filters');
    const inputs = trial ? ['trialSubject', 'trialTarget'].map(id => doc.getElementById(id)).filter(Boolean)
      : ['p1Portrait', 'p2Portrait'].map(id => doc.getElementById(id)).filter(Boolean);
    const anchor = trial?.closest('.trial-form') || filters;
    if (!anchor || !inputs.length || doc.getElementById('generatedVariantsR31')) return;
    const details = doc.createElement('details'); details.id = 'generatedVariantsR31'; details.hidden = true;
    const summary = doc.createElement('summary'); summary.textContent = 'VARIANTES VISUELLES DE L’INCARNATION'; details.append(summary);
    const note = doc.createElement('p'); note.textContent = 'Illustration générée depuis les sources indiquées. Une pose fixe ne constitue pas une animation idle.'; details.append(note);
    const bindings = inputs.map((input, index) => {
      const label = doc.createElement('label'); label.textContent = 'Joueur ' + (index + 1);
      const select = doc.createElement('select'); select.setAttribute('aria-label', 'Illustration source du joueur ' + (index + 1));
      const info = doc.createElement('p'); label.append(select); details.append(label, info);
      const binding = {input, select, info, uid: '', signature: ''};
      select.addEventListener('change', () => selectVariant(binding.uid, select.value || null));
      input.addEventListener('change', sync); return binding;
    });
    const link = doc.createElement('a'); link.href = new URL('../sprites/index.html', script).href;
    link.textContent = 'Examiner les illustrations et leurs sources'; details.append(link);
    const style = doc.createElement('style'); style.textContent = '#generatedVariantsR31{box-sizing:border-box;min-width:0;max-width:100%;border:1px solid #7f9278;padding:8px;color:#f0ecd9;background:#17251b;font:12px/1.5 system-ui;overflow-wrap:anywhere}#generatedVariantsR31 summary{cursor:pointer;font-weight:700}#generatedVariantsR31 label{display:block;min-width:0;margin:8px 0}#generatedVariantsR31 select{box-sizing:border-box;display:block;min-width:0;width:100%;max-width:100%;white-space:normal;background:#17251b;color:#f0ecd9;border:1px solid #7f9278;font:inherit;padding:6px}#generatedVariantsR31 p{margin:5px 0}#generatedVariantsR31 a{color:#f3df98}'; doc.head.append(style);
    if (anchor === filters) anchor.append(details); else anchor.after(details);
    function sync() {
      let visible = false;
      for (const binding of bindings) {
        const uid = binding.input.tagName === 'SELECT' ? binding.input.value : binding.input.dataset.reSpecimen || '';
        const choices = availableVariants(uid), selected = selectedVariants.get(uid) || '';
        visible ||= choices.length > 0;
        const signature = uid + ':' + choices.map(item => item.variantId).join(',') + ':' + selected;
        if (signature === binding.signature) continue;
        binding.signature = signature; binding.uid = uid;
        const normal = doc.createElement('option'); normal.value = ''; normal.textContent = 'Apparence du catalogue';
        binding.select.replaceChildren(normal, ...choices.map(item => {
          const option = doc.createElement('option'); option.value = item.variantId;
          option.textContent = item.sourceVariantLabel + ' · 1 image · ' + (item.sourceFacing === 'right' ? 'droite' : 'gauche'); return option;
        }));
        binding.select.value = selected; binding.select.disabled = !choices.length;
        binding.info.textContent = choices.length ? 'Choix volontaire pour cette page ; une seule orientation est disponible.' : 'Pas de variante pour ce personnage.';
      }
      details.hidden = !visible;
    }
    const observer = typeof root.MutationObserver === 'function' ? new root.MutationObserver(sync) : null;
    const observe = () => { for (const binding of bindings) if (binding.input.tagName !== 'SELECT') observer?.observe(binding.input, {attributes: true, attributeFilter: ['data-re-specimen']}); };
    observe(); ready.then(sync); root.addEventListener?.('re:r31spritestatus', sync);
    root.addEventListener?.('pagehide', () => observer?.disconnect());
    root.addEventListener?.('pageshow', () => {observe(); sync();}); sync();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mountVariantChoices, {once: true}); else mountVariantChoices();
})(globalThis);
