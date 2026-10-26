# R27 — état des contrôles de la livraison précédente

Le [constat conservé](R27_CI_DIAGNOSTIC.json) est une lecture de la [PR #16](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/16), au commit R26 `826f7ed1811c48adc0609f97699eb32f629fc78a`. Il ne décrit pas une exécution du futur commit R27.

Au moment indiqué dans ce constat, 51 des 54 contrôles GitHub Actions avaient réussi, trois étaient en file, aucun n’avait échoué. Les jobs `verify`, `provenance` et `build`, notamment R24 et R26, avaient réussi. Les statuts Vercel des deux projets indiquaient `pending` avec « Vercel is deploying your app ». Ils n’établissent ni une réussite du déploiement ni un blocage par quota à cette révision.

Ces observations distantes n’appelaient aucune correction du commit R26. Un conflit de portée a ensuite été reproduit localement avec les ajouts R27 : l’auditeur de publication R26 refuse correctement les nouvelles insertions HTML et fixtures, car elles ne font pas partie du lot R26 conservé.

Le workflow R26 reproduit désormais cet audit de publication strict dans un worktree temporaire au SHA R26 publié `826f7ed`. L’auditeur original reste inchangé et le contrôle local de ce worktree réussit sur les 1 210 fichiers et 23 feuilles historiques de cette livraison. Les autres suites R26 continuent à tester le checkout courant ; l’auditeur R27 protège les fichiers précédents et vérifie les insertions du lot actuel. Aucune assertion n’est retirée ni aucun ajout R27 déclaré ancien.

Les 605 assertions historiques passent aussi avec les nouveaux adaptateurs dans une copie isolée, après les gardes finaux de pose `neutral-base` et de transport 4 MiB. Les sept entrées de code sont liées à leurs SHA et l’instantané de 325 PNG reconstruit dans cette copie est identifié séparément. Les 48 groupes navigateur historiques ont également réussi. Les rapports de cette copie sont conservés sous les noms R27 ; les fichiers de preuves historiques du dépôt ne sont pas réécrits.

La nouvelle recette de matchs est exécutable en CI avec :

```sh
node tests/verify-full-matches-r27.mjs
```

Elle vérifie la portée et les empreintes du rapport R27, les corruptions, les anciennes égalités, les choix et refus de conclusion, puis reconstruit des combats avec le moteur exact. L’audit complet des douze scénarios n’est utile que si leurs entrées ou règles changent. Les images et sons des conclusions restent hors de la certification de replay.
