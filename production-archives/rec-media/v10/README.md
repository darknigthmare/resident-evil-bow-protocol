# Resident Evil Combat — Génération V10

## État du lot

**15 PNG originaux sont conservés : 13 candidats visuels gauches et 2 essais écartés.** Les 15 appels ont réussi ; aucun refus de génération n’a eu lieu dans ce lot. Sur les 14 sujets attribués, Giant Whip Spider demeure tenu sans appel faute de lecture anatomique suffisamment sûre.

La revue indépendante a comparé les 13 références documentaires utilisées et les 15 sorties. Elle confirme les 13 candidats avec les réserves décrites ci-dessous. Tous les indicateurs de fidélité canonique 1:1, de modèle natif, d’animation validée et d’admission dans le moteur restent **false**. Ces images constituent un lot de revue ; elles ne sont pas importées dans le jeu.

| Mesure | Valeur |
|---|---:|
| Sujets attribués | 14 |
| Sujets avec image | 13 |
| Appels / sorties PNG | 15 / 15 |
| Candidats gauches retenus pour revue | 13 |
| Essais conservés | 2 |
| Refus de génération | 0 |
| Sujet tenu sans appel | 1 |

## Candidats retenus

Chaque image contient un seul sujet. Les poses gauches ont été générées à partir de références inspectées, sans miroir logiciel. Les surfaces cachées dans les références restent des reconstructions interprétées.

| Sujet et édition | Image originale | Dimensions |
|---|---|---:|
| Scissor Tail — Outbreak File #2 (2004) | [PNG 01](assets/REC_SCISSOR_TAIL_OUTBREAK2_FULLBODY_LEFT_V10_01.png) | 1254 × 1254 |
| Regenerator — RE4 original (2005) | [PNG 01](assets/REC_REGENERATOR_RE4_2005_FULLBODY_LEFT_V10_01.png) | 840 × 1871 |
| Horn Bill — Outbreak File #2 (2004) | [PNG 01](assets/REC_HORN_BILL_OUTBREAK2_FULLBODY_LEFT_V10_01.png) | 1254 × 1254 |
| Orthrus — Revelations 2 (2015) | [PNG 01](assets/REC_ORTHRUS_REV2_FULLBODY_LEFT_V10_01.png) | 1536 × 1024 |
| Tyrant R, forme mutée — Outbreak File #2 (2004) | [PNG 01](assets/REC_TYRANT_R_OUTBREAK2_FULLBODY_LEFT_V10_01.png) | 992 × 1586 |
| Monster Neil — Revelations 2 (2015) | [PNG 01](assets/REC_MONSTER_NEIL_REV2_FULLBODY_LEFT_V10_01.png) | 1536 × 1024 |
| Vulcanblubber — Revelations 2 (2015) | [PNG 01](assets/REC_VULCANBLUBBER_REV2_FULLBODY_LEFT_V10_01.png) | 1100 × 1430 |
| Rotten, variante au bonnet — Revelations 2 (2015) | [PNG 01](assets/REC_ROTTEN_REV2_FULLBODY_LEFT_V10_01.png) | 998 × 1575 |
| Licker β2 CM-LB-110 — Requiem (2026) | [PNG 01](assets/REC_LICKER_BETA2_REQUIEM2026_FULLBODY_LEFT_V10_01.png) | 1672 × 941 |
| Tyrant CM-T-501, manteau standard — Requiem (2026) | [PNG 01](assets/REC_TYRANT_T501_REQUIEM2026_FULLBODY_LEFT_V10_01.png) | 875 × 1797 |
| Sœur à robe claire, individu au premier plan — RE4 remake (2023) | [PNG 01](assets/REC_CHAINSAW_SISTER_LIGHT_DRESS_RE4R_FULLBODY_LEFT_V10_01.png) | 1196 × 1315 |
| Wasp — Outbreak File #2 (2004) | [PNG 02](assets/REC_WASP_OUTBREAK2_FULLBODY_LEFT_V10_02.png) | 1312 × 1199 |
| Garmr CM-G-002 — Requiem (2026) | [PNG 02](assets/REC_GARMR_REQUIEM2026_FULLBODY_LEFT_V10_02.png) | 1536 × 1024 |

## Corrections et essais conservés

Les deux corrections répondent à des défauts visuels identifiés sur des sorties réussies. Les PNG01 et leurs prompts exécutés sont conservés sans modification.

| Essai | Défaut constaté | Correction retenue |
|---|---|---|
| [Wasp01](trials/REC_WASP_OUTBREAK2_FULLBODY_LEFT_V10_01.png) | Cinq chaînes de pattes traçables et deux longues antennes ajoutées, absentes de la référence fournie. | Wasp02 présente six chaînes terminées et retire ces deux appendices. |
| [Garmr01](trials/REC_GARMR_REQUIEM2026_FULLBODY_LEFT_V10_01.png) | Le motif documenté sur le flanc anatomique droit a été reporté sur le flanc gauche proche. | Garmr02 retire ce report. Une trace du côté droit éloigné reste visible ; le flanc gauche demeure interprété car il est absent de la source. |

Le [registre des appels](manifests/TOOL_CALLS_V10.json) conserve l’outil, les horaires, les références jointes et les chemins des sorties originales. Les fichiers de [prompts initiaux](prompts/batch_v10_01.json), [groupe02](prompts/batch_v10_02.json), [groupe03](prompts/batch_v10_03.json), [groupe04](prompts/batch_v10_04.json), [groupe05](prompts/batch_v10_05.json), [correction Wasp](prompts/wasp_correction02.json) et [correction Garmr](prompts/garmr_laterality_correction02.json) gardent le texte exact envoyé. Leur état « prepared » décrit la capture préalable à l’appel ; le registre des appels et le manifeste final portent les résultats effectifs.

