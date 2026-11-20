# Resident Evil Combat — lot B.O.W. V7

**Six poses corporelles gauches sont retenues comme candidats visuels après revue, avec trois essais conservés**, soit neuf PNG originaux. Les images sont des créations génératives documentées, statiques, sans certification de fidélité 1:1 et sans admission dans le moteur.

Ce lot du 19 novembre 2026 est préparé pour la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22), à partir des références archivées au commit `12deacf4cf9b7706eba69fecc1c13593d030180b`. Les octets des PNG, reçus et rapports d’entrée gelés sont préservés.

## Candidats retenus pour revue

| Incarnation | PNG original | Dimensions |
| --- | --- | ---: |
| Bandersnatch — CODE: Veronica (2000) | [REC_BANDERSNATCH_RECV_FULLBODY_LEFT_V7_01.png](assets/REC_BANDERSNATCH_RECV_FULLBODY_LEFT_V7_01.png) | 1086 × 1448 |
| Fumer WM-002 — RE7 Not a Hero (2017) | [REC_FUMER_RE7_FULLBODY_LEFT_V7_02.png](assets/REC_FUMER_RE7_FULLBODY_LEFT_V7_02.png) | 1059 × 1486 |
| Iron Maiden — RE4 original (2005) | [REC_IRON_MAIDEN_RE4_2005_FULLBODY_LEFT_V7_01.png](assets/REC_IRON_MAIDEN_RE4_2005_FULLBODY_LEFT_V7_01.png) | 1085 × 1449 |
| Soldat Jet — Village (2021) | [REC_SOLDAT_JET_VILLAGE_FULLBODY_LEFT_V7_02.png](assets/REC_SOLDAT_JET_VILLAGE_FULLBODY_LEFT_V7_02.png) | 1151 × 1366 |
| Vârcolac — Village (2021) | [REC_VARCOLAC_VILLAGE_FULLBODY_LEFT_V7_01.png](assets/REC_VARCOLAC_VILLAGE_FULLBODY_LEFT_V7_01.png) | 1200 × 1310 |
| Verdugo — RE4 Remake (2023) | [REC_VERDUGO_RE4R_2023_FULLBODY_LEFT_V7_01.png](assets/REC_VERDUGO_RE4R_2023_FULLBODY_LEFT_V7_01.png) | 1254 × 1254 |

La correction **Fumer 02** réduit les grandes plaques gris-brun présentes autour du premier essai ; de fins résidus restent documentés. **Soldat Jet 02** corrige la lecture trop frontale de 01 : tête, thorax, bassin et bottes se dirigent désormais ensemble vers la gauche. Ses deux foreuses et sa structure dorsale sont contenues dans le cadre. Bandersnatch conserve visuellement son bras anatomique droit hypertrophié et l’appendice opposé atrophié, sans miroir.

Les autres réserves sont conservées : crâne et répartition des épines reconstruits pour Iron Maiden 2005 ; carapace, boucle de queue et surfaces cachées reconstruites pour Verdugo 2023 ; fourrure et résidus semi-transparents parmi les fibres de Vârcolac. Les marges ne satisfont pas toutes les cibles des prompts. Une alpha médiane proche de 252–253/255 n’établit pas, à elle seule, un défaut de détourage ; les observations visuelles et mesures détaillées sont jointes.

## Essais conservés, non retenus

| PNG original | Décision finale |
| --- | --- |
| [REC_FUMER_RE7_FULLBODY_LEFT_V7_01.png](trials/REC_FUMER_RE7_FULLBODY_LEFT_V7_01.png) | TRIAL_SUPERSEDED_BY_REVIEWED_02 |
| [REC_MAMA_MOLD_RE7_FULLBODY_LEFT_V7_01.png](trials/REC_MAMA_MOLD_RE7_FULLBODY_LEFT_V7_01.png) | TRIAL_NOT_ADMITTED_CORRECTION_BLOCKED |
| [REC_SOLDAT_JET_VILLAGE_FULLBODY_LEFT_V7_01.png](trials/REC_SOLDAT_JET_VILLAGE_FULLBODY_LEFT_V7_01.png) | REJECTED_SUPERSEDED |

Fumer 01 est remplacé par 02 pour son détourage. Soldat Jet 01 est remplacé par 02 pour l’orientation du corps entier. Mama Mold 01 conserve des régions semi-transparentes indésirables ; sa correction 02 a été refusée par l’outil et aucun nouveau PNG n’existe pour cet appel. Mama Mold ne rejoint donc pas les six candidats.

## Refus et références encore insuffisantes

