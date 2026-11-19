# Revue visuelle des B.O.W. V6

Date : 19 novembre 2026. Revue en lecture seule. Les références et les sorties ont été ouvertes séparément à leur cadrage natif. Aucun PNG ou fichier source n’a été retouché, redimensionné ou recomposé par cette revue.

Cette revue couvre les douze PNG produits : dix candidats retenables pour la recherche statique et deux essais écartés, remplacés par les variantes02 contrôlées ci-dessous. Les défauts de latéralité de Cerberus01 et de nombre d’appendices de Chimera01 ont été corrigés. Aucun candidat n’est certifié fidèle 1:1 ou intégré au moteur.

Les valeurs détaillées, empreintes, références et observations par fichier sont consignées dans `QA_BOW_V6.json`. Les prompts exacts sont dans `../prompts/GENERATION_PROMPTS_V6.json`. Cette revue intervient après les corrections et avant l’assemblage final du lot ; elle ne formule aucune affirmation sur l’état courant des PR du dépôt.

## Synthèse des verdicts

| Candidat | Variante retenable | Verdict |
|---|---:|---|
| Reaper RE5 | 01 | Anatomie générale cohérente ; profil et détails fins générés. |
| Regenerador RE4 remake | 01 | Forme régulière cohérente ; proportions de profil à confirmer. |
| Ivy RE2 remake | 01 | Un sujet à tête fermée ; arrangement des lianes et nodules reconstruit. |
| Licker RE2 remake | 01 | Quatre membres, pose basse gauche ; langue rétractée demandée explicitement. |
| Verdugo RE4 2005 | 01 | Trois grands crochets par main ; queue segmentée et lame entières. |
| Cerberus RE1 1996 | 02 | Latéralité de l’épaule corrigée ; source peu résolue. |
| Chimera RE1 remake 2002 | 02 | Quatre appendices dorsaux après suppression du cinquième. |
| Popokarimu RE5 | 01 | Silhouette et grands traits conservés depuis une illustration. |
| Hunter Beta RE3 remake | 01 | Asymétrie principale du bras préservée ; extrémités entières. |
| Drain Deimos RE3 remake | 01 | Six grands membres, deux faux dorsales et appendices antérieurs présents. |

Les dix verdicts correspondent à `CANDIDATE_REVIEWED_WITH_LIMITATIONS`. Cerberus01 et Chimera01, conservés dans `trials/`, portent le statut `REJECTED_SUPERSEDED` et ne doivent pas être utilisés comme variantes retenues.

## Références récupérées depuis le dépôt

Les quatre fichiers ci-dessous proviennent d’un `git show` du commit `12deacf4cf9b7706eba69fecc1c13593d030180b`. Leurs tailles et SHA-256 correspondent exactement aux reçus R34. Les copies locales sont réservées à la référence et à la QA ; leur publication n’est pas incluse dans cette récupération. Les preuves détaillées sont dans `REFERENCE_RECOVERY_V6.json`.

| Copie locale dans `references/` | Dimensions | Observation visuelle |
|---|---:|---|
| `verdugo_re4_2005_full_legacy.webp` | 1800 × 1989 | Corps entier de face / trois-quarts ; deux mains griffues, pieds et queue segmentée terminée en lame contenus dans l’image. |
| `cerberus_re1_1996_full_legacy.webp` | 238 × 499 | Petite vue frontale / trois-quarts du Doberman ; oreilles et lésions asymétriques, queue courte et appuis visibles sous occlusion naturelle. |
| `chimera_re1r_2002_full_legacy.png` | 524 × 808 | Corps entier ; deux bras principaux, quatre appendices dorsaux fins et deux jambes. Grand crochet asymétrique, grand orifice buccal et ventre segmenté. |
| `popokarimu_re5_2009_full_legacy.png` | 560 × 618 | Illustration entière ; ailes repliées, corps bas et abdomen tacheté recourbé avec appendices terminaux. |

L’incarnation est attribuée par les sources et les reçus du dépôt ; cette inspection confirme le contenu visible et le cadrage, sans établir à elle seule une nouvelle provenance officielle. Les vues principalement frontales ne documentent pas toutes les surfaces opposées.

## Reaper RE5 — pose gauche 01

Fichier : `assets/REC_REAPER_RE5_FULLBODY_LEFT_V6_01.png`  
Dimensions : 1254 × 1254, RGBA.  
SHA-256 : `1f939efb2881c7dce4e607c3021a830b884d865abc55100af8b9c5730968ae38`.  
Référence examinée : `references/reaper_re5_full_legacy.png`.

