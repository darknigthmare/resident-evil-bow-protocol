# Reprise V24 — Resident Evil Combat

État du 27 novembre 2026. Base : `246dbb81752c5fa41a55deb3aada3941ac966fec`, branche `chore/rec-media-v19-v20-20261121`, PR 24.

**23 PNG réels : 20 candidats et 3 essais remplacés conservés.** Aucun personnage complet, aucune animation complète, aucune admission moteur, aucune action V1 clôturée et aucune certification canonique 1:1. Les nouveaux états concernent deux incarnations humaines et trois UID de créatures déjà recensés. Les 23 SHA-256, SHA de blob Git et tailles correspondent aux quatre manifestes.

Le [suivi JSON](PROGRESS_V24.json) donne les fichiers, hashes, raccords exacts et critères de reprise. L’[inventaire V22](../v22/inventory/INVENTAIRE_COMPLET_V22_20261124.json) conserve le détail historique ; il n’est pas réécrit.

## Populations distinctes

| Domaine | Population de référence | Apport V24 / limite |
|---|---:|---|
| Décors | 52 entrées | 3 plaques candidates. Relevé V22 : 36 entrées avec bitmap, 16 sans bitmap, seulement 9 fichiers distincts réutilisés. Aucun remplacement moteur. |
| BOW | 346 UID | 6 clés pour 3 UID existants ; aucun nouveau UID. 105 `SOURCE_HOLD` et 4 `RECOVERY_HOLD` conservés. |
| Héros | 24 fiches de finition | 6 clés de menu pour 2 incarnations existantes. |
| Costumes | 38 variantes ciblées | Aucun nouveau costume V24. Les 28 candidats principaux V22 et les 4 de l’annexe FanDesign restent distincts. |
| Projectiles/VFX | 44 actions / 16 familles | 3 orientations partielles pour SP2 Rebecca et 2 orientations d’arsenal hors de ces actions ; zéro action/famille complète. |
| Extensions de roster | 60 propositions candidates | Aucune nouvelle identité confirmée ; distinctes des deux extensions documentaires de la bible. |
| Décors V1 | 24 spécifications | Non cumulables avec les 52 entrées de décors. |

**Aucun total global restant ni pourcentage d’achèvement.** Les unités se recoupent. Le groupe historique de 129 situations BOW a été détaillé par V22 en 15 candidats, 5 refus, 105 besoins de référence et 4 récupérations ; 129 n’est pas un compteur actuel de manquants.

## Livraison et raccords

| Lot | PNG | Candidats | Essais remplacés | Preuve |
|---|---:|---:|---:|---|
| Personnages | 6 | 6 | 0 | [Manifeste](characters/ASSET_MANIFEST_CHARACTERS_V24.json) |
| Créatures | 8 | 6 | 2 | [Manifeste](creatures/manifest.json) |
| Projectiles | 6 | 5 | 1 | [Manifeste](projectiles/ASSET_MANIFEST_PROJECTILES_V24.json) |
| Décors | 3 | 3 | 0 | [Manifeste](stages/manifest.json) |
| **V24** | **23** | **20** | **3** | [Fichiers et hashes](PROGRESS_V24.json) |

| Identifiant existant | Incarnation exacte | États candidats V24 |
|---|---|---|
| `REC_HELENA_RE6` | RE6 (2012), tenue Agent de l’art promotionnel Capcom de janvier 2012 ; modèle commercial final non certifié | `selected`, `confirm`, `deselect` |
| `REC_ADA_RE4R` | RE4 remake Separate Ways (2023), DEFAULT ; ne valide pas RE4 2005, Dress ou Undercover | `selected`, `confirm`, `deselect` |
| `re5-kipepeo` | RE5 (2009) | `hover_upstroke_key`, `hover_downstroke_key` |
| `re4r-novistador` | RE4 remake (2023) | `hover_downstroke_key`, `hover_upstroke_key` corrigée |
| `rerev2-giant-whip-spider` | Revelations 2 (2015) | `ready_low_key` nouvelle sortie, `forward_step_key` |

Les poses humaines sont des états de menu, pas des attaques SP, taunts, stances ou victoires. Les trois créatures possédaient déjà un candidat statique V22. Leur déclaration de portrait seul vient du relevé V22, sans nouvelle inspection du runtime dans cette consolidation.

Trois essais restent hors candidats : `rev2_giant_whip_spider_ready_v24` → `rev2_giant_whip_spider_ready_clean_v24` ; `re4r_novistador_wingbeat_up_v24` → `re4r_novistador_wingbeat_up_corrected_v24` ; `REC_OBJ_RE4R_BOLT_LEFT_V24` → `REC_OBJ_RE4R_BOLT_LEFT_CORRECTED_V24`.

