# Resident Evil Combat - publication des lots de production

Cette branche de la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22) conserve les snapshots V5, V6 et V7 pour revue. Les fichiers figés de chaque lot et leurs archives ne sont pas réécrits lors de leur publication.

## Lot B.O.W. V7 du 19 novembre 2026

Le [snapshot V7](v7/README.md) conserve **six poses gauches candidates après revue**, **trois essais non retenus** et leurs preuves : Fumer WM-002 RE7 Not a Hero, Bandersnatch CODE: Veronica, Iron Maiden RE4 2005, Verdugo RE4 Remake 2023, Soldat Jet Village et Vârcolac Village.

Fumer 02 réduit le défaut de détourage de 01 ; Soldat Jet 02 corrige l’orientation globale trop frontale de 01. Mama Mold 01 reste un essai non retenu ; sa correction 02 a été refusée. Les deux appels refusés du lot sont Molded 01 et Mama Mold 02, sans nouvel appel après refus. Little Crawler et Iron Maiden 2023 restent sans génération, respectivement faute de topologie suffisamment lisible et d’épines entièrement cadrées.

Les [rapports QA](v7/manifests/ASSET_MANIFEST_V7.json) conservent les limites de contours, marges et surfaces cachées. La fidélité 1:1 et l’admission moteur restent fausses ; aucune animation ou intégration de jeu n’est validée. Le [rapport sur Eliminator blanc RE0](v7/docs/REFERENCE_RECOVERY_AFTER_V6_ELIMINATOR.md) est inclus sous forme textuelle ; sa référence reste tenue, sans image produite.

| Conservation V7 | Résultat |
| --- | --- |
| PNG originaux | 9 : 6 candidats et 3 essais ; 7 sujets avec au moins un PNG |
| Fichiers directement consultables | 30 sous `v7/` |
| Taille du ZIP | 11 736 976 octets |
| SHA-256 du ZIP | `6253627cbc7af95ae2251eb37d4788824203784cee7650f10d4781063a802ba8` |
| Intégrité | 30 membres identiques, CRC valides, 29 empreintes internes vérifiées |
| Conservation des entrées gelées | 26 fichiers inchangés ; 9 PNG identiques aux originaux de génération et aux SHA des QA |
| Liens internes du README | 29 résolus |

**Le [ZIP V7 monolithique](Resident_Evil_Combat_Generation_V7.zip) est directement disponible**, sa taille encodée restant sous la limite de transport. Le ZIP est voisin du contenu décompressé et ne s’inclut pas lui-même. Le [rapport de publication V7](V7_PUBLICATION.json) contient les tailles, empreintes et identifiants Git attendus.

Aucun bitmap source, modèle ou téléchargement de référence n’est inclus. Les chemins locaux et `references/` dans les reçus sont des traces de travail documentées, pas des fichiers promis dans l’archive. Les statuts initiaux des reçus sont conservés ; les QA finales et le manifeste V7 définissent les décisions finales. Les futurs éléments de la file de recherche ne sont pas comptés dans les résultats V7.

## Lot B.O.W. V6 du 19 novembre 2026

Le [snapshot V6](v6/README.md) contient **10 poses gauches candidates pour 10 incarnations** et **2 essais remplacés**, soit 12 PNG : Reaper RE5, Regenerador RE4 Remake, Licker RE2 Remake, Ivy RE2 Remake, Verdugo RE4 2005, Popokarimu RE5, Hunter beta RE3 Remake, Drain Deimos RE3 Remake, Cerberus RE1 1996 et Chimera RE1 Remake 2002.

La revue a conduit à deux corrections documentées : déplacement de la lésion de Cerberus sur son épaule droite anatomique et réduction de Chimera à quatre appendices dorsaux fins. Les variantes `02` sont retenues ; les deux variantes `01` restent dans `v6/trials/`, avec leurs prompts et les raisons du remplacement.

Les 24 fichiers du lot sont disponibles directement dans `v6/` : images générées, docs de revue, manifestes, prompts et empreintes. **Les images de référence, modèles, textures et téléchargements V2 sont exclus**, y compris du ZIP. Les documents conservent les URLs et métadonnées de provenance utiles.

| Contrôle V6 | Résultat |
| --- | --- |
| Taille du ZIP original | 16 383 109 octets |
| SHA-256 du ZIP | `c034adb0bace27bd440d49b169cd857a8196f68240f9a835c9eea48023beb659` |
| Intégrité et copie | 24 membres, CRC valides, 24 identités exactes avec le snapshot |
| Empreintes | 23 entrées du fichier de contrôle vérifiées ; 12 SHA de PNG concordants |
| README du snapshot | 21 liens relatifs résolus |
| État artistique et moteur | 10 candidats retenus + 2 essais ; tous les indicateurs de certification 1:1 et d'admission moteur restent `false` |

