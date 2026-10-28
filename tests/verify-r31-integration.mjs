/** Cross-module checks of the actual R31 delivery and its retained fidelity boundaries. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bytes = name => fs.readFileSync(path.join(root, name));
const read = name => JSON.parse(bytes(name));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const checks = [];
const ids = new Set(read('data/roster.json').catalog.map(item => item.id));
const owners = {sprites: ['R20-10', 'G-RENDU'], motion: ['R20-09', 'G-COMMANDES', 'G-CINEMATIQUES', 'G-MANCHES'],
  canonical: ['G-PERIMETRE', 'G-PREUVES', 'G-ECHELLE', 'G-VICTIMES'], persistence: ['G-REPLAYS', 'G-SAUVES'],
  audio: ['G-AUDIO'], validation: ['G-PERF', 'G-ACCESS'], tracking: ['G-LIVRAISON', 'G-RECETTE']};
const lots = Object.keys(owners).filter(id => id !== 'tracking').map(id => ({path: 'modules/fidelity-r31/' + id + '/delivery.json',
  value: read('modules/fidelity-r31/' + id + '/delivery.json')}));
function file(record) {
  assert(typeof record.path === 'string' && !record.path.includes('\\'));
  const target = path.resolve(root, record.path); assert(!path.relative(root, target).startsWith('..'));
  const raw = bytes(record.path); if (record.bytes !== undefined) assert.equal(raw.length, record.bytes, record.path);
  if (record.sha256) assert.equal(sha(raw), record.sha256, record.path); return raw;
}
function test(name, run) {try {checks.push({name, pass: true, detail: run()}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
test('Every open Excel workstream has one responsible lot and concrete retained evidence', () => {
  const tracking = read('docs/R31_TRACKING.json'), tasks = tracking.tasks;
  assert.equal(tasks.length, 17); assert.equal(ids.size, 389);
  assert.deepEqual(tasks.map(item => item.id).sort(), read('docs/R30_TRACKING.json').tasks.map(item => item.id).sort());
  for (const [lot, taskIds] of Object.entries(owners)) for (const id of taskIds) {
    const task = tasks.find(item => item.id === id); assert(task); assert.equal(task.lotId, lot);
    assert(task.owner); assert.equal(task.status, 'EN COURS'); assert.notEqual(task.deliveryState, 'EN ATTENTE');
    assert(task.advances.length && task.remaining.length && task.evidence.length);
  }
  assert.equal(tracking.identity_updates.length, 389);
  assert.deepEqual(tracking.identity_updates.map(item => item.id).sort(), [...ids].sort());
  assert.equal(tracking.canonical_fidelity_certified, 0);
  return {openWorkstreams: 17, responsibleLots: 7, catalogueIdentities: 389, globalFidelityClosed: false};
});
test('The six functional and source lots bind their real local manifests and identity artifacts', () => {
  let manifests = 0, artifacts = 0;
  for (const {value} of lots) {
    assert.equal(value.schema, 're.bow.fidelity-lot-r31/1'); assert.equal(value.release, 'R31');
    assert.equal(value.canonicalFidelityCertified, false); assert.deepEqual(value.taskIds.slice().sort(), owners[value.id].slice().sort());
    assert(value.summary && value.advances.length && value.remaining.length);
    for (const binding of value.manifests) {file(binding); manifests++;}
    for (const item of value.identities) {
      assert(ids.has(item.id)); for (const artifact of item.artifacts) {file(artifact); artifacts++;}
    }
  }
  return {boundLotManifests: manifests, boundIdentityArtifacts: artifacts, automaticallyClosedTasks: 0};
});
test('Three generated PNGs preserve source receipts, separate the costume variant and keep the Lucas gap', () => {
  const pack = read('modules/fidelity-r31/sprites/manifest.json'), old = read('modules/fidelity-r29/sprites/manifest.json');
  assert.equal(pack.sprites.length, 363); assert.equal(pack.pending.length, 22); assert.deepEqual(pack.pending, old.pending);
  assert.deepEqual(pack.revisionFailures, old.revisionFailures); assert.equal(pack.counts.newGeneratedPngs, 3);
  assert.equal(pack.counts.newNativeGameSprites, 0); assert.equal(pack.counts.newNativeIdleAnimations, 0);
  assert.deepEqual(pack.replacements.slice().sort(), ['re7-lucas-baker-mutated', 'revillage-donna-angie']);
  for (const id of pack.replacements) {
    const item = pack.sprites.find(row => row.id === id); file({path: item.image, bytes: item.bytes, sha256: item.sha256});
    assert.equal(item.sourceFacing, 'front'); assert.deepEqual(item.availableStates, []); assert.equal(item.canonicalFidelityCertified, false);
    assert.equal(item.provenance.generator, 'image_gen');
  }
  const lucas = pack.sprites.find(row => row.id === 're7-lucas-baker-mutated'); assert(lucas.knownAppearanceGaps.length);
  const variant = pack.sameEditionVariants[0]; assert.equal(pack.sameEditionVariants.length, 1);
  assert.equal(variant.id, 're1r-zombie'); assert.equal(variant.defaultAdmission, false); assert.equal(variant.animated, false);
  assert.equal(variant.sourceFacing, 'right'); assert.equal(variant.canMirror, false); assert.equal(variant.originalGameSprite, false);
  assert.equal(pack.sprites.find(row => row.id === variant.id).sha256, old.sprites.find(row => row.id === variant.id).sha256);
  file({path: variant.image, bytes: variant.bytes, sha256: variant.sha256});
  return {actualNewPngs: 3, activeFrontRevisions: 2, explicitStaticCostumeVariants: 1, originalRefusals: 22, lucasAppearanceGapRetained: true};
});
test('Native motion retains full source timelines, real opposing cameras and unassigned original actions', () => {
  const manifest = read('modules/fidelity-r31/motion/manifest.json');
  assert.equal(manifest.entries.length, 16); assert.equal(manifest.counts.nativeClips, 8);
  assert.equal(manifest.counts.nativeRenderedFrames, 2016); assert.equal(manifest.counts.admittedCombatStates, 0);
  let frames = 0;
  for (const item of manifest.entries) {
    assert(ids.has(item.subjectId)); assert.equal(item.sampleRate, 60); assert.equal(item.fullNativeDuration, true);
    assert.equal(item.actionVerified, false); assert.equal(item.sourceActionCertified, false);
    assert.equal(item.admittedTargetEdition, false); assert.deepEqual(item.admittedCombatStates, []); assert.equal(item.canMirror, false);
    assert.equal(item.frames.length, item.frameCount);
    for (const [index, frame] of item.frames.entries()) {
      const raw = file(frame); assert.equal(raw.readUInt32BE(16), frame.width); assert.equal(raw.readUInt32BE(20), frame.height);
      assert(Math.abs(frame.seconds - index / 60) < 1e-9); frames++;
    }
  }
  assert.equal(frames, 2016); const follow = read('modules/fidelity-r31/motion/root-follow-manifest.json');
  assert.equal(follow.entries.reduce((sum, item) => sum + item.frames.length, 0), 248);
  return {completeNativeClips: 8, fixedCameraPngs: frames, rootCameraInspectionPngs: 248, inventedOriginalActions: 0};
});
test('The command audit covers389 identities while existing profiles and input contracts remain adapted', () => {
  const commands = read('modules/fidelity-r31/commands/manifest.json');
  assert.equal(commands.entries.length, 389); assert.equal(commands.counts.adaptedCommands, 3460);
  assert.equal(commands.counts.documentaryMoveClaimLinks, 235); assert.equal(commands.gameplayDataChanged, false);
  assert.equal(commands.counts.completeOriginalCommandInventories, 0); assert.equal(commands.counts.originalGameActionAssignments, 0);
  for (const item of commands.entries) for (const command of item.adaptedCommands) {
    assert.equal(command.authoredPrototypeCommand, true); assert.equal(command.originalInputCommandVerified, false);
    assert.equal(command.animationAssignedFromObservedClip, false);
  }
  return {auditedIdentities: 389, existingAdaptedCommands: 3460, documentaryBehaviorLinks: 235, certifiedOriginalInventories: 0};
});
test('Canonical dimensions and conclusion restrictions stay documentary and exclude unresolved aliases', () => {
  const pack = read('modules/fidelity-r31/canonical/manifest.json');
  assert.equal(pack.counts.newDocumentaryFacts, 20); assert.equal(pack.counts.reusedSourceFacts, 10);
  assert.equal(pack.counts.sourceDimensionConstraints, 3); assert.equal(pack.counts.sourceDimensionNewFacts, 1);
  assert.equal(pack.counts.conclusionRules, 6); assert.equal(pack.counts.heldAliasOrEditionDecisions, 4);
  assert.equal(pack.counts.certifiedBodyScales, 0); assert.equal(pack.gameplayDataChanged, false);
  assert.equal(pack.counts.gameplayConclusionAssignments, 0); assert.equal(pack.canonicalFidelityCertified, false);
  return {newFacts: 20, retainedHistoricalFacts: 10, heldAliasOrEditionDecisions: 4, collisionScalePromotions: 0};
});
test('The218 actual audio files remain edition and phase candidates pending independent listening', () => {
  const audio = read('modules/fidelity-r31/audio/manifest.json'); assert.equal(audio.entries.length, 218);
  assert.equal(audio.counts.distinctDecodedPcmMeasurements, 216); assert.equal(audio.counts.actionAssignedFiles, 0);
  assert.equal(audio.counts.combatAssignedFiles, 0); assert.equal(audio.counts.independentlyListenedFiles, 0);
  for (const clip of audio.entries) {
    file(clip); assert.equal(clip.sourceBytesTransformed, false); assert.equal(clip.targetEditionEquivalenceVerified, false);
    assert.equal(clip.independentListeningCompleted, false); assert.equal(clip.combatAudioAssigned, false);
    assert.equal(clip.canonicalFidelityCertified, false);
  }
  return {retainedAudioFiles: 218, distinctPcmMeasurementsWithinLot: 216, fabricatedListeningOrActionAssignments: 0};
});
test('Restore and replay validation retain real allowlist boundaries and original isolated engines', () => {
  const restore = read('modules/fidelity-r31/persistence/manifest.json');
  assert.equal(restore.storage.allowlistedKeys, 18); assert.equal(restore.storage.journal.durableBeforeFirstGameWrite, true);
  assert.equal(restore.storage.journal.automaticResume, false); assert.equal(restore.storage.journal.outsideWriterValuesOverwritten, false);
  assert.equal(restore.replay.opaqueOrigin, true); assert.equal(restore.replay.sharedGameStorageAccess, false);
  assert.equal(restore.replay.passes, 2); assert.equal(restore.limits.cloudSyncConfigured, false);
  const contract = read('modules/fidelity-r28/evolutions/contract.json');
  assert.equal(restore.replay.evolutionRuntimeContract, contract.digest);
  for (const item of contract.files) assert.equal(sha(bytes(item.path)), item.sha256);
  return {allowedRealGameKeys: 18, originalEvolutionSourceFiles: contract.files.length, independentReconstructions: 2, inventedCloudBackend: false};
});
test('Current combat, Codex and save mounts use the coordinated readers without rewriting game data', () => {
  const routes = ['performance/image-budget.js', 'combat/generated-runtime.js', 'combat/native-runtime.js',
    'combat/native-adapter.js', 'selection/avatars.js', 'access/match-summary.js', 'performance/monitor.js'];
  for (const name of ['modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r31/evolutions/index.html']) {
    const html = bytes(name).toString();
    for (const route of routes) assert.equal(html.split('fidelity-r31/' + route).length - 1, 1, name + ':' + route);
    assert(html.indexOf('performance/image-budget.js') < html.indexOf('combat/generated-runtime.js'));
    assert(html.indexOf('fidelity-r27/combat/adapter.js') < html.indexOf('fidelity-r31/combat/native-adapter.js'));
  }
  assert.equal(bytes('codex.html').toString().split('fidelity-r31/dossier-link.js').length - 1, 1);
  assert.equal(bytes('saves.html').toString().split('fidelity-r31/persistence/link.js').length - 1, 1);
  const validation = read('modules/fidelity-r31/validation/manifest.json');
  assert.equal(validation.managedImages.pixelLimit, 33554432); assert.equal(validation.managedImages.pendingDecodesIncluded, true);
  assert.equal(validation.matchSummary.actorOrReplayWrites, false); assert.equal(validation.physicalDeviceCertified, false);
  assert.equal(validation.screenReaderHardwareCertified, false);
  return {actualCombatMounts: 3, coordinatedReaderFamilies: 3, managedPixelLimit: 33554432, physicalDeviceCertification: false};
});
const names = ['tests/verify-r31-integration.mjs', 'data/roster.json', 'modules/versus.html', 'catalog-duel.html', 'codex.html', 'saves.html',
  ...lots.flatMap(item => [item.path, ...item.value.manifests.map(binding => binding.path)]),
  'modules/fidelity-r31/evolutions/index.html', 'modules/fidelity-r31/evolutions/selection.js'];
const report = {schema: 're.bow.integration-r31/1', passed: checks.filter(row => row.pass).length,
  failed: checks.filter(row => !row.pass).length, checks,
  sourceFiles: [...new Set(names)].map(name => ({path: name, sha256: sha(bytes(name))})),
  scope: 'Cross-module R31 source files, responsible workstreams, variants, real restore and current presentation mounts. Global original-game1:1 remains uncertified.'};
fs.writeFileSync(path.join(root, 'docs/R31_INTEGRATION_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
