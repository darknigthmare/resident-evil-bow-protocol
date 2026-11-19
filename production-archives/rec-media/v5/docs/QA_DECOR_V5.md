# Contrôle du décor Missiles / Convoyeurs V5

Date : 19 novembre 2026. Revue des six PNG successifs du décor V5, sans modification de leurs pixels par le contrôle qualité. Cette scène est une étude originale pour l’arène `re5_060_reaper` ; aucune fidélité géométrique 1:1 à Resident Evil 5 n’est certifiée.

## Verdict

**Conserver le master comme étude de composition et FAR01 + MID02 + FLOOR02 comme candidats de séparation améliorés. Ne pas les déclarer prêts pour la parallaxe ou intégrés au moteur.** Les corrections 02 rétablissent les principaux repères géométriques. Elles restent des rendus génératifs avec des différences de pixels, et la jonction entre le plan intermédiaire et le sol demande une correction ou une validation visuelle. MID01 et FLOOR01 sont écartés de la sélection et conservés dans `essais/`.

## Fichiers contrôlés

| Rôle | Chemin dans le lot | Format | Statut |
|---|---|---|---|
| Master | `assets/REC_STAGE_RE5_MISSILE_CONVEYORS_STUDY_V5_01.png` | 1672 × 941, RGB | Étude de composition |
| Arrière-plan | `assets/REC_STAGE_RE5_MISSILE_CONVEYORS_FAR_V5_01.png` | 1672 × 941, RGB | Reconstruction de fond à qualifier |
| Convoyeur et piliers, essai 01 | `essais/REC_STAGE_RE5_MISSILE_CONVEYORS_MID_V5_01.png` | 1672 × 941, RGBA | Écarté : non aligné |
| Sol, essai 01 | `essais/REC_STAGE_RE5_MISSILE_CONVEYORS_FLOOR_V5_01.png` | 1672 × 941, RGBA | Écarté : non aligné |
| Convoyeur et piliers, correction 02 | `assets/REC_STAGE_RE5_MISSILE_CONVEYORS_MID_V5_02.png` | 1672 × 941, RGBA | Candidat amélioré, joint à qualifier |
| Sol, correction 02 | `assets/REC_STAGE_RE5_MISSILE_CONVEYORS_FLOOR_V5_02.png` | 1672 × 941, RGBA | Candidat amélioré, joint à qualifier |

Les contrôles des essais 01 établissent un vrai canal alpha : MID01 contient 64,22 % de pixels entièrement transparents, FLOOR01 67,48 %. Une inspection complémentaire de zones intérieures de ces essais donne une médiane alpha de 253/255 pour un pilier et pour le sol : la matière est presque opaque, avec une légère transmission résiduelle. Les valeurs des corrections 02 figurent plus bas. Ce constat ne valide ni les contours sur tous les fonds ni le réglage de prémultiplication du moteur.

## Écarts des essais 01

**Piliers déplacés et simplifiés.** À la ligne y = 100 de MID, les pixels d’alpha supérieur à 16 occupent les intervalles x = 379–446 et x = 1211–1278. Dans le master, les deux grandes structures se trouvent visuellement vers x = 180–330 et x = 1350–1500. Ces dernières portent des lampes, des croisillons et des protections jaunes ; ces caractéristiques ne sont pas conservées dans MID. Les valeurs du master sont des repères visuels approximatifs, celles de MID sont mesurées.

**Convoyeur recomposé.** Les cylindres et caisses ne gardent pas l’ordre, la silhouette et la position du master. Le convoyeur de MID descend vers le bas de l’image et ses poteaux se prolongent presque jusqu’au bord inférieur. Ajouter simplement ce plan au fond ne restitue donc pas la scène initiale. L’ordre des couches peut en outre faire masquer des supports par le sol ou faire traverser visuellement le sol par des piliers.

**Sol déplacé.** FLOOR présente des pixels d’alpha supérieur à 16 dès y = 652. La limite arrière du sol du master se situe visuellement autour de y = 694. Les joints, les reflets et la matière ont aussi été réinterprétés. Un décalage vertical seul ne corrigerait pas l’ensemble de ces différences.

**Fond reconstruit.** FAR conserve l’ambiance, les passerelles, la ventilation et la source chaude à droite. Les surfaces auparavant cachées sont peintes de nouveau. Cette reconstruction est une hypothèse graphique utile ; elle ne constitue pas une extraction exacte et demande une vérification lors du mouvement de caméra.

## Corrections 02 et contrôle final

Les deux corrections ont été produites à partir du master comme référence locale dédiée. Le contrôle visuel retrouve les deux piliers larges, leurs lampes, les croisillons, les bases jaunes, l’ordre des cargaisons et la hauteur du convoyeur. Le sol retrouve ses principaux joints et ses reflets. Les décalages majeurs des essais 01 ne sont plus présents.

MID02 mesure 1672 × 941 et possède un alpha de 0 à 255, avec 65,04 % de pixels entièrement transparents. À y = 100, les deux piliers occupent x = 190–315 et x = 1354–1485 pour un seuil alpha supérieur à 16. La limite inférieure globale de cette même enveloppe est y = 694. Ces repères sont cohérents avec la composition du master.

