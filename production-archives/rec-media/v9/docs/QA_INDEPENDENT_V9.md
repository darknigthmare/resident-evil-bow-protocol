# Contrôle indépendant V9

État final figé.

**13 PNG contrôlés : 9 candidats avec limites et 4 essais.** 1 refus de génération documenté(s) dans les reçus consultés.

## Méthode

La revue compare chaque PNG à ses références documentaires exactes et à son édition. Elle examine le nombre de sujets, le corps entier, le sens gauche, les membres, les asymétries et le détourage. Les SHA256 et la copie binaire de chaque original de génération ont été recalculés indépendamment. Les recompositions sur fond gris servent uniquement à la lecture de l’alpha dans un dossier de travail extérieur au lot ; aucun PNG livré n’a été modifié.

Le contrôle extérieur cherche les pixels à au moins 12 pixels du noyau d’alpha ≥128. Les couleurs cachées sous un alpha nul ne constituent pas un halo visible. Pour les PNG de ce relevé, aucun pixel d’alpha ≥16 n’atteint le bord et aucune plaque d’alpha ≥16 n’est détectée dans cette zone extérieure. Les marges ci-dessous sont en pixels, dans l’ordre gauche, haut, droite, bas.

| PNG | Décision | Dimensions | Marges alpha ≥16 | Copie originale |
|---|---|---:|---:|---|
| [ADDER_RE1R_2002_01](../assets/REC_ADDER_RE1R_2002_FULLBODY_LEFT_V9_01.png) | Candidat avec limites | 1983 × 793 | 72 / 224 / 68 / 246 | Identique |
| [CRIMSON_HEAD_RE1R_2002_01](../assets/REC_CRIMSON_HEAD_RE1R_2002_FULLBODY_LEFT_V9_01.png) | Candidat avec limites | 1085 × 1450 | 190 / 63 / 155 / 64 | Identique |
| [WASP_RE1R_2002_01](../assets/REC_WASP_RE1R_2002_FULLBODY_LEFT_V9_01.png) | Candidat avec limites | 1402 × 1122 | 95 / 61 / 94 / 100 | Identique |
| [G_FOURTH_FORM_RE2R_2019_01](../trials/REC_G_FOURTH_FORM_RE2R_2019_FULLBODY_LEFT_V9_01.png) | Essai non retenu | 1478 × 1064 | 55 / 20 / 102 / 22 | Identique |
| [EL_GIGANTE_RE4R_2023_01](../assets/REC_EL_GIGANTE_RE4R_2023_FULLBODY_LEFT_V9_01.png) | Candidat avec limites | 1199 × 1312 | 39 / 21 / 104 / 36 | Identique |
| [NOSFERATU_CODE_VERONICA_2000_01](../trials/REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_01.png) | Essai non retenu | 1130 × 1392 | 83 / 35 / 153 / 26 | Identique |
| [G_EMBRYO_OUTBREAK_2003_01](../assets/REC_G_EMBRYO_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | Candidat avec limites | 1536 × 1024 | 88 / 156 / 78 / 161 | Identique |
| [GIANT_WASP_OUTBREAK_2003_01](../trials/REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | Essai non retenu | 1402 × 1122 | 179 / 62 / 113 / 90 | Identique |
| [SMALL_LEECH_OUTBREAK_2003_01](../assets/REC_SMALL_LEECH_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | Candidat avec limites | 1774 × 887 | 273 / 262 / 183 / 213 | Identique |
| [NOSFERATU_CODE_VERONICA_2000_02](../assets/REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_02.png) | Candidat avec limites | 1130 × 1392 | 80 / 32 / 148 / 27 | Identique |
| [THANATOS_R_OUTBREAK_2003_01](../assets/REC_THANATOS_R_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | Candidat avec limites | 1133 × 1388 | 131 / 37 / 87 / 44 | Identique |
| [GIANT_WASP_OUTBREAK_2003_02](../trials/REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_02.png) | Essai non retenu | 1402 × 1122 | 177 / 58 / 108 / 90 | Identique |
| [GIANT_WASP_OUTBREAK_2003_03](../assets/REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_03.png) | Candidat avec limites | 1402 × 1122 | 176 / 55 / 109 / 88 | Identique |

## Observations par PNG

### ADDER RE1R 2002 FULLBODY LEFT V9 01

**Resident Evil remake (2002) — candidat avec limites.**

Serpent sans membres, corps continu en S, tête fermée à gauche et pointe de queue à droite entièrement contenus. Marques claires de tête et bandes brun-or cohérentes avec la source du remake 2002.

Limites : Écailles et surface reconstruits à partir d’une source 450×360 ; leur correspondance pixel à pixel n’est pas établie.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/re1r-adder.png). SHA256 source : `6050dc9705184ad1999ec3217d1d013b488aa268a1158eb9deaa38a6b7d01fe0`. SHA256 PNG : `e44b62dc0b7610f51319be5d74b5f18b936199773c830adbb5c5cbb7fc52d46c`.

### CRIMSON HEAD RE1R 2002 FULLBODY LEFT V9 01

**Resident Evil remake (2002) — candidat avec limites.**

Tête, torse penché, bassin et pieds lisibles vers la gauche ; deux bras, deux jambes et toutes les extrémités sont visibles. Déchirure d’épaule anatomique gauche conservée sur le côté proche, vêtement brun, yeux pâles et peau rouge cohérents.

Limites : Pose, visage, doigts et déchirures détaillées régénérés ; source peu définie, aucun contrôle d’un modèle natif.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/source-research-extra/pipeline-five/crimson-zombie-full.png). SHA256 source : `f8571e33c997e072bafbf36cdd081d83cf3b1c8a1bc254fbac11d29cdb0ffa9b`. SHA256 PNG : `0544982c268c0ee46b096d166e383cce89b66f8cc9b76572203824fabcb06d3d`.

### WASP RE1R 2002 FULLBODY LEFT V9 01

**Resident Evil remake (2002) — candidat avec limites.**

Six pattes jointées traçables, deux surfaces alaires principales cohérentes avec le visuel 2002, dard et extrémités entiers. Tête ocre et yeux noirs, abdomen rayé et membranes claires maintenus ; sujet volant sans transformation bipède.

Limites : Nervures et microrelief reconstruits ; ne pas lui appliquer le dessin à quatre ailes dorées du visuel RE1 1996.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/re1r-wasp.png). SHA256 source : `0dc50891066fd4f2fb09077e84740f2e07675321f7302ba8b9b62a04d2ee3002`. SHA256 PNG : `960c75b3164a5f7912ce981d34771a663689fe73a82f29eeb584ba6e33235898`.

### G FOURTH FORM RE2R 2019 FULLBODY LEFT V9 01

**Resident Evil 2 remake (2019) — essai non retenu.**

Corps entier, deux bras fortement asymétriques et deux jambes conservés, sans inversion évidente des appendices principaux. Thorax ouvert et bassin restent presque frontaux ; seuls les pieds et légèrement le museau suggèrent la gauche.

Limites : Ne remplit pas le gap de vue corporelle gauche indépendante. Correction 02 refusée au stade output/violence, request e6321677-42d0-43d8-9376-df84eba0f25e ; aucun PNG02 et aucune nouvelle tentative.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/re2r-g-fourth-form-article-candidate-1.webp). SHA256 source : `cdd536038ca4bba7519734dfbdeed9843f750e4e65d1044110a177f80b20aca7`. SHA256 PNG : `62f1da4ff4adcef5a82c67696989dc9056b5c2ba026c9ec3bfe8b285e907e666`.

