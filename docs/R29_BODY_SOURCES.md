# R29 — références corporelles et import fidèle aux éditions

Le premier lot ajoute deux PNG réellement produits par `image_gen` : le zombie RE0 au manteau brun et Mimicry Marcus sous sa forme de monstre de sangsues. Chaque sortie est liée à quatre vues du même modèle GameCube, à son reçu exact et à une comparaison visuelle conservée avec SHA-256. Les deux corps sont entiers dans une pose de liaison frontale. Aucun état d’attente en combat n’est ajouté.

Ces deux identités avaient déjà un corps marqué entier dans R28. Ce lot améliore leurs références et leur correspondance à un modèle attribué ; il ne clôt donc pas deux manques anatomiques supplémentaires. Le zombie correspond uniquement au modèle aux cheveux bruns et au manteau long. La tenue blonde à manches courtes de l’ancien portrait reste non complétée, explicitement dans `knownAppearanceGaps` et le libellé de variante. Aucun assemblage entre ces deux tenues n’a servi à la génération.

Le troisième essai, une révision du Tyrant du remake, a été refusé par l’outil au stade de sortie pour la catégorie `violence`. Le [refus réel](../modules/fidelity-r29/sprites/revision-failures/re1r-tyrant.json) conserve la demande, les références, l’erreur et son identifiant. Aucun nouvel essai ou changement atténuant son apparence n’est effectué. Le PNG actif précédent reste conservé. Ce refus de révision ne transforme pas Tyrant en cible manquante : les 22 refus des 385 demandes initiales restent distincts.

## Sources conservées

Le [lot natif principal](../modules/fidelity-r29/sources/body-rasters/manifest.json) contient 12 références PNG : quatre angles pour chacun des trois corps RE0 Zombie, Mimicry Marcus et Tyrant RE1 remake. Les sommets, transformations, poses, asymétries et unités ne changent pas. Seule la caméra tourne. Ces références ne sont ni des sorties `image_gen` ni des images originales certifiées du jeu.

Le modèle Leech Monster de RE0 est nouvellement acquis depuis sa page attribuée au GameCube : l’archive de 878 745 octets, l’OBJ, le MTL et les PNG originaux sont [retenus sans modification](../modules/fidelity-r29/sources/native-models/catalog.json). La page ennemie de Mimicry Marcus sert de corroboration documentaire. Le corps publié et l’illustration conservée ont été comparés ; seule la variante de corps en sangsues est qualifiée, sans extrapolation vers l’imitation humaine vêtue ou les phases de la reine. Les chemins virtuels Blender du MTL sont résolus par des noms de fichiers uniques et des octets identiques dans l’archive ; le MTL n’est pas réécrit.

Six pages Internet reconsultées sont conservées avec leurs tailles et SHA dans [online-evidence.json](../modules/fidelity-r29/sources/body-rasters/online-evidence.json) : les deux listes GameCube, les pages des trois modèles et la corroboration de Mimicry Marcus. Leurs espaces et retours à la ligne restent ceux des réponses originales.

La recette R29 peut afficher les matériaux publiés ou l’albédo des textures sources sans éclairage spéculaire. Le lot principal choisit explicitement `unlit-source-albedo` : cela évite les triangles blancs que produisaient les reflets Phong du MTL sous l’éclairage de notre atelier. Les textures et matériaux conservés ne sont pas édités. Ce mode de lecture n’est pas présenté comme une reconstruction du shader ou de l’éclairage du jeu original.

## Import commun et variantes documentaires

Le nouvel importeur commun accepte des reçus explicites par UID, sans liste de personnages codée en dur. Une prévisualisation n’est pas admise automatiquement : il faut une observation humaine du corps source et du résultat, la pose et le côté réellement vus, les limites d’apparence et une capture source/sortie liée par SHA. Les quatre références natives du lot principal restent distinctes des vues complémentaires, portraits partiels ou anciennes images générées utilisées par d’autres lots ; les captures les nomment selon leur rôle propre.

Les éditions restent séparées. Une demande portant `targetEditionAdmitted:false` conserve sa sortie dans `sprites/documentary-variants`, avec son édition source réelle, son identité de comparaison et son SHA précédent. Elle ne remplace pas le personnage cible, ne clôt pas son corps et ne possède aucun état jouable. Les variantes Revelations PC/HD 2013 ne complètent ainsi pas les incarnations originales 2012/3DS du catalogue. Le manifeste effectif et les preuves des autres lots documentent leurs nombres réels.

Une attente ne peut être admise que si la pose neutre, le côté latéral, le corps entier et le périmètre de combattant sont vérifiés **et** si `knownAppearanceGaps` est vide. Une anatomie complète ne résout pas automatiquement un équipement, une tenue, une phase ou une autre édition.

## Vérification et reproduction

```sh
python scripts/import-native-body-models-r29.py
node scripts/render-source-body-rasters-r29.mjs
python scripts/import-body-sprites-r29.py --receipt modules/fidelity-r29/sources/generation-requests/re0-zombie.json --receipt modules/fidelity-r29/sources/generation-requests/re0-mimicry-marcus.json --prepare-images
node scripts/capture-body-sprite-review-r29.mjs --uid re0-zombie --uid re0-mimicry-marcus
python scripts/import-body-sprites-r29.py --receipt modules/fidelity-r29/sources/generation-requests/re0-zombie.json --receipt modules/fidelity-r29/sources/generation-requests/re0-mimicry-marcus.json
python scripts/verify-body-sources-r29.py
```

Ces commandes ne rejouent pas `image_gen`. L’import des images utilise les véritables sorties d’outil indiquées dans les reçus ; la validation CI vérifie les fichiers livrés et fonctionne sans ces chemins de travail externes. Les [huit groupes de tests](R29_BODY_SOURCES_TESTS.json) vérifient les octets des modèles, matériaux, textures, archive, captures et PNG, les 12 vues sans coupure, les deux observations corporelles, le refus de révision et les rejets d’admission. Les essais de routage documentaire et de blocage d’attente utilisent des métadonnées de test, sans publier de fausse variante ni modifier les pixels.
