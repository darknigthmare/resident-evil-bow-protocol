# R33 — Lots parallèles et critères ouverts

6/6 lots livrés dans leur périmètre ; 17 chantiers attribués et toujours ouverts ; 27 incarnations avec ajouts R33. Fidélité globale 1:1 non certifiée.

Le [classeur R33](BOW_FIDELITE_R33.xlsx) conserve les 63 feuilles R31 et leurs relations octet par octet. Sept nouvelles feuilles suivent les responsables, les 389 UID, les preuves et leurs éditions, puis la recette. Les ajouts R32 au moteur et à l’interface restent conservés dans le dépôt courant.

Les objets de preuve ou d’audit sont un total agrégé des liens exacts aux incarnations. Ils ne comptent pas des personnages terminés, des corps natifs supplémentaires ou des idles originaux. Les refus de génération initiaux et la révision Tyrant restent conservés.

La recette est complète dans son périmètre exécuté : {"python_tests": 57, "browser_groups": 56, "node_groups": 49, "guard_checks": 39, "definition_checks": 6}. Les résultats après export et les exécutions d’archives sont séparés pour éviter les cycles d’empreintes et les doubles comptes. Les critères sans preuve restent ouverts.

[Suivi central](../modules/fidelity-r33/index.html) · [Lots](R33_LOTS.json) · [Suivi structuré](R33_TRACKING.json) · [Recette](R33_VALIDATION.json) · [Export](R33_EXPORT.json) · [Reproduction](R33_REPRODUCTION.json)

```sh
python3 scripts/fidelity-progress-r33.py build
python3 scripts/fidelity-progress-r33.py check
python3 scripts/fidelity-progress-r33.py export
python3 scripts/fidelity-progress-r33.py reproduce
```