Le ZIP est conservé sans recompression en [partie 1](Resident_Evil_Combat_Generation_V6.zip.part01) et [partie 2](Resident_Evil_Combat_Generation_V6.zip.part02), chacune sous 10 MiB ou égale à cette limite. **Le ZIP monolithique n'est pas directement disponible dans la branche.** Le [manifeste des parties V6](V6_ARCHIVE_PARTS.json), le [rapport de conservation V6](V6_PUBLICATION.json) et le [script de reconstruction V6](reconstruct_v6_archive.py) permettent de retrouver et contrôler les octets exacts :

```sh
python3 production-archives/rec-media/reconstruct_v6_archive.py
```

Le script vérifie chaque partie, le SHA-256 global, les 24 membres et leurs CRC, sans écraser un fichier existant différent. La reconstruction a été exécutée et comparée octet par octet au ZIP figé avant publication.

### Réserves V6 conservées

**U-8 RE5 et Licker beta RE5 restent `HELD_REFERENCE`** : aucune référence corporelle complète suffisamment qualifiée n'a permis de produire ces deux lignes. Les refus historiques restent conservés, sans nouvelle tentative. La variante blanche d'Eliminator RE0 reste à documenter.

L'objectif est une fidélité 1:1, mais **elle n'est pas certifiée**. Les surfaces cachées, certains profils, proportions et détails sont reconstruits par génération ; les sources communautaires restent identifiées comme telles. Les poses sont statiques, leurs marges n'atteignent pas toutes la cible des prompts, et pivots, échelle, appuis, contacts, collisions, changements de côté et animations restent à vérifier ou intégrer. Aucun miroir logiciel n'a été utilisé. L'audit V2/R34 ne prouve pas l'absence de tout doublon dans les archives V3/V4 indisponibles.

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

## Vérification commune et CI observée

La vérification de cette publication porte sur les chemins, les liens, les empreintes des ZIP et de leurs membres, les identifiants des blobs Git et l'absence de changement hors du répertoire d'archives. Le catalogue PDF V5 de cinq pages a été rendu et inspecté lors de sa création. Ces contrôles ne remplacent pas une recette de jeu.

Sur le commit V5 `a539a93b862fc12738abf7f9045cea96c6da54df`, les 25 workflows automatiques sont terminés : **19 réussis et 6 en échec**. Les logs des workflows QA générale, R25, R26, R28, R32 et R34 confirment tous `AssertionError [ERR_ASSERTION]: Unknown R34 addition: production-archives/rec-media/README.md`, avec code de sortie 1. Les trois jobs navigateur R34 (runtime, galerie et personnages-arène-combat) ont réussi ; son job de contrôle du périmètre a échoué. [Exécution R34 observée](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44555774286).

Sur le commit V6 `4e374e87c240656d99e676bae005af6ae7d04e98`, un relevé distinct du 19 novembre 2026 à 16:33:34 UTC confirme également **25 workflows terminés : 19 succès et 6 échecs**. Les logs des six échecs (QA générale, R25, R26, R28, R32 et R34) ont été lus et confirment la même assertion `Unknown R34 addition: production-archives/rec-media/README.md`, code de sortie 1. Les trois jobs navigateur R34 du head V6 ont réussi. [QA V6](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44560451561), [R34 V6](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44560451793).

Ces résultats appartiennent à V5 et V6. Ils ne sont pas attribués au commit qui publiera V7 ; son état CI doit être lu séparément sur la PR.

La garde courante [`verify-current-r34.mjs`](../../scripts/verify-current-r34.mjs) possède une liste fermée d'ajouts et n'admet pas ce dossier. **La compatibilité avec cette garde reste ouverte.** Elle n'est ni modifiée ni désactivée ; les anciennes assertions et empreintes sont conservées. Les résultats ci-dessus gardent chacun leur commit V5 ou V6 et ne préjugent pas de la CI du nouveau head V7. Cette PR de conservation reste en brouillon, sans fusion.

Les suites de gameplay, le build complet et les recettes navigateur ne sont pas annoncés comme exécutés pour cet ajout documentaire et média. Les résultats CI doivent être lus sur le commit réel de la PR ; une preuve historique R34 ne certifie pas le présent lot.

Références du périmètre : [consignes des agents](../../AGENTS.md), [guide gamedev](../../docs/GAMEDEV_GUIDANCE.md), [livraison R34](../../docs/R34_DELIVERY.md), [partage des validations R32](../../docs/GAMEDEV_APPLIED_R32.md).