FLOOR02 mesure également 1672 × 941 et possède un alpha de 0 à 254, avec 74,04 % de pixels entièrement transparents. Son enveloppe d’alpha supérieur à 16 commence à y = 698 et s’étend jusqu’à y = 940. La géométrie est nettement plus proche du master que celle de FLOOR01 ; la séparation n’est toutefois pas une copie exacte des pixels.

### Comparaison numérique des régions conservées

Les rectangles ci-dessous sont exprimés en pixels sous la forme `(x début, y début, x fin exclue, y fin exclue)`. Les comparaisons portent sur le RGB natif au même emplacement ; pour MID02 et FLOOR02, seuls les pixels d’alpha supérieur ou égal à 250 sont inclus. Aucun recalage, correction colorimétrique ou rééchantillonnage n’a été effectué.

| Plan et région | Rectangle | Écart absolu RGB moyen sur 255 | Pixels RGB strictement identiques |
|---|---|---:|---:|
| MID02, pilier gauche | (210, 20, 290, 190) | 16,44 | 0,053 % |
| MID02, cylindre central | (450, 420, 690, 475) | 12,76 | 0,038 % |
| MID02, socle jaune | (190, 590, 290, 670) | 19,58 | 0,037 % |
| FLOOR02, sol central | (100, 720, 1572, 880) | 6,21 | 0,408 % |
| FAR01, passerelle supérieure visible | (450, 0, 1100, 300) | 8,48 | 0,425 % |

Ces mesures montrent que les zones conservées ont été rendues à nouveau. Elles ne prouvent pas, à elles seules, un défaut de géométrie : les écarts peuvent aussi venir de la texture, de la lumière ou des contours. Elles excluent en revanche une présentation du lot comme extraction pixel pour pixel. FAR01 reste globalement cohérent avec la composition, sans identité exacte de ses régions visibles.

### Joint restant à qualifier

Sur les trois lignes y = 695, 696 et 697, aucun des 1672 pixels de MID02 ou FLOOR02 ne dépasse un alpha de 16. Les maxima alpha respectifs sont 7/1, 7/3 et 2/3. Le fond FAR apparaît donc presque seul sur cette bande. FAR étant opaque, ce n’est pas un trou transparent dans la composition complète ; cela peut produire un liseré de mur entre les supports et le sol. La ligne y = 698 ne comporte encore que 62 pixels au-dessus du seuil, puis la largeur entière est couverte à partir de y = 699. La jonction doit être contrôlée dans la recomposition et pendant le mouvement avant admission définitive.

**Conclusion du contrôle des variantes : candidats géométriquement améliorés ; joint et rendu final encore à qualifier.** Aucun test de caméra ou de moteur n’a été effectué. Le statut de production reste une étude à trois plans, soumise au contrat à six plans ci-dessous.

## Écart au contrat de production

La Bible V1 vise six plans maîtres de 7680 × 2160, une vue de 1920 × 1080, une piste de 3200 unités et une ligne d’appui à y = 900. Les coefficients de parallaxe prévus sont 0,04 ; 0,18 ; 0,42 ; 0,72 ; 1 ; 1,16.

Le lot actuel fournit trois plans de 1672 × 941. Il ne satisfait donc ni le nombre de plans, ni le format maître, ni la couverture horizontale démontrée. Un agrandissement numérique ne fournirait pas les portions de décor nécessaires aux déplacements de caméra. Il ne faut pas modifier les conventions de la Bible pour faire passer ce lot comme terminé.

## Critères avant intégration

1. Verrouiller une composition de référence et sa géométrie : positions et largeurs des piliers, hauteur du convoyeur, limite arrière du sol, éclairage et perspective.
2. Produire les six plans avec dimensions, origine, échelle et zone de recouvrement communes. Documenter les régions reconstruites et conserver les masters.
3. Vérifier une recomposition à déplacement nul, puis aux deux extrémités de caméra : absence de trous, répétitions visibles, glissement entre parties d’un même objet et doubles contours.
4. Caler la ligne d’appui du moteur et contrôler les pieds des deux combattants, les zones d’atterrissage et les collisions. Les piliers décoratifs ne doivent pas masquer les informations de combat sans règle explicite.
5. Examiner les contours RGBA sur fond clair, foncé et coloré, ainsi que l’alpha et son mode de composition. Valider l’occlusion, les effets et la lisibilité en mouvement.
6. Tester le rendu et les transitions dans le moteur existant. Aucun essai de jeu, performance ou caméra sur l’ensemble de la piste n’a été réalisé pour ce lot.

## Méthode et portée

Revue visuelle des six fichiers à leur cadrage natif ; calculs en lecture seule des coupes et enveloppes alpha, des zones intérieures et de cinq comparaisons RGB avec le master. Les informations initiales de dimensions et de transparence reprennent le contrôle PNG du lot ; celles des corrections 02 ont été mesurées lors de cette seconde revue. Aucun PNG n’a été retouché, redimensionné ou recomposé pour ce rapport. Les exigences de format proviennent de la Bible V1 conservée pour le projet.

[Bible V1](https://chatgpt.com/library?file_id=libfile_fde3_f-eb60b8aecc448191832240248f4d0666_b6040bcabe388191b426902484aff67a&account_id=personal)
