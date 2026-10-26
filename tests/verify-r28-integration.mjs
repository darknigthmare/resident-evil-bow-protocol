/** Final cross-module R28 checks against the actual delivered files. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const checks = [], tracking = read('docs/R28_TRACKING.json');
const pack = read('modules/fidelity-r28/sprites/manifest.json'), graph = read('modules/fidelity-r28/evolutions/graph.json');
function test(name, run) {
  try {const detail = run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
test('All 389 identities and 17 open workstreams survive without blanket closure', () => {
  const ids = read('data/roster.json').catalog.map(item => item.id).sort();
  assert.equal(ids.length, 389);
  assert.deepEqual(tracking.identity_updates.map(item => item.id).sort(), ids);
  assert.deepEqual(tracking.tasks.map(item => item.id).sort(), read('docs/R27_TRACKING.json').tasks.map(item => item.id).sort());
  assert.equal(tracking.tasks.length, 17); assert(tracking.tasks.every(item => item.status === 'EN COURS' && item.remaining.length));
  assert.equal(tracking.canonical_fidelity_certified, 0); return {identities: 389, openWorkstreams: 17};
});
test('The real progress projection, local proof routes and SHA-bound tracking inputs agree', () => {
  const progress = read('modules/fidelity-r28/progress.json');
  for (const key of ['summary', 'statistics', 'resources', 'tasks']) assert.deepEqual(progress[key], tracking[key]);
  for (const input of tracking.inputs) {
    const target = path.resolve(root, input.path); assert(!path.relative(root, target).startsWith('..'));
    assert.equal(sha(fs.readFileSync(target)), input.sha256, input.path);
  }
  const base = new URL('https://example.test/modules/fidelity-r28/'); let links = 0;
  for (const item of [...tracking.resources, ...tracking.tasks.flatMap(task => task.evidence)]) {
    const url = new URL(item.href, base); assert.equal(url.origin, base.origin);
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    assert(!path.relative(root, target).startsWith('..')); assert(fs.statSync(target).isFile(), item.href); links++;
  }
  return {currentInputHashes: tracking.inputs.length, localLinks: links};
});
test('The effective sprite registry resolves real unique PNGs and preserves all 22 refusals', () => {
  const old = read('modules/fidelity-r27/sprites/manifest.json');
  assert.deepEqual(pack.pending, old.pending); assert.equal(pack.sprites.length, 363); assert.equal(pack.pending.length, 22);
  assert.equal(new Set([...pack.sprites, ...pack.pending].map(item => item.id)).size, 385);
  for (const sprite of pack.sprites) {
    const raw = fs.readFileSync(path.join(root, sprite.image)); assert.equal(raw.length, sprite.bytes);
    assert.equal(sha(raw), sprite.sha256, sprite.id);
    const admitted = sprite.reviewStatus === 'visually-reviewed' && sprite.fullBodyReviewed === true
      && sprite.scope === 'combatant-neutral-pose' && sprite.poseKind === 'neutral-base' && ['left', 'right'].includes(sprite.sourceFacing);
    assert.deepEqual(sprite.availableStates, admitted ? ['idle'] : []);
    assert.equal(sprite.canonicalFidelityCertified, false); assert.equal(sprite.canMirror, false);
  }
  assert.equal(pack.sprites.filter(item => item.availableStates.includes('idle')).length, 32);
  assert.equal(pack.counts.visuallyReviewedSprites, 363); return {activePngs: 363, preservedRefusals: 22, idleSides: 32};
});
test('Full-body replacements do not create new identities, neutral poses or false appearance completion', () => {
  const queue = read('modules/fidelity-r28/sprites/body-gaps.json');
  assert.equal(queue.activeManifestSha256, sha(fs.readFileSync(path.join(root, 'modules/fidelity-r28/sprites/manifest.json'))));
  assert.equal(queue.entries.length, 257); assert.equal(queue.combatantBodiesPending, 215); assert.equal(queue.contextBodiesNotQualified, 42);
  assert.equal(pack.replacements.length, 4);
  for (const uid of pack.replacements) {
    const sprite = pack.sprites.find(item => item.id === uid); assert(sprite);
    assert(sprite.image.startsWith('modules/fidelity-r28/')); assert(sprite.fullBodyReviewed);
    assert.deepEqual(sprite.availableStates, []); assert.notEqual(sprite.poseKind, 'neutral-base');
  }
  assert.equal(queue.knownAppearanceGaps.length, 2); return {replacements: 4, remainingCombatantBodies: 215, contextBodies: 42};
});
test('Family edges preserve incarnation membership and all context gates', () => {
  assert.equal(graph.families.length, 15); assert.equal(graph.edges.length, 26);
  assert.equal(graph.families.reduce((sum, item) => sum + item.forms.length, 0), 42);
  const families = new Map(graph.families.map(item => [item.id, item]));
  for (const edge of graph.edges) {
    const family = families.get(edge.familyId); assert(family.forms.includes(edge.from)); assert(family.forms.includes(edge.to));
    assert(edge.sourceIds.length); assert.equal(edge.conditions.meterCost, 35);
    if (edge.playable) assert(!graph.contextOnlyUids.includes(edge.from) && !graph.contextOnlyUids.includes(edge.to));
  }
  assert.equal(graph.edges.filter(item => item.playable).length, 17);
  assert.equal(graph.edges.filter(item => !item.playable).length, 9);
  assert.equal(graph.canonicalFidelityCertified, false); assert.equal(graph.conditionsAreAuthored, true);
  return {families: 15, forms: 42, playableTransitions: 17, heldContextTransitions: 9};
});
test('New replay compatibility binds the actual engine and graph, independently of historical formats', () => {
  const contract = read('modules/fidelity-r28/evolutions/contract.json');
  for (const item of contract.files) assert.equal(sha(fs.readFileSync(path.join(root, item.path))), item.sha256, item.path);
  const engine = fs.readFileSync(path.join(root, 'modules/fidelity-r28/evolutions/engine.js'), 'utf8');
  const replay = fs.readFileSync(path.join(root, 'modules/fidelity-r28/evolutions/replay.js'), 'utf8');
  assert(engine.includes('CQCCombat060')); assert(replay.includes('re.bow.evolution-duel-replay/1'));
  const html = fs.readFileSync(path.join(root, 'modules/fidelity-r28/evolutions/index.html'), 'utf8');
  for (const name of ['engine', 'replay', 'contract', 'duel', 'selection']) assert(html.includes('evolutions/' + name + '.js'));
  assert(html.includes('fidelity-r28/combat/sprite-runtime.js'));
  return {boundRuntimeFiles: contract.files.length, digest: contract.digest};
});
test('Published audio candidate groups remain separate from exact subjects and combat assignments', () => {
  const audio = read('modules/fidelity-r28/audio/manifest.json');
  assert.equal(audio.entries.length, 1450); assert.equal(new Set(audio.entries.map(item => item.sha256)).size, 1105);
  assert.equal(audio.entries.filter(item => item.identity_id).length, 301);
  assert.equal(audio.entries.filter(item => !item.identity_id).length, 1149);
  for (const item of audio.entries) {
    assert.equal(item.combat_audio_final, false); assert.equal(item.canonical_fidelity_certified, false);
    assert(item.identity_id ? item.candidate_identity_ids.length === 0 : item.candidate_identity_ids.length > 0);
  }
  return {publishedFiles: 1450, distinctContents: 1105, exactSubjectClips: 301, candidateOnlyClips: 1149};
});
test('Documentary coverage includes all identities while preserving phase and fidelity limits', () => {
  const canon = read('modules/fidelity-r28/canonical/manifest.json');
  assert.equal(canon.summary.new_reviewed_claims, 42); assert.equal(canon.summary.newly_reviewed_identities, 33);
  assert.equal(canon.summary.cumulative_reviewed_identities, 389); assert.equal(canon.summary.remaining_without_reviewed_documentary_claims, 0);
  for (const key of ['direct_primary_captures', 'complete_move_sets', 'certified_body_scales', 'canonical_fidelity_certified']) assert.equal(canon.summary[key], 0);
  return {newClaims: 42, newlyReviewedIdentities: 33, cumulativeDocumentaryCoverage: 389, certifiedCompleteMoveSets: 0};
});
const report = {schema: 're.bow.r28-integration/1', passed: checks.filter(item => item.pass).length,
  failed: checks.filter(item => !item.pass).length, checks};
fs.writeFileSync(path.join(root, 'docs/R28_INTEGRATION_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
