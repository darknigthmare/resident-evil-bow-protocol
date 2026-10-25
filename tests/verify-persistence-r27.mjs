import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRestoredReplayBridge} from '../modules/fidelity-r27/persistence/bridge.js';
import {SCHEMA as SOURCE_SCHEMA} from '../modules/fidelity-r26/persistence/restore.js';
import {mainFixture} from './persistence-fixtures-r24.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), context = {TextEncoder};
context.globalThis = context; context.window = context;
Object.defineProperty(context, 'localStorage', {get() { throw Error('Game storage access is forbidden'); }});
vm.createContext(context);
for (const name of ['save-center-r19', 'replay-vault-r13', 'catalog-replay-contract']) vm.runInContext(fs.readFileSync(path.join(root, 'src/' + name + '.js'), 'utf8'), context);
const S = context.RE_SAVE_CENTER, V = context.RE_REPLAY_VAULT;
const index = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r24/persistence/engines.json')));
const clone = value => JSON.parse(JSON.stringify(value));
const main = await mainFixture(), old = await mainFixture({historical: true}); old.id += '-historical';
const rawMain = '\n  ' + JSON.stringify({...main, note: 'é 🧟, [ ] <img>'}, null, 2) + '  ';
const rawOld = '\t' + JSON.stringify(old) + '\n';
const archive = '[' + rawMain + ',' + rawOld + ']';
const checks = [];
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
function fixture(options = {}) {
  let snapshot = {schema: SOURCE_SCHEMA, revision: 2, initialized: true, updatedAt: '2026-10-25T00:00:00.000Z', journal: {state: 'committed'},
    entries: S.KEYS.map(key => ({key, value: key === V.KEY ? archive : key === 're.bow.audio058' ? ' {"note":"keep é 🧟"}\n' : null}))};
  let calls = 0, closed = false;
  const bridge = createRestoredReplayBridge({rehearsal: {snapshot: async () => { calls++; return clone(snapshot); }, close: async () => { closed = true; }},
    saveCenter: S, replayVault: V, catalogContract: context.RE_CATALOG_REPLAY_CONTRACT.digest, engineIndex: index,
    createVerification: options.createVerification || (async () => ({promise: Promise.resolve({verified: true, passes: 2, exactFinalStatesEqual: true}), cancel() {}})),
    digest: async text => createHash('sha256').update(text).digest('hex')});
  return {bridge, get snapshot() { return snapshot; }, set snapshot(value) { snapshot = value; }, get calls() { return calls; }, get closed() { return closed; }};
}

