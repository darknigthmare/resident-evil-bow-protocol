import {readManifest, readImage, localURL} from './library.js';
const $ = id => document.getElementById(id), text = (tag, value) => { const node = document.createElement(tag); node.textContent = String(value); return node; };
let manifest = null, selected = null, facing = 'right', active = true, generation = 0, initialization = 0, request = null, prepared = null;
const state = {ready: false, failed: false, selected: null, facing: 'right', displayed: null, frames: 0, animated: false, editionPromoted: false};
const stop = () => { generation++; request?.abort(); request = null; prepared?.release(); prepared = null; $('image').replaceChildren(); state.displayed = null; state.frames = 0; };
function sourceLink(source, label) { const link = text('a', label); link.href = localURL(source.path); const item = document.createElement('li'); item.append(link); $('sources').append(item); }
function describe(entry) {
  $('title').textContent = entry.sourceVariantLabel;
  $('edition').textContent = entry.sourceEdition + ' ; édition cible PlayStation non assimilée.';
  $('scope').textContent = entry.availableStates.length ? 'Pose neutre fixe adaptée ; choix volontaire possible dans le combat. Une image par côté, aucune animation idle originale.' : entry.scope === 'context-encounter' ? 'Rencontre contextuelle : présentation documentaire, sans admission comme combattant.' : 'Présentation de la pose source compacte ; aucun état de combat ou cycle de vol attribué.';
  $('facts').replaceChildren();
  for (const [key, value] of [['Identité du catalogue', entry.id], ['Orientation produite', entry.sourceFacing === 'left' ? 'Gauche' : 'Droite'], ['Nature', 'Création générée depuis des vues natives'], ['Images / animation', '1 / aucune animation'], ['Dimensions', entry.width + ' × ' + entry.height], ['SHA-256', entry.sha256]]) $('facts').append(text('dt', key), text('dd', value));
  $('notes').textContent = entry.limitations.join(' '); $('sources').replaceChildren();
  for (const [index, source] of entry.provenance.references.entries()) sourceLink(source, 'Vue native conservée ' + (index + 1));
  sourceLink(entry.provenance.sourceArchive, 'Archive source publiée conservée');
  sourceLink(entry.provenance.generationRecord, 'Demande et reçu de génération');
  sourceLink(entry.sourceCompletenessEvidence, 'Observation corporelle et réserves');
  for (const button of $('choices').children) button.setAttribute('aria-current', String(button.dataset.family === entry.variantFamilyId));
  for (const input of $('sides').querySelectorAll('input')) input.checked = input.value === facing;
}
async function choose(familyId = selected, side = facing) {
  if (!manifest || !['left', 'right'].includes(side)) return;
  const entry = manifest.variants.find(value => value.variantFamilyId === familyId && value.sourceFacing === side);
  if (!entry) throw new Error('Profil inconnu');
  stop(); const token = generation; selected = familyId; facing = side;
  Object.assign(state, {selected: entry.variantId, facing, failed: false}); describe(entry);
  $('message').textContent = 'Vérification et chargement du profil…'; request = new AbortController();
  try {
    const loaded = await readImage(entry, request.signal);
    if (token !== generation || !active) { loaded.release(); return; }
    prepared = loaded; loaded.image.id = 'generatedSpriteR33'; $('image').replaceChildren(loaded.image);
    Object.assign(state, {displayed: entry.sha256, frames: 1});
    $('message').textContent = 'PNG vérifié. Profil fixe réellement produit, sans miroir ni animation.';
  } catch (error) {
    if (token !== generation || !active) return;
    state.failed = true; $('message').textContent = 'Chargement refusé : ' + error.message;
  }
  if (token !== generation || !active) return;
  const url = new URL(location.href); url.searchParams.set('family', familyId); url.searchParams.set('side', side); history.replaceState(null, '', url);
}
async function initialize() {
  const token = ++initialization; state.failed = false; const controller = new AbortController(); request = controller;
  try {
    const value = await readManifest(controller.signal);
    if (token !== initialization || !active) return;
    manifest = value; state.ready = true; $('sides').disabled = false;
    $('summary').textContent = '8 nouveaux PNG, 4 familles GameCube, deux côtés distincts par famille. 0 nouvel idle original certifié.';
    $('choices').replaceChildren(...manifest.families.map(family => { const button = text('button', family.label); button.type = 'button'; button.dataset.family = family.id; button.append(text('small', 'Deux profils fixes — source GameCube')); button.addEventListener('click', () => choose(family.id)); return button; }));
    const query = new URL(location.href).searchParams;
    const family = manifest.families.find(value => value.id === query.get('family')) || manifest.families[0];
    await choose(selected || family.id, ['left', 'right'].includes(query.get('side')) ? query.get('side') : facing);
  } catch (error) { if (token !== initialization || !active) return; state.failed = true; $('message').textContent = 'Registre refusé : ' + error.message; }
}
for (const input of $('sides').querySelectorAll('input')) input.addEventListener('change', () => { if (input.checked) choose(selected, input.value); });
$('retry').addEventListener('click', () => state.ready ? choose() : initialize());
addEventListener('pagehide', () => { active = false; initialization++; stop(); });
addEventListener('pageshow', () => { if (!active) { active = true; state.ready ? choose() : initialize(); } });
globalThis.RE_SPRITE_GALLERY_R33 = Object.freeze({state: () => ({...state}), choose});
await initialize();
