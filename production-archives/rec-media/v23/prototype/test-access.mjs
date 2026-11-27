import test from 'node:test';
import assert from 'node:assert/strict';
import './access-model.js';
import './demo-data.js';

const A = globalThis.REC_ACCESS_V23, D = globalThis.REC_ACCESS_DEMO;
const { ids, catalogue } = D;
const slot = (scenario, id) => A.resolveSlot(catalogue.find(item => item.id === id), scenario.profile, scenario.context, catalogue);
const authority = { verify: event => event.proof === 'fixture-verified' };
const event = (overrides = {}) => ({ eventId: 'evt-1', profileId: 'p', sourceId: 'support', contentId: 'skin', revision: 1, action: 'grant', kind: 'temporary', issuedAt: 100, validFrom: 90, validUntil: 300, proofUntil: 200, proof: 'fixture-verified', ...overrides });

test('secret : aucun nom, portrait, silhouette, condition détaillée ou alt révélateur', () => {
  const result = slot(D.createScenario('arrival'), ids.billy);
  assert.equal(result.discovery, 'secret');
  assert.equal(result.view.image, null);
  assert.equal(result.view.imageAlt, '');
  assert.equal(result.rule, null);
  assert.doesNotMatch(JSON.stringify(result.view), /Billy|Coen|Prisoner|partnerChallenge/i);
  assert.equal(result.actions.inspect, true);
  assert.equal(result.actions.select, false);
});

test('silhouette : révélation partielle distincte du secret et de la possession', () => {
  const s = D.createScenario('arrival'), result = slot(s, ids.rebecca);
  assert.equal(result.discovery, 'hint'); assert.ok(result.view.image);
  assert.doesNotMatch(result.view.name + result.view.imageAlt, /Rebecca/i);
  assert.equal(result.actions.select, false);
  s.context.revealSecrets = true;
  assert.equal(slot(s, ids.rebecca).discovery, 'identified');
  assert.equal(slot(s, ids.rebecca).access.granted, false);
});

test('ET : toutes les conditions sont nécessaires, aucune conversion de chaîne en booléen', () => {
  const rule = catalogue.find(item => item.id === ids.rebecca).rule;
  assert.equal(A.evaluateRule(rule, { routeComplete: true, medicalReports: 2 }).complete, false);
  assert.equal(A.evaluateRule(rule, { routeComplete: 'true', medicalReports: 3 }).complete, false);
  assert.equal(A.evaluateRule(rule, { routeComplete: true, medicalReports: 3 }).complete, true);
  assert.equal(A.evaluateRule(rule, Object.create({ routeComplete: true, medicalReports: 3 })).complete, false);
});

test('OU : le défi seul rend la récompense disponible sans abonnement ni seconde branche', () => {
  const s = D.createScenario('rule-or');
  assert.equal(slot(s, ids.billy).access.state, 'claimable');
  assert.equal(slot(s, ids.billy).actions.select, false);
  s.grant(ids.billy, 'claim:partner');
  assert.equal(slot(s, ids.billy).actions.select, true);
});

test('conditions malformées ou récursives : échec fermé, sans eval', () => {
  assert.equal(A.evaluateRule({ op: 'any', rules: [] }).valid, false);
  assert.equal(A.evaluateRule({ op: 'all', rules: [] }).valid, false);
  assert.equal(A.evaluateRule({ op: 'counter', key: 'x', target: 0 }).valid, false);
  assert.equal(A.evaluateRule({ op: 'counter', key: 'x', target: 1 }, { x: Infinity }).complete, false);
  assert.equal(A.evaluateRule({ op: 'javascript', key: 'globalThis' }).valid, false);
  const recursive = { op: 'all', rules: [] }; recursive.rules.push(recursive);
  assert.equal(A.evaluateRule(recursive).valid, false);
});

test('récompense : attribution avant présentation et répétition idempotente', () => {
  const s = D.createScenario('claim');
  assert.equal(slot(s, ids.rebecca).access.state, 'claimable');
  s.grant(ids.rebecca, 'claim:medical'); const first = JSON.stringify(s.profile.ledger);
  s.grant(ids.rebecca, 'claim:medical');
  assert.equal(JSON.stringify(s.profile.ledger), first);
  assert.equal(slot(s, ids.rebecca).access.state, 'permanent');
});

test('un compte lié, un drapeau abonné ou des fichiers présents ne valent pas droit', () => {
  const s = D.createScenario('arrival');
  s.profile.discovery[ids.billy] = 'identified';
  s.profile.linked = true; s.profile.subscriber = true; s.profile.unlocked = true;
  assert.equal(slot(s, ids.billy).technical, 'ready');
  assert.equal(slot(s, ids.billy).access.granted, false);
});

test('frontière d’autorité : événements non vérifiés et mauvais profil refusés', () => {
  const ledger = A.emptyLedger('p'); const before = JSON.stringify(ledger);
  assert.throws(() => A.applyGrantEvent(ledger, event({ proof: 'client-flag' }), authority), /non vérifié/);
  assert.throws(() => A.applyGrantEvent(ledger, event(), null), /non vérifié/);
  assert.throws(() => A.applyGrantEvent(ledger, event({ profileId: 'someone-else' }), authority), /autre profil/);
  assert.equal(JSON.stringify(ledger), before);
});

