# R32 — application des guides gamedev aux commandes et aux outils

Cette révision applique les guides `input-systems`, `game-ui-ux` et `performance-optimization` référencés dans [GAMEDEV_GUIDANCE.md](GAMEDEV_GUIDANCE.md). La base publiée est `413b89bfafc18abc55be1404ff77bdaf573b1334` (R31). Le package conserve sa version `0.7.3` et les contrats de replay existants.

## Comportements corrigés

### Technique directionnelle du duel catalogue

Dans `src/trial-input-v071.js`, gauche et droite maintenues ensemble produisent désormais une direction horizontale neutre. Le calcul correspond à celui du moteur `CQCCombat060.directionSlot`. Il s'applique après la combinaison clavier, pointeurs et manette, donc également aux directions provenant de deux appareils. La direction basse reste prioritaire ; la résolution avant/arrière suit l'orientation au moment où la commande est consommée.

La reproduction dans la page de duel livrée montrait une technique **avant** avec gauche + droite + L. Le nouveau test utilise les boutons Démarrer/Passer l'intro, les événements clavier fiables de Chromium, la boucle de simulation et l'export/relecture du vrai replay. Le moteur démarre une seule attaque et enregistre désormais la technique neutre.

### Confirmation et retour dans le menu

Dans `src/game-menu-r20.js`, la répétition automatique d'Entrée, d'Espace ou d'Échap ne traverse plus plusieurs écrans. Le premier appui conserve l'activation native des boutons ; les flèches répétées et les listes natives continuent de fonctionner. Les événements déjà consommés par un autre gestionnaire restent respectés.

Les témoins avant correction reproduisent Entrée traversant démarrage → accueil → modes, Échap traversant commandes → options → accueil, et Espace activant Jouer au relâchement après la sortie du démarrage.

### Retour navigateur et mesure de performance

Dans `modules/fidelity-r31/performance/page.js`, chaque mesure appartient au moniteur et au document qui l'ont lancée. Quitter la page termine la mesure et conserve son relevé partiel ; un retour depuis le cache de navigation rétablit les commandes. Le joueur doit lancer explicitement une nouvelle mesure.

Un changement de mode ou un rechargement du cadre efface l'ancien résultat. Une promesse provenant de l'ancien document ne peut plus remplacer le relevé courant. Le test comprend un vrai aller-retour navigateur avec `pageshow.persisted`, ainsi que des événements de cycle de vie simulés identifiés séparément.

### Titres lisibles à 200 % sur écran étroit

Deux défauts préexistants de reflow ont été identifiés dans les exécutions R31 antérieures à cette révision : les pages Audio et Illustrations corporelles débordaient à 320 px avec un texte agrandi à 200 %. Leurs titres autorisent maintenant le retour à la ligne à l'intérieur des mots lorsque l'espace l'exige. Les deux changements CSS sont bornés à cette propriété ; aucune règle de masquage du débordement n'est ajoutée.

## Vérification avant/après

Les résultats détaillés, empreintes des sources et limites figurent dans [GAMEDEV_APPLIED_R32.json](GAMEDEV_APPLIED_R32.json). Les nombres sont des groupes de scénarios, et non des appareils physiques certifiés.

| Suite ajoutée | Avant : réussis / échecs | Après : réussis / échecs |
| --- | ---: | ---: |
| Résolution des commandes, VM Node | 2 / 5 | 7 / 0 |
| Page de duel, attaque réelle et replay | 10 / 2 | 12 / 0 |
| Menu, clavier Chromium | 4 / 3 | 7 / 0 |
| Cycle de vie de la mesure | 1 / 4 | 5 / 0 |
| Titres des pages Audio et Illustrations | 4 / 2 | 6 / 0 |
| **Total comportemental** | **21 / 16** | **37 / 0** |

