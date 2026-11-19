# QA indépendante finale V8

**Neuf candidats statiques sont retenus et huit essais sont conservés**, soit 17 PNG issus de 20 appels. Trois appels ont été refusés ; Moroaica reste tenue sans appel après le refus de la variante proche Hauler. Aucun des trois essais Gatling Gun Majini ne reproduit les prises de la source.

## Méthode

Root a ouvert et comparé physiquement les 17 PNG et leurs références documentaires, puis vérifié les SHA et l’identité binaire aux originaux de l’outil. Les fichiers sont RGBA, avec une transparence réelle ; aucune silhouette à alpha>=16 ne touche un bord. Les marges ne satisfont pas toutes les demandes généreuses des prompts. Les couleurs visibles dans certains aperçus sous alpha0 ne constituent pas un fond opaque. Aucun PNG n’a été modifié.

## Décisions par fichier

### REC_RE0_BAT_FULLBODY_LEFT_V8_01

[REC_RE0_BAT_FULLBODY_LEFT_V8_01.png](../assets/REC_RE0_BAT_FULLBODY_LEFT_V8_01.png) — `CANDIDATE_STATIC_WITH_LIMITS`. Dimensions : 1402 × 1122.

- Deux membres ailés, deux jambes/pieds, oreilles et tête de la varianteRE0 conservés ; silhouette entière et vol vers la gauche lisible.
- Membranes, pilosité et détails du nouveau côté reconstruits à partir d’une seule vue ; pas de preuve native du profil gauche.

### REC_RE0_CROW_FULLBODY_LEFT_V8_01

[REC_RE0_CROW_FULLBODY_LEFT_V8_01.png](../assets/REC_RE0_CROW_FULLBODY_LEFT_V8_01.png) — `CANDIDATE_STATIC_WITH_LIMITS`. Dimensions : 1402 × 1122.

- Deux ailes et deux pattes, bec et queue entiers ; œil rouge et plumage sombre conservés, axe de vol gauche/bas-gauche.
- Nombre exact de plumes et leur géométrie reconstruits, sans certification native2002.

### REC_RE0_GIANT_BAT_FULLBODY_LEFT_V8_01

[REC_RE0_GIANT_BAT_FULLBODY_LEFT_V8_01.png](../trials/REC_RE0_GIANT_BAT_FULLBODY_LEFT_V8_01.png) — `TRIAL_SUPERSEDED_BY_REVIEWED_CORRECTION`. Dimensions : 1601 × 982.

- Deux bras ailés et deux jambes déjà présents ; la masse supplémentaire sur le thorax se lit comme une main à doigts sans attache cohérente.
- Source250x161 ne prouve pas cette main supplémentaire. Correction02 ciblée : retirer cette fausse main, préserver zone thoracique/fourrure, deux ailes et deux jambes.

### REC_RE0_GIANT_BAT_FULLBODY_LEFT_V8_02

[REC_RE0_GIANT_BAT_FULLBODY_LEFT_V8_02.png](../assets/REC_RE0_GIANT_BAT_FULLBODY_LEFT_V8_02.png) — `CANDIDATE_STATIC_WITH_LIMITS`. Dimensions : 1601 × 982.

- La fausse main thoracique a été supprimée, en conservant la zone de peau/fourrure. Deux membres ailés et deux pattes sont présents, avec toutes les extrémités visibles contenues.
- La tête et l’axe de vol se lisent vers la gauche. La source 250×161 limite les détails fins ; silhouette et surfaces latérales restent une reconstruction.

### REC_RE1_CHIMERA_FULLBODY_LEFT_V8_01

[REC_RE1_CHIMERA_FULLBODY_LEFT_V8_01.png](../trials/REC_RE1_CHIMERA_FULLBODY_LEFT_V8_01.png) — `TRIAL_SUPERSEDED_BY_REVIEWED_CORRECTION`. Dimensions : 987 × 1594.

- Le crochet est bien la terminaison du bras droit anatomique et la main griffue appartient au gauche ; pas de queue ajoutée.
- Le thorax et le bassin restent très frontaux, le pied proche pointe vers la droite alors que la tête et l’autre pied suggèrent la gauche. Vue gauche du corps entier insuffisante.
- Correction02 d’orientation requise : gauche anatomique proche (main), droite éloignée (crochet), sans échange des attaches.

### REC_RE1_CHIMERA_FULLBODY_LEFT_V8_02

[REC_RE1_CHIMERA_FULLBODY_LEFT_V8_02.png](../assets/REC_RE1_CHIMERA_FULLBODY_LEFT_V8_02.png) — `CANDIDATE_STATIC_WITH_LIMITS`. Dimensions : 987 × 1594.