## Source tenue sans génération

**Giant Whip Spider — Revelations 2 : HELD_ANATOMY_REFERENCE.** La référence450×360 superpose les pédipalpes et les pattes fines ; les attaches et le compte complet des appendices ne sont pas établis avec assez de certitude. Aucun PNG ni refus d’outil n’existe pour cette cible. Une vue complémentaire ou un modèle est nécessaire avant de poursuivre.

## Provenance et distinctions d’édition

Les14 bitmaps et leurs14 reçus ont été récupérés en lecture seule au commit `12deacf4cf9b7706eba69fecc1c13593d030180b`. Leurs SHA256, URLs, éditions et observations figurent dans le [rapport de récupération](docs/SOURCE_RECOVERY_V10.json) et l’[allocation initiale](docs/SOURCE_QUEUE_V10.json). Treize références ont servi aux générations. Les reçus historiques R34 servent à retrouver les sources ; ils ne certifient pas les nouvelles vues opposées.

Deux anciens noms de fichiers sont trompeurs : le bitmap retenu pour Horn Bill montre bien l’oiseau à casque jaune, même s’il provenait d’une recherche intitulée Scissor Tail ; la source de Vulcanblubber montre la créature au canon et à la masse, malgré un nom contenant Ironhead. Les identités ont été vérifiées sur les pixels et rattachées aux reçus exacts. Pour Chainsaw Sisters, seul l’individu au premier plan portant la robe claire est repris ; aucun nom individuel n’est inventé et le costume de l’autre sœur n’est pas fusionné.

Les désignations Requiem sont corroborées par les transcriptions du [catalogue1](https://www.evilresource.com/resident-evil-requiem/files/product-catalog-1-2026) et du [catalogue2](https://www.evilresource.com/resident-evil-requiem/files/product-catalog-2-2026), ainsi que les pages documentaires liées au rapport. Les SHA exacts de Lickerβ2 et T-501 sont également reliés, dans les métadonnées archivées, au [billet RE9 d’octobre2026](https://blackjackrants.blogspot.com/2026/10/reviewing-monsters-resident-evil-9.html). L’ouverture actuelle de ce billet a été bloquée par une redirection Google ; elle n’a pas été relancée. Cette chaîne documentaire soutient l’identité et l’édition, sans prouver la géométrie native ni les surfaces cachées.

L’absence exhaustive de doublons dans les anciens lots V3/V4 n’est pas attestée. L’allocation et le constat d’absence de ces vues gauches restent limités au référentiel documenté et aux lots effectivement examinés.

## Résultats QA et limites

Le [rapport indépendant](docs/QA_INDEPENDENT_V10.md), sa [version JSON](docs/QA_INDEPENDENT_V10.json) et les [mesures techniques](docs/TECHNICAL_INDEPENDENT_V10.json) sont figés et conservés à l’identique. Les15 PNG correspondent octet pour octet aux sorties originales. Aucun recadrage, détourage, miroir, retouche de pixels ou nettoyage alpha n’a été appliqué.

Tous les PNG sont RGBA. Aucun pixel d’alpha≥16 ne touche un bord. Ce contrôle ne transforme pas les marges en conformité moteur : Monster Neil dispose de9px en haut et17px en bas, Vulcanblubber de16px/18px ; ces cadrages sont serrés. L’antenne gauche de Scissor Tail reste entière avec26px de marge. Les aperçus RGB peuvent montrer des nappes colorées là où l’alpha est nul ou très faible ; elles ne constituent pas des plaques de fond opaques. De petits résidus ou fibres semi-transparents subsistent notamment autour d’Orthrus, de la fourrure de Garmr02 et des cheveux de la sœur. Ils sont mesurés et non retouchés.

La fidélité d’édition, les silhouettes et les asymétries ont été relues. La nouvelle perspective, les microtextures, l’enchevêtrement des membres et les surfaces opposées non documentées restent génératifs. Les pivots, volumes de contact, boîtes de collision, échelles natives, découpes d’animation et lectures en situation de combat restent à valider dans une étape séparée.

## Conservation et publication

Le [manifeste final](manifests/ASSET_MANIFEST_V10.json) relie chaque PNG à son édition, son SHA, sa source, son prompt et son verdict. Le [bilan des générations](manifests/GENERATION_STATUS_V10.json), les [mesures du producteur](docs/GENERATION_V10.json) et l’[inventaire de livraison](manifests/DELIVERY_INVENTORY_V10.json) complètent la traçabilité. Les [checksums](CHECKSUMS_SHA256.txt) couvrent tous les fichiers livrés sauf le fichier de checksums lui-même.

Les répertoires de références, les bitmaps sources et les modèles sont exclus du ZIP et de la publication de ce lot. Les chemins absolus présents dans les rapports sont des traces de travail, pas des dépendances à livrer. L’archive contient uniquement les fichiers extraits du lot ; elle ne contient pas son propre ZIP. La note de publication extérieure précisera le mode de conservation du ZIP, direct ou par segments réversibles, ainsi que le commit et l’état réel de la CI. Ce lot ne modifie aucun garde R34 et n’autorise aucune fusion de PR.