**Verdict : candidat structurellement cohérent ; profil et détails fins non certifiés.**

Le rendu conserve les quatre membres supérieurs terminés en faux, les deux pattes porteuses, les deux longues antennes, l’abdomen segmenté et la zone thoracique claire. La tête projette nettement vers la gauche ; le thorax garde une composante de trois-quarts. Les antennes, les quatre terminaisons en faux et les deux pieds restent dans la toile. Aucun membre humain supplémentaire, équipement ou second sujet n’est observé.

Le profil allongé de la tête, les surfaces latérales et les détails du relief sont une interprétation générée à partir de la référence frontale. La sculpture et la brillance ne constituent pas une extraction des pixels d’origine. Les surfaces cachées ne sont pas certifiées.

Le preview montre des pixels rouges et jaunes autour de certains bords. Un contrôle ciblé de leurs valeurs alpha relève 9 169 pixels rouge vif, tous à alpha ≤ 2, et 911 pixels jaunes, tous à alpha ≤ 5 ; aucun ne dépasse alpha 16. Ce constat écarte l’interprétation d’un large contour rouge opaque. Il ne remplace pas une recette complète des contours sur tous les fonds du moteur.

## Regenerador RE4 remake — pose gauche 01

Fichier : `assets/REC_REGENERADOR_RE4R_FULLBODY_LEFT_V6_01.png`  
Dimensions : 974 × 1614, RGBA.  
SHA-256 : `7dfbb0091763e64d934af346232eb3b64dc452c9f401f1b9f8bf1407778be326`.  
Référence examinée : `references/regenerador_re4r_full_legacy.jpg`.

**Verdict : candidat cohérent avec la variante régulière de 2023 ; proportions du profil à confirmer.**

Le corps arrondi, le ventre, les membres longs, les doigts étirés, les pieds et la peau grise plissée sont conservés. La tête est orientée vers la gauche ; les bras et les jambes sont entiers avec leurs extrémités à l’intérieur de l’image. Aucune rangée d’épines d’Iron Maiden, arme, costume ou excroissance additionnelle n’est observée.

Le rendu expose un profil non montré directement dans la source frontale. Le crâne paraît visuellement plus présent, et l’agencement des dents comme la texture latérale ont été reconstruits. Sans vue latérale de comparaison et sans recalage anatomique, ces proportions ne peuvent pas être certifiées 1:1. Les ongles et détails de surface doivent rester considérés comme générés.

## Ivy RE2 remake — pose gauche 01

Fichier : `assets/REC_IVY_RE2R_FULLBODY_LEFT_V6_01.png`  
Dimensions : 1024 × 1536, RGBA.  
SHA-256 : `e0d088565eb5fbd2ce90772aa946fc1f016b006408dcbe99f17ef4d88e96ee37`.  
Référence examinée : `references/ivy_re2r_full_candidate.png`.

**Verdict : candidat cohérent avec l’Ivy du remake, avec reconstruction de l’agencement fin des lianes et nodules.**

Le fichier contient un seul sujet. Il reprend la tête fermée fendue verticalement, les orbites sombres, les lianes vertes, les nodules ambrés et le corps humanoïde recouvert de racines. Il ne substitue pas la tête florale de l’Ivy de 1998. La référence montre deux présentations du même type, dont une tête ouverte ; la sortie utilise la tête fermée et ne duplique pas ces deux sujets.

La tête est tournée vers la gauche, avec le thorax en trois-quarts. Les deux mains, les deux pieds et les longues lianes visibles restent dans la toile. L’enveloppe alpha >16 est `(138, 41)–(938, 1492)`, laissant des marges de 138/41/85/43 pixels à gauche/en haut/à droite/en bas.

Le chemin exact des lianes, la position de chaque nodule et le profil de la tête ont été reconstruits. Leur nombre et leur emplacement ne sont pas certifiés identiques au modèle d’origine ; le rendu n’est pas une copie de surface 1:1.

## Licker RE2 remake — pose gauche 01

Fichier : `assets/REC_LICKER_RE2R_FULLBODY_LEFT_V6_01.png`  
Dimensions : 1536 × 1024, RGBA.  
SHA-256 : `f7bdc0c7470197f08155d98c793c5970860e6bea08d51ee36ca453f454df90ec`.  
Références examinées : `references/licker_re2r_model_side.png` et `references/licker_re2r_model_three_quarter.png`.

**Verdict : candidat cohérent de pose basse gauche ; langue rétractée explicitement traitée comme adaptation.**

