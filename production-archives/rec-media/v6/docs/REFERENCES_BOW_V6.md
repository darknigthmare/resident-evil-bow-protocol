# Références BOW V6

## Résultat utilisable

Six créatures possèdent des références locales de corps entier examinées. Elles servent à guider et contrôler la silhouette, les appendices et les différences entre éditions. Elles ne constituent pas des images générées pour le projet, une validation moteur, une preuve de licence ou une certification de fidélité 1:1. Les originaux téléchargés, les modèles et leurs rendus de consultation sont à exclure de l’archive et de la publication V6. Le présent relevé de sources et le manifeste JSON peuvent accompagner les livrables.

Le contrôle des manquants provient de l’audit R34 du dépôt. Les portraits des cibles principales existent déjà. Pour Licker RE2 remake, Reaper et Regenerador, une pose droite antérieure existe : une gauche indépendante est la cible utile. Hunter Gamma possède déjà les deux orientations et ne doit pas être régénéré. Tyrant T-002 remake reste exclu en raison du refus historique, sans nouvelle tentative.

## Fichiers retenus

| Créature et édition | Vues locales retenues | Format et dimensions | Nature de la source |
|---|---|---|---|
| Hunter Beta — Resident Evil 3 remake (2020) | `hunter_beta_re3r_qualified_side.png` ; `hunter_beta_re3r_qualified_three_quarter.png` | PNG 1400 × 1050 RGBA | community_game_extraction |
| Drain Deimos — Resident Evil 3 remake (2020) | `drain_deimos_re3r_qualified_side.png` ; `drain_deimos_re3r_qualified_three_quarter.png` | PNG 1400 × 1050 RGBA | community_game_extraction |
| Licker — Resident Evil 2 remake (2019) | `licker_re2r_model_side.png` ; `licker_re2r_model_three_quarter.png` ; `licker_re2r_model_front.png` | PNG 1600 × 1100 RGBA | community_game_extraction |
| Ivy — Resident Evil 2 remake (2019) | `ivy_re2r_full_candidate.png` | PNG 1019 × 785 RGBA | community_rehosted_visual_unverified_original |
| Reaper — Resident Evil 5 (2009) | `reaper_re5_full_legacy.png` | PNG 620 × 692 RGB | project_archived_reference |
| Regenerador — Resident Evil 4 remake (2023) | `regenerador_re4r_full_legacy.jpg` | JPEG 583 × 965 RGB | project_archived_reference |

Les chemins absolus, tailles en octets et empreintes SHA256 sont consignés dans `REFERENCES_BOW_V6.json`. Les noms contenant `qualified` correspondent aux versions corrigées et inspectées. Les premiers rendus de travail et les bustes Evil Resource ne sont pas des références complètes validées.

## Hunter Beta Resident Evil 3 remake (2020)

**Source consultée** — https://model-index-site.pages.dev/

**Téléchargement réel** — https://drive.google.com/uc?export=download&id=1WG9trCYM1JuTsq-64XAoofximNuNhwpK

**Contraintes observées**

- Deux bras et deux jambes, dos très bombé.
- Avant-bras et main gauches anatomiques massifs, longues griffes courbes ; bras opposé plus fin.
- Tête basse blindée, crocs pendants, plaques gris olive et zones charnues rouges.

**Traitement** — Blender 4.3.2. Ouverture use_scripts=False, --disable-autoexec. Group_0, Group_2 et Group_6 conservés ; Group_12 (tête endommagée) masqué pour éviter les variantes superposées. Aucun sommet modifié. Éclairage neutre, AgX.

**Limites** — Pose technique du modèle, pas idle canonique. Version .blend 4.5.87 ouverte par 4.3.2 ; rendu inspecté. Matériaux et éclairage de consultation, pas rendu du moteur du jeu. Page DeviantArt HTTP403 ; catalogue, téléchargement public et identifiants em3300 effectivement vérifiés.

## Drain Deimos Resident Evil 3 remake (2020)

**Source consultée** — https://model-index-site.pages.dev/

**Téléchargement réel** — https://drive.google.com/uc?export=download&id=1yGG_z_x-j-pXNevESnfY0VI2DwGm7rlR

**Contraintes observées**

- Carapace bombée segmentée et épineuse, parties charnues rouge sombre, griffes pâles recourbées.
- Armature em3500 avec paires L/R_Foot, L/R_FrontBigArm, L/R_FrontLeg.
- Préserver également la paire de petits appendices L/R_FrontSmallArm et les longs appendices en faux L/R_Foot_decoB ; ne pas les confondre avec les pattes porteuses.

**Traitement** — Blender 4.3.2. Ouverture use_scripts=False, --disable-autoexec. Maillage et armature non modifiés. Éclairage neutre, AgX.

**Limites** — Pose technique, pas animation idle. Certains membres se superposent en profil ; consulter aussi la vue trois quarts. Version .blend 4.5.87 ouverte par 4.3.2 ; rendu inspecté. Page DeviantArt HTTP403 ; catalogue, téléchargement public et identifiants em3500 effectivement vérifiés.

