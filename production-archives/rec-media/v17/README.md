# Resident Evil Combat — lot V17

Continuation du 20 novembre 2026 depuis `1ed251b8b7c719c81a7ae16319ca3fc9b9f168d8` sur la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22).

**12 nouveaux PNG : 8 poses candidates et 4 essais conservés, pour 5 identités de Resident Evil 4 original (2005).** Chaque image contient un sujet complet. Les octets originaux sont conservés ; les vues opposées sont générées indépendamment, sans miroir logiciel. Les corrections utilisent de nouveaux appels et de nouveaux fichiers.

## Poses candidates après revue

| Identité — RE4 original (2005) | Gauche | Droite | Décision et limites |
| --- | --- | --- | --- |
| El Gigante, sans armure ni parasite exposé | [02](assets/re4_el_gigante_left_02.png) | [R34 déjà qualifiée](../../../modules/fidelity-r34/assets/generated/re4-el-gigante/idle-right.png), non recopiée | La gauche corrigée évite le transfert du cordon droit sur le flanc proche ; son existence derrière reste non prouvée. |
| Armadura noir/or, casque fermé, plume rouge et hache | [01](assets/re4_armadura_black_gold_left_01.png) | [03](assets/re4_armadura_black_gold_right_03.png) | Prise droite corrigée : main droite devant, gauche derrière et talon simple. La variante argentée reste en attente. |
| Colmillos, appendices dorsaux déployés | Aucune nouvelle vue qualifiée | [01](assets/re4_colmillos_right_01.png) | RIGHT seulement ; même rendu déjà présent dans R34, réévalué avec limite de pointe et topologie des racines. |
| J.J., béret et minigun | [01](assets/re4_jj_left_01.png) | [01](assets/re4_jj_right_01.png) | Cache-œil droit ; main gauche sur poignée supérieure, prise arrière naturellement masquée ; six canons et bande entière. |
| Soldat chauve, veste brune ouverte et lance-roquettes | [01](assets/re4_soldier_rpg_left_01.png) | [02](assets/re4_soldier_rpg_right_02.png) | Deuxième personnage de la planche seulement ; épaule/main droites conservées et arrière du lanceur masqué dans les candidats. |

Le [manifeste](manifests/ASSET_MANIFEST_V17.json) rattache chaque PNG à son prompt, son SHA256, ses mesures d’alpha et sa revue. **3 paires gauche/droite** sont qualifiées dans V17. La nouvelle gauche d’El Gigante complète sa droite R34 réexaminée, sans la recopier ni la compter comme nouvelle image.

## Essais conservés

| Essai conservé | Motif de non-sélection | Remplacement qualifié |
| --- | --- | --- |
| [re4_el_gigante_left_01](assets/re4_el_gigante_left_01.png) | Cordon droit déplacé sur le côté gauche proche. | [re4_el_gigante_left_02](assets/re4_el_gigante_left_02.png) |
| [re4_soldier_rpg_right_01](assets/re4_soldier_rpg_right_01.png) | Terminaison arrière du lanceur exposée et non démontrée par la source. | [re4_soldier_rpg_right_02](assets/re4_soldier_rpg_right_02.png) |
| [re4_armadura_black_gold_right_01](assets/re4_armadura_black_gold_right_01.png) | Mains inversées et pointe ajoutée au talon de la hampe. | [re4_armadura_black_gold_right_03](assets/re4_armadura_black_gold_right_03.png) |
| [re4_armadura_black_gold_right_02](assets/re4_armadura_black_gold_right_02.png) | Talon corrigé, mais mains toujours inversées. | [re4_armadura_black_gold_right_03](assets/re4_armadura_black_gold_right_03.png) |

Ces images ont été produites par l’outil. Leur rejet est une décision visuelle, pas un refus outil. **12 appels, 12 images produites et aucun nouveau refus** sont inscrits au [journal de génération](../GENERATION_LEDGER_V17_20261120.json). Aucun appel n’a été fait sur Salvador ou le Ganado au marteau. Le refus antérieur d’un sujet n’a pas été relancé.

## Références et décisions

Les [décisions de source](docs/SOURCE_DECISIONS_V17.json) synthétisent les rapports [Armadura/Colmillos](docs/SOURCES_RE4_ARMADURA_COLMILLOS_V17.json), [J.J./soldats/marteau](docs/SOURCES_RE4_ISLAND_V17.json) et [El Gigante/Salvador](docs/SOURCES_RE4_SALVADOR_GIGANTE_V17.json).

Le rendu complet d’Armadura noir/or est attribué à © 2005 Capcom par son hébergeur secondaire ; une capture en jeu corrobore cette variante, sans plateforme exacte vérifiée. La variante argentée n’est pas complétée par ces preuves. J.J. et le soldat au RPG viennent de rendus entiers attribués au jeu original par un site secondaire, pas de meshes authentifiés.

Colmillos réutilise le même rendu basse résolution déjà archivé dans la recherche R34. La nouvelle vérification d’édition et de cadrage ne révèle pas de géométrie native supplémentaire : sa pointe source est très serrée, ses racines tentaculaires restent ambiguës et aucune gauche indépendante n’est qualifiée.

Le Ganado au marteau reste `SOURCE_HOLD` : le corps et l’arme entiers ont été retrouvés, mais leur attribution exacte à l’édition 2005 reste insuffisante. Salvador 2005 ne reçoit aucune génération. Ses vues de modèle PC 2007 sans tronçonneuse ne sont pas admises comme équivalentes à 2005 ; le refus historique distinct de `re4r-chainsaw-villager` est conservé et motive une décision de hold liée, sans inventer de refus propre à Salvador 2005.

## Qualité et limites

Les PNG ont un alpha réel, contrôlé numériquement et sur composites gris et clairs. Les marges de 10 % demandées ne sont pas toutes atteintes ; aucune extrémité principale des candidats n’est visiblement coupée. Les RGB cachés et faibles résidus alpha sont conservés. Certaines poses restent de trois-quarts frontal plutôt que des profils purs.

Les surfaces cachées, microtextures, proportions et détails non visibles ne sont pas certifiés. La présence du cordon d’El Gigante derrière le corps et la géométrie cachée de la prise arrière de J.J. restent incertaines. Les candidats corrigés du soldat conservent l’occultation du mécanisme arrière ; l’essai qui l’expose reste exclu. La variante, les limites de la source et les revues individuelles gouvernent toute sélection.

Ces images statiques ne certifient ni fidélité 1:1, ni animation, pivot, collision, contact, échelle ou admission moteur. Les bitmaps de référence et modèles sources ne sont pas publiés. Les chemins locaux des reçus sont des traces de travail ; les prompts et rapports restent consultables dans ce lot.

## Registres et état de la PR

- [Bilan V17](../CONTINUATION_V17_20261120.md) et [inventaire des 346 identités](../CONTINUATION_V17_20261120.json).
- [Contrôle d’intégrité V17](../V17_VALIDATION_20261120.json).
- [Preuve CI du parent 1ed251b8](docs/CI_PARENT_1ED251B.json).

La CI du parent affiche 19 succès et 6 échecs, tous six arrêtés à la même garde R34 refusant un ajout dans le dossier d’archives. Les trois parcours navigateur R34 ont réussi. Ce rapport ne décrit pas la CI d’un futur commit V17 ; les suites aval sautées restent non validées. Les gardes, workflows, tests et moteur sont inchangés. La PR reste en brouillon, sans fusion.

Les snapshots V5–V11 et V14–V16 restent figés. Les 44 PNG annoncés V12/V13 ne sont pas récupérés et ne sont comptés dans aucun résultat de cette passe.
