import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {mainEnvironment} from './persistence-fixtures-r24.mjs';
import {recordCompleteMatch, CONFIG} from '../scripts/audit-full-matches-r25.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(fs.readFileSync(path.join(root, 'docs/R25_FULL_MATCHES.json'))), checks = [];
const roster = JSON.parse(fs.readFileSync(path.join(root, 'data/roster.json'))).fighters.map(f => f.uid);
const sha = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
function validate(value) {
  assert.equal(value.schema, 're.bow.full-match-audit-r25/1'); assert.deepEqual(value.configuration, CONFIG);
  assert.equal(value.records.length, 115); assert.deepEqual(value.records.map(r => r.uid), roster); assert.equal(new Set(value.records.map(r => r.uid)).size, 115);
  assert.equal(value.summary.mirrorMatchesAttempted, 115); assert.equal(value.summary.selectedIdentities, 115); assert.equal(value.summary.expectedMainIdentities, 115);
  const verified = value.records.filter(r => r.status === 'verified');
  assert.equal(value.summary.verifiedCompleteMatches, verified.length); assert.equal(value.summary.refused, 115 - verified.length); assert.equal(value.summary.verifiedReplayReconstructions, verified.length * 2);
  assert.equal(value.summary.withObservedDamage, verified.filter(r => r.damageEvents > 0).length); assert.equal(value.summary.withoutObservedDamage, verified.filter(r => r.damageEvents === 0).length);
  assert.equal(value.summary.timerEndings, verified.filter(r => r.observedEndCondition === 'timer').length); assert.equal(value.summary.koEndings, verified.filter(r => r.observedEndCondition === 'ko').length);
  for (const row of verified) {
    assert.equal(row.uid, row.opponent); assert.equal(row.normalLifeAtStart, true); assert.equal(row.noDirectStateMutation, true); assert.deepEqual(row.initialLife, row.maximumLife); assert(row.maximumLife.every(life => life > 0));
    assert.equal(row.finished, true); assert(row.commandFrames > 0 && row.commandFrames <= CONFIG.maximumCommandFrames);
    assert(row.roundEndEvents.length >= 2); assert(row.roundResetEvents.length >= 1); assert.equal(row.matchEndEvents.length, 1); assert(Math.max(...row.wins) >= CONFIG.rounds);
    assert.equal(row.verification.verified, true); assert.equal(row.verification.passes, 2); assert.equal(row.verification.exactFinalStatesEqual, true); assert.equal(row.verification.result.claimed, true);
    assert.equal(row.officialResidentEvilRulesCertified, false); assert.equal(row.completeMovesetCertified, false); assert.equal(row.verifiedArtisticFinisher, false);
    assert.equal(row.replay.meta.p1, row.uid); assert.equal(row.replay.meta.p2, row.uid); assert.equal(row.replay.meta.seconds, 5); assert.equal(row.replay.meta.rounds, 2); assert.equal(row.replay.meta.rules58.p1Life, row.initialLife[0]); assert.equal(row.replay.meta.rules58.p2Life, row.initialLife[1]);
    assert.equal(row.replayValueSha256, sha(row.replay)); assert.equal(row.commandSequenceSha256, sha(row.replay.frames)); assert.equal(row.replay.frames.reduce((sum, run) => sum + run[0], 0), row.commandFrames);
    assert.equal(row.damageEvents, row.contacts.filter(e => e.type === 'damage').length); assert.equal(row.damageAmountObserved, row.contacts.filter(e => e.type === 'damage').reduce((n, e) => n + e.amount, 0));
  }
  return verified;
}

await test('All 115 main identities have explicit mirror-match outcomes under short-timer rules', () => {
  const verified = validate(report); assert.equal(verified.length, 115, 'Any real engine refusal must remain a visible failed lifecycle criterion');
  return {mirrorMatches: verified.length, replayReconstructions: verified.length * 2, secondsPerRound: 5, winsRequired: 2};
});
await test('Every recorded source input still matches the exact reviewed engine and roster bytes', () => {
  for (const source of report.sourceInputs) assert.equal(sha(fs.readFileSync(path.join(root, source.path))), source.sha256, source.path);
});
await test('Falsified report coverage, source replay bytes, life overrides and damage counts are rejected', () => {
  for (const alter of [r => r.records.pop(), r => r.summary.verifiedReplayReconstructions++, r => r.records[0].replay.result.life--,
    r => r.records[0].initialLife[0]--, r => r.records[0].damageEvents++, r => r.records[0].replay.meta.seconds = 99]) {
    const changed = clone(report); alter(changed); assert.throws(() => validate(changed));
  }
});
const environment = await mainEnvironment();
try {
  await test('Three recorded identities reconstruct twice again in the unchanged actual engine', async () => {
    const indices = [0, Math.floor(report.records.length / 2), report.records.length - 1];
    for (const index of indices) {
      const row = report.records[index], result = await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(row.replay);
      assert.equal(result.stateFingerprint.value, row.verification.stateFingerprint.value); assert.deepEqual(clone(result.result), row.verification.result); assert.equal(result.exactFinalStatesEqual, true);
    }
    return {sampledIdentities: indices.map(i => report.records[i].uid), independentReconstructions: 6};
  });
  await test('Altered results, unknown contracts and changed command timelines fail original-engine replay checks', async () => {
    const original = report.records[0].replay;
    const life = clone(original); life.result.life--;
    await assert.rejects(() => environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(life), /Résultat différent/);
    const contract = clone(original); contract.meta.runtimeContract = 'unknown-historical-contract';
    await assert.rejects(() => environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(contract), /moteur d’origine/);
    const commands = clone(original); commands.captureR13.frames++;
    await assert.rejects(() => environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(commands), /Durée ou type/);
  });
  await test('The same seed and real input schedule reproduce command runs and full outcome without state injection', async () => {
    const original = report.records[0], repeated = await recordCompleteMatch(environment, original.uid, original.seed);
    assert.equal(repeated.status, 'verified'); assert.deepEqual(repeated.replay.frames, original.replay.frames); assert.deepEqual(repeated.replay.result, original.replay.result);
    assert.equal(repeated.verification.stateFingerprint.value, original.verification.stateFingerprint.value); assert.deepEqual(repeated.metrics, original.metrics);
    return {identity: original.uid, seed: original.seed, inputDigest: repeated.commandSequenceSha256, normalLifeAtStart: repeated.normalLifeAtStart};
  });
} finally { environment.dispose(); }
console.log(JSON.stringify({schema: 're.bow.full-match-tests-r25/1', passed: checks.filter(r => r.pass).length, failed: checks.filter(r => !r.pass).length, checks}));
if (checks.some(r => !r.pass)) process.exitCode = 1;
