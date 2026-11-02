/** Reconstruct every complete R33 source pose and the reused marine loop independently. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {registerHooks} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lot = 'modules/fidelity-r33/native', vendor = path.join(root, 'modules/fidelity-r24/models/vendor/three');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(root, lot, 'manifest.json'))), checks = [];
const review = JSON.parse(fs.readFileSync(path.join(root, lot, 'review/observations.json')));
const source = record => {const raw = fs.readFileSync(path.join(root, record.path)); assert.equal(hash(raw), record.sha256, record.path); if (record.bytes !== undefined) assert.equal(raw.length, record.bytes); return raw;};
const rms = (left, right) => {let squares = 0; for (let index = 0; index < left.length; index++) squares += (left[index] - right[index]) ** 2; return Math.sqrt(squares / (left.length / 3));};
const hook = registerHooks({resolve(specifier, context, next) {return specifier === 'three' ? {url: pathToFileURL(path.join(vendor, 'build/three.module.min.js')).href, shortCircuit: true} : next(specifier, context);}});
try {
  const THREE = await import(pathToFileURL(path.join(vendor, 'build/three.module.min.js')).href);
  const {FBXLoader} = await import(pathToFileURL(path.join(vendor, 'examples/jsm/loaders/FBXLoader.js')).href);
  source(manifest.inputs); for (const renderer of manifest.renderers) source(renderer); source(manifest.observations);
  for (const key of new Set(manifest.entries.filter(entry => entry.kind === 'native-sequence').map(entry => entry.subjectId + '::' + entry.clipId))) {
    try {
      const pair = manifest.entries.filter(entry => entry.subjectId + '::' + entry.clipId === key), entry = pair[0];
      assert.equal(pair.length, 2); assert.deepEqual(pair.map(row => row.sourceFacing).sort(), ['left', 'right']);
      const native = entry.nativeSource, raw = source(native.clip), bodyRaw = source(native.model), bindings = JSON.parse(source(native.bindings));
      const catalog = JSON.parse(source(native.catalog));
      if (native.archive.path) source(native.archive);
      else {
        const sourceEntry = catalog.entries.find(row => row.id === entry.modelId && row.model.sha256 === native.model.sha256);
        assert(sourceEntry); assert.equal(sourceEntry.archive.sha256, native.archive.sha256); assert.equal(sourceEntry.archive.bytes, native.archive.bytes);
        source({...sourceEntry.archive, path: path.relative(root, path.resolve(root, path.dirname(native.catalog.path), sourceEntry.base, sourceEntry.archive.path)).split(path.sep).join('/')});
      }
      for (const texture of native.textures) source(texture);
      const manager = new THREE.LoadingManager();
      // Explicit texture stub is sufficient for a geometry-only reconstruction; browser tests decode real PNGs.
      manager.addHandler(/.*/, {path: '', setPath(value) {this.path = value; return this;}, load() {return new THREE.Texture();}});
      const loader = new FBXLoader(manager), object = loader.parse(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), ''), body = loader.parse(bodyRaw.buffer.slice(bodyRaw.byteOffset, bodyRaw.byteOffset + bodyRaw.byteLength), '');
      const meshes = [], bones = []; object.traverse(node => {if (node.isSkinnedMesh) meshes.push(node); if (node.isBone) bones.push(node);});
      assert.equal(object.animations.length, 1); assert(meshes.length > 0); assert(bones.length >= 3);
      const binding = bindings.clips.find(row => row.clipSourceSha256 === native.clip.sha256 && row.bodySourceSha256 === native.model.sha256);
      assert(binding); assert.equal(binding.matchedMeshes.length, meshes.length);
      for (const match of binding.matchedMeshes) {
        const left = body.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(match.bodyMeshName)), right = object.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(match.clipMeshName));
        assert(left?.isMesh && right?.isMesh); assert.deepEqual(left.geometry.getAttribute('uv').array, right.geometry.getAttribute('uv').array);
      }
      const mixer = new THREE.AnimationMixer(object), action = mixer.clipAction(object.animations[0]); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true;
      let first = null, previous = null, lastPlayback = null, maximumAdjacentRms = 0, firstBones = null;
      const moving = new Set(), bounds = new THREE.Box3(), vector = new THREE.Vector3();
      for (const [index, frame] of [...entry.frames, entry.endpoint].entries()) {
        const endpoint = index === entry.frames.length;
        assert.equal(frame.seconds, Number(frame.ticks) / entry.ticksPerSecond);
        if (!endpoint) assert(Math.abs(frame.seconds - index / 60) < 1e-12);
        action.reset().play(); mixer.setTime(frame.seconds); object.updateMatrixWorld(true);
        const coordinates = [];
        for (const mesh of meshes) {
          const positions = mesh.geometry.getAttribute('position');
          for (let vertex = 0; vertex < positions.count; vertex++) {
            vector.fromBufferAttribute(positions, vertex); mesh.applyBoneTransform(vertex, vector); vector.applyMatrix4(mesh.matrixWorld);
            assert(vector.toArray().every(Number.isFinite)); bounds.expandByPoint(vector); coordinates.push(vector.x, vector.y, vector.z);
          }
        }
        assert.equal(frame.skinnedVertexCount, coordinates.length / 3);
        assert.equal(hash(Buffer.from(new Int32Array(coordinates.map(value => Math.round(value * 10000))).buffer)), frame.quantizedSkinnedVertexSha256, key + ' at ' + index);
        const bonePositions = bones.map(bone => new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld).toArray());
        if (!first) {first = coordinates; firstBones = bonePositions;}
        else {
          maximumAdjacentRms = Math.max(maximumAdjacentRms, rms(previous, coordinates));
          bonePositions.forEach((position, n) => {if (Math.hypot(...position.map((value, axis) => value - firstBones[n][axis])) > 1e-7) moving.add(bones[n].name);});
        }
        if (!endpoint) lastPlayback = coordinates;
        previous = coordinates;
        for (const peer of pair) {
          const corresponding = endpoint ? peer.endpoint : peer.frames[index]; source(corresponding);
          assert.equal(corresponding.quantizedSkinnedVertexSha256, frame.quantizedSkinnedVertexSha256);
          assert.deepEqual(corresponding.pivot, peer.pivot);
        }
      }
      const height = bounds.max.y - bounds.min.y, endpointRms = rms(first, previous), playbackRms = rms(first, lastPlayback);
      assert(Math.abs(endpointRms - entry.measurements.seamRmsVertexDistance) < 1e-7);
      assert(Math.abs(height - entry.measurements.sourceBodyHeight) < 1e-7);
      assert(moving.size >= 3);
      const measurements = {sourceBodyHeight: height, endpointToFirstRms: endpointRms, playbackSeamRms: playbackRms,
        maximumAdjacentRms, endpointToFirstBodyHeightRatio: endpointRms / height, playbackSeamBodyHeightRatio: playbackRms / height,
        playbackSeamToMaximumAdjacentRatio: playbackRms / maximumAdjacentRms, nativeMovingBoneCount: moving.size};
      if (entry.reusedPublishedFrames) {
        for (const name of Object.keys(measurements)) assert(Math.abs(measurements[name] - review.neutralReview.measurements[name]) < 1e-7, name);
        assert(measurements.playbackSeamBodyHeightRatio <= .015); assert(measurements.playbackSeamToMaximumAdjacentRatio <= 1);
        for (const peer of pair) {assert.equal(peer.selectablePresentationVariant, true); assert.equal(peer.variantHabitat, 'aquatic'); assert.equal(peer.sourceActionCertified, false); assert.equal(peer.originalIdleActionCertified, false); assert.deepEqual(peer.admittedCombatStates, []);}
      }
      for (const peer of pair) {
        assert.equal(peer.sampleRate, 60); assert.equal(peer.fullNativeDuration, true); assert.equal(peer.recipe.geometryMirrored, false);
        assert.equal(peer.recipe.sourceGeometryEdited, false); assert.equal(peer.recipe.framesInterpolatedFromPng, false);
        assert.equal(peer.recipe.animationCameraFixed, true); assert.equal(peer.admittedTargetEdition, false);
      }
      checks.push({name: key, pass: true, sourcePosesReconstructed: entry.frameCount + 1,
        orientedPngsVerified: pair.reduce((total, peer) => total + peer.frameCount + 1, 0), reusedPublishedFrames: !!entry.reusedPublishedFrames, measurements});
      console.log('PASS ' + key + ' ' + JSON.stringify(measurements));
      mixer.stopAllAction(); mixer.uncacheRoot(object);
      for (const model of [body, object]) model.traverse(node => {node.geometry?.dispose(); node.skeleton?.dispose(); for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) material.dispose();});
    } catch (error) {checks.push({name: key, pass: false, error: error.stack}); console.error('FAIL ' + key + ': ' + error.message);}
  }
} finally {hook.deregister();}
const paths = ['tests/verify-native-motion-r33.mjs', lot + '/manifest.json', lot + '/inputs.json', lot + '/review/observations.json', lot + '/renderer.js',
  'modules/fidelity-r30/native/revelations/renderer.js', 'modules/fidelity-r30/native/other-games/renderer.js'];
const report = {schema: 're.bow.native-rig-tests-r33/1', passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length, checks,
  sourceFiles: paths.map(name => ({path: name, sha256: hash(fs.readFileSync(path.join(root, name)))})),
  scope: 'Independent full-skinned-mesh reconstruction at every actual sixtyHz native key and complete endpoint. Original source/material/texture bytes, UV correspondence, source root transforms, opposing cameras and real last-to-first loop seam checked. Geometry texture loading is a declared stub; browser media checks use actual retained PNGs. No action label, target edition or original idle is certified.'};
fs.writeFileSync(path.join(root, 'docs/R33_NATIVE_RIG_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
if (report.failed || report.passed !== 7) process.exitCode = 1;
