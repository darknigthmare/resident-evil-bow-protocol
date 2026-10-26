import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRehearsal, DATABASE_NAME} from '../modules/fidelity-r26/persistence/restore.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), checks = [];
const box = {}; Object.defineProperty(box, 'localStorage', {get() { throw Error('Game storage forbidden'); }}); vm.createContext(box); vm.runInContext(fs.readFileSync(path.join(root, 'src/save-center-r19.js'), 'utf8'), box); const S = box.RE_SAVE_CENTER;
const good = S.encode(S.KEYS.map(key => ({key, value: key === 're.bow.audio058' ? ' {"volume":0.4,"note":"exact é 🧟"}\n' : null})), 'R26 guard fixture');
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
await test('Only the dedicated rehearsal database can be selected', () => {
  let opened = 0; const factory = {open() { opened++; throw Error('Unexpected open'); }};
  for (const name of ['game', '', 're.bow', 're.bow.restore-rehearsal.r25']) assert.throws(() => createRehearsal({saveCenter: S, indexedDB: factory, name}), /base de répétition R26/);
  assert.throws(() => createRehearsal({indexedDB: factory}), /Contrat R19/); assert.throws(() => createRehearsal({saveCenter: S, indexedDB: null}), /IndexedDB indisponible/); assert.equal(opened, 0); return {deniedDatabaseNames: 4, databaseOpens: opened};
});
await test('Malformed, duplicate and checksum-damaged files fail before any database is opened', async () => {
  let opened = 0; const e = createRehearsal({saveCenter: S, indexedDB: {open() { opened++; throw Error('Unexpected open'); }}});
  for (const text of ['{broken', '{"format":"x","format":"y"}', good.replace('R26 guard fixture', 'tampered'), '{"format":"re.bow.backup/2"}']) await assert.rejects(e.initialize(text));
  assert.equal(opened, 0); return {refusedInputs: 4, databaseOpens: opened};
});
await test('Malformed previews are refused before storage access', async () => {
  let opened = 0; const e = createRehearsal({saveCenter: S, indexedDB: {open() { opened++; throw Error('Unexpected open'); }}});
  await assert.rejects(e.prepare('{"format":"re.bow.backup/99"}', ['audio'])); assert.equal(opened, 0); return {databaseOpens: opened};
});
await test('Pre-cancelled initialization never opens the database', async () => {
  let opened = 0; const e = createRehearsal({saveCenter: S, indexedDB: {open() { opened++; throw Error('Unexpected open'); }}}), controller = new AbortController(); controller.abort();
  await assert.rejects(e.initialize(good, {signal: controller.signal}), error => error.name === 'AbortError'); assert.equal(opened, 0); return {databaseOpens: opened, abortPropagated: true};
});
await test('A storage policy refusal propagates and never falls back to game localStorage', async () => {
  let opened = 0; const e = createRehearsal({saveCenter: S, indexedDB: {open() { opened++; throw Object.assign(Error('Storage policy refused'), {name: 'SecurityError'}); }}});
  await assert.rejects(e.initialize(good), /Storage policy refused/); await assert.rejects(e.snapshot(), /Storage policy refused/); assert.equal(opened, 2); return {refusedAttempts: opened, fallbackGameStorageAccesses: 0};
});
await test('A closed rehearsal refuses later work and foreign plans cannot be acknowledged', async () => {
  let opened = 0; const e = createRehearsal({saveCenter: S, indexedDB: {open() { opened++; throw Error('Unexpected open'); }}, name: DATABASE_NAME + '.unit'});
  assert.throws(() => e.backup({}), /Aperçu absent/); assert.throws(() => e.acknowledge({}, good), /Aperçu absent/); await e.close(); await assert.rejects(e.initialize(good), /Atelier fermé/); assert.equal(opened, 0); return {databaseOpens: opened, foreignPlansRefused: true};
});
const report = {schema: 're.bow.persistence-r26-guard-tests/1', passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks, scope: 'Original R19 contract and pre-storage isolation guards. Actual atomic commit/abort/rollback is exercised in browser-persistence-r26.mjs.'}; fs.writeFileSync(path.join(root, 'docs/R26_PERSISTENCE_TESTS.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
