# QA indépendante — Resident Evil Combat V10

Revue figée le 2026-11-19T17:19:21.351768+00:00. Producteur: `/root/audit_depot`; relecteur: `/root/qa_stage_v5`.

## Verdict

**13 candidats avec limites, 2 essais non admis, 15 PNG examinés.** Les copies sont identiques aux originaux de génération. Les deux essais sont Wasp File#2 01 (compte des pattes insuffisant et antennes ajoutées) et Garmr01 (lésion du mauvais côté). Les corrections02 de ces deux sujets sont retenues après comparaison. Aucun refus ne figure dans le registreV10 du producteur; Giant Whip Spider reste tenu sans appel, selon sa revue de source.

Cette admission porte sur une étude de pose gauche complète. Elle ne constitue ni une conformité1:1, ni une admission moteur.

## Transparence et cadrage

Tous les PNG ont un véritable canal alpha et aucun pixel alpha≥16 au bord. Les aperçus RGB d’Orthrus, Neil et Garmr montrent des halos qui ne sont pas des fonds opaques. Des résidus/fibres limités subsistent sur Orthrus, Garmr et les cheveux de la sœur; les valeurs par fichier sont ci-dessous et dans le JSON. Les corps sont souvent légèrement moins opaques que255. Aucun pixel n’a été retouché.

