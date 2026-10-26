/* R28: immutable, lazily decoded generated base poses. No actor or replay writes. */
(function (root) {
  'use strict';
  if (root.RE_COMBAT_SPRITES_R28) return;
  const doc = root.document;
  const script = doc?.currentScript?.src;
  if (!doc || !script || typeof root.URL !== 'function' || root.location?.origin === 'null') return;
  const repository = new URL('../../../', script);
  const manifestURL = new URL('../sprites/manifest.json', script);
  const limits = Object.freeze({ manifestBytes: 4 * 1024 * 1024, imageBytes: 16 * 1024 * 1024,
    imagePixels: 16 * 1024 * 1024, decodedImages: 4, concurrentImages: 2, rememberedErrors: 32 });
  const records = new Map(), cache = new Map(), failures = new Map();
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
    const eligible = item.reviewStatus === 'visually-reviewed' && item.fullBodyReviewed
      && ['left', 'right'].includes(item.sourceFacing) && item.poseKind === 'neutral-base' && item.scope === 'combatant-neutral-pose';
    if (eligible !== (item.availableStates.length === 1 && item.availableStates[0] === 'idle')) throw Error('Pose classification and declared idle capability disagree');
    item.canonicalFidelityCertified = false;
    item.origin = historical ? 'R20' : item.image.startsWith('modules/fidelity-r28/') ? 'R28' : 'R27';
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
          || manifest.sprites.length > 385) throw Error('Unexpected R28 sprite manifest');
      const next = [];
      for (const value of manifest.sprites) {
        const item = normalize(value, false);
        if (records.has(item.id) || next.some(oldItem => oldItem.id === item.id)) throw Error('Duplicate generated sprite');
        next.push(item);
      }
      for (const item of next) records.set(item.id, item);
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
    root.dispatchEvent(new root.CustomEvent('re:assetstatus', { detail: { source: 'r27-base-poses', loading, errors: failures.size } }));
  }
  function dispose(entry) {
    entry.controller?.abort();
    if (entry.url) root.URL.revokeObjectURL(entry.url);
    if (entry.image) { entry.image.onload = entry.image.onerror = null; entry.image.removeAttribute?.('src'); }
    entry.image = null; entry.url = null;
  }
  function trim() {
    const ready = [...cache.entries()].filter(([, value]) => value.image).sort((a, b) => a[1].used - b[1].used);
    while (ready.length > limits.decodedImages) {
      const [key, entry] = ready.shift(); cache.delete(key); dispose(entry);
    }
  }
  function get(id) { return records.get(String(id)) || null; }
  function permitted(record, allowUnreviewed) { return record && (record.reviewStatus === 'visually-reviewed' || allowUnreviewed === true || unreviewedEnabled); }
  function load(id, options = {}) {
    const record = get(id);
    if (!active || !record || !permitted(record, options.allowUnreviewed)) return Promise.reject(Error('Sprite unavailable or awaiting visual review'));
    if (!root.crypto?.subtle || typeof root.Image !== 'function') return Promise.reject(Error('Verified sprite decoding is unavailable'));
    const key = record.image + ':' + record.sha256 + ':' + record.bytes;
    const previous = cache.get(key);
    if (previous) { previous.used = ++used; return previous.promise; }
    if (loading >= limits.concurrentImages) return Promise.reject(Error('Sprite decoder busy'));
    const failed = failures.get(key);
    if (failed && Date.now() - failed.time < 15000) return Promise.reject(Error(failed.message));
    const token = generation, controller = new root.AbortController();
    const entry = { record, controller, image: null, url: null, used: ++used, promise: null };
    controllers.add(controller); loading++;
    entry.promise = (async () => {
      const response = await root.fetch(local(record.image), { signal: controller.signal, credentials: 'same-origin' });
      const bytes = await bounded(response, limits.imageBytes, record.bytes, controller.signal);
      const hash = [...new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
      if (hash !== record.sha256) throw Error('Sprite SHA-256 differs from its manifest');
      if (controller.signal.aborted || !active || token !== generation) throw Error('Sprite load cancelled');
      entry.url = root.URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      const image = new root.Image();
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
      entry.image = image; failures.delete(key); trim(); publish();
      return Object.freeze({ record, image });
    })().catch(error => {
      if (cache.get(key) === entry) cache.delete(key);
      dispose(entry);
      if (!controller.signal.aborted && token === generation) {
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
    if (entry?.image) { entry.used = ++used; return entry; }
    return null;
  }
  function draw(ctx, id, options = {}) {
    const record = get(id), state = options.state || 'idle';
    if (!ctx || !record) return { ok: false, reason: 'unknown-sprite' };
    if (!permitted(record, options.allowUnreviewed)) return { ok: false, reason: 'visual-review-required' };
    if (record.scope !== 'combatant-neutral-pose') return { ok: false, reason: 'contextual-illustration' };
    if (record.fullBodyReviewed !== true) return { ok: false, reason: 'full-body-not-reviewed' };
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
    cache.clear(); failures.clear();
  }
  let ready = initialize();
  root.RE_COMBAT_SPRITES_R28 = Object.freeze({ ready: () => ready, get, load, draw,
    list: () => [...records.values()], clear,
    setUnreviewedEnabled(value) { unreviewedEnabled = value === true; },
    retry() { failures.clear(); if (!status.loaded && active) ready = initialize(); return ready; },
    state: () => ({ ...status, active, loading, cached: [...cache.values()].filter(item => item.image).length,
      pending: [...cache.values()].filter(item => !item.image).length, errors: failures.size,
      unreviewedEnabled, limits, canonicalFidelityCertified: false, missingAnimationsSynthesized: 0 }) });
  // Existing rendering adapters read the stable R27 interface; both names expose the same bounded R28 resolver.
  root.RE_COMBAT_SPRITES_R27 = root.RE_COMBAT_SPRITES_R28;
  root.addEventListener?.('pagehide', () => { active = false; clear(); });
  root.addEventListener?.('pageshow', () => { active = true; if (!status.loaded) ready = initialize(); });
})(globalThis);
