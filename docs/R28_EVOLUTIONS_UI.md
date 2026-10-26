# Choisir ses formes et évoluer en combat — R28

La sélection principale propose une liste « Personnages et formes ». Chaque famille documentée conserve sa forme de base et ses formes suivantes dans une sous-catégorie portant le jeu d’origine. Les boutons « Choisir J1 » et « Choisir J2 » assignent exactement l’identité sélectionnée. La grille historique reste disponible. Le duel classique conserve ses 346 profils et son format de replay historique.

Le bouton **Combat avec évolutions** ouvre le mode jouable [R28](../modules/fidelity-r28/evolutions/index.html) avec les identités sélectionnées. Ce mode utilise le moteur de contact existant et le moteur/replay R28 décrit dans [R28_EVOLUTIONS_ENGINE.md](R28_EVOLUTIONS_ENGINE.md). Ses règles sont distinctes des combats classiques et des opérations. Il ne transmet aucun résultat de campagne.

## Déclenchement volontaire

Le panneau de combat affiche la forme courante, les formes suivantes, les conditions et le motif d’indisponibilité. La santé et la jauge actuelles sont lisibles ; le HUD distingue la jauge de mutation de la ressource propre au personnage. Le joueur choisit une forme puis appuie sur **Évoluer**, sur **V** pour le sujet ou sur **B** pour l’adversaire. Une barre compacte conserve les boutons d’évolution au-dessus de l’arène pendant le défilement. Une manette standard peut utiliser **Select** pour le sujet. Une connexion avec Select déjà maintenu est ignorée ; il faut relâcher puis appuyer. Les boutons sont disponibles pour choisir volontairement les mutations des deux participants, y compris pendant une rencontre entre IA.

Les conditions actuelles sont des règles de ce mode : au moins 120 ticks, 70 % de vie ou moins, 35 points de jauge, posture neutre au sol, récupération terminée et absence de projectile ou dispositif encore actif appartenant au personnage. La mutation coûte 35 points et impose 24 ticks de récupération. Elle ne restaure pas la vie. Il n’y a aucune mutation automatique.

Une transformation change réellement l’identité et le profil de combat utilisés par le moteur. Le HUD, les dix commandes et le rendu consultent cette nouvelle identité. Les sprites admis par R28 restent soumis à leur pose, leur vue et leur complétude vérifiées. Aucun cycle d’animation original n’est certifié par ce mode.

Les évolutions acceptées sont enregistrées au tick correspondant dans le replay R28. La relecture reconstruit les états depuis le départ et désactive les commandes de mutation. Pause, perte de focus, masquage et changement de duel annulent les demandes en attente.

Les boutons de déplacement, accroupissement et garde acceptent aussi un maintien sur Espace ou Entrée lorsqu’ils ont le focus. Le relâchement de la touche, la sortie du bouton et la pause suppriment ce maintien ; un pointeur maintenu indépendamment reste actif. Saut et dash prennent une seule impulsion par pression, sans répétition du système ni clic natif supplémentaire. Le défaut a été reproduit avant correction : le bouton Garde réagissait au pointeur mais pas à Espace. Le chargement puis la sortie d’un replay effacent aussi les maintiens du duel précédent.

## Familles et rencontres particulières

Le graphe R28 contient **15 familles, 42 formes et 26 liens** : 17 mutations ouvertes au duel libre et 9 liens retenus pour leurs contraintes de rencontre. Les sources exactes et leurs citations sont conservées dans [graph.json](../modules/fidelity-r28/evolutions/graph.json).

Le nouveau sélecteur présente **348 identités** : les 346 profils historiques, plus deux formes de famille conservées comme rencontres. **340 profils** sont admis au duel libre. Les huit choix de rencontre sont visibles et désactivés pour le combat libre. Sept formes de rencontre appartenant au graphe ont des liens directs vers leurs dossiers. Une requête d’URL visant une forme de rencontre reçoit un message explicite et un lien vers son dossier ; elle ne crée pas ce personnage comme combattant libre.

Ces restrictions conservent notamment les scènes suspendues, enracinées ou liées à une structure. Une transition intermédiaire retenue ne peut pas être sautée pour atteindre arbitrairement une forme suivante.

## Vérification

Commande : `node tests/browser-evolutions-r28.mjs` avec Chromium et Playwright installés. Le rapport [R28_EVOLUTIONS_BROWSER.json](R28_EVOLUTIONS_BROWSER.json) lie les résultats aux SHA des sources effectivement exécutées.

Le scénario réel Tyrant RE2 remake contre Nemesis RE3 remake, graine 7070, atteint les conditions à **F678**, avec **3 910 PV et 36 points de jauge**, sans modification de santé ni de ressource par le test. Le bouton du panneau produit Super Tyrant à **F679**, toujours à **3 910 PV**, avec **1 point de jauge**. Son replay reconstitué donne l’empreinte d’état `68a1966d`.

Les 16 groupes de la suite couvrent aussi les identités des sélecteurs principal/classique, le choix direct d’une forme évoluée, les formes de rencontre, le retour avant/après la mutation dans un replay, le rejet d’un replay altéré sans remplacement du duel, l’annulation en pause, les touches V et B, les boutons au clavier et la connexion/pression maintenue d’une manette simulée. Les contrôles du nouveau mode sont vérifiés à 1280 et 320 px avec toutes les tailles de texte calculées doublées ; la sélection principale est également vérifiée à 320 px avec ce grossissement. Les appareils et manettes physiques ne sont pas certifiés par ces simulations.
