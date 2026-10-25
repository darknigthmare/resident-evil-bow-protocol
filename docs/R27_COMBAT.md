# R27 — poses générées dans les sélections et le combat

L’adaptateur R27 peut afficher une nouvelle pose de base dans les deux moteurs de combat, lorsque son identité, son corps et son orientation ont été revus. Une image présente dans la galerie n’est donc pas automatiquement utilisée pendant un match.

Les PNG R20 restent disponibles. Les nouvelles images proviennent du [registre R27](../modules/fidelity-r27/sprites/manifest.json) et sont consultables dans la [galerie des 385 cibles](../modules/fidelity-r27/sprites/index.html). Chaque fiche conserve sa source, ses empreintes, sa revue et les états qui manquent encore.

## Conditions d’affichage

Une pose doit avoir l’UID exact de l’acteur, une revue visuelle acceptée, un corps entier vérifié, une orientation effectivement produite et la classification explicite `poseKind: neutral-base`. L’état demandé doit être `idle` et être présent dans `availableStates`. Une référence de buste, une vue frontale sans orientation latérale, une image non revue ou une illustration contextuelle ne satisfait pas ces conditions.

Un corps entier orienté à droite peut encore être une pose de liaison des modèles (`source-bind-pose`) ou une présentation de référence (`source-presentation`). Ces images restent consultables, mais leur liste d’états de jeu est vide. La revue du corps et du côté reste vraie : aucune valeur n’est falsifiée pour provoquer le refus. Le Zombie Outbreak entier, orienté à droite en pose de liaison, sert de contre-exemple réel dans les tests.

La direction déclarée dans la fiche fait foi : le nom de fichier de production `idle-right.png` ne prouve pas que le personnage regarde à droite. Une image gauche peut servir à gauche ; aucune image n’est retournée horizontalement pour fabriquer l’autre côté.

Les attaques, déplacements, sauts, gardes, impacts, chutes et conclusions conservent leur rendu existant. L’adaptateur n’anime pas une pose immobile par déformation du corps et ne transforme pas une illustration en cycle de combat. Les 43 rencontres contextuelles du catalogue ne deviennent pas des combattants.

## Intégration

Les scripts de `modules/fidelity-r27/combat/` sont ajoutés à `modules/versus.html` et `catalog-duel.html`. `adapter.js` enveloppe les fonctions de dessin existantes, classe l’état courant puis demande une pose compatible. Le dessin d’origine reste disponible lorsque la nouvelle pose manque, se charge ou échoue.

Les Dossiers gardent aussi leurs liens R26 et ajoutent les nouvelles références R27 : 330 fichiers audio et 84 assertions pour 81 incarnations supplémentaires. Le petit index `dossier-additions.json` couvre les 389 UID ; il donne accès au cumul de 356 UID avec citations et 21 UID avec audio. Les URL locales, compteurs et limites de certification sont contrôlés. Ces liens ne chargent ni WAV ni PNG automatiquement et ne remplacent pas l’image historique du Dossier.

`presentation.js` présente aussi les poses admissibles dans la sélection. Les résultats de chargement périmés sont ignorés lorsqu’un utilisateur change rapidement d’identité. Les scripts ne réécrivent ni roster, ni commandes, ni collisions, ni positions physiques, ni contrats de replay, ni sauvegardes.

Les fichiers sont chargés à la demande et vérifiés avant décodage : chemin local, taille, SHA-256 et dimensions. Le cache contient au plus quatre images décodées, avec deux chargements simultanés. Chaque image est bornée à 16 Mio et 16 mégapixels. Les départs de page annulent les chargements et libèrent les URL Blob ; une restauration reprend sans réutiliser une réponse périmée. Le vérificateur de replay à origine opaque ne charge pas cette présentation.

Le manifeste complet conserve aussi les prompts et leurs références : sa limite est de 4 Mio dans le runtime et les Dossiers. La projection des 225 premiers enregistrements dépasse 2 Mio une fois leur indentation de registre ajoutée. Une réponse de 3 Mio est éprouvée avec les enregistrements réels et un bourrage de transport explicite ; une réponse de 5 Mio est refusée. Le nombre d’images autorisées reste plafonné à 385 nouvelles identités.

## Vérifications exécutées

- [Neuf groupes Node](R27_COMBAT_TESTS.json) : contrats, identité, états, directions, corps incomplets, cache et absence de mutations du moteur.
- [Quinze groupes Chromium](R27_COMBAT_BROWSER.json) : vrai canvas principal et expérimental, sélections, erreurs, changements rapides, cycle de page, références R27 et refus des usages non produits ou d’une pose de liaison entière.
- [Trois tests Python de l’index](R27_DOSSIER_ADDITIONS_TESTS.json) : attributions réelles, doublons, faux totaux et source historique inchangée.
- [Suivi ciblé du canvas](R27_COMBAT_BROWSER_FOLLOWUP.json) : inspection du nouveau Cerberus en attente et du rendu existant conservé pour les autres cas.
- [Suivi ciblé de la taille du manifeste](R27_COMBAT_BOUNDS_FOLLOWUP.json) : budget de 4 Mio et refus d’un en-tête ou d’un flux surdimensionné, avec maintien du repli historique.

Ces exécutions valident l’adaptateur et les ressources exercées au moment du test. Le registre évolue pendant la génération ; la recette de livraison doit contrôler son instantané final. Les appareils physiques et l’égalité graphique aux jeux Capcom ne sont pas certifiés.

## Travail restant

Les images livrées sont des interprétations générées ou des poses d’examen explicitement documentées. Les poses admises ne constituent pas des frames officielles récupérées. Les cycles, vues opposées, membres indépendants, transitions, impacts et conclusions artistiques restent à produire et à comparer aux séquences sources. Les critères ouverts et refus de génération restent visibles dans le classeur R27.
