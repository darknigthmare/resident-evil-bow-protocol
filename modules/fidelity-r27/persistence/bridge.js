/* Read a consistent isolated R26 revision, never the game's storage. */
import {createBundleReader, createBatch, LIMITS} from '../../fidelity-r25/persistence/bundle.js';
import {SCHEMA as SOURCE_SCHEMA} from '../../fidelity-r26/persistence/restore.js';

export const SCHEMA = 're.bow.restored-replay-bridge/1';
export {LIMITS};
const check = (ok, text) => { if (!ok) throw Error(text); };
const copy = value => JSON.parse(JSON.stringify(value));
const rawState = value => JSON.stringify(value.entries);
const aborted = () => Object.assign(Error('Lecture annulée. Rechargez la révision isolée pour réessayer.'), {name: 'AbortError'});

export function createRestoredReplayBridge({rehearsal, saveCenter: S, replayVault, engineIndex, catalogContract, createVerification,
  digest = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(n => n.toString(16).padStart(2, '0')).join('')} = {}) {
  check(rehearsal && typeof rehearsal.snapshot === 'function' && S && typeof createVerification === 'function', 'Lecteur de la base isolée ou moteur absent.');
  const reader = createBundleReader({saveCenter: S, replayVault, engineIndex, catalogContract});
  let loaded, task, busy = false, closed = false, serial = 0;
  function state() {
    return {ready: !!loaded && !closed, busy, closed, stale: loaded?.stale || false, source: loaded ? copy(loaded.source) : null,
      records: loaded ? loaded.bundle.records.map(({key, path, id, status, reason, engine, commandFrames}) => ({key, path, id, status, reason, engine: engine && copy(engine), commandFrames})) : [],
      issues: loaded ? copy(loaded.bundle.issues) : []};
  }
  async function current() {
    check(!closed, 'Lecteur fermé.');
    const value = await rehearsal.snapshot();
    check(value.schema === SOURCE_SCHEMA && value.initialized === true && Number.isSafeInteger(value.revision) && value.revision > 0 && Array.isArray(value.entries), 'Atelier isolé vide ou inconnu. Préparez une copie dans l’atelier R26.');
    return value;
  }
  async function open() {
    check(!busy && !closed, 'Terminez ou annulez le lot en cours.');
    const request = ++serial; loaded = null; busy = true;
    try {
      const value = await current(), text = S.encode(value.entries, 'Lecture de la base isolée R26', value.updatedAt || '2026-10-25T00:00:00.000Z');
      const bundle = reader.inspect(text);
      const source = {type: 'isolated-r26-indexeddb', revision: value.revision, journalState: value.journal?.state || null,
        archiveSha256: bundle.archiveText === null ? null : await digest(bundle.archiveText),
        archiveBytes: bundle.archiveText === null ? 0 : new TextEncoder().encode(bundle.archiveText).byteLength,
        rawValuesSha256: await digest(rawState(value)), capturedAt: new Date().toISOString(),
        originalR19TransportPreserved: false, nestedArchiveRewritten: false, gameStorageWritten: false};
      if (request !== serial || closed) throw aborted();
      loaded = {bundle, source, originalRows: rawState(value), stale: false}; busy = false;
      return state();
    } finally { busy = false; }
  }
  async function assertFresh() {
    check(loaded && !loaded.stale && !closed, 'Rechargez d’abord la révision de l’atelier isolé.');
    const captured = loaded;
    let value;
    try { value = await current(); }
    catch (error) { captured.stale = true; throw error; }
    if (closed || loaded !== captured) throw aborted();
    if (value.revision !== captured.source.revision || rawState(value) !== captured.originalRows) {
      captured.stale = true;
      throw Error('L’atelier isolé a changé depuis sa lecture. Rechargez la révision avant toute vérification ou extraction.');
    }
    return true;
  }
  async function archive() {
    check(!busy, 'Attendez la fin du lot.'); await assertFresh();
    check(loaded.bundle.archiveText !== null, 'Cette révision ne contient pas d’archive de replays.');
    return loaded.bundle.archiveText;
  }
  async function record(key) {
    check(!busy, 'Attendez la fin du lot.'); await assertFresh();
    const item = loaded.bundle.records.find(row => row.key === key); check(item, 'Replay absent de cette révision.');
    return item.raw;
  }
  async function verify(keys, options = {}) {
    check(!busy && !closed && loaded && !loaded.stale, 'Rechargez une révision disponible avant de vérifier.');
    check(Array.isArray(keys) && keys.length > 0 && keys.length <= LIMITS.batch && keys.every(key => typeof key === 'string') && new Set(keys).size === keys.length, 'Choisissez de 1 à 30 replays distincts.');
    const rows = keys.map(key => loaded.bundle.records.find(row => row.key === key));
    check(rows.every(row => row?.status === 'ready'), 'La sélection contient un replay absent ou refusé.');
    busy = true; const request = ++serial, source = copy(loaded.source);
    try {
      await assertFresh(); if (request !== serial || closed) throw aborted();
      task = createBatch(rows, createVerification, options);
      const result = await task.promise;
      if (request !== serial || closed) return {...result, schema: SCHEMA, verified: false, cancelled: true, source, sourceValidatedAfter: false};
      let sourceValidatedAfter = true, sourceCheckError;
      try { await assertFresh(); } catch (error) { sourceValidatedAfter = false; sourceCheckError = error.message; }
      return {...result, schema: SCHEMA, verified: result.verified && sourceValidatedAfter, source, sourceValidatedAfter,
        sourceStale: !sourceValidatedAfter, ...(sourceCheckError ? {sourceCheckError} : {}),
        limits: [...result.limits, 'Le verdict concerne les octets capturés de la base isolée. Il ne restaure ni le jeu ni le cloud et ne certifie aucun contenu artistique.']};
    } finally { task = null; busy = false; }
  }
  function cancel() { serial++; task?.cancel(); }
  async function close() { if (closed) return; closed = true; cancel(); loaded = undefined; await rehearsal.close?.(); }
  return Object.freeze({state, open, archive, record, verify, cancel, close});
}
