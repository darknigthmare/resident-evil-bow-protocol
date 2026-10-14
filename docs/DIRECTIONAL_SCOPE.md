# Intégration du rendu directionnel — correctif sur v0.7.3

## État exact

**Le rendu latéral complet demandé n’est pas livré.** Ce changement est une base technique intégrée au vrai projet, à laisser en PR brouillon tant que les vues latérales restent à produire.

Le renderer choisit désormais les dessins gauche/droite par incarnation et les utilise dans le Versus (donc Arcade/Survie/Boss Rush), les Dossiers, les séquences de conclusion, le laboratoire principal et les essais du catalogue. Il respecte la direction décidée par le moteur et le verrou de direction pendant une attaque. Il ne confond pas recul et retournement. Les portraits d’archives sont séparés des images de combat.

**Aucun nouveau sprite de profil n’a été produit ou validé dans cette passe.** La tentative de fabrication d’assets n’a pas fourni de sprites utilisables. Les planches illustratives générées dans la conversation ne sont ni des captures du jeu, ni des ressources intégrées, ni une preuve des compteurs ou de la fidélité 1:1. Elles sont expressément exclues des archives sources et du build.

Le registre initial `data/directional-art.json` ne déclare donc aucune paire achevée. Les 346 corps de combat (115 modes principaux + 231 prototypes isolés) conservent leurs références existantes en attendant remplacement. Les 43 exercices contextuels sont des interfaces abstraites, pas des duels physiques ; ils nécessitent une représentation distincte. La page `directions.html` expose cette limite au lieu d’afficher « 389 sprites terminés ».

## Ce qui est implémenté

- Sélection automatique d’un fichier distinct selon le côté présenté à la caméra.
- Conservation du côté anatomique : pas de miroir automatique sur une créature asymétrique.
- Miroir d’un dessin bilatéral uniquement après validation explicite de ce dessin.
- Crops et points d’ancrage des pieds propres à chaque vue, dimensions non écrasées.
- En cas de vue opposée manquante : référence provisoire conservée, jamais présentée comme un profil terminé.
- Direction de l’acteur prioritaire sur la vitesse de déplacement, et verrou d’attaque prioritaire lors d’un croisement.
- Même résolution dans les six pages utilisant le renderer commun (y compris l’atelier de contrôle).
- Contrôle des chemins locaux, des empreintes SHA-256 et des métadonnées avant build.
- Tests de sélection des deux textures, incluant un test de pixels Canvas natif avec textures de test. Ces textures ne sont pas de nouveaux personnages.

## Ajouter les vrais profils

Pour une incarnation dont les deux dessins sont terminés, ajouter dans `data/directional-art.json` une entrée `records[uid].views.left` et `records[uid].views.right` avec :

- `path` : PNG/WebP réellement présent sous `assets/lateral/` ;
- `facing` : `left` ou `right`, correspondant à la vue dessinée ;
- `projection` : `side` ;
- `reviewed` : `true` seulement après examen de l’image ;
- `width` et `height` : dimensions de l’image ;
- `anchor` : point au sol normalisé, par exemple `[0.5, 1]` ;
- `sha256` : empreinte de cette image ;
- `crop` : facultatif, pour un rectangle d’atlas.

`mirrorReviewed: true` n’est destiné qu’aux dessins réellement bilatéraux et reste refusé sur les profils marqués asymétriques. Un visage frontal, une image tronquée ou un torse trois-quarts ne doit pas être qualifié de profil strict. Les membres hypertrophiés, yeux, armes et équipements latéralisés imposent deux vues anatomiquement cohérentes. La validation du fichier n’est pas une certification du lore.

Puis exécuter :

```
node scripts/compile-directions.mjs --write
npm run verify
npm run build
```

Le jeu utilise alors ces ressources dans tous ses modes sans changer leurs statistiques. Ne pas appliquer une deuxième inversion CSS ou Canvas aux fichiers d’une paire.

## Compatibilité et périmètre

Les définitions de combattants, les capacités, les collisions et les données de campagne ne sont pas modifiées. La version de combat reste 0.7.3 : aucun nouveau contrat de replay n’est créé pour une modification purement graphique. Aucune migration destructive de sauvegarde, fusion automatique ou promotion Vercel n’est effectuée.

Les animations articulées et les sprites définitifs restent ouverts. Ce correctif ne signifie pas que tous les personnages du projet apparaissent déjà réellement de profil.
