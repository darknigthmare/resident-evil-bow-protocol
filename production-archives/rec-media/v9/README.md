# Resident Evil Combat — lot B.O.W. V9

**Neuf poses corporelles gauches sont retenues comme candidats visuels avec limites. Quatre essais sont conservés, soit treize PNG originaux.** Ce lot regroupe des études générées, statiques, sans certification de fidélité 1:1 et sans admission dans le moteur.

Les références initiales proviennent du commit `12deacf4cf9b7706eba69fecc1c13593d030180b`. Elles ont été récupérées en lecture seule, comparées aux SHA des reçus puis ouvertes avant génération. Les treize copies livrées sont identiques aux fichiers retournés par `image_gen.imagegen`.

## Candidats retenus

| Incarnation | PNG original | Dimensions |
|---|---|---:|
| Adder — Resident Evil remake (2002) | [REC_ADDER_RE1R_2002_FULLBODY_LEFT_V9_01.png](assets/REC_ADDER_RE1R_2002_FULLBODY_LEFT_V9_01.png) | 1983 × 793 |
| Crimson Head — Resident Evil remake (2002) | [REC_CRIMSON_HEAD_RE1R_2002_FULLBODY_LEFT_V9_01.png](assets/REC_CRIMSON_HEAD_RE1R_2002_FULLBODY_LEFT_V9_01.png) | 1085 × 1450 |
| Wasp — Resident Evil remake (2002) | [REC_WASP_RE1R_2002_FULLBODY_LEFT_V9_01.png](assets/REC_WASP_RE1R_2002_FULLBODY_LEFT_V9_01.png) | 1402 × 1122 |
| El Gigante — Resident Evil 4 remake (2023) | [REC_EL_GIGANTE_RE4R_2023_FULLBODY_LEFT_V9_01.png](assets/REC_EL_GIGANTE_RE4R_2023_FULLBODY_LEFT_V9_01.png) | 1199 × 1312 |
| G-Embryo — Resident Evil Outbreak (2003) | [REC_G_EMBRYO_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png](assets/REC_G_EMBRYO_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | 1536 × 1024 |
| Small Leech — Resident Evil Outbreak (2003) | [REC_SMALL_LEECH_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png](assets/REC_SMALL_LEECH_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | 1774 × 887 |
| Nosferatu — Resident Evil CODE: Veronica (2000) | [REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_02.png](assets/REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_02.png) | 1130 × 1392 |
| Thanatos-R — Resident Evil Outbreak (2003) | [REC_THANATOS_R_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png](assets/REC_THANATOS_R_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | 1133 × 1388 |
| Giant Wasp — Resident Evil Outbreak (2003) | [REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_03.png](assets/REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_03.png) | 1402 × 1122 |

**Nosferatu 02** corrige la latéralité de son grand appendice : l’attache anatomique droite passe du côté éloigné dans la vue gauche. **Giant Wasp 03** supprime uniquement la patte surnuméraire de 02 ; six chaînes de pattes restent distinctes, avec les ailes déchirées et le dard entiers.

**Thanatos-R 01** conserve le bras gauche géant, le moignon droit et les deux jambes asymétriques. Un complément communautaire qualifié a permis de dégager les pieds auparavant occultés. Ce complément sert à leur topologie, sans certifier une extraction native inchangée et sans reprendre sa lumière bleue.

Le changement de pose reconstruit des surfaces, des détails et parfois des proportions. Les poses humanoïdes sont généralement des trois-quarts gauches assez ouverts. La QA documente ces limites plutôt que d’attribuer une correspondance 1:1.

## Essais conservés, non retenus

| PNG original | Défaut constaté |
|---|---|
| [REC_G_FOURTH_FORM_RE2R_2019_FULLBODY_LEFT_V9_01.png](trials/REC_G_FOURTH_FORM_RE2R_2019_FULLBODY_LEFT_V9_01.png) | Torse et bassin trop frontaux pour la pose gauche demandée ; correction 02 refusée par l’outil. |
| [REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_01.png](trials/REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_01.png) | Grand appendice sur le mauvais côté anatomique ; corrigé dans 02. |
| [REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png](trials/REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | Sixième chaîne de patte non traçable sans hypothèse. |
| [REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_02.png](trials/REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_02.png) | Sept pattes au lieu de six ; surplus retiré localement dans 03. |

## Appels refusés et sujets encore tenus

**Quatorze appels ont produit treize PNG et un refus sans image.** La correction G quatrième forme 02 a été refusée au stade sortie (`moderation_blocked`, catégorie `violence`, requête `e6321677-42d0-43d8-9376-df84eba0f25e`). Aucun PNG 02 et aucun nouvel appel pour cette identité ne suivent ce refus. Le premier essai reste non admis. Voir le [reçu de refus](docs/G4_CORRECTION_V9_02_RECEIPT.json).

Quatre identités de la file de quatorze restent sans appel V9 :

- **G-Young RE2 remake (2019)** : attaches et compte des membres fins non établis. La piste vidéo récupérée est invalide ; aucune frame de rotation n’a été utilisée.
- **Kipepeo RE5 (2009)** : continuité des filaments non établie. La miniature complémentaire de 150 × 168 est insuffisante.
- **Baby Moth Outbreak (2003)** : prolegs et identité de la larve complémentaire insuffisamment établis.
- **Garrador RE4 original (2005)** : tenu en raison du refus préalable de l’identité apparentée Garrador remake dans V8. Aucun refus propre à la version 2005 n’est inventé.

Le [rapport de recherche bornée](docs/REFERENCE_RECOVERY_HELD_V9.md) explique les trois holds anatomiques maintenus et la levée limitée du hold de Thanatos-R. Il ne prétend pas démontrer l’absence mondiale de références plus complètes.

## Transparence, cadrage et portée

Les treize PNG sont RGBA et possèdent une transparence réelle. Aucun pixel alpha ≥ 16 ne touche le bord du canevas ; aucun pixel à ce seuil ne se trouve à 12 px ou plus du noyau alpha ≥ 128. Les corps sont souvent légèrement moins opaques que 255, et des valeurs RGB colorées presque transparentes restent présentes. Cela ne constitue pas un détourage moteur certifié.

Les marges demandées ne sont pas uniformément atteintes. Leurs valeurs réelles sont jointes, ainsi que les réserves sur les membres, la lecture gauche et les surfaces reconstruites. Aucun pivot, baseline, atlas, animation, collision ou import moteur n’a été testé. Les tailles ne sont pas normalisées et aucun PNG n’a été redimensionné, retouché ou retourné.

## Provenance et documents

**Les bitmaps de référence, pages, modèles et téléchargements sous `references/` sont exclus de la livraison et du ZIP.** Seuls leurs métadonnées, URL et SHA restent dans les rapports. Les chemins absolus `/workspace/...` et `references/...` contenus dans le JSON désignent les traces de travail du contrôle, pas des fichiers distribués.

- [Manifeste des images et statuts](manifests/ASSET_MANIFEST_V9.json).
- [Inventaire des fichiers livrés](manifests/DELIVERY_INVENTORY_V9.json).
- [QA indépendante figée](docs/QA_INDEPENDENT_V9.md) et [version JSON](docs/QA_INDEPENDENT_V9.json).
- [Revue de production consolidée](docs/QA_INITIAL_V9.md) et [métriques](docs/TECHNICAL_QA_V9.json).
- [Registre des quatorze appels](docs/GENERATION_RECEIPTS_V9.json).
- [Prompts initiaux exacts](docs/GENERATION_PROMPTS_V9.json), [compléments Thanatos/guêpe](docs/GENERATION_SUPPLEMENTAL_V9.json), corrections [Nosferatu 02](docs/GENERATION_CORRECTION_NOSFERATU_V9_02.json), [G4 02 refusée](docs/GENERATION_CORRECTION_G4_V9_02.json) et [Giant Wasp 03](docs/GENERATION_CORRECTION_GIANT_WASP_V9_03.json).
- [Récupération des sources](docs/SOURCE_RECOVERY_V9.json) et [recherche complémentaire](docs/REFERENCE_RECOVERY_HELD_V9.json).
- [Sommes SHA256](CHECKSUMS_SHA256.txt).

La file `SOURCE_QUEUE_V9.json` conserve l’allocation avant inspection ; les états `statusAtDefinition` des prompts décrivent également leur préparation. Les décisions actuelles sont celles du manifeste et de la QA indépendante. Les reçus antérieurs R34 ne valent pas validation automatique de ces nouvelles sorties.
