# Resident Evil Combat — Production V24

**27 novembre 2026, Europe/Paris.** Base publiée : `246dbb81752c5fa41a55deb3aada3941ac966fec`. Ce lot ajoute **23 PNG natifs : 20 candidats et 3 essais remplacés**, avec références, prompts, empreintes et revues indépendantes. Il complète des états et des orientations ; aucune animation entière ni admission moteur n'est annoncée.

## Consulter le lot

- [Galerie visuelle hors ligne](gallery.html), avec les 23 fichiers et leurs limites.
- [Manifeste consolidé](ASSET_MANIFEST_V24.json), reliant les quatre manifestes auteurs.
- [Progression par domaine](PROGRESS_V24.json) et [file des manquants](WORK_QUEUE_V24.md).
- [Contrôle de livraison](reports/QA_RELEASE_V24.json).

## Production réelle

| Famille | Candidats | Essais remplacés | Périmètre |
|---|---:|---:|---|
| [Personnages](characters/README.md) | 6 | 0 | Helena RE6, tenue promotionnelle de janvier 2012 ; Ada RE4 Remake, Separate Ways 2023, tenue DEFAULT. Trois poses chacune : sélection, confirmation et désélection. |
| [Créatures](creatures/README.md) | 6 | 2 | Kipepeo RE5, Novistador RE4 Remake et Giant Whip Spider Revelations 2 : deux clés de mouvement chacune. |
| [Projectiles](projectiles/README.md) | 5 | 1 | Carreau simple de Leon RE4 Remake : gauche et ascendant. Bouteille Molotov non allumée RE0 : horizontale, verticale et inclinée. |
| [Décors](stages/README.md) | 3 | 0 | Tyrant Room RE HD Remaster 2015 ; Shopping Plaza / Moon’s Donuts RE3 Remake 2020 ; lac Del Lago RE4 Remake 2023. |
| **Total** | **20** | **3** | **23 PNG distincts** |

Les six clés de personnages concernent **deux incarnations déjà présentes**. Les six clés de créatures concernent **trois identités déjà présentes**. Elles ne s'ajoutent pas aux comptes historiques d'identités. Les trois poses de bouteille sont une contribution partielle à `REC_REBECCA_RE0__SP2`. Le carreau simple n'a pas d'action V1 associée et ne remplace ni les Blast Arrows d'Ada ni les flèches de Krauser. **Zéro des 44 actions V1 est clôturé par V24.**

## Fidélité et corrections observées

L'objectif 1:1 reste le critère d'admission. Aucun score de fidélité arbitraire ni certification globale n'est attribué à des images régénérées. Les éditions sont séparées et les éléments reconstruits sont signalés.

- Le premier carreau gauche comportait deux attaches argentées absentes de la référence : la version corrigée les retire. L'essai initial reste archivé.
- Le premier Novistador en pose haute recourbait ses longues extrémités arrière : la correction les rend longues et pointues. Les contours de faible alpha et le raccord à la pose basse restent ouverts. Le premier essai reste archivé.
- Le premier essai d'araignée est conservé avec son remplacement. Le nettoyage tenté ne vaut pas certification des contours.
- Helena désélection regarde vers la droite de l'image malgré la direction demandée. Les chaussures restent plus épaisses que sur le petit visuel promotionnel. Les six poses personnages n'atteignent pas toutes les marges demandées et leurs baselines varient.
- Les nouvelles orientations des objets reconstruisent des surfaces cachées ; la bouteille verticale présente un col et des proportions à reprendre depuis une meilleure vue.
- Les décors conservent des éléments visibles reconnaissables, avec des zones reconstruites : consoles derrière le Tyrant, terrasse cachée par Jill, eau sous le bateau. Les trois images sont **RGB, 1 672 × 941**, aplaties, sans calques parallaxe ni sol de combat validé. Elles ne sont pas des masters UHD.

Les valeurs RGB visibles sous transparence ne prouvent pas un fond opaque. Les rapports mesurent l'alpha et distinguent les pixels transparents du bruit de faible opacité réel. Les PNG n'ont subi aucune retouche de pixels après génération.

## Revue indépendante

| Lot | Preuve de comparaison |
|---|---|
| Personnages | [Six sorties et quatre références inspectées](reports/INDEPENDENT_CHARACTERS_V24.json) |
| Créatures, premier passage | [Sept sorties et trois sources inspectées](reports/INDEPENDENT_CREATURES_V24.json) — état du premier passage conservé |
| Novistador corrigé | [Complément sur le huitième PNG et statut final](reports/INDEPENDENT_CREATURES_CORRECTION_V24.json) |
| Projectiles | [Six sorties et quatre références inspectées](reports/INDEPENDENT_PROJECTILES_V24.json) |
| Décors | [Trois sorties et trois captures natives inspectées](reports/INDEPENDENT_STAGES_V24.json) |

Ces revues ne sont ni un test de rendu navigateur, ni une vérification de jouabilité. Le [validateur de livraison](validate_v24.py) contrôle l'intégrité, le recensement, les liens et les déclarations ; il ne transforme pas ces contrôles techniques en validation artistique.

## Bible et deux extensions

La [bible du combat](../../../docs/combat-bible/README.md), ses [68 sections suivies](../../../docs/combat-bible/INTEGRATION_MATRIX.json), l'[extension 01](../../../docs/combat-bible/EXTENSION_01_APPLICATION.md) et l'[extension 02](../../../docs/combat-bible/EXTENSION_02_APPLICATION.md) sont déjà présentes dans le commit de base V23. Leurs trois fichiers sources sont conservés ; leurs tailles et empreintes ont été [revérifiées à l'identique](reports/BASELINE_INTEGRITY_V24.json). V24 ne les réécrit pas. L'intégration documentaire ne signifie pas que toutes les fonctionnalités décrites sont déjà actives dans le jeu.

## Manquants maintenus ouverts

Les domaines historiques ne sont pas additionnés entre eux : identités, costumes, états, actions et spécifications de décors se recouvrent. La [file de reprise](WORK_QUEUE_V24.md) conserve les besoins de preuves, les reprises V19 et les refus historiques.

Trois cibles de décor restent sans PNG V24 : **Foundry MB4 / Casting Machine**, **Altar 2F à la lanterne** et **Tower of Worship, première phase**. Une carte, une vue partiellement inaccessible ou une géométrie masquée ne suffit pas à reconstruire ces scènes au standard 1:1.

## État CI de la base

Le [rapport CI de base](reports/CI_BASELINE_V24.json) porte sur `246dbb8`, pas sur le futur commit V24 : **25 runs, 18 succès, 6 échecs, 1 annulation**. Les six logs d'échec ont été lus séparément. Leur premier arrêt est `Unknown R34 addition: docs/combat-bible/EXTENSION_01_APPLICATION.md` dans la garde de chemins R34. Les étapes ultérieures non exécutées ne sont pas réputées réussies ; la cause de l'annulation n'est pas attribuée sans preuve. Les gardes, workflows, anciens index et anciens résultats restent inchangés.

## Reproduire les index et contrôles

```bash
python production-archives/rec-media/v24/assemble_v24.py
python production-archives/rec-media/v24/validate_v24.py
```

L'assembleur relit les manifestes auteurs, puis reconstruit uniquement le manifeste global et la galerie HTML. Il ne modifie aucune image. Les reçus `GIT_BLOBS_V24.json` des quatre familles décrivent l'envoi des blobs avant la création du commit commun ; leurs indicateurs `commit_created: false` correspondent à cette étape intermédiaire.
