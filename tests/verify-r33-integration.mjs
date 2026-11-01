/** Cross-lot delivery checks, after the final workbook export and before report refresh. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name)));
const hash = raw => createHash('sha256').update(raw).digest('hex');
const checks = [], inputs = new Set(['tests/verify-r33-integration.mjs']);
function json(name) {inputs.add(name); return read(name);}
function test(name, run) {try {const detail = run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
function bound(record) {
  assert(record && typeof record.path === 'string' && !path.isAbsolute(record.path) && !record.path.split('/').includes('..'));
  const raw = fs.readFileSync(path.join(root, record.path)); assert.equal(hash(raw), record.sha256, record.path);
  if (record.bytes !== undefined) assert.equal(raw.length, record.bytes, record.path); inputs.add(record.path);
}
test('All17 open workstreams have one of six responsible lots, with explicit remaining criteria', () => {
  const progress = json('modules/fidelity-r33/progress.json'); assert.equal(progress.release, 'R33'); assert.equal(progress.tasks.length, 17);
  const wanted = new Set(json('modules/fidelity-r31/progress.json').tasks.map(task => task.id));
  const owners = new Map();
  for (const lot of ['sprites', 'native', 'evidence', 'persistence', 'validation', 'tracking']) {
    const delivery = json('modules/fidelity-r33/' + lot + '/delivery.json'); assert.equal(delivery.schema, 're.bow.fidelity-lot-r33/1');
    assert.equal(delivery.canonicalFidelityCertified, false); const ids = delivery.workstreams || delivery.taskIds;
    assert(ids?.length); for (const id of ids) {assert(wanted.has(id)); assert(!owners.has(id), id); owners.set(id, lot);}
    assert(delivery.remaining?.length); for (const source of delivery.sourceFiles || []) bound(source);
  }
  assert.equal(owners.size, 17); for (const task of progress.tasks) {assert.equal(task.status, 'EN COURS'); assert.equal(task.lotId, owners.get(task.id)); assert(task.remaining?.length);}
  return {workstreams: 17, responsibleLots: 6, canonicalFidelityCertified: false};
});
test('The generated catalogue and all original refusals are preserved apart from the separate optional families', () => {
  const old = json('modules/fidelity-r31/sprites/manifest.json'), now = json('modules/fidelity-r33/combat/manifest.json');
  assert.deepEqual(now.sprites, old.sprites); assert.deepEqual(now.sameEditionVariants, old.sameEditionVariants);
  for (const key of Object.keys(old).filter(key => /fail|refus|pending|blocked/i.test(key))) assert.deepEqual(now[key], old[key], key);
  assert.equal(old.counts.pendingSprites, 22); assert.equal(old.counts.recordedRevisionFailures, 1);
  assert.equal(now.counts.generatedSprites, 363); assert.equal(now.counts.newTargetIdentities, 0);
  for (const source of now.r33Inputs) bound(source); return {activeGeneratedDefaults: 363, originalPending: 22, failedRevisionPreserved: true};
});
test('Eight independently generated sides remain four source-edition families, with context and unassigned pose held', () => {
  const registry = json('modules/fidelity-r33/combat/manifest.json'), extra = json('modules/fidelity-r33/sprites/manifest.json');
  assert.equal(extra.variants.length, 8); assert.equal(registry.sourceEditionVariants.length, 8);
  const families = new Map();
  for (const item of registry.sourceEditionVariants) {
    assert.equal(item.defaultAdmission, false); assert.equal(item.admittedTargetEdition, false); assert.equal(item.canMirror, false);
    assert.equal(item.canonicalFidelityCertified, false); bound({path: item.image, bytes: item.bytes, sha256: item.sha256});
    if (!families.has(item.variantFamilyId)) families.set(item.variantFamilyId, []); families.get(item.variantFamilyId).push(item);
  }
  assert.equal(families.size, 4);
  for (const entries of families.values()) {assert.deepEqual(entries.map(item => item.sourceFacing).sort(), ['left', 'right']); assert.notEqual(entries[0].sha256, entries[1].sha256);}
  const eligible = registry.sourceEditionVariants.filter(item => item.availableStates.length);
  assert.equal(eligible.length, 4); assert(eligible.every(item => ['re2-zombie-dog', 're3-zombie'].includes(item.id)));
  return {newGeneratedPngs: 8, optionalCombatPoseFamilies: 2, heldStudyFamilies: 2, newOriginalIdleCycles: 0};
});
test('The native index conserves all R30 records and adds six complete clips without inventing action assignments', () => {
  const index = json('modules/fidelity-r33/combat/native-index.json'), old = json('modules/fidelity-r30/native/manifest.json'), extra = json('modules/fidelity-r33/native/manifest.json');
  assert.deepEqual(index.lots.slice(0, 3), old.lots); assert.equal(index.lots.length, 4); index.lots.forEach(bound);
  const entries = index.lots.flatMap(lot => json(lot.path).entries); assert.equal(index.counts.entries, entries.length);
  assert.equal(new Set(entries.map(item => item.id)).size, entries.length); assert.equal(index.counts.subjects, 53);
  assert.equal(extra.counts.newBodyIdentities, 3); assert.equal(extra.counts.nativePoseViews, 16); assert.equal(extra.counts.newFullSourceClips, 6);
  assert.equal(extra.counts.nativeRenderedFrames, 1270); assert.equal(extra.counts.newCertifiedOriginalIdles, 0);
  for (const item of extra.entries) {assert.equal(item.admittedTargetEdition, false); assert.equal(item.admittedCombatStates.length, 0); assert.equal(item.canonicalFidelityCertified, false);}
  const marine = extra.entries.filter(item => item.selectablePresentationVariant); assert.equal(marine.length, 2);
  for (const item of marine) {assert.equal(item.variantHabitat, 'aquatic'); assert.equal(item.sourceActionCertified, false); assert.equal(item.frames.length, 150);}
  return {subjects: 53, newClips: 6, newNativeSamples: 1270, reusedMarineSamples: 300, originalIdleCertified: false};
});
test('Native portrait crops change three references while preserving exact identity coverage and the missing avatar', () => {
  const now = json('modules/fidelity-r33/selection/manifest.json'), old = json('modules/fidelity-r30/selection/manifest.json');
  assert.equal(now.entries.length, old.entries.length); assert.deepEqual(now.missing, old.missing);
  const changed = now.entries.filter((entry, index) => entry.sha256 !== old.entries[index].sha256); assert.equal(changed.length, 3);
  for (const item of changed) {assert.equal(item.sourceKind, 'native-model-render'); assert.equal(item.sourceBodyCompleteCertified, false); assert.equal(item.selectionOnly, true); assert.equal(item.combatAnimationAssigned, false); bound({path: item.image, sha256: item.sha256, bytes: item.bytes});}
  return {avatars: 388, sourceRenderedReplacements: 3, exactUnresolvedAvatar: now.missing.map(item => item.id)};
});
test('Source evidence and the selective restore stay qualified to their actual new work', () => {
  const evidence = json('modules/fidelity-r33/evidence/delivery.json'), persistence = json('modules/fidelity-r33/persistence/manifest.json');
  assert.equal(evidence.canonicalFidelityCertified, false); assert(evidence.advances.length && evidence.remaining.length);
  assert.equal(persistence.counts.allowlistedGameKeys, 18); assert.equal(persistence.counts.originalEngineRoutesVerified, 4);
  assert.equal(persistence.counts.maximumReplayFiles, 16); assert.equal(persistence.counts.newCatalogueIdentities, 0);
  for (const file of persistence.inheritedContracts || []) if (file.path && file.sha256) bound(file);
  return {realStorageKeys: 18, originalReplayRoutes: 4, maximumFilesPerBatch: 16, globalFidelityClaimed: false};
});
test('Every aggregated test report is current and positive; historical and integration work is kept separate', () => {
  const validation = json('docs/R33_VALIDATION.json'); assert.equal(validation.complete, true); assert(validation.checks.length >= 15);
  for (const item of validation.checks) {assert.equal(item.failed, 0); assert.equal(item.source_current, true); bound(item);
    const report = json(item.path); assert(report.passed > 0); assert.equal(report.failed, 0); for (const source of report.sourceFiles || []) bound(source);
  }
  assert(!validation.checks.some(item => item.path === 'docs/R33_INTEGRATION_TESTS.json')); return {reports: validation.checks.length, totals: validation.totals};
});
test('The70-sheet workbook is reproduced with63 prior sheets preserved and no historic source overwrite', () => {
  const output = json('docs/R33_EXPORT.json'), reproduction = json('docs/R33_REPRODUCTION.json');
  assert.equal(output.worksheets, 70); assert.equal(output.historical_worksheets_preserved, 63);
  assert.equal(output.identities, 389); assert.equal(output.open_workstreams, 17);
  assert.equal(reproduction.failed, 0); assert.equal(reproduction.passed, 3);
  const baseline = fs.readFileSync(path.join(root, 'docs/BOW_FIDELITE_R31.xlsx'));
  assert.equal(hash(baseline), '56fba3670c84375f780d3165df5164439b3d6fe5aa2c853fa2fedb99ac371936');
  const workbook = 'docs/BOW_FIDELITE_R33.xlsx'; inputs.add(workbook); assert(fs.statSync(path.join(root, workbook)).size > 0);
  assert.equal(hash(fs.readFileSync(path.join(root, workbook))), output.sha256);
  assert.equal(reproduction.checks.find(check => check.sha256)?.sha256, output.sha256);
  for (const record of reproduction.sourceFiles || []) bound(record);
  return {workbook, previousWorkbookUntouched: true, reproduced: reproduction.passed, expectedSheets: 70, preservedSheets: 63};
});
test('Current mounts use the reviewed R33 readers while the R31 evolution document remains published', () => {
  for (const name of ['modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r33/evolutions/index.html']) {
    inputs.add(name); const source = fs.readFileSync(path.join(root, name), 'utf8');
    for (const file of ['combat/generated-runtime.js', 'combat/generated-adapter.js', 'combat/native-runtime.js', 'combat/native-adapter.js', 'selection/avatars.js', 'evolutions/selection.js']) {
      assert(source.includes('fidelity-r33/' + file), name + ':' + file); inputs.add('modules/fidelity-r33/' + file);
    }
    assert(source.indexOf('fidelity-r31/performance/image-budget.js') < source.indexOf('fidelity-r33/combat/generated-runtime.js'));
  }
  const old = 'modules/fidelity-r31/evolutions/index.html'; inputs.add(old); assert(!fs.readFileSync(path.join(root, old), 'utf8').includes('fidelity-r33/'));
  for (const [name, link] of [['codex.html', 'modules/fidelity-r33/dossier-link.js'], ['saves.html', 'modules/fidelity-r33/persistence/link.js']]) {inputs.add(name); assert(fs.readFileSync(path.join(root, name), 'utf8').includes(link));}
  return {currentCombatMounts: 3, additiveTools: 2, preservedEvolutionDocument: true};
});
const report = {schema: 're.bow.integration-r33/1', passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks,
  sourceFiles: [...inputs].sort().map(name => ({path: name, sha256: hash(fs.readFileSync(path.join(root, name)))})),
  scope: 'Current R33 cross-lot bindings and explicit admission boundaries; source originality and whole-catalogue completion remain open.'};
fs.writeFileSync(path.join(root, 'docs/R33_INTEGRATION_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
