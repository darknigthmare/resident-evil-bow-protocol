/** Complete short-timer B.O.W. matches through original input, record and replay APIs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';
import {mainEnvironment} from '../tests/persistence-fixtures-r24.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clone = value => JSON.parse(JSON.stringify(value));
const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const keyboard = ['ArrowRight', 'KeyJ', 'KeyK', 'KeyI'];
export const CONFIG = Object.freeze({seconds: 5, rounds: 2, maximumCommandFrames: 6000, seedBase: 250000, mode: 'cpu', finishers: 'off'});

export async function recordCompleteMatch(environment, uid, seed) {
  const api = environment.api();
  for (const key of keyboard) environment.key(key, false);
  api.getReplayArchive().clear();
  api.startExternal({p1: uid, p2: uid, mode: CONFIG.mode, rounds: CONFIG.rounds, seconds: CONFIG.seconds, seed, finishers: 'off'});
  const initial = api.getState(), initialLife = [initial.a.life, initial.b.life], maximumLife = [initial.a.max, initial.b.max];
  assert.deepEqual(initialLife, maximumLife, 'The match must start at normal full life');
  const contacts = [], seen = new WeakSet(), events = [], phases = [], ranges = [];
  let previousPhase = null, commands = 0, ticks = 0;
  function observe() {
    const state = api.getState();
    if (state.phase !== previousPhase) { phases.push({frame: state.frame, phase: state.phase, round: state.round}); previousPhase = state.phase; }
    if (ranges.length < 16 || ticks % 20 === 0) ranges.push({frame: state.frame, distance: Math.abs(state.a.x - state.b.x), life: [state.a.life, state.b.life], timer: state.timer, round: state.round});
    for (const event of state.events) if (!seen.has(event)) {
      seen.add(event); const value = clone(event); events.push(value);
      if (['damage', 'block', 'guardBreak', 'impact', 'throw'].includes(event.type)) contacts.push(value);
    }
  }
  observe(); environment.key('ArrowRight', true);
  try {
    while (!api.getState().finished && commands < CONFIG.maximumCommandFrames) {
      const cycle = ticks % 18;
      for (const [offset, key] of [[0, 'KeyJ'], [6, 'KeyK'], [12, 'KeyI']]) {
        if (cycle === offset) environment.key(key, true);
        if (cycle === offset + 1) environment.key(key, false);
      }
      const advanced = api.advance(250); commands += advanced; ticks++; observe();
      if (!advanced && !api.getState().finished) throw Error('The original engine stopped advancing before a result.');
    }
  } finally { for (const key of keyboard) environment.key(key, false); }
  const state = api.getState(), replay = api.getLastReplay();
  const roundEnds = events.filter(event => event.type === 'roundEnd');
  const metrics = clone(state.metrics), damageEvents = contacts.filter(event => event.type === 'damage');
  const evidence = {uid, opponent: uid, seed, initialLife, maximumLife, commandFrames: commands, finalFrame: state.frame,
    roundsPlayed: state.round, wins: [state.a.wins, state.b.wins], finished: state.finished, timerAtEnd: state.timer,
    finalLife: [state.a.life, state.b.life], metrics, damageEvents: damageEvents.length, contactEvents: contacts.length,
    damageAmountObserved: damageEvents.reduce((n, e) => n + (Number.isFinite(e.amount) ? e.amount : 0), 0),
    minimumObservedDistance: Math.min(...ranges.map(e => e.distance)), distanceAndLifeSamples: ranges,
    phases, roundEndEvents: roundEnds, roundResetEvents: events.filter(event => event.type === 'roundReset'),
    matchEndEvents: events.filter(event => event.type === 'matchEnd'), actionsStarted: events.filter(event => event.type === 'start' || event.type === 'activate'),
    contacts, observedEndCondition: state.finished ? state.a.life <= 0 || state.b.life <= 0 ? 'ko' : state.timer <= 0 ? 'timer' : 'other' : 'frame-limit',
    noDirectStateMutation: true, normalLifeAtStart: true, officialResidentEvilRulesCertified: false, completeMovesetCertified: false};
  if (!state.finished || !replay) return {...evidence, status: 'refused', reason: 'No full recorded result within the frame bound; no forced winner or life mutation was used.'};
  const captured = clone(replay);
  const verification = await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(captured);
  assert.equal(verification.verified, true); assert.equal(verification.passes, 2); assert.equal(verification.result.claimed, true);
  assert.equal(verification.exactFinalStatesEqual, true); assert.equal(captured.meta.p1, uid); assert.equal(captured.meta.p2, uid);
  return {...evidence, status: 'verified', replay: captured, replayValueSha256: digest(captured),
    commandSequenceSha256: digest(captured.frames), verification, verifiedArtisticFinisher: false};
}

async function shard(uids, offset) {
  const environment = await mainEnvironment(), results = [];
  try {
    for (let n = 0; n < uids.length; n++) {
      const uid = uids[n];
      try { results.push(await recordCompleteMatch(environment, uid, CONFIG.seedBase + offset + n)); }
      catch (error) { results.push({uid, opponent: uid, status: 'refused', reason: String(error.message || error), noDirectStateMutation: true}); }
      parentPort?.postMessage({type: 'progress', uid, done: n + 1, total: uids.length, status: results.at(-1).status});
    }
    return results;
  } finally { environment.dispose(); }
}

export async function runAudit(options = {}) {
  const roster = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/roster.json'))), ids = roster.fighters.map(f => f.uid || f.id);
  assert.equal(ids.length, 115); assert.equal(new Set(ids).size, 115);
  const uids = options.uids || ids; assert(uids.every(uid => ids.includes(uid))); assert.equal(new Set(uids).size, uids.length);
  const started = new Date().toISOString(), begun = performance.now(), count = Math.max(1, Math.min(Number(options.workers || 4), 4, uids.length));
  const size = Math.ceil(uids.length / count), jobs = [];
  for (let index = 0; index < count; index++) {
    const group = uids.slice(index * size, (index + 1) * size); if (!group.length) continue;
    jobs.push(new Promise((resolve, reject) => {
      const worker = new Worker(fileURLToPath(import.meta.url), {workerData: {uids: group, offset: index * size}});
      worker.on('message', message => {
        if (message.type === 'result') resolve(message.results);
        else if (message.type === 'error') reject(Error(message.error));
        else if (message.type === 'progress') options.onProgress?.(message);
      });
      worker.on('error', reject); worker.on('exit', code => { if (code) reject(Error('Engine worker exit ' + code)); });
    }));
  }
  const records = (await Promise.all(jobs)).flat().sort((a, b) => ids.indexOf(a.uid) - ids.indexOf(b.uid));
  const succeeded = records.filter(r => r.status === 'verified');
  return {schema: 're.bow.full-match-audit-r25/1', startedAt: started, completedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - begun) / 1000,
    runtime: {node: process.version, controlledNodeDOM: true, browserOrHardware: false, workers: count}, configuration: CONFIG,
    scope: 'B.O.W. Protocol short-timer lifecycle and actual replay reconstruction. This is not official Resident Evil combat rules, complete repertoire, all pairings or artistic fidelity certification.',
    summary: {expectedMainIdentities: 115, selectedIdentities: uids.length, mirrorMatchesAttempted: records.length, verifiedCompleteMatches: succeeded.length,
      refused: records.length - succeeded.length, verifiedReplayReconstructions: succeeded.length * 2,
      withObservedDamage: succeeded.filter(r => r.damageEvents > 0).length, withoutObservedDamage: succeeded.filter(r => r.damageEvents === 0).length,
      timerEndings: succeeded.filter(r => r.observedEndCondition === 'timer').length, koEndings: succeeded.filter(r => r.observedEndCondition === 'ko').length,
      roundEndEvents: succeeded.reduce((n, r) => n + r.roundEndEvents.length, 0), roundResetEvents: succeeded.reduce((n, r) => n + r.roundResetEvents.length, 0),
      matchEndEvents: succeeded.reduce((n, r) => n + r.matchEndEvents.length, 0), certifiedArtisticFinishers: 0, certifiedCompleteMovesets: 0},
    sourceInputs: ['data/roster.json','modules/versus.html','src/unified-engine-v060.js','src/combat-foundation-v060.js','src/runtime-contract.js','modules/fidelity-r24/persistence/verifier.js'].map(p => ({path: p, sha256: digest(fs.readFileSync(path.join(ROOT, p)).toString())})),
    limits: ['Five-second controlled timer, two wins required; not a certification of the official 60/99-second presets.',
      'One mirror match per selected identity, not all 13,225 pairings.', 'Default full life and unmodified original APIs; primary keyboard stream and seeded opponent CPU are recorded.',
      'Damage/contact counts and untraversed actions are reported; lifecycle success is not complete move-set or hit-box validation.',
      'Artistic finishers disabled; no native victory, defeat, sound or Capcom timing certification.'], records};
}

if (!isMainThread) {
  try { parentPort.postMessage({type: 'result', results: await shard(workerData.uids, workerData.offset)}); }
  catch (error) { parentPort.postMessage({type: 'error', error: error.stack}); }
} else if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const report = await runAudit({onProgress: value => process.stderr.write(value.uid + ' ' + value.status + '\n')});
  fs.writeFileSync(path.join(ROOT, 'docs/R25_FULL_MATCHES.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary)); if (report.summary.refused) process.exitCode = 1;
}
