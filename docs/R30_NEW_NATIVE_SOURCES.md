# R30 — lot E : corps natifs RE2 / RE3

Ce lot conserve **11 nouvelles archives publiées**, soit **18 nouvelles variantes de modèles**, et réutilise **20 variantes déjà conservées en R26**. Les 38 modèles ont produit **152 PNG transparents de 512 × 512 pixels** avec quatre vraies positions de caméra orthographique. Les 30 identités reliées au catalogue incluent des rapprochements documentaires ; ce nombre ne représente pas 30 corps de combat complétés.

Les modèles, matrices, matériaux et textures sont conservés sans réassemblage, retouche ni miroir. Le rendu utilise explicitement l’albédo source non éclairé : il ne reproduit pas l’éclairage ni tous les matériaux du moteur du jeu.

Les 148 vues GameCube restent des références documentaires pour les incarnations PlayStation du catalogue. Aucune équivalence de port n’a été déduite d’une ressemblance. Les quatre vues de **Hunter γ, Resident Evil 3 remake (2020), édition PC** correspondent à l’édition ciblée et à sa gueule ouverte, mais restent une présentation statique. Elles peuvent servir d’avatar de source native ; aucune posture neutre de combat n’est revendiquée.

Les huit planches de contact ont été réellement inspectées. Les observations décrivent les membres détachés, poses d’export, plans aplatis ou incertitudes de direction constatés. La direction reste `unknown` lorsque les contours ne permettent pas de déterminer une orientation anatomique fiable. Une caméra à 0° ne suffit pas à prouver une orientation gauche.

L’archive de Hunter γ contient un véritable FBX pondéré : **99 os et 129 896 poids**, mais **aucune courbe d’animation**. Un rig ne constitue pas un idle natif. Les autres archives de ce lot fournissent des OBJ statiques. Le résultat est donc **0 animation idle admise, 0 pose de combat admise, 0 image originale rendue par le jeu certifiée**. Aucun mouvement procédural ni bouclage d’une poignée de vues n’est présenté comme une animation.

L’image et la page Evil Resource corroborent le monstre et son jeu. Cette image est un portrait de tête ; elle ne prouve ni les membres cachés, ni la posture corporelle, ni une animation. La variante de fichier `EM039` de l’Ivy, à texture rouge/violacée, reste un rapprochement candidat vers Poison Ivy.

## Vérification

```sh
python3 scripts/prepare-new-native-sources-r30.py
node scripts/render-new-native-sources-r30.mjs
python3 scripts/build-new-native-manifest-r30.py
python3 scripts/verify-new-native-sources-r30.py
node scripts/render-new-native-sources-r30.mjs --verify
```

Les **9 tests Python** vérifient les 11 archives, tous les membres utilisés, le FBX reparsé, les 152 PNG décodés, l’absence de recadrage, les pivots, les contacts et les exclusions de combat. Les **4 vérifications de navigateur** refont effectivement 16 rendus et comparent leurs octets PNG aux images livrées. Les 136 autres vues sont décodées et liées à leurs sources par les tests Python, sans prétendre avoir toutes fait l’objet d’un second rendu.

Les rapports sont `R30_NEW_NATIVE_TESTS.json` et `R30_NEW_NATIVE_BROWSER.json`. Les manifestes sources, de rendu et de revue se trouvent dans `modules/fidelity-r30/native/new-sources/`.
