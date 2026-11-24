# Audit des décors V22 — 24 novembre 2026

## Résultat

36 identités runtime partageaient 9 bitmaps inspectés. Cette passe produit 18 nouveaux candidats et conserve les 2 essais précédant la correction du réservoir Moreau. Les 5 spécifications sans runtime produites par le lot séparé portent le total à 23 nouveaux candidats de scène. Aucun master n’est intégré au moteur, animé, séparé en six couches ou certifié 1:1.

Les 15 mappings RE5 V21, le Reaper V5 (4 PNG) et ShipDeck6-1 restent conservés. Les 21 masters V3/V4 annoncés n’ont pas été récupérés : aucune absence historique totale n’est certifiée. Les arbres assets/ et production-archives/ sont complets au head inspecté 29b004d3 ; l’arbre récursif du dépôt entier n’a pas pu être obtenu.

## Décision pour chacune des 36 cibles

| ID runtime | Décision | Candidat V22 / motif |
|---|---|---|
| spencer_hall | candidate_produced | REC_STAGE_RE1HD_SPENCER_MAIN_HALL_MASTER_V22_01 |
| spencer_lab | SOURCE_HOLD | Le bitmap NEST générique est impropre à Arklay HD. La spécification V1 associe puits technique, cuves et passerelle sans identifier une salle : Tyrant Room et salles techniques sont distinctes. Aucune vue précise de cette combinaison n’a été qualifiée ; maintien du besoin dédié sans inventer un laboratoire canonique composite. |
| rpd_hall | ARCHIVE_RECOVERY_HOLD | Le suivi V5 atteste un ancien master RPD avec aperçu borné ; archive V3/V4 non récupérée. Ne pas régénérer comme prétendue absence. Couverture caméra restant à qualifier. |
| raccoon_street | SOURCE_HOLD | raccoon.png est un master de rue original déjà présent. V1 cible RE3 Remake 2020 mais ne désigne ni Business Street, ni Redstone Street, ni le tronçon Kendo ; ces vues ont des repères différents. Une absence de bitmap n’est donc pas établie et un remplacement 1:1 ne peut être rattaché sans choisir le tronçon. |
| clock_tower | SOURCE_HOLD | Le catalogue porte seulement RE3 et BEFFROI SAINT-MICHAEL. L’intérieur1999 n’est pas la place extérieure 2020, dont un master V22 distinct est produit. Le bitmap rue partagé ne tranche pas ce choix ; aucun intérieur de remake ou mélange d’éditions n’a été inventé. |
| nest | ARCHIVE_RECOVERY_HOLD | Le suivi V5 atteste un master NEST existant avec calques non alignés ; archive V3/V4 non récupérée. Ne pas régénérer comme absence établie. |
| dead_factory | SOURCE_HOLD | USINE DE TRAITEMENT/RE3 ne précise ni édition ni salle. Dead Factory 1999 et NEST2 2020 sont différents ; la nouvelle paroi Weapon Test 2020 ne ferme pas cette entrée. Le master factory.png existant représente une fonderie originale et n’établit pas la salle exacte demandée. |
| rockfort | SOURCE_HOLD | V1 demande la cour de prison CODE:Veronica X, avec miradors, portails et grillages. Les résultats visuels actuels remontent aussi la nouvelle annonce Resident Evil Veronica 2026, exclue de cette cible. Les guides consultés identifient la cour de rencontre Steve, mais aucune capture locale de cette cour dans CODE:Veronica X n’a été qualifiée. Pas de conversion d’une capture d’une autre édition. |
| antarctic | SOURCE_HOLD | La spécification V1 combine hangar, glace, portes et escaliers. La base CODE:Veronica comporte Hangar, Cargo Room, Package Sorting Room et héliport distincts. Le runtime ne désigne pas lequel ; aucune capture large d’un hangar précis n’a été qualifiée. nest.png partagé reste un substitut non fidèle, sans preuve d’absence historique totale. |
| village_square | candidate_produced | REC_STAGE_RE4R_VILLAGE_SQUARE_MASTER_V22_01 |
| salazar_castle | candidate_produced | REC_STAGE_RE4R_GRAND_HALL_MASTER_V22_01 |
| kijuju | EXISTING_V21_CANDIDATE_REUSE_REVIEW | Public Assembly chapitre 1-1 existe déjà dans V21. Kijuju/V1 est plus large ; un raccord de ce candidat au quartier urbain est proposé sans nouveau PNG. Aucune couverture 1:1 de tous les quartiers de Kijuju n’est revendiquée. |
| queen_zenobia | ARCHIVE_RECOVERY_HOLD | Le suivi V5 atteste un master Queen Zenobia existant dont la caméra est trop basse et la piste horizontale non démontrée ; archive non récupérée. Pas de régénération comme absence. |
| edonia | SOURCE_HOLD | ZONE D’OPÉRATION RE6 ne désigne pas un lieu unique. Le parcours Chris 2 distingue la rue du premier Ogroman, le pont, le triage et la place devant l’hôtel de ville ; la géométrie et les repères diffèrent. L’image de rue Raccoon est partagée, mais aucun de ces secteurs n’a été imposé silencieusement comme la cible exacte. |
| baker_house | candidate_produced | REC_STAGE_RE7_MAIN_HALL_MASTER_V22_01 |
| dimitrescu | candidate_produced | REC_STAGE_VILLAGE_DIMITRESCU_MAIN_HALL_MASTER_V22_01 |
| heisenberg | SOURCE_HOLD | La manufacture Village est un ensemble de salles. V1 demande presses, cuves, passerelles et plateforme sans salle précise ; Foundry/Casting Machine, les puits industriels et la zone Sturm ne sont pas interchangeables. Le master de fonderie factory.png existe. La cour extérieure du boss possède un nouveau master séparé et ne clôt pas l’intérieur. |
| ark | SOURCE_HOLD | Le runtime nomme bien REQUIEM et ARK. Les sources 2026 consultées documentent plusieurs Bioweapon Repositories/Silos et salles de contrôle ; le libellé SECTEUR DE CONFINEMENT ne choisit ni numéro, ni étage, ni parcours Leon/Grace. Aucune capture d’une salle unique correspondante n’a été qualifiée. ARK n’est ni déclaré fictif ni substitué par NEST. |
| nest_escape_2019 | candidate_produced | REC_STAGE_RE2R_NEST_ESCAPE_LIFT_MASTER_V22_01 |
| clock_tower_plaza_2020 | candidate_produced | REC_STAGE_RE3R_CLOCK_TOWER_PLAZA_MASTER_V22_01 |
| nest2_weapon_test_2020 | candidate_produced | REC_STAGE_RE3R_NEST2_WEAPON_TEST_MASTER_V22_01 |
| village_lake_2023 | SOURCE_HOLD | Del Lago chapitre 3 se combat sur un bateau tracté au milieu du lac. Une piste horizontale fixe exigerait choisir un bateau adapté, une rive ou un ponton absent du combat original. La scène de salle à manger zenobia.png est inadéquate, mais aucun sol canonique de duel terrestre n’a été inventé. |
| castle_dungeon_2023 | candidate_produced | REC_STAGE_RE4R_GARRADOR_DUNGEON_MASTER_V22_01 |
| specimen_storage_2023 | candidate_produced | REC_STAGE_RE4R_SPECIMEN_STORAGE_MASTER_V22_01 |
| ancient_chantry_2023 | candidate_produced | REC_STAGE_RE4R_ANCIENT_CHANTRY_MASTER_V22_01 |
| island_docks_2023 | candidate_produced | REC_STAGE_RE4R_LOADING_DOCKS_MASTER_V22_01 |
| dimitrescu_battlements_2021 | SOURCE_HOLD | Tour of Worship identifié. Les captures inspectées montrent surtout boss, contre-plongées, escaliers et gros plans de parapet ; elles établissent les matériaux mais pas une portion horizontale continue et ses accès. Le plan EvilResource est un schéma, pas un rendu. Aucune galerie intérieure ou toiture d’un autre segment n’a été substituée. |
| moreau_reservoir_2021 | candidate_produced | REC_STAGE_VILLAGE_MOREAU_RESERVOIR_MASTER_V22_03 |
| heisenberg_yard_2021 | candidate_produced | REC_STAGE_VILLAGE_HEISENBERG_YARD_MASTER_V22_01 |
| edonia_crash_2012 | SOURCE_HOLD | Le runtime combine Edonia, neige et duel Apex. Le crash des Chinook mène aux montagnes enneigées de Jake 2 ; le combat Ustanak appelé Airplane Crash Site appartient au croisement Jake 4/Leon 4 à Lanshiang. Ces scènes ne doivent pas être fusionnées. Les captures ciblées du site enneigé n’ont pas été qualifiées ; la bonne séquence doit être fixée. |
| guest_house_attic_2017 | candidate_produced | REC_STAGE_RE7_GUEST_HOUSE_ATTIC_MASTER_V22_01 |
| baker_garage_2017 | candidate_produced | REC_STAGE_RE7_BAKER_GARAGE_MASTER_V22_01 |
| processing_area_morgue_2017 | candidate_produced | REC_STAGE_RE7_PROCESSING_MORGUE_MASTER_V22_01 |
| old_house_lantern_2017 | SOURCE_HOLD | GALERIE DE LA LANTERNE ne correspond pas sans ambiguïté à une salle canonique : la Gallery 1F contient le projecteur, la balance à lanternes est dans l’Altar 2F, et le boss Marguerite est dans la Greenhouse. Les guides et images consultés ne justifient pas de fusionner ces trois pièces ; aucune serre n’a été produite à la place de cette entrée. |
| testing_area_2017 | candidate_produced | REC_STAGE_RE7_TESTING_CORRIDOR_MASTER_V22_01 |
| eveline_corridor_2017 | SOURCE_HOLD | Le catalogue demande MAISON PRINCIPALE · CORRIDOR D’HALLUCINATION, tandis que la séquence finale Eveline retourne à la Guest House. La référence inspectée ch08-2 est un gros plan d’Eveline âgée dans le grenier, pas un corridor de Main House. La localisation et la phase doivent être réconciliées avant nouveau master. |

