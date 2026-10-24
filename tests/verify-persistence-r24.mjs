import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mainEnvironment, mainFixture, catalogEnvironment, catalogFixture} from './persistence-fixtures-r24.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), checks = [], clone = value => JSON.parse(JSON.stringify(value));
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
const complete = await mainFixture(), excerpt = await mainFixture({seconds: 99, excerpt: true}), catalog = catalogFixture(), historical = await mainFixture({historical: true});
async function main(value, options = {}) { const environment = await mainEnvironment(options); try { return await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(value); } finally { environment.dispose(); } }

await test('Complete main recording reconstructs every result field twice with identical final states', async () => {
  const result = await main(complete); assert.equal(result.verified, true); assert.equal(result.passes, 2); assert.equal(result.exactFinalStatesEqual, true); assert.equal(result.result.claimed, true); assert.equal(result.result.comparedFields.length, 10); assert.equal(result.reconstructed.finished, true); assert.equal(result.commandFrames, complete.captureR13.frames);
  return {frames: result.commandFrames, comparedFields: result.result.comparedFields, passes: result.passes};
});
await test('Principal excerpts reconstruct exact input duration without certifying a victory', async () => {
  const result = await main(excerpt); assert.equal(result.verified, true); assert.equal(result.commandFrames, excerpt.captureR13.frames); assert.equal(result.result.claimed, false); assert.equal(result.reconstructed.finished, false);
  return {frames: result.commandFrames, outcomeClaimed: false};
});
await test('Changed winner, life, timer, rounds and metrics are rejected after actual main-engine simulation', async () => {
  for (const [field, value] of [['winner', 're1-hunter'], ['life', complete.result.life - 1], ['timer', complete.result.timer + 1], ['rounds', [9, 9]], ['metrics', {invented: 1}]]) { const changed = clone(complete); changed.result[field] = value; await assert.rejects(() => main(changed), /Résultat différent après relecture/); }
});
await test('Truncated or trailing commands and incoherent capture declarations cannot produce a verified result', async () => {
  const truncated = clone(complete); truncated.frames = [[1, 0, 0, 0, 0]]; truncated.captureR13.frames = 1;
  await assert.rejects(() => main(truncated), /ne termine pas/);
  const trailing = clone(complete); trailing.frames.push([1, 0, 0, 0, 0]); trailing.captureR13.frames++;
  await assert.rejects(() => main(trailing), /supplémentaires/);
  const mismatched = clone(complete); mismatched.captureR13.frames++;
  await assert.rejects(() => main(mismatched), /Durée ou type/);
});
await test('Missing or older main contracts and invalid packed inputs are refused by current known-engine boundaries', async () => {
  for (const contract of [null, 'older-contract']) { const changed = clone(complete); changed.meta.runtimeContract = contract; await assert.rejects(() => main(changed), /moteur d’origine/); }
  const changed = clone(complete); changed.frames[0][1] = 128; await assert.rejects(() => main(changed), /Commandes du replay/);
});
await test('Principal replays with slow-motion mutator retain deterministic command time independently of simulation frame count', async () => {
  const record = await mainFixture({seconds: 99, excerpt: true, mutators: ['slow_motion']});
  const result = await main(record); assert.equal(result.exactFinalStatesEqual, true); assert(result.reconstructed.frame < result.commandFrames); return {commandFrames: result.commandFrames, simulationFrames: result.reconstructed.frame};
});
await test('Verification does not access an unrelated game save or mutate the source replay', async () => {
  const environment = await mainEnvironment();
  try {
    environment.storage.set('unrelated-user-save', 'DO NOT CHANGE'); const before = JSON.stringify(complete), saved = environment.storage.get('unrelated-user-save');
    await environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(complete);
    assert.equal(JSON.stringify(complete), before); assert.equal(environment.storage.get('unrelated-user-save'), saved);
  } finally { environment.dispose(); }
});
await test('A controlled second-pass state perturbation is detected even when the same winner is recorded', async () => {
  const environment = await mainEnvironment();
  try {
    const actual = environment.api(); let passes = 0;
    const injected = {...actual, startReplay(value) { actual.startReplay(value); if (++passes === 2) actual.getState().a.x += 0.25; }};
    await assert.rejects(() => environment.window.BOW_REPLAY_VERIFIER_R24.verifyMain(complete, {api: injected}), /états différents|Résultat différent/);
    return {controlledFaultInjection: true, alteredCoordinate: 0.25};
  } finally { environment.dispose(); }
});
await test('Experimental engine validates stored final digest then independently reconstructs identical full states twice', async () => {
  const context = catalogEnvironment(), result = await context.BOW_REPLAY_VERIFIER_R24.verifyCatalog(catalog);
  assert.equal(result.verified, true); assert.equal(result.storedStateDigestVerifiedByOriginalEngine, true); assert.equal(result.storedStateDigest, catalog.stateDigest); assert.equal(result.exactFinalStatesEqual, true); assert.equal(result.commandFrames, catalog.frames);
  return {frames: result.commandFrames, storedStateDigest: catalog.stateDigest, passes: result.passes};
});
await test('Changed experimental digest, command timeline or CPU control stream is refused by the real engine', async () => {
  const context = catalogEnvironment();
  for (const changed of [{...clone(catalog), stateDigest: '00000000'}, {...clone(catalog), frames: catalog.frames + 1}, {...clone(catalog), setup: {...catalog.setup, mode: 'cpu'}, runs: [[catalog.frames, 1, -1]]}]) await assert.rejects(() => context.BOW_REPLAY_VERIFIER_R24.verifyCatalog(changed));
});
await test('Experimental old contracts remain unsupported rather than being migrated or simulated under new rules', async () => {
  const context = catalogEnvironment(), changed = clone(catalog); changed.contract = 'old-contract'; await assert.rejects(() => context.BOW_REPLAY_VERIFIER_R24.verifyCatalog(changed), /incompatible/);
});
await test('A real empty experimental recording remains an initial-state excerpt and cannot invent a match result', async () => {
  const context = catalogEnvironment(), empty = catalogFixture({frameCount: 0}), result = await context.BOW_REPLAY_VERIFIER_R24.verifyCatalog(empty);
  assert.equal(result.commandFrames, 0); assert.equal(result.reconstructed.finished, false); assert.equal(result.storedStateDigestVerifiedByOriginalEngine, true); assert.equal(result.exactFinalStatesEqual, true);
});
await test('A replay actually recorded by the pre-R13 engine reconstructs only in its own historical contract', async () => {
  assert.equal(historical.captureR13, undefined); assert.notEqual(historical.meta.runtimeContract, complete.meta.runtimeContract);
  await assert.rejects(() => main(historical), /moteur d’origine/);
  const result = await main(historical, {historical: true}); assert.equal(result.verified, true); assert.equal(result.result.claimed, true); assert.equal(result.exactFinalStatesEqual, true); assert.equal(result.engineContract, historical.meta.runtimeContract);
  return {sourceCommit: '31671fecf53a26d81f77d2cb13a5ff61f15ef363', originalEnvelopeVersion: historical.version, engineContract: result.engineContract, frames: result.commandFrames};
});
await test('Every frozen script and HTML byte matches its pin, with the original Git revision also checked when available', () => {
  const folder = path.join(root, 'modules/fidelity-r24/persistence/historical/pre-r13'), manifest = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8'));
  let gitAvailable = true;
  try { execFileSync('git', ['cat-file', '-e', manifest.source_commit + '^{commit}'], {cwd: root, stdio: 'ignore'}); } catch { gitAvailable = false; }
  for (const item of [...manifest.scripts.map(row => ({source: row.source_path, file: row.snapshot_path, sha256: row.sha256})), {source: manifest.original_html.source_path, file: manifest.original_html.path, sha256: manifest.original_html.sha256}]) {
    const bytes = fs.readFileSync(path.join(folder, item.file)); assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    if (gitAvailable) assert.deepEqual(bytes, execFileSync('git', ['show', manifest.source_commit + ':' + item.source], {cwd: root, maxBuffer: 16777216}));
  }
  return {frozenScripts: manifest.scripts.length, originalHTML: true, sourceCommit: manifest.source_commit, originalGitBytesCompared: gitAvailable};
});

const fixtures = path.join(root, 'qa-persistence-r24-fixtures'); fs.mkdirSync(fixtures, {recursive: true});
for (const [name, value] of [['main-current', complete], ['main-excerpt', excerpt], ['catalog-current', catalog], ['main-pre-r13', historical]]) fs.writeFileSync(path.join(fixtures, name + '.json'), JSON.stringify(value, null, 2) + '\n');
const result = {schema: 're.bow.persistence-r24-tests/1', passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length, scope: 'Fixtures generated by the actual current main and experimental engines; reconstruction uses unchanged engine APIs in controlled Node VM/DOM. This is not physical-device or unknown-historical-engine certification.', checks};
fs.writeFileSync(path.join(root, 'docs/R24_PERSISTENCE_TESTS.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed) process.exitCode = 1;
