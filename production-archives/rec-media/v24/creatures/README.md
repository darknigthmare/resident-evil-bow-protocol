# V24 — Créatures : six clés de mouvement candidates

Lot du **27 novembre 2026**, depuis `246dbb81752c5fa41a55deb3aada3941ac966fec`.

**8 PNG natifs : 6 clés candidates, 2 essais remplacés conservés.** Ce lot complète trois incarnations déjà documentées en V22. Il ne compte aucune nouvelle espèce récupérée ni aucune animation complète.

## Fichiers

| Créature | Édition | Pose proposée | Qualification | Dimensions natives | Fichier |
| --- | --- | --- | --- | --- | --- |
| Kipepeo | Resident Evil 5 (2009) | Vol — ailes hautes | Clé candidate | 1206 × 1305 | [PNG](assets/re5_kipepeo_hover_upstroke_v24.png) |
| Novistador | Resident Evil 4 remake (2023) | Vol — ailes basses | Clé candidate | 1334 × 1179 | [PNG](assets/re4r_novistador_wingbeat_down_v24.png) |
| Giant Whip Spider | Resident Evil Revelations 2 (2015) | Appui bas | Essai remplacé | 1536 × 1024 | [PNG](assets/rev2_giant_whip_spider_ready_v24.png) |
| Kipepeo | Resident Evil 5 (2009) | Vol — ailes basses | Clé candidate | 1316 × 1195 | [PNG](assets/re5_kipepeo_hover_downstroke_v24.png) |
| Novistador | Resident Evil 4 remake (2023) | Vol — ailes hautes | Essai remplacé | 1334 × 1179 | [PNG](assets/re4r_novistador_wingbeat_up_v24.png) |
| Giant Whip Spider | Resident Evil Revelations 2 (2015) | Appui bas | Clé candidate | 1536 × 1024 | [PNG](assets/rev2_giant_whip_spider_ready_clean_v24.png) |
| Giant Whip Spider | Resident Evil Revelations 2 (2015) | Pas vers l’avant | Clé candidate | 1536 × 1024 | [PNG](assets/rev2_giant_whip_spider_step_v24.png) |
| Novistador | Resident Evil 4 remake (2023) | Vol — ailes hautes, membres corrigés | Clé candidate | 1334 × 1179 | [PNG](assets/re4r_novistador_wingbeat_up_corrected_v24.png) |

Le [manifeste](manifest.json) relie chaque PNG à sa référence native, au candidat antérieur V22, aux fichiers d’entrée et au prompt exact. Les [prompts](prompts/GENERATIONS.json), l’[index des sources](SOURCE_INDEX.json) et le [contrôle des fichiers](QA.json) sont livrés.

## Besoin et choix des références

V22 documentait une seule pose fixe pour Kipepeo, Novistador et Giant Whip Spider. Les poses hautes/basses de vol et les deux attitudes au sol enrichissent ce besoin de mouvement. Les clés nouvelles sont des adaptations proposées à partir de l’anatomie observée. Elles ne sont pas des images extraites d’une animation Capcom.

Les trois références ont été récupérées et inspectées à nouveau avant génération :

- **Kipepeo — RE5 2009** : [modèle reproduit dans la revue Bogleech](https://bogleech.com/halloween/hall18-re5), entier, quatre membranes inégales et deux longs filaments terminaux. La plateforme du modèle n’est pas explicitée. L’[entretien du guide officiel RE5 retranscrit par Project Umbrella](https://www.projectumbrella.net/resident-evil-5-the-complete-official-guide.html) étaye son comportement volant ; il ne valide pas le timing ou la pose de ces nouvelles images.
- **Novistador — RE4 Remake 2023** : [capture de galerie du modèle reproduite par Vandal](https://vandal.elespanol.com/guias/guia-resident-evil-4-remake-trucos-consejos-y-secretos/enemigos-y-jefes). Le modèle 2005 reste distinct. Le logo, le cadre et le filigrane de la page ne sont pas repris.
- **Giant Whip Spider — Revelations 2 2015** : [modèle complet du catalogue Evil Resource](https://www.evilresource.com/resident-evil-revelations-2/enemies/giant-whip-spider), source 450 × 360. Les microdétails de carapace et les extrémités restent limités par cette résolution.

Les images tierces de référence restent hors du dépôt. Leurs URLs, tailles, dimensions et SHA-256 sont consignés. Aucun statut de licence commerciale pour ces références n’est revendiqué.

## Revue des silhouettes et des contours

Les huit fichiers représentent chacun une créature entière et une seule pose, avec un canal alpha réel. Les angles de prise de vue restent proches des références natives. Les deux phases Kipepeo diffèrent par l’ouverture des quatre ailes ; celles de Novistador par la position des membranes latérales. Les extrémités postérieures restent longues, pointues et dirigées vers le bas dans la paire candidate corrigée. L’araignée passe de pédipalpes rapprochés à un écartement plus large et un appui avancé.

Les limites mesurées restent ouvertes :

- Certaines marges demandées de 10–12 % ne sont pas atteintes, malgré des extrémités visibles.
- Le cadrage et la taille apparente changent entre certaines clés. Une normalisation d’échelle, de toile, de pivots et d’appuis reste nécessaire avant lecture animée.
- Des franges colorées fines existent notamment sur Kipepeo et Novistador. Les détails de membrane, articulations et pédipalpes dérivent parfois de la référence.
- La première pose d’araignée a reçu une demande de nettoyage de fond par `image_gen`. L’essai initial et le nouveau résultat sont conservés séparément. Le halo visible dans les aperçus RGB ne prouve pas un halo affiché en jeu : les points de fond échantillonnés ont un alpha nul. L’efficacité globale du nettoyage n’est pas certifiée sans rendu composé. Les zones solides culminent à alpha254 dans les images d’araignée.
- Les mouvements restent inférés. Aucun compte de frames, timing, interruption, contact, hitbox, côté inverse ou raccord au moteur n’est validé par ces images.

## Vérification et conservation

Les **8 PNG distincts décodent**, utilisent RGBA et un alpha utile ; leurs SHA-256 et SHA Git sont calculés. Les copies du dépôt sont identiques aux octets des sorties originales. Aucun recadrage, miroir, agrandissement, changement d’alpha ou réencodage n’a été effectué après génération.

Les **61 refus historiques et 5 refus V22** n’ont pas été réessayés. Les **105 attentes de références** et les récupérations V19 restent ouvertes. Aucun ancien manifeste, moteur, contrat, test, garde CI ou index n’a été modifié par ce sous-lot.

La revue visuelle de cette livraison est celle de son auteur ; la revue indépendante et le test en situation restent à réaliser. **Fidélité globale 1:1, animation complète et admission moteur : non certifiées.**

## Correction après revue indépendante

La première clé Novistador ailes hautes recourbait les deux longues extrémités postérieures en crochets. La revue indépendante a identifié cet écart par comparaison avec la capture native et la clé ailes basses. **Une édition ciblée** a rétabli deux membres longs pointus dirigés vers le bas ; la pose ailes hautes est conservée. L’ancienne sortie reste un essai remplacé.

Le [rapport de correction auteur](CORRECTION_NOVISTADOR_V24.json) conserve le hash de la première revue, les deux sorties et le prompt. La première revue demeure inchangée ; une seconde passe indépendante de cette nouvelle sortie reste à réaliser. Des différences de microdétails, de contour, de marges et d’ancrage subsistent. Aucune fidélité 1:1 ou animation complète n’est certifiée.
