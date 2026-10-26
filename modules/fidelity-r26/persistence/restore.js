/* R26: atomic IndexedDB rehearsal. Never reads or writes the game's localStorage. */
import {parseStrict} from '../../fidelity-r23/persistence/inspector.js';
export const DATABASE_NAME = 're.bow.restore-rehearsal.r26';
export const SCHEMA = 're.bow.isolated-restore-rehearsal/1';
const fail = (ok, message) => { if (!ok) throw Error(message); };
const copy = value => JSON.parse(JSON.stringify(value));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const abortError = () => Object.assign(Error('Opération annulée : aucune transaction validée.'), {name: 'AbortError'});

export function createRehearsal({saveCenter: S, indexedDB = globalThis.indexedDB, name = DATABASE_NAME, now = () => new Date().toISOString()} = {}) {
  fail(S && typeof S.decode === 'function' && typeof S.create === 'function', 'Contrat R19 indisponible.');
  fail(indexedDB && typeof indexedDB.open === 'function', 'IndexedDB indisponible : aucun stockage remplacé.');
  fail(typeof name === 'string' && (name === DATABASE_NAME || name.startsWith(DATABASE_NAME + '.')), 'Le nom doit désigner une base de répétition R26.');
  const plans = new WeakMap(); let dbPromise, closed = false;
  function decode(text) { parseStrict(text, S.MAX_FILE); return S.decode(text); }
  function connect() {
    fail(!closed, 'Atelier fermé.');
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1); let refused = false;
      request.onupgradeneeded = () => { request.result.createObjectStore('values', {keyPath: 'key'}); request.result.createObjectStore('meta', {keyPath: 'key'}); };
      request.onblocked = () => { refused = true; reject(Error('Base occupée par un autre onglet ; fermez cet atelier puis réessayez.')); };
      request.onerror = () => reject(request.error || Error('Ouverture de la base refusée.'));
      request.onsuccess = () => { const db = request.result; if (closed || refused) { db.close(); reject(Error('Atelier fermé.')); return; } db.onversionchange = () => db.close(); resolve(db); };
    }).catch(error => { dbPromise = undefined; throw error; });
    return dbPromise;
  }
  function validated(rows) {
    fail(Array.isArray(rows), 'État de répétition illisible.');
    const values = new Map(rows.map(row => [row.key, row.value]));
    fail(rows.length === S.KEYS.length && values.size === S.KEYS.length && S.KEYS.every(key => values.has(key)), 'Inventaire de répétition inconnu.');
    const ordered = S.KEYS.map(key => ({key, value: values.get(key)}));
    S.encode(ordered, 'Atelier isolé R26', '2026-10-25T00:00:00.000Z');
    return ordered;
  }
  function transact(mode, action, {signal} = {}) {
    if (signal?.aborted) return Promise.reject(abortError());
    return connect().then(db => new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(abortError()); return; }
      let transaction, result, reason;
      try { transaction = db.transaction(['values', 'meta'], mode); } catch (error) { reject(error); return; }
      const entriesStore = transaction.objectStore('values'), metaStore = transaction.objectStore('meta');
      const cancel = () => { reason = abortError(); try { transaction.abort(); } catch {} };
      signal?.addEventListener('abort', cancel, {once: true});
      const cleanup = () => signal?.removeEventListener('abort', cancel);
      transaction.oncomplete = () => { cleanup(); resolve(result); };
      transaction.onabort = () => { cleanup(); reject(reason || transaction.error || Error('Transaction annulée.')); };
      transaction.onerror = () => { reason ||= transaction.error; };
      const rowsRequest = entriesStore.getAll(), metaRequest = metaStore.get('state'); let pending = 2;
      const ready = () => {
        if (--pending) return;
        try {
          const state = metaRequest.result?.value || {schema: SCHEMA, revision: 0, initialized: false, journal: null};
          fail(state.schema === SCHEMA && Number.isSafeInteger(state.revision) && state.revision >= 0, 'Métadonnées de répétition inconnues.');
          const rows = state.initialized ? validated(rowsRequest.result) : [];
          fail(state.initialized || rowsRequest.result.length === 0, 'Valeurs orphelines : aucune écriture autorisée.');
          result = action({rows, state: copy(state), entriesStore, metaStore});
        } catch (error) { reason = error; try { transaction.abort(); } catch {} }
      };
      rowsRequest.onsuccess = ready; metaRequest.onsuccess = ready;
    }));
  }
  const snapshot = () => transact('readonly', ({rows, state}) => ({entries: copy(rows), ...state}));
  function write(entriesStore, metaStore, rows, state) {
    entriesStore.clear(); for (const row of rows) entriesStore.put(copy(row));
    metaStore.put({key: 'state', value: state});
  }
  async function initialize(text, {expectedRevision = 0, signal} = {}) {
    const incoming = decode(text), rows = validated(incoming.entries), date = now();
    return transact('readwrite', ({state, entriesStore, metaStore}) => {
      fail(state.revision === expectedRevision, 'Atelier modifié depuis l’aperçu : import refusé.');
      const next = {schema: SCHEMA, revision: state.revision + 1, initialized: true, updatedAt: date, source: incoming.source, journal: null};
      write(entriesStore, metaStore, rows, next);
      return {revision: next.revision, entries: copy(rows), initialized: true};
    }, {signal});
  }
  async function prepare(text, ids) {
    const incoming = decode(text), state = await snapshot(); fail(state.initialized, 'Importez d’abord la copie de départ dans l’atelier isolé.');
    const values = new Map(state.entries.map(r => [r.key, r.value]));
    const memory = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
    const original = S.create({storage: memory, source: 'Atelier isolé R26'}), planR19 = original.prepare(text, ids), beforeText = original.backup(planR19);
    original.acknowledge(planR19, beforeText); fail(original.apply(planR19, true).ok, 'Aperçu R19 refusé.');
    for (const group of S.GROUPS.filter(group => ids.includes(group.id))) for (const key of group.keys) { const raw = incoming.entries.find(row => row.key === key).value; if (raw !== null) parseStrict(raw); }
    const after = S.KEYS.map(key => ({key, value: values.get(key) ?? null}));
    const plan = Object.freeze({groups: Object.freeze([...planR19.groups]), changes: Object.freeze(planR19.changes.map(row => Object.freeze({...row}))), source: incoming.source, createdAt: incoming.createdAt, revision: state.revision});
    plans.set(plan, {before: state.entries, after, beforeText, used: false, acknowledged: false}); return plan;
  }
  function privatePlan(plan) { const value = plans.get(plan); fail(value && !value.used, 'Aperçu absent, périmé ou déjà utilisé.'); return value; }
  const backup = plan => privatePlan(plan).beforeText;
  function acknowledge(plan, text) { const p = privatePlan(plan); fail(text === p.beforeText, 'Copie de sécurité différente de l’aperçu.'); p.acknowledged = true; }
  function cancel(plan) { const p = plans.get(plan); if (p) p.used = true; }
  async function apply(plan, {confirmed = false, signal} = {}) {
    const p = privatePlan(plan); fail(confirmed === true && p.acknowledged, 'Conservez la copie avant restauration et confirmez la répétition.');
    p.used = true; const date = now();
    return transact('readwrite', ({rows, state, entriesStore, metaStore}) => {
      fail(state.revision === plan.revision && equal(rows, p.before), 'Atelier modifié depuis l’aperçu : aucune valeur remplacée.');
      const journal = {state: 'committed', at: date, groups: [...plan.groups], before: copy(rows), after: copy(p.after), source: plan.source};
      const next = {...state, revision: state.revision + 1, updatedAt: date, journal};
      write(entriesStore, metaStore, p.after, next);
      return {ok: true, state: 'committed', revision: next.revision, changed: plan.changes.length};
    }, {signal});
  }
  async function rollback({expectedRevision, confirmed = false, signal} = {}) {
    fail(confirmed === true, 'Confirmez le retour de la répétition.'); const date = now();
    return transact('readwrite', ({rows, state, entriesStore, metaStore}) => {
      fail(state.revision === expectedRevision && state.journal?.state === 'committed', 'Journal absent, déjà utilisé ou état modifié.');
      const before = validated(state.journal.before), after = validated(state.journal.after);
      fail(equal(rows, after), 'Modification extérieure conservée : retour refusé.');
      const next = {...state, revision: state.revision + 1, updatedAt: date, journal: {...state.journal, state: 'rolled-back', rolledBackAt: date}};
      write(entriesStore, metaStore, before, next); return {ok: true, state: 'rolled-back', revision: next.revision};
    }, {signal});
  }
  async function exportText() { const state = await snapshot(); fail(state.initialized, 'Atelier vide.'); return S.encode(state.entries, 'Atelier isolé R26 · copie après répétition', state.updatedAt); }
  async function clear({expectedRevision, confirmed = false} = {}) {
    fail(confirmed === true, 'Confirmez l’effacement de l’atelier isolé.');
    return transact('readwrite', ({state, entriesStore, metaStore}) => { fail(state.revision === expectedRevision, 'Atelier modifié : effacement refusé.'); entriesStore.clear(); metaStore.put({key: 'state', value: {schema: SCHEMA, revision: state.revision + 1, initialized: false, journal: null}}); return {cleared: true, revision: state.revision + 1}; });
  }
  async function close() { closed = true; if (dbPromise) (await dbPromise).close(); }
  return Object.freeze({snapshot, initialize, prepare, backup, acknowledge, cancel, apply, rollback, exportText, clear, close});
}
