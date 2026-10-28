# R31 — Illustrations corporelles et variante de pose

Trois véritables sorties `image_gen` sont conservées sans retouche de pixels. Le [registre effectif](../modules/fidelity-r31/sprites/manifest.json) reprend les 363 identités générées de R29 et ses 22 refus. Les quatre sprites historiques R20 et les versions antérieures restent inchangés.

- Lucas Baker muté, *Not a Hero* : nouvelle présentation frontale d’après le rendu corporel documenté R22. Les jambes, pieds, têtes, cage thoracique, long membre et grand bras à gueule sont revus. La pointe supérieure n’a que deux pixels de marge à alpha ≥16 ; une frange d’alpha ≤11 atteint le bord. La silhouette principale n’est pas visiblement coupée, mais la complétude de cette pointe fine et une marge généreuse ne sont pas certifiées. Cette lacune reste déclarée.
- Donna Beneviento et Angie : nouvelle présentation frontale assise de la paire, avec le voile, le vêtement jusqu’à son ourlet, les mains visibles, la robe de la poupée et ses deux chaussures. Ni des jambes cachées sous le vêtement, ni un corps arrière, ni une posture debout ne sont inventés.
- Zombie de RE1 remake : illustration de la variante `NakedZombie` du GameCube 2002, issue d’une nouvelle archive native vérifiée et de quatre vues du modèle. Les bras abaissés et les jambes fléchies sont une adaptation de pose 2D. Le costume du catalogue reste le choix initial ; cette variante exige un choix volontaire dans « VARIANTES VISUELLES DE L’INCARNATION ». Une seule orientation droite et une seule image sont disponibles. Une image fixe n’est pas une animation idle.

Les deux premières images dérivent de rendus documentaires de la même incarnation, publiés par un tiers. Leur authenticité comme fichiers natifs n’est pas certifiée. La troisième utilise les sommets et textures du modèle natif publié comme références ; le PNG final reste une interprétation générée, avec pose adaptée. Aucune des trois images n’est annoncée comme un sprite natif, un rendu original exact ou une certification géométrique 1:1.

Le compteur des corps visibles revus passe de 112 à 114 dans le registre généré. Cela ne signifie pas deux nouvelles apparences entièrement qualifiées sans lacune : celle de Lucas conserve l’incertitude de pointe décrite ci-dessus. Les présentations frontales ont `availableStates:[]`. La variante de Zombie est séparée des images actives par défaut et expose une pose statique neutre, sans miroir ni état d’attaque.

La [galerie R31](../modules/fidelity-r31/sprites/index.html) montre chaque vraie sortie PNG avec ses références et sa comparaison à R29. Les couleurs visibles sous alpha zéro dans un lecteur brut ne constituent pas un fond opaque ; le contrôle utilise le canal alpha réel. Les PNG de production sont copiés directement des artefacts `image_gen`, jamais découpés, repeints, recolorés ou rééchantillonnés par Python.

L’archive `asset-287624.zip` fournit un OBJ, son MTL et trois textures PNG, avec son fichier d’attribution. Tous les membres sont conservés exactement. Les quatre vues natives de 768 pixels ne changent ni sommets, ni pose, ni matrices, ni textures ; elles utilisent le rendu d’albédo explicitement dérivé du lecteur Three.js. Le modèle est en pose de liaison, sans animation native. Ces vues restent des références, pas de nouveaux sprites natifs de combat.

Le lecteur généré R31 conserve les quatre alias R27/R28/R29/R31 et le contrat de repli. Les choix de variante sont en mémoire dans la page, sans modification d’acteur, de collision, de sauvegarde ou de replay. Les décodages participent au budget partagé R31 : réservation avant création du décodeur, attente distincte de la corruption, reprise sur libération de crédit, nettoyage du décodeur en attente et libération à `pagehide`.

Les 22 refus initiaux et le refus de révision Tyrant ne sont pas retentés. Les gestes, autres orientations, animations, textures originales exactes, tailles physiques et fidélité globale restent ouverts.

Recette exécutée :

```sh
python3 scripts/build-sprites-r31.py --check
python3 tests/test_generated_sprites_r31.py
node tests/verify-generated-sprites-r31.mjs
node tests/browser-generated-sprites-r31.mjs
```

Rapports : [12 tests de provenance et de silhouette](R31_SPRITES_TESTS.json), [9 groupes de lecteur et de budget](R31_GENERATED_RUNTIME_TESTS.json), [5 groupes dans Chromium](R31_SPRITES_BROWSER.json). Le navigateur vérifie les trois PNG, les trois montages réels, une variante volontaire dans un vrai duel, la conservation des acteurs/replays/clés enregistrées, le clavier à 320 pixels avec texte à 200 % et le refus d’un PNG corrompu.
