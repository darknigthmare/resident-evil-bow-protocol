# Resident Evil Combat — continuation V16 du 20 novembre 2026

La continuation reprend le head `6599f75c88472351aacaf19e7a6b1197e6c58625` de la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22). Elle ajoute **11 PNG V16 : 8 poses candidates, 3 essais conservés, 5 identités RE5**. Tous ont été générés pendant cette passe ; aucune récupération de PNG ancien ni aucun refus d’outil ne vient modifier ce compte.

## Résultat du lot

| Identité | Candidats nouveaux | Essais nouveaux | Progrès vérifié |
| --- | ---: | ---: | --- |
| Executioner RE5 | 1 droite | 2 | Direction droite, prise anatomique de la hache corrigée, arme entière ; dos et bottes documentés par le modèle natif retrouvé. |
| Chainsaw Majini RE5 | 1 gauche | 1 | Prise correcte et asymétries préservées ; complète la droite R34 déjà existante. |
| Giant Majini RE5 | 2, gauche et droite | 0 | Pointe de massue récupérée dans une référence complète du même rendu ; deux poses indépendantes. |
| Adjule RE5 | 2, gauche et droite | 0 | Variante sombre canine à tête non scindée ; référence entière retrouvée. |
| Licker β RE5 | 2, gauche et droite | 0 | Référence RE5 complète avec les griffes auparavant coupées ; langue non déployée. |
| **Total** | **8** | **3** | **11 PNG, 5 UID ; trois nouvelles paires dans V16.** |

Le [README V16](v16/README.md) donne les liens des images. Le [manifeste V16](v16/manifests/ASSET_MANIFEST_V16.json) relie chaque PNG à son prompt, son rapport technique et sa revue indépendante. Les essais de prise ou d’asymétrie restent exclus des candidats et conservés sans retouche.

## Inventaire cumulatif

L’[inventaire structuré](CONTINUATION_V16_20261120.json) conserve **346 identités** : seules les **5 entrées ayant reçu de nouveaux PNG** sont actualisées ; les **341 autres entrées** sont reprises sans changement de valeur. Les catégories, preuves de baseline, décisions de hold et refus historiques restent inchangés. Les entrées contextuelles précédemment séparées ne sont pas ajoutées au roster.

| Corpus archivé | PNG | Candidats visuels | Essais |
| --- | ---: | ---: | ---: |
| Point précédent, V5–V11 et V14–V15 | 98 | 69 | 29 |
| Ajout V16 | 11 | 8 | 3 |
| **Total après V16** | **109** | **77** | **32** |

Ce total compte des images, dont des directions opposées, des essais et les décors V5 ; il ne représente pas 109 personnages. Les 44 PNG historiquement annoncés pour V12/V13 restent non retrouvés et ne sont comptés nulle part. Les snapshots du 19 novembre et de la première reprise du 20 novembre demeurent intacts.

## Sources encore attendues

La [synthèse des onze identités auditées](v16/docs/SOURCE_DECISIONS_V16.json) sépare les cinq sources désormais utilisables et les cinq attentes conservées ; Big Man est audité hors besoin de nouvelle génération.

| Cible | Point précis restant à établir |
| --- | --- |
| Sweeper CODE:Veronica 2000 | Corps complet du modèle final avec provenance d’édition vérifiée ; le crop du catalogue correspond au rendu Darkside. |
| Moth CODE:Veronica 2000 | Plateforme des captures retrouvées et détails ventraux ; la nouvelle silhouette entière ne suffit pas à certifier l’édition exacte. |
| Bat CODE:Veronica 2000 | Nouvelle vue indépendante de l’aile, et non une autre copie du contour déjà connu. |
| Eliminator blanc RE0 2002 | Bas du corps complet provenant de l’édition originale ; le port Left 4 Dead 2 retrouvé est édité et non daté côté source. |
| Gatling Gun Majini gauche | Prise et raccords des bras clairement établis par une nouvelle référence gauche ; trois essais V8 restent non admis. |

La droite Gatling R34 et la droite Big Man R34 ont été réexaminées. Big Man dispose déjà de sa gauche V8. Ces fichiers existants ne sont ni regénérés ni ajoutés au décompte des nouvelles images. Le statut historique des essais gauches Gatling dans l’inventaire est conservé, avec cette preuve supplémentaire dans l’audit.

## Contrôles et limites

Le [journal V16](GENERATION_LEDGER_V16_20261120.json) décrit onze appels produisant onze images. Le [contrôle d’intégrité](V16_VALIDATION_20261120.json) compare les octets originaux, SHA256, métadonnées alpha, liens des reçus, comptes et valeurs protégées de l’inventaire. Chaque image a aussi été examinée visuellement sur un vrai fond composite gris et clair. Aucun miroir logiciel ni retouche des PNG n’a été appliqué.

Les poses restent statiques et les marges varient ; les rapports mentionnent les demandes de padding non atteintes, les occlusions naturelles et les surfaces interprétées. Aucune certification de fidélité 1:1, d’animation ou d’admission moteur n’est émise. Les fichiers runtime, gardes, tests et workflows ne sont pas modifiés.

La [preuve CI du parent 6599f75](v16/docs/CI_PARENT_6599F75.json) établit 19 workflows réussis et six échoués. Les six échecs atteignent la même assertion `Unknown R34 addition: production-archives/rec-media/CI_CHECKPOINT2_20261120.json`. Les trois jobs navigateur R34 réussissent ; les étapes aval sautées ne sont pas déclarées validées. Ces résultats appartiennent au parent et à son merge synthétique de PR, pas automatiquement au commit V16 à venir.

Les refus antérieurs, dont Yawn et Regis Licker, sont conservés sans nouvelle tentative. **L’ensemble des personnages manquants n’est pas déclaré terminé.** Ce point de continuation ferme le lot V16 vérifiable et documente les sources encore insuffisantes.
