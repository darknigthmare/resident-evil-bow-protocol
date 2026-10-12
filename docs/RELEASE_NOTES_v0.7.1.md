# B.O.W. Protocol v0.7.1 — Journal des essais

Base exacte : PR nº 7, commit d6c28a1ac530201036cce05940ad3edf5a6d7714. Cette version prolonge la branche du catalogue au lieu de fusionner une archive locale concurrente.

## Périmètre préservé
115 combattants de progression, 231 prototypes de combat isolés et 43 exercices contextuels = 389 identités. Les 115 + 231 définitions et les 274 fiches de l’annexe sont inchangées (empreintes contrôlées). Aucun nouveau pouvoir canonique, nouvel adversaire ou sprite final n’est revendiqué.

## Correctifs contextuels
- Cocon : impossible de réussir avec « Progresser ». Seule une intégrité nulle interrompt l’incubation ; aucune attaque du cocon.
- Essaim : il faut réellement réduire la densité à zéro.
- Plantes et exercices de phases : contre-mesures uniquement dans la fenêtre de récupération.
- Eau et véhicules : progression ouverte pendant la récupération, pas en permanence.
- Explosion : une seule détonation ; rupture subie = échec, rupture évitée = réussite.
- Résultat explicite, temps maximal borné, commande indisponible sans prélèvement gratuit, bruit borné.

## Journal local
Sauvegarde d’une session précise sous la forme des commandes et de leurs frames. La restauration rejoue ces commandes et vérifie l’état produit ; elle ne charge pas une santé arbitraire. Deux copies à révision protègent contre une copie endommagée. Détection des conflits ordinaires entre onglets, erreurs de stockage explicites et import JSON borné. Une sélection réalisée pendant la lecture asynchrone d’un fichier n’est pas remplacée par l’import arrivé en retard.

Les records concernent les 43 exercices, une entrée par identité. Temps minimal et santé maximale sont deux meilleurs résultats indépendants. Il ne s’agit ni d’un compteur de victoires, ni d’une récompense de campagne. Aucun résultat n’est envoyé aux opérations. Sauvegardes cloud et anti-triche non implémentés.

## Commandes
Duel expérimental : dix commandes clavier, directions relatives, frappes et sauts déclenchés une fois par pression, touches rapides conservées jusqu’au prochain tick, maintien tactile indépendant par doigt, annulation à la perte du focus. Lecture sécurisée des manettes standard, y compris index vides ou API refusée. Aucun matériel physique n’a été testé.

## Validation
135 tests exécutables passés : engine 26, pages 22, ui 13, re5 17, continuity 19, catalog 16, journal 22. Les 43 exercices ont été terminés et leurs 43 reprises comparées frame par frame. Les anciens tests de 231 duels CPU sont conservés ; ils ne certifient pas toutes les paires.

Six vues/interactions Chromium hors ligne (trois pages, 1440 et 390 pixels) : commandes clavier, save/load, import endommagé, filtres et largeur du document. Le stockage du navigateur hors ligne est remplacé explicitement par une mémoire de test ; la persistance et les conflits sont testés séparément dans le harness. Navigation HTTP Chromium bloquée par l’administrateur, sans contournement.

## Limites
Les exercices contextuels restent abstraits, sans collision CQC ni scripts de boss Capcom. Les illustrations restent provisoires. La fidélité 1:1 des animations, des movesets complets et des lieux n’est pas certifiée. Les 35 références sommaires déjà signalées restent à documenter.
