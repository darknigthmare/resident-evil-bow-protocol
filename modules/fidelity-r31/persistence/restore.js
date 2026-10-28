/* Real R19-allowlisted game values, durable recovery journal and explicit replay-safe restore. */
import {parseStrict} from '../../fidelity-r23/persistence/inspector.js';
import {createIndexedJournal, JOURNAL_SCHEMA} from './journal.js';
const check = (ok, message) => {if (!ok) throw Error(message);};
const textBytes = value => new TextEncoder().encode(value);
const json = value => JSON.stringify(value);
const same = (a, b) => json(a) === json(b);
const clone = value => JSON.parse(json(value));
export const LOCK = 're.bow.real-restore.r31';
export const LIMITS = Object.freeze({journalBytes: 68 * 1024 * 1024, history: 1});
const states = ['prepared', 'applying', 'rolling-back', 'interrupted', 'committed', 'rolled-back'];
export function createRestorer({saveCenter: S, storage = globalThis.localStorage, journal = createIndexedJournal(),
  crypto = globalThis.crypto, locks = globalThis.navigator?.locks, now = () => new Date().toISOString(), afterWrite} = {}) {
  check(S?.create && S?.encode && S?.decode && crypto?.subtle, 'Contrats de sauvegarde ou SHA-256 indisponibles.');
  const vault = S.create({storage, source: 'B.O.W. Protocol · copie locale R31'}), plans = new WeakMap();
  let busy = false;
  const sha = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', textBytes(value)))].map(n => n.toString(16).padStart(2, '0')).join('');
  const content = record => json([record.schema, record.id, record.createdAt, record.groups, record.beforeText, record.afterText]);
  function decode(text) {parseStrict(text, S.MAX_FILE); return S.decode(text);}
  function rows(text) {return decode(text).entries;}
  function activePlan(plan) {const value = plans.get(plan); check(value && !value.used, 'Aperçu absent, périmé ou déjà utilisé.'); return value;}
  function local() {return vault.snapshot().entries;}
  function selectedKeys(groups) {return new Set(S.GROUPS.filter(group => groups.includes(group.id)).flatMap(group => group.keys));}
  async function readJournal() {
    const current = await journal.read(); if (!current) return null;
    const {meta, payload: record} = current;
    check(record && record.schema === JOURNAL_SCHEMA && typeof record.id === 'string' && record.id.length <= 80
      && meta.id === record.id && states.includes(meta.state) && Number.isSafeInteger(meta.revision) && meta.revision > 0,
      'Journal illisible : aucune reprise automatique. Conservez votre copie exportée.');
    check(Array.isArray(record.groups) && record.groups.length > 0 && new Set(record.groups).size === record.groups.length
      && record.groups.every(id => S.GROUPS.some(group => group.id === id)), 'Groupes du journal inconnus.');
    check(typeof record.beforeText === 'string' && typeof record.afterText === 'string'
      && textBytes(content(record)).byteLength <= LIMITS.journalBytes && /^[a-f0-9]{64}$/.test(record.sha256 || '')
      && meta.sha256 === record.sha256 && await sha(content(record)) === record.sha256, 'Empreinte du journal différente : restauration refusée.');
    const before = rows(record.beforeText), after = rows(record.afterText), chosen = selectedKeys(record.groups);
    check(before.every((row, index) => row.key === S.KEYS[index]) && after.every((row, index) => row.key === S.KEYS[index]), 'Ordre des clés du journal différent du contrat R19.');
    check(before.every((row, index) => row.key === after[index].key && (chosen.has(row.key) || row.value === after[index].value)), 'Le journal modifierait un groupe non choisi.');
    check(S.describe(after).filter(group => record.groups.includes(group.id)).every(group => group.present > 0 && group.restorable), 'Copie entrante du journal endommagée.');
    return {meta, payload: record, before, after};
  }
  async function exclusive(action) {
    check(!busy, 'Une restauration est déjà en cours dans cette page.');
    check(typeof locks?.request === 'function', 'Verrou inter-onglets indisponible : export possible, restauration désactivée.');
    busy = true;
    try {return await locks.request(LOCK, {mode: 'exclusive', ifAvailable: true}, lock => {check(lock, 'Une autre page de restauration est occupée.'); return action();});}
    finally {busy = false;}
  }
  async function snapshot() {
    const entries = local(), saved = await readJournal();
    return {entries, groups: S.describe(entries), busy, journal: saved && {id: saved.meta.id, state: saved.meta.state,
      revision: saved.meta.revision, cursor: saved.meta.cursor, groups: saved.payload.groups, createdAt: saved.payload.createdAt,
      sha256: saved.payload.sha256, changes: saved.before.filter((row, index) => row.value !== saved.after[index].value).length}};
  }
  async function prepare(text, groups) {
    const incoming = decode(text); check(!(await readJournal()), 'Un journal de restauration existe déjà.');
    const before = local(), map = new Map(before.map(row => [row.key, row.value]));
    const memory = {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key)};
    const temporary = S.create({storage: memory, source: 'B.O.W. Protocol · copie locale R31'});
    const previous = temporary.prepare(text, groups), beforeText = temporary.backup(previous);
    for (const group of S.GROUPS.filter(group => groups.includes(group.id))) for (const key of group.keys) {
      const raw = incoming.entries.find(row => row.key === key).value; if (raw !== null) parseStrict(raw);
    }
    temporary.acknowledge(previous, beforeText); check(temporary.apply(previous, true).ok, 'Aperçu de restauration refusé.');
    const after = S.KEYS.map(key => ({key, value: map.get(key) ?? null})), createdAt = now();
    const record = {schema: JOURNAL_SCHEMA, id: crypto.randomUUID(), createdAt, groups: [...groups], beforeText,
      afterText: S.encode(after, 'B.O.W. Protocol · état après restauration R31', createdAt)};
    check(textBytes(content(record)).byteLength <= LIMITS.journalBytes, 'Journal trop volumineux : aucune écriture appliquée.');
    record.sha256 = await sha(content(record));
    const plan = Object.freeze({id: record.id, groups: Object.freeze([...groups]), changes: Object.freeze(previous.changes.map(row => Object.freeze({...row}))), source: incoming.source});
    plans.set(plan, {record, before, used: false, acknowledged: false}); return plan;
  }
  function backup(plan) {return activePlan(plan).record.beforeText;}
  function acknowledge(plan, text) {const value = activePlan(plan); check(text === value.record.beforeText, 'Copie de sécurité différente de l’aperçu.'); value.acknowledged = true;}
  function cancel(plan) {const value = plans.get(plan); if (value) value.used = true;}
  function permitted(saved) {
    const current = local();
    check(current.every((row, index) => row.value === saved.before[index].value || row.value === saved.after[index].value),
      'Une valeur a changé hors de cette restauration. Aucune valeur extérieure ne sera remplacée.');
    return current;
  }
  async function execute(saved, direction, {signal} = {}) {
    const target = direction === 'apply' ? saved.after : saved.before;
    let meta = saved.meta, changed = 0;
    try {
      permitted(saved);
      meta = await journal.update(meta, {state: direction === 'apply' ? 'applying' : 'rolling-back', cursor: 0, updatedAt: now()});
      for (let index = 0; index < target.length; index++) {
        if (signal?.aborted) throw Error('Restauration interrompue : journal conservé pour reprise ou retour.');
        const current = permitted(saved), row = target[index];
        if (current[index].value !== row.value) {
          // The durable before/after payload already exists before this first game write.
          if (row.value === null) storage.removeItem(row.key); else storage.setItem(row.key, row.value);
          check(storage.getItem(row.key) === row.value, 'Écriture du navigateur non confirmée.'); changed++;
          await afterWrite?.({key: row.key, index, changed});
        }
        meta = await journal.update(meta, {cursor: index + 1, updatedAt: now()});
      }
      check(same(local(), target), 'État final différent : journal de récupération conservé.');
      meta = await journal.update(meta, {state: direction === 'apply' ? 'committed' : 'rolled-back', updatedAt: now()});
      return {ok: true, state: meta.state, changed, journalId: meta.id};
    } catch (error) {
      try {meta = await journal.update(meta, {state: 'interrupted', updatedAt: now()});} catch {}
      return {ok: false, state: 'interrupted', changed, journalId: meta.id, message: String(error.message || error)};
    }
  }
  async function apply(plan, {confirmed = false, signal} = {}) {
    const pending = activePlan(plan);
    check(confirmed === true && pending.acknowledged, 'Conservez la copie de sécurité puis confirmez le remplacement.');
    return exclusive(async () => {
      check(!(await readJournal()), 'Un journal existe déjà.'); check(same(local(), pending.before), 'L’état local a changé depuis l’aperçu.');
      pending.used = true; const meta = await journal.begin(pending.record);
      return execute({meta, payload: pending.record, before: pending.before, after: rows(pending.record.afterText)}, 'apply', {signal});
    });
  }
  async function recover({direction, confirmed = false, signal} = {}) {
    check(confirmed === true && ['apply', 'rollback'].includes(direction), 'Choisissez et confirmez la reprise ou le retour.');
    return exclusive(async () => {
      const saved = await readJournal(); check(saved, 'Aucun journal de récupération.');
      check(direction !== 'apply' || !['committed', 'rolled-back'].includes(saved.meta.state), 'Cette transaction est terminée : aucune nouvelle application.');
      check(direction !== 'rollback' || saved.meta.state !== 'rolled-back', 'Le retour est déjà terminé.');
      return execute(saved, direction, {signal});
    });
  }
  async function forget({confirmed = false} = {}) {
    check(confirmed === true, 'Confirmez la clôture du journal et la perte du retour intégré.');
    return exclusive(async () => {const saved = await readJournal(); check(saved, 'Aucun journal.');
      check(same(local(), saved.meta.state === 'committed' ? saved.after : saved.before), 'Le stockage a changé depuis la transaction.');
      return journal.clear(saved.meta);});
  }
  const exportBefore = async () => {const saved = await readJournal(); check(saved, 'Aucun journal.'); return saved.payload.beforeText;};
  return Object.freeze({snapshot, prepare, backup, acknowledge, cancel, apply, recover, forget, exportBefore,
    exportText: () => vault.exportText(), close: () => journal.close?.()});
}
