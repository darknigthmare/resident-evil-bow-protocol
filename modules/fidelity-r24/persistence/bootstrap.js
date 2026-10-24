/* Runs before any original engine script, inside an opaque-origin sandbox. */
(function () {
  'use strict';
  const config = Object.freeze({...document.currentScript.dataset});
  const values = new Map(), session = new Map(), operations = {reads: 0, writes: 0};
  function port(map) {
    return Object.freeze({get length() { return map.size; }, key(index) { return [...map.keys()][index] ?? null; }, getItem(key) { operations.reads++; return map.get(String(key)) ?? null; }, setItem(key, value) { operations.writes++; map.set(String(key), String(value)); }, removeItem(key) { operations.writes++; map.delete(String(key)); }, clear() { operations.writes++; map.clear(); }});
  }
  Object.defineProperty(window, 'localStorage', {get: () => port(values), configurable: false});
  Object.defineProperty(window, 'sessionStorage', {get: () => port(session), configurable: false});
  // The original deterministic tick API drives simulation; wall-clock frames
  // and audio cannot advance or sound in the background verifier.
  window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {};
  window.AudioContext = undefined; window.webkitAudioContext = undefined;
  if (config.rootUrl) window.RE_ASSET_BASE = new URL('src/', config.rootUrl).href;
  window.BOW_SANDBOX_R24 = Object.freeze({config, diagnostics: () => ({origin: window.origin, isolatedStorage: true, privateStorageKeys: values.size, operations: {...operations}, wallClockAnimationDisabled: true})});
})();
