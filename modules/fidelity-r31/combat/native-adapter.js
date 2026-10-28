/* Native-first visual adapter. Existing gameplay, actor data and R29 fallback stay untouched. */
(function (root) {
  'use strict';
  const native = root.RE_NATIVE_SPRITES_R30, renderer = root.RE_RENDERER;
  if (!native || !renderer?.drawFighter || root.RE_NATIVE_ADAPTER_R30) return;
  const original = renderer.drawFighter;
  const counts = {nativeStaticDraws: 0, nativeAnimatedDraws: 0, generatedOrProceduralFallbacks: 0};
  const reasons = new Map(), originals = [];
  function classify(pose) {
    const prior = root.RE_COMBAT_SPRITE_ADAPTER_R27?.classify;
    if (prior) return prior(pose);
    const actor = pose.actor;
    if (pose.presentationState) return pose.presentationState;
    if (pose.animationState && pose.animationState !== 'idle') return pose.animationState;
    if (pose.attack || pose.move || pose.moveSlot || actor?.attack) return 'attack';
    if (pose.knockdown || actor?.state === 'ko' || Number.isFinite(actor?.life) && actor.life <= 0) return 'knockdown';
    if (pose.hit || actor?.hit > 0) return 'hit';
    if (pose.guard || actor?.block || actor?.blockstun > 0) return 'guard';
    if (pose.crouch || actor?.crouch) return 'crouch';
    if (pose.jump || actor?.onGround === false) return 'jump';
    if (pose.walk || pose.dash || ['walk', 'dash'].includes(actor?.state) || Math.abs(Number(pose.velocity || actor?.vx || 0)) > .5) return 'walk';
    return actor?.state || 'idle';
  }
  function draw(ctx, value, x, y, requested = 1, scale = 1, pose = {}) {
    const fighter = value && typeof value === 'object' ? value : root.RE_DATA?.fighters?.find(item => item.uid === value || item.id === value);
    const uid = fighter?.uid || fighter?.id, state = classify(pose);
    const fallback = why => {
      counts.generatedOrProceduralFallbacks++; reasons.set(why, (reasons.get(why) || 0) + 1);
      while (reasons.size > 32) reasons.delete(reasons.keys().next().value);
      return original(ctx, value, x, y, requested, scale, pose);
    };
    if (!uid || state !== 'idle') return fallback(uid ? 'state-' + state : 'unknown-identity');
    const facing = root.RE_FIGHTER_DIRECTIONS?.facing
      ? root.RE_FIGHTER_DIRECTIONS.facing(pose.actor, requested, x, pose.opponentX)
      : requested === -1 || requested === 'left' ? -1 : 1;
    const item = native.resolve(uid, {facing, state});
    if (!item) return fallback('native-not-admitted');
    const visual = fighter.visual || {};
    let height = Math.max(45, Math.min(580, Number(visual.drawHeight || visual.height || 225)));
    const outputScale = Math.max(.05, Number.isFinite(scale) ? scale : 1) * Math.max(.25, Math.min(3, Number(visual.scale || 1)));
    const cap = Number.isFinite(visual.maxDrawWidth) ? visual.maxDrawWidth : 760;
    const width = height * item.referenceBounds.width / item.referenceBounds.height;
    if (width > cap) height *= cap / width;
    const result = native.draw(ctx, uid, {x, y, height: height * outputScale, state, facing, seconds: pose.time,
      reducedMotion: pose.reducedMotion === true || pose.reduceMotion === true});
    if (!result.ok) return fallback(result.reason);
    counts[result.animated ? 'nativeAnimatedDraws' : 'nativeStaticDraws']++;
    if (pose.actor && root.RE_SPATIAL?.draw && root.CQCCombat060?.box) root.RE_SPATIAL.draw(ctx, pose.actor, root.CQCCombat060.box(pose.actor), x, y, scale);
    return true;
  }
  for (const name of ['CQC_ACTORS_060', 'CQC_ACTORS_059', 'CQC_ACTORS_058']) {
    if (typeof root[name]?.draw === 'function') {originals.push([name, root[name]]); root[name] = Object.freeze({...root[name], draw});}
  }
  const art = root.CQC55_ART;
  if (art) root.CQC55_ART = Object.freeze({...art, drawFighter: draw});
  root.RE_RENDERER = Object.freeze({...renderer, drawFighter: draw});
  let installed = true;
  root.RE_NATIVE_ADAPTER_R31 = root.RE_NATIVE_ADAPTER_R30 = Object.freeze({classify, state: () => ({...counts, installed, reasons: Object.fromEntries(reasons),
    collisionOrReplayDataChanged: false, originalEngineChanged: false, inventedAnimations: 0}), uninstall() {
    if (!installed) return; installed = false;
    if (root.RE_RENDERER?.drawFighter === draw) root.RE_RENDERER = renderer;
    if (root.CQC55_ART?.drawFighter === draw) root.CQC55_ART = art;
    for (const [name, originalValue] of originals) if (root[name]?.draw === draw) root[name] = originalValue;
  }});
  // These choices affect artwork in this page only. No save, roster, form, combat or replay field is changed.
  const doc = root.document;
  if (!doc?.createElement) return;
  const trial = doc.getElementById('trialSubject'), filters = doc.getElementById('filters');
  const inputs = trial ? ['trialSubject', 'trialTarget'].map(id => doc.getElementById(id)).filter(Boolean)
    : ['p1Portrait', 'p2Portrait'].map(id => doc.getElementById(id)).filter(Boolean);
  const anchor = trial?.closest('.trial-form') || trial?.parentElement || filters;
  if (!anchor || !inputs.length) return;
  const details = doc.createElement('details'); details.className = 'r30-native-choices'; details.id = 'nativePresentationR30';
  const summary = doc.createElement('summary'); summary.textContent = 'Rendus natifs en 2D'; details.append(summary);
  const panel = doc.createElement('div'); panel.className = 'r30-native-choice-panel'; details.append(panel);
  const explanation = doc.createElement('p');
  explanation.textContent = 'Les variantes indiquent leur édition source. Une boucle neutre observée ne certifie pas le nom de l’action dans le jeu d’origine. Choix visuel pour cette page.';
  panel.append(explanation);
  const bindings = inputs.map((input, index) => {
    const label = doc.createElement('label'); label.textContent = 'Joueur ' + (index + 1) + ' · ';
    const select = doc.createElement('select'); select.setAttribute('aria-label', 'Rendu natif du joueur ' + (index + 1));
    const note = doc.createElement('p'); note.className = 'r30-native-choice-note';
    label.append(select); panel.append(label, note);
    const binding = {input, select, note, signature: '', uid: ''};
    select.addEventListener('change', () => {if (!native.selectVariant(binding.uid, select.value || null)) sync();});
    input.addEventListener('change', () => sync()); return binding;
  });
  const link = doc.createElement('a'); link.textContent = 'Voir les sprites et les mouvements natifs';
  link.href = new URL('../../fidelity-r30/native/index.html', doc.currentScript?.src || location.href).href; panel.append(link);
  const style = doc.createElement('style');
  style.textContent = '.r30-native-choices{position:relative;border:1px solid #647663;padding:7px;color:#e9e7cf;font:12px/1.45 system-ui;background:#101d17;max-width:100%}.r30-native-choices summary{cursor:pointer;font-weight:700}.r30-native-choice-panel{padding:8px;max-width:440px;overflow-wrap:anywhere}.r30-native-choice-panel label{display:block;margin:12px 0 0}.r30-native-choice-panel select{display:block;width:100%;max-width:100%;padding:8px;background:#15281d;color:#f2f0da;border:1px solid #829678;font:inherit}.r30-native-choice-panel p{margin:5px 0}.r30-native-choice-panel a{color:#ebd48d}.r30-native-choice-note{color:#bdc5b7;font-size:11px}#filters>.r30-native-choices[open]>.r30-native-choice-panel{position:absolute;right:0;top:100%;z-index:50;width:min(420px,88vw);max-height:52vh;overflow:auto;background:#101d17;border:1px solid #829678;box-shadow:0 8px 24px #000b}';
  doc.head.append(style);
  if (filters === anchor) anchor.append(details); else anchor.after(details);
  function sync() {
    for (const binding of bindings) {
      const uid = binding.input.tagName === 'SELECT' ? binding.input.value : binding.input.dataset.reSpecimen || '';
      const choices = native.availableVariants(uid), selected = native.selectedVariant(uid);
      const signature = uid + ':' + choices.map(choice => choice.id).join(',') + ':' + selected;
      if (signature === binding.signature) continue;
      binding.signature = signature; binding.uid = uid;
      const standard = doc.createElement('option'); standard.value = ''; standard.textContent = 'Apparence de l’incarnation sélectionnée';
      binding.select.replaceChildren(standard, ...choices.map(choice => {
        const option = doc.createElement('option'); option.value = choice.id;
        option.textContent = choice.sourceEdition + ' · boucle neutre observée'; return option;
      }));
      binding.select.value = selected || ''; binding.select.disabled = !choices.length;
      const exact = native.resolve(uid, {facing: 'right'}) || native.resolve(uid, {facing: 'left'});
      binding.note.textContent = choices.length ? 'Variante explicite ; les attaques gardent leur présentation disponible.'
        : exact?.kind === 'native-static-pose' ? 'Pose native statique : ' + (exact.sourceVariantLabel || exact.label) + ' · ' + exact.sourceEdition + '. Idle animé encore manquant.'
          : 'Aucune variante animée native qualifiée pour cette incarnation.';
    }
  }
  const observer = typeof root.MutationObserver === 'function' ? new root.MutationObserver(sync) : null;
  for (const binding of bindings) if (binding.input.tagName !== 'SELECT') observer?.observe(binding.input, {attributes: true, attributeFilter: ['data-re-specimen']});
  native.ready().then(sync); root.addEventListener?.('re:r30nativestatus', sync); sync();
  root.addEventListener?.('pagehide', () => observer?.disconnect());
  root.addEventListener?.('pageshow', () => {for (const binding of bindings) if (binding.input.tagName !== 'SELECT') observer?.observe(binding.input, {attributes: true, attributeFilter: ['data-re-specimen']}); sync();});
})(globalThis);