Deux appels V7 ont été refusés en sortie (`moderation_blocked`, catégorie `violence`) : **Molded 01** et **Mama Mold 02**. Aucun nouvel appel n’a suivi ces refus. Ils ne comptent pas comme images générées. Les détails attestés figurent dans le [registre des appels root](manifests/ROOT_GENERATION_STATUS_V7.json).

Deux sujets de la sélection V7 restent sans génération : **Little Crawler**, dont la topologie des appendices n’est pas suffisamment lisible, et **Iron Maiden RE4 Remake 2023**, dont certaines épines sont coupées par le cadrage. Un reçu R34 antérieur ne lève pas ces limites constatées sur les pixels. Voir la [récupération des sources](docs/SOURCE_RECOVERY_V7.json).

La **variante blanche d’Eliminator RE0** reste également tenue, sans génération : le [rapport de recherche](docs/REFERENCE_RECOVERY_AFTER_V6_ELIMINATOR.md) et sa [version JSON](docs/REFERENCE_RECOVERY_AFTER_V6_ELIMINATOR.json) sont inclus. Aucune image de cette recherche n’est ajoutée. Les réserves antérieures de U-8 RE5, Licker beta RE5 et des refus historiques demeurent ; ce lot ne les lève pas.

## Provenance et portée

Les sources documentaires ont été récupérées en lecture seule depuis le commit indiqué, comparées à leurs reçus et inspectées. **Leurs bitmaps, les modèles, textures et autres téléchargements de référence sont exclus de cette livraison et du ZIP.** Les documents conservent les URLs, chemins du dépôt et SHA nécessaires à la traçabilité. Aucun rendu généré R34 n’est promu en preuve anatomique originale.

Les chemins absolus de type `/workspace/...`, les chemins `references/` et certains chemins de recherche contenus dans les rapports sont des traces de travail de la session. Ils ne promettent pas la présence de ces fichiers dans l’archive. Les chemins relatifs vers `assets/`, `trials/`, `docs/`, `prompts/` et `manifests/` désignent les éléments livrés. Les statuts initiaux « pending » des reçus et prompts sont conservés à leurs octets gelés ; **les décisions finales des deux rapports QA et du manifeste de livraison font autorité pour ce lot**.

Les nouvelles poses exposent des surfaces reconstruites depuis des références frontales ou obliques. Elles ne certifient ni modèle Capcom natif, ni profil gauche original, ni anatomie cachée, ni coordonnées exactes des détails. Les indicateurs `canonical_one_to_one_certified` et `engine_admitted` restent `false`. Aucun pivot, atlas, échelle de jeu, collision, contact, changement de côté, animation ou état de combat n’est validé par cette livraison.

L’inventaire de recherche compare les preuves accessibles V2/R34/V6 ; la déduplication complète contre les archives V3/V4 indisponibles reste non démontrée. La [file de recherche après V7](docs/SOURCE_REVIEW_QUEUE_AFTER_V7.json) et l’[inventaire détaillé](docs/INVENTORY_V7.json) sont des documents de suivi, pas des sorties V7 supplémentaires ni des admissions moteur.

## Documents de contrôle

- [Manifeste final des neuf PNG, sources et statuts](manifests/ASSET_MANIFEST_V7.json).
- [QA RE7 / CODE: Veronica](docs/QA_RE7_CV_V7.md) et [mesures JSON](docs/QA_RE7_CV_V7.json).
- [QA RE4 / Village](docs/QA_RE4_VILLAGE_V7.md) et [mesures JSON](docs/QA_RE4_VILLAGE_V7.json).
- [Reçus de génération RE4 / Village](docs/GENERATION_RE4_VILLAGE_V7.json) et [reçu de correction Soldat Jet 02](docs/SOLDAT_JET_CORRECTION_V7_02_RECEIPT.json).
- Prompts exacts : [premier groupe](prompts/batch1.json), [deuxième groupe](prompts/batch2.json), [corrections RE7](prompts/batch3_corrections.json), [RE4 / Village](prompts/batch_re4_village.json), [Soldat Jet 02](prompts/soldat_jet_orientation_correction_v7_02.json).
- [Inventaire des fichiers et de leur conservation](manifests/DELIVERY_INVENTORY_V7.json), [empreintes SHA-256](CHECKSUMS_SHA256.txt).

Les vérifications de livraison couvrent l’identité des neuf PNG aux originaux de l’outil, leurs dimensions et leur alpha, l’accord des SHA avec les deux QA, les liens du présent README, les empreintes des fichiers et les CRC du ZIP. Le ZIP est conservé à côté du dossier décompressé dans le dépôt et n’est inclus ni dans lui-même ni dans les empreintes internes. Aucune suite de gameplay, aucun build complet ou test navigateur n’est revendiqué pour ce paquet d’archives. La note de publication extérieure à ce snapshot porte les résultats CI du commit effectivement publié.
