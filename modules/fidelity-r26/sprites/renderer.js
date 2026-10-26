/* Source-coordinate inspection sheets. These renders are not original game sprites. */
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {verifiedBytes} from '../../fidelity-r24/models/verified-assets.js';
export const ANGLES = Object.freeze([0, 45, 90, 135, 180, 225, 270, 315]);
const sourceBase = new URL('../visual/', import.meta.url);
const allowed = sourceBase;
const decode = data => new TextDecoder('utf-8', {fatal: true}).decode(data);
const digest = async data => [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(x => x.toString(16).padStart(2, '0')).join('');

export function validateEntry(entry) {
  if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9-]{1,120}$/.test(entry.id)
    || entry.format !== 'OBJ' || !entry.model || !entry.materials || !Array.isArray(entry.textures)
    || entry.textures.length < 1 || entry.textures.length > 32 || entry.sourceFilesRewritten !== false
    || entry.catalogueFidelityCertified !== false) throw Error('Référence de modèle non prise en charge.');
  return entry;
}

export async function renderSheet(rawEntry, {signal, cellSize = 256} = {}) {
  const entry = validateEntry(rawEntry);
  if (cellSize !== 256) throw Error('La recette exige des cellules de 256 pixels.');
  const assertLive = () => { if (signal?.aborted) throw new DOMException('Rendu interrompu.', 'AbortError'); };
  assertLive();
  const urls = [], textures = new Set(), materials = new Set(), geometries = new Set();
  let renderer, object;
  try {
    const [modelBytes, materialBytes, imageBytes] = await Promise.all([
      verifiedBytes(entry.model, sourceBase, allowed, signal),
      verifiedBytes(entry.materials, sourceBase, allowed, signal),
      Promise.all(entry.textures.map(record => verifiedBytes(record, sourceBase, allowed, signal)))
    ]);
    assertLive();
    const aliases = new Map();
    entry.textures.forEach((record, i) => {
      const name = record.path.split('/').pop().toLowerCase();
      if (!name.endsWith('.png')) throw Error('Seules les textures PNG publiées sont acceptées.');
      if (aliases.has(name)) {
        if (aliases.get(name).sha !== record.sha256) throw Error('Texture ambiguë.');
        return;
      }
      const url = URL.createObjectURL(new Blob([imageBytes[i]], {type: 'image/png'})); urls.push(url);
      aliases.set(name, {url, sha: record.sha256});
    });
    const manager = new THREE.LoadingManager();
    let requested = false;
    const ready = new Promise((resolve, reject) => {
      manager.onStart = () => {requested = true;};
      manager.onLoad = resolve;
      manager.onError = () => reject(Error('Une texture publiée ne peut pas être décodée.'));
    });
    ready.catch(() => {});
    manager.setURLModifier(value => {
      if (urls.includes(value)) return value;
      const name = decodeURIComponent(value).replaceAll('\\', '/').split('/').pop().toLowerCase();
      if (!aliases.has(name)) throw Error('Texture non présente dans les octets vérifiés.');
      return aliases.get(name).url;
    });
    const creator = new MTLLoader(manager).parse(decode(materialBytes), ''); creator.preload();
    Object.values(creator.materials).forEach(material => materials.add(material));
    object = new OBJLoader(manager).setMaterials(creator).parse(decode(modelBytes));
    object.traverse(node => {
      if (!node.isMesh) return;
      geometries.add(node.geometry);
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => materials.add(material));
    });
    for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    if (requested) await ready;
    assertLive();
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object, true);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw Error('Bornes du modèle invalides.');
    // Camera orbit only: source vertices, object transforms and materials are never edited.
    const objectMatrix = object.matrix.toArray();
    const scene = new THREE.Scene(); scene.add(object);
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(1, 2, 3); scene.add(light);
    const extent = sphere.radius * 1.08;
    const camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, sphere.radius * .001, sphere.radius * 12);
    camera.up.set(0, 1, 0);
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, preserveDrawingBuffer: true});
    renderer.setPixelRatio(1); renderer.setSize(cellSize, cellSize, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
    const canvas = document.createElement('canvas'); canvas.width = cellSize * 4; canvas.height = cellSize * 2;
    const context = canvas.getContext('2d');
    if (!context) throw Error('Le rendu de la planche est indisponible.');
    const views = [];
    for (const [index, angle] of ANGLES.entries()) {
      assertLive();
      const theta = angle * Math.PI / 180;
      camera.position.copy(sphere.center).add(new THREE.Vector3(Math.sin(theta), .12, Math.cos(theta)).multiplyScalar(sphere.radius * 4));
      camera.lookAt(sphere.center); camera.updateMatrixWorld(true);
      renderer.render(scene, camera);
      const x = (index % 4) * cellSize, y = Math.floor(index / 4) * cellSize;
      context.drawImage(renderer.domElement, x, y);
      const rgba = context.getImageData(x, y, cellSize, cellSize).data;
      let occupiedPixels = 0, edgePixels = 0;
      for (let p = 0; p < rgba.length; p += 4) {
        if (!rgba[p + 3]) continue;
        occupiedPixels++;
        const pixel = p / 4, px = pixel % cellSize, py = Math.floor(pixel / cellSize);
        if (px === 0 || py === 0 || px === cellSize - 1 || py === cellSize - 1) edgePixels++;
      }
      if (occupiedPixels < 20 || edgePixels) throw Error('Planche vide ou modèle rogné.');
      views.push({index, orbitDegrees: angle, rectangle: [x, y, cellSize, cellSize], occupiedPixels, edgePixels,
                  cameraPosition: camera.position.toArray(), cameraTarget: sphere.center.toArray(),
                  rgbaSha256: await digest(rgba)});
    }
    if (!object.matrix.toArray().every((value, i) => value === objectMatrix[i])) throw Error('Transformation source modifiée.');
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error('PNG indisponible.')), 'image/png'));
    assertLive();
    return {blob, evidence: {id: entry.id, sourceModelSha256: entry.model.sha256, sourceMaterialsSha256: entry.materials.sha256,
      sourceTextures: entry.textures.map(record => ({path: record.path, sha256: record.sha256})),
      classification: 'derived-source-pose-inspection-sheet', originalGameSprite: false, combatReady: false,
      canonicalFidelityCertified: false, modelTransformsChanged: false, mirroredViews: false,
      cellSize, width: canvas.width, height: canvas.height, angles: [...ANGLES],
      cameraUp: [0, 1, 0], sourceBounds: {min: bounds.min.toArray(), max: bounds.max.toArray()},
      lighting: {ambientIntensity: 2, directionalIntensity: 2, directionalPosition: [1, 2, 3], nativeGameLightingCertified: false},
      renderer: {library: 'Three.js 0.180.0', colorSpace: 'sRGB', projection: 'orthographic', alpha: true}, views}};
  } finally {
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    renderer?.dispose(); renderer?.forceContextLoss();
    for (const url of urls) URL.revokeObjectURL(url);
  }
}
