/* R31: explicit workstream ownership, actual partial deliveries and retained criteria. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const names = {sprites: 'Agent sprites', motion: 'Agent animations et commandes', canonical: 'Agent preuves canoniques',
    persistence: 'Agent sauvegardes et replays', audio: 'Agent audio', validation: 'Intégration, accès et performances', tracking: 'Agent Excel et recette'};
  let data, controller;
  function element(tag, text, className) {
    const node = document.createElement(tag); if (text != null) node.textContent = String(text); if (className) node.className = className; return node;
  }
  function link(item) {
    if (typeof item.href !== 'string' || typeof item.label !== 'string') throw Error('Lien de suivi invalide.');
    const root = new URL('../../', location.href), url = new URL(item.href, location.href);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname) || !/\/(?:modules|docs)\//.test(url.pathname)) throw Error('Lien de suivi invalide.');
    const node = element('a', item.label); node.href = url.href; return node;
  }
  function render() {
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = normalize($('search').value).trim(), category = $('category').value, owner = $('owner').value;
    const tasks = data.tasks.filter(task => (category === 'all' || task.category === category) && (owner === 'all' || task.lotId === owner)
      && normalize([task.id, task.title, task.owner, task.lotId, ...task.advances, ...task.remaining].join(' ')).includes(query));
    const fragment = document.createDocumentFragment();
    for (const task of tasks) {
      const card = element('article', null, 'task'); card.dataset.taskId = task.id; card.dataset.owner = task.owner; card.dataset.lotId = task.lotId;
      card.append(element('span', task.id, 'task-id'), element('h3', task.title), element('span', task.status, 'status'),
        element('span', (names[task.lotId] || task.owner) + ' · ' + task.deliveryState, 'r31-owner'));
      const advances = element('ul'); for (const text of task.advances) advances.append(element('li', text)); card.append(advances);
      const details = element('details'), remaining = element('ul', null, 'remaining');
      for (const text of task.remaining) remaining.append(element('li', text)); details.append(element('summary', 'Reste à réaliser'), remaining); card.append(details);
      const proofs = element('div', null, 'task-links'); for (const proof of task.evidence) proofs.append(link(proof)); card.append(proofs); fragment.append(card);
    }
    $('tasks').replaceChildren(fragment); $('resultCount').textContent = tasks.length + ' chantier' + (tasks.length > 1 ? 's' : '') + ' sur 17';
  }
  function validate(value) {
    if (value.schema !== 're.bow.fidelity-progress/1' || value.release !== 'R31' || !Array.isArray(value.tasks) || value.tasks.length !== 17
        || new Set(value.tasks.map(item => item.id)).size !== 17 || !Array.isArray(value.statistics) || !Array.isArray(value.resources)) throw Error('Le suivi reçu est incomplet.');
    for (const task of value.tasks) {
      if (!/^[A-Z0-9-]+$/.test(task.id) || typeof task.title !== 'string' || task.status !== 'EN COURS' || !names[task.lotId]
          || typeof task.owner !== 'string' || !['EN ATTENTE', 'LIVRÉ PARTIEL'].includes(task.deliveryState)
          || !['sources', 'functions', 'validation'].includes(task.category) || !Array.isArray(task.advances)
          || !Array.isArray(task.remaining) || !task.remaining.length || !Array.isArray(task.evidence)) throw Error('Un chantier du suivi est invalide.');
      task.evidence.forEach(link);
    }
    value.resources.forEach(link); return value;
  }
  async function load() {
    controller?.abort(); controller = new AbortController(); $('retry').hidden = true; $('loadStatus').textContent = 'Chargement du suivi…';
    try {
      const response = await fetch('progress.json', {signal: controller.signal});
      const maximum = 768 * 1024;
      if (!response.ok || Number(response.headers.get('content-length')) > maximum || !response.body?.getReader) throw Error('Le suivi est indisponible.');
      const reader = response.body.getReader(), chunks = []; let length = 0;
      try {for (;;) {const part = await reader.read(); if (part.done) break; length += part.value.byteLength;
        if (length > maximum) throw Error('Le suivi dépasse sa limite.'); chunks.push(part.value);}}
      catch (error) {await reader.cancel().catch(() => {}); throw error;} finally {reader.releaseLock();}
      const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength;}
      const next = validate(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes))); if (controller.signal.aborted) return; data = next;
      $('statistics').replaceChildren(...data.statistics.map(item => {const node = element('div', null, 'stat'); node.append(element('strong', item.value), element('span', item.label)); return node;}));
      $('resources').replaceChildren(...data.resources.map(item => {const node = element('article', null, 'resource'); node.append(element('h3', item.title), element('p', item.description), link(item)); return node;}));
      const previous = $('owner').value; $('owner').replaceChildren(new Option('Tous les lots', 'all'), ...Object.entries(names).map(([id, label]) => new Option(label, id)));
      if ([...$('owner').options].some(item => item.value === previous)) $('owner').value = previous;
      for (const id of ['search', 'category', 'owner']) $(id).disabled = false;
      render(); $('loadStatus').textContent = data.summary;
    } catch (error) {
      if (error.name === 'AbortError') return;
      data = null; $('tasks').replaceChildren(); $('statistics').replaceChildren(); $('resources').replaceChildren();
      for (const id of ['search', 'category', 'owner']) $(id).disabled = true;
      $('loadStatus').textContent = error.message || 'Le suivi ne peut pas être chargé.'; $('retry').hidden = false;
    }
  }
  $('filters').addEventListener('submit', event => event.preventDefault());
  $('search').addEventListener('input', render); $('category').addEventListener('change', render); $('owner').addEventListener('change', render);
  $('retry').addEventListener('click', load); addEventListener('pagehide', () => controller?.abort());
  addEventListener('pageshow', event => {if (event.persisted && !data) load();}); load();
})();
