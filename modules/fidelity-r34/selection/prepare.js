/* Own setup input before deferred readers/controllers finish loading. No combat is started here. */
(function (root) {
  'use strict';
  const doc = root.document, query = new root.URLSearchParams(root.location?.search || '');
  if (!doc || root.RE_SELECTION_PREPARE_R34 || !['http:', 'https:'].includes(root.location?.protocol)
      || root.location?.origin === 'null' || query.get('dev') === '1' && query.get('selection') === 'direct'
      || ['arcade', 'battle', 'replay', 'academy', 'story55'].includes(query.get('embed'))
      || root.frameElement?.dataset?.arcade === '1' || root.frameElement?.dataset?.story55 === '1') return;
  const nav = root.navigator, getPads = typeof nav?.getGamepads === 'function' ? nav.getGamepads.bind(nav) : () => [];
  const original = nav ? Object.getOwnPropertyDescriptor(nav, 'getGamepads') : undefined;
  let pending = true, installed = false, active = false;
  const mask = () => pending ? [] : getPads();
  const blockedIds = new Set(['launch', 'trialStart', 'trialPause', 'trialStep', 'practice45', 'confirm45', 'link45', 'nextStage', 'mobileStage', 'openGallery']);
  function click(event) {
    if (pending && blockedIds.has(event.target?.closest?.('button')?.id)) {event.preventDefault(); event.stopImmediatePropagation();}
  }
  function key(event) {
    if (!pending || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
    if (!event.target?.matches?.('input,select,textarea,[contenteditable="true"]')) {
      if (['KeyP', 'KeyV', 'KeyB', 'Escape', 'F1', 'F2'].includes(event.code) || ['Enter', 'NumpadEnter', 'Space'].includes(event.code) && blockedIds.has(event.target?.id)) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }
  }
  function install() {
    if (!pending || active) return; active = true;
    doc.documentElement.dataset.r34SelectionPreparing = 'true';
    if (nav && typeof nav.getGamepads === 'function') {
      try {Object.defineProperty(nav, 'getGamepads', {value: mask, configurable: original?.configurable ?? true,
        writable: original && 'writable' in original ? original.writable : true}); installed = nav.getGamepads === mask;} catch {installed = false;}
    }
    doc.addEventListener('click', click, {capture: true}); root.addEventListener('keydown', key, {capture: true});
  }
  function remove() {
    if (!active) return; active = false;
    doc.removeEventListener('click', click, {capture: true}); root.removeEventListener('keydown', key, {capture: true});
    if (installed && nav.getGamepads === mask) {if (original) Object.defineProperty(nav, 'getGamepads', original); else delete nav.getGamepads;}
    installed = false;
  }
  function finish() {
    pending = false; remove(); doc.documentElement.removeAttribute('data-r34-selection-preparing');
    root.removeEventListener('pagehide', remove); root.removeEventListener('pageshow', install);
  }
  root.RE_SELECTION_PREPARE_R34 = Object.freeze({getPads, originalPadProperty: original ? Object.freeze({...original}) : undefined,
    finish, state: () => ({pending, active, padMaskInstalled: installed})});
  install(); root.addEventListener('pagehide', remove); root.addEventListener('pageshow', install);
})(globalThis);
