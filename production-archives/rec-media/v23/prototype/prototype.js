(function () {
  'use strict';
  const API = window.REC_ACCESS_V23, DATA = window.REC_ACCESS_DEMO;
  const $ = id => document.getElementById(id);
  const labels = { character: 'Personnage', costume: 'Costume', stage: 'Stage', mode: 'Mode' };
  const discoveryLabels = { secret: 'Secret', hint: 'Indice révélé', identified: 'Identifié' };
  const accessLabels = { permanent: 'Acquisition permanente', temporary: 'Accès temporaire actif', claimable: 'Récompense disponible', pending: 'Vérification requise', expired: 'Accès temporaire terminé', revoked: 'Source de droit retirée', none: 'À débloquer' };
  const technicalLabels = { ready: 'Prêt dans cette simulation', missing: 'Installation nécessaire', update: 'Mise à jour nécessaire', error: 'Contenu indisponible', pending: 'Chargement à terminer' };
  let demo = DATA.createScenario('arrival'), filter = 'all', active = null;
  const selection = API.createSelectionController(renderSelectionState);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function resolved(id) {
    const content = DATA.catalogue.find(item => item.id === id);
    return content ? API.resolveSlot(content, demo.profile, demo.context, DATA.catalogue) : null;
  }
  function status(result) {
    if (result.discovery === 'secret') return 'Identité classifiée';
    if (result.discovery === 'hint') return 'Indice révélé — dossier à compléter';
    if (result.access.state === 'claimable') return 'Récompense disponible — à réclamer';
    if (!result.access.granted) {
      if (result.access.reason === 'service-unavailable') return 'Service indisponible — vérification à reprendre';
      return accessLabels[result.access.state];
    }
    if (result.compatibility.includes('dependency')) return 'Acquis — personnage requis indisponible';
    if (result.technical !== 'ready') return 'Acquis — ' + technicalLabels[result.technical].toLocaleLowerCase('fr');
    if (result.compatibility.includes('duplicate')) return 'Déjà choisi dans cette équipe';
    if (result.compatibility.includes('mode')) return 'Indisponible dans ce mode';
    if (result.compatibility.length) return 'Dépendance à vérifier';
    return result.access.state === 'temporary' ? result.access.offlineCached ? 'Accès temporaire — justificatif hors ligne valide' : 'Accès temporaire actif' : 'Acquis — sélection autorisée';
  }
  function sealed() {
    const box = element('div', 'sealed'); box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i += 1) box.append(element('span'));
    return box;
  }
  function symbolicArt(category) {
    const box = element('div', 'token-art'); box.setAttribute('aria-hidden', 'true');
    box.append(element('span', '', category === 'stage' ? '▤' : category === 'mode' ? '◇' : '▱'));
    box.append(element('small', '', category === 'stage' ? 'ARCHIVE' : category === 'mode' ? 'ÉPREUVE' : 'APPARENCE'));
    return box;
  }
  function imageFor(result) {
    if (!result.view.image) return result.discovery === 'secret' ? sealed() : symbolicArt(result.category);
    const img = document.createElement('img'); img.src = result.view.image; img.alt = result.view.imageAlt;
    img.addEventListener('error', () => { const replacement = symbolicArt(result.category); replacement.setAttribute('aria-label', 'Aperçu indisponible'); replacement.removeAttribute('aria-hidden'); img.replaceWith(replacement); }, { once: true });
    return img;
  }
  function renderCatalogue(restoreFocus = null) {
    const list = $('slots'); list.replaceChildren();
    const items = DATA.catalogue.filter(item => filter === 'all' || item.category === filter);
    $('count').textContent = String(items.length).padStart(2, '0') + ' DOSSIERS';
    items.forEach(item => {
      const result = resolved(item.id), li = element('li');
      const button = element('button', 'slot ' + result.discovery);
      button.type = 'button'; button.dataset.slot = item.id;
      button.setAttribute('aria-pressed', String(active === item.id));
      button.setAttribute('aria-label', result.view.name + ' — ' + status(result));
      button.append(element('span', 'slot-no', 'ARCHIVE / ' + String(DATA.catalogue.indexOf(item) + 1).padStart(2, '0')));
      const art = element('span', 'slot-visual'); art.setAttribute('aria-hidden', 'true'); art.append(imageFor(result)); button.append(art);
      const copy = element('span', 'slot-copy');
      copy.append(element('span', 'slot-kind', labels[item.category]), element('span', 'slot-name', result.view.name), element('span', 'slot-state', status(result)));
      button.append(copy);
      button.addEventListener('focus', () => choose(item.id));
      button.addEventListener('click', () => choose(item.id));
      button.addEventListener('keydown', navigate);
      li.append(button); list.append(li);
    });
    if (restoreFocus) [...list.querySelectorAll('button')].find(button => button.dataset.slot === restoreFocus)?.focus({ preventScroll: true });
  }
  function navigate(event) {
    const buttons = [...$('slots').querySelectorAll('button')], index = buttons.indexOf(event.currentTarget);
    const columns = getComputedStyle($('slots')).gridTemplateColumns.split(' ').length;
    const next = { ArrowLeft: index - 1, ArrowRight: index + 1, ArrowUp: index - columns, ArrowDown: index + columns, Home: 0, End: buttons.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault(); buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus();
  }
  function renderRule(rule) {
    if (!rule?.valid) return element('p', 'rule-leaf', 'Condition non disponible.');
    if (rule.kind === 'all' || rule.kind === 'any') {
      const group = element('div', 'rule-group'); group.append(element('p', 'rule-label', rule.kind === 'all' ? 'TOUTES CES CONDITIONS — ET' : 'UNE DE CES CONDITIONS — OU'));
      rule.children.forEach(child => group.append(renderRule(child))); return group;
    }
    return element('p', 'rule-leaf ' + (rule.complete ? 'done' : ''), (rule.complete ? '✓ ' : '○ ') + rule.label + (rule.kind === 'counter' ? ' · ' + rule.current + ' / ' + rule.target : ''));
  }
  function renderDetails() {
    const result = resolved(active);
    if (!result) return;
    $('detail-title').textContent = result.view.name;
    $('detail-origin').textContent = result.view.origin;
    $('detail-status').textContent = status(result);
    $('detail-condition').textContent = result.view.condition;
    $('lore').textContent = result.view.lore;
    $('rule-progress').replaceChildren(...(result.rule ? [renderRule(result.rule)] : []));
    $('preview').className = 'preview ' + result.discovery;
    $('preview').replaceChildren(imageFor(result));
    $('claim').hidden = !(result.access.claimable && result.discovery === 'identified');
    $('confirm').hidden = !$('claim').hidden;
    $('confirm').disabled = false;
    $('confirm').textContent = result.actions.select ? 'Confirmer le choix' : 'Consulter les conditions';
    // A locked dossier still offers a working information action.
    $('confirm').dataset.canSelect = String(result.actions.select);
    const axes = $('axes'); axes.replaceChildren();
    const compatibilityText = result.compatibility.includes('dependency') ? 'Personnage requis indisponible' : result.compatibility.includes('duplicate') ? 'Doublon d’équipe interdit' : result.compatibility.includes('mode') ? 'Incompatible avec ce mode' : result.compatibility.length ? 'Dépendance à corriger' : 'Compatible';
    for (const [key, value] of [
      ['Découverte', discoveryLabels[result.discovery]],
      ['Droit d’accès', result.discovery === 'secret' ? 'Détails non révélés' : accessLabels[result.access.state]],
      ['Disponibilité', result.discovery === 'secret' ? 'Détails non révélés' : technicalLabels[result.technical]],
      ['Compatibilité', result.discovery === 'secret' ? 'Détails non révélés' : compatibilityText]
    ]) axes.append(element('dt', '', key), element('dd', '', value));
    $('permissions').textContent = result.discovery === 'secret' ? 'La fiche conserve un libellé neutre, y compris pour le lecteur d’écran.' : ['Aperçu : ' + (result.actions.preview ? 'oui' : 'non'), 'Choix : ' + (result.actions.select ? 'oui' : 'non'), 'Participation : ' + (result.actions.participate ? 'oui' : 'non'), 'Entraînement : ' + (result.actions.train ? 'oui' : 'non')].join(' · ');
    const fallback = API.resolveSavedChoice(demo.profile.preference, [DATA.ids.base], DATA.catalogue, demo.profile, demo.context);
    const preferred = resolved(fallback.preferredId);
    const effective = resolved(fallback.effectiveId);
    $('preference').textContent = result.category === 'costume' && preferred?.discovery === 'identified'
      ? 'Préférence conservée : ' + preferred.view.name + '. ' + (fallback.substituted ? effective ? 'Remplacement proposé : ' + effective.view.name + '.' : 'Une tenue accessible reste à choisir.' : 'Cette apparence reste disponible.') : '';
    const clock = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(demo.context.now);
    $('clock').textContent = 'Horloge d’essai : ' + clock + ' (Paris). ' + (demo.context.network === 'online' ? 'Justificatifs simulés.' : 'Service simulé indisponible.');
  }
  function choose(id, force = false) {
    if (!force && active === id && selection.state.id === id) return;
    active = id;
    for (const button of $('slots').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.slot === id));
    const result = resolved(id), token = selection.begin(id);
    renderDetails();
    if (!result.view.image) { selection.accept(token, id, null); return; }
    const img = new Image();
    img.onload = () => selection.accept(token, id, { url: result.view.image });
    img.onerror = () => selection.fail(token, id);
    img.src = result.view.image;
  }
  function renderSelectionState(state) {
    const phases = { idle: 'CONSULTATION', preselect: 'PRÉSÉLECTION', confirmed: 'CONFIRMÉ', deselected: 'RETIRÉ', blocked: 'CONDITIONS' };
    $('phase').textContent = phases[state.phase] || 'CONSULTATION';
    $('message').textContent = state.message;
  }
  function cancelPreview() {
    selection.cancel(); active = null;
    for (const button of $('slots').querySelectorAll('button')) button.setAttribute('aria-pressed', 'false');
    $('preview').className = 'preview'; $('preview').replaceChildren(sealed());
    $('detail-title').textContent = 'Choix retiré';
    $('detail-origin').textContent = 'Archives de sélection';
    $('detail-status').textContent = 'Consultez un autre dossier pour reprendre.';
    $('detail-condition').textContent = ''; $('lore').textContent = '';
    $('rule-progress').replaceChildren(); $('axes').replaceChildren();
    $('permissions').textContent = ''; $('preference').textContent = ''; $('clock').textContent = '';
    $('claim').hidden = true; $('confirm').hidden = false; $('confirm').disabled = true;
    $('confirm').textContent = 'Choisir un dossier';
  }
  function loadScenario(id) {
    selection.invalidate(); active = null;
    demo = DATA.createScenario(id);
    demo.context.revealSecrets = $('reveal').checked;
    $('mode').value = demo.context.mode; $('scenario').value = demo.scenario.id;
    filter = 'all'; document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    renderCatalogue(); choose(demo.scenario.focus, true);
  }
  function refreshContext() {
    const id = active || DATA.catalogue.find(item => filter === 'all' || item.category === filter)?.id;
    selection.invalidate(); renderCatalogue();
    if (id) choose(id, true);
  }
  for (const scenario of DATA.scenarios) { const option = element('option', '', scenario.name); option.value = scenario.id; $('scenario').append(option); }
  $('scenario').addEventListener('change', event => loadScenario(event.target.value));
  $('mode').addEventListener('change', event => { demo.context.mode = event.target.value; refreshContext(); });
  $('reveal').addEventListener('change', event => { demo.context.revealSecrets = event.target.checked; refreshContext(); });
  $('reduce').checked = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('reduce').addEventListener('change', event => document.body.classList.toggle('reduced', event.target.checked));
  $('reset').addEventListener('click', () => { $('reveal').checked = false; loadScenario('arrival'); });
  $('filters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]'); if (!button) return;
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderCatalogue();
    const first = DATA.catalogue.find(item => filter === 'all' || item.category === filter);
    if (first) choose(first.id);
  });
  $('confirm').addEventListener('click', () => {
    selection.confirm(id => { const item = resolved(id); return item.actions.select ? true : status(item) + '. ' + item.view.condition; });
  });
  $('claim').addEventListener('click', () => {
    const result = resolved(active);
    if (!result?.access.claimable || result.discovery !== 'identified') return;
    demo.grant(active, 'claim:' + active);
    // Award occurs before any presentation. Repeated clicks reuse an identical event id.
    const id = active; selection.invalidate(); renderCatalogue(); choose(id, true);
    selection.announce('Récompense attribuée une seule fois dans cette simulation.');
    $('confirm').focus({ preventScroll: true });
  });
  $('cancel').addEventListener('click', cancelPreview);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !event.repeat) { cancelPreview(); event.preventDefault(); } });
  window.addEventListener('pagehide', () => selection.invalidate());
  window.addEventListener('pageshow', event => { if (event.persisted && active) choose(active, true); });
  $('next-valid').addEventListener('click', () => {
    // Dependency resolution always needs the full catalogue, including hidden categories.
    const allValid = DATA.catalogue.filter(item => (filter === 'all' || item.category === filter) && resolved(item.id).actions.select).map(item => item.id);
    if (!allValid.length) { $('message').textContent = 'Aucun choix autorisé dans cette catégorie et ce contexte.'; return; }
    const next = allValid[(allValid.indexOf(active) + 1) % allValid.length];
    choose(next); [...$('slots').querySelectorAll('button')].find(button => button.dataset.slot === next)?.focus({ preventScroll: true });
  });
  loadScenario('arrival');
})();
