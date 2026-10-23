/* Keep source-frame controls reachable when an endpoint disables the focused button. */
(function (root) {
  'use strict';
  const doc = root.document;
  if (!doc || root.RE_FOCUS_RETENTION_R24) return;
  function install(container, fallback) {
    if (!container || !fallback || fallback.ownerDocument !== doc) return null;
    let pending = null;
    const cancel = () => { pending = null; };
    function restore() {
      if (!pending || doc.hidden || !doc.hasFocus() || fallback.disabled) return;
      if (doc.activeElement !== doc.body && doc.activeElement !== pending) return;
      const target = pending.disabled ? fallback : pending;
      pending = null; target.focus({preventScroll: true});
    }
    const leaving = event => {
      if (container.contains(event.target) && event.target.matches('button,input,select') && event.target.disabled) {
        pending = event.target; root.queueMicrotask(restore);
      }
    };
    const entering = event => { if (pending && event.target !== pending && event.target !== doc.body) cancel(); };
    const key = event => { if (['Tab', 'Escape'].includes(event.key)) cancel(); };
    const hidden = () => { if (doc.hidden) cancel(); };
    doc.addEventListener('focusout', leaving);
    doc.addEventListener('focusin', entering);
    doc.addEventListener('pointerdown', cancel, true);
    doc.addEventListener('keydown', key, true);
    doc.addEventListener('visibilitychange', hidden);
    root.addEventListener('blur', cancel);
    root.addEventListener('pagehide', cancel);
    const observer = new root.MutationObserver(() => {
      const active = doc.activeElement;
      // A browser may keep a newly disabled button focused until its next paint.
      if (!pending && container.contains(active) && active.matches('button,input,select') && active.disabled) pending = active;
      restore();
    });
    observer.observe(container, {subtree: true, attributes: true, attributeFilter: ['disabled']});
    return () => {
      cancel(); observer.disconnect();
      doc.removeEventListener('focusout', leaving); doc.removeEventListener('focusin', entering);
      doc.removeEventListener('pointerdown', cancel, true); doc.removeEventListener('keydown', key, true);
      doc.removeEventListener('visibilitychange', hidden); root.removeEventListener('blur', cancel); root.removeEventListener('pagehide', cancel);
    };
  }
  root.RE_FOCUS_RETENTION_R24 = Object.freeze({install});
  const legacy = doc.getElementById('controls'), position = doc.getElementById('position');
  if (legacy && position) install(legacy, position);
  for (const container of doc.querySelectorAll('[data-r24-focus-retention]')) {
    const named = container.getAttribute('data-r24-focus-fallback');
    const fallback = named ? doc.getElementById(named) : container.querySelector('[data-r24-focus-fallback]');
    install(container, fallback);
  }
})(window);
