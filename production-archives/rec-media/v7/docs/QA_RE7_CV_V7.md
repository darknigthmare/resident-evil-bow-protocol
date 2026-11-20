# Contrôle visuel RE7 et CODE Veronica V7

## État du contrôle

Contrôle clos : Fumer 02 et Bandersnatch 01 sont acceptables visuellement avec les limites documentées. Fumer 01 est remplacé par sa correction contrôlée. Mama Mold 01 reste un essai non retenu ; sa correction 02 a été refusée et aucun nouvel essai n’est prévu. Quatre PNG ont été examinés, deux refus de génération ou correction sont consignés. Le minimum de marge de 7 % est mesuré sans constituer à lui seul un rejet.

Les sorties sont comparées aux seuls fichiers exacts de `V7/references`. Leurs SHA256 concordent avec `SOURCE_RECOVERY_V7.json`. Aucune sortie R34 générée ne sert de référence d’apparence. Aucun PNG n’a été modifié par ce contrôle.

## Mesures

Les marges sont mesurées au seuil **alpha ≥ 16**, dans l’ordre gauche, haut, droite, bas. Le JSON garde aussi le seuil alpha ≥ 1 pour recenser tout bruit faible. Le minimum de 7 % reste un écart mesuré au prompt ; il ne rejette pas à lui seul une silhouette entièrement contenue.

| Sortie | Emplacement | Dimensions | Marges G H D B en pourcentage | Pixels de bord alpha > 0 | Statut |
| --- | --- | --- | --- | --- | --- |
| REC_FUMER_RE7_FULLBODY_LEFT_V7_01 | trials | 1059 × 1486 | 21.81 % / 1.28 % / 24.36 % / 1.28 % | 0 | TRIAL_SUPERSEDED_BY_REVIEWED_02 |
| REC_MAMA_MOLD_RE7_FULLBODY_LEFT_V7_01 | trials | 948 × 1659 | 5.80 % / 3.19 % / 8.86 % / 2.53 % | 4 | TRIAL_NOT_ADMITTED_CORRECTION_BLOCKED |
| REC_BANDERSNATCH_RECV_FULLBODY_LEFT_V7_01 | assets | 1086 × 1448 | 5.25 % / 6.29 % / 7.09 % / 3.87 % | 185 | VISUAL_ACCEPTED_WITH_LIMITS |
| REC_FUMER_RE7_FULLBODY_LEFT_V7_02 | assets | 1059 × 1486 | 26.06 % / 7.27 % / 26.82 % / 4.17 % | 0 | VISUAL_ACCEPTED_WITH_LIMITS |

La majorité du cœur des silhouettes a un alpha proche de 252 ou 253 sur 255. Ces valeurs sont presque opaques ; elles ne sont pas assimilées à une transparence défectueuse. Les franges sont évaluées visuellement et distinguées du bruit très faible.

## Fumer premier essai

**Fichier :** `trials/REC_FUMER_RE7_FULLBODY_LEFT_V7_01.png`

**Décision :** Essai conservé pour traçabilité dans trials ; remplacé par Fumer 02 après contrôle de la correction.

Un seul sujet mince, deux bras longs, deux jambes, un cou allongé, un abdomen inférieur arrondi. La tête et la posture lisent vers la gauche. Les deux mains et les deux pieds restent dans le cadre ; aucun membre majeur supplémentaire observé.

Défaut visible : larges plaques gris-brun semi-transparentes derrière la tête, le haut du dos et les avant-bras, plus étendues que de simples fils fins ou un bord anti-crénelé. Le résidu alpha faible s’étend au-delà de la silhouette utile.

Au seuil alpha ≥ 16, la marge verticale vaut 19 px en haut et en bas, soit 1,279 % de la hauteur. Les extrémités ne sont pas coupées ; ce manque de marge est un écart au prompt, distinct du motif de correction du détourage.

La trame pâle apparaît plus épaisse et plus continue que sur la source, avec un profil crânien plus arrondi. Une source frontale unique ne certifie pas les surfaces arrière, les ouvertures fibreuses exactes ni les détails de doigts masqués.

## Mama Mold premier essai

**Fichier :** `trials/REC_MAMA_MOLD_RE7_FULLBODY_LEFT_V7_01.png`

**Décision :** Non retenu dans les candidats finaux. Le défaut de détourage persiste sur cet essai ; la correction 02 a été refusée et aucun nouveau PNG ni nouvel essai n’existent.

La masse reste distincte de Fumer : ventre et hanches larges, jambes épaisses, bras pendants, doigts longs et transition courte entre tête et épaules. Un seul corps orienté vers la gauche, avec les deux pieds et les deux mains contenus.

Défaut de finition : régions grises semi-transparentes irrégulières autour du dos et du bras éloigné. Quatre pixels de bord ont un alpha inférieur à 16 ; ils ne prouvent pas une coupe du corps visible.

