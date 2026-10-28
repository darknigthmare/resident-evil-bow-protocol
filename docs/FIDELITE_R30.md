# R30 — Sprites natifs, avatars et mouvements complets

388 avatars exact-UID, 204 vues natives et 16 séquences fluides complètes ; 5 familles de boucles neutres sources observées, dont 4 variantes optionnelles jouables. 0 idles natifs qualifiés pour la cible ; 17 chantiers ouverts.

Le [classeur R30](BOW_FIDELITE_R30.xlsx) ajoute sept feuilles aux 49 feuilles R29, dont les XML et relations restent identiques. Le [suivi central](../modules/fidelity-r30/index.html) expose les 17 chantiers ouverts et le catalogue complet de 389 UID.

Les poses natives rendues, les postures de combat admissibles et les vrais cycles idle sont comptés séparément. Une séquence native entièrement échantillonnée à 30 images/s au moins peut être fluide tout en gardant un geste non attribué ou une boucle non vérifiée. Les variantes d’une autre édition restent hors de l’admission cible. Les portraits de sélection ne certifient pas de géométrie, d’animation ou de corps complet.

Les 363 images générées R29, les 22 refus historiques et le refus de révision Tyrant restent conservés. Aucun refus ne devient un nouvel essai de génération par l’ajout de références natives. Aucun chantier n’est déclaré clos ni aucune fidélité globale 1:1 certifiée.

La recette R30 est complète dans son périmètre : {"python_tests": 46, "node_groups": 21, "browser_groups": 30, "definition_checks": 5, "historical_browser_runs": 2}. Les recettes historiques ne sont pas recomptées comme de nouvelles exécutions.

Preuves : [suivi structuré](R30_TRACKING.json), [recette](R30_VALIDATION.json), [export](R30_EXPORT.json), [reproduction](R30_REPRODUCTION.json).

```sh
python3 scripts/fidelity-progress-r30.py build
python3 scripts/fidelity-progress-r30.py check
python3 scripts/fidelity-progress-r30.py export
python3 scripts/fidelity-progress-r30.py reproduce
```
