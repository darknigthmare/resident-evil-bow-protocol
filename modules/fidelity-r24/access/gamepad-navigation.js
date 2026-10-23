/* Opt-in navigation for source-workbench HTML. Never attaches to combat input. */
(function (root) {
  'use strict';
  const doc = root.document, scope = doc?.querySelector('[data-r24-gamepad-root]');
  const host = doc?.querySelector('[data-r24-gamepad-ui]');
  if (!scope || !host || root.RE_WORKBENCH_GAMEPAD_R24) return;
  const available = typeof root.navigator?.getGamepads === 'function' && typeof root.RE_MENU_INPUT_R20?.create === 'function';
  host.hidden = !available;
  if (!available) return;
  const button = doc.createElement('button'); button.type = 'button'; button.className = 'r24-gamepad-toggle';
  button.textContent = 'Activer la navigation à la manette'; button.setAttribute('aria-pressed', 'false');
  const message = doc.createElement('p'); message.className = 'r24-gamepad-status'; message.setAttribute('role', 'status');
  message.textContent = 'Navigation facultative : croix directionnelle, A pour activer, B pour arrêter. Clavier et tactile restent disponibles.';
  host.append(button, message);
  const sampler = root.RE_MENU_INPUT_R20.create();
  let enabled = false, frame = 0, lastConnected = null;
  const visible = element => element.getClientRects().length > 0 && !element.disabled
    && !element.closest('[hidden],[inert],[aria-hidden="true"]');
  const targets = () => [...scope.querySelectorAll('a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex]')]
    .filter(element => !host.contains(element) && element.tabIndex >= 0 && visible(element));
  function stop(text = 'Navigation à la manette arrêtée. Clavier et tactile restent disponibles.', focus = false) {
    enabled = false; root.cancelAnimationFrame(frame); frame = 0; sampler.reset();
    button.textContent = 'Activer la navigation à la manette'; button.setAttribute('aria-pressed', 'false');
    message.textContent = text; if (focus) button.focus({preventScroll: true});
  }
  function move(direction) {
    const active = doc.activeElement, increment = ['down', 'right'].includes(direction) ? 1 : -1;
    if (['left', 'right'].includes(direction) && scope.contains(active) && visible(active)) {
      if (active.matches('input[type="range"]')) {
        increment > 0 ? active.stepUp() : active.stepDown();
        active.dispatchEvent(new Event('input', {bubbles: true})); return;
      }
      if (active.matches('select')) {
        const next = Math.max(0, Math.min(active.options.length - 1, active.selectedIndex + increment));
        if (next !== active.selectedIndex) { active.selectedIndex = next; active.dispatchEvent(new Event('change', {bubbles: true})); }
        return;
      }
    }
    const list = targets(); if (!list.length) return;
    const current = list.indexOf(active);
    const next = current < 0 ? (increment > 0 ? 0 : list.length - 1) : (current + increment + list.length) % list.length;
    list[next].focus(); list[next].scrollIntoView({block: 'nearest', inline: 'nearest'});
  }
  function activate() {
    const target = doc.activeElement;
    if (!scope.contains(target) || host.contains(target) || !visible(target)) return;
    if (target.matches('input,select,textarea')) {
      message.textContent = target.matches('input[type="range"],select')
        ? 'Gauche et droite ajustent cette commande. Haut et bas changent de commande.'
        : 'Utilisez le clavier ou le tactile pour saisir une valeur ou choisir un fichier.';
      return;
    }
    target.click();
  }
  function poll(now) {
    frame = 0; if (!enabled || doc.hidden) return;
    try {
      const pads = [...(root.navigator.getGamepads() || [])].filter(pad => pad && pad.connected !== false && pad.mapping === 'standard');
      if (lastConnected !== Boolean(pads.length)) {
        lastConnected = Boolean(pads.length);
        message.textContent = pads.length ? 'Relâchez les commandes avant de naviguer. B arrête la navigation.' : 'Aucune manette standard connectée. Clavier et tactile restent disponibles.';
      }
      const actions = sampler.sample(pads, now);
      if (actions.includes('back')) { stop(undefined, true); return; }
      for (const action of actions) {
        if (action === 'confirm') activate(); else move(action);
      }
    } catch {
      stop('La manette est indisponible dans ce document. Clavier et tactile restent disponibles.'); return;
    }
    if (enabled) frame = root.requestAnimationFrame(poll);
  }
  button.addEventListener('click', () => {
    if (enabled) { stop(); return; }
    enabled = true; lastConnected = null; sampler.reset(); button.setAttribute('aria-pressed', 'true');
    button.textContent = 'Arrêter la navigation à la manette';
    message.textContent = 'Relâchez les commandes avant de naviguer.';
    if (!doc.hidden) frame = root.requestAnimationFrame(poll);
  });
  doc.addEventListener('visibilitychange', () => {
    root.cancelAnimationFrame(frame); frame = 0; sampler.reset();
    if (!enabled) return;
    message.textContent = doc.hidden ? 'Navigation en pause pendant que la page est masquée.' : 'Relâchez les commandes avant de reprendre la navigation.';
    if (!doc.hidden) frame = root.requestAnimationFrame(poll);
  });
  root.addEventListener('pagehide', () => stop());
  root.RE_WORKBENCH_GAMEPAD_R24 = Object.freeze({state: () => ({enabled, polling: frame !== 0})});
})(window);