Les marges alpha ≥ 16 sont 5,802 %,3,195%,8,861%,2,532% G/H/D/B. Le minimum de 7 % n’est pas tenu sur trois côtés, mais les grandes extrémités sont présentes.

Le réseau clair et les cavités rouges sont plus contrastés que le gris-brun assourdi de la source. La bouche et les détails latéraux plus exposés ne sont pas vérifiables depuis une seule vue oblique. Aucun membre majeur supplémentaire ni inversion flagrante d’asymétrie observés.

## Bandersnatch premier essai

**Fichier :** `assets/REC_BANDERSNATCH_RECV_FULLBODY_LEFT_V7_01.png`

**Décision :** Acceptable comme nouvelle vue gauche documentaire ; ni profil natif ni fidélité 1:1 certifiés. Le seul manque de marge ne motive pas une correction.

L’asymétrie principale est conservée visuellement : énorme bras anatomique droit sur le côté éloigné du point de vue gauche, visible à gauche de l’image ; appendice anatomique gauche atrophié du côté proche, visible à droite. Aucun miroir de cette asymétrie observé.

La tête vise la gauche. La grande main, le petit appendice, les deux jambes et les deux pieds restent contenus. Peau bronze-orangé, gros volumes musculaires et veines pâles cohérents avec la source exacte.

Le contour utile est plus net que pour les deux essais RE7. 185 pixels de bord portent un alpha positif, tous inférieur à 16 : bruit faible, sans main ni pied coupé. Les marges alpha ≥ 16 sont 5,249 %,6,285%,7,090%,3,867% G/H/D/B ; cet écart de marge est accepté avec réserve.

Ramifications des veines, détails du visage, ongles et doigts nouvellement révélés ne sont pas certifiables depuis la source 430 × 573. Les veines paraissent davantage argentées que vert-gris. L’identité visuelle est préservée à grande échelle ; les détails fins restent une reconstruction.

## Fumer correction contrôlée

**Fichier :** `assets/REC_FUMER_RE7_FULLBODY_LEFT_V7_02.png`

**Décision :** Acceptable comme candidat final gauche avec réserve sur les fins résidus de détourage et les détails de surface ; ne pas qualifier le détourage de parfait.

Un seul Fumer entier, vraie lecture gauche en trois-quarts, tête et cou allongé, deux bras longs, deux jambes, mains et pieds contenus. Le nettoyage n’a pas entraîné de perte manifeste des grandes formes ou d’ajout de membre.

Les larges plaques gris-brun du premier essai sont nettement réduites. Il reste un fin résidu derrière le crâne, le cou, le dos et quelques fibres du flanc. Le second regard indépendant de qa_stage_v5 ne relève aucune grande plaque opaque évidente et accepte cette version avec ces limites.

Les pixels alpha 16–127 rapportés à la surface alpha ≥ 128 passent de 6,063 % pour 01 à 4,684 % pour 02. Cette mesure complète l’inspection visuelle ; elle ne certifie pas seule un détourage. Aucun pixel alpha positif ne touche le bord du PNG 02.

Marges alpha ≥ 16 : 26,062 %, 7,268 %, 26,818 %, 4,172 % G/H/D/B. La marge basse reste inférieure à 7 %, mais tous les orteils sont présents et cette réserve ne motive pas un rejet.

Les points rouges ou jaunes très saturés dans les aperçus sont portés par des pixels alpha 1–3 ; aucun pixel très chromatique n’existe à alpha ≥ 16. Ils ne constituent pas une tache rouge opaque sur le corps.

La source exacte reste le PNG documentaire frontal, jamais une sortie R34. Les projections de fibres, le profil et les détails des doigts sont régénérés ; l’identité générale est cohérente, mais la fidélité fine 1:1 n’est pas certifiée.

## Refus enregistrés

Molded : `BLOCKED_BY_TOOL_V7_NO_RETRY`, requête `e67478da-b7af-4357-be94-ecdec07b861a`, retour `moderation_blocked`, catégorie `violence`. Aucun PNG produit et aucune nouvelle tentative.

Mama Mold correction02 : requête `072090a9-b154-4b4f-9259-bbe0a875c804`, retour `moderation_blocked`, catégorie `violence`, signalé par le parent dans la session. Aucun PNG02 produit et aucune nouvelle tentative. Le premier essai reste dans `trials` avec son défaut de détourage et ne compte pas comme candidat final retenu.

## Limites communes

Les vues sources uniques ne permettent pas de certifier les surfaces nouvellement révélées, la topologie exacte des fibres ou des veines et les détails masqués des doigts. La reconnaissance d’identité et la présence d’un corps entier ne constituent pas une certification canonique 1:1. Aucun import moteur, animation ou collision n’a été testé. Aucun fichier V5 ou V6 n’a été modifié.
