/* One decoded-pixel budget shared by the participating image readers. No game-state writes. */
(function (root) {
  'use strict';
  if (root.RE_IMAGE_BUDGET_R31) return;
  const limits = Object.freeze({pixels: 32 * 1024 * 1024, assets: 64, pending: 12});
  const entries = new Map(); let clock = 0, pixels = 0;
  const listeners = new Set(); let notificationPending = false;
  function available() {
    if (notificationPending) return; notificationPending = true;
    const defer = root.queueMicrotask || (callback => Promise.resolve().then(callback));
    defer(() => {notificationPending = false; for (const callback of listeners) {try {callback();} catch { /* A reader cannot block other readers. */ }}});
  }
  const counters = {reservations: 0, evictions: 0, refusals: 0, peakPixels: 0, peakAssets: 0};
  function remove(entry, evict, reason) {
    if (entries.get(entry.id) !== entry) return false;
    entries.delete(entry.id); pixels -= entry.pixels;
    if (evict) {counters.evictions++; try {entry.onEvict(reason);} catch { /* The reservation is still released. */ }}
    else available();
    return true;
  }
  function reserve(owner, key, count, onEvict) {
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(owner || '') || typeof key !== 'string' || !key || key.length > 2000
        || !Number.isSafeInteger(count) || count < 1 || count > limits.pixels || typeof onEvict !== 'function') return null;
    const id = owner + ':' + key;
    if (entries.has(id) || [...entries.values()].filter(entry => !entry.ready).length >= limits.pending) {counters.refusals++; return null;}
    const victims = [...entries.values()].filter(entry => entry.ready).sort((a, b) => a.used - b.used);
    while ((pixels + count > limits.pixels || entries.size >= limits.assets) && victims.length) remove(victims.shift(), true, 'pixel-budget');
    if (pixels + count > limits.pixels || entries.size >= limits.assets) {counters.refusals++; return null;}
    const entry = {id, owner, pixels: count, onEvict, ready: false, used: ++clock};
    const lease = Object.freeze({
      ready() {if (entries.get(id) !== entry) return false; entry.ready = true; entry.used = ++clock; return true;},
      touch() {if (entries.get(id) === entry) entry.used = ++clock;},
      release() {return remove(entry, false);}
    });
    entries.set(id, entry); pixels += count; counters.reservations++;
    counters.peakPixels = Math.max(counters.peakPixels, pixels); counters.peakAssets = Math.max(counters.peakAssets, entries.size);
    return lease;
  }
  function clear(reason = 'clear') {for (const entry of [...entries.values()]) remove(entry, true, reason); available();}
  function state() {
    const owners = Object.create(null), pending = [...entries.values()].filter(entry => !entry.ready);
    for (const entry of entries.values()) {
      if (!owners[entry.owner]) owners[entry.owner] = {pixels: 0, assets: 0, pending: 0};
      owners[entry.owner].pixels += entry.pixels; owners[entry.owner].assets++;
      if (!entry.ready) owners[entry.owner].pending++;
    }
    return {limits, ...counters, reservedPixels: pixels, estimatedRgbaBytes: pixels * 4, assets: entries.size,
      pending: pending.length, pendingPixels: pending.reduce((sum, entry) => sum + entry.pixels, 0), owners,
      scope: 'Participating generated poses, native atlases and selection portraits only; other canvases, engine art, GPU textures and browser allocations are unmeasured.',
      physicalDeviceCertified: false, globalMemoryCertified: false};
  }
  function subscribe(callback) {if (typeof callback !== 'function') throw Error('A capacity listener must be callable'); listeners.add(callback); return () => listeners.delete(callback);}
  root.RE_IMAGE_BUDGET_R31 = Object.freeze({reserve, clear, state, subscribe});
  root.addEventListener?.('pagehide', () => clear('pagehide'));
})(globalThis);
