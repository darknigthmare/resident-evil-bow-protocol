const $ = id => document.getElementById(id), native = window.RE_NATIVE_SPRITES_R30;
const root = new URL('../../../', import.meta.url), canvas = $('frame'), context = canvas.getContext('2d');
let selected = null, entries = [], generation = 0, playing = false, raf = null, began = 0, initial = 0, connected = true, warm = false;
const state = {ready: false, failed: false, selected: null, displayed: null, frame: 0, playing: false, buffering: false};
function stop() {playing = false; state.playing = false; if (raf !== null) cancelAnimationFrame(raf); raf = null; $('play').textContent = 'Lire le mouvement complet';}
function controls() {
  const enabled = state.ready && !!selected;
  $('seek').disabled = !enabled; $('previous').disabled = !enabled || state.frame === 0;
  $('next').disabled = !enabled || state.frame >= (selected?.frames.length || 1) - 1;
  $('play').disabled = !enabled || selected.kind === 'native-static-pose'; $('loop').disabled = $('play').disabled;
}
function optionLabel(item) {
  const direction = {left: 'profil gauche', right: 'profil droit', front: 'vue de face', unknown: 'vue source'}[item.sourceFacing];
  const motion = item.kind === 'native-static-pose' ? 'pose statique' : item.actionIdentity === 'observed-neutral-loop' ? 'boucle neutre observée'
    : item.actionIdentity === 'idle' ? 'idle natif' : 'mouvement source';
  return item.label + ' · ' + direction + ' · ' + motion;
}
function qualification(item) {
  if (item.selectablePresentationVariant && item.observedNeutralLoopReviewed) return 'Boucle neutre observée · variante d’édition proposée explicitement en combat · nom de l’action d’origine non certifié.';
  if (item.admittedTargetEdition && item.admittedCombatStates.includes('idle')) return item.kind === 'native-sequence'
    ? 'Animation native idle qualifiée pour cette incarnation.' : 'Pose native statique admise en position neutre · animation idle encore manquante.';
  return item.kind === 'native-sequence' ? 'Mouvement natif complet · action non attribuée au combat.' : 'Vue native statique · pose de combat non admise.';
}
function display(index) {
  if (!selected || !connected) return false;
  const item = selected, frame = item.frames[Math.max(0, Math.min(item.frames.length - 1, index))];
  const result = native.render(context, item.id, {x: item.pivot.x, y: item.pivot.y,
    height: item.referenceBounds.height, seconds: frame.seconds - item.frames[0].seconds,
    reducedMotion: false, respectReducedMotion: false, clearCanvas: true});
  state.buffering = !result.ok;
  if (!result.ok) {
    $('assetStatus').textContent = 'Chargement des images vérifiées…';
    native.preload(item.id, {frame: index, count: 32}).then(() => {
      if (selected === item && connected && !playing) display(index);
    }).catch(error => {if (selected === item && connected) {stop(); $('assetStatus').textContent = error.message; $('retry').hidden = false;}});
    return false;
  }
  state.frame = result.frame; state.displayed = item.id + ':' + result.frame; $('seek').value = String(result.frame);
  $('position').textContent = 'Image ' + (result.frame + 1) + ' / ' + item.frames.length + ' · ' + frame.seconds.toFixed(3) + ' s'
    + (item.kind === 'native-sequence' ? ' · ' + item.sampleRate + ' images/s' : ' · pose statique');
  $('assetStatus').textContent = 'Images vérifiées · ' + (item.kind === 'native-sequence' ? 'déformation du modèle source' : 'vue du modèle source') + '.';
  controls(); return true;
}
async function choose(id) {
  stop(); const token = ++generation; warm = false;
  selected = entries.find(entry => entry.id === id);
  if (!selected) return;
  const item = selected; state.selected = item.id; state.displayed = null; state.frame = 0;
  $('subject').value = item.id; $('edition').textContent = item.sourceEdition;
  $('qualification').textContent = qualification(item);
  $('seek').max = String(item.frames.length - 1); $('seek').value = '0';
  $('loop').checked = item.continuityVerified === true;
  canvas.width = item.frames[0].width; canvas.height = item.frames[0].height;
  canvas.setAttribute('aria-label', item.label + ' · vue ' + item.sourceFacing + ' · ' + (item.kind === 'native-sequence' ? 'mouvement natif' : 'pose native statique'));
  $('dossier').href = new URL('codex.html?id=' + encodeURIComponent(item.subjectId), root).href;
  $('sourceHolder').hidden = true;
  if (typeof item.sourcePage === 'string') {
    try {const source = new URL(item.sourcePage); if (source.protocol === 'https:') {$('source').href = source.href; $('sourceHolder').hidden = false;}} catch {}
  }
  const gaps = item.knownAppearanceGaps || [];
  $('scope').textContent = [item.scope || '', ...(item.limitations || []), ...gaps].filter(value => typeof value === 'string').join(' ')
    || 'Les formes et les courbes viennent du modèle source. La fidélité globale 1:1 reste à qualifier.';
  display(0); controls();
  try {await native.preload(item.id, {frame: 0, count: 32}); if (token !== generation || !connected) return; warm = true; display(0);}
  catch (error) {if (token === generation && connected) {$('assetStatus').textContent = error.message; $('retry').hidden = false;}}
}
function target(seconds) {
  const first = selected.frames[0].seconds; let result = 0;
  for (let index = 1; index < selected.frames.length; index++) {if (selected.frames[index].seconds - first <= seconds + 1e-8) result = index; else break;}
  return result;
}
async function play() {
  if (playing) {stop(); return;}
  if (!selected || selected.kind !== 'native-sequence') return;
  const token = generation, item = selected;
  if (!warm) {try {await native.preload(item.id, {frame: state.frame, count: 32});} catch (error) {$('assetStatus').textContent = error.message; return;}}
  if (token !== generation || !connected) return;
  if (state.frame === item.frames.length - 1) display(0);
  initial = item.frames[state.frame].seconds - item.frames[0].seconds; began = performance.now();
  playing = true; state.playing = true; $('play').textContent = 'Suspendre';
  function tick(now) {
    if (!playing || document.hidden || !connected) {stop(); return;}
    let elapsed = initial + (now - began) / 1000;
    if (elapsed >= item.durationSeconds) {
      if ($('loop').checked) elapsed %= item.durationSeconds;
      else {display(item.frames.length - 1); stop(); return;}
    }
    const index = target(elapsed);
    if (index !== state.frame || state.buffering) display(index);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
}
async function load(retry = false) {
  stop(); state.ready = false; state.failed = false; $('retry').hidden = true;
  const okay = await (retry ? native.retry() : native.ready());
  if (!connected) return;
  if (!okay) {state.failed = true; $('status').textContent = native.state().errors.join(' ') || 'Lots natifs indisponibles.'; $('retry').hidden = false; controls(); return;}
  entries = native.list();
  $('subject').replaceChildren(...entries.map(item => {const option = document.createElement('option'); option.value = item.id;
    option.textContent = optionLabel(item); return option;}));
  state.ready = true; $('subject').disabled = false;
  const uids = new Set(entries.map(item => item.subjectId)), sequences = entries.filter(item => item.kind === 'native-sequence');
  $('status').textContent = uids.size + ' sujets · ' + entries.length + ' vues ou mouvements · ' + sequences.length + ' séquences natives.';
  const params = new URL(location.href).searchParams, uid = params.get('id') || params.get('identity'), requested = params.get('sequence');
  const item = requested ? entries.find(item => item.id === requested && (!uid || item.subjectId === uid)) : uid ? entries.find(item => item.subjectId === uid) : entries[0];
  if (!item) {state.failed = true; $('status').textContent = 'Aucun lot natif disponible pour cette identité ou cette séquence.'; $('subject').disabled = true; selected = null; controls(); return;}
  choose(item.id);
}
$('subject').addEventListener('change', () => choose($('subject').value)); $('play').addEventListener('click', play);
$('previous').addEventListener('click', () => {stop(); display(state.frame - 1);}); $('next').addEventListener('click', () => {stop(); display(state.frame + 1);});
$('seek').addEventListener('input', () => {stop(); display(Number($('seek').value));}); $('retry').addEventListener('click', () => load(true));
addEventListener('blur', stop); document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
addEventListener('pagehide', () => {connected = false; ++generation; stop(); context.clearRect(0, 0, canvas.width, canvas.height);});
addEventListener('pageshow', () => {if (!connected) {connected = true; if (selected && state.ready) choose(selected.id); else load();}});
window.RE_NATIVE_PREVIEW_R30 = Object.freeze({state: () => ({...state}), choose, display, stop});
load();
