# R8 — Manches, résultats et suivi de fidélité

Base vérifiée : d79f9e3ce6d37f91ceb772f0bb457acf34efbf4d (PR11 / R7). Gameplay toujours 0.7.3.

## Livraison de cette passe

Le renderer partagé lit les phases existantes du vrai match par les adaptateurs publics du Versus et du duel expérimental, puis vérifie l'identité exacte de l'acteur. Il ne modifie ni vie, statistiques, RNG, scores, entrées de replay ou sauvegardes.

- Sept états supplémentaires : intro, roundWin, roundLose, roundDraw, matchWin, matchLose, outro. Les 21 états/commandes hérités restent disponibles ; l'atelier en présente maintenant 28.
- Le match n'est présenté comme terminé qu'après `finished=true`. Une manche gagnée, même décisive, conserve son statut de manche pendant le délai du moteur.
- Le repli d'une défaite R1 ne prend jamais le clip historique de défaite finale. Un timeout avec un perdant encore vivant ne produit pas de corps mort. Une égalité ne choisit aucun vainqueur.
- Les flags de locomotion/attaque/hit encore présents dans l'acteur sont masqués pour sa présentation de résultat, sans mutation du vrai acteur.
- L'horloge de fin de manche utilise son événement réel. Le tick est constant en pause, reproductible lors d'un seek, et les tokens de manche empêchent la poursuite d'une animation commencée au round précédent.
- Les anciens clips win/lose peuvent servir uniquement aux états finaux correspondants. Aucune frame n'est synthétisée lorsqu'un état n'a pas de dessin ; la pose provisoire est signalée.
- Les acteurs d'un laboratoire, d'un ancien match ou les objets copiés ne peuvent pas emprunter le résultat d'un match vivant.
- L'intro est raccordée au début du premier round. L'outro est préparée comme état explicite dans l'atelier : aucune nouvelle cinématique de sortie n'est livrée.

## Tests et préservation

19 groupes R8 réussis localement, plus 291 groupes existants réexécutés : 310 réussis, zéro échec. Un match CPU complet à plusieurs manches termine normalement ; les autres états limites sont des fixtures déclarées. Les 1384 combinaisons corps/poses de résultat sont examinées, sans prétendre créer 1384 dessins.
12 fichiers d'identité, gameplay et contrats sont comparés à R7. Contrats de replay principal, expérimental et journal inchangés. Les configurations, statistiques, scènes et ressources graphiques de R7 sont conservées.

Le test navigateur fourni navigue sur le serveur HTTP localhost, utilise deux acteurs pilotés par CPU et capture R1 puis résultat final en 1440/390. Une réussite est déclarée seulement après exécution. Pas de certification de téléphone ou manette physique.

## Ce qui reste ouvert

Aucune nouvelle illustration, nouvelle paire anatomique indépendante, nouvelle animation finale de personnage, nouvelle attaque canonique ou stage ajouté. Les cinq poses de référence bidirectionnelles existantes et les 341 corps incomplets ne changent pas. Aucun finisher source ou mutation terminale ne devient canonique du fait de ce raccord.

Le classeur maître phase 1 (21 onglets) reste accessible par son lien Drive. Un suivi R8 à quatre onglets est réellement ajouté dans docs/planning/. Il distingue raccords testés et lots de sources/art encore ouverts ; il ne remplace pas l'inventaire complet des 346 corps.
