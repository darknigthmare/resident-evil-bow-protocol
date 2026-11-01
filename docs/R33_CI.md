# R33 — Validation courante et conservation des versions publiées

La référence R33 est `adb733b9faf10a041c0b4ef5aa115f43ec67dd34`, après fusion de R32. Les [22 workflows observés sur cette référence](R33_CI_STATE.json) sont terminés avec succès, y compris les anciennes recettes navigateur R31 exécutées sur le code courant. Ce constat concerne la base publiée ; il ne constitue ni une exécution R33 ni une preuve de déploiement.

## Sources et commandes courantes

La [garde R33](../scripts/verify-current-r33.mjs) compare l'ensemble du delta à cette référence. Les ajouts sont limités au module R33, à ses outils, tests, documents et workflow. Les anciens moteurs, données, assets, tests, rapports et contrats restent figés. Un chemin livré doit être un fichier régulier, sans lien symbolique ; les ajouts restent sous la limite GitHub de 100 Mio par fichier.

Les seules modifications héritées admises sont le raccordement des commandes dans `package.json`, les deux appels directs de garde dans les workflows R25/R26 et les montages HTML explicitement décrits dans le code de la garde. Le reste de ces fichiers doit conserver les octets de la référence. Les nouvelles commandes de tests n'ajoutent aucune dépendance au moteur du jeu.

La garde R32 et ses 40 cas de faute restent inchangés. R33 vérifie d'abord ses transformations exactes de package et de workflows, puis projette uniquement ce raccordement aux octets R32 **en mémoire**. Tous les autres fichiers soumis à la garde R32 sont lus dans le checkout courant. Ses 40 cas sont ensuite exécutés sur cette projection. Aucun fichier du dépôt n'est restauré artificiellement pour obtenir ce résultat, et aucune assertion fonctionnelle n'est déplacée vers une archive.

Les [nouveaux cas de garde R33](R33_CURRENT_GUARD_TESTS.json) sont comptés séparément des 40 cas R32 conservés. Ils éprouvent notamment les changements de moteur, les données et preuves historiques, les traversées de chemin, les liens symboliques, les fichiers trop volumineux, les pertes de recettes, les montages HTML et les retours des corrections d'entrée, d'évolution ou de galerie.

`npm run verify` conserve les 38 commandes fonctionnelles historiques et les assertions d'entrée R32 sur le code courant, puis les deux assertions de conservation originellement attribuées à l'archive R31. Les neuf recettes de `npm run verify:r32:http` restent courantes et inchangées, tout comme les sept recettes navigateur R31. Les règles d'archive publiées dans R32 restent inchangées.

## Ordre de la recette R33

```sh
npm run verify:r33:delivered
python3 scripts/fidelity-progress-r33.py check
python3 scripts/fidelity-progress-r33.py reproduce
node tests/verify-r33-integration.mjs
npm run verify:r33
npm run verify:r33:http
npm run verify
npm run build
python3 scripts/verify-build-r33.py
```

Les constructeurs `--check` consomment les preuves livrées : ils s'exécutent avant leur invalidation. Le workflow supprime ensuite seulement les onze rapports R33 des tests de source, puis exige que les commandes les recréent réellement avec un nombre positif de contrôles, aucun échec, aucun test ignoré et des empreintes de sources courantes. Les six jobs navigateur appliquent la même exigence à leurs sept rapports. Leurs outils sont fixés à Node 22.16.0, Playwright 1.64.1, Chromium 154.0.8037.57, Canvas 0.1.80 et axe-core 4.14.0.

Les suites originales peuvent écrire leurs anciens rapports de travail. En local, utiliser une copie isolée du checkout courant ou conserver puis restaurer exactement ces sorties après collecte de la preuve d'exécution ; ne pas publier ces réécritures comme de nouvelles preuves historiques. Le workflow R33 place leur exécution après la dernière garde et avant le build.

Les artefacts CI ne copient les rapports que lorsque leur étape de test a commencé. Une erreur d'installation ne publie donc pas les JSON livrés dans le dépôt comme de nouveaux résultats. La [validation des définitions](R33_CI_VALIDATION.json) analyse les workflows et compile leurs vrais blocs de commandes ; elle distingue explicitement ce contrôle de définition des résultats de gameplay et de l'exécution distante R33.

Les scripts de validation n'effectuent aucune génération d'image, recherche réseau de référence, synchronisation cloud, fusion de branche ou publication manuelle. La fidélité artistique et les critères Excel restent établis par les preuves de leurs lots respectifs.