| PNG | Verdict | Dimensions | Marges L/H/D/B, alpha≥16 |
|---|---|---:|---|
| [REC_SCISSOR_TAIL_OUTBREAK2_FULLBODY_LEFT_V10_01.png](../assets/REC_SCISSOR_TAIL_OUTBREAK2_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 1254×1254 | 26 / 74 / 51 / 129 px |
| [REC_WASP_OUTBREAK2_FULLBODY_LEFT_V10_01.png](../trials/REC_WASP_OUTBREAK2_FULLBODY_LEFT_V10_01.png) | Essai non admis | 1254×1254 | 117 / 123 / 70 / 235 px |
| [REC_REGENERATOR_RE4_2005_FULLBODY_LEFT_V10_01.png](../assets/REC_REGENERATOR_RE4_2005_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 840×1871 | 80 / 104 / 97 / 82 px |
| [REC_HORN_BILL_OUTBREAK2_FULLBODY_LEFT_V10_01.png](../assets/REC_HORN_BILL_OUTBREAK2_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 1254×1254 | 93 / 89 / 68 / 127 px |
| [REC_ORTHRUS_REV2_FULLBODY_LEFT_V10_01.png](../assets/REC_ORTHRUS_REV2_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 1536×1024 | 125 / 27 / 129 / 86 px |
| [REC_TYRANT_R_OUTBREAK2_FULLBODY_LEFT_V10_01.png](../assets/REC_TYRANT_R_OUTBREAK2_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 992×1586 | 46 / 87 / 49 / 86 px |
| [REC_MONSTER_NEIL_REV2_FULLBODY_LEFT_V10_01.png](../assets/REC_MONSTER_NEIL_REV2_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 1536×1024 | 241 / 9 / 298 / 17 px |
| [REC_VULCANBLUBBER_REV2_FULLBODY_LEFT_V10_01.png](../assets/REC_VULCANBLUBBER_REV2_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 1100×1430 | 84 / 16 / 147 / 18 px |
| [REC_ROTTEN_REV2_FULLBODY_LEFT_V10_01.png](../assets/REC_ROTTEN_REV2_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 998×1575 | 170 / 55 / 185 / 48 px |
| [REC_GARMR_REQUIEM2026_FULLBODY_LEFT_V10_01.png](../trials/REC_GARMR_REQUIEM2026_FULLBODY_LEFT_V10_01.png) | Essai non admis | 1536×1024 | 154 / 38 / 55 / 52 px |
| [REC_LICKER_BETA2_REQUIEM2026_FULLBODY_LEFT_V10_01.png](../assets/REC_LICKER_BETA2_REQUIEM2026_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 1672×941 | 80 / 69 / 79 / 45 px |
| [REC_TYRANT_T501_REQUIEM2026_FULLBODY_LEFT_V10_01.png](../assets/REC_TYRANT_T501_REQUIEM2026_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 875×1797 | 77 / 27 / 96 / 24 px |
| [REC_CHAINSAW_SISTER_LIGHT_DRESS_RE4R_FULLBODY_LEFT_V10_01.png](../assets/REC_CHAINSAW_SISTER_LIGHT_DRESS_RE4R_FULLBODY_LEFT_V10_01.png) | Candidat avec limites | 1196×1315 | 78 / 78 / 76 / 62 px |
| [REC_WASP_OUTBREAK2_FULLBODY_LEFT_V10_02.png](../assets/REC_WASP_OUTBREAK2_FULLBODY_LEFT_V10_02.png) | Candidat avec limites | 1312×1199 | 159 / 52 / 31 / 88 px |
| [REC_GARMR_REQUIEM2026_FULLBODY_LEFT_V10_02.png](../assets/REC_GARMR_REQUIEM2026_FULLBODY_LEFT_V10_02.png) | Candidat avec limites | 1536×1024 | 154 / 31 / 42 / 50 px |

## Constats par fichier

### REC_SCISSOR_TAIL_OUTBREAK2_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Outbreak File #2 (2004). Statut: `CANDIDATE_WITH_LIMITS`.

- Tête et axe du corps dirigés à gauche, une seule créature complète.
- Six pattes traçables : trois grandes proches et trois éloignées plus petites/partiellement superposées, sans septième terminaison observée.
- Deux antennes et deux pointes de la pince terminale sont entières. Abdomen segmenté relevé conservé.
- Texture et profil reconstruits depuis le modèle documentaire; pas de certification pixel ou topologique1:1. Antenne gauche proche du bord mais entière (marge alpha≥16 de26px).

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/reoutbreak2-scissor-tail-article-candidate-1.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/reoutbreak2-scissor-tail/idle.json). SHA256 du PNG: `bee3f5873e71ff8cf3574dcbbf2cc0917002928c389743b589a6c69a4465a863`.

### REC_WASP_OUTBREAK2_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Outbreak File #2 (2004). Statut: `TRIAL_ANATOMY_UNRESOLVED`.

- Silhouette entière dirigée à gauche, dard et deux surfaces alaires contenus.
- Seulement cinq chaînes de pattes terminées sont traçables sans hypothèse (pointes approximatives x206/y878,359/978,505/902,654/1015,838/975). Un petit fragment au croisement central ne justifie pas une sixième patte.
- Deux longues antennes frontales ajoutées, absentes de la référence frontale fournie; fidélité source non établie pour ces appendices.
- Revue indépendante ne valide pas le compte anatomique; correction ciblée nécessaire avant admission comme candidat.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/reoutbreak2-wasp.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_1/reoutbreak2-wasp/idle.json). SHA256 du PNG: `2cb42a4369ef6552329bee6b2bfcf44f7c0e00620d09f45e6782a97255e5d8c4`.

### REC_REGENERATOR_RE4_2005_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil 4 (2005). Statut: `CANDIDATE_WITH_LIMITS`.

- Édition2005 cohérente avec la source: corps long et relativement mince, tête lisse/grise, dents aiguës, longues mains, absence de piques Iron Maiden.
- Tête, buste, bassin et appuis tournés vers la gauche en trois-quarts; deux bras et deux pieds nus entiers.
- Microtexture et surfaces opposées reconstruites; détail dentaire et contour des doigts non certifiés1:1.
- Pas de coupe observée; marge basse alpha≥16 de82px(4,38%).

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/re4-regenerator-source.jpeg) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/re4-regenerator/idle.json). SHA256 du PNG: `261bbcbb289d3b5676e602efa6b5ea1ca5f61b473a391bcfe8a2e603307a1b6b`.

### REC_HORN_BILL_OUTBREAK2_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Outbreak File #2 (2004). Statut: `CANDIDATE_WITH_LIMITS`.

- Une créature volante dirigée vers la gauche; deux ailes, queue, bec/casque et deux pieds complets.
- Casque jaune sombre, bec très ouvert, plumage noir à bandes claires cohérents avec la référence.
- Pose d’ailes différente et pied éloigné reconstruit; détail/longueur des plumes et doigts non certifiés1:1.
- Toutes les pointes principales restent contenues; pas de coupe observée.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/reoutbreak2-scissor-tail-article-candidate-0.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/reoutbreak2-horn-bill/idle.json). SHA256 du PNG: `fb016b705ebe1fb73f857bbd7e9aaa673a643411823deac4767318fbc35857cc`.

### REC_ORTHRUS_REV2_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Revelations 2 (2015). Statut: `CANDIDATE_WITH_LIMITS`.

- Quadrupède tourné à gauche, quatre pattes entières, queue et tiges métalliques contenues.
- Dos bombé, tête osseuse allongée et matériaux du corps cohérents avec la référence.
- Les positions précises des tiges et marques cutanées sur le côté nouvellement visible sont reconstruites, sans preuve de latéralité1:1 depuis cette seule référence.
- Nappe brune visible dans RGB brut: verdict de transparence fondé sur la mesure alpha, pas sur l’aperçu. Marge haute27px(2,64%) serrée mais pointe entière.
- 24pixels alpha≥16 hors rayon12px du noyau alpha128, groupés x409–417/y256–261, max42/255: petit résidu près d’une tige, aucune grande plaque de fond.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/rerev2-orthrus.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_2/rerev2-orthrus/idle.json). SHA256 du PNG: `7d645b2f385767fb729d10e84beab9f4b518c35a92fcce94a0d853aae8d9594a`.

### REC_TYRANT_R_OUTBREAK2_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Outbreak File #2 (2004). Statut: `CANDIDATE_WITH_LIMITS`.

- Tête, buste et appuis donnent une lecture gauche en trois-quarts; deux mains à longues lames et deux pieds entiers.
- Cavités orange thoraciques restent sur le côté anatomique droit éloigné, cohérent avec la source frontale; pas d’inversion évidente.
- Carapace à pics, teintes grises/vertes, grandes lames digitales conservées. Découpe des plaques, détails des doigts et pieds reconstruits.
- Pas de coupe; quelques contours fins colorés visibles dans RGB brut à distinguer des pixels réellement opaques.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/reoutbreak2-tyrant-r-heading-candidate-0.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/reoutbreak2-tyrant-r/idle.json). SHA256 du PNG: `a54333dbe6180edd09625d24aabba86c4d2e018ec9e5e55b19b2286912abe97d`.

### REC_MONSTER_NEIL_REV2_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Revelations 2 (2015). Statut: `CANDIDATE_WITH_LIMITS`.

- Asymétrie conservée: bras gauche rouge à excroissances du côté proche, énorme croissance noire du bras droit du côté éloigné.
- Deux appuis nus, grande griffe noire et extrémités des pointes rouges contenus; tête et appuis lisibles vers la gauche, torse assez ouvert.
- Pantalon déchiré et bracelet de cheville anatomique droite restent cohérents avec la source.
- Cadrage très serré:9px haut et17px bas à alpha≥16, sans contact ni coupe observée; texture et nouvelles surfaces reconstruites.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/rerev2-monster-neil-heading-candidate-1.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/rerev2-monster-neil/idle.json). SHA256 du PNG: `09e9745ca6be63d5754d58cd7d62af189c7230cb0d80bd3cc4be16db1e045bf1`.

### REC_VULCANBLUBBER_REV2_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Revelations 2 (2015). Statut: `CANDIDATE_WITH_LIMITS`.

- Asymétrie conservée: masse levée dans la main gauche proche, canon porté du côté droit éloigné; sac/bouteilles restent sur la hanche gauche proche.
- Une figure complète, masse, canon, casque à pics et deux bottes contenus.
- Tête et bottes orientées gauche en trois-quarts; buste encore assez ouvert. Détails de tissu, peau et ferrures reconstruits.
- Cadrage haut/bas serré (16px/18px à alpha≥16) sans coupe constatée.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/specimens/rerev2-ironhead.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_2/rerev2-vulcanblubber/idle.json). SHA256 du PNG: `8cd158ac70a1d52147f949c4233f7945cd9a909735f728f4fc7b960d13d4e10f`.

### REC_ROTTEN_REV2_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Revelations 2 (2015). Statut: `CANDIDATE_WITH_LIMITS`.

- Asymétrie conservée: manche gauche longue du côté proche, bras droit dénudé éloigné; laçage sur la hanche gauche proche.
- Une figure entière orientée gauche, deux mains et pieds nus complets, bonnet, veste et pantalon cohérents avec la source.
- Pose des bras adaptée; détails de peau, doigts et déchirures reconstruits.
- Pas de coupe constatée; marges haut/bas55px/48px à alpha≥16.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/rerev2-rotten-article-candidate-1.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/rerev2-rotten/idle.json). SHA256 du PNG: `4e646f78f10f3f156512082260adfd0083f4e95e31bd998c48898bf1a0226698`.

