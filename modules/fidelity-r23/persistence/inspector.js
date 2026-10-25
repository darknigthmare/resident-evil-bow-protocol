/* Read-only inspection. Existing loaders retain responsibility for restoration
 * and simulation. No storage, network, replay playback or migration is called. */
export const LIMITS = Object.freeze({fileBytes: 33554432, depth: 96, records: 2048});
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const check = (ok, message) => { if (!ok) throw Error(message); };
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const bounded = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const byteLength = text => new TextEncoder().encode(text).byteLength;

// JSON.parse silently keeps the last duplicate property. Detect that ambiguity
// before passing the unchanged text to the historical validators.
export function parseStrict(text, maximum = LIMITS.fileBytes) {
  check(typeof text === 'string' && text.length <= maximum && byteLength(text) <= maximum, 'Fichier absent ou trop volumineux.');
  let cursor = 0;
  const space = () => { while (/\s/.test(text[cursor] || '') && cursor < text.length) cursor++; };
  function string() {
    const start = cursor++;
    while (cursor < text.length) {
      const character = text[cursor++];
      if (character === '"') return JSON.parse(text.slice(start, cursor));
      if (character === '\\') cursor++;
    }
    throw Error('Chaîne JSON incomplète.');
  }
  function value(depth) {
    check(depth <= LIMITS.depth, 'Imbrication JSON trop profonde.');
    space();
    const character = text[cursor];
    if (character === '"') { string(); return; }
    if (character === '{' || character === '[') {
      const object = character === '{', end = object ? '}' : ']';
      const names = new Set(); cursor++; space();
      if (text[cursor] === end) { cursor++; return; }
      while (cursor < text.length) {
        if (object) {
          check(text[cursor] === '"', 'Propriété JSON attendue.');
          const name = string();
          check(!names.has(name), 'Propriété JSON répétée : ' + name.slice(0, 100));
          names.add(name); space();
          check(text[cursor++] === ':', 'Séparateur JSON attendu.');
        }
        value(depth + 1); space();
        if (text[cursor] === end) { cursor++; return; }
        check(text[cursor++] === ',', 'Liste JSON incomplète.'); space();
      }
      throw Error('Objet JSON incomplet.');
    }
    const start = cursor;
    while (cursor < text.length && !/[\s,\]}]/.test(text[cursor])) cursor++;
    check(cursor > start, 'Valeur JSON attendue.');
  }
  value(0); space();
  check(cursor === text.length, 'Données après le document JSON.');
  return JSON.parse(text);
}