Le cerveau exposé, l’absence d’yeux visibles, les mâchoires dentées, les reliefs des omoplates et vertèbres, les quatre membres et leurs griffes restent reconnaissables. Le corps est unique et tourné vers la gauche en trois-quarts. Toutes les extrémités représentées restent dans le cadre ; aucun membre ou appendice caudal supplémentaire n’est observé. L’enveloppe alpha >16 est `(59, 135)–(1461, 952)`, avec des marges de 59/135/74/71 pixels.

Le modèle de référence présente une langue très étendue. La rétraction demandée pour cette pose explique son absence hors de la bouche ; elle n’est pas qualifiée d’extrémité coupée ni de géométrie originale conservée. Le déplacement des membres vers un appui bas est également une adaptation de pose. La tête et certains reliefs paraissent plus accentués que dans le rendu de référence ; aucune correspondance métrique exacte n’a été calculée ou certifiée.

## Contrôle ciblé de la transparence Ivy / Licker

Les previews montrent des dégradés colorés autour des sujets. Le contrôle des valeurs alpha réelles distingue ce preview du compositing réel :

| Sortie | Alpha min/max | Pixels inspectés à au moins 12 px de la silhouette alpha ≥128 | Alpha maximal dans cette zone | Pixels de cette zone avec alpha >16 |
|---|---:|---:|---:|---:|
| Ivy | 0 / 254 | 1 041 990 | 1 | 0 |
| Licker | 0 / 254 | 1 049 131 | 2 | 0 |

La quasi-totalité de cette zone est entièrement transparente : 1 039 935 pixels pour Ivy et 1 008 890 pour Licker. Les autres pixels mesurés ne transmettent au maximum que 1/255 ou 2/255 de la couleur. Aucun fond opaque n’est établi par ces dégradés du preview. Cette analyse numérique n’altère pas les images et ne remplace pas leur recette finale sur les fonds du jeu.

## Drain Deimos RE3 remake — contrôle préalable des références 3D

Fichiers examinés : `references/drain_deimos_re3r_qualified_three_quarter.png` et `references/drain_deimos_re3r_qualified_side.png`, rendus de 1400 × 1050 fournis par la tâche de références.

Le trois-quarts permet de distinguer trois paires de grands membres articulés terminés en griffes, une paire de longs appendices en faux dressés au-dessus du dos et de petits appendices autour de la bouche. Le profil superpose certaines paires et ne doit pas servir à en supprimer. Les faux dorsales ne sont pas à décrire comme une quatrième paire de pattes porteuses.

L’agent de références rapporte des groupes d’armature correspondants : paires `Foot`, `FrontBigArm`, `FrontLeg`, `FrontSmallArm` et `Foot_deco`. Cette concordance renseigne le prompt et le contrôle ultérieur ; elle n’est pas une validation d’une animation ou d’une nouvelle image générée. La provenance du modèle et le rendu relèvent du dossier de références.

## Verdugo RE4 2005 — pose gauche 01

Fichier : `assets/REC_VERDUGO_RE4_2005_FULLBODY_LEFT_V6_01.png`. Référence : `references/verdugo_re4_2005_full_legacy.webp`.

**Verdict : candidat cohérent, silhouette entière ; surfaces et détail du profil reconstruits.**

Les deux mains montrent chacune trois grands crochets. Les pieds, la queue segmentée et sa grande lame terminale restent dans le cadre. Le thorax annelé, la carapace sombre, les mandibules et les yeux orangés restent reconnaissables. La tête est davantage tournée vers la gauche que dans la référence, tandis que le corps demeure en trois-quarts. Aucun membre supplémentaire ou segment de queue manquant n’est établi par la comparaison.

Les écailles, reflets et détails latéraux sont régénérés. La proximité de la pose avec la source ne démontre pas une correspondance des surfaces ou des proportions 1:1.

## Cerberus RE1 1996 — essai01 écarté, correction02 retenable

Fichiers : `trials/REC_CERBERUS_RE1_1996_FULLBODY_LEFT_V6_01.png` et `assets/REC_CERBERUS_RE1_1996_FULLBODY_LEFT_V6_02.png`. Référence : `references/cerberus_re1_1996_full_legacy.webp`.

**Verdict01 : défaut de latéralité de l’épaule confirmé ; essai écarté. Verdict02 : correction observée et candidat retenable avec limites.**

La source frontale / trois-quarts place l’oreille intacte à gauche de l’image, donc à droite anatomique ; le côté abîmé de la tête est à droite de l’image, donc à gauche anatomique. La grande lésion d’épaule est à gauche de l’image, donc à droite anatomique. Ces repères ont été utilisés conjointement pour éviter de confondre un simple changement de point de vue avec une inversion.

