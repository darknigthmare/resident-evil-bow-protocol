# R31 — Conditions, formes, dimensions et conclusions

La bibliothèque `modules/fidelity-r31/canonical/index.html?id=<UID>` ajoute une lecture conditionnelle des sources pour 17 incarnations. Elle propose30 faits :20 faits documentaires nouveaux et10 faits antérieurs conservés avec leurs véritables identifiants historiques. Les preuves R23 à R28 restent inchangées et les faits déjà cités ne deviennent pas nouveaux parce que leur page a été téléchargée à nouveau.

Les29 réponses HTTP 200 sont conservées en GZIP avec les empreintes de la réponse brute et du fichier conservé. Les citations sont vérifiées dans le texte visible, avec le bon jeu et les bons acteurs. Les pages de fichiers restent des transcriptions secondaires, même lorsque leur texte provient d’un document du jeu. Aucune capture primaire directe n’est revendiquée.

## Dimensions et phases

Le document Malacoda décrit une larve d’environ 1 cm, soit environ 0,01 m. Cette mesure ne dimensionne pas les appendices du boss ni une collision. Le même document décrit une croissance liée à la taille de l’hôte, sans hauteur finale exacte. Les deux contraintes U-8, déjà présentes en R24, restent signalées comme des preuves antérieures : des pinces de plus de 3 m constituent une borne inférieure, et « some tens of meters » ne fournit pas de hauteur exacte.

La fonction `dimension()` vérifie l’UID, la phase et la partie corporelle avant de rendre la contrainte. Une demande pour un adulte, une autre partie, un autre sujet ou une calibration de collision est retenue hors de l’admission. Le registre ne convertit pas les unités des modèles 3D en taille physique.

## Périmètres et relations retenues

Quatre décisions explicitent les limites constatées dans les sources :

- L’archive publiée « Plaga C » ne contient pas de preuve d’un identifiant commun avec Duvalia. La relation demeure candidate ; la ressemblance visuelle ne résout pas l’alias.
- Hunter Gamma de 1999 et celui du remake 2020 conservent leurs pages et documents distincts.
- La localisation du document Scarmiglione indique son absence de l’édition 3DS. Ses défenses frontales et sa constitution ne sont pas promues automatiquement vers cette édition.
- La transcription Malacoda nomme *Gyrodactylus salaris*, tandis qu’un commentaire parle des Capsalidae. Le désaccord est conservé et n’est pas résolu par une taxonomie inventée.

## Conclusions et victimes

Six règles consultables gardent le jeu, le sujet, la phase, l’environnement, le rôle de la victime et les conditions cités. Le témoignage de l’ouvrier sur l’ingestion par Hunter Gamma reste un témoignage sur un ouvrier humain. Une tentative d’ingestion de Duvalia n’est pas une mort garantie ; l’empalement décrit de l’Iron Maiden ne reçoit pas de létalité chiffrée. Les descriptions d’attaque létale de Scagdead et de Reaper conservent leurs contextes et ne définissent pas une animation finale pour toutes les morphologies.

La fonction `conclusion()` peut confirmer une correspondance au contexte documentaire. Elle ne modifie aucun acteur, aucune vie, aucune commande ou aucun replay. Toutes les victimes arbitraires du catalogue restent non attestées faute de preuve propre à l’association. Le sélecteur donne accès aux 389 identités pour vérifier cette restriction ; il ne crée pas de nouvelle conclusion jouable.

## Vérifications

- `python3 scripts/build-canonical-r31.py --check` reproduit les sources, les faits, leurs relations et la distinction entre nouveautés et acquis antérieurs.
- `python3 tests/test_canonical_r31.py` exécute 14 tests sur les 29 sources, la nouveauté, les unités et phases, les citations, les relations retenues et la conservation de l’historique.
- `node tests/verify-canonical-r31.mjs` exécute 16 groupes, dont 2334 requêtes de victimes explicites contre six règles, les jeux originaux/remakes, les phases, la létalité non confirmée et l’immuabilité.
- `node tests/browser-canonical-r31.mjs` utilise la vraie page, les contrôles de dimension et de victime, le clavier, les vues à 320 et 1280 pixels avec texte doublé, les citations inertes et des sources corrompues.

Les rapports lient les fichiers d’entrée par SHA-256. La revue documentaire, les limites de transfert et les tests de navigateur ne certifient pas la fidélité globale 1:1, les collisions physiques, les animations d’origine ou les appareils physiques.
