/** Verify the actual R30 selection, native source variants and retained engine together. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const bytes = name => fs.readFileSync(path.join(root, name));
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const checks = [];
function test(name, run) {
  try {const detail = run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
const index = read('modules/fidelity-r30/native/manifest.json');
const packs = index.lots.map(lot => ({binding: lot, value: read(lot.path)}));
const entries = packs.flatMap(lot => lot.value.entries);
const roster = read('data/roster.json');
const identities = new Set(roster.catalog.map(row => row.id));
test('The three separately reviewed native lots bind their actual delivered bytes', () => {
  assert.equal(index.schema, 're.bow.native-2d-index-r30/1'); assert.equal(index.release, 'R30');
  assert.equal(index.lots.length, 3); assert.deepEqual(index.pendingLots, []);
  assert.equal(index.canonicalFidelityCertified, false);
  assert.equal(new Set(entries.map(item => item.id)).size, entries.length);
  for (const {binding, value} of packs) {
    assert.equal(bytes(binding.path).length, binding.bytes); assert.equal(sha(bytes(binding.path)), binding.sha256);
    assert.equal(value.schema, 're.bow.native-2d-lot-r30/1');
    assert.equal(value.canonicalFidelityCertified, false);
  }
  return {lots: 3, uniqueNativeObservations: entries.length, subjects: new Set(entries.map(row => row.subjectId)).size};
});
test('Every native frame has an exact catalogue subject and retained PNG bytes', () => {
  let frames = 0;
  for (const item of entries) {
    assert(identities.has(item.subjectId)); assert(item.sourceEdition.trim());
    assert.equal(item.canMirror, false); assert.equal(item.originalGameFrames, false);
    assert.equal(item.canonicalFidelityCertified, false); assert(item.frames.length);
    for (const frame of item.frames) {
      assert(frame.path.startsWith('modules/fidelity-r30/native/'));
      const raw = bytes(frame.path); assert.equal(raw.length, frame.bytes); assert.equal(sha(raw), frame.sha256);
      assert.equal(raw.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(raw.readUInt32BE(16), frame.width); assert.equal(raw.readUInt32BE(20), frame.height); frames++;
    }
  }
  assert.equal(index.counts.nativeRenderedFrames, frames);
  return {hashVerifiedNativePngFrames: frames, originalGameRasterClaims: 0};
});
test('The full native sequences retain complete uniform source timelines', () => {
  const sequences = entries.filter(item => item.kind === 'native-sequence'); assert(sequences.length >= 12);
  for (const item of sequences) {
    assert.equal(item.sampleRate, 60); assert.equal(item.fullNativeDuration, true);
    assert(item.frames.length >= 60); assert.equal(item.frameCount, item.frames.length);
    assert(Math.abs(item.frames.length / item.sampleRate - item.durationSeconds) < 1 / 60 + 1e-6);
    for (let n = 1; n < item.frames.length; n++) assert(Math.abs(item.frames[n].seconds - item.frames[n - 1].seconds - 1 / 60) < 1e-8);
    assert(new Set(item.frames.map(frame => frame.sha256)).size > 30, item.id);
  }
  return {completeSixtyHzOrientedSequences: sequences.length, sparseScenesCountedAsFullIdle: 0};
});
test('Observed neutral variants remain optional and separate from target-edition idle certification', () => {
  const optional = entries.filter(item => item.selectablePresentationVariant === true);
  assert(optional.length >= 10); const families = new Set();
  for (const item of optional) {
    assert.equal(item.kind, 'native-sequence'); assert.equal(item.actionIdentity, 'observed-neutral-loop');
    assert.equal(item.observedNeutralLoopReviewed, true); assert.equal(item.continuityVerified, true);
    assert.equal(item.fullBodyReviewed, true); assert.equal(item.fightingPoseReviewed, true);
    assert.equal(item.sourceActionCertified, false); assert.deepEqual(item.variantCombatStates, ['idle']);
    assert.equal(item.admittedTargetEdition, false); assert.deepEqual(item.admittedCombatStates, []);
    assert(item.variantFamilyId); families.add(item.variantFamilyId);
    assert(/2013/.test(item.sourceEdition) && /PC/.test(item.sourceEdition));
  }
  const wall = entries.filter(item => item.subjectId === 'rerev-wall-blister');
  assert(wall.length); assert(wall.every(item => item.selectablePresentationVariant !== true && !item.admittedCombatStates.length));
  return {optionalObservedNeutralFamilies: families.size, actualOpposingCameraSequences: optional.length,
    originalGameActionNameCertified: false, defaultEditionPromotions: 0};
});
test('Bind, incomplete and different-edition source studies cannot acquire a combat stance', () => {
  const admitted = entries.filter(item => item.admittedCombatStates.length);
  for (const item of admitted) {
    assert.equal(item.admittedTargetEdition, true); assert.equal(item.fullBodyReviewed, true);
    assert.equal(item.fightingPoseReviewed, true); assert.equal(item.canMirror, false);
    assert(['left', 'right'].includes(item.sourceFacing)); assert.deepEqual(item.knownAppearanceGaps || [], []);
    if (item.kind === 'native-static-pose') assert.equal(item.actionIdentity, 'neutral-stance');
    else {assert.equal(item.actionIdentity, 'idle'); assert.equal(item.actionVerified, true); assert.equal(item.continuityVerified, true);}
  }
  return {admittedOrientedNativeStances: admitted.filter(item => item.kind === 'native-static-pose').length,
    certifiedTargetIdleSequences: admitted.filter(item => item.kind === 'native-sequence').length,
    heldSourceObservations: entries.length - admitted.length};
});
test('Selection avatars partition all389 identities without inventing the missing exact reference', () => {
  const manifest = read('modules/fidelity-r30/selection/manifest.json');
  const supplied = manifest.entries.map(item => item.id), missing = manifest.missing.map(item => typeof item === 'string' ? item : item.id);
  assert.equal(identities.size, 389); assert.equal(new Set([...supplied, ...missing]).size, 389);
  assert.equal(supplied.length + missing.length, 389); assert.equal(manifest.canonicalFidelityCertified, false);
  for (const item of manifest.entries) {
    assert(identities.has(item.id)); assert.equal(item.canonicalFidelityCertified, false);
    assert.equal(sha(bytes(item.image)), item.sha256); assert.equal(bytes(item.image).length, item.bytes);
    assert(!/generated/.test(item.sourceKind)); assert.equal(item.selectionOnly, true);
  }
  return {exactUidSelectionReferences: supplied.length, explicitMissingReferences: missing, sourceKinds: manifest.counts};
});
test('Original22 target refusals and the failed Tyrant revision remain unchanged', () => {
  const sprites = read('modules/fidelity-r29/sprites/manifest.json');
  assert.equal(sprites.sprites.length, 363); assert.equal(sprites.pending.length, 22);
  assert.deepEqual(sprites.pending, read('modules/fidelity-r28/sprites/manifest.json').pending);
  assert.equal(sprites.revisionFailures.length, 1);
  const refusal = read('modules/fidelity-r29/sprites/revision-failures/re1r-tyrant.json');
  assert(JSON.stringify(refusal).includes('2c18d790-d180-4b85-88a2-6a0ff1823695'));
  return {retainedTargetRefusals: 22, retainedRevisionRefusals: 1, failedImageGenerationRetried: false};
});
test('Current combat mounts add presentation only and retain the published engine contract', () => {
  const routes = ['combat/native-runtime.js', 'combat/native-adapter.js', 'selection/avatars.js'];
  for (const name of ['modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r30/evolutions/index.html']) {
    const html = bytes(name).toString();
    for (const route of routes) assert.equal(html.split('fidelity-r30/' + route).length - 1, 1, name + ':' + route);
    assert(html.indexOf('fidelity-r27/combat/adapter.js') < html.indexOf('fidelity-r30/combat/native-adapter.js'));
    assert(html.includes('fidelity-r30/evolutions/selection.js'));
  }
  const contract = read('modules/fidelity-r28/evolutions/contract.json');
  for (const record of contract.files) assert.equal(sha(bytes(record.path)), record.sha256, record.path);
  const old = bytes('modules/fidelity-r29/evolutions/index.html').toString();
  let current = bytes('modules/fidelity-r30/evolutions/index.html').toString();
  for (const route of routes) current = current.replace('<script src="modules/fidelity-r30/' + route + '"></script>', '');
  current = current.replaceAll('fidelity-r30/evolutions/selection.js', 'fidelity-r29/evolutions/selection.js');
  assert.equal(current, old);
  return {actualCombatMounts: 3, originalEngineContractFiles: contract.files.length, gameplayFilesChanged: 0};
});
test('Every catalogue identity and all17 unfinished Excel workstreams remain explicit', () => {
  const tracking = read('docs/R30_TRACKING.json');
  assert.equal(tracking.identity_updates.length, 389);
  assert.deepEqual(tracking.identity_updates.map(row => row.id).sort(), [...identities].sort());
  assert.equal(tracking.tasks.length, 17); assert(tracking.tasks.every(row => row.status === 'EN COURS'));
  assert.equal(tracking.canonical_fidelity_certified, 0);
  return {trackedCatalogueIdentities: 389, openWorkstreams: 17, globalFidelityCertified: false};
});
const sourceNames = ['tests/verify-r30-integration.mjs', 'scripts/build-native-index-r30.py', 'data/roster.json',
  'modules/fidelity-r30/native/manifest.json', 'modules/fidelity-r30/selection/manifest.json',
  'modules/fidelity-r30/combat/native-runtime.js', 'modules/fidelity-r30/combat/native-adapter.js',
  'modules/fidelity-r30/evolutions/index.html', 'modules/fidelity-r30/evolutions/selection.js',
  'modules/versus.html', 'catalog-duel.html', 'codex.html', ...index.lots.map(row => row.path)];
const result = {schema: 're.bow.integration-tests-r30/1', passed: checks.filter(row => row.pass).length,
  failed: checks.filter(row => !row.pass).length, checks,
  sourceFiles: sourceNames.map(name => ({path: name, sha256: sha(bytes(name))})),
  scope: 'Actual R30 native assets, exact UID selection references, optional variants, current combat mounts and preserved original engine. No global1:1 certification.'};
fs.writeFileSync(path.join(root, 'docs/R30_INTEGRATION_TESTS.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
