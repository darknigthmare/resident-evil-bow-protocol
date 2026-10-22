(function (root) {
  'use strict';
  const E = root.RE_CATALOG_EXPANSION, $ = id => document.getElementById(id);
  const by = new Map(E.fighters.map(f => [f.uid, f])), PAGE = 18;
  const dev = root.RE_PLAYER_SHELL?.isDev === true;
  let page = 0;
  const plain = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const game of [...new Set(E.records.map(r => r.game))]) {
    const o = document.createElement('option'); o.value = game; o.textContent = game; $('catGame').append(o);
  }
  function anchor(text, url) {
    const a = document.createElement('a'); a.textContent = text;
    a.href = dev ? root.RE_PLAYER_SHELL.toTool(url) : url; return a;
  }
  function open(id) {
    const r = E.records.find(r => r.id === id); if (!r) return false;
    const f = by.get(id);
    $('catClass').textContent = dev ? (f ? 'COMBAT EXPÉRIMENTAL / HORS PROGRESSION' : 'RENCONTRE CONTEXTUELLE / EXERCICE ABSTRAIT') : 'ARCHIVE DOCUMENTAIRE';
    $('catTitle').textContent = r.name; $('catImage').src = r.portrait;
    $('catImage').alt = r.name + ' — ' + r.game; $('catEpisode').textContent = r.game;
    $('catFacts').replaceChildren();
    const facts = { Agent: r.agent, Morphologie: r.anatomy, ...(dev ? { Identifiant: r.id } : {}) };
    for (const [k, v] of Object.entries(facts)) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = k; dd.textContent = v; $('catFacts').append(dt, dd);
    }
    $('catBehavior').textContent = r.facts + ' ' + r.behavior;
    $('catReferenceActions').textContent = (dev ? 'Familles d’action décrites / à valider : ' : 'Comportements recensés : ') + r.referenceActions.join(' · ');
    $('catBoundary').textContent = r.boundary;
    $('catEvidence').textContent = r.sourceReview.hasDescription ? 'Source communautaire descriptive consultée. Ce contrôle n’est pas une certification du moveset original.' : 'Source de base sans description suffisante. Capacités exactes à confirmer par documents ou gameplay ; profil d’essai non canonique.';
    $('catSource').href = r.source; $('catRemaining').textContent = r.productionRemaining.join(' · ');
    $('catActions').replaceChildren();
    if (dev && f) {
      $('catActions').append(anchor('TESTER LES TECHNIQUES →', 'catalog-laboratory.html?uid=' + encodeURIComponent(id)), anchor('DUEL D’ESSAI →', 'catalog-duel.html?uid=' + encodeURIComponent(id)));
    } else if (dev) {
      $('catActions').append(anchor('EXERCICE CONTEXTUEL →', 'catalog-encounter.html?id=' + encodeURIComponent(id)));
    } else {
      $('catActions').append(anchor('RETOUR AU BESTIAIRE →', 'codex.html'));
    }
    $('catMoveRows').replaceChildren(); $('catMoves').hidden = !dev || !f;
    if (dev && f) for (const [slot, m] of Object.entries(f.combat.moves)) {
      const tr = document.createElement('tr');
      for (const text of [slot, m.name, m.startup + '/' + m.active + '/' + m.recovery]) {
        const td = document.createElement('td'); td.textContent = text; tr.append(td);
      }
      const td = document.createElement('td');
      td.append(anchor('TESTER', 'catalog-laboratory.html?uid=' + encodeURIComponent(id) + '&slot=' + encodeURIComponent(slot)));
      tr.append(td); $('catMoveRows').append(tr);
    }
    return true;
  }
  function render() {
    const q = plain($('catSearch').value), game = $('catGame').value, type = $('catType').value;
    const filtered = E.records.filter(r => (game === 'all' || r.game === game) && (type === 'all' || r.classification === type || type === 'index' && !r.sourceReview.hasDescription) && (!q || plain([r.name, r.game, r.anatomy, r.facts, r.agent].join(' ')).includes(q)));
    page = Math.max(0, Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE) - 1)));
    $('catGrid').replaceChildren();
    for (const r of filtered.slice(page * PAGE, page * PAGE + PAGE)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'catalog-card'; b.dataset.id = r.id;
      const img = document.createElement('img'); img.src = r.portrait; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      const title = document.createElement('b'), sub = document.createElement('small'); title.textContent = r.name;
      sub.textContent = r.game + (dev ? ' · ' + (r.classification === 'experimental' ? 'ESSAI COMBAT' : 'CONTEXTE') : '');
      b.append(img, title, sub); b.addEventListener('click', () => open(r.id)); $('catGrid').append(b);
    }
    $('catStatus').textContent = filtered.length + ' dossiers' + (!filtered.length ? ' — aucun résultat' : '');
    $('catPage').textContent = (filtered.length ? page + 1 : 0) + ' / ' + Math.ceil(filtered.length / PAGE);
    $('catPrev').disabled = page === 0; $('catNext').disabled = (page + 1) * PAGE >= filtered.length;
  }
  for (const id of ['catSearch', 'catGame', 'catType']) $(id).addEventListener(id === 'catSearch' ? 'input' : 'change', () => { page = 0; render(); });
  $('catPrev').addEventListener('click', () => { page--; render(); }); $('catNext').addEventListener('click', () => { page++; render(); });
  root.RE_CATALOG_PAGE = Object.freeze({ open, counts: E.counts }); render();
  const requested = new URLSearchParams(location.search).get('id');
  if (requested && !open(requested)) $('catStatus').textContent = 'Identifiant inconnu. Sélectionnez une fiche du catalogue.';
  else if (!requested) open(E.records[0].id);
})(globalThis);
