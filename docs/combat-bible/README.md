# Resident Evil Combat — Bible d'application du guide commun

**V23 · 27 novembre 2026 · Resident Evil — B.O.W. Protocol**

Cette bible raccorde le guide général et ses deux extensions au projet existant. Les trois originaux sont intégrés sans modification d'octets ; les décisions propres à Resident Evil sont développées ici et dans les deux documents d'application. Le périmètre est une intégration documentaire et de production : il ne remplace pas le moteur ni les preuves historiques.

## Lire la bible

- [Extension 01 — personnalité, équipes, clashes, entités, bonus et exploration](EXTENSION_01_APPLICATION.md).
- [Extension 02 — slots, déblocages, droits et contenus de soutien](EXTENSION_02_APPLICATION.md).
- [Matrice des 68 sections](INTEGRATION_MATRIX.json) : constat de l'existant, décision, dépendances et critère de recette pour chaque section.
- [Guide général original](sources/Combat_Games_Guide_General_v1.0.txt), [extension 01 originale](sources/Combat_Games_Extension_01_Tag_Taunts_Bonus_v1.0.txt), [extension 02 originale](sources/Combat_Games_Extension_02_Slots_Verrouilles_Deblocages_Abonnes_v1.0.txt).
- [Provenance et empreintes des originaux](sources/manifest.json), [index des sections](sources/sections.json).

| Source | Version inscrite | Portée | Taille |
| --- | --- | --- | ---: |
| Guide général | 1.0 · 25 novembre 2026 | Sections 00–29 | 55 172 octets |
| Extension 01 | 1.0 · 26 novembre 2026 | Sections 30–49 | 60 589 octets |
| Extension 02 | 1.0 · 27 novembre 2026 | Sections 50–67 | 47 334 octets |

Les sources proviennent des trois fichiers Drive nommés dans le manifeste. Le présent texte est l'application au projet, distincte des originaux. Les sections 00–67 sont toutes rapprochées d'une décision ; leur présence dans la matrice ne signifie pas que leurs mécaniques sont toutes jouables.

## 1. Base réellement examinée

