import {Images, json, validateEntry} from './reader.js';
const byId = id => document.getElementById(id), images = new Images(), context = byId('canvas').getContext('2d');
const controls = ['subject', 'sequence', 'side', 'camera', 'position', 'play', 'previous', 'next', 'speed'].map(byId);
let controller = new AbortController(); let world = [], inspection = [], current = null, frame = 0, playing = false;
let loadGeneration = 0, loadingManifest = false, pageActive = true;
let generation = 0, paint = 0, started = 0, fromFrame = 0, animation = 0, loaded = false, error = '';
let paintedFrame = -1, paintedEntry = '';
let playRequest = 0;
const caption = () => {byId('position').value = String(frame); byId('caption').textContent = 'Image ' + (frame + 1) + ' / ' + current.frameCount
  + ' · ' + current.frames[frame].seconds.toFixed(3) + ' s / ' + current.durationSeconds.toFixed(3) + ' s · 60 images/s sources';};
function stop() {playRequest++; playing = false; cancelAnimationFrame(animation); byId('play').setAttribute('aria-pressed', 'false'); byId('play').textContent = 'LIRE';}
async function draw(index, announce = false) {
  if (!current) return; const token = ++paint, selected = current;
  frame = Math.max(0, Math.min(selected.frames.length - 1, index)); caption();
  try {
    const image = await images.load(selected.frames[frame].atlas || selected.frames[frame]);
    if (token !== paint || current !== selected) return;
    const cell = selected.frames[frame], rect = cell.rect || {x: 0, y: 0, width: 384, height: 384};
    context.clearRect(0, 0, 384, 384);
    context.drawImage(image.image, rect.x, rect.y, rect.width, rect.height, 0, 0, 384, 384);
    paintedFrame = frame; paintedEntry = selected.id;
    for (const offset of [1, 8, 16]) {
      const next = selected.frames[Math.min(selected.frames.length - 1, frame + offset)];
      images.load(next.atlas || next).catch(() => {});
    }
    if (announce) byId('status').textContent = 'Position source affichée : ' + selected.frames[frame].seconds.toFixed(3) + ' seconde(s).';
  } catch (reason) {
    if (token !== paint) return; error = reason.message; stop(); byId('status').textContent = error;
  }
}
function options(select, rows, value) {
  select.replaceChildren(...rows.map(row => {const option = document.createElement('option'); option.value = row.value; option.textContent = row.label; return option;}));
  if (rows.some(row => row.value === value)) select.value = value;
}
function chosen() {
  const subject = byId('subject').value, clip = byId('sequence').value, side = byId('side').value;
  const source = world.find(row => row.subjectId === subject && row.clipId === clip && row.sourceFacing === side);
  const follow = inspection.find(row => row.sourceWorldEntryId === source?.id);
  byId('camera').options[1].disabled = !follow;
  if (!follow && byId('camera').value === 'follow') byId('camera').value = 'world';
  return byId('camera').value === 'follow' ? follow : source;
}
function select() {
  stop(); generation++; current = chosen(); frame = 0; if (!current) return;
  byId('position').max = String(current.frames.length - 1);
  byId('name').textContent = current.label + ' · ' + current.clipId;
  byId('edition').textContent = current.sourceEdition;
  byId('gesture').textContent = current.observedGesture?.summary || 'Geste source non attribué.';
  byId('limits').textContent = 'Nom d’action original non certifié. Aucune commande, intro, victoire ou défaite affectée à partir du seul code d’archive.';
  byId('cameraScope').textContent = current.kind === 'native-root-follow-inspection'
    ? 'Aperçu d’inspection : seule la caméra suit la vraie translation de bone0, à échelle et orientation fixes. La trajectoire source et les vues fixes restent conservées.'
    : 'Caméra fixe sur la trajectoire source complète. Une forte translation native peut rendre le corps petit dans cette vue.';
  const url = new URL(current.sourcePage);
  if (url.protocol !== 'https:') throw Error('Source externe invalide.'); byId('source').href = url.href;
  byId('proof').href = 'review/observations.json';
  byId('canvas').setAttribute('aria-label', current.label + ', mouvement source observé, vue ' + current.sourceFacing);
  const address = new URL(location.href); address.searchParams.set('id', current.subjectId); address.searchParams.set('clip', current.clipId);
  address.searchParams.set('side', current.sourceFacing); address.searchParams.set('camera', byId('camera').value); history.replaceState(null, '', address);
  error = ''; byId('status').textContent = 'Scène prête. La lecture reste volontaire.'; draw(0);
}
function selectSubject(clip) {
  const available = world.filter(row => row.subjectId === byId('subject').value && row.sourceFacing === 'left');
  options(byId('sequence'), available.map(row => ({value: row.clipId, label: row.observedGesture?.label || row.clipId})), clip);
  select();
}
function tick(now) {
  if (!playing || !current) return;
  const elapsed = (now - started) / 1000 * Number(byId('speed').value), next = fromFrame + Math.floor(elapsed * 60);
  if (next >= current.frames.length) {draw(current.frames.length - 1); stop(); byId('status').textContent = 'Fin de la scène source. Aucun raccord cinématique n’a été inventé.'; return;}
  if (next !== frame) draw(next); animation = requestAnimationFrame(tick);
}
async function play() {
  if (playing) {stop(); return;}
  if (!current) return;
  const selected = current, request = ++playRequest;
  await draw(frame >= current.frames.length - 1 ? 0 : frame);
  if (current !== selected || request !== playRequest || error) return;
  playing = true; started = performance.now(); fromFrame = frame; byId('play').textContent = 'SUSPENDRE'; byId('play').setAttribute('aria-pressed', 'true');
  byId('status').textContent = 'Lecture volontaire de la scène native, sans effet sur le combat.'; animation = requestAnimationFrame(tick);
}
for (const id of ['sequence', 'side', 'camera']) byId(id).addEventListener('change', select);
byId('subject').addEventListener('change', () => selectSubject());
byId('position').addEventListener('input', () => {stop(); draw(Number(byId('position').value), true);});
byId('previous').addEventListener('click', () => {stop(); draw(frame - 1, true);});
byId('next').addEventListener('click', () => {stop(); draw(frame + 1, true);});
byId('play').addEventListener('click', play); byId('speed').addEventListener('change', stop);
byId('canvas').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', ' '].includes(event.key) || !current) return;
  event.preventDefault(); if (event.key === ' ') {play(); return;} stop();
  draw(event.key === 'Home' ? 0 : event.key === 'End' ? current.frames.length - 1 : frame + (event.key === 'ArrowLeft' ? -1 : 1), true);
});
document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
addEventListener('pagehide', () => {pageActive = false; loadGeneration++; loadingManifest = false; stop(); paint++; controller.abort(); images.clear();});
addEventListener('pageshow', () => {pageActive = true; images.resume(); if (current) draw(frame); else if (!loadingManifest) initialize();});
globalThis.RE_MOTION_REVIEW_R31 = Object.freeze({state: () => ({loaded, error, entry: current?.id || null,
  subject: current?.subjectId || null, frame, frames: current?.frameCount || 0, seconds: current?.frames[frame]?.seconds || 0,
  paintedFrame, paintedEntry,
  playing, cameraMode: current?.kind === 'native-root-follow-inspection' ? 'follow' : 'world',
  sourceActionCertified: false, combatAssigned: false, generation, loadingManifest, pageActive, cache: images.state()})});
