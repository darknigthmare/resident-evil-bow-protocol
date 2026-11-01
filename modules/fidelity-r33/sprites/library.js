/** Read-only source-edition gallery. No actor, command, storage or default-sprite writes. */
export const repository = new URL('../../../', import.meta.url);
const signature = [137, 80, 78, 71, 13, 10, 26, 10];
const fail = message => { throw new Error(message); };
export function localURL(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('%') || value.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(value) || value.split('/').some(part => part === '.' || part === '..')) fail('Chemin local invalide');
  const url = new URL(value, repository);
  if (url.origin !== repository.origin || !url.pathname.startsWith(repository.pathname) || url.search || url.hash || decodeURIComponent(url.pathname).includes('..')) fail('Source extérieure refusée');
  return url;
}
export function validateManifest(manifest) {
  if (manifest?.schema !== 're.bow.source-edition-generated-sprites-r33/1' || manifest.release !== 'R33' || !Array.isArray(manifest.variants) || !Array.isArray(manifest.families)) fail('Registre R33 invalide');
  const ids = new Set();
  for (const entry of manifest.variants) {
    if (ids.has(entry.variantId) || !entry.variantId || !entry.variantFamilyId || !['left', 'right'].includes(entry.sourceFacing)) fail('Variante de côté invalide');
    ids.add(entry.variantId);
    localURL(entry.image);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > 12 * 1024 * 1024 || !Number.isSafeInteger(entry.width) || !Number.isSafeInteger(entry.height) || entry.width <= 0 || entry.height <= 0 || entry.width * entry.height > 2000000) fail('Dimensions ou empreinte invalides');
    if (entry.canMirror !== false || entry.defaultAdmission !== false || entry.admittedTargetEdition !== false || entry.targetEditionMatched !== false || entry.animationFrames !== 1 || entry.animated !== false || entry.canonicalFidelityCertified !== false) fail('Qualification R33 invalide');
    if (!Array.isArray(entry.availableStates) || entry.availableStates.some(value => value !== 'idle')) fail('État non produit');
    if (entry.availableStates.length && (entry.scope !== 'combatant-neutral-pose' || entry.poseKind !== 'neutral-base' || entry.fullBodyReviewed !== true || entry.knownAppearanceGaps.length)) fail('Une étude ne peut devenir un état de combat');
  }
  for (const family of manifest.families) {
    const pair = manifest.variants.filter(entry => entry.variantFamilyId === family.id);
    if (pair.length !== 2 || new Set(pair.map(entry => entry.sourceFacing)).size !== 2 || pair.some(entry => entry.sourceVariantLabel !== family.label || entry.id !== family.subjectId)) fail('Paire documentaire incomplète');
  }
  if (new Set(manifest.families.map(family => family.id)).size !== manifest.families.length || manifest.variants.length !== manifest.families.length * 2) fail('Familles documentaires invalides');
  return manifest;
}
export async function verifyBytes(raw, entry) {
  const bytes = new Uint8Array(raw);
  if (bytes.byteLength !== entry.bytes) fail('Taille PNG différente');
  const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
  if (sha !== entry.sha256) fail('Empreinte SHA-256 différente');
  if (!signature.every((value, index) => bytes[index] === value)) fail('Signature PNG invalide');
  return bytes;
}
export async function readManifest(signal) {
  const response = await fetch(new URL('manifest.json', import.meta.url), {signal, cache: 'no-store'});
  if (!response.ok) fail('Registre indisponible : HTTP ' + response.status);
  return validateManifest(await response.json());
}
export async function readImage(entry, signal) {
  const response = await fetch(localURL(entry.image), {signal, cache: 'no-store'});
  if (!response.ok) fail('PNG indisponible : HTTP ' + response.status);
  const bytes = await verifyBytes(await response.arrayBuffer(), entry);
  if (signal?.aborted) throw new DOMException('Chargement interrompu', 'AbortError');
  const url = URL.createObjectURL(new Blob([bytes], {type: 'image/png'})), image = new Image();
  let released = false;
  const release = () => { if (!released) { released = true; image.removeAttribute('src'); URL.revokeObjectURL(url); signal?.removeEventListener('abort', release); } };
  signal?.addEventListener('abort', release, {once: true});
  image.src = url;
  try {
    await image.decode();
    if (signal?.aborted || released) throw new DOMException('Chargement interrompu', 'AbortError');
    if (image.naturalWidth !== entry.width || image.naturalHeight !== entry.height) fail('Dimensions décodées différentes');
    image.alt = entry.sourceVariantLabel + ' — ' + (entry.sourceFacing === 'left' ? 'profil gauche' : 'profil droit') + ', création générée fixe';
    image.dataset.sha256 = entry.sha256;
    return {image, release};
  } catch (error) { release(); throw error; }
}
