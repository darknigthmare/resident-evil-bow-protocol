# R5 — Chargement des visuels et reprise après erreur

Base exacte : `218c31c371e6caf0877667389b8d160d3f257b9f`, PR #11. Gameplay conservé en 0.7.3 ; inventaire graphique inchangé en révision 4.

## Corrections du renderer partagé

- Une requête d'image bloquée expire après 15 secondes. Elle libère sa place parmi les six chargements simultanés et termine son préchargement avec un échec explicite. Les images suivantes peuvent charger ; une URL absente ne bloque pas indéfiniment la sélection.
- Les événements tardifs d'une tentative expirée ne peuvent plus terminer une nouvelle tentative. Les temporisateurs et callbacks sont nettoyés à la fin de chaque essai.
- Les erreurs de chargement survivent à l'éviction du bitmap. La même URL n'est plus téléchargée à chaque redessin. Le registre garde au plus 512 erreurs, distinguées par type (portrait/sprite/décor) et chemin.
- Réessayer démarre une nouvelle génération de tentatives. Une erreur reste affichée jusqu'au chargement réussi du type et du chemin concernés. Une réussite du portrait ne cache pas une erreur du sprite.
- Si la lecture des pixels est interdite, le détourage ne réessaie plus à chaque frame. Le canvas temporaire est libéré et l'image d'origine reste dessinable ; aucune politique CORS n'est contournée. Une nouvelle image ou un changement de tolérance autorisée permet un nouvel essai.
- Si une référence préparée est absente, la direction, le miroir et l'ancrage sont recalculés pour son original. Le miroir de la référence en panne n'est pas réutilisé aveuglément.
- L'atelier `directions.html` comporte un bouton accessible RÉESSAYER LES VISUELS, un état de chargement/erreur et une description sans compteur graphique historique figé.

## Sauvegarde complète

Les archives de livraison sont désormais créées comme ZIP avant leur transport par GitHub Actions. Cela conserve aussi les fichiers suivis commençant par un point (`.github/`, `.gitignore`, etc.), auparavant omis par le transport par défaut de dossiers d'artefacts. Le packager vérifie la reconstruction fichier par fichier contre `git archive` avant la publication des paquets. Il archive uniquement les fichiers suivis du dépôt, pas les caches locaux, tokens ou dépendances installées.

## Preuves et limites

Seize nouveaux groupes de tests exécutent le vrai code dans une VM Node, avec transport d'images, temporisateurs et canvas d'enregistrement contrôlés. Sur la base R4, treize de ces groupes échouent ; après correction, les seize passent. Ce sont des tests de panne et de contrat, pas une certification graphique. La CI réexécute séparément l'ensemble des suites existantes.

Le test navigateur R5 navigue sur le vrai serveur HTTP local dans Chromium, aux largeurs 1440 et 390. Il injecte explicitement une réponse 503 sur le PNG préparé de la hyène, vérifie l'original de secours puis la récupération via le vrai bouton. Ce scénario ne représente ni une panne observée en production, ni une certification sur téléphone/manette physique.

Les 346 définitions de corps, leurs statistiques, collisions, données d'animation, contrats de combat/journal et les 508 ressources sont comparés aux empreintes de la base. Aucun nouveau dessin, pixel modifié, pouvoir biologique, personnage ou animation finale. La couverture demeure celle de R4 : cinq poses de référence bidirectionnelles (par réflexion approuvée), 341 corps sans couverture latérale complète, aucune paire anatomique indépendante nouvelle. Les 43 exercices contextuels restent hors de ce comptage.

Référence technique : MDN, « Use cross-origin images in a canvas », https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image (consulté le 16 octobre 2026). Une erreur de lecture de pixels doit respecter la politique du navigateur, pas la contourner.
