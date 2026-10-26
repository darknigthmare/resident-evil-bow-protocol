/** Cross-module R29 checks on the actual deliverable, without edition promotion. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const checks = [], pack = read('modules/fidelity-r29/sprites/manifest.json');
const baseline = read('modules/fidelity-r28/sprites/manifest.json'), tracking = read('docs/R29_TRACKING.json');
const oldSprites = new Map(baseline.sprites.map(entry => [entry.id, entry]));
function test(name, run) {
  try {const detail = run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
function file(entry, base = '') {
  const target = path.resolve(root, base, entry.path);
  assert(!path.relative(root, target).startsWith('..'), entry.path);
  const raw = fs.readFileSync(target); assert.equal(raw.length, entry.bytes, entry.path);
  assert.equal(sha(raw), entry.sha256, entry.path); return raw;
}
test('All identities and open workstreams remain explicit, with current evidence hashes', () => {
  const ids = read('data/roster.json').catalog.map(entry => entry.id).sort();
  assert.equal(ids.length, 389); assert.deepEqual(tracking.identity_updates.map(entry => entry.id).sort(), ids);
  assert.equal(tracking.tasks.length, 17); assert(tracking.tasks.every(entry => entry.status === 'EN COURS' && entry.remaining.length));
  assert.equal(tracking.canonical_fidelity_certified, 0);
  for (const input of tracking.inputs) {
    const target = path.resolve(root, input.path); assert(!path.relative(root, target).startsWith('..'));
    assert.equal(sha(fs.readFileSync(target)), input.sha256, input.path);
  }
  return {identities: 389, openWorkstreams: 17, currentEvidenceInputs: tracking.inputs.length};
});
test('The progress page exposes real local proof routes and the exact reviewed projection', () => {
  const progress = read('modules/fidelity-r29/progress.json');
  for (const key of ['summary', 'statistics', 'resources', 'tasks']) assert.deepEqual(progress[key], tracking[key], key);
  const base = new URL('https://example.test/modules/fidelity-r29/'); let count = 0;
  for (const item of [...tracking.resources, ...tracking.tasks.flatMap(task => task.evidence)]) {
    const url = new URL(item.href, base); assert.equal(url.origin, base.origin);
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    assert(!path.relative(root, target).startsWith('..')); assert(fs.statSync(target).isFile(), item.href); count++;
  }
  return {resolvedLocalProofRoutes: count};
});
test('The 385 targets stay disjoint and the initial22 refusals remain byte-bound and unchanged', () => {
  assert.equal(pack.sprites.length, 363); assert.equal(pack.pending.length, 22); assert.deepEqual(pack.pending, baseline.pending);
  assert.equal(new Set([...pack.sprites, ...pack.pending].map(entry => entry.id)).size, 385);
  assert.equal(pack.counts.unknownPoseSprites, 0); assert.equal(pack.counts.newPoseReviews, 106);
  for (const entry of pack.sprites) {
    file({path: entry.image, bytes: entry.bytes, sha256: entry.sha256});
    assert.notEqual(entry.documentaryVariant, true); assert.notEqual(entry.admittedTargetEdition, false);
    const admitted = entry.reviewStatus === 'visually-reviewed' && entry.fullBodyReviewed === true
      && entry.scope === 'combatant-neutral-pose' && entry.poseKind === 'neutral-base'
      && ['left', 'right'].includes(entry.sourceFacing) && !(entry.knownAppearanceGaps || []).length;
    assert.deepEqual(entry.availableStates, admitted ? ['idle'] : []);
    assert.equal(entry.canMirror, false); assert.equal(entry.canonicalFidelityCertified, false);
  }
  assert.equal(pack.counts.neutralBaseCombatEligibleSprites, pack.sprites.filter(entry => entry.availableStates.includes('idle')).length);
  return {activeTargets: 363, preservedMissingTargetRefusals: 22, newPoseClassifications: 106, unknownPose: 0};
});
test('Five active pixel revisions bind the old target, while explicit appearance gaps prohibit idle', () => {
  assert.equal(pack.replacements.length, 5);
  for (const uid of pack.replacements) {
    const entry = pack.sprites.find(item => item.id === uid); assert(entry && oldSprites.has(uid));
    assert.equal(entry.supersedesSha256, oldSprites.get(uid).sha256); assert.notEqual(entry.sha256, oldSprites.get(uid).sha256);
    assert(entry.image.startsWith('modules/fidelity-r29/sprites/generated/' + uid + '/'));
    assert(entry.fullBodyReviewed); assert.deepEqual(entry.availableStates, []);
  }
  const alcina = pack.sprites.find(entry => entry.id === 'revillage-alcina-dimitrescu');
  assert(alcina.fullBodyReviewed); assert.equal(alcina.poseKind, 'neutral-base');
  assert(alcina.knownAppearanceGaps.length); assert.deepEqual(alcina.availableStates, []);
  assert.equal(pack.counts.legacySourceEditionNotes, 2);
  for (const uid of ['rerev-wall-blister', 'rerev-scagdead']) {
    const legacy = pack.sprites.find(entry => entry.id === uid), old = oldSprites.get(uid);
    for (const key of ['image', 'sha256', 'incarnation', 'fullBodyReviewed', 'poseKind', 'availableStates']) assert.deepEqual(legacy[key], old[key]);
    assert(/2013/.test(legacy.sourceEdition) && /PC/.test(legacy.sourceEdition));
    assert(legacy.sourceVariantLabel.includes('3DS')); assert(legacy.knownAppearanceGaps.some(gap => gap.includes('3DS')));
    assert(!pack.replacements.includes(uid));
  }
  return {activePixelRevisions: 5, explicitlyIncompleteNeutralAppearanceHeld: alcina.id, legacyEditionNotesWithoutPixelRevision: 2};
});
test('The four PC2013 illustrations stay documentary variants, with the2012 active targets unchanged', () => {
  assert.equal(pack.documentaryVariants.length, 4);
  const ids = new Set();
  for (const variant of pack.documentaryVariants) {
    assert(!ids.has(variant.variantId)); ids.add(variant.variantId);
    assert.equal(variant.documentaryVariant, true); assert.equal(variant.admittedTargetEdition, false);
    assert.equal(variant.targetFullBodyReviewed, false); assert.equal(variant.scope, 'documentary-edition-variant');
    assert(!('supersedesSha256' in variant)); assert.deepEqual(variant.availableStates, []);
    assert(/2013/.test(variant.sourceEdition) && /PC/i.test(variant.sourceEdition));
    const old = oldSprites.get(variant.id), current = pack.sprites.find(entry => entry.id === variant.id); assert(old && current);
    assert.equal(current.sha256, old.sha256); assert.equal(current.image, old.image);
    assert.equal(current.fullBodyReviewed, old.fullBodyReviewed); assert.equal(variant.comparesAgainstSha256, old.sha256);
    assert(!pack.replacements.includes(variant.id));
    file({path: variant.image, bytes: variant.bytes, sha256: variant.sha256});
  }
  return {documentaryPngs: 4, silentlyReplacedOriginalEditionTargets: 0};
});
test('A failed Tyrant revision preserves its earlier active image without adding a23rd missing identity', () => {
  const failures = pack.revisionFailures; assert.equal(failures.length, 1);
  const failure = read('modules/fidelity-r29/sprites/revision-failures/re1r-tyrant.json');
  assert(JSON.stringify(failure).includes('2c18d790-d180-4b85-88a2-6a0ff1823695'));
  const current = pack.sprites.find(entry => entry.id === 're1r-tyrant');
  assert.equal(current.sha256, oldSprites.get(current.id).sha256); assert(!pack.replacements.includes(current.id));
  assert.equal(pack.pending.length, 22); return {failedRevisions: 1, missingIdentitiesStill: 22};
});
test('Native frames retain actual source timing and geometry, with fixed projected origins and no action assignment', () => {
  const motion = read('modules/fidelity-r29/motion/manifest.json');
  assert.equal(motion.entries.length, 24); assert.equal(motion.counts.nativeRenderedFrames, 384);
  assert.equal(motion.counts.nativePoseReferenceViews, 24); assert.equal(new Set(motion.entries.map(entry => entry.subjectId)).size, 6);
  let frames = 0, poses = 0;
  for (const entry of motion.entries) {
    assert.equal(entry.modelRole, 'body'); assert.equal(entry.actionIdentity, 'unassigned');
    assert.deepEqual(entry.availableCombatStates, []); assert.equal(entry.canonicalFidelityCertified, false);
    assert.equal(entry.frames.length, 16); assert.equal(new Set(entry.frames.map(frame => frame.ticks)).size, 16);
    assert(new Set(entry.frames.map(frame => frame.skinnedVertexSha256)).size > 1);
    for (const frame of entry.frames) {
      const raw = file(frame, 'modules/fidelity-r29/motion');
      assert.equal(raw.readUInt32BE(16), frame.width); assert.equal(raw.readUInt32BE(20), frame.height);
      assert.deepEqual(frame.pivot, entry.frames[0].pivot); assert.equal(frame.edgePixels, 0); frames++;
    }
    for (const view of entry.poseViews || []) {file(view, 'modules/fidelity-r29/motion'); poses++;}
  }
  assert.equal(frames, 384); assert.equal(poses, 24);
  assert.equal(motion.counts.actionAssignedScenes, 0); assert.equal(motion.counts.admittedCombatCycles, 0);
  return {nativeScenes: 24, hashVerifiedFrames: frames, sourcePoseViews: poses, inventedCombatAssignments: 0};
});
test('The current evolution shell reuses exactly the published engine and replay with guarded presentation mounts', () => {
  const contract = read('modules/fidelity-r28/evolutions/contract.json');
  for (const entry of contract.files) assert.equal(sha(fs.readFileSync(path.join(root, entry.path))), entry.sha256, entry.path);
  const current = fs.readFileSync(path.join(root, 'modules/fidelity-r29/evolutions/index.html'), 'utf8');
  const published = fs.readFileSync(path.join(root, 'modules/fidelity-r28/evolutions/index.html'), 'utf8');
  assert.equal(current.replaceAll('fidelity-r29/evolutions/selection.js', 'fidelity-r28/evolutions/selection.js')
    .replaceAll('fidelity-r29/combat/sprite-runtime.js', 'fidelity-r28/combat/sprite-runtime.js'), published);
  const selectors = read('docs/R29_SELECTION_BROWSER.json'); assert.equal(selectors.failed, 0); assert(selectors.passed >= 5);
  return {originalRuntimeContract: contract.digest, executedBrowserGroups: selectors.passed};
});
test('Rejected reference candidates preserve exact archived evidence without completing other periods or games', () => {
  const audit = read('modules/fidelity-r29/research/appearance-source-screening.json');
  assert.equal(audit.entries.length, 4); assert.equal(audit.newlyCompletedBodies, 0);
  for (const entry of audit.entries) {
    assert.equal(entry.httpStatus, 200); assert.equal(entry.generationReferenceAdmitted, false);
    assert(entry.decision.startsWith('HELD_DIFFERENT_')); assert.equal(entry.completedTargetBodies, 0);
    const raw = fs.readFileSync(path.join(root, 'modules/fidelity-r29/research', entry.snapshot));
    assert.equal(sha(raw), entry.snapshotSha256); assert.equal(sha(gunzipSync(raw)), entry.rawSha256);
  }
  return {verifiableButWrongPeriodOrGameCandidatesHeld: 4, falselyCompletedBodies: 0};
});
const result = {schema: 're.bow.r29-integration/1', passed: checks.filter(entry => entry.pass).length,
  failed: checks.filter(entry => !entry.pass).length, checks};
fs.writeFileSync(path.join(root, 'docs/R29_INTEGRATION_TESTS.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
