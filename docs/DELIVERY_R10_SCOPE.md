# R10 — Intro des essais et compatibilité des conclusions

**Livraison locale uniquement**, préparée sur PR #11 / R9, commit `58b311b73a7890fe55a073515e5a2cbf2009a6b8`. La connexion GitHub exposée dans cette session fournit la lecture, pas les actions d’écriture. Aucun push, commentaire, modification de PR, fusion, upload Drive ou déploiement n’a été effectué pour cette livraison. Le gameplay garde son numéro 0.7.3 ; R10 est une révision locale.

## Lots techniques validés localement

1. Le vrai bouton DÉMARRER du duel expérimental déclenche une intro de présentation de 100 ticks. Pause, reprise, avance d’un tick et bouton PASSER L’INTRO sont raccordés. Entrée dans la zone de combat passe également l’intro. Cette durée et la mise en page sont des choix du prototype, pas des données Capcom.
2. Le moteur, son timer, les projectiles et le replay restent à la frame zéro pendant l’intro. Les décors suivent le temps de combat, pour éviter un retour en arrière à la fin de l’intro. L’outro R9 est conservée. `reset(true)` reste l’API technique de démarrage direct pour les tests ; `startPresented()` et le bouton utilisateur jouent l’intro. Une lecture de replay commence directement à sa frame zéro d’origine.
3. Les attaques et déplacements saisis pendant l’intro sont ignorés. Un axe manette maintenu doit revenir au neutre après l’intro pour commencer à déplacer le personnage. Un import invalide ne change ni l’intro ni le combat ; un import valide retire l’intro et ouvre le replay en pause. Les contrats expérimentaux et contextuels sont inchangés.
4. La compatibilité d’une conclusion est contrôlée avant l’ouverture de sa fenêtre ET avant sa mise en scène. Les métadonnées `victimRule:any` héritées ne constituent plus une autorisation universelle. Les gabarits non qualifiés, les projections, sujets collectifs, organismes fixes, géants, corps mécaniques et autres cas exclus reviennent à une victoire normale. Les conditions de vainqueur final, de première manche et de crédit unique restent actives.
5. L’archive `finishers.html` propose un sélecteur de victime et affiche le motif du refus ou l’autorisation de **prototype**. Aucune scène ou victoire n’est créée depuis cette archive.

## Ce que le filtre ne certifie pas

`src/finisher-compatibility-r10.js` utilise les **enveloppes et classes déclarées par le prototype**, pas des mesures canoniques. Les classes ambiguës sont refusées par prudence. Les seuils de taille sont des limites techniques choisies pour les anciennes scènes génériques. Les 460 définitions sont conservées, mais certaines ne sont plus disponibles dans certains duels tant qu’une chorégraphie adaptée n’existe pas. Les personnages ne gagnent ni nouvelle capacité ni nouvelle anatomie.

La règle calcule 52 900 combinaisons (115 attaquants × 115 victimes × quatre définitions). Ce sont des évaluations de règles, pas 52 900 animations visualisées ou parties jouées. Le JSON de matrice contient les victimes autorisées pour chaque sujet et le lot P1 `F-{UID}-FIN` associé.

**Aucun dessin, paire latérale indépendante, animation finale, mise à mort officielle, super canonique ou moveset exhaustif supplémentaire n’est livré.** Les 115 profils principaux, les 231 prototypes isolés, les 43 exercices, les paramètres, les scènes et les 508 ressources graphiques sont conservés. Les lots P1 graphiques et lore restent ouverts. L’Excel R10 complète R8/R9 sans les remplacer.

## Validation et limites

- 16 nouveaux groupes Node : horloges, huit notions de sécurité du passage à l’intro, sélection de 346 sujets, règle de conclusion, isolation et conservation de 518 fichiers dont les 508 ressources.
- 24 scénarios Chromium **hors ligne**, répartis sur 1440/390 pixels : JS, CSS et Canvas réels avec ressources locales servies en mémoire. Ils couvrent le clavier natif, intro/pause/skip, deux exécutions CPU comparées avec/sans intro, outro, imports, entrée manette simulée, conclusions permises/refusées, résultat normal d’un duel incompatible et archive.
- Les verdicts des tests de lancement de conclusion sont préparés et signalés ; les duels CPU de déterminisme et de sortie normale ne le sont pas. Aucun téléphone ou périphérique manette physique n’est testé.
- **366 groupes exécutables locaux réussis, zéro échec** : les 350 acquis de R9 et les 16 nouveaux groupes R10. Les suites ont été exécutées par lots bornés, après expiration d’une commande monolithique ; il ne s’agit pas d’une nouvelle exécution CI GitHub. Le rendu natif des tests historiques utilise le repli skia-canvas déjà disponible dans le système de tests. Le test de structure lore, les trois contrats de replay, le registre graphique et la compilation statique réussissent aussi.
- La navigation HTTP Chromium a renvoyé `ERR_BLOCKED_BY_ADMINISTRATOR`. Aucun réglage administrateur n’a été contourné : les captures et scénarios R10 sont explicitement hors ligne.
- Les tests historiques de focus passent explicitement l’intro avant leurs actions de combat, sans retrait d’assertions ; le test de conclusion des opérations sélectionne une route fixe dont la première victime est compatible, au lieu d’une victime aléatoire. Le test de raccordement R8 vérifie le mapper commun derrière le nouveau branchement d’intro. Les modifications du contrôleur sont protégées par empreintes avant/après. La CI distante reste à exécuter après application du patch.

## Fichiers

- `src/trial-intro-r10.js`, intégration dans `src/catalog-duel-v070.js` et `catalog-duel.html`.
- `src/finisher-compatibility-r10.js`, garde dans le contrôleur principal et filtre dans l’archive.
- `tests/verify-delivery-r10.mjs`, `tests/browser-delivery-r10.py` et résultats dans `docs/` et `qa-delivery-r10/`.
- `docs/planning/BOW_PR11_SUIVI_R10.xlsx` : cinq onglets, lots techniques locaux, gabarits, sources et preuves.
- `docs/FINISHER_MATRIX_R10.json`, `docs/DELIVERY_R10_BASELINE.json` et `docs/DELIVERY_R10_CHANGES.json`.

Le contrat des replays principaux est actualisé pour inclure le garde de conclusion et ses données. Les anciens replays principaux doivent être conservés avec leur version d’origine ; ils ne sont pas supprimés.

## Références consultées le 19 octobre 2026

- MDN, Page Visibility API : https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API — distinction visibilité/focus et suspension des horloges d’onglets masqués.
- Capcom, entretien sur Nemesis (PlayStation Blog) : https://blog.playstation.com/archive/2020/05/15/making-a-monster-how-nemesis-was-brought-to-terrifying-life-in-resident-evil-3/ — cadre pour distinguer remake, incarnation et adaptation Resistance. Cette source n’est pas présentée comme une validation de tous les gabarits.
