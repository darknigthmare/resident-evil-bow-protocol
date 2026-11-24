# Resident Evil Combat — inventaire V21

**Base vérifiée le 24 novembre 2026.** Cet inventaire distingue les absences précises, les visuels existants à compléter et les dossiers dont les références restent à établir.

Dépôt : [darknigthmare/resident-evil-bow-protocol](https://github.com/darknigthmare/resident-evil-bow-protocol). Base `main` : `ba5936bda1571b9880785878783f00ef44d279f7`. PR média [#24](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/24), état antérieur à V21 : `dac43f0e48d55eb754436b610e3fa3f34298baee`.

## Repères de lecture

Les 52 stages, les 346 UID, les 24 fiches prioritaires et les 60 candidats V1 sont des populations de nature différente et peuvent se recouper. Aucun total global de manquants ni pourcentage d’achèvement n’est calculé.

Le corpus archivé consulté contient **142 PNG avant V21 : 103 candidats et 39 essais**. Ce total comprend des directions et des décors ; il ne signifie pas 142 personnages. Les archives annoncées mais non récupérées restent exclues.

| Ensemble | État établi |
| --- | --- |
| Stages | 52 entrées : 36 utilisent 9 bitmaps, 16 décors procéduraux n’ont pas de bitmap renseigné. |
| UID du catalogue | 346 : 129 attentes de source après correction V20, 4 UID avec candidats V20, 61 états de refus historiques conservés. |
| Finition des personnages | 24 fiches V1 à rapprocher de la couverture actuelle. |
| Extensions | 60 candidats non confirmés nouveaux. |
| Costumes | 24 descriptions de base et 4 cibles V5 de tenue/incarnation. Catalogue exhaustif des costumes non établi. |
| Projectiles / VFX | 44 actions standard regroupées en 16 familles de travail ; partage des visuels à qualifier. |

Le champ `statut_v21` suit uniquement la nouvelle passe. `en_attente` ne signifie pas « aucun fichier existant ». Une image candidate ne valide ni l’animation, ni les collisions, ni l’intégration, ni la fidélité 1:1.

## Manquant confirmé : bitmaps des décors procéduraux

Ces 16 arènes existent sous forme procédurale. Le champ bitmap du catalogue runtime est vide. Pour Reaper, V5 conserve déjà une composition et trois calques candidats à compléter et intégrer.

| ID | Stage | Manque précis | V21 |
| --- | --- | --- | --- |
| re5_060_adjule | DÉPÔT · CONTENEURS | Bitmap spécifique au runtime | en_attente |
| re5_060_big_man_majini | PORT · ENTREPOSAGE | Bitmap spécifique au runtime | en_attente |
| re5_060_chainsaw_majini | BIDONVILLE · GRILLE | Bitmap spécifique au runtime | en_attente |
| re5_060_executioner | KIJUJU · PLACE PUBLIQUE | Bitmap spécifique au runtime | en_attente |
| re5_060_gatling_gun_majini | NAVIRE · CALES | Bitmap spécifique au runtime | en_attente |
| re5_060_jill_valentine_enemy | RUINES · SALLE MONARQUE | Bitmap spécifique au runtime | en_attente |
| re5_060_licker_beta | LABORATOIRE · CORRIDOR | Bitmap spécifique au runtime | en_attente |
| re5_060_reaper | MISSILES · CONVOYEURS | Bitmap spécifique au runtime | en_attente |
| re5_060_popokarimu | MINE · PLATEAU | Bitmap spécifique au runtime | en_attente |
| re5_060_ndesu | PORT · APRÈS LA POURSUITE | Bitmap spécifique au runtime | en_attente |
| re5_060_irving | BATEAU · EAUX CÔTIÈRES | Bitmap spécifique au runtime | en_attente |
| re5_060_u_8 | TRICELL · PLATEFORME | Bitmap spécifique au runtime | en_attente |
| re5_060_uroboros | KIJUJU · INCINÉRATEUR | Bitmap spécifique au runtime | en_attente |
| re5_060_uroboros_mkono | TRICELL · CHAMBRE DE TEST | Bitmap spécifique au runtime | en_attente |
| re5_060_uroboros_aheri | NAVIRE · PONT SUPÉRIEUR | Bitmap spécifique au runtime | en_attente |
| re5_060_uroboros_albert_wesker | VOLCAN · PLATEAU ROCHEUX | Bitmap spécifique au runtime | en_attente |

Sources : S01 et S04.

## Stages : détail des 52 entrées

| ID | Stage | Représentation actuelle | Bitmap / nombre de réutilisations | V21 |
| --- | --- | --- | --- | --- |
| spencer_hall | Hall du manoir Spencer | bitmap réutilisé | assets/arenas/spencer.png (1 entrées) | en_attente |
| spencer_lab | Laboratoire Arklay | bitmap réutilisé | assets/arenas/nest.png (7 entrées) | en_attente |
| rpd_hall | Hall du RPD | bitmap réutilisé | assets/arenas/rpd.png (1 entrées) | en_attente |
| raccoon_street | Rues de Raccoon City | bitmap réutilisé | assets/arenas/raccoon.png (6 entrées) | en_attente |
| clock_tower | Tour de l’horloge | bitmap réutilisé | assets/arenas/raccoon.png (6 entrées) | en_attente |
| nest | NEST | bitmap réutilisé | assets/arenas/nest.png (7 entrées) | en_attente |
| dead_factory | Usine désaffectée | bitmap réutilisé | assets/arenas/factory.png (4 entrées) | en_attente |
| rockfort | Rockfort | bitmap réutilisé | assets/arenas/raccoon.png (6 entrées) | en_attente |
| antarctic | Complexe antarctique | bitmap réutilisé | assets/arenas/nest.png (7 entrées) | en_attente |
| village_square | Place du village | bitmap réutilisé | assets/arenas/village.png (3 entrées) | en_attente |
| salazar_castle | Château Salazar | bitmap réutilisé | assets/arenas/castle.png (5 entrées) | en_attente |
| kijuju | Kijuju | bitmap réutilisé | assets/arenas/village.png (3 entrées) | en_attente |
| queen_zenobia | Queen Zenobia | bitmap réutilisé | assets/arenas/zenobia.png (2 entrées) | en_attente |
| edonia | Edonia | bitmap réutilisé | assets/arenas/raccoon.png (6 entrées) | en_attente |
| baker_house | Maison Baker | bitmap réutilisé | assets/arenas/baker.png (7 entrées) | en_attente |
| dimitrescu | Château Dimitrescu | bitmap réutilisé | assets/arenas/castle.png (5 entrées) | en_attente |
| heisenberg | Usine Heisenberg | bitmap réutilisé | assets/arenas/factory.png (4 entrées) | en_attente |
| ark | ARK | bitmap réutilisé | assets/arenas/nest.png (7 entrées) | en_attente |
| nest_escape_2019 | NEST — évacuation 2019 | bitmap réutilisé | assets/arenas/nest.png (7 entrées) | en_attente |
| clock_tower_plaza_2020 | Parvis de la tour horloge 2020 | bitmap réutilisé | assets/arenas/raccoon.png (6 entrées) | en_attente |
| nest2_weapon_test_2020 | NEST2 — zone d’essai 2020 | bitmap réutilisé | assets/arenas/nest.png (7 entrées) | en_attente |
| village_lake_2023 | Lac du village 2023 | bitmap réutilisé | assets/arenas/zenobia.png (2 entrées) | en_attente |
| castle_dungeon_2023 | Donjon du château 2023 | bitmap réutilisé | assets/arenas/castle.png (5 entrées) | en_attente |
| specimen_storage_2023 | Stockage des spécimens 2023 | bitmap réutilisé | assets/arenas/nest.png (7 entrées) | en_attente |
| ancient_chantry_2023 | Sanctuaire ancien 2023 | bitmap réutilisé | assets/arenas/castle.png (5 entrées) | en_attente |
| island_docks_2023 | Quais de l’île 2023 | bitmap réutilisé | assets/arenas/factory.png (4 entrées) | en_attente |
| dimitrescu_battlements_2021 | Remparts Dimitrescu 2021 | bitmap réutilisé | assets/arenas/castle.png (5 entrées) | en_attente |
| moreau_reservoir_2021 | Réservoir Moreau 2021 | bitmap réutilisé | assets/arenas/village.png (3 entrées) | en_attente |
| heisenberg_yard_2021 | Cour Heisenberg 2021 | bitmap réutilisé | assets/arenas/factory.png (4 entrées) | en_attente |
| edonia_crash_2012 | Edonia — site du crash 2012 | bitmap réutilisé | assets/arenas/raccoon.png (6 entrées) | en_attente |
| guest_house_attic_2017 | Grenier de la maison d’hôtes 2017 | bitmap réutilisé | assets/arenas/baker.png (7 entrées) | en_attente |
| baker_garage_2017 | Garage Baker 2017 | bitmap réutilisé | assets/arenas/baker.png (7 entrées) | en_attente |
| processing_area_morgue_2017 | Zone de traitement / morgue 2017 | bitmap réutilisé | assets/arenas/baker.png (7 entrées) | en_attente |
| old_house_lantern_2017 | Vieille maison — lanterne 2017 | bitmap réutilisé | assets/arenas/baker.png (7 entrées) | en_attente |
| testing_area_2017 | Zone de test 2017 | bitmap réutilisé | assets/arenas/baker.png (7 entrées) | en_attente |
| eveline_corridor_2017 | Couloir Eveline 2017 | bitmap réutilisé | assets/arenas/baker.png (7 entrées) | en_attente |
| re5_060_adjule | DÉPÔT · CONTENEURS | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_big_man_majini | PORT · ENTREPOSAGE | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_chainsaw_majini | BIDONVILLE · GRILLE | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_executioner | KIJUJU · PLACE PUBLIQUE | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_gatling_gun_majini | NAVIRE · CALES | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_jill_valentine_enemy | RUINES · SALLE MONARQUE | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_licker_beta | LABORATOIRE · CORRIDOR | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_reaper | MISSILES · CONVOYEURS | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_popokarimu | MINE · PLATEAU | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_ndesu | PORT · APRÈS LA POURSUITE | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_irving | BATEAU · EAUX CÔTIÈRES | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_u_8 | TRICELL · PLATEFORME | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_uroboros | KIJUJU · INCINÉRATEUR | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_uroboros_mkono | TRICELL · CHAMBRE DE TEST | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_uroboros_aheri | NAVIRE · PONT SUPÉRIEUR | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |
| re5_060_uroboros_albert_wesker | VOLCAN · PLATEAU ROCHEUX | procédural présent, bitmap absent | Absent du catalogue runtime | en_attente |

Les libellés lisibles des 36 premières lignes sont des interprétations de leurs identifiants. Les IDs et chemins sont ceux du catalogue. Les décors sont documentés comme créations de simulation, sans certification géométrique Capcom.

## Corps et vues : état des 346 UID

V20 corrige quatre attentes de source : Ironhead (2 candidats), Revenant (1), Slinger (2) et Mutant Pedro (1). L’état V18 original est conservé dans le JSON et dans le classeur. Aucun des 61 états de refus n’a été requalifié.

| Statut technique après observation V20 | UID |
| --- | --- |
| CANDIDATE_WITH_LATER_DIRECTION_REFUSAL | 3 |
| EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | 25 |
| EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | 41 |
| HISTORICAL_TOOL_REFUSAL | 44 |
| OUT_OF_CURRENT_CREATURE_SCOPE | 17 |
| OWN_TOOL_REFUSAL | 8 |
| RELATED_REFUSAL_HOLD | 6 |
| RETAINED_STATIC_CANDIDATE | 68 |
| SOURCE_HOLD | 129 |
| TRIALS_ONLY_NOT_ADMITTED | 1 |
| V20_STATIC_CANDIDATE | 4 |

### Référence à réunir — 129 UID

| UID | Nom | Édition | État V18 / V20 | Visuels référencés | V21 |
| --- | --- | --- | --- | --- | --- |
| re0-cerberus | Cerberus | Resident Evil 0 (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-edward-dewey-zombie | Edward Dewey | Resident Evil 0 (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-eliminator | Eliminator | Resident Evil 0 (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-giant-spider | Giant Spider | Resident Evil 0 (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-hunter | Hunter | Resident Evil 0 (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-mimicry-marcus | Mimicry Marcus — camouflage rompu | Resident Evil 0 (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-plague-crawler | Plague Crawler | Resident Evil 0 (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-queen-leech | Queen Leech | Resident Evil 0 (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-queen-leech-second-form | Queen Leech (Second Form) | Resident Evil 0 (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-black-tiger | Black Tiger | Resident Evil (1996) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-forest-speyer-zombie | Forest Speyer | Resident Evil (1996) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-small-spider | Small Spider | Resident Evil (1996) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-black-tiger | Black Tiger | Resident Evil remake (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-forest-speyer-zombie | Forest Speyer | Resident Evil remake (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-web-spinner | Web Spinner | Resident Evil remake (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-zombie | Zombie | Resident Evil remake (2002) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-brad-vickers-zombie | Brad Vickers (Zombie) | Resident Evil 2 (1998) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-marvin-branagh-zombie | Marvin Branagh (Zombie) | Resident Evil 2 (1998) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-zombie | Zombie | Resident Evil 2 (1998) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-g-adult | G-Adult | Resident Evil 2 remake (2019) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-g-fifth-form | G (Fifth Form) | Resident Evil 2 remake (2019) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-g-second-form | G (Second Form) | Resident Evil 2 remake (2019) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-g-third-form | G (Third Form) | Resident Evil 2 remake (2019) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-g-young | G-Young | Resident Evil 2 remake (2019) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-super-tyrant | Super Tyrant | Resident Evil 2 remake (2019) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-zombie-dog | Zombie Dog | Resident Evil 2 remake (2019) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-crow | Crow | Resident Evil 3: Nemesis (1999) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-giant-spider | Giant Spider | Resident Evil 3: Nemesis (1999) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-small-spider | Small Spider | Resident Evil 3: Nemesis (1999) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-zombie-dog | Zombie Dog | Resident Evil 3: Nemesis (1999) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-licker | Licker | Resident Evil 3 remake (2020) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-ne-alpha-parasite | Ne-α Parasite | Resident Evil 3 remake (2020) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-pale-head | Pale Head | Resident Evil 3 remake (2020) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-stage-2-nemesis | Stage 2 Nemesis | Resident Evil 3 remake (2020) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-zombie-dog | Zombie Dog | Resident Evil 3 remake (2020) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-hammer-ganado | Hammer Ganado | Resident Evil 4 (2005) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-u-3 | U-3 | Resident Evil 4 (2005) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-village-ganado | Village Ganado | Resident Evil 4 (2005) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-armadura | Armadura | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-armadura-strong-threat | Armadura (Strong Threat) | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-colmillos-strong-threat | Colmillos (Strong Threat) | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-del-lago | Del Lago | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-iron-maiden | Iron Maiden | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-novistador | Novistador | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-osmund-saddler-mutated | Osmund Saddler (Mutated) | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-ramon-salazar-mutated | Ramón Salazar (Mutated) | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-regenerador-strong-threat | Regenerador (Strong Threat) | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-soldier | Soldier | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-villager | Villager | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-zealot | Zealot | Resident Evil 4 remake (2023) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-base-majini | Base Majini | Resident Evil 5 (2009) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-cephalo | Cephalo | Resident Evil 5 (2009) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-irving | Irving | Resident Evil 5 (2009) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-kipepeo | Kipepeo | Resident Evil 5 (2009) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-u-8 | U-8 | Resident Evil 5 (2009) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-uroboros-aheri | Uroboros Aheri | Resident Evil 5 (2009) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-wetlands-majini | Wetlands Majini | Resident Evil 5 (2009) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-lepotitsa | Lepotitsa | Resident Evil 6 (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-rasklapanje | Rasklapanje | Resident Evil 6 (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-shrieker | Shrieker | Resident Evil 6 (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-ubistvo | Ubistvo | Resident Evil 6 (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-ustanak | Ustanak | Resident Evil 6 (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-zombie-dog | Zombie Dog | Resident Evil 6 (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-eveline-final | Eveline — forme finale | Resident Evil 7 Biohazard (2017) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-jack-baker-mutated | Jack Baker — forme mutée | Resident Evil 7 Biohazard (2017) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-jack-baker-swamp-man | Jack Baker — Swamp Man | Resident Evil 7 Biohazard (2017) — End of Zoe | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-little-crawler | Little Crawler | Resident Evil 7 biohazard (2017) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-mia-winters-infected | Mia Winters — infectée | Resident Evil 7 Biohazard (2017) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-molded-crawler | Molded (Crawler) | Resident Evil 7 biohazard (2017) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-molded-fat | Fat Molded | Resident Evil 7 biohazard (2017) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-anatomist-zombie | Anatomist Zombie | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-bat | Bat | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-black-widow | Black Widow | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-giant-black-widow | Giant Black Widow | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-gulp-worm | Gulp Worm | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-hunter | Hunter | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-moth | Moth | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-mutated-steve | Mutated Steve | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-sweeper | Sweeper | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-zombie | Zombie | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-zombie-dog | Zombie Dog | Resident Evil CODE: Veronica (2000) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-baby-moth | Baby Moth | Resident Evil Outbreak (2003) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-g-type | G-Type | Resident Evil Outbreak (2003) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-giant-moth | Giant Moth | Resident Evil Outbreak (2003) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-hunter | Hunter | Resident Evil Outbreak (2003) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-leech-man | Leech Man | Resident Evil Outbreak (2003) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-licker | Licker | Resident Evil Outbreak (2003) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-scissor-worm | Scissor Worm | Resident Evil Outbreak (2003) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-zombie-dog | Zombie Dog | Resident Evil Outbreak (2003) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-axe-man | Axe Man | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-green-zombie | Green Zombie | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-hunter-mu | Hunter-μ | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-licker | Licker | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-nyx | Nyx | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-stalker | Stalker | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-titan | Titan | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-tyrant | Tyrant | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-zombie-dog | Zombie Dog | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-zombie-lioness | Zombie Lioness | Resident Evil Outbreak File #2 (2004) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-ark-zombie | ARK Zombie | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-chunk | Chunk | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-elite-guard | Elite Guard | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-raccoon-city-bsaa-zombie | Raccoon City BSAA Zombie | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-raccoon-city-chainsaw-zombie | Raccoon City Chainsaw Zombie | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-raccoon-city-zombie | Raccoon City Zombie | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-rpd-zombie | R.P.D. Zombie | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-super-tyrant-t-501 | Super Tyrant T-501 | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-the-commander | The Commander | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-zombie-cleaner | Zombie Cleaner | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-zombie-singer | Zombie Singer | Resident Evil Requiem (2026) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-black-fenrir | Black Fenrir | Resident Evil Revelations (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-draghignazzo | Draghignazzo | Resident Evil Revelations (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-fenrir | Fenrir | Resident Evil Revelations (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-hunter | Hunter | Resident Evil Revelations (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-norman-mutant | Norman Mutant | Resident Evil Revelations (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-scarmiglione | Scarmiglione | Resident Evil Revelations (2012) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-dhurlga | Dhurlga | Resident Evil Revelations 2 (2015) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-giant-whip-spider | Giant Whip Spider | Resident Evil Revelations 2 (2015) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-monster-alex | Monster Alex | Resident Evil Revelations 2 (2015) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-monster-alex-2nd-fight | Monster Alex (2nd Fight) | Resident Evil Revelations 2 (2015) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-lycan-large | Lycan — grande variante | Resident Evil Village (2021) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-mother-miranda | Miranda — apparence cérémonielle | Resident Evil Village (2021) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-mutated-dimitrescu | Mutated Dimitrescu | Resident Evil Village (2021) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-mutated-heisenberg | Mutated Heisenberg | Resident Evil Village (2021) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-mutated-miranda | Miranda — forme de combat ailée | Resident Evil Village (2021) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-mutated-moreau | Mutated Moreau | Resident Evil Village (2021) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-samca | Samcă | Resident Evil Village (2021) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-soldat-eins | Soldat Eins | Resident Evil Village (2021) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-urias-strajer | Uriaș Străjer | Resident Evil Village (2021) | SOURCE_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |

### Existant à compléter — 138 UID

| UID | Nom | Édition | État V18 / V20 | Visuels référencés | V21 |
| --- | --- | --- | --- | --- | --- |
| re0-bat | Bat | Resident Evil 0 (2002) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-centurion | Centurion | Resident Evil 0 (2002) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-crow | Crow | Resident Evil 0 (2002) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-giant-bat | Giant Bat | Resident Evil 0 (2002) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-leech | Leech | Resident Evil 0 (2002) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-lurker | Lurker | Resident Evil 0 (2002) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-proto-tyrant | Proto-Tyrant | Resident Evil 0 (2002) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re0-stinger | Stinger | Resident Evil 0 (2002) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-adder | Adder | Resident Evil (1996) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-cerberus | Cerberus | Resident Evil (1996) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-chimera | Chimera | Resident Evil (1996) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-crow | Crow | Resident Evil (1996) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-hunter | Hunter α — artwork original | Resident Evil (1996) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-wasp | Wasp | Resident Evil (1996) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-web-spinner | Web Spinner | Resident Evil (1996) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-zombie | Zombie | Resident Evil (1996) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-adder | Adder | Resident Evil remake (2002) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-cerberus | Cerberus | Resident Evil remake (2002) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-chimera | Chimera | Resident Evil remake (2002) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-crimson-head | Crimson Head | Resident Evil remake (2002) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-crow | Crow | Resident Evil remake (2002) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-hunter | Hunter | Resident Evil remake (2002) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-wasp | Wasp | Resident Evil remake (2002) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-crow | Crow | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-evolved-licker | Evolved Licker | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-g-fifth-form | G (Fifth Form) | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-g-fourth-form | G — quatrième forme | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-g-second-form | G — deuxième forme | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-g-third-form | G — troisième forme | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-g-type-adult | G-Type Adult | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-g-type-young | G-Type Young | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-giant-moth | Giant Moth | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-giant-spider | Giant Spider | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-ivy | Ivy / Plant 43 | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-large-roach | Large Roach | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-larvae | Larvae | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-licker | Licker | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-poison-ivy | Poison Ivy | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-tyrant | Tyrant T-103 / T-00 | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-tyrant-mutation | Super Tyrant | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-zombie-dog | Zombie Dog | Resident Evil 2 (1998) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-ivy | Ivy | Resident Evil 2 remake (2019) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-licker | Licker | Resident Evil 2 remake (2019) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-brain-sucker | Brain Sucker | Resident Evil 3: Nemesis (1999) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-drain-deimos | Drain Deimos | Resident Evil 3: Nemesis (1999) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-grave-digger | Grave Digger | Resident Evil 3: Nemesis (1999) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-hunter-beta | Hunter β | Resident Evil 3: Nemesis (1999) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-hunter-gamma | Hunter γ | Resident Evil 3: Nemesis (1999) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-nemesis | Nemesis | Resident Evil 3: Nemesis (1999) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-nemesis-second-form | Nemesis (Second Form) | Resident Evil 3: Nemesis (1999) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-sliding-worm | Sliding Worm | Resident Evil 3: Nemesis (1999) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-drain-deimos | Drain Deimos | Resident Evil 3 remake (2020) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-hunter-beta | Hunter β | Resident Evil 3 remake (2020) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-hunter-gamma | Hunter γ — gueule ouverte | Resident Evil 3 remake (2020) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-armadura | Armadura | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-bella-sisters | Bella Sisters | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 4 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-castle-ganado | Castle Ganado | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-castle-ganado-leader-zealot | Castle Ganado (Leader Zealot) | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-colmillos | Colmillos | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-el-gigante | El Gigante | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-iron-maiden | Iron Maiden | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-jj | J.J. | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-novistador | Novistador | Resident Evil 4 (2005) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-regenerator | Regenerator | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-soldier-ganado | Soldier Ganado | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-verdugo | Verdugo | Resident Evil 4 (2005) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-chainsaw-sisters | Chainsaw Sisters | Resident Evil 4 remake (2023) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-colmillos | Colmillos | Resident Evil 4 remake (2023) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-el-gigante | El Gigante | Resident Evil 4 remake (2023) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-regenerador | Regenerador | Resident Evil 4 remake (2023) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-verdugo | Verdugo | Resident Evil 4 remake (2023) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-adjule | Adjule | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-big-man-majini | Big Man Majini | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-bui-kichwa | Bui Kichwa | Resident Evil 5 (2009) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-chainsaw-majini | Chainsaw Majini | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-executioner | Executioner | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-giant-majini | Giant Majini | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-jill-valentine-enemy | Jill Valentine | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-licker-beta | Licker beta | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-ndesu | Ndesu | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-popokarimu | Popokarimu | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-reaper | Reaper | Resident Evil 5 (2009) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-bloodshot | Bloodshot | Resident Evil 6 (2012) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-iluzija | Iluzija | Resident Evil 6 (2012) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-meset | Meset | Resident Evil 6 (2012) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-napad | Napad | Resident Evil 6 (2012) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-ogroman | Ogroman | Resident Evil 6 (2012) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-strelat | Strelat | Resident Evil 6 (2012) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-whopper | Whopper | Resident Evil 6 (2012) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-flying-bug | Flying Bug | Resident Evil 7 biohazard (2017) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-fumer | Fumer (WM-002) | Resident Evil 7 Biohazard (2017) — Not a Hero | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-albinoid-adult | Albinoid — adulte | Resident Evil CODE: Veronica (2000) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-albinoid-infant | Albinoid Infant | Resident Evil CODE: Veronica (2000) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-bandersnatch | Bandersnatch | Resident Evil CODE: Veronica (2000) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-nosferatu | Nosferatu | Resident Evil CODE: Veronica (2000) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-crow | Crow | Resident Evil Outbreak (2003) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-g-embryo | G-Embryo | Resident Evil Outbreak (2003) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-giant-spider | Giant Spider | Resident Evil Outbreak (2003) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-giant-wasp | Giant Wasp | Resident Evil Outbreak (2003) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-hunter-gamma | Hunter Gamma | Resident Evil Outbreak (2003) | RETAINED_STATIC_CANDIDATE | V18 : 2 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-queen-leech | Queen Leech | Resident Evil Outbreak (2003) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-small-leech | Small Leech | Resident Evil Outbreak (2003) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-thanatos-r | Thanatos-R | Resident Evil Outbreak (2003) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-crow | Crow | Resident Evil Outbreak File #2 (2004) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-giant-spider | Giant Spider | Resident Evil Outbreak File #2 (2004) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-giga-bite | Giga Bite | Resident Evil Outbreak File #2 (2004) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-horn-bill | Horn Bill | Resident Evil Outbreak File #2 (2004) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-scissor-tail | Scissor Tail | Resident Evil Outbreak File #2 (2004) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-tyrant-r | Tyrant R | Resident Evil Outbreak File #2 (2004) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-wasp | Wasp | Resident Evil Outbreak File #2 (2004) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-zombie-hyena | Zombie Hyena | Resident Evil Outbreak File #2 (2004) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-garmr | Garmr | Resident Evil Requiem (2026) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-licker-beta2 | Licker β2 | Resident Evil Requiem (2026) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-small-spider | Small Spider | Resident Evil Requiem (2026) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-tyrant-t-501 | Tyrant T-501 | Resident Evil Requiem (2026) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-farfarello | Farfarello | Resident Evil Revelations (2012) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-ghiozzo | Ghiozzo | Resident Evil Revelations (2012) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-globster | Globster | Resident Evil Revelations (2012) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-ooze | Ooze | Resident Evil Revelations (2012) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-pincer-ooze | Pincer Ooze | Resident Evil Revelations (2012) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-rachael-ooze | Ooze Rachael | Resident Evil Revelations (2012) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-scagdead | Scagdead | Resident Evil Revelations (2012) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-sea-creeper | Sea Creeper | Resident Evil Revelations (2012) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-tricorne-ooze | Tricorne Ooze | Resident Evil Revelations (2012) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev-wall-blister | Wall Blister | Resident Evil Revelations (2012) | EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-glasp | Glasp | Resident Evil Revelations 2 (2015) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-ironhead | Ironhead | Resident Evil Revelations 2 (2015) | V20_STATIC_CANDIDATE | V18 : 0 ; V20 : 2 candidat(s), 1 essai(s) | en_attente |
| rerev2-monster-neil | Monster Neil | Resident Evil Revelations 2 (2015) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-mutant-pedro | Mutant Pedro | Resident Evil Revelations 2 (2015) | V20_STATIC_CANDIDATE | V18 : 0 ; V20 : 1 candidat(s), 2 essai(s) | en_attente |
| rerev2-orthrus | Orthrus | Resident Evil Revelations 2 (2015) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-revenant | Revenant | Resident Evil Revelations 2 (2015) | V20_STATIC_CANDIDATE | V18 : 0 ; V20 : 1 candidat(s), 0 essai(s) | en_attente |
| rerev2-rotten | Rotten | Resident Evil Revelations 2 (2015) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-slinger | Slinger | Resident Evil Revelations 2 (2015) | V20_STATIC_CANDIDATE | V18 : 0 ; V20 : 2 candidat(s), 0 essai(s) | en_attente |
| rerev2-vulcanblubber | Vulcanblubber | Resident Evil Revelations 2 (2015) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-salvatore-moreau | Salvatore Moreau — sous son manteau | Resident Evil Village (2021) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-salvatore-moreau-exposed | Salvatore Moreau — manteau retiré | Resident Evil Village (2021) | EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-soldat-jet | Soldat Jet | Resident Evil Village (2021) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-varcolac | Vârcolac | Resident Evil Village (2021) | RETAINED_STATIC_CANDIDATE | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |

### Refus historique — 61 UID

| UID | Nom | Édition | État V18 / V20 | Visuels référencés | V21 |
| --- | --- | --- | --- | --- | --- |
| re0-zombie | Zombie | Resident Evil 0 (2002) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-tyrant | Tyrant | Resident Evil (1996) | RELATED_REFUSAL_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1-yawn | Yawn | Resident Evil (1996) | OWN_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-crimson-head-prototype-1 | Crimson Head Prototype 1 | Resident Evil remake (2002) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-tyrant | Tyrant T-002 | Resident Evil remake (2002) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re1r-yawn | Yawn | Resident Evil remake (2002) | CANDIDATE_WITH_LATER_DIRECTION_REFUSAL | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2-g | G — première forme | Resident Evil 2 (1998) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-g-first-form | G (First Form) | Resident Evil 2 remake (2019) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-g-fourth-form | G (Fourth Form) | Resident Evil 2 remake (2019) | OWN_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-tyrant | Tyrant T-103 / T-00 | Resident Evil 2 remake (2019) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re2r-zombie | Zombie | Resident Evil 2 remake (2019) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3-zombie | Zombie | Resident Evil 3: Nemesis (1999) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-nemesis | Nemesis — forme 1, lance-roquettes | Resident Evil 3 remake (2020) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-stage-3-nemesis | Stage 3 Nemesis | Resident Evil 3 remake (2020) | RELATED_REFUSAL_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re3r-zombie | Zombie | Resident Evil 3 remake (2020) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-bitores-mendez-mutated | Bitores Méndez — forme mutée | Resident Evil 4 (2005) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-dr-salvador | Dr. Salvador | Resident Evil 4 (2005) | RELATED_REFUSAL_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-garrador | Garrador | Resident Evil 4 (2005) | RELATED_REFUSAL_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-bitores-mendez-first-mutation | Bitores Méndez (First Mutation) | Resident Evil 4 remake (2023) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-bitores-mendez-second-mutation | Bitores Méndez (Second Mutation) | Resident Evil 4 remake (2023) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-brute | Brute | Resident Evil 4 remake (2023) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-chainsaw-villager | Chainsaw Villager | Resident Evil 4 remake (2023) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-garrador | Garrador | Resident Evil 4 remake (2023) | OWN_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-duvalia | Duvalia | Resident Evil 5 (2009) | OWN_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-town-majini | Town Majini | Resident Evil 5 (2009) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-uroboros | Uroboros | Resident Evil 5 (2009) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-uroboros-mkono | Uroboros Mkono | Resident Evil 5 (2009) | CANDIDATE_WITH_LATER_DIRECTION_REFUSAL | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-deborah-harper | Deborah Harper | Resident Evil 6 (2012) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-javo | J'avo | Resident Evil 6 (2012) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re6-zombie | Zombie au Virus-C | Resident Evil 6 (2012) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-jack-baker-scissor | Jack Baker — scie à ciseaux | Resident Evil 7 Biohazard (2017) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-lucas-baker-mutated | Lucas Baker — forme mutée | Resident Evil 7 Biohazard (2017) — Not a Hero | CANDIDATE_WITH_LATER_DIRECTION_REFUSAL | V18 : 1 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-mama-mold | Mama Mold (WM-001) | Resident Evil 7 biohazard (2017) | OWN_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-marguerite-baker-mutated | Marguerite Baker — forme mutée | Resident Evil 7 Biohazard (2017) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-molded | Molded | Resident Evil 7 biohazard (2017) | OWN_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-alexia | Alexia — première forme | Resident Evil CODE: Veronica (2000) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-alexia-ashford-third-form | Alexia — troisième forme | Resident Evil CODE: Veronica (2000) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| recv-tyrant | Tyrant T-078 | Resident Evil CODE: Veronica (2000) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-regis-licker | Regis Licker | Resident Evil Outbreak (2003) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-thanatos | Thanatos | Resident Evil Outbreak (2003) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak-zombie | Zombie | Resident Evil Outbreak (2003) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| reoutbreak2-zombie | Zombie | Resident Evil Outbreak File #2 (2004) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-blister-head | Blister Head | Resident Evil Requiem (2026) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-chef-zombie | Chef Zombie | Resident Evil Requiem (2026) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-wrenwood-zombie | Wrenwood Zombie | Resident Evil Requiem (2026) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-zombie-blind-patient | Zombie Blind Patient | Resident Evil Requiem (2026) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-zombie-doctor | Zombie Doctor | Resident Evil Requiem (2026) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-zombie-patient | Zombie Patient | Resident Evil Requiem (2026) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerequiem-zombie-staff-member | Zombie Staff Member | Resident Evil Requiem (2026) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-afflicted | Afflicted | Resident Evil Revelations 2 (2015) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| rerev2-splasher | Splasher | Resident Evil Revelations 2 (2015) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-bela-dimitrescu | Bela Dimitrescu | Resident Evil Village (2021) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-hauler | Hauler | Resident Evil Village (2021) | OWN_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-karl-heisenberg | Karl Heisenberg — forme humaine | Resident Evil Village (2021) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-lycan | Lycan | Resident Evil Village (2021) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-moroaica | Moroaică | Resident Evil Village (2021) | RELATED_REFUSAL_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-soldat-panzer | Soldat Panzer | Resident Evil Village (2021) | OWN_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-soldat-zwei | Soldat Zwei | Resident Evil Village (2021) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-sturm | Sturm | Resident Evil Village (2021) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-urias | Uriaș | Resident Evil Village (2021) | RELATED_REFUSAL_HOLD | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-urias-drac | Uriaș Drac | Resident Evil Village (2021) | HISTORICAL_TOOL_REFUSAL | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |

### Essais seulement — 1 UID

| UID | Nom | Édition | État V18 / V20 | Visuels référencés | V21 |
| --- | --- | --- | --- | --- | --- |
| re5-gatling-gun-majini | Gatling Gun Majini | Resident Evil 5 (2009) | TRIALS_ONLY_NOT_ADMITTED | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |

### Hors périmètre bow courant — 17 UID

| UID | Nom | Édition | État V18 / V20 | Visuels référencés | V21 |
| --- | --- | --- | --- | --- | --- |
| re4-bitores-mendez-enemy | Bitores Méndez — forme humaine | Resident Evil 4 (2005) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-jack-krauser-enemy | Jack Krauser | Resident Evil 4 (2005) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4-osmund-saddler-enemy | Osmund Saddler — forme humaine | Resident Evil 4 (2005) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-bitores-mendez | Bitores Méndez — forme humaine | Resident Evil 4 remake (2023) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-jack-krauser | Jack Krauser | Resident Evil 4 remake (2023) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-jack-krauser-mutated | Jack Krauser (Mutated) | Resident Evil 4 remake (2023) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re4r-ramon-salazar | Ramón Salazar — forme humaine | Resident Evil 4 remake (2023) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-albert-wesker-enemy | Albert Wesker — forme humaine | Resident Evil 5 (2009) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re5-uroboros-albert-wesker | Uroboros Albert Wesker | Resident Evil 5 (2009) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-eveline | Eveline — apparence enfant | Resident Evil 7 Biohazard (2017) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-jack-baker | Jack Baker — forme humaine | Resident Evil 7 Biohazard (2017) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-lucas-baker | Lucas Baker — forme humaine | Resident Evil 7 Biohazard (2017) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| re7-marguerite-baker | Marguerite Baker — forme humaine | Resident Evil 7 Biohazard (2017) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-alcina-dimitrescu | Alcina Dimitrescu — forme humaine | Resident Evil Village (2021) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-cassandra-dimitrescu | Cassandra Dimitrescu | Resident Evil Village (2021) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-daniela-dimitrescu | Daniela Dimitrescu | Resident Evil Village (2021) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |
| revillage-donna-angie | Donna Beneviento et Angie | Resident Evil Village (2021) | OUT_OF_CURRENT_CREATURE_SCOPE | V18 : 0 ; V20 : 0 candidat(s), 0 essai(s) | en_attente |

Sources : S02, S03 et S07. Les visuels comptés dans cette table sont ceux référencés par ce suivi ; un zéro n’établit pas l’absence de portrait ou d’autres fichiers historiques.

## Fiches de finition : 24 incarnations

Ces fiches de conception V1 ne sont pas 24 personnages nouvellement manquants. Chaque édition doit être raccordée aux fichiers actuels.

| ID | Personnage | Édition | Statut | Historique signalé | V21 |
| --- | --- | --- | --- | --- | --- |
| REC_JILL_RE3R | Jill Valentine | Resident Evil 3 remake (2020) | refus historique | Refus de génération V1 de la pose droite RE3R. | en_attente |
| REC_CHRIS_RE5 | Chris Redfield | Resident Evil 5 (2009) | refus historique | Refus V5 de la pose gauche RE5. | en_attente |
| REC_LEON_RE4R | Leon S Kennedy | Resident Evil 4 remake (2023) | refus historique | Refus de génération V1 de la pose droite RE4R. | en_attente |
| REC_CLAIRE_RE2R | Claire Redfield | Resident Evil 2 remake (2019) | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_REBECCA_RE0 | Rebecca Chambers | Resident Evil 0 (2002, modèle HD de référence à verrouiller) | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_BARRY_REV2 | Barry Burton | Resident Evil Revelations 2 (2015) | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_ADA_RE4R | Ada Wong | Resident Evil 4 remake Separate Ways (2023) | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_HUNK_RE2R | HUNK | Resident Evil 2 remake The 4th Survivor (2019) | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_CARLOS_RE3R | Carlos Oliveira | Resident Evil 3 remake (2020) | refus historique | Refus V5 de la pose gauche RE3R. | en_attente |
| REC_SHEVA_RE5 | Sheva Alomar | Resident Evil 5 (2009) | existant à compléter | V5 conserve un refus de la tenue Business en vue gauche ; tenue BSAA distincte dans cette fiche. | en_attente |
| REC_SHERRY_RE6 | Sherry Birkin | Resident Evil 6 (2012) | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_JAKE_RE6 | Jake Muller | Resident Evil 6 (2012) | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_HELENA_RE6 | Helena Harper | Resident Evil 6 (2012) | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_PIERS_RE6 | Piers Nivans | Resident Evil 6 (2012) forme soldat avant mutation | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_BILLY_RE0 | Billy Coen | Resident Evil 0 (2002, modèle HD de référence à verrouiller) | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_WESKER_RE5 | Albert Wesker | Resident Evil 5 (2009) forme humaine avant Uroboros | refus historique | Refus V5 de la pose droite RE5 humaine. | en_attente |
| REC_NEMESIS_RE3R | Nemesis | Resident Evil 3 remake (2020) forme 1 avec lance-roquettes | refus historique | Refus de génération V1 de la forme 1 RE3R avec lance-roquettes. | en_attente |
| REC_T103_RE2R | Tyrant T103 | Resident Evil 2 remake (2019) T00 en manteau | refus historique | Refus de génération V1 de la pose droite RE2R en manteau. | en_attente |
| REC_BIRKIN_G1_RE2R | William Birkin G1 | Resident Evil 2 remake (2019) première mutation G | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_JACK_RE7 | Jack Baker | Resident Evil 7 biohazard (2017) apparence humaine | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_ALCINA_RE8 | Alcina Dimitrescu | Resident Evil Village (2021) forme humaine | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_HEISENBERG_RE8 | Karl Heisenberg | Resident Evil Village (2021) forme humaine | existant à compléter | Pas de décision nouvelle | en_attente |
| REC_KRAUSER_RE4R | Jack Krauser | Resident Evil 4 remake (2023) forme initiale humaine | refus historique | V5 conserve un refus historique explicite de Krauser. | en_attente |
| REC_ALEXIA_CVX | Alexia Ashford | Resident Evil CODE Veronica X (2001) première forme humanoïde | existant à compléter | Pas de décision nouvelle | en_attente |

## Extensions : 60 candidats non confirmés

Les 60 entrées portent « Nouveau confirmé : non » dans le classeur V1. Une comparaison d’incarnation est nécessaire avant de produire une nouvelle identité.

| ID | Nom | Édition | V21 |
| --- | --- | --- | --- |
| RES_KEVIN_RYMAN | Kevin Ryman | Resident Evil Outbreak File #2 | en_attente |
| RES_DAVID_KING | David King | Resident Evil Outbreak File #2 | en_attente |
| RES_MARK_WILKINS | Mark Wilkins | Resident Evil Outbreak File #2 | en_attente |
| RES_CINDY_LENNOX | Cindy Lennox | Resident Evil Outbreak File #2 | en_attente |
| RES_GEORGE_HAMILTON | George Hamilton | Resident Evil Outbreak File #2 | en_attente |
| RES_ALYSSA_ASHCROFT | Alyssa Ashcroft | Resident Evil Outbreak File #2 | en_attente |
| RES_JIM_CHAPMAN | Jim Chapman | Resident Evil Outbreak File #2 | en_attente |
| RES_YOKO_SUZUKI | Yoko Suzuki | Resident Evil Outbreak File #2 | en_attente |
| RES_PARKER_LUCIANI | Parker Luciani | Resident Evil Revelations HD | en_attente |
| RES_JESSICA_SHERAWAT | Jessica Sherawat | Resident Evil Revelations HD | en_attente |
| RES_RAYMOND_VESTER | Raymond Vester | Resident Evil Revelations HD | en_attente |
| RES_RACHAEL_FOLEY | Rachael Foley | Resident Evil Revelations HD | en_attente |
| RES_MOIRA_BURTON | Moira Burton | Resident Evil Revelations 2 | en_attente |
| RES_ALEX_WESKER | Alex Wesker | Resident Evil Revelations 2 | en_attente |
| RES_NEIL_FISHER | Neil Fisher | Resident Evil Revelations 2 | en_attente |
| RES_EVGENY_REBIC | Evgeny Rebic | Resident Evil Revelations 2 | en_attente |
| RES_VALERIE_HARMON | Valerie Harmon | Resident Evil Resistance | en_attente |
| RES_JANUARY_VAN_SANT | January Van Sant | Resident Evil Resistance | en_attente |
| RES_TYRONE_HENRY | Tyrone Henry | Resident Evil Resistance | en_attente |
| RES_SAMUEL_JORDAN | Samuel Jordan | Resident Evil Resistance | en_attente |
| RES_MARTIN_SANDWICH | Martin Sandwich | Resident Evil Resistance | en_attente |
| RES_BECCA_WOOLLETT | Becca Woollett | Resident Evil Resistance | en_attente |
| RES_LUPO | Lupo | Resident Evil Operation Raccoon City | en_attente |
| RES_VECTOR | Vector | Resident Evil Operation Raccoon City | en_attente |
| RES_BELTWAY | Beltway | Resident Evil Operation Raccoon City | en_attente |
| RES_BERTHA | Bertha | Resident Evil Operation Raccoon City | en_attente |
| RES_SPECTRE | Spectre | Resident Evil Operation Raccoon City | en_attente |
| RES_FOUR_EYES | Four Eyes | Resident Evil Operation Raccoon City | en_attente |
| RES_BRUCE_MCGIVERN | Bruce McGivern | Resident Evil Dead Aim | en_attente |
| RES_FONG_LING | Fong Ling | Resident Evil Dead Aim | en_attente |
| RES_MORPHEUS_D_DUVALL | Morpheus D. Duvall | Resident Evil Dead Aim | en_attente |
| RES_ARK_THOMPSON | Ark Thompson | Resident Evil Survivor | en_attente |
| RES_HYPNOS_T_TYPE | Hypnos T type | Resident Evil Survivor | en_attente |
| RES_SERGEI_VLADIMIR | Sergei Vladimir | Resident Evil The Umbrella Chronicles | en_attente |
| RES_IVAN | Ivan | Resident Evil The Umbrella Chronicles | en_attente |
| RES_JAVIER_HIDALGO | Javier Hidalgo | Resident Evil The Darkside Chronicles | en_attente |
| RES_ETHAN_WINTERS | Ethan Winters | Resident Evil 7 Gold Edition | en_attente |
| RES_MIA_WINTERS | Mia Winters | Resident Evil 7 Gold Edition | en_attente |
| RES_ZOE_BAKER | Zoe Baker | Resident Evil 7 Gold Edition | en_attente |
| RES_JOE_BAKER | Joe Baker | Resident Evil 7 Gold Edition | en_attente |
| RES_MARGUERITE_BAKER | Marguerite Baker | Resident Evil 7 Gold Edition | en_attente |
| RES_LUCAS_BAKER | Lucas Baker | Resident Evil 7 Gold Edition | en_attente |
| RES_DONNA_BENEVIENTO | Donna Beneviento | Resident Evil Village | en_attente |
| RES_SALVATORE_MOREAU | Salvatore Moreau | Resident Evil Village | en_attente |
| RES_MOTHER_MIRANDA | Mother Miranda | Resident Evil Village | en_attente |
| RES_LUIS_SERRA_NAVARRO | Luis Serra | Resident Evil 4 remake 2023 | en_attente |
| RES_ASHLEY_GRAHAM | Ashley Graham | Resident Evil 4 remake 2023 | en_attente |
| RES_MARCHAND | Marchand | Resident Evil 4 remake 2023 | en_attente |
| RES_BITORES_MENDEZ | Bitores Mendez | Resident Evil 4 remake 2023 | en_attente |
| RES_RAMON_SALAZAR | Ramon Salazar | Resident Evil 4 remake 2023 | en_attente |
| RES_OSMUND_SADDLER | Osmund Saddler | Resident Evil 4 remake 2023 | en_attente |
| RES_ANGELA_MILLER | Angela Miller | Resident Evil Degeneration | en_attente |
| RES_SVETLANA_BELIKOVA | Svetlana Belikova | Resident Evil Damnation | en_attente |
| RES_ALEXANDER_KOZACHENKO | Alexander Kozachenko | Resident Evil Damnation | en_attente |
| RES_GRACE_ASHCROFT | Grace Ashcroft | Resident Evil Requiem | en_attente |
| RES_STEVE_BURNSIDE | Steve Burnside | Resident Evil CODE Veronica X | en_attente |
| RES_ALFRED_ASHFORD | Alfred Ashford | Resident Evil CODE Veronica X | en_attente |
| RES_TYRANT_T002 | Tyrant T002 | Resident Evil HD Remaster | en_attente |
| RES_HUNTER_ALPHA | Hunter Alpha | Resident Evil HD Remaster | en_attente |
| RES_LICKER | Licker | Resident Evil 2 remake 2019 | en_attente |

## Costumes : descriptions de base et cibles V5

**Le recensement de tous les costumes officiels de la franchise n’est pas établi.** Les 24 lignes suivantes décrivent les tenues de base ; elles ne sont pas 24 costumes alternatifs absents.

| Personnage | Édition | Description de base | V21 |
| --- | --- | --- | --- |
| Jill Valentine | Resident Evil 3 remake (2020) | Débardeur bleu, pantalon sombre et équipement RE3 remake; ni béret STARS de RE1 ni tenue P30 de RE5. | en_attente |
| Chris Redfield | Resident Evil 5 (2009) | Équipement BSAA de RE5 et coupe courte; pas de manteau Hound Wolf de Village. | en_attente |
| Leon S Kennedy | Resident Evil 4 remake (2023) | Tenue tactique de RE4 remake sans blouson en combat; blouson distinct avec toutes animations propres. Ni uniforme RPD ni visage RE6. | en_attente |
| Claire Redfield | Resident Evil 2 remake (2019) | Veste rouge de motarde et jean RE2 remake; jamais veste CODE Veronica ni costume RE2 original fusionnés. | en_attente |
| Rebecca Chambers | Resident Evil 0 (2002, modèle HD de référence à verrouiller) | Uniforme STARS médical RE0, gilet et pantalon verts; costume cheerleader éventuel séparé, aucune fusion RE1. | en_attente |
| Barry Burton | Resident Evil Revelations 2 (2015) | Tenue de recherche de Revelations 2 et équipement associé; pas de gilet STARS RE1 par défaut. | en_attente |
| Ada Wong | Resident Evil 4 remake Separate Ways (2023) | Robe-pull rouge, collants sombres et bottes de Separate Ways remake; aucune robe chinoise RE4 original. | en_attente |
| HUNK | Resident Evil 2 remake The 4th Survivor (2019) | Équipement USS sombre et lentilles rouges RE2 remake; pas de masque RE4 ou mercenaire générique. | en_attente |
| Carlos Oliveira | Resident Evil 3 remake (2020) | Gilet UBCS et tenue RE3 remake; cheveux RE3 original réservés à un costume séparé. | en_attente |
| Sheva Alomar | Resident Evil 5 (2009) | Tenue BSAA RE5; port d’armes gaucher à conserver avec sprites séparés pour les deux orientations, sans miroir automatique des accessoires. | en_attente |
| Sherry Birkin | Resident Evil 6 (2012) | Tenue agent RE6 choisie et verrouillée pour ce lot; pas de costume enfant ni de métamorphose visible inventée. | en_attente |
| Jake Muller | Resident Evil 6 (2012) | Tenue mercenaire RE6 verrouillée; aucune ressemblance imposée au costume de Wesker. | en_attente |
| Helena Harper | Resident Evil 6 (2012) | Tenue de terrain RE6 à verrouiller; aucun costume de Claire malgré silhouette proche. | en_attente |
| Piers Nivans | Resident Evil 6 (2012) forme soldat avant mutation | Uniforme BSAA RE6 avant mutation. Le bras électrique est une incarnation distincte, absente de ce kit et de ses finishers. | en_attente |
| Billy Coen | Resident Evil 0 (2002, modèle HD de référence à verrouiller) | Débardeur sombre et pantalon RE0; tatouage et bras non inversés par miroir automatique. | en_attente |
| Albert Wesker | Resident Evil 5 (2009) forme humaine avant Uroboros | Tenue noire RE5 avant mutation; aucune masse Uroboros dans ce kit. Lunettes peuvent tomber comme effet cosmétique sans changer les hitboxes. | en_attente |
| Nemesis | Resident Evil 3 remake (2020) forme 1 avec lance-roquettes | Liens et sacs noirs, tube thoracique, visage RE3R et lance-roquettes. Le lance-flammes et les formes 2/3 restent des loadouts/incarnations distincts. | en_attente |
| Tyrant T103 | Resident Evil 2 remake (2019) T00 en manteau | Trench sombre, bottes, gants et chapeau RE2R; pas de griffe Super Tyrant dans ce kit. Chapeau cosmétique seulement. | en_attente |
| William Birkin G1 | Resident Evil 2 remake (2019) première mutation G | Vêtements déchirés de la première mutation RE2 remake et tuyau métallique. Aucune patte, tête ou masse de G2 à G5 ajoutée. | en_attente |
| Jack Baker | Resident Evil 7 biohazard (2017) apparence humaine | Vêtements de Jack humain RE7 et pelle. Scie à ciseaux, forme du hangar et Swamp Man sont des incarnations distinctes. | en_attente |
| Alcina Dimitrescu | Resident Evil Village (2021) forme humaine | Robe crème, grand chapeau noir, gants et griffes extensibles. Ni ailes ni transformation en nuée, qui ne correspondent pas à cette forme. | en_attente |
| Karl Heisenberg | Resident Evil Village (2021) forme humaine | Manteau et accessoires de Village; mains humaines. La machine mutante géante reste un boss séparé. | en_attente |
| Jack Krauser | Resident Evil 4 remake (2023) forme initiale humaine | Tenue de l’île RE4 remake avant mutation. Bras-lame et bras-bouclier seront une incarnation distincte; absents même des supers de ce lot. | en_attente |
| Alexia Ashford | Resident Evil CODE Veronica X (2001) première forme humanoïde | Référence CODE Veronica X uniquement. Le catalogue recv-alexia en version 2000 ne doit pas être substitué sans comparaison visuelle documentée. | en_attente |

### Quatre cibles V5 hors des lignes de refus

| ID | Cible | Édition | Référence / problème à résoudre | V21 |
| --- | --- | --- | --- | --- |
| chris_safari | Chris Redfield — Safari | Resident Evil 5 | Tenue Safari : référence visuelle officielle précise à réunir. | en_attente |
| parker_full_body | Parker Luciani — corps entier | Resident Evil Revelations, édition à verrouiller | Référence corporelle entière à établir ; ne pas déduire les parties cachées d’un portrait. | en_attente |
| luis_full_body | Luis Serra — corps entier | Resident Evil 4, édition à verrouiller | La fiche V1 vise RE4 remake ; la tenue et l’édition de la cible V5 restent à raccorder explicitement. | en_attente |
| jessica_edition | Jessica Sherawat — cohérence d’édition | Revelations : corps PC2013 / portrait 2017 | Conserver les deux éditions distinctes jusqu’à résolution de leur correspondance. | en_attente |

## Projectiles et VFX : familles à rapprocher de l’existant

Les familles servent à éviter les doublons. Un projectile peut demander plusieurs fichiers : objet en vol, traînée, impact, explosion et frames. Les 16 familles ne sont donc pas une promesse de 16 images suffisantes. Les effets et timings des actions V1 sont ceux de l’adaptation 2D.

| Famille | Contenu | Actions liées | V21 |
| --- | --- | --- | --- |
| Balles et effets de tir | Balles, départs de tir, impacts et variantes de visée ; modèle exact de l’arme à vérifier. | 18 | en_attente |
| Décharges de fusil | Décharge à cône court, flash et impact ; ne pas ajouter un faisceau magique. | 4 | en_attente |
| Grenades à explosion | Objet lancé, trajectoire, impact et explosion ; références d’édition requises. | 4 | en_attente |
| Grenades incendiaires | Projectile et feu au sol ; séparer objet en vol et effet. | 1 | en_attente |
| Projectile électrique de simulation | Dispositif lent défini par la conception 2D ; ne pas l’attribuer comme tel au jeu source. | 1 | en_attente |
| Bouteilles incendiaires | Objet complet, mèche et flamme ; séparer les états de vol et d’impact. | 1 | en_attente |
| Éclat local de lampe | Effet stylisé de la simulation ; pas d’aveuglement plein écran. | 1 | en_attente |
| Grappin et câble | Tête du grappin et câble pour rapprochement/repli ; pièces séparées si le moteur l’exige. | 2 | en_attente |
| Carreau explosif | Carreau d’arbalète et explosion différée. | 1 | en_attente |
| Électricité de contact | Électricité du bâton, charge et impact local ; aucune attaque électrique ajoutée à Piers humain. | 2 | en_attente |
| Roquette | Roquette entière, flamme, fumée et explosion ; forme et édition exactes à verrouiller. | 1 | en_attente |
| Ferraille projetée | Fragment métallique entier ; état de vol distinct de l’attaque du personnage. | 1 | en_attente |
| Champ magnétique local | Effet local de simulation ; pas de saisie forcée des armes. | 1 | en_attente |
| Mine de fer de simulation | Fragment au sol et éclatement ; adaptation de combat, pas objet canonique certifié. | 1 | en_attente |
| Flèche explosive | Flèche d’arc et explosion ; distincte du carreau d’arbalète. | 1 | en_attente |
| Feu réactif d’Alexia | Projection, trace au sol, montée locale et éclosion : quatre formes d’effet dans une même famille. | 4 | en_attente |

### Détail des 44 actions standard

Chaque action standard conserve son ID EX associé dans le JSON et le classeur. Une variante EX n’impose pas automatiquement un deuxième objet graphique.

| ID action | Personnage | Action | Famille | V21 |
| --- | --- | --- | --- | --- |
| REC_JILL_RE3R__SP1 | Jill Valentine | Tir de survie | Balles et effets de tir | en_attente |
| REC_JILL_RE3R__SP4 | Jill Valentine | Coup de fusil rapproché | Décharges de fusil | en_attente |
| REC_JILL_RE3R__SP5 | Jill Valentine | Charge de grenade | Grenades à explosion | en_attente |
| REC_CHRIS_RE5__SP1 | Chris Redfield | Rafale contrôlée | Balles et effets de tir | en_attente |
| REC_CHRIS_RE5__SP4 | Chris Redfield | Grenade au sol | Grenades à explosion | en_attente |
| REC_LEON_RE4R__SP1 | Leon S Kennedy | Tir de service | Balles et effets de tir | en_attente |
| REC_LEON_RE4R__SP5 | Leon S Kennedy | Tir à canon court | Décharges de fusil | en_attente |
| REC_CLAIRE_RE2R__SP1 | Claire Redfield | Revolver prudent | Balles et effets de tir | en_attente |
| REC_CLAIRE_RE2R__SP2 | Claire Redfield | Grenade incendiaire | Grenades incendiaires | en_attente |
| REC_CLAIRE_RE2R__SP5 | Claire Redfield | Charge électrique | Projectile électrique de simulation | en_attente |
| REC_REBECCA_RE0__SP1 | Rebecca Chambers | Tir mesuré | Balles et effets de tir | en_attente |
| REC_REBECCA_RE0__SP2 | Rebecca Chambers | Bouteille de flamme | Bouteilles incendiaires | en_attente |
| REC_BARRY_REV2__SP1 | Barry Burton | Magnum de garde | Balles et effets de tir | en_attente |
| REC_BARRY_REV2__SP3 | Barry Burton | Lampe de contrôle | Éclat local de lampe | en_attente |
| REC_BARRY_REV2__SP5 | Barry Burton | Salve de couverture | Balles et effets de tir | en_attente |
| REC_ADA_RE4R__SP1 | Ada Wong | Tir de couverture | Balles et effets de tir | en_attente |
| REC_ADA_RE4R__SP2 | Ada Wong | Grappin de rapprochement | Grappin et câble | en_attente |
| REC_ADA_RE4R__SP3 | Ada Wong | Grappin de repli | Grappin et câble | en_attente |
| REC_ADA_RE4R__SP5 | Ada Wong | Arbalète explosive | Carreau explosif | en_attente |
| REC_HUNK_RE2R__SP1 | HUNK | Rafale USS | Balles et effets de tir | en_attente |
| REC_HUNK_RE2R__SP5 | HUNK | Grenade de rupture | Grenades à explosion | en_attente |
| REC_CARLOS_RE3R__SP1 | Carlos Oliveira | Rafale UBCS | Balles et effets de tir | en_attente |
| REC_CARLOS_RE3R__SP5 | Carlos Oliveira | Grenade de couverture | Grenades à explosion | en_attente |
| REC_SHEVA_RE5__SP1 | Sheva Alomar | Tir précis | Balles et effets de tir | en_attente |
| REC_SHEVA_RE5__SP5 | Sheva Alomar | Tir de précision lourd | Balles et effets de tir | en_attente |
| REC_SHERRY_RE6__SP1 | Sherry Birkin | Tir compact | Balles et effets de tir | en_attente |
| REC_SHERRY_RE6__SP2 | Sherry Birkin | Bâton électrique | Électricité de contact | en_attente |
| REC_SHERRY_RE6__SP5 | Sherry Birkin | Impulsion tenue | Électricité de contact | en_attente |
| REC_HELENA_RE6__SP1 | Helena Harper | Tir de service | Balles et effets de tir | en_attente |
| REC_HELENA_RE6__SP2 | Helena Harper | Hydra rapproché | Décharges de fusil | en_attente |
| REC_PIERS_RE6__SP1 | Piers Nivans | Tir de soutien | Balles et effets de tir | en_attente |
| REC_PIERS_RE6__SP2 | Piers Nivans | Visée stabilisée | Balles et effets de tir | en_attente |
| REC_BILLY_RE0__SP1 | Billy Coen | Tir de fuite | Balles et effets de tir | en_attente |
| REC_BILLY_RE0__SP5 | Billy Coen | Tir de fusil | Décharges de fusil | en_attente |
| REC_WESKER_RE5__SP4 | Albert Wesker | Tir calculé | Balles et effets de tir | en_attente |
| REC_NEMESIS_RE3R__SP1 | Nemesis | Roquette de poursuite | Roquette | en_attente |
| REC_HEISENBERG_RE8__SP1 | Karl Heisenberg | Ferraille projetée | Ferraille projetée | en_attente |
| REC_HEISENBERG_RE8__SP2 | Karl Heisenberg | Attraction bornée | Champ magnétique local | en_attente |
| REC_HEISENBERG_RE8__SP5 | Karl Heisenberg | Mine de fer | Mine de fer de simulation | en_attente |
| REC_KRAUSER_RE4R__SP4 | Jack Krauser | Arc explosif | Flèche explosive | en_attente |
| REC_ALEXIA_CVX__SP1 | Alexia Ashford | Flamme sanguine | Feu réactif d’Alexia | en_attente |
| REC_ALEXIA_CVX__SP2 | Alexia Ashford | Trace brûlante | Feu réactif d’Alexia | en_attente |
| REC_ALEXIA_CVX__SP3 | Alexia Ashford | Flamme ascendante | Feu réactif d’Alexia | en_attente |
| REC_ALEXIA_CVX__SP5 | Alexia Ashford | Éclosion de feu | Feu réactif d’Alexia | en_attente |

## Présent annoncé non récupéré

Ces lots restent distincts des absences confirmées. Leur quantité rapportée ne doit pas être ajoutée aux 142 PNG présents dans les archives consultées.

| Lot | Fichier / contenu | Quantité annoncée | État | V21 |
| --- | --- | --- | --- | --- |
| V3 | Resident_Evil_Combat_Generation_V3.zip | 54 candidats dans le suivi V5 ; archive 121 392 052 octets | Archive complète non disponible selon le suivi V5 ; ne pas compter ses médias comme de nouveaux manquants sans récupération et comparaison. | en_attente |
| V4 | Resident_Evil_Combat_Generation_V4.zip | 34 PNG annoncés : 30 candidats et 4 essais | Archive complète non disponible selon le suivi V5 ; les compteurs historiques ne prouvent pas sa présence dans la PR actuelle. | en_attente |
| V12/V13 | PNG annoncés V12/V13 | 44 PNG annoncés | Exclus du corpus V18 publié ; aucune récupération nouvelle démontrée par cet inventaire. | en_attente |
| V19 | PNG annoncés V19 | 9 PNG annoncés : 7 candidats et 2 essais | Lepotitsa, Shrieker, Zombie Dog C et Ubistvo ; non retrouvés et non publiés. Historique de refus d’Ubistvo conservé. | en_attente |

## Références : points de vigilance du suivi V1

- **REC_HUNK_RE2R** : Le titre cible HUNK. Vérifier les rendus et leur édition exacte avant usage. [Référence inscrite](https://game.capcom.com/residentevil/en/umbrella-20231108180000.html). L’image source n’est pas requalifiée par cet inventaire.
- **REC_ALEXIA_CVX** : Entrée encyclopédique Alexia T-Veronica. Ne prouve pas que toutes les vues sont CVX 2001. [Référence inscrite](https://game.capcom.com/residentevil/en/exfile-1-41.html). L’image source n’est pas requalifiée par cet inventaire.
- **RES_VALERIE_HARMON, RES_JANUARY_VAN_SANT, RES_TYRONE_HENRY, RES_SAMUEL_JORDAN, RES_MARTIN_SANDWICH, RES_BECCA_WOOLLETT** : Page officielle des survivants Resistance. Utile pour identité/rôle ; vue de production à relever. [Référence inscrite](https://game.capcom.com/manual/resistance/fr/ps4/page/2/3). L’image source n’est pas requalifiée par cet inventaire.
- **REC_REBECCA_RE0, REC_BILLY_RE0** : Captures/trailer du remaster RE0. Plus ciblé que la page histoire générale. [Référence inscrite](https://news.capcomusa.com/gregaman/blog/2015/06/08/new-resident-evil-0-trailer-and-screens-are-eerie-pretty). L’image source n’est pas requalifiée par cet inventaire.
- **REC_ADA_RE4R** : Annonce Separate Ways. Images/identité d’Ada à vérifier ; le lien ne garantit pas tous les accessoires du modèle. [Référence inscrite](https://blog.playstation.com/?p=384231). L’image source n’est pas requalifiée par cet inventaire.
- **REC_ALCINA_RE8, REC_HEISENBERG_RE8** : Mercenaries Additional Orders ; référence de formes humaines et capacités à contrôler. [Référence inscrite](https://blog.playstation.com/2022/07/21/new-re-village-the-mercenaries-additional-orders-details-revealed/). L’image source n’est pas requalifiée par cet inventaire.
- **REC_CHRIS_RE5, REC_SHEVA_RE5, REC_WESKER_RE5** : Le titre source est Wesker Uroboros. Ne sert pas de référence de costume pour Chris/Sheva ni automatiquement pour Wesker humain. [Référence inscrite](https://game.capcom.com/residentevil/uk/exfile-1-43.html). L’image source n’est pas requalifiée par cet inventaire.
- **REC_BIRKIN_G1_RE2R** : Le titre source est HUNK. Référence directe G1 RE2R encore à rechercher. [Référence inscrite](https://game.capcom.com/residentevil/en/umbrella-20231108180000.html). L’image source n’est pas requalifiée par cet inventaire.

## Sources et versions inspectées

- **S01 — [Catalogue actuel des arènes](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/ba5936bda1571b9880785878783f00ef44d279f7/data/arenas.json)**. 52 entrées ; 36 entrées raster utilisent 9 bitmaps ; 16 décors procéduraux sans bitmap.
- **S02 — [Inventaire V18 des 346 UID](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/ba5936bda1571b9880785878783f00ef44d279f7/production-archives/rec-media/CONTINUATION_V18_20261120.json)**. Statuts historiques conservés. Quatre entrées SOURCE_HOLD reçoivent une observation complémentaire V20.
- **S03 — [Manifeste V20](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/dac43f0e48d55eb754436b610e3fa3f34298baee/production-archives/rec-media/v20/ASSET_MANIFEST_V20_20261121.json)**. 9 PNG : 6 candidats statiques et 3 essais, pour quatre UID. Aucune admission moteur ni animation complète.
- **S04 — [Suivi V5](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/ba5936bda1571b9880785878783f00ef44d279f7/production-archives/rec-media/v5/data/production_status_v5.json)**. Cibles de tenues/incarnations, refus V5, état des archives V3/V4 et candidats du stage Reaper.
- **S05 — [Bilan V18](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/ba5936bda1571b9880785878783f00ef44d279f7/production-archives/rec-media/CONTINUATION_V18_20261120.md)**. 133 PNG archivés V5–V18 ; V12/V13 annoncés mais non récupérés.
- **S06 — [Récupération V19](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/dac43f0e48d55eb754436b610e3fa3f34298baee/production-archives/rec-media/v19/RECOVERY_V19_20261121.md)**. 9 PNG annoncés mais non retrouvés et non publiés ; ne pas les additionner au corpus présent.
- **S07 — [Contrat portraits et poses R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/ba5936bda1571b9880785878783f00ef44d279f7/docs/R34_ASSET_PIPELINE.md)**. Une pose fixe n’est pas une animation. Règles de provenance, conservation des refus, édition et revue visuelle.
- **S08 — [Limites de fidélité R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/ba5936bda1571b9880785878783f00ef44d279f7/docs/FIDELITE_R34.md)**. Statut de fidélité et périmètres d’admission hérités du moteur.
- **S09 — [Effets de combat existants](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/ba5936bda1571b9880785878783f00ef44d279f7/src/combat-cues-r6.js)**. Présentation et indices procéduraux ; ne constitue pas un manifeste exhaustif de PNG de projectiles.
- **S10 — Suivi de production V1** : `Resident_Evil_Combat_Production_v1.xlsx`, SHA-256 `c62ed344996dcc82457cf40108992a7c8365b76efe3eae1bc5f04649ffa6ec3d`. Classeur du 19 novembre 2026 fourni au projet, relu sans modification : fiches, costumes de base et actions prévues. Aucun manque actuel n’est déduit de sa seule présence.

## Limites conservées

- Les 346 UID sont le catalogue suivi, pas 346 personnages distincts achevés. Les 43 exercices contextuels restent hors de ce total.
- Les 24 fiches prioritaires et les 60 extensions V1 peuvent recouper les 346 UID ; ne pas les additionner.
- Le recensement complet de tous les costumes officiels de la franchise n’est pas établi.
- Les 44 actions VFX définissent des besoins de simulation. Les 16 familles servent au dédoublonnage ; elles ne sont pas 16 images manquantes certifiées.
- Le total de 142 PNG avant V21 réunit 133 PNG archivés sur main et 9 PNG V20 dans la PR. Il inclut 103 candidats et 39 essais, pas autant de combattants.
- Aucune nouvelle certification 1:1, animation complète ou intégration moteur n’est déclarée par cet inventaire.
- Les URLs GitHub sont fixées aux commits inspectés, antérieurs à V21. Le classeur V1 est identifié par son nom et son SHA-256.
