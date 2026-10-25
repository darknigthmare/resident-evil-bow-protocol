# R27 — reprises après égalité et conclusions de prototype

Cette recette ajoute douze scénarios ciblés aux preuves R26 sans réexécuter leurs 131 matchs. Elle utilise les scripts du moteur livré, les vies normales, les commandes clavier et le vérificateur de replay d’origine. Elle ne modifie ni positions, ni vie, ni jauges, ni résultats.

Le [rapport détaillé](R27_MATCHES.json) contient **12 matchs complets, 24 reconstructions identiques du combat, dix KO et deux conclusions au chrono**. Les séquences artistiques de conclusion sont distinguées des replays de combat.

## Deux tentatives R26 débloquées par les commandes

Les cas `tie-reset-115` et `tie-reset-005` restent conservés à l’octet dans [R26_MATCHES.json](R26_MATCHES.json). Ils avaient atteint 24 000 frames et 50 égalités chacun, sans dégât ni vainqueur.

R27 reprend exactement les mêmes sujets, seeds, chrono de cinq secondes et deux victoires requises :

| Scénario | Sujets | Changement d’inputs | Résultat observé |
| --- | --- | --- | --- |
| `recover-wesker-cerberus` | Uroboros Albert Wesker → Cerberus | Première manche immobile ; ensuite les deux sujets approchent et dashent, puis seul P1 attaque à portée | Première égalité, deux victoires au chrono, neuf événements de dégâts, 1 450 frames |
| `recover-nemesis-mendez` | Nemesis RE3 Remake → Bitores Méndez RE4 | Même stratégie de commandes, sans changement de règles ou d’état | Première égalité, deux victoires au chrono, neuf événements de dégâts, 1 450 frames |

Les dégâts et déplacements proviennent des commandes réelles. Le chrono court reste une recette contrôlée, sans prétendre être une règle officielle des jeux Resident Evil. Les deux tentatives R26 non terminées ne sont pas réécrites en réussites historiques.

## Conclusion de prototype : autoriser, refuser, passer ou expirer

Quatre matchs Nemesis → Hunter activent les quatre choix de conclusion via `O`, `bas+O`, `avant+O` et `arrière+O`. Une variante cinématique contrôle le multiplicateur de durée natif 1,18. Un autre match à deux victoires requises vérifie que la fenêtre s’ouvre après la fin du match ; aucune fenêtre prématurée n’est observée.

Les six scènes autorisées traversent les phases livrées `approach`, `grapple`, `impact` et `fall`, puis produisent un résultat complet. Ce sont les chorégraphies de prototype du projet. Le garde de compatibilité les qualifie explicitement de `prototype-compatible`, avec `canonical: false`.

Deux autres matchs terminent normalement sans fenêtre de conclusion : Uroboros Wesker → Cerberus est refusé pour `attacker-unreviewed`, et Cerberus → Tyrant remake pour `size-envelope`. Un match passe la fenêtre par `Entrée` ; un autre la laisse expirer selon son délai réel. Aucun de ces quatre résultats ne prétend contenir une scène de conclusion.

## Frontière de la vérification des replays

Les douze combats sont reconstruits deux fois par le vérificateur R24, dans le moteur exact. Il retourne `finisherVerified: false` : les images, sons et phases de conclusion ne sont pas reconstruits par cette API. Le test négatif conserve cette frontière : modifier uniquement l’identifiant de conclusion dans les métadonnées laisse le combat déterministe et ne devient pas une certification de cette conclusion.

Les traces de scène R27 établissent l’exécution en direct des phases de prototype. Elles ne certifient ni animation d’origine, ni anatomie, ni rendu Capcom, ni toutes les associations possibles. Les cas contrôlés utilisent un DOM Node et un Canvas natif ; ce n’est pas une validation d’affichage dans un navigateur ou sur appareil physique.

## Reproduction

Le registre d’entrée inclut les empreintes des scripts de simulation, compatibilité, relecture, harnais et du rapport historique R26. Les adaptateurs de présentation R27 sont vérifiés séparément par leurs propres recettes ; aucune certification de leurs pixels n’est déduite de ces matchs.

```sh
# Validation des preuves conservées, corruptions, trois relectures ciblées
# et reproduction en direct de deux flux de commandes.
node tests/verify-full-matches-r27.mjs

# Réexécution complète des douze nouveaux scénarios, si leurs entrées changent.
node scripts/audit-full-matches-r27.mjs
```

Le rapport de validation est [R27_MATCH_TESTS.json](R27_MATCH_TESTS.json). La commande complète prend environ 33 secondes sur cet environnement cloud avec trois workers ; sa durée n’est pas une mesure de performance d’un appareil cible.
