import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mainEnvironment} from './persistence-fixtures-r24.mjs';
import {CONFIG, SOURCE_PATHS, digest, scenariosFor, recordScenario, expectedBoundedDraw} from '../scripts/audit-full-matches-r26.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/R26_MATCHES.json'))), checks = [];
const uids = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/roster.json'))).fighters.map(f => f.uid), specs = scenariosFor(uids);
const clone = value => JSON.parse(JSON.stringify(value));
async function test(name, run) {try {const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
export function validate(value) {
  assert.equal(value.schema, 're.bow.full-match-audit-r26/1'); assert.deepEqual(value.configuration, CONFIG);
  assert.deepEqual(value.records.map(r => r.scenario), specs); assert.equal(value.records.length, 133);
  const verified = value.records.filter(r => r.status === 'verified'), summary = value.summary;
  const expected = {mainIdentities: 115, scenariosAttempted: 133, rotationalCrossPairs: 115, reciprocalSamples: 7, tiedRoundScenarios: 5, cpuOpponentScenarios: 6,
    uniqueOrderedPairs: 122, verifiedCompleteMatches: verified.length, refused: value.records.length - verified.length, expectedBoundedDraws: value.records.filter(expectedBoundedDraw).length,
    unexpectedRefusals: value.records.filter(r => r.status !== 'verified' && !expectedBoundedDraw(r)).length, verifiedReplayReconstructions: verified.length * 2,
    withObservedDamage: verified.filter(r => r.damageEvents > 0).length, koEndings: verified.filter(r => r.observedEndCondition === 'ko').length,
    timerEndings: verified.filter(r => r.observedEndCondition === 'timer').length, tiedRounds: verified.reduce((n, r) => n + r.roundEndEvents.filter(e => e.winner === -1).length, 0),
    roundEndEvents: verified.reduce((n, r) => n + r.roundEndEvents.length, 0), roundResetEvents: verified.reduce((n, r) => n + r.roundResetEvents.length, 0),
    matchEndEvents: verified.reduce((n, r) => n + r.matchEndEvents.length, 0), certifiedArtisticFinishers: 0, certifiedCompleteMovesets: 0};
  assert.deepEqual(summary, expected);
  for (const row of value.records) {
    assert.equal(row.noDirectStateMutation, true);
    if (row.status !== 'verified') {assert.equal(row.status, 'refused'); assert.equal(typeof row.reason, 'string'); assert(row.reason.length > 0); assert.equal(row.excerptSha256, digest(row.excerpt)); continue;}
    const spec = row.scenario;
    assert.equal(row.normalLifeAtStart, true); assert.deepEqual(row.initialLife, row.maximumLife); assert(row.maximumLife.every(life => life > 0));
    assert.equal(row.finished, true); assert(row.commandFrames > 0 && row.commandFrames <= CONFIG.maximumCommandFrames); assert.equal(row.commandFrames, row.finalFrame);
    assert(row.roundEndEvents.length >= spec.rounds); assert.equal(row.matchEndEvents.length, 1); assert(Math.max(...row.wins) >= spec.rounds);
    assert.equal(row.verification.verified, true); assert.equal(row.verification.passes, 2); assert.equal(row.verification.exactFinalStatesEqual, true); assert.equal(row.verification.result.claimed, true);
    assert.equal(row.officialResidentEvilRulesCertified, false); assert.equal(row.completeMovesetCertified, false); assert.equal(row.artisticFinisherCertified, false);
    assert.equal(row.replay.meta.p1, spec.p1); assert.equal(row.replay.meta.p2, spec.p2); assert.equal(row.replay.meta.seed, spec.seed); assert.equal(row.replay.meta.mode, spec.mode);
    assert.equal(row.replay.meta.seconds, spec.seconds); assert.equal(row.replay.meta.rounds, spec.rounds);
    assert.equal(row.replay.meta.rules58.p1Life, row.initialLife[0]); assert.equal(row.replay.meta.rules58.p2Life, row.initialLife[1]); assert.deepEqual(row.replay.meta.rules58.mutators, []);
    assert.equal(row.replayValueSha256, digest(row.replay)); assert.equal(row.commandSequenceSha256, digest(row.replay.frames));
    assert.equal(row.replay.frames.reduce((sum, run) => sum + run[0], 0), row.commandFrames);
    assert.equal(row.damageEvents, row.contacts.filter(e => e.type === 'damage').length); assert.equal(row.damageAmountObserved, row.contacts.filter(e => e.type === 'damage').reduce((n, e) => n + e.amount, 0));
    assert.equal(row.roundsPlayed, row.roundResetEvents.length + 1); assert.equal(row.wins.reduce((n, wins) => n + wins, 0), row.roundEndEvents.filter(e => e.winner >= 0).length);
    for (const event of row.roundEndEvents) {
      assert.equal(event.condition, event.life.some(life => life <= 0) ? 'ko' : event.timer === 0 ? 'timer' : 'other');
      assert.equal(event.winner, event.life[0] === event.life[1] ? -1 : event.life[0] > event.life[1] ? 0 : 1);
    }
    const last = row.roundEndEvents.at(-1); assert.equal(row.observedEndCondition, last.condition); assert.deepEqual(row.finalLife, last.life); assert.equal(row.timerAtEnd, last.timer);
  }
  return verified;
}

await test('115 distinct cross-pairs cover every main identity on both sides with seven reciprocal samples', () => {
  const rotational = specs.filter(s => s.id.startsWith('cross-'));
  assert.deepEqual(rotational.map(s => s.p1), uids); assert.deepEqual([...new Set(rotational.map(s => s.p2))].sort(), [...uids].sort());
  assert(rotational.every(s => s.p1 !== s.p2)); assert.equal(new Set(specs.map(s => s.p1 + '/' + s.p2)).size, 122);
  return {rotationalPairs: rotational.length, reciprocalPairs: 7, totalOrderedPairs: 122, allPossiblePairs: 13225};
});
await test('Recorded full-life outcomes and replay hashes match the exact scenario scope', () => {
  const verified = validate(report); assert.equal(verified.length, 131); assert.equal(report.summary.refused, 2); assert.equal(report.summary.expectedBoundedDraws, 2); assert.equal(report.summary.unexpectedRefusals, 0);
  assert(report.summary.koEndings > 0); assert.equal(report.summary.withObservedDamage, 131);
  return report.summary;
});
await test('All three first-round ties award no win and reset normally before a completed two-win match', () => {
  const rows = report.records.filter(r => r.scenario.id.startsWith('tie-reset-') && r.scenario.expectedOutcome !== 'bounded-draw');
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.equal(row.status, 'verified'); const first = row.roundEndEvents[0]; assert.equal(first.round, 1); assert.equal(first.winner, -1); assert.equal(first.condition, 'timer');
    assert.equal(first.timer, 0); assert.deepEqual(first.life, row.maximumLife); assert(row.roundResetEvents.length >= 2); assert(row.roundEndEvents.length >= 3);
    assert(row.roundEndEvents.slice(1).some(e => e.winner >= 0)); assert.equal(Math.max(...row.wins), 2);
  }
  return {scenarios: rows.map(r => r.scenario.id), tiedRounds: rows.reduce((n, r) => n + r.roundEndEvents.filter(e => e.winner === -1).length, 0)};
});
await test('The two retained short-timer draws stay incomplete and bounded without fabricated winners', () => {
  const rows = report.records.filter(r => r.scenario.expectedOutcome === 'bounded-draw'); assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(r => r.scenario.id), ['tie-reset-115', 'tie-reset-005']);
  for (const row of rows) {
    assert.equal(expectedBoundedDraw(row), true); assert.equal(row.commandFrames, 24000); assert.equal(row.finished, false); assert.equal(row.winner, null);
    assert.equal(row.roundEndEvents.length, 50); assert.equal(row.roundResetEvents.length, 49); assert.equal(row.matchEndEvents.length, 0);
    assert(row.roundEndEvents.every(e => e.winner === -1 && e.condition === 'timer' && e.timer === 0)); assert.deepEqual(row.wins, [0, 0]);
    assert.equal(row.damageEvents, 0); assert.deepEqual(row.finalLife, row.maximumLife); assert(!('replay' in row)); assert.equal(row.excerptSha256, digest(row.excerpt));
  }
  return {scenarios: rows.map(r => r.scenario.id), boundedFramesEach: 24000, tiedRoundsEach: 50, resetsEach: 49, fullReplaysVerified: 0};
});
await test('Every reviewed engine, replay fixture and roster retains its exact recorded bytes', () => {
  assert.deepEqual(report.sourceInputs.map(s => s.path), SOURCE_PATHS);
  for (const source of report.sourceInputs) assert.equal(digest(fs.readFileSync(path.join(ROOT, source.path))), source.sha256, source.path);
});
await test('Falsified pair coverage, tie winner, life override, replay bytes and KO statistics are rejected', () => {
  const tie = report.records.findIndex(r => r.scenario.id.startsWith('tie-reset-'));
  for (const mutate of [r => r.records.pop(), r => r.records[0].scenario.p2 = r.records[0].scenario.p1, r => r.summary.koEndings++,
    r => r.records[0].initialLife[0]--, r => r.records[0].replay.result.life--, r => r.records[tie].roundEndEvents[0].winner = 0,
    r => r.records[0].damageEvents++, r => r.records[0].replay.meta.rules58.mutators.push('glass')]) {
    const changed = clone(report); mutate(changed); assert.throws(() => validate(changed));
  }
});
const environment = await mainEnvironment();
try {
  await test('KO, reciprocal, tied-reset and seeded CPU captures each reconstruct twice again in the original engine', async () => {
    const rows = [report.records.find(r => r.observedEndCondition === 'ko'), ...['reverse-', 'tie-reset-', 'cpu-'].map(prefix => report.records.find(r => r.scenario.id.startsWith(prefix)))];
    for (const row of rows) {
      assert(row); const result = await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(row.replay);
      assert.equal(result.stateFingerprint.value, row.verification.stateFingerprint.value); assert.deepEqual(clone(result.result), row.verification.result); assert.equal(result.exactFinalStatesEqual, true);
    }
    return {scenarios: rows.map(r => r.scenario.id), additionalReplayReconstructions: rows.length * 2};
  });
  await test('Incomplete excerpts claim no winner while tampered results, contracts and durations fail original-engine replay validation', async () => {
    const original = report.records.find(r => r.observedEndCondition === 'ko').replay;
    const bounded = report.records.find(r => r.scenario.expectedOutcome === 'bounded-draw'), excerptCheck = await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(bounded.excerpt);
    assert.equal(excerptCheck.verified, true); assert.equal(excerptCheck.passes, 2); assert.equal(excerptCheck.exactFinalStatesEqual, true); assert.equal(excerptCheck.result.claimed, false);
    assert.equal(excerptCheck.reconstructed.finished, false); assert.equal(excerptCheck.reconstructed.winner, null); assert.equal(excerptCheck.reconstructed.frame, 24000);
    assert.deepEqual(clone(excerptCheck.reconstructed.life), bounded.finalLife); assert.deepEqual(clone(excerptCheck.reconstructed.rounds), bounded.wins);
    const life = clone(original); life.result.life--;
    await assert.rejects(() => environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(life), /Résultat différent/);
    const contract = clone(original); contract.meta.runtimeContract = 'unknown-contract-r26';
    await assert.rejects(() => environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(contract), /moteur d’origine/);
    const duration = clone(original); duration.captureR13.frames++;
    await assert.rejects(() => environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(duration), /Durée ou type/);
    return {incompleteExcerpt: bounded.scenario.id, excerptFrames: 24000, excerptReconstructions: 2, resultClaimed: false, tamperedRecordsRejected: 3};
  });
  await test('Normal-life tied-round recovery reproduces the full adaptive keyboard stream without state injection', async () => {
    const original = report.records.find(r => r.scenario.id.startsWith('tie-reset-')), repeated = await recordScenario(environment, original.scenario);
    assert.equal(repeated.status, 'verified'); assert.deepEqual(repeated.replay.frames, original.replay.frames); assert.deepEqual(repeated.replay.result, original.replay.result);
    assert.equal(repeated.verification.stateFingerprint.value, original.verification.stateFingerprint.value); assert.deepEqual(repeated.metrics, original.metrics);
    return {scenario: original.scenario.id, commandDigest: repeated.commandSequenceSha256, noDirectStateMutation: true};
  });
} finally {environment.dispose();}
const result = {schema: 're.bow.full-match-tests-r26/1', passed: checks.filter(r => r.pass).length, failed: checks.filter(r => !r.pass).length, checks};
fs.writeFileSync(path.join(ROOT, 'docs/R26_MATCH_TESTS.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result)); if (result.failed) process.exitCode = 1;
