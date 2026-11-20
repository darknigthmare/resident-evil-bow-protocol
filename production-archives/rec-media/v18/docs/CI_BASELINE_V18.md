# CI observée sur la base V18

**Commit observé : `8073338896937faef6f1718387c1c9b3a4be6b72` — PR de continuation : #23.**
Observation UTC : 2026-11-20T16:56:42.557050+00:00.

Ces résultats concernent les exécutions **push de main 8073338**, après fusion de la PR22. Ils ne décrivent ni le commit initial 935f447 de la PR23, ni les futurs médias V18.

## Résultat vérifié

La collection GitHub retourne **24 workflows terminés : 17 succès et 7 échecs**. Les sept logs des jobs défaillants ont été lus. Deux causes sont observées : six rejets par le garde R34 déjà documentés, et un délai dépassé pendant l’installation des outils R23.

| Workflow | Run / job | Étape en échec | Cause observée |
|---|---|---|---|
| R28 | [Run 44754779397](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779397) / [job 136351531047](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779397/job/136351531047) | Validate current engine and historical assertions before report generation | Garde R34 : ajout d’archive hors liste autorisée. |
| R23 | [Run 44754779399](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779399) / [job 136351530899](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779399/job/136351530899) | Install evidence tools | Installation de ffmpeg : délai de 10 min dépassé. |
| R34 | [Run 44754779402](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779402) / [job 136351532376](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779402/job/136351532376) | Verify current tooling and media, then published R34 receipts before report refresh | Garde R34 : ajout d’archive hors liste autorisée. |
| R26 | [Run 44754779510](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779510) / [job 136351531213](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779510/job/136351531213) | Verify the reviewed current delta before any R26 report refresh | Garde R34 : ajout d’archive hors liste autorisée. |
| QA | [Run 44754779555](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779555) / [job 136351530792](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779555/job/136351530792) | Run npm run verify | Garde R34 : ajout d’archive hors liste autorisée. |
| R25 | [Run 44754779968](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779968) / [job 136351533481](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754779968/job/136351533481) | Verify the reviewed current delta before any R25 report refresh | Garde R34 : ajout d’archive hors liste autorisée. |
| R32 | [Run 44754780124](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754780124) / [job 136351532989](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44754780124/job/136351532989) | Check the current delta and input regression before any report refresh | Garde R34 : ajout d’archive hors liste autorisée. |

## Six rejets du périmètre R34

Les workflows QA, R25, R26, R28, R32 et R34 rencontrent tous cet extrait exact :

```text
AssertionError [ERR_ASSERTION]: Unknown R34 addition: production-archives/rec-media/CI_CHECKPOINT2_20261120.json
at validateSnapshot (.../scripts/verify-current-r34.mjs:257:92)
```

Le [garde lu sur la base](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/8073338896937faef6f1718387c1c9b3a4be6b72/scripts/verify-current-r34.mjs) vérifie les ajouts avec `allowedAddition`. Le chemin d’archive montré est le premier rejeté ; le log ne fournit pas une liste exhaustive des fichiers qui seraient rejetés ensuite. Les vérifications en aval ont été sautées et ne sont pas comptées comme réussies.

Cette même assertion et ce même chemin figuraient déjà dans la [preuve avant V16](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/8073338896937faef6f1718387c1c9b3a4be6b72/production-archives/rec-media/v16/docs/CI_PARENT_6599F75.json). Le workflow R34 comporte aussi **trois jobs navigateur réussis** sur cette base ; ils ne transforment pas le workflow global en succès.

## R23 : installation interrompue avant les tests

Le job R23 a installé Pillow, openpyxl et les paquets npm, puis a lancé `apt-get install -y ffmpeg` parce que `ffprobe` n’était pas disponible. Il était encore en train de télécharger les dépendances lorsque la limite de 10 minutes de l’étape a été atteinte. Le log se termine sur :

```text
2026-11-20T14:47:20.0803829Z ##[error]The action 'Install evidence tools' has timed out after 10 minutes.
2026-11-20T14:47:20.1095918Z {"reports":0,"completedChecks":0,"failedChecks":0}
```

La [configuration R23 de cette base](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/8073338896937faef6f1718387c1c9b3a4be6b72/.github/workflows/source-fidelity-r23.yml) impose bien `timeout-minutes: 10` à cette étape. Le runner observé est `ubuntu-26.04`, image `20261116.202.1`. Aucun test R23, classeur de preuve ou build n’a été exécuté après cette interruption. Le log établit un délai d’installation dépassé ; il ne démontre ni incompatibilité permanente de paquet, ni défaut de jeu, ni régression d’une assertion R23.

## Traçabilité et limites

Le JSON associé contient les 24 URLs de run, les sept URLs de job/log, les étapes sautées, les extraits horodatés, les SHA-256 des logs complets, la preuve du commit effectivement extrait et les SHA-256 des sources de garde consultées. Les logs complets et les réponses API sont conservés hors du dépôt dans le dossier de travail `ci-baseline-v18`.

Aucun garde, test, workflow ou fichier runtime n’a été modifié. Aucune relance CI n’a été déclenchée. Cette preuve de base ne vaut pas validation d’un futur commit V18.
