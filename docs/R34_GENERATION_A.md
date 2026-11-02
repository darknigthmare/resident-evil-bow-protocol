# R34 — lot A

Le lot couvre 87 combattants. Les deux demandes de chaque identité sont maintenant statuées ; aucun état de production ne reste en attente.

| Sortie | Résultat |
| --- | --- |
| Portraits | 78 PNG générés et revus, 4 refus nouveaux conservés, 5 refus historiques préservés |
| Corps | 24 PNG générés et revus, dont 22 proposés au défaut de combat droit |
| Études de corps non admises | Centurion : segmentation et paires de pattes non établies comme identiques ; Lucas muté : thorax/bassin encore trop frontaux après corrections |
| Corps retenus faute de référence complète | 54 décisions `HELD_REFERENCE`, avec inspection et recherche concrètes |
| Autres corps exclus | 4 sujets refusés au portrait et 5 refus historiques, sans nouvelle tentative |

Les 78 reçus de corps effectivement présents ont été validés avec l’importeur R34. Les 24 PNG sont conservés sans modification de leurs pixels. Leurs directions, extrémités, vêtements et équipements ont été regardés dans un rendu Chromium utilisant le compositing alpha réel, sur fond neutre. Les couleurs RGB sous alpha nul ne sont pas traitées comme des halos visibles.

Après le redémarrage cloud, 11 anciens PNG positifs ont été retrouvés et identifiés visuellement, mais leurs prompts exacts n’étaient plus disponibles. Ils restent des études non admises, avec leurs octets et empreintes ; aucun ancien prompt n’a été reconstitué comme s’il était certain. Les nouvelles requêtes autorisées sur ces sujets positifs ont un journal écrit avant l’appel et complété après chaque retour individuel. Les 29 nouveaux appels du lot couvrent 24 sujets et cinq corrections de sorties positives ; ils ont tous rendu un PNG. Aucun refus de portrait ou historique n’a été relancé.

Les sources entières retrouvées pour Big Man Majini, Popokarimu, Moreau sous son manteau, Lucas muté, Garrador 2023, Crimson Head et l’illustration originale du Tyrant ont été ouvertes avant utilisation. L’illustration du Tyrant ne devient pas un frame natif. Les vues natives de Hunter 2002 documentent son anatomie, sans transformer leur pose de référence en animation de combat.

Pour les 54 autres sujets, les URLs originales ont été réellement revérifiées. Cinquante-deux réponses sont identiques aux cadrages de catalogue déjà inspectés ; les deux autres correspondent aux sources R22 de Mia et d’Alcina. Les photographies dites « full » n’ajoutent pas les pieds, armes ou appendices coupés. Les variantes brunes d’Eliminator, le Hunter R/Mu non attribué et les modèles PC/HD de Sea Creeper ne remplacent pas silencieusement les incarnations cibles.

Les décisions, sources, captures et empreintes sont conservées sous `modules/fidelity-r34/assets/lots/lot_1/`. Le fichier `checkpoint-resume.json` fournit le bilan par UID. Les captures de revue sont dans `reviews/`, et les recherches complémentaires dans `web-body-research.json`. Les décisions retenues lient des copies immuables des recherches communes pour que les ajouts ultérieurs ne rendent pas leurs preuves périmées.

Toutes les images de combat de ce lot restent des adaptations générées d’une pose statique. Aucune nouvelle animation idle originale, géométrie exacte ou fidélité artistique globale 1:1 n’est certifiée. Le lot est figé pour la recette globale.
