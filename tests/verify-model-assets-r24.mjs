import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {assetURL, verifiedBytes} from '../modules/fidelity-r24/models/verified-assets.js';

const root = new URL('../modules/fidelity-r24/', import.meta.url);
const allowed = new URL('https://example.test/modules/fidelity-r24/');
const base = new URL('visual/', allowed);
const body = new TextEncoder().encode('Transport fixture, not character artwork.\n');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const record = {path: 'source/file with spaces.obj', bytes: body.length, sha256: sha(body)};
const checks = [];
async function test(name, run) {
  try { await run(); checks.push({name, pass: true}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: String(error.stack)}); console.error('FAIL ' + name + ': ' + error.message); }
}
await test('Trusted source paths preserve literal filenames and never leave the delivery', () => {
  assert.equal(assetURL(record, base, allowed).href, 'https://example.test/modules/fidelity-r24/visual/source/file%20with%20spaces.obj');
  for (const path of ['../outside.obj', '/outside.obj', 'https://other.test/model.obj', 'file:///tmp/source', 'source\\file.obj', 'source/./file.obj']) assert.throws(() => assetURL({...record, path}, base, allowed));
  assert.throws(() => assetURL(record, new URL('https://other.test/'), allowed));
  assert.match(assetURL({...record, path: 'literal%2Fname.obj'}, base, allowed).href, /literal%252Fname\.obj$/);
});
await test('Source streams must match both declared length and original digest', async () => {
  const good = await verifiedBytes(record, base, allowed, undefined, async () => new Response(body));
  assert.deepEqual(good, body);
  await assert.rejects(verifiedBytes(record, base, allowed, undefined, async () => new Response(body.slice(1))), /Taille/);
  const corrupt = body.slice(); corrupt[0] ^= 1;
  await assert.rejects(verifiedBytes(record, base, allowed, undefined, async () => new Response(corrupt)), /octets/);
  await assert.rejects(verifiedBytes(record, base, allowed, undefined, async () => new Response(new Uint8Array(body.length + 1))), /Taille/);
  await assert.rejects(verifiedBytes({...record, bytes: 41 * 1024 * 1024}, base, allowed, undefined, async () => { throw Error('Unexpected fetch'); }), /Description/);
});
await test('Every vendored loader and dependency has a preserved hash and license', () => {
  const vendor = new URL('models/vendor/three/', root), manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', vendor)));
  assert.equal(manifest.version, '0.180.0'); assert.equal(manifest.license, 'MIT');
  for (const required of ['LICENSE', 'examples/jsm/loaders/FBXLoader.js', 'examples/jsm/loaders/ColladaLoader.js', 'examples/jsm/loaders/TGALoader.js', 'examples/jsm/libs/fflate.module.js']) assert(manifest.files.some(item => item.path === required));
  for (const item of manifest.files) { const bytes = fs.readFileSync(new URL(item.path, vendor)); assert.equal(sha(bytes), item.sha256); assert.equal(bytes.length, item.bytes); }
});
const result = {schema: 're.bow.model-asset-transport-tests/1', passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks};
fs.writeFileSync(new URL('../docs/R24_MODEL_ASSET_TESTS.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
if (result.failed) process.exitCode = 1;
