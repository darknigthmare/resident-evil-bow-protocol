/* Discoverable R33 routes; R19 controls and the published R31 recovery link stay intact. */
(function (root) {'use strict';
  const doc = root.document;
  if (!doc || root.location?.origin === 'null' || !['http:', 'https:'].includes(root.location?.protocol)) return;
  function mount() {
    const anchor = doc.getElementById('saveStatus');
    if (!anchor || doc.getElementById('selectiveRecoveryR33')) return;
    const section = doc.createElement('section'), heading = doc.createElement('h2'), description = doc.createElement('p'), restore = doc.createElement('a'), replays = doc.createElement('a');
    section.id = 'selectiveRecoveryR33'; heading.id = 'selectiveRecoveryHeadingR33'; section.setAttribute('aria-labelledby', heading.id);
    heading.textContent = 'Reprise sélective et replays';
    description.textContent = 'Reprenez ou annulez les groupes choisis en conservant les progrès réalisés ailleurs. Vérifiez aussi plusieurs replays, y compris les combats avec évolutions.';
    restore.id = 'restoreResumeR33'; restore.href = new URL('modules/fidelity-r33/persistence/index.html', root.location.href).href; restore.textContent = 'RESTAURER LES GROUPES CHOISIS';
    replays.id = 'replayBatchR33'; replays.href = new URL('modules/fidelity-r33/replay/index.html', root.location.href).href; replays.textContent = 'VÉRIFIER PLUSIEURS REPLAYS';
    const actions = doc.createElement('p'); actions.append(restore, doc.createElement('br'), replays); section.append(heading, description, actions); anchor.before(section);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount, {once: true}); else mount();
})(globalThis);
