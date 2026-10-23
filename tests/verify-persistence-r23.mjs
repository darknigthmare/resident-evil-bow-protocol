import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createInspector, parseStrict, LIMITS} from '../modules/fidelity-r23/persistence/inspector.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const box = {TextEncoder}; box.window = box; box.globalThis = box;
Object.defineProperty(box, 'localStorage', {get() { throw Error('Storage access forbidden in read-only inspection'); }});
vm.createContext(box);
for (const name of ['save-center-r19', 'replay-vault-r13', 'runtime-contract', 'catalog-replay-contract', 'chronicles-data-v060', 'chronicles-core-v060']) vm.runInContext(fs.readFileSync(path.join(root, 'src/' + name + '.js'), 'utf8'), box);
const S = box.RE_SAVE_CENTER, V = box.RE_REPLAY_VAULT;
const inspector = createInspector({saveCenter: S, replayVault: V, runtimeContract: box.RE_RUNTIME_CONTRACT.digest, catalogContract: box.RE_CATALOG_REPLAY_CONTRACT.digest});
const backup = (entries = {}) => S.encode(S.KEYS.map(key => ({key, value: entries[key] ?? null})), 'R23 controlled fixture', '2026-10-23T00:00:00.000Z');
const checks = [];
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
const record = (id = 'fixture', contract = box.RE_RUNTIME_CONTRACT.digest) => ({version: '0.48', id, meta: {p1: 're1-hunter', p2: 're1-zombie', runtimeContract: contract}, frames: [[10, 0, 0, 0, 0]], result: null});

