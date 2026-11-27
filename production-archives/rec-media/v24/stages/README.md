# Resident Evil Combat — Décors V24

## État du lot

**Trois plaques de décor candidates ont été produites et inspectées.** Elles apportent des vues précises à trois besoins `SOURCE_HOLD` de l’inventaire V22. Elles restent en revue de fidélité : une image générée à partir d’une capture ne certifie ni la géométrie cachée, ni une arène complète, ni la correspondance canonique 1:1.

Les fichiers sont des PNG opaques RGB de **1 672 × 941 pixels**, conservés exactement tels que fournis par ImageGen. Ils ne constituent pas des masters UHD 3 840 × 2 160. Aucun agrandissement, découpage de calques ou traitement des pixels n’a été effectué après génération.

| Plaque produite | Édition et périmètre | Besoin V22 | Réserve principale |
| --- | --- | --- | --- |
| Tyrant Room | Resident Evil HD Remaster, 2015 — laboratoire Arklay, caméra basse oblique | `spencer_lab` | Consoles et portions de sol derrière les personnages reconstituées |
| Moon’s Donuts | Resident Evil 3 Remake, 2020 — Shopping Plaza, face à l’entrée | `raccoon_street` | Café gauche largement occulté dans la capture ; mobilier reconstruit |
| Lac Del Lago | Resident Evil 4 Remake, 2023, PC — berge montagneuse au crépuscule | `village_lake_2023` | Eau sous le bateau et remous reconstruits ; aucune surface terrestre de combat |

Les trois PNG se trouvent dans `assets/`. Leurs chemins, dimensions, tailles, SHA256 et SHA Git sont consignés dans `manifest.json`. Le total des PNG est de **7 002 285 octets**.

## Périmètre et fidélité

### Tyrant Room — HD Remaster

La [capture native publiée par Adventure Gamers](https://adventuregamers.com/walkthroughs/resident-evil-hd-remaster) fixe la caméra, les cuves cyan à droite, le mur technique gauche, les consoles et le sol réfléchissant. Le Tyrant debout et la figure humaine arrière ont été retirés. Les silhouettes statiques confinées dans les cuves appartiennent au décor visible de référence et restent présentes.

Cette proposition résout le choix de vue pour **Tyrant Room seulement**. Elle ne représente pas une combinaison de la salle du Tyrant, d’un puits technique et d’une autre passerelle du laboratoire. Les consoles cachées par le Tyrant, leurs écrans et le détail du sol nécessitent une seconde capture avant validation. La perspective oblique doit également être évaluée pour la lisibilité de deux combattants.

### Shopping Plaza — Moon’s Donuts

La [capture native de la critique GamesRadar](https://www.gamesradar.com/resident-evil-3-remake-review/) montre la façade de Moon’s Donuts, sa porte turquoise, les néons, les parasols, le pavage et les marches. Elle correspond à **Shopping Plaza**, et non au tronçon Business Street envisagé au début de la recherche.

Le retrait de Jill, de son arme, du flash et des ennemis a libéré l’image. Toutefois, Jill masquait une grande partie du côté gauche. Les tables, sièges et garde-corps reconstruits dans cette zone restent hypothétiques. Les affiches, inscriptions fines, accessoires et reflets ont également été régénérés. Le maintien des grands repères ne vaut donc pas validation 1:1 de tous les détails.

### Lac Del Lago — remake 2023

La [capture PC publiée par Shacknews](https://www.shacknews.com/article/134730/resident-evil-4-pc-impressions-now-thats-a-weapon) documente la berge boisée, les crêtes, la brume et la lumière rose-violette du lac. Le master conserve cette direction de caméra. Leon, le bateau, le harpon et le HUD ont été retirés ; les fortes vagues d’action ont été remplacées par des rides d’eau.

Le premier plan est donc une reconstruction de surface aquatique. Aucun quai, pont, sol ou plateforme de combat n’a été ajouté. L’emploi dans Resident Evil Combat demande encore de définir et valider un dispositif de combat compatible avec ce lieu. Cette plaque ne livre pas ce dispositif.

## Cibles laissées ouvertes

| Cible | Éléments acquis | Pourquoi aucun master n’a été généré | Preuve suivante attendue |
| --- | --- | --- | --- |
| Foundry MB4 / Casting Machine — Village 2021 | Plan de salle et gros plan natif de la machine | Le gros plan mesure 416 × 206 et masque le centre avec l’objet d’inventaire ; les autres images inspectées montrent l’accès ou une autre grosse mécanique | Vue large de la machine, du sol, des paillasses et des accès, puis angle complémentaire |
| Altar 2F, extrémité est à la balance — RE7 2017 | Plan et guides concordants sur le mécanisme à lanterne | Les captures pertinentes ont renvoyé des erreurs HTTP 403 ; aucune vue locale de la pièce n’est qualifiée | Captures natives de la balance, de la porte et du côté des commodes |
| Tower of Worship, passage extérieur — Village 2021 | Fenêtres gothiques, parapet et montagnes visibles sur plusieurs captures | Le boss et l’arme masquent environ la moitié centrale de la meilleure vue ; les autres angles ne révèlent pas cette portion | Vue sans occultation ou angle complémentaire couvrant précisément le même passage |

Les refus d’accès et les références visuellement inadéquates sont enregistrés dans `SOURCE_INDEX_V24.json`. Aucun contournement n’a été tenté. Le quatrième prompt envisagé pour Tower of Worship n’a pas été exécuté ; aucun quatrième PNG n’est livré.

## Fichiers de contrôle

- `manifest.json` : les trois assets, les trois cibles ouvertes et les conditions de validation restantes.
- `SOURCE_INDEX_V24.json` : URLs, éditions, observations, limites, dimensions et empreintes des références effectivement téléchargées. Les bitmaps tiers sont conservés hors dépôt.
- `QA_STAGES_V24.json` : inspection des sources et sorties, vérification des métadonnées, zones reconstruites et statut de revue.
- `prompts/executed_prompts.json` : les trois prompts réellement exécutés, avec leur référence unique. Les fichiers `initial_prompts.json` et `lake_prompt.json` conservent les lots de préparation correspondants.
- `GIT_BLOBS_V24.json` : trois blobs créés à partir des données PNG originales d’ImageGen ; SHA retournés comparés aux SHA Git locaux. Aucun tree, commit ou ref n’a été créé ou modifié par le producteur des décors.

La vérification technique confirme l’égalité byte à byte entre chaque PNG livré et son original ImageGen, ainsi que l’absence de canal alpha. Il s’agit de plaques opaques et aplaties : **aucune parallaxe complète, collision, animation ou admission moteur** n’est livrée. La revue comparative indépendante reste à faire par la consolidation V24.

L’inventaire V22 demeure la base des besoins. L’historique V3/V4 incomplet empêche de certifier une absence dans toutes les productions antérieures ; ce lot ne prétend pas fermer tous les décors manquants du projet.
