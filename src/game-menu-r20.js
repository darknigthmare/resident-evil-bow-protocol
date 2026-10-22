(function () {
  'use strict';
  const by = id => document.getElementById(id);
  const shell = by('gameShell'), boot = by('bootScreen'), transition = by('transitionScreen');
  const views = [...document.querySelectorAll('[data-view].menu-view')];
  const knownViews = new Set(views.map(view => view.dataset.view));
  const focusMemory = new Map();
  let activeView = 'home', frame = 0, alive = true, specimen = 0, imageRequest = 0;
  const pad = window.RE_MENU_INPUT_R20.create();
  const specimens = [
    { uid: 're2r-tyrant', name: 'TYRANT', origin: 'Resident Evil 2 · 2019', fallback: 'assets/specimens/re2r-tyrant.png' },
    { uid: 're2r-licker', name: 'LICKER', origin: 'Resident Evil 2 · 2019', fallback: 'assets/specimens/re2r-licker.png' },
    { uid: 're1r-hunter', name: 'HUNTER', origin: 'Resident Evil · 2002', fallback: 'assets/catalog/re1r-hunter.png' },
    { uid: 're3r-nemesis', name: 'NEMESIS', origin: 'Resident Evil 3 · 2020', fallback: 'assets/specimens/re3r-nemesis.webp' }
  ];
  function current() { return views.find(view => view.dataset.view === activeView); }
  function visibleControls(scope) {
    return [...scope.querySelectorAll('button:not(:disabled),a[href],select:not(:disabled),input:not(:disabled)')]
      .filter(node => !node.closest('[hidden],[inert]') && node.getClientRects().length);
  }
  function focus(node) { node?.focus({ preventScroll: true }); node?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }
  function description(node) {
    const value = node?.closest?.('[data-description]')?.dataset.description;
    if (value) by('menuDescription').textContent = value;
  }
  function showView(name, restore = false) {
    if (!knownViews.has(name)) name = 'home';
    if (current()?.contains(document.activeElement)) focusMemory.set(activeView, document.activeElement);
    activeView = name; shell.dataset.view = name;
    for (const view of views) view.hidden = view.dataset.view !== name;
    document.querySelector('.specimen-chamber').inert = name !== 'home';
    const target = restore && focusMemory.get(name)?.isConnected ? focusMemory.get(name) : visibleControls(current()).find(node => !node.hasAttribute('data-back')) || visibleControls(current())[0];
    if (boot.hidden) focus(target);
    try { history.replaceState(null, '', location.pathname + location.search + (name === 'home' ? '' : '#' + name)); } catch (_) {}
  }
  function back() { if (!boot.hidden || activeView === 'home') return; showView(activeView === 'controls' ? 'options' : 'home', true); }
  function enter() {
    boot.hidden = true; shell.inert = false;
    try { sessionStorage.setItem('re.bow.entered.r20', '1'); } catch (_) {}
    focus(visibleControls(current()).find(node => !node.hasAttribute('data-back')) || visibleControls(current())[0]);
  }
  function navigate(direction, fromPad = false) {
    if (!boot.hidden) { if (direction === 'confirm') enter(); return; }
    const node = document.activeElement;
    if (direction === 'back') { back(); return; }
    if (direction === 'confirm') {
      const target = current().contains(node) ? node : visibleControls(current())[0];
      if (target?.tagName === 'SELECT') return;
      if (target?.matches('a,button')) target.click();
      return;
    }
    if (fromPad && node?.tagName === 'SELECT' && ['left', 'right'].includes(direction)) {
      const total = node.options.length;
      node.selectedIndex = (node.selectedIndex + (direction === 'right' ? 1 : -1) + total) % total;
      node.dispatchEvent(new Event('change', { bubbles: true })); return;
    }
    if (direction === 'left' || direction === 'right') {
      if (activeView === 'home') changeSpecimen(direction === 'right' ? 1 : -1);
      return;
    }
    const nodes = visibleControls(current()), index = nodes.indexOf(node), sign = direction === 'up' ? -1 : 1;
    if (nodes.length) focus(nodes[(index < 0 ? (sign > 0 ? 0 : nodes.length - 1) : (index + sign + nodes.length) % nodes.length)]);
  }
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => showView(button.dataset.open)));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showView(button.dataset.back || 'home', true)));
  document.querySelectorAll('.menu-item').forEach(node => { node.addEventListener('focus', () => description(node)); node.addEventListener('pointerenter', () => description(node)); });
  by('enterProtocol').addEventListener('click', enter);
  document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyD') { event.preventDefault(); location.href = 'dev.html'; return; }
    if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
    if (!boot.hidden) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); enter(); }
      if (event.key === 'Tab') { event.preventDefault(); focus(by('enterProtocol')); }
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); back(); return; }
    if (event.key === 'Tab' && activeView !== 'home') {
      const nodes = visibleControls(current()), first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); focus(last); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); focus(first); }
      return;
    }
    if (event.target?.matches('select,input,textarea,[contenteditable="true"]')) return;
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); const nodes = visibleControls(current()); focus(event.key === 'Home' ? nodes[0] : nodes[nodes.length - 1]); return; }
    const direction = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' })[event.key];
    if (direction) { event.preventDefault(); navigate(direction); }
  });
  document.addEventListener('click', event => {
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || anchor.target || anchor.hasAttribute('download') || anchor.getAttribute('href').startsWith('#')) return;
    const destination = new URL(anchor.href, location.href);
    if (destination.origin === location.origin && destination.pathname.endsWith('.html')) transition.hidden = false;
  });
  const prefs = window.RE_INTERFACE_R20;
  function populateSettings() { const value = prefs.get(); for (const key of ['motion', 'contrast', 'text']) by(key + 'Setting').value = value[key]; }
  for (const key of ['motion', 'contrast', 'text']) by(key + 'Setting').addEventListener('change', () => {
    const result = prefs.save({ ...prefs.get(), [key]: by(key + 'Setting').value });
    by('optionsStatus').textContent = result.persisted ? 'Réglages enregistrés sur cet appareil.' : 'Réglages appliqués pour cette session. L’enregistrement sur cet appareil est indisponible.';
  });
  window.addEventListener('storage', event => { if (event.key === prefs.KEY || event.key === null) populateSettings(); });
  function fullscreenLabel() { const full = !!document.fullscreenElement; by('fullscreen').textContent = full ? 'QUITTER' : 'ACTIVER'; by('fullscreen').setAttribute('aria-pressed', String(full)); }
  by('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else throw Error('Unavailable');
      fullscreenLabel();
    } catch (_) { by('optionsStatus').textContent = 'Le plein écran n’est pas disponible dans cette fenêtre.'; }
  });
  document.addEventListener('fullscreenchange', fullscreenLabel);
  function changeSpecimen(delta) {
    specimen = (specimen + delta + specimens.length) % specimens.length;
    const subject = specimens[specimen], request = ++imageRequest, image = new Image();
    image.onload = () => {
      if (request !== imageRequest) return;
      by('menuSpecimen').src = image.src;
      by('menuSpecimen').alt = subject.name + ' — ' + subject.origin;
    };
    image.onerror = () => { image.onerror = null; image.src = subject.fallback; };
    image.src = window.BOWSpritesR20?.url(subject.uid) || subject.fallback;
    by('specimenName').textContent = subject.name;
    by('specimenOrigin').textContent = subject.origin;
    by('specimenIndex').textContent = String(specimen + 1).padStart(2, '0') + ' / ' + String(specimens.length).padStart(2, '0');
  }
  by('previousSpecimen').addEventListener('click', () => changeSpecimen(-1));
  by('nextSpecimen').addEventListener('click', () => changeSpecimen(1));
  function inputHints(kind) {
    const target = by('inputHints'); if (target.dataset.input === kind) return; target.dataset.input = kind;
    const hints = kind === 'pad' ? [['✚', 'PARCOURIR'], ['A / ✕', 'VALIDER'], ['B / ○', 'RETOUR']] : [['↑ ↓', 'PARCOURIR'], ['ENTRÉE', 'VALIDER'], ['ÉCHAP', 'RETOUR']];
    target.replaceChildren(...hints.map(([key, label]) => { const s = document.createElement('span'), k = document.createElement('kbd'); k.textContent = key; s.append(k, document.createTextNode(' ' + label)); return s; }));
  }
  window.addEventListener('keydown', () => inputHints('keyboard'));
  function tick(now) {
    frame = 0; if (!alive || document.hidden) return;
    let pads = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch (_) {}
    for (const action of pad.sample(pads, now)) { inputHints('pad'); navigate(action, true); }
    frame = requestAnimationFrame(tick);
  }
  function restart() { alive = true; pad.reset(); transition.hidden = true; if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }
  function suspend() { pad.reset(); cancelAnimationFrame(frame); frame = 0; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else restart(); });
  window.addEventListener('blur', suspend);
  window.addEventListener('focus', restart);
  window.addEventListener('pagehide', () => { alive = false; suspend(); });
  window.addEventListener('pageshow', restart);
  let entered = false;
  try { entered = sessionStorage.getItem('re.bow.entered.r20') === '1'; } catch (_) {}
  const deep = location.hash.slice(1), dev = new URLSearchParams(location.search).get('dev') === '1';
  boot.hidden = entered || knownViews.has(deep) || dev; shell.inert = !boot.hidden;
  showView(knownViews.has(deep) ? deep : 'home');
  if (!boot.hidden) focus(by('enterProtocol'));
  if (dev) { const link = document.createElement('a'); link.href = 'dev.html'; link.className = 'dev-access-r20'; link.textContent = 'TERMINAL DEV'; document.body.append(link); }
  populateSettings(); fullscreenLabel(); changeSpecimen(0); restart();
  window.RE_GAME_MENU_R20 = Object.freeze({ get view() { return activeView; }, showView, back });
})();