### EL GIGANTE RE4R 2023 FULLBODY LEFT V9 01

**Resident Evil 4 remake (2023) — candidat avec limites.**

Grand corps gris, deux bras et deux jambes, tête dirigée à gauche, cordes cervicales et tissu de taille cohérents. Parasite dorsal et ses filaments, mains et pieds complets dans le cadre.

Limites : Trois-quarts ouvert plutôt qu’un profil strict ; nouveaux plis, doigts et surfaces éloignées reconstruits. Marge supérieure réduite mais extrémités contenues ; aucun pixel alpha≥16 au bord.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/re4r-el-gigante-candidate-3.jpg). SHA256 source : `8091d46a31220af44c5c502c049aed1125765b798856ba337ed40fa5b17fda2d`. SHA256 PNG : `6ee4c20e86eb132ad86ea62f634841992cf020c387ee63535a2a8a6ec07944c6`.

### NOSFERATU CODE VERONICA 2000 FULLBODY LEFT V9 01

**Resident Evil CODE: Veronica (2000) — essai non retenu.**

La racine du très grand appendice apparaît sur l’épaule proche de la vue gauche, donc du côté anatomique gauche. La source situe cette grande racine du côté anatomique droit ; 01 reproduit une disposition ressemblant à un miroir.

Limites : Latéralité majeure erronée ; cet essai ne doit pas être compté comme candidat fidèle.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/recv-nosferatu-article-candidate-0.png). SHA256 source : `4f082ca16a2e7d8bb892912fed041963a2fa9be24655cc261c5aaea9ba284814`. SHA256 PNG : `aba2e2e31dcb6a34b07453198f456d84b769a6d7e1c8cbec4472f03275645a1b`.

