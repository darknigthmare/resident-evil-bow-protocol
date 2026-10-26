/** Verify the narrow R27 input, lifecycle and combat-replay claims. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mainEnvironment} from './persistence-fixtures-r24.mjs';
import {CONFIG, SOURCE_PATHS, digest, scenarios, recordScenario} from '../scripts/audit-full-matches-r27.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/R27_MATCHES.json')));
const previous = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/R26_MATCHES.json'))), checks = [];
const clone = value => JSON.parse(JSON.stringify(value));
async function test(name, run) {
  try {const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}

export function validate(value) {
  assert.equal(value.schema, 're.bow.targeted-match-audit-r27/1'); assert.deepEqual(value.configuration, CONFIG);
  assert.deepEqual(value.records.map(row => row.scenario), scenarios()); assert.equal(value.records.length, 12);
  const verified = value.records.filter(row => row.status === 'verified');
  const summary = {scenariosAttempted: value.records.length, completeMatches: verified.length, refusedCaptures: value.records.length - verified.length,
    exactReplayReconstructions: verified.length * 2, recoveredR26BoundedScenarios: verified.filter(r => r.scenario.previousScenario).length,
    koEndings: verified.filter(r => r.observedEndCondition === 'ko').length, timerEndings: verified.filter(r => r.observedEndCondition === 'timer').length,
    observedPrototypeFinisherScenes: verified.filter(r => r.replay.result.finisher).length,
    recordedCompatibilityRefusals: verified.filter(r => r.scenario.conclusion === 'expect-refusal' && !r.windowSeen && r.compatibility.every(c => !c.allowed)).length,
    keyboardWindowSkips: verified.filter(r => r.scenario.conclusion === 'skip' && r.selected && !r.replay.result.finisher).length,
    naturallyExpiredWindows: verified.filter(r => r.scenario.conclusion === 'expire' && r.windowSeen && !r.replay.result.finisher).length,
    certifiedArtisticFinishers: 0, replayedFinisherScenes: 0};
  assert.deepEqual(value.summary, summary);
  for (const row of value.records) {
    assert.equal(row.noDirectStateMutation, true); assert.equal(row.normalLifeAtStart, true);
    assert.deepEqual(row.initialLife, row.maximumLife); assert(row.maximumLife.every(n => n > 0));
    assert.equal(row.artisticFinisherCertified, false); assert.equal(row.officialResidentEvilRulesCertified, false);
    assert.equal(row.prematureWindow, false); assert.equal(row.status, 'verified'); assert.equal(row.finished, true);
    assert.equal(row.commandFrames, row.finalFrame); assert(row.commandFrames > 0 && row.commandFrames <= CONFIG.maximumCommandFrames);
    assert.equal(row.commandFrames, row.replay.frames.reduce((sum, run) => sum + run[0], 0));
    assert.equal(row.replaySha256, digest(row.replay)); assert.equal(row.commandsSha256, digest(row.replay.frames));
    for (const key of ['p1', 'p2', 'mode', 'seconds', 'rounds', 'seed']) assert.equal(row.replay.meta[key], row.scenario[key], key);
    assert.equal(row.replay.meta.rules58.p1Life, row.maximumLife[0]); assert.equal(row.replay.meta.rules58.p2Life, row.maximumLife[1]);
    assert.deepEqual(row.replay.meta.rules58.mutators, []);
    assert.equal(row.matchEndEvents.length, 1); assert.equal(row.roundResetEvents.length + 1, row.finalRound);
    assert.equal(row.roundEndEvents.filter(e => e.winner >= 0).length, row.wins.reduce((n, wins) => n + wins, 0));
    assert.equal(Math.max(...row.wins), row.scenario.rounds);
    assert.equal(row.damageEvents > 0, true);
    const last = row.roundEndEvents.at(-1);
    assert.deepEqual(row.finalLife, last.life); assert.equal(row.timer, last.timer);
    assert.equal(row.observedEndCondition, row.finalLife.some(n => n <= 0) ? 'ko' : row.timer === 0 ? 'timer' : 'other');
    for (const event of row.roundEndEvents) assert.equal(event.winner, event.life[0] === event.life[1] ? -1 : event.life[0] > event.life[1] ? 0 : 1);
    assert.equal(row.verification.verified, true); assert.equal(row.verification.passes, 2); assert.equal(row.verification.exactFinalStatesEqual, true);
    assert.equal(row.verification.result.claimed, true); assert.equal(row.verification.result.finisherVerified, false);
    assert.equal(row.verification.result.recordedFinisher, row.replay.result.finisher?.id || null);
    if (row.scenario.conclusion === 'select') {
      const choice = row.conclusions.find(item => item.type === 'keyboard-choice'); assert(choice); assert.equal(choice.index, row.scenario.finisherIndex);
      assert.equal(choice.code, 'KeyO'); assert.equal(choice.compatibility.allowed, true); assert.equal(choice.compatibility.canonical, false);
      assert.equal(row.replay.result.finisher.id, choice.compatibility.id); assert.equal(row.selected, true); assert.equal(row.windowSeen, true);
      assert(row.conclusions.filter(item => item.type === 'scene').every(item => item.id === choice.compatibility.id));
    } else assert.equal(row.replay.result.finisher, null);
  }
  return verified;
}

await test('Twelve precisely scoped normal-life captures complete with 24 exact combat reconstructions', () => {
  validate(report);
  assert.deepEqual(report.summary, {scenariosAttempted: 12, completeMatches: 12, refusedCaptures: 0, exactReplayReconstructions: 24,
    recoveredR26BoundedScenarios: 2, koEndings: 10, timerEndings: 2, observedPrototypeFinisherScenes: 6,
    recordedCompatibilityRefusals: 2, keyboardWindowSkips: 1, naturallyExpiredWindows: 1, certifiedArtisticFinishers: 0, replayedFinisherScenes: 0});
  return report.summary;
});
await test('Both preserved R26 five-second draws recover through changed real input after the same first tie', () => {
  const rows = report.records.filter(row => row.scenario.previousScenario); assert.equal(rows.length, 2);
  for (const row of rows) {
    const old = previous.records.find(entry => entry.scenario.id === row.scenario.previousScenario); assert(old);
    assert.equal(old.status, 'refused'); assert.equal(old.roundEndEvents.length, 50); assert.equal(old.finished, false); assert.deepEqual(old.wins, [0, 0]);
    for (const key of ['p1', 'p2', 'mode', 'seconds', 'rounds', 'seed']) assert.equal(row.scenario[key], old.scenario[key]);
    assert.equal(row.scenario.strategy, 'first-tie-then-dual-dash-approach'); assert.equal(row.observedEndCondition, 'timer');
    assert.equal(row.roundEndEvents[0].winner, -1); assert.deepEqual(row.roundEndEvents[0].life, row.maximumLife);
    assert.equal(row.roundEndEvents[0].timer, 0); assert.equal(row.roundEndEvents.length, 3); assert.equal(row.roundResetEvents.length, 2);
    assert.equal(row.damageEvents, 9); assert.equal(row.finalRound, 3); assert.equal(row.commandFrames, 1450);
  }
  return {previousRowsRetainedUnchanged: true, recoveredRows: rows.map(r => r.scenario.previousScenario), sameRulePreset: true, forcedWinner: false};
});
await test('All four keyboard choices and the cinematic variant preserve their prototype-only phase sequence', () => {
  const rows = report.records.filter(row => row.scenario.id.startsWith('stylized-choice-'));
  assert.deepEqual(rows.map(row => row.scenario.finisherIndex), [0, 1, 2, 3]);
  assert.deepEqual(rows.map(row => row.conclusions.find(item => item.type === 'keyboard-choice').direction), [null, 'ArrowDown', 'ArrowRight', 'ArrowLeft']);
  for (const row of [...rows, report.records.find(row => row.scenario.id === 'cinematic-choice-0')]) {
    const scene = row.conclusions.filter(item => item.type === 'scene');
    assert.deepEqual(scene.map(item => item.phase), ['approach', 'grapple', 'impact', 'fall']);
    assert(scene.every(item => item.frame === row.finalFrame));
    assert.equal(row.conclusions.find(item => item.type === 'window').frame, row.finalFrame);
  }
  const basic = rows[0].conclusions.find(item => item.type === 'scene'), cinematic = report.records.find(row => row.scenario.id === 'cinematic-choice-0').conclusions.find(item => item.type === 'scene');
  assert.equal(cinematic.duration, basic.duration * 1.18);
  const two = report.records.find(row => row.scenario.id === 'two-round-final-window');
  assert.equal(two.finalRound, 2); assert.equal(two.roundEndEvents.length, 2); assert.equal(two.roundResetEvents.length, 1);
  const window = two.conclusions.find(item => item.type === 'window'); assert.equal(window.round, 2); assert.equal(Math.max(...window.wins), 2);
  return {fourDirections: true, cinematicNativeDurationMultiplier: 1.18, prematureWindows: 0, artCertification: false};
});
await test('Keyboard skip, natural expiry and both compatibility refusals preserve ordinary complete results', () => {
  const skip = report.records.find(row => row.scenario.conclusion === 'skip'), expiry = report.records.find(row => row.scenario.conclusion === 'expire');
  assert(skip.conclusions.some(item => item.type === 'keyboard-skip' && item.code === 'Enter')); assert.equal(skip.presentationTicks, 1);
  assert.equal(expiry.selected, false); assert.equal(expiry.conclusions.filter(item => item.type === 'scene').length, 0);
  const milliseconds = expiry.presentationTicks * CONFIG.commandTickMilliseconds, windowLimit = expiry.conclusions[0].limit * 1000 / 60;
  assert(milliseconds >= windowLimit && milliseconds <= windowLimit + 2 * CONFIG.commandTickMilliseconds);
  for (const row of report.records.filter(row => row.scenario.conclusion === 'expect-refusal')) {
    assert.equal(row.windowSeen, false); assert.equal(row.selected, false); assert.equal(row.presentationTicks, 0);
    assert.equal(row.compatibility.length, 4); assert(row.compatibility.every(choice => !choice.allowed && choice.canonical === false));
    const expected = row.scenario.id === 'refused-unreviewed-body' ? 'attacker-unreviewed' : 'size-envelope';
    assert(row.compatibility.every(choice => choice.code === expected));
  }
  return {skippedWindows: 1, expiredWindows: 1, refusedBodies: 2, inventedScenes: 0};
});
await test('All original simulation, compatibility, replay and previous bounded evidence bytes remain exact', () => {
  assert.deepEqual(report.sourceInputs.map(item => item.path), SOURCE_PATHS);
  for (const item of report.sourceInputs) assert.equal(digest(fs.readFileSync(path.join(ROOT, item.path))), item.sha256, item.path);
  return {sourceFiles: SOURCE_PATHS.length, historicalR26ReportModified: false};
});
await test('Falsified coverage, life, tie winners, replay bytes, finisher selection and certification are rejected', () => {
  for (const mutate of [value => value.records.pop(), value => value.summary.observedPrototypeFinisherScenes++,
    value => value.records[0].initialLife[0]--, value => value.records[0].roundEndEvents[0].winner = 0,
    value => value.records[2].scenario.finisherIndex = 3, value => value.records[2].conclusions[1].compatibility.allowed = false,
    value => value.records[2].artisticFinisherCertified = true, value => value.records[2].replay.result.life--,
    value => value.records[0].replay.meta.rules58.mutators.push('glass')]) {
    const changed = clone(report); mutate(changed); assert.throws(() => validate(changed));
  }
  return {tamperedReportsRejected: 9};
});

const environment = await mainEnvironment();
try {
  await test('Recovered tie, selected conclusion and refused body combat captures reconstruct twice in the original engine', async () => {
    const rows = [report.records[0], report.records[5], report.records[10]];
    for (const row of rows) {
      const actual = await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(row.replay);
      assert.equal(actual.stateFingerprint.value, row.verification.stateFingerprint.value); assert.equal(actual.passes, 2);
      assert.equal(actual.result.finisherVerified, false); assert.deepEqual(clone(actual.result), row.verification.result);
    }
    return {scenarios: rows.map(row => row.scenario.id), additionalCombatReconstructions: 6, finisherScenesReconstructed: 0};
  });
  await test('Finisher metadata remains outside combat certification even when a claimed finisher ID is altered', async () => {
    const row = report.records[2], changed = clone(row.replay); changed.result.finisher.id = 'not-a-verified-game-finisher';
    const actual = await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(changed);
    assert.equal(actual.verified, true); assert.equal(actual.result.finisherVerified, false);
    assert.equal(actual.result.recordedFinisher, changed.result.finisher.id);
    const falseClaim = clone(report); falseClaim.records[2].verification.result.finisherVerified = true;
    assert.throws(() => validate(falseClaim));
    return {combatStillDeterministic: true, finisherMetadataAuthenticated: false, certificationCannotBePromoted: true};
  });
  await test('The changed dual-approach strategy and directional conclusion reproduce through real keyboard input', async () => {
    const rows = [report.records[1], report.records[5]];
    for (const old of rows) {
      const actual = await recordScenario(environment, old.scenario);
      assert.equal(actual.status, 'verified'); assert.equal(actual.commandsSha256, old.commandsSha256);
      assert.deepEqual(actual.replay.result, old.replay.result); assert.deepEqual(actual.conclusions, old.conclusions);
      assert.equal(actual.verification.stateFingerprint.value, old.verification.stateFingerprint.value);
    }
    return {scenarios: rows.map(row => row.scenario.id), noDirectStateMutation: true, exactKeyboardStreams: true};
  });
} finally {environment.dispose();}

const result = {schema: 're.bow.targeted-match-tests-r27/1', passed: checks.filter(item => item.pass).length,
  failed: checks.filter(item => !item.pass).length, checks,
  scope: 'Original normal-life input, prototype conclusion lifecycle and deterministic combat replays. No artistic/official-game finisher certification.'};
fs.writeFileSync(path.join(ROOT, 'docs/R27_MATCH_TESTS.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
