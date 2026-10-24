/* Keep keyboard position when native transport controls temporarily buffer. */
(function (root) {
  'use strict';
  const doc = root.document;
  const controls = ['previousFrame', 'playToggle', 'nextFrame', 'restart', 'framePosition']
    .map(id => doc?.getElementById(id)).filter(Boolean);
  if (controls.length !== 5 || typeof root.MutationObserver !== 'function') return;
  const owned = new Set(controls);
  let pending = null;
  doc.addEventListener('focusout', event => {
    if (owned.has(event.target) && event.target.disabled) pending = event.target;
  });
  doc.addEventListener('focusin', event => {
    if (pending && event.target !== pending && event.target !== doc.body) pending = null;
  });
  const cancel = () => { pending = null; };
  doc.addEventListener('keydown', event => { if (['Tab', 'Escape'].includes(event.key)) cancel(); }, true);
  doc.addEventListener('pointerdown', cancel, true);
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) cancel(); });
  root.addEventListener('pagehide', cancel);
  const observer = new root.MutationObserver(() => {
    if (!pending || doc.hidden || doc.activeElement !== doc.body) return;
    // framePosition becomes enabled only after the entire seek is ready.
    const position = doc.getElementById('framePosition');
    if (position.disabled) return;
    const target = pending.disabled ? position : pending;
    pending = null; target.focus({preventScroll: true});
  });
  for (const control of controls) observer.observe(control, {attributes: true, attributeFilter: ['disabled']});
})(window);
