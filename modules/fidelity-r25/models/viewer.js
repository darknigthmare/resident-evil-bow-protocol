import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {ColladaLoader} from 'three/addons/loaders/ColladaLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {unzipSync} from 'three/addons/libs/fflate.module.js';
import {assetURL, verifiedBytes} from '../../fidelity-r24/models/verified-assets.js';
import {verifiedArchive} from './bounded-archive.js';

const $ = id => document.getElementById(id);
const base = new URL('./', import.meta.url), allowed = new URL('../../', base);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#151f22');
const camera = new THREE.PerspectiveCamera(38, 1, .01, 1000);
let renderer, controls, active = null, generation = 0, abort = null, archiveCache = null;
let catalog = [], selected = null, clipRecord = null, mixer = null, action = null, skeleton = null;
let playing = false, time = 0, lastTime = 0, raf = 0, duration = 0, keys = [], stats = null, cleanup = () => {};
let initialDistance = 1, boundsRadius = 1, target = new THREE.Vector3(), loading = false;
let graphicsState = 'uninitialized', sizeObserver = null, previewURL = null, previewVerified = false, retainedView = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const cameraButtons = ['turnLeft', 'turnRight', 'tiltUp', 'tiltDown', 'opposite', 'resetView', 'framePose', 'zoomIn', 'zoomOut'];
const clipButtons = ['previousKey', 'playToggle', 'nextKey', 'restartClip', 'timePosition'];
const decoder = new TextDecoder('utf-8', {fatal: true});
const hash = async data => [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(v => v.toString(16).padStart(2, '0')).join('');

function render() {
  if (!renderer || graphicsState !== 'ready' || document.hidden) return;
  skeleton?.updateMatrixWorld(true); renderer.render(scene, camera);
}
function resize() {
  if (!renderer) return;
  const {width, height} = $('viewport').getBoundingClientRect();
  renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
  if (active && controls) {
    const ratio = camera.position.distanceTo(controls.target) / initialDistance;
    initialDistance = fitDistance();
    camera.position.sub(controls.target).setLength(initialDistance * ratio).add(controls.target); controls.update();
  }
  render();
}
function initRenderer() {
  if (renderer) return graphicsState === 'ready';
  try { renderer = new THREE.WebGLRenderer({antialias: true, alpha: false}); }
  catch { graphicsState = 'unavailable'; return false; }
  graphicsState = 'ready';
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', 'Aperçu du modèle source');
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-describedby', 'viewHint');
  renderer.domElement.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown + - Home Space');
  renderer.domElement.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || !active || loading || graphicsState !== 'ready') return;
    const command = {ArrowLeft: () => cameraTurn(-Math.PI / 12), ArrowRight: () => cameraTurn(Math.PI / 12),
      ArrowUp: () => cameraTilt(Math.PI / 12), ArrowDown: () => cameraTilt(-Math.PI / 12),
      '+': () => cameraZoom(.8), '=': () => cameraZoom(.8), '-': () => cameraZoom(1.25),
      Home: cameraReset, ' ': () => playing ? pause() : play()}[event.key];
    if (command) { event.preventDefault(); if (!event.repeat || event.key !== ' ') command(); }
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); retainedView = {id: selected?.id, clip: clipRecord?.id || null, time};
    graphicsState = 'lost'; pause(); generation++; abort?.abort(); loading = false;
    clearActive(); renderer.domElement.hidden = true; updateControls();
    $('screenMessage').hidden = false; $('screenMessage').textContent = 'L’aperçu 3D a été interrompu.';
    message('L’aperçu 3D a été interrompu. La lecture reste en pause ; les sources sont disponibles.'); $('retry').hidden = false;
    if (selected) showFallback(selected, generation);
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    graphicsState = 'ready'; renderer.domElement.hidden = false;
    if (selected) load(selected, clipRecord);
  });
  $('viewport').append(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
  controls.enablePan = true; controls.autoRotate = false; controls.addEventListener('change', render);
  sizeObserver = new ResizeObserver(resize); sizeObserver.observe($('viewport')); resize(); return true;
}
function message(value) { $('modelStatus').textContent = value; }
function updateControls() {
  const ready = !!active && !loading && graphicsState === 'ready';
  for (const id of cameraButtons) $(id).disabled = !ready;
  $('showBones').disabled = !ready || !stats?.bones;
  const animated = ready && !!action;
  for (const id of clipButtons) $(id).disabled = !animated;
  $('playToggle').disabled = !animated || clipRecord?.positiveTimePoseOnly === true;
  $('previousKey').disabled = !animated || time <= 0;
  $('nextKey').disabled = !animated || time >= duration;
  $('playToggle').textContent = clipRecord?.positiveTimePoseOnly === true ? 'Pose fixe' : playing ? 'Pause' : time >= duration && duration > 0 ? 'Relire' : 'Lire';
}
function updateTime() {
  $('timePosition').value = String(time);
  const text = `${time.toLocaleString('fr-FR', {maximumFractionDigits: 3})} s / ${duration.toLocaleString('fr-FR', {maximumFractionDigits: 3})} s`;
  $('timeCounter').textContent = text; $('timePosition').setAttribute('aria-valuetext', text); updateControls();
}
function pause() { playing = false; cancelAnimationFrame(raf); raf = 0; updateControls(); }
function seek(value) {
  if (!mixer || !action) return;
  pause(); time = Math.max(0, Math.min(duration, Number(value) || 0));
  action.reset().play(); mixer.setTime(time); updateTime(); render();
}
function tick(now) {
  if (!playing || !mixer || document.hidden) return;
  const step = Math.max(0, (now - lastTime) / 1000); lastTime = now;
  time = Math.min(duration, time + step); mixer.update(step); updateTime(); render();
  if (time >= duration) { seek(duration); message('Mouvement terminé.'); return; }
  raf = requestAnimationFrame(tick);
}
function play() {
  if (!action || loading || document.hidden || graphicsState !== 'ready' || clipRecord?.positiveTimePoseOnly === true) return;
  if (time >= duration) seek(0);
  playing = true; lastTime = performance.now(); updateControls(); raf = requestAnimationFrame(tick);
}
function disposeObject(object, preserveTextures = new Set()) {
  if (!object) return;
  const textures = new Set(), materials = new Set(), geometries = new Set();
  object.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
      materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
    node.skeleton?.dispose();
  });
  for (const texture of textures) if (!preserveTextures.has(texture)) texture.dispose();
  for (const material of materials) material.dispose(); for (const geometry of geometries) geometry.dispose();
}
function objectTextures(object) {
  const result = new Set();
  object.traverse(node => { for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
    for (const value of Object.values(material)) if (value?.isTexture) result.add(value);
  } });
  return result;
}
function clearActive() {
  cleanup(); cleanup = () => {};
  mixer?.stopAllAction(); if (mixer && active) mixer.uncacheRoot(active);
  if (active) { scene.remove(active); disposeObject(active); }
  active = null; mixer = null; action = null;
  if (skeleton) { scene.remove(skeleton); skeleton.dispose(); skeleton = null; }
}
function clearFallback() {
  $('fallbackImage').removeAttribute('src'); $('sourceFallback').hidden = true; previewVerified = false;
  if (previewURL) URL.revokeObjectURL(previewURL); previewURL = null;
}
async function showFallback(entry, token) {
  clearFallback();
  if (!entry.preview) return;
  let ownURL = null;
  try {
    const bytes = await verifiedBytes(entry.preview, new URL(entry.base, base), allowed, graphicsState === 'lost' ? undefined : abort?.signal);
    if (token !== generation) return;
    ownURL = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
    const image = new Image(); image.src = ownURL; await image.decode();
    if (token !== generation) { URL.revokeObjectURL(ownURL); return; }
    previewURL = ownURL; previewVerified = true;
    $('fallbackImage').alt = 'Aperçu publié de ' + entry.label + ' — ' + entry.game;
    $('fallbackImage').src = ownURL; $('sourceFallback').hidden = false; $('screenMessage').hidden = true;
  } catch (error) {
    if (ownURL) URL.revokeObjectURL(ownURL);
    if (token === generation && error.name !== 'AbortError') $('fallbackCaption').textContent = 'L’image publiée ne peut pas être vérifiée. Consultez les fichiers sources.';
  }
}
function applySourceMaterials(object, reference, bindings, entry, record) {
  if (bindings.schema !== 're.bow.native-material-bindings-r24/1' || bindings.sourceArchiveSha256 !== entry.archive.sha256
    || bindings.body.sourceSha256 !== entry.model.sha256) throw Error('La preuve des matériaux ne correspond pas au corps source.');
  const proof = bindings.clips.find(item => item.clipSourceSha256 === record.sha256 && item.bodySourceSha256 === entry.model.sha256);
  let meshCount = 0; object.traverse(node => { if (node.isMesh) meshCount++; });
  if (!proof || !proof.matchedMeshes.length || proof.matchedMeshes.length !== meshCount
    || new Set(proof.matchedMeshes.map(item => item.clipMeshName)).size !== meshCount) throw Error('Correspondance native des matériaux absente.');
  for (const match of proof.matchedMeshes) {
    const body = reference.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(match.bodyMeshName));
    const target = object.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(match.clipMeshName));
    if (!body?.isMesh || !target?.isMesh || Array.isArray(body.material)) throw Error('Maillage des matériaux non identifié.');
    const sourceUV = body.geometry.getAttribute('uv'), targetUV = target.geometry.getAttribute('uv');
    if (!sourceUV || !targetUV || sourceUV.array.length !== targetUV.array.length
      || body.geometry.getAttribute('position').count !== target.geometry.getAttribute('position').count
      || !sourceUV.array.every((value, index) => value === targetUV.array[index])) throw Error('Les coordonnées de texture diffèrent du corps source.');
    target.material.dispose(); target.material = body.material.clone();
  }
}
async function sourceBytes(record, entry, signal) {
  const assetBase = new URL(entry.base, base);
  if (record.path) return verifiedBytes(record, assetBase, allowed, signal);
  if (!entry.archive || typeof record.member !== 'string' || record.member.length > 600 || record.member.includes('..')
    || !Number.isSafeInteger(record.bytes) || record.bytes < 1 || record.bytes > 12 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(record.sha256)) throw Error('Membre animé invalide.');
  const archiveURL = assetURL(entry.archive, assetBase, allowed).href;
  let bytes = archiveCache?.url === archiveURL ? archiveCache.bytes : null;
  if (!bytes) {
    bytes = await verifiedArchive(entry.archive, assetBase, allowed, signal);
    if (signal.aborted) throw new DOMException('Chargement interrompu.', 'AbortError');
    archiveCache = {url: archiveURL, bytes};
  }
  const result = unzipSync(bytes, {filter: file => file.name === record.member && file.originalSize === record.bytes});
  const extracted = result[record.member];
  if (!extracted || extracted.byteLength !== record.bytes || await hash(extracted) !== record.sha256) throw Error('Le mouvement extrait diffère du fichier publié.');
  return extracted;
}
function sourceLinks(entry) {
  $('limits').replaceChildren(...(entry.limitations || []).map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  const fragment = document.createDocumentFragment();
  if (entry.sourcePage) {
    const url = new URL(entry.sourcePage);
    if (url.protocol === 'https:') { const a = document.createElement('a'); a.href = url.href; a.textContent = 'Notice de la source'; a.target = '_blank'; a.rel = 'noopener noreferrer'; fragment.append(a); }
  }
  if (entry.archive) {
    const a = document.createElement('a'); a.href = assetURL(entry.archive, new URL(entry.base, base), allowed).href;
    a.download = ''; a.textContent = 'Archive originale'; fragment.append(a);
  }
  $('sourceLinks').replaceChildren(fragment);
}
function cameraReset() {
  const up = new THREE.Vector3(...(selected?.viewCamera?.up || [0, 1, 0])).normalize();
  const direction = new THREE.Vector3(...(selected?.viewCamera?.direction || [0, 0, 1])).normalize();
  if (!camera.up.equals(up)) {
    const minimum = controls.minDistance, maximum = controls.maxDistance;
    camera.up.copy(up); controls.dispose(); controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; controls.enablePan = true; controls.autoRotate = false;
    controls.minDistance = minimum; controls.maxDistance = maximum; controls.addEventListener('change', render);
  }
  camera.position.copy(target).addScaledVector(direction, initialDistance).addScaledVector(up, initialDistance * .08);
  camera.up.copy(up); controls.target.copy(target); controls.update(); render();
}
function fitDistance() {
  const vertical = THREE.MathUtils.degToRad(camera.fov);
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
  return boundsRadius / Math.sin(Math.min(vertical, horizontal) / 2) * 1.06;
}
function framePose() {
  if (!active) return;
  active.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(active, true), size = bounds.getSize(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(extent) || extent <= 0 || extent > 1e9) throw Error('Dimensions du modèle invalides.');
  target = bounds.getCenter(new THREE.Vector3()); boundsRadius = size.length() / 2; initialDistance = fitDistance();
  camera.near = Math.max(extent / 10000, .00001); camera.far = extent * 1000; camera.updateProjectionMatrix();
  controls.minDistance = extent * .15; controls.maxDistance = Math.max(extent * 20, initialDistance * 4); cameraReset();
}
function cameraTurn(angle) {
  const offset = camera.position.clone().sub(controls.target).applyAxisAngle(camera.up, angle);
  camera.position.copy(controls.target).add(offset); controls.update(); render();
}
function cameraTilt(angle) {
  const offset = camera.position.clone().sub(controls.target), up = camera.up.clone().normalize();
  const right = offset.clone().cross(up).normalize();
  const next = offset.clone().applyAxisAngle(right, angle);
  if (Math.abs(next.clone().normalize().dot(up)) < .985) {
    camera.position.copy(controls.target).add(next); controls.update(); render();
  }
}
function cameraZoom(factor) {
  const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
  offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length())));
  camera.position.copy(controls.target).add(offset); controls.update(); render();
}
function measure(object) {
  let meshes = 0, skinnedMeshes = 0, vertices = 0, triangles = 0; const bones = new Set();
  object.traverse(node => {
    if (node.isBone) bones.add(node.name || node.uuid);
    if (node.isMesh) {
      meshes++; skinnedMeshes += Number(!!node.isSkinnedMesh);
      const position = node.geometry.getAttribute('position'); vertices += position?.count || 0;
      triangles += (node.geometry.index?.count || position?.count || 0) / 3;
      for (const attribute of Object.values(node.geometry.attributes)) for (const value of attribute.array) if (!Number.isFinite(value)) throw Error('Coordonnées du modèle invalides.');
    }
  });
  if (!meshes || vertices > 3_000_000 || !Number.isFinite(vertices)) throw Error('Géométrie absente ou trop volumineuse.');
  return {meshes, skinnedMeshes, vertices, triangles, bones: bones.size};
}
function neutralTextures(object) {
  const incomplete = new Set();
  object.traverse(node => {
    if (!node.isMesh) return;
    const replace = material => {
      let map = material.map || null;
      if (map?.userData.r25MissingSourceReference) {
        const name = map.userData.r25MissingSourceReference;
        const proof = selected.unresolvedTextureReferences?.find(item => item.sourceModelSha256 === selected.model.sha256
          && item.rawFileName === name && item.rawReference === name && item.property === 'DiffuseColor'
          && item.archiveMemberMissing === true && item.meshNames?.includes(node.name));
        if (!proof) throw Error('Matériau absent sans preuve pour ce maillage.');
        incomplete.add(node.name); map.dispose(); map = null;
      }
      const next = new THREE.MeshBasicMaterial({map, color: material.color || 0xffffff,
        transparent: material.transparent, opacity: material.opacity, alphaTest: material.alphaTest, side: material.side});
      // The original files remain available; this examination uses no invented light source.
      material.dispose(); return next;
    };
    node.material = Array.isArray(node.material) ? node.material.map(replace) : replace(node.material);
  });
  return incomplete.size;
}
async function load(entry, record = null) {
  pause(); const token = ++generation; abort?.abort(); abort = new AbortController();
  clearActive(); clearFallback();
  loading = true; stats = null; time = duration = 0; keys = []; selected = entry; clipRecord = record;
  $('showBones').checked = false; $('retry').hidden = true; $('screenMessage').hidden = false;
  $('screenMessage').textContent = 'Vérification des fichiers sources…'; updateControls();
  $('modelTitle').textContent = entry.label; $('modelGame').textContent = entry.game + (entry.platform ? ' · ' + entry.platform : '');
  $('geometryInfo').textContent = '';
  $('materialNotice').hidden = true; $('materialNotice').textContent = '';
  $('fallbackCaption').textContent = 'Image publiée avec l’archive. Elle ne montre pas le mouvement sélectionné.';
  message(record ? 'Chargement du mouvement publié…' : 'Chargement du modèle publié…');
  const localAbort = abort, urls = [], orphanMaterials = new Set(); let object = null, reference = null;
  const releaseURLs = () => { for (const url of urls) URL.revokeObjectURL(url); urls.length = 0; };
  cleanup = releaseURLs;
  try {
    sourceLinks(entry);
    if (!initRenderer()) {
      loading = false; updateControls();
      $('screenMessage').textContent = graphicsState === 'lost' ? 'L’aperçu 3D a été interrompu.' : 'L’aperçu 3D est indisponible dans ce navigateur.';
      message('L’aperçu 3D est indisponible. Les notices, images publiées et fichiers sources restent consultables.');
      $('retry').hidden = false; await showFallback(entry, token); return;
    }
    const textures = entry.textures || [];
    if (textures.length > 80) throw Error('Trop de textures dans ce modèle.');
    const assetBase = new URL(entry.base, base), sourceRecord = record || entry.model;
    const [modelBytes, textureBytes, mtlBytes, referenceBytes, bindingBytes] = await Promise.all([
      sourceBytes(sourceRecord, entry, localAbort.signal),
      Promise.all(textures.map(texture => verifiedBytes(texture, assetBase, allowed, localAbort.signal))),
      !record && entry.materials ? verifiedBytes(entry.materials, assetBase, allowed, localAbort.signal) : null,
      record && entry.materialBindings ? sourceBytes(entry.model, entry, localAbort.signal) : null,
      record && entry.materialBindings ? verifiedBytes(entry.materialBindings, assetBase, allowed, localAbort.signal) : null
    ]);
    if (token !== generation) { releaseURLs(); return; }
    const aliases = new Map();
    textures.forEach((texture, index) => {
      const extension = texture.path.split('.').pop().toLowerCase();
      const mime = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', bmp: 'image/bmp'}[extension];
      if (!mime) throw Error('Format de texture non pris en charge.');
      const url = URL.createObjectURL(new Blob([textureBytes[index]], {type: mime})); urls.push(url);
      const name = (texture.name || texture.path.split('/').pop()).toLowerCase();
      if (aliases.has(name) && aliases.get(name).sha256 !== texture.sha256) throw Error('Noms de textures ambigus.');
      aliases.set(name, {url, sha256: texture.sha256});
    });
    const manager = new THREE.LoadingManager(); let requested = false;
    const imagesReady = new Promise((resolve, reject) => {
      manager.onStart = () => { requested = true; };
      manager.onLoad = resolve; manager.onError = () => reject(Error('Une texture publiée ne peut pas être décodée.'));
    });
    // Register the rejection immediately, including parser failures before awaiting loads.
    imagesReady.catch(() => {});
    if (!record && entry.format === 'FBX' && entry.unresolvedTextureReferences?.length) {
      const proofs = entry.unresolvedTextureReferences;
      if (proofs.length > 80 || proofs.some(item => item.sourceModelSha256 !== entry.model.sha256
        || item.archiveMemberMissing !== true || item.rawFileName !== 'unknownmaterial'
        || item.rawReference !== 'unknownmaterial' || item.property !== 'DiffuseColor'
        || !Array.isArray(item.meshNames) || !item.meshNames.length)) throw Error('Preuve de matériau absent invalide.');
      manager.addHandler(/^\.unknownmaterial$/, {path: '', setPath(value) { this.path = value; return this; }, load(value) {
        if (value !== 'unknownmaterial') throw Error('Référence de texture non prouvée.');
        const empty = new THREE.Texture(); empty.userData.r25MissingSourceReference = value; return empty;
      }});
    }
    manager.setURLModifier(value => {
      if (urls.includes(value)) return value;
      const name = decodeURIComponent(value).replace(/\\/g, '/').split('/').pop().toLowerCase();
      const item = aliases.get(name);
      if (!item) throw Error('Texture non présente dans les fichiers vérifiés : ' + name.slice(0, 100));
      return item.url;
    });
    if ((record ? 'FBX' : entry.format) === 'FBX') {
      object = new FBXLoader(manager).parse(modelBytes.buffer.slice(modelBytes.byteOffset, modelBytes.byteOffset + modelBytes.byteLength), '');
      if (referenceBytes) reference = new FBXLoader(manager).parse(referenceBytes.buffer.slice(referenceBytes.byteOffset, referenceBytes.byteOffset + referenceBytes.byteLength), '');
    } else if (entry.format === 'COLLADA') {
      const text = decoder.decode(modelBytes);
      if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('Déclaration XML externe refusée.');
      object = new ColladaLoader(manager).parse(text, '').scene;
    } else if (entry.format === 'OBJ') {
      const loader = new OBJLoader(manager);
      if (mtlBytes) {
        const materialCreator = new MTLLoader(manager).parse(decoder.decode(mtlBytes), '');
        materialCreator.preload(); for (const material of Object.values(materialCreator.materials)) orphanMaterials.add(material);
        loader.setMaterials(materialCreator);
      }
      object = loader.parse(decoder.decode(modelBytes));
    } else throw Error('Format de modèle non pris en charge.');
    if (requested) await imagesReady;
    if (token !== generation) { disposeObject(object); disposeObject(reference); releaseURLs(); return; }
    if (reference) applySourceMaterials(object, reference, JSON.parse(decoder.decode(bindingBytes)), entry, record);
    stats = measure(object); stats.incompleteMaterialMeshes = neutralTextures(object);
    if (reference) { disposeObject(reference, objectTextures(object)); reference = null; }
    stats.texturedMeshes = 0; object.traverse(node => { if (node.isMesh && (Array.isArray(node.material) ? node.material : [node.material]).some(material => !!material.map)) stats.texturedMeshes++; });
    object.updateMatrixWorld(true);
    active = object; scene.add(active);
    if (stats.bones) { skeleton = new THREE.SkeletonHelper(active); skeleton.visible = false; scene.add(skeleton); }
    if (record) {
      const clips = object.animations || [];
      if (clips.length !== 1 || clips[0].duration <= 0) throw Error('Le fichier ne contient pas un mouvement unique lisible.');
      const clip = clips[0]; duration = clip.duration;
      const expectedDuration = record.durationSeconds ?? record.duration;
      if (Number.isFinite(expectedDuration) && Math.abs(duration - expectedDuration) > .003) throw Error('Les durées publiées et décodées ne correspondent pas.');
      const names = new Set(); object.traverse(node => { names.add(node.name); names.add(node.uuid); });
      for (const track of clip.tracks) {
        const parsed = THREE.PropertyBinding.parseTrackName(track.name);
        if (!THREE.PropertyBinding.findNode(object, parsed.nodeName)) throw Error('Une piste ne cible aucun os de cette scène.');
      }
      keys = [...new Set(clip.tracks.flatMap(track => Array.from(track.times)))].filter(value => value >= 0 && value <= duration).sort((a, b) => a - b);
      mixer = new THREE.AnimationMixer(active); action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true;
      action.play(); mixer.setTime(0);
      stats.animationTracks = clip.tracks.length; stats.sourceKeys = keys.length;
      $('timePosition').max = String(duration); updateTime();
    }
    framePose();
    loading = false; $('screenMessage').hidden = true;
    $('geometryInfo').textContent = `${stats.meshes} maillage(s) · ${Math.round(stats.triangles).toLocaleString('fr-FR')} triangles · ${stats.bones} os publiés · ${stats.skinnedMeshes} maillage(s) pondéré(s) · ${stats.texturedMeshes} maillage(s) texturé(s)`;
    $('materialNotice').hidden = !stats.incompleteMaterialMeshes;
    $('materialNotice').textContent = stats.incompleteMaterialMeshes
      ? `${stats.incompleteMaterialMeshes} maillage(s) affiché(s) sans leur texture absente de l’archive. Aucun matériau de remplacement n’est ajouté.` : '';
    updateControls(); render(); releaseURLs();
    if (retainedView?.id === entry.id && retainedView.clip === (record?.id || null)) {
      if (record) { seek(retainedView.time); framePose(); } retainedView = null;
    }
    message(record?.positiveTimePoseOnly === true ? 'Pose source fixe après zéro. La pré-clé négative reste conservée dans le fichier.'
      : record ? 'Mouvement vérifié, en pause. Examinez les clés ou lancez la lecture.' : 'Modèle vérifié. Les changements de vue déplacent la caméra.');
  } catch (error) {
    if (token !== generation) { if (object && object !== active) disposeObject(object); disposeObject(reference); releaseURLs(); return; }
    loading = false; pause();
    if (active) { scene.remove(active); disposeObject(active); active = null; }
    else if (object) disposeObject(object);
    disposeObject(reference);
    for (const material of orphanMaterials) material.dispose();
    if (skeleton) { scene.remove(skeleton); skeleton.dispose(); skeleton = null; }
    releaseURLs(); updateControls(); render();
    $('screenMessage').hidden = false; $('screenMessage').textContent = 'Aperçu indisponible.';
    message(error.message || 'Le modèle ne peut pas être chargé.'); $('retry').hidden = false;
  }
}
function choose(id) {
  const entry = catalog.find(item => item.id === id); if (!entry) return;
  retainedView = null;
  const clips = entry.clips || [];
  $('animationSection').hidden = !clips.length;
  $('clipSelect').replaceChildren();
  for (const clip of clips) { const option = document.createElement('option'); option.value = clip.id; option.textContent = (clip.label || clip.id) + (clip.positiveTimePoseOnly === true ? ' — pose fixe après zéro' : ''); $('clipSelect').append(option); }
  $('clipSelect').disabled = !clips.length;
  const requested = new URLSearchParams(location.search).get('clip');
  const clip = clips.find(item => item.id === requested) || clips[0] || null;
  if (clip) $('clipSelect').value = clip.id;
  load(entry, clip);
}
$('modelSelect').addEventListener('change', event => choose(event.target.value));
$('clipSelect').addEventListener('change', event => { const clip = selected?.clips?.find(item => item.id === event.target.value); if (clip) load(selected, clip); });
$('retry').addEventListener('click', () => selected ? load(selected, clipRecord) : start());
$('turnLeft').addEventListener('click', () => cameraTurn(-Math.PI / 2)); $('turnRight').addEventListener('click', () => cameraTurn(Math.PI / 2));
$('opposite').addEventListener('click', () => cameraTurn(Math.PI)); $('resetView').addEventListener('click', cameraReset);
$('framePose').addEventListener('click', framePose);
$('tiltUp').addEventListener('click', () => cameraTilt(Math.PI / 12)); $('tiltDown').addEventListener('click', () => cameraTilt(-Math.PI / 12));
for (const [id, factor] of [['zoomIn', .8], ['zoomOut', 1.25]]) $(id).addEventListener('click', () => cameraZoom(factor));
$('showBones').addEventListener('change', event => { if (skeleton) { skeleton.visible = event.target.checked; render(); } });
$('playToggle').addEventListener('click', () => playing ? pause() : play()); $('restartClip').addEventListener('click', () => seek(0));
$('previousKey').addEventListener('click', () => seek(keys.filter(value => value < time - 1e-6).at(-1) ?? 0));
$('nextKey').addEventListener('click', () => seek(keys.find(value => value > time + 1e-6) ?? duration));
$('timePosition').addEventListener('input', event => seek(event.target.value));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else render(); });
reducedMotion.addEventListener('change', event => { if (event.matches) pause(); });
window.addEventListener('pagehide', () => {
  retainedView = {id: selected?.id, clip: clipRecord?.id || null, time};
  pause(); generation++; abort?.abort(); clearActive(); clearFallback(); archiveCache = null;
  sizeObserver?.disconnect(); sizeObserver = null; controls?.dispose(); controls = null;
  renderer?.dispose(); renderer?.domElement.remove(); renderer = null; graphicsState = 'uninitialized';
});
window.addEventListener('pageshow', event => { if (event.persisted && selected) load(selected, clipRecord); });
window.RE_SOURCE_MODELS_R25 = Object.freeze({
  state: () => ({id: selected?.id || null, clip: clipRecord?.id || null, loading, ready: !!active && !loading,
    playing, time, duration, stats: stats && {...stats}, archiveCacheBytes: archiveCache?.bytes.byteLength || 0,
    camera: camera.position.toArray(), target: controls?.target.toArray() || [], sourceFilesRewritten: false,
    graphicsState, previewVerified, reducedMotion: reducedMotion.matches,
    render: renderer ? {geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures} : null}),
  seek, pause, play, select: id => { $('modelSelect').value = id; choose(id); },
  framing: () => {
    if (!active) return null;
    active.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(active, true), projected = new THREE.Box3();
    for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) projected.expandByPoint(new THREE.Vector3(x,y,z).project(camera));
    return {min:projected.min.toArray(),max:projected.max.toArray()};
  },
  bones: () => { const result = []; active?.traverse(node => { if (node.isBone) result.push({name: node.name, position: node.position.toArray(), quaternion: node.quaternion.toArray()}); }); return result; }
  ,animatedTransforms: () => {
    if (!active || !action) return [];
    const names = [...new Set(action.getClip().tracks.map(track => THREE.PropertyBinding.parseTrackName(track.name).nodeName))];
    return names.map(name => { const node = THREE.PropertyBinding.findNode(active, name); return {name, position: node.position.toArray(), quaternion: node.quaternion.toArray(), scale: node.scale.toArray()}; });
  }
});
async function start() {
  try {
    const response = await fetch(new URL('catalog.json', base)); if (!response.ok) throw Error('Catalogue de modèles indisponible.');
    const data = await response.json();
    if (data.schema !== 're.bow.model-view-catalog/1' || !Array.isArray(data.entries) || !data.entries.length || data.entries.length > 800
      || new Set(data.entries.map(item => item.id)).size !== data.entries.length) throw Error('Catalogue de modèles invalide.');
    catalog = data.entries.filter(item => /^[a-z0-9-]+$/.test(item.id) && typeof item.label === 'string' && typeof item.game === 'string'
      && ['OBJ', 'FBX', 'COLLADA'].includes(item.format) && ['../visual/', '../motion/', '../../fidelity-r24/visual/', '../../fidelity-r24/motion/'].includes(item.base));
    if (!catalog.length) throw Error('Aucun modèle vérifiable dans le catalogue.');
    $('modelSelect').replaceChildren();
    for (const entry of catalog) { const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.game + ' — ' + entry.label; $('modelSelect').append(option); }
    $('modelSelect').disabled = false;
    const requested = new URLSearchParams(location.search).get('model');
    const id = catalog.some(item => item.id === requested) ? requested : catalog[0].id;
    $('modelSelect').value = id; choose(id);
  } catch (error) { message(error.message); $('retry').hidden = false; }
}
start();
