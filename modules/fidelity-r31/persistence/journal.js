/* Durable write-ahead recovery metadata. Game values never enter this database implicitly. */
export const DATABASE = 're.bow.real-restore.r31';
export const JOURNAL_SCHEMA = 're.bow.real-restore-journal-r31/1';
const check = (ok, message) => {if (!ok) throw Error(message);};
export function createIndexedJournal({indexedDB = globalThis.indexedDB, name = DATABASE} = {}) {
  check(indexedDB?.open && (name === DATABASE || name.startsWith(DATABASE + '.')), 'Journal local indisponible.');
  let connection;
  function open() {
    if (connection) return connection;
    const opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1); let refused = false;
      request.onupgradeneeded = () => {request.result.createObjectStore('payload', {keyPath: 'id'}); request.result.createObjectStore('meta', {keyPath: 'key'});};
      request.onblocked = () => {refused = true; reject(Error('Journal occupé : fermez les autres pages de restauration.'));};
      request.onerror = () => reject(request.error || Error('Journal inaccessible.'));
      request.onsuccess = () => {const db = request.result; if (refused) {db.close(); return;}
        db.onversionchange = () => {if (connection === opening) connection = undefined; db.close();}; resolve(db);};
    });
    connection = opening;
    opening.catch(() => {if (connection === opening) connection = undefined;});
    return opening;
  }
  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['payload', 'meta'], mode), meta = tx.objectStore('meta'), payload = tx.objectStore('payload');
      let result, reason;
      tx.oncomplete = () => resolve(result); tx.onabort = () => reject(reason || tx.error || Error('Journal non confirmé.'));
      tx.onerror = () => {reason ||= tx.error;};
      const request = meta.get('active');
      request.onsuccess = () => {try {action({current: request.result?.value || null, meta, payload, done: value => {result = value;}, fail: error => {reason = error; tx.abort();}});} catch (error) {reason = error; tx.abort();}};
    });
  }
  const read = () => transaction('readonly', ({current, payload, done}) => {
    if (!current) {done(null); return;}
    const request = payload.get(current.id); request.onsuccess = () => done({meta: current, payload: request.result || null});
  });
  const begin = record => transaction('readwrite', ({current, meta, payload, done}) => {
    check(!current, 'Un journal existe déjà : terminez ou annulez cette restauration avant une autre.');
    const value = {id: record.id, state: 'prepared', revision: 1, cursor: 0, sha256: record.sha256, updatedAt: record.createdAt};
    payload.put(record); meta.put({key: 'active', value}); done(value);
  });
  const update = (expected, change) => transaction('readwrite', ({current, meta, done}) => {
    check(current?.id === expected.id && current.revision === expected.revision, 'Le journal a changé dans une autre page.');
    const value = {...current, ...change, id: current.id, sha256: current.sha256, revision: current.revision + 1};
    meta.put({key: 'active', value}); done(value);
  });
  const clear = expected => transaction('readwrite', ({current, meta, payload, done}) => {
    check(current?.id === expected.id && current.revision === expected.revision, 'Le journal a changé.');
    check(['committed', 'rolled-back'].includes(current.state), 'Une récupération en cours ne peut pas être effacée.');
    payload.delete(current.id); meta.delete('active'); done({cleared: true});
  });
  return Object.freeze({read, begin, update, clear, async close() {const closing = connection; connection = undefined; if (closing) try {(await closing).close();} catch { /* A refused opening has no live database to close. */ }}});
}
