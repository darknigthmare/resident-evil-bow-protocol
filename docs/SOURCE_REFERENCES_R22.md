# R22 — import de références nommées après revue

`scripts/import-reviewed-references-r22.py` complète l’import automatique R21
sans modifier ses règles. Il traite les images nommées présentes dans des articles
généraux, après une revue explicite de l’image réelle, du jeu, de la forme et du
texte adjacent. L’ordre des titres d’un article ne sert jamais à attribuer un
personnage : certaines images précèdent leur propre titre.

Le lot exécuté comporte **20 références statiques** : 12 images de corps nommés,
5 portraits et 3 scènes. « Corps » ne signifie pas nécessairement « corps complet » :
la composition d’Eveline finale, notamment, reste coupée aux bords dans sa source.
La phase de Jack aux cisailles, dont la preuve précise manque, est exclue du lot.

## Exécution et résultat

Avec Python et Pillow, depuis la racine du dépôt :

```sh
python3 scripts/import-reviewed-references-r22.py \
  --cache-root /workspace/scratch/bow-named-media-r22 \
  --manifest /workspace/scratch/bow-named-media-r22/reviewed-import-request-r22.json
python3 -m unittest discover -s tests -p 'test_reviewed_source_import_r22.py' -v
```

Le dossier par défaut `qa-source-references-r22/` est ignoré par Git. Il contient
un `reference.png` et un `source-reference.json` par UID, ainsi qu’un `manifest.json`
cumulatif de schéma `re.bow.reviewed-source-reference-pack/1`. `entries` expose
les jeux, UID, formes observées, portées `body`/`portrait`/`scene`, notes et limites
visuelles, textes adjacents et empreintes des images/pages consultées. `counts`
distingue `named_body_views`, `portrait_views` et `scene_views`. Les chemins
d’images sont relatifs au dossier du manifeste.

Les PNG conservent exactement leurs octets téléchargés. Les autres formats
statiques pris en charge, JPEG et WebP, sont convertis en PNG seulement si chaque
pixel RGBA décodé et les dimensions restent identiques. Aucune découpe, déformation,
réflexion ou suppression de fond n’est appliquée. Une répétition sur les mêmes
preuves est idempotente ; un fichier existant différent ne peut pas être écrasé.

## Contrat de revue

Une demande utilise le schéma `re.bow.reviewed-source-import/1` et des `entries`
avec `id`, `page_metadata`, `image_metadata` et `curation`. Les deux fichiers de
métadonnées suivent le cache de collecte R21 : URL demandée et effective, état HTTP,
horodatage, chemin relatif, taille et SHA-256 du corps complet. L’image ajoute son
URL `declared_url` réellement présente dans un élément `<img>` de la page, ses
dimensions et `decoded_rgba_sha256`, ainsi que les indicateurs explicites
`decoded_verified: true`, `response_bytes_preserved: true`, `pixels_transformed: false`.

`curation` doit fournir une revue visuelle acceptée, le jeu exact du catalogue,
la forme spécifique observée, un titre et un extrait adjacents réellement présents
près de cette image, une note visuelle, les limites, la portée, ainsi que
`reviewed_page_sha256` et `reviewed_image_sha256`. `phase_ambiguity` doit être
explicitement faux. L’import vérifie ces liaisons sur les fichiers conservés.
Une image générique de couverture, une autre ressource Blogger, un changement
de jeu, une forme incertaine ou des preuves altérées sont refusés.

La seule URL dérivée autorisée est la taille originale publique Blogger `s0`
pour le même identifiant d’image, déclarée par `source_rendition:
blogger-original-size`. Cette requête au fournisseur ne remplace pas l’image
par une création locale et ne prouve pas à elle seule son attribution.

Les sorties restent des références secondaires documentées. Elles ne certifient
ni l’authenticité native officielle, ni une géométrie 1:1, les côtés cachés, un rig,
les mouvements, l’audio ou une intégration au combat. Tous les indicateurs de
finalisation correspondants restent faux. Les notes de revue conservent notamment
les cadrages partiels et les scènes à décor, sans les transformer en sprites complets.

Les sept tests utilisent des pixels synthétiques pour vérifier la conservation,
les liaisons et les refus ; ils ne constituent pas une production de personnages.
