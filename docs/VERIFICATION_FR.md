# Vérification — Resident Evil : B.O.W. Protocol 0.2.0

**Résultat final : 58/58 contrôles exécutables réussis, aucun échec, plus un audit exhaustif des 75 profils et 750 techniques.**

Dernière exécution complète : **10 octobre 2026**, moteur à `2026-10-10T22:12:54.765Z`, pages à `2026-10-10T22:13:01.977Z`.

| Suite | Résultat | Portée |
|---|---:|---|
| Audit lore | 75/75 profils, 750/750 techniques | Couverture, unicité, sources, niveaux de preuve, cloisonnement des incarnations |
| Moteur | 26/26 | Combat, IA, ressources, statuts, projectiles, replays, Dossiers, Canvas |
| Pages | 20/20 | Bestiaire, Opérations, iframe, Arcade, Survie, Boss Rush, sauvegardes |
| Interface | 12/12 | Thème, navigation, traçabilité, états vitaux, Archive des movesets |

## Contenu contrôlé

| Élément | Valeur vérifiée |
|---|---:|
| Incarnations jouables | **75** |
| Techniques | **750** |
| Techniques canoniques | **537** |
| Extensions anatomiques | **150** |
| Traductions de simulation | **63** |
| Signatures complètes distinctes | **75** |
| Fiches du Bestiaire | **389** |
| Dossiers narratifs | **75** |
| Étapes de Dossiers | **600** |
| Conclusions | **300** |
| Configurations d’arène | **18** |
| Images distinctes décodées par la suite moteur | **158** |

## Audit des movesets

`tests/verify-lore.mjs` confronte trois sources : la liste jouable, le fichier d’audit `data/lore-movesets.json` et le roster compilé. Il vérifie que :

- chaque incarnation possède exactement dix commandes ;
- les 750 identifiants de mouvements sont uniques ;
- aucun moveset complet n’est cloné ;
- chaque mouvement possède une source, une base lore et une frontière d’adaptation ;
- seuls les niveaux `canonical`, `anatomical` et `simulation` sont autorisés ;
- aucune capacité d’une autre forme n’est importée silencieusement ;
- les mécaniques spécialisées attendues — projectiles, camouflage, soin, marquage, brûlure, poison, choc ou mobilité — restent reliées aux sujets concernés.

L’audit ne prétend pas reproduire les animations, les hitboxes ou les données internes des jeux Capcom. Il vérifie la cohérence du contrat livré et la façon dont sa portée est présentée au joueur.

## Moteur : 26/26

La suite exécute les vrais fichiers JavaScript et le module Versus dans un DOM contrôlé avec Canvas natif **skia-canvas**. Elle couvre :

- syntaxe et concordance des données compilées ;
- décodage des portraits, corps entiers et décors ;
- démarrage, activité, récupération et coût des 750 techniques ;
- épuisement et régénération des ressources ;
- soins limités et interruptibles ;
- gardes haute et basse, bonds, projectiles, camouflage, murs et supers ;
- capacité des 75 sujets à approcher et blesser un adversaire par l’IA réelle ;
- huit duels CPU complets à vie entière ;
- déterminisme, enregistrement, rejet des replays invalides et relecture ;
- progression des 75 Dossiers, continues et sauvegardes de secours ;
- initialisation du vrai module Versus et douze compositions cinématiques.

Rapport : [`verification-runtime.md`](verification-runtime.md) et [`../tests/engine-results.json`](../tests/engine-results.json).

## Pages : 20/20

Les vrais fichiers `operations.html`, `codex.html` et `modules/versus.html` sont reliés par une file `postMessage` conservant l’origine et l’identifiant du duel. Les résultats positifs proviennent des KO du moteur, pas d’une valeur fabriquée par la page.

La suite contrôle notamment :

- pagination des 389 fiches sans doublon ;
- recherche insensible aux accents et filtres par épisode/statut ;
- sources, images, dialogues et retour du focus ;
- lancement corrélé du moteur et rejet des messages obsolètes ;
- parcours Arcade complet de huit victoires ;
- route Boss Rush de dix boss ;
- conclusions stylisées et cinématiques ;
- conservation et soin de la vie en Survie ;
- relecture d’un combat commencé avec une vie réduite ;
- sortie, reprise, records persistants et stockage corrompu.

Rapport : [`verification-pages.md`](verification-pages.md) et [`../tests/pages-results.json`](../tests/pages-results.json).

## Interface : 12/12

Le contrat d’interface vérifie les six écrans principaux, les compteurs, le thème 0.2.0, les badges de preuve, l’affichage 10/10, les états **FINE / CAUTION / DANGER**, la navigation et l’Archive des movesets. Cette dernière est aussi réellement initialisée dans le DOM contrôlé : 75 sujets et dix lignes pour le dossier sélectionné, sans erreur d’image.

Rapport : [`verification-ui.md`](verification-ui.md) et [`../tests/ui-results.json`](../tests/ui-results.json).

## Limites explicites

- Le DOM contrôlé n’est pas une mesure pixel par pixel de la mise en page CSS d’un navigateur physique.
- Aucune manette physique n’est testée par la suite automatisée.
- Les 600 étapes de Dossiers sont validées par le cœur de progression ; elles ne représentent pas 600 combats complets exécutés.
- Les huit duels CPU et les quinze duels d’Opérations constituent des scénarios représentatifs, pas toutes les permutations possibles.
- Les références visuelles sont des poses statiques. Les animations originales des jeux ne sont pas incluses.
- Les duels croisés, valeurs de dégâts, frames, ressources et finishers restent des simulations non canoniques.

## Reproduction

```sh
npm run verify
npm run build
```

Une modification de source après cette exécution nécessite de relancer la suite avant de réutiliser ces résultats.