## Licker Resident Evil 2 remake (2019)

**Source consultée** — https://models.spriters-resource.com/playstation_4/residentevil2remake/asset/326332/

**Téléchargement réel** — https://models.spriters-resource.com/media/assets/323/326332.zip?updated=1755507075

**Contraintes observées**

- Cerveau exposé, tête sans yeux ordinaires et mâchoire dentée.
- Deux bras très longs et deux jambes repliées, griffes ivoire longues, relief osseux du dos.
- Langue fortement allongée dans la pose technique du fichier ; ce déploiement maximal ne constitue pas un idle validé.

**Traitement** — FBX importé dans Blender 4.3.2 ; fichiers de textures PNG relocalisés. Les connexions de normal-map non standard ont été désactivées. Aucun sommet ni bone modifié. Éclairage de consultation, vue Standard.

**Limites** — Fiche PS4 Resident Evil 2 Remake, soumission LWG_ datée du 2 octobre 2021. Extraction/port communautaire, pas distribution officielle Capcom. La grande langue rend le corps petit en profil ; compléter par la vue de face. Gauche indépendante à privilégier car droite ancienne existante selon audit.

## Ivy Resident Evil 2 remake (2019)

**Source consultée** — https://videogamepro.jimdofree.com/resident-evil-%D1%81%D0%B5%D1%80%D0%B8%D1%8F-%D0%B8%D0%B3%D1%80/resident-evil-2-2019/%D0%B2%D1%80%D0%B0%D0%B3%D0%B8/

**Téléchargement réel** — https://image.jimcdn.com/app/cms/image/transf/dimension%3Dorigxorig%3Aformat%3Dpng/path/s66765e01ba4c0b38/image/if8b69bee8204c253/version/1567355452/image.png

**Contraintes observées**

- Deux bras et deux jambes sur une silhouette humanoïde.
- Lianes vertes enchevêtrées, multiples bulbes ocre et zones charnues sombres.
- Tête à ouverture verticale : deux états sont montrés dans la référence ; utiliser un seul monstre, tête fermée pour la proposition idle.

**Traitement** — Image téléchargée et inspectée, aucune retouche.

**Limites** — Source communautaire, publication indiquée au 1er septembre 2019. Provenance officielle de l’image non certifiée. Montage de deux états, pas une scène avec deux espèces. Pas de profil orthographique garanti.

## Reaper Resident Evil 5 (2009)

**Source consultée** — https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_2/source-research/re5-reaper-candidate-1.png

**Téléchargement réel** — https://raw.githubusercontent.com/darknigthmare/resident-evil-bow-protocol/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_2/source-research/re5-reaper-candidate-1.png

**Contraintes observées**

- Quatre membres supérieurs distincts terminés en faux et deux pattes porteuses.
- Deux longues antennes, carapace brun bronze, zone ventrale pâle.
- Préserver toutes les extrémités ; les deux pieds sont très sombres dans la source mais présents.

**Traitement** — Copie binaire du dépôt, SHA256 vérifié contre le reçu audité. Aucune retouche.

**Limites** — Origine primaire et licence non réétablies dans cette recherche. Le reçu de projet identifie RE5 ; vue majoritairement frontale. Gauche indépendante uniquement, droite déjà admise.

## Regenerador Resident Evil 4 remake (2023)

**Source consultée** — https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/re4r-regenerador-candidate-1.jpg

**Téléchargement réel** — https://raw.githubusercontent.com/darknigthmare/resident-evil-bow-protocol/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/re4r-regenerador-candidate-1.jpg

**Contraintes observées**

- Deux bras et deux jambes, abdomen gonflé, silhouette lourde.
- Peau gris bleu plissée, tête chauve, petite zone des yeux et grande bouche dentée.
- Mains et doigts très allongés ; aucun piquant d’Iron Maiden.

**Traitement** — Copie binaire du dépôt, SHA256 vérifié contre le reçu audité. Aucune retouche.

**Limites** — Origine primaire et licence non réétablies dans cette recherche. Le reçu de projet identifie le remake 2023 ; ne pas employer la page encyclopédie du Regenerador original 2005 pour certifier cette forme. Gauche indépendante uniquement, droite déjà admise.

## Références insuffisantes ou cibles exclues

### re5-u-8

HELD_REFERENCE — Aucune vue entière locale qualifiée. URL primaire identifiée mais HTTP403 ; source Evil Resource recadrée, déjà signalée insuffisante par audit.

Page primaire identifiée : https://game.capcom.com/residentevil/sp/en/exfile-1-10.html

Image primaire identifiée, non téléchargée : https://game.capcom.com/residentevil/image/encyclopedia/image/001001er.jpg

U-8 de RE5 uniquement. Ne pas remplacer par U-3, U-8 Prime, U-8 Turbo ni un concept préliminaire.

### re5-licker-beta