| Objet / orientation | Raccord exact | Limite |
|---|---|---|
| Bouteille RE0 non allumée : `neck_up`, `neck_left`, `neck_lower_right` | `REC_REBECCA_RE0__SP2`, famille `OBJ_BOUTEILLE_INCENDIAIRE` | Catalogue 2002, plateforme du rendu non précisée ; trois clés partielles. Variante `REC_REBECCA_RE0__EX2` non achevée. |
| Carreau simple de Leon RE4R : `left` corrigé, `upper_right` | Aucun : `v1_actions: []` | Arsenal supplémentaire hors des 44 actions ; aucun remplacement des projectiles explosifs. |
| Blast Arrows Ada Separate Ways | `REC_ADA_RE4R__SP5`, `OBJ_CARREAU_EXPLOSIF` | Toujours `source_hold` ; corps et pointes entiers à qualifier. |
| Flèche EJF-338 Krauser RE4R humain | `REC_KRAUSER_RE4R__SP4`, `OBJ_FLECHE_EXPLOSIVE` | Toujours `source_hold` ; flèche entière à qualifier. |

| Décor catalogue | Spécification V1 | Périmètre V24 / preuve décisive manquante |
|---|---|---|
| `spencer_lab` | `STG_ARKLAY_LAB` | Tyrant Room, RE HD2015 : seconde vue des consoles et du sol occultés, largeur de duel et occlusions. |
| `raccoon_street` | `STG_RC_STREET` | Shopping Plaza / Moon’s Donuts, RE3R2020 : terrasse et mobilier occultés ; distinct de Business Street. |
| `village_lake_2023` | Aucun raccord établi | Del Lago, RE4R2023 PC : eau reconstruite et support aquatique/embarcation à définir ; aucun sol terrestre prouvé. |

Les trois plaques sont **RGB 1672 × 941**, aplaties, non UHD, sans calques parallaxe ni admission moteur. Les régions occultées ont été inférées.

## P0 — Qualifier les candidats

1. **Personnages :** comparer visage, doigts, équipement et chaussures d’Helena aux détails natifs ; corriger son regard `deselect`, opposé à la consigne. Les six fichiers échouent aux marges verticales demandées de 10 %. Fixer tailles/ancres et vérifier les contours composés ; préserver les asymétries sans miroir automatique.
2. **Créatures :** réunir des phases natives de la même édition pour articulations, membranes, pédipalpes et soies. Le Novistador corrigé a perdu ses crochets indus mais conserve du bruit rouge à faible alpha ; dimensions/échelle/pivots et raccord à la pose basse restent ouverts. Deux poses ne forment pas un cycle.
3. **Projectiles :** verrouiller plateforme RE0 et géométrie de la bouteille sous plusieurs angles, puis tailles et ancres. Aucun des six fichiers, essai compris, ne satisfait toutes les marges de 12 %. Les sept points extérieurs échantillonnés de la bouteille verticale sont à alpha 0 : RGB fantôme et faible alpha réel doivent être distingués en composition.
4. **Décors :** compléter les vues des parties cachées avant qualification géométrique ; établir couverture latérale, profondeur et support du combat, puis les couches séparées.

Revues : [personnages](reports/INDEPENDENT_CHARACTERS_V24.json), [projectiles](reports/INDEPENDENT_PROJECTILES_V24.json), [décors](reports/INDEPENDENT_STAGES_V24.json), [créatures — premier passage](reports/INDEPENDENT_CREATURES_V24.json) et [complément corrigé](reports/INDEPENDENT_CREATURES_CORRECTION_V24.json). Le premier rapport créatures décrit sept fichiers disponibles à cette étape ; le complément couvre le huitième. Le bilan final reste huit PNG, six candidats et deux essais, sans addition des deux passages.

## P1 — Sources et production suivante

| Cible maintenue en `SOURCE_HOLD`, sans PNG V24 | Preuve à obtenir |
|---|---|
| `heisenberg` — Foundry MB4 / Casting Machine, Village | Vue native large de machine, sol, paillasses et accès ; le gros plan 416 × 206 et la carte sont insuffisants. |
| `old_house_lantern_2017` — Altar 2F, mécanisme est, RE7 | Capture native de la balance et seconde vue de la même salle ; les captures étaient inaccessibles. Ne pas substituer Gallery 1F/Greenhouse. |
| `dimitrescu_battlements_2021` — Tower of Worship, première phase | Vue de la même face sans occultation centrale, avec passage/sol/parapet. Ne pas substituer la phase supérieure. |