Sur le code corrigé, les suites existantes `verify-v071`, `verify-catalog-replay-r7`, `verify-menu-r20` et `verify-performance-access-r31` ont également réussi : **67 groupes, 0 échec**. Leurs rapports de travail ont été recueillis séparément, puis les fichiers historiques ont été restaurés à leurs octets d'origine. La garde R32 et ses **28 cas de contrôle** ont été exécutés avec succès sur le vrai diff Git.

Environnement local : Node `24.22.1`, Playwright `1.62.1`, Chrome `156.0.8078.73`. Le workflow utilise ses versions explicitement épinglées et produit ses propres résultats : les résultats locaux ne sont pas présentés comme une exécution de cet environnement CI.

Les suites navigateur de commandes et de menu emploient les vrais contrôleurs et DOM, avec une image de remplacement pour les ressources raster. La suite de mesure emploie la vraie page et le vrai moniteur dans un cadre de jeu de test. La suite de reflow utilise les vrais HTML/CSS et polices, avec des scripts inertes pour isoler les titres ; les tests R31 courants couvrent séparément les pages enrichies. Ces preuves locales ne certifient pas les visuels, les appareils physiques, le tactile réel, la fréquence physique d'affichage ou la mémoire GPU totale. Les cas unitaires couvrent les deux orientations et les combinaisons d'appareils simulés.

## Conservation des versions publiées et validation courante

Les anciennes validations R19/R20 et R31 imposent des empreintes de sources publiées. R32 ne remplace ni leurs empreintes attendues, ni leurs rapports par de faux résultats actualisés.

- `npm run verify:current` exécute d'abord la garde R32, ses cas négatifs, puis les **38 autres commandes originales** de `npm run verify` dans leur ordre et la nouvelle suite d'entrées.
- `npm run verify:historical:r31` exécute les deux suites originales de conservation R19/R20 sur une archive Git du commit publié R31, avec leurs assertions intactes.
- `npm run verify` exige les deux étapes. Les entrées dédiées aux sauvegardes et à R20 exposent également ce partage.
- `npm run verify:r32` contrôle le périmètre courant et les entrées ; `npm run verify:r32:http` exécute les quatre nouvelles suites navigateur sur les fichiers courants.
- Le workflow R31 conserve ses audits de provenance et son build sur le commit publié explicitement fixé. Ses sept anciennes recettes navigateur sont exécutées, avec leurs assertions intactes, sur la révision courante : elles vérifient notamment les corrections de reflow avec les vrais médias. Les libellés distinguent ces deux périmètres. La dépendance `axe-core` est installée explicitement comme dans les autres workflows d'accessibilité.
- R23/R24 continuent leurs vérifications courantes et exécutent leur seule assertion de conservation R20 sur l'archive publiée. R28 exécute `npm run verify` avant de régénérer ses rapports de travail.
- Les suites d'intégration R25/R26 contiennent elles aussi une assertion imposant l'identité des sources historiques. Elles sont exécutées intégralement sur l'archive publiée, avec leurs assertions intactes. La garde R32 s'exécute avant les générateurs de ces workflows et vérifie que tous leurs autres fichiers restent inchangés. Les autres recettes de ces workflows sont conservées. Les nouveaux journaux du runner sont publiés comme preuves d'archive ; leurs JSON historiques ne sont pas présentés comme de nouveaux résultats.

La garde `scripts/verify-current-r32.mjs` compare l'ensemble du diff à R31. Elle refuse tout chemin inattendu, suppression, renommage, modification de données, d'assets, d'anciens tests ou de preuves historiques. Les transformations des commandes et du menu sont bornées aux hunks relus ; les commandes de vérification, références d'archives et workflows sont contrôlés exactement. Les tests de faute modifient uniquement des copies en mémoire.

Cette révision corrige les interactions décrites. Les critères artistiques et de fidélité encore ouverts dans R31 restent ouverts. Le commit de la branche et les exécutions GitHub Actions constituent la référence pour l'état d'intégration ; le présent document ne prétend pas que la branche a été fusionnée ou déployée.
