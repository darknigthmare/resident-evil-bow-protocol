# R26 — planches d’orientation depuis les modèles source

Neuf planches PNG transparentes de 1 024 × 512 pixels présentent 72 vues réellement rendues des neuf nouvelles références OBJ. Chaque cellule de 256 × 256 pixels correspond à une caméra distincte, à 0°, 45°, 90°, 135°, 180°, 225°, 270° ou 315° autour de l’axe Y. Aucune cellule n’est fabriquée par miroir. Les angles ne constituent pas une attribution de la face avant officielle.

Il s’agit de **rendus dérivés pour inspection**, pas de sprites originaux du jeu ou de sprites de combat terminés. Le nombre historique de sprites de combat manquants n’est donc pas réduit par ces 72 vues. La pose statique source n’est pas transformée en cycle d’animation.

`modules/fidelity-r26/sprites/index.html` permet de choisir un modèle, consulter la planche conservée après vérification de son SHA-256, conserver le PNG et sa recette, examiner la référence 3D et recalculer les huit vues. Le recalcul exige une action explicite et peut être annulé. La planche conservée reste utilisable lorsque WebGL est absent. Un réglage de taille permet d’examiner les pixels à la taille de calcul dans une région défilable au clavier ; il ne force pas un débordement de la page. Les paramètres `?identity=<UID>` et `?model=<ID du modèle>` sélectionnent une référence connue uniquement.

La recette conserve les positions des sommets, les transformations du modèle, les MTL et les octets des textures. Seules les caméras se déplacent. La projection orthographique, le cadrage sphérique commun, la lumière ambiante et la lumière directionnelle sont documentés ; aucun rendu original du jeu n’est revendiqué. Le rendu utilise Three.js 0.180.0 déjà livré en R24, sans nouvelle copie de bibliothèque. Les images sont calculées sous Chromium avec SwiftShader dans le cloud et ne certifient aucun appareil physique.

`sprites/manifest.json` relie chaque PNG à son modèle, son MTL et ses textures par SHA-256, conserve les huit positions de caméra, les rectangles des cellules et les limites. Chaque vue a des pixels visibles et aucune occupation sur le bord de sa cellule. Les neuf PNG totalisent 1 042 388 octets. Les dimensions, l’alpha, les huit vues distinctes et l’absence de rognage sont vérifiés sur les fichiers réels par les tests Python.

Recalcul des artefacts, dans une copie de travail destinée à leur revue :

```sh
node scripts/render-source-sprites-r26.mjs
node tests/browser-sprites-r26.mjs
```

Le premier programme écrit les neuf PNG et le manifeste dérivés depuis les sources vérifiées ; des versions de navigateur ou de pilote différentes peuvent modifier les pixels. Il ne modifie aucun fichier source. Le second vérifie huit groupes : consultation des neuf planches, recalcul réel, annulation, corruption de PNG, corruption d’OBJ, chemins et formats refusés, événements de cycle de page simulés, clavier et page de 320 pixels avec une taille de texte effectivement portée à 200 %. Le repli sans WebGL conserve les ressources vérifiées. Les événements simulés ne certifient pas le cache de navigation natif de tous les navigateurs.

Le rapport est `docs/R26_SPRITES_BROWSER.json`. Les captures `qa-sprites-r26-browser/stinger-desktop.png` et `narrow-no-webgl.png` ont été inspectées : les orientations et limites sont visibles et le contenu reste dans la largeur de page. La certification globale 1:1, le rendu du jeu, les mouvements, impacts et transformations de combat restent ouverts.
