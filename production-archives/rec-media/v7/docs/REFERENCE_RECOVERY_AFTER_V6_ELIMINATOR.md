# Recherche de référence pour l’Eliminator blanc après V6

## Décision

**HELD_REFERENCE maintenu pour le corps complet orienté à droite de `re0-eliminator`.** La cible reste l’Eliminator à fourrure blanche de **Resident Evil 0 (2002)**. Une nouvelle image communautaire montre son corps entier, mais la correspondance exacte de la partie basse avec le modèle d’origine demeure non établie. Aucune image n’a été générée et aucun fichier du snapshot V6 n’a été modifié.

## État de départ et orientation

Le reçu R34 conserve le blocage parce que la référence blanche du catalogue est coupée au niveau du buste et des bras. Le rendu brun complet trouvé antérieurement ne prouve pas la couleur ni les marques du bas du corps blanc et reste exclu. La copie locale du catalogue mesure 450 × 360 pixels.

Le record R27 qualifiait initialement l’ancienne image comme frontale. La revue visuelle R29 la qualifie ensuite de gauche ; le manifeste R34 reprend cette observation ultérieure. Tous gardent `fullBodyReviewed:false`. Le nom `idle-right.png` ne constitue donc pas une preuve de pose droite, et le corps complet généré autrefois comporte des extrémités extrapolées. Les reçus et leurs hashes sont inclus dans le JSON compagnon, au commit `12deacf4cf9b7706eba69fecc1c13593d030180b`.

## Nouvelle piste entière

La page publique [COMM Eliminator Jockey sur Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=2856016708) attribue son modèle à Resident Evil 0 et Capcom, mais déclare également des opérations de rigging et d’édition par ErichGrooms1. Il s’agit d’un port communautaire pour Left 4 Dead 2, sans preuve de géométrie et de matériaux originaux inchangés.

Le screenshot public a été téléchargé normalement : `eliminator_steam_port_screenshot.jpg`, JPEG **1920 × 767**, **126926 octets**. Son SHA256 est `718c037b702d200271ca941513b4dde1a4ca88789956081462a87112add8713d`.

L’inspection montre la tête, les deux jambes et les deux pieds dans le cadre. Les mains se superposent fortement devant le corps. La fourrure blanche et grise, le visage simien sombre et la zone rouge à l’épaule présentent une parenté claire avec le catalogue blanc. Les yeux jaunes très lumineux, la fourrure plus grise et le muscle plus lisse et brillant restent des différences de présentation non résolues. La plateforme et l’édition exacte d’extraction ne sont pas précisées.

La revue indépendante de `/root/qa_stage_v5` confirme ce constat. Cette image est classée **support anatomique communautaire**, avec présence du corps dans le cadre, mais **sans qualification comme référence unique de génération fidèle**. Le bas du corps natif de la variante blanche n’a pas été corroboré. L’image de couverture du même port reste coupée et porte un titre sur le bas du cadre.

## Autres images examinées

| Source | Fichier local | Taille | Conclusion visuelle |
| --- | --- | --- | --- |
| Catalogue retenu R34, EvilResource | `eliminator_re0_white_catalog.png` | 450 × 360 | Blanc exact, buste et bras coupés |
| Port Steam, screenshot | `eliminator_steam_port_screenshot.jpg` | 1920 × 767 | Corps dans le cadre, port édité et correspondance native non démontrée |
| Port Steam, couverture | `eliminator_steam_port_main.jpg` | 640 × 360 | Haut du corps et titrage, pas de nouvelle preuve des pieds |
| TechTudo, capture du HD Remaster | `eliminator_re0_hd_techtudo_candidate.jpg` | 984 × 524 | Bord inférieur coupe les extrémités ; édition HD distinctement signalée |
| ResidentEvilFR, collage de cinématique | `eliminator_residentevilfr_candidate.jpg` | 400 × 351 | Panneaux serrés et trop limités pour confirmer mains, pieds et marques |

Les liens des pages et des images, les réponses HTTP, les tailles et les hashes de chaque fichier sont consignés dans le JSON. La capture HD provient de l’article [TechTudo de janvier 2016](https://www.techtudo.com.br/noticias/2016/01/como-matar-inimigos-comuns-de-resident-evil-0-hd-remaster.ghtml). Le collage est intégré à la [fiche ennemis ResidentEvilFR](https://www.residentevilfr.com/v3/resident-evil-0-ennemis/).

## Contrôle des sources Capcom

Deux publications primaires ont été contrôlées : [captures et bande-annonce du 8 juin 2015](https://news.capcomusa.com/gregaman/blog/2015/06/08/new-resident-evil-0-trailer-and-screens-are-eerie-pretty) et [comparatifs du 11 novembre 2015](https://news.capcomusa.com/lets/browse/resident-evil-0-slider-comparison-screenshots). **Les 19 illustrations accessibles ont été téléchargées et inspectées. Aucune ne montre l’Eliminator.** Elles ne corroborent donc pas sa partie basse. Le JSON contient les URLs exactes et hashes des 19 fichiers ; la planche de contrôle reste une pièce de travail.

## Limites d’accès et exclusions

Les catalogues GameCube et PC de Models Resource consultés ne listent pas de modèle Eliminator. Le fichier CreativeUncut renvoie HTTP 403. L’archive Goblin6 renvoie 404 par l’outil web et 406 par requête HTTPS ordinaire. La galerie Fandom n’a pas pu être ouverte. Ces limites n’ont pas été contournées. Une publication Patreon réservée aux membres n’a pas été téléchargée.

L’Eliminator R de Confidential Report, les variantes brunes, les versions Umbrella Chronicles et les modifications communautaires non vérifiées ne sont pas substitués à la cible. La mention de droits Capcom par un auteur de port ne certifie ni l’identité exacte d’une extraction ni un droit de republication.

## Condition de reprise

Il manque une vue du jeu d’origine, un rendu ou un modèle traçable non modifié qui expose suffisamment le bas du corps de l’Eliminator blanc, ses marques, ses mains et ses pieds. Cette pièce devra être comparée au catalogue retenu avant de lancer une pose droite. Le nouveau screenshot entier peut accompagner cette vérification ; il ne suffit pas à lever le blocage.

Tous les bitmaps et instantanés de pages restent des références de recherche non destinées à la publication. Seules les métadonnées et conclusions peuvent être reprises dans le suivi du projet.
