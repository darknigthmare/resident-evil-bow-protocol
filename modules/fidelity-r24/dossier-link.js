/* Install the source entry after the player shell has built its navigation. */
(function () {
  'use strict';
  const scriptURL = document.currentScript?.src;
  if (!scriptURL) return;
  const href = new URL('index.html', scriptURL).href;
  function install() {
    const header = document.querySelector('.global-header');
    if (!header) return;
    let link = document.getElementById('fidelityR23Link');
    if (!link) {
      link = document.createElement('a');
      link.id = 'fidelityR23Link';
      link.className = 'quiet-link';
    }
    link.href = href;
    link.textContent = 'Sources et chantiers';
    (header.querySelector('.r20-header-nav') || header).append(link);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once: true});
  else install();
})();
