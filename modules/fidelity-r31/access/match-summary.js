/* User-requested text snapshot inside the existing pause/focus-managed combat text dialog. */
(function (root) {
  'use strict';
  if (root.RE_MATCH_SUMMARY_R31) return;
  const bounded = (value, maximum = 300) => typeof value === 'string' ? value.slice(0, maximum) : '';
  const number = value => Number.isFinite(value) ? Math.round(value) : 0;
  const phases = {intro: 'Introduction', fight: 'Combat', roundEnd: 'Fin de manche', roundOver: 'Fin de manche',
    round: 'Fin de manche', result: 'Résultat', finished: 'Terminé'};
  function describe(state, evolution = root.RE_EVOLUTIONS_R28) {
    if (!state?.a?.f || !state?.b?.f) return Object.freeze({available: false, text: 'Aucun combat en cours.', fighters: []});
    const fighters = [state.a, state.b].map((actor, slot) => {
      const definition = actor.f.combat?.resource || {};
      const life = Math.max(0, number(actor.life)), maximum = Math.max(1, number(actor.max));
      const options = state.evolutionsR28 && evolution?.available ? evolution.available(state, slot).slice(0, 32) : [];
      const evolutions = options.map(option => ({label: bounded(option.target?.name || option.to),
        available: option.reason === null, reason: bounded(option.reason || 'Disponible')}));
      return Object.freeze({slot, uid: bounded(actor.f.uid), name: bounded(actor.f.name), life, maximum,
        lifePercent: Math.max(0, Math.min(100, Math.round(life * 100 / maximum))), guard: Math.max(0, number(actor.guard)),
        meter: Math.max(0, number(actor.meter)), resource: Math.max(0, number(actor.r)),
        resourceMaximum: Math.max(0, number(definition.max)), resourceLabel: bounded(definition.label || 'Ressource'),
        wins: Math.max(0, number(actor.wins)), evolutions});
    });
    const phase = state.finished ? 'Terminé' : phases[state.phase] || bounded(state.phase || 'Combat');
    const round = Math.max(1, number(state.round));
    const text = phase + ', manche ' + round + '. ' + fighters.map(actor => 'Joueur ' + (actor.slot + 1) + ', ' + actor.name
      + ', vie ' + actor.lifePercent + ' pour cent, garde ' + actor.guard + ', furie ' + actor.meter
      + ', ' + actor.resourceLabel + ' ' + actor.resource + ' sur ' + actor.resourceMaximum + '.').join(' ');
    return Object.freeze({available: true, phase, round, frame: Math.max(0, number(state.frame)), text, fighters: Object.freeze(fighters)});
  }
  let installed = false;
  const doc = root.document;
  function current() {return (root.RE_CATALOG_DUEL || root.RE_COMBAT)?.getState?.() || null;}
  function install() {
    const panel = doc?.getElementById('combatTextPanelR17');
    const owner = root.RE_TRIAL_TEXT_PANEL || root.RE_MAIN_TEXT_PANEL;
    if (installed || !panel || !owner) return;
    installed = true;
    const section = doc.createElement('section'); section.id = 'matchSummaryR31'; section.setAttribute('aria-labelledby', 'matchSummaryTitleR31');
    const title = doc.createElement('h3'); title.id = 'matchSummaryTitleR31'; title.textContent = 'Bilan du combat';
    const refresh = doc.createElement('button'); refresh.type = 'button'; refresh.textContent = 'Actualiser le bilan du combat';
    const live = doc.createElement('p'); live.id = 'matchSummaryStatusR31'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    const details = doc.createElement('dl'); details.className = 'r31-match-facts';
    function update() {
      const snapshot = describe(current()); live.textContent = snapshot.text; details.replaceChildren();
      for (const actor of snapshot.fighters) {
        const term = doc.createElement('dt'), value = doc.createElement('dd'); term.textContent = 'Joueur ' + (actor.slot + 1) + ' · ' + actor.name;
        value.textContent = 'Vie : ' + actor.life + ' / ' + actor.maximum + '. Manches gagnées : ' + actor.wins + '.';
        if (actor.evolutions.length) value.textContent += ' Évolutions : ' + actor.evolutions.map(option => option.label + ' — ' + option.reason).join(' ; ') + '.';
        details.append(term, value);
      }
      return snapshot;
    }
    refresh.addEventListener('click', update); section.append(title, refresh, live, details); panel.querySelector('header').after(section);
    const mainTargets = [doc.querySelector('#selectScreen .top-actions'), doc.querySelector('.canvas-wrap')].filter(Boolean);
    const targets = doc.getElementById('trialCanvas') ? [doc.querySelector('.trial-controls')].filter(Boolean) : mainTargets;
    for (const target of targets) {
      const button = doc.createElement('button'); button.type = 'button'; button.textContent = 'BILAN DU COMBAT'; button.className = 'r31-match-open';
      if (target.matches('.canvas-wrap')) button.classList.add('r31-match-float');
      button.addEventListener('click', () => {owner.open({currentTarget: button}); update(); refresh.focus();}); target.append(button);
    }
    const style = doc.createElement('style');
    style.textContent = '#matchSummaryR31{min-width:0;border-block:1px solid #68765f;padding-block:10px;margin-block:10px;overflow-wrap:anywhere}#matchSummaryR31 button{max-width:100%;white-space:normal}#matchSummaryR31 h3{font-size:1em;margin:0 0 8px}.r31-match-facts{display:grid;grid-template-columns:minmax(0,1fr);gap:5px}.r31-match-facts dt,.r31-match-facts dd{min-width:0;margin:0}.r31-match-facts dt{font-weight:700}.r31-match-facts dd{margin-bottom:8px}.r31-match-open{font:inherit;padding:8px;background:#15281d;color:#eee8cf;border:1px solid #8fa57d;cursor:pointer;white-space:normal;max-width:100%}.r31-match-float{position:absolute;right:10px;top:78px;z-index:24;font-size:11px;max-width:120px}';
    doc.head.append(style); update();
  }
  root.RE_MATCH_SUMMARY_R31 = Object.freeze({describe, install, snapshot: () => describe(current()), state: () => ({installed, automaticAnnouncements: false, engineMutations: false})});
  if (!doc || root.location?.origin === 'null') return;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', install, {once: true}); else install();
})(globalThis);
