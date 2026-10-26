/* An idle base pose may replace only idle artwork, never a command or a clip. */
(function (root) {
  'use strict';
  const sprites = root.RE_COMBAT_SPRITES_R27;
  const renderer = root.RE_RENDERER;
  if (!sprites || !renderer || root.RE_COMBAT_SPRITE_ADAPTER_R27) return;
  const originalDraw = renderer.drawFighter;
  if (typeof originalDraw !== 'function') return;
  const counts = { generatedDraws: 0, historicalDraws: 0, fallbacks: 0 };
  const reasons = new Map();
  function reason(value) {
    reasons.set(value, (reasons.get(value) || 0) + 1); counts.fallbacks++;
    while (reasons.size > 32) reasons.delete(reasons.keys().next().value);
  }
  function state(pose) {
    const actor = pose.actor;
    if (pose.presentationState) return pose.presentationState;
    if (pose.animationState && pose.animationState !== 'idle') return pose.animationState;
    if (pose.attack || pose.move || pose.moveSlot || actor?.attack) return 'attack';
    if (pose.knockdown || actor?.state === 'ko' || Number.isFinite(actor?.life) && actor.life <= 0) return 'knockdown';
    if (pose.hit || actor?.hit > 0) return 'hit';
    if (pose.guard || actor?.block || actor?.blockstun > 0) return 'guard';
    if (pose.crouch || actor?.crouch) return 'crouch';
    if (pose.jump || actor?.onGround === false) return 'jump';
    if (pose.walk || pose.dash || ['walk', 'dash'].includes(actor?.state)
        || Math.abs(Number(pose.velocity || actor?.vx || 0)) > .5) return 'walk';
    if (actor?.state && actor.state !== 'idle') return actor.state;
    return 'idle';
  }
  function find(value) {
    if (value && typeof value === 'object') return value;
    return root.RE_DATA?.fighters?.find(item => item.uid === value || item.id === value) || null;
  }
  function draw(ctx, value, x, y, requested = 1, scale = 1, pose = {}) {
    const fighter = find(value), uid = fighter?.uid || fighter?.id;
    const current = state(pose);
    const fallback = why => { reason(why); return originalDraw(ctx, value, x, y, requested, scale, pose); };
    if (!uid || current !== 'idle') return fallback(uid ? 'state-' + current : 'unknown-identity');
    const record = sprites.get(uid);
    if (!record) return fallback('sprite-not-produced');
    const facing = root.RE_FIGHTER_DIRECTIONS?.facing
      ? root.RE_FIGHTER_DIRECTIONS.facing(pose.actor, requested, x, pose.opponentX)
      : requested === -1 || requested === 'left' ? -1 : 1;
    const visual = fighter.visual || {};
    let height = Math.max(45, Math.min(580, Number(visual.drawHeight || visual.height || 225)));
    const assetScale = Math.max(.25, Math.min(3, Number(visual.scale || 1)));
    const outputScale = Math.max(.05, Number.isFinite(scale) ? scale : 1) * assetScale;
    const cap = Number.isFinite(visual.maxDrawWidth) ? visual.maxDrawWidth : 760;
    const width = height * record.bounds.width / record.bounds.height;
    if (width > cap) height *= cap / width;
    if (!ctx || !Number.isFinite(x) || !Number.isFinite(y)) return fallback('invalid-placement');
    const result = sprites.draw(ctx, uid, { x, y, height: height * outputScale, state: current, facing });
    if (!result.ok) return fallback(result.reason);
    counts[result.origin === 'R20' ? 'historicalDraws' : 'generatedDraws']++;
    if (pose.actor && root.RE_SPATIAL?.draw && root.CQCCombat060?.box) {
      root.RE_SPATIAL.draw(ctx, pose.actor, root.CQCCombat060.box(pose.actor), x, y, scale);
    }
    return true;
  }
  const actorOriginals = [];
  for (const name of ['CQC_ACTORS_060', 'CQC_ACTORS_059', 'CQC_ACTORS_058']) {
    if (root[name] && typeof root[name].draw === 'function') {
      actorOriginals.push([name, root[name]]);
      root[name] = Object.freeze({ ...root[name], draw });
    }
  }
  const art = root.CQC55_ART;
  if (art) root.CQC55_ART = Object.freeze({ ...art, drawFighter: draw });
  root.RE_RENDERER = Object.freeze({ ...renderer, drawFighter: draw });
  let installed = true;
  root.RE_COMBAT_SPRITE_ADAPTER_R27 = Object.freeze({
    classify: state,
    state: () => ({ ...counts, installed, refusals: Object.fromEntries(reasons),
      statesSubstituted: ['idle'], missingStatesSynthesized: 0, oppositeSidesMirrored: 0,
      collisionOrReplayDataChanged: false, contextualActorsCreated: 0 }),
    uninstall() {
      if (!installed) return;
      installed = false;
      if (root.RE_RENDERER?.drawFighter === draw) root.RE_RENDERER = renderer;
      if (root.CQC55_ART?.drawFighter === draw) root.CQC55_ART = art;
      for (const [name, original] of actorOriginals) if (root[name]?.draw === draw) root[name] = original;
    }
  });
})(globalThis);
