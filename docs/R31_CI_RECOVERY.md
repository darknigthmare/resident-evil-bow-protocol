# R31 — Réparer les recettes CI historiques

Deux jobs sur le commit R30 `12cdd7e38b5785cb9fbbb3fe3dff8d0f7f41fa24` ont échoué : le job de provenance R30 à l’étape des tests et le job navigateur historique R20. Les erreurs ont été reproduites localement dans les snapshots Git publiés, avec les sources de tests inchangées. Les téléchargements de journaux GitHub ont été refusés après redirection vers Azure Blob ; cette voie a été arrêtée. Les preuves ci-dessous proviennent des exécutions locales réelles.

Le [rapport structuré](R31_CI_RECOVERY.json) lie les workflows, commandes, sorties et snapshots par empreinte. Les fichiers de diagnostic marqués `expectedFailure:true` conservent les erreurs avant réparation.

## Dépendance du rapport de mouvement R30

La CI supprimait `R30_NATIVE_OTHER_MOTION_RIG_TESTS.json`, exécutait ensuite `test_native_other_r30.py`, puis créait le rapport indépendant Node. Le test Python `test_independent_full_mesh_reconstruction_covers_all_native_motion` doit lire cette preuve : l’ordre initial produit donc `FileNotFoundError`.

[Exécution initiale](R31_CI_EVIDENCE/r30-original/execution.json) et [trace exacte](R31_CI_EVIDENCE/r30-original/command-03.txt).

Le workflow exécute maintenant `node tests/verify-native-other-motion-r30.mjs` avant son consommateur Python. Le test, ses assertions et les fichiers natifs ne sont pas modifiés.

## Rapport d’export R30 absent

Après le premier réordonnancement, toutes les commandes de test passent. L’exigence suivante de neuf rapports frais échoue néanmoins : `tests/test_fidelity_r30.py` termine avec `unittest.main()` et ne crée pas le fichier `R30_EXPORT_TESTS.json` qui venait d’être supprimé.

[Exécution réordonnée](R31_CI_EVIDENCE/r30-reordered/execution.json) et [erreur du contrôle de fraîcheur](R31_CI_EVIDENCE/r30-reordered/command-10.txt).

Un [wrapper du vrai runner unittest](R31_CI_EVIDENCE/export-report-wrapper.py.txt), identique au bloc Python intégré dans le workflow, exécute les onze tests publiés et consigne leurs résultats réels, leurs noms, les éventuels échecs et les empreintes des sources. Il conserve les rejets d’échec, de suite vide et de test ignoré. L’exigence originale de neuf rapports frais reste exécutée.

L’[exécution réparée](R31_CI_EVIDENCE/r30-repaired/execution.json) passe onze commandes : 46 assertions Python, 21 groupes Node natifs, neuf groupes d’intégration et la vérification finale des neuf rapports. Le [plan exécuté](R31_CI_EVIDENCE/r30-repaired/commands.json) est conservé avec ses octets exacts. La piste d’un problème de SHA d’intégration après régénération n’a pas été confirmée : les neuf groupes d’intégration passent dans la reproduction réordonnée.

## Ancien canvas R20 et nouveaux avatars

Sur le snapshot R30, `verify:r20:http` passe les 17 groupes du menu puis les 16 groupes du shell joueur. La seconde vérification des sprites historiques attend ensuite que le canvas d’un sujet sans sprite R20 redevienne visible. Les avatars R30 affichent volontairement un portrait pour cette identité et cachent ce canvas. Le contrôle historique attend donc un état d’interface antérieur.

[Trace sur R30](R31_CI_EVIDENCE/r20-current-r30/command-00.txt).

Le job `.github/workflows/interface-r20-browser.yml` conserve désormais sa version publiée après revue, `545b10d17c49fcca47a03281bf1099a26c7b1ce1`. Les trois suites originales y passent, soit **41 groupes navigateur : 17 menu, 16 shell et 8 sprites**. [Trace et résultats](R31_CI_EVIDENCE/r20-published/command-00.txt).

Les vérifications des montages actuels, des avatars, des variantes générées et du budget partagé restent dans les suites R31. Le fait de reconstruire l’interface historique ne valide pas à lui seul l’interface courante.

## Périmètre de la réparation

Les seuls anciens fichiers modifiés sont les deux définitions de workflow :

- `.github/workflows/source-fidelity-r30.yml` conserve son snapshot R30, produit la preuve Node avant son consommateur et écrit le vrai rapport d’export.
- `.github/workflows/interface-r20-browser.yml` conserve le snapshot publié R20 correspondant aux assertions historiques.

Aucun test publié Python/Node, modèle, PNG, classeur ou moteur n’est modifié. Les résultats distants seront ceux des nouvelles exécutions Actions après publication ; les réussites locales ne sont pas présentées comme une CI distante déjà verte.