Référence de reprise : branche `chore/rec-media-v19-v20-20261121`, commit `7c679b38c72ee4d34fd1c39d1dc8950dd4f506aa`, package `0.7.3`. La numérotation V23 désigne ce lot de production et de documentation ; elle ne change pas la version du moteur. La référence distante est la [PR #24](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/24).

L'inspection porte sur les sources, les manifestes et les documents cités. Elle établit la présence de code et de données ; les tests de jeu ne sont pas réputés exécutés par cette lecture. Les recettes historiques restent attribuées à leurs révisions.

| Périmètre | Constat à la reprise | Interprétation correcte |
| --- | --- | --- |
| [Roster](../../data/roster.json) | 115 `fighters`, 389 entrées de catalogue, 52 stages | Les 115 combattants principaux, 231 prototypes et 43 exercices contextuels restent séparés ; aucune affirmation de 389 combattants terminés. |
| [Chroniques](../../data/chronicles.json) | Routes, introductions et épilogues reliés aux 115 profils | Les dossiers de simulation existants ne deviennent pas automatiquement une campagne canonique. |
| [Movesets documentés](../../data/lore-movesets.json) | Profils et niveaux de preuve `canonical`, `anatomical`, `simulation` | Une commande de simulation reste une adaptation 2D, même quand son inspiration est attestée. |
| [Suivi R34](../FIDELITE_R34.md) | 306 portraits générés, 305 admis ; 128 poses générées, 114 admises, selon ce rapport historique | Ces chiffres ne sont pas recalculés ni augmentés par les PNG candidats V22/V23. Les 17 chantiers historiques restent ouverts. |
| [Lot V22](../../production-archives/rec-media/v22/README.md) | 80 PNG : 77 candidats, 1 étude et 2 essais écartés | Aucun asset V22 certifié 1:1, animé complètement ou admis dans le moteur. |
| [Lot V23](../../production-archives/rec-media/v23/README.md) | 11 PNG natifs : 9 clés candidates et 2 premiers essais remplacés conservés | Présélection, confirmation et désélection de Barry REV2, Billy et Rebecca RE0 HD2016 ; zéro animation complète, admission moteur ou certification 1:1. |
| [Réconciliation V1/V22](../../production-archives/rec-media/v22/inventory/characters-v1-reconciliation.json) | 24 fiches prioritaires et 60 propositions d'extension | Les correspondances exactes, éditions proches, refus et archives non récupérées conservent des statuts distincts. |
| [Inventaire V22](../../production-archives/rec-media/v22/inventory/INVENTAIRE_COMPLET_V22_20261124.json) | 38 variantes de costume ciblées ; 44 actions réparties en 16 familles de projectiles/VFX | Ces unités se recoupent avec personnages et médias ; pas de somme globale ni de pourcentage de franchise inventé. |

La base possède déjà des mécanismes utiles aux extensions. `combat-foundation-v060.js` applique un effet `taunt` aux calculs de dégâts, crée des projectiles et des pièges, et traite des détonations. `chronicles-core-v060.js` conserve des épilogues déverrouillés et contrôle leur lecture après un parcours terminé. Ces mécanismes sont un point de raccordement, sans constituer à eux seuls le système complet de taunts ou de droits demandé.

## 2. Identité et piliers du jeu

**Promesse :** retrouver les silhouettes, armes, comportements et lieux de Resident Evil dans un combat latéral lisible, avec une profondeur de duel et des parcours narratifs qui préservent les différences entre épisodes.

Le format de référence demeure le moteur JavaScript/Canvas du dépôt. Le menu, le duel principal, le duel catalogue, les Dossiers et les outils de revue constituent des parcours distincts. Aucune migration Godot, Unity ou Unreal n'est décidée par ce dossier.

Les cinq piliers sont :

1. **Incarnation identifiable.** Œuvre, édition, forme et costume sont fixés avant de produire ou raccorder un visuel.
2. **Combat compréhensible.** Départ, impact, garde, coût, récupération et réponse adverse restent lisibles malgré les effets.
3. **Personnalité conservée.** Gestes, coopération, réactions et conclusions respectent le personnage ; une B.O.W. ne reçoit pas une voix humaine par commodité.
4. **Récits séparés par leur statut.** Dossiers de simulation, reconstitutions d'incidents, parcours alternatifs et campagne originale ne partagent pas implicitement une continuité.
5. **Production traçable.** Source, pose, animation, intégration, test et publication sont comptés indépendamment.

Le périmètre connu comprend les groupes de jeux du roster et les propositions déjà réconciliées en V22. Cette bible n'annonce pas un inventaire exhaustif de tous les films, romans, adaptations ou futurs jeux de la franchise. Tout ajout reçoit une ligne de périmètre avant d'être compté.

## 3. Référentiel de fidélité et de continuité

### 3.1 Statuts applicables à chaque entrée

| Statut | Usage dans le projet | Exemple de frontière |
| --- | --- | --- |
| Canon attesté | Identité, lieu, équipement ou fait documenté dans la continuité retenue | Le partenariat Chris/Sheva est documenté par le manuel officiel RE5. |
| Adaptation jouable | Traduction en règles de combat 2D d'une capacité attestée | Une couverture de tir reçoit une portée, un coût et une fenêtre propres au fangame. |
| Original compatible | Contenu créé pour le projet et justifié dans l'univers | Le hub d'archives proposé et les noms des supers d'équipe de l'extension 01. |
| Alternatif / crossover | Rencontre ou tenue extérieure à la continuité du chapitre | Duel libre entre incarnations d'époques différentes, explicitement hors récit principal. |
| À confirmer | Référence insuffisante, édition ou détail visuel non verrouillé | Modèle HD utilisé pour une fiche libellée RE0 2002. |

Une source narrative confirme un rôle ou un événement ; elle ne confirme pas tous les détails d'un modèle 3D. Une référence frontale ne valide pas le dos ni le côté opposé. Une image générée ne devient pas fidèle par sa seule qualité visuelle. Le 1:1 concerne les caractéristiques représentées, pas le rapport largeur/hauteur du fichier.

### 3.2 Sources primaires utiles à cette intégration

| ID | Source et portée vérifiée | Utilisation autorisée dans la bible |
| --- | --- | --- |
| CAP-HISTORY | [Chronologie officielle Resident Evil](https://game.capcom.com/residentevil/en/re-history.html), texte indexé consulté le 27/11/2026 ; version [UK](https://game.capcom.com/residentevil/uk/re-history.html) pour RE0 | Séparation des incidents et périodes ; Rebecca/Billy, Ecliptic Express et centre de formation ; RE5 en 2009 et Revelations 2 en 2011. |
| CAP-RE5-MANUAL | [Manuel officiel RE5 PS3 anglais](https://static.capcom.com/manuals/re5/RE5_PS3_DMNL_EN.pdf), extrait personnages indexé ; accès PDF direct indisponible lors de cette lecture | Chris et Sheva, agents BSAA et partenaires. Pas de certification exhaustive des armes ou détails de tenue à partir de cet extrait. |
| CAP-REV2-MANUAL | [Manuel officiel Revelations 2 PS4 français](https://static.capcom.com/manuals/rer2/RER2_PS4_DMNL_FR-CA.pdf), section Partenaire indexée ; [édition PS3 anglaise](https://static.capcom.com/manuals/rer2/RER2_PS3_DMNL_EN.pdf) concordante | Moira : lampe et pied-de-biche ; Natalia : détection des ennemis et points faibles ; alternance de partenaire en solo. Les frames et jauges 2D restent une adaptation. |
| CAP-REV2-PAIR | [Annonce Capcom du 2 décembre 2014](https://news.capcomusa.com/neilgortz/blog/2014/12/02/brand-new-resident-evil-revelations-2-trailer), page lue | Paires Claire/Moira et Barry/Natalia ; recherche de Moira par Barry. |
| CAP-RE0-PAIR | [The Greatest Partners in Resident Evil](https://game.capcom.com/residentevil/en/news_topics-201511121213.html), Capcom | Rebecca et Billy constituent une association de référence ; les chorégraphies nouvelles restent originales. |

Ces références soutiennent les choix de version et de rôle. Les scènes inventées, dialogues nouveaux, hubs, règles de récompense et valeurs chiffrées sont des choix du projet. Les références artistiques propres aux médias restent dans les manifestes de chaque lot.

### 3.3 Règles de version

Chaque fiche conserve `content_id`, `identity`, `work`, `edition`, `story_period`, `form`, `costume_id`, `source_refs`, `fidelity_status` et `unresolved_points`. Les IDs runtime existants ne sont pas remplacés par les IDs `REC_*` de production : un raccord explicite est requis.

Rebecca et Billy ont des fiches V1 `REC_REBECCA_RE0` et `REC_BILLY_RE0` encore libellées « 2002, modèle HD de référence à verrouiller ». Une clé visuelle fondée sur HD Remaster 2016 doit conserver cette édition dans son manifeste et son lien de correspondance ; elle ne ferme pas automatiquement le besoin 2002. Barry reste `REC_BARRY_REV2`, édition Revelations 2 (2015), et ne récupère pas les vêtements du manoir de 1998.

## 4. Carte du projet et points de raccordement

| Fonction | Point d'entrée ou données | Responsabilité et limite |
| --- | --- | --- |
| Accueil et options | [Menu R20](../../src/game-menu-r20.js), [préférences](../../src/interface-preferences-r20.js) | Focus, retour, répétition clavier, mouvement réduit, contraste et texte ; conserver leurs préférences séparées de la progression. |
| Duel principal / dojo | [Versus](../../modules/versus.html), [moteur](../../src/unified-engine-v060.js), [combat](../../src/combat-foundation-v060.js) | CPU/local/entraînement, pas fixe, garde, attaques, ressources et événements ; nouvelle mécanique = nouveau contrat et recette. |
| Duel catalogue | [Duel catalogue](../../catalog-duel.html), [contrôleur](../../src/catalog-duel-v070.js) | Prototypes, contextes et entrées dédiées ; ne pas les promouvoir silencieusement dans le roster principal. |
| Dossiers et parcours | [Chroniques](../../modules/chronicles.html), [noyau de progression](../../src/chronicles-core-v060.js) | Prologue, duels, résultat, épilogue, reprise ; préserver les sauvegardes. |
| Movesets / conclusions | [Lore movesets](../../data/lore-movesets.json), [finishers](../../data/finishers-v053.json), [compatibilité](../../src/finisher-compatibility-r10.js) | Distinguer inspiration, réglages 2D, cible et solution de remplacement. |
| Arènes / rendu | [Arènes](../../data/arenas.json), [rendu](../../src/re-renderer.js), [dynamique](../../src/stage-dynamics-r6.js), [scènes Baker](../../src/baker-stages-r14.js) | Vue, sol, ambiance et événements existants ; le master visuel ne prouve ni parallaxe séparée ni connexion jouable. |
| Replays / sauvegardes | [Contrat catalogue](../../src/catalog-replay-contract.js), [coffre de replays](../../src/replay-vault-r13.js), [centre de sauvegardes](../../src/save-center-r19.js) | Identifiants, contrôles d'import, compatibilité, journal et conflits ; aucune migration destructive implicite. |
| Médias R31/R34 | [Mouvements](../../modules/fidelity-r31/motion/index.html), [assets R34](../../modules/fidelity-r34/assets/index.html) | Preuves natives, générées et admises avec portée propre. |
| Production fixe récente | [V22](../../production-archives/rec-media/v22/README.md) | Candidats et inventaires ; l'admission au moteur demande une étape distincte. |
| Accès V23 isolé | [Prototype de slots/droits](../../production-archives/rec-media/v23/prototype/index.html), [périmètre](../../production-archives/rec-media/v23/prototype/README.md) | Démonstration séparée ; pas de branchement au duel, aux sauvegardes historiques ni aux paiements. |

Le pas de simulation existant est de 60 Hz selon le [guide gamedev du dépôt](../GAMEDEV_GUIDANCE.md). Conserver la graine de simulation et l'ordre des événements. Une cinématique, un hitstop ou une option de confort ne décide pas seul du temps de jeu, des contacts ni du résultat.

## 5. Roster, costumes et logique de combat

La production conserve les 24 fiches prioritaires et les 60 propositions d'extension, avec leurs raccords précis dans [la réconciliation](../../production-archives/rec-media/v22/inventory/characters-v1-reconciliation.md). Le besoin immédiat se traite par incarnation, puis par asset et état. Un costume alternatif ne remplace pas la tenue de base ; une mutation ne remplace pas sa forme humaine.

Une fiche de combattant prête à implémenter réunit : silhouette, anatomie et asymétries ; source visuelle ; motivation et relations ; locomotion ; garde et réponses ; ressource propre ; normaux et techniques ; projectiles/objets ; intro, taunt, sélection et victoire ; route narrative ; compatibilités de costume et de cible ; dépendances de médias et critères de recette.

### 5.1 Kits représentatifs à finaliser

| Fiche | Rôle proposé pour le combat 2D | Frontière à préserver |
| --- | --- | --- |
| `REC_CHRIS_RE5` / `REC_SHEVA_RE5` | Couverture, pression et alternance d'armes ; duo pilote du système d'équipe | Tenues/armes de RE5 verrouillées ; pas de mélange avec Village. Les coûts, recharges et chorégraphies sont des choix d'adaptation. |
| `REC_REBECCA_RE0` / `REC_BILLY_RE0` | Deux rythmes complémentaires et coordination d'objectifs | Édition de rendu fixée ; aucune aptitude nouvelle justifiée seulement par l'équilibre. |
| `REC_BARRY_REV2` | Couverture à distance et protection d'une fenêtre d'action | Un soutien Natalia relève du scénario et de ses capacités de repérage ; elle ne devient pas un combattant armé générique. |
| Moira, édition Revelations 2 | Soutien de lumière et pied-de-biche selon la scène | Aucun remplacement automatique par un kit de tir ; la période du récit et l'équipement sont des dépendances. |
| `REC_NEMESIS_RE3R`, `REC_T103_RE2R`, `REC_BIRKIN_G1_RE2R` | Pression/portée/morphologie propres à chaque forme | Ne pas fusionner les itérations originales et remakes, armes ou mutations. Les recettes humaines ne sont pas copiées sur les B.O.W. |
| `REC_JACK_RE7`, `REC_HEISENBERG_RE8`, `REC_ALEXIA_CVX` | Ressource et actions propres à la forme retenue | Les capacités et le lieu doivent être attestés ; les machines ou formes géantes disposent de rencontres dédiées. |

Ces rôles sont des objectifs de conception, pas l'état certifié de leurs kits actuels.

### 5.2 Contrat d'une action

Chaque action indique commande et priorité d'entrée, préconditions, préparation/activité/récupération en pas de simulation, coût payé une fois, portée et collision, dégâts et garde, résultat en touche/en garde/à vide, interruptions, annulations, effet sur combo, cible/boss admissibles, événements VFX/SFX et retour au contrôle.

Les ressources restent attachées à leur propriétaire : munitions, charge, transformation, objets déployés et récupération ne se réinitialisent pas au tag. Les projectiles ont un ID de propriétaire et un ID d'émission stables. Les interactions de barrage, réflexion, explosion et contrôle sont définies par action ; toutes les armes ne reçoivent pas la même règle.

Les noms nouveaux, durées, distances et dégâts ne sont jamais présentés comme données originales Capcom. Les hypothèses numériques sont marquées « réglage de projet à tester », puis remplacées par une référence de recette lors de leur validation.

### 5.3 IA, équilibrage et apprentissage

Le mode CPU existant fournit le point d'entrée ; cette bible ne lui attribue pas une couverture nouvelle des équipes ou des entités. Les futures fiches d'IA définissent perception, délai de réaction, prise de risque, choix de distance, usage des ressources et réponse au danger. Une difficulté change ces paramètres annoncés ; elle ne donne pas implicitement une lecture parfaite des entrées ni une immunité cachée. Les boss peuvent avoir des phases propres, signalées et documentées.

La recette compare deux côtés, tailles représentatives, adversaires à distance et au contact, coups gardés/ratés et ressources aux seuils. Elle recherche les boucles de combo, garde ou gain, les échappatoires réelles et les situations où caméra/effets masquent une réponse. Les mesures — durée de manche, dégâts, disponibilité, taux de réussite — gardent leur population et leur version ; aucun pourcentage d'équilibre n'est inventé par cette bible.

Le dojo enseigne déplacement/garde, attaque/contre, ressource, spéciale, conclusion puis systèmes d'équipe autorisés. Chaque leçon possède consigne courte, démonstration, essai, retour sur l'erreur, reprise et sortie. Le mannequin, l'auto-soin et la ressource libre déjà proposés par Versus restent distincts des règles d'une partie normale. Les entrées peuvent être remappées et présentées en mots et pictogrammes ; mouvement réduit, sous-titres, contraste et son redondant conservent l'information de combat. Une difficulté, une aide de saisie et une option de confort ne sont pas le même réglage.

## 6. Récits : trois cadres sans confusion

### 6.1 Dossiers existants

Les [Chroniques](../../data/chronicles.json) présentent notamment des dossiers de simulation avec huit profils adverses. Le [noyau](../../src/chronicles-core-v060.js) contrôle huit victoires, des phases intro/pré-combat/combat/après/défaite/épilogue/terminé et un registre d'épilogues. Ces structures sont conservées. Elles ne prouvent pas que chaque dialogue ou illustration est une scène authentique de l'œuvre.

### 6.2 Routes individuelles à compléter

Chaque route prioritaire comporte situation et objectif, incident déclencheur, rencontres motivées, rival ou menace personnelle, revers, confrontation finale et outro. Chaque combat relie une version du personnage, une arène, un adversaire, une raison, une scène d'entrée, une conséquence et un checkpoint. Les routes hypothétiques conservent ce statut.

| Route de production | Cadre narratif de référence | Travail restant explicite |
| --- | --- | --- |
| Rebecca/Billy — RE0 | Incident de l'Ecliptic Express et centre de formation, juillet 1998, suivant CAP-HISTORY | Découpage jouable, rivaux/rencontres, scènes et poses à sourcer ; adaptation 2D sans inventer une téléportation entre lieux. |
| Chris/Sheva — RE5 | Opération de Kijuju, 2009, suivant CAP-HISTORY et CAP-RE5-MANUAL | Enchaînements d'objectifs, couverture et duo ; les scènes nouvelles portent leur statut d'adaptation. |
| Claire/Moira puis Barry/Natalia — Revelations 2 | Scénarios distincts et recherche de Moira, suivant CAP-REV2-PAIR | Garder les périodes et connaissances propres à chaque scénario ; aucune rencontre simultanée ajoutée pour simplifier la sélection. |
| B.O.W. — dossier de laboratoire | Simulation explicitement fictive | Narration documentaire, comportement et attaques ; pas de monologue humain inventé attribué à une créature. |

Un storyboard indique acteur/version/costume, lieu/période, blessures, cadrage, progression émotionnelle, texte séparé de l'image, sons et transition au gameplay. Une pose promotionnelle ne remplace pas intro/rival/ending.

### 6.3 Campagne globale proposée : « Archives de confinement »

Ce titre désigne une **création de structure pour le fangame**, pas une campagne officielle ni un nouvel événement canonique. Le cadre est une consultation de dossiers d'incidents : sélection d'un dossier, reconstitution délimitée, épreuve adaptée, synthèse et ouverture d'une autre archive. Les cartes d'entrée annoncent œuvre, période et statut de la reconstitution.

Les actes proposés suivent : formation du joueur et incident Arklay ; dossiers de Raccoon City ; extension des crises et branches par épisode ; dossiers contemporains ; conclusion de l'enquête documentaire et défis de maîtrise. Aucun nouveau grand antagoniste contrôlant rétrospectivement toutes les crises n'est inventé pour relier les épisodes.

Une mission garde un protagoniste, un objectif, une aire cohérente, un état initial, ses scènes, ses conditions d'échec, ses transitions et sa récompense. Les bonus de l'extension 01 servent l'apprentissage ou la progression d'enquête. Le hub archive fonctionne comme une interface de collection originale ; ses connexions physiques n'affirment pas que Kijuju et le manoir sont voisins.

## 7. Modes et contrats d'entrée/sortie

| Mode | État à la reprise | Décision de la bible et recette attendue |
| --- | --- | --- |
| Versus local / CPU | Options présentes dans `modules/versus.html` | P0 maintenu : sélection → combat → résultat → revanche/retour ; vérifier les nouveaux contenus dans ce parcours. |
| Entraînement / dojo | Options mannequin, récupération, ressource libre et commandes présentes | P0 : répéter une situation, remettre à zéro et comprendre le résultat ; les nouveaux systèmes disposent de réglages dédiés. |
| Dossiers individuels | Données et contrôleur présents | P1 : préserver progression et épilogues ; distinguer réécriture narrative et code de progression. |
| Campagne globale | Cadre proposé ici | P1 conçu, mise en œuvre différée : un chapitre complet avec sauvegarde avant extension du volume. |
| Boss Combat / Boss Rush | Besoins documentés, couverture complète non vérifiée ici | P1 : phases, ressources entre rencontres, reprise et réponses par type de combattant ; aucun simple bouton compté comme mode terminé. |
| Tournoi local | Cible demandée, fonctionnement complet non démontré par cette lecture | P2 : tableau 4/8/16 joueurs proposé, résultats uniques, bye, forfait, reprise ; tailles à valider. |
| Assistance / tag / hybride | Extension 01 documentée ; moteur complet non livré par V23 | P2 : profils distincts et version de règles ; pas d'activation dans les contrats de duel actuels sans recette dédiée. |
| Bonus / exploration | Fiches de conception dans l'extension 01 | P2 : une épreuve et une zone persistante représentatives avant généralisation. |
| En ligne / classement / spectateur | Non certifiés par cette intégration | Architecture et services à définir avant annonce de disponibilité ; replay/version/autorité de résultat restent nécessaires. |
| Galerie / codex / archives | Outils et dossiers existants | Révélation selon découverte ; possession, droit d'aperçu et présence de fichier restent distincts. |

Les tailles de tournoi, coûts d'équipe et seuils de déblocage proposés ne sont pas des engagements de version ni des faits de lore.

## 8. Arènes, boss et continuité spatiale

Les 52 entrées runtime sont la base, distincte des 24 spécifications V1. La [revue V22 des stages](../../production-archives/rec-media/v22/reports/stage_target_audit.md) indique les raccords réellement examinés. Un master de décor constitue une source visuelle ; il faut encore produire/qualifier les plans de parallaxe, sols, points d'ancrage, objets et règles.

| Famille | IDs existants représentatifs | Contrôle de continuité requis |
| --- | --- | --- |
| Arklay | `spencer_hall`, `spencer_lab` | Edition, architecture, passage réel et trajet ; pas de porte décorative ouvrant arbitrairement au laboratoire. |
| Raccoon City / NEST | `rpd_hall`, `raccoon_street`, `nest`, `nest_escape_2019` | Original/remake, échelle et chronologie ; une liaison à travers les égouts demande une zone ou transition explicitement conçue. |
| RE3 remake | `clock_tower_plaza_2020`, `nest2_weapon_test_2020` | Place extérieure et chambre d'essai restent des lieux distincts ; déclencheur et destination doivent exister. |
| RE4 remake | `castle_dungeon_2023`, `specimen_storage_2023`, `island_docks_2023` | Matériaux, niveau de plancher, rencontres et chemins cohérents ; aucune fusion d'une même salle avec ses versions 2005. |
| RE7 | `baker_garage_2017`, `processing_area_morgue_2017`, `testing_area_2017` | Portes, murs et hauteur correspondent au lieu ; interactions dangereuses restent des règles communes du match. |
| RE5 / Village | `re5_060_uroboros_albert_wesker`, `heisenberg_yard_2021` | Rencontres géantes/mécanisées, sol, portée et morphologie nécessitent une recette de boss propre. |

Une liaison d'arène reçoit origine/destination/position, déclencheur, défense possible, dégâts éventuels, durée, traitement du chrono/combos/KO, positions d'arrivée, retour et règle d'usage. La destination est chargée avant le déclenchement. Les doubles transitions se résolvent dans un ordre déterministe.

La présentation vivante, la présentation réduite/statique, les interactions, les dangers et les transitions sont configurés séparément. Un décor animé peut être neutre. Une option de confort ne retire pas un projectile dangereux ni ne modifie les collisions.

Pour les boss : documenter forme et taille, phases, attaques annoncées, points faibles, réponses des kits de courte/longue portée, fenêtre de punition, victoire, défaite et reprise. Les finishers humains nécessitent une solution de remplacement pour géant, quadrupède, essaim ou machine. Une version compétitive d'un boss reçoit des règles propres, sans changer silencieusement sa fiche de campagne.

## 9. Chaîne de production des médias

Ordre retenu : **source et édition → fiche/brief → candidat → contrôle technique → revue visuelle → intégration → recette → publication**. Les rapports des [lots récents](../../production-archives/rec-media/README.md) sont conservés ; une nouvelle ligne ne réécrit pas les échecs ou incertitudes précédents.

### 9.1 Contrat des images sources

- Un personnage, projectile, accessoire ou élément exploitable par fichier autonome ; corps et équipement requis entièrement cadrés.
- Alpha réel pour les détourés, absence de faux damier, marges et ligne de sol connues ; fond opaque permis pour une arène ou illustration.
- Dimensions, empreinte, édition, rôle de l'image, orientation et référence consignés. Une image frontale de sélection n'est pas un sprite de combat latéral.
- Aucune symétrie artificielle des prothèses, tatouages, armes, sangles ou insignes. La vue opposée exige une référence ou une réserve documentée.
- Présentation native puis à taille de jeu sur un fond contrastant. La validation technique de l'alpha ne prouve pas la justesse du visage ou des matériaux.
- Poses clés de sélection, taunt, victoire et sortie répertoriées indépendamment. Une série de poses fixes n'est pas comptée comme animation complète.

### 9.2 Animations et effets

Le catalogue d'états couvre idle, déplacement, garde, attaque, blessure, chute, relève, KO, intro, taunt, victoire, sélection/désélection et actions d'équipe. Chaque séquence lie anticipation, phase d'action, retour, ancrages, événement d'impact, VFX et SFX. Les textes/voix sont séparés des pixels et adaptés à la période du personnage.

Les 44 actions/16 familles de l'[audit projectiles V22](../../production-archives/rec-media/v22/inventory/projectiles-vfx-16-families.json) constituent un besoin de production, pas 44 projectiles finalisés. Séparer corps du projectile, trajet, impact et dissipation lorsqu'ils doivent être pilotés séparément. Les pièges et objets persistants suivent l'extension 01.

## 10. UI, accès, sauvegardes et replay

Les écrans joueur présentent rôle, contenu, condition et action suivante. Les traces de production, chemins, outils et empreintes restent dans les écrans DEV. Le langage retenu pour les verrous est le dossier classifié, le badge d'autorisation et le casier d'archives ; il s'agit d'une métaphore d'interface originale, pas d'un objet magique ou d'un nouvel événement canonique.

Les confirmations/retours sont des actions ponctuelles. Conserver la suppression des répétitions existante dans le menu R20. Une requête d'image ou de droit appartenant à une ancienne sélection ne peut remplacer le choix courant. La sélection est validée immédiatement ; la présentation peut être abrégée sans modifier le résultat. Les cas détaillés sont dans les extensions.

Les déblocages legacy d'épilogues sont préservés. Le nouveau catalogue de droits ne les remplace pas et n'interprète pas leur tableau `unlocked` comme possession de tous les costumes/stages. Une migration future conserve une correspondance explicite et une preuve de reprise. Les sauvegardes R19 et replays gardent leurs contrats, clés et validations ; aucun droit de soutien ne peut être accordé par une simple valeur locale non vérifiée.

## 11. Recette et séquence de livraison

### 11.1 Validation de cette intégration documentaire

Vérifier les trois SHA-256, la taille des sources, les 68 sections uniques, les chemins et ancres, les limites d'état et le diff limité aux nouveaux documents. Aucune preuve historique n'est régénérée pour faire passer cette étape. Les tests du prototype de droits et la QA des poses V23 appartiennent à leurs rapports séparés.

### 11.2 Portes de validation futures

| Porte | Condition de passage | Preuve attendue |
| --- | --- | --- |
| Identité | Œuvre, édition, forme, références et inconnues fixées | Fiche et source consultable, décision d'alias si nécessaire. |
| Sprite fixe | Sujet correct, transparence/cadrage/ancrage et comparaison visuelle | Manifeste, QA technique, revue à taille de jeu ; réserves artistiques explicites. |
| Action jouable | États, coûts, contact/garde/échec et retour conformes | Scénarios reproductibles dans le vrai montage de duel. |
| Équipe | Entrée/sortie, disponibilité, propriété, combo et KO cohérents | Cas extension 01, deux orientations, ressources aux seuils et conflits simultanés. |
| Déblocage | Droit exact, affichage juste et sauvegarde persistante | Cas extension 02, événements dupliqués/désordonnés, reprise et sources multiples. |
| Arène/boss | Sol, caméra, limites, phase et destination jouables | Parcours réel avec styles et tailles représentatifs. |
| Histoire/mode | Entrée, objectif, résultat, reprise et sortie fonctionnels | Parcours complet d'une route/chapitre, sans lien ou état bloqué. |

Priorités : terminer la qualification des incarnations ; valider une présentation complète de personnage ; éprouver une paire cohérente et une assistance ; conserver un projectile/piège pendant un relais ; intégrer une scène collective et un bonus ; raccorder une acquisition persistante à une zone d'archives ; étendre ensuite la couverture. La construction du réseau, lorsqu'elle est retenue, doit intervenir avant la généralisation des états simulés.

Le suivi publie pour chaque catégorie le prévu, documenté, produit, contrôlé, intégré, testé, restant et bloqué. Les dénominateurs sont nommés et datés. « Présent dans le code » ne signifie pas « testé sur appareils » ; « publié en PR » ne signifie pas « fusionné ou déployé ».

## 12. Références de travail et conservation

Lire [AGENTS.md](../../AGENTS.md), [GAMEDEV_GUIDANCE](../GAMEDEV_GUIDANCE.md), [application R32](../GAMEDEV_APPLIED_R32.md), [livraison R31](../R31_DELIVERY.md), [suivi R31](../FIDELITE_R31.md) et [suivi R34](../FIDELITE_R34.md) avant toute modification du runtime. Les guides amont `create-game-assets` et `game-ui-ux` de la révision `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9` ont été lus pour organiser cette application ; leurs exemples d'autres moteurs ne sont pas copiés dans le jeu.

Les originaux intégrés et la matrice rendent la demande vérifiable. La fidélité globale 1:1, toutes les animations, une campagne complète, le tag complet et une liaison de soutien réelle restent des objectifs avec des critères propres ; ce dossier n'en déclare pas la réalisation.