Dans la pose tournée à gauche, le côté proche est le côté gauche anatomique. La variante01 conservait correctement la latéralité de la tête, mais plaçait également la grande lésion sur l’épaule proche : ce second placement était erroné. La variante02 montre le pelage intact sur l’épaule et l’antérieur proches, tandis que la lésion est visible sur l’antérieur éloigné droit. L’oreille éloignée intacte et le côté proche de la tête endommagé conservent leurs positions respectives. La correction répond donc au défaut identifié sans inversion globale du sujet.

Le chien est unique et entier, avec quatre membres et une queue courte. Le cadrage reste très serré verticalement : 8 pixels en haut et 17 en bas à alpha >16. La pointe de l’oreille et les griffes sont représentées en entier ; l’objectif de marge de 5% n’est pas atteint. La source de 238 × 499 pixels ne permet pas de certifier le détail du pelage, des dents et des surfaces latérales.

## Chimera RE1 remake 2002 — essai01 écarté, correction02 retenable

Fichiers : `trials/REC_CHIMERA_RE1R_2002_FULLBODY_LEFT_V6_01.png` et `assets/REC_CHIMERA_RE1R_2002_FULLBODY_LEFT_V6_02.png`. Référence : `references/chimera_re1r_2002_full_legacy.png`.

**Verdict01 : cinquième appendice dorsal confirmé ; essai écarté. Verdict02 : quatre appendices dorsaux visibles, candidat retenable avec limites.**

La source montre deux bras principaux, quatre appendices dorsaux fins et deux jambes. La variante01 ajoutait un cinquième appendice dorsal fin montant au centre derrière la tête, en plus des terminaisons situées en haut à droite, au milieu à droite, en bas à droite et en bas à gauche. Ce surplus constitue une différence anatomique concrète.

La variante02 supprime l’appendice central supplémentaire. Les quatre appendices fins restants sont distincts des deux bras principaux et des deux jambes. Le grand crochet asymétrique, les yeux composés, la bouche ouverte, le thorax annelé et l’abdomen segmenté demeurent présents. La tête projette vers la gauche. Les extrémités représentées sont entières, avec seulement 12 pixels en haut et 9 en bas à alpha >16 : l’élargissement souhaité du cadrage n’est pas acquis. Les attaches occultées et la position spatiale précise des membres ne sont pas certifiées par cette vue unique.

## Popokarimu RE5 — pose gauche 01

Fichier : `assets/REC_POPOKARIMU_RE5_FULLBODY_LEFT_V6_01.png`. Référence : `references/popokarimu_re5_2009_full_legacy.png`.

**Verdict : candidat structurellement cohérent depuis la référence illustrative ; géométrie native non certifiée.**

Le sujet est unique, bas, avec la tête orientée vers la gauche. Les ailes repliées, leurs grandes terminaisons griffues, le corps, les membres visibles et l’énorme abdomen recourbé restent entièrement dans le cadre. Les motifs tachetés clairs et sombres, la face ventrale rouge segmentée et les crochets terminaux restent reconnaissables. Aucun ajout anatomique manifeste n’a été identifié.

La référence est une illustration entière, pas un modèle natif ni un profil orthographique. Le changement d’orientation de la tête, le déploiement des ailes et les surfaces latérales sont des adaptations ; la précision des textures et des volumes ne peut pas être qualifiée de 1:1.

## Hunter Beta RE3 remake — pose gauche 01

Fichier : `assets/REC_HUNTER_BETA_RE3R_FULLBODY_LEFT_V6_01.png`. Références : `references/hunter_beta_re3r_qualified_side.png` et `references/hunter_beta_re3r_qualified_three_quarter.png`.

**Verdict : candidat cohérent avec le modèle qualifié, notamment son asymétrie principale.**

Le corps unique possède deux bras, deux jambes, un dos très bombé, une tête basse blindée et des crocs pendants. L’avant-bras et la main gauches anatomiques, plus massifs, restent au premier plan ; le bras opposé demeure plus fin. Les longues griffes, les plaques gris olive et les zones charnues rouges sont conservées. La tête est dirigée vers la gauche et toutes les extrémités représentées restent dans l’image.

Les marges verticales de 17 et 19 pixels sont serrées. La comparaison n’établit pas de duplication ou suppression majeure de membre ; elle ne certifie ni la taille exacte de la tête, ni chaque plaque ou griffe, ni la géométrie 1:1. Les références sont des rendus de consultation d’une extraction communautaire, avec éclairage et pose techniques, pas des captures de rendu du moteur du jeu.

## Drain Deimos RE3 remake — pose gauche 01

