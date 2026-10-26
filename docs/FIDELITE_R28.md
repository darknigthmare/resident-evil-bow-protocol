# R28 — Formes, corps documentés et évolutions volontaires

R28 ajoute un mode de combat avec évolutions choisies, termine la revue visuelle des 363 poses actives et remplace quatre images partielles à partir de références de la même incarnation. Le [classeur R28](BOW_FIDELITE_R28.xlsx) et le [suivi central](../modules/fidelity-r28/index.html) exposent les acquis et les critères encore ouverts des 17 chantiers.

## Choisir les formes et évoluer pendant le combat

La sélection principale et le duel classique proposent des sous-catégories de formes sous le personnage de base, avec leur jeu d’origine. Une forme évoluée reste directement sélectionnable. Le bouton **Combat avec évolutions** ouvre le [mode R28](../modules/fidelity-r28/evolutions/index.html) avec les identités choisies.

Le graphe contient **15 familles, 42 formes et 26 liens documentés**. **17 mutations** sont jouables ; neuf liens restent retenus pour leurs scènes particulières. Le nouveau sélecteur présente 348 identités, dont 340 ouvertes au duel libre et huit choix de rencontre visibles mais désactivés. Les formes de rencontre gardent leurs dossiers et leur place dans la famille.

Pendant le combat, le joueur choisit la forme suivante puis déclenche volontairement la mutation avec le bouton affiché, **V** pour le sujet, **B** pour l’adversaire ou **Select** sur une manette standard pour le sujet. Les conditions actuelles sont : après 120 ticks, vie à 70 % ou moins, au moins 35 points de jauge et posture neutre au sol. La mutation coûte 35 points et impose 24 ticks de récupération vulnérable. Elle ne restaure pas la vie et ne se produit jamais automatiquement.

Ces coûts et conditions sont des règles originales du mode. Les sources documentent les identités et les successions de formes. Le profil de combat et le HUD changent réellement lors de la mutation ; un format de replay R28 distinct enregistre le choix au tick correspondant. Les anciens moteurs, replays et parcours de campagne restent dans leur version conservée.

Preuves : [moteur](R28_EVOLUTIONS_ENGINE.md), [interface](R28_EVOLUTIONS_UI.md), [graphe et citations](../modules/fidelity-r28/evolutions/graph.json), [tests du moteur](R28_EVOLUTIONS_ENGINE_TESTS.json), [navigateur](R28_EVOLUTIONS_BROWSER.json).

## Corps, poses et références d’apparence

Les **363 PNG actifs** ont maintenant une revue visuelle, dont **171 nouvelles revues** avec 57 planches de comparaison. **106 corps anatomiques entiers** sont revus — 105 combattants et un contexte — et **32 poses neutres** sont admises au seul rendu idle, dans le côté effectivement disponible.

Quatre versions corporelles étendues remplacent les anciennes images de **Wall Blister**, **Scagdead**, **Cerberus RE1R** et **Lisa Trevor dans sa forme de base**. Les versions R27 sont conservées. Ces quatre images sont des poses de liaison ou de présentation et restent hors du rendu idle. Elles s’appuient sur **32 vues dérivées de huit modèles attribués à six UID**, avec six pages de publication reconsultées sur Internet et conservées par empreinte.

Une anatomie entière ne certifie pas tous les accessoires ou les autres phases. Lisa conserve des lacunes d’équipement et de phase tentaculaire ; un élément détaché de la chaîne de Cerberus reste non certifié. Uroboros demeure partiel. La file distingue encore **215 corps de combattants**, **42 rencontres contextuelles** et les **22 refus de génération conservés** selon la préférence utilisateur.

Les quatre remplacements ne créent aucune nouvelle identité cible : le lot reste à **363 identités avec PNG actif et 22 refus sur les 385 cibles initiales**. Aucun sprite original de jeu, cycle complet d’animation ou 1:1 global n’est certifié.

Preuves : [galerie](../modules/fidelity-r28/sprites/index.html), [registre](../modules/fidelity-r28/sprites/manifest.json), [corps et apparences encore ouverts](../modules/fidelity-r28/sprites/body-gaps.json), [sources corporelles](R28_BODY_SOURCES.md), [revues et compteurs](R28_SPRITES.md).

## Citations et audio

**42 nouvelles assertions concernent les 33 dernières identités sans revue documentaire R27**, portant le cumul à **389 identités**. Quarante citations conservent la salle et le mode de leur rencontre ; deux proviennent de commentaires de forme. Les négations, variantes et phases restent limitées au contexte cité. Cette couverture documentaire ne certifie aucun répertoire complet, timing, animation ou mesure physique.

Le lot audio conserve **1 450 WAV**, soit **1 105 contenus SHA distincts**, dont **1 055 absents des lots R24–R27**. Il documente également 345 doublons de publication et 50 contenus déjà présents. Les **301 fichiers du groupe Licker RE3 remake** restent attribués à ce groupe publié ; **1 149 fichiers NE-α/Nemesis** sont conservés comme candidats pour quatre UID, avec leurs limites. Ils ne deviennent pas des sons de mutation ou des actions de combat certifiés.

Les cinq archives sources, les fréquences et les canaux publiés sont conservés. L’écoute sémantique indépendante et les affectations sonores finales restent ouvertes. Aucun nouveau mouvement natif n’est ajouté par cette livraison.

Preuves : [revue documentaire](../modules/fidelity-r28/canonical/index.html), [guide des citations](R28_CANONICAL.md), [lecteur audio](../modules/fidelity-r28/audio/index.html), [archives et attributions](R28_AUDIO.md).

Les [Dossiers du bestiaire](../codex.html) relient chaque UID aux ajouts R28 : pose active et limites corporelles, citations et sons du groupe attribué ou candidats conservés. L’index couvre les 389 identités ; les quatre remplacements, les équipements incomplets et les sons candidats gardent leur portée explicite. [Le guide des Dossiers](R28_DOSSIER.md) décrit ces liens et leurs six contrôles navigateur.

## Classeur et recette

Le classeur comporte **42 feuilles**, dont les **35 feuilles R27 et leurs relations conservées octet pour octet**, avec les 389 identités, les 17 chantiers ouverts et **2 114 lignes de preuves R28**. Les cellules de pose, de famille et d’attribution audio sont vérifiées contre leurs manifestes. Les candidats restent distincts des attributions certaines ; les refus et poses de liaison ne deviennent pas des états de combat.

Les rapports de la recette R28 totalisent **42 tests Python, 30 groupes Node et 48 groupes navigateur réussis**. Ils incluent les évolutions naturelles sans modification de santé ou de jauge, les replays, les références corporelles, les citations, l’audio, les Dossiers, les liens du suivi et le texte doublé à 320 px. La galerie conserve le focus après une activation avec Entrée ; le bouton de garde et les commandes maintenues du mode d’évolution répondent aussi au clavier. Les contrôles de reproduction vérifient séparément le classeur réellement livré. Les anciens rapports ne sont pas recomptés comme exécutés en R28.

La fidélité globale 1:1, les cycles complets, les captures primaires et les appareils physiques restent non certifiés. Le rig final, les cinématiques et les sauvegardes conservent leurs acquis historiques sans nouvelle implémentation revendiquée en R28.

Reproduction : [commandes du suivi](R28_TRACKING.md), [recette agrégée](R28_VALIDATION.json), [reçu d’export](R28_EXPORT.json), [reproduction réelle](R28_REPRODUCTION.json).