## Besoins restant à qualifier

Les 14 SOURCE_HOLD ci-dessous restent ouverts et ne sont pas comptés comme candidats générés.

### spencer_lab

Le bitmap NEST générique est impropre à Arklay HD. La spécification V1 associe puits technique, cuves et passerelle sans identifier une salle : Tyrant Room et salles techniques sont distinctes. Aucune vue précise de cette combinaison n’a été qualifiée ; maintien du besoin dédié sans inventer un laboratoire canonique composite.

Édition / séquence : Resident Evil HD Remaster (2015) ; Laboratoire Arklay — salle à déterminer.

Preuve attendue : Nom exact de la salle et captures concordantes de la cuve, des accès et du sol.

Sources consultées : [adventuregamers.com](https://adventuregamers.com/walkthroughs/resident-evil-hd-remaster); [residentevilcostumeresource.blogspot.com](https://residentevilcostumeresource.blogspot.com/2015/02/resident-evil-hd-remaster-every-nook.html?m=0).

### raccoon_street

raccoon.png est un master de rue original déjà présent. V1 cible RE3 Remake 2020 mais ne désigne ni Business Street, ni Redstone Street, ni le tronçon Kendo ; ces vues ont des repères différents. Une absence de bitmap n’est donc pas établie et un remplacement 1:1 ne peut être rattaché sans choisir le tronçon.

Édition / séquence : Resident Evil 3 Remake (2020) ; Downtown — tronçon non fixé.

Preuve attendue : Tronçon de rue de référence et état chronologique, puis captures de façade et chaussée.

Sources consultées : [www.powerpyx.com](https://www.powerpyx.com/resident-evil-3-remake-walkthrough/); [www.evilresource.com](https://www.evilresource.com/resident-evil-3-remake/maps/downtown/downtown/business-street).

### clock_tower

Le catalogue porte seulement RE3 et BEFFROI SAINT-MICHAEL. L’intérieur1999 n’est pas la place extérieure 2020, dont un master V22 distinct est produit. Le bitmap rue partagé ne tranche pas ce choix ; aucun intérieur de remake ou mélange d’éditions n’a été inventé.

Édition / séquence : RE3 — édition non fixée dans le runtime ; Beffroi Saint-Michael — intérieur ou extérieur à préciser.

Preuve attendue : Édition 1999/2020 et salle du beffroi confirmées ; ne pas recompter clock_tower_plaza_2020.

Sources consultées : [residentevil.fandom.com](https://residentevil.fandom.com/wiki/Saint_Michael_Clock_Tower); [www.gamerevolution.com](https://www.gamerevolution.com/guides/642180-resident-evil-3-remake-cut-locations-clock-tower-park-dead-factory).

### dead_factory

USINE DE TRAITEMENT/RE3 ne précise ni édition ni salle. Dead Factory 1999 et NEST2 2020 sont différents ; la nouvelle paroi Weapon Test 2020 ne ferme pas cette entrée. Le master factory.png existant représente une fonderie originale et n’établit pas la salle exacte demandée.

Édition / séquence : RE3 — édition non fixée dans le runtime ; Usine de traitement — salle à confirmer.

Preuve attendue : Édition et salle précise (traitement, contrôle ou canon final), puis captures.

Sources consultées : [www.gamerevolution.com](https://www.gamerevolution.com/guides/642180-resident-evil-3-remake-cut-locations-clock-tower-park-dead-factory); [www.gamespot.com](https://www.gamespot.com/articles/resident-evil-3-remake-walkthrough-nest-2-guide/1100-6475409/).

### rockfort

V1 demande la cour de prison CODE:Veronica X, avec miradors, portails et grillages. Les résultats visuels actuels remontent aussi la nouvelle annonce Resident Evil Veronica 2026, exclue de cette cible. Les guides consultés identifient la cour de rencontre Steve, mais aucune capture locale de cette cour dans CODE:Veronica X n’a été qualifiée. Pas de conversion d’une capture d’une autre édition.

Édition / séquence : Resident Evil CODE:Veronica X (2001) ; Rockfort — cour de la prison, rencontre Steve.

Preuve attendue : Capture in-game CODE:Veronica X de la cour et des miradors, avec plateforme/édition attestée.

Sources consultées : [www.supercheats.com](https://www.supercheats.com/playstation2/walkthroughs/residentevilcodeveronicax-walkthrough01.txt); [walkthrough.freeola.com](https://walkthrough.freeola.com/game/2888/ps2/resident-evil-code-veronica-x.html).

### antarctic

La spécification V1 combine hangar, glace, portes et escaliers. La base CODE:Veronica comporte Hangar, Cargo Room, Package Sorting Room et héliport distincts. Le runtime ne désigne pas lequel ; aucune capture large d’un hangar précis n’a été qualifiée. nest.png partagé reste un substitut non fidèle, sans preuve d’absence historique totale.

Édition / séquence : Resident Evil CODE:Veronica X (2001) ; Base antarctique — hangar/terminal exact non fixé.

Preuve attendue : Nom de salle, portion de terminal et vue des niveaux/accès dans CODE:Veronica X.

Sources consultées : [residentevil.fandom.com](https://residentevil.fandom.com/wiki/Antarctic_Base/Hangar); [residentevil.fandom.com](https://residentevil.fandom.com/wiki/Antarctic_Base/Package_sorting_room); [residentevil.fandom.com](https://residentevil.fandom.com/wiki/Cargo_room).

### edonia

ZONE D’OPÉRATION RE6 ne désigne pas un lieu unique. Le parcours Chris 2 distingue la rue du premier Ogroman, le pont, le triage et la place devant l’hôtel de ville ; la géométrie et les repères diffèrent. L’image de rue Raccoon est partagée, mais aucun de ces secteurs n’a été imposé silencieusement comme la cible exacte.

Édition / séquence : Resident Evil 6 (2012) ; Edonia — Chris 2/Jake 1, secteur non fixé.

Preuve attendue : Secteur exact et état de combat, par exemple rue Ogroman ou place de l’hôtel de ville, avec captures.

Sources consultées : [artemiop.com](https://artemiop.com/resident-evil-guide/en/re6/chapters/chris-2/); [www.evilresource.com](https://www.evilresource.com/resident-evil-6/enemies/ogroman).

### heisenberg

La manufacture Village est un ensemble de salles. V1 demande presses, cuves, passerelles et plateforme sans salle précise ; Foundry/Casting Machine, les puits industriels et la zone Sturm ne sont pas interchangeables. Le master de fonderie factory.png existe. La cour extérieure du boss possède un nouveau master séparé et ne clôt pas l’intérieur.

Édition / séquence : Resident Evil Village (2021) ; Usine de Heisenberg — salle intérieure non fixée.

Preuve attendue : Salle et étage de manufacture choisis, captures des machines et de la plateforme.

Sources consultées : [artemiop.com](https://artemiop.com/resident-evil-guide/en/re8/chapters/ch11/); [www.evilresource.com](https://www.evilresource.com/resident-evil-village/maps/heisenbergs-factory/heisenbergs-factory-mb4/foundry).

### ark

Le runtime nomme bien REQUIEM et ARK. Les sources 2026 consultées documentent plusieurs Bioweapon Repositories/Silos et salles de contrôle ; le libellé SECTEUR DE CONFINEMENT ne choisit ni numéro, ni étage, ni parcours Leon/Grace. Aucune capture d’une salle unique correspondante n’a été qualifiée. ARK n’est ni déclaré fictif ni substitué par NEST.

Édition / séquence : Resident Evil Requiem (2026) ; ARK — secteur de confinement précis non fixé.

Preuve attendue : Numéro de repository/silo, étage, séquence et capture de la salle cible.

Sources consultées : [www.powerpyx.com](https://www.powerpyx.com/resident-evil-requiem-ark-100-walkthrough/); [www.videogameschronicle.com](https://www.videogameschronicle.com/guide/resident-evil-9-requiem-walkthrough-ark-leon-grace/).

### village_lake_2023

Del Lago chapitre 3 se combat sur un bateau tracté au milieu du lac. Une piste horizontale fixe exigerait choisir un bateau adapté, une rive ou un ponton absent du combat original. La scène de salle à manger zenobia.png est inadéquate, mais aucun sol canonique de duel terrestre n’a été inventé.

Édition / séquence : Resident Evil 4 Remake (2023) ; Chapitre3 — combat Del Lago sur le lac.

Preuve attendue : Choix explicite du support de combat 2D, puis vue de référence concordante ; séparer fond lacustre et plateforme adaptée.

Sources consultées : [www.powerpyx.com](https://www.powerpyx.com/resident-evil-4-remake-chapter-3-walkthrough/); [gamewith.net](https://gamewith.net/resident-evil-4-remake/article/show/38448).

### dimitrescu_battlements_2021

Tour of Worship identifié. Les captures inspectées montrent surtout boss, contre-plongées, escaliers et gros plans de parapet ; elles établissent les matériaux mais pas une portion horizontale continue et ses accès. Le plan EvilResource est un schéma, pas un rendu. Aucune galerie intérieure ou toiture d’un autre segment n’a été substituée.

Édition / séquence : Resident Evil Village (2021) ; Tower of Worship — première phase du combat Lady Dimitrescu.

Preuve attendue : Capture large dégagée du balcon extérieur de première phase, sol et angles de la tour visibles.

Sources consultées : [www.gamepressure.com](https://www.gamepressure.com/resident-evil-village/tower-of-worship/zde699); [gamewith.net](https://gamewith.net/resident-evil-8/article/show/24389); [www.gamewatcher.com](https://www.gamewatcher.com/resident-evil-village-lady-dimitrescu-boss-fight); [www.evilresource.com](https://www.evilresource.com/resident-evil-village/maps/castle-dimitrescu/castle-dimitrescu-rf/tower-of-worship-battlements).

### edonia_crash_2012

Le runtime combine Edonia, neige et duel Apex. Le crash des Chinook mène aux montagnes enneigées de Jake 2 ; le combat Ustanak appelé Airplane Crash Site appartient au croisement Jake 4/Leon 4 à Lanshiang. Ces scènes ne doivent pas être fusionnées. Les captures ciblées du site enneigé n’ont pas été qualifiées ; la bonne séquence doit être fixée.

Édition / séquence : Resident Evil 6 (2012) ; Jake 2 montagne enneigée versus Jake 4/Leon 4 Airplane Crash Site.

Preuve attendue : Choix explicite du crash enneigé Edonia ou de l’arène Ustanak de Lanshiang, puis capture concordante.

Sources consultées : [artemiop.com](https://artemiop.com/resident-evil-guide/en/re6/chapters/jake-2/); [www.neoseeker.com](https://www.neoseeker.com/resident-evil-6/walkthrough/Chapter_2_-_Thrown_Out_Into_the_Cold); [www.gematsu.com](https://www.gematsu.com/2012/07/resident-evil-6-comic-con-gameplay-screenshots).

### old_house_lantern_2017

GALERIE DE LA LANTERNE ne correspond pas sans ambiguïté à une salle canonique : la Gallery 1F contient le projecteur, la balance à lanternes est dans l’Altar 2F, et le boss Marguerite est dans la Greenhouse. Les guides et images consultés ne justifient pas de fusionner ces trois pièces ; aucune serre n’a été produite à la place de cette entrée.

Édition / séquence : Resident Evil 7 biohazard (2017) ; Old House — Gallery 1F ou Altar 2F à confirmer.

Preuve attendue : Salle exacte visée par le libellé et capture large de la porte/balance ou de la galerie ; ne pas substituer la serre.

Sources consultées : [www.gamepressure.com](https://www.gamepressure.com/residentevil7/yard-and-the-old-house/z2960c); [www.evilresource.com](https://www.evilresource.com/resident-evil-7/items/lantern); [www.gamepressure.com](https://www.gamepressure.com/residentevil7/greenhouse/z5962d); [artemiop.com](https://artemiop.com/resident-evil-guide/en/re7/chapters/ch03/).

### eveline_corridor_2017

Le catalogue demande MAISON PRINCIPALE · CORRIDOR D’HALLUCINATION, tandis que la séquence finale Eveline retourne à la Guest House. La référence inspectée ch08-2 est un gros plan d’Eveline âgée dans le grenier, pas un corridor de Main House. La localisation et la phase doivent être réconciliées avant nouveau master.

Édition / séquence : Resident Evil 7 biohazard (2017) ; Finale Eveline — maison d’hôtes, versus libellé maison principale.

Preuve attendue : Bâtiment, étage et moment d’hallucination fixés, puis capture large du corridor correspondant.

Sources consultées : [artemiop.com](https://artemiop.com/resident-evil-guide/en/re7/chapters/ch08/).

## Spécifications V1 sans raccord initial

| Spécification | Résultat | Asset |
|---|---|---|
| STG_TRAIN | candidate_produced_in_stages_extra | REC_STAGE_RE0HD_ECLIPTIC_EXPRESS_MASTER_V22_01 |
| STG_RPD_SEWERS | candidate_produced_in_stages_extra | REC_STAGE_RE2R_SEWERS_VAULTED_GALLERY_MASTER_V22_01 |
| STG_MISSILE_DECK | preserved_v21_extra | REC_STAGE_RE5_SHIP_DECK_CH61_MASTER_V21_01 |
| STG_LAVA | preserved_v21_candidate | REC_STAGE_RE5_VOLCANO_FINAL_ISLAND_MASTER_V21_01 |
| STG_RE6_TALL_OAKS | candidate_produced_in_stages_extra | REC_STAGE_RE6_TALL_OAKS_CATHEDRAL_MASTER_V22_01 |
| STG_RE6_LANSHIANG | candidate_produced_in_stages_extra | REC_STAGE_RE6_LANSHIANG_STREET_MASTER_V22_01 |
| STG_SEJM_ISLAND | candidate_produced_in_stages_extra | REC_STAGE_REV2_DETENTION_CENTER_MASTER_V22_01 |

## Limites de livraison

Tous les PNG de ce lot sont des masters opaques natifs 1774×887. Les prompts, sources, dimensions, empreintes SHA256 et blobs Git vérifiés sont dans stages.json. Les captures tierces ne font pas partie de la livraison ; leurs URLs et empreintes servent à la traçabilité. Les essais Moreau 01/02 conservent des marques parasites et sont exclus de la couverture. Le candidat 03 corrigé seul est retenu.

Les scènes Canvas R14 du grenier, du garage et du couloir de test existaient déjà : les nouveaux PNG en sont des compléments de référence, pas de nouvelles animations.
