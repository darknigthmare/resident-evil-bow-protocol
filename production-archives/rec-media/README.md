# Resident Evil Combat - publication des lots de production

## Lot V5 du 19 novembre 2026

Cette publication conserve le lot V5 pour revue, sous deux formes complémentaires :

- Archive ZIP originale conservée en trois segments binaires : [partie 1](Resident_Evil_Combat_Generation_V5.zip.part01), [partie 2](Resident_Evil_Combat_Generation_V5.zip.part02), [partie 3](Resident_Evil_Combat_Generation_V5.zip.part03).
- [Contenu décompressé](v5/README.md), dont les 22 fichiers sont identiques octet par octet aux membres de l'archive.
- [Rapport de conservation](V5_PUBLICATION.json), avec dimensions de transfert, empreintes SHA-256 et identifiants Git des fichiers du snapshot.

Les segments sont voisins de `v5/`. Le ZIP n'est inclus ni dans lui-même ni dans sa copie décompressée. La publication part de `main` au commit `12deacf4cf9b7706eba69fecc1c13593d030180b`.

**Le ZIP monolithique n'est pas directement disponible dans cette branche.** Son transfert encodé dépassait la limite de 16 MiB par requête du connecteur. Les trois segments de 10 MiB maximum conservent l'intégralité de ses octets, sans recompression. Le [manifeste des parties](V5_ARCHIVE_PARTS.json) décrit leurs tailles, leur ordre et leurs empreintes, ainsi que celles du ZIP complet.

Depuis la racine du dépôt, reconstituer et vérifier l'archive avec Python standard :

```sh
python3 production-archives/rec-media/reconstruct_v5_archive.py
```

Le [script](reconstruct_v5_archive.py) vérifie le SHA-256 de chaque partie, celui du ZIP reconstitué, ses 22 membres et leurs CRC. Il produit `production-archives/rec-media/Resident_Evil_Combat_Generation_V5.zip` sans écraser un fichier existant différent. L'option `--output CHEMIN` permet de choisir une autre destination. Les 22 fichiers sous `v5/` sont déjà consultables indépendamment de cette reconstruction.

| Contrôle | Résultat à la préparation de la publication |
| --- | --- |
| Taille du ZIP | 26 817 103 octets |
| SHA-256 du ZIP | `40e9cd45a72a85f08e6c78bce4e1b60a02d4af48d2d2dd47ecd52ded69926a7e` |
| Intégrité ZIP | `testzip()` sans erreur ; 22 membres fichiers |
| Copie décompressée | 22 comparaisons de contenu exact réussies |
| Reconstruction des trois parties | ZIP identique au fichier original, SHA-256 et CRC vérifiés |
| Manifeste de contrôle du snapshot | 21 empreintes de `CHECKSUMS_SHA256.txt` vérifiées |
| PNG conservés | 12 : 7 retenus et 5 essais, sans transformation |

Les fichiers du moteur, des catalogues actifs, des workflows, des assertions et des preuves historiques restent hors du périmètre de cette publication. Les archives V3 et V4 complètes ne sont pas ajoutées par ce lot.

## Lire les mentions historiques du snapshot

Les documents sous `v5/` et le ZIP sont figés à leurs octets de création. La phrase « Aucun fichier du moteur, aucune branche et aucune PR n'ont été modifiés pour ce lot V5 » dans le README interne décrit l'état **avant cette publication**. Les mentions de sauvegarde et de disponibilité des fichiers décrivent également ce moment de production.

Cette note extérieure documente la publication ultérieure sans réécrire le snapshot, son manifeste ou ses empreintes. La présence de ces phrases historiques dans `v5/` ne signifie donc pas que les fichiers n'ont pas rejoint une branche de revue.

## Portée artistique et fonctionnelle

Le lot propose un portrait et une pose gauche de Raymond Vester, une pose gauche d'Alcina Dimitrescu, une étude originale de décor pour `re5_060_reaper`, trois plans candidats et un complément de bible pour Moira Burton. Les références initiales des personnages sont textuelles ; les références d'édition employées ensuite sont génératives.

Les candidats ne sont pas certifiés en fidélité visuelle 1:1. Les poses restent statiques ; aucune animation, aucun import moteur et aucune modification des compteurs d'admission R34 ne sont produits par cette publication. Moira reste une proposition d'adaptation documentée, non implémentée, sans image produite.

Les trois plans du décor ont reçu une correction géométrique, avec joint de sol, contours, couverture caméra et intégration encore à vérifier. La cible de six plans maîtres de 7680 × 2160 reste ouverte. Les essais remplacés conservent leur statut et ne doivent pas être choisis par défaut.

## Vérification et limite CI

La vérification de cette publication porte sur les chemins, les liens, les empreintes du ZIP et de ses membres, les identifiants des blobs Git et l'absence de changement hors du répertoire d'archives. Le catalogue PDF de cinq pages a été rendu et inspecté lors de sa création. Ces contrôles ne remplacent pas une recette de jeu.

La garde courante [`verify-current-r34.mjs`](../../scripts/verify-current-r34.mjs) possède une liste fermée d'ajouts et n'admet pas `production-archives/rec-media/`. **La compatibilité avec cette garde reste ouverte.** Elle n'est ni modifiée ni désactivée pour cette publication ; les anciennes assertions et empreintes sont conservées. Cette PR de conservation reste en brouillon pendant la poursuite des lots et l'examen de cette frontière de validation.

Les suites de gameplay, le build complet et les recettes navigateur ne sont pas annoncés comme exécutés pour cet ajout documentaire et média. Les résultats CI doivent être lus sur le commit réel de la PR ; une preuve historique R34 ne certifie pas le présent lot.

Références du périmètre : [consignes des agents](../../AGENTS.md), [guide gamedev](../../docs/GAMEDEV_GUIDANCE.md), [livraison R34](../../docs/R34_DELIVERY.md), [partage des validations R32](../../docs/GAMEDEV_APPLIED_R32.md).