### REC_GARMR_REQUIEM2026_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Requiem (2026). Statut: `TRIAL_LATERALITY_ERROR`.

- Quatre membres, queue et langue entière; silhouette gauche contenue.
- La lésion longitudinale à côtes du flanc droit proche dans la source tournée à droite est reportée sur le flanc gauche proche de la sortie gauche: détail latéral inversé.
- La référence ne documente pas le flanc gauche caché; même une correction devra garder une limite explicite de reconstruction de ce côté.
- Nappe RGB de l’aperçu ne vaut pas fond opaque; vérifier alpha réel séparément.
- 276pixels alpha≥16 hors rayon12px du noyau alpha128, max80/255: fibres/résidus surtout autour de la queue et fourrure. Finition non parfaite; aucune nappe opaque détectée.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/rerequiem-garmr.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_3/rerequiem-garmr/idle.json). SHA256 du PNG: `70881621ad8b16961169a9ac1b057d7290002e47f44c481d2fc3da9ba0ae1616`.

### REC_LICKER_BETA2_REQUIEM2026_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Requiem (2026). Statut: `CANDIDATE_WITH_LIMITS`.

- Corps bas dirigé à gauche, quatre membres distincts reliés au tronc, griffes terminales et boucle linguale complètes.
- Longue langue à extrémité élargie/dentelée conservée comme un seul appendice continu depuis la bouche; pas de queue supplémentaire observée.
- Cerveau exposé, musculature et palette rouge-brun cohérents avec la source attribuée àRequiem2026.
- Pose des membres dégagée et nouvelle surface latérale reconstruites; nombre exact des petites dents/griffes et microtexture non certifiés.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/rerequiem-licker-beta2-heading-candidate-1.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/rerequiem-licker-beta2/idle.json). SHA256 du PNG: `f17fec32a0f434d0e3ad18e28fe746a5c14f9db12977616473e6d77c20877961`.