async function initialize() {
const request = ++loadGeneration; controller = new AbortController(); const requestController = controller; loadingManifest = true; error = '';
try {
  controls.forEach(element => {element.disabled = true;});
  const manifest = await json({path: 'modules/fidelity-r31/motion/manifest.json'}, requestController.signal);
  if (manifest.schema !== 're.bow.motion-library-r31/1' || manifest.release !== 'R31' || !Array.isArray(manifest.entries) || manifest.entries.length > 128) throw Error('Bibliothèque de mouvements invalide.');
  const nextWorld = manifest.entries.map(validateEntry); let nextInspection = [];
  if (manifest.rootFollowManifest) {
    const follow = await json(manifest.rootFollowManifest, requestController.signal);
    if (follow.schema !== 're.bow.motion-root-follow-r31/1' || !Array.isArray(follow.entries) || follow.entries.length > 16) throw Error('Bibliothèque de suivi caméra invalide.');
    nextInspection = follow.entries.map(validateEntry);
  }
  if (!pageActive || request !== loadGeneration) return;
  world = nextWorld; inspection = nextInspection;
  const params = new URL(location.href).searchParams, subjects = new Map(world.map(row => [row.subjectId, row.label]));
  options(byId('subject'), [...subjects].map(([value, label]) => ({value, label})), params.get('id'));
  if (['left', 'right'].includes(params.get('side'))) byId('side').value = params.get('side');
  if (params.get('camera') === 'follow') byId('camera').value = 'follow';
  controls.forEach(element => {element.disabled = false;}); loaded = true; selectSubject(params.get('clip'));
} catch (reason) {
  if (!pageActive || request !== loadGeneration) return;
  error = reason.message; byId('status').textContent = error; controls.forEach(element => {element.disabled = true;});
} finally {if (request === loadGeneration) loadingManifest = false;}
}
await initialize();