await test('A captured R26 revision preserves exact archive and record UTF-8 bytes without inventing original transport', async () => {
  const f = fixture(); await f.bridge.open(); const state = f.bridge.state();
  assert.equal(state.source.revision, 2); assert.equal(state.records.length, 2); assert.deepEqual(state.records.map(r => r.engine.id), ['main-current', 'main-pre-r13']);
  assert.equal(await f.bridge.archive(), archive); assert.equal(await f.bridge.record('0'), rawMain); assert.equal(await f.bridge.record('1'), rawOld);
  assert.equal(state.source.archiveSha256, createHash('sha256').update(archive).digest('hex')); assert.equal(state.source.originalR19TransportPreserved, false); assert.equal(state.source.nestedArchiveRewritten, false); assert.equal(state.source.gameStorageWritten, false);
  state.records[0].engine.id = 'changed'; assert.equal(f.bridge.state().records[0].engine.id, 'main-current');
  await f.bridge.close(); assert.equal(f.closed, true);
  return {archiveBytes: Buffer.byteLength(archive), records: 2, sourceRevision: 2, originalTransportClaimed: false};
});
await test('Source revision changes and raw-value changes without a revision invalidate both extraction and verification', async () => {
  let executions = 0;
  const f = fixture({createVerification: async () => { executions++; throw Error('must not run'); }}); await f.bridge.open();
  f.snapshot.revision++;
  await assert.rejects(f.bridge.verify(['0']), /changé/); assert.equal(executions, 0); assert.equal(f.bridge.state().stale, true);
  await assert.rejects(f.bridge.archive(), /Rechargez/); await f.bridge.open();
  f.snapshot.entries.find(r => r.key === 're.bow.audio058').value = '{"different":true}';
  await assert.rejects(f.bridge.record('0'), /changé/); assert.equal(f.bridge.state().stale, true);
  return {revisionChangeRefused: true, unversionedRawChangeRefused: true, enginesStarted: executions};
});
await test('A concurrent restore during verification keeps captured results but refuses a verdict for current storage', async () => {
  let f;
  f = fixture({createVerification: async () => ({promise: Promise.resolve().then(() => { f.snapshot.revision++; return {verified: true, passes: 2, exactFinalStatesEqual: true}; }), cancel() {}})});
  await f.bridge.open(); const report = await f.bridge.verify(['0']);
  assert.equal(report.records[0].status, 'verified'); assert.equal(report.verified, false); assert.equal(report.sourceStale, true); assert.equal(report.sourceValidatedAfter, false); assert.equal(report.source.revision, 2); assert.equal(f.bridge.state().stale, true);
  return {capturedRecordStillDetailed: true, currentSourceVerdictRefused: true};
});
await test('Selection is bounded and resolved against private records rather than caller-created values', async () => {
  const f = fixture(); await f.bridge.open();
  for (const keys of [[], ['0', '0'], ['missing'], [0], Array.from({length: 31}, (_, n) => String(n))]) await assert.rejects(f.bridge.verify(keys));
  await assert.rejects(f.bridge.record('missing'), /absent/);
  const state = f.bridge.state(); state.records[0].status = 'refused';
  const report = await f.bridge.verify(['0', '1']); assert.equal(report.verified, true); assert.equal(report.completed, 2); assert.equal(report.sourceValidatedAfter, true);
  return {badSelectionsRefused: 5, privateRowsPreserved: true, batchMaximum: 30};
});
await test('Unknown contracts and repeated IDs remain visible but never become executable', async () => {
  const f = fixture(); const wrong = clone(main); wrong.meta.runtimeContract = 'unknown-original-engine';
  f.snapshot.entries.find(r => r.key === V.KEY).value = JSON.stringify([wrong, main, main]); await f.bridge.open();
  assert(f.bridge.state().records.every(row => row.status === 'refused'));
  for (const key of ['0', '1', '2']) await assert.rejects(f.bridge.verify([key]), /refusé/);
  assert.equal(await f.bridge.record('0'), JSON.stringify(wrong));
  return {visibleRefusedRecords: 3, sourceBytesExtractableWithoutExecution: true};
});
await test('Missing source, malformed nested archive and an empty archive do not invent replays', async () => {
  const f = fixture(); f.snapshot.initialized = false; await assert.rejects(f.bridge.open(), /vide/); assert.equal(f.bridge.state().ready, false);
  f.snapshot.initialized = true; f.snapshot.entries.find(r => r.key === V.KEY).value = '[{"id":"a","id":"b"}]'; await assert.rejects(f.bridge.open());
  f.snapshot.entries.find(r => r.key === V.KEY).value = null; await f.bridge.open(); assert.equal(f.bridge.state().records.length, 0); assert.equal(f.bridge.state().source.archiveSha256, null); await assert.rejects(f.bridge.archive(), /contient pas/);
  f.snapshot.entries.find(r => r.key === V.KEY).value = '[]'; await f.bridge.open(); assert.equal(await f.bridge.archive(), '[]');
  return {uninitializedRefused: true, duplicateFieldsRefused: true, emptyArchivesRemainEmpty: true};
});
await test('Cancellation during an asynchronous factory settles without a stale publication and tears down the eventual engine', async () => {
  let release, ready, cancelCalls = 0; const gate = new Promise(resolve => { release = resolve; }); const started = new Promise(resolve => { ready = resolve; });
  const f = fixture({createVerification: async () => { ready(); await gate; return {promise: Promise.resolve({verified: true, passes: 2, exactFinalStatesEqual: true}), cancel() { cancelCalls++; }}; }});
  await f.bridge.open(); const pending = f.bridge.verify(['0']); await started;
  await assert.rejects(f.bridge.verify(['1']), /Rechargez/); f.bridge.cancel(); const report = await pending;
  assert.equal(report.cancelled, true); assert.equal(report.verified, false); assert.equal(report.completed, 0); release(); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(cancelCalls, 1); assert.equal(f.bridge.state().busy, false);
  return {cancelledBeforeFactoryResolved: true, eventualEngineCancelled: true};
});
await test('Closing the bridge refuses later reads and never falls back to game storage', async () => {
  const f = fixture(); await f.bridge.open(); await f.bridge.close();
  await assert.rejects(f.bridge.open()); await assert.rejects(f.bridge.record('0')); await assert.rejects(f.bridge.verify(['0']));
  assert.equal(f.closed, true); return {closedReadsRefused: 3, gameStorageTouched: false};
});

const report = {schema: 're.bow.persistence-r27-tests/1', passed: checks.filter(x => x.pass).length, failed: checks.filter(x => !x.pass).length, checks,
  scope: 'Restored-revision bridge boundaries with original R19/R13 parsers and actual current/historical replay fixtures. Controlled engine tasks test invalidation and cancellation; real browser engine execution is recorded separately.'};
fs.writeFileSync(path.join(root, 'docs/R27_PERSISTENCE_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