export function createInspector(dependencies) {
  const {saveCenter: S, replayVault: V, runtimeContract, catalogContract, data} = dependencies;
  check(S && typeof S.decode === 'function' && typeof S.describe === 'function' && V && typeof V.validateRecord === 'function', 'Validateurs historiques absents.');
  const current = (found, expected) => typeof found !== 'string' || !expected ? 'unknown' : found === expected ? 'current-contract' : 'different-contract';
  const issue = (report, code, path, detail, severity = 'warning') => report.issues.push({code, path, detail, severity});
  function main(value, path, report) {
    const validated = V.validateRecord(value);
    const compatibility = current(value.meta.runtimeContract, runtimeContract);
    if (compatibility !== 'current-contract') issue(report, 'replay-contract', path, compatibility === 'different-contract' ? 'Contrat différent : conserver et ouvrir dans la version d’origine.' : 'Contrat absent : compatibilité non établie.');
    if (data) for (const side of ['p1', 'p2']) check(data.fighters.some(f => f.uid === value.meta[side]), 'Identité du replay inconnue : ' + side);
    return {id: value.id, path, kind: 'main-replay', frames: validated.frames, compatibility, structural: 'valid', simulation: 'not-run'};
  }
  function archive(value, path, report) {
    check(Array.isArray(value) && value.length <= LIMITS.records, 'Collection de replays invalide ou trop longue.');
    const ids = new Map();
    value.forEach((record, index) => {
      const address = path + '[' + index + ']';
      try {
        const item = main(record, address, report);
        if (ids.has(item.id)) issue(report, 'duplicate-replay-id', address, 'Identifiant déjà présent dans ' + ids.get(item.id) + '. Aucun choix automatique.', 'error');
        else ids.set(item.id, address);
        report.records.push(item);
      } catch (error) { issue(report, 'invalid-replay', address, error.message, 'error'); }
    });
  }
  function catalog(value, report) {
    check(exact(value, ['schema', 'contract', 'setup', 'frames', 'runs', 'stateDigest']), 'Structure de replay expérimental inconnue.');
    check(exact(value.setup, ['uid', 'target', 'stage', 'mode', 'seed']), 'Configuration expérimentale invalide.');
    check(['human', 'cpu'].includes(value.setup.mode) && bounded(value.setup.seed, 0, 0xffffffff), 'Mode ou graine invalide.');
    check(['uid', 'target', 'stage'].every(key => typeof value.setup[key] === 'string' && value.setup[key].length > 0 && value.setup[key].length <= 180), 'Identité ou arène invalide.');
    if (data) {
      for (const key of ['uid', 'target']) check(data.fighters.some(f => f.uid === value.setup[key]), 'Sujet expérimental inconnu : ' + key);
      check(data.stages.some(stage => stage.id === value.setup.stage), 'Arène expérimentale inconnue.');
    }
    check(bounded(value.frames, 0, 36000) && Array.isArray(value.runs) && value.runs.length <= value.frames, 'Durée expérimentale invalide.');
    check(typeof value.stateDigest === 'string' && /^[0-9a-f]{8}$/.test(value.stateDigest), 'Empreinte d’état invalide.');
    let frames = 0;
    for (const row of value.runs) {
      check(Array.isArray(row) && row.length === 3 && bounded(row[0], 1, 36000) && bounded(row[1], 0, 127) && bounded(row[2], -1, 9), 'Commande expérimentale invalide.');
      check(value.setup.mode !== 'cpu' || (row[1] === 0 && row[2] === -1), 'Commandes humaines dans une archive IA.');
      frames += row[0]; check(frames <= value.frames, 'Durée expérimentale dépassée.');
    }
    check(frames === value.frames, 'Séquence expérimentale tronquée.');
    const compatibility = current(value.contract, catalogContract);
    if (compatibility !== 'current-contract') issue(report, 'replay-contract', '$', 'Contrat expérimental différent ou absent : utiliser la version d’origine.');
    issue(report, 'simulation-pending', '$', 'La structure et le contrat sont inspectés. Le moteur expérimental doit encore reconstruire et vérifier l’état.');
    report.records.push({path: '$', kind: 'catalog-replay', frames, compatibility, structural: 'valid', simulation: 'not-run'});
  }
  function backup(value, text, report) {
    const decoded = S.decode(text);
    report.groups = S.describe(decoded.entries).map(group => ({id: group.id, label: group.label, present: group.present, outerReadable: group.restorable}));
    const slots = new Map();
    for (const entry of decoded.entries) {
      if (entry.value === null) continue;
      const address = '$.entries[' + entry.key + ']';
      try {
        // R19 limits individual raw values in UTF-16 code units. The outer
        // file byte limit is checked separately; UTF-8 must not narrow a
        // historically readable non-ASCII value to an 8 MiB byte ceiling.
        const nested = parseStrict(entry.value);
        if (entry.key === V.KEY) { archive(nested, address, report); continue; }
        check(plain(nested), 'Objet de sauvegarde attendu.');
        if (entry.key.endsWith('.a') || entry.key.endsWith('.b')) {
          const payloadKey = entry.key.startsWith('re.bow.context-journal/') ? 'value' : 'payload';
          const minimum = payloadKey === 'value' ? 1 : 0;
          check(bounded(nested.revision, minimum, 1e9) && Object.hasOwn(nested, payloadKey), 'Enveloppe de reprise invalide.');
          if (entry.key.startsWith('re.bow.chronicles055.')) check(nested.format === 're.bow.save-slot/1', 'Format de copie Dossier inconnu.');
          if (entry.key.startsWith('re.bow.operations.checkpoint/1.')) check(nested.format === 're.bow.operation-slot/1', 'Format de copie Opérations inconnu.');
          if (payloadKey === 'value') check(plain(nested.value) && nested.value.format === 're.bow.context-checkpoint/1', 'Format de reprise contextuelle inconnu.');
          check(nested.checksum === S.hash(JSON.stringify(nested[payloadKey])), 'Empreinte de reprise incorrecte.');
          const groupKey = entry.key.slice(0, -2), other = slots.get(groupKey);
          const payloadText = JSON.stringify(nested[payloadKey]);
          if (other && nested.revision === other.revision && payloadText !== other.payloadText) issue(report, 'same-revision-divergence', address, 'Deux copies de même révision ont des contenus différents. Ne pas choisir selon l’ordre des slots.', 'error');
          slots.set(groupKey, {revision: nested.revision, payloadText});
          report.records.push({path: address, kind: 'paired-save-slot', revision: nested.revision, structural: 'valid', semantic: 'loader-required'});
        } else if (entry.key === 're.bow.context-journal/1.records') {
          check(plain(nested.records) && nested.checksum === S.hash(JSON.stringify(nested.records)), 'Empreinte du registre contextuel incorrecte.');
          report.records.push({path: address, kind: 'context-records', structural: 'valid', semantic: 'loader-required'});
        } else report.records.push({path: address, kind: 'legacy-settings-or-profile', structural: 'outer-object-only', semantic: 'loader-required'});
      } catch (error) { issue(report, 'invalid-save-content', address, error.message, 'error'); }
    }
    issue(report, 'loader-validation-pending', '$', 'Une enveloppe lisible ne valide pas les règles de progression, les réglages ou l’état de combat. Utiliser le chargeur de chaque mode.');
  }
  function inspect(text) {
    const report = {schema: 're.bow.persistence-inspection/1', kind: 'unknown', bytes: typeof text === 'string' ? byteLength(text) : 0, readOnly: true, originalRewritten: false, records: [], groups: [], issues: []};
    try {
      const value = parseStrict(text);
      if (plain(value) && value.format === S.FORMAT) { report.kind = 'backup-r19'; backup(value, text, report); }
      else if (Array.isArray(value)) { check(text.length <= V.MAX_ARCHIVE_CHARS, 'Archive de replays trop volumineuse.'); report.kind = 'main-replay-archive'; archive(value, '$', report); }
      else if (plain(value) && value.schema === 're.bow.catalog-duel-replay/1') { check(byteLength(text) <= 1048576, 'Replay expérimental trop volumineux.'); report.kind = 'catalog-replay-r7'; catalog(value, report); }
      else if (plain(value) && Object.hasOwn(value, 'frames') && Object.hasOwn(value, 'meta')) { check(text.length <= V.MAX_RECORD_CHARS, 'Replay principal trop volumineux.'); report.kind = 'main-replay-r13'; report.records.push(main(value, '$', report)); }
      else throw Error('Format non pris en charge : conserver le fichier et sa version d’origine.');
    } catch (error) { issue(report, 'inspection-refused', '$', error.message, 'error'); }
    report.result = report.issues.some(item => item.severity === 'error') ? 'errors' : 'inspected';
    report.playbackCertified = false;
    return report;
  }
  function compare(leftText, rightText) {
    const left = inspect(leftText), right = inspect(rightText);
    check(left.result !== 'errors' && right.result !== 'errors', 'Comparer exige deux documents inspectés sans erreur structurelle.');
    check(left.kind === right.kind, 'Formats différents : comparaison refusée.');
    const a = parseStrict(leftText), b = parseStrict(rightText);
    const changes = [];
    if (left.kind === 'backup-r19') {
      const other = new Map(b.entries.map(row => [row.key, row.value]));
      for (const row of a.entries) if (row.value !== other.get(row.key)) changes.push({key: row.key, state: row.value === null ? 'only-right' : other.get(row.key) === null ? 'only-left' : 'different-raw-content'});
    } else if (left.kind === 'main-replay-archive') {
      const aa = new Map(a.map(row => [row.id, row])), bb = new Map(b.map(row => [row.id, row]));
      for (const id of new Set([...aa.keys(), ...bb.keys()])) if (JSON.stringify(aa.get(id)) !== JSON.stringify(bb.get(id))) changes.push({id, state: !aa.has(id) ? 'only-right' : !bb.has(id) ? 'only-left' : 'conflicting-replay-id'});
    } else if (leftText !== rightText) changes.push({state: 'different-raw-content'});
    return {schema: 're.bow.persistence-comparison/1', kind: left.kind, byteIdentical: leftText === rightText, changes, readOnly: true, resolution: 'none'};
  }
  return Object.freeze({inspect, compare});
}
