/* A player's match setup: characters, then arena, then the existing combat controller. */
(function (root) {
  'use strict';
  const doc = root.document;
  if (!doc || root.RE_MATCH_SELECTION_R34 || !['http:', 'https:'].includes(root.location?.protocol) || root.location?.origin === 'null') return;
  const query = new root.URLSearchParams(root.location.search);
  if (query.get('dev') === '1' && query.get('selection') === 'direct') return;
  if (['arcade', 'battle', 'replay', 'academy', 'story55'].includes(query.get('embed')) || root.RE_COMBAT?.externalEmbed || root.frameElement?.dataset?.arcade === '1' || root.frameElement?.dataset?.story55 === '1') return;
  const main = !!doc.getElementById('selectScreen'), trial = doc.getElementById('trialSubject');
  const api = main ? root.RE_COMBAT : root.RE_CATALOG_DUEL;
  const stages = main ? api?.stages : root.RE_DATA?.stages;
  if (!api || !Array.isArray(stages) || !stages.length || !main && !trial) return;
  let phase = 'characters', selectedStage = stages.find(stage => stage.id === query.get('stage')) || stages[0];
  let confirmedPair = null, starting = false, active = true, focused = doc.hasFocus?.() ?? true, frame = null, menuBaseline = true;
  let starts = 0, stageVisits = 0, previousPads = new Map(), scanQueued = false, polling = false, menuPolls = 0;
  const navigator = root.navigator;
  const preparation = root.RE_SELECTION_PREPARE_R34;
  const getPads = preparation?.getPads || (typeof navigator?.getGamepads === 'function' ? navigator.getGamepads.bind(navigator) : () => []);
  const originalPadProperty = preparation ? preparation.originalPadProperty : navigator ? Object.getOwnPropertyDescriptor(navigator, 'getGamepads') : undefined;
  let waitingForNeutral = true, padMaskInstalled = false;
  function maskedGamepads() {
    if (phase !== 'combat' || !active || !focused || doc.hidden) return [];
    const pads = getPads();
    if (waitingForNeutral) {
      const held = [...pads].some(pad => pad?.connected && ([...pad.buttons].some(button => button.pressed || button.value > .5)
        || [...pad.axes].some(axis => Math.abs(axis) > .35)));
      if (held) return [];
      waitingForNeutral = false;
    }
    return pads;
  }
  function installPadMask() {
    if (!navigator || typeof navigator.getGamepads !== 'function') return true;
    try {
      Object.defineProperty(navigator, 'getGamepads', {value: maskedGamepads, configurable: originalPadProperty?.configurable ?? true,
        writable: originalPadProperty && 'writable' in originalPadProperty ? originalPadProperty.writable : true});
      padMaskInstalled = navigator.getGamepads === maskedGamepads; return padMaskInstalled;
    } catch {return false;}
  }
  function removePadMask() {
    if (!padMaskInstalled || navigator.getGamepads !== maskedGamepads) return;
    if (originalPadProperty) Object.defineProperty(navigator, 'getGamepads', originalPadProperty); else delete navigator.getGamepads;
    padMaskInstalled = false;
  }
  // Input belongs to the current screen. A/Start must be released before the old combat readers see it.
  if (!installPadMask()) return;
  const $ = id => doc.getElementById(id), cards = new Map();
  const stageId = value => stages.find(stage => stage.id === value) || null;
  const known = new Set((main ? api.fighters : root.RE_DATA.fighters).map(fighter => fighter.uid));
  const currentPair = () => main ? ['p1Portrait', 'p2Portrait'].map(id => $(id)?.dataset.reSpecimen || '') : [$('trialSubject').value, $('trialTarget').value];
  const validPair = pair => pair.length === 2 && pair.every(uid => known.has(uid));
  const button = (id, copy, primary = false) => {
    const node = doc.createElement('button'); node.id = id; node.type = 'button'; node.className = 'r34-flow-button' + (primary ? ' r34-flow-button-primary' : ''); node.textContent = copy; return node;
  };
  function header(id) {
    const node = doc.createElement('header'); node.className = 'r34-selection-header';
    const list = doc.createElement('ol'); list.className = 'r34-selection-steps'; list.setAttribute('aria-label', 'Préparation du combat');
    ['1 · PERSONNAGES', '2 · ARÈNE', '3 · COMBAT'].forEach((text, index) => {const item = doc.createElement('li'); item.textContent = text; item.dataset.r34Step = ['characters', 'stages', 'combat'][index]; list.append(item);});
    const heading = doc.createElement('h1'); heading.id = id;
    const pair = doc.createElement('p'); pair.className = 'r34-selection-pair';
    node.append(list, heading, pair); return {node, heading, pair};
  }
  const characterHeader = header('selectionHeadingR34'), arenaHeader = main ? header('stageHeadingR34') : null;
  const stagePage = doc.createElement('section'); stagePage.id = 'stageSelectionR34'; stagePage.className = 'r34-stage-page'; stagePage.hidden = true;
  stagePage.setAttribute('aria-labelledby', main ? 'stageHeadingR34' : 'selectionHeadingR34');
  if (arenaHeader) stagePage.append(arenaHeader.node);
  const stageContent = doc.createElement('div'); stageContent.className = 'r34-stage-content'; stagePage.append(stageContent);
  const tools = doc.createElement('div'); tools.className = 'r34-stage-tools';
  const searchLabel = doc.createElement('label'); searchLabel.textContent = 'RECHERCHER UNE ARÈNE';
  const search = doc.createElement('input'); search.id = 'stageSearchR34'; search.type = 'search'; search.autocomplete = 'off'; searchLabel.append(search);
  const episodeLabel = doc.createElement('label'); episodeLabel.textContent = 'ÉPISODE';
  const episode = doc.createElement('select'); episode.id = 'stageEpisodeR34'; episodeLabel.append(episode);
  for (const value of ['', ...new Set(stages.map(stage => stage.ep))]) {const option = doc.createElement('option'); option.value = value; option.textContent = value || 'TOUS LES ÉPISODES'; episode.append(option);}
  tools.append(searchLabel, episodeLabel);
  const grid = doc.createElement('div'); grid.id = 'stageGridR34'; grid.className = 'r34-stage-grid'; grid.setAttribute('role', 'radiogroup'); grid.setAttribute('aria-label', 'Arènes disponibles');
  const matches = doc.createElement('p'); matches.id = 'stageResultsR34'; matches.setAttribute('role', 'status'); matches.className = 'r34-flow-status';
  const hint = doc.createElement('p'); hint.textContent = 'Clavier : flèches pour choisir, Tab puis Entrée pour confirmer. Manette standard : croix pour choisir, Start pour valider, B pour revenir.';
  const footer = doc.createElement('div'); footer.className = 'r34-stage-footer';
  const back = button('stageBackR34', 'RETOUR'), start = button('stageConfirmR34', 'COMBATTRE', true);
  back.setAttribute('aria-label', 'Retour à la sélection des personnages'); start.setAttribute('aria-label', 'Confirmer l’arène et combattre');
  const selectedCopy = doc.createElement('p'); selectedCopy.id = 'selectedStageR34'; selectedCopy.setAttribute('aria-live', 'polite');
  footer.append(back, selectedCopy, start); stageContent.append(tools, matches, hint, grid, footer);
  const continueButton = main ? $('launch') : button('charactersConfirmR34', 'VALIDER LES PERSONNAGES →', true);
  const continueRow = doc.createElement('div'); continueRow.className = 'r34-continue-row';
  if (main) continueButton.textContent = 'VALIDER LES PERSONNAGES →'; else continueRow.append(continueButton);
  const returnButton = main ? null : button('combatSelectionR34', '← CHANGER LES PERSONNAGES');
  if (returnButton) returnButton.classList.add('r34-combat-return');
  const trialMain = trial?.closest('main'), firstHeading = trialMain?.querySelector('h1');
  if (main) {$('selectScreen').querySelector('.topbar').after(characterHeader.node); doc.body.append(stagePage);}
  else {trialMain.prepend(characterHeader.node); trialMain.append(continueRow, stagePage, returnButton);}
  doc.documentElement.classList.add('r34-flow-active', main ? 'r34-flow-main' : 'r34-flow-trial');
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function labelPair(pair) {
    const fighters = main ? api.fighters : root.RE_DATA.fighters;
    return pair.map((uid, index) => {const fighter = fighters.find(item => item.uid === uid); return 'J' + (index + 1) + ' · ' + (fighter?.name || uid);}).join('  /  ');
  }
  function updateHeaders() {
    for (const item of [characterHeader, arenaHeader].filter(Boolean)) {
      item.heading.textContent = phase === 'stages' ? 'CHOISISSEZ L’ARÈNE' : phase === 'combat' ? 'COMBAT' : 'CHOISISSEZ VOS PERSONNAGES';
      item.pair.textContent = phase === 'characters' ? 'Validez les deux personnages avant de choisir l’arène.' : labelPair(confirmedPair || currentPair());
      for (const step of item.node.querySelectorAll('[data-r34-step]')) {if (step.dataset.r34Step === phase) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');}
    }
  }
  function visible(node, show) {if (!node) return; node.hidden = !show; node.inert = !show;}
  function scan() {
    scanQueued = false; if (!active) return;
    if (main) {visible($('selectScreen'), phase === 'characters'); visible($('fightScreen'), phase === 'combat');}
    else {
      const sound = $('trialSoundPanel');
      for (const node of trialMain.children) {
        if ([characterHeader.node, stagePage, continueRow, returnButton].includes(node)) continue;
        if (node === firstHeading) {visible(node, false); continue;}
        const character = sound ? !!(node.compareDocumentPosition(sound) & root.Node.DOCUMENT_POSITION_FOLLOWING) : node.classList.contains('trial-form');
        visible(node, phase === (character ? 'characters' : 'combat'));
      }
      const stageLabel = $('trialStage')?.closest('label'); visible(stageLabel, false);
      visible(continueRow, phase === 'characters'); visible(returnButton, phase === 'combat');
    }
    visible(stagePage, phase === 'stages'); updateHeaders();
  }
  const observer = new root.MutationObserver(() => {if (!scanQueued) {scanQueued = true; root.queueMicrotask(scan);}});
  observer.observe(main ? $('selectScreen') : trialMain, {childList: true});
  function changePhase(value, focus) {
    phase = value; doc.documentElement.dataset.r34SelectionPhase = value; menuBaseline = true; waitingForNeutral = true; previousPads.clear(); scan();
    root.dispatchEvent(new root.CustomEvent('re:r34selectionphase', {detail: {phase, stage: selectedStage.id}}));
    focus?.focus?.({preventScroll: false});
    ensurePoll();
  }
  function selectStage(stage, moveFocus = false) {
    selectedStage = stage;
    for (const [id, card] of cards) {const chosen = id === stage.id; card.button.setAttribute('aria-checked', String(chosen)); card.button.tabIndex = chosen ? 0 : -1;}
    selectedCopy.textContent = 'ARÈNE · ' + stage.name + ' / ' + stage.ep;
    if (moveFocus) cards.get(stage.id)?.button.focus();
  }
  function drawCard(stage, canvas) {
    const ctx = canvas.getContext('2d'); if (!ctx || !root.RE_RENDERER?.drawStage) return;
    ctx.save(); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.scale(canvas.width / 1280, canvas.height / 720);
    try {root.RE_RENDERER.drawStage(ctx, stage, 0, 0, true);} finally {ctx.restore();}
  }
  function drawPreviews() {if (active && phase === 'stages') for (const [id, card] of cards) if (!card.button.hidden) drawCard(stageId(id), card.canvas);}
  function filterStages() {
    const needle = normalize(search.value); let total = 0;
    for (const stage of stages) {const card = cards.get(stage.id); const show = (!episode.value || stage.ep === episode.value) && (!needle || normalize(stage.name + ' ' + stage.ep + ' ' + stage.family).includes(needle)); card.button.hidden = !show; if (show) total++;}
    const selected = cards.get(selectedStage.id)?.button;
    const keyboardEntry = selected && !selected.hidden ? selected : [...cards.values()].find(card => !card.button.hidden)?.button;
    for (const card of cards.values()) card.button.tabIndex = card.button === keyboardEntry ? 0 : -1;
    matches.textContent = total ? total + ' arène' + (total > 1 ? 's disponibles.' : ' disponible.') : 'Aucune arène ne correspond à ces filtres.';
    drawPreviews();
  }
  for (const stage of stages) {
    const node = button('', '', false); node.removeAttribute('id'); node.className = 'r34-stage-card'; node.dataset.r34Stage = stage.id; node.setAttribute('role', 'radio');
    const canvas = doc.createElement('canvas'); canvas.width = 256; canvas.height = 144; canvas.setAttribute('aria-hidden', 'true');
    const name = doc.createElement('strong'); name.textContent = stage.name;
    const detail = doc.createElement('small'); detail.textContent = stage.ep + (stage.weather ? ' · ' + stage.weather : '');
    node.append(canvas, name, detail); node.addEventListener('click', () => selectStage(stage)); grid.append(node); cards.set(stage.id, {button: node, canvas});
  }
  function goStages() {
    if (phase !== 'characters' || starting) return false;
    const pair = currentPair(); if (!validPair(pair)) return false;
    confirmedPair = [...pair]; stageVisits++; api.closeTech?.(false);
    if (main && !$('finishers46')?.classList.contains('hidden')) $('finishClose46')?.click();
    selectStage(selectedStage); changePhase('stages'); filterStages();
    (stagePage.querySelector('[data-r34-stage][tabindex="0"]') || search).focus(); return true;
  }
  function goCharacters() {
    if (starting) return false;
    if (!main && phase === 'combat') api.reset(false);
    changePhase('characters', main ? $('slotP1') : $('trialSubject')); return true;
  }
  function confirmStage() {
    if (phase !== 'stages' || starting || !confirmedPair || !validPair(confirmedPair) || !stageId(selectedStage.id)) return false;
    starting = true; start.disabled = true;
    try {
      if (main) {
        changePhase('combat'); api.start(confirmedPair[0], confirmedPair[1], stages.indexOf(selectedStage), $('mode').value);
      } else {
        const selected = $('trialStage'); selected.value = selectedStage.id; selected.dispatchEvent(new root.Event('change', {bubbles: true}));
        changePhase('combat'); api.startPresented();
      }
      starts++; (main ? $('game') : $('trialCanvas'))?.focus?.(); return true;
    } catch (error) {changePhase('stages', start); selectedCopy.textContent = 'Le combat n’a pas pu démarrer : ' + error.message; return false;}
    finally {starting = false; start.disabled = false;}
  }
  continueButton.addEventListener('click', event => {event.preventDefault(); event.stopImmediatePropagation(); goStages();}, {capture: true});
  back.addEventListener('click', goCharacters); start.addEventListener('click', confirmStage); returnButton?.addEventListener('click', goCharacters);
  if (main) for (const id of ['leaveFight', 'resultSelect']) $(id)?.addEventListener('click', () => goCharacters());
  doc.addEventListener('click', event => {
    const node = event.target.closest?.('button');
    if (phase !== 'combat' && ['trialStart', 'trialPause', 'trialStep'].includes(node?.id)) {event.preventDefault(); event.stopImmediatePropagation(); if (node.id === 'trialStart') goStages();}
  }, {capture: true});
  search.addEventListener('input', filterStages); episode.addEventListener('change', filterStages);
  function moveStage(delta) {
    const available = [...cards.values()].filter(card => !card.button.hidden), current = available.findIndex(card => card.button === doc.activeElement);
    if (!available.length) return;
    const next = available[(Math.max(0, current) + delta + available.length) % available.length]; selectStage(stageId(next.button.dataset.r34Stage), true);
  }
  function interactive(scope) {return [...scope.querySelectorAll('button,a[href],input,select,summary')].filter(node => !node.disabled && node.tabIndex >= 0 && !node.closest('[hidden],[inert]') && node.getClientRects().length);}
  function navigate(direction) {
    const scope = phase === 'stages' ? stagePage : main ? $('selectScreen') : trialMain;
    const node = doc.activeElement;
    if (phase === 'stages' && node?.dataset?.r34Stage) {const columns = Math.max(1, root.getComputedStyle(grid).gridTemplateColumns.split(' ').length); moveStage(['left', 'up'].includes(direction) ? direction === 'up' ? -columns : -1 : direction === 'down' ? columns : 1); return;}
    if (node?.tagName === 'SELECT' && ['left', 'right'].includes(direction)) {
      const options = [...node.options].filter(item => !item.disabled); const index = options.indexOf(node.selectedOptions[0]);
      node.value = options[(index + (direction === 'right' ? 1 : -1) + options.length) % options.length]?.value || node.value; node.dispatchEvent(new root.Event('change', {bubbles: true})); return;
    }
    const nodes = interactive(scope); if (!nodes.length) return; const index = nodes.indexOf(node), delta = ['up', 'left'].includes(direction) ? -1 : 1;
    nodes[(index + delta + nodes.length) % nodes.length].focus();
  }
  root.addEventListener('keydown', event => {
    if (phase === 'combat' || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
    if (main && phase === 'characters' && ['tech45', 'finishers46'].some(id => !$(id)?.classList.contains('hidden'))) return;
    if (main && phase === 'characters' && ['F1', 'F2'].includes(event.code)) return;
    if (event.code === 'Escape') {event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat && phase === 'stages') goCharacters(); return;}
    if (phase === 'stages' && event.target?.dataset?.r34Stage && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
      event.preventDefault(); event.stopImmediatePropagation(); navigate(event.code.slice(5).toLowerCase()); return;
    }
    if (event.repeat && ['Enter', 'NumpadEnter', 'Space'].includes(event.code)) {event.preventDefault(); event.stopImmediatePropagation(); return;}
    if (!['BUTTON', 'A', 'SUMMARY', 'INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName) && !event.target?.isContentEditable) {
      event.stopImmediatePropagation(); if (['KeyP', 'KeyV', 'KeyB', 'Space'].includes(event.code)) event.preventDefault();
    }
  }, {capture: true});
  function ensurePoll() {if (active && phase !== 'combat' && focused && !doc.hidden && frame === null && !polling) frame = root.requestAnimationFrame(poll);}
  function poll() {
    frame = null; if (!active || phase === 'combat' || !focused || doc.hidden) return;
    polling = true; menuPolls++;
    if (phase !== 'combat' && focused && !doc.hidden) {
      let pads = []; try {pads = [...(getPads() || [])];} catch {}
      const next = new Map();
      for (const pad of pads) {
        if (!pad?.connected || pad.mapping !== 'standard') continue;
        const on = index => !!pad.buttons?.[index]?.pressed;
        const value = {up: on(12) || (pad.axes?.[1] || 0) < -.55, down: on(13) || (pad.axes?.[1] || 0) > .55,
          left: on(14) || (pad.axes?.[0] || 0) < -.55, right: on(15) || (pad.axes?.[0] || 0) > .55,
          confirm: on(0), advance: on(9), back: on(1)};
        const key = pad.index + ':' + pad.id, old = previousPads.get(key); next.set(key, value);
        if (menuBaseline || !old) continue;
        const edge = action => value[action] && !old[action];
        if (edge('back')) {if (phase === 'stages') goCharacters();}
        else if (edge('advance')) {if (phase === 'characters') goStages(); else if (phase === 'stages') confirmStage();}
        else if (edge('confirm')) {const node = doc.activeElement; if (node?.matches('button,a[href],summary') && !node.disabled && !node.closest('[hidden],[inert]')) node.click();}
        else for (const action of ['up', 'down', 'left', 'right']) if (edge(action)) {navigate(action); break;}
      }
      previousPads = next; menuBaseline = false;
    } else {menuBaseline = true; previousPads.clear();}
    polling = false; ensurePoll();
  }
  function suspend() {focused = false; menuBaseline = true; previousPads.clear();}
  root.addEventListener('blur', suspend); root.addEventListener('focus', () => {focused = doc.hasFocus?.() ?? true; menuBaseline = true; ensurePoll();});
  doc.addEventListener('visibilitychange', () => {if (doc.hidden) suspend(); else {focused = doc.hasFocus?.() ?? true; menuBaseline = true; ensurePoll();}});
  root.addEventListener('pagehide', () => {active = false; suspend(); observer.disconnect(); removePadMask(); if (frame !== null) root.cancelAnimationFrame(frame); frame = null;});
  root.addEventListener('pageshow', () => {if (!active) {active = true; focused = doc.hasFocus?.() ?? true; menuBaseline = true; waitingForNeutral = true; installPadMask(); observer.observe(main ? $('selectScreen') : trialMain, {childList: true}); scan(); drawPreviews(); ensurePoll();}});
  root.addEventListener('re:assetstatus', drawPreviews);
  root.RE_MATCH_SELECTION_R34 = Object.freeze({blocksCombatInput: () => phase !== 'combat',
    state: () => ({phase, selectedStage: selectedStage.id, confirmedPair: confirmedPair ? [...confirmedPair] : null,
      starts, stageVisits, active, selectedCharacters: currentPair(), stageCount: stages.length, padMaskInstalled,
      waitingForNeutral, menuPolls, gameStateChangedByPreview: false})});
  selectStage(selectedStage); changePhase('characters', main ? $('slotP1') : $('trialSubject')); filterStages(); ensurePoll();
  preparation?.finish();
})(globalThis);
