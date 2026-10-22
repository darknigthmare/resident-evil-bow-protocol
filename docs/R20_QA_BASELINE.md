# Base vérifiée avant R20

La base retenue est le commit `e4b27bc42eacee69ecb0280fb35de117d4031cf1`, qui réunit main R18 et la branche R19 de sauvegardes. Sa copie complète a été extraite avec `git archive` avant les modifications R20, puis exécutée dans un répertoire isolé. Les changements simultanés de l’interface ne peuvent donc pas être confondus avec l’état initial.

Cette fusion a été créée localement. Son arbre Git `1425afc447b84a1873c0d7e1bfa5575d3ff25d98` est exactement celui du commit R19 publié `67b805aa814856148297dbf42a6fda219d20a8ac`. Une extraction de ce dernier reproduit les mêmes fichiers de base depuis GitHub.

## Résultats du 22 octobre 2026

| Contrôle | Résultat | Preuve conservée |
|---|---:|---|
| `npm run verify` sur la base immuable | 579 contrôles réussis, 0 échec, sortie 0 | `docs/R20_BASELINE_VERIFY.json` |
| `npm run build` sur cette même base | Sortie 0 | Résumé et empreinte du journal dans `docs/R20_BASELINE_VERIFY.json` |
| Sauvegardes R19 en HTTP/Chromium | 16 contrôles réussis, 0 échec | `docs/R20_BASELINE_SAVES_HTTP.json` |

La recette R19 utilise des vues de 1 440 et 390 pixels. Elle couvre l’export et le téléchargement, l’aperçu avant import, la restauration choisie, les données invalides, le conflit entre onglets, le parcours clavier et un refus de stockage injecté. Elle ne remplace pas une validation de perte brutale d’alimentation ou de matériel physique.

Le total de 579 est le nombre exact de lignes `PASS` émises par l’exécution complète. Le fichier de preuve conserve les intitulés de tous ces contrôles ainsi que les SHA-256 des journaux. La base compilée contient 115 combattants principaux, 389 identités documentaires et 52 arènes.

## Préservation pendant R20

`docs/R20_PRESENTATION_BASELINE.json` conserve la liste exacte et les SHA-256 de 66 fichiers source historiques, 19 fichiers de données, 508 ressources et 24 fichiers de suivi couverts par le manifeste R19 d’origine. Les deux modules de sauvegarde et le classeur introduits en R19 sont protégés séparément, car ce manifeste historique les excluait au moment de leur création.

Les sept anciennes suites qui vérifiaient l’ensemble des ressources continuent de comparer le même nombre de 508 fichiers et le même agrégat historique. Seuls les nouveaux chemins sous `assets/sprites/bow/` sont séparés de cet ensemble. Un ajout ailleurs, une suppression ou une altération d’une ressource existante échoue toujours.

Trois modules de présentation changent dans R20 : `src/catalog-page-v070.js`, `src/codex.js` et `src/movesets.js`. Leur diff a été relu pour distinguer les libellés joueur et les commandes DEV. Leurs empreintes avant et après, leur portée et leurs preuves sont enregistrées individuellement. Le test vérifie d’abord les octets actuels contre l’empreinte après revue ; il ne tolère pas une nouvelle modification implicite. Aucun changement du moteur, des données de combat ou des contrats de sauvegarde n’est exempté.

`tests/verify-preservation-r20.mjs` vérifie aussi les refus : modification du moteur, d’une ressource ancienne, d’un module de présentation déjà revu ou d’un fichier R19, ajout hors namespace et suppression d’une ressource. Ces erreurs sont injectées en mémoire et ne modifient aucun fichier du dépôt. Les huit contrôles ont réussi ; preuve : `docs/R20_PRESERVATION_TESTS.json`.

## Interprétation du classeur

Le suivi R20 distingue une livraison bornée de l’achèvement du projet entier. Les PNG produits sont des poses statiques. Les membres séparés, les deux orientations, les mouvements, les transformations, la fidélité canonique et la recette sur appareils réels restent des travaux explicites. Aucun des quinze lots globaux de la matrice R8 n’est déclaré clos.

Les résultats du candidat R20 figurent dans `docs/R20_TRACKING.json` et dans `docs/planning/BOW_INTERFACE_SPRITES_R20.xlsx`. Ils sont renseignés à partir des suites réellement exécutées, sans réutiliser le total de la base comme résultat de la nouvelle version.
