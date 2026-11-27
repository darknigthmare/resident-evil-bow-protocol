# Projectiles V24 — orientations sourcées

État du 27 novembre 2026. **Six PNG natifs : cinq orientations candidates et un premier essai remplacé.**

| Objet / édition | Nouvelle clé | Fichier |
| --- | --- | --- |
| Carreau simple du Bolt Thrower de Leon — RE4 Remake 2023 | Pointe vers la gauche, correction des attaches ajoutées | [PNG](assets/re4r_bolt_left_corrected_v24.png) |
| Même carreau | Inclinaison montante, pointe vers la droite | [PNG](assets/re4r_bolt_ascending_v24.png) |
| Bouteille non allumée — RE0, plateforme du rendu non précisée | Horizontale, col vers la gauche | [PNG](assets/re0_molotov_horizontal_v24.png) |
| Même bouteille | Verticale, col vers le haut | [PNG](assets/re0_molotov_upright_v24.png) |
| Même bouteille | Inclinaison opposée, col vers le bas à droite | [PNG](assets/re0_molotov_turning_v24.png) |

Le [premier carreau gauche](assets/trials/re4r_bolt_left_v24.png) conservait deux petites attaches métalliques absentes du rendu natif. Une correction par génération les a supprimées ; les deux sorties restent identifiées séparément dans le [manifeste](ASSET_MANIFEST_PROJECTILES_V24.json). Aucun PNG n’a été retourné, découpé, redimensionné ou réencodé après génération.

## Sources et fidélité

Les deux rendus d’inventaire originaux ont été téléchargés, inspectés et mesurés : [Bolts RE4 Remake](https://www.evilresource.com/resident-evil-4-remake/weaponry/bolts) et [Molotov Cocktail RE0](https://www.evilresource.com/resident-evil-zero/weaponry/molotov-cocktail). Ils sont reproduits par un catalogue tiers ; leurs URLs, dimensions et SHA-256 figurent dans le manifeste, leurs bitmaps restent hors du dépôt. Les deux bases générées V22 sont identifiées comme références dérivées, avec leurs chemins Git et empreintes.

La vue d’inventaire des carreaux en montre plusieurs qui se recouvrent. Les nouveaux profils, l’empennage et certains détails de matière restent reconstruits. La petite image de bouteille ne permet pas de certifier les marquages ni une édition HD2016. Sa vue verticale reste à revoir pour les proportions du corps et du col.

La [revue indépendante](../reports/INDEPENDENT_PROJECTILES_V24.json) confirme cinq candidats et l’essai remplacé. Les objets utiles sont entiers, mais les marges de 12 % demandées ne sont respectées sur tous les côtés par aucune sortie. Des pixels de très faible alpha subsistent. Les halos visibles dans certains aperçus RGB sont à distinguer des pixels effectivement opaques : sept points mesurés autour de la bouteille verticale ont un alpha nul. Cette observation locale ne certifie pas tous les contours dans le moteur.

## Raccord au besoin

Les trois orientations de bouteille constituent un complément partiel pour `REC_REBECCA_RE0__SP2`. Elles restent non allumées : allumage, vol temporel, éclatement et feu d’impact sont toujours ouverts. Les deux orientations du carreau de Leon complètent l’arsenal ; elles ne remplacent ni les Blast Arrows d’Ada Separate Ways ni les flèches de Krauser. **Aucune des 44 actions V1 n’est déclarée complète.**

Les [prompts initiaux](prompts/initial.json), la [correction et la vue verticale](prompts/correction-and-upright.json) et les [orientations complémentaires](prompts/orientations.json) sont conservés exactement. Le PNG vertical a été rendu sans chemin de sortie ; ses octets PNG ont été récupérés par décodage exact de la data URL, sans modification des pixels.

Le script [build_manifest.py](build_manifest.py) remesure les sorties existantes. Il nécessite un dossier contenant les quatre références nommées et les sorties originales consignées dans les prompts ; il vérifie leurs empreintes et ne modifie pas les images. Le contrôle global du lot V24 vérifie directement les fichiers livrés, sans dépendre des références temporaires.

**Statut : candidats statiques, sans animation complète, admission moteur ou certification globale 1:1.**
