# QA des quatre candidats RE4 / Village V7

Date : 19 novembre 2026. Comparaison visuelle des PNG générés avec les fichiers sources exacts récupérés depuis le commit `12deacf4cf9b7706eba69fecc1c13593d030180b`. Lecture seule : aucun pixel modifié.

**État final : quatre candidats retenables avec limites ; Soldat Jet01 est écarté et remplacé par02 après contrôle.** Cette revue n’établit aucune fidélité métrique 1:1 ni intégration au moteur. Les preuves par fichier, SHA-256 et mesures complètes figurent dans `QA_RE4_VILLAGE_V7.json` ; les sources et reçus sont dans `SOURCE_RECOVERY_V7.json` et les générations dans `GENERATION_RE4_VILLAGE_V7.json`. La correction Soldat Jet02 est tracée dans `SOLDAT_JET_CORRECTION_V7_02_RECEIPT.json`.

| Sortie | Dimensions | Marges G/H/D/B, alpha >16 | Verdict |
|---|---:|---:|---|
| Iron Maiden2005 —01 | 1085 × 1449 | 50 / 73 / 122 / 84 | Candidat avec limites de proportions et de détail des épines. |
| Verdugo2023 —01 | 1254 × 1254 | 59 / 22 / 110 / 22 | Candidat avec limites ; queue et crochets entiers. |
| Soldat Jet —01 | 1152 × 1366 | 35 / 106 / 23 / 118 | Essai écarté : corps presque frontal. |
| Soldat Jet —02 | 1151 × 1366 | 104 / 94 / 77 / 60 | Candidat corrigé : corps entier tourné à gauche. |
| Vârcolac —01 | 1200 × 1310 | 46 / 104 / 44 / 78 | Candidat avec limite de détourage de la crinière. |

## Iron Maiden2005

La sortie contient un sujet entier, orienté à gauche en trois-quarts. Elle conserve le corps gris relativement mince, le cou allongé, la bouche dentée, les mains griffues, les deux pieds et les épines courtes de la variante 2005. Le crâne paraît plus massif et la disposition exacte des épines est reconstruite. Aucun membre supplémentaire ni extrémité coupée n’a été identifié. Il ne s’agit pas d’une substitution par la variante 2023 plus gonflée.

## Verdugo2023

Les deux mains présentent chacune trois grands crochets. Les deux pieds, la longue queue segmentée et sa lame terminale sont entiers. La face claire et ses mandibules, les plaques épineuses et la boucle caudale restent cohérentes avec le remake. La sortie tourne la tête et le corps vers la gauche ; la courbure de la queue est une adaptation de pose. Les bandes rectangulaires parasites visibles dans l’image source ne sont pas reproduites comme anatomie. Les marges verticales sont faibles, mais les extrémités restent contenues. Les plaques, reliefs et proportions ne sont pas certifiés 1:1.

## Soldat Jet — essai01 écarté, correction02 contrôlée

Les deux foreuses, les bottes, la tête mécanique, le cœur rouge et la structure dorsale de01 sont visibles en entier. En revanche, le regard gauche de la tête ne suffit pas à établir la nouvelle orientation : plastron, ceinture, bassin et écartement des jambes restent presque frontaux ; les deux foreuses s’ouvrent de part et d’autre comme dans la source. Cette01 est conservée inchangée dans `trials/`, avec le statut `REJECTED_SUPERSEDED`.

La correction02 a été ouverte indépendamment : tête, thorax, bassin et bottes lisent désormais la gauche. Les deux foreuses projettent vers la gauche et leurs pointes demeurent entières et séparées ; la structure dorsale reste contenue dans le cadre. La correction répond donc au défaut identifié. Les détails latéraux et dorsaux exposés par cette rotation restent reconstruits, sans certification 1:1. La copie dans `assets/` possède le même SHA-256 que l’original de génération : `56fefe61bcf7b75d37b6aa948e6dfaba6f1beb453bc8e2e0bb0c82b31a964c97`.

## Vârcolac01

Le sujet adopte une posture basse à quatre membres et regarde vers la gauche. Deux grandes mains, deux pieds, la crinière grise, la gueule ouverte et les vêtements déchirés restent reconnaissables et entiers. Aucune queue ou membre supplémentaire n’est observé. La crinière est plus ample, et son arrangement fin ainsi que les détails de la face sont régénérés.

Un résidu gris/brun demeure autour de fibres de la crinière. Le contrôle numérique relève **2 275 pixels alpha >16 à au moins12 pixels de la zone alpha ≥128**, avec un maximum de126. Cette zone peut inclure des fibres très fines, mais ces valeurs peuvent effectivement contribuer au composite : on ne peut pas décrire tous ces pixels comme invisibles. Le candidat demeure utilisable pour revue statique, avec une limite de détourage explicitement conservée.

## Transparence et portée

Les quatre fichiers sont RGBA, avec alpha 0–255. Les maxima alpha sur les bords extérieurs sont 0 ou 1 ; aucune silhouette alpha >16 ne touche le bord. Iron Maiden et Verdugo ne présentent aucun pixel alpha >16 dans la zone éloignée définie ci-dessus. Leurs pixels RGB rouges saturés du preview ont respectivement alpha ≤4 et ≤2. Le Soldat porte de véritables lumières rouges : ses pixels rouges de forte opacité ne sont pas automatiquement des défauts de fond.

Les valeurs alpha médianes des pixels non nuls sont 252–253 ; le corps n’est donc pas uniformément à alpha 255. Cette observation et les mesures de contour ne remplacent pas une recette sur les fonds du jeu. Ni les animations, ni les appuis, ni l’échelle et les pivots, ni le changement de côté n’ont été testés.

