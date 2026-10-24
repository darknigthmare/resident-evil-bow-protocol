/** Verify Three's shared-bone chains against all original Sea Creeper FBX scenes.
 * Texture loading is stubbed: this is a source/hash/binding/matrix test, not a
 * visual material, native-game rig provenance or hardware certification.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {registerHooks} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const delivery = path.join(root, 'modules/fidelity-r24');
const vendor = path.join(delivery, 'models/vendor/three');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(name, 'utf8'));
const vendorManifest = read(path.join(vendor, 'manifest.json'));
assert.equal(vendorManifest.version, '0.180.0');
for (const record of vendorManifest.files) {
  const bytes = fs.readFileSync(path.join(vendor, record.path));
  assert.equal(bytes.byteLength, record.bytes, record.path + ' vendor size');
  assert.equal(sha(bytes), record.sha256, record.path + ' vendor hash');
}

// Node 22.16 supports a scoped resolver; use exactly the vendored browser
// library rather than an unrelated npm/global Three installation.
const threeURL = pathToFileURL(path.join(vendor, 'build/three.module.min.js')).href;
const resolver = registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return {url: threeURL, shortCircuit: true};
  return nextResolve(specifier, context);
}});
try {
  const THREE = await import(threeURL);
  const {FBXLoader} = await import(pathToFileURL(path.join(vendor, 'examples/jsm/loaders/FBXLoader.js')).href);
  const {unzipSync} = await import(pathToFileURL(path.join(vendor, 'examples/jsm/libs/fflate.module.js')).href);
  const catalogue = read(path.join(delivery, 'models/catalog.json'));
  const entry = catalogue.entries.find(item => item.id === 'rerev-sea-creeper');
  const motionBytes = fs.readFileSync(path.join(delivery, 'motion/manifest.json'));
  const motion = JSON.parse(motionBytes.toString('utf8'));
  assert.equal(sha(motionBytes), catalogue.inputs.find(item => item.path === 'modules/fidelity-r24/motion/manifest.json')?.sha256,
    'Viewer catalogue must use the frozen source classification');
  const classifiedSource = motion.entries.find(item => item.id === 'rerev-sea-creeper');
  assert.deepEqual(entry.clips, classifiedSource.clips, 'Viewer classification must preserve all source clip records');
  assert(entry, 'Sea Creeper must remain in the source catalogue');
  assert.equal(entry.clips.length, 48, 'All 48 published clips must be tested');
  const archive = fs.readFileSync(path.join(delivery, 'motion', entry.archive.path));
  assert.equal(archive.byteLength, entry.archive.bytes);
  assert.equal(sha(archive), entry.archive.sha256, 'Original source ZIP');
  const checks = [];
  for (const record of entry.clips) {
    const bytes = record.path ? fs.readFileSync(path.join(delivery, 'motion', record.path))
      : unzipSync(archive, {filter: member => member.name === record.member && member.originalSize === record.bytes})[record.member];
    assert(bytes, record.id + ' source member exists');
    assert.equal(bytes.byteLength, record.bytes, record.id + ' source size');
    assert.equal(sha(bytes), record.sha256, record.id + ' source hash');
    const manager = new THREE.LoadingManager();
    manager.addHandler(/.*/, {path: '', setPath(value) { this.path = value; return this; }, load() { return new THREE.Texture(); }});
    const object = new FBXLoader(manager).parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const groups = new Map(), skinnedMeshes = [];
    object.traverse(node => {
      if (node.isBone) {
        if (!groups.has(node.name)) groups.set(node.name, []);
        groups.get(node.name).push(node);
      }
      if (node.isSkinnedMesh) skinnedMeshes.push(node);
    });
    assert.equal(skinnedMeshes.length, record.skinCount, record.id + ' published skins');
    assert.deepEqual([...groups.keys()].sort(), [...record.boneNames].sort(), record.id + ' original bone names');
    assert.equal(object.animations.length, 1, record.id + ' unique original animation');
    const clip = object.animations[0], animatedNames = new Set();
    for (const track of clip.tracks) {
      const parsed = THREE.PropertyBinding.parseTrackName(track.name);
      const node = THREE.PropertyBinding.findNode(object, parsed.nodeName);
      assert(node, record.id + ' track target exists: ' + track.name);
      assert(!(node.parent?.isBone && node.parent.name === node.name), record.id + ' track must bind outer shared-bone node');
      animatedNames.add(node.name);
    }
    assert.deepEqual([...animatedNames].sort(), [...record.animatedModelNames].sort(), record.id + ' original animated targets, including Null root');
    const mixer = new THREE.AnimationMixer(object), action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    let maximumWorldDivergence = 0, maximumSkinnedWorldVertexDisplacement = 0, referenceVertices = null;
    const vector = new THREE.Vector3();
    const sampleSeconds = [0, clip.duration * .25, clip.duration * .5, clip.duration * .75, clip.duration];
    for (const time of sampleSeconds) {
      action.reset().play(); mixer.setTime(time); object.updateMatrixWorld(true);
      const posedVertices = [];
      for (const mesh of skinnedMeshes) {
        const position = mesh.geometry.getAttribute('position');
        for (let index = 0; index < position.count; index++) {
          vector.fromBufferAttribute(position, index); mesh.applyBoneTransform(index, vector); vector.applyMatrix4(mesh.matrixWorld);
          assert(vector.toArray().every(Number.isFinite), record.id + ' finite skinned world vertices');
          posedVertices.push(vector.x, vector.y, vector.z);
        }
      }
      if (referenceVertices === null) referenceVertices = posedVertices;
      else for (let index = 0; index < posedVertices.length; index++) {
        maximumSkinnedWorldVertexDisplacement = Math.max(maximumSkinnedWorldVertexDisplacement,
          Math.abs(posedVertices[index] - referenceVertices[index]));
      }
      for (const copies of groups.values()) {
        const expected = copies[0].matrixWorld.elements;
        for (const copy of copies.slice(1)) {
          const difference = Math.max(...expected.map((value, index) => Math.abs(value - copy.matrixWorld.elements[index])));
          assert(Number.isFinite(difference), record.id + ' finite shared-bone transforms');
          maximumWorldDivergence = Math.max(maximumWorldDivergence, difference);
          assert(difference <= 1e-6, record.id + ' shared copies must inherit the same animated world transform');
        }
      }
    }
    assert.equal(typeof record.positiveTimePoseOnly, 'boolean', record.id + ' requires an explicit positive-time classification');
    if (record.positiveTimePoseOnly) {
      assert.equal(record.varyingNonnegativeAnimationCurveCount, 0, record.id + ' source curves are constant after zero');
      assert.equal(maximumSkinnedWorldVertexDisplacement, 0, record.id + ' fixed pose must stay geometrically fixed after zero');
    } else {
      assert(record.varyingNonnegativeAnimationCurveCount > 0, record.id + ' source curves must vary after zero');
      assert(maximumSkinnedWorldVertexDisplacement > 0, record.id + ' a claimed movement must actually deform skinned world vertices');
    }
    checks.push({id: record.id, skinnedMeshes: skinnedMeshes.length, uniqueBoneNames: groups.size,
      boneObjects: [...groups.values()].reduce((count, copies) => count + copies.length, 0),
      animatedTargetsIncludingNullRoot: animatedNames.size, sampleSeconds, maximumWorldDivergence,
      positiveTimePoseOnly: record.positiveTimePoseOnly, maximumSkinnedWorldVertexDisplacement});
    mixer.stopAllAction(); mixer.uncacheRoot(object);
    object.traverse(node => { node.geometry?.dispose(); node.skeleton?.dispose();
      for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) material.dispose(); });
  }
  const positiveTimeMotionFiles = checks.filter(item => !item.positiveTimePoseOnly).length;
  const positiveTimePoseFiles = checks.filter(item => item.positiveTimePoseOnly).length;
  assert.equal(positiveTimeMotionFiles, motion.summary.positiveTimeMotionFiles);
  assert.equal(positiveTimePoseFiles, motion.summary.positiveTimePoseFiles);
  assert.equal(positiveTimeMotionFiles, 47, 'The source pack contains 47 actual positive-time movements');
  assert.equal(positiveTimePoseFiles, 1, 'The source pack preserves its one fixed positive-time pose');
  assert.deepEqual(checks.filter(item => item.positiveTimePoseOnly).map(item => item.id), ['em1200_em1201_BA_1']);
  console.log(JSON.stringify({schema: 're.bow.model-skeleton-binding-check/1', passed: checks.length, failed: 0,
    library: 'vendored Three.js 0.180.0', sourceFilesRewritten: false, nativeGameRigOriginCertified: false,
    positiveTimeMotionFiles, positiveTimePoseFiles,
    scope: 'All 48 original scenes, original target names, shared-bone world matrices and all skinned world vertices at five samples; textures and visual rendering excluded.', checks}, null, 2));
} finally {
  resolver.deregister();
}
