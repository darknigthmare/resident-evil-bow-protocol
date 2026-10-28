# Avatars de sélection R30

La sélection affiche les images de référence de l’UID choisi directement dans les cartes du Versus principal. Les duels classique et avec évolutions disposent aussi d’une grille d’avatars, avec recherche, pages, choix du sujet ou de l’adversaire et filtre par famille. Les listes de personnages, leurs formes et les contrôles d’origine restent disponibles.

Le registre couvre **388 des 389 identités du catalogue** :

| Provenance de l’avatar | Nombre | Portée |
| --- | ---: | --- |
| Vignettes extraites du menu de modèles RE3 remake, atlas R23 conservé | 7 | Véritables images 2D de menu attribuées à cette édition ; vues partielles de 128×128 pixels. |
| Nouveaux rendus de modèles natifs publiés | 7 | Lurker, Centurion et Stinger RE0 ; Hunter, Lisa Trevor et Cerberus du remake RE1 ; Hunter Gamma RE3 remake. La géométrie et les textures source sont conservées. Ce sont des rendus dérivés, pas des images 2D originales du moteur du jeu. |
| Références secondaires visuellement revues en R22 | 20 | Incarnation documentée ; aucune certification d’extraction native. Elles remplacent notamment les anciens composites RE7. |
| Autres images de référence documentées | 354 | Portrait de l’UID et du jeu indiqués dans les sources conservées. Plateforme et révision exacte du rendu non certifiées par la seule fiche secondaire. |
| Avatar manquant | 1 | Jack Baker avec la scie à ciseaux : le composite provisoire reste masqué. |

Les sept avatars provenant de modèles portent `sourceKind: "native-model-render"`, `derivedNativeModelRender: true` et `originalGame2DFrame: false`. Seules les sept vignettes d’atlas portent `sourceKind: "native-menu-thumbnail"`. Aucun avatar généré n’est classé natif.

Les vues de portrait RE0 emploient une élévation de caméra de 45°, afin de rendre lisibles les corps bas du Centurion, du Lurker et du Stinger. La pose et la géométrie source ne changent pas. Cette caméra appartient à la sélection ; les profils de combat restent dans leur lot propre. Le cadrage CSS élimine les marges transparentes sans modifier les PNG. Les modèles des ports GameCube de RE2/RE3 ne remplacent pas les portraits des éditions PlayStation. La variante U.S.S. A du zombie Outbreak n’est pas promue silencieusement sous le portrait générique.

Les **35 fiches autrefois marquées `index-only-review-required`** ont été requêtées séparément : 35 réponses HTTP200, avec l’URL de l’image exacte présente sur chaque page nommée. Leurs réponses brutes sont conservées sous `modules/fidelity-r30/selection/sources/`, comprimées avec une date gzip fixe. `source-pages.json` lie les réponses brutes, snapshots et URL. Les deux contacts de `R30_AVATAR_REVIEW` ont été inspectés pour l’usage portrait. Cette vérification ne valide pas les membres occultés ou un répertoire d’attaques.

Le Versus principal conserve ses **115 combattants** ; le duel classique conserve **346 profils** ; le mode avec évolutions conserve **348 options**, dont **8 rencontres contextuelles désactivées**. Le registre de 389 identités comprend aussi des sujets documentaires : 388 portraits ne signifient pas 388 combattants disponibles.

Les images sont chargées uniquement lorsqu’elles sont proches de la zone visible, avec **3 transferts/décodages concurrents** et **32 entrées de cache maximum**. Le lecteur borne le flux, contrôle le SHA256 et les dimensions avant d’afficher l’image, refuse les chemins externes ou générés et libère les requêtes/Blob lors de `pagehide`. Une annulation pendant le décodage libère aussi les créneaux avant `pageshow`. Le choix par avatar utilise l’événement `change` du sélecteur existant ; il ne touche pas aux sauvegardes.

Les avatars n’admettent aucun idle ou mouvement de combat. Un corps en pose de liaison convient éventuellement à un portrait et reste impropre à un idle de combat. Le dossier R30 conserve cette distinction.

## Reproduction et vérification

```sh
python3 scripts/build-selection-avatars-r30.py --check
python3 scripts/verify-selection-avatars-r30.py
node tests/browser-selection-avatars-r30.mjs
```

La première commande reproduit le registre à partir des sources retenues, sans accès réseau. `--capture` sert à une nouvelle acquisition explicite des 35 pages et remplace leurs snapshots ; il n’est pas nécessaire à la reproduction.

Les rapports sont `R30_AVATARS_TESTS.json` (6 tests réels de provenance et d’intégrité) et `R30_AVATARS_BROWSER.json` (10 groupes sur les trois pages HTTP réellement montées). Les tests navigateur couvrent l’UID affiché, les familles, le choix au clavier et son focus, les rencontres désactivées, le composite exclu, la corruption de source, les chemins interdits, les limites et l’annulation pendant un décodage en attente. Le contrôle mobile emploie une largeur de 320 pixels et double réellement les tailles de texte du nouveau sélecteur.