- Thorax, bassin et deux pieds sont désormais orientés ensemble vers la gauche. La main griffue gauche anatomique est proche ; le crochet terminal du bras droit reste éloigné.
- Le crochet demeure un bras, sans queue ni membre supplémentaire. Silhouette entière, tête et détails caractéristiques 1996 conservés ; volumes et faces latérales reconstruits.

### REC_RE1_WASP_FULLBODY_LEFT_V8_01

[REC_RE1_WASP_FULLBODY_LEFT_V8_01.png](../trials/REC_RE1_WASP_FULLBODY_LEFT_V8_01.png) — `TRIAL_SUPERSEDED_BY_REVIEWED_CORRECTION`. Dimensions : 1402 × 1122.

- Source1996 présente clairement quatre ailes en deux paires ;01 n’offre que trois extrémités alaires séparées. Une quatrième aile ne peut pas être comptée par hypothèse d’occlusion.
- Correction02 ciblée sur les deux paires d’ailes, en préservant six pattes, abdomen jaune/noir et tête caractéristique.

### REC_RE1_WASP_FULLBODY_LEFT_V8_02

[REC_RE1_WASP_FULLBODY_LEFT_V8_02.png](../assets/REC_RE1_WASP_FULLBODY_LEFT_V8_02.png) — `CANDIDATE_STATIC_WITH_LIMITS`. Dimensions : 1402 × 1122.

- Quatre ailes distinctes en deux paires sont maintenant visibles. Cinq tarses sont libres ; le sixième part de la racine postérieure haute du thorax, longe le flanc visible de l’abdomen et se termine en petit crochet vers x875,y705.
- Le sixième tarse se superpose à l’abdomen sans se confondre avec le dard ; son trajet a été confirmé par un second examen du producteur sur alpha neutre. Pas de 03 demandé pour une simple superposition.
- Palette 1996, silhouette entière et gauche conservées ; nombre exact des facettes, nervures et surfaces cachées non certifiés.

### REC_RE1_WEB_SPINNER_FULLBODY_LEFT_V8_01

[REC_RE1_WEB_SPINNER_FULLBODY_LEFT_V8_01.png](../assets/REC_RE1_WEB_SPINNER_FULLBODY_LEFT_V8_01.png) — `CANDIDATE_STATIC_WITH_LIMITS`. Dimensions : 1536 × 1024.

- Huit pattes terminées, deux chélicères, masse abdominale et front orientés vers la gauche ; toute la silhouette contenue.
- Palette orange/jaune/noire et collier rouge conservés ; disposition fine des yeux, soies et reliefs reconstruite depuis la référence1996.
- Les points de contrôle du fond brun observés par root sont RGBA avec alpha0 ; aucune plaque de fond opaque déduite de l’aperçu.

### REC_RE5_BIG_MAN_MAJINI_FULLBODY_LEFT_V8_01

[REC_RE5_BIG_MAN_MAJINI_FULLBODY_LEFT_V8_01.png](../assets/REC_RE5_BIG_MAN_MAJINI_FULLBODY_LEFT_V8_01.png) — `CANDIDATE_STATIC_WITH_LIMITS`. Dimensions : 1024 × 1536.

- Silhouette complète et lecture gauche du visage, du torse et des pieds ; deux bras, deux jambes et short clair conformes à la référence2009.
- Le fond brun de l’aperçu correspond aux RGB sous alpha0 ; la composition alpha a été vérifiée par le producteur. Marges haute/basse courtes ; détail du profil reconstruit.

### REC_RE5_GATLING_GUN_MAJINI_FULLBODY_LEFT_V8_01

[REC_RE5_GATLING_GUN_MAJINI_FULLBODY_LEFT_V8_01.png](../trials/REC_RE5_GATLING_GUN_MAJINI_FULLBODY_LEFT_V8_01.png) — `TRIAL_WEAPON_GRIP_UNRESOLVED`. Dimensions : 1142 × 1377.

- Sujet, arme, sac dorsal et deux bottes entiers, mais les deux prises sont inversées par rapport à la source.
- Source : droite anatomique sur poignée arrière, gauche sur prise avant près du canon.01 inverse ces rôles. Deuxième regard du producteur confirme. Correction02 requise,01 conservé en essai.

### REC_RE5_GATLING_GUN_MAJINI_FULLBODY_LEFT_V8_02

[REC_RE5_GATLING_GUN_MAJINI_FULLBODY_LEFT_V8_02.png](../trials/REC_RE5_GATLING_GUN_MAJINI_FULLBODY_LEFT_V8_02.png) — `TRIAL_WEAPON_GRIP_UNRESOLVED`. Dimensions : 1142 × 1377.

