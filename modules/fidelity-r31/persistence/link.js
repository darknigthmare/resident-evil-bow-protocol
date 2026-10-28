/* Add a discoverable recovery route without changing the R19 save implementation. */
(function (root) {'use strict'; const doc = root.document; if (!doc || root.location?.origin === 'null' || !['http:', 'https:'].includes(root.location?.protocol)) return;
function mount() {const heading = doc.querySelector('main h1'); if (!heading || doc.getElementById('restoreResumeR31')) return; const link = doc.createElement('a'); link.id = 'restoreResumeR31'; link.href = new URL('modules/fidelity-r31/persistence/index.html', root.location.href).href; link.textContent = 'RESTAURER AVEC REPRISE ET RETOUR'; heading.after(link);}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount, {once: true}); else mount();})(globalThis);
