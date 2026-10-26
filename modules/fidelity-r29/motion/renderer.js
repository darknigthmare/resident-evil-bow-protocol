import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {verifiedBytes} from '../../fidelity-r24/models/verified-assets.js';

const root = new URL('../../../', import.meta.url);
const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
const decode = bytes => new TextDecoder('utf-8', {fatal: true}).decode(bytes);

function bindMaterials(object, reference, bindings, entry, record) {
  if (bindings.schema !== 're.bow.native-material-bindings-r24/1' || bindings.sourceArchiveSha256 !== entry.archive.sha256 || bindings.body.sourceSha256 !== entry.model.sha256) throw Error('Source material proof does not match the body.');
  const proof = bindings.clips.find(item => item.clipSourceSha256 === record.sha256 && item.bodySourceSha256 === entry.model.sha256);
  let meshes = 0; object.traverse(node => { if (node.isMesh) meshes++; });
  if (!proof || proof.matchedMeshes.length !== meshes) throw Error('Every moving mesh requires an exact material correspondence.');
  for (const match of proof.matchedMeshes) {
    const body = reference.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(match.bodyMeshName));
    const target = object.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(match.clipMeshName));
    if (!body?.isMesh || !target?.isMesh || Array.isArray(body.material)) throw Error('Material mesh is absent.');
    const sourceUV = body.geometry.getAttribute('uv'), targetUV = target.geometry.getAttribute('uv');
    if (!sourceUV || !targetUV || sourceUV.array.length !== targetUV.array.length || body.geometry.getAttribute('position').count !== target.geometry.getAttribute('position').count || !sourceUV.array.every((value, index) => value === targetUV.array[index])) throw Error('Source UV/topology correspondence changed.');
    target.material.dispose(); target.material = body.material.clone();
  }
  return meshes;
}

