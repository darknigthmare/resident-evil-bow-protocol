# V14 — Reprise du 20 novembre 2026, checkpoint 2

Ce point de reprise conserve **9 PNG : 7 candidats statiques revus et 2 essais Bella Sisters à corriger**, avec un seul personnage par image et une transparence réelle. Les 9 images couvrent **5 identifiants de catalogue** ; les 7 candidats retenus concernent 4 de ces identifiants, avec 4 vues gauches et 3 vues droites.

Le checkpoint 1 publié dans la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22) est conservé. La reprise part du commit `ed99a1dde54b3344b1c8ed1b688f26aab59c180d` : elle ajoute la vue droite du Leader Zealot retrouvée localement, les deux essais Bella jusque-là non répertoriés, puis les nouvelles vues gauche/droite de Jill et droite du Castle Ganado. Les trois entrées initiales du manifeste restent intactes.

## Candidats de poses fixes

| Identité | Édition | Vue | PNG |
| --- | --- | --- | --- |
| Leader Zealot — robe rouge | Resident Evil 4 (2005) | Gauche, trois quarts | [Gauche 01](assets/REC_LEADER_ZEALOT_RE4_2005_FULLBODY_LEFT_V14_01.png) |
| Leader Zealot — robe rouge | Resident Evil 4 (2005) | Droite, trois quarts | [Droite 01](assets/REC_LEADER_ZEALOT_RE4_2005_FULLBODY_RIGHT_V14_01.png) |
| Castle Ganado — moine chauve à faux | Resident Evil 4 (2005) | Gauche, trois quarts | [Gauche 01](assets/REC_CASTLE_GANADO_RE4_2005_FULLBODY_LEFT_V14_01.png) |
| Castle Ganado — moine chauve à faux | Resident Evil 4 (2005) | Droite, trois quarts | [Droite 01](assets/REC_CASTLE_GANADO_RE4_2005_FULLBODY_RIGHT_V14_01.png) |
| Yawn | Resident Evil remake (2002) | Gauche, trois quarts | [Gauche 01](assets/REC_YAWN_REMAKE_2002_FULLBODY_LEFT_V14_01.png) |
| Jill Valentine — Battle Suit avec P30 | Resident Evil 5 (2009) | Gauche, buste presque frontal | [Gauche 01](assets/REC_JILL_VALENTINE_RE5_BATTLESUIT_FULLBODY_LEFT_V14_01.png) |
| Jill Valentine — Battle Suit avec P30 | Resident Evil 5 (2009) | Droite, trois quarts | [Droite 01](assets/REC_JILL_VALENTINE_RE5_BATTLESUIT_FULLBODY_RIGHT_V14_01.png) |

## Essais conservés et correction ouverte

| Variante originale RE4 (2005) | Image conservée | Défaut observé |
| --- | --- | --- |
| Bella Sister — blouse bleu-gris, tablier crème | [Gauche 01](assets/REC_BELLA_SISTER_CREAM_APRON_RE4_2005_FULLBODY_LEFT_V14_01.png) | Main droite anatomique sur la poignée avant, main gauche sur la poignée arrière : prise inversée par rapport à la demande. |
| Bella Sister — blouse ocre, jupe verte | [Gauche 01](assets/REC_BELLA_SISTER_GREEN_SKIRT_RE4_2005_FULLBODY_LEFT_V14_01.png) | Même inversion des mains ; buste presque frontal. |

Les deux PNG restent conservés octet pour octet avec le statut `TRIAL_NEEDS_GRIP_CORRECTION` et `excluded_from_candidate_count: true`. Les revues [tablier crème](docs/bella-cream-left-review.json) et [jupe verte](docs/bella-green-left-review.json) documentent le contrôle des épaules, bras et poignées. La correction doit placer la **main gauche sur la poignée avant et la main droite sur la poignée arrière**, sans échanger leurs costumes. Une nouvelle sortie devra porter une révision distincte.

## Preuves et limites

Le [manifeste](manifests/ASSET_MANIFEST_V14.json) contient les SHA256, dimensions, mesures alpha, statuts et liens vers les prompts et revues des 9 PNG. Les trois entrées initiales sont préservées ; les six entrées ajoutées ont été vérifiées par empreinte et par existence de leurs fichiers, prompts et revues. Chaque nouveau contrôle visuel utilise un vrai compositing alpha sur fond gris et clair. Les RGB cachés sous un alpha nul ne sont pas confondus avec un fond opaque.

Les silhouettes complètes sont visibles, mais les marges demandées ne sont pas atteintes partout et des résidus alpha faibles persistent. Les vues sont des poses trois quarts ; le buste de Jill gauche est encore presque frontal. Les détails cachés, proportions exactes, motifs, visages et mécanismes des armes ne sont pas certifiés identiques aux modèles natifs.

Sources documentées : [moines](docs/ZEALOT_SOURCES_V14.json), [Yawn et références encore ouvertes](docs/REFERENCE_REVIEW_V14.json), [Jill et Bella Sisters](docs/SOURCE_RECOVERY_JILL_BELLA_V14.json). Les bitmaps documentaires ne sont pas ajoutés à ce lot.

Les **44 PNG historiquement annoncés pour V12/V13 restent non récupérés**. Ces nouveaux fichiers V14 ne sont pas présentés comme leurs originaux retrouvés. Les lots V5–V11 sont conservés.

Ces images n'attestent ni fidélité globale 1:1, ni animation originale, ni pivot, contact, collision ou admission moteur. Les indicateurs correspondants restent faux. Cette livraison porte sur des images conservées avec leur provenance et leur revue.

La CI R34 précédemment observée sur `dc9e217` rejetait les ajouts `production-archives`. Ce constat historique ne constitue pas un résultat de test sur le nouveau checkpoint. Les gardes et assertions historiques restent inchangées ; aucune recette de gameplay n'est revendiquée pour cette publication de médias.
