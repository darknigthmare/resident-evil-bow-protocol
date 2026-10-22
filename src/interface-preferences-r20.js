/* Player-owned interface settings. Does not read or write combat/story saves. */
(function (root) {
  'use strict';
  const KEY = 're.bow.interface.r20';
  const defaults = Object.freeze({ version: 1, motion: 'system', contrast: 'standard', text: 'normal' });
  function normalize(value) {
    const v = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return { version: 1, motion: ['system', 'reduced', 'full'].includes(v.motion) ? v.motion : defaults.motion,
      contrast: ['standard', 'high'].includes(v.contrast) ? v.contrast : defaults.contrast,
      text: ['normal', 'large'].includes(v.text) ? v.text : defaults.text };
  }
  function read(storage) {
    try { const value = (storage || root.localStorage).getItem(KEY); return normalize(value ? JSON.parse(value) : null); }
    catch (_) { return { ...defaults }; }
  }
  let current = read();
  function apply(value = current) {
    current = normalize(value);
    const html = root.document?.documentElement;
    if (html) {
      const reduced = current.motion === 'reduced' || (current.motion === 'system' && !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      html.setAttribute('data-r20-motion', reduced ? 'reduced' : 'full');
      html.setAttribute('data-r20-contrast', current.contrast);
      html.setAttribute('data-r20-text', current.text);
    }
    return { ...current };
  }
  function save(value, storage) {
    const settings = apply(value);
    try { (storage || root.localStorage).setItem(KEY, JSON.stringify(settings)); return { settings, persisted: true }; }
    catch (_) { return { settings, persisted: false }; }
  }
  root.RE_INTERFACE_R20 = Object.freeze({ KEY, defaults, normalize, read, apply, save, get: () => ({ ...current }) });
  apply();
  root.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => apply());
  root.addEventListener?.('storage', event => { if (event.key === KEY || event.key === null) apply(read()); });
})(typeof window === 'undefined' ? globalThis : window);
