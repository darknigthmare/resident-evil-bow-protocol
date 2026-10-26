# R28 — corps complets et références vérifiables

Quatre PNG générés remplacent leurs présentations R27 partielles ou insuffisamment documentées : Wall Blister, Scagdead, Cerberus du remake et Lisa Trevor. Les quatre fichiers sont copiés sans réécriture depuis les sorties réelles `image_gen`. Les anciens PNG R27 et leurs reçus restent inchangés.

Les nouveaux corps utilisent chacun quatre vues du même modèle attribué à leur incarnation. L’[addendum des références](../modules/fidelity-r28/sources/body-rasters/manifest.json) contient 32 PNG transparents : huit modèles corporels pour six identités, avec les variantes de Cerberus et des zombies RE0 comptées séparément des identités. Ces images dérivent directement des géométries, matériaux et textures déjà conservés. Les vertices, transformations, poses, asymétries et unités restent inchangés ; seule la caméra tourne. Les FBX de Revelations utilisent leur axe vertical Z dans la caméra. Ces références ne sont pas des sprites de combat supplémentaires.

Six pages de publication ont été reconsultées sur Internet et conservées octet pour octet, avec URL de redirection, taille et SHA-256 dans [online-evidence.json](../modules/fidelity-r28/sources/online-evidence.json). Les nouveaux PNG ne reposent pas sur une simple extrapolation des anciens portraits tronqués. Les accès aux galeries Fandom de Jack, Marguerite et Mia ont renvoyé HTTP402 et n’ont fourni aucune référence exploitable. Aucun accès de substitution ne contourne cette réponse.

La revue compare les quatre sources et le résultat sur un damier dans les [captures et observations liées par SHA](R28_BODY_VISUAL_EVIDENCE/). Les corps sont visibles en entier, mais les poses restent trois poses de base bras étendus et une présentation latérale. Aucun des quatre PNG n’est admis comme attente en combat. Les animations, la vue opposée produite et la géométrie exacte en jeu restent ouvertes.

Lisa représente uniquement le corps de base du modèle publié, avec sa longue chaîne verticale. La phase aux tentacules de l’ancien portrait n’est pas complétée ; certains accessoires latéraux détachés de l’export sont omis. Cerberus représente un seul chien à une seule tête, avec l’objet détaché ressemblant à une chaîne conservé ; son rôle et son attache dans le jeu ne sont pas certifiés. Ces manques figurent dans `knownAppearanceGaps` et `equipmentCompletenessReviewed:false`. Un corps anatomique entier ne clôt pas leur apparence complète.

Trois essais auxiliaires de suppression d’arrière-plan ne sont pas retenus. La vérification RGBA et la capture navigateur ont confirmé le fond transparent des originaux ; les nouvelles variantes modifiaient des couleurs sans gain établi. Les [reçus de ces essais](../modules/fidelity-r28/sources/auxiliary-image-attempts.json) restent distincts des quatre versions effectives. Les 22 refus R27 sont conservés et ne sont pas retentés. Uroboros reste partiel tant qu’un ensemble complet de son corps et de ses appendices n’a pas été vérifié.

```sh
node scripts/render-source-body-rasters-r28.mjs
python scripts/import-body-sprites-r28.py --prepare-images
node scripts/capture-body-sprite-review-r28.mjs
python scripts/import-body-sprites-r28.py
python scripts/build-sprite-overlay-r28.py
python scripts/verify-body-sources-r28.py
```

La génération `image_gen` n’est pas rejouée par ces commandes. L’import dépend des sorties réelles indiquées par les reçus. La revue humaine des captures reste nécessaire avant l’admission d’un nouveau résultat. Les [cinq groupes de tests](R28_BODY_SOURCES_TESTS.json) vérifient les octets des modèles/textures/références, les 32 PNG sans coupure, les captures Internet, les quatre preuves des sorties et le maintien hors combat des poses ou apparences incomplètes. Aucune certification globale 1:1 n’est accordée.
