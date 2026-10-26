/** R26 cross-subject KOs and tied-round recovery through unchanged game input/replay APIs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';
import {mainEnvironment} from '../tests/persistence-fixtures-r24.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clone = value => JSON.parse(JSON.stringify(value));
export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const keys = ['ArrowRight', 'ArrowLeft', 'KeyJ', 'KeyK', 'KeyU'];
export const CONFIG = Object.freeze({crossSeconds: 99, crossWinsRequired: 1, tieSeconds: 5, tieWinsRequired: 2, maximumCommandFrames: 24000,
  seedBase: 260000, finishers: 'off', noDirectStateMutation: true, normalLifeAtStart: true});
export const SOURCE_PATHS = Object.freeze(['data/roster.json', 'modules/versus.html', 'src/unified-engine-v060.js', 'src/combat-foundation-v060.js',
  'src/runtime-contract.js', 'modules/fidelity-r24/persistence/verifier.js', 'tests/persistence-fixtures-r24.mjs', 'tests/engine-vm.cjs']);

export function scenariosFor(uids) {
  assert.equal(uids.length, 115); assert.equal(new Set(uids).size, 115);
  const specs = uids.map((uid, index) => ({id: 'cross-' + String(index + 1).padStart(3, '0'), p1: uid, p2: uids[(index + 1) % uids.length],
    mode: 'local', inputSchedule: 'approach-heavy-light-throw', seconds: CONFIG.crossSeconds, rounds: CONFIG.crossWinsRequired, seed: CONFIG.seedBase + index}));
  for (const index of [0, 4, 19, 38, 57, 76, 95]) specs.push({id: 'reverse-' + String(index + 1).padStart(3, '0'), p1: uids[(index + 1) % uids.length], p2: uids[index],
    mode: 'local', inputSchedule: 'approach-heavy-light-throw', seconds: CONFIG.crossSeconds, rounds: CONFIG.crossWinsRequired, seed: CONFIG.seedBase + 1000 + index});
  for (const index of [0, 57, 114, 4, 77]) specs.push({id: 'tie-reset-' + String(index + 1).padStart(3, '0'), p1: uids[index], p2: uids[(index + 1) % uids.length],
    mode: 'local', inputSchedule: 'idle-first-round-then-approach-heavy-light-throw', seconds: CONFIG.tieSeconds, rounds: CONFIG.tieWinsRequired, seed: CONFIG.seedBase + 2000 + index, ...([114, 4].includes(index) ? {expectedOutcome: 'bounded-draw'} : {})});
  for (const index of [0, 19, 38, 57, 76, 95]) specs.push({id: 'cpu-' + String(index + 1).padStart(3, '0'), p1: uids[index], p2: uids[(index + 1) % uids.length],
    mode: 'cpu', inputSchedule: 'approach-heavy-light-throw', seconds: CONFIG.crossSeconds, rounds: CONFIG.crossWinsRequired, seed: CONFIG.seedBase + 3000 + index});
  return specs;
}

export async function recordScenario(environment, spec) {
  const api = environment.api();
  for (const key of keys) environment.key(key, false);
  api.getReplayArchive().clear();
  api.startExternal({p1: spec.p1, p2: spec.p2, mode: spec.mode, rounds: spec.rounds, seconds: spec.seconds, seed: spec.seed, finishers: CONFIG.finishers});
  const initial = api.getState(), initialLife = [initial.a.life, initial.b.life], maximumLife = [initial.a.max, initial.b.max];
  assert.deepEqual(initialLife, maximumLife, 'The unchanged engine must start both subjects at normal full life');
  const seen = new WeakSet(), events = [], phaseTransitions = [], roundEnds = [], samples = [];
  let commands = 0, ticks = 0, previousPhase = null;
  function observe() {
    const state = api.getState();
    if (state.phase !== previousPhase) { phaseTransitions.push({frame: state.frame, round: state.round, phase: state.phase}); previousPhase = state.phase; }
    if (ticks % 40 === 0) samples.push({frame: state.frame, round: state.round, life: [state.a.life, state.b.life], timer: state.timer, distance: Math.abs(state.a.x - state.b.x)});
    for (const event of state.events) if (!seen.has(event)) {
      seen.add(event); const value = clone(event); events.push(value);
      if (event.type === 'roundEnd') roundEnds.push({...value, life: [state.a.life, state.b.life], timer: state.timer,
        condition: state.a.life <= 0 || state.b.life <= 0 ? 'ko' : state.timer <= 0 ? 'timer' : 'other', round: state.round});
    }
  }
  observe();
  try {
    while (!api.getState().finished && commands < CONFIG.maximumCommandFrames) {
      const state = api.getState(), idle = spec.inputSchedule.startsWith('idle-first') && state.round === 1;
      environment.key('ArrowRight', !idle && state.a.x < state.b.x);
      environment.key('ArrowLeft', !idle && state.a.x > state.b.x);
      for (const [offset, key] of [[0, 'KeyK'], [2, 'KeyJ'], [4, 'KeyU']]) {
        if (idle || ticks % 6 === offset + 1) environment.key(key, false);
        else if (ticks % 6 === offset) environment.key(key, true);
      }
      const advanced = api.advance(250); commands += advanced; ticks++; observe();
      if (!advanced && !api.getState().finished) throw Error('The original engine stopped before a result; no state was injected.');
    }
  } finally { for (const key of keys) environment.key(key, false); }
  const final = api.getState(), replay = api.getLastReplay(), contacts = events.filter(e => ['damage', 'block', 'guardBreak', 'impact', 'throw'].includes(e.type));
  const damageEvents = contacts.filter(e => e.type === 'damage');
  const record = {scenario: spec, initialLife, maximumLife, commandFrames: commands, finalFrame: final.frame,
    finished: final.finished, roundsPlayed: final.round, winner: final.winner, wins: [final.a.wins, final.b.wins], finalLife: [final.a.life, final.b.life],
    timerAtEnd: final.timer, observedEndCondition: final.finished ? final.a.life <= 0 || final.b.life <= 0 ? 'ko' : final.timer <= 0 ? 'timer' : 'other' : 'frame-limit',
    phaseTransitions, roundEndEvents: roundEnds, roundResetEvents: events.filter(e => e.type === 'roundReset'), matchEndEvents: events.filter(e => e.type === 'matchEnd'),
    damageEvents: damageEvents.length, damageAmountObserved: damageEvents.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0), contacts,
    actionsStarted: events.filter(e => ['start', 'activate'].includes(e.type)), samples, metrics: clone(final.metrics),
    noDirectStateMutation: true, normalLifeAtStart: true, artisticFinisherCertified: false, officialResidentEvilRulesCertified: false, completeMovesetCertified: false};
  if (!final.finished || !replay) {
    const excerpt = clone(api.captureReplay());
    return {...record, status: 'refused', reason: 'No completed match under the frame bound; no forced winner or life override.', excerpt, excerptSha256: digest(excerpt)};
  }
  const captured = clone(replay), verification = await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(captured);
  assert.equal(verification.verified, true); assert.equal(verification.passes, 2); assert.equal(verification.exactFinalStatesEqual, true); assert.equal(verification.result.claimed, true);
  return {...record, status: 'verified', replay: captured, replayValueSha256: digest(captured), commandSequenceSha256: digest(captured.frames), verification};
}

async function shard(specs) {
  const environment = await mainEnvironment(), records = [];
  try {
    for (const spec of specs) {
      try { records.push(await recordScenario(environment, spec)); }
      catch (error) { records.push({scenario: spec, status: 'refused', reason: String(error.stack || error), noDirectStateMutation: true}); }
      parentPort?.postMessage({type: 'progress', id: spec.id, status: records.at(-1).status, condition: records.at(-1).observedEndCondition});
    }
    return records;
  } finally { environment.dispose(); }
}

export function expectedBoundedDraw(record) {
  return record.scenario.expectedOutcome === 'bounded-draw' && record.status === 'refused' && record.finished === false && record.commandFrames === CONFIG.maximumCommandFrames
    && record.damageEvents === 0 && record.roundEndEvents.length > 0 && record.roundEndEvents.every(e => e.winner === -1 && e.condition === 'timer')
    && record.wins.every(n => n === 0) && record.finalLife.every((life, index) => life === record.maximumLife[index]);
}

export async function runAudit(options = {}) {
  const uids = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/roster.json'))).fighters.map(f => f.uid), selected = options.scenarios || scenariosFor(uids);
  const count = Math.max(1, Math.min(Number(options.workers || 4), 4, selected.length)), startedAt = new Date().toISOString(), begun = performance.now(), jobs = [];
  for (let index = 0; index < count; index++) {
    const group = selected.filter((_, i) => i % count === index);
    jobs.push(new Promise((resolve, reject) => {
      const worker = new Worker(fileURLToPath(import.meta.url), {workerData: {scenarios: group}});
      worker.on('message', message => message.type === 'result' ? resolve(message.records) : message.type === 'error' ? reject(Error(message.error)) : options.onProgress?.(message));
      worker.on('error', reject); worker.on('exit', code => {if (code) reject(Error('Engine worker exit ' + code));});
    }));
  }
  const records = (await Promise.all(jobs)).flat().sort((a, b) => selected.findIndex(s => s.id === a.scenario.id) - selected.findIndex(s => s.id === b.scenario.id));
  const verified = records.filter(r => r.status === 'verified');
  return {schema: 're.bow.full-match-audit-r26/1', startedAt, completedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - begun) / 1000,
    runtime: {node: process.version, controlledNodeDOM: true, browserOrHardware: false, workers: count}, configuration: CONFIG,
    scope: 'Original B.O.W. Protocol input, lifecycle and replay APIs with full normal life. Not original Capcom combat rules, artistic or all-pair certification.',
    summary: {mainIdentities: uids.length, scenariosAttempted: records.length, rotationalCrossPairs: records.filter(r => r.scenario.id.startsWith('cross-')).length,
      reciprocalSamples: records.filter(r => r.scenario.id.startsWith('reverse-')).length, tiedRoundScenarios: records.filter(r => r.scenario.id.startsWith('tie-reset-')).length,
      cpuOpponentScenarios: records.filter(r => r.scenario.id.startsWith('cpu-')).length, uniqueOrderedPairs: new Set(records.map(r => r.scenario.p1 + '/' + r.scenario.p2)).size,
      verifiedCompleteMatches: verified.length, refused: records.length - verified.length, expectedBoundedDraws: records.filter(expectedBoundedDraw).length,
      unexpectedRefusals: records.filter(r => r.status !== 'verified' && !expectedBoundedDraw(r)).length, verifiedReplayReconstructions: verified.length * 2,
      withObservedDamage: verified.filter(r => r.damageEvents > 0).length, koEndings: verified.filter(r => r.observedEndCondition === 'ko').length,
      timerEndings: verified.filter(r => r.observedEndCondition === 'timer').length, tiedRounds: verified.reduce((n, r) => n + r.roundEndEvents.filter(e => e.winner === -1).length, 0),
      roundEndEvents: verified.reduce((n, r) => n + r.roundEndEvents.length, 0), roundResetEvents: verified.reduce((n, r) => n + r.roundResetEvents.length, 0),
      matchEndEvents: verified.reduce((n, r) => n + r.matchEndEvents.length, 0), certifiedArtisticFinishers: 0, certifiedCompleteMovesets: 0},
    sourceInputs: SOURCE_PATHS.map(p => ({path: p, sha256: digest(fs.readFileSync(path.join(ROOT, p)))})),
    limits: ['115 rotational cross-pairs and seven reciprocal samples, not all 13,225 main-roster pairings.',
      'Most local opponents are idle deliberately to exercise damage and KOs with real keyboard inputs; six additional opponents use the seeded CPU.',
      'Cross scenarios use the native 99-second preset and one required win. Five five-second scenarios idle the first tied round, then play to two wins; two retained unresolved draws are bounded at 24,000 frames.',
      'No life, meter, resource or state override. Full life and normal engine recovery are checked; adaptive approach reads positions only.',
      'A timer result remains a timer result. Tied rounds do not award a win; replay equality does not certify all moves, matchup balance or collision artwork.',
      'Finishers disabled. No official Resident Evil victory/defeat animation, sound or timing certification.'], records};
}

if (!isMainThread) {
  try { parentPort.postMessage({type: 'result', records: await shard(workerData.scenarios)}); }
  catch (error) { parentPort.postMessage({type: 'error', error: error.stack}); }
} else if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const report = await runAudit({onProgress: value => process.stderr.write(value.id + ' ' + value.status + ' ' + value.condition + '\n')});
  fs.writeFileSync(path.join(ROOT, 'docs/R26_MATCHES.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary)); if (report.summary.unexpectedRefusals) process.exitCode = 1;
}
