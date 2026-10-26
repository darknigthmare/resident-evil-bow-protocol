# R27 — gel et reproduction de la livraison

Les premiers exports sont des instantanés provisoires. Le registre des sprites change pendant la queue de génération et les revues : ne pas déclarer ces instantanés comme une livraison finale des 385 cibles. Les états bloqués par l’outil, leurs raisons et les anciennes révisions restent conservés. L’utilisateur a choisi « Conserver les refus, fidélité prioritaire » : ne pas fabriquer une variante édulcorée pour augmenter le nombre de PNG.

## 1. Stabiliser les imports et les revues

Attendre la résolution des demandes en cours, appliquer les revues explicites et reconstruire le registre à partir des fichiers réels :

```sh
python scripts/import-generated-sprites-r27.py
python scripts/import-generated-sprites-r27.py --check
python scripts/build-sprites-jobs-r27.py --check
```

Le mode `--defer-manifest` de la queue conserve les PNG et fiches individuels avant ce gel. Un PNG remplacé par une correction doit avoir sa fiche et son reçu à jour ; un ancien SHA du manifeste fait volontairement échouer l’export. Une révision conservée à part ne devient pas un UID supplémentaire. Les refus réels encore sans sortie restent dans `pending` avec `BLOCKED_BY_TOOL` et leur raison exacte.

## 2. Vérifier le registre final de la galerie

Les tests Python du générateur couvrent des fixtures synthétiques. Le contrôle `--check` ci-dessus mesure les PNG effectifs. Le navigateur doit être exécuté après le dernier gel afin de porter sur le nombre réellement livré :

```sh
python -m unittest discover -s tests -p test_generated_sprites_r27.py -v
node tests/browser-generated-sprites-r27.mjs
```

Le résumé final refuse un rapport de galerie exécuté sur un ancien nombre de fichiers. Les contrôles de rendu de combat gardent leur portée idle, corps complet revu, côté exact et pose `neutral-base` explicitement observée. Le compteur des corps complets est distinct du nombre de poses admissibles : une pose T/de liaison, de présentation, inconnue, frontale ou non revue ne déclare aucun état idle. Le test d’export vérifie qu’un corps entier latéral en `source-bind-pose` reste exclu, y compris si son état est falsifié en `idle`.

## 3. Exporter un instantané explicitement provisoire

```sh
python scripts/build-validation-summary-r27.py --allow-pending
python scripts/build-fidelity-tracking-r27.py
python scripts/export-fidelity-progress-r27.py
```

Le mode `--allow-pending` marque toujours le résumé `provisional: true` et `complete: false`, même si tous les rapports existent. Les échecs ou écarts de compteur sont conservés. Il permet de préparer le tableau final avant son test navigateur ; il ne transforme pas une attente en réussite.

## 4. Vérifier les nouveaux compteurs puis produire l’export strict

```sh
node tests/browser-fidelity-dashboard-r27.mjs
python scripts/build-validation-summary-r27.py
python scripts/build-fidelity-tracking-r27.py
python scripts/export-fidelity-progress-r27.py
```

Le contrôle strict compare aussi les compteurs exécutés du tableau à ceux des manifestes. `complete` concerne les rapports de tests ; `target_generation_complete` indique séparément si les 385 UID possèdent un PNG. `target_generation_attempts_complete` peut être vrai avec des refus enregistrés ; il ne devient jamais une déclaration de 385 fichiers. Les 17 chantiers restent ouverts, les cycles complets et la fidélité globale 1:1 certifiée restent à zéro.

## 5. Reproduire et conserver les preuves

```sh
node tests/verify-r27-integration.mjs
python scripts/build-validation-summary-r27.py --check
python scripts/build-fidelity-tracking-r27.py --check
python scripts/audit-delivery-r27.py
npm run build
```

Reproduire également le classeur dans un autre fichier (`--output` et `--progress`), comparer ses 35 feuilles avec `worksheet_state` de l’exporteur et vérifier l’égalité des octets du JSON de suivi. Les 29 feuilles historiques et leurs relations doivent rester à l’octet. Les horodatages du conteneur ZIP ne constituent pas une égalité de contenu à reproduire.

Le rapport d’intégration et le registre d’addition restent hors des entrées hachées qui les produisent, pour éviter une dépendance circulaire. Après mise en index Git :

```sh
python scripts/audit-delivery-r27.py --check --staged
```

L’auditeur protège les arbres précédents et n’autorise que les adaptateurs HTML additifs, les trois fixtures historiques explicitement isolées et l’ajustement du workflow R26. Ce workflow reproduit son audit de publication au SHA R26 publié ; l’auditeur historique reste inchangé et le lot R27 est contrôlé par son propre auditeur.

## Résultats de code déjà exécutés

Les 605 assertions historiques ont réussi en copie isolée avec les adaptateurs R27 après le gel du plafond 4 MiB et du garde `neutral-base` ; leurs sept SHA sont conservés dans `R27_HISTORICAL_TESTS.json`. Ce rapport identifie aussi le registre de 325 PNG réellement reconstruits dans cette copie, distinct du futur corpus final. Les 48 groupes navigateur historiques (R20/R25/R26) ont également réussi sans réécrire les preuves anciennes du dépôt. Leurs assertions restent intactes. Ces exécutions ne certifient pas les futurs PNG ni les changements de revue de la queue : la galerie et les octets de son registre final doivent encore porter sur le gel effectivement livré.

La recette de douze nouveaux matchs et les modules audio, canonique, mouvements, sources et restauration possèdent leurs propres rapports. Ne pas réexécuter leur audit complet uniquement pour augmenter un compteur ; les reruns restent motivés par des entrées modifiées, un échec ou une inquiétude non résolue.
