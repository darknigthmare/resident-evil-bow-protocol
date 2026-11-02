/** Final cross-lot consistency; generation and default admission are different counts. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), checks = [], inputs = new Set(['tests/verify-r34-integration.mjs']);
const hash = raw => createHash('sha256').update(raw).digest('hex');
function read(name) {inputs.add(name); return JSON.parse(fs.readFileSync(path.join(root, name)));}
function test(name, run) {try {const detail = run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
function bound(record) {const raw = fs.readFileSync(path.join(root, record.path)); assert.equal(hash(raw), record.sha256, record.path); if (record.bytes !== undefined) assert.equal(raw.length, record.bytes, record.path); inputs.add(record.path);}
test('The scope covers346 unique fighters in two phases and preserves all23 historical blocks', () => {
  const plan = read('modules/fidelity-r34/assets/jobs.json'), assets = read('modules/fidelity-r34/assets/manifest.json');
  assert.equal(plan.jobs.length, 346); assert.equal(new Set(plan.jobs.map(job => job.uid)).size, 346);
  assert.equal(plan.counts.mainFighters, 115); assert.equal(plan.counts.experimentalFighters, 231); assert.equal(plan.counts.excludedContextualEncounters, 43);
  assert.equal(assets.entries.length, 346); assert.equal(assets.counts.historicallyBlockedCombatants, 23);
  for (const item of assets.entries) for (const kind of ['portrait', 'idle']) assert(!/^PENDING/.test(item[kind].status), item.id + ':' + kind + ':' + item[kind].status);
  for (const job of plan.jobs.filter(job => job.historicalRefusalPreserved)) {
    const item = assets.entries.find(item => item.id === job.uid); assert.equal(item.portrait.status, 'BLOCKED_HISTORICAL_REFUSAL'); assert.equal(item.idle.status, 'BLOCKED_HISTORICAL_REFUSAL');
  }
  return {fighters: 346, phases: 2, preservedBlockedSubjects: 23};
});
test('Every counted new image is a real reviewed image with intact bytes and a genuine receipt', () => {
  const assets = read('modules/fidelity-r34/assets/manifest.json');
  for (const item of [...assets.portraits, ...assets.sprites]) {
    assert.equal(item.status, 'GENERATED'); assert.equal(item.generatedByR34, true); assert.equal(item.generatedBytesEdited, false);
    bound({path: item.image, bytes: item.bytes, sha256: item.sha256}); bound(item.receipt);
    const receipt = read(item.receipt.path); assert.equal(receipt.generator, 'image_gen'); assert.equal(receipt.uid, item.id);
    assert.equal(receipt.review.visuallyReviewed, true); assert.equal(item.canonicalFidelityCertified, false);
  }
  assert.equal(assets.counts.newGeneratedPngs, assets.portraits.length + assets.sprites.length);
  return {portraits: assets.portraits.length, poses: assets.sprites.length, reusedCountedAsNew: 0};
});
test('New default bodies need a complete reference, complete visible body, combat stance, right side and no known gap', () => {
  const assets = read('modules/fidelity-r34/assets/manifest.json'), registry = read('modules/fidelity-r34/combat/manifest.json');
  const admitted = assets.sprites.filter(item => item.defaultAdmission);
  assert(admitted.length > 0, 'Actual new whole-body combat media is required.');
  const active = [...registry.sprites, ...(registry.historicalReplacements || [])].filter(item => item.generatedByR34);
  assert.equal(active.length, admitted.length);
  for (const item of active) {
    assert(item.fullBodyVisible && item.fullBodyReviewed && item.completeBodyReferenceVerified && item.fightingPoseReviewed);
    assert.equal(item.sourceFacing, 'right'); assert.equal(item.canMirror, false); assert.deepEqual(item.availableStates, ['idle']);
    assert.equal(item.knownAppearanceGaps.length, 0); assert.equal(item.animationFrames, 1); assert.equal(item.originalIdleAnimationCertified, false);
    assert.equal(item.sha256, admitted.find(source => source.id === item.id).sha256);
  }
  return {actualWholeBodyDefaults: active.length, inventedIdleCycles: 0};
});
test('Generated portraits overlay the retained references without changing catalogue identity or promoting a head to a body', () => {
  const assets = read('modules/fidelity-r34/assets/manifest.json'), avatars = read('modules/fidelity-r34/selection/manifest.json');
  const admitted = assets.portraits.filter(item => item.defaultAdmission), generated = avatars.entries.filter(item => item.sourceKind === 'generated-portrait');
  assert.equal(generated.length, admitted.length); assert.equal(new Set(avatars.entries.map(item => item.id)).size, avatars.entries.length);
  for (const item of generated) {assert.equal(item.portraitIdentityReviewed, true); assert.equal(item.selectionOnly, true); assert.equal(item.combatAnimationAssigned, false); assert.equal(item.sourceBodyCompleteCertified, false); bound(item.receipt);}
  return {newSelectionPortraits: generated.length, totalAvailableAvatars: avatars.entries.length, portraitsUsedAsBodyProof: 0};
});
test('The default player documents mount preparation, current readers and sequential selection without controller copies', () => {
  for (const name of ['modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r34/evolutions/index.html']) {
    inputs.add(name); const html = fs.readFileSync(path.join(root, name), 'utf8');
    assert(html.includes('fidelity-r34/selection/prepare.js')); assert(html.indexOf('fidelity-r34/selection/prepare.js') < html.indexOf('</head>'));
    assert(html.includes('fidelity-r34/combat/generated-runtime.js')); assert(html.includes('fidelity-r34/selection/avatars.js'));
    assert(html.includes('fidelity-r34/combat/held-presentation.js'));
    assert.equal(html.match(/fidelity-r34\/combat\/held-presentation\.js/g)?.length, 2);
    const controller = name === 'modules/versus.html' ? 'src/unified-engine-v060.js' : name === 'catalog-duel.html' ? 'src/catalog-duel-v070.js' : 'fidelity-r28/evolutions/duel.js';
    assert(html.indexOf('fidelity-r34/combat/held-presentation.js') < html.indexOf(controller));
    assert(html.indexOf('fidelity-r34/combat/held-presentation.js') < html.indexOf('fidelity-r34/selection/flow.js'));
    assert(html.includes('fidelity-r34/selection/flow.js')); assert(!html.includes('catalog-controller.js') && !html.includes('evolution-controller.js'));
  }
  const selection = read('docs/R34_SELECTION_BROWSER.json'); assert.equal(selection.failed, 0); assert.equal(selection.passed, 16); selection.sourceFiles.forEach(bound);
  return {defaultDocuments: 3, originalControllers: true, actualSequentialFlowGroups: 16};
});
test('All seven new validation reports are positive and source-current', () => {
  const validation = read('docs/R34_VALIDATION.json'); assert.equal(validation.complete, true); assert.equal(validation.checks.length, 7);
  for (const item of validation.checks) {assert.equal(item.failed, 0); assert.equal(item.sourceCurrent, true); bound(item); const report = read(item.path); assert(report.passed > 0); assert.equal(report.failed, 0); assert.equal(report.skipped || 0, 0); for (const source of report.sourceFiles || []) bound(source);}
  return {reports: 7, totals: validation.totals};
});
test('The new workbook retains the exact70 published sheets and reports692 requested outputs', () => {
  const exported = read('docs/R34_EXPORT.json'), reproduced = read('docs/R34_REPRODUCTION.json');
  assert.equal(reproduced.failed, 0); assert(reproduced.passed > 0);
  assert.equal(exported.historicalWorksheetsPreserved, 70); assert.equal(exported.worksheets, 74);
  assert.equal(exported.outputs, 692); assert.equal(exported.projection, false);
  const previous = fs.readFileSync(path.join(root, 'docs/BOW_FIDELITE_R33.xlsx'));
  assert.equal(hash(previous), '29be1f2adefdd54d7b0538dbc1da63f20072870c75e90a440772ddd23c3a852e');
  const name = 'docs/BOW_FIDELITE_R34.xlsx'; inputs.add(name); assert(fs.statSync(path.join(root, name)).size > 0);
  if (exported.sha256) assert.equal(hash(fs.readFileSync(path.join(root, name))), exported.sha256);
  return {baselineSheets: 70, currentSheets: 74, requestedOutputs: 692, reproduced: reproduced.passed};
});
const report = {schema: 're.bow.integration-r34/1', passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks,
  sourceFiles: [...inputs].sort().map(name => ({path: name, sha256: hash(fs.readFileSync(path.join(root, name)))})),
  scope: 'Current R34 generated-media admission, source-bound counts, default sequential selection and historical workbook conservation. No original idle cycle or global1:1 certification.'};
fs.writeFileSync(path.join(root, 'docs/R34_INTEGRATION_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
