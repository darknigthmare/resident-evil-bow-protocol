/** R33 selected-group recovery and bounded mixed-contract batches. Memory fixtures are explicit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto, createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRestorer} from '../modules/fidelity-r33/persistence/restore.js';
import {createRestorer as originalRestorer} from '../modules/fidelity-r31/persistence/restore.js';
import {createBatchReader, LIMITS} from '../modules/fidelity-r33/replay/batch.js';
import {EVOLUTION_CONTRACT} from '../modules/fidelity-r31/replay/verify.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const box = {}; vm.createContext(box); vm.runInContext(fs.readFileSync(path.join(root, 'src/save-center-r19.js'), 'utf8'), box); const S = box.RE_SAVE_CENTER;
const copy = value => JSON.parse(JSON.stringify(value));
const originalValues = {'re.bow.audio058': ' {"volume":0.2,"raw":"é 🧟"}\n', 're-bow-v048-bindings': '{"left":"KeyA"}', 're-bow-v046-dojo': '{"old":true}'};
const encode = values => S.encode(S.KEYS.map(key => ({key, value: values[key] ?? null})), 'R33 fixture é 🧟', '2026-11-01T10:00:00.000Z');
const incoming = encode({'re.bow.audio058': '\n{"volume":0.8} ', 're-bow-v048-bindings': '{"left":"KeyQ"}', 're-bow-v045-dojo': ' {"new":true}\n'});
function fixture(options = {}) {
  const values = new Map(Object.entries({...originalValues, foreign: 'KEEP'})), writes = [], reads = [];
  let saved = null, locked = false;
  const storage = {getItem(key) {assert(S.KEYS.includes(key), 'No foreign key may be read'); reads.push(key); return values.get(key) ?? null;}, setItem(key, value) {assert(S.KEYS.includes(key)); options.beforeWrite?.(key, value, saved); if (options.quota?.(key, value)) throw Error('QuotaExceededError'); writes.push([key, value]); values.set(key, value);}, removeItem(key) {assert(S.KEYS.includes(key)); options.beforeWrite?.(key, null, saved); writes.push([key, null]); values.delete(key);}};
  const journal = {async read() {return copy(saved);}, async begin(payload) {assert.equal(saved, null); if (options.journalFailure) throw Error('IndexedDB quota'); const meta = {id: payload.id, state: 'prepared', revision: 1, cursor: 0, sha256: payload.sha256}; saved = {meta, payload: copy(payload)}; return copy(meta);}, async update(expected, change) {assert.equal(saved.meta.id, expected.id); assert.equal(saved.meta.revision, expected.revision); saved.meta = {...saved.meta, ...change, revision: expected.revision + 1}; return copy(saved.meta);}, async clear(expected) {assert.equal(expected.revision, saved.meta.revision); assert(['committed', 'rolled-back'].includes(saved.meta.state)); saved = null; return {cleared: true};}};
  const locks = {async request(name, settings, action) {if (locked) return action(null); locked = true; try {return await action({name});} finally {locked = false;}}};
  const create = (overrides = {}, original = false) => (original ? originalRestorer : createRestorer)({saveCenter: S, storage, journal, crypto: webcrypto, locks, now: () => '2026-11-01T10:00:00.000Z', ...overrides});
  return {values, writes, reads, storage, journal, locks, create, saved: () => saved};
}
async function prepared(engine, groups = ['audio', 'dojo']) {const plan = await engine.prepare(incoming, groups); engine.acknowledge(plan, engine.backup(plan)); return plan;}
const checks = [];
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
await test('Published R31 reproduces the unrelated-group recovery block; R33 preserves that progress and undoes selected groups', async () => {
  const old = fixture(), oldEngine = old.create({}, true); await oldEngine.apply(await prepared(oldEngine), {confirmed: true}); old.values.set('re-bow-v048-bindings', '{"newProgress":33}');
  const original = await oldEngine.recover({direction: 'rollback', confirmed: true}); assert.equal(original.ok, false); assert.match(original.message, /hors de cette restauration/);
  const e = fixture(), engine = e.create(); await engine.apply(await prepared(engine), {confirmed: true}); e.values.set('re-bow-v048-bindings', '{"newProgress":33}');
  const start = e.writes.length, result = await e.create().recover({direction: 'rollback', confirmed: true}); assert.equal(result.ok, true);
  assert.equal(e.values.get('re-bow-v048-bindings'), '{"newProgress":33}'); assert.equal(e.values.get('re.bow.audio058'), originalValues['re.bow.audio058']); assert.equal(e.values.get('re-bow-v046-dojo'), originalValues['re-bow-v046-dojo']); assert.equal(e.values.has('re-bow-v045-dojo'), false);
  assert(e.writes.slice(start).every(([key]) => key !== 're-bow-v048-bindings')); assert.equal(e.values.get('foreign'), 'KEEP');
  return {baselineKnownLimitReproduced: true, baselineGameWritesAfterConflict: 0, currentUndoSucceeded: true, unrelatedProgressPreserved: true};
});
await test('Interrupted R31 journals resume in R33 after unrelated progress with no repeated game write', async () => {
  const e = fixture(); let stopped = false;
  const old = e.create({afterWrite() {if (!stopped) {stopped = true; throw Error('termination before cursor confirmation');}}}, true);
  assert.equal((await old.apply(await prepared(old, ['audio', 'dojo']), {confirmed: true})).state, 'interrupted');
  const first = e.writes[0][0]; e.values.set('re-bow-v048-bindings', ' {"newProgress":33}\n'); const current = e.create(); assert.equal((await current.snapshot()).journal.unselectedChanges, 1);
  const result = await current.recover({direction: 'apply', confirmed: true}); assert.equal(result.ok, true); assert.equal(e.writes.filter(([key]) => key === first).length, 1); assert.equal(e.values.get('re-bow-v048-bindings'), ' {"newProgress":33}\n');
  assert.equal(e.values.get('re.bow.audio058'), '\n{"volume":0.8} '); assert.equal(e.values.get('re-bow-v045-dojo'), ' {"new":true}\n');
  return {publishedJournalSchemaRetained: true, selectedRawBytesRecovered: true, alreadyAppliedWritesRepeated: 0};
});
await test('A selected-key outside writer still blocks resume and undo before another game write', async () => {
  for (const direction of ['apply', 'rollback']) {
    const e = fixture(), engine = e.create({afterWrite() {throw Error('stop');}}); await engine.apply(await prepared(engine), {confirmed: true});
    e.values.set('re.bow.audio058', '{"outside":true}'); e.values.set('re-bow-v048-bindings', '{"unrelated":true}'); const writes = e.writes.length;
    const result = await e.create().recover({direction, confirmed: true}); assert.equal(result.ok, false); assert.equal(e.writes.length, writes); assert.match(result.message, /groupe choisi/); assert.equal(e.values.get('re.bow.audio058'), '{"outside":true}'); assert.equal(e.values.get('re-bow-v048-bindings'), '{"unrelated":true}');
  }
  return {directionsRefused: 2, conflictingAndUnrelatedValuesPreserved: true};
});
await test('Closing a finished journal allows unrelated later progress but refuses altered selected values', async () => {
  const e = fixture(), engine = e.create(); await engine.apply(await prepared(engine), {confirmed: true}); e.values.set('re-bow-v048-bindings', '{"later":true}'); await engine.forget({confirmed: true}); assert.equal(e.saved(), null); assert.equal(e.values.get('re-bow-v048-bindings'), '{"later":true}');
  await engine.apply(await prepared(engine, ['audio']), {confirmed: true}); e.values.set('re.bow.audio058', '{"later":true}'); await assert.rejects(() => engine.forget({confirmed: true}), /groupe choisi/); assert(e.saved());
  return {terminalCloseSelectedScope: true, alteredSelectedValueBlocksClose: true};
});
await test('The first application retains the full-preview staleness check and exact downloaded backup', async () => {
  for (const key of ['re.bow.audio058', 're-bow-v048-bindings']) {
    const e = fixture(), engine = e.create(), plan = await prepared(engine); assert.deepEqual(S.decode(engine.backup(plan)).entries, S.decode(encode(originalValues)).entries);
    e.values.set(key, '{"later":true}'); await assert.rejects(() => engine.apply(plan, {confirmed: true}), /changé depuis/); assert.equal(e.writes.length, 0); assert.equal(e.saved(), null);
  }
  return {staleFullBackupRefusedBeforeJournal: true, initialApplyStillRequiresNewPreview: true};
});
await test('Quotas, missing lock and abort keep the journal/write boundary safe', async () => {
  const fail = fixture({journalFailure: true}), engine = fail.create(), failPlan = await prepared(engine); await assert.rejects(() => engine.apply(failPlan, {confirmed: true}), /IndexedDB quota/); assert.equal(fail.writes.length, 0);
  let full = true; const e = fixture({quota: key => full && key === 're.bow.audio058'}), other = e.create(); const failed = await other.apply(await prepared(other), {confirmed: true}); assert.equal(failed.ok, false); assert(e.saved()); e.values.set('re-bow-v048-bindings', '{"later":true}'); full = false; assert.equal((await e.create().recover({direction: 'rollback', confirmed: true})).ok, true);
  const denied = fixture(), d = denied.create({locks: {request: (name, options, action) => action(null)}}), deniedPlan = await prepared(d); await assert.rejects(() => d.apply(deniedPlan, {confirmed: true}), /autre page/); assert.equal(denied.writes.length, 0);
  const aborted = fixture(), a = aborted.create(), controller = new AbortController(); controller.abort(); assert.equal((await a.apply(await prepared(a), {confirmed: true, signal: controller.signal})).ok, false); assert.equal(aborted.writes.length, 0); assert(aborted.saved());
  return {journalQuotaGameWrites: 0, gameQuotaUndoSucceeded: true, deniedLockGameWrites: 0, abortGameWrites: 0};
});
await test('Tampered journal payload, duplicate JSON and foreign storage keys are refused', async () => {
  const e = fixture(), engine = e.create(); await engine.apply(await prepared(engine), {confirmed: true}); e.saved().payload.beforeText += ' '; await assert.rejects(() => e.create().snapshot(), /Empreinte/);
  const invalid = fixture(), target = invalid.create(), value = JSON.parse(incoming); value.entries[0].key = 'foreign';
  for (const text of [JSON.stringify(value), incoming.replace('"version": 1', '"version":1,"version":1')]) await assert.rejects(() => target.prepare(text, ['audio']));
  assert.equal(invalid.writes.length, 0); assert.equal(invalid.values.get('foreign'), 'KEEP');
  return {damagedJournalRefused: true, invalidImportsRefused: 2, foreignKeysReadOrWritten: 0};
});
const evolution = JSON.stringify({schema: 're.bow.evolution-duel-replay/1', contract: EVOLUTION_CONTRACT, setup: {}, frames: 0, runs: [], stateDigest: '00000000'});
const catalog = JSON.stringify({schema: 're.bow.catalog-duel-replay/1', contract: 'fixture-r7', frames: 0});
const main = JSON.stringify({meta: {runtimeContract: 'fixture-r13'}, frames: []});
const verified = {verified: true, passes: 2, exactFinalStatesEqual: true, readOnly: true};
await test('The mixed-file intake binds raw UTF-8 SHA, detects duplicates and rejects malformed individual files before simulation', async () => {
  let calls = 0; const reader = createBatchReader({crypto: webcrypto, verify: async () => {calls++; return {promise: Promise.resolve(verified), cancel() {}};}});
  const plan = await reader.prepare([{name: 'évolution 🧟.json', text: evolution}, {name: 'classic.json', text: catalog}, {name: 'versus.json', text: main}, {name: 'duplicate.json', text: evolution}, {name: 'archive.json', text: '[]'}, {name: 'double.json', text: evolution.replace('"frames":0', '"frames":0,"frames":1')}]);
  assert.deepEqual(plan.rows.map(row => row.status), ['ready', 'ready', 'ready', 'duplicate', 'rejected', 'rejected']); assert.equal(plan.rows[0].sha256, createHash('sha256').update(evolution).digest('hex')); assert.equal(calls, 0);
  const report = await reader.start(plan).promise; assert.equal(calls, 3); assert.equal(report.verified, 3); assert.equal(report.allSupportedVerified, true); assert.equal(report.allFilesVerified, false); assert.equal(report.entries[3].duplicateOf, 0);
  return {individualContractsRecognized: 3, strictDuplicateSkipped: 1, malformedInputsRetainedAsRefused: 2, preparationEngineStarts: 0};
});
await test('Intake bounds and private plans cannot launch excessive or foreign verification work', async () => {
  const reader = createBatchReader({crypto: webcrypto});
  await assert.rejects(() => reader.prepare([])); await assert.rejects(() => reader.prepare(Array.from({length: 17}, () => ({name: 'x', text: main}))));
  await assert.rejects(() => reader.prepare([{name: 'x', text: ' '.repeat(LIMITS.totalBytes + 1)}]), /32 Mio/);
  assert.throws(() => reader.start({rows: [{status: 'ready'}]}), /extérieur/);
  const inputs = [{name: 'original.json', text: main}], prepared = reader.prepare(inputs); inputs[0] = {name: 'changed.json', text: evolution}; const plan = await prepared;
  assert.equal(plan.rows[0].name, 'original.json'); assert.equal(plan.rows[0].kind, 'main-r13'); assert.equal(plan.rows[0].sha256, createHash('sha256').update(main).digest('hex'));
  const malformed = await reader.prepare([{name: 'object-contract.json', text: JSON.stringify({meta: {runtimeContract: {unexpected: 'object'}}, frames: []})}]); assert.equal(malformed.rows[0].contract, null);
  return {refusedBounds: 3, foreignPlanRefused: true, asynchronousInputMutationCannotChangeHashBinding: true};
});
await test('Batches run sequentially, retain individual engine refusals and require two equal reconstructions', async () => {
  let active = 0, peak = 0, calls = 0;
  const reader = createBatchReader({crypto: webcrypto, verify: async value => {
    calls++; active++; peak = Math.max(peak, active);
    return {promise: new Promise((resolve, reject) => setTimeout(() => {active--; value.schema?.includes('catalog') ? reject(Error('unknown recorded contract')) : resolve(verified);}, 2)), cancel() {}};
  }});
  const report = await reader.start(await reader.prepare([{name: 'main.json', text: main}, {name: 'unknown.json', text: catalog}, {name: 'evolution.json', text: evolution}])).promise;
  assert.equal(calls, 3); assert.equal(peak, 1); assert.equal(report.verified, 2); assert.deepEqual(report.entries.map(row => row.status), ['verified', 'refused', 'verified']); assert.equal(report.allSupportedVerified, false);
  const single = createBatchReader({crypto: webcrypto, verify: async () => ({promise: Promise.resolve({...verified, passes: 1}), cancel() {}})});
  assert.equal((await single.start(await single.prepare([{name: 'one.json', text: main}])).promise).verified, 0);
  return {peakActiveVerifiers: 1, unknownContractDoesNotHideOtherResults: true, onePassCannotBeCertified: true};
});
await test('Cancellation during preparation settles immediately and cancels a late iframe task without mutating the exported result', async () => {
  let resolveSource, lateCancels = 0, calls = 0;
  const reader = createBatchReader({crypto: webcrypto, verify: () => {calls++; return new Promise(resolve => {resolveSource = resolve;});}});
  const task = reader.start(await reader.prepare([{name: 'first.json', text: main}, {name: 'second.json', text: evolution}])); task.cancel(); const report = await task.promise; const before = JSON.stringify(report); assert.equal(report.cancelled, true); assert.equal(report.completed, 0); assert.equal(reader.busy(), false);
  resolveSource({promise: Promise.resolve(verified), cancel() {lateCancels++;}}); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(lateCancels, 1); assert.equal(calls, 1); assert.equal(JSON.stringify(report), before); assert.deepEqual(report.entries.map(row => row.status), ['cancelled', 'not-started']);
  return {cancelSettledBeforeLatePreparation: true, lateTaskCancelled: true, secondReplayNeverStarted: true, resultImmutableAfterCompletion: true};
});
await test('View callback errors cannot corrupt a batch, and simultaneous starts are refused', async () => {
  let release;
  const reader = createBatchReader({crypto: webcrypto, verify: async (value, options) => {
    options.onProgress({pass: 1, frames: 1, total: 1}); return {promise: new Promise(resolve => {release = () => resolve(verified);}), cancel() {}};
  }});
  const plan = await reader.prepare([{name: 'main.json', text: main}]), task = reader.start(plan, {onRecord() {throw Error('view');}, onProgress() {throw Error('view');}, onResult() {throw Error('view');}});
  assert.throws(() => reader.start(plan), /déjà/); await new Promise(resolve => setTimeout(resolve, 0)); release(); const report = await task.promise; assert.equal(report.verified, 1); assert.equal(reader.busy(), false);
  return {callbackFailuresCannotAlterReconstruction: true, parallelStartRefused: true};
});
const inputs = ['src/save-center-r19.js', 'modules/fidelity-r31/persistence/restore.js', 'modules/fidelity-r31/persistence/journal.js', 'modules/fidelity-r31/replay/verify.js', 'modules/fidelity-r33/persistence/restore.js', 'modules/fidelity-r33/replay/batch.js', 'tests/verify-persistence-r33.mjs'];
const report = {schema: 're.bow.persistence-tests-r33/1', passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length, checks,
  sourceFiles: inputs.map(name => ({path: name, bytes: fs.statSync(path.join(root, name)).size, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')})),
  scope: 'R31 before/current selective recovery in explicit memory fixtures; mixed-contract batching uses controlled verification tasks. Actual browser storage, reload, engine reconstruction and page lifecycle are separate.'};
fs.writeFileSync(path.join(root, 'docs/R33_PERSISTENCE_TESTS.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