export async function renderNative(job) {
  const entry = job.entry, sourceBase = new URL(entry.base, new URL(job.sourceCatalog.path, root));
  if (job.actionIdentity !== 'unassigned' || job.availableCombatStates.length || entry.modelRole === 'associated-object' || job.nativeSampleTicks.length !== 16) throw Error('Only the selected source-body observations are supported.');
  const urls = [], geometries = new Set(), materials = new Set(), textures = new Set();
  let body, object, renderer, mixer;
  try {
    const [bodyRaw, clipRaw, proofRaw, images] = await Promise.all([
      verifiedBytes(entry.model, sourceBase, root), verifiedBytes(job.clipFile, root, root),
      verifiedBytes(entry.materialBindings, sourceBase, root), Promise.all(entry.textures.map(record => verifiedBytes(record, sourceBase, root)))
    ]);
    const aliases = new Map();
    for (const [index, record] of entry.textures.entries()) {
      const name = (record.name || record.path.split('/').pop()).toLowerCase();
      if (aliases.has(name)) { if (aliases.get(name).sha !== record.sha256) throw Error('Ambiguous source texture names.'); continue; }
      const url = URL.createObjectURL(new Blob([images[index]], {type: 'image/png'})); urls.push(url); aliases.set(name, {url, sha: record.sha256});
    }
    const manager = new THREE.LoadingManager(); let requested = false;
    const loaded = new Promise((resolve, reject) => {manager.onStart = () => {requested = true;}; manager.onLoad = resolve; manager.onError = () => reject(Error('Source texture decode failed.'));}); loaded.catch(() => {});
    manager.setURLModifier(value => {
      if (urls.includes(value)) return value;
      const name = decodeURIComponent(value).replaceAll('\\', '/').split('/').pop().toLowerCase();
      if (!aliases.has(name)) throw Error('Texture not present in verified source bytes: ' + name);
      return aliases.get(name).url;
    });
    const loader = new FBXLoader(manager);
    body = loader.parse(bodyRaw.buffer.slice(bodyRaw.byteOffset, bodyRaw.byteOffset + bodyRaw.byteLength), '');
    object = loader.parse(clipRaw.buffer.slice(clipRaw.byteOffset, clipRaw.byteOffset + clipRaw.byteLength), '');
    if (requested) await loaded;
    if (object.animations.length !== 1) throw Error('One original source animation is required.');
    const matchedMeshes = bindMaterials(object, body, JSON.parse(decode(proofRaw)), entry, job.sourceClip);
    for (const model of [body, object]) model.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
        materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    const skinned = []; object.traverse(node => { if (node.isSkinnedMesh) skinned.push(node); });
    if (!skinned.length) throw Error('The source must contain native weighted geometry.');
    const clip = object.animations[0]; mixer = new THREE.AnimationMixer(object);
    const action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true;
    const pose = seconds => {action.reset().play(); mixer.setTime(seconds); object.updateMatrixWorld(true);};
    const bounds = new THREE.Box3(), vector = new THREE.Vector3(), signatures = [], quantizedSignatures = [], positions = [];
    let baseline = null, maximumVertexDisplacement = 0, maximumPairwiseDistanceDelta = 0, firstDistances = null;
    const times = job.nativeSampleTicks.map(tick => Number(tick) / job.sourceClip.ticksPerSecond);
    for (const seconds of times) {
      pose(seconds); const coordinates = [], distances = [];
      for (const mesh of skinned) {
        const position = mesh.geometry.getAttribute('position'), samples = [];
        for (let index = 0; index < position.count; index++) {
          vector.fromBufferAttribute(position, index); mesh.applyBoneTransform(index, vector); vector.applyMatrix4(mesh.matrixWorld);
          if (!vector.toArray().every(Number.isFinite)) throw Error('Nonfinite source-skinned coordinates.');
          bounds.expandByPoint(vector); coordinates.push(vector.x, vector.y, vector.z);
          if (index % Math.max(1, Math.floor(position.count / 16)) === 0 && samples.length < 16) samples.push(vector.clone());
        }
        for (let first = 0; first < samples.length; first++) for (let second = first + 1; second < samples.length; second++) distances.push(samples[first].distanceTo(samples[second]));
      }
      if (baseline === null) {baseline = coordinates; firstDistances = distances;}
      else {
        for (let index = 0; index < coordinates.length; index++) maximumVertexDisplacement = Math.max(maximumVertexDisplacement, Math.abs(coordinates[index] - baseline[index]));
        for (let index = 0; index < distances.length; index++) maximumPairwiseDistanceDelta = Math.max(maximumPairwiseDistanceDelta, Math.abs(distances[index] - firstDistances[index]));
      }
      signatures.push(await hash(new Float64Array(coordinates)));
      // Measurement only: leave rendered coordinates untouched. Quantized hashes
      // permit independent runtimes to differ by floating-point interpolation ULPs.
      quantizedSignatures.push(await hash(new Int32Array(coordinates.map(value => Math.round(value * 10000)))));
      positions.push(coordinates.length / 3);
    }
    if (!(maximumVertexDisplacement > 0 && maximumPairwiseDistanceDelta > 1e-5)) throw Error('This selected scene does not demonstrate nonrigid body deformation.');
    const sphere = bounds.getBoundingSphere(new THREE.Sphere()), extent = sphere.radius * 1.12;
    const scene = new THREE.Scene(); scene.add(object, new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(1, 2, 3); scene.add(light);
    // These animated scenes place height on Y after the native FBX transforms.
    // Their unkeyed static bases may use a different source orientation.
    const camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, sphere.radius * .001, sphere.radius * 12); camera.up.set(0, 1, 0);
    const pointCamera = angle => {const radians = angle * Math.PI / 180; camera.position.copy(sphere.center).add(new THREE.Vector3(Math.sin(radians), .12, Math.cos(radians)).multiplyScalar(sphere.radius * 4)); camera.lookAt(sphere.center); camera.updateMatrixWorld(true);};
    pointCamera(45);
    const origin = new THREE.Vector3(0, 0, 0).project(camera);
    const pivot = {x: (origin.x + 1) * 192, y: (1 - origin.y) * 192, scope: 'fixed-projection-of-source-origin-not-anatomical-contact'};
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, preserveDrawingBuffer: true}); renderer.setPixelRatio(1); renderer.setSize(384, 384, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 384; const context = canvas.getContext('2d');
    async function capture() {
      renderer.render(scene, camera); context.clearRect(0, 0, 384, 384); context.drawImage(renderer.domElement, 0, 0);
      const rgba = context.getImageData(0, 0, 384, 384).data; let visible = 0, edge = 0, minX = 384, minY = 384, maxX = -1, maxY = -1;
      for (let index = 3; index < rgba.length; index += 4) if (rgba[index] > 0) {visible++; const pixel = (index - 3) / 4, x = pixel % 384, y = Math.floor(pixel / 384); if (!x || !y || x === 383 || y === 383) edge++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);}
      if (visible < 40 || edge) throw Error('The source body must be visible and wholly framed.');
      const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error('PNG export failed.')), 'image/png'));
      return {png: [...new Uint8Array(await blob.arrayBuffer())], width: 384, height: 384, visiblePixels: visible, edgePixels: edge, alphaBounds: {x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1}, rgbaSha256: await hash(rgba)};
    }
    const frames = [];
    for (const [index, seconds] of times.entries()) {pose(seconds); frames.push({...await capture(), ticks: job.nativeSampleTicks[index], seconds, pivot: {...pivot}, skinnedVertexSha256: signatures[index], quantizedSkinnedVertexSha256: quantizedSignatures[index], measurementQuantizationSourceUnits: .0001, skinnedVertexCount: positions[index]});}
    const poseViews = [];
    if (job.sourcePoseViews) {pose(0); for (const angle of [0, 90, 180, 270]) {pointCamera(angle); poseViews.push({...await capture(), angle, ticks: '0', seconds: 0, cameraPosition: camera.position.toArray()});}}
    return {frames, poseViews, measurements: {matchedMeshes, skinnedMeshes: skinned.length, maximumVertexDisplacement, maximumPairwiseDistanceDelta, nonrigidDeformationProven: true, uniqueSkinnedPoses: new Set(signatures).size},
      recipe: {projection: 'orthographic', cameraUp: [0, 1, 0], animationCameraAngle: 45, poseCameraAngles: [0, 90, 180, 270], cameraTarget: sphere.center.toArray(), cameraExtent: extent, sourceOriginPivot: pivot, cellSize: 384, animationCameraFixed: true, nativeSourceKeySamples: true, framesInterpolatedFromPng: false, geometryMirrored: false, bonesAdded: false, sourceGeometryEdited: false, sourceUnitsConvertedToMeters: false, renderedSampleUnionBounds: {min: bounds.min.toArray(), max: bounds.max.toArray()}, boundsScope: 'Union of the16 rendered native-key samples, not all intermediate clip instants.', lighting: {ambientIntensity: 2, directionalIntensity: 2, directionalPosition: [1, 2, 3], nativeGameLightingCertified: false}, library: 'Three.js0.180.0', outputColorSpace: 'sRGB', alpha: true}};
  } finally {
    if (mixer && object) {mixer.stopAllAction(); mixer.uncacheRoot(object);}
    for (const model of [body, object]) model?.traverse(node => node.skeleton?.dispose());
    for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose(); for (const texture of textures) texture.dispose();
    renderer?.dispose(); renderer?.forceContextLoss(); for (const url of urls) URL.revokeObjectURL(url);
  }
}