### REC_TYRANT_T501_REQUIEM2026_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil Requiem (2026). Statut: `CANDIDATE_WITH_LIMITS`.

- Une figure complète en trois-quarts gauche, tête/buste et deux bottes dirigés gauche; deux mains gantées contenues.
- Fermeture/boutons restent du côté anatomique droit éloigné; grand ensemble de pochettes et cylindres sur hanche gauche proche, cohérent avec la source.
- Manteau long noir, tête nue grisâtre, col haut et équipement conservés sans ajout d’arme.
- Détail des rides, panneaux du manteau, gants et accessoires reconstruit; pas de certification des pixels natifs.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/rerequiem-tyrant-t-501-article-candidate-0.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/rerequiem-tyrant-t-501/idle.json). SHA256 du PNG: `cd336c8ad135a7b43f405bd6d92c9877f1d5901b86c7e69b6cd1a0cfb87b64aa`.

### REC_CHAINSAW_SISTER_LIGHT_DRESS_RE4R_FULLBODY_LEFT_V10_01.png

Édition: Resident Evil 4 remake (2023). Statut: `CANDIDATE_WITH_LIMITS`.

- Une seule sœur retenue: robe claire à manches courtes et tête bandée, conforme à la figure au premier plan de la source; aucun mélange avec la sœur au long manteau/jupe verte.
- Corps gauche entier, deux mains sur la tronçonneuse rouge, lame complète et deux chaussures visibles.
- Pas de doublon de personnage ni de second outil. Pose, plis, cheveux, pansement et détails de chaîne reconstruits.
- Fidélité d’édition soutenue par la référence fournie; pas de certification du profil caché1:1.
- 180pixels alpha≥16 hors rayon12px du noyau alpha128, max73/255, répartis autour des cheveux; détails semi-transparents à contrôler dans le moteur.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/re4r-chainsaw-sisters-candidate-6.jpg) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/re4r-chainsaw-sisters/idle.json). SHA256 du PNG: `641814994c87fa4d750e47e6c86436dd5089ddc783eb286394634ee77bb6c93e`.

