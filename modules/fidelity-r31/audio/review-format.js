/* Portable listening notes; user reports never become native action certification. */
const HASH = /^[a-f0-9]{64}$/;
const UID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fields = ['clipId', 'sourceSha256', 'candidateIdentityId', 'heard', 'speaker', 'phase', 'action', 'note'];
function object(value) {return value !== null && typeof value === 'object' && !Array.isArray(value);}
function only(value, names) {return object(value) && Object.keys(value).every(key => names.includes(key));}
export function validateManifest(value) {
  if (!object(value) || value.schema !== 're.bow.audio-candidate-library-r31/1' || value.release !== 'R31'
      || value.canonicalFidelityCertified !== false || !Array.isArray(value.entries) || !value.entries.length || value.entries.length > 512
      || !Array.isArray(value.identities) || value.identities.length > 389 || !Array.isArray(value.sources) || value.sources.length > 16) throw Error('Bibliothèque audio non reconnue.');
  const ids = new Set(value.identities.map(row => row.id)), seen = new Set();
  if (ids.size !== value.identities.length || [...ids].some(id => !UID.test(id))) throw Error('Identités audio non valides.');
  const sourceIds = new Set();
  for (const source of value.sources) {
    let url;
    try {url = new URL(source.url);} catch {throw Error('Page source audio non valide.');}
    if (!Number.isSafeInteger(source.assetId) || sourceIds.has(source.assetId)
        || url.protocol !== 'https:' || url.hostname !== 'sounds.spriters-resource.com' || url.username || url.password
        || !/^modules\/fidelity-r31\/audio\/archives\/asset-[0-9]+\.zip$/.test(source.archive?.path)
        || !HASH.test(source.archive?.sha256 || '') || typeof source.title !== 'string' || source.title.length > 400) throw Error('Origine audio non valide.');
    sourceIds.add(source.assetId);
  }
  for (const row of value.entries) {
    if (!object(row) || !/^[a-f0-9]{24}$/.test(row.clipId) || seen.has(row.clipId) || !HASH.test(row.sha256)
        || !sourceIds.has(row.assetId) || !Number.isSafeInteger(row.bytes) || row.bytes < 44 || row.bytes > 4 * 1024 * 1024
        || !/^modules\/fidelity-r31\/audio\/clips\/[0-9]+\/[a-f0-9]{24}\.(?:ogg|wav)$/.test(row.path)
        || !Array.isArray(row.candidateIdentityIds) || !row.candidateIdentityIds.length || row.candidateIdentityIds.some(id => !ids.has(id))
        || typeof row.publishedLabel !== 'string' || row.publishedLabel.length > 400
        || typeof row.sourceEdition !== 'string' || !row.sourceEdition.trim() || row.sourceEdition.length > 1000
        || row.identityId !== null || row.targetEditionEquivalenceVerified !== false || row.independentListeningCompleted !== false
        || row.canonicalFidelityCertified !== false || row.nativeGameBankCertified !== false || row.combatAudioAssigned !== false || row.sourceBytesTransformed !== false
        || row.sourcePage !== value.sources.find(source => source.assetId === row.assetId).url
        || row.action !== null || row.phase !== null || row.language !== null
        || !object(row.probe) || !Number.isFinite(row.probe.durationSeconds) || row.probe.durationSeconds <= 0 || row.probe.durationSeconds > 120
        || !['wav', 'ogg'].includes(row.probe.format) || ![1, 2].includes(row.probe.channels)
        || ![22050, 32000, 44100, 48000].includes(row.probe.sampleRate)) throw Error('Description audio non valide.');
    seen.add(row.clipId);
  }
  return value;
}
export function validateNotes(value, manifest, manifestSha256) {
  if (!HASH.test(manifestSha256) || !only(value, ['schema', 'manifestSha256', 'notes', 'canonicalFidelityCertified', 'combatAudioAssigned'])
      || value.schema !== 're.bow.audio-listening-notes-r31/1' || value.manifestSha256 !== manifestSha256
      || value.canonicalFidelityCertified !== false || value.combatAudioAssigned !== false
      || !Array.isArray(value.notes) || value.notes.length > manifest.entries.length) throw Error('Le fichier de notes ne correspond pas à cette bibliothèque.');
  const clips = new Map(manifest.entries.map(row => [row.clipId, row])), seen = new Set(), notes = [];
  for (const note of value.notes) {
    const clip = clips.get(note?.clipId);
    if (!only(note, fields) || Object.keys(note).length !== fields.length || !clip || seen.has(note.clipId)
        || note.sourceSha256 !== clip.sha256 || typeof note.heard !== 'boolean'
        || note.candidateIdentityId !== null && !clip.candidateIdentityIds.includes(note.candidateIdentityId)
        || ['speaker', 'phase', 'action'].some(key => typeof note[key] !== 'string' || note[key].length > 160)
        || typeof note.note !== 'string' || note.note.length > 2000) throw Error('Une note contient une identité, une empreinte ou un champ non valide.');
    notes.push({...note}); seen.add(note.clipId);
  }
  return notes.sort((a, b) => a.clipId.localeCompare(b.clipId));
}
export function documentFor(notes, manifest, manifestSha256) {
  const value = {schema: 're.bow.audio-listening-notes-r31/1', manifestSha256,
    notes: [...notes], canonicalFidelityCertified: false, combatAudioAssigned: false};
  value.notes = validateNotes(value, manifest, manifestSha256); return value;
}
