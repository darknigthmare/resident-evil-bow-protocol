# V24 — clés de menu Helena et Ada

État du **27 novembre 2026**, depuis `246dbb81752c5fa41a55deb3aada3941ac966fec`.

Ce sous-lot fournit **six PNG natifs distincts**, un personnage entier et une pose par fichier : sélection, confirmation et désélection pour **Helena Harper — RE6, tenue promotionnelle de janvier 2012**, et **Ada Wong — RE4 remake Separate Ways 2023, DEFAULT**. Ces deux bases figurent dans V22 ; les trois états n’étaient pas fournis pour elles par V23. Cette vérification porte sur ces manifestes, sans prétendre avoir ouvert toutes les archives historiques.

## Les six fichiers

| Incarnation | Sélection | Confirmation | Désélection |
| --- | --- | --- | --- |
| Helena Harper — RE6, agent promo janvier 2012 | [PNG](assets/helena_re6_agent_selected_v24.png) | [PNG](assets/helena_re6_agent_confirm_v24.png) | [PNG](assets/helena_re6_agent_deselect_v24.png) |
| Ada Wong — Separate Ways remake 2023, DEFAULT | [PNG](assets/ada_re4r_sw_default_selected_v24.png) | [PNG](assets/ada_re4r_sw_default_confirm_v24.png) | [PNG](assets/ada_re4r_sw_default_deselect_v24.png) |

Toutes les images mesurent **1024 × 1536 pixels RGBA**. Leurs octets natifs sont conservés : aucune image n’a été redimensionnée, détourée, retournée, recadrée ou réencodée après génération. Le lot représente 7 995 472 octets de PNG.

Les armes restent dans la main droite anatomique. La main gauche est libre pour le geste. L’équipement de hanche gauche d’Ada conserve son côté. La désélection d’Helena a produit un regard vers la droite de l’image, opposé à la gauche demandée ; cette différence reste consignée et ouverte.

## Références et filiation

La génération utilise deux entrées par pose : le candidat de base V22 et sa référence visuelle d’origine, tous deux inspectés avant l’appel. Les [prompts exacts](prompts.json), les [sources avec URL et empreintes](sources.json) et le [manifeste des fichiers](ASSET_MANIFEST_CHARACTERS_V24.json) permettent de suivre cette filiation.

- Helena : [art promotionnel officiel Capcom du 23 janvier 2012](https://news.capcomusa.com/brelston/blog/2012/01/23/official_leon_and_helena_art_from_resident_evil_6), image 358 × 450 représentant Helena et Leon ; seul le personnage Helena est utilisé. Sa [base V22](../../v22/assets/REC_HELENA_RE6_BASE_FULLBODY_FRONT_V22_01.png) reste une création générée. La faible résolution et la date avant sortie ne certifient pas les détails du modèle commercial.
- Ada : [capture native du menu Extras reproduite par GameWith](https://gamewith.jp/biohazard-re4/article/show/419677), image 1920 × 1080, tenue DEFAULT ; le personnage affiché a les cheveux noirs malgré un texte de menu évoquant une autre couleur. La combinaison exacte n’est pas certifiée. La [base V22](../../v22/assets/REC_ADA_RE4R_SW_DEFAULT_FULLBODY_FRONT_V22_01.png) et la nouvelle famille conservent les cheveux réellement visibles. Le [communiqué officiel Capcom du 21 septembre 2023](https://news.capcomusa.com/lets/browse/ya-salio-caminos-separados-el-dlc-de-resident-evil-4) recoupe l’incarnation Separate Ways du remake.

Les images tierces ont été consultées et utilisées comme références ; leurs bitmaps ne sont pas copiés dans ce lot. Une apparence dérivée d’une capture ne constitue pas un modèle natif extrait du jeu.

## Revue et limites

La [revue de production](AUTHOR_QA_CHARACTERS_V24.json) vérifie le décodage, les dimensions, la présence d’alpha, les empreintes et l’inspection visuelle des six sorties. Les poses sont distinctes et les silhouettes sont entières. Il s’agit d’une revue par l’auteur, à compléter par la revue croisée du lot.

Les six sorties ont une transparence utile, mais gardent des pixels de très faible alpha dispersés. Des couleurs existent sous les pixels d’alpha zéro ; elles ne constituent pas un fond opaque. Les contours doivent encore être vérifiés sur le fond du moteur.

Les marges demandées de 10 % ne sont atteintes sur tous les côtés par aucune des six images. Les poses Helena ont des hauteurs de silhouette de **1 318 à 1 349 pixels**, avec **16 pixels** d’écart de baseline ; Ada varie de **1 332 à 1 363 pixels**, avec **25 pixels** d’écart de baseline. Taille de toile identique ne signifie donc pas animation alignée. Les ancres proposées dans le manifeste sont des mesures de silhouette, sans admission moteur.

Les gestes sont des adaptations du menu. **Aucune fidélité globale 1:1, animation complète ou intégration au combat n’est certifiée.** Visages, doigts, vêtements et petites pièces restent régénérés. Les transitions, les durées et les corrections de taille/appui restent à produire et à vérifier dans le menu réel.

Le PNG Ada désélection a été retourné en data URL sans chemin de sortie. Ses octets PNG exacts ont été décodés et enregistrés ; aucune nouvelle génération n’a remplacé cette sortie et aucun pixel n’a été transformé. Les autres PNG ont été copiés octet pour octet depuis la sortie native du générateur. Ce suivi figure dans [generation_outputs.json](generation_outputs.json).

Ce sous-lot ne change aucun fichier historique, moteur, sauvegarde, workflow ou garde. Il complète la [spécification du cycle de sélection](../../../../docs/combat-bible/EXTENSION_01_APPLICATION.md), sans fermer les autres besoins personnages de V22.