await test('Strict JSON refuses ambiguous duplicate fields, invalid syntax and excessive nesting', () => {
  for (const text of ['{"id":1,"id":2}', '{"id":1,"\\u0069d":2}', '{"a":{"x":1,"x":2}}', '[1,]', '[1,,2]', 'null trailing', '"unterminated', '['.repeat(LIMITS.depth + 2) + '0' + ']'.repeat(LIMITS.depth + 2)]) assert.throws(() => parseStrict(text));
  assert.deepEqual(parseStrict('{"a":"\\\"\\\\","b":[true,false,null,1.25e2]}'), {a: '"\\', b: [true, false, null, 125]});
});
await test('Transport inspection preserves exact original strings and inspects all 18 known keys', () => {
  const text = backup({'re.bow.audio058': '  { "volume":0.3,"note":"é 🧟" }\n'}), before = text;
  const report = inspector.inspect(text); assert.equal(text, before); assert.equal(report.result, 'inspected'); assert.equal(report.groups.length, 8); assert.equal(report.originalRewritten, false); assert.equal(report.readOnly, true); assert.equal(report.playbackCertified, false);
  assert(!JSON.stringify(report).includes('🧟')); assert(report.issues.some(item => item.code === 'loader-validation-pending'));
});
await test('Outer checksum damage, future formats and oversize documents are refused', () => {
  for (const text of [backup().replace('R23 controlled', 'changed'), JSON.stringify({format: 're.bow.backup/2'}), 'x'.repeat(LIMITS.fileBytes + 1)]) assert.equal(inspector.inspect(text).result, 'errors');
});
await test('Historical UTF-16 value limits do not reject a valid Unicode backup as an 8 MiB byte overflow', () => {
  const raw = JSON.stringify({note: '漢'.repeat(3000000)});
  assert(raw.length < S.MAX_VALUE); assert(new TextEncoder().encode(raw).byteLength > S.MAX_VALUE);
  const text = backup({'re.bow.audio058': raw}), report = inspector.inspect(text);
  assert.equal(report.result, 'inspected'); assert.equal(S.decode(text).entries.find(row => row.key === 're.bow.audio058').value, raw);
  return {nestedCharacters: raw.length, nestedUtf8Bytes: new TextEncoder().encode(raw).byteLength};
});
await test('A transport-readable but invalid nested replay is no longer mistaken for a valid game record', () => {
  const text = backup({[V.KEY]: '[false]'});
  assert.equal(S.describe(S.decode(text).entries).find(group => group.id === 'replays').restorable, true);
  const report = inspector.inspect(text); assert.equal(report.result, 'errors'); assert(report.issues.some(item => item.code === 'invalid-replay')); assert.equal(report.records.length, 0);
});
await test('Nested malformed JSON, repeated keys and internal checksum damage are visible', () => {
  for (const values of [{'re.bow.audio058': '{broken'}, {'re.bow.audio058': '{"x":1,"x":2}'}, {'re.bow.chronicles055.a': '{"revision":2,"payload":{},"checksum":"00000000"}'}]) {
    const report = inspector.inspect(backup(values)); assert.equal(report.result, 'errors'); assert(report.issues.some(item => item.code === 'invalid-save-content'));
  }
});
await test('Real Dossier slot envelopes retain their raw bytes and equal-revision divergence is flagged', () => {
  const C = box.CQC60_CORE, D = box.CQC55_DATA;
  const first = C.envelope(D, C.fresh(D), 4), profile = C.begin(D, C.fresh(D), D.fighters[0].uid), second = C.envelope(D, profile, 4);
  const good = inspector.inspect(backup({'re.bow.chronicles055.a': first})); assert.equal(good.result, 'inspected'); assert.equal(good.records[0].revision, 4);
  const bad = inspector.inspect(backup({'re.bow.chronicles055.a': first, 're.bow.chronicles055.b': second})); assert.equal(bad.result, 'errors'); assert(bad.issues.some(item => item.code === 'same-revision-divergence'));
  assert.deepEqual(JSON.parse(first).payload, JSON.parse(C.envelope(D, C.fresh(D), 4)).payload);
});
await test('Invalid frame commands, excessive duration and duplicate replay IDs are refused', () => {
  for (const value of [{...record(), frames: [[1, 128, 0, 0, 0]]}, {...record(), frames: [[216001, 0, 0, 0, 0]]}, [record(), record()]]) assert.equal(inspector.inspect(JSON.stringify(value)).result, 'errors');
});
await test('Current, historical and missing replay contracts have distinct outcomes without playback claims', () => {
  for (const [contract, state] of [[box.RE_RUNTIME_CONTRACT.digest, 'current-contract'], ['historical', 'different-contract'], [null, 'unknown']]) {
    const report = inspector.inspect(JSON.stringify(record('test', contract))); assert.equal(report.result, 'inspected'); assert.equal(report.records[0].compatibility, state); assert.equal(report.records[0].simulation, 'not-run'); assert.equal(report.playbackCertified, false);
  }
});
await test('Comparing copies reports raw-setting differences and conflicting replay IDs without choosing a winner', () => {
  const a = backup({'re.bow.audio058': '{"volume":0.3}'}), b = backup({'re.bow.audio058': '{"volume":0.5}'}), compared = inspector.compare(a, b);
  assert.equal(compared.changes.length, 1); assert.equal(compared.changes[0].key, 're.bow.audio058'); assert.equal(compared.resolution, 'none');
  const one = JSON.stringify([record('same')]), two = JSON.stringify([{...record('same'), frames: [[11, 0, 0, 0, 0]]}]);
  assert.equal(inspector.compare(one, two).changes[0].state, 'conflicting-replay-id');
  assert.throws(() => inspector.compare(one, '[false]')); assert.throws(() => inspector.compare(a, one));
});
await test('Experimental replay produced by the real engine passes structure while simulation certification stays separate', () => {
  const context = {TextEncoder}; context.window = context; context.globalThis = context; vm.createContext(context);
  for (const file of ['re-data', 'catalog-expansion-data', 'catalog-trial-adapter', 'spatial-weakpoints-v072', 'combat-foundation-v060', 'catalog-replay-contract', 'catalog-replay-r7']) vm.runInContext(fs.readFileSync(path.join(root, 'src/' + file + '.js'), 'utf8'), context);
  const engine = context.RE_CATALOG_REPLAY, D = context.RE_DATA;
  const session = engine.create({uid: 're3r-nemesis', target: 're3r-stage-2-nemesis', stage: D.stages[0].id, mode: 'human', seed: 7070});
  for (let n = 0; n < 120; n++) session.step({right: n < 80, slot: n % 39 === 0 ? 'light' : null});
  const value = session.exportValue(), text = JSON.stringify(value), report = inspector.inspect(text);
  assert.equal(report.kind, 'catalog-replay-r7'); assert.equal(report.result, 'inspected'); assert.equal(report.records[0].frames, 120); assert.equal(report.records[0].simulation, 'not-run'); assert.equal(report.playbackCertified, false);
  // Separate, actual original-engine validation is evidence for this fixture.
  assert.equal(engine.validate(text).stateDigest, value.stateDigest);
  for (const bad of [{...value, frames: 121}, {...value, setup: {...value.setup, mode: 'cpu'}, runs: [[120, 1, -1]]}]) assert.equal(inspector.inspect(JSON.stringify(bad)).result, 'errors');
  return {fixtureFrames: 120, independentlyReplayedByOriginalEngine: true, inspectorRunsSimulation: false};
});
await test('A real main-match recording remains byte-identical after inspection and replays in its original current engine', async () => {
  const {loadGame} = createRequire(import.meta.url)('./engine-vm.cjs');
  const environment = await loadGame(path.join(root, 'modules/versus.html'));
  try {
    const api = environment.api(); api.startExternal({p1: 're3r-nemesis', p2: 're1-hunter', mode: 'local', rounds: 1, seconds: 1, p2Life: 1, finishers: 'off'});
    for (let n = 0; n < 300 && !api.getState().finished; n++) api.advance(100);
    assert(api.getState().finished);
    const captured = api.getLastReplay(), text = JSON.stringify(captured), stored = [...environment.storage.entries()], frames = api.getState().frame, winner = api.getState().winner;
    const report = inspector.inspect(text); assert.equal(report.result, 'inspected'); assert.equal(report.records[0].compatibility, 'current-contract'); assert.equal(JSON.stringify(captured), text); assert.deepEqual([...environment.storage.entries()], stored);
    api.startReplay(captured); for (let n = 0; n < 300 && !api.getState().finished; n++) api.advance(100);
    assert.equal(api.getState().frame, frames); assert.equal(api.getState().winner, winner);
    return {recordedFrames: frames, independentlyReplayedByOriginalEngine: true, inspectorWrites: 0};
  } finally { environment.dispose(); }
});

const result = {schema: 're.bow.persistence-tests/1', passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length, scope: 'Pure inspector with original validators and two real-engine fixtures. No cloud service, crash test, hardware validation or unknown historical engine certification.', checks};
fs.writeFileSync(path.join(root, 'docs/R23_PERSISTENCE_TESTS.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({passed: result.passed, failed: result.failed}));
if (result.failed) process.exitCode = 1;
