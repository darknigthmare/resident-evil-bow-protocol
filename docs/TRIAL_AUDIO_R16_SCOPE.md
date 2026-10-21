# R16 — audio du duel expérimental et de sa relecture

Base de la même PR12 : `f214d9d4c367a8be861bf556866dc211ea9334b1` (R15). Avancement des lots **G-AUDIO, G-REPLAYS, G-ACCESS, G-PERF et G-RECETTE** du plan P1. Aucun de ces lots globaux n'est déclaré terminé par ce branchement.

## Ajout jouable

Le duel expérimental n'importait auparavant aucun module sonore. Il dispose désormais d'un panneau natif repliable avec activation volontaire, volume général, effets et ambiance séparés. Les réglages vivent en mémoire de page uniquement. Ni cookies, localStorage, fichier de sauvegarde, réseau audio ni résultat de campagne ne sont écrits. Le son désactivé est l'état initial, y compris si l'URL demande un volume ou un son.

Les 346 corps du duel et les 52 configurations de stage restent disponibles sans changement. Les trois salles Baker réemploient les compositions stéréo originales R15 ; les autres utilisent leur repli générique historique. La banque d'effets préexistante est réutilisée. **Aucune nouvelle voix, cri de créature ou signature d'arme officielle ; aucun son 1:1 certifié.** Le Versus principal, les Dossiers et l'atelier R15 gardent leur politique sonore antérieure : la nouvelle répartition des événements est opt-in pour l'annexe.

## Les sons suivent des faits du moteur

La demande de commande et le démarrage anticipé d'un projectile ne produisent pas automatiquement un coup de feu. Le moteur réserve une rafale avant de libérer certains tirs. L'adaptateur distingue donc la réservation de l'émission, sans modifier le moteur ni son journal. Le test Gatling produit six signaux aux frames 25, 30, 35, 40, 45 et 50 ; une interruption après le premier laisse cinq tirs annulés silencieux.

Les projectiles retardés non soutenus sont observés lorsqu'ils se déplacent réellement ; une disparition dont la cause n'est pas connue ne fait pas inventer un départ sonore. L'accélération/seek ne rattrape pas les anciens tirs. Les échantillons sont génériques et ne constituent pas le vrai son du Gatling.

La pose d'un dispositif, son armement, sa destruction et son explosion sont des événements distincts. Une explosion R11 ne sonne pas une deuxième fois à travers deviceDetonated. Le détonateur vide ne simule ni déflagration ni guérison. Mêlée, garde, soins/recharges réellement réalisés et résultat de match utilisent la banque partagée. Cette logique ne change ni le moment ni les dégâts des actions.

## Temps, lecture et navigation

Seule la lecture en cours à **×1** produit de l'audio. Intro, pause, pas manuel et vitesses ×0,25/×0,5/×2 sont silencieux ; le panneau explique ce choix. Le retour à ×1 ne rejoue pas les actions passées. La fin peut produire une fois le signal du résultat, puis l'ambiance s'arrête ; les dessins d'outro ne produisent pas de résultats supplémentaires. Un impact réellement nouveau après reprise peut sonner même si le projectile avait été tiré avant pause.

Un import vérifié commence en pause. La reconstruction d'une frame, un retour en arrière, une sélection ou un redémarrage réinitialisent la session sonore sans toucher aux données importées. Un import refusé ne change ni le duel ni son contexte sonore. Une activation asynchrone devenue obsolète ne réactive pas une autre sélection.

Perte de focus/visibilité : silence immédiat, jeu suspendu selon son contrôleur existant. Page conservée : audio suspendu et activation volontaire requise au retour. Page détruite : contexte libéré. Les événements persisted simulés ne sont pas une preuve de BFCache physique.

## Budget et intégrité

Une ambiance active ; douze effets simultanés au maximum ; journal sonore diagnostic de 32 entrées, flux secondaire de 180 événements et suivi de 60 projectiles en attente au maximum. Le cache des boucles Baker reste borné à quatre ; aucune nouvelle minuterie ou boucle d'animation n'est ajoutée.

L'adaptateur lit les acteurs et événements réels et construit son propre flux de présentation. Il ne modifie aucune santé, ressource, hitbox, frame, graine aléatoire, commande, récompense ou empreinte de replay. Le test compare trois duels CPU complets avec/sans observation sonore, y compris leur état final et leur export exact.

Les 115 profils principaux, 231 prototypes, 43 exercices, 115 Dossiers, 508 ressources, moteur, renderer, contrôleur principal, compositions R14/R15 et les huit classeurs antérieurs sont inchangés. Les trois contrats de replay/journal restent **identiques** : pas de migration ni suppression d'ancien fichier.

## Tests et limites

25 groupes ciblés locaux réussis : API absente/refusée, activation obsolète, réservations/tirs, interruptions, dispositifs, pause/seek/vitesse, banques/volumes, navigation, limites et conservation. Le Web Audio local des tests est un graphe déclaré simulé ; il vérifie les appels et les compteurs, pas les haut-parleurs.

Le script HTTP utilise le véritable AudioContext, des clics/clavier natifs, un téléchargement et un import JSON, les volumes par touches et le téléchargement du vrai classeur en 1440/390 pixels. Les refus d'API, corruption JSON, CPU accéléré et navigation persisted sont explicitement déclarés. Les résultats générés du workflow final attestent séparément ces tests.

La navigation HTTP Chromium du conteneur local a renvoyé `ERR_BLOCKED_BY_ADMINISTRATOR`. Aucun contournement de cette politique ; les contrôles HTTP sont réalisés dans le runner GitHub habituel avec ses dépendances prévues.

La validation perceptive sur casque/enceintes, Safari/mobile réel, manette et BFCache réel restent ouverts. Ce n'est ni une synchronisation acoustique à l'échantillon près, ni une banque officielle des 346 sujets.

## Excel et sources

`docs/planning/BOW_DUELS_AUDIO_R16.xlsx` : cinq onglets, cinq lots techniques, 15 règles d'événements, 25 contrôles locaux et quatre formules. Les autres classeurs ne sont pas remplacés. Les états locaux du fichier et les résultats CI du commit sont documentés séparément ; G-AUDIO demeure EN COURS pour la fidélité générale.

Sources techniques consultées le 20 octobre 2026 :
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start
- https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend

Source fonctionnelle : code réel R15 et critères de `BOW_PR11_MATRICE_EXECUTION_R8.xlsx`. Aucune nouvelle référence audiovisuelle primaire Capcom recertifiée dans cette passe d'intégration.

Aucune fusion main, promotion Vercel ou nouvelle copie Drive ne découle automatiquement de cette livraison.
