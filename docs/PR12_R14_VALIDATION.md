# PR12 — R14 : trois salles RE7 et suivi de 18 lots P1

Base de la même PR : c505206a06c63843533cfca046cf06544b9e1e28 (R13). R11 Lucas, R12 Flying Bug et R13 replays sont préservés. Aucune fusion main ni promotion Vercel.

## Contenu produit

Trois configurations existantes de 2017 possèdent maintenant des compositions originales, et non le même fond partagé :

- Garage : porte sectionnelle et rails, berline d'arrière-plan non pilotable, établi/outils, bidons, ventilation et chaîne, éclairage local, pluie bornée à la fenêtre.
- Grenier de la maison d'amis : toit et poutres, fenêtre, coffres/caisses, mobilier couvert et échelle, lampe/voile/poussière ; végétation extérieure et pluie derrière la vitre.
- Zone d'essai : encadrements successifs, panneaux/conduits, caisses inertes, écran à signal original, diode lente et câble ; aucun piège du décor ne produit de dégâts.

Douze composants ambiants sont décrits dans le suivi. Les trois salles sont des adaptations 2D originales. Les sources officielles consultées étayent le contexte RE7/Dulvey et les concepts, pas les dimensions ni positions de chaque objet. Aucun média ou plan protégé extrait. Les captures du moteur ne sont pas une preuve de géométrie canonique.

Le rendu est branché dans les huit pages consommatrices. Les 49 autres configurations et les anciens fonds restent disponibles. Le total demeure 52 stages. Le dessin s'appuie sur le temps de simulation ; pause, retour à une frame et réduction du mouvement sont déterministes. Les nouveaux effets ne modifient ni les collisions, ni les dommages, ni les ressources des personnages.

## Atelier

Architecture, accessoires, lumière, ambiance et composition complète peuvent être inspectés séparément sur un fond architectural. Sélection d'une frame, pas à pas, pause, remise à zéro et lien de scène exact sont intégrés. Une recherche vide ne conserve pas les liens de l'ancien stage. Le bouton SUIVI R14 ouvre le classeur du dépôt. Le téléchargement est comparé octet par octet au fichier livré dans le test HTTP.

## Preuves exécutées et corrections de validation

Le candidat 37af62dc87bee391222fb6ed8d90d98111a34bae a passé le workflow https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/39366770424 : 457 groupes exécutables, compilation et 54 scénarios Chromium HTTP (8 R14, 8 R13, 8 R12, 8 R11, 22 R10).

Vingt groupes R14 contrôlent les pixels réellement dessinés, les couches, temps/pause/retour/réduction, cadres de fenêtres, absence de dégâts/écriture, ancien fallback et intégration. L'inspection a détecté un débordement de silhouettes extérieures hors fenêtre : elles sont maintenant clipées, avec une régression explicite. Le test de fallback utilise l'adaptateur Canvas/DOM réel du projet. Le contrôle de préservation R13 a conservé son exigence de SHA, avec le successeur exact du renderer documenté, pas une suppression de contrôle.

La publication ajoute le classeur et son lien, ses vérifications de téléchargement, ce document et un workflow permanent. La seconde validation exécutée avant publication et les checks de la PR sont rapportés séparément. Les nombres ci-dessus ne doivent pas être doublés en ajoutant une deuxième exécution des mêmes cas.

## Excel et préservation

`docs/planning/BOW_STAGES_BAKER_R14.xlsx` : six onglets, 18 identifiants P1, trois salles, douze composants et preuves. Les trois lots GEO restent ouverts ; les autres restent en cours pour leur validation globale. Les six classeurs antérieurs sont inchangés. Aucun nouveau statut 1:1 attribué.

Les 115 combattants principaux, 231 prototypes, 43 exercices, 115 Dossiers, les mouvements, les conclusions, les 508 ressources précédentes et les trois contrats de replay/journal sont inchangés. De nouveaux dessins de décors existent bien dans le code procédural ; aucun nouveau sprite ou clip de personnage n'est livré.

La recette HTTP se déroule en Chromium 1440 et 390 pixels. Elle inclut des scènes sélectionnées et un état de combat mis en pause pour vérifier le rendu, pas un parcours manuel de toutes les parties. Pas de certification de téléphone, manette ou BFCache réel. La lisibilité générale du petit HUD et les interactions/audio spécifiques des salles restent à améliorer.

La branche est conservée en brouillon. Aucun nouveau transfert Google Drive, déploiement Vercel, fusion main ou fermeture globale des lots artistiques P1 dans cette passe.
