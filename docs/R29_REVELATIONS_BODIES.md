# Corps RE5 et variantes documentaires Revelations — R29

Ce lot conserve sept nouvelles images produites par `image_gen`, avec leurs demandes exactes, les sorties originales et sept comparaisons source/sortie liées par SHA. Trois images remplacent leur présentation RE5 précédente : Chainsaw Majini, Executioner et Jill Valentine. Les quatre autres montrent Ooze, Chunk, Tricorne et Pincer dans l’édition HD/PC de 2013 ; elles restent des variantes documentaires distinctes et ne remplacent pas les images des identités du catalogue étiquetées 2012/3DS.

Les trois corps RE5 sont visibles en entier, dans une pose de liaison frontale. Ils n’ajoutent aucun état d’attente en combat. Le corps Chainsaw Majini ne contient pas sa tronçonneuse ; celui de l’Executioner ne contient pas sa hache. La nouvelle image de Jill utilise les quatre vues du modèle Battle Suit et le portrait ennemi P30 fraîchement récupéré pour le dispositif rouge visible. Ce rapprochement ne certifie ni la géométrie tridimensionnelle de P30 ni les armes, absentes des vues corporelles complètes. Les lacunes d’équipement restent explicitement ouvertes.

La première sortie Chainsaw Majini touchait les deux bords latéraux. Elle est conservée avec son reçu dans `sources/revelations-generation/previous-output/`. Une correction de cadrage réalisée par `image_gen` fournit la version active, avec les mains et les pieds dans l’image. Aucun pixel des sorties retenues n’a été retouché par un script.

## Frontière entre éditions

Les quatre variantes Ooze utilisent les quatre vues de corps réellement échantillonnés par le lot `motion` : clip source `BA_1`, temps natif zéro, et angles de caméra distincts. Le nom du clip ne prouve aucun état d’attente. Les images restent des présentations statiques, sans action canonique assignée. Le PNG Pincer sépare davantage les pieds que le placement croisé ou raccourci du modèle échantillonné ; cet écart de pose reste documenté.

La géométrie et les mouvements 3DS de 2012 ne sont pas certifiés équivalents à ces publications HD/PC de 2013. Les quatre reçus portent `targetEditionAdmitted:false` ; les enregistrements ont le périmètre `documentary-edition-variant`, sans `supersedesSha256` et sans capacité de combat. Ils ne clôturent aucun manque corporel de l’édition d’origine. Les couleurs, matériaux, éclairages et détails générés restent également distincts d’un rendu original certifié.

## Références conservées

Le [manifeste des vues corporelles](../modules/fidelity-r29/sources/revelations-body-rasters/manifest.json) conserve douze nouvelles vues de 768 × 768 pixels pour trois corps RE5, sans modification des vertices ou de la pose source. Les seize vues des quatre corps HD/PC restent dans le manifeste du lot `motion`, sans duplication ni nouveau décompte de sprites.

Les [captures Internet](../modules/fidelity-r29/sources/revelations-body-rasters/online-evidence.json) comprennent treize réponses HTTP 200 : huit pages de modèles, deux listes de jeux, le portrait ennemi de Jill et sa page, puis la publication séparée de la tronçonneuse. Les douze HTML bruts gardent leurs espaces d’origine. Deux archives nouvelles sont conservées : Jill Battle Suit, 11 975 299 octets, et Chainsaw, 989 077 octets ; tous leurs fichiers extraits sont comparés aux membres ZIP.

La [vérification d’équipement](../modules/fidelity-r29/sources/revelations-body-rasters/equipment-inspection.json) confirme la présence d’une véritable publication séparée de tronçonneuse, avec FBX, DAE et textures. Elle ne démontre pas son placement sur les os ou les mains du corps retenu. Les vues et archives examinées n’établissent pas non plus une attache de hache pour l’Executioner. Aucun équipement n’est fixé arbitrairement à un personnage.

La publication « Plaga C » est conservée comme source candidate de Duvalia. L’alias et la phase n’étant pas nouvellement établis, aucun remplacement ni génération Duvalia ne sont admis à partir de ce candidat.

## Vérification

```sh
python3 scripts/verify-revelations-bodies-r29.py
```

Le [rapport exécuté](R29_REVELATIONS_BODY_TESTS.json) contient huit groupes réussis : géométrie et textures, décodage des douze vues sans découpe, archives et captures réelles, trois remplacements RE5, séparation stricte des quatre variantes HD/PC, octets des sept sorties et de leurs références, preuves visuelles SHA et limites d’équipement. Cette commande lit les fichiers livrés et ne relance ni téléchargement, ni rendu, ni génération.

Les sept nouvelles images ne créent aucune nouvelle identité cible, aucun cycle complet, aucun nouvel idle ni certification globale 1:1. Les 22 refus historiques ne sont pas retentés.
