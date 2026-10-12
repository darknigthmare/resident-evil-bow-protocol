# B.O.W. Protocol v0.6.1 — Containment Continuity

## Contenu conservé
115 incarnations jouables, 1 150 commandes, 115 Dossiers / 920 essais, 460 conclusions stylisées, 389 entrées de catalogue et 52 configurations d’arène. Aucun nouveau combattant ou pouvoir canonique n’est ajouté par cette version.

## Changements jouables
- Reprise des opérations Arcade, Survie, Boss Rush, Apex, E-001 Family et Uroboros. Un duel interrompu recommence à son état de départ avec la même route, graine, difficulté et santé initiale. Après une victoire réelle, la reprise passe au prochain duel sans attribuer la victoire deux fois.
- Deux copies locales à révision et empreinte d’intégrité ; récupération de la dernière copie valide, import/export JSON contrôlé, détection des changements d’un autre onglet. Le contrôle d’intégrité protège des corruptions accidentelles, pas de la triche. Il ne s’agit pas d’un verrou transactionnel multi-onglets ni d’une sauvegarde cloud.
- Une opération terminée ou perdue efface son point de reprise. Les Dossiers et records antérieurs ne sont pas supprimés. Le lancement d’un nouveau parcours remplace explicitement la reprise.
- Résultats de duel : cohérence gagnant/perdant/numéro de joueur, santé et corrélation de requête ; le bouton Suivant ne saute plus un combat non validé.
- Replays : empreinte SHA-256 des sources de gameplay et des données. Un replay ancien sans contrat ou incompatible est refusé avant toute modification du combat ; son fichier n’est pas effacé. Le lire dans la version d’origine.
- Banc d’essai `laboratory.html` : chaque commande s’exécute dans le vrai moteur, avec pause, pas de simulation, accès au démarrage, adversaire mannequin, garde haute/basse, saut, orientation, distance, vitesses et volumes de collision. Ressources et conditions de test sont annoncées. Le banc ne décerne ni victoire ni récompense.
- Archive `finishers.html` : les 460 conclusions existantes sont consultables et filtrables ; remplacement du lien hérité cassé. Ce ne sont pas 460 nouvelles animations.
- Archive de techniques : liens TESTER, directions relatives AVANT/ARRIÈRE et affichage simultané des deux coûts lorsque nécessaire.
- Livraison autonome : suppression de la redirection des assets vers un ancien déploiement Vercel ; les fichiers fournis accompagnent le nouveau build.

## Fidélité et limitations
Les formes et leurs capacités existantes sont conservées. Les commandes, frames, dégâts, ressources et affrontements croisés restent une adaptation 2D. Le banc d’essai expose ces règles réelles mais ne transforme pas leur classification documentaire en preuve canonique.
16 références RE5 et six composites E-001 restent provisoires. Les animations propres à chaque technique, points faibles spatiaux et mutations scénarisées ne sont pas livrés par cette passe. Le catalogue contient encore 274 entrées non jouables et n’est pas exhaustif de toute la franchise.

## Validation
97 contrôles exécutables réussis : moteur 26, opérations/pages 22, interface 13, RE5 17, continuité 19.
Les 1 150 commandes ont été déclenchées au démarrage prévu par le moteur ; cela ne certifie pas qu’elles touchent toutes un adversaire dans toute position. Les 460 conclusions sont couvertes par les tests d’archive.
Dix rendus/interfaces hors ligne dans Chromium (cinq pages, largeurs 1440 et 390) ne présentent aucune erreur JavaScript ni débordement horizontal du document. Les tableaux restent défilants. Le navigateur a reçu les fichiers locaux en mémoire ; la navigation HTTP et les iframes réseau n’ont pas été vérifiées dans ce contrôle. Les parcours et sauvegardes sont testés séparément dans les fenêtres DOM contrôlées avec le vrai moteur.
