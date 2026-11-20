# V15 — Hunter Gamma, Resident Evil Outbreak (2003)

Ce premier checkpoint conserve **2 PNG candidats statiques**, une vue gauche et une vue droite, pour **1 identifiant de catalogue : `reoutbreak-hunter-gamma`**. Chaque image montre une seule créature entière avec fond transparent.

La source corporelle de cette incarnation était auparavant insuffisante. La recherche a retrouvé une capture complète du modèle final d'Outbreak, ainsi qu'une référence supplémentaire de modèle. Cette récupération permet de produire deux candidats documentés sans assimiler le personnage à ses versions RE3 de 1999 ou du remake de 2020.

Le lot poursuit la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22), à partir du commit `0ecb6d595c67fbca6783dab309a32f8947516faa`. Les deux PNG ont été générés pendant la présente reprise ; aucun essai supplémentaire ni refus sans image n'est enregistré pour V15.

## Images retenues

| Vue | PNG original conservé | Dimensions | Contrôle visuel |
| --- | --- | --- | --- |
| Gauche | [REC_HUNTER_GAMMA_OUTBREAK_2003_FULLBODY_LEFT_V15_01.png](assets/REC_HUNTER_GAMMA_OUTBREAK_2003_FULLBODY_LEFT_V15_01.png) | 1312 × 1199 | [Revue](docs/hunter-gamma-left-review.json) |
| Droite | [REC_HUNTER_GAMMA_OUTBREAK_2003_FULLBODY_RIGHT_V15_01.png](assets/REC_HUNTER_GAMMA_OUTBREAK_2003_FULLBODY_RIGHT_V15_01.png) | 1401 × 1123 | [Revue](docs/hunter-gamma-right-review.json) |

Les deux poses montrent la tête amphibienne sans yeux visibles, la bouche sans dents ajoutées, le dos bleu ardoise à petites bosses ocre, la gorge rouge-brun, les plaques ventrales, les longs avant-bras et les extrémités palmées à bouts émoussés. Les mains, pieds et sommet de tête restent dans le cadre. Aucun humain, décor, vêtement ou longue griffe n'a été ajouté.

## Références et limites d'interprétation

Le [dossier de récupération des sources](docs/HUNTER_GAMMA_SOURCE_RECOVERY.json) fournit les URL, empreintes, dimensions et qualifications. La référence principale est une capture communautaire PCSX2 du modèle final, consultée sur [Resident Evil Outbreak Guide — Creature Analytics](https://sairentoz7.wixsite.com/reoutbreakguide/creature-analytics). Un [rendu de modèle supplémentaire](https://les-archives-resident-evil-biohazard.fr/lore-hunter-g-nom-de-code-ma-124g/) aide à lire les proportions et couleurs. Les références téléchargées ne sont pas republiées comme assets générés.

Le dossier de récupération est un état de recherche antérieur à la génération ; son champ `generation_performed: false` décrit cette étape. Les sorties effectivement produites, revues et conservées sont attestées séparément par le [manifeste V15](manifests/ASSET_MANIFEST_V15.json).

La position des nouveaux candidats est plus basse et accroupie que les captures de référence debout ou en réaction à un impact. L'épaisseur des membres, la largeur de tête, l'ordre exact des plaques, le dos et les doigts partiellement en raccourci restent des interprétations générées. Une capture communautaire PCSX2 ne certifie pas des pixels identiques à une console originale.

## Contrôles effectués

Les SHA256, dimensions, mesures alpha et chemins des prompts/revues des deux PNG sont vérifiés dans le manifeste. Les sorties correspondent octet pour octet aux originaux de l'outil. Les deux vues ont été inspectées après compositing réel sur fond gris et clair : transparence confirmée, sans fond opaque ni halo large visible. Des résidus alpha faibles subsistent.

Les marges restent petites, notamment verticalement : **30/36 px** en haut/bas pour la gauche et **20/17 px** pour la droite, mesurées à alpha ≥ 16. Aucun élément principal n'est coupé, mais la marge généreuse demandée n'est pas atteinte.

Ces deux images sont des poses fixes. Elles ne valident ni fidélité globale 1:1, ni animation native, ni pivot, contact, collision ou admission moteur. Les indicateurs correspondants restent faux. Les autres lots, les sources de runtime et les assertions historiques restent inchangés.

## Suite documentée

Les [prochaines recherches de sources](docs/NEXT_SOURCE_TARGETS.json) restent séparées des candidats réellement livrés. Un nom de cible ou une source à vérifier n'est pas compté comme nouveau PNG. La progression de V14, ses corrections Bella et le refus de Yawn droite restent dans le [suivi V14](../v14/README.md).
