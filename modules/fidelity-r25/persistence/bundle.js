/* Select bounded replay records without restoring or rewriting their container. */
import {parseStrict, createInspector, LIMITS as INSPECTION_LIMITS} from '../../fidelity-r23/persistence/inspector.js';

export const LIMITS = Object.freeze({fileBytes: INSPECTION_LIMITS.fileBytes, records: INSPECTION_LIMITS.records, batch: 30});
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const check = (ok, message) => { if (!ok) throw Error(message); };
const bytes = text => new TextEncoder().encode(text).byteLength;
function validUnicode(text) {
  for (let n = 0; n < text.length; n++) {
    const unit = text.charCodeAt(n);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(++n);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

// Called only after strict JSON parsing. Commas inside strings or nested
// containers do not divide records. The returned source slices stay exact.
export function arraySlices(text) {
  check(typeof text === 'string', 'Archive JSON absente.');
  let cursor = 0;
  while (/\s/.test(text[cursor] || '') && cursor < text.length) cursor++;
  check(text[cursor++] === '[', 'Collection de replays attendue.');
  const slices = [];
  let start = cursor, depth = 0, quoted = false, escaped = false;
  for (; cursor < text.length; cursor++) {
    const char = text[cursor];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{' || char === '[') depth++;
    else if ((char === ',' || char === ']') && depth === 0) {
      const raw = text.slice(start, cursor);
      if (raw.trim()) slices.push(raw);
      if (char === ']') return slices;
      start = cursor + 1;
    } else if (char === '}' || char === ']') depth--;
  }
  throw Error('Collection JSON incomplète.');
}

export function createBundleReader(dependencies) {
  const {saveCenter: S, replayVault: V, engineIndex, catalogContract} = dependencies;
  check(S && V && engineIndex?.current_main && Array.isArray(engineIndex.historical_main) && typeof catalogContract === 'string', 'Validateurs et index des moteurs absents.');
  const indexed = [engineIndex.current_main, ...engineIndex.historical_main];
  check(indexed.every(e => plain(e) && typeof e.id === 'string' && typeof e.label === 'string' && /^[0-9a-f]{64}$/.test(e.runtime_contract)) && new Set(indexed.map(e => e.runtime_contract)).size === indexed.length && /^[0-9a-f]{64}$/.test(catalogContract), 'Index des contrats invalide.');
  const inspector = createInspector({saveCenter: S, replayVault: V, runtimeContract: engineIndex.current_main.runtime_contract, catalogContract});
  const engines = new Map([engineIndex.current_main, ...engineIndex.historical_main].map(e => [e.runtime_contract, e]));

  function inspect(text) {
    const value = parseStrict(text, LIMITS.fileBytes);
    const bundle = {schema: 're.bow.replay-bundle/1', kind: null, originalText: text, originalBytes: bytes(text), archiveText: null, records: [], issues: [], backupInspection: null};
    let values, rawRecords, base = '$';
    if (Array.isArray(value)) {
      check(text.length <= V.MAX_ARCHIVE_CHARS, 'Archive de replays trop volumineuse.');
      bundle.kind = 'main-replay-archive'; bundle.archiveText = text; values = value; rawRecords = arraySlices(text);
    } else if (plain(value) && value.format === S.FORMAT) {
      const backup = S.decode(text);
      bundle.kind = 'backup-r19'; bundle.backupInspection = inspector.inspect(text);
      const entry = backup.entries.find(row => row.key === V.KEY);
      if (entry.value === null) {
        bundle.issues.push({path: '$.entries[' + V.KEY + ']', code: 'no-replays', detail: 'Cette sauvegarde ne contient aucune archive de replays.'});
        return bundle;
      }
      check(entry.value.length <= V.MAX_ARCHIVE_CHARS, 'Archive imbriquée trop volumineuse.');
      check(validUnicode(entry.value), 'Archive imbriquée non représentable exactement en UTF-8 : conservez le fichier R19 original.');
      values = parseStrict(entry.value); check(Array.isArray(values), 'L’archive imbriquée doit contenir une collection.');
      bundle.archiveText = entry.value; rawRecords = arraySlices(entry.value); base = '$.entries[' + V.KEY + ']';
    } else if (plain(value) && (value.schema === 're.bow.catalog-duel-replay/1' || Object.hasOwn(value, 'frames') && Object.hasOwn(value, 'meta'))) {
      bundle.kind = value.schema === 're.bow.catalog-duel-replay/1' ? 'catalog-replay-r7' : 'main-replay-r13'; values = [value]; rawRecords = [text];
    } else throw Error('Format inconnu : choisissez un replay, une archive principale ou une sauvegarde R19.');
    check(values.length <= LIMITS.records, 'Trop de replays dans cette collection.');
    check(rawRecords.length === values.length, 'Les limites des fichiers source ne correspondent pas à la collection.');
    const ids = new Map();
    values.forEach((record, index) => {
      const path = values.length === 1 && !bundle.archiveText ? '$' : base + '[' + index + ']';
      const row = {key: String(index), path, id: typeof record?.id === 'string' ? record.id : 'Entrée ' + (index + 1), raw: rawRecords[index], value: record,
        status: 'refused', reason: '', engine: null, commandFrames: null, kind: null};
      try {
        const report = inspector.inspect(row.raw);
        check(report.result !== 'errors', report.issues.filter(i => i.severity === 'error').map(i => i.detail).join(' ; ') || 'Replay invalide.');
        check(report.records.length === 1 && ['main-replay-r13', 'catalog-replay-r7'].includes(report.kind), 'Un replay individuel est attendu.');
        check(bundle.archiveText === null || report.kind === 'main-replay-r13', 'Une archive principale ne peut contenir qu’un replay principal.');
        const entry = report.records[0]; row.kind = entry.kind; row.commandFrames = entry.frames;
        if (report.kind === 'catalog-replay-r7') {
          check(record.contract === catalogContract, 'Contrat expérimental inconnu : utiliser son moteur d’origine.');
          row.engine = {id: 'catalog-current', label: 'Duel expérimental actuel'};
        } else {
          row.engine = engines.get(record.meta.runtimeContract) || null;
          check(row.engine, 'Contrat principal inconnu ou absent : utiliser son moteur d’origine.');
        }
        row.status = 'ready';
      } catch (error) { row.reason = String(error.message || error); }
      bundle.records.push(row);
      if (typeof record?.id === 'string') {
        if (!ids.has(record.id)) ids.set(record.id, []);
        ids.get(record.id).push(row);
      }
    });
    for (const [id, rows] of ids) if (rows.length > 1) for (const row of rows) {
      row.status = 'refused'; row.reason = 'Identifiant répété dans la collection : ' + id + '. Aucun choix automatique.';
    }
    return bundle;
  }
  return Object.freeze({inspect});
}

// The caller supplies the already isolated original-engine task factory. Each
// record gets its own iframe; no shared simulated state crosses records.
export function createBatch(records, createVerification, options = {}) {
  check(Array.isArray(records) && records.length > 0 && records.length <= LIMITS.batch, 'Choisissez de 1 à 30 replays par lot.');
  check(new Set(records.map(r => r.key)).size === records.length && records.every(r => r.status === 'ready'), 'Sélection répétée ou replay non vérifiable.');
  let cancelled = false, active = null;
  const result = {schema: 're.bow.replay-batch-verification/1', cancelled: false, readOnly: true, total: records.length, completed: 0, records: [], limits: ['Seuls les contrats de moteurs disponibles sont reconstruits.', 'Chaque replay est simulé deux fois, dans un nouvel espace isolé.', 'Aucune restauration, progression de campagne, conclusion artistique ou fidélité Resident Evil n’est certifiée.']};
  let complete;
  const promise = new Promise(resolve => { complete = resolve; });
  (async () => {
    for (const record of records) {
      if (cancelled) break;
      options.onRecord?.({index: result.completed, total: records.length, record});
      const entry = {key: record.key, path: record.path, id: record.id, status: 'refused', engine: record.engine};
      try {
        active = await createVerification(record.value, {onProgress: detail => { if (!cancelled) options.onProgress?.({...detail, index: result.completed, totalRecords: records.length}); }});
        if (cancelled) { active.promise.catch(() => {}); active.cancel(); break; }
        entry.verification = await active.promise;
        if (cancelled) break;
        check(entry.verification?.verified === true && entry.verification.passes === 2 && entry.verification.exactFinalStatesEqual === true, 'La relecture n’a pas produit deux états vérifiés.');
        entry.status = 'verified';
      } catch (error) {
        if (cancelled) break;
        entry.reason = String(error.message || error);
      } finally { active = null; }
      result.records.push(entry); result.completed++;
      options.onResult?.(entry);
    }
    result.cancelled = cancelled;
    result.verified = result.completed === result.total && result.records.every(r => r.status === 'verified');
    complete(result);
  })().catch(error => {
    result.error = String(error.message || error); result.verified = false; complete(result);
  });
  return Object.freeze({promise, cancel() {
    cancelled = true; active?.cancel(); result.cancelled = true; result.verified = false; complete(result);
  }});
}
