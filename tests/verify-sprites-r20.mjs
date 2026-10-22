import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file));
const manifest = JSON.parse(read('assets/sprites/bow/manifest.json'));
const checks = [];
async function test(name, fn) {
  try { await fn(); checks.push({ name, pass: true }); console.log('PASS ' + name); }
  catch (error) { checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + '\n' + error.stack); }
}

// Decode every alpha pixel, including PNG row filters. Merely finding an RGBA header
// would let an entirely opaque rectangle pass as a supposedly transparent sprite.
function alphaMetrics(bytes) {
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.equal(bytes[24], 8); assert.equal(bytes[25], 6); assert.equal(bytes[28], 0);
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
    if (type === 'IEND') break;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4;
  assert.equal(raw.length, (stride + 1) * height);
  let previous = Buffer.alloc(stride), zero = 0, minimum = 255, maximum = 0;
  let left = width, top = height, right = 0, bottom = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], row = Buffer.alloc(stride);
    assert(filter >= 0 && filter <= 4);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? row[x - 4] : 0, b = previous[x], c = x >= 4 ? previous[x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      if (filter === 2) predictor = b;
      if (filter === 3) predictor = Math.floor((a + b) / 2);
      if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[x] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
    for (let x = 0; x < width; x++) {
      const alpha = row[x * 4 + 3];
      minimum = Math.min(minimum, alpha); maximum = Math.max(maximum, alpha);
      if (!alpha) zero++;
      if (alpha > 16) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1); }
    }
    previous = row;
  }
  return { width, height, zero, minimum, maximum, bounds: { x: left, y: top, width: right - left, height: bottom - top } };
}

