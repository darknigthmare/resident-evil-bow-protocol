# PR12 — R11 publiée depuis une intégration vérifiée

La PR11 R1–R10 est fusionnée. Cette branche continue depuis main b8b47ee78b80015263f10303781ae2566eb27699, sans nouvelle fusion dans main.

## Code réellement vérifié

Le candidat `2504b1ae2532fca56e592556819cd5fc1c9c3748` contient les fichiers compilés de R11, pas seulement la recette de migration. Le workflow `39316543616` a terminé avec succès : 392 groupes exécutables, 8 scénarios HTTP Lucas et 22 scénarios HTTP R10 ; compilation et packaging réussis.

https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/39316543616

La couche de publication ajoute uniquement ce document et un workflow HTTP permanent. Aucun fichier de simulation n'est changé après ces résultats. Les checks de la PR fournissent la seconde validation du commit final.

## Changements livrés

Les dix commandes du Lucas humain sont des adaptations de simulation : charge à mèche, charge radio réellement posée/armée, fil bas, caisse de proximité, réseau temporisé de trois boîtiers, recul et mise à feu personnelle. Pas de poison ou soin ajouté par le détonateur. Les boîtiers sont visibles et destructibles ; interruption, propriété, quota, KO, fin de manche, expiration, garde et poussée depuis la charge sont testés.

Le Dossier humain possède six panneaux centrés sur le bon UID et huit défis cohérents avec leurs adversaires actuels. Les 114 autres Dossiers et la route existante sont conservés. Les quatre conclusions historiques restent dans les données mais sont désactivées pour Lucas humain comme attaquant, faute de chorégraphie dédiée. Une victoire normale fonctionne sans crédit de conclusion forcé.

L'échec précédent du test navigateur reposait sur une attente incorrecte de stockage vide après avoir visité le menu principal. Le nouveau test compare toutes les clés et valeurs avant/après avec une sentinelle. Il ne supprime aucune préférence pour faire passer le contrôle.

## Excel et preuves

`docs/planning/BOW_LUCAS_DISPOSITIFS_R11.xlsx` est réellement inclus : quatre onglets, dix commandes avant/après, tests des dispositifs et sources/limites. Il est créé avec artifact_tool et ses composants XML ont été conservés par transport vérifié. Les 22 groupes qui y sont recensés concernent la suite dispositifs ; les quatre groupes supplémentaires sur le Dossier et les anciennes conclusions figurent dans `docs/LUCAS_R11_CONTINUITY_TESTS.json` et ce rapport.

Les anciens classeurs R8/R9/R10 sont conservés. Aucun lot artistique global P1 n'est clôturé. Les sources officielles Capcom sont listées dans `docs/LUCAS_R11_SCOPE.md` ; elles ne certifient ni les dix commandes de simulation ni leurs timings.

## Limites et compatibilité

114 autres profils principaux, 231 prototypes et 43 exercices sont inchangés. Aucun nouveau dessin, clip final, voix, stage reconstruit ou fatalité canonique. Le profil muté de Lucas reste distinct. Les replays principaux et expérimentaux changent de contrat avec la simulation ; les anciens fichiers sont conservés pour leur version originale. Le journal contextuel garde son contrat.

Les tests HTTP emploient Chromium en 1440 et 390 pixels. Dispositif de laboratoire, chronomètre configuré et CPU accélérés sont déclarés ; aucune certification sur matériel physique ou de BFCache réel. Les captures techniques ne constituent pas une preuve de fidélité artistique 1:1.

Ni cette publication de PR ni les artefacts ne prouvent une promotion Vercel ou un nouveau transfert Google Drive.
