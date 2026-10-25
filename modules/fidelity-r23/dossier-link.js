/* Add an entry to the source workbench without changing catalogue or combat state. */
(function () {
  'use strict';
  const header = document.querySelector('.global-header');
  if (!header || document.getElementById('fidelityR23Link')) return;
  const link = document.createElement('a');
  link.id = 'fidelityR23Link'; link.className = 'quiet-link';
  link.href = new URL('index.html', document.currentScript.src).href;
  link.textContent = 'SOURCES ET CHANTIERS'; header.append(link);
})();
