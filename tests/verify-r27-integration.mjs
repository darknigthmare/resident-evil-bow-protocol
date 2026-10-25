/** Cross-module R27 source, scope, spreadsheet and conservation checks. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {unzipSync} from '../modules/fidelity-r24/models/vendor/three/examples/jsm/libs/fflate.module.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = '826f7ed1811c48adc0609f97699eb32f629fc78a';
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const checks = [], tracking = read('docs/R27_TRACKING.json'), progress = read('modules/fidelity-r27/progress.json');
const ids = new Set(read('data/roster.json').catalog.map(item => item.id));
function test(name, run) {
  try {const evidence = run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
function file(record, base = '') {
  const value = path.resolve(ROOT, base, record.path), relative = path.relative(ROOT, value);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), record.path);
  const raw = fs.readFileSync(value);
  assert.equal(raw.length, record.bytes, record.path); assert.equal(sha(raw), record.sha256, record.path);
  return raw;
}

test('All seventeen workstreams and 389 identities remain explicit without a false global closure', () => {
  const expected = read('docs/R20_TRACKING.json').tasks.filter(item => item.status !== 'VALIDÉ').map(item => item.id).sort();
  assert.equal(expected.length, 17); assert.equal(ids.size, 389);
  assert.deepEqual(tracking.tasks.map(item => item.id).sort(), expected);
  assert(tracking.tasks.every(item => item.status === 'EN COURS' && item.advances.length && item.remaining.length));
  assert.deepEqual(tracking.identity_updates.map(item => item.id).sort(), [...ids].sort());
  assert.equal(tracking.canonical_fidelity_certified, 0);
  return {workstreams: 17, identities: 389, globalFidelityCertified: 0};
});
test('The dashboard is exactly the reviewed tracking projection and all input hashes remain current', () => {
  assert.equal(progress.schema, 're.bow.fidelity-progress/1');
  for (const key of ['summary', 'statistics', 'resources', 'tasks']) assert.deepEqual(progress[key], tracking[key], key);
  for (const input of tracking.inputs) {
    const target = path.resolve(ROOT, input.path), relative = path.relative(ROOT, target);
    assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    assert.equal(sha(fs.readFileSync(target)), input.sha256, input.path);
  }
  return {reviewedInputs: tracking.inputs.length, actualResources: progress.resources.length};
});
test('Every workstream and resource proof resolves to a local reviewed module or document', () => {
  const base = new URL('https://example.test/modules/fidelity-r27/'); let count = 0;
  for (const item of [...tracking.resources, ...tracking.tasks.flatMap(task => task.evidence)]) {
    const target = new URL(item.href, base); assert.equal(target.origin, base.origin);
    assert(target.pathname.startsWith('/modules/') || target.pathname.startsWith('/docs/'));
    const full = path.resolve(ROOT, '.' + decodeURIComponent(target.pathname));
    assert(!path.relative(ROOT, full).startsWith('..')); assert(fs.statSync(full).isFile(), item.href); count++;
  }
  return {localProofLinks: count};
});
test('The 385 jobs remain distinct from actual PNGs, contexts, reviewed bodies and combat capabilities', () => {
  const pack = read('modules/fidelity-r27/sprites/manifest.json'), jobs = read('modules/fidelity-r27/sprites/jobs.json');
  const historical = new Set(read('assets/sprites/bow/manifest.json').sprites.map(item => item.id));
  assert.equal(historical.size, 4);
  const expected = new Set([...ids].filter(uid => !historical.has(uid))), made = new Map(pack.sprites.map(item => [item.id, item]));
  assert.equal(expected.size, 385); assert.equal(made.size, pack.sprites.length);
  assert.deepEqual(jobs.jobs.map(item => item.id).sort(), [...expected].sort());
  assert.equal(jobs.jobs.filter(item => item.scope === 'context-encounter').length, 43);
  assert.deepEqual([...pack.sprites, ...pack.pending].map(item => item.id).sort(), [...expected].sort());
  assert.equal(pack.counts.generatedSprites, pack.sprites.length); assert.equal(pack.counts.pendingSprites, pack.pending.length);
  assert.equal(pack.counts.completeCombatAnimationSets, 0); assert.equal(pack.counts.originalGameSprites, 0); assert.equal(pack.counts.canonicalFidelityCertified, 0);
  const by_job = new Map(jobs.jobs.map(item => [item.id, item])), updates = new Map(tracking.identity_updates.map(item => [item.id, item]));
  let eligible = 0, wholeBodyNonNeutralHeld = 0; const heldBindPoseIdentities = [];
  for (const sprite of pack.sprites) {
    const job = by_job.get(sprite.id), update = updates.get(sprite.id); assert(job);
    assert.equal(sprite.scope, job.scope); assert.equal(sprite.image, job.outputPath);
    const raw = file({path: sprite.image, bytes: sprite.bytes, sha256: sprite.sha256});
    assert.deepEqual([...raw.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(raw.readUInt32BE(16), sprite.width); assert.equal(raw.readUInt32BE(20), sprite.height);
    assert.equal(sprite.canMirror, false);
    assert.equal(sprite.canonicalFidelityCertified, false); assert.equal(sprite.combatIntegrated, false);
    const admissible = sprite.reviewStatus === 'visually-reviewed' && sprite.fullBodyReviewed === true && sprite.scope === 'combatant-neutral-pose'
      && ['left', 'right'].includes(sprite.sourceFacing) && sprite.poseKind === 'neutral-base';
    assert(['neutral-base', 'source-bind-pose', 'source-presentation', 'unknown'].includes(sprite.poseKind));
    assert.deepEqual(sprite.availableStates, admissible ? ['idle'] : []);
    assert.equal(update.sprite_generated, true); assert.equal(update.sprite_combat_eligible, admissible);
    assert.equal(update.sprite_pose_kind, sprite.poseKind);
    assert.equal(update.sprite_combat_integrated, false); assert.equal(update.sprite_full_body_reviewed, sprite.fullBodyReviewed);
    if (sprite.scope === 'context-encounter') assert.equal(update.sprite_combat_eligible, false);
    if (sprite.fullBodyReviewed && sprite.poseKind !== 'neutral-base') {
      assert.equal(update.sprite_combat_eligible, false); wholeBodyNonNeutralHeld++;
    }
    if (sprite.poseKind === 'source-bind-pose') {
      assert.equal(update.sprite_combat_eligible, false); heldBindPoseIdentities.push(sprite.id);
    }
    eligible += admissible;
  }
  for (const item of pack.pending) {
    const update = updates.get(item.id); assert.equal(update.sprite_generated, false);
    assert.equal(update.sprite_generation_status, item.generationStatus);
    assert.equal(update.sprite_generation_reason, item.reason);
  }
  assert.deepEqual(progress.statistics.map(item => item.value), [pack.sprites.length, pack.sprites.filter(item => item.fullBodyReviewed).length,
    eligible, read('modules/fidelity-r27/audio/manifest.json').entries.length, read('modules/fidelity-r27/canonical/manifest.json').summary.cumulative_reviewed_identities]);
  return {targets: 385, generated: made.size, pending: pack.pending.length, contexts: 43, eligibleIdleOnly: eligible,
    wholeBodyNonNeutralHeld, heldBindPoseIdentities, fullAnimationSets: 0};
});
test('Native animation clips and exact archive segments preserve time, roles and complete original bytes', () => {
  const pack = read('modules/fidelity-r27/motion/manifest.json'), base = 'modules/fidelity-r27/motion';
  assert.equal(pack.schema, 're.bow.rigged-motion-pack/1');
  let count = 0, poses = 0, partCount = 0; const archives = new Set();
  for (const entry of pack.entries) {
    assert(ids.has(entry.subjectId || entry.id)); assert(['body', 'body-variant', 'associated-object'].includes(entry.modelRole || 'body'));
    assert.equal(entry.canonicalFidelityCertified, false); assert.equal(entry.rigProductionFinalized, false);
    for (const clip of entry.clips) {
      file(clip, base); count++; poses += clip.positiveTimePoseOnly;
      assert.equal(clip.semanticActionVerified, false); assert.equal(clip.generatedKeyframes, 0);
      assert.equal(clip.positiveTimePoseOnly, clip.varyingNonnegativeAnimationCurveCount === 0);
      assert.equal(clip.sourceTimeSpanSeconds, (Number(clip.keyTimeEnd) - Number(clip.keyTimeStart)) / clip.ticksPerSecond);
    }
    if (!archives.has(entry.archive.sha256)) {
      archives.add(entry.archive.sha256);
      const hash = crypto.createHash('sha256'); let offset = 0;
      for (const [index, part] of entry.archive.parts.entries()) {
        assert.equal(part.index, index + 1); assert.equal(part.byteOffset, offset);
        const raw = file(part, base); hash.update(raw); offset += raw.length; partCount++;
      }
      assert.equal(offset, entry.archive.bytes); assert.equal(hash.digest('hex'), entry.archive.sha256);
      file(entry.archive.descriptor, base);
    }
  }
  assert.equal(count, pack.summary.sourceAnimationFiles); assert.equal(poses, pack.summary.positiveTimePoseFiles);
  assert.equal(count - poses, pack.summary.positiveTimeMotionFiles); assert.equal(pack.summary.canonicalFidelityCertified, 0);
  return {keyedFiles: count, motions: count - poses, poses, segmentedOriginalArchives: archives.size, originalSegments: partCount};
});
test('Published audio stays edition-bound and distinct from native-bank or semantic certification', () => {
  const pack = read('modules/fidelity-r27/audio/manifest.json'), old = new Set();
  for (const release of ['r24', 'r25', 'r26']) for (const item of read(`modules/fidelity-${release}/audio/manifest.json`).entries) old.add(item.sha256);
  const current = new Set(), subjects = new Set();
  for (const entry of pack.entries) {
    file(entry, 'modules/fidelity-r27/audio'); assert(ids.has(entry.identity_id)); subjects.add(entry.identity_id); current.add(entry.sha256);
    assert.equal(entry.source_bytes_transformed, false); assert.equal(entry.native_bank_certified, false);
    assert.equal(entry.independent_listening_completed, false); assert.equal(entry.combat_audio_final, false); assert(!old.has(entry.sha256));
  }
  assert.equal(pack.entries.length, pack.counts.documentary_clips); assert.equal(current.size, pack.counts.distinct_published_file_contents_sha256);
  assert.equal(subjects.size, pack.counts.publisher_assigned_identities); assert.equal(pack.counts.independently_listened_clips, 0);
  return {publishedFiles: pack.entries.length, distinctContents: current.size, publisherSubjects: subjects.size, certifiedNativeBanks: 0};
});
test('The 16 native-geometry body references remain separate from image_gen targets and original game frames', () => {
  const pack = read('modules/fidelity-r27/sources/body-rasters/manifest.json');
  assert.equal(pack.schema, 're.bow.source-body-reference-raster-addendum/1');
  assert.equal(pack.frozenJobsChanged, false); assert.equal(pack.frozenAppearanceIndexChanged, false);
  assert.equal(sha(fs.readFileSync(path.join(ROOT, pack.sourceCatalog.path))), pack.sourceCatalog.sha256);
  let views = 0;
  for (const entry of pack.entries) {
    assert(ids.has(entry.id)); assert.equal(entry.generatedWithImageGen, false); assert.equal(entry.originalGameSprite, false);
    assert.equal(entry.combatReady, false); assert.equal(entry.canonicalFidelityCertified, false);
    assert.equal(entry.anatomicalCompletenessIndependentlyCertified, false);
    const source = path.relative(ROOT, path.resolve(ROOT, path.dirname(pack.sourceCatalog.path), entry.sourceBase));
    for (const record of [entry.model, entry.materials, ...entry.textures]) if (record) file(record, source);
    assert.deepEqual(entry.views.map(view => view.angle), [0, 90, 180, 270]);
    for (const view of entry.views) {
      const raw = file(view, 'modules/fidelity-r27/sources/body-rasters');
      assert.equal(raw.readUInt32BE(16), 512); assert.equal(raw.readUInt32BE(20), 512); assert.equal(view.edgePixels, 0); views++;
    }
  }
  assert.equal(pack.entries.length, pack.counts.identities); assert.equal(views, pack.counts.renderedReferenceImages);
  assert.equal(pack.counts.imageGenSprites, 0); assert.equal(pack.counts.originalGameSprites, 0); assert.equal(pack.counts.combatReadySprites, 0);
  return {subjects: pack.entries.length, derivedReferenceViews: views, addedImageGenTargets: 0, originalGameSprites: 0};
});
test('New canonical identities were previously unreviewed and retain explicit sources, phases and secondary scope', () => {
  const reviewed = new Set();
  for (const item of read('modules/fidelity-r23/canonical/manifest.json').entries) if (item.claims.length) reviewed.add(item.id);
  for (const release of ['r24', 'r25', 'r26']) for (const item of read(`modules/fidelity-${release}/canonical/manifest.json`).claims) reviewed.add(item.uid);
  const old = new Set(reviewed), pack = read('modules/fidelity-r27/canonical/manifest.json'), sourceIds = new Set(pack.sources.map(item => item.id)), newly = new Set();
  assert.equal(old.size, 275); assert.equal(pack.summary.direct_primary_captures, 0); assert.equal(pack.summary.canonical_fidelity_certified, 0);
  for (const claim of pack.claims) {
    assert(ids.has(claim.uid)); assert(!old.has(claim.uid)); assert.equal(claim.subject_uid, claim.uid);
    assert(claim.actor_uid && claim.actor_role && claim.phase); assert(['AFFIRMED', 'NEGATED'].includes(claim.polarity));
    assert.equal(claim.canonical_fidelity_certified, false); assert(claim.evidence.length);
    for (const proof of claim.evidence) assert(sourceIds.has(proof.source_id) && proof.excerpt && proof.scope && proof.phase);
    newly.add(claim.uid); reviewed.add(claim.uid);
  }
  assert.equal(pack.claims.length, pack.summary.new_reviewed_claims); assert.equal(newly.size, pack.summary.newly_reviewed_identities);
  assert.equal(reviewed.size, pack.summary.cumulative_reviewed_identities);
  return {claims: pack.claims.length, newlyReviewedSubjects: newly.size, cumulativeReviewed: reviewed.size, stillUnreviewed: ids.size - reviewed.size};
});
test('The restored-replay bridge exposes its separate read-only storage and original-engine boundaries', () => {
  const pack = read('modules/fidelity-r27/persistence/manifest.json');
  assert.equal(pack.schema, 're.bow.restored-replay-catalog/1');
  assert.equal(pack.source.readOnly, true); assert.equal(pack.source.gameLocalStorageRead, false);
  assert.equal(pack.source.gameLocalStorageWritten, false); assert.equal(pack.source.cloudBackend, false);
  assert.equal(pack.source.sourceRevisionAndValuesCheckedBeforeAndAfter, true);
  assert.deepEqual(pack.engineRoutes, ['main-current', 'main-pre-r13']);
  assert.equal(pack.individualExperimentalR7.inR19Archive, false);
  assert.equal(pack.source.originalR19TransportClaimed, false);
  for (const dependency of pack.originalDependencies) file(dependency);
  const report = read('docs/R27_PERSISTENCE_BROWSER_TESTS.json'); assert.equal(report.failed, 0); assert(report.passed > 0);
  return {schema: pack.schema, executedBrowserGroups: report.passed, storageScope: 'R26 isolated database, never game localStorage or cloud'};
});
test('All 29 historical worksheets and relationships remain byte-identical among the 35 sheets', () => {
  const old = unzipSync(fs.readFileSync(path.join(ROOT, 'docs/BOW_FIDELITE_R26.xlsx')));
  const current = unzipSync(fs.readFileSync(path.join(ROOT, 'docs/BOW_FIDELITE_R27.xlsx')));
  const count = archive => Object.keys(archive).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).length;
  assert.equal(count(old), 29); assert.equal(count(current), 35);
  const parts = Object.keys(old).filter(name => name.startsWith('xl/worksheets/'));
  for (const name of parts) assert.deepEqual(current[name], old[name], name);
  assert.equal(sha(fs.readFileSync(path.join(ROOT, 'docs/BOW_FIDELITE_R26.xlsx'))), read('docs/R26_SOURCE_ADDITIONS.json').workbook.sha256);
  return {historicalSheets: 29, addedSheets: 6, preservedParts: parts.length};
});
test('Original engine, art, roster, planning and every previous source module remain unchanged', () => {
  const trees = ['src', 'data', 'assets', 'docs/planning', 'modules/source-motion-r22', 'modules/fidelity-r23', 'modules/fidelity-r24', 'modules/fidelity-r25', 'modules/fidelity-r26'];
  const changed = execFileSync('git', ['diff', '--name-only', BASELINE, '--', ...trees], {cwd: ROOT, encoding: 'utf8'});
  const added = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...trees], {cwd: ROOT, encoding: 'utf8'});
  assert.equal(changed.trim(), ''); assert.equal(added.trim(), '');
  return {baseline: BASELINE, protectedTrees: trees, modifiedOriginalFiles: 0};
});

const result = {schema: 're.bow.cumulative-integration-r27/1', passed: checks.filter(item => item.pass).length,
  failed: checks.filter(item => !item.pass).length, checks,
  scope: 'Cross-module actual-file counts, identity/scope consistency, source attribution and byte preservation. No complete animation, native-bank, game-art or hardware certification.'};
fs.writeFileSync(path.join(ROOT, 'docs/R27_INTEGRATION_TESTS.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
