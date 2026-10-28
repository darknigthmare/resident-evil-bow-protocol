/* R30: verified native-derived frames; visual state only, separate from R29 generated poses. */
(function (root) {
  'use strict';
  if (root.RE_NATIVE_SPRITES_R30) return;
  const script = root.document?.currentScript?.src;
  if (!script || root.location?.origin === 'null' || typeof root.URL !== 'function') return;
  const repository = new URL('../../../', script);
  const indexURL = new URL('../native/manifest.json', script);
  const limits = Object.freeze({indexBytes: 65536, manifestBytes: 16 * 1024 * 1024,
    imageBytes: 8 * 1024 * 1024, imagePixels: 2048 * 2048, decodedPixels: 16 * 1024 * 1024,
    decodedImages: 32, concurrentImages: 4, queuedImages: 32, rememberedErrors: 32, entries: 2048, frames: 12000});
  const records = new Map(), subjects = new Map(), cache = new Map(), failures = new Map(), variants = new Map();
  const controllers = new Set(), queue = [];
  const known = new Set((root.RE_DATA?.catalog || []).map(item => item.id));
  let active = true, generation = 0, used = 0, loading = 0, initialization = null, initializationGeneration = -1;
  const status = {loaded: false, failed: false, lots: 0, errors: [], drawn: 0, staticDraws: 0, animatedDraws: 0};
  const integer = (value, low, high) => Number.isSafeInteger(value) && value >= low && value <= high;
  const hashPattern = /^[a-f0-9]{64}$/;
  function freeze(value) {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;}
  function local(value, extension = 'png') {
    if (typeof value !== 'string' || !value.startsWith('modules/fidelity-r30/native/')
        || !new RegExp('^[A-Za-z0-9_./-]+\\.' + extension + '$').test(value)
        || value.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Invalid native asset path');
    const url = new URL(value, repository);
    if (url.origin !== repository.origin || !url.pathname.startsWith(repository.pathname)) throw Error('Native asset leaves this checkout');
    return url.href;
  }
  async function bounded(response, maximum, expected, signal) {
    if (!response.ok || response.type === 'opaque') throw Error('Native source request failed');
    const declared = response.headers.get('content-length');
    if (declared !== null && (!integer(Number(declared), 0, maximum) || expected !== undefined && Number(declared) !== expected)) throw Error('Native source length differs');
    const reader = response.body?.getReader();
    if (!reader) throw Error('Bounded native source transport unavailable');
    const parts = []; let length = 0;
    try {
      for (;;) {
        if (signal.aborted) throw Error('Native source load cancelled');
        const part = await reader.read(); if (part.done) break;
        length += part.value.byteLength;
        if (length > maximum || expected !== undefined && length > expected) throw Error('Native source exceeds its declared limit');
        parts.push(part.value);
      }
    } catch (error) {await reader.cancel().catch(() => {}); throw error;}
    finally {reader.releaseLock();}
    if (expected !== undefined && length !== expected) throw Error('Native source truncated');
    const bytes = new Uint8Array(length); let offset = 0;
    for (const part of parts) {bytes.set(part, offset); offset += part.byteLength;} return bytes;
  }
  async function digest(bytes) {
    if (!root.crypto?.subtle) throw Error('Native source verification unavailable');
    return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  }
  async function request(record, maximum, signal) {
    const raw = await bounded(await root.fetch(local(record.path, 'json'), {signal, credentials: 'same-origin'}), maximum, record.bytes, signal);
    if (record.sha256 && await digest(raw) !== record.sha256) throw Error('Native manifest SHA-256 differs');
    return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw));
  }
  function rectangle(value, width, height) {
    return value && integer(value.x, 0, width - 1) && integer(value.y, 0, height - 1)
      && integer(value.width, 1, width - value.x) && integer(value.height, 1, height - value.y);
  }
  function imageRecord(value) {
    if (!value || !integer(value.width, 2, 2048) || !integer(value.height, 2, 2048)
        || value.width * value.height > limits.imagePixels || !integer(value.bytes, 1, limits.imageBytes)
        || !hashPattern.test(value.sha256 || '')) throw Error('Invalid native PNG description');
    local(value.path); return value;
  }
  function normalize(value) {
    const item = JSON.parse(JSON.stringify(value));
    if (!/^[a-z0-9][a-zA-Z0-9_-]{0,199}$/.test(item.id || '') || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.subjectId || '')
        || known.size && !known.has(item.subjectId) || !['native-static-pose', 'native-sequence'].includes(item.kind)
        || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 300
        || typeof item.sourceEdition !== 'string' || !item.sourceEdition.trim() || item.sourceEdition.length > 1000
        || typeof item.admittedTargetEdition !== 'boolean' || item.canMirror !== false
        || !['left', 'right', 'front', 'unknown'].includes(item.sourceFacing)
        || item.canonicalFidelityCertified !== false || item.originalGameFrames !== false
        || !Array.isArray(item.frames) || !integer(item.frames.length, 1, limits.frames)
        || !Array.isArray(item.admittedCombatStates) || item.admittedCombatStates.some(state => state !== 'idle')
        || item.admittedCombatStates.length > 1) throw Error('Invalid native 2D record');
    const gaps = item.knownAppearanceGaps || [];
    if (!Array.isArray(gaps) || gaps.length > 64 || gaps.some(value => typeof value !== 'string' || !value.trim() || value.length > 2000)) throw Error('Invalid native appearance gaps');
    item.knownAppearanceGaps = gaps;
    let previous = -1;
    for (const frame of item.frames) {
      imageRecord(frame);
      if (!Number.isFinite(frame.seconds) || frame.seconds < 0 || frame.seconds <= previous) throw Error('Invalid native sample timeline');
      previous = frame.seconds;
      if (frame.bounds === undefined && frame.alphaBounds) frame.bounds = frame.alphaBounds;
      if (!rectangle(frame.bounds, frame.width, frame.height)) throw Error('Invalid native alpha bounds');
      if (frame.atlas) {
        imageRecord(frame.atlas);
        if (!rectangle(frame.rect, frame.atlas.width, frame.atlas.height) || frame.rect.width !== frame.width || frame.rect.height !== frame.height) throw Error('Invalid native atlas cell');
      }
    }
    const first = item.frames[0];
    if (item.frames.some(frame => frame.width !== first.width || frame.height !== first.height)
        || !rectangle(item.referenceBounds, first.width, first.height)
        || !item.pivot || !Number.isFinite(item.pivot.x) || !Number.isFinite(item.pivot.y)
        || item.pivot.x < 0 || item.pivot.x > first.width || item.pivot.y < 0 || item.pivot.y > first.height) throw Error('Native sequence framing is not fixed');
    if (item.kind === 'native-static-pose' && item.frames.length !== 1) throw Error('Static source pose has multiple frames');
    if (item.kind === 'native-sequence') {
      if (!Number.isFinite(item.sampleRate) || item.sampleRate < 1 || item.sampleRate > 120
          || !Number.isFinite(item.durationSeconds) || item.durationSeconds <= 0 || item.durationSeconds > 120
          || item.frames.length < 2 || item.frames.at(-1).seconds - first.seconds > item.durationSeconds + 1e-6) throw Error('Invalid native sequence duration');
      for (let index = 1; index < item.frames.length; index++) {
        if (item.frames[index].seconds - item.frames[index - 1].seconds > 1 / item.sampleRate + 1e-5) throw Error('Native samples contain a timing gap');
      }
    }
    return freeze(item);
  }
  function baseQualified(item) {
    return item && item.fullBodyReviewed === true && item.fightingPoseReviewed === true
      && ['left', 'right'].includes(item.sourceFacing) && !item.knownAppearanceGaps.length;
  }
  function smooth(item) {
    return item.kind === 'native-sequence' && item.sampleRate >= 30 && item.fullNativeDuration === true
      && item.continuityVerified === true && item.frames.length >= Math.floor(item.durationSeconds * item.sampleRate) - 1;
  }
  function exactQualified(item) {
    return baseQualified(item) && item.admittedTargetEdition === true && item.admittedCombatStates.includes('idle')
      && (item.kind === 'native-static-pose' && item.actionIdentity === 'neutral-stance'
        || smooth(item) && item.actionIdentity === 'idle' && item.actionVerified === true);
  }
  function variantQualified(item) {
    return baseQualified(item) && smooth(item) && item.selectablePresentationVariant === true
      && typeof item.variantFamilyId === 'string' && /^[a-z0-9][a-z0-9-]{0,199}$/.test(item.variantFamilyId)
      && item.variantCombatStates?.length === 1 && item.variantCombatStates[0] === 'idle'
      && item.actionIdentity === 'observed-neutral-loop' && item.observedNeutralLoopReviewed === true
      && item.sourceActionCertified === false;
  }
  function publish() {
    if (!root.CustomEvent || !root.dispatchEvent) return;
    root.dispatchEvent(new root.CustomEvent('re:r30nativestatus', {detail: state()}));
    root.dispatchEvent(new root.CustomEvent('re:assetstatus', {detail: {source: 'r30-native-2d', loading, errors: failures.size}}));
  }
  async function initializeOnce() {
    const token = generation, controller = new root.AbortController(); controllers.add(controller);
    try {
      const indexPath = indexURL.pathname.slice(repository.pathname.length);
      const index = await request({path: indexPath}, limits.indexBytes, controller.signal);
      if (index.schema !== 're.bow.native-2d-index-r30/1' || index.release !== 'R30' || index.canonicalFidelityCertified !== false
          || !Array.isArray(index.lots) || !integer(index.lots.length, 1, 8)) throw Error('Invalid native 2D index');
      const next = new Map();
      for (const lot of index.lots) {
        if (!integer(lot.bytes, 1, limits.manifestBytes) || !hashPattern.test(lot.sha256 || '')) throw Error('Unbound native 2D lot');
        const manifest = await request(lot, limits.manifestBytes, controller.signal);
        if (manifest.schema !== 're.bow.native-2d-lot-r30/1' || manifest.release !== 'R30'
            || !Array.isArray(manifest.entries) || manifest.entries.length > limits.entries) throw Error('Invalid native 2D lot');
        for (const value of manifest.entries) {
          const item = normalize(value);
          if (next.has(item.id) || next.size >= limits.entries) throw Error('Duplicate or excessive native 2D entries');
          next.set(item.id, item);
        }
      }
      if (!active || token !== generation) return false;
      records.clear(); subjects.clear();
      for (const [id, item] of next) {
        records.set(id, item);
        if (!subjects.has(item.subjectId)) subjects.set(item.subjectId, []);
        subjects.get(item.subjectId).push(item);
      }
      status.loaded = true; status.failed = false; status.lots = index.lots.length; status.errors = [];
      publish(); return true;
    } catch (error) {
      if (active && token === generation) {status.failed = true; status.errors = [error.message]; publish();} return false;
    } finally {controllers.delete(controller);}
  }
  function initialize() {
    if (initialization && initializationGeneration === generation) return initialization;
    const task = initializeOnce(); initialization = task; initializationGeneration = generation;
    task.finally(() => {if (initialization === task) initialization = null;}); return task;
  }
  function get(id) {return records.get(String(id)) || subjects.get(String(id))?.[0] || null;}
  function list(id) {return id === undefined ? [...records.values()] : [...subjects.get(String(id)) || []];}
  function availableVariants(id) {
    const families = new Map();
    for (const item of list(id)) if (variantQualified(item)) families.set(item.variantFamilyId, freeze({id: item.variantFamilyId,
      label: item.variantLabel || item.label, sourceEdition: item.sourceEdition, sourceActionCertified: false,
      actionIdentity: 'observed-neutral-loop'}));
    return [...families.values()];
  }
  function selectVariant(id, familyId) {
    if (familyId === null || familyId === '') {variants.delete(String(id)); publish(); return true;}
    if (!availableVariants(id).some(value => value.id === familyId)) return false;
    variants.set(String(id), familyId); publish(); return true;
  }
  function resolve(id, options = {}) {
    const facing = options.facing === -1 || options.facing === 'left' ? 'left' : 'right';
    if ((options.state || 'idle') !== 'idle') return null;
    const selected = variants.get(String(id)), candidates = list(id).filter(item => item.sourceFacing === facing);
    return candidates.find(item => selected && item.variantFamilyId === selected && variantQualified(item))
      || candidates.find(exactQualified) || null;
  }
  function asset(frame) {return frame.atlas || frame;}
  function keyOf(record) {return record.path + ':' + record.sha256 + ':' + record.bytes;}
  function dispose(entry) {
    entry.controller?.abort(); if (entry.url) root.URL.revokeObjectURL(entry.url);
    entry.image?.removeAttribute?.('src'); entry.image = null; entry.url = null;
  }
  function trim(protectedKey) {
    const ready = [...cache.entries()].filter(([, entry]) => entry.image).sort((a, b) => a[1].used - b[1].used);
    let pixels = ready.reduce((sum, [, entry]) => sum + entry.record.width * entry.record.height, 0);
    let count = ready.length;
    for (const [key, entry] of ready) {
      if (count <= limits.decodedImages && pixels <= limits.decodedPixels) break;
      if (key === protectedKey) continue;
      cache.delete(key); pixels -= entry.record.width * entry.record.height; count--; dispose(entry);
    }
  }
  function pump() {
    while (active && loading < limits.concurrentImages && queue.length) {
      const entry = queue.shift(); loading++; const controller = new root.AbortController();
      controllers.add(controller); entry.controller = controller;
      const token = generation, record = entry.record, key = keyOf(record);
      (async () => {
        const raw = await bounded(await root.fetch(local(record.path), {signal: controller.signal, credentials: 'same-origin'}), limits.imageBytes, record.bytes, controller.signal);
        if (await digest(raw) !== record.sha256) throw Error('Native PNG SHA-256 differs');
        if (!active || token !== generation || controller.signal.aborted) throw Error('Native decode cancelled');
        entry.url = root.URL.createObjectURL(new Blob([raw], {type: 'image/png'}));
        const image = new root.Image();
        await new Promise((resolve, reject) => {
          image.onload = resolve; image.onerror = () => reject(Error('Native PNG decode failed'));
          controller.signal.addEventListener('abort', () => reject(Error('Native decode cancelled')), {once: true}); image.src = entry.url;
        });
        image.onload = image.onerror = null;
        if (!active || token !== generation || controller.signal.aborted || image.naturalWidth !== record.width || image.naturalHeight !== record.height) {
          image.removeAttribute?.('src'); throw Error('Native image dimensions differ or decode cancelled');
        }
        entry.image = image; entry.used = ++used; failures.delete(key); trim(key); entry.resolve(entry); publish();
      })().catch(error => {
        const cancelled = controller.signal.aborted || token !== generation;
        if (cache.get(key) === entry) cache.delete(key); dispose(entry);
        if (!cancelled && active) {
          failures.set(key, {time: Date.now(), message: error.message});
          while (failures.size > limits.rememberedErrors) failures.delete(failures.keys().next().value);
        }
        entry.reject(error); publish();
      }).finally(() => {controllers.delete(controller); loading--; pump();});
    }
  }
  function loadAsset(record) {
    if (!active || typeof root.Image !== 'function' || !root.crypto?.subtle) return Promise.reject(Error('Native decoder unavailable'));
    const key = keyOf(record), prior = cache.get(key);
    if (prior) {prior.used = ++used; return prior.promise;}
    const failed = failures.get(key);
    if (failed && Date.now() - failed.time < 15000) return Promise.reject(Error(failed.message));
    if (queue.length >= limits.queuedImages) return Promise.reject(Error('Native decoder queue full'));
    const entry = {record, used: ++used, image: null, url: null, controller: null, resolve: null, reject: null};
    entry.promise = new Promise((resolve, reject) => {entry.resolve = resolve; entry.reject = reject;});
    cache.set(key, entry); queue.push(entry); pump(); return entry.promise;
  }
  function frameIndex(item, seconds = 0, reduced = false) {
    if (item.kind === 'native-static-pose' || reduced) return 0;
    const first = item.frames[0].seconds;
    const elapsed = ((Math.max(0, seconds) % item.durationSeconds) + first);
    let low = 0, high = item.frames.length - 1;
    while (low < high) {const middle = Math.ceil((low + high) / 2); if (item.frames[middle].seconds <= elapsed + 1e-8) low = middle; else high = middle - 1;}
    return low;
  }
  function preload(id, options = {}) {
    const item = records.get(String(id));
    if (!item) return Promise.reject(Error('Unknown native sequence'));
    const index = Number.isSafeInteger(options.frame) ? Math.max(0, Math.min(item.frames.length - 1, options.frame)) : frameIndex(item, options.seconds || 0);
    const seen = new Map();
    const count = Math.min(item.frames.length, Math.max(1, Math.min(32, options.count || 16)));
    for (let offset = 0; offset < count; offset++) {const record = asset(item.frames[(index + offset) % item.frames.length]); seen.set(keyOf(record), record);}
    return Promise.all([...seen.values()].map(loadAsset));
  }
  function render(ctx, id, options = {}) {
    const item = records.get(String(id));
    if (!ctx || !item || !active) return {ok: false, reason: 'native-unavailable'};
    const animated = item.kind === 'native-sequence';
    if (animated && (!Number.isFinite(options.seconds) || options.seconds < 0)) return {ok: false, reason: 'deterministic-native-time-required'};
    const height = Number(options.height);
    if (!Number.isFinite(height) || height <= 0 || height > 8192 || !Number.isFinite(options.x) || !Number.isFinite(options.y)) return {ok: false, reason: 'invalid-native-placement'};
    const reduced = options.reducedMotion === true || options.respectReducedMotion !== false && !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const index = frameIndex(item, options.seconds || 0, reduced), frame = item.frames[index], source = asset(frame), key = keyOf(source);
    const entry = cache.get(key);
    preload(id, {frame: index, count: reduced ? 1 : 16}).catch(() => {});
    if (!entry?.image) return {ok: false, reason: 'native-not-ready'};
    entry.used = ++used;
    const scale = height / item.referenceBounds.height, rect = frame.rect || {x: 0, y: 0, width: frame.width, height: frame.height};
    ctx.save();
    try {
      if (options.clearCanvas === true && ctx.canvas) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(entry.image, rect.x, rect.y, rect.width, rect.height,
        options.x - item.pivot.x * scale, options.y - item.pivot.y * scale,
        frame.width * scale, frame.height * scale);
    } finally {ctx.restore();}
    status.drawn++; status[animated ? 'animatedDraws' : 'staticDraws']++;
    return {ok: true, origin: 'R30-native', id: item.id, frame: index, frames: item.frames.length, animated,
      reducedMotion: reduced, mirrored: false, canonicalFidelityCertified: false, originalGameSprite: false,
      sourceEdition: item.sourceEdition, sourceActionCertified: item.sourceActionCertified === true,
      actionIdentity: item.actionIdentity, presentationVariant: variants.get(item.subjectId) === item.variantFamilyId};
  }
  function draw(ctx, id, options = {}) {
    const item = resolve(id, options);
    if (!item) return {ok: false, reason: 'native-state-or-edition-not-admitted'};
    return render(ctx, item.id, options);
  }
  function clear() {
    generation++;
    for (const controller of controllers) controller.abort();
    for (const entry of queue.splice(0)) entry.reject(Error('Native source load cancelled'));
    for (const entry of cache.values()) dispose(entry); cache.clear(); failures.clear();
  }
  function state() {
    const ready = [...cache.values()].filter(entry => entry.image);
    return {...status, active, entries: records.size, subjects: subjects.size, selectedVariants: Object.fromEntries(variants),
      admittedStaticPoses: [...records.values()].filter(item => exactQualified(item) && item.kind === 'native-static-pose').length,
      admittedIdleSequences: [...records.values()].filter(item => exactQualified(item) && item.kind === 'native-sequence').length,
      optionalObservedNeutralSequences: [...records.values()].filter(variantQualified).length,
      loading, queued: queue.length, cached: ready.length, decodedPixels: ready.reduce((sum, entry) => sum + entry.record.width * entry.record.height, 0),
      errorsRemembered: failures.size, limits, canonicalFidelityCertified: false, generatedFramesSynthesized: 0};
  }
  let ready = initialize();
  root.RE_NATIVE_SPRITES_R30 = Object.freeze({ready: () => ready, initialize, get, list, resolve, draw, render, preload,
    availableVariants, selectVariant, selectedVariant: id => variants.get(String(id)) || null, clear, state,
    retry() {failures.clear(); if (!status.loaded && active) ready = initialize(); return ready;}});
  root.addEventListener?.('pagehide', () => {active = false; clear();});
  root.addEventListener?.('pageshow', () => {active = true; if (!status.loaded) ready = initialize();});
})(globalThis);
