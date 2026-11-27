(function (root) {
  'use strict';
  const API = root.REC_ACCESS_V23;
  const NOW = Date.UTC(2026, 10, 27, 12), DAY = 86400000, HOUR = 3600000;
  const ids = Object.freeze({ barry: 'dossier-01', rebecca: 'dossier-02', billy: 'dossier-03', base: 'tenue-01', palette: 'tenue-02', stage: 'lieu-01', mode: 'epreuve-01' });
  const common = { version: 'demo-1', preview: 'free', training: 'owned', participation: 'everyone', replay: 'allowed', modes: ['versus', 'training'], requires: [], claim: 'manual' };
  const catalogue = [
    { ...common, id: ids.barry, name: 'Barry Burton', category: 'character', group: 'barry-rev2', origin: 'Revelations 2 · 2015', lore: 'Identité et tenue de référence de Revelations 2. Pose candidate V22 ; sélection adaptée.', image: '../../v22/assets/REC_BARRY_REV2_BASE_FULLBODY_FRONT_V22_01.png', hintAllowed: true, condition: 'Dossier de départ de cette démonstration.', modes: ['versus', 'training', 'campaign_rev2'] },
    { ...common, id: ids.rebecca, name: 'Rebecca Chambers', category: 'character', group: 'rebecca-re0hd', origin: 'Resident Evil 0 HD · 2016', lore: 'Tenue S.T.A.R.S. de RE0 HD. Les objectifs de cette démo sont des choix d’adaptation.', image: '../../v22/assets/REC_REBECCA_RE0HD_BASE_FULLBODY_FRONT_V22_01.png', hintAllowed: true, hintName: 'Dossier médical', hintOrigin: 'Archives partiellement accessibles', safeCondition: 'Compléter le dossier d’enquête et ses trois rapports.', condition: 'Route d’enquête terminée ET 3 rapports médicaux réunis. Récompense à réclamer.', rule: { op: 'all', rules: [{ op: 'fact', key: 'routeComplete', label: 'Route d’enquête terminée' }, { op: 'counter', key: 'medicalReports', label: 'Rapports médicaux', target: 3 }] } },
    { ...common, id: ids.billy, name: 'Billy Coen', category: 'character', group: 'billy-re0hd', origin: 'Resident Evil 0 HD · 2016', lore: 'Tenue Prisoner de RE0 HD. La découverte et le défi restent des adaptations de menu.', image: '../../v22/assets/REC_BILLY_RE0HD_PRISONER_FULLBODY_FRONT_V22_01.png', hintAllowed: false, safeCondition: 'Poursuivre l’enquête pour révéler ce dossier.', condition: 'Terminer la route partenaire OU réussir le défi de coopération.', rule: { op: 'any', rules: [{ op: 'fact', key: 'partnerRoute', label: 'Route partenaire terminée' }, { op: 'fact', key: 'partnerChallenge', label: 'Défi de coopération réussi' }] } },
    { ...common, id: ids.base, name: 'Tenue S.T.A.R.S. — Rebecca', category: 'costume', origin: 'Resident Evil 0 HD · 2016', lore: 'Tenue de base existante. Son droit ne remplace pas celui du personnage.', hintAllowed: false, requires: [ids.rebecca], condition: 'Incluse avec le personnage dans cet exemple.', image: null },
    { ...common, id: ids.palette, name: 'Palette Archives — Rebecca', category: 'costume', origin: 'Proposition cosmétique · non canonique', lore: 'Exemple de règle d’accès ; cette palette n’est ni dessinée ni livrée dans le jeu. Aucun avantage de combat.', hintAllowed: false, requires: [ids.rebecca], condition: 'Défi de collection OU accès temporaire de soutien simulé. Le défi accorde une acquisition permanente.', rule: { op: 'counter', key: 'collectionRecords', label: 'Dossiers de collection', target: 5 }, image: null },
    { ...common, id: ids.stage, name: 'Salle des archives', category: 'stage', origin: 'Lieu d’interface proposé · non canonique', lore: 'Métaphore d’archives matérielles adaptée à Resident Evil. Aucun lieu officiel supplémentaire n’est affirmé.', hintAllowed: false, condition: 'Acquisition de démonstration. Fichiers du stage à installer.', image: null },
    { ...common, id: ids.mode, name: 'Survie — protocole de confinement', category: 'mode', origin: 'Épreuve bonus adaptée', lore: 'Mode de démonstration des conditions. Aucune partie de survie n’est lancée ici.', hintAllowed: false, condition: 'Terminer l’initiation ET (réussir le défi bonus OU réunir 5 rapports).', rule: { op: 'all', rules: [{ op: 'fact', key: 'tutorial', label: 'Initiation terminée' }, { op: 'any', rules: [{ op: 'fact', key: 'bonus', label: 'Défi bonus réussi' }, { op: 'counter', key: 'medicalReports', label: 'Rapports médicaux', target: 5 }] }] }, image: null }
  ];
  const scenarios = [
    ['arrival', '01 · Première visite', ids.barry],
    ['claim', '02 · Récompense à réclamer', ids.rebecca],
    ['costume-first', '03 · Costume acquis avant le personnage', ids.palette],
    ['support-active', '04 · Accès temporaire valide', ids.palette],
    ['support-expired', '05 · Accès temporaire expiré', ids.palette],
    ['permanent-retained', '06 · Acquisition permanente conservée', ids.palette],
    ['offline-cache', '07 · Hors ligne, justificatif encore valide', ids.palette],
    ['offline-pending', '08 · Service indisponible, vérification requise', ids.palette],
    ['missing-files', '09 · Droit acquis, fichiers absents', ids.stage],
    ['wrong-mode', '10 · Incarnation incompatible avec le mode', ids.rebecca],
    ['duplicate', '11 · Membre déjà choisi dans l’équipe', ids.barry],
    ['rule-or', '12 · Une branche OU suffit', ids.billy]
  ].map(([id, name, focus]) => ({ id, name, focus }));

  function createScenario(id) {
    let issued = new WeakSet();
    const authority = { verify: event => issued.has(event) };
    const profile = { id: 'profil-demo', ledger: API.emptyLedger('profil-demo'), facts: {}, discovery: {}, pending: [], preference: ids.palette };
    const context = { now: NOW, network: 'online', mode: 'versus', allowDuplicates: false, team: [], installations: {}, revealSecrets: false };
    for (const item of catalogue) context.installations[item.id] = { status: 'ready', version: item.version };
    context.installations[ids.stage].status = 'missing';
    Object.assign(profile.discovery, { [ids.barry]: 'identified', [ids.rebecca]: 'hint', [ids.billy]: 'secret', [ids.base]: 'secret', [ids.palette]: 'secret', [ids.stage]: 'identified', [ids.mode]: 'identified' });
    function grant(contentId, sourceId, kind = 'permanent', options = {}) {
      const event = { eventId: options.eventId || sourceId + ':1', profileId: profile.id, sourceId, contentId, revision: 1, action: 'grant', kind, issuedAt: NOW - DAY, validFrom: NOW - DAY, ...options };
      if (kind === 'temporary') { event.validUntil ??= NOW + DAY; event.proofUntil ??= NOW + HOUR; }
      issued.add(event);
      profile.ledger = API.applyGrantEvent(profile.ledger, event, authority).ledger;
      return event;
    }
    grant(ids.barry, 'initial-barry');
    grant(ids.stage, 'initial-stage');
    grant(ids.base, 'initial-default-outfit');
    const reveal = (...keys) => keys.forEach(key => { profile.discovery[key] = 'identified'; });
    if (id === 'claim') { reveal(ids.rebecca, ids.base); Object.assign(profile.facts, { routeComplete: true, medicalReports: 3 }); }
    if (id === 'costume-first') { reveal(ids.rebecca, ids.base, ids.palette); grant(ids.palette, 'challenge-cosmetic'); }
    if (['support-active', 'support-expired', 'permanent-retained', 'offline-cache', 'offline-pending'].includes(id)) {
      reveal(ids.rebecca, ids.base, ids.palette); grant(ids.rebecca, 'route-rebecca');
      grant(ids.palette, 'support-catalogue', 'temporary', id === 'offline-pending' ? { proofUntil: NOW - 1 } : {});
      if (['support-expired', 'permanent-retained'].includes(id)) context.now = NOW + 2 * DAY;
      if (id === 'permanent-retained') grant(ids.palette, 'challenge-cosmetic');
      if (id.startsWith('offline-')) context.network = 'unavailable';
    }
    if (id === 'wrong-mode') { reveal(ids.rebecca, ids.base); grant(ids.rebecca, 'route-rebecca'); context.mode = 'campaign_rev2'; }
    if (id === 'duplicate') context.team = ['barry-rev2'];
    if (id === 'rule-or') { reveal(ids.billy); profile.facts.partnerChallenge = true; }
    return { profile, context, catalogue, grant, scenario: scenarios.find(item => item.id === id) || scenarios[0] };
  }
  root.REC_ACCESS_DEMO = Object.freeze({ NOW, ids, catalogue, scenarios, createScenario });
})(typeof window === 'undefined' ? globalThis : window);
