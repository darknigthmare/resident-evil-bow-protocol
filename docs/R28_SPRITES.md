# R28 — revue des sprites et compléments corporels

Les 171 PNG R27 qui attendaient une revue ont été inspectés côte à côte avec toutes leurs références réellement utilisées, sur 57 captures navigateur. Les observations individuelles lient l’UID, le PNG, le record historique, chaque référence et la capture à leurs SHA-256. Les 363 PNG produits sont désormais visuellement revus, sans faire de la revue une certification 1:1.

La surcouche effective `modules/fidelity-r28/sprites/manifest.json` conserve les 385 cibles initiales, les 363 fichiers actifs et les 22 refus d’outil. Elle conserve aussi les quatre identités R20 séparées dans le résolveur de combat. Les fichiers et rapports R27 restent inchangés. Une nouvelle génération corporelle R28 remplace la même identité par son SHA antérieur ; elle ne crée pas une cible supplémentaire.

## Ce qui permet une admission en combat

Une image d’attente statique exige une revue visuelle, une source corporelle complète, une sortie corporelle complète, une pose neutre, un côté gauche/droit réellement produit et une identité de combattant. Une présentation, un cri, une attaque, une pose de liaison ou une vue frontale ne devient pas une attente utilisable parce que le corps est entier. Aucune image n’est retournée en miroir.

La revue a notamment repéré des jambes, bottes ou armes inventées à partir de portraits coupés pour Brad Vickers, Ndesu, les Hunters d’Outbreak et d’autres incarnations. Ces sorties restent consultables mais sont exclues des rendus de combat jusqu’à l’acquisition de références complètes et d’un nouveau PNG correspondant. Le Colmillos RE4 avait perdu les longs tentacules dorsaux visibles dans sa source : sa présentation ne constitue pas un corps complet conforme.

Les 171 observations ajoutent dix attentes latérales statiques et vingt corps visibles revus pour le périmètre combattant. Avant les remplacements corporels R28, le registre effectif compte donc 32 attentes admissibles et 102 corps revus. Les compteurs définitifs, après tout remplacement, sont calculés depuis les fichiers réels dans le manifeste. Le fichier `modules/fidelity-r28/sprites/body-gaps.json` énumère chaque corps encore incomplet ou non qualifié, son incarnation exacte, ses références actuelles et le prochain travail requis ; les rencontres contextuelles et les refus conservés y restent distincts. Les poses restent des interprétations générées ; les vues opposées, cycles, attaques, géométrie et poses d’origine exactes demeurent non certifiés.

## Reproduction

```sh
python scripts/build-sprite-overlay-r28.py
python scripts/build-sprite-overlay-r28.py --check
python tests/test_sprite_overlay_r28.py
node tests/verify-combat-sprites-r28.mjs
node tests/browser-generated-sprites-r28.mjs
```

Le constructeur vérifie les empreintes du registre R27, des 171 observations, des sources, captures et PNG actifs. Il remesure l’alpha, les dimensions, les limites et pivots sans réécrire les pixels. Les remplacements doivent porter la même incarnation et le même périmètre ; une identité refusée ne peut pas être réintroduite comme un remplacement.

La sélection d’une incarnation au clavier conserve désormais le focus sur le même résultat après sa reconstruction dans la liste. Tabulation continue vers le résultat suivant. Le chargement initial et la reprise de la galerie ne prennent pas le focus du champ de recherche. Ce défaut a été reproduit avant correction : Entrée renvoyait auparavant le focus vers le corps de la page.

Le résolveur R28 garde les limites du résolveur R27 (registre 4 Mio, PNG 16 Mio/16 mégapixels, quatre images décodées, deux lectures simultanées) et expose les mêmes fonctions aux adaptateurs historiques. Les états non produits et côtés absents passent au rendu existant ; aucune commande, collision, sauvegarde ou donnée de replay n’est écrite par le résolveur de sprites.