test('dates et type de droit invalides : aucun journal partiellement écrit', () => {
  const ledger = A.emptyLedger('p');
  for (const changes of [{ validUntil: 80 }, { proofUntil: 301 }, { proofUntil: 99 }, { revision: 0 }, { revision: NaN }, { issuedAt: Infinity }, { kind: 'permanent' }, { action: 'revoke', reason: '' }]) {
    assert.throws(() => A.applyGrantEvent(ledger, event(changes), authority));
  }
  assert.equal(ledger.sources.length, 0); assert.equal(ledger.events.length, 0);
});

test('doublons altérés : même événement ou révision ne peut changer sa récompense', () => {
  const first = A.applyGrantEvent(A.emptyLedger('p'), event(), authority);
  assert.equal(A.applyGrantEvent(first.ledger, event(), authority).outcome, 'duplicate');
  assert.throws(() => A.applyGrantEvent(first.ledger, event({ validUntil: 400 }), authority), /réutilisé/);
  assert.throws(() => A.applyGrantEvent(first.ledger, event({ eventId: 'evt-other' }), authority), /conflictuelle/);
  assert.throws(() => A.applyGrantEvent(first.ledger, event({ eventId: 'evt-other', revision: 2, contentId: 'other' }), authority), /changer de contenu/);
});

test('événements désordonnés : un ancien retrait ne supprime pas un renouvellement', () => {
  const renewed = A.applyGrantEvent(A.emptyLedger('p'), event({ eventId: 'evt-3', revision: 3, validUntil: 500, proofUntil: 400 }), authority);
  const stale = A.applyGrantEvent(renewed.ledger, event({ eventId: 'evt-2', revision: 2, action: 'revoke', reason: 'refund' }), authority);
  assert.equal(stale.outcome, 'stale');
  assert.equal(stale.ledger.sources[0].status, 'granted');
  assert.equal(stale.ledger.sources[0].revision, 3);
  const revoked = A.applyGrantEvent(stale.ledger, event({ eventId: 'evt-4', revision: 4, action: 'revoke', reason: 'confirmed-refund' }), authority);
  assert.equal(revoked.ledger.sources[0].status, 'revoked');
});

test('costume obtenu avant son personnage : acquisition conservée, dépendance expliquée', () => {
  const s = D.createScenario('costume-first'), result = slot(s, ids.palette);
  assert.equal(result.access.state, 'permanent');
  assert.equal(result.actions.select, false);
  assert.ok(result.compatibility.includes('dependency'));
  s.grant(ids.rebecca, 'reward-parent');
  assert.equal(slot(s, ids.palette).actions.select, true);
});

test('expiration : seule la source temporaire est retirée de l’accès effectif', () => {
  const expired = D.createScenario('support-expired');
  assert.equal(slot(expired, ids.palette).access.state, 'expired');
  assert.equal(expired.profile.preference, ids.palette);
  const permanent = D.createScenario('permanent-retained');
  assert.equal(slot(permanent, ids.palette).access.state, 'permanent');
  assert.equal(slot(permanent, ids.palette).actions.select, true);
  assert.equal(permanent.profile.ledger.sources.filter(source => source.contentId === ids.palette).length, 2);
});

test('remboursement : une source révoquée ne retire pas une autre acquisition', () => {
  const s = D.createScenario('permanent-retained');
  const source = s.profile.ledger.sources.find(item => item.sourceId === 'support-catalogue');
  const revoke = { ...event(), eventId: 'revoke-support', profileId: s.profile.id, sourceId: source.sourceId, contentId: ids.palette, revision: 2, action: 'revoke', reason: 'confirmed-refund' };
  s.profile.ledger = A.applyGrantEvent(s.profile.ledger, revoke, authority).ledger;
  assert.equal(slot(s, ids.palette).access.state, 'permanent');
});

test('hors ligne : cache valide accepté ; justificatif périmé signifie attente, pas expiration', () => {
  const cached = slot(D.createScenario('offline-cache'), ids.palette);
  assert.equal(cached.actions.select, true); assert.equal(cached.access.offlineCached, true);
  const pending = slot(D.createScenario('offline-pending'), ids.palette);
  assert.equal(pending.access.state, 'pending');
  assert.equal(pending.access.reason, 'service-unavailable');
  assert.equal(pending.actions.select, false);
});

test('installation et version : le droit reste visible mais ne permet pas un chargement impossible', () => {
  const s = D.createScenario('missing-files');
  let result = slot(s, ids.stage);
  assert.equal(result.access.state, 'permanent'); assert.equal(result.technical, 'missing'); assert.equal(result.actions.select, false);
  s.context.installations[ids.stage] = { status: 'ready', version: 'old-demo' };
  result = slot(s, ids.stage); assert.equal(result.technical, 'update'); assert.equal(result.actions.select, false);
});

