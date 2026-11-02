# R34 — portraits, poses entières et sélection

306/346 portraits générés (305 admis), 128/346 poses générées (114 admises). Parcours personnages→stage : DONE. Les 17 chantiers historiques restent ouverts ; fidélité globale 1:1 et animations originales non certifiées.

Le [classeur R34](BOW_FIDELITE_R34.xlsx) conserve exactement les 70 feuilles R33 et leurs relations XML ; quatre feuilles suivent les 3 objectifs, les 692 sorties demandées, leurs preuves et la validation. Les refus restent documentés. Les corps générés sont des poses fixes ; ils ne valident pas les anciens chantiers d’animations originales.

Projection : False. États de production tous renseignés : True. Validation technique courante : True. Les références de secours conservées sont distinctes des nouveaux PNG et des sorties admises.

[Suivi](R34_TRACKING.json) · [Validation](R34_VALIDATION.json) · [Export](R34_EXPORT.json) · [Reproduction](R34_REPRODUCTION.json)

```sh
python3 scripts/fidelity-progress-r34.py build
python3 scripts/fidelity-progress-r34.py check
python3 scripts/fidelity-progress-r34.py export
python3 scripts/fidelity-progress-r34.py reproduce
```

Pendant la production, ajouter `--preview` à ces commandes pour conserver explicitement les états en attente. Les tests après export, les 723 tests core, les résultats historiques et les compatibilités restent hors du cumul R34 afin d’éviter les cycles de preuves.
