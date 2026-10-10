/* CQC 0.58 — presentation of the existing simulation phases.
 * This module owns no clock, input, image loader or combat state. The host may
 * supply the two already-loaded portrait canvases; every animation follows the
 * simulation's phaseT, so pausing the simulation also pauses this presentation.
 */
(function (root) {
  'use strict';

  const WIDTH = 1280, HEIGHT = 720;
  const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
  const finite = (x, fallback) => Number.isFinite(x) ? x : fallback;
  const integer = (x, fallback, max) => Math.floor(clamp(finite(x, fallback), 0, max));
  const clean = (value, fallback) => typeof value === 'string' && value.trim() ? value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 240) : fallback;
  const color = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

  function themeFor(fighter, provided) {
    const ep = clean(fighter && fighter.ep, '').toUpperCase();
    let theme;
    if (/REVENGEANCE|MGR/.test(ep)) theme = { name: 'HF / CYBORG', accent: '#81e0ee', bg: '#0b1b27', kind: 'angular' };
    else if (/AC!D/.test(ep)) theme = { name: 'COST / AC!D', accent: '#deacf5', bg: '#201228', kind: 'card' };
    else if (/METAL GEAR|MG1|MG2|GHOST|REVENGE/.test(ep) && !/MGS/.test(ep)) theme = { name: 'RETRO / OPS', accent: '#d0e9a1', bg: '#132014', kind: 'steps' };
    else if (/MGS3|SNAKE EATER|THE JOY|DELTA|MPO|PORTABLE|PW|PEACE/.test(ep)) theme = { name: 'FOX / SURVIVAL', accent: '#dfd1a0', bg: '#242c1d', kind: 'field' };
    else if (/MGS2|SONS/.test(ep)) theme = { name: 'SOLITON / 2009', accent: '#9bdede', bg: '#102d31', kind: 'digital' };
    else if (/MGS4|MGSV|PHANTOM|TPP/.test(ep)) theme = { name: 'TACTICAL / CQC', accent: '#e3e7d1', bg: '#1c241f', kind: 'digital' };
    else theme = { name: 'CODEC / OPS', accent: '#a1dbc8', bg: '#122c26', kind: 'codec' };
    if (!provided || typeof provided !== 'object') return theme;
    return {
      name: clean(provided.name, theme.name),
      accent: color(provided.accent, theme.accent),
      bg: color(provided.bg, theme.bg),
      kind: ['angular', 'card', 'steps', 'field', 'digital', 'codec'].includes(provided.kind) ? provided.kind : theme.kind,
    };
  }

  function describe(state, options) {
    options = options && typeof options === 'object' ? options : {};
    if (!state || typeof state !== 'object' || !state.a || !state.b || !state.a.f || !state.b.f) return null;
    const phase = state.phase;
    if (!['intro', 'roundEnd'].includes(phase) && state.finished !== true) return null;
    if (state.finished === true && options.finishPending === true) return null;

    const players = [state.a, state.b], names = players.map(p => clean(p.f.name, 'Combattant'));
    const round = Math.max(1, integer(state.round, 1, 999));
    const target = Math.max(1, integer(state.rounds, 2, 99));
    const score = players.map(p => integer(p.wins, 0, 999));
    const remaining = integer(state.phaseT, 0, 100);
    const introDuration = round === 1 ? 100 : 90;
    const localSlot = options.localSlot === 1 ? 1 : options.localSlot === null ? null : 0;
    const theme = themeFor(state.a.f, options.theme);
    const base = {
      phase, round, target, score, names, theme,
      stage: clean(state.stage && state.stage.name, 'ARÈNE CQC'),
      episodes: players.map(p => clean(p.f.ep, 'ARCHIVES')),
      accents: players.map(p => color(p.f.accent, theme.accent)),
      progress: 0, remaining, winner: null, outcome: null, cue: '', title: '', subtitle: '',
      reducedMotion: options.reducedMotion === true || !!(state.options && state.options.reducedMotion55),
      noFlash: options.noFlash === true || !!(state.options && state.options.noFlash55),
    };

    if (state.finished === true) {
      const declared = state.winner;
      if (declared !== 0 && declared !== 1 && declared !== -1) return null;
      const winner = declared === 0 || declared === 1 ? declared : null;
      // A missing/invalid winner is not silently interpreted as player two.
      const outcome = winner === null ? 'draw' : localSlot === null || winner === localSlot ? 'victory' : 'defeat';
      return { ...base, cue: 'match', winner, outcome, progress: 1,
        title: winner === null ? 'ÉGALITÉ' : outcome === 'defeat' ? 'DÉFAITE' : 'VICTOIRE',
        subtitle: winner === null ? 'AUCUN VAINQUEUR DÉSIGNÉ' : names[winner] + ' REMPORTE LE DUEL' };
    }

    if (phase === 'intro') {
      const cue = remaining <= 45 ? 'fight' : round === 1 ? 'versus' : 'round';
      return { ...base, cue, progress: clamp(1 - remaining / introDuration, 0, 1),
        title: cue === 'versus' ? 'VS' : cue === 'fight' ? 'COMBAT' : 'MANCHE ' + round,
        subtitle: cue === 'fight' ? 'MANCHE ' + round : 'PREMIER À ' + target + (target === 1 ? ' MANCHE' : ' MANCHES') };
    }

    const declared = state.roundWinner;
    const winner = declared === 0 || declared === 1 ? declared : null;
    const life = players.map(p => finite(p.life, 1));
    const doubleKO = life[0] <= 0 && life[1] <= 0;
    const knockout = life[0] <= 0 || life[1] <= 0;
    // A lethal hit on the final timer tick is a KO, rather than a timeout.
    const timedOut = !knockout && finite(state.timerStart, 0) > 0 && finite(state.timer, 1) <= 0;
    const outcome = winner === null ? 'draw' : timedOut ? 'timeout' : knockout ? 'ko' : 'round';
    const cue = winner !== null && remaining <= 42 ? 'roundWinner' : 'roundEnd';
    let title = doubleKO ? 'DOUBLE K.-O.' : winner === null ? 'ÉGALITÉ' : timedOut ? 'TEMPS ÉCOULÉ' : knockout ? 'K.-O.' : 'FIN DE MANCHE';
    if (cue === 'roundWinner') title = 'MANCHE REMPORTÉE';
    return { ...base, cue, winner, outcome, progress: clamp(1 - remaining / 90, 0, 1), title,
      subtitle: winner === null ? 'AUCUNE MANCHE ATTRIBUÉE · REPRISE' : names[winner],
      doubleKO, timedOut, knockout };
  }

  function path(c, points) {
    c.beginPath();
    points.forEach((point, i) => i ? c.lineTo(point[0], point[1]) : c.moveTo(point[0], point[1]));
    c.closePath();
  }
  function line(c, x1, y1, x2, y2, stroke, width) {
    c.strokeStyle = stroke; c.lineWidth = width || 1;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function font(c, weight, size, mono) {
    c.font = weight + ' ' + size + 'px ' + (mono ? 'ui-monospace, "DejaVu Sans Mono", monospace' : 'Arial, "Nimbus Sans", "DejaVu Sans", sans-serif');
  }
  function fitted(c, value, x, y, width, size, minimum, align, fill, weight) {
    let text = clean(value, '');
    let current = size;
    c.textAlign = align || 'center'; c.fillStyle = fill;
    font(c, weight || 800, current, false);
    while (current > minimum && c.measureText(text).width > width) { current--; font(c, weight || 800, current, false); }
    if (c.measureText(text).width > width) {
      while (text.length > 1 && c.measureText(text + '…').width > width) text = text.slice(0, -1);
      text = text.trimEnd() + '…';
    }
    c.fillText(text, x, y);
    return current;
  }
  function wrappedName(c, value, x, y, width, align, fill) {
    const text = clean(value, 'Combattant');
    let size = 28, lines = [];
    while (size >= 18) {
      font(c, 900, size, false); lines = [];
      for (const word of text.split(/\s+/)) {
        const i = lines.length - 1;
        if (i < 0 || c.measureText(lines[i] + ' ' + word).width > width) lines.push(word);
        else lines[i] += ' ' + word;
      }
      if (lines.length <= 3 && lines.every(item => c.measureText(item).width <= width)) break;
      size--;
    }
    size = Math.max(18, size);
    if (lines.length > 3) lines = [lines[0], lines[1], lines.slice(2).join(' ')];
    lines.forEach((part, i) => fitted(c, part, x, y + i * (size + 7), width, size, 18, align, fill, 900));
  }
  function ornament(c, x, y, width, theme, reverse) {
    const col = theme.accent, end = x + width;
    line(c, x, y, end, y, col, 1);
    if (theme.kind === 'steps') {
      for (let i = 0; i < 7; i++) c.fillRect(reverse ? end - 5 - i * 10 : x + i * 10, y - 5, 5, 5);
    } else if (theme.kind === 'card') {
      for (let i = 0; i < 3; i++) { const px = reverse ? end - 8 - i * 18 : x + 8 + i * 18; path(c, [[px, y - 6], [px + 5, y - 11], [px + 10, y - 6], [px + 5, y - 1]]); c.stroke(); }
    } else if (theme.kind === 'field') {
      for (let i = 0; i < 6; i++) line(c, reverse ? end - 3 - i * 12 : x + 3 + i * 12, y - 5, reverse ? end - 3 - i * 12 : x + 3 + i * 12, y + 5, col, 1);
    } else {
      const dx = reverse ? end : x;
      line(c, dx, y, dx + (reverse ? -14 : 14), y - 14, col, 2);
      line(c, dx + (reverse ? -14 : 14), y - 14, dx + (reverse ? -64 : 64), y - 14, col, 2);
    }
  }
  function portrait(c, image, x, y, width, accent, side) {
    c.fillStyle = '#071217'; c.fillRect(x, y, width, width);
    let painted = false;
    if (image && finite(image.width, 0) > 0 && finite(image.height, 0) > 0) {
      try {
        // Contain the source image: machine profiles and portraits keep their
        // full composition, even when the caller supplies a non-square canvas.
        const ratio = Math.min(width / image.width, width / image.height), w = image.width * ratio, h = image.height * ratio;
        c.drawImage(image, x + (width - w) / 2, y + (width - h) / 2, w, h); painted = true;
      } catch (_) { /* Incomplete image: use the deterministic identity marker. */ }
    }
    if (!painted) {
      c.fillStyle = accent + '18'; c.fillRect(x + 5, y + 5, width - 10, width - 10);
      line(c, x + 14, y + width - 15, x + width - 14, y + 15, accent + '55', 1);
      fitted(c, side ? '02' : '01', x + width / 2, y + width / 2 + 18, width - 28, 54, 32, 'center', accent, 900);
    }
    c.strokeStyle = accent + 'a8'; c.lineWidth = 1; c.strokeRect(x, y, width, width);
    c.fillStyle = accent;
    c.fillRect(x, y, 25, 3); c.fillRect(x, y, 3, 25);
    c.fillRect(x + width - 25, y + width - 3, 25, 3); c.fillRect(x + width - 3, y + width - 25, 3, 25);
  }
  function score(c, model, y) {
    const label = model.score[0] + '  —  ' + model.score[1];
    fitted(c, label, 640, y, 220, 19, 17, 'center', '#f0eee1', 900);
    const count = Math.min(model.target, 7), leftX = 536, rightX = 744;
    for (let side = 0; side < 2; side++) for (let i = 0; i < count; i++) {
      const x = side ? rightX + i * 18 : leftX - i * 18;
      c.fillStyle = i < model.score[side] ? model.accents[side] : '#73898b55';
      path(c, [[x, y - 10], [x + 4, y - 6], [x, y - 2], [x - 4, y - 6]]); c.fill();
    }
  }

  function drawVersus(c, model, options) {
    const accent = model.theme.accent;
    const entrance = model.reducedMotion ? 1 : clamp(model.progress * 10 + 0.35, 0.35, 1);
    c.save();
    c.translate(0, model.reducedMotion ? 0 : (1 - entrance) * 12);
    c.globalAlpha = model.noFlash ? 1 : 0.92 + entrance * 0.08;
    const gradient = c.createLinearGradient(0, 202, 0, 506);
    gradient.addColorStop(0, model.theme.bg + 'f6'); gradient.addColorStop(1, '#061016ed');
    c.fillStyle = gradient;
    path(c, [[24, 225], [48, 201], [1232, 201], [1256, 225], [1256, 485], [1232, 509], [48, 509], [24, 485]]); c.fill();
    line(c, 50, 201, 1230, 201, accent + 'bc', 2);
    line(c, 50, 509, 1230, 509, accent + '77', 1);
    c.fillStyle = accent;
    ornament(c, 61, 191, 436, model.theme, false); ornament(c, 783, 191, 436, model.theme, true);
    c.fillStyle = '#071115ed'; c.fillRect(553, 172, 174, 24);
    fitted(c, 'FACE-À-FACE', 640, 190, 240, 12, 12, 'center', accent, 800);

    const supplied = Array.isArray(options.portraits) ? options.portraits : [];
    for (let side = 0; side < 2; side++) {
      const reverse = side === 1, x = reverse ? 1022 : 258, align = reverse ? 'right' : 'left';
      portrait(c, supplied[side], reverse ? 1048 : 60, 252, 172, model.accents[side], side);
      fitted(c, side ? 'COMBATTANT 02' : 'COMBATTANT 01', x, 242, 286, 11, 11, align, model.accents[side], 800);
      wrappedName(c, model.names[side], x, 286, 286, align, '#f4f2e7');
      fitted(c, model.episodes[side], x, 406, 286, 12, 10, align, '#b8c6c5', 700);
      line(c, reverse ? 742 : 258, 424, reverse ? 1022 : 538, 424, model.accents[side] + '77', 1);
    }
    c.save(); c.translate(640, 348); c.rotate(-0.12);
    c.fillStyle = accent + '0d'; path(c, [[-55, -77], [63, -77], [43, 66], [-75, 66]]); c.fill(); c.restore();
    fitted(c, 'VS', 640, 371, 158, 76, 76, 'center', '#f4eee0', 900);
    fitted(c, 'MANCHE ' + model.round, 640, 408, 156, 12, 12, 'center', accent, 800);
    fitted(c, model.stage, 640, 466, 1100, 17, 13, 'center', '#dfdfce', 800);
    fitted(c, model.subtitle, 640, 489, 800, 11, 10, 'center', '#a2b5b8', 700);
    c.fillStyle = accent + '24'; c.fillRect(48, 507, 1184, 2);
    c.fillStyle = accent; c.fillRect(48, 507, 1184 * (model.reducedMotion ? 1 : clamp(model.progress / 0.55, 0, 1)), 2);
    c.restore();
  }

  function drawBanner(c, model) {
    const accent = model.theme.accent;
    const decisive = model.cue === 'match';
    const knockout = model.cue === 'roundEnd' && model.outcome === 'ko';
    const resultColor = model.outcome === 'defeat' ? '#e2ac9e' : model.outcome === 'draw' ? '#ddd6b7' : accent;
    const width = model.title.length > 13 ? 1080 : 980, left = (WIDTH - width) / 2, right = left + width;
    const top = 270, bottom = 449;
    const entrance = model.reducedMotion || decisive ? 1 : model.cue === 'fight' ? clamp((45 - model.remaining) / 7, 0, 1) : clamp(model.progress * 12, 0, 1);
    c.save(); c.translate(0, model.reducedMotion ? 0 : (1 - entrance) * 8);
    const gradient = c.createLinearGradient(left, 0, right, 0);
    gradient.addColorStop(0, '#061117e8'); gradient.addColorStop(0.5, model.theme.bg + 'f7'); gradient.addColorStop(1, '#061117e8');
    c.fillStyle = gradient;
    path(c, [[left, top + 18], [left + 18, top], [right - 18, top], [right, top + 18], [right, bottom - 18], [right - 18, bottom], [left + 18, bottom], [left, bottom - 18]]); c.fill();
    line(c, left + 19, top, right - 19, top, resultColor + 'd9', 2);
    line(c, left + 19, bottom, right - 19, bottom, resultColor + '70', 1);
    c.fillStyle = resultColor;
    ornament(c, left + 22, top - 12, 150, { ...model.theme, accent: resultColor }, false);
    ornament(c, right - 172, top - 12, 150, { ...model.theme, accent: resultColor }, true);
    const heading = decisive ? 'FIN DU DUEL' : model.cue === 'roundWinner' ? 'MANCHE ' + model.round : model.cue === 'roundEnd' ? 'RÉSULTAT · MANCHE ' + model.round : model.theme.name;
    c.fillStyle = '#071115ed'; c.fillRect(445, 239, 390, 25);
    fitted(c, heading, 640, 257, 530, 12, 10, 'center', resultColor, 800);
    const big = model.cue === 'roundWinner' ? 42 : knockout ? 86 : 68;
    const titleY = model.cue === 'roundWinner' ? 337 : 362;
    fitted(c, model.title, 640, titleY, width - 74, big, 28, 'center', '#f2eee0', 900);
    const subY = model.cue === 'roundWinner' ? 384 : 401;
    fitted(c, model.subtitle, 640, subY, width - 80, model.cue === 'roundWinner' ? 31 : 19, 14, 'center', resultColor, model.cue === 'roundWinner' ? 900 : 700);
    if (model.cue === 'round' || model.cue === 'roundWinner' || decisive) score(c, model, 433);
    else if (model.cue === 'fight') fitted(c, model.stage, 640, 429, width - 80, 13, 11, 'center', '#a8bcbf', 700);
    else if (model.outcome === 'draw') fitted(c, model.timedOut ? 'TEMPS ÉCOULÉ' : 'LA ROUTE CONTINUE', 640, 430, width - 80, 11, 10, 'center', '#a8bcbf', 700);
    c.restore();
  }

  function draw(ctx, state, options) {
    options = options && typeof options === 'object' ? options : {};
    const model = describe(state, options);
    if (!ctx || typeof ctx.save !== 'function' || typeof ctx.fillText !== 'function' || !model) return false;
    ctx.save();
    try {
      // A phase overlay is independent of any actor's compositing/flash state.
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.textBaseline = 'alphabetic'; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      if ('filter' in ctx) ctx.filter = 'none';
      if (model.cue === 'versus') drawVersus(ctx, model, options);
      else drawBanner(ctx, model);
    } finally { ctx.restore(); }
    return true;
  }

  root.CQC_FLOW_058 = Object.freeze({ version: '0.58', width: WIDTH, height: HEIGHT, draw, describe, themeFor });
})(typeof window !== 'undefined' ? window : globalThis);
