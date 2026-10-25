/* Present measured progress without converting documentary references into completed work. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let data;
  function element(tag, value, className) {
    const node = document.createElement(tag);
    if (value != null) node.textContent = String(value);
    if (className) node.className = className;
    return node;
  }
  function link(item) {
    const url = new URL(item.href, location.href);
    const root = new URL('../../', location.href);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)
      || !/\/(?:modules|docs)\//.test(url.pathname)) throw Error('Lien de suivi invalide.');
    const node = element('a', item.label); node.href = url.href; return node;
  }
  function renderTasks() {
    const query = $('search').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const tasks = data.tasks.filter(task => ($('category').value === 'all' || task.category === $('category').value)
      && normalize([task.id, task.title, ...task.advances, ...task.remaining].join(' ')).includes(query));
    const fragment = document.createDocumentFragment();
    for (const task of tasks) {
      const card = element('article', null, 'task'); card.dataset.taskId = task.id;
      card.append(element('span', task.id, 'task-id'), element('h3', task.title), element('span', task.status, 'status'));
      const list = element('ul'); for (const advance of task.advances) list.append(element('li', advance));
      card.append(list);
      const remaining = element('details'), summary = element('summary', 'Reste à réaliser');
      const open = element('ul', null, 'remaining'); for (const item of task.remaining) open.append(element('li', item));
      remaining.append(summary, open); card.append(remaining);
      const links = element('div', null, 'task-links'); for (const item of task.evidence) links.append(link(item));
      card.append(links); fragment.append(card);
    }
    $('tasks').replaceChildren(fragment);
    $('resultCount').textContent = tasks.length + ' chantier' + (tasks.length > 1 ? 's' : '') + ' sur ' + data.tasks.length;
  }
  function validate(value) {
    if (value.schema !== 're.bow.fidelity-progress/1' || !Array.isArray(value.tasks) || value.tasks.length !== 17
      || new Set(value.tasks.map(t => t.id)).size !== 17 || !Array.isArray(value.statistics) || !Array.isArray(value.resources)) throw Error('Le suivi reçu est incomplet.');
    for (const task of value.tasks) {
      if (!/^[A-Z0-9-]+$/.test(task.id) || typeof task.title !== 'string' || task.status !== 'EN COURS'
        || !Array.isArray(task.advances) || !Array.isArray(task.remaining) || !Array.isArray(task.evidence)
        || !['sources', 'functions', 'validation'].includes(task.category)) throw Error('Un chantier du suivi est invalide.');
    }
    return value;
  }
  async function load() {
    $('retry').hidden = true; $('loadStatus').textContent = 'Chargement du suivi…';
    try {
      const response = await fetch('progress.json');
      if (!response.ok) throw Error('Le suivi est indisponible.');
      data = validate(await response.json());
      $('statistics').replaceChildren(...data.statistics.map(item => {
        const card = element('div', null, 'stat'); card.append(element('strong', item.value), element('span', item.label)); return card;
      }));
      $('resources').replaceChildren(...data.resources.map(item => {
        const card = element('article', null, 'resource'); card.append(element('h3', item.title), element('p', item.description), link(item)); return card;
      }));
      $('search').disabled = false; $('category').disabled = false;
      renderTasks(); $('loadStatus').textContent = data.summary;
    } catch (error) {
      $('loadStatus').textContent = error.message || 'Le suivi ne peut pas être chargé.';
      $('retry').hidden = false;
    }
  }
  $('filters').addEventListener('submit', event => event.preventDefault());
  $('search').addEventListener('input', renderTasks); $('category').addEventListener('change', renderTasks);
  $('retry').addEventListener('click', load); load();
})();