### G EMBRYO OUTBREAK 2003 FULLBODY LEFT V9 01

**Resident Evil Outbreak (2003) — candidat avec limites.**

Deux membres antérieurs porteurs, tête arrondie sans yeux visibles, bouche ouverte et longue queue complète ; silhouette rose et appendice ventral cohérents. Tête et axe corporel dirigés à gauche sans membres supplémentaires.

Limites : Dentition et plis amplifiés par génération ; pas de certification géométrique. Le grand halo du preview brut n’est pas une plaque visible : recomposition neutre propre, maximum alpha 1 à 12 pixels du noyau alpha 128.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/reoutbreak-g-embryo.png). SHA256 source : `580eefbb96dce8829b4b8fa30d738a6d6e726477720d6e6fb517c31366c683d8`. SHA256 PNG : `3d818d8ae7363f069b17603b1a753ca37387731bc16c23ff43ff08c48a4bb3c9`.

### GIANT WASP OUTBREAK 2003 FULLBODY LEFT V9 01

**Resident Evil Outbreak (2003) — essai non retenu.**

Ailes déchirées, tête et abdomen rayé, dard et contours entiers cohérents avec la source Outbreak. Cinq longues pattes peuvent être suivies ; le petit crochet superposé vers x490,y820 ne peut pas être relié de façon sûre au thorax comme sixième patte indépendante.

Limites : Le comptage de six pattes est non confirmé. Le producteur a relu et retiré son premier comptage trop affirmatif. Essai conservé ; correction de séparation autorisée par root.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/reoutbreak-giant-wasp.png). SHA256 source : `13f8c0e93ba85d3cc3cbbd057ce63a805a14627151d9667939a389e76d9c7820`. SHA256 PNG : `59f955930c99b4dc7aa8b046f99ab58452988b23eaee10c9f8c0d27a18759cc6`.

### SMALL LEECH OUTBREAK 2003 FULLBODY LEFT V9 01

**Resident Evil Outbreak (2003) — candidat avec limites.**

Un seul organisme sans membres, extrémité arrondie à gauche et queue effilée complète ; teinte brun sombre et stries cohérentes. Courbe distincte du visuel source, sans retournement logiciel observé.

Limites : Source de petite définition ; fines stries et reflets régénérés, géométrie ventrale non documentée.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/reoutbreak-small-leech.png). SHA256 source : `1fa1d11da8add9e4366d62f4561312119090cd7ced8a624b81f0ea4c4c596b2e`. SHA256 PNG : `825bda98e9ffd360fc859cf062d1c20a86419fd0a9640f9780dc42e6da13f1c4`.

### NOSFERATU CODE VERONICA 2000 FULLBODY LEFT V9 02

**Resident Evil CODE: Veronica (2000) — candidat avec limites.**

La grande racine passe maintenant derrière le torse, compatible avec le côté anatomique droit éloigné ; les deux petits crochets sont du côté proche. Tête, bassin, jambes et pieds dirigés à gauche ; toutes les pointes, mains corporelles, pieds et vêtements sont contenus.

Limites : Orientation en trois-quarts encore ouverte ; surfaces arrière et tissu reconstruits depuis une source unique. Correction latérale convaincante, sans certification 1:1 de chaque relief.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/recv-nosferatu-article-candidate-0.png). SHA256 source : `4f082ca16a2e7d8bb892912fed041963a2fa9be24655cc261c5aaea9ba284814`. SHA256 PNG : `46219a71299e22e17bf12c9a7e1ad48c0b9b45e24896412acb62cda06b275077`.