HELD_REFERENCE — Aucune vue entière locale claire et isolée qualifiée. Les 4 captures communautaires téléchargées ne suffisent pas à verrouiller une pose complète (occlusions, angles, interface).

Page primaire identifiée : https://game.capcom.com/residentevil/en/exfile-1-6.html

Ne pas remplacer par Licker RE2R, Operation Raccoon City, Damnation ou un concept RE5 préliminaire sans griffes.

### re3r-hunter-gamma

EXCLUDED_DUPLICATE — Droite et gauche antérieures déjà présentes, ainsi que références de modèle à 4 angles selon audit.

### re1r-tyrant-t002

EXCLUDED_HISTORICAL_REFUSAL — Refus historique explicitement signalé par audit. Aucune tentative ni génération de remplacement.

## Niveau de preuve et différences entre éditions

La priorité a été donnée aux sources Capcom. Plusieurs pages Resident Evil Net et images de leur encyclopédie répondent HTTP403 ; aucun accès bloqué n’a été contourné. Les liens ont été conservés comme pistes primaires identifiées, sans prétendre avoir obtenu leurs images. Les références exploitables sont donc décrites selon leur provenance réelle : extraction communautaire, visuel réhébergé ou référence archivée dans le dépôt du projet. Un site qui expose un fichier du jeu ne devient pas une source officielle Capcom.

Le nom d’un dossier « full » ne garantit pas une silhouette entière. Les quatre PNG Evil Resource initialement obtenus font 450 × 360 : Hunter Beta, Ivy et Reaper y sont fortement recadrés ; Drain Deimos touche ou dépasse un bord. Ils sont utiles pour certains détails de matière, mais insuffisants pour définir seuls les membres et proportions d’un nouveau corps entier. Les captures Licker Beta RE5 de BiohazardEurope montrent le jeu avec interface et occlusions ; elles ne permettent pas une validation complète de pose.

Les nouvelles références doivent conserver l’édition de chaque entrée. Le Hunter Beta 2020 ne doit pas recevoir les proportions ou couleurs arbitraires du Hunter 1999 ; l’Ivy 2019 reste un humanoïde colonisé de lianes, sans substitution par la plante bipède du jeu 1998 ; les deux Licker RE2R et Beta RE5 restent des cibles distinctes. Le Regenerador 2023 ne reçoit ni les piquants d’Iron Maiden ni une silhouette certifiée depuis une fiche du jeu 2005. Ces distinctions délimitent le contrôle, elles ne remplacent pas la comparaison visuelle avec les références listées.

## Vérification technique

Les dix images retenues ont été réellement ouvertes dans l’environnement local. Les corps, pieds, griffes et antennes ont été examinés selon les angles disponibles. Les rendus Blender sont calculés à partir des modèles téléchargés ; ce sont des vues documentaires de géométrie, sans génération d’une nouvelle créature. La pose technique des fichiers n’est pas une animation extraite ni une pose idle validée. Les couleurs varient avec l’éclairage et la conversion du matériau. Un rendu transparent facilite la lecture sans promettre une correspondance au pipeline du jeu.

Les fichiers Blender communautaires sont ouverts avec l’exécution automatique désactivée et `use_scripts=False`. Aucun script embarqué n’est utilisé. Pour Hunter, le contrôle a détecté la superposition des versions intacte et endommagée de la tête ; la version endommagée a été masquée, et le groupe contenant les griffes a été explicitement conservé. Pour Drain, le seul maillage complet a été gardé. Les versions de travail antérieures ont été écartées.

Aucune référence originale n’a été publiée ou téléversée par cette recherche. Aucune permission de redistribution n’est déduite de l’accès public à un fichier. La génération et l’intégration éventuelles restent des étapes séparées du présent relevé.

## Clôture de la recherche bornée U-8 et Licker Beta

Le catalogue Models Resource de Resident Evil 5 a été vérifié : sa section Enemies ne fournit aucune entrée U-8 ou Licker Beta. Source : https://models.spriters-resource.com/pc_computer/residentevil5/?source=genre . Deux autres candidats ont été téléchargés depuis la page https://www.relyonhorror.com/in-depth/resident-evil-in-depth/resident-evil-5-in-depth/resident-evil-5-enemies/ : `re5_u8.jpg` et `re5_lickerbeta.jpg` font chacun 190 × 190 pixels et coupent la silhouette. Ils sont rejetés après ouverture locale.

La fiche https://gamer-lab.com/eng/mdl_goldsrc/LickerRE5 présente une conversion destinée à Counter-Strike 1.6 ; elle ne fournit pas ici la provenance et la vérification de géométrie nécessaires à une référence native RE5. Les captures BiohazardEurope apportent du contexte de jeu, mais les vues examinées ne dégagent pas un corps entier suffisamment clair. Les deux cibles restent **HELD_REFERENCE**. Aucun nouveau corps entier ne doit être lancé sur ces seules pièces. Le refus HTTP403 des liens Capcom n’a pas été contourné.
