# Resident Evil Combat — lot V16

Reprise du 20 novembre 2026 depuis le commit `6599f75c88472351aacaf19e7a6b1197e6c58625` de la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22).

**11 nouveaux PNG : 8 poses candidates et 3 essais conservés, pour 5 identités RE5.** Chaque image contient un seul personnage entier. Les fichiers gardent les octets originaux du générateur ; les deux directions ont été générées indépendamment, sans miroir logiciel.

## Poses retenues après revue

| Identité — Resident Evil 5 (2009) | Vue gauche | Vue droite | Résultat |
| --- | --- | --- | --- |
| Executioner, cagoule textile ordinaire | Pas de nouvelle gauche qualifiée dans V16 | [RIGHT 03](assets/re5_executioner_right_03.png) | Prise corrigée : main droite près de la tête de hache, gauche au talon. Arme entière ; modèle de corps natif retrouvé pour documenter profil, dos et bottes. |
| Chainsaw Majini, pantalon rose | [LEFT 02](assets/re5_chainsaw_majini_left_02.png) | Déjà présente dans R34, réexaminée et non recopiée | Main gauche sur l’arceau avant, droite sur la poignée arrière ; l’œil, les grandes déchirures et l’accessoire droits restent du bon côté anatomique, naturellement masqués ici. |
| Giant Majini | [LEFT 01](assets/re5_giant_majini_left_01.png) | [RIGHT 01](assets/re5_giant_majini_right_01.png) | Massue entière tenue en main droite, main gauche libre, brassard gauche et anneaux de cheville inégaux. Vues de trois-quarts, pas profils purs. |
| Adjule sombre, tête non scindée | [LEFT 01](assets/re5_adjule_closed_left_01.png) | [RIGHT 01](assets/re5_adjule_closed_right_01.png) | Corps canin entier, quatre pattes et queue courte ; les appendices sombres du museau sont conservés sans les réinterpréter en mutation ouverte. |
| Licker β, langue non déployée | [LEFT 01](assets/re5_licker_beta_left_01.png) | [RIGHT 01](assets/re5_licker_beta_right_01.png) | Corps et grandes griffes complets. La patte arrière éloignée reste naturellement occultée en vue gauche. |

Ces huit images portent le statut `CANDIDATE_STATIC_WITH_LIMITS`. Le [manifeste](manifests/ASSET_MANIFEST_V16.json) donne leurs SHA256, dimensions, transparence, marges et rapports de revue. Trois paires gauche/droite sont créées dans V16 ; la gauche Chainsaw complète la droite R34 déjà existante.

## Essais conservés

| PNG | Défaut constaté | Candidat qui le remplace |
| --- | --- | --- |
| [Executioner RIGHT 01](assets/re5_executioner_right_01.png) | Attribution anatomique des mains inversée sur le manche | RIGHT 03 |
| [Executioner RIGHT 02](assets/re5_executioner_right_02.png) | La correction conserve la même inversion des mains | RIGHT 03 |
| [Chainsaw Majini LEFT 01](assets/re5_chainsaw_majini_left_01.png) | Grandes déchirures du haut déplacées sur le flanc gauche proche ; ancrage de l’accessoire incertain | LEFT 02 |

Ces trois fichiers ont bien été produits par l’outil. Leur exclusion est une décision de qualité visuelle, pas un refus de génération. Ils ne sont pas comptés comme candidats. Les onze appels de cette passe ont produit onze images ; aucun appel de cette passe n’a été refusé.

## Références et limites

Les [décisions de source](docs/SOURCE_DECISIONS_V16.json) distinguent les nouvelles preuves, les attentes conservées et les statuts historiques. Les rapports documentent les [deux premiers Majini](docs/SOURCES_RE5_V16.json), le [modèle natif de l’Executioner](docs/SOURCES_EXECUTIONER_NATIVE_V16.json), [Giant/Gatling/Big Man](docs/SOURCES_RE5_EXTRA_V16.json) et [Adjule/Licker β](docs/SOURCES_RE5_CREATURES_V16.json).

La référence entière du Giant est hébergée sur le site officiel Pachislot Biohazard 5. Sa correspondance avec le rendu RE5 précédemment coupé a été [corroborée sur les détails et pixels communs](docs/GIANT_SOURCE_CORRESPONDENCE_V16.json). Cette preuve apporte l’extrémité de la massue ; elle ne certifie pas une extraction du mesh natif de 2009. Les rendus d’Adjule et de Licker β sont attribués à RE5 par des sources secondaires concordantes, sans chaîne de fichier Capcom certifiée.

Les recherches [Sweeper/Moth](docs/SOURCES_SWEEPER_MOTH_V16.json) et [Bat/Eliminator](docs/SOURCES_BAT_ELIMINATOR_V16.json) restent ouvertes. Sweeper présente un mélange de rendus CV/Darkside dans le catalogue ; la plateforme exacte des nouvelles captures Moth reste indéterminée. Bat n’a pas obtenu de nouvelle preuve indépendante de pointe d’aile ; la vue entière de l’Eliminator blanc retrouvée provient d’un port moddé dont l’édition source n’est pas établie. Gatling gauche attend toujours une référence montrant la prise correcte. Big Man possède déjà sa droite R34 et sa gauche V8 : aucun doublon n’a été généré.

La transparence réelle a été contrôlée numériquement et sur des composites gris et clairs. Les marges demandées de 8 à 10 % ne sont pas toutes atteintes, mais aucune extrémité principale des candidats n’est coupée. Les résidus de très faible alpha et les RGB cachés restent conservés dans les PNG originaux. Les zones cachées, microtextures et proportions demeurent générées ; la fidélité 1:1 n’est pas certifiée.

## Registres et portée

- [Journal des onze appels](../GENERATION_LEDGER_V16_20261120.json).
- [Bilan V16 et inventaire actualisé](../CONTINUATION_V16_20261120.md).
- [Contrôle d’intégrité V16](../V16_VALIDATION_20261120.json).
- [État CI du parent 6599f75](docs/CI_PARENT_6599F75.json).

Le contrôle R34 du parent refuse les ajouts dans `production-archives/rec-media/`. Les six workflows en échec ont cette même cause établie ; cette preuve ne décrit pas le résultat CI d’un futur commit. Les gardes, tests, workflows et fichiers du moteur restent inchangés.

Les images sont des poses statiques. Ce lot ne valide aucune animation, collision, échelle, pivot, contact ou intégration moteur. Les références documentaires et modèles sources restent hors de la publication. Les snapshots antérieurs, leurs empreintes et tous les refus historiques restent conservés. Les 44 PNG annoncés pour V12/V13 restent non récupérés et exclus des comptes.
