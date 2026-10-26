const $ = id => document.getElementById(id), base = new URL('./', import.meta.url), root = new URL('../../../', base);
const MAX_MANIFEST = 4 * 1024 * 1024, MAX_IMAGE = 2 * 1024 * 1024;
const sha = async raw => [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(value => value.toString(16).padStart(2, '0')).join('');
let entries = [], selected = null, active = null, generation = 0, url = null, connected = true, playing = false, raf = null, playStarted = 0, initialSeconds = 0;
const state = {ready: false, failed: false, selected: null, displayed: null, frame: 0, playing: false, blobUrls: 0, loading: false};
function safePath(record) {
  if (typeof record?.path !== 'string' || record.path.includes('\\') || record.path.split('/').some(value => !value || value === '.' || value === '..')) throw Error('Chemin d’image invalide.');
  const target = new URL(record.path, base);
  if (target.origin !== base.origin || !target.pathname.startsWith(new URL('sequences/', base).pathname) || target.search || target.hash) throw Error('Image extérieure au lot refusée.');
  return target;
}
async function bytes(target, limit, signal) {
  const response = await fetch(target, {signal, cache: 'no-store'});
  if (!response.ok || response.type === 'opaque') throw Error('Ressource indisponible.');
  const reader = response.body?.getReader(); if (!reader) throw Error('Lecture bornée indisponible.');
  const parts = []; let length = 0;
  try {for (;;) {const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > limit) {await reader.cancel(); throw Error('Ressource trop volumineuse.');} parts.push(part.value);}} finally {reader.releaseLock();}
  const result = new Uint8Array(length); let offset = 0; for (const part of parts) {result.set(part, offset); offset += part.length;} return result;
}
function validate(value) {
  if (value?.schema !== 're.bow.native-frame-library-r29/1' || value.release !== 'R29' || !Array.isArray(value.entries) || !value.entries.length || value.entries.length > 100 || value.canonicalFidelityCertified !== false || value.counts?.admittedCombatCycles !== 0 || value.counts?.actionAssignedScenes !== 0 || value.counts?.originalGameFrames !== 0) throw Error('Registre de mouvements invalide.');
  const ids = new Set(); let frames = 0;
  for (const entry of value.entries) {
    if (typeof entry.id !== 'string' || !/^[a-z0-9-]+--[A-Za-z0-9_]+$/.test(entry.id) || ids.has(entry.id) || !/^[a-z0-9-]+$/.test(entry.subjectId) || entry.modelRole !== 'body' || entry.actionIdentity !== 'unassigned' || !Array.isArray(entry.availableCombatStates) || entry.availableCombatStates.length || entry.originalGameFrames !== false || entry.canonicalFidelityCertified !== false || entry.recipe?.animationCameraFixed !== true || entry.recipe?.geometryMirrored !== false || entry.measurements?.nonrigidDeformationProven !== true || !(entry.measurements.maximumPairwiseDistanceDelta > 1e-5) || !Array.isArray(entry.frames) || entry.frames.length !== 16 || entry.frameCount !== 16) throw Error('Séquence ou attribution non prise en charge.');
    ids.add(entry.id); let previous = -1;
    for (const [index, frame] of entry.frames.entries()) {
      if (frame.path !== 'sequences/' + entry.id + '/frame-' + String(index).padStart(2, '0') + '.png' || frame.width !== 384 || frame.height !== 384 || !Number.isSafeInteger(frame.bytes) || frame.bytes < 1 || frame.bytes > MAX_IMAGE || !/^[a-f0-9]{64}$/.test(frame.sha256) || !Number.isFinite(frame.seconds) || frame.seconds <= previous || frame.edgePixels !== 0) throw Error('Description d’image invalide.');
      safePath(frame); previous = frame.seconds; frames++;
    }
  }
  if (value.counts.nativeScenes !== ids.size || value.counts.nativeRenderedFrames !== frames) throw Error('Compteurs incohérents.');
  return value.entries;
}
function clearImage() {if (url) URL.revokeObjectURL(url); url = null; $('frame').hidden = true; $('frame').removeAttribute('src'); $('download').hidden = true; $('download').removeAttribute('href'); state.blobUrls = 0; state.displayed = null;}
function stop() {playing = false; state.playing = false; if (raf !== null) cancelAnimationFrame(raf); raf = null; $('play').textContent = 'Lire les instants sources';}
function controls() {const enabled = state.ready && !!selected; $('seek').disabled = !enabled; $('previous').disabled = !enabled || state.frame === 0; $('next').disabled = !enabled || state.frame === 15; $('play').disabled = !enabled;}
async function show(index) {
  if (!selected || !Number.isInteger(index) || index < 0 || index > 15) return;
  active?.abort(); active = new AbortController(); const token = ++generation, signal = active.signal, entry = selected, frame = entry.frames[index];
  clearImage(); state.frame = index; state.loading = true; $('seek').value = String(index); controls();
  $('position').textContent = 'Image ' + (index + 1) + '/16 · temps source ' + frame.seconds.toFixed(4) + ' s'; $('assetStatus').textContent = 'Vérification de l’image…';
  try {
    const raw = await bytes(safePath(frame), MAX_IMAGE, signal);
    if (raw.byteLength !== frame.bytes || await sha(raw) !== frame.sha256) throw Error('Empreinte de l’image incorrecte ; affichage refusé.');
    if (token !== generation || !connected) return;
    url = URL.createObjectURL(new Blob([raw], {type: 'image/png'})); state.blobUrls = 1;
    $('frame').src = url; await $('frame').decode();
    if (token !== generation || !connected) return;
    if ($('frame').naturalWidth !== 384 || $('frame').naturalHeight !== 384) throw Error('Dimensions d’image incorrectes.');
    $('frame').alt = entry.label + ' · séquence source ' + entry.clipId + ' · image ' + (index + 1); $('frame').hidden = false;
    $('download').href = url; $('download').download = entry.id + '-frame-' + index + '.png'; $('download').hidden = false;
    state.displayed = entry.id + ':' + index; $('assetStatus').textContent = 'Image vérifiée. Action de combat non attribuée.';
  } catch (error) {if (token !== generation || signal.aborted) return; stop(); clearImage(); $('assetStatus').textContent = error.message;}
  finally {if (token === generation) state.loading = false;}
}
function choose(id) {
  stop(); selected = entries.find(entry => entry.id === id) || entries[0]; if (!selected) return;
  state.selected = selected.id; $('clip').value = selected.id;
  $('scope').textContent = selected.sourceEdition + ' · ' + selected.clipId + ' · action non attribuée, aucun état de combat admis.';
  if (selected.frames.some(frame => Math.min(frame.alphaBounds.width, frame.alphaBounds.height) < 40)) $('scope').textContent += ' Le déplacement source est très étendu : la caméra fixe conserve sa trajectoire, mais certains instants montrent le corps à une petite échelle ; les détails corporels ne sont pas qualifiés par ces images.';
  $('dossier').href = new URL('codex.html?id=' + encodeURIComponent(selected.subjectId), root).href;
  const source = new URL(selected.sourcePage); if (source.protocol !== 'https:') throw Error('Notice source invalide.'); $('source').href = source.href;
  show(0);
}
function play() {
  if (playing) {stop(); return;} if (!selected) return;
  if (state.frame === 15) show(0);
  initialSeconds = selected.frames[state.frame].seconds; playStarted = performance.now(); playing = true; state.playing = true; $('play').textContent = 'Suspendre';
  function tick(now) {
    if (!playing || document.hidden) {stop(); return;}
    const elapsed = initialSeconds + (now - playStarted) / 1000;
    let target = 0; while (target < 15 && selected.frames[target + 1].seconds <= elapsed) target++;
    if (target !== state.frame) show(target);
    if (elapsed >= selected.frames[15].seconds) {stop(); return;}
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
}
async function load() {
  stop(); active?.abort(); active = new AbortController(); const token = ++generation; state.ready = false; state.failed = false; clearImage(); $('clip').disabled = true; $('retry').hidden = true;
  try {
    const raw = await bytes(new URL('manifest.json', base), MAX_MANIFEST, active.signal);
    if (token !== generation || !connected) return;
    entries = validate(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw)));
    $('clip').replaceChildren(...entries.map(entry => {const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.label + ' · ' + entry.clipId; return option;}));
    state.ready = true; $('clip').disabled = false; $('status').textContent = entries.length + ' séquences sources · ' + entries.reduce((sum, entry) => sum + entry.frames.length, 0) + ' images dérivées · zéro cycle de combat certifié.';
    const params = new URL(location.href).searchParams, uid = params.get('id') || params.get('identity'), requested = params.get('clip');
    if (uid && !entries.some(entry => entry.subjectId === uid) || requested && !entries.some(entry => entry.id === requested || entry.clipId === requested)) throw Error('Aucune séquence source disponible pour cette identité ou ce fichier.');
    choose(entries.find(entry => entry.id === requested || entry.clipId === requested)?.id || entries.find(entry => entry.subjectId === uid)?.id || entries[0].id);
  } catch (error) {if (active.signal.aborted || token !== generation) return; state.failed = true; $('status').textContent = error.message; $('retry').hidden = false;}
  controls();
}
$('clip').addEventListener('change', () => choose($('clip').value)); $('play').addEventListener('click', play);
$('previous').addEventListener('click', () => {stop(); show(state.frame - 1);}); $('next').addEventListener('click', () => {stop(); show(state.frame + 1);});
$('seek').addEventListener('input', () => {stop(); show(Number($('seek').value));}); $('retry').addEventListener('click', load);
addEventListener('blur', stop); document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
addEventListener('pagehide', () => {connected = false; stop(); active?.abort(); ++generation; clearImage();});
addEventListener('pageshow', () => {if (!connected) {connected = true; if (state.ready && selected) show(state.frame); else load();}});
window.RE_NATIVE_FRAMES_R29 = Object.freeze({state: () => ({...state}), select: choose, show, stop});
load();
