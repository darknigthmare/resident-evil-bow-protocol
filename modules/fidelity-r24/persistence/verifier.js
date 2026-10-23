/* Real-engine replay reconstruction. This module never selects a storage
 * backend or restores user data; callers supply isolated engine instances. */
(function (root) {
  'use strict';
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const clone = value => JSON.parse(JSON.stringify(value));
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
    return JSON.stringify(value);
  }
  function fingerprint(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  function stateText(state) {
    const value = clone(state);
    for (const side of ['a', 'b']) if (value[side]?.f) value[side].f = {uid: value[side].f.uid};
    if (value.stage) value.stage = {id: value.stage.id, name: value.stage.name};
    return stable(value);
  }
  function outcome(state) {
    const winner = state.winner === 0 ? state.a : state.b, loser = state.winner === 0 ? state.b : state.a;
    return {winner: winner.f.uid, loser: loser.f.uid, winnerSlot: winner.slot, life: winner.life, maxLife: winner.max, timer: state.timer, timerStart: state.timerStart, rounds: [state.a.wins, state.b.wins], stage: state.stage.name, metrics: clone(state.metrics || {})};
  }
  function compareOutcome(record, state) {
    if (record.result == null) {
      check(record.captureR13?.kind !== 'complete', 'Un enregistrement annoncé complet ne contient aucun résultat.');
      return {claimed: false, comparedFields: [], finisherVerified: false};
    }
    check(typeof record.result === 'object' && !Array.isArray(record.result), 'Résultat de replay invalide.');
    check(record.captureR13?.kind !== 'excerpt', 'Un extrait ne peut pas déclarer un résultat de victoire.');
    check(state.finished, 'Le replay déclare un résultat mais la simulation ne termine pas le combat.');
    const reconstructed = outcome(state), fields = ['winner', 'loser', 'winnerSlot', 'life', 'maxLife', 'timer', 'timerStart', 'rounds', 'stage'];
    if (Object.hasOwn(record.result, 'metrics')) fields.push('metrics');
    for (const field of fields) check(stable(record.result[field]) === stable(reconstructed[field]), 'Résultat différent après relecture : ' + field + '.');
    return {claimed: true, comparedFields: fields, reconstructed, finisherVerified: false, recordedFinisher: record.result.finisher?.id || null};
  }
  async function verifyMain(record, options = {}) {
    const api = options.api || root.__CQC060Versus, vault = options.vault || root.RE_REPLAY_VAULT;
    check(api && vault, 'Moteur principal ou validateur absent.');
    const value = vault.validateRecord(record).value;
    check(value.meta.runtimeContract === root.RE_RUNTIME_CONTRACT?.digest, 'Contrat de combat différent ou absent : utiliser le moteur d’origine.');
    const total = value.frames.reduce((sum, row) => sum + row[0], 0);
    if (value.captureR13) check(value.captureR13.frames === total && ['complete', 'excerpt'].includes(value.captureR13.kind), 'Durée ou type de capture incohérent.');
    const yieldControl = options.yieldControl || (() => Promise.resolve()), progress = options.onProgress || (() => {});
    async function run(pass) {
      api.startReplay(clone(value));
      let batches = 0;
      try {
        while (api.getReplayState().frame < total && !api.getState().finished) {
          const before = api.getReplayState().frame, remaining = total - before;
          api.advance(Math.min(15, remaining) * (1000 / 60));
          check(api.getReplayState().frame > before, 'La simulation n’avance plus.');
          if (++batches % 40 === 0) { progress({pass, frames: api.getReplayState().frame, total}); await yieldControl(); }
        }
        check(api.getReplayState().frame === total, 'Des commandes supplémentaires suivent la fin du combat.');
        const state = api.getState(), result = compareOutcome(value, state);
        return {text: stateText(state), result, state: {frame: state.frame, finished: state.finished, winner: state.winner, life: [state.a.life, state.b.life], rounds: [state.a.wins, state.b.wins]}};
      } finally { api.pause(true); }
    }
    const first = await run(1), second = await run(2);
    check(first.text === second.text, 'Deux relectures du même fichier produisent des états différents.');
    return {schema: 're.bow.replay-verification/1', kind: 'main-r13', verified: true, engineContract: value.meta.runtimeContract, commandFrames: total, passes: 2, exactFinalStatesEqual: true, stateFingerprint: {algorithm: 'fnv1a-utf16', value: fingerprint(first.text), characters: first.text.length, authenticityProof: false}, result: first.result, reconstructed: first.state, limits: ['La comparaison de déterminisme porte sur deux états complets reconstruits dans ce moteur.', 'Les conclusions artistiques et leurs images/sons ne sont pas rejouées.', 'Une empreinte FNV ne prouve pas l’authenticité du fichier.']};
  }
  async function verifyCatalog(record, options = {}) {
    const engine = options.engine || root.RE_CATALOG_REPLAY;
    check(engine, 'Moteur expérimental absent.');
    // validate/createPlayer are the unchanged R7 routines: validate reconstructs
    // every command and checks the stored stateDigest before a player is made.
    const validated = engine.validate(JSON.stringify(record));
    const yieldControl = options.yieldControl || (() => Promise.resolve()), progress = options.onProgress || (() => {});
    async function run(pass) {
      const player = engine.createPlayer(validated);
      while (!player.ended()) {
        player.tick(Math.min(600, player.length() - player.frame()));
        progress({pass, frames: player.frame(), total: player.length()}); await yieldControl();
      }
      return {text: stateText(player.getState()), state: {frame: player.frame(), finished: player.getState().finished, winner: player.getState().winner, life: [player.getState().a.life, player.getState().b.life]}};
    }
    const first = await run(1), second = await run(2);
    check(first.text === second.text, 'Deux relectures expérimentales produisent des états différents.');
    return {schema: 're.bow.replay-verification/1', kind: 'catalog-r7', verified: true, engineContract: validated.contract, commandFrames: validated.frames, passes: 2, exactFinalStatesEqual: true, storedStateDigestVerifiedByOriginalEngine: true, storedStateDigest: validated.stateDigest, stateFingerprint: {algorithm: 'fnv1a-utf16', value: fingerprint(first.text), characters: first.text.length, authenticityProof: false}, reconstructed: first.state, limits: ['Le moteur R7 reconstruit les commandes et vérifie stateDigest.', 'Aucun résultat ne progresse dans une campagne.', 'Une empreinte FNV ne prouve pas l’authenticité du fichier.']};
  }
  root.BOW_REPLAY_VERIFIER_R24 = Object.freeze({verifyMain, verifyCatalog, stateText, fingerprint});
})(globalThis);
