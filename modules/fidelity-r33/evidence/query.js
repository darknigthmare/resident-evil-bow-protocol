(function (root) {
  'use strict';
  const SHA = /^[a-f0-9]{64}$/;
  const UID = /^[a-z0-9][a-z0-9-]{1,100}$/;
  const AUDIO_ROOT = 'modules/fidelity-r31/audio/clips/';
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  function create(input) {
    const manifest = JSON.parse(JSON.stringify(input));
    if (manifest.schema !== 're.bow.evidence-r33/1' || manifest.canonicalFidelityCertified !== false ||
        manifest.gameplayDataChanged !== false || !Array.isArray(manifest.entries) ||
        !Array.isArray(manifest.claims) || !Array.isArray(manifest.audioReviewQueue)) {
      throw new Error('Manifeste documentaire R33 non reconnu.');
    }
    const entries = new Map(), claims = new Map(), clips = new Map(), sources = new Map();
    for (const source of manifest.sources) {
      const url = new URL(source.url);
      if (!UID.test(source.id) || sources.has(source.id) || url.origin !== 'https://www.evilresource.com' ||
          source.httpStatus !== 200 || source.directPrimaryCapture !== false ||
          source.snapshot !== 'modules/fidelity-r33/evidence/snapshots/' + source.id + '.html.gz' ||
          !SHA.test(source.snapshotSha256) || !SHA.test(source.rawSha256)) throw new Error('Source non qualifiée.');
      sources.set(source.id, source);
    }
    for (const entry of manifest.entries) {
      if (!UID.test(entry.id) || entries.has(entry.id) || entry.canonicalFidelityCertified !== false) {
        throw new Error('Identité documentaire invalide.');
      }
      entries.set(entry.id, entry);
    }
    for (const claim of manifest.claims) {
      if (claims.has(claim.id) || !entries.has(claim.uid) || !sources.has(claim.sourceId) ||
          claim.gameKey !== entries.get(claim.uid).gameKey || claim.gameKey !== sources.get(claim.sourceId).gameKey ||
          claim.canonicalFidelityCertified !== false || claim.gameplayAdmitted !== false ||
          claim.targetEditionEquivalenceVerified !== false || !Array.isArray(claim.requiredConditions)) {
        throw new Error('Citation ou incarnation non qualifiée.');
      }
      claims.set(claim.id, claim);
    }
    for (const record of manifest.dimensionConstraints) {
      const claim = claims.get(record.claimId);
      if (!claim || claim.type !== 'dimension' || record.uid !== claim.uid || record.gameKey !== claim.gameKey ||
          record.phase !== claim.phase || record.bodyRegion !== claim.bodyRegion ||
          record.quantity !== 'length' || record.unit !== 'm' || record.operator !== 'less-than-or-equal' ||
          record.value !== 3 || record.siValueMeters !== 3 || record.exactValueCertified !== false ||
          record.targetCollisionAdmitted !== false) throw new Error('Borne documentaire non qualifiée.');
    }
    for (const record of manifest.conclusionRestrictions) {
      const claim = claims.get(record.claimId);
      if (!claim || claim.type !== 'own-body-outcome' || record.uid !== claim.uid || record.gameKey !== claim.gameKey ||
          record.phase !== claim.phase || record.bodyRegion !== claim.bodyRegion ||
          record.victimRole !== 'same-documented-' + (record.uid === 're6-napad' ? 'napad' : 'ubistvo') + '-body' ||
          record.gameplayAdmitted !== false || JSON.stringify(record.requiredConditions) !== JSON.stringify(claim.requiredConditions)) {
        throw new Error('Conclusion documentaire non qualifiée.');
      }
    }
    for (const clip of manifest.audioReviewQueue) {
      if (clips.has(clip.clipId) || !SHA.test(clip.sha256) || !clip.path.startsWith(AUDIO_ROOT) ||
          clip.path.includes('..') || !/\.(?:ogg|wav)$/.test(clip.path) ||
          !Number.isSafeInteger(clip.bytes) || clip.bytes <= 0 || clip.bytes > 2 * 1024 * 1024 ||
          !Array.isArray(clip.candidateIdentityIds) || clip.candidateIdentityIds.some(uid => !entries.has(uid)) ||
          clip.newMedia !== false || clip.independentlyListened !== false || clip.combatAudioAssigned !== false ||
          clip.action !== null || clip.phase !== null || clip.speaker !== null ||
          clip.targetEditionEquivalenceVerified !== false) throw new Error('Source audio ou attribution invalide.');
      clips.set(clip.clipId, clip);
    }
    for (const entry of entries.values()) {
      if (entry.claimIds.some(id => claims.get(id)?.uid !== entry.id) ||
          entry.audioClipIds.some(id => !clips.get(id)?.candidateIdentityIds.includes(entry.id))) {
        throw new Error('Lien de dossier incohérent.');
      }
    }
    freeze(manifest);
    const unknown = reason => freeze({ status: 'HELD_CONTEXT_NOT_PROVEN', reasons: [reason], gameplayAdmitted: false, canonicalFidelityCertified: false });
    function matchClaim(id, context = {}) {
      const claim = claims.get(id);
      if (!claim) return unknown('unknown-claim');
      const reasons = [];
      if (context.uid !== claim.uid) reasons.push('identity-mismatch');
      if (context.gameKey !== claim.gameKey) reasons.push('game-mismatch');
      if (context.phase !== claim.phase) reasons.push('phase-mismatch');
      if (context.bodyRegion !== claim.bodyRegion) reasons.push('anatomy-mismatch');
      const conditions = new Set(Array.isArray(context.conditions) ? context.conditions : []);
      for (const condition of claim.requiredConditions) if (!conditions.has(condition)) reasons.push('missing-condition:' + condition);
      return freeze({ status: reasons.length ? 'HELD_CONTEXT_NOT_PROVEN' : 'DOCUMENTARY_CONTEXT_MATCH',
        reasons, claimId: claim.id, sourceId: claim.sourceId, editionEquivalenceVerified: false,
        gameplayAdmitted: false, canonicalFidelityCertified: false });
    }
    function dimension(id, context = {}) {
      const record = manifest.dimensionConstraints.find(item => item.id === id);
      if (!record) return unknown('unknown-dimension');
      const matched = matchClaim(record.claimId, context);
      const reasons = matched.reasons.slice();
      if (context.quantity !== record.quantity) reasons.push('quantity-mismatch');
      if (context.unit !== record.unit) reasons.push('unit-mismatch');
      return freeze({ status: reasons.length ? 'HELD_CONTEXT_NOT_PROVEN' : 'DOCUMENTARY_BOUND_ONLY', reasons,
        value: reasons.length ? null : record.value, operator: record.operator, unit: record.unit,
        bodyRegion: record.bodyRegion, physicalCollisionAllowed: false, exactValueCertified: false,
        gameplayAdmitted: false, canonicalFidelityCertified: false });
    }
    function conclusion(id, context = {}) {
      const record = manifest.conclusionRestrictions.find(item => item.id === id);
      if (!record) return unknown('unknown-outcome');
      const matched = matchClaim(record.claimId, context);
      const reasons = matched.reasons.slice();
      if (context.victimRole !== record.victimRole) reasons.push('victim-role-mismatch');
      if (context.victimUid !== record.uid) reasons.push('victim-is-not-the-documented-own-body');
      return freeze({ status: reasons.length ? 'HELD_CONTEXT_NOT_PROVEN' : 'DOCUMENTARY_OWN_BODY_CONTEXT_ONLY',
        reasons, arbitraryVictimCompatibility: false, gameplayAdmitted: false, canonicalFidelityCertified: false });
    }
    return Object.freeze({ manifest, entry: uid => entries.get(uid) || null,
      claimsFor: uid => freeze((entries.get(uid)?.claimIds || []).map(id => claims.get(id))),
      audioFor: uid => freeze((entries.get(uid)?.audioClipIds || []).map(id => clips.get(id))),
      claim: id => claims.get(id) || null, source: id => sources.get(id) || null,
      clip: id => clips.get(id) || null, matchClaim, dimension, conclusion });
  }
  root.RE_EVIDENCE_R33 = Object.freeze({ create });
})(globalThis);
