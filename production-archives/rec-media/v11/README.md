# Resident Evil Combat — reprises de direction V11

**Deux vues droites sont retenues comme candidats visuels après contrôle indépendant : Lucas Baker muté et Uroboros Mkono.** Deux essais Mkono sont conservés, soit quatre PNG originaux. Ce lot ne produit aucune vue gauche retenue. Les images restent des adaptations statiques, sans certification de fidélité 1:1 et sans admission moteur.

Le lot du 19 novembre 2026 prolonge la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22). Il examine six anciens essais non admis au commit `12deacf4cf9b7706eba69fecc1c13593d030180b`. Une présence de fichier ancien n’a pas été comptée comme une pose droite réussie.

## Candidats retenus

| Incarnation | PNG original | Dimensions |
| --- | --- | ---: |
| Lucas Baker — forme mutée — Resident Evil 7 Biohazard (2017) — Not a Hero | [REC_LUCAS_MUTATED_RE7_FULLBODY_RIGHT_V11_01.png](assets/REC_LUCAS_MUTATED_RE7_FULLBODY_RIGHT_V11_01.png) | 1445 × 1088 |
| Uroboros Mkono — Resident Evil 5 (2009) | [REC_UROBOROS_MKONO_RE5_FULLBODY_RIGHT_V11_03.png](assets/REC_UROBOROS_MKONO_RE5_FULLBODY_RIGHT_V11_03.png) | 1402 × 1122 |

Lucas présente une lecture droite de la tête, du bassin et des pieds, avec un thorax encore assez frontal et des marges verticales très courtes. Sa latéralité a été revue deux fois : bras-lame droit proche, bras gauche à bouche éloigné. Mkono03 corrige la direction et la disposition de ses bras : le droit plus fin est proche, le gauche porteur des excroissances orange est éloigné. Les surfaces cachées et les enchevêtrements restent reconstruits.

## Essais conservés

| Incarnation | PNG original | Dimensions |
| --- | --- | ---: |
| Uroboros Mkono — Resident Evil 5 (2009) | [REC_UROBOROS_MKONO_RE5_FULLBODY_RIGHT_V11_01.png](trials/REC_UROBOROS_MKONO_RE5_FULLBODY_RIGHT_V11_01.png) | 1402 × 1122 |
| Uroboros Mkono — Resident Evil 5 (2009) | [REC_UROBOROS_MKONO_RE5_FULLBODY_RIGHT_V11_02.png](trials/REC_UROBOROS_MKONO_RE5_FULLBODY_RIGHT_V11_02.png) | 1402 × 1122 |

Mkono01 reste frontal/oblique gauche. Mkono02 pointe vers la droite mais inverse le rapport du bras à excroissances. Une erreur de consigne sur le flanc proche a été explicitement corrigée dans03 ; les prompts exécutés sont conservés sans réécriture historique. Les décisions visuelles et leurs limites figurent dans la [QA finale](docs/QA_FINAL_V11.md) et sa [version JSON](docs/QA_FINAL_V11.json).

## Refus et manques conservés

| Demande | Résultat |
| --- | --- |
| Duvalia RE5 droite01 | Refus `moderation_blocked`, sortie, catégorie `violence` ; aucun PNG. |
| Soldat Panzer Village droite01 | Refus `moderation_blocked`, sortie, catégorie `other` ; aucun PNG. |
| Lucas muté gauche01 | Refus en sortie, catégorie `violence`, après la création et la revue de droite01 ; aucun PNG gauche. |
| Mkono gauche01 | Refus en sortie, catégorie `violence`, après la création et la revue de droite03 ; aucun PNG gauche. |

Les [reçus des huit appels](manifests/GENERATION_STATUS_V11.json) donnent les identifiants exacts des refus. Aucun appel supplémentaire n’a suivi un refus pour l’identité concernée. Les candidats droits antérieurs sont conservés avec cette chronologie explicite ; ils ne clôturent pas les gauches manquantes.

Deux sujets restent sans appel : **Queen Leech RE0**, dont une seule vue ne permet pas de confirmer la latéralité de la présentation opposée, et **Uriaș Village**, tenu comme variante apparentée au refus historique Uriaș Drac. Ce second statut n’est pas un nouveau refus propre à Uriaș.

## Sources, prompts et portée

Les six sources documentaires et leurs reçus ont été récupérés depuis le commit figé, comparés par SHA et ouverts avant décision. Le [rapport de récupération et de revue](docs/SOURCE_RECOVERY_V11.json) conserve leurs URLs, empreintes et limites. Le [contrôle d’absence des gauches](docs/LEFT_VIEW_ABSENCE_RECHECK_V11.json) compare l’arbre complet et les enregistrements R27/R29/R31/R34 ; les archives V3/V4 intégrales restent indisponibles, donc une déduplication historique mondiale n’est pas certifiée.

Les bitmaps sources, modèles et téléchargements de référence sont exclus du ZIP et de la publication. Les chemins absolus `/workspace/...` et `references/` dans les reçus sont des traces de travail, pas des fichiers promis dans l’archive. Les chemins relatifs des liens ci-dessous correspondent aux fichiers livrés.

- [Groupe initial Mkono/Lucas](prompts/batch1.json) et [Panzer/Duvalia](prompts/batch2.json).
- [Correction d’orientation Mkono02](prompts/mkono_orientation_correction02.json) et [correction de latéralité03](prompts/mkono_laterality_correction03.json).
- [Demande gauche Lucas01](prompts/lucas_left01.json) et [demande gauche Mkono01](prompts/mkono_left01.json), toutes deux refusées.
- [Manifeste final des PNG, sources et statuts](manifests/ASSET_MANIFEST_V11.json).
- [Mesures alpha et conservation des octets](docs/TECHNICAL_QA_V11.json), [inventaire de livraison](manifests/DELIVERY_INVENTORY_V11.json), [empreintes SHA-256](CHECKSUMS_SHA256.txt).

Une créature et une pose par PNG ; tous les octets sont ceux de l’outil. Les indicateurs `canonical_one_to_one_certified` et `engine_admitted` restent `false`. Aucun cycle animé, pivot, atlas, collision, échelle de jeu ou état de combat n’est validé par cette archive. Les contrôles de livraison couvrent les fichiers et leur ZIP ; aucune réussite de gameplay ou CI globale n’est déduite de ces contrôles.
