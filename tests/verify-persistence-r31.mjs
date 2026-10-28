/** Actual allowlisted storage restoration, durable interruptions and explicit recovery. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto, createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRestorer} from '../modules/fidelity-r31/persistence/restore.js';
import {createIndexedJournal} from '../modules/fidelity-r31/persistence/journal.js';
import {inspectReplay, EVOLUTION_CONTRACT} from '../modules/fidelity-r31/replay/verify.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const box = {}; vm.createContext(box); vm.runInContext(fs.readFileSync(path.join(root, 'src/save-center-r19.js'), 'utf8'), box); const S = box.RE_SAVE_CENTER;
const clone = value => JSON.parse(JSON.stringify(value));
const encode = values => S.encode(S.KEYS.map(key => ({key, value: values[key] ?? null})), 'R31 test é 🧟', '2026-10-28T10:00:00.000Z');
const oldValues = {'re.bow.audio058': ' {"volume":0.2,"raw":"é 🧟"}\n', 're-bow-v048-bindings': '{"left":"KeyA"}', 're-bow-v046-dojo': '{"old":true}'};
const incoming = encode({'re.bow.audio058': '\n{"volume":0.8} ', 're-bow-v048-bindings': '{"left":"KeyQ"}', 're-bow-v045-dojo': ' {"new":true}\n'});
function environment(options = {}) {
  const values = new Map(Object.entries({...oldValues, other: 'KEEP'})), writes = [];
  let saved = null, locked = false;
  const storage = {getItem: key => values.get(key) ?? null, setItem(key, value) {options.beforeWrite?.(key, value, saved); writes.push([key, value]); if (options.quota?.(key, value)) throw Error('QuotaExceededError'); values.set(key, value);}, removeItem(key) {options.beforeWrite?.(key, null, saved); writes.push([key, null]); values.delete(key);}};
  const journal = {async read() {return clone(saved);}, async begin(payload) {assert.equal(saved, null); if (options.journalFailure) throw Error('IndexedDB quota'); const meta = {id: payload.id, state: 'prepared', revision: 1, cursor: 0, sha256: payload.sha256}; saved = {meta, payload: clone(payload)}; return clone(meta);}, async update(expected, change) {assert.equal(saved.meta.id, expected.id); assert.equal(saved.meta.revision, expected.revision); saved.meta = {...saved.meta, ...change, revision: expected.revision + 1}; return clone(saved.meta);}, async clear(expected) {assert.equal(expected.revision, saved.meta.revision); assert(['committed', 'rolled-back'].includes(saved.meta.state)); saved = null; return {cleared: true};}};
  const locks = {async request(name, settings, action) {if (locked) return action(null); locked = true; try {return await action({name});} finally {locked = false;}}};
  const create = overrides => createRestorer({saveCenter: S, storage, journal, crypto: webcrypto, locks, now: () => '2026-10-28T10:00:00.000Z', ...overrides});
  return {values, writes, storage, journal, locks, create, getSaved: () => saved};
}
const checks = [];
async function test(name, run) {try {const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
async function prepared(engine, groups = ['audio', 'dojo']) {const plan = await engine.prepare(incoming, groups); engine.acknowledge(plan, engine.backup(plan)); return plan;}
await test('Inspection, preview and raw export never write game values or durable journals', async () => {
  const e = environment(), engine = e.create(), before = engine.exportText(), plan = await engine.prepare(incoming, ['audio']);
  assert.equal(e.writes.length, 0); assert.equal(e.getSaved(), null); assert.deepEqual(S.decode(engine.backup(plan)).entries, S.decode(before).entries);
  assert.equal((await engine.snapshot()).journal, null); assert.equal(e.values.get('other'), 'KEEP');
  return {gameWrites: 0, journalWrites: 0, exactRawBackup: true};
});
await test('Foreign, cancelled and unacknowledged plans cannot replace real game values', async () => {
  const e = environment(), engine = e.create(), plan = await engine.prepare(incoming, ['audio']);
  await assert.rejects(() => engine.apply({...plan}, {confirmed: true})); await assert.rejects(() => engine.apply(plan, {confirmed: true}));
  engine.acknowledge(plan, engine.backup(plan)); await assert.rejects(() => engine.apply(plan)); engine.cancel(plan); await assert.rejects(() => engine.apply(plan, {confirmed: true}));
  assert.equal(e.writes.length, 0); assert.equal(e.getSaved(), null); return {refusedPlans: 4, gameWrites: 0};
});
await test('Selected game groups restore exact raw bytes only after a durable before/after journal exists', async () => {
  let observed = 0;
  const e = environment({beforeWrite(key, value, saved) {assert(saved?.payload.beforeText && saved?.payload.afterText); assert.equal(saved.meta.state, 'applying'); observed++;}}), engine = e.create();
  const plan = await prepared(engine); const result = await engine.apply(plan, {confirmed: true}); assert.equal(result.ok, true); assert.equal(result.changed, 3);
  assert.equal(e.values.get('re.bow.audio058'), '\n{"volume":0.8} '); assert.equal(e.values.get('re-bow-v046-dojo'), undefined); assert.equal(e.values.get('re-bow-v045-dojo'), ' {"new":true}\n');
  assert.equal(e.values.get('re-bow-v048-bindings'), oldValues['re-bow-v048-bindings']); assert.equal(e.values.get('other'), 'KEEP'); assert.equal((await engine.snapshot()).journal.state, 'committed'); assert.equal(observed, 3);
  return {actualAllowlistedChanges: 3, journalBeforeFirstGameWrite: true, nonselectedAndForeignValuesPreserved: true};
});
await test('An interrupted write before cursor confirmation is resumed idempotently by a new restorer', async () => {
  const e = environment(); let stopped = false;
  const engine = e.create({afterWrite() {if (!stopped) {stopped = true; throw Error('simulated tab termination after localStorage write');}}});
  const plan = await prepared(engine, ['controls', 'dojo', 'audio']); const result = await engine.apply(plan, {confirmed: true}); assert.equal(result.state, 'interrupted'); assert.equal(result.changed, 1);
  assert.equal(e.values.get('re-bow-v048-bindings'), '{"left":"KeyQ"}');
  const resumed = e.create(); assert.equal((await resumed.snapshot()).journal.state, 'interrupted'); const recovered = await resumed.recover({direction: 'apply', confirmed: true}); assert.equal(recovered.ok, true);
  assert.equal(e.writes.filter(([key]) => key === 're-bow-v048-bindings').length, 1); assert.equal(e.values.get('re.bow.audio058'), '\n{"volume":0.8} ');
  return {newRestorerRecoveredDurableJournal: true, alreadyWrittenValueNotWrittenTwice: true};
});
await test('Explicit undo after a completed restore survives a new page instance and preserves raw whitespace', async () => {
  const e = environment(), engine = e.create(), before = S.decode(engine.exportText()).entries;
  await engine.apply(await prepared(engine), {confirmed: true}); const restarted = e.create(); const result = await restarted.recover({direction: 'rollback', confirmed: true});
  assert.equal(result.state, 'rolled-back'); assert.deepEqual(S.decode(restarted.exportText()).entries, before); assert.equal(e.values.get('other'), 'KEEP');
  await restarted.forget({confirmed: true}); assert.equal((await restarted.snapshot()).journal, null);
  return {exactPreRestoreValuesRecovered: true, terminalJournalExplicitlyRemoved: true};
});
await test('Outside changes block both resume and undo without overwriting another writer', async () => {
  const e = environment(), engine = e.create(); await engine.apply(await prepared(engine), {confirmed: true}); e.values.set('re-bow-v048-bindings', '{"outside":true}');
  const count = e.writes.length, result = await e.create().recover({direction: 'rollback', confirmed: true}); assert.equal(result.ok, false); assert.equal(e.writes.length, count); assert.equal(e.values.get('re-bow-v048-bindings'), '{"outside":true}');
  assert.match(result.message, /hors de cette restauration/); return {conflictingValuePreserved: true, recoveryGameWrites: 0};
});
await test('Journal quota failure prevents the first game write; storage quota retains a recoverable journal', async () => {
  const failJournal = environment({journalFailure: true}), engine = failJournal.create(); const plan = await prepared(engine);
  await assert.rejects(() => engine.apply(plan, {confirmed: true}), /IndexedDB quota/); assert.equal(failJournal.writes.length, 0);
  let reject = true; const e = environment({quota: key => reject && key === 're.bow.audio058'}), other = e.create(); const result = await other.apply(await prepared(other, ['audio']), {confirmed: true}); assert.equal(result.ok, false); assert.equal((await other.snapshot()).journal.state, 'interrupted');
  reject = false; const recovered = await e.create().recover({direction: 'rollback', confirmed: true}); assert.equal(recovered.ok, true); assert.equal(e.values.get('re.bow.audio058'), oldValues['re.bow.audio058']);
  return {journalFailureGameWrites: 0, quotaRefusalPreservedRecovery: true};
});
await test('Damaged journal SHA, unsupported storage keys and duplicate JSON keys are rejected before writes', async () => {
  const e = environment(), engine = e.create(); await engine.apply(await prepared(engine), {confirmed: true}); e.getSaved().payload.beforeText += ' ';
  await assert.rejects(() => e.create().snapshot(), /Empreinte/); const baseline = environment(), clean = baseline.create();
  const unknown = JSON.parse(incoming); unknown.entries[0].key = 'other';
  for (const text of ['{"format":"bad"}', incoming.replace('R31 test', 'tampered'), JSON.stringify(unknown), incoming.replace('"version": 1', '"version":1,"version":1')]) await assert.rejects(() => clean.prepare(text, ['audio']));
  assert.equal(baseline.writes.length, 0); return {damagedJournalRejected: true, invalidImportsRejected: 4};
});
await test('Web Locks denial, stale previews and aborts cannot silently commit another restore', async () => {
  const e = environment(), denied = e.create({locks: {request: async (name, options, action) => action(null)}}), plan = await prepared(denied);
  await assert.rejects(() => denied.apply(plan, {confirmed: true}), /autre page/); assert.equal(e.writes.length, 0);
  const engine = e.create(), stale = await prepared(engine); e.values.set('re.bow.audio058', '{"changed":true}'); await assert.rejects(() => engine.apply(stale, {confirmed: true}), /changé depuis/); assert.equal(e.getSaved(), null);
  const fresh = await prepared(engine), controller = new AbortController(); controller.abort(); const result = await engine.apply(fresh, {confirmed: true, signal: controller.signal}); assert.equal(result.ok, false); assert.equal(e.writes.length, 0);
  return {lockDeniedWithoutWrites: true, stalePreviewRefusedBeforeJournal: true, abortExplicitlyRecoverable: true};
});
await test('Delayed IndexedDB opening, page close/resume and version changes never reuse a closed connection', async () => {
  const requests = [], databases = [];
  const indexedDB = {open() {const request = {}; requests.push(request); return request;}};
  function finish(index) {
    const db = {closed: false, close() {this.closed = true;}, transaction() {
      if (this.closed) throw Object.assign(Error('Transaction on closed database'), {name: 'InvalidStateError'});
      const tx = {objectStore() {return {get() {const request = {result: undefined}; queueMicrotask(() => request.onsuccess?.()); return request;}};}};
      setTimeout(() => tx.oncomplete?.(), 0); return tx;
    }};
    databases[index] = db; requests[index].result = db; requests[index].onsuccess();
  }
  const journal = createIndexedJournal({indexedDB, name: 're.bow.real-restore.r31.delayed'});
  const initial = journal.read(), closed = journal.close(), resumed = journal.read();
  assert.equal(requests.length, 2, 'Resume must get its own new opening while the previous close is pending');
  finish(0); finish(1); assert.deepEqual(await Promise.all([initial, resumed]), [null, null]); await closed;
  assert.equal(databases[0].closed, true); assert.equal(databases[1].closed, false);
  databases[1].onversionchange(); assert.equal(databases[1].closed, true);
  const versionResumed = journal.read(); assert.equal(requests.length, 3); finish(2); assert.equal(await versionResumed, null); await journal.close();
  return {delayedOpenings: 3, restartedReadsSucceeded: 2, staleClosedConnectionsReused: 0};
});
await test('The replay gateway separates R28 from R7/R13 and refuses unknown evolution contracts or duplicate JSON', async () => {
  const value = {schema: 're.bow.evolution-duel-replay/1', contract: EVOLUTION_CONTRACT, setup: {}, frames: 0, runs: [], stateDigest: '00000000'};
  assert.equal(inspectReplay(JSON.stringify(value)).kind, 'evolution-r28'); assert.throws(() => inspectReplay(JSON.stringify({...value, contract: '0'.repeat(64)})), /Contrat/);
  assert.throws(() => inspectReplay(JSON.stringify(value).replace('"frames":0', '"frames":0,"frames":1')));
  assert.equal(inspectReplay('{"meta":{"runtimeContract":"legacy"},"frames":[]}').kind, 'main-r13');
  assert.equal(inspectReplay('{"schema":"re.bow.catalog-duel-replay/1","contract":"r7"}').kind, 'catalog-r7'); assert.throws(() => inspectReplay('[]'));
  return {distinctRoutes: 3, originalEvolutionContractOnly: true};
});
const inputs = ['src/save-center-r19.js', 'modules/fidelity-r31/persistence/restore.js', 'modules/fidelity-r31/persistence/journal.js', 'modules/fidelity-r31/replay/verify.js', 'tests/verify-persistence-r31.mjs'];
const report = {schema: 're.bow.persistence-tests-r31/1', passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length,
  checks, sourceFiles: inputs.map(name => ({path: name, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')})),
  scope: 'Real allowlisted game values in isolated memory fixtures; durable journal/real browser storage, reload and opaque replay source verification are tested separately in the browser suite. No cloud or physical-device recovery certification.'};
fs.writeFileSync(path.join(root, 'docs/R31_PERSISTENCE_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
