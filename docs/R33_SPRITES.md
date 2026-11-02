# R33 — Huit profils générés, quatre familles documentaires

La [galerie R33](../modules/fidelity-r33/sprites/index.html) expose huit véritables sorties `image_gen` : un profil droit et un profil gauche produits séparément pour Zombie Dog, Giant Alligator, Giant Moth et le Zombie féminin blond de RE3 avec haut sombre et jupe beige. Les huit fichiers sont copiés directement des artefacts de l’outil, sans recadrage, recoloration, retouche, rééchantillonnage ni miroir.

Chaque famille repose sur quatre vues du modèle natif communautaire du **port GameCube**, déjà conservées dans R30 avec les archives, matériaux et textures. Les seize vues ont été inspectées avant génération. L’image opposée déjà produite sert aussi de référence de cohérence pour la seconde demande, tandis que le côté physique demandé reste celui de sa vue native. Les deux côtés ont des reçus et des empreintes distincts ; une comparaison des rasters décodés vérifie également qu’aucune paire n’est un miroir exact.

Il ne s’agit pas de huit nouveaux sprites natifs ou d’une assimilation aux éditions PlayStation. Les quatre familles sont séparées du registre actif précédent et portent `defaultAdmission:false`, `admittedTargetEdition:false` et `targetEditionMatched:false`. Les images du catalogue restent les choix initiaux. Le registre R31, ses 363 identités générées et ses refus demeurent inchangés.

| Famille | Résultat et portée |
| --- | --- |
| Zombie Dog | Corps visible entier, museau ouvert, pelage noir et roux documenté, queue courte et appuis de la pose source. Deux profils fixes neutres adaptés peuvent être proposés volontairement ; les pattes opposées restent occultées dans une projection latérale stricte. |
| Giant Alligator | Silhouette complète du museau au bout de la longue queue, ventre clair et courtes pattes. Cette entrée reste une **rencontre contextuelle**, avec `availableStates:[]` ; aucun nouveau combattant n’est créé. |
| Giant Moth | Antennes, corps pointu, fines pattes et ailes compactées de la pose publiée. Présentation documentaire seulement : aucun battement d’ailes, cycle de vol ou état de combat n’est attribué. |
| Zombie RE3, costume féminin blond | Tête, cheveux, mains relâchées, haut sombre, jupe beige et chaussures à brides visibles sous les deux côtés. Genoux fléchis et bras légèrement avancés constituent une adaptation de pose 2D, distincte d’une posture native certifiée. |

Le [manifeste](../modules/fidelity-r33/sprites/manifest.json) lie chaque PNG à sa demande réelle, son observation, ses seize références partagées, son archive et ses caractéristiques mesurées. Les quatre silhouettes visibles ont été comparées aux sources sous les deux orientations. Les pixels d’alpha ≥16 restent à l’intérieur du canevas ; leurs marges et pivots sont enregistrés. Une frange d’alpha très faible peut atteindre le bord de l’image droite de Giant Moth : cela ne qualifie pas les bords exacts des textures originales. La fidélité géométrique, les texels et l’anatomie cachée ne sont pas certifiés.

La galerie charge et vérifie seulement le PNG courant : taille, SHA-256, signature PNG puis dimensions décodées. Un changement de choix ou une sortie de page annule la requête, libère le décodeur et révoque son URL. Un résultat dépassé ne peut plus remplacer l’image, l’erreur ou l’adresse du choix courant. Les commandes utilisent les boutons et radios natifs du navigateur. L’interface reste lisible à 320 pixels avec un texte réellement agrandi à 200 %, sans masquer le débordement.

La recette Chromium a inspecté les huit PNG réels et les sources conservées. Les captures de contrôle ont été regardées à l’échelle de la galerie : transparence propre sur le damier, silhouette entière, appuis et séparation claire entre les deux poses neutres adaptées et les deux études. Les événements `pagehide/pageshow` de cette recette sont des fixtures synthétiques ; ils ne prouvent pas une restauration BFCache physique ou le comportement d’un appareil réel. L’intégration dans les pages de combat appartient au lot runtime R33 et à ses preuves séparées.

Les nouvelles consultations des pages Models Resource ont renvoyé HTTP 403 `error code: 1010` pendant ce lot. Elles n’ajoutent aucune preuve Internet positive et n’ont pas servi à remplacer les archives déjà conservées par des sources invérifiables. Les fichiers natifs hérités et leurs URL de publication restent explicitement liés au manifeste R30.

Les 22 refus initiaux et le refus de révision Tyrant sont conservés sans nouvel essai. Aucun nouveau refus n’est survenu sur ces huit demandes. **Aucun idle original, attaque, intro, outro, son, taille physique ou fidélité globale 1:1 n’est certifié par ces poses fixes.**

Commandes exécutées :

```sh
python3 scripts/build-sprites-r33.py --check
python3 tests/test_generated_sprites_r33.py
node tests/verify-generated-sprites-r33.mjs
node tests/browser-generated-sprites-r33.mjs
```

Résultats : [12 tests Python](R33_SPRITES_TESTS.json), [8 groupes Node](R33_GENERATED_RUNTIME_TESTS.json) et [7 groupes navigateur](R33_SPRITES_BROWSER.json), avec leurs sources et empreintes courantes. Le guide `create-game-assets`, puis `game-ui-ux` pour la galerie, ont été lus à la révision définie dans [GAMEDEV_GUIDANCE.md](GAMEDEV_GUIDANCE.md).