for (const record of manifest.sprites) await test(record.id + ': real PNG alpha, complete bounds and SHA-256 match its manifest', () => {
  const bytes = read(record.image), actual = alphaMetrics(bytes);
  assert.equal(bytes.length, record.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
  assert.equal(actual.width, record.width); assert.equal(actual.height, record.height);
  assert.equal(actual.zero, record.alpha.transparentPixels);
  assert.equal(actual.minimum, 0); assert(actual.maximum >= 250);
  assert(actual.zero / (actual.width * actual.height) > 0.25);
  assert.deepEqual(actual.bounds, record.bounds);
  assert(actual.bounds.x > 0 && actual.bounds.y > 0, 'Visible physical silhouette must not touch top or left edge.');
  assert(actual.bounds.x + actual.bounds.width < actual.width && actual.bounds.y + actual.bounds.height < actual.height);
  assert.equal(record.pivot.y, actual.bounds.y + actual.bounds.height);
  assert.deepEqual(JSON.parse(read(`assets/sprites/bow/${record.id}/sprite-manifest.json`)), record);
  for (const reference of record.provenance.references) assert(fs.existsSync(path.join(root, reference.local)));
  for (const variant of record.variants || []) {
    const variantBytes = read(variant.image), metrics = alphaMetrics(variantBytes);
    assert.equal(createHash('sha256').update(variantBytes).digest('hex'), variant.sha256);
    assert.equal(variantBytes.length, variant.bytes);
    assert.equal(metrics.width, variant.width); assert.equal(metrics.height, variant.height);
    assert.equal(metrics.zero, variant.alpha.transparentPixels); assert.deepEqual(metrics.bounds, variant.bounds);
    assert.equal(metrics.minimum, 0); assert(metrics.maximum >= 250);
    assert.equal(variant.pivot.y, metrics.bounds.y + metrics.bounds.height);
  }
});

const pending = [];
class MockImage {
  set src(value) { this.source = value; pending.push(this); }
}
const environment = { Image: MockImage, URL, document: { currentScript: { src: 'https://game.example/src/bow-sprite-library-r20.js' } } };
vm.createContext(environment);
vm.runInContext(read('src/bow-sprite-library-r20.js').toString(), environment);
const library = environment.BOWSpritesR20;
const copy = value => JSON.parse(JSON.stringify(value));
const successfulLoad = async record => {
  const promise = library.load(record.id), image = pending.shift();
  image.naturalWidth = record.width; image.naturalHeight = record.height; image.onload();
  await promise;
};
await test('Registry exactly matches reviewed source and exposes no invented animation or limb layers', () => {
  assert.deepEqual(copy(library.manifest), manifest);
  assert.equal(new Set(manifest.sprites.map(record => record.id)).size, 4);
  for (const record of library.list()) {
    assert(Object.isFrozen(record) && Object.isFrozen(record.layers));
    assert.deepEqual(copy(record.availableStates), ['idle']);
    assert.equal(record.animationFrames, 1); assert.equal(record.layers.length, 1);
    assert.equal(record.modularParts, false); assert.equal(record.combatIntegrated, false);
    assert.equal(record.canonicalFidelity, 'review-required');
  }
  assert.equal(manifest.counts.canonicalFidelityCertified, 0);
  assert.equal(manifest.counts.animatedClips, 0);
  assert.equal(manifest.counts.pngFiles, manifest.sprites.reduce((sum, record) => sum + 1 + (record.variants?.length || 0), 0));
});
await test('Unknown identity and absent animation fail before loading any image', async () => {
  await assert.rejects(library.load('../../outside'), /unknown-sprite/);
  await assert.rejects(library.load('re2r-tyrant', { state: 'walk' }), /state-unavailable/);
  assert.equal(pending.length, 0); assert.equal(library.cacheSize(), 0);
});
await test('Loading failure or incorrect dimensions can be retried without an unresolved cache entry', async () => {
  const record = manifest.sprites[0];
  const bad = library.load(record.id), image = pending.shift(); image.onerror();
  await assert.rejects(bad, /sprite-load-failed/); assert.equal(library.cacheSize(), 0);
  const malformed = library.load(record.id), next = pending.shift(); next.naturalWidth = 1; next.naturalHeight = 1; next.onload();
  await assert.rejects(malformed, /sprite-dimensions-mismatch/); assert.equal(library.cacheSize(), 0);
  await successfulLoad(record);
  assert.equal(library.cacheSize(), 1);
});
await test('All four decoded images remain bounded and repeated loading shares the same promise', async () => {
  for (const record of manifest.sprites.slice(1)) await successfulLoad(record);
  assert.equal(library.cacheSize(), 4);
  const first = library.load('re2r-tyrant'); assert.equal(library.load('re2r-tyrant'), first);
  assert.equal(pending.length, 0);
  assert.equal(library.url('re3r-nemesis'), 'https://game.example/assets/sprites/bow/re3r-nemesis/idle-right-armed.png');
});
await test('Drawing anchors the image at its grounded pivot and refuses missing direction or state', () => {
  const calls = [], context = { globalAlpha: 1 };
  for (const name of ['save', 'restore', 'translate', 'scale', 'drawImage']) context[name] = (...args) => calls.push([name, ...args]);
  assert.equal(library.draw(context, 're3r-nemesis', { facing: 'left' }).reason, 'direction-unavailable');
  assert.equal(library.draw(context, 're2r-tyrant', { state: 'attack' }).reason, 'state-unavailable');
  assert.equal(library.draw(context, 're2r-tyrant', { height: NaN }).reason, 'invalid-layout');
  assert.equal(calls.length, 0);
  const result = library.draw(context, 're2r-tyrant', { x: 300, y: 500, height: 400 });
  assert(result.ok); assert.equal(result.frames, 1);
  assert.deepEqual(calls.map(call => call[0]), ['save', 'translate', 'scale', 'drawImage', 'restore']);
  assert.deepEqual(calls[1], ['translate', 300, 500]);
  assert.equal(calls[3][9] + calls[3][7], 0, 'Image bottom and pivot share y=0.');
  library.clear(); assert.equal(library.cacheSize(), 0);
  assert.equal(library.draw(context, 're2r-tyrant').reason, 'not-loaded');
});

const result = { suite: 'sprites-r20', passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length,
  scope: 'PNG byte integrity, decoded alpha, production boundaries, bounded loader and draw contract. No animation, canonical 1:1 or physical-device certification.', checks };
if (process.argv.includes('--report')) fs.writeFileSync(path.join(root, 'docs/SPRITES_R20_TESTS.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.passed, failed: result.failed }));
if (result.failed) process.exitCode = 1;
