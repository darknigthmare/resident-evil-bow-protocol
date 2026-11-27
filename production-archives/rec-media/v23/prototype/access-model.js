/* V23 isolated design prototype. No game save, payment or runtime integration. */
(function (root) {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const text = value => typeof value === 'string' && value.length > 0 && value.length <= 180;
  const own = (value, key) => record(value) && Object.hasOwn(value, key) ? value[key] : undefined;
  const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const part of Object.values(value)) freeze(part);
    }
    return value;
  };

  function emptyLedger(profileId) {
    if (!text(profileId)) throw new TypeError('Profil requis.');
    return { schema: 'rec-access-prototype/1', profileId, events: [], sources: [] };
  }

  function eventPayload(event) {
    return {
      eventId: event.eventId, profileId: event.profileId, sourceId: event.sourceId,
      contentId: event.contentId, revision: event.revision, issuedAt: event.issuedAt,
      action: event.action, kind: event.kind ?? null, validFrom: event.validFrom ?? null,
      validUntil: event.validUntil ?? null, proofUntil: event.proofUntil ?? null,
      reason: event.reason ?? null
    };
  }

  /** Authentication is deliberately external. An arbitrary client flag is never a proof. */
  function applyGrantEvent(ledger, event, authority) {
    if (!record(ledger) || ledger.schema !== 'rec-access-prototype/1' || !Array.isArray(ledger.events) || !Array.isArray(ledger.sources)) throw new TypeError('Journal invalide.');
    if (!record(event) || !authority || typeof authority.verify !== 'function' || authority.verify(event) !== true) throw new Error('Événement non vérifié par l’autorité.');
    for (const key of ['eventId', 'profileId', 'sourceId', 'contentId']) if (!text(event[key])) throw new TypeError('Identifiant invalide : ' + key);
    if (event.profileId !== ledger.profileId) throw new Error('Événement destiné à un autre profil.');
    if (!Number.isSafeInteger(event.revision) || event.revision < 1 || !finite(event.issuedAt) || event.issuedAt < 0) throw new TypeError('Révision ou date invalide.');
    if (!['grant', 'revoke'].includes(event.action)) throw new TypeError('Action inconnue.');
    if (event.action === 'grant') {
      if (!['permanent', 'temporary'].includes(event.kind)) throw new TypeError('Type de droit inconnu.');
      if (!finite(event.validFrom) || event.validFrom < 0 || event.validFrom > event.issuedAt) throw new TypeError('Début de droit invalide.');
      if (event.kind === 'temporary' && (!finite(event.validUntil) || event.validUntil <= event.validFrom || !finite(event.proofUntil) || event.proofUntil < event.issuedAt || event.proofUntil > event.validUntil)) throw new TypeError('Justificatif temporaire invalide.');
      if (event.kind === 'permanent' && (event.validUntil != null || event.proofUntil != null)) throw new TypeError('Une acquisition permanente ne possède pas d’échéance.');
    } else if (!text(event.reason)) throw new TypeError('Motif de retrait requis.');
    const payload = eventPayload(event), signature = JSON.stringify(payload);
    const duplicate = ledger.events.find(entry => entry.eventId === event.eventId);
    if (duplicate) {
      if (duplicate.signature !== signature) throw new Error('Identifiant d’événement réutilisé avec un autre contenu.');
      return { ledger, changed: false, outcome: 'duplicate' };
    }
    const current = ledger.sources.find(source => source.sourceId === event.sourceId);
    if (current && current.contentId !== event.contentId) throw new Error('Une source ne peut pas changer de contenu.');
    if (current && event.action === 'grant' && current.kind && event.kind !== current.kind) throw new Error('Une source ne peut pas changer de permanence.');
    if (current && current.revision === event.revision) throw new Error('Révision conflictuelle ; resynchronisation requise.');
    const next = clone(ledger);
    next.events.push({ eventId: event.eventId, signature });
    if (current && current.revision > event.revision) return { ledger: next, changed: false, outcome: 'stale' };
    const source = {
      sourceId: event.sourceId, contentId: event.contentId, revision: event.revision,
      issuedAt: event.issuedAt, kind: event.kind ?? current?.kind ?? null,
      status: event.action === 'grant' ? 'granted' : 'revoked',
      validFrom: event.action === 'grant' ? event.validFrom : current?.validFrom ?? null,
      validUntil: event.action === 'grant' ? event.validUntil ?? null : current?.validUntil ?? null,
      proofUntil: event.action === 'grant' ? event.proofUntil ?? null : current?.proofUntil ?? null,
      reason: event.action === 'revoke' ? event.reason : null
    };
    next.sources = next.sources.filter(item => item.sourceId !== source.sourceId).concat(source);
    return { ledger: next, changed: true, outcome: event.action === 'grant' ? 'granted' : 'revoked' };
  }

  /** A small data language. No eval, script strings, inherited fields or truthy coercion. */
  function evaluateRule(rule, facts = {}, depth = 0) {
    const invalid = { valid: false, complete: false, kind: 'invalid', children: [] };
    if (depth > 12 || !record(rule)) return invalid;
    if (rule.op === 'all' || rule.op === 'any') {
      if (!Array.isArray(rule.rules) || !rule.rules.length || rule.rules.length > 64) return invalid;
      const children = rule.rules.map(child => evaluateRule(child, facts, depth + 1));
      if (children.some(child => !child.valid)) return invalid;
      return { valid: true, complete: rule.op === 'all' ? children.every(child => child.complete) : children.some(child => child.complete), kind: rule.op, children };
    }
    if (!text(rule.key)) return invalid;
    if (rule.op === 'fact') return { valid: true, complete: own(facts, rule.key) === true, kind: 'fact', key: rule.key, label: text(rule.label) ? rule.label : 'Objectif', children: [] };
    if (rule.op === 'counter') {
      if (!Number.isSafeInteger(rule.target) || rule.target <= 0) return invalid;
      const raw = own(facts, rule.key), value = Number.isSafeInteger(raw) && raw >= 0 ? raw : 0;
      return { valid: true, complete: value >= rule.target, kind: 'counter', key: rule.key, current: Math.min(value, rule.target), target: rule.target, label: text(rule.label) ? rule.label : 'Objectif', children: [] };
    }
    return invalid;
  }

  function resolveAccess(content, profile, context) {
    const now = context.now;
    if (!finite(now) || now < 0) return { state: 'pending', granted: false, sources: [], reason: 'time-unverified', claimable: false };
    const ledger = profile.ledger;
    if (!record(ledger) || ledger.schema !== 'rec-access-prototype/1' || ledger.profileId !== profile.id || !Array.isArray(ledger.sources) || !Array.isArray(ledger.events)) return { state: 'pending', granted: false, sources: [], reason: 'profile-unverified', claimable: false };
    const sources = ledger.sources.filter(source => source.contentId === content.id);
    const active = sources.filter(source => source.status === 'granted' && source.validFrom <= now);
    const permanent = active.filter(source => source.kind === 'permanent');
    if (permanent.length) return { state: 'permanent', granted: true, sources: permanent.map(source => source.sourceId), claimable: false };
    // A cache is accepted only until the earlier of the entitlement and proof deadlines.
    const temporary = active.filter(source => source.kind === 'temporary' && now < source.validUntil && now < source.proofUntil);
    if (temporary.length) return { state: 'temporary', granted: true, sources: temporary.map(source => source.sourceId), validUntil: Math.max(...temporary.map(source => Math.min(source.validUntil, source.proofUntil))), offlineCached: context.network !== 'online', claimable: false };
    const condition = content.rule ? evaluateRule(content.rule, profile.facts) : null;
    if (condition?.valid && condition.complete && content.claim === 'manual') return { state: 'claimable', granted: false, sources: [], claimable: true };
    // A satisfied condition is not an authenticated grant. Automatic awards need a validated event.
    if (condition?.valid && condition.complete && content.claim === 'automatic') return { state: 'pending', granted: false, sources: [], reason: 'award-pending', claimable: false };
    const unexpired = active.some(source => source.kind === 'temporary' && now < source.validUntil);
    if (unexpired || profile.pending?.includes(content.id)) return { state: 'pending', granted: false, sources: [], reason: context.network === 'online' ? 'verification-required' : 'service-unavailable', claimable: false };
    if (active.some(source => source.kind === 'temporary' && now >= source.validUntil)) return { state: 'expired', granted: false, sources: [], claimable: false };
    if (sources.some(source => source.status === 'revoked')) return { state: 'revoked', granted: false, sources: [], claimable: false };
    if (sources.some(source => source.status === 'granted' && source.validFrom > now)) return { state: 'pending', granted: false, sources: [], reason: 'not-yet-valid', claimable: false };
    return { state: 'none', granted: false, sources: [], claimable: false };
  }

  function resolveSlot(content, profile, context, catalogue, stack = []) {
    if (!content || !text(content.id) || !Array.isArray(catalogue)) throw new TypeError('Contenu invalide.');
    const rawDiscovery = own(profile.discovery, content.id) || 'secret';
    const discovery = context.revealSecrets === true ? 'identified' : rawDiscovery === 'identified' ? 'identified' : rawDiscovery === 'hint' && content.hintAllowed === true ? 'hint' : 'secret';
    const access = resolveAccess(content, profile, context);
    const installation = own(context.installations, content.id);
    let technical = ['ready', 'missing', 'update', 'error', 'pending'].includes(installation?.status) ? installation.status : 'missing';
    if (technical === 'ready' && installation.version !== content.version) technical = 'update';
    const compatibility = [];
    if (stack.includes(content.id)) compatibility.push('dependency-cycle');
    if (!Array.isArray(content.modes) || !content.modes.includes(context.mode)) compatibility.push('mode');
    if (!context.allowDuplicates && (context.team || []).includes(content.group || content.id)) compatibility.push('duplicate');
    if (!stack.includes(content.id)) {
      for (const id of content.requires || []) {
        const dependency = catalogue.find(item => item.id === id);
        if (!dependency) { compatibility.push('dependency-missing'); continue; }
        const result = resolveSlot(dependency, profile, { ...context, allowDuplicates: true }, catalogue, stack.concat(content.id));
        if (!result.actions.select) compatibility.push(result.compatibility.includes('dependency-cycle') ? 'dependency-cycle' : 'dependency');
      }
    }
    const compatible = compatibility.length === 0;
    const usable = technical === 'ready' && compatible;
    const disclosed = discovery === 'identified';
    const permissions = {
      inspect: true,
      preview: disclosed && (content.preview === 'free' || access.granted),
      select: disclosed && access.granted && usable,
      participate: usable && (content.participation === 'everyone' || access.granted),
      train: disclosed && usable && (content.training === 'free' || access.granted),
      replay: technical === 'ready' && content.replay === 'allowed'
    };
    const blockers = [];
    if (!disclosed) blockers.push('discovery');
    if (!access.granted) blockers.push(access.state);
    if (technical !== 'ready') blockers.push(technical);
    blockers.push(...compatibility);
    const view = {
      name: disclosed ? content.name : discovery === 'hint' ? content.hintName || 'Dossier partiellement révélé' : 'Dossier classifié',
      origin: disclosed ? content.origin : discovery === 'hint' ? content.hintOrigin || 'Informations partielles' : 'Identité non révélée',
      image: discovery === 'secret' ? null : (discovery === 'hint' || permissions.preview) ? content.image || null : null,
      imageAlt: disclosed ? 'Pose de référence de ' + content.name : discovery === 'hint' ? 'Silhouette autorisée du dossier' : '',
      condition: disclosed ? content.condition : content.safeCondition || 'Poursuivre l’enquête pour découvrir ce dossier.',
      lore: disclosed ? content.lore : 'Informations protégées par la découverte.'
    };
    return freeze({ id: content.id, category: content.category, discovery, access, technical, compatibility, actions: permissions, blockers, view, rule: disclosed && content.rule ? evaluateRule(content.rule, profile.facts) : null });
  }

  function selectableIds(catalogue, profile, context) {
    return catalogue.filter(content => resolveSlot(content, profile, context, catalogue).actions.select).map(content => content.id);
  }

  function resolveSavedChoice(preferredId, fallbackIds, catalogue, profile, context) {
    const ids = [preferredId, ...fallbackIds.filter(id => id !== preferredId)];
    for (const id of ids) {
      const content = catalogue.find(item => item.id === id);
      if (content && resolveSlot(content, profile, context, catalogue).actions.select) return { preferredId, effectiveId: id, substituted: id !== preferredId };
    }
    return { preferredId, effectiveId: null, substituted: true };
  }

  function createSessionSnapshot(ids, catalogue, profile, context) {
    if (!Array.isArray(ids) || !ids.length) throw new Error('Sélection de session vide.');
    const team = [...(context.team || [])];
    const items = ids.map(id => {
      const content = catalogue.find(item => item.id === id);
      if (!content || !resolveSlot(content, profile, { ...context, team }, catalogue).actions.select) throw new Error('Configuration indisponible : ' + id);
      team.push(content.group || content.id);
      return { id, version: content.version };
    });
    return freeze({ schema: 'rec-access-session-demo/1', profileId: profile.id, startedAt: context.now, mode: context.mode, items });
  }

  /** Isolated menu ownership. A pending image cannot resurrect a cancelled selection. */
  function createSelectionController(onChange = () => {}) {
    let generation = 0, state = freeze({ phase: 'idle', id: null, token: 0, preview: null, imageStatus: 'none', message: '' });
    const publish = changes => { state = freeze({ ...state, ...changes }); onChange(state); return state; };
    return {
      get state() { return state; },
      begin(id) {
        if (!text(id)) throw new TypeError('Sélection invalide.');
        generation += 1;
        publish({ phase: 'preselect', id, token: generation, preview: null, imageStatus: 'loading', message: '' });
        return generation;
      },
      accept(token, id, preview) {
        if (token !== generation || id !== state.id || !['preselect', 'confirmed', 'blocked'].includes(state.phase)) return false;
        publish({ preview, imageStatus: 'ready' }); return true;
      },
      fail(token, id) {
        if (token !== generation || id !== state.id) return false;
        publish({ preview: null, imageStatus: 'error', message: 'Aperçu indisponible. Les conditions restent consultables.' }); return true;
      },
      confirm(canSelect) {
        if (!state.id || state.phase === 'confirmed') return false;
        // Revalidate at the instant of confirmation, independently of image completion.
        const decision = canSelect(state.id);
        if (decision !== true) { publish({ phase: 'blocked', message: typeof decision === 'string' ? decision : 'Consulter les conditions de ce dossier.' }); return false; }
        publish({ phase: 'confirmed', message: 'Choix confirmé dans ce prototype.' }); return true;
      },
      announce(message) { publish({ message: String(message) }); },
      cancel() {
        generation += 1;
        publish({ phase: 'deselected', id: null, token: generation, preview: null, imageStatus: 'none', message: 'Choix retiré. Aucun effet d’aperçu conservé.' });
      },
      invalidate() {
        generation += 1;
        publish({ phase: 'idle', id: null, token: generation, preview: null, imageStatus: 'none', message: '' });
      }
    };
  }

  root.REC_ACCESS_V23 = Object.freeze({ emptyLedger, applyGrantEvent, evaluateRule, resolveSlot, selectableIds, resolveSavedChoice, createSessionSnapshot, createSelectionController });
})(typeof window === 'undefined' ? globalThis : window);
