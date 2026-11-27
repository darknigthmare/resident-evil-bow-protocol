# Resident Evil Combat — Production V25

**27 novembre 2026, Europe/Paris.** Suite de la demande de poursuivre les manquants après la publication V24. Base : `226fbba85ef7d9b248974eee8c455ec01cee95d4`.

**8 PNG natifs : 7 candidats et 1 essai remplacé conservé**, soit 12 645 227 octets. Les sept candidats comprennent six clés de menu pour deux costumes déjà présents en V22 et une correction du regard d’Helena V24. Aucun nouveau personnage, nouveau costume ou cycle d’animation complet n’est ajouté au décompte.

## Parcourir les fichiers

- [Galerie V25](gallery.html), [manifeste global](ASSET_MANIFEST_V25.json) et [progression](PROGRESS_V25.json).
- [Contrôle de livraison](reports/QA_V25.json), [références des costumes](characters/inputs.json) et [prompts exécutés](characters/prompts.json).
- [Galerie V24](../v24/gallery.html) et [file de reprise complète](../v24/WORK_QUEUE_V24.md).

## États produits

| Incarnation exacte | Candidats retenus pour revue | Provenance |
|---|---|---|
| Claire Redfield — RE2 Remake 2019, costume **Military** | Sélection ; confirmation avec la main gauche près de la sangle ; désélection corrigée vers la gauche image | Base V22, capture promotionnelle Steam et vue native entière du costume |
| Billy Coen — RE0 HD Remaster 2016, costume **Wolf Force**, Costume Pack 1 | Sélection ; confirmation par contact avec l’oreillette gauche ; désélection vers la gauche image | Base V22, capture Steam et vue native entière ; distinct du costume Prisoner traité en V23 |
| Helena Harper — RE6, tenue promotionnelle de janvier 2012 | Correction de la tête et du regard de la désélection V24 | Cible V24 inchangée et rendu promotionnel officiel Capcom |

Les poses Claire et Billy gardent les mains vides comme leurs bases V22. Les captures sources portent des armes : les nouveaux gestes sont des propositions de menu, pas des images extraites d’une animation officielle. Les costumes sont traités séparément des tenues par défaut.

## Corrections et fidélité

Le premier essai de désélection Claire gardait le regard vers la droite de l’image, contrairement à la consigne. Une correction unique a produit une tête et des yeux dirigés vers la gauche. La [revue complémentaire](reports/INDEPENDENT_CLAIRE_CORRECTION_V25.json) conserve ce constat. Le premier PNG reste livré ; le manifeste global lui donne le statut `superseded_trial` et le relie au candidat corrigé. Le manifeste auteur du premier passage garde son état de production historique.

La [correction Helena](reports/INDEPENDENT_HELENA_V25.json) résout aussi la direction du regard. L’original V24 est conservé sans remplacement automatique. **Les deux corrections ont régénéré des pixels sous le cou malgré la demande locale** : la direction est corrigée, l’invariance stricte du corps n’est pas satisfaite.

La [revue des six poses initiales](reports/INDEPENDENT_CHARACTERS_V25.json) constate des silhouettes entières et des asymétries principales cohérentes : tatouage/holster de Claire à droite anatomique, montre/gourde à gauche ; visière et cinq cylindres principaux de Billy du côté droit, double contenant de hanche droit et poche gauche. Les microdétails des insignes, des motifs, de la peau, des visages et des mains restent à qualifier.

Les six poses initiales ont une variation de ligne basse de **1 pixel dans chaque trio**. Après la correction Claire, les trois candidats retenus ont leurs lignes basses à **1413, 1414 et 1415 pixels**, soit **2 pixels** d’écart. Billy reste à **1447, 1447 et 1448**, soit **1 pixel**. Ces mesures ne constituent pas une validation de pivot ni de raccord temporel.

Les huit sorties sont en **1024 × 1536, RGBA, alpha 0–254**. Les marges verticales demandées restent insuffisantes et des pixels de faible alpha subsistent. Aucun agrandissement ni transformation des pixels n’a été effectué après génération. Aucun rendu navigateur, essai moteur, animation complète ou fidélité canonique 1:1 n’est certifié.

## Traçabilité

Les trois sous-manifestes auteurs sont conservés dans [characters](characters/manifest.json), [helena](helena/manifest.json) et [claire](claire/manifest.json). Ils décrivent aussi le contexte de travail avant publication. Les chemins absolus et indicateurs de cette étape restent de la provenance ; le manifeste global donne les chemins relatifs des fichiers effectivement livrés.

Les captures natives tierces ne sont pas redistribuées : leurs URLs, rôles, dimensions et empreintes sont conservés. Les huit PNG livrés sont les sorties du générateur, copiées octet pour octet. Les reçus de blobs ont été rapprochés des SHA Git locaux avant publication.

L’environnement local s’est interrompu brièvement pendant l’assemblage. Après rétablissement, les huit PNG et les documents originaux étaient présents ; aucune reconstitution de fichier ni nouvelle génération de secours n’a été utilisée. La validation finale porte sur ces originaux rétablis. Le [validateur](validate_v25.py) vérifie l’intégrité et les déclarations, sans remplacer la revue artistique.

## Bible et suite des manquants

La [bible et les deux extensions](../../../docs/combat-bible/README.md) restent intégrées depuis V23, avec leurs trois sources intactes et la [matrice de 68 sections](../../../docs/combat-bible/INTEGRATION_MATRIX.json). V25 ne les modifie pas. Leur présence documentaire ne signifie pas que toutes les fonctionnalités sont implémentées.

Les autres besoins de V24 restent ouverts : vues complémentaires de Foundry MB4, Altar 2F et Tower of Worship, récupération V19, qualification des contours et des accessoires, transitions de sélection, animations de créatures, séquences de projectiles et parallaxe. Les refus historiques conservent leur portée ; ils ne sont pas clôturés par ces nouveaux costumes.

Les lots V24 et V25 totalisent **31 PNG de production**, avec versions de correction et essais conservés. Ce décompte ne représente pas 31 identités ou animations terminées.

## CI et périmètre

Le [suivi du parent V24](reports/CI_PARENT_V25.json) conserve un relevé de 25 runs en cours d’exécution. Le job R34 inspecté s’arrête sur `Unknown R34 addition: docs/combat-bible/EXTENSION_01_APPLICATION.md`. Cette cause n’est attribuée qu’au job effectivement lu ; les autres causes non examinées restent ouvertes. La garde et les anciens fichiers ne sont pas modifiés.

```bash
python production-archives/rec-media/v25/assemble_v25.py
python production-archives/rec-media/v25/validate_v25.py --expected-png 8
```

L’assembleur reconstruit les index et la galerie depuis les sous-manifestes. Les images restent intactes. Toutes les additions de ce lot se trouvent sous `production-archives/rec-media/v25/`.
