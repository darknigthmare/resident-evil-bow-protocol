/* R34 presentation boundary: unresolved source media never returns through historical fallbacks. */
(function (root) {
  'use strict';
  const query = new root.URLSearchParams(root.location?.search || '');
  if (query.get('dev') === '1' && query.get('selection') === 'direct') return;
  // The first mount protects controller bootstrap; the tail mount protects the
  // adapters installed afterwards. Repeated mounts never stack our own wrapper.
  if (root.RE_HELD_PRESENTATION_R34) {root.RE_HELD_PRESENTATION_R34.install(); return;}
  const wrapped = Symbol.for('re.bow.held-presentation-r34');
  const counts = {markersDrawn: 0, qualifiedSpritesDrawn: 0, qualifiedNativeDraws: 0, historicalDelegations: 0,
    installationPasses: 0, wrappersInstalled: 0};
  const reasons = new Map();
  function state(pose) {
    if (root.RE_COMBAT_SPRITE_ADAPTER_R33?.classify) return root.RE_COMBAT_SPRITE_ADAPTER_R33.classify(pose);
    return root.RE_FIGHTER_DIRECTIONS?.poseState?.(pose) || 'idle';
  }
  function find(value) {
    if (value && typeof value === 'object') return value;
    return root.RE_DATA?.fighters?.find(item => item.uid === value || item.id === value)
      || root.RE_DATA?.catalog?.find(item => item.uid === value || item.id === value) || null;
  }
  function marker(ctx, x, y, scale, reason) {
    if (!ctx || !Number.isFinite(x) || !Number.isFinite(y)) return true;
    const size = Math.max(.05, Number.isFinite(scale) ? scale : 1);
    ctx.save();
    try {
      ctx.translate(x, y); ctx.scale(size, size);
      ctx.fillStyle = '#07120e'; ctx.strokeStyle = '#d6ba82'; ctx.lineWidth = 2;
      ctx.fillRect(-88, -47, 176, 39); ctx.strokeRect(-88, -47, 176, 39);
      ctx.fillStyle = '#e7e7c9'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Vue à documenter', 0, -27);
      counts.markersDrawn++; reasons.set(reason, (reasons.get(reason) || 0) + 1);
      while (reasons.size > 32) reasons.delete(reasons.keys().next().value);
    } finally {ctx.restore();}
    return true;
  }
  function wrap(original) {
    function draw(ctx, value, x, y, requested = 1, scale = 1, pose = {}) {
      const fighter = find(value), uid = fighter?.uid || fighter?.id;
      const current = state(pose);
      const facing = root.RE_FIGHTER_DIRECTIONS?.facing
        ? root.RE_FIGHTER_DIRECTIONS.facing(pose.actor, requested, x, pose.opponentX)
        : requested === -1 || requested === 'left' ? -1 : 1;
      const sprites = root.RE_COMBAT_SPRITES_R34;
      const decision = sprites?.presentationDecision?.(uid, {state: current, facing});
      if (decision?.blockHistoricalFallback === false) {
        counts.historicalDelegations++; return original.call(this, ctx, value, x, y, requested, scale, pose);
      }
      if (decision?.mode === 'qualified-r34' || decision?.mode === 'qualified-native') {
        const record = decision.record, visual = fighter?.visual || {};
        let height = Math.max(45, Math.min(580, Number(visual.drawHeight || visual.height || 225)));
        const assetScale = Math.max(.25, Math.min(3, Number(visual.scale || 1)));
        const outputScale = Math.max(.05, Number.isFinite(scale) ? scale : 1) * assetScale;
        const native = decision.mode === 'qualified-native', bounds = native ? record.referenceBounds : record.bounds;
        const width = height * bounds.width / bounds.height;
        const cap = Number.isFinite(visual.maxDrawWidth) ? visual.maxDrawWidth : 760;
        if (width > cap) height *= cap / width;
        const options = {x, y, height: height * outputScale, state: current, facing,
          seconds: pose.time, reducedMotion: pose.reducedMotion === true || pose.reduceMotion === true};
        const result = native ? root.RE_NATIVE_SPRITES_R30.draw(ctx, uid, options) : sprites.draw(ctx, uid, options);
        if (result.ok) {
          counts[native ? 'qualifiedNativeDraws' : 'qualifiedSpritesDrawn']++;
          if (pose.actor && root.RE_SPATIAL?.draw && root.CQCCombat060?.box) root.RE_SPATIAL.draw(ctx, pose.actor, root.CQCCombat060.box(pose.actor), x, y, scale);
          return true;
        }
        return marker(ctx, x, y, scale, result.reason);
      }
      return marker(ctx, x, y, scale, decision?.mode || 'source-unvalidated');
    }
    Object.defineProperty(draw, wrapped, {value: true});
    return draw;
  }
  function install() {
    let installed = 0;
    for (const [name, method] of [['RE_RENDERER', 'drawFighter'], ['CQC55_ART', 'drawFighter'],
      ['CQC_ACTORS_060', 'draw'], ['CQC_ACTORS_059', 'draw'], ['CQC_ACTORS_058', 'draw']]) {
      const owner = root[name], original = owner?.[method];
      if (typeof original !== 'function' || original[wrapped]) continue;
      root[name] = Object.freeze({...owner, [method]: wrap(original)}); installed++;
    }
    if (installed) {counts.installationPasses++; counts.wrappersInstalled += installed;}
    return installed;
  }
  root.RE_HELD_PRESENTATION_R34 = Object.freeze({install, state: () => ({...counts, reasons: Object.fromEntries(reasons),
    markerIsSprite: false, actorOrReplayDataChanged: false, historicalAdaptersRetained: true})});
  install();
})(globalThis);
