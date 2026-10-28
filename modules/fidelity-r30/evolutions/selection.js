/* R30 selection: explicit base/form groups, normal HTTP documents only. */
(function (root) {
  'use strict';
  const doc = root.document, data = root.RE_EVOLUTION_DATA_R28;
  if (!doc || !data || root.RE_EVOLUTION_SELECTION_R28) return;
  // Opaque srcdoc replay frames must only reconstruct their preserved engine.
  // They have no navigable document URL and must never mount game launchers.
  if (root.location?.origin === 'null' || !['http:', 'https:'].includes(root.location?.protocol)) return;
  const families = Array.isArray(data.families) ? data.families : [];
  const contextOnly = new Set(data.contextOnlyUids || []);
  const members = family => [...new Set([family.baseUid, ...(family.forms || [])])];
  function groupSelect(select) {
    if (!select || select.tagName !== 'SELECT') return 0;
    const value = select.value, options = new Map([...select.options].map(option => [option.value, option]));
    const consumed = new Set(), fragment = doc.createDocumentFragment();
    let groups = 0;
    for (const family of families) {
      const ids = members(family).filter(uid => options.has(uid) && !consumed.has(uid));
      if (ids.length < 2) continue;
      const group = doc.createElement('optgroup');
      group.label = family.label + (family.game ? ' · ' + family.game : '');
      group.dataset.familyId = family.id;
      for (const uid of ids) {
        const option = options.get(uid);
        option.dataset.baseUid = family.baseUid;
        group.append(option); consumed.add(uid);
      }
      fragment.append(group); groups++;
    }
    const rest = [...options].filter(([uid]) => !consumed.has(uid));
    if (groups && rest.length) {
      const group = doc.createElement('optgroup'); group.label = 'Autres personnages';
      for (const [, option] of rest) group.append(option);
      fragment.append(group);
    } else for (const [, option] of rest) fragment.append(option);
    select.replaceChildren(fragment);
    if (options.has(value)) select.value = value;
    return groups;
  }
  function targetUrl(uid, target, stage) {
    const nested = root.location.pathname.endsWith('/modules/versus.html');
    const contextUid = [uid, target].find(value => contextOnly.has(value));
    if (contextUid) {
      const dossier = new URL(nested ? '../codex.html' : 'codex.html', root.location.href);
      dossier.searchParams.set('id', contextUid); return dossier;
    }
    const url = new URL(nested ? 'fidelity-r30/evolutions/index.html' : 'modules/fidelity-r30/evolutions/index.html', root.location.href);
    if (uid) url.searchParams.set('uid', uid);
    if (target) url.searchParams.set('target', target);
    if (stage) url.searchParams.set('stage', stage);
    return url;
  }
  let mainPanel = null;
  function mainSelection() {
    const api = root.RE_COMBAT, holder = doc.querySelector('.roster-wrap');
    if (!api || !holder || api.externalEmbed || mainPanel) return;
    mainPanel = doc.createElement('div'); mainPanel.className = 'r28-form-selection';
    mainPanel.id = 'formSelectionR28';
    const label = doc.createElement('label'); label.htmlFor = 'formPickerR28'; label.textContent = 'PERSONNAGES ET FORMES';
    const select = doc.createElement('select'); select.id = 'formPickerR28';
    for (const fighter of api.fighters) {
      const option = doc.createElement('option'); option.value = fighter.uid;
      option.textContent = fighter.name + ' / ' + fighter.ep; select.append(option);
    }
    const grouped = groupSelect(select); label.append(select); mainPanel.append(label);
    const ids = () => ['p1Portrait', 'p2Portrait'].map(id => doc.getElementById(id)?.dataset.reSpecimen || '');
    const message = doc.createElement('span'); message.id = 'formSelectionStatusR28';
    message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
    for (const slot of [0, 1]) {
      const button = doc.createElement('button'); button.type = 'button'; button.id = 'formAssign' + slot + 'R28';
      button.textContent = 'CHOISIR J' + (slot + 1);
      button.addEventListener('click', () => {
        const selected = ids(); selected[slot] = select.value;
        if (selected.every(uid => api.fighters.some(fighter => fighter.uid === uid))) {
          api.select(...selected);
          message.textContent = 'J' + (slot + 1) + ' : ' + api.fighters.find(fighter => fighter.uid === select.value).name;
          updateLink();
        }
      });
      mainPanel.append(button);
    }
    const link = doc.createElement('a'); link.id = 'evolutionLaunchR28'; link.className = 'r28-evolution-link';
    link.textContent = 'COMBAT AVEC ÉVOLUTIONS';
    function updateLink() {
      const selected = ids(); link.href = targetUrl(selected[0], selected[1]).href;
      link.textContent = selected.some(uid => contextOnly.has(uid)) ? 'CONSULTER LA FORME DE RENCONTRE' : 'COMBAT AVEC ÉVOLUTIONS';
    }
    mainPanel.append(link, message); holder.classList.add('r28-roster-wrap'); holder.prepend(mainPanel); updateLink();
    const observer = new root.MutationObserver(updateLink);
    for (const id of ['p1Portrait', 'p2Portrait']) {
      const element = doc.getElementById(id);
      if (element) observer.observe(element, { attributes: true, attributeFilter: ['data-re-specimen'] });
    }
    root.addEventListener('pagehide', () => observer.disconnect());
    root.addEventListener('pageshow', () => {
      for (const id of ['p1Portrait', 'p2Portrait']) {
        const element = doc.getElementById(id);
        if (element) observer.observe(element, { attributes: true, attributeFilter: ['data-re-specimen'] });
      }
      updateLink();
    });
    mainPanel.dataset.familyGroups = String(grouped);
  }
  function classicDuel() {
    if (root.RE_EVOLUTION_REPLAY_R28 || !doc.getElementById('trialSubject')) return;
    const subject = doc.getElementById('trialSubject'), target = doc.getElementById('trialTarget'), stage = doc.getElementById('trialStage');
    groupSelect(subject); groupSelect(target);
    if (doc.getElementById('evolutionLaunchR28')) return;
    const holder = doc.createElement('p'); holder.className = 'r28-classic-launch';
    const link = doc.createElement('a'); link.id = 'evolutionLaunchR28'; link.className = 'r28-evolution-link';
    link.textContent = 'JOUER CE DUEL AVEC ÉVOLUTIONS';
    const update = () => {
      link.href = targetUrl(subject.value, target.value, stage?.value).href;
      link.textContent = [subject.value, target.value].some(uid => contextOnly.has(uid)) ? 'CONSULTER LA FORME DE RENCONTRE' : 'JOUER CE DUEL AVEC ÉVOLUTIONS';
    };
    for (const element of [subject, target, stage].filter(Boolean)) element.addEventListener('change', update);
    holder.append(link); doc.querySelector('.trial-form').after(holder); update();
  }
  root.RE_EVOLUTION_SELECTION_R30 = root.RE_EVOLUTION_SELECTION_R29 = root.RE_EVOLUTION_SELECTION_R28 = Object.freeze({ groupSelect, family: uid => families.find(family => members(family).includes(uid)) || null,
    state: () => ({ families: families.length, mainMounted: !!mainPanel, groupedOptions: mainPanel ? mainPanel.querySelector('select').options.length : 0 }) });
  function setup() { mainSelection(); classicDuel(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', setup, { once: true }); else setup();
})(globalThis);