Fichier : `assets/REC_DRAIN_DEIMOS_RE3R_FULLBODY_LEFT_V6_01.png`. Références : les deux vues qualifiées décrites plus haut.

**Verdict : candidat dont le compte général des membres est cohérent avec les références qualifiées.**

Six grands membres articulés terminés en griffes peuvent être distingués dans la sortie. Les deux longues faux dressées au-dessus du dos restent séparées de ces membres ; de petits appendices antérieurs / buccaux sont également présents. Il n’est donc pas réduit à un insecte générique à six pattes dépourvu des autres appendices. La carapace lamellaire, l’abdomen et les zones charnues restent reconnaissables. Le sujet unique est abaissé en trois-quarts gauche ; les grands membres et les deux faux sont entièrement dans le cadre.

La disposition spatiale et la flexion des membres diffèrent de la pose technique du modèle. Les points d’attache cachés, les détails des surfaces et les proportions ne sont pas certifiés 1:1. Aucun ajout ou manque majeur démontrable n’a été identifié à partir de ces vues.

## Mesures consolidées des dix candidats retenables

Les enveloppes sont calculées à **alpha >16**. Les marges sont données dans l’ordre **gauche / haut / droite / bas**, en pixels. Les coordonnées des enveloppes présentes dans le JSON sont **inclusives** ; leurs maxima sont donc inférieurs de 1 aux bornes exclusives habituelles de `PIL.getbbox()`.

| Sortie | Dimensions | Marges G/H/D/B | Pixels totalement transparents | Alpha min/max |
|---|---:|---:|---:|---:|
| Reaper01 | 1254 × 1254 | 88 / 55 / 119 / 74 | 70,2913% | 0 / 255 |
| Regenerador01 | 974 × 1614 | 115 / 98 / 173 / 67 | 67,6017% | 0 / 255 |
| Ivy01 | 1024 × 1536 | 138 / 41 / 85 / 43 | 71,2659% | 0 / 254 |
| Licker01 | 1536 × 1024 | 59 / 135 / 74 / 71 | 66,5854% | 0 / 254 |
| Verdugo01 | 1193 × 1319 | 41 / 37 / 38 / 37 | 74,0620% | 0 / 255 |
| Cerberus02 | 1494 × 1052 | 291 / 8 / 267 / 17 | 76,3458% | 0 / 255 |
| Chimera02 | 1010 × 1557 | 54 / 12 / 40 / 9 | 69,2300% | 0 / 255 |
| Popokarimu01 | 1312 × 1199 | 46 / 31 / 32 / 43 | 62,0609% | 0 / 255 |
| Hunter Beta01 | 1448 × 1086 | 179 / 17 / 161 / 19 | 61,3836% | 0 / 255 |
| Drain Deimos01 | 1448 × 1086 | 56 / 129 / 73 / 157 | 73,1673% | 0 / 255 |

Tous ces fichiers sont RGBA. Le maximum alpha sur leurs bords extérieurs est 0 ou 1 ; aucune silhouette à alpha >16 ne touche un bord. Certains coins de Reaper et Popokarimu valent 1, les autres coins contrôlés valent 0. Il serait donc inexact de déclarer toutes les zones hors sujet strictement à alpha0.

Les pixels rouges très saturés des previews (`R>210, G<70, B<70`) ne dépassent pas alpha2 sur les candidats où ils existent ; aucun ne dépasse alpha16. À une distance d’au moins 12 pixels de la zone alpha ≥128, **aucun des dix candidats ne présente de pixel alpha >16**. Le maximum dans cette zone est 13 pour Chimera02, 9 pour Popokarimu01, 3 pour Verdugo01 et 1 ou 2 pour les autres. Une partie de ces valeurs peut correspondre aux détails les plus fins ou aux franges ; elles ne démontrent pas un large fond opaque. La correction de Chimera réduit également cette mesure : l’essai01 comportait 515 pixels alpha >16 dans cette zone, contre aucun dans02.

Les marges de 5–7% souhaitées dans certains prompts ne sont pas atteintes partout. La revue accepte le cadrage complet comme critère de candidature statique, tout en signalant la marge particulièrement faible de Cerberus02, Chimera02 et Hunter Beta01. Une normalisation d’échelle, de toile et d’appui reste nécessaire avant une utilisation en jeu.

## Portée de la validation

Les poses restent des adaptations statiques. La revue ne certifie ni toutes les surfaces opposées, ni l’anatomie métrique d’origine, ni un cycle d’animation, ni l’intégration au moteur. Aucun test de combat ou de changement de côté n’a été exécuté par cette QA.