### THANATOS R OUTBREAK 2003 FULLBODY LEFT V9 01

**Resident Evil Outbreak (2003) — candidat avec limites.**

Un bras complet géant anatomique gauche proche, un moignon droit éloigné, deux jambes et deux pieds nus dégagés ; aucun bras droit régénéré. Jambe gauche irrégulière et jambe droite plus lisse, petite tenue noire et grande main à quatre terminaisons cohérentes avec le visuel source. Tête et pieds se lisent vers la gauche ; le thorax reste ouvert en trois-quarts.

Limites : La référence documentaire principale occulte une partie du bas de jambe. La capture Steam d’un port communautaire de Genuline sert seulement de complément topologique pour ce bas de jambe et ce pied. Crédit Outbreak déclaré par le port ; aucune certification de géométrie native inchangée, de provenance officielle ou de fidélité 1:1. La lumière bleue de la scène communautaire n’a pas été reprise. Nouveaux reliefs, pieds et surfaces non vus sous cet angle restent reconstruits.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/reoutbreak-thanatos-r-article-candidate-1.png). SHA256 source : `48bcb2d8069edfad865c497105cff4a28ae9bf9deb6959c20c41d9d73b2300ef`. SHA256 PNG : `fe3993a3378a9611a1371d40b9f05d46ceed3b688bcfb6c74f487127cb7d59b5`.

Complément communautaire limité au bas de jambe et au pied : [page du port](https://steamcommunity.com/sharedfiles/filedetails/?id=2041957312). SHA256 de la capture inspectée : `55f118497adb7c04d3697028392925ea7032fda0ac36b33cfc81e7e2bb781d4d`. Ce port ne certifie pas une géométrie native inchangée.

### GIANT WASP OUTBREAK 2003 FULLBODY LEFT V9 02

**Resident Evil Outbreak (2003) — essai non retenu.**

Sept terminaisons de pattes distinctes sont visibles, approximativement aux abscisses 267,407,475,584,776,781,872 dans le PNG 1402×1122. La courte chaîne centrale finissant vers x584,y883 ajoute un membre au lieu de seulement clarifier les six membres attendus.

Limites : Essai non retenu pour membre supplémentaire ; deux ailes et dard restent contenus. Correction 03 limitée à retirer la courte septième patte.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/reoutbreak-giant-wasp.png). SHA256 source : `13f8c0e93ba85d3cc3cbbd057ce63a805a14627151d9667939a389e76d9c7820`. SHA256 PNG : `7ec5fd916cf70a21cd2b5938c54e62393ea62d99ead60547ac18c52585e58c38`.

### GIANT WASP OUTBREAK 2003 FULLBODY LEFT V9 03

**Resident Evil Outbreak (2003) — candidat avec limites.**

Six pattes continues et six terminaux distincts après suppression de la courte patte centrale surnuméraire. Les deux surfaces alaires avec leurs déchirures, le dard entier, la palette ocre-noir et le corps dirigé à gauche sont préservés.

Limites : Géométrie fine des articulations, veines et déchirures régénérée depuis le visuel documentaire ; pas de certification 1:1. Les 02 et 01 restent des essais séparés, sans être comptés comme nouvelles vues retenues.

Référence documentaire : [fichier au commit de travail](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/catalog/reoutbreak-giant-wasp.png). SHA256 source : `13f8c0e93ba85d3cc3cbbd057ce63a805a14627151d9667939a389e76d9c7820`. SHA256 PNG : `cc32d64405865da748d122697e35eabd6a13ef4941f7e0776af220fa1c754760`.

## Refus et portée

- re2r-g-fourth-form — REC_G_FOURTH_FORM_RE2R_2019_FULLBODY_LEFT_V9_02.png : refus de l’outil, requête `e6321677-42d0-43d8-9376-df84eba0f25e`. Aucun PNG issu de cet appel ; aucune nouvelle tentative autorisée pour cette identité.

Tous les candidats gardent `canonical_one_to_one_certified=false` et `engine_admitted=false`. Ils ne constituent ni une animation ni une intégration moteur. La précision des surfaces reconstruites et des détails absents des références n’est pas certifiée. Les fichiers originaux de référence restent exclus de la publication.
