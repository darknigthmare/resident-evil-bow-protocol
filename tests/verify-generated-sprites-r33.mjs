/** Independent reader-boundary checks using actual R33 records and PNG bytes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {localURL, validateManifest, verifyBytes} from '../modules/fidelity-r33/sprites/library.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modules/fidelity-r33/sprites/manifest.json')));
const hash = raw => createHash('sha256').update(raw).digest('hex'), checks = [];
async function test(name, run) { try { const evidence = await run(); checks.push({name, pass: true, evidence}); console.log('PASS ' + name); } catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); } }
await test('Actual eight records and four complete source-edition pairs pass the reader contract', () => { assert.equal(validateManifest(manifest), manifest); assert.equal(manifest.variants.length, 8); assert.equal(manifest.families.length, 4); return {pngs: 8, pairs: 4}; });
await test('Every actual PNG passes byte count, SHA and PNG signature independently', async () => { for (const entry of manifest.variants) { const bytes = fs.readFileSync(path.join(root, entry.image)); assert.equal((await verifyBytes(bytes, entry)).byteLength, bytes.length); } return {actualPngs: 8}; });
await test('Corruption, truncated bytes and a wrong PNG signature are refused before decode', async () => {
  const entry = manifest.variants[0], raw = fs.readFileSync(path.join(root, entry.image)), corrupt = Buffer.from(raw); corrupt[corrupt.length - 1] ^= 1;
  await assert.rejects(verifyBytes(corrupt, entry), /SHA-256/); await assert.rejects(verifyBytes(raw.subarray(0, raw.length - 1), entry), /Taille/);
  const invalid = Buffer.from(raw); invalid[0] = 0; await assert.rejects(verifyBytes(invalid, {...entry, sha256: hash(invalid)}), /Signature/); return {rejected: 3};
});
await test('Remote, absolute, traversal, encoded and fragment source paths are refused', () => { for (const value of ['https://example.org/a.png', '//example.org/a', '/etc/passwd', '../secret', 'modules/../x', 'modules/%2e%2e/x', 'data:image/png,x', 'file:///tmp/a', 'modules/x.png#y', 'modules/x.png?q=1', 'modules\\x.png']) assert.throws(() => localURL(value)); assert(localURL(manifest.variants[0].image).href.startsWith('file:')); return {rejected: 11}; });
await test('Edition promotion, procedural mirroring and fake animation claims fail closed', () => {
  let rejected = 0; for (const patch of [{defaultAdmission: true}, {admittedTargetEdition: true}, {targetEditionMatched: true}, {canMirror: true}, {animationFrames: 2}, {animated: true}, {canonicalFidelityCertified: true}, {width: 100000}]) { const copy = structuredClone(manifest); Object.assign(copy.variants[0], patch); assert.throws(() => validateManifest(copy)); rejected++; } return {rejected};
});
await test('Documentary moth and contextual alligator cannot acquire a combat state', () => { for (const uid of ['re2-giant-moth', 're2-giant-alligator']) { const copy = structuredClone(manifest), entry = copy.variants.find(value => value.id === uid); entry.availableStates = ['idle']; assert.throws(() => validateManifest(copy)); } return {heldFamilies: 2}; });
await test('Duplicate sides, unknown states and mismatched family labels are refused', () => { for (const mutate of [copy => copy.variants[1].sourceFacing = copy.variants[0].sourceFacing, copy => copy.variants[0].availableStates = ['heavy'], copy => copy.variants[0].sourceVariantLabel = 'different', copy => copy.variants[1].variantId = copy.variants[0].variantId]) { const copy = structuredClone(manifest); mutate(copy); assert.throws(() => validateManifest(copy)); } return {rejected: 4}; });
await test('The reader has no game-state, storage, timing or image-mirror writes', () => { const source = fs.readFileSync(path.join(root, 'modules/fidelity-r33/sprites/library.js'), 'utf8'); assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|\.scale\(|scaleX|\.step\(|exportReplay|setInterval/); return {readerIsPresentationOnly: true}; });
const sourceNames = ['tests/verify-generated-sprites-r33.mjs', 'modules/fidelity-r33/sprites/library.js', 'modules/fidelity-r33/sprites/manifest.json'];
const report = {schema: 're.bow.generated-library-tests-r33/1', passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length, checks, sourceFiles: sourceNames.map(name => ({path: name, sha256: hash(fs.readFileSync(path.join(root, name)))})), scope: 'Independent validation of actual PNG bytes, declared pair contracts and rejected corruption/paths/edition promotion. This does not certify original game pixels or animation.'};
fs.writeFileSync(path.join(root, 'docs/R33_GENERATED_RUNTIME_TESTS.json'), JSON.stringify(report, null, 2) + '\n'); if (report.failed) process.exitCode = 1;
