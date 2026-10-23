# R24 — maillages publiés et première armature inspectable

Le lot conserve **21 archives originales et 36 vues OBJ** : 29 exports de
maillages et sept membres ou appendices indépendants. Il ajoute les matériaux,
textures, notices et prévisualisations publiés, sans modifier leurs octets.
Le volume livré est d’environ **34,9 Mo**, manifeste compris, pour 219 fichiers.
Les ressources sont exploitées par le lecteur `modules/fidelity-r24/models/`.

Les fichiers proviennent de The Models Resource, désormais accessible sur
`models.spriters-resource.com`. Il s’agit d’exports publiés par une communauté,
et non d’un accès direct aux fichiers Capcom ou d’une certification du rendu
pixel pour pixel des jeux. Les conversions décrites dans les notices restent
documentées ; aucun nouveau modèle, rig ou geste n’est généré dans ce lot.

## Jeux, formes et ports conservés séparément

| Ressources | Archives | Vues OBJ | Relation au catalogue |
| --- | --- | --- | --- |
| Resident Evil, PlayStation | 1 | 1 | Zombie à manteau vert, variante candidate de l’entrée générique |
| Resident Evil remake, GameCube | 4 | 5 | Hunter, Lisa Trevor, deux variantes Cerberus et Tyrant T-002 |
| Resident Evil 2, port GameCube | 9 | 13 | Candidats de la continuité originale ; équivalence PS1 non certifiée |
| Resident Evil 3: Nemesis, port GameCube | 7 | 17 | Candidats de la continuité originale ; équivalence PS1 non certifiée |

Les modèles de RE2 comprennent G aux cinq stades, Tyrant et Super Tyrant,
Licker et Evolved Licker, l’alligator et trois membres séparés : deux tentacules
de G5 et le bras de Super Tyrant. Les variantes sont identifiées par les notices
des archives, leurs noms de fichiers, leurs prévisualisations et les références
Evil Resource déjà conservées pour le catalogue.

RE3 comprend les variantes publiées de Nemesis, Hunter β et γ, Drain Deimos,
Brain Sucker, Grave Digger, Sliding Worm et un tentacule indépendant de Nemesis.
La notice précise les différences suivantes :

- `em34` : manteau intact ; `_0` conserve les mains par défaut et `_2` les mains alternatives.
- `em35` : haut du corps brûlé après l’explosion du lance-roquettes.
- `em36` et `em3a` : torse entièrement exposé, exports et conversions de transparence distincts.
- `em37` : tentacule indépendant, sans assemblage inventé au corps.
- Nemesis `em34_1` et `em35_1` : mains alternatives seules à l’origine de l’export, conservées séparément.
- Drain Deimos `_0`/`_2` : maillage de corps par défaut ou alternatif, selon la notice.
- Drain Deimos `_1` : maillage alternatif du corps seul à l’origine de l’export.
- Grave Digger `em30`/`em33` : variantes standard ou blanche ; `_0` conserve aussi la bouche détruite à sa position d’export.

Les « mains alternatives » de Nemesis se superposent à l’origine du fichier.
Cette attribution anatomique vient de la notice ; leur silhouette en jeu n’est
pas certifiée par l’aperçu de ces pièces superposées. Les éléments ne sont ni
déplacés, ni réassemblés pour fabriquer une nouvelle pose. La géométrie de chaîne
détachée des exports Lisa et Cerberus est également conservée.

Les ports GameCube de RE2 et RE3 portent un `candidateUid`, sans `subjectId`.
Leur appartenance à la continuité originale ne prouve pas que leur géométrie,
texture ou palette soit identique aux versions PlayStation de 1998 et 1999.
Les quatre identités du remake GameCube ont un `subjectId` précis ; cela
n’implique pas que leurs cycles de combat soient terminés.

Le cinquième stade G possède une texture que l’auteur de l’archive indique avoir
exportée par Tim Tool puis assemblée par GraphicsMagick. Le PNG publié est
conservé tel quel ; il n’est pas présenté comme un fichier source brut du jeu.

## Armature publiée du Tyrant

L’archive de Tyrant T-002 du remake contient `Tyrant.obj`, `Tyrant.dae`,
`Tyrant_full.fbx` et leurs textures. Le DAE est conservé intact et expose :

| Mesure vérifiée dans le document | Valeur |
| --- | --- |
| Nœuds `JOINT` | 34 |
| Contrôleurs de déformation `skin` | 11 |
| Sommets pondérés | 4 319 |
| Influences référencées | 5 770 |
| Influences maximales par sommet | 3 |
| Canaux d’animation | 0 |
| Clips d’animation | 0 |

L’outil vérifie que les joints référencés existent, que les indices sont valides,
que les poids sont finis et normalisés, et que les sept images référencées sont
des PNG locaux. Les matrices et valeurs numériques restent celles du document.
Le FBX original demeure accessible dans le ZIP, sans duplication supplémentaire
dans le dépôt. Le lecteur peut l’extraire en mémoire, après vérification du ZIP
et de l’empreinte du membre. Son chargement donne aussi 34 noms d’os distincts et 11 maillages
pondérés, avec un corps entier vertical et une armature cohérente. Le format
Collada nécessite une vue adaptée à ses axes d’export ; aucun axe ou sommet du
fichier n’est réécrit pour fabriquer cette présentation.

Le DAE indique un export Blender du 23 octobre 2026 et des os `bone_000` à
`bone_033`. La notice ne documente pas l’origine console de ces os ou de leurs
poids. Cette armature publiée est donc une **référence inspectable**, avec
`sourceRigOriginCertified: false`, et non un rig canonique 1:1 certifié. Aucun
mouvement n’est créé à partir d’elle. Le compteur de rigs de production finalisés
reste nul ; le compteur distinct `publishedRigReferences` vaut un.

## Contrôle et reproduction sans réseau

`docs/R24_VISUAL_IMPORT_REQUEST.json` relie chaque ressource au jeu, à la forme,
à l’archive, aux empreintes et à la référence secondaire. Le manifeste livré est
`modules/fidelity-r24/visual/manifest.json`. Les notices HTML sont stockées en
`.html.txt`, afin de ne pas exécuter leurs scripts sur l’origine de l’application.

Depuis une copie fraîche du dépôt, la vérification reconstruit un cache éphémère
à partir des archives versionnées, puis reproduit chaque fichier :

```sh
python3 scripts/import-visual-models-r24.py \
  --request docs/R24_VISUAL_IMPORT_REQUEST.json \
  --verify-published modules/fidelity-r24/visual
python3 -m unittest discover -s tests -p 'test_visual_models_r24.py' -v
```

**Sept tests passent** : reproduction intégrale, égalité des OBJ/MTL/PNG/DAE avec
les membres des ZIP, refus des preuves altérées, chemins et liens symboliques,
structure du squelette, refus des poids modifiés et images externes, distinction
entre ports, variantes et membres indépendants. Les **38 contrôles navigateur
passent** : chargement des 36 OBJ avec leurs textures, inspection de l’armature
pondérée et absence de requête distante ou d’exception de page. Le rapport et les
captures sont dans `qa-visual-models-r24/`. Cette vérification ne certifie pas une
pose de jeu ni son éclairage. Pour relancer les contrôles :

```sh
CHROME_BIN=/usr/bin/chromium node tests/browser-visual-models-r24.mjs
```

La fidélité complète, les gestes, le gameplay, les silhouettes de combat dans les
deux sens et la provenance primaire des os restent à vérifier. R20-09, R20-10,
G-RENDU et les lots de preuve et de périmètre restent ouverts.
