const MANIFEST_SHA = 'b0bcebb71fcc7de7f19c666a4e27e4baf7d2e5c9613f26b6634315f08c284a02';
const root = new URL('./malacoda/', import.meta.url);
const $ = id => document.getElementById(id);
const canvas = $('frame');
const context = canvas.getContext('2d');
const temporary = document.createElement('canvas');
const verifier = temporary.getContext('2d', {willReadFrequently: true});
const cache = new Map();
let manifest, current = 0, desired = null, processing = false;
const sha = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');

async function checked(path, expected) {
  const url = new URL(path, root);
  if (!url.href.startsWith(root.href) || !/^[a-z0-9.-]+$/.test(path)) throw new Error('Chemin de source refusé.');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Chargement refusé (${response.status}).`);
  const bytes = await response.arrayBuffer();
  if (await sha(bytes) !== expected) throw new Error('L’empreinte du fichier ne correspond pas à la source conservée.');
  return bytes;
}

async function atlas(index) {
  if (cache.has(index)) {
    const bitmap = cache.get(index);
    cache.delete(index); cache.set(index, bitmap);
    return bitmap;
  }
  const record = manifest.atlases[index];
  const bytes = await checked(record.path, record.sha256);
  while (cache.size >= 2) {
    const oldest = cache.keys().next().value;
    cache.get(oldest).close(); cache.delete(oldest);
  }
  const bitmap = await createImageBitmap(new Blob([bytes], {type: 'image/png'}), {colorSpaceConversion: 'none', premultiplyAlpha: 'none'});
  if (bitmap.width !== record.width || bitmap.height !== record.height) {
    bitmap.close(); throw new Error('Les dimensions de l’atlas ont changé.');
  }
  cache.set(index, bitmap);
  return bitmap;
}

function updateControls(index) {
  $('position').value = index;
  $('position-label').textContent = `${index + 1} / ${manifest.frameCount}`;
  $('first').disabled = $('previous').disabled = index === 0;
  $('last').disabled = $('next').disabled = index === manifest.frameCount - 1;
}

async function render() {
  if (processing) return;
  processing = true;
  try {
    while (desired !== null) {
      const index = desired;
      $('status').textContent = `Vérification de l’image ${index + 1}…`;
      const frame = manifest.frames[index];
      const bitmap = await atlas(frame.atlas);
      if (desired !== index) continue;
      const [x, y, width, height] = frame.crop;
      verifier.clearRect(0, 0, width, height);
      verifier.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
      if (await sha(verifier.getImageData(0, 0, width, height).data) !== frame.rgbaSha256) throw new Error('Les pixels de l’image ne correspondent pas à la source.');
      if (desired !== index) continue;
      context.clearRect(0, 0, width, height);
      context.drawImage(temporary, 0, 0);
      current = index; desired = null;
      canvas.setAttribute('aria-label', `Malacoda dans Resident Evil Revelations, image source ${index + 1} sur ${manifest.frameCount}`);
      $('caption').textContent = `Image ${index + 1} / ${manifest.frameCount} — pixels d’origine vérifiés`;
      $('status').textContent = 'Navigation manuelle. Les délais de la source sont nuls.';
      $('retry').hidden = true;
      updateControls(index);
    }
  } catch (error) {
    desired = null;
    $('status').textContent = `Image non affichée : ${error.message}`;
    $('retry').hidden = false;
  } finally {
    processing = false;
  }
}

function request(index) {
  if (!manifest) return;
  desired = Math.max(0, Math.min(manifest.frameCount - 1, index));
  updateControls(desired);
  void render();
}

async function initialize() {
  $('retry').hidden = true;
  try {
    const bytes = await checked('manifest.json', MANIFEST_SHA);
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (data.schema !== 're.bow.source-motion/1' || data.subjectId !== 'rerev-malacoda' || data.frameCount !== 218 || data.width !== 420 || data.height !== 242 || data.frames.length !== data.frameCount || data.timingDefined !== false || data.playbackMode !== 'manual-only' || data.totalDurationMs !== 0 || data.frames.some(frame => frame.durationMs !== 0)) throw new Error('La description des images a changé.');
    manifest = data;
    temporary.width = canvas.width = data.width;
    temporary.height = canvas.height = data.height;
    $('controls').disabled = false;
    request(0);
  } catch (error) {
    $('status').textContent = `Source non chargée : ${error.message}`;
    $('retry').hidden = false;
  }
}

$('position').addEventListener('input', event => request(Number(event.target.value)));
$('first').addEventListener('click', () => request(0));
$('previous').addEventListener('click', () => request((desired ?? current) - 1));
$('next').addEventListener('click', () => request((desired ?? current) + 1));
$('last').addEventListener('click', () => request(manifest.frameCount - 1));
$('retry').addEventListener('click', () => manifest ? request(Number($('position').value)) : void initialize());
window.addEventListener('pagehide', () => { for (const bitmap of cache.values()) bitmap.close(); cache.clear(); });
void initialize();
