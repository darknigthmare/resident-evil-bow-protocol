import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = 'modules/fidelity-r33/evidence';
const raw = JSON.parse(fs.readFileSync(path.join(root, pack, 'manifest.json')));
const sandbox = vm.createContext({URL});
vm.runInContext(fs.readFileSync(path.join(root, pack, 'query.js'), 'utf8'), sandbox);
const create = input => sandbox.RE_EVIDENCE_R33.create(input);
const api = create(raw), checks = [];
function test(name, run) {
  try { const detail = run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
const context = claim => ({uid: claim.uid, gameKey: claim.gameKey, phase: claim.phase,
  bodyRegion: claim.bodyRegion, conditions: [...claim.requiredConditions]});
test('Every exact UID exposes only its own claims and candidate audio contexts', () => {
  assert.equal(api.manifest.entries.length, 18);
  for (const entry of api.manifest.entries) {
    assert.equal(api.entry(entry.id).id, entry.id);
    assert(api.claimsFor(entry.id).every(claim => claim.uid === entry.id));
    assert(api.audioFor(entry.id).every(clip => clip.candidateIdentityIds.includes(entry.id)));
  }
  for (const uid of ['RE0-STINGER', '__proto__', 'constructor', 're0-stinger-extra']) assert.equal(api.entry(uid), null);
  return {exactDossiers: 18, implicitAliases: 0};
});
test('Source inputs are copied and deeply frozen instead of mutating caller data', () => {
  assert(Object.isFrozen(api.manifest.claims[0]) && Object.isFrozen(api.manifest.audioReviewQueue[0].candidateIdentityIds));
  assert.throws(() => {api.manifest.claims[0].uid = 'fake';}, TypeError);
  const copy = structuredClone(raw), other = create(copy); copy.claims[0].uid = 'fake';
  assert.equal(other.claim('R33-EVID-001').uid, 're0-stinger');
  return {deepFrozen: true, inputIndependent: true};
});
test('Every complete cited context matches documentarily and never admits gameplay', () => {
  for (const claim of api.manifest.claims) {
    const result = api.matchClaim(claim.id, context(claim));
    assert.equal(result.status, 'DOCUMENTARY_CONTEXT_MATCH'); assert.equal(result.gameplayAdmitted, false);
    assert.equal(result.canonicalFidelityCertified, false); assert.equal(result.editionEquivalenceVerified, false);
  }
  return {documentaryMatches: 35, gameplayAssignments: 0};
});
test('Identity, original game, phase and anatomical region are independent context gates', () => {
  const claim = api.claim('R33-EVID-026');
  for (const change of [{uid: 're6-ustanak'}, {gameKey: 'resident-evil-5'}, {phase: 'idle'}, {bodyRegion: 'left-hand'}]) {
    assert.equal(api.matchClaim(claim.id, {...context(claim), ...change}).status, 'HELD_CONTEXT_NOT_PROVEN');
  }
  assert.equal(api.matchClaim('missing').status, 'HELD_CONTEXT_NOT_PROVEN');
  return {wrongContextCasesRejected: 5};
});
test('Every missing encounter or physical condition fails closed', () => {
  let cases = 0;
  for (const claim of api.manifest.claims) for (const condition of claim.requiredConditions) {
    const result = api.matchClaim(claim.id, {...context(claim), conditions: claim.requiredConditions.filter(item => item !== condition)});
    assert.equal(result.status, 'HELD_CONTEXT_NOT_PROVEN'); assert(result.reasons.includes('missing-condition:' + condition)); cases++;
  }
  return {independentConditionsRejected: cases};
});
test('Stinger length remains an upper bound including pincers with no collision permission', () => {
  const claim = api.claim('R33-EVID-001'), query = {...context(claim), quantity: 'length', unit: 'm'};
  const result = api.dimension('stinger-length-upper-bound', query);
  assert.equal(result.status, 'DOCUMENTARY_BOUND_ONLY'); assert.equal(result.value, 3);
  assert.equal(result.operator, 'less-than-or-equal'); assert.equal(result.physicalCollisionAllowed, false);
  for (const change of [{bodyRegion: 'head'}, {quantity: 'height'}, {unit: 'cm'}, {phase: 'juvenile'}]) {
    assert.equal(api.dimension('stinger-length-upper-bound', {...query, ...change}).value, null);
  }
  return {upperBoundMeters: 3, unsupportedTransfers: 4};
});
test('Own-body outcomes cannot certify a finishing move against any arbitrary catalogue victim', () => {
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data/roster.json'))).catalog;
  let queries = 0;
  for (const rule of api.manifest.conclusionRestrictions) {
    const base = {...context(api.claim(rule.claimId)), victimUid: rule.uid, victimRole: rule.victimRole};
    assert.equal(api.conclusion(rule.id, base).status, 'DOCUMENTARY_OWN_BODY_CONTEXT_ONLY');
    for (const victim of catalogue) {
      const result = api.conclusion(rule.id, {...base, victimUid: victim.id, victimRole: 'arbitrary-catalogue-bow'});
      assert.equal(result.status, 'HELD_CONTEXT_NOT_PROVEN'); assert.equal(result.arbitraryVictimCompatibility, false); queries++;
    }
  }
  return {explicitArbitraryVictimQueries: queries, arbitraryVictimCompatibility: false};
});
test('The heard growl stays unidentified despite a nearby Nosferatu documentary context', () => {
  const claim = api.claim('R33-EVID-021'); assert.equal(claim.actorRole, 'unidentified-heard-source');
  assert.equal(claim.phase, 'underground-confinement');
  const candidates = api.audioFor('recv-nosferatu'); assert.equal(candidates.length, 5);
  for (const clip of candidates) {
    assert(clip.contextClaimIds.includes(claim.id)); assert.equal(clip.speaker, null); assert.equal(clip.action, null);
    assert.equal(clip.targetEditionEquivalenceVerified, false); assert.equal(clip.independentlyListened, false);
  }
  return {candidateFiles: 5, inferredSpeakerOrActionAssignments: 0};
});
test('All218 audio references retain old file bytes and no new media claim', () => {
  assert.equal(api.manifest.audioReviewQueue.length, 218);
  for (const clip of api.manifest.audioReviewQueue) {
    const bytes = fs.readFileSync(path.join(root, clip.path));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), clip.sha256);
    assert.equal(clip.newMedia, false); assert.equal(clip.combatAudioAssigned, false);
  }
  return {reusedFilesChecked: 218, newlyCreatedFiles: 0};
});
test('Forged cross-identity source or admission metadata is rejected', () => {
  let rejected = 0;
  for (const edit of [
    m => {m.claims[0].uid = 're6-napad';}, m => {m.claims[0].gameplayAdmitted = true;},
    m => {m.claims[0].targetEditionEquivalenceVerified = true;},
    m => {m.sources[0].url = 'javascript:alert(1)';}, m => {m.sources[0].directPrimaryCapture = true;},
    m => {m.entries[0].claimIds.push('nonexistent');},
    m => {m.dimensionConstraints[0].value = 30;}, m => {m.dimensionConstraints[0].targetCollisionAdmitted = true;},
    m => {m.conclusionRestrictions[0].victimRole = 'any-bow';},
    m => {m.conclusionRestrictions[0].requiredConditions = [];}
  ]) { const changed = structuredClone(raw); edit(changed); assert.throws(() => create(changed)); rejected++; }
  return {forgedProofInputsRejected: rejected};
});
test('Audio URL traversal, corrupt hashes, oversized data and invented attributions are rejected', () => {
  let rejected = 0;
  for (const edit of [
    m => {m.audioReviewQueue[0].path = '../outside.wav';},
    m => {m.audioReviewQueue[0].path = 'modules/fidelity-r31/audio/clips/../../outside.wav';},
    m => {m.audioReviewQueue[0].sha256 = 'not-a-hash';},
    m => {m.audioReviewQueue[0].bytes = 3 * 1024 * 1024;},
    m => {m.audioReviewQueue[0].speaker = 'Nosferatu';},
    m => {m.audioReviewQueue[0].phase = 'attack';},
    m => {m.audioReviewQueue[0].independentlyListened = true;},
    m => {m.audioReviewQueue[0].newMedia = true;}
  ]) { const changed = structuredClone(raw); edit(changed); assert.throws(() => create(changed)); rejected++; }
  return {invalidAudioInputsRejected: rejected};
});
test('Missing exact Jack image remains missing while every claimed input hash is current', () => {
  assert.equal(api.entry('re7-jack-baker-scissor'), null);
  assert.equal(api.manifest.missingExactReferences[0].status, 'EXACT_PHASE_IMAGE_STILL_MISSING');
  for (const source of api.manifest.inputs) {
    const bytes = fs.readFileSync(path.join(root, source.path));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), source.sha256);
  }
  return {newJackAvatar: false, currentInputHashes: api.manifest.inputs.length};
});
const paths = ['tests/verify-evidence-r33.mjs', pack + '/query.js', pack + '/manifest.json'];
const sourceFiles = paths.map(file => {const bytes = fs.readFileSync(path.join(root, file)); return {path: file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')};});
const report = {schema: 're.bow.evidence-query-tests-r33/1', passed: checks.filter(x => x.pass).length,
  failed: checks.filter(x => !x.pass).length, sourceFiles, checks};
fs.writeFileSync(path.join(root, 'docs/R33_EVIDENCE_QUERY_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
if (report.failed) process.exitCode = 1;
