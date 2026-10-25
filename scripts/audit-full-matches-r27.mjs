/** R27 targeted normal-life tie recovery and prototype finisher lifecycle. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';
import {mainEnvironment} from '../tests/persistence-fixtures-r24.mjs';
import {createHash} from 'node:crypto';
export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clone = value => JSON.parse(JSON.stringify(value));
const KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ShiftRight', 'KeyJ', 'KeyK', 'KeyU', 'KeyO', 'KeyA', 'KeyD', 'KeyE', 'Enter'];
export const CONFIG = Object.freeze({maximumCommandFrames: 24000, maximumPresentationTicks: 600,
  sourceLifeOverride: false, sourceMeterOverride: false, commandTickMilliseconds: 250, artisticFinisherCertified: false});
export const SOURCE_PATHS = Object.freeze(['data/roster.json', 'src/re-data.js', 'src/unified-engine-v060.js', 'src/combat-foundation-v060.js',
  'src/match-sequences-r8.js', 'src/finishers-v053.js', 'src/finisher-library-v060.js', 'src/finisher-compatibility-r10.js',
  'src/runtime-contract.js', 'modules/fidelity-r24/persistence/verifier.js', 'tests/persistence-fixtures-r24.mjs', 'tests/engine-vm.cjs',
  'scripts/audit-full-matches-r27.mjs', 'docs/R26_MATCHES.json']);

export function scenarios() {
  const common = {p1: 're3r-nemesis', p2: 're1-hunter', mode: 'local', seconds: 99, rounds: 1,
    strategy: 'distance-gated-p1-approach', finishers: 'stylized', conclusion: 'select', seed: 270000};
  const result = [
    {id: 'recover-wesker-cerberus', p1: 're5-uroboros-albert-wesker', p2: 're1-cerberus', mode: 'local', seconds: 5, rounds: 2,
      strategy: 'first-tie-then-dual-dash-approach', finishers: 'off', conclusion: 'none', seed: 262114, previousScenario: 'tie-reset-115'},
    {id: 'recover-nemesis-mendez', p1: 're3r-nemesis', p2: 're4-bitores-mendez-enemy', mode: 'local', seconds: 5, rounds: 2,
      strategy: 'first-tie-then-dual-dash-approach', finishers: 'off', conclusion: 'none', seed: 262004, previousScenario: 'tie-reset-005'},
    ...[0, 1, 2, 3].map(index => ({...common, id: 'stylized-choice-' + index, finisherIndex: index, seed: 270100 + index})),
    {...common, id: 'cinematic-choice-0', finishers: 'cinematic', finisherIndex: 0, seed: 270200},
    {...common, id: 'window-keyboard-skip', conclusion: 'skip', seed: 270201},
    {...common, id: 'window-natural-expiry', conclusion: 'expire', seed: 270202},
    {...common, id: 'refused-unreviewed-body', p1: 're5-uroboros-albert-wesker', p2: 're1-cerberus', conclusion: 'expect-refusal', seed: 270203},
    {...common, id: 'refused-size-envelope', p1: 're1-cerberus', p2: 're1r-tyrant', conclusion: 'expect-refusal', seed: 270204},
    {...common, id: 'two-round-final-window', p2: 're4-bitores-mendez-enemy', rounds: 2, finisherIndex: 2, seed: 270205},
  ];
  return result;
}

export async function recordScenario(environment, spec) {
  const api = environment.api();
  for (const key of KEYS) environment.key(key, false);
  api.getReplayArchive().clear();
  api.startExternal({p1: spec.p1, p2: spec.p2, mode: spec.mode, seconds: spec.seconds, rounds: spec.rounds, seed: spec.seed, finishers: spec.finishers});
  const initial = api.getState(), initialLife = [initial.a.life, initial.b.life], maximumLife = [initial.a.max, initial.b.max];
  assert.deepEqual(initialLife, maximumLife);
  const events = [], seen = new WeakSet(), samples = [], phases = [], conclusions = [];
  let ticks = 0, commandFrames = 0, presentationTicks = 0, lastPhase = '', selected = false, windowSeen = false, prematureWindow = false;
  function observe() {
    const state = api.getState(), finish = api.getFinisherState(), phase = `${state.round}:${state.phase}`;
    if (phase !== lastPhase) {phases.push({frame: state.frame, round: state.round, phase: state.phase}); lastPhase = phase;}
    for (const event of state.events) if (!seen.has(event)) {
      seen.add(event);
      events.push({...clone(event), observedRound: state.round,
        ...(['roundEnd', 'matchEnd'].includes(event.type) ? {life: [state.a.life, state.b.life], timer: state.timer} : {})});
    }
    if (ticks % 10 === 0) samples.push({frame: state.frame, round: state.round, life: [state.a.life, state.b.life],
      timer: state.timer, distance: Math.abs(state.a.x - state.b.x), wins: [state.a.wins, state.b.wins]});
    if (finish.window) {
      windowSeen = true; prematureWindow ||= !state.finished;
      if (!conclusions.some(item => item.type === 'window')) conclusions.push({type: 'window', frame: state.frame,
        round: state.round, winner: finish.window.winner, limit: finish.window.max, wins: [state.a.wins, state.b.wins]});
    }
    if (finish.scene) {
      const scene = finish.scene, phase = scene.fin.phases[Math.min(scene.fin.phases.length - 1, Math.floor(scene.frame / scene.duration * scene.fin.phases.length))];
      if (conclusions.at(-1)?.phase !== phase) conclusions.push({type: 'scene', frame: state.frame, sceneFrame: scene.frame,
        phase, id: scene.fin.id, winner: scene.winner, duration: scene.duration});
    }
  }
  observe();
  try {
    while ((!api.getState().finished || !api.getLastReplay() || api.getFinisherState().window || api.getFinisherState().scene)
      && commandFrames < CONFIG.maximumCommandFrames && presentationTicks < CONFIG.maximumPresentationTicks) {
      const state = api.getState(), finish = api.getFinisherState();
      if (state.finished) {
        for (const key of KEYS) environment.key(key, false);
        if (finish.window && !selected && spec.conclusion === 'select') {
          const actor = finish.window.winner === 0 ? state.a : state.b, other = actor.slot === 0 ? state.b : state.a;
          const choices = clone(environment.window.RE_FINISHER_COMPATIBILITY.options(actor.f.uid, other.f.uid));
          const choice = choices[spec.finisherIndex];
          assert(choice?.allowed, 'The selected prototype conclusion must be allowed by the unchanged compatibility guard');
          const direction = spec.finisherIndex === 1 ? 'ArrowDown' : spec.finisherIndex === 2 ? actor.face > 0 ? 'ArrowRight' : 'ArrowLeft'
            : spec.finisherIndex === 3 ? actor.face > 0 ? 'ArrowLeft' : 'ArrowRight' : null;
          if (direction) environment.key(direction, true);
          environment.key('KeyO', true); environment.key('KeyO', false);
          if (direction) environment.key(direction, false);
          selected = true;
          conclusions.push({type: 'keyboard-choice', index: spec.finisherIndex, code: 'KeyO', direction, compatibility: choice});
          observe();
        } else if (finish.window && !selected && spec.conclusion === 'skip') {
          environment.key('Enter', true); environment.key('Enter', false); selected = true;
          conclusions.push({type: 'keyboard-skip', code: 'Enter'});
        }
        api.advance(CONFIG.commandTickMilliseconds); presentationTicks++; ticks++; observe();
        continue;
      }
      const idle = spec.strategy.startsWith('first-tie') && state.round === 1;
      const distance = Math.abs(state.a.x - state.b.x), approach = !idle && distance > 105;
      environment.key('ArrowRight', approach && state.a.x < state.b.x);
      environment.key('ArrowLeft', approach && state.a.x > state.b.x);
      environment.key('ShiftRight', approach && ticks % 12 === 0);
      const dual = spec.strategy.includes('dual');
      environment.key('KeyA', dual && approach && state.b.x > state.a.x);
      environment.key('KeyD', dual && approach && state.b.x < state.a.x);
      environment.key('KeyE', dual && approach && ticks % 12 === 0);
      for (const [offset, key] of [[0, 'KeyK'], [2, 'KeyJ'], [4, 'KeyU']]) {
        if (idle || distance > 155 || ticks % 6 === offset + 1) environment.key(key, false);
        else if (ticks % 6 === offset) environment.key(key, true);
      }
      const advanced = api.advance(CONFIG.commandTickMilliseconds); commandFrames += advanced; ticks++; observe();
      if (!advanced && !api.getState().finished) throw Error('The original engine stopped before a result; no state was overridden.');
    }
  } finally {for (const key of KEYS) environment.key(key, false);}
  const state = api.getState(), replay = api.getLastReplay(), compatibility = clone(environment.window.RE_FINISHER_COMPATIBILITY.options(state.a.f.uid, state.b.f.uid));
  const record = {scenario: spec, initialLife, maximumLife, commandFrames, finalFrame: state.frame, presentationTicks,
    finished: state.finished, finalRound: state.round, winner: state.winner, wins: [state.a.wins, state.b.wins], finalLife: [state.a.life, state.b.life],
    timer: state.timer, damageEvents: events.filter(e => e.type === 'damage').length,
    phaseTransitions: phases, samples, roundEndEvents: events.filter(e => e.type === 'roundEnd'), roundResetEvents: events.filter(e => e.type === 'roundReset'),
    matchEndEvents: events.filter(e => e.type === 'matchEnd'), conclusions, windowSeen, prematureWindow, selected, compatibility,
    noDirectStateMutation: true, normalLifeAtStart: true, officialResidentEvilRulesCertified: false, artisticFinisherCertified: false};
  if (!state.finished || !replay) {
    const excerpt = clone(api.captureReplay());
    return {...record, status: 'refused', reason: 'No complete capture under the unchanged command/presentation bound.', excerpt, excerptSha256: digest(excerpt)};
  }
  const captured = clone(replay), verification = await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(captured);
  assert.equal(verification.verified, true); assert.equal(verification.passes, 2); assert.equal(verification.exactFinalStatesEqual, true);
  assert.equal(verification.result.finisherVerified, false, 'Combat replay determinism does not certify or replay a finisher scene.');
  return {...record, status: 'verified', replay: captured, replaySha256: digest(captured), commandsSha256: digest(captured.frames), verification,
    observedEndCondition: state.a.life <= 0 || state.b.life <= 0 ? 'ko' : state.timer === 0 ? 'timer' : 'other'};
}

async function shard(specs) {
  const environment = await mainEnvironment(), records = [];
  try {
    for (const spec of specs) {
      try {records.push(await recordScenario(environment, spec));}
      catch (error) {records.push({scenario: spec, status: 'refused', reason: String(error.stack || error), noDirectStateMutation: true});}
      parentPort?.postMessage({type: 'progress', id: spec.id, status: records.at(-1).status, condition: records.at(-1).observedEndCondition});
    }
    return records;
  } finally {environment.dispose();}
}

export async function runAudit(options = {}) {
  const specs = options.scenarios || scenarios(), count = Math.min(Number(options.workers || 3), specs.length, 3), startedAt = new Date().toISOString(), started = performance.now();
  const records = (await Promise.all(Array.from({length: count}, (_, index) => new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(import.meta.url), {workerData: {specs: specs.filter((_, offset) => offset % count === index)}});
    worker.on('message', message => message.type === 'result' ? resolve(message.records) : message.type === 'error' ? reject(Error(message.error)) : options.onProgress?.(message));
    worker.on('error', reject); worker.on('exit', code => {if (code) reject(Error('Engine worker exit ' + code));});
  })))).flat().sort((a, b) => specs.findIndex(s => s.id === a.scenario.id) - specs.findIndex(s => s.id === b.scenario.id));
  const verified = records.filter(r => r.status === 'verified');
  return {schema: 're.bow.targeted-match-audit-r27/1', startedAt, completedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - started) / 1000,
    configuration: CONFIG, runtime: {node: process.version, controlledNodeDOM: true, browserOrHardware: false, workers: count},
    summary: {scenariosAttempted: records.length, completeMatches: verified.length, refusedCaptures: records.length - verified.length,
      exactReplayReconstructions: verified.length * 2, recoveredR26BoundedScenarios: verified.filter(r => r.scenario.previousScenario).length,
      koEndings: verified.filter(r => r.observedEndCondition === 'ko').length, timerEndings: verified.filter(r => r.observedEndCondition === 'timer').length,
      observedPrototypeFinisherScenes: verified.filter(r => r.replay.result.finisher).length,
      recordedCompatibilityRefusals: verified.filter(r => r.scenario.conclusion === 'expect-refusal' && !r.windowSeen && r.compatibility.every(c => !c.allowed)).length,
      keyboardWindowSkips: verified.filter(r => r.scenario.conclusion === 'skip' && r.selected && !r.replay.result.finisher).length,
      naturallyExpiredWindows: verified.filter(r => r.scenario.conclusion === 'expire' && r.windowSeen && !r.replay.result.finisher).length,
      certifiedArtisticFinishers: 0, replayedFinisherScenes: 0},
    sourceInputs: SOURCE_PATHS.map(p => ({path: p, sha256: digest(fs.readFileSync(path.join(ROOT, p)))})),
    limits: ['Two previously bounded five-second scenarios change only their input strategy: both actors approach and dash after the first real tie.',
      'Normal full life, native meter and resource values; no engine state, position, HP or outcome injection.',
      'Finisher choices, skips and expiry are exercised through the original live UI/input lifecycle. They are prototype compatibility, not canonically verified art or anatomy.',
      'Two exact replay reconstructions verify combat only. The original replay verifier explicitly leaves finisherVerified=false; scene animation/sound is not reconstructed.',
      'Controlled Node DOM with original scripts, not browser presentation or physical hardware. No exhaustive all-pair or official Capcom rules certification.'], records};
}

if (!isMainThread) {
  try {parentPort.postMessage({type: 'result', records: await shard(workerData.specs)});}
  catch (error) {parentPort.postMessage({type: 'error', error: error.stack});}
} else if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const report = await runAudit({onProgress: value => process.stderr.write(`${value.id} ${value.status} ${value.condition || ''}\n`)});
  fs.writeFileSync(path.join(ROOT, 'docs/R27_MATCHES.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary)); if (report.summary.refusedCaptures) process.exitCode = 1;
}
