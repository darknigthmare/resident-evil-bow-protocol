# Resident Evil Combat — livraison V21

Production du **24 novembre 2026** sur la [PR #24](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/24), à partir du head antérieur à V21 `dac43f0e48d55eb754436b610e3fa3f34298baee`.

## Résultat livré

**29 PNG réels : 25 candidats statiques, 1 étude et 3 essais écartés.** 3 demandes ont été refusées par le générateur et n'ont aucun PNG livré. Les essais restent documentés avec leur correction ; ils ne comptent pas comme candidats acceptés.

Ces fichiers complètent les archives de revue. Aucun nouvel asset V21 n'est admis dans le moteur, animé ou certifié conforme 1:1. Les dimensions, les références consultées, les limites visuelles et les empreintes de chaque image sont dans le manifeste et les rapports.

- [Galerie filtrable](galerie.html) — ouvrir avec le dossier `assets` à côté.
- [Inventaire complet, lisible](inventory/INVENTAIRE_COMPLET_V21_20261124.md)
- [Classeur Excel filtrable](inventory/Resident_Evil_Combat_Inventaire_V21_20261124.xlsx)
- [Inventaire structuré](inventory/INVENTAIRE_COMPLET_V21_20261124.json)
- [Catalogue des costumes à réconcilier](inventory/costumes-officiels-auditer.md) — 38 variantes ciblées, dont 25 noms/éditions étayés par source primaire et 13 à confirmer ; aucun manque global déduit.
- [Manifeste des fichiers livrés](ASSET_MANIFEST_V21.json)
- [Contrôle d'intégrité](reports/INTEGRITY_V21.json)

## Personnages et costumes

| Incarnation exacte | Sorties candidates | État restant |
| --- | --- | --- |
| Chris Redfield — RE5, Safari | Une vue gauche et une vue droite | Proportions, accessoires, marges et continuité à valider ; aucune animation. |
| Parker Luciani — Revelations HD PC 2013, combinaison de mission | Une vue gauche et une vue droite | Visage et surfaces cachées interprétés ; aucune animation. |
| Luis Sera — RE4 original 2005 | Une vue droite | Vue gauche refusée par l'outil ; incarnation distincte de RE4 remake. |
| Jessica Sherawat — Revelations HD PC 2013, plongée | Une vue gauche, une vue droite corrigée et un portrait | Un essai droit inversait l'asymétrie de la tenue. Le désaccord avec le portrait historique 2017 reste à réconcilier. |

Les neuf PNG de ce groupe comprennent huit candidats et l'essai de Jessica. Les vues opposées ont été générées séparément. L'asymétrie anatomique de la tenue de Jessica a été contrôlée ; une image opposée ne constitue pas à elle seule une validation du modèle complet.

## Décors

**16 masters candidats**, dont **15 associés aux 16 arènes RE5 sans bitmap renseigné dans le catalogue runtime**. Le décor Reaper / convoyeurs possède déjà une composition et trois calques candidats en V5 : il n'a pas été régénéré. Le Ship Deck du chapitre 6-1 est un complément distinct du Bridge Deck d'Aheri au chapitre 6-2.

| Lieu généré | Édition / chapitre | Correspondance proposée | Fichier |
| --- | --- | --- | --- |
| Kijuju — Public Assembly | Resident Evil 5 (2009), chapitre 1-1 | `re5_060_executioner` | [PNG](assets/REC_STAGE_RE5_PUBLIC_ASSEMBLY_MASTER_V21_01.png) |
| Volcan — îlot final | Resident Evil 5 (2009), chapitre 6-3 | `re5_060_uroboros_albert_wesker` | [PNG](assets/REC_STAGE_RE5_VOLCANO_FINAL_ISLAND_MASTER_V21_01.png) |
| Ship Deck — campagne 6-1 | Resident Evil 5 (2009), chapitre 6-1 | Complément hors des 16 absences runtime | [PNG](assets/REC_STAGE_RE5_SHIP_DECK_CH61_MASTER_V21_01.png) |
| Monarch Room — combat Wesker/Jill | Resident Evil 5 (2009), chapitre 5-3 | `re5_060_jill_valentine_enemy` | [PNG](assets/REC_STAGE_RE5_MONARCH_ROOM_MASTER_V21_01.png) |
| Laboratoire — corridor Licker Beta | Resident Evil 5 (2009), chapitre 5-1 | `re5_060_licker_beta` | [PNG](assets/REC_STAGE_RE5_LICKER_LAB_CORRIDOR_MASTER_V21_01.png) |
| Tricell — chambre de test Uroboros Mkono | Resident Evil 5 (2009), chapitre 5-2 | `re5_060_uroboros_mkono` | [PNG](assets/REC_STAGE_RE5_MKONO_TEST_CHAMBER_MASTER_V21_01.png) |
| Kijuju — incinérateur | Resident Evil 5 (2009), chapitre 1-2 | `re5_060_uroboros` | [PNG](assets/REC_STAGE_RE5_KIJUJU_INCINERATOR_MASTER_V21_01.png) |
| Mine — plateau Popokarimu | Resident Evil 5 (2009), chapitre 2-2 | `re5_060_popokarimu` | [PNG](assets/REC_STAGE_RE5_POPOKARIMU_MINING_PLATEAU_MASTER_V21_01.png) |
| Bridge Deck — combat Uroboros Aheri | Resident Evil 5 (2009), chapitre 6-2 | `re5_060_uroboros_aheri` | [PNG](assets/REC_STAGE_RE5_AHERI_BRIDGE_DECK_MASTER_V21_01.png) |
| Avant-poste nocturne — rencontre Ndesu après la poursuite | Resident Evil 5 (2009), chapitre 2-3 | `re5_060_ndesu` | [PNG](assets/REC_STAGE_RE5_NDESU_NIGHT_OUTPOST_MASTER_V21_01.png) |
| Patrol Boat — pont du combat Irving | Resident Evil 5 (2009), chapitre 3-3 | `re5_060_irving` | [PNG](assets/REC_STAGE_RE5_IRVING_PATROL_BOAT_MASTER_V21_01.png) |
| Experimental Facility — plateforme circulaire U-8 | Resident Evil 5 (2009), chapitre 5-1 | `re5_060_u_8` | [PNG](assets/REC_STAGE_RE5_U8_EXPERIMENTAL_PLATFORM_MASTER_V21_01.png) |
| Dépôt — Shipping Area / conteneurs | Resident Evil 5 (2009), chapitre 2-1 | `re5_060_adjule` | [PNG](assets/REC_STAGE_RE5_CONTAINER_STORAGE_CH21_MASTER_V21_01.png) |
| Port — South Dock / entreposage | Resident Evil 5 (2009), chapitre 2-1 | `re5_060_big_man_majini` | [PNG](assets/REC_STAGE_RE5_PORT_SOUTH_DOCK_MASTER_V21_01.png) |
| Bidonville — Shanty Town / grille | Resident Evil 5 (2009), chapitre 2-1 | `re5_060_chainsaw_majini` | [PNG](assets/REC_STAGE_RE5_SHANTY_TOWN_GATE_MASTER_V21_01.png) |
| Navire — Ship Hold / cales | Resident Evil 5 (2009), chapitre 6-1 | `re5_060_gatling_gun_majini` | [PNG](assets/REC_STAGE_RE5_SHIP_HOLD_GATLING_MASTER_V21_01.png) |

Chaque master est une image native **1774 × 887**. Les six couches de parallaxe, les états animés, les collisions et l'import dans le moteur restent à produire ou valider. Le cadrage latéral, les distances et les zones cachées sont reconstruits : aucune reproduction géométrique 1:1 n'est certifiée. Pour Ndesu, transformer un combat depuis des tourelles en piste à pied constitue explicitement une adaptation. La scène d'Aheri avec du texte et le premier Shanty Town avec une grille mal placée ont été conservés comme essais ; leurs corrections sont distinctes.

## Projectiles

| Élément | Sortie | Qualification |
| --- | --- | --- |
| Grenade RE5 | Un PNG RGBA 1254 × 1254 | Candidat d'objet statique avec anneau ; aucune animation de vol ou d'explosion. |
| Roquette RE5 vers la droite | Un PNG RGBA 2172 × 724 | Étude seulement : partie arrière et effet de propulsion inférés d'une référence partielle. |
| Grenade incendiaire RE5 | Aucun PNG | Refus de l'outil, conservé dans le suivi. |
| Grenade flash RE5 | Aucun PNG | Refus de l'outil, conservé dans le suivi. |

Ces visuels RE5 ne valident pas automatiquement des projectiles d'autres jeux. Les 44 actions de la Bible V1 sont regroupées en 16 familles de travail ; ce sont des règles et besoins à rapprocher des références, pas 44 PNG manquants démontrés.

## Périmètre et travaux non clos

L'inventaire couvre 52 entrées de stages, 346 UID du catalogue suivi, 24 fiches de personnages V1, 60 propositions d'extension, 24 descriptions de tenues de base et les cibles V5. Ces populations se recoupent : aucun total global de personnages manquants ni pourcentage d'achèvement de la franchise n'est calculé.

- Les 16 champs bitmap des arènes RE5 restent vides dans le moteur tant que les candidats ne sont pas intégrés.
- Les 129 attentes de source du catalogue B.O.W. et ses 61 états de refus historiques sont conservés.
- Les costumes officiels supplémentaires sont recensés à part avec leur niveau de preuve. Une variante identifiée n'est pas automatiquement absente du projet.
- Les archives annoncées mais non récupérées, notamment V19 et les sorties V12/V13 non retrouvées, ne sont pas comptées comme de nouveaux fichiers livrés ou comme des absences certaines.
- Les surfaces masquées, les détails de visage, les proportions et certaines marges des sprites restent à revoir. La taille native principale est 1254 × 1254, sans agrandissement artificiel.

## Vérification et publication

Les PNG livrés décodent, leurs dimensions et empreintes SHA-256 correspondent aux rapports, et leurs SHA Git correspondent aux blobs publiés. Les sprites transparents possèdent un canal alpha utile. Les images sont copiées sans retouche depuis les sorties du générateur, une image par asset ou pose. Les bitmaps tiers utilisés comme références ne sont pas publiés dans ce lot.

Le contrôle de la galerie vérifie les liens locaux et la syntaxe JavaScript. Le rendu navigateur n'a pas pu être validé : Chromium était bloqué par les permissions de création de sockets de cet environnement. Ce contrôle n'équivaut pas à un test du jeu.

Au checkpoint V21, la garde R34 échoue sur le fichier préexistant `production-archives/rec-media/CI_CHECKPOINT2_20261120.json` ; voir le [relevé du checkpoint](reports/CHECKPOINT_PUBLICATION_V21.json). La PR reste en brouillon. L'état CI du dernier commit est à lire sur la PR ; aucun moteur, garde, workflow ni archive historique n'a été modifié pour contourner cet échec.
