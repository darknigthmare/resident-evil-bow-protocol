/** Cross-check published R25 progress against its actual source packs and preserved history. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {unzipSync} from '../modules/fidelity-r24/models/vendor/three/examples/jsm/libs/fflate.module.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const checks = [];
function test(name, run) {
  try { const evidence = run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
const roster = read('data/roster.json').catalog, ids = new Set(roster.map(entry => entry.id));
const tracking = read('docs/R25_TRACKING.json');
const progress = read('modules/fidelity-r25/progress.json');
const catalog = read('modules/fidelity-r25/models/catalog.json');

test('All historical open workstreams and all 389 incarnations remain in the cumulative tracker', () => {
  const expected = read('docs/R20_TRACKING.json').tasks.filter(item => item.status !== 'VALIDÉ').map(item => item.id).sort();
  assert.equal(expected.length, 17); assert.equal(ids.size, 389);
  assert.deepEqual(tracking.tasks.map(item => item.id).sort(), expected);
  assert(tracking.tasks.every(item => item.status === 'EN COURS' && item.advances.length && item.remaining.length));
  assert.deepEqual(tracking.identity_updates.map(item => item.id).sort(), [...ids].sort());
  assert.equal(tracking.canonical_fidelity_certified, 0);
  return {openWorkstreams: expected.length, identities: ids.size, fidelityCertified: 0};
});
test('The browser dashboard receives exactly the reviewed tracking content', () => {
  assert.equal(progress.schema, 're.bow.fidelity-progress/1');
  for (const key of ['summary', 'statistics', 'resources', 'tasks']) assert.deepEqual(progress[key], tracking[key], key);
  for (const input of tracking.inputs) {
    const file = path.resolve(root, input.path), relative = path.relative(root, file);
    assert(!relative.startsWith('..') && !path.isAbsolute(relative));
    assert.equal(sha(fs.readFileSync(file)), input.sha256, input.path);
  }
  return {proofInputsVerified: tracking.inputs.length, resources: progress.resources.length};
});
test('Every workstream and resource evidence link resolves to an existing local file', () => {
  const base = new URL('https://example.test/modules/fidelity-r25/');
  let count = 0;
  for (const item of [...tracking.resources, ...tracking.tasks.flatMap(task => task.evidence)]) {
    const target = new URL(item.href, base);
    assert.equal(target.origin, base.origin); assert(target.pathname.startsWith('/modules/') || target.pathname.startsWith('/docs/'));
    const file = path.resolve(root, '.' + decodeURIComponent(target.pathname));
    assert(path.relative(root, file) && !path.relative(root, file).startsWith('..'));
    assert(fs.statSync(file).isFile(), item.href); count++;
  }
  return {resolvedProofLinks: count};
});
test('The cumulative reader includes all historical models and every new source entry without substituting candidate identities', () => {
  assert.equal(catalog.schema, 're.bow.model-view-catalog/1');
  assert.equal(catalog.sourceFilesRewritten, false); assert.equal(catalog.canonicalFidelityCertified, false);
  const old = read('modules/fidelity-r24/models/catalog.json');
  const historicalSources = new Map([
    ...read('modules/fidelity-r24/visual/manifest.json').entries,
    ...read('modules/fidelity-r24/motion/manifest.json').entries,
  ].map(entry => [entry.id, entry]));
  const entries = new Map(catalog.entries.map(item => [item.id, item]));
  assert.equal(entries.size, catalog.entries.length);
  for (const entry of old.entries) {
    const current = entries.get(entry.id); assert(current, entry.id);
    for (const key of ['model', 'textures', 'clips', 'format']) assert.deepEqual(current[key], entry[key], entry.id + ' ' + key);
    const published = historicalSources.get(entry.id) || historicalSources.get(entry.id.replace(/-published-rig$/, ''));
    assert(published, entry.id + ' historical source metadata');
    for (const key of ['subjectId', 'candidateUid']) assert.equal(current[key], published[key], entry.id + ' verified ' + key);
  }
  for (const kind of ['visual', 'motion']) {
    const pack = read('modules/fidelity-r25/' + kind + '/manifest.json');
    for (const entry of pack.entries) {
      const current = entries.get(entry.id); assert(current, entry.id);
      assert.deepEqual(current.model, entry.model); assert.deepEqual(current.textures, entry.textures);
      assert.equal(current.subjectId, entry.subjectId); assert.equal(current.candidateUid, entry.candidateUid);
    }
  }
  for (const entry of catalog.entries) {
    assert(!(entry.subjectId && entry.candidateUid), entry.id);
    if (entry.subjectId) assert(ids.has(entry.subjectId), entry.id + ' unknown exact identity');
  }
  return {historicalModels: old.entries.length, cumulativeModels: entries.size,
    exactSubjects: new Set(catalog.entries.filter(e => e.subjectId).map(e => e.subjectId)).size};
});
test('Source file counts distinguish real nonnegative-time motion, fixed poses and unknown action meanings', () => {
  let files = 0, motions = 0, poses = 0;
  for (const release of ['r24', 'r25']) {
    const manifest = read('modules/fidelity-' + release + '/motion/manifest.json');
    const clips = manifest.entries.flatMap(entry => entry.clips);
    const fixed = clips.filter(clip => clip.positiveTimePoseOnly).length;
    assert.equal(clips.length, manifest.summary.sourceAnimationFiles);
    assert.equal(fixed, manifest.summary.positiveTimePoseFiles);
    assert.equal(clips.length - fixed, manifest.summary.positiveTimeMotionFiles);
    for (const clip of clips) {
      assert.equal(typeof clip.positiveTimePoseOnly, 'boolean');
      assert.equal(clip.semanticActionVerified, false, 'File names alone cannot certify an action.');
      assert.equal(clip.generatedKeyframes, 0);
    }
    files += clips.length; poses += fixed; motions += clips.length - fixed;
  }
  return {sourceFiles: files, positiveTimeMotions: motions, positiveTimePoses: poses, inferredActions: 0};
});
test('Publisher audio groups remain distinct from independent listening and native-bank certification', () => {
  const pack = read('modules/fidelity-r25/audio/manifest.json');
  assert.equal(pack.entries.length, pack.counts.documentary_clips);
  assert.equal(pack.counts.independently_listened_clips, 0);
  assert.equal(pack.counts.certified_native_clips, 0); assert.equal(pack.counts.final_combat_audio, 0);
  for (const entry of pack.entries) {
    assert(ids.has(entry.identity_id), entry.identity_id);
    assert.equal(entry.independent_listening_completed, false);
    assert.equal(entry.native_bank_certified, false); assert.equal(entry.combat_audio_final, false);
    assert.equal(entry.source_bytes_transformed, false);
    assert.equal(entry.probe.nonzero_pcm_samples_present, true);
  }
  const assigned = new Set(pack.entries.map(entry => entry.identity_id));
  assert.equal(assigned.size, pack.counts.publisher_assigned_identities);
  return {publishedGroupClips: pack.entries.length, publisherAssignedSubjects: assigned.size,
    independentListening: 0, nativeBanksCertified: 0};
});
test('New documentary claims retain their subjects, actors, phases and explicitly secondary certification scope', () => {
  const pack = read('modules/fidelity-r25/canonical/manifest.json');
  assert.deepEqual(pack.entries.map(entry => entry.id).sort(), [...ids].sort());
  assert.equal(pack.claims.length, pack.summary.new_reviewed_claims);
  assert.equal(pack.summary.direct_primary_captures, 0); assert.equal(pack.summary.complete_move_sets, 0);
  assert.equal(pack.summary.canonical_fidelity_certified, 0);
  const sources = new Map(pack.sources.map(source => [source.id, source])), reviewed = new Set();
  for (const entry of read('modules/fidelity-r23/canonical/manifest.json').entries) if (entry.claims.length) reviewed.add(entry.id);
  for (const claim of read('modules/fidelity-r24/canonical/manifest.json').claims) reviewed.add(claim.uid);
  for (const claim of pack.claims) {
    assert(ids.has(claim.uid)); assert.equal(claim.subject_uid, claim.uid);
    assert(claim.actor_uid && claim.actor_role && claim.phase);
    if (!ids.has(claim.actor_uid)) assert.equal(claim.actor_role, 'source_named_actor_not_in_catalogue');
    assert(['AFFIRMED', 'NEGATED'].includes(claim.polarity));
    assert.equal(claim.canonical_fidelity_certified, false);
    assert(claim.evidence.length);
    for (const evidence of claim.evidence) assert(sources.has(evidence.source_id) && evidence.excerpt && evidence.phase && evidence.scope);
    reviewed.add(claim.uid);
  }
  assert.equal(reviewed.size, pack.summary.cumulative_reviewed_identities);
  return {newClaims: pack.claims.length, cumulativeReviewedSubjects: reviewed.size, completeMovesetsCertified: 0, directPrimaryCaptures: 0};
});
test('All historical R24 worksheet XML and relationships remain byte-identical in the new workbook', () => {
  const old = unzipSync(fs.readFileSync(path.join(root, 'docs/BOW_FIDELITE_R24.xlsx')));
  const current = unzipSync(fs.readFileSync(path.join(root, 'docs/BOW_FIDELITE_R25.xlsx')));
  const names = Object.keys(old).filter(name => name.startsWith('xl/worksheets/'));
  const sheetCount = archive => Object.keys(archive).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).length;
  assert.equal(sheetCount(old), 17); assert.equal(sheetCount(current), 23);
  for (const name of names) assert.deepEqual(current[name], old[name], name);
  const sourceLedger = read('docs/R24_SOURCE_ADDITIONS.json');
  assert.equal(sha(fs.readFileSync(path.join(root, 'docs/BOW_FIDELITE_R24.xlsx'))), sourceLedger.workbook.sha256);
  return {historicalWorksheets: 17, addedWorksheets: 6, historicalWorksheetPartsPreserved: names.length, baselineWorkbookUnchanged: true};
});
test('Original engine, roster, art and planning files remain unchanged from the reviewed R24 commit', () => {
  const trees = ['src', 'data', 'assets', 'docs/planning'];
  const changed = execFileSync('git', ['diff', '--name-only', '259f9e255e10210cbdf481f5f1aec9abf8ba58f1', '--', ...trees], {cwd: root, encoding: 'utf8'});
  const added = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...trees], {cwd: root, encoding: 'utf8'});
  assert.equal(changed.trim(), ''); assert.equal(added.trim(), '');
  return {protectedTrees: trees, modifiedOriginalFiles: 0};
});
const report = {schema: 're.bow.cumulative-integration-r25/1', passed: checks.filter(item => item.pass).length,
  failed: checks.filter(item => !item.pass).length, checks,
  scope: 'Cross-module source attribution, tracker consistency and byte preservation. No complete art, audio, game behavior or physical-device certification.'};
fs.writeFileSync(path.join(root, 'docs/R25_INTEGRATION_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
if (report.failed) process.exitCode = 1;
