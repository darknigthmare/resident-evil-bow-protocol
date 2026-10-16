# PR11 / R7 — Replays des duels expérimentaux et clavier

Base exacte : `5fe33a2535fba80dfb6e24d58efa7b934882107c` (R6). Révision de travail R7, paquet 0.7.3. Aucun changement de roster, de statistiques, de capacités ou de dessin de personnage.

## Correction reproduite

Dans R6, cliquer sur Démarrer laissait le focus sur ce bouton. Le gestionnaire clavier ignore volontairement les champs et boutons ; J/K ne déclenchaient donc aucune attaque. La vérification DOM reproduisait `focused=trialStart`, `startsAfterJ=0`.
R7 transfère le focus au canvas après Démarrer, Reprendre ou le clic sur une technique. Le canvas est accessible au clavier, possède une indication de focus et une description des commandes. Les champs de formulaire, boutons et raccourcis du navigateur avec Ctrl/Alt/Meta restent protégés.

## Lecture des duels isolés

Le duel expérimental enregistre ses entrées en mémoire et peut exporter un JSON. Un nouveau moteur de relecture reconstruit le duel depuis sa configuration, sa graine et les commandes ; les décisions adverses et la consommation du générateur pseudo-aléatoire sont recalculées par la même IA.

- Import/export via de vrais fichiers JSON ; aucun accès automatique au disque, au cloud ou aux sauvegardes de campagne.
- Lecture, pause, avance d'une frame, retour au début, accès à une frame et vitesses 0,25/0,5/1/2.
- Modes humain/IA et IA/IA pris en charge ; les replays importés sont en lecture seule.
- Les extraits incomplets restent des extraits, pas des victoires.
- Format borné : 1 Mio et 36 000 frames. Les nombres, masques de commandes, identifiants, arènes et durées sont contrôlés. Les propriétés non prévues et commandes après fin sont refusées.
- L'état final est recalculé puis comparé à une empreinte de corruption. Aucune santé, statistique ou définition de personnage issue du fichier n'est acceptée comme état de jeu.
- Contrat SHA-256 indépendant couvrant le vrai moteur ET l'annexe expérimentale. Il ne remplace pas le contrat des replays principaux. Un fichier d'une version différente est refusé sans modifier le duel courant.
- L'import asynchrone est annulé si l'utilisateur change de sujet ou quitte la page avant la fin de lecture. Un import invalide conserve le match en cours.
- Les commandes non disponibles affichent leur raison et sont désactivées. Un super ne devient pas gratuit pour enregistrer une démonstration.
- Aucune écriture localStorage et aucun message de récompense/progression. La fermeture de l'onglet efface l'enregistrement en mémoire sauf export explicite.

L'empreinte de résultat n'est pas une signature anti-triche. Une personne qui modifie ses propres scripts peut recalculer un fichier ; ce module sert à reproduire et diagnostiquer des duels locaux, pas à certifier une compétition.

## Validation

`tests/verify-catalog-replay-r7.mjs` contient 24 nouveaux groupes : six duels IA complets, 346 sélections, 104 configurations arène/graine, commandes humaines, relecture de l'état complet, retours arrière, fichiers invalides, identité du sujet, focus clavier, reprise après événements de page, import périmé, sauvegardes inchangées.

Les tests utilisent le moteur réel dans Node/VM et des fenêtres DOM contrôlées. Les tests historiques restent distingués des nouveaux résultats. `CATALOG_REPLAY_R7_TESTS.json` est produit par l'exécution, pas par un compteur saisi dans le rapport.

`tests/browser-catalog-replay-r7.mjs` navigue sur le serveur HTTP local avec Chromium, aux largeurs 1440 et 390. Il utilise le clavier, un téléchargement réel, un input fichier et le seek. Les événements pageshow/pagehide sont synthétiques ; aucune certification de BFCache réel ou téléphone/manette physique.
La tentative dans le conteneur local a rencontré ERR_BLOCKED_BY_ADMINISTRATOR. Le même test est exécuté séparément dans GitHub ; seule sa preuve de sortie atteste sa réussite HTTP.

## Périmètre inchangé

115 combattants principaux, 231 prototypes isolés, 43 exercices contextuels, soit 389 identités. Les quatre profils retravaillés par R6 et ses quatre scènes sont conservés. Les données et contrats de combat principal et du journal contextuel sont préservés par SHA-256.
La couverture graphique reste R4 : cinq poses de référence bidirectionnelles par réflexion approuvée, 341 corps sans couverture latérale complète. Aucune nouvelle animation finale, paire anatomique, phase de mutation ou capacité canonique dans R7. Cette passe ne clôt pas le chantier graphique 1:1 de la PR11.

La PR reste un brouillon sans fusion dans main ni promotion Vercel. L'existence d'un dossier Drive ne prouve pas un upload ; le précédent envoi R5 a été bloqué et n'est pas déclaré accompli.
