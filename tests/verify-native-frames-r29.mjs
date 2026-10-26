/** Independently reconstruct the exact skinned coordinates behind every R29 PNG. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {registerHooks} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'modules/fidelity-r24/models/vendor/three');
const pack = path.join(root, 'modules/fidelity-r29/motion');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const manifest = read(path.join(pack, 'manifest.json')), checks = [];
const hook = registerHooks({resolve(specifier, context, next) {return specifier === 'three' ? {url: pathToFileURL(path.join(vendor, 'build/three.module.min.js')).href, shortCircuit: true} : next(specifier, context);}});
function source(record) {const raw = fs.readFileSync(path.join(root, record.path)); assert.equal(raw.length, record.bytes); assert.equal(sha(raw), record.sha256, record.path); return raw;}
try {
  const THREE = await import(pathToFileURL(path.join(vendor, 'build/three.module.min.js')).href);
  const {FBXLoader} = await import(pathToFileURL(path.join(vendor, 'examples/jsm/loaders/FBXLoader.js')).href);
  for (const entry of manifest.entries) {
    try {
      assert.equal(entry.actionIdentity, 'unassigned'); assert.deepEqual(entry.availableCombatStates, []);
      assert.equal(entry.modelRole, 'body');
      assert.equal(entry.originalGameFrames, false); assert.equal(entry.canonicalFidelityCertified, false);
      assert.equal(entry.recipe.animationCameraFixed, true); assert.equal(entry.recipe.geometryMirrored, false);
      assert.equal(entry.recipe.framesInterpolatedFromPng, false); assert.equal(entry.recipe.sourceGeometryEdited, false);
      const catalog = fs.readFileSync(path.join(root, entry.nativeSource.catalog.path)); assert.equal(sha(catalog), entry.nativeSource.catalog.sha256);
      const bodyRaw = source(entry.nativeSource.model), raw = source(entry.nativeSource.clip), proof = read(path.join(root, entry.nativeSource.bindings.path)); source(entry.nativeSource.bindings);
      for (const texture of entry.nativeSource.textures) source(texture);
      assert.equal(sha(raw), entry.nativeSource.publishedClip.sha256);
      assert.equal(proof.body.sourceSha256, entry.nativeSource.model.sha256); assert.equal(proof.sourceArchiveSha256, entry.nativeSource.archive.sha256);
      const manager = new THREE.LoadingManager(); manager.addHandler(/.*/, {path: '', setPath(value) {this.path = value; return this;}, load() {return new THREE.Texture();}});
      const loader = new FBXLoader(manager);
      const object = loader.parse(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), '');
      const body = loader.parse(bodyRaw.buffer.slice(bodyRaw.byteOffset, bodyRaw.byteOffset + bodyRaw.byteLength), '');
      const skin = [], names = new Set(); object.traverse(node => {if (node.isSkinnedMesh) skin.push(node); if (node.isMesh) names.add(node.name);});
      const binding = proof.clips.find(value => value.clipSourceSha256 === entry.nativeSource.clip.sha256);
      assert(binding); assert.equal(binding.matchedMeshes.length, names.size);
      for (const pair of binding.matchedMeshes) {
        const left = body.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(pair.bodyMeshName)), right = object.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(pair.clipMeshName));
        assert(left?.isMesh && right?.isMesh); assert.equal(left.geometry.getAttribute('position').count, right.geometry.getAttribute('position').count);
        assert.deepEqual(left.geometry.getAttribute('uv').array, right.geometry.getAttribute('uv').array);
      }
      assert.equal(skin.length, entry.measurements.skinnedMeshes); assert(skin.length > 0); assert.equal(object.animations.length, 1);
      const mixer = new THREE.AnimationMixer(object), action = mixer.clipAction(object.animations[0]); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true;
      const vector = new THREE.Vector3(), bounds = new THREE.Box3(); let baseline = null, originalDistances = null, delta = 0, shapeDelta = 0;
      for (const [index, frame] of entry.frames.entries()) {
        assert.equal(frame.ticks, entry.sourceNativeSampleTicks[index]); assert.equal(frame.seconds, Number(frame.ticks) / entry.ticksPerSecond);
        assert.deepEqual(frame.pivot, entry.recipe.sourceOriginPivot);
        action.reset().play(); mixer.setTime(frame.seconds); object.updateMatrixWorld(true);
        const coordinates = [], distances = [];
        for (const mesh of skin) {
          const position = mesh.geometry.getAttribute('position'), samples = [];
          for (let vertex = 0; vertex < position.count; vertex++) {
            vector.fromBufferAttribute(position, vertex); mesh.applyBoneTransform(vertex, vector); vector.applyMatrix4(mesh.matrixWorld);
            assert(vector.toArray().every(Number.isFinite)); bounds.expandByPoint(vector); coordinates.push(vector.x, vector.y, vector.z);
            if (vertex % Math.max(1, Math.floor(position.count / 16)) === 0 && samples.length < 16) samples.push(vector.clone());
          }
          for (let first = 0; first < samples.length; first++) for (let second = first + 1; second < samples.length; second++) distances.push(samples[first].distanceTo(samples[second]));
        }
        assert.equal(frame.measurementQuantizationSourceUnits, .0001);
        assert.equal(sha(Buffer.from(new Int32Array(coordinates.map(value => Math.round(value * 10000))).buffer)), frame.quantizedSkinnedVertexSha256, entry.id + ' frame' + index + ' independently reconstructed vertices at1e-4source-unit measurement precision');
        assert.equal(coordinates.length / 3, frame.skinnedVertexCount);
        if (baseline === null) {baseline = coordinates; originalDistances = distances;}
        else {for (let n = 0; n < coordinates.length; n++) delta = Math.max(delta, Math.abs(coordinates[n] - baseline[n])); for (let n = 0; n < distances.length; n++) shapeDelta = Math.max(shapeDelta, Math.abs(distances[n] - originalDistances[n]));}
        const png = fs.readFileSync(path.join(pack, frame.path)); assert.equal(png.length, frame.bytes); assert.equal(sha(png), frame.sha256);
      }
      assert(delta > 0); assert(shapeDelta > 1e-5); assert(Math.abs(delta - entry.measurements.maximumVertexDisplacement) < 1e-7); assert(Math.abs(shapeDelta - entry.measurements.maximumPairwiseDistanceDelta) < 1e-7);
      for (const [name, values] of [['min', bounds.min.toArray()], ['max', bounds.max.toArray()]]) for (const [index, value] of values.entries()) assert(Math.abs(value - entry.recipe.renderedSampleUnionBounds[name][index]) < 1e-7);
      mixer.stopAllAction(); mixer.uncacheRoot(object);
      for (const model of [object, body]) model.traverse(node => {node.geometry?.dispose(); node.skeleton?.dispose(); for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) material.dispose();});
      checks.push({name: entry.id, pass: true, reconstructedFrames: entry.frames.length, skinnedMeshes: skin.length, maximumVertexDisplacement: delta, maximumPairwiseDistanceDelta: shapeDelta});
      console.log('PASS ' + entry.id);
    } catch (error) {checks.push({name: entry.id, pass: false, error: error.stack}); console.error('FAIL ' + entry.id + ': ' + error.message);}
  }
} finally {hook.deregister();}
const paths = ['tests/verify-native-frames-r29.mjs', 'modules/fidelity-r29/motion/manifest.json', 'modules/fidelity-r29/motion/renderer.js'];
const result = {schema: 're.bow.native-frame-rig-tests-r29/1', passed: checks.filter(value => value.pass).length, failed: checks.filter(value => !value.pass).length, checks,
  sourceFiles: paths.map(file => ({path: file, sha256: sha(fs.readFileSync(path.join(root, file)))})),
  scope: 'Independently reconstructed skinned coordinates at every exported native-key sample, measured at1e-4source-unit precision for cross-runtime floating-point interpolation; rendered geometry is never quantized. Nonrigid shape changes, source bytes and UV/material binding. Texture decode and original-game action attribution excluded.'};
fs.writeFileSync(path.join(root, 'docs/R29_NATIVE_FRAME_RIG_TESTS.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({passed: result.passed, failed: result.failed})); if (result.failed || result.passed !== 24) process.exitCode = 1;