### REC_WASP_OUTBREAK2_FULLBODY_LEFT_V10_02.png

Édition: Resident Evil Outbreak File #2 (2004). Statut: `CANDIDATE_WITH_LIMITS`.

- Six chaînes de pattes distinctes et terminées sont désormais traçables, aux extrémités approximatives x161/y942,331/941,357/1078,532/980,711/1107,918/1034 sur1312×1199.
- Les deux longues antennes ajoutées en01 ont disparu; les deux surfaces alaires et le dard restent entiers.
- Tête, thorax et abdomen gardent une lecture gauche. Correction du compte anatomique confirmée; veines et dents des ailes restent une reconstruction.
- Marge droite31px(2,36%) serrée mais aile contenue; aucun ajout d’un septième membre observé.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/reoutbreak2-wasp.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_1/reoutbreak2-wasp/idle.json). SHA256 du PNG: `4666dfc0aec5b7efaca46994a14feda24a2ad8f8c4ecd9ba6cc7de25b4c036be`.

### REC_GARMR_REQUIEM2026_FULLBODY_LEFT_V10_02.png

Édition: Resident Evil Requiem (2026). Statut: `CANDIDATE_WITH_LIMITS`.

- La longue lésion précédemment copiée sur le flanc gauche proche a été retirée. Une trace apparaît derrière le dos côté droit éloigné, compatible avec la latéralité source.
- Quatre pattes, queue, oreilles et langue sont complètes et lisibles vers la gauche; pas de miroir de la silhouette.
- Le flanc gauche maintenant couvert de fourrure demeure une interprétation du côté absent de la référence; ce correctif ne prouve pas une apparence canonique1:1.
- Fibres de fourrure semi-transparentes et faible résidu autour de la queue restent à examiner dans un import; aucun fond opaque ne doit être déduit du seul RGB d’aperçu.
- 576pixels alpha≥16 hors rayon12px du noyau alpha128, max90/255: fibres/résidus surtout autour de la queue et fourrure. Finition non parfaite; aucune nappe opaque détectée.

Preuve source: [bitmap au commit figé](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/rerequiem-garmr.png) · [reçu historique](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_3/rerequiem-garmr/idle.json). SHA256 du PNG: `b927a1282237de06e253b8c2addce08c7bfa3110ed8d2efe88effb125512fb9e`.

## Limites et preuves

- Les sorties sont des études générées; elles ne sont ni des pixels natifs Capcom ni une conformité anatomique/texture1:1 certifiée.
- Une seule référence documentaire peut laisser des surfaces opposées cachées. Leur reconstruction est explicitement signalée.
- Alpha réel vérifié, mais le corps est souvent légèrement inférieur à255; résidus fins et cheveux/fourrures semi-transparents possibles. Aucun import moteur, animation, pivot, taille standard ou collision testé.
- Les références originales et copies de reçus sous references/ sont hors publication.
- Les marges demandées ne sont pas uniformément atteintes; les valeurs réelles sont fournies et aucune silhouette significative ne touche le bord à alpha≥16.

Les références documentaires, leurs empreintes, les métriques et les originaux de génération sont détaillés dans [QA_INDEPENDENT_V10.json](QA_INDEPENDENT_V10.json). Les calculs indépendants bruts figurent dans [TECHNICAL_INDEPENDENT_V10.json](TECHNICAL_INDEPENDENT_V10.json). Le journal producteur reste [GENERATION_V10.json](GENERATION_V10.json).
