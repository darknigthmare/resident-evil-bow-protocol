/* R20: presentation and navigation only. Combat, replay and save contracts are untouched. */
(function (root) {
  'use strict';
  const doc = root.document;
  if (!doc) return;
  const tools = new Set(['laboratory.html', 'catalog-laboratory.html', 'catalog-duel.html',
    'catalog-encounter.html', 'directions.html', 'coverage.html', 'finishers.html',
    'sequences.html', 'stages.html', 'dev.html', 'dev-sprites.html']);
  const path = root.location.pathname.split('/').filter(Boolean);
  const page = path.at(-1) || 'index.html';
  const prefix = path.at(-2) === 'modules' ? '../' : '';
  const query = new URLSearchParams(root.location.search);
  const isTool = tools.has(page);
  const isDev = isTool || query.get('dev') === '1';
  const embedded = root.parent !== root;
  const names = { 'versus.html': 'CONFRONTATION', 'chronicles.html': 'DOSSIERS',
    'operations.html': 'OPÉRATIONS', 'codex.html': 'ARCHIVES BIOLOGIQUES',
    'catalog.html': 'DOSSIERS COMPLÉMENTAIRES', 'movesets.html': 'PROTOCOLES DE COMBAT',
    'saves.html': 'MACHINE À ÉCRIRE' };
  doc.documentElement.classList.add(isDev ? 'bow-dev-r20' : 'bow-player-r20');
  doc.documentElement.dataset.r20Page = page.replace('.html', '');
  if (embedded) doc.documentElement.classList.add('bow-embedded-r20');

  function toTool(href) {
    const url = new URL(href, root.location.href);
    if (url.origin !== root.location.origin) return href;
    url.searchParams.set('dev', '1');
    return url.pathname + url.search + url.hash;
  }
  function isTechnicalLink(a) {
    if (!a.getAttribute('href')) return false;
    try {
      const url = new URL(a.getAttribute('href'), root.location.href);
      if (url.origin !== root.location.origin) return false;
      return tools.has(url.pathname.split('/').at(-1)) || /\/docs\/(planning\/|.*\.(?:json|md)$)/i.test(url.pathname);
    } catch { return false; }
  }
  function mark(el) {
    if (!el || isDev) return;
    el.dataset.devOnly = '';
    el.hidden = true;
    el.inert = true;
  }
  const technical = '[data-dev-only],.lore-seal,.combat-audit-badge,.combat-lore-line,#finishArchive46,.asset-warning';
  function playerCopy(container) {
    if (isDev) return;
    const readButtons = [...(container.matches?.('.read-tech45') ? [container] : []), ...(container.querySelectorAll?.('.read-tech45') || [])];
    for (const button of readButtons) if (button.textContent !== 'CONSULTER LES TECHNIQUES') button.textContent = 'CONSULTER LES TECHNIQUES';
    if (page === 'operations.html') {
      const role = doc.getElementById('selectedRole');
      if (role?.textContent.includes('\nLORE AUDITÉ')) role.textContent = role.textContent.split('\nLORE AUDITÉ')[0];
    }
    if (page === 'chronicles.html') {
      for (const hint of container.querySelectorAll?.('#roster .fighter small') || []) {
        const uid = hint.closest('.fighter')?.dataset.uid;
        const fighter = root.RE_DATA?.fighters.find(f => f.uid === uid);
        if (fighter && hint.textContent !== fighter.ep) hint.textContent = fighter.ep;
      }
    }
  }
  function refresh(container = doc) {
    if (isDev) return;
    if (container.matches?.(technical)) mark(container);
    container.querySelectorAll?.(technical).forEach(mark);
    const links = [...(container.matches?.('a[href]') ? [container] : []), ...(container.querySelectorAll?.('a[href]') || [])];
    for (const a of links) {
      if (!isTechnicalLink(a)) continue;
      // Keep an identified mount only when legacy code writes into it later.
      // Unidentified technical links are never part of the player navigation DOM.
      if (a.id) mark(a); else a.remove();
    }
    playerCopy(container);
  }
  function link(label, href, className = '') {
    const a = doc.createElement('a'); a.textContent = label; a.href = prefix + href;
    if (className) a.className = className;
    return a;
  }
  function standardHeader() {
    const header = doc.querySelector('.global-header,.catalog-header');
    if (!header || isTool || isDev) return;
    const brand = link('B.O.W. PROTOCOL', 'index.html', 'r20-wordmark');
    const section = doc.createElement('span'); section.className = 'r20-section'; section.textContent = names[page] || 'CONFINEMENT';
    const nav = doc.createElement('nav'); nav.className = 'r20-header-nav'; nav.setAttribute('aria-label', 'Navigation du jeu');
    nav.append(link('Jouer', 'modules/versus.html'), link('Dossiers', 'modules/chronicles.html'), link('Archives', 'codex.html'), link('Menu', 'index.html'));
    header.replaceChildren(brand, section, nav);
  }
  function developerHeader() {
    if (!isDev || embedded || page === 'dev.html') return;
    const bar = doc.createElement('nav'); bar.className = 'r20-dev-bar'; bar.setAttribute('aria-label', 'Outils de développement');
    const tag = doc.createElement('strong'); tag.textContent = 'DEV';
    bar.append(tag, link('Centre de développement', 'dev.html'), link('Retour au jeu', 'index.html'));
    doc.body.prepend(bar);
  }
  function setup() {
    doc.body.classList.add('r20-presentation');
    standardHeader(); developerHeader(); refresh();
    if (page === 'chronicles.html') {
      const header = doc.querySelector('#app>header');
      if (header?.getBoundingClientRect) {
        const fit = () => doc.documentElement.style.setProperty('--r20-story-header', Math.ceil(header.getBoundingClientRect().height) + 'px');
        fit(); root.addEventListener('resize', fit);
        if (typeof root.ResizeObserver === 'function') new root.ResizeObserver(fit).observe(header);
      }
    }
    if (!isDev && typeof root.MutationObserver === 'function') {
      const observer = new root.MutationObserver(records => {
        for (const record of records) {
          for (const node of record.addedNodes) if (node.nodeType === 1) refresh(node);
          if (page === 'operations.html' && record.target.id === 'selectedRole') playerCopy(doc);
          if (page === 'chronicles.html' && record.target.id === 'roster') playerCopy(doc);
        }
      });
      observer.observe(doc.body, { childList: true, subtree: true });
      root.addEventListener('pagehide', () => observer.disconnect(), { once: true });
      root.addEventListener('pageshow', event => { if (event.persisted) { refresh(); observer.observe(doc.body, { childList: true, subtree: true }); } });
    }
  }
  root.RE_PLAYER_SHELL = Object.freeze({ isDev, isTool, embedded, prefix, toTool, refresh });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', setup, { once: true }); else setup();
})(window);
