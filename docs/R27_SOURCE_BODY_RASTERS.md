# R27 — vues séparées de quatre corps publiés

L’[addendum des références de corps](../modules/fidelity-r27/sources/body-rasters/manifest.json) ajoute 16 PNG transparents, quatre angles de caméra séparés pour chacun des modèles attribués de Lisa Trevor et Cerberus du remake GameCube, Chainsaw Majini et Executioner de RE5 PC.

Chaque image de 512 × 512 pixels provient directement de la géométrie, des matériaux et des textures déjà conservés dans R24/R25. Les empreintes du catalogue, du modèle, du MTL éventuel, des textures, de la recette et des PNG sont conservées, ainsi que le SHA des pixels RGBA décodés. Les modèles, positions et poses ne sont ni déplacés, ni réfléchis, ni convertis en mètres. Seule la caméra tourne autour des bornes complètes de la géométrie.

Les fichiers sont `sources/body-rasters/<UID>/source-0.png`, `source-90.png`, `source-180.png` et `source-270.png`. Les numéros sont les angles d’orbite de la recette ; ils ne certifient pas une face avant ou une orientation canonique. L’éclairage appartient à la recette et non au jeu d’origine.

Ces vues conservent les poses de base publiées. Les deux modèles RE5 apparaissent en T-pose et ne montrent pas leurs armes dans cette géométrie sélectionnée : la tronçonneuse et la hache exigent des références d’équipement distinctes. Le modèle Lisa conserve une longue chaîne sous ses pieds ; elle reste dans les bornes, sans déplacement ou découpe anatomique ajouté. Aucune de ces limites n’est cachée par un recadrage.

L’index d’apparence et les 385 jobs de génération initiaux restent gelés et inchangés. L’addendum fournit des références supplémentaires pour une éventuelle correction visuelle ultérieure, après revue. Il ne remplace aucun résultat généré et ne compte comme aucun nouveau sprite `image_gen`, sprite original ou asset final de combat.

```sh
node scripts/render-source-body-rasters-r27.mjs
python -m unittest discover -s tests -p test_source_body_rasters_r27.py -v
```

Les quatre groupes Python passent : les 16 PNG et leurs pixels décodés sont vérifiés, les canaux alpha sont présents, aucun pixel visible ne touche les bords, chaque source correspond au modèle attribué et les nouveaux fichiers restent exclus des entrées de génération gelées. Les vues à zéro degré des quatre corps ont été inspectées. Voir [résultats](R27_SOURCE_BODY_RASTERS_TESTS.json).
