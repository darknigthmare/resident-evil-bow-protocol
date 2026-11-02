import {Images, json, validateEntry} from './reader.js';
const byId = id => document.getElementById(id), images = new Images(), context = byId('canvas').getContext('2d');
let entries = [], current = null, frame = 0, paintedFrame = -1, paintedEntry = '', playing = false, loaded = false, error = '';
let pageActive = true, generation = 0, paint = 0, controller = null, loadingManifest = false, animation = 0, started = 0, fromFrame = 0, playRequest = 0;
const controls = ['subject', 'sequence', 'side', 'previous', 'play', 'next', 'speed', 'position', 'repeat'].map(byId);
const isSequence = () => current?.kind === 'native-sequence';
function stop() {playRequest++; playing = false; cancelAnimationFrame(animation); byId('play').setAttribute('aria-pressed', 'false'); byId('play').textContent = 'LIRE';}
function caption() {
  byId('position').value = String(frame);
  byId('caption').textContent = isSequence() ? 'Image ' + (frame + 1) + ' / ' + current.frameCount + ' · ' + current.frames[frame].seconds.toFixed(3) + ' s / ' + current.durationSeconds.toFixed(3) + ' s · 60 images/s sources'
    : 'Pose source fixe · une image · aucun mouvement ajouté';
}
async function draw(index) {
  if (!current || !pageActive) return;
  const token = ++paint, selected = current;
  frame = Math.max(0, Math.min(selected.frameCount - 1, index)); const selectedFrame = frame; caption();
  try {
    const cell = selected.frames[selectedFrame], value = await images.load(cell.atlas || cell);
    if (!pageActive || token !== paint || selected !== current) return;
    const rect = cell.rect || {x: 0, y: 0, width: cell.width, height: cell.height};
    context.clearRect(0, 0, 384, 384); context.drawImage(value.image, rect.x, rect.y, rect.width, rect.height, 0, 0, 384, 384);
    paintedFrame = selectedFrame; paintedEntry = selected.id;
    if (selected.kind === 'native-sequence') for (const offset of [1, 8, 16]) {
      const next = selected.frames[Math.min(selected.frameCount - 1, selectedFrame + offset)]; images.load(next.atlas || next).catch(() => {});
    }
  } catch (reason) {
    if (!pageActive || token !== paint || selected !== current) return;
    error = reason.message; stop(); byId('status').textContent = error;
  }
}
function options(element, rows, value) {
  element.replaceChildren(...rows.map(row => {const option = document.createElement('option'); option.value = row.value; option.textContent = row.label; return option;}));
  if (rows.some(row => row.value === value)) element.value = value;
}
function select() {
  stop(); paint++; current = entries.find(row => row.subjectId === byId('subject').value && row.clipId === byId('sequence').value && row.sourceFacing === byId('side').value);
  if (!current) return;
  frame = 0; error = ''; paintedFrame = -1; paintedEntry = ''; context.clearRect(0, 0, 384, 384);
  byId('position').max = String(current.frameCount - 1);
  for (const id of ['previous', 'play', 'next', 'speed', 'position']) byId(id).disabled = !isSequence();
  byId('repeat').disabled = current.selectablePresentationVariant !== true;
  byId('name').textContent = current.label;
  byId('edition').textContent = current.sourceEdition;
  byId('gesture').textContent = current.observedGesture?.summary || current.visualReview?.notes || 'Pose source sans action attribuée.';
  byId('cameraScope').textContent = 'Caméra source indépendante à ' + current.recipe.cameraAngle + '° ; géométrie non retournée en miroir.';
  byId('limits').textContent = current.selectablePresentationVariant ? 'Nage stationnaire PC/HD2013 observée, réutilisée volontairement. Aucun idle original, appui terrestre ou équivalence 3DS2012 certifié.'
    : isSequence() ? 'Geste observé sans commande, attaque, intro, outro ou résultat original attribué.'
    : 'Pose de liaison publiée, sans geste de combat. Les armes et matériaux absents ne sont pas inventés.';
  const sourceURL = new URL(current.sourcePage); if (sourceURL.protocol !== 'https:') throw Error('Publication source invalide.'); byId('source').href = sourceURL.href;
  byId('canvas').setAttribute('aria-label', current.label + ', ' + (isSequence() ? 'mouvement source observé' : 'pose source fixe') + ', vue ' + current.sourceFacing);
  const address = new URL(location.href); address.searchParams.set('id', current.subjectId); address.searchParams.set('clip', current.clipId); address.searchParams.set('side', current.sourceFacing); history.replaceState(null, '', address);
  byId('status').textContent = 'Source prête. La lecture reste volontaire.'; draw(0);
}
function selectSequence(side) {
  const rows = entries.filter(row => row.subjectId === byId('subject').value && row.clipId === byId('sequence').value);
  options(byId('side'), rows.map(row => ({value: row.sourceFacing, label: row.recipe.cameraAngle + '° · ' + (row.sourceViewLabel ? 'ARRIÈRE' : row.sourceFacing.toUpperCase())})), side); select();
}
function selectSubject(clip, side) {
  const rows = new Map(entries.filter(row => row.subjectId === byId('subject').value).map(row => [row.clipId, row]));
  options(byId('sequence'), [...rows].map(([value, row]) => ({value, label: row.kind === 'native-static-pose' ? row.label + ' · POSE FIXE' : row.observedGesture?.label + ' · ' + row.clipId})), clip);
  selectSequence(side);
}
function tick(now) {
  if (!playing || !current || !pageActive) return;
  const next = fromFrame + Math.floor((now - started) / 1000 * Number(byId('speed').value) * 60);
  if (next >= current.frameCount && !(current.selectablePresentationVariant && byId('repeat').checked)) {draw(current.frameCount - 1); stop(); byId('status').textContent = 'Fin de la scène source ; aucun raccord ajouté.'; return;}
  const nextFrame = next % current.frameCount;
  if (nextFrame !== frame) draw(nextFrame);
  animation = requestAnimationFrame(tick);
}
async function play() {
  if (playing) {stop(); return;}
  if (!isSequence() || !pageActive) return;
  const selected = current, request = ++playRequest;
  await draw(frame >= current.frameCount - 1 ? 0 : frame);
  if (!pageActive || selected !== current || request !== playRequest || error) return;
  playing = true; started = performance.now(); fromFrame = frame; byId('play').textContent = 'SUSPENDRE'; byId('play').setAttribute('aria-pressed', 'true');
  byId('status').textContent = 'Lecture volontaire des courbes natives ; aucune modification du combat.'; animation = requestAnimationFrame(tick);
}
byId('subject').addEventListener('change', () => selectSubject());
byId('sequence').addEventListener('change', () => selectSequence()); byId('side').addEventListener('change', select);
byId('play').addEventListener('click', play); byId('speed').addEventListener('change', stop); byId('repeat').addEventListener('change', stop);
byId('position').addEventListener('input', () => {stop(); draw(Number(byId('position').value));});
byId('previous').addEventListener('click', () => {stop(); draw(frame - 1);}); byId('next').addEventListener('click', () => {stop(); draw(frame + 1);});
byId('play').addEventListener('keydown', event => {if (!event.defaultPrevented && !event.ctrlKey && !event.altKey && !event.metaKey && event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault();});
byId('canvas').addEventListener('keydown', event => {
  if (!isSequence() || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End', ' '].includes(event.key)) return;
  event.preventDefault(); if (event.key === ' ') {if (!event.repeat) play(); return;} stop();
  draw(event.key === 'Home' ? 0 : event.key === 'End' ? current.frameCount - 1 : frame + (event.key === 'ArrowLeft' ? -1 : 1));
});
document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
addEventListener('pagehide', () => {pageActive = false; generation++; paint++; loadingManifest = false; controller?.abort(); stop(); images.clear();});
addEventListener('pageshow', () => {pageActive = true; images.resume(); if (current) draw(frame); else if (!loadingManifest) initialize();});
byId('retry').addEventListener('click', initialize);
globalThis.RE_NATIVE_REVIEW_R33 = Object.freeze({state: () => ({loaded, error, entry: current?.id || null, subject: current?.subjectId || null,
  frame, frames: current?.frameCount || 0, paintedFrame, paintedEntry, playing, pageActive, loadingManifest,
  sourceActionCertified: false, combatAssigned: false, generation, cache: images.state()})});
async function initialize() {
  const token = ++generation; controller?.abort(); controller = new AbortController(); const request = controller; loadingManifest = true; error = '';
  controls.forEach(element => {element.disabled = true;}); byId('retry').hidden = true;
  try {
    const manifest = await json({path: 'modules/fidelity-r33/native/manifest.json'}, request.signal);
    if (manifest.schema !== 're.bow.native-library-r33/1' || manifest.release !== 'R33' || !Array.isArray(manifest.entries) || manifest.entries.length > 128) throw Error('Bibliothèque native R33 invalide.');
    const nextEntries = manifest.entries.map(validateEntry);
    if (!pageActive || token !== generation) return;
    entries = nextEntries; const params = new URL(location.href).searchParams, subjects = new Map(entries.map(row => [row.subjectId, row.label]));
    options(byId('subject'), [...subjects].map(([value, label]) => ({value, label})), params.get('id'));
    controls.forEach(element => {element.disabled = false;}); loaded = true; selectSubject(params.get('clip'), params.get('side'));
  } catch (reason) {
    if (!pageActive || token !== generation) return;
    error = reason.message; byId('status').textContent = error; byId('retry').hidden = false;
  } finally {if (token === generation) loadingManifest = false;}
}
await initialize();
