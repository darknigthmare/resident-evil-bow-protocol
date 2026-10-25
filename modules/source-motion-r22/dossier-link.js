/* Add source-footage links for exact documented incarnations only. */
(function (root) {
  'use strict';
  const doc = root.document;
  if (!doc || typeof root.MutationObserver !== 'function' || typeof root.fetch !== 'function' || root.RE_SOURCE_DOSSIER_R22) return;
  const actions = doc.getElementById('detailActions');
  if (!actions) return;
  function specimen() {
    for (const anchor of actions.querySelectorAll('a[href]')) {
      try {
        const url = new URL(anchor.href, root.location.href);
        if (url.origin === root.location.origin && /\/modules\/versus\.html$/.test(url.pathname)) return url.searchParams.get('uid');
      } catch {}
    }
    return null;
  }
  function sync() {
    if (specimen() !== 're3r-nemesis' || actions.querySelector('[data-source-motion-r22]')) return;
    const link = doc.createElement('a');
    link.dataset.sourceMotionR22 = 're3r-nemesis-infection';
    link.textContent = 'VOIR UNE SÉQUENCE D’ORIGINE →';
    link.href = 'modules/source-motion-r22/index.html?clip=re3r-nemesis-infection';
    actions.append(link);
  }
  const observer = new root.MutationObserver(sync);
  observer.observe(actions, {childList: true});
  root.RE_SOURCE_DOSSIER_R22 = Object.freeze({sync});
  sync();
})(window);
