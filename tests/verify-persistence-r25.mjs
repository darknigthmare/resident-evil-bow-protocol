import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createBundleReader, createBatch, arraySlices, LIMITS} from '../modules/fidelity-r25/persistence/bundle.js';
import {mainFixture, catalogFixture, mainEnvironment, catalogEnvironment} from './persistence-fixtures-r24.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = {TextEncoder}; context.window = context; context.globalThis = context;
Object.defineProperty(context, 'localStorage', {get() { throw Error('No game storage may be accessed'); }}); vm.createContext(context);
for (const file of ['save-center-r19', 'replay-vault-r13', 'runtime-contract', 'catalog-replay-contract']) vm.runInContext(fs.readFileSync(path.join(root, 'src', file + '.js'), 'utf8'), context);
const S = context.RE_SAVE_CENTER, V = context.RE_REPLAY_VAULT;
const engineIndex = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r24/persistence/engines.json')));
const reader = createBundleReader({saveCenter: S, replayVault: V, engineIndex, catalogContract: context.RE_CATALOG_REPLAY_CONTRACT.digest});
const clone = value => JSON.parse(JSON.stringify(value));
const backup = archive => S.encode(S.KEYS.map(key => ({key, value: key === V.KEY ? archive : key === 're.bow.audio058' ? ' { "note": "garder é 🧟, [ ]" }\n' : null})), 'R25 real-engine fixture', '2026-10-24T00:00:00.000Z');
const checks = [];
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
const main = await mainFixture(), historical = await mainFixture({historical: true}), catalog = catalogFixture();
historical.id += '-historical';

