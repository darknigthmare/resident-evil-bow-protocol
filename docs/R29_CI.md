# CI et lecteurs de replay — R29

Les recettes R29 vérifient les ressources réellement montées par la sélection, le mode avec évolutions, les Dossiers et les lecteurs de références. Les rapports déjà publiés sont contrôlés avant les nouvelles exécutions ; chaque suite invalide son ancien rapport, exige des tests exécutés et conserve ses résultats propres.

## Corrections démontrées

Le sélecteur R28 utilisait l’URL du document pour construire un lien de combat dans les cadres `srcdoc` opaques employés par les anciens replays. Cette URL ne permet pas une résolution relative. Le sélecteur R29 conserve les contrôles des pages HTTP(S) ordinaires et s’arrête dans ces cadres de reconstruction. Le moteur, la vie, les commandes et les sauvegardes historiques restent dans leur portée.

La suite navigateur R24 originale a reproduit le défaut avec cinq groupes réussis et un échec. Avec le montage corrigé, ses six groupes passent, sans modifier ses assertions. La recette R29 exerce séparément la sélection HTTP, les identités exactes, le mode d’évolution et la reconstruction opaque actuelle. Le rapport lié aux sources exécutées est `docs/R29_SELECTION_BROWSER.json`.

Les rapports de matchs R25, R26 et R27 exigent les SHA de leur HTML et de leur outil DOM d’origine. Les extensions R28 ont modifié ces fichiers. Le nouveau lanceur extrait le commit publié dans un répertoire temporaire, conserve son HEAD et son index Git, puis exécute les assertions originales. Il conserve les journaux et supprime sa copie temporaire. Les recettes exécutées ont passé respectivement six, neuf et neuf groupes.

La validation R27 liait également son ancienne exécution historique aux fichiers de cette publication. Ses quatorze commandes sont exécutées sur `0317da5`. Les dix commandes de publication R28 utilisent `9bcb353`. Les jobs navigateur et build de ces deux publications sélectionnent ces mêmes commits ; le workflow R29 couvre les montages actuels.

Enfin, le classeur R28 a été produit avec le sérialiseur XML optionnel `lxml`. Une installation contenant seulement openpyxl et Pillow ne reproduit pas les mêmes octets. Le défaut a été reproduit en désactivant ce sérialiseur ; un environnement minimal équipé de `lxml==6.1.1` passe ensuite les quatre contrôles de reproduction. Les recettes déclarent Python 3.12, openpyxl 3.1.5, Pillow 12.3.0 et cette version du sérialiseur, en conservant le contrôle binaire du classeur.

## Portée des preuves

`docs/R29_CI_RECOVERY.json` conserve les constats et les exécutions de récupération. `docs/R29_CI_VALIDATION.json` décrit le parsing YAML, les commandes embarquées compilées, les chemins présents et les actions épinglées. Cette recette statique ne constitue pas un résultat de GitHub Actions.

Les images natives sont vérifiées par leurs octets, leurs sources et une reconstruction géométrique indépendante dans Node. La CI ne régénère pas leurs PNG pour exiger l’identité binaire d’un rendu GPU différent. Les actions, la cadence du jeu d’origine et la fidélité globale restent soumises aux limites des manifestes.

Les nouveaux résultats distants et les déploiements doivent être constatés sur le commit effectivement poussé. Les constats locaux ne les remplacent pas.
