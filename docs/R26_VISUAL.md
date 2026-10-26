# R26 — nouvelles références visuelles

Neuf modèles OBJ supplémentaires proviennent de huit archives publiées sur The Models Resource : Lurker, deux variantes de Zombie, Centurion, Stinger et « Tyrant » de Resident Evil 0 sur GameCube ; trois variantes U.S.S. de Zombie de Resident Evil Outbreak — File 1 sur PlayStation 2.

Cinq UID du catalogue sont attribués au sujet et au jeu publiés : `re0-lurker`, `re0-zombie`, `re0-centurion`, `re0-stinger` et `reoutbreak-zombie`. La publication « Tyrant » reste candidate pour `re0-proto-tyrant` ; elle ne crée pas un alias certifié. Les variantes U.S.S. ne remplacent pas les autres variantes de Zombie.

Les huit ZIP, huit notices HTML, huit images publiées et huit pages de corroboration sont conservées avec leur taille et leur SHA-256. Les corroborations reprennent les octets des captures R23 datées, sans prétendre à une nouvelle observation indépendante. Leurs URL et dates figurent dans `R26_VISUAL_IMPORT_REQUEST.json`. Le manifeste recense 77 fichiers de source et de preuve, totalisant 20 828 113 octets ; le pack contient aussi son manifeste.

Le nom de fichier de chaque OBJ, MTL et PNG extrait et ses octets restent identiques au membre original. Les deux variantes de Zombie ont des références MTL dont les PNG sont publiés dans l’autre dossier du même ZIP. Neuf références sont résolues uniquement par le nom littéral de leur fichier ; si plusieurs membres ont ce nom, tous doivent avoir le même SHA-256. Les références et tous leurs candidats restent documentés dans `nativeTextureReferenceAliases`. Une référence absente ou ambiguë est refusée. Le MTL n’est jamais réécrit.

Ces exports ne contiennent ni armature ni animation. Ils ne certifient ni égalité aux fichiers Capcom bruts, ni échelle corporelle, ni éclairage d’origine, ni sprite de combat final. Les références sont examinables dans le lecteur cumulatif R26. Les [planches d’orientation](R26_SPRITES.md) sont des rendus dérivés distincts des images publiées.

Reproduction de l’import hors réseau :

```sh
python scripts/import-visual-models-r26.py --output /tmp/bow-r26-visual-copy
python -m unittest discover -s tests -p test_visual_models_r26.py -v
node tests/verify-visual-models-r26.mjs
```

Le premier programme vérifie toutes les entrées avant d’écrire et refuse d’écraser des octets différents. Les huit tests Python vérifient l’égalité archive/extraction, la reproduction, les chemins, les références de textures et la portée des attributions. Les neuf contrôles Node décodent les géométries et leurs liaisons avec la copie inchangée de Three.js 0.180.0. Le rapport Node est `R26_VISUAL_NODE_TESTS.json` ; le rapport consolidé est `R26_VISUAL_TESTS.json`.

Sources de modèles : [Lurker](https://www.models-resource.com/gamecube/residentevil0/asset/287608/), [Zombie](https://www.models-resource.com/gamecube/residentevil0/asset/287609/), [Centurion](https://www.models-resource.com/gamecube/residentevil0/asset/287610/), [Stinger](https://www.models-resource.com/gamecube/residentevil0/asset/287611/), [Tyrant](https://www.models-resource.com/gamecube/residentevil0/asset/287612/), [U.S.S. A](https://www.models-resource.com/playstation_2/residenteviloutbreakfile1/asset/290785/), [U.S.S. B](https://www.models-resource.com/playstation_2/residenteviloutbreakfile1/asset/290786/), [U.S.S. C](https://www.models-resource.com/playstation_2/residenteviloutbreakfile1/asset/290787/).