Les trois plaques produites ajoutent des preuves à d’autres cibles historiquement en hold ; elles ne ferment ni géométrie, ni parallaxe, ni admission. Les 14 holds de décors V22 restent un décompte historique, pas un total restant automatiquement diminué de trois.

**Animations et moteur :** V23 conserve neuf clés pour `REC_BARRY_REV2` (REV2 2015, référence promotionnelle 2014), `REC_REBECCA_RE0` et `REC_BILLY_RE0` (HD2016), ainsi que deux essais. V23+V24 donnent quinze clés pour cinq incarnations existantes, zéro animation complète. HD2016 ne certifie pas GameCube2002. Définir pivots, échelles, transitions et événements, puis vérifier sélection, annulation, confirmation répétée et chargement tardif dans le jeu.

**44 actions V1 :** reprendre les identifiants et familles du JSON et le détail V22. Pour SP2 Rebecca, compléter départ, trajectoire, allumage, bris, feu d’impact, durée, collision et EX2. Garder les effets observés distincts des règles de simulation V1. Le refus de grenade RE2R pour `REC_HUNK_RE2R__SP5` demeure sans relance ; le carreau de Leon ne sert de substitution ni à Ada ni à Krauser.

**Preuve navigateur :** la recette V23 était bloquée par Chromium absent puis téléchargement HTTP 403, avec zéro assertion exécutée. Ses 26 tests de domaine réussis restent des preuves historiques du prototype ; ils n’ont pas été relancés ici et ne prouvent pas le rendu ou le jeu complet.

## P1 — Bible et deux extensions

Le [guide général et les deux extensions](../../../docs/combat-bible/README.md) sont intégrés depuis V23 : trois sources intactes et **68 sections documentées/raccordées**. La [matrice](../../../docs/combat-bible/INTEGRATION_MATRIX.json) distingue 27 `existing_partial`, 9 `isolated_prototype`, 14 `not_applicable_documentation`, 18 `planned` ; elle ne certifie pas 68 fonctions terminées.

Reprendre les critères d’extension 01 pour tag, assistances, supers duo, finishers, taunts et bonus. L’extension 02 possède un prototype isolé de droits/découverte/disponibilité/compatibilité ; sauvegarde, récompenses et autorités réelles restent à raccorder. Aucun abonnement ou achat opérationnel n’est démontré.

## P1/P2 — Récupération et autres populations

| Archive | État à conserver |
|---|---|
| V3 | 54 candidats annoncés, archive complète non récupérée. |
| V4 | 34 PNG annoncés : 30 candidats et 4 essais, archive complète non récupérée. |
| V12/V13 | 44 PNG annoncés, exclus du corpus V18 publié ; originaux à retrouver. |
| V19 | 9 PNG annoncés : 7 candidats et 2 essais, non retrouvés/non publiés dans les preuves disponibles. UID : `re6-lepotitsa`, `re6-shrieker`, `re6-zombie-dog` (Zombie Dog C), `re6-ubistvo`. Refus Ubistvo conservé. |

Récupérer les octets et comparer hashes, doublons, édition et statut avant de conclure à une absence. `rpd_hall`, `nest` et `queen_zenobia` restent aussi en récupération de décors. Aucun original récupéré dans V24.

Les 105 holds BOW, les 61 refus BOW historiques et les cinq refus créatures V22 conservent leur portée ; aucune relance du même contenu refusé. Les 13 refus V22 tous domaines et les 142 enregistrements de hold couvrent d’autres unités et ne sont pas des manquants uniques à additionner.

Reprendre les autres héros, les 60 propositions de roster et les 38 costumes depuis les rapprochements V22. Les costumes se répartissent en 28 candidats nouveaux, une variante V21, sept refus nouveaux, un refus historique et un chevauchement de base ; les quatre FanDesign restent une annexe. Ni costume ni forme proche ne confirment automatiquement une nouvelle identité.

## Publication et validation

Publication atomique et suivi CI sont pilotés séparément par le parent. Cette tâche a écrit uniquement les deux fichiers de reprise ; elle n’a modifié ni pixels, sources historiques, index Git, commit ou référence. La vérification porte sur les fichiers réels et les raccords, pas sur une exécution moteur.

Observer la CI du commit publié. Le [suivi V23](../v23/reports/CI_FOLLOWUP_V23.json) conserve la garde R34 à liste fermée et son problème de périmètre des nouveaux dossiers. Garder gardes et rapports intacts ; aucun vert global, merge, déploiement ou admission moteur revendiqué par cette consolidation.