- Les prises restent inversées : main droite éloignée à l’avant et main gauche proche à l’arrière. Une poignée en U supplémentaire n’est pas établie par la source. Aucun candidat retenu pour cette identité.

### REC_RE5_GATLING_GUN_MAJINI_FULLBODY_LEFT_V8_03

[REC_RE5_GATLING_GUN_MAJINI_FULLBODY_LEFT_V8_03.png](../trials/REC_RE5_GATLING_GUN_MAJINI_FULLBODY_LEFT_V8_03.png) — `TRIAL_WEAPON_GRIP_UNRESOLVED`. Dimensions : 1142 × 1377.

- La poignée en U a disparu et le bras proche avance, mais les deux mains restent vers l’avant du mécanisme ; la vraie prise arrière est libre. Le rapport droite arrière/gauche avant de la source n’est pas reproduit.
- Les trois essais restent non admis. Une référence de pose gauche établissant les prises est nécessaire pour une reprise.

### REC_RE5_NDESU_FULLBODY_LEFT_V8_01

[REC_RE5_NDESU_FULLBODY_LEFT_V8_01.png](../assets/REC_RE5_NDESU_FULLBODY_LEFT_V8_01.png) — `CANDIDATE_STATIC_WITH_LIMITS`. Dimensions : 1122 × 1402.

- Grand corps complet en trois-quarts gauche ; deux bras/jambes, bracelets, chevillères, pagne et ornements de ceinture conservés.
- Les petites terminaisons de l’ornement suspendu sont ambiguës dans la source et la génération. Le producteur relève déjà trois terminaisons analogues dans la source ; aucun membre supplémentaire génératif clairement démontré. Ne pas supprimer arbitrairement un détail documentaire.
- Fissures et surfaces latérales reconstruites ; marges courtes ; les bordures très colorées de l’aperçu ne sont pas opaques selon les mesures alpha.

### REC_RE7_FLYING_BUG_FULLBODY_LEFT_V8_01

[REC_RE7_FLYING_BUG_FULLBODY_LEFT_V8_01.png](../trials/REC_RE7_FLYING_BUG_FULLBODY_LEFT_V8_01.png) — `TRIAL_SUPERSEDED_BY_REVIEWED_CORRECTION`. Dimensions : 1674 × 940.

- Deux ailes et silhouette entière, direction gauche lisible ; cinq pattes longues terminées seulement, plus une boucle sous la gorge sans sixième extrémité claire.
- Correction02 ciblée sur trois paires de pattes continues/terminées, en préservant l’identité et les deux ailes.01 reste essai.

### REC_RE7_FLYING_BUG_FULLBODY_LEFT_V8_02

[REC_RE7_FLYING_BUG_FULLBODY_LEFT_V8_02.png](../trials/REC_RE7_FLYING_BUG_FULLBODY_LEFT_V8_02.png) — `TRIAL_SEVEN_LEGS`. Dimensions : 1673 × 940.

- Sept terminaisons de pattes sont visibles : une courte patte centrale s’ajoute aux six longues. Ce défaut est corrigé dans 03 ; 02 reste un essai.

### REC_RE7_FLYING_BUG_FULLBODY_LEFT_V8_03

[REC_RE7_FLYING_BUG_FULLBODY_LEFT_V8_03.png](../assets/REC_RE7_FLYING_BUG_FULLBODY_LEFT_V8_03.png) — `CANDIDATE_STATIC_WITH_LIMITS`. Dimensions : 1673 × 940.

- La courte septième patte a disparu ; six pattes continues et deux ailes sont visibles, entières et rattachées au thorax. Axe du corps et tête vers la gauche.
- Anatomie fine, articulations et matériaux du profil sont reconstruits depuis la source oblique, sans certification 1:1.

## Refus, attentes et portée

Les refus de Garrador remake 2023, Hauler Village et Yawn 1996 sont consignés dans [GENERATION_V8.json](GENERATION_V8.json), avec leurs identifiants. Aucun appel ne suit ces refus pour les mêmes sujets. Moroaica est tenue comme variante visuellement proche après Hauler ; aucun refus propre à Moroaica n’est inventé.

Gatling Gun Majini reste non admis après ses trois sorties : une référence de la pose gauche avec les prises établies serait nécessaire pour reprendre cette difficulté. Les autres corrections retenues rétablissent les membres/ailes ou l’orientation observée ; elles ne constituent pas une certification géométrique 1:1.

Les neuf candidats restent des adaptations génératives statiques. Les détails et faces cachées sont reconstruits, notamment pour les sources de faible résolution. Aucun modèle natif, cycle animé, pivot, collision, échelle de jeu ou état de combat n’est validé ; canonical_one_to_one_certified et engine_admitted restent false. Les originaux de référence et les images de contrôle intermédiaire ne font pas partie de cette livraison.
