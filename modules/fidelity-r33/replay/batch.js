/* Bounded, read-only batches of individual R13/R7/R28 files. No engine migration. */
import {inspectReplay, createVerification} from '../../fidelity-r31/replay/verify.js';
export const LIMITS = Object.freeze({files: 16, totalBytes: 33554432, filenameChars: 240});
const check = (ok, message) => {if (!ok) throw Error(message);};
const clone = value => JSON.parse(JSON.stringify(value));
const safeMessage = error => String(error?.message || error).slice(0, 1000);
const notify = (callback, value) => {try {callback?.(clone(value));} catch { /* A view callback cannot alter simulation or cleanup. */ }};
export function createBatchReader({crypto = globalThis.crypto, inspect = inspectReplay, verify = createVerification,
  now = () => new Date().toISOString()} = {}) {
  check(crypto?.subtle && typeof inspect === 'function' && typeof verify === 'function', 'Lecteur de contrats ou SHA-256 indisponible.');
  const plans = new WeakMap();
  let busy = false;
  const sha = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
  async function prepare(inputs) {
    check(!busy, 'Une vérification est déjà en cours.');
    check(Array.isArray(inputs) && inputs.length > 0 && inputs.length <= LIMITS.files, 'Choisissez de 1 à 16 fichiers de replay individuels.');
    let totalBytes = 0;
    const files = inputs.map(input => {
      check(input && typeof input.name === 'string' && typeof input.text === 'string', 'Nom ou contenu de fichier absent.');
      return {name: input.name, text: input.text};
    });
    const bytes = files.map(input => {
      check(input && typeof input.name === 'string' && input.name.length > 0 && input.name.length <= LIMITS.filenameChars && typeof input.text === 'string', 'Nom ou contenu de fichier absent ou trop long.');
      const encoded = new TextEncoder().encode(input.text); totalBytes += encoded.byteLength;
      check(totalBytes <= LIMITS.totalBytes, 'Le lot dépasse 32 Mio au total. Aucun moteur lancé.'); return encoded;
    });
    const hashes = await Promise.all(bytes.map(sha)), seen = new Map(), privateRows = [];
    const rows = files.map((input, index) => {
      const row = {index, name: input.name, bytes: bytes[index].byteLength, sha256: hashes[index], status: 'rejected'};
      try {
        const selected = inspect(input.text);
        row.kind = selected.kind; row.engine = selected.engine; row.contract = typeof selected.contract === 'string' ? selected.contract : null;
        if (seen.has(row.sha256)) {row.status = 'duplicate'; row.duplicateOf = seen.get(row.sha256);}
        else {row.status = 'ready'; seen.set(row.sha256, index); privateRows.push({index, value: selected.value});}
      } catch (error) {row.reason = safeMessage(error);}
      return Object.freeze(row);
    });
    const plan = Object.freeze({totalBytes, rows: Object.freeze(rows)});
    plans.set(plan, privateRows); return plan;
  }
  function start(plan, options = {}) {
    check(plans.has(plan), 'Lot absent ou extérieur à cette page.');
    check(!busy, 'Une vérification est déjà en cours.');
    const selected = plans.get(plan);
    check(selected.length > 0, 'Le lot ne contient aucun replay individuel prêt à vérifier.');
    busy = true;
    let active = null, cancelled = false, settled = false, settle;
    const report = {schema: 're.bow.replay-batch-r33/1', createdAt: now(), readOnly: true, cancelled: false,
      totalFiles: plan.rows.length, totalBytes: plan.totalBytes, completed: 0, verified: 0,
      entries: plan.rows.map(row => ({...row, status: row.status === 'ready' ? 'not-started' : row.status})),
      limits: ['Chaque fichier garde le moteur de son contrat enregistré.',
        'Une seule relecture isolée est active à la fois ; deux reconstructions sont exigées.',
        'Les images, sons, récompenses, conclusions et fidélité artistique ne sont pas vérifiés.',
        'Les archives R19 et collections principales restent dans le lecteur historique.']};
    const promise = new Promise(resolve => {settle = resolve;});
    function finish() {
      if (settled) return; settled = true; busy = false;
      report.cancelled = cancelled;
      for (const row of report.entries) if (row.status === 'checking') row.status = cancelled ? 'cancelled' : 'refused';
      report.allSupportedVerified = !cancelled && report.verified === selected.length;
      report.allFilesVerified = report.allSupportedVerified && report.entries.every(row => row.status === 'verified' || row.status === 'duplicate');
      settle(clone(report));
    }
    const cancel = () => {if (settled) return; cancelled = true; active?.cancel(); finish();};
    (async () => {
      for (const selectedRow of selected) {
        if (cancelled || settled) break;
        const row = report.entries[selectedRow.index]; row.status = 'checking'; notify(options.onRecord, row);
        try {
          const task = await verify(selectedRow.value, {onProgress: detail => {
            if (!cancelled && !settled) notify(options.onProgress, {...detail, index: selectedRow.index, files: plan.rows.length});
          }});
          if (cancelled || settled) {task.promise.catch(() => {}); task.cancel(); break;}
          active = task;
          const result = await task.promise;
          if (cancelled || settled) break;
          check(result?.verified === true && result.passes === 2 && result.exactFinalStatesEqual === true, 'Le contrat n’a pas confirmé deux états finaux identiques.');
          row.status = 'verified'; row.verification = result; report.verified++;
        } catch (error) {
          if (cancelled || settled) break;
          row.status = 'refused'; row.reason = safeMessage(error);
        } finally {active = null;}
        report.completed++; notify(options.onResult, row);
      }
      finish();
    })().catch(error => {if (!settled) {report.error = safeMessage(error); finish();}});
    return Object.freeze({promise, cancel});
  }
  return Object.freeze({prepare, start, busy: () => busy});
}
