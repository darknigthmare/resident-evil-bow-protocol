import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validate, subject, dimension, conclusion, alias} from '../modules/fidelity-r31/canonical/query.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r31/canonical/manifest.json')));
const pack = validate(raw), checks = [];
function test(name, run) {try {const detail = run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
const matching = rule => ({uid: rule.uid, gameKey: rule.gameKey, phase: rule.phase, environment: rule.environment,
  victimRole: rule.victimRole, conditions: [...rule.requiredConditions]});
test('All17 exact subjects expose only their own source facts and constraints', () => {
  assert.equal(pack.entries.length, 17);
  for (const row of pack.entries) {const found = subject(pack, row.id); assert.equal(found.entry.id, row.id); assert(found.claims.every(claim => claim.uid === row.id));}
  assert.equal(subject(pack, 'not-a-subject'), null); return {subjects: 17, borrowedFacts: 0};
});
test('Validated documentary data remains deeply immutable', () => {
  assert(Object.isFrozen(pack) && Object.isFrozen(pack.claims[0].evidence));
  assert.throws(() => {pack.claims[0].uid = 'fake';}, TypeError); return {deepFrozen: true};
});
test('Documented larval length converts1cm to0.01m while preserving approximation', () => {
  const row = pack.sourceDimensions.find(row => row.id === 'malacoda-larva-length');
  const found = dimension(pack, row.id, {uid: row.uid, phase: row.phase, bodyRegion: row.bodyRegion});
  assert(found.supported); assert.equal(found.value.siValueMeters, .01); assert.equal(found.value.operator, 'approximately');
  assert.equal(found.exactValueCertified, false); assert.equal(found.collisionAdmitted, false); return {centimetres: 1, approximateMetres: .01};
});
test('The larval source cannot size an adult boss or a different body part', () => {
  const row = pack.sourceDimensions[0];
  for (const change of [{phase: 'adult'}, {uid: 're5-u-8'}, {bodyRegion: 'boss-appendage'}]) {
    assert.equal(dimension(pack, row.id, {uid: row.uid, phase: row.phase, bodyRegion: row.bodyRegion, ...change}).supported, false);
  }
  return {rejectedScaleTransfers: 3};
});
test('A textual lower bound remains a bound and never becomes collision calibration', () => {
  const row = pack.sourceDimensions.find(row => row.id === 'u8-pincer-length');
  const query = {uid: row.uid, phase: row.phase, bodyRegion: row.bodyRegion};
  assert.equal(dimension(pack, row.id, query).value.operator, 'greater-than');
  assert.equal(dimension(pack, row.id, {...query, forCollision: true}).supported, false); return {lowerBoundMeters: 3, collisionAdmission: false};
});
test('The vague U8 body height has no fabricated numeric value', () => {
  const row = pack.sourceDimensions.find(row => row.id === 'u8-body-height'); assert.equal(row.value, null); assert.equal(row.siValueMeters, null);
  const changed = structuredClone(raw); changed.sourceDimensions[2].value = 30; assert.throws(() => validate(changed), /Qualitative/); return {numericHeightAssigned: false};
});
test('Every documented conclusion matches only with all original-context conditions', () => {
  for (const rule of pack.conclusionRules) {
    const found = conclusion(pack, rule.id, matching(rule)); assert(found.documentarySupported); assert.equal(found.gameplayAdmitted, false);
  }
  return {documentedContextQueries: pack.conclusionRules.length, gameplayAssignments: 0};
});
test('Conclusions reject original versus remake and unrelated subjects', () => {
  const rule = pack.conclusionRules[0];
  assert.equal(conclusion(pack, rule.id, {...matching(rule), gameKey: 'resident-evil-3-nemesis'}).documentarySupported, false);
  assert.equal(conclusion(pack, rule.id, {...matching(rule), uid: 're3-hunter-gamma'}).documentarySupported, false); return {wrongEditionOrSubjectRejected: 2};
});
test('Every arbitrary BOW catalogue victim remains unsupported without pair-specific proof', () => {
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data/roster.json'))).catalog;
  for (const rule of pack.conclusionRules) for (const victim of catalogue) {
    const result = conclusion(pack, rule.id, {...matching(rule), victimUid: victim.id});
    assert.equal(result.documentarySupported, false); assert.equal(result.gameplayAdmitted, false);
  }
  return {explicitVictimQueriesRejected: catalogue.length * pack.conclusionRules.length};
});
test('A human worker report does not certify giant or aquatic victim morphology', () => {
  const rule = pack.conclusionRules[0]; assert(conclusion(pack, rule.id, {...matching(rule), victimMorphology: 'human'}).documentarySupported);
  for (const morphology of ['giant', 'aquatic', 'insectoid']) assert.equal(conclusion(pack, rule.id, {...matching(rule), victimMorphology: morphology}).documentarySupported, false);
  return {unsupportedMorphologies: 3};
});
test('Missing phase, environment, role or action conditions fail closed', () => {
  const rule = pack.conclusionRules[0];
  for (const change of [{phase: 'other'}, {environment: 'dry-ground'}, {victimRole: 'enemy-bow'}, {conditions: []}]) assert.equal(conclusion(pack, rule.id, {...matching(rule), ...change}).documentarySupported, false);
  return {independentContextGates: 4};
});
test('Swallow attempts and impalement do not silently become guaranteed instant deaths', () => {
  for (const id of ['duvalia-swallow-attempt', 'iron-maiden-spikes']) {
    const rule = pack.conclusionRules.find(row => row.id === id), found = conclusion(pack, id, matching(rule));
    assert.equal(found.lethality, 'not-established-by-this-quote'); assert.equal(found.gameplayAdmitted, false);
  }
  return {unjustifiedInstantDeaths: 0};
});
test('Held PlagaC alias, HD-only document and taxonomy conflict stay explicit', () => {
  for (const row of pack.aliasDecisions) assert.equal(alias(pack, row.id).promoted, false);
  assert.equal(alias(pack, 'plaga-c-to-duvalia').status, 'HELD_ALIAS_NOT_PROVEN');
  assert.equal(alias(pack, 'malacoda-taxonomy-conflict').status, 'HELD_SOURCE_TAXONOMY_CONFLICT'); return {heldDecisions: 4};
});
test('Cross-subject conclusions and promoted alias metadata are invalid inputs', () => {
  let changed = structuredClone(raw); changed.conclusionRules[0].uid = 're3-hunter-gamma'; assert.throws(() => validate(changed), /Conclusion/);
  changed = structuredClone(raw); changed.aliasDecisions[0].promoted = true; assert.throws(() => validate(changed), /alias/); return {forgedPromotionsRejected: 2};
});
test('Untrusted publisher URLs and direct-primary claims cannot enter the viewer', () => {
  for (const change of [{url: 'https://untrusted.test/evidence'}, {directPrimaryCapture: true}, {httpStatus: 403}]) {
    const changed = structuredClone(raw); Object.assign(changed.sources[0], change); assert.throws(() => validate(changed), /source/);
  }
  return {unverifiedSourceFormsRejected: 3};
});
test('Queries leave the full source data and caller request objects unchanged', () => {
  const before = JSON.stringify(pack), rule = pack.conclusionRules[0], request = Object.freeze({...matching(rule), conditions: Object.freeze([...rule.requiredConditions])});
  conclusion(pack, rule.id, request); assert.equal(JSON.stringify(pack), before); return {sourceWrites: 0, callerWrites: 0};
});
const names = ['tests/verify-canonical-r31.mjs', 'modules/fidelity-r31/canonical/query.js', 'modules/fidelity-r31/canonical/manifest.json', 'data/roster.json'];
const report = {schema: 're.bow.canonical-query-tests-r31/1', passed: checks.filter(row => row.pass).length,
  failed: checks.filter(row => !row.pass).length, checks, sourceFiles: names.map(name => ({path: name, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')})),
  scope: 'Conditional source facts and dimensions, all389 catalogue victims against six constrained rules, alias/edition gates and immutable data. No original-game animation, timing or physical collision certification.'};
fs.writeFileSync(path.join(root, 'docs/R31_CANONICAL_QUERY_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
