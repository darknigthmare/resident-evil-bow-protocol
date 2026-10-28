# R31 — Tous les chantiers ouverts, répartis en lots

7/7 lots livrés dans leur périmètre ; 17 chantiers attribués et toujours ouverts ; 389 incarnations reliées aux preuves et audits R31. Les médias et leurs qualifications restent distincts ; fidélité globale 1:1 non certifiée.

Le [classeur R31](BOW_FIDELITE_R31.xlsx) conserve exactement les 56 feuilles R30 et leurs relations. Sept feuilles suivent les responsables, livraisons, nouveaux fichiers et critères encore ouverts. Le [suivi central](../modules/fidelity-r31/index.html) donne accès aux preuves de chaque lot.

Une livraison partielle ne clôt aucun chantier : rendu généré, source native, référence documentaire, geste observé, édition et cycle idle qualifié restent des preuves différentes. Les 22 refus initiaux et le refus de révision Tyrant sont conservés. Les acquis R30 ne sont pas recomptés comme nouveaux.

La recette est complète dans son périmètre : {"browser_groups": 57, "node_groups": 77, "python_tests": 65, "definition_checks": 5, "historical_ci_recovery_runs": 2}. Les sorties après export restent séparées pour éviter les dépendances circulaires de SHA.

Preuves : [lots](R31_LOTS.json), [suivi structuré](R31_TRACKING.json), [recette](R31_VALIDATION.json), [export](R31_EXPORT.json), [reproduction](R31_REPRODUCTION.json).

```sh
python3 scripts/fidelity-progress-r31.py build
python3 scripts/fidelity-progress-r31.py check
python3 scripts/fidelity-progress-r31.py export
python3 scripts/fidelity-progress-r31.py reproduce
```