await test('R19 backup and archive slices preserve all original Unicode text and record boundaries', () => {
  const one = {...main, note: 'escaped \\" and comma, [array]'}, first = '\n  ' + JSON.stringify(one, null, 2) + '  ', second = '\t' + JSON.stringify(historical) + '\n';
  const archive = '[' + first + ',' + second + ']';
  const text = backup(archive), before = createHash('sha256').update(text).digest('hex'), bundle = reader.inspect(text);
  assert.equal(bundle.kind, 'backup-r19'); assert.equal(bundle.originalText, text); assert.equal(bundle.archiveText, archive); assert.equal(bundle.records[0].raw, first); assert.equal(bundle.records[1].raw, second); assert(bundle.records.every(r => r.status === 'ready')); assert.equal(createHash('sha256').update(text).digest('hex'), before);
  assert.equal(bundle.backupInspection.groups.length, 8); assert.equal(bundle.records[1].engine.id, 'main-pre-r13');
  return {records: 2, rawByteHashesUnchanged: true, unknownKeysRestored: 0};
});
await test('Unknown contracts stay visible and cannot enter a batch', () => {
  const bad = clone(main); bad.meta.runtimeContract = 'unsupported-old-engine';
  const row = reader.inspect(JSON.stringify(bad)).records[0]; assert.equal(row.status, 'refused'); assert.match(row.reason, /moteur d’origine/); assert.throws(() => createBatch([row], () => {}), /non vérifiable/);
  const badCatalog = clone(catalog); badCatalog.contract = 'unsupported-experimental'; assert.equal(reader.inspect(JSON.stringify(badCatalog)).records[0].status, 'refused');
});
await test('Repeated IDs refuse both copies rather than choosing by archive order', () => {
  const changed = clone(main); changed.frames[0][0]++;
  const bundle = reader.inspect(JSON.stringify([main, changed])); assert.equal(bundle.records.length, 2); assert(bundle.records.every(r => r.status === 'refused' && /répété/.test(r.reason)));
});
await test('Invalid records stay visible while independent valid archive entries remain selectable', () => {
  const bundle = reader.inspect(JSON.stringify([false, main, {...main, id: 'bad-frames', frames: [[1, 128, 0, 0, 0]]}]));
  assert.deepEqual(bundle.records.map(r => r.status), ['refused', 'ready', 'refused']); assert.equal(bundle.records[1].path, '$[1]');
});
await test('Malformed nested JSON, duplicate fields, transport damage and unsupported containers fail closed', () => {
  for (const text of [backup('[{"id":"one","id":"two"}]'), backup('false'), backup('[]').replace('R25 real-engine fixture', 'changed'), '{"x":1,"x":2}', '{"schema":"re.bow.backup/2"}']) assert.throws(() => reader.inspect(text));
  assert.equal(reader.inspect(backup('[]')).records.length, 0);
  const empty = S.encode(S.KEYS.map(key => ({key, value: null}))); assert.match(reader.inspect(empty).issues[0].detail, /aucune archive/);
});
await test('A nested unpaired UTF-16 surrogate cannot be silently replaced during exact UTF-8 extraction', () => {
  const raw = JSON.stringify({...main, note: '\ud800'}).replace('\\ud800', '\ud800');
  const text = backup('[' + raw + ']');
  assert.throws(() => reader.inspect(text), /exactement en UTF-8/);
  assert.equal(S.decode(text).entries.find(r => r.key === V.KEY).value, '[' + raw + ']');
});
await test('Limits cover file bytes, archive characters, collection size, batch count and duplicate selection', () => {
  assert.throws(() => reader.inspect(' '.repeat(LIMITS.fileBytes + 1)), /volumineux/);
  assert.throws(() => reader.inspect('[' + ' '.repeat(V.MAX_ARCHIVE_CHARS) + ']'), /volumineuse/);
  assert.throws(() => reader.inspect(JSON.stringify(Array.from({length: LIMITS.records + 1}, () => false))), /Trop de replays/);
  const row = reader.inspect(JSON.stringify(main)).records[0];
  assert.throws(() => createBatch([], () => {})); assert.throws(() => createBatch([row, row], () => {}), /répétée/);
  assert.throws(() => createBatch(Array.from({length: LIMITS.batch + 1}, (_, n) => ({...row, key: String(n)})), () => {}), /30/);
});
await test('Experimental replay is individual only and main archives never silently expand their format', () => {
  const one = reader.inspect(JSON.stringify(catalog)); assert.equal(one.records[0].status, 'ready'); assert.equal(one.records[0].engine.id, 'catalog-current');
  assert.equal(reader.inspect(JSON.stringify([catalog])).records[0].status, 'refused'); assert.equal(reader.inspect(backup(JSON.stringify([catalog]))).records[0].status, 'refused');
});
await test('An unrelated damaged backup group is disclosed without inventing a restoration or hiding replay validation', () => {
  const decoded = S.decode(backup(JSON.stringify([main]))); decoded.entries.find(r => r.key === 're.bow.audio058').value = '{broken';
  const text = S.encode(decoded.entries), bundle = reader.inspect(text); assert.equal(bundle.records[0].status, 'ready'); assert.equal(bundle.backupInspection.result, 'errors'); assert(bundle.backupInspection.issues.some(r => r.code === 'invalid-save-content'));
});
await test('Sequential batch reconstructs real current, historical and experimental recordings with unchanged engines', async () => {
  const rows = [main, historical, catalog].map((r, n) => ({...reader.inspect(JSON.stringify(r)).records[0], key: String(n)}));
  let simultaneouslyActive = 0, maximum = 0;
  const batch = createBatch(rows, async value => {
    simultaneouslyActive++; maximum = Math.max(maximum, simultaneouslyActive);
    const promise = (async () => {
      try {
        if (value.schema) return await catalogEnvironment().BOW_REPLAY_VERIFIER_R24.verifyCatalog(value);
        const env = await mainEnvironment({historical: value.meta.runtimeContract === engineIndex.historical_main[0].runtime_contract});
        try { return await env.window.BOW_REPLAY_VERIFIER_R24.verifyMain(value); } finally { env.dispose(); }
      } finally { simultaneouslyActive--; }
    })();
    return {promise, cancel() {}};
  });
  const result = await batch.promise; assert.equal(result.verified, true); assert.equal(result.completed, 3); assert.equal(maximum, 1); assert(result.records.every(r => r.verification.passes === 2 && r.verification.exactFinalStatesEqual));
  return {routes: rows.map(r => r.engine.id), independentPasses: 6, maxConcurrentEngines: maximum};
});
await test('Falsified outcome fails inside a mixed batch while another actual replay still verifies', async () => {
  const changed = clone(main); changed.id += '-falsified'; changed.result.life--;
  const rows = reader.inspect(JSON.stringify([changed, main])).records;
  const env = await mainEnvironment();
  try {
    const result = await createBatch(rows, async value => ({promise: env.window.BOW_REPLAY_VERIFIER_R24.verifyMain(value), cancel() {}})).promise;
    assert.equal(result.verified, false); assert.deepEqual(result.records.map(r => r.status), ['refused', 'verified']); assert.match(result.records[0].reason, /Résultat différent/);
  } finally { env.dispose(); }
});
await test('Cancelling a pending factory settles immediately and cancels its eventual task without stale results', async () => {
  const row = reader.inspect(JSON.stringify(main)).records[0]; let release, cancelCalls = 0, publication = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const batch = createBatch([row], async () => { await gate; return {promise: Promise.resolve({verified: true}), cancel() { cancelCalls++; }}; }, {onResult() { publication++; }});
  batch.cancel(); const result = await batch.promise; assert.equal(result.cancelled, true); assert.equal(result.completed, 0); assert.equal(result.verified, false);
  release(); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(cancelCalls, 1); assert.equal(publication, 0); assert.equal(result.records.length, 0);
});
await test('Cancelling an active engine tears it down and never advances to another selected replay', async () => {
  const rows = reader.inspect(JSON.stringify([main, historical])).records; let started = 0, cancelCalls = 0, rejectTask;
  let ready;
  const taskReady = new Promise(resolve => { ready = resolve; });
  const batch = createBatch(rows, async () => { started++; return {promise: new Promise((_, reject) => { rejectTask = reject; ready(); }), cancel() { cancelCalls++; rejectTask(Error('cancelled')); }}; });
  await taskReady; await new Promise(resolve => setTimeout(resolve, 0)); batch.cancel(); const result = await batch.promise;
  assert.equal(result.cancelled, true); assert.equal(started, 1); assert.equal(cancelCalls, 1); assert.equal(result.completed, 0);
});

const result = {schema: 're.bow.persistence-r25-tests/1', passed: checks.filter(r => r.pass).length, failed: checks.filter(r => !r.pass).length, checks, scope: 'Original R19/R13 validators, original three real engine routes and controlled batch cancellation. No game storage, cloud restoration or physical crash certification.'};
fs.writeFileSync(path.join(root, 'docs/R25_PERSISTENCE_TESTS.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