test('mode et doublon : la possession individuelle ne valide pas la composition', () => {
  const wrong = slot(D.createScenario('wrong-mode'), ids.rebecca);
  assert.equal(wrong.access.state, 'permanent'); assert.ok(wrong.compatibility.includes('mode'));
  const duplicate = slot(D.createScenario('duplicate'), ids.barry);
  assert.equal(duplicate.access.state, 'permanent'); assert.ok(duplicate.compatibility.includes('duplicate'));
});

test('participation et replay ne donnent pas le droit de choisir le stage', () => {
  const s = D.createScenario('arrival');
  s.profile.ledger.sources = s.profile.ledger.sources.filter(source => source.contentId !== ids.stage);
  s.context.installations[ids.stage].status = 'ready';
  const result = slot(s, ids.stage);
  assert.equal(result.actions.select, false); assert.equal(result.actions.participate, true); assert.equal(result.actions.replay, true);
  s.context.installations[ids.stage].status = 'missing';
  assert.equal(slot(s, ids.stage).actions.replay, false);
});

test('préférence : remplacement explicite sans effacement de l’apparence favorite', () => {
  const s = D.createScenario('support-expired');
  const result = A.resolveSavedChoice(s.profile.preference, [ids.base], catalogue, s.profile, s.context);
  assert.equal(result.preferredId, ids.palette); assert.equal(result.effectiveId, ids.base); assert.equal(result.substituted, true);
  assert.equal(s.profile.preference, ids.palette);
});

test('session autorisée : instantané immuable, expiration appliquée au prochain choix', () => {
  const s = D.createScenario('support-active');
  const session = A.createSessionSnapshot([ids.palette], catalogue, s.profile, s.context);
  const before = JSON.stringify(session); s.context.now += 3 * 86400000;
  assert.equal(slot(s, ids.palette).actions.select, false);
  assert.equal(JSON.stringify(session), before); assert.equal(Object.isFrozen(session.items), true);
  assert.throws(() => A.createSessionSnapshot([], catalogue, s.profile, s.context));
  assert.throws(() => A.createSessionSnapshot([ids.barry, ids.barry], catalogue, s.profile, s.context));
});

test('dépendances cycliques : pas de récursion infinie ni contenu sélectionnable', () => {
  const s = D.createScenario('arrival'), base = catalogue.find(item => item.id === ids.barry);
  const cyclic = [{ ...base, requires: ['cycle-b'] }, { ...base, id: 'cycle-b', requires: [base.id] }];
  const result = A.resolveSlot(cyclic[0], s.profile, s.context, cyclic);
  assert.ok(result.compatibility.includes('dependency-cycle')); assert.equal(result.actions.select, false);
});

test('navigation rapide : une ancienne réussite ou erreur ne remplace pas le choix récent', () => {
  const controller = A.createSelectionController();
  const old = controller.begin('old'), current = controller.begin('current');
  assert.equal(controller.accept(old, 'old', { url: 'old.png' }), false);
  assert.equal(controller.fail(old, 'old'), false);
  assert.equal(controller.accept(current, 'current', { url: 'current.png' }), true);
  assert.equal(controller.state.preview.url, 'current.png');
  assert.equal(controller.state.message, '');
});

test('désélection et retour : les réponses tardives ne ressuscitent ni image ni identité', () => {
  const controller = A.createSelectionController(); const token = controller.begin('first'); controller.cancel();
  assert.equal(controller.accept(token, 'first', { url: 'late.png' }), false);
  assert.equal(controller.fail(token, 'first'), false);
  assert.equal(controller.state.id, null); assert.equal(controller.state.preview, null);
  const next = controller.begin('second'); controller.invalidate();
  assert.equal(controller.accept(next, 'second', { url: 'second.png' }), false);
});

test('confirmation : droits revérifiés et état indépendant de la fin de chargement visuel', () => {
  const controller = A.createSelectionController(); const token = controller.begin('candidate');
  assert.equal(controller.confirm(() => true), true);
  assert.equal(controller.state.phase, 'confirmed');
  assert.equal(controller.accept(token, 'candidate', { url: 'late-but-current.png' }), true);
  assert.equal(controller.state.phase, 'confirmed');
  assert.equal(controller.confirm(() => true), false);
  controller.begin('expired');
  assert.equal(controller.confirm(() => 'Accès arrivé à échéance.'), false);
  assert.equal(controller.state.phase, 'blocked');
});

test('notification de récompense : conservée après un chargement visuel tardif', () => {
  const controller = A.createSelectionController(); const token = controller.begin('reward');
  controller.announce('Récompense acquise.');
  controller.accept(token, 'reward', { url: 'reward.png' });
  assert.equal(controller.state.message, 'Récompense acquise.');
});

test('sélection automatique : aucun secret, droit manquant, erreur technique ou doublon', () => {
  const s = D.createScenario('arrival');
  assert.deepEqual(A.selectableIds(catalogue, s.profile, s.context), [ids.barry]);
  s.context.team = ['barry-rev2'];
  assert.deepEqual(A.selectableIds(catalogue, s.profile, s.context), []);
});
