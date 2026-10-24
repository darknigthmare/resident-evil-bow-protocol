# R25 — huit références de modèles publiés

Ce lot conserve **sept archives originales et huit entrées consultables** :
trois OBJ et cinq références FBX pondérées, dont une partie indépendante.
Il ajoute des ressources vérifiables aux chantiers de rig, d’anatomie et de rendu.
Il ne produit pas huit sprites de combat finis et n’ajoute aucun mouvement.

| Publication | Support déclaré | Fichier utilisé | Os publiés / skins | Attribution au catalogue |
| --- | --- | --- | --- | --- |
| [Chainsaw Majini](https://models.spriters-resource.com/pc_computer/residentevil5/asset/316460/) | RE5 PC | FBX | 87 / 11 | `re5-chainsaw-majini` |
| [Axe Executioner](https://models.spriters-resource.com/pc_computer/residentevil5/asset/310867/) | RE5 PC | FBX | 112 / 12 | `re5-executioner` |
| [Plaga C](https://models.spriters-resource.com/pc_computer/residentevil5/asset/304724/) | RE5 PC | FBX | 63 / 5 | Rapprochement à Duvalia **candidat seulement** |
| [Urboros Test Subject](https://models.spriters-resource.com/pc_computer/residentevil5/asset/318469/) | RE5 PC | FBX | 196 / 13 | `re5-uroboros` ; pose d’export |
| Même archive, partie « Tale » | RE5 PC | FBX | 13 / 1 | Partie indépendante ; aucun assemblage inventé |
| [Del Lago](https://models.spriters-resource.com/pc_computer/residentevil4/asset/284057/) | RE4 PC 2007 | OBJ + MTL | 0 / 0 | Candidat à `re4-del-lago`, pas équivalence GameCube 2005 |
| [Dr. Salvador](https://models.spriters-resource.com/pc_computer/residentevil4/asset/284058/) | RE4 PC 2007 | OBJ + MTL | 0 / 0 | Candidat à `re4-dr-salvador`, même réserve de support |
| [El Gigante](https://models.spriters-resource.com/pc_computer/residentevil4/asset/284059/) | RE4 PC 2007 | OBJ + MTL | 0 / 0 | Candidat à `re4-el-gigante`, même réserve de support |

Les pages des modèles et leurs liens d’archives sont conservés en texte inerte.
Chaque publication possède aussi son aperçu PNG exact et une copie de la page
Evil Resource correspondant à l’identité ou au candidat examiné. Ces articles
corroborent le contexte du jeu et du sujet ; ils ne prouvent pas la chaîne
d’extraction technique des modèles. En particulier, la page Duvalia ne prouve
pas à elle seule que le nom publié « Plaga C » est son alias exact.

## Conservation et limites des matériaux

Les ZIP, OBJ, MTL, FBX et PNG restent identiques à leurs publications. Les
versions COLLADA restent disponibles dans les archives originales, avec leur
empreinte, sans copie ni réécriture supplémentaire. Leurs références locales
ne sont jamais résolues vers le système de fichiers de la machine.

Les trois MTL de RE4 emploient l’extension `.PNG`, alors que les noms dans le
ZIP se terminent par `.png`. Les huit correspondances ne diffèrent que par la
casse et sont uniques dans chaque archive. Cette relation est consignée dans
`nativeTextureReferenceAliases` ; ni les MTL ni les PNG ne sont renommés.

Neuf maillages de Chainsaw Majini, Executioner et Plaga C ont un matériau natif
sans texture. Ils restent sans texture plutôt que de recevoir une image choisie
au jugé. Deux autres maillages du corps Uroboros (`mesh0`, `mesh6`) référencent
explicitement le nom inexistant `unknownmaterial` comme image diffuse. Le
manifeste conserve ces deux absences avec le SHA-256 du FBX et les noms des
maillages. Le lecteur peut les afficher avec leur matériau neutre, en signalant
la lacune ; aucune image de remplacement n’est fabriquée.

Les fichiers de normales et de spéculaire liés par les FBX sont conservés.
L’examen neutre dans Three.js ne certifie pas les shaders, la transparence,
l’éclairage ou le rendu des jeux originaux. Le chargeur signale notamment que
les liaisons `SpecularFactor` de certains FBX ne sont pas prises en charge.

Les cinq FBX n’ont **aucune courbe variable**. Quatre conservent une prise
nommée `Take 001` dont toutes les clés sont à zéro ; Plaga C n’a pas de prise
d’animation. Ces données ne sont donc pas comptées comme cinq mouvements.
L’origine console des os des exports communautaires reste non certifiée.

Les caméras de Del Lago et de la partie Tale regardent depuis le côté pour
rendre leur longueur visible. Seule la caméra change : coordonnées, poses,
poids, orientation et asymétries des maillages restent inchangés. Les unités
des fichiers ne deviennent pas une taille corporelle en mètres.

## Contrôles exécutés

Huit tests Python réussissent : égalité des membres d’archives, os et poids,
absence de mouvements, matériaux incomplets, casse des références OBJ,
reproduction de l’import, limites des ZIP, chemins, liens symboliques et
refus de remplacer des octets existants différents.

Huit contrôles Node décodent les modèles avec la version Three.js 0.180.0
conservée dans R24. Ils vérifient matrices et coordonnées finies, influences
bornées, noms des os, nombre de skins et absence de mouvement dans les prises.
Les images sont remplacées par un objet Texture vide uniquement dans ce test
de géométrie sans GPU ; cette technique ne constitue pas une recette visuelle.
La recette réelle du lecteur et ses captures sont conservées dans le rapport
navigateur R25 du lecteur de modèles.

```sh
python3 scripts/import-visual-rigs-r25.py
python3 -m unittest discover -s tests -p 'test_visual_rigs_r25.py' -v
node tests/verify-visual-models-r25.mjs
```

Le premier appel reproduit les ressources depuis les archives et copies de
pages déjà livrées. Il vérifie leurs empreintes, refuse tout changement de
source et ne remplace aucun fichier différent. Les preuves de préparation
sont [R25_VISUAL_IMPORT_REQUEST.json](R25_VISUAL_IMPORT_REQUEST.json),
[R25_VISUAL_TESTS.json](R25_VISUAL_TESTS.json) et
[R25_VISUAL_NODE_TESTS.json](R25_VISUAL_NODE_TESTS.json).

Les chantiers globaux et la fidélité 1:1 restent ouverts. Une pose d’export
complète ne prouve ni un cycle animé, ni un rig de combat final, ni les formes
occultées ou variantes absentes des fichiers publiés.
