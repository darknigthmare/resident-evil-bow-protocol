/** Decode exact R26 source geometry with pinned Three.js; no GPU or game-rendering claim. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {registerHooks} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'modules/fidelity-r26/visual');
const vendor = path.join(root, 'modules/fidelity-r24/models/vendor/three');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const manifest = read(path.join(base, 'manifest.json'));
const threeURL = pathToFileURL(path.join(vendor, 'build/three.module.min.js')).href;
const hooks = registerHooks({resolve(specifier, context, nextResolve) {
  return specifier === 'three' ? {url: threeURL, shortCircuit: true} : nextResolve(specifier, context);
}});
const checks = [];
try {
  for (const record of read(path.join(vendor, 'manifest.json')).files) {
    const bytes = fs.readFileSync(path.join(vendor, record.path));
    assert.equal(bytes.length, record.bytes); assert.equal(sha(bytes), record.sha256);
  }
  const THREE = await import(threeURL);
  const {FBXLoader} = await import(pathToFileURL(path.join(vendor, 'examples/jsm/loaders/FBXLoader.js')).href);
  const {OBJLoader} = await import(pathToFileURL(path.join(vendor, 'examples/jsm/loaders/OBJLoader.js')).href);
  const {MTLLoader} = await import(pathToFileURL(path.join(vendor, 'examples/jsm/loaders/MTLLoader.js')).href);
  for (const entry of manifest.entries) {
    const buffer = record => {
      const bytes = fs.readFileSync(path.join(base, record.path));
      assert.equal(bytes.length, record.bytes); assert.equal(sha(bytes), record.sha256);
      return bytes;
    };
    const bytes = buffer(entry.model);
    for (const record of entry.textures) buffer(record);
    const known = new Set(entry.textures.map(row => path.basename(row.path).toLowerCase()));
    const missing = new Set((entry.unresolvedTextureReferences || []).map(row => {
      assert.equal(row.sourceModelSha256, entry.model.sha256); assert.equal(row.archiveMemberMissing, true);
      return row.rawFileName;
    }));
    const requests = [];
    const manager = new THREE.LoadingManager();
    const textureStub = {path: '', setPath(value) {this.path = value; return this;}, load(value) {
      const filename = value.replaceAll('\\', '/').split('/').pop().toLowerCase();
      assert(known.has(filename) || missing.has(filename), entry.id + ' unexpected native texture: ' + value);
      requests.push({filename, unresolved: missing.has(filename)});
      return new THREE.Texture();
    }};
    manager.addHandler(/.*/, textureStub);
    let object;
    if (entry.format === 'FBX') {
      object = new FBXLoader(manager).parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    } else {
      const materials = new MTLLoader(manager).parse(buffer(entry.materials).toString('utf8'), '');
      materials.preload();
      object = new OBJLoader(manager).setMaterials(materials).parse(bytes.toString('utf8'));
    }
    object.updateMatrixWorld(true);
    const names = new Set(); let meshes = 0, skins = 0, vertices = 0, triangles = 0;
    object.traverse(node => {
      if (node.isBone) names.add(node.name);
      for (const value of node.matrixWorld.elements) assert(Number.isFinite(value), entry.id + ' finite matrix');
      if (!node.isMesh) return;
      meshes++; skins += Number(Boolean(node.isSkinnedMesh));
      const geometry = node.geometry;
      for (const attribute of Object.values(geometry.attributes)) {
        for (const value of attribute.array) assert(Number.isFinite(value), entry.id + ' finite geometry');
      }
      const position = geometry.getAttribute('position');
      assert(position.count > 0); vertices += position.count;
      triangles += (geometry.index?.count || position.count) / 3;
      if (node.isSkinnedMesh) {
        const indices = geometry.getAttribute('skinIndex');
        for (const value of indices.array) assert(value >= 0 && value < node.skeleton.bones.length, entry.id + ' bound influence');
        const point = new THREE.Vector3().fromBufferAttribute(position, 0);
        node.applyBoneTransform(0, point); assert(point.toArray().every(Number.isFinite));
      }
    });
    assert(meshes > 0 && triangles > 0 && Number.isInteger(triangles));
    if (entry.format === 'FBX') {
      assert.equal(skins, entry.geometry.skinCount);
      assert.deepEqual([...names].sort(), entry.geometry.boneNames.map(THREE.PropertyBinding.sanitizeNodeName).sort());
      assert(object.animations.every(clip => clip.tracks.every(track => {
        const size = track.getValueSize();
        return track.values.every((value, index) => value === track.values[index % size]);
      })), entry.id + ' constant source take must not become motion');
    } else assert.equal(skins, 0);
    checks.push({id: entry.id, pass: true, format: entry.format, meshes, skins, uniqueBones: names.size,
      vertices, triangles, nativeTextureRequests: requests, sourceBytesRewritten: false, motionClipsCertified: 0});
  }
} finally {hooks.deregister();}
const report = {schema: 're.bow.visual-source-decoding-r26/1', passed: checks.length, failed: 0,
  library: 'exact vendored Three.js 0.180.0', gpuRenderingTested: false, canonicalFidelityCertified: 0,
  textureImagesStubbedOnlyForGeometryDecoding: true, checks};
assert.equal(checks.length, 9);
console.log(JSON.stringify(report, null, 2));
