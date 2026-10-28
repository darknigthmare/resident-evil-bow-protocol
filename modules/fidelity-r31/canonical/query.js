/* Conditional documentary queries. These functions never assign gameplay data. */
const UID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ids = values => new Set(values.map(value => value.id));
function freeze(value) {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;}
export function validate(value) {
  const pack = JSON.parse(JSON.stringify(value));
  if (pack.schema !== 're.bow.canonical-conditional-r31/1' || pack.release !== 'R31'
      || pack.canonicalFidelityCertified !== false || pack.gameplayDataChanged !== false
      || !Array.isArray(pack.entries) || pack.entries.length > 389
      || !Array.isArray(pack.claims) || pack.claims.length > 1024 || !Array.isArray(pack.sources) || pack.sources.length > 128
      || !Array.isArray(pack.sourceDimensions) || pack.sourceDimensions.length > 128
      || !Array.isArray(pack.conclusionRules) || pack.conclusionRules.length > 128
      || !Array.isArray(pack.aliasDecisions) || pack.aliasDecisions.length > 128) throw Error('Unsupported conditional evidence');
  for (const name of ['entries', 'claims', 'sources', 'sourceDimensions', 'conclusionRules', 'aliasDecisions']) {
    if (ids(pack[name]).size !== pack[name].length) throw Error('Duplicate documentary identity');
  }
  const entries = new Map(pack.entries.map(row => [row.id, row]));
  const claims = new Map(pack.claims.map(row => [row.id, row]));
  const sources = new Map(pack.sources.map(row => [row.id, row]));
  for (const row of pack.sources) {
    const url = new URL(row.url), final = new URL(row.effectiveUrl);
    if (url.protocol !== 'https:' || final.protocol !== 'https:' || url.hostname !== final.hostname
        || !['www.evilresource.com', 'blackjackrants.blogspot.com', 'models.spriters-resource.com'].includes(url.hostname)
        || url.username || url.password || row.httpStatus !== 200 || row.challengePage !== false
        || row.directPrimaryCapture !== false || row.canonicalFidelityCertified !== false
        || !/^modules\/fidelity-r31\/canonical\/snapshots\/[a-z0-9-]+\.html\.gz$/.test(row.snapshot)
        || url.hostname === 'www.evilresource.com' && !url.pathname.startsWith('/' + row.gameKey + '/')
        || !/^[a-f0-9]{64}$/.test(row.rawSha256) || !/^[a-f0-9]{64}$/.test(row.snapshotSha256)) throw Error('Unverified documentary source');
  }
  for (const row of pack.entries) if (!UID.test(row.id) || typeof row.label !== 'string' || typeof row.gameKey !== 'string') throw Error('Invalid exact subject');
  for (const row of pack.claims) {
    const subject = entries.get(row.uid);
    if (!subject || row.gameKey !== subject.gameKey || !row.phase || !row.sourceEdition
        || typeof row.targetEditionMatched !== 'boolean' || row.canonicalFidelityCertified !== false || row.directPrimaryCapture !== false
        || !['NEW_DOCUMENTARY_FACT', 'REUSED_SOURCE_FACT'].includes(row.novelty)
        || !Array.isArray(row.conditions) || row.conditions.length > 16 || !Array.isArray(row.evidence) || !row.evidence.length) throw Error('Invalid conditional claim');
    for (const proof of row.evidence) {
      const source = sources.get(proof.sourceId);
      if (!source || source.gameKey !== subject.gameKey || typeof proof.excerpt !== 'string' || !proof.excerpt.trim() || proof.excerpt.length > 600) throw Error('Claim crosses a game or source');
    }
  }
  for (const row of pack.sourceDimensions) {
    const claim = claims.get(row.claimId);
    if (!claim || claim.uid !== row.uid || claim.type !== 'dimension' || !row.phase || !row.bodyRegion
        || row.targetCollisionAdmitted !== false || row.exactValueCertified !== false) throw Error('Dimension phase or collision scope differs');
    if (row.operator === 'qualitative-order-of-magnitude') {
      if (row.value !== null || row.siValueMeters !== null) throw Error('Qualitative scale cannot become numeric');
    } else if (!['approximately', 'greater-than'].includes(row.operator) || !['m', 'cm'].includes(row.unit)
        || !Number.isFinite(row.value) || row.value <= 0 || row.siValueMeters !== row.value * (row.unit === 'cm' ? .01 : 1)) throw Error('Dimension unit conversion differs');
  }
  for (const row of pack.aliasDecisions) if (!entries.has(row.uid) || row.promoted !== false || row.targetEditionMatched !== false) throw Error('Held alias promoted');
  for (const row of pack.conclusionRules) {
    const claim = claims.get(row.claimId);
    if (!claim || claim.uid !== row.uid || claim.gameKey !== row.gameKey || row.sourceContextOnly !== true
        || row.gameplayAdmitted !== false || row.canonicalFidelityCertified !== false
        || !row.phase || !row.environment || !row.victimRole || !Array.isArray(row.requiredConditions)
        || row.requiredConditions.length > 16 || new Set(row.requiredConditions).size !== row.requiredConditions.length) throw Error('Conclusion leaves its source context');
  }
  return freeze(pack);
}
export function subject(pack, uid) {
  const entry = pack.entries.find(row => row.id === uid);
  if (!entry) return null;
  return freeze({entry, claims: pack.claims.filter(row => row.uid === uid), dimensions: pack.sourceDimensions.filter(row => row.uid === uid),
    aliasDecisions: pack.aliasDecisions.filter(row => row.uid === uid), conclusionRules: pack.conclusionRules.filter(row => row.uid === uid)});
}
export function dimension(pack, id, request = {}) {
  const value = pack.sourceDimensions.find(row => row.id === id);
  if (!value) return freeze({supported: false, reason: 'unknown-dimension', collisionAdmitted: false});
  if (request.uid !== value.uid || request.phase !== value.phase || request.bodyRegion !== value.bodyRegion) {
    return freeze({supported: false, reason: 'body-phase-or-subject-differs', collisionAdmitted: false});
  }
  if (request.forCollision === true) return freeze({supported: false, reason: 'source-dimension-is-not-collision-calibration', collisionAdmitted: false});
  return freeze({supported: true, reason: 'documented-source-constraint', value, collisionAdmitted: false, exactValueCertified: false});
}
export function conclusion(pack, id, request = {}) {
  const rule = pack.conclusionRules.find(row => row.id === id);
  const held = (reason, missingConditions = []) => freeze({documentarySupported: false, gameplayAdmitted: false, reason, missingConditions});
  if (!rule) return held('unknown-conclusion');
  if (request.uid !== rule.uid || request.gameKey !== rule.gameKey) return held('subject-or-game-edition-differs');
  if (request.victimUid) return held('arbitrary-catalogue-victim-not-documented');
  if (request.victimMorphology && !(request.victimMorphology === 'human' && rule.victimRole === 'reported-human-worker')) return held('victim-morphology-not-documented');
  if (request.phase !== rule.phase || request.environment !== rule.environment || request.victimRole !== rule.victimRole) return held('source-phase-environment-or-victim-differs');
  if (!Array.isArray(request.conditions) || request.conditions.length > 32 || request.conditions.some(value => typeof value !== 'string')) return held('invalid-condition-set');
  const missing = rule.requiredConditions.filter(value => !request.conditions.includes(value));
  if (missing.length) return held('required-source-conditions-missing', missing);
  return freeze({documentarySupported: true, gameplayAdmitted: false, reason: 'matches-documented-source-context',
    lethality: rule.lethality, outcome: rule.outcome, claimId: rule.claimId,
    canonicalFidelityCertified: false, sourceContextOnly: true});
}
export function alias(pack, id) {
  const value = pack.aliasDecisions.find(row => row.id === id);
  return value ? freeze({status: value.status, promoted: false, decision: value}) : freeze({status: 'UNKNOWN_RELATION', promoted: false});
}
