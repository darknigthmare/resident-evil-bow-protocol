# Resident Evil Combat — publication des lots de production

## Reprise V23 — 27 novembre 2026

La [bible et ses deux extensions](../../docs/combat-bible/README.md) sont intégrées avec leurs originaux et une matrice de 68 sections. Le [lot V23](v23/README.md) ajoute **11 PNG natifs : 9 clés candidates de sélection/confirmation/désélection et 2 essais remplacés**, ainsi qu’un prototype autonome des droits et slots verrouillés. [Galerie](v23/galerie.html) · [Prototype](v23/prototype/index.html) · [Manifeste](v23/ASSET_MANIFEST_V23.json). Les paragraphes suivants conservent leurs bilans historiques ; ils ne représentent pas un total V23. Aucune animation complète ni nouvelle admission moteur n’est attribuée à ces clés.

Les snapshots **V5 à V11 et V14–V17**, intégrés via la [PR #22 fusionnée](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22), restent figés. La [PR #23](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/23) ajoute **V18** pour revue. Chaque lot conserve ses images, documents et archives d’origine ; les bitmaps de référence et modèles sources restent hors dépôt.

## Nouvelle continuation du 20 novembre 2026 — V18

Le [bilan V18](CONTINUATION_V18_20261120.md) ajoute **12 PNG : 12 candidats statiques et 0 essais pour 6 identités RE6 (2012)**. Les sources auditées couvrent Napad, Whopper, Meset, Iluzija, Ogroman, Bloodshot et Ustanak ; ce dernier reste sans appel et sa ligne `SOURCE_HOLD` n’est pas modifiée.

Le [lot V18](v18/README.md), son [manifeste](v18/manifests/ASSET_MANIFEST_V18.json), le [journal](GENERATION_LEDGER_V18_20261120.json), les [décisions de source](v18/docs/SOURCE_DECISIONS_V18.json) et la [validation](V18_VALIDATION_20261120.json) relient les sorties aux sources, prompts, empreintes et revues. L’[inventaire de 346 UID](CONTINUATION_V18_20261120.json) actualise 6 entrées ; les **340 autres sont identiques à V17**. Les refus historiques restent conservés sans relance de leurs identités.

**Le corpus atteint 133 PNG : 97 candidats visuels et 36 essais.** Il inclut des directions et des décors, pas 133 personnages. Les 43 entrées contextuelles restent séparées ; les 44 PNG V12/V13 annoncés mais non récupérés restent exclus des totaux.

La reprise logique est main `8073338`, le parent de livraison `935f447`. Le [plan initial](v18/docs/INITIAL_WORKPLAN_V18.json) reste figé et le [plan final](v18/docs/WORKPLAN_V18.json) est séparé. La [CI de la base 807333](v18/docs/CI_BASELINE_V18.json) donne **17 succès et 7 échecs sur 24 workflows** : six gardes R34 et un timeout d’installation ffmpeg R23. Cette preuve ne décrit pas le futur head V18.

Les PNG conservent leurs octets ; les vues sont indépendantes, sans miroir. Les détails cachés, animations, fidélité 1:1 et admission moteur restent non certifiés. Aucun runtime, test, garde ou workflow n’est modifié. Les sections suivantes décrivent leurs propres points historiques.

## Nouvelle continuation du 20 novembre 2026 — V17

Le [bilan V17](CONTINUATION_V17_20261120.md) ajoute **12 nouveaux PNG : 8 poses candidates et 4 essais conservés pour 5 identités RE4 original (2005)**. El Gigante reçoit une gauche corrigée ; Armadura noir/or, Colmillos avec appendices dorsaux, J.J. et le soldat au lance-roquettes reçoivent les vues qualifiées décrites dans le [lot V17](v17/README.md).

Le [manifeste](v17/manifests/ASSET_MANIFEST_V17.json), le [journal](GENERATION_LEDGER_V17_20261120.json) et la [validation](V17_VALIDATION_20261120.json) relient les images aux prompts, sources, mesures et revues. L’[inventaire des 346 UID](CONTINUATION_V17_20261120.json) actualise 5 sujets générés et la décision de hold Salvador ; les 340 autres entrées restent identiques à V16.

**Le corpus atteint 121 PNG : 85 candidats visuels et 36 essais.** Il comprend des directions et des décors, pas 121 personnages. Les 44 PNG annoncés V12/V13 restent non récupérés. Les [décisions de source](v17/docs/SOURCE_DECISIONS_V17.json) distinguent la réévaluation de Colmillos, l’Armadura argenté encore incomplet, le marteau tenu faute d’attribution exacte et Salvador sans génération ni nouveau refus propre.

La [CI du parent 1ed251b8](v17/docs/CI_PARENT_1ED251B.json) confirme 19 succès et 6 échecs sur la même garde R34. Ce relevé ne décrit pas le futur commit V17. La fidélité 1:1, l’animation et l’admission moteur restent non certifiées ; les snapshots, refus historiques et runtime sont conservés. Les sections suivantes décrivent leurs propres points historiques.

## Nouvelle continuation du 20 novembre 2026 — V16

Le [bilan V16](CONTINUATION_V16_20261120.md) ajoute **11 nouveaux PNG : 8 poses candidates et 3 essais conservés, pour 5 identités RE5**. Executioner obtient une droite avec la prise de hache corrigée ; Chainsaw Majini obtient une gauche avec ses asymétries préservées ; Giant Majini, Adjule sombre à tête non scindée et Licker β sans langue déployée obtiennent chacun une paire gauche/droite.

Le [lot V16](v16/README.md), son [manifeste](v16/manifests/ASSET_MANIFEST_V16.json), le [journal des appels](GENERATION_LEDGER_V16_20261120.json) et le [contrôle d’intégrité](V16_VALIDATION_20261120.json) conservent les sources, prompts, revues et empreintes. Les cinq entrées concernées sont actualisées dans l’[inventaire de 346 identités](CONTINUATION_V16_20261120.json) ; les 341 autres restent identiques au point précédent.

**Le corpus atteint 109 PNG : 77 candidats visuels et 32 essais.** Ce compte comprend des poses opposées et les décors V5, pas 109 personnages. Les 44 PNG annoncés pour V12/V13 restent non récupérés. Les [décisions de source](v16/docs/SOURCE_DECISIONS_V16.json) expliquent pourquoi Sweeper, Moth, Bat, Eliminator blanc et Gatling gauche restent en attente. Big Man possède déjà ses deux directions ; aucun doublon n’a été généré.

La [CI du parent 6599f75](v16/docs/CI_PARENT_6599F75.json) confirme 19 workflows réussis et six échecs sur la même garde R34 refusant le dossier d’archives. Les étapes aval sautées ne sont pas déclarées validées. Les octets des snapshots antérieurs, les refus historiques, le runtime et les gardes restent inchangés. Les sections suivantes décrivent leurs propres points historiques.

## Reprise du 20 novembre 2026 — V14 et V15

Le [nouveau bilan](CONTINUATION_20261120.md) et son [inventaire structuré de 346 identités](CONTINUATION_20261120.json) ajoutent **16 PNG V14–V15 : 13 poses candidates et 3 essais conservés**. Trois PNG V14 étaient déjà publiés au point de reprise ; cette continuation ajoute donc **13 PNG à la PR**, dont 10 nouvellement générés et 3 récupérés parmi les sorties antérieures.

| Lot | PNG | Candidats | Essais | Contenu |
| --- | ---: | ---: | ---: | --- |
| [V14](v14/README.md) | 14 | 11 | 3 | Jill Battle Suit, deux Bella Sisters corrigées, Leader Zealot, Castle Ganado et Yawn gauche |
| [V15](v15/README.md) | 2 | 2 | 0 | Hunter Gamma Outbreak 2003, vues gauche et droite |

Les prises de tronçonneuse des Bella sont corrigées dans des fichiers distincts ; leurs trois essais restent conservés. Le refus de Yawn droite est documenté sans image et sans nouvel appel sur ce sujet. Les 44 PNG historiquement annoncés pour V12/V13 restent non récupérés et exclus du décompte.

Le [journal de génération](GENERATION_LEDGER_20261120.json) et le [contrôle d'intégrité V14–V15](V14_V15_VALIDATION_20261120.json) conservent les références, empreintes et décisions. Les [prochaines recherches](v15/docs/NEXT_SOURCE_TARGETS.json) restent ouvertes. Les **98 PNG archivés** au total représentent **69 candidats visuels et 29 essais**, avec des poses opposées et des décors V5 ; ce ne sont pas 98 personnages.

Les médias restent des poses générées statiques. La fidélité globale 1:1, les animations et l'admission moteur ne sont pas certifiées. La [preuve CI du checkpoint 2](CI_CHECKPOINT2_20261120.json) confirme que la garde R34 rejette le bilan historique V5–V11 avant les autres suites ; elle n'est pas une recette réussie du nouveau contenu. Les gardes et le runtime restent inchangés.

Les sections suivantes conservent l'historique des lots V5–V11.

## Ajout commun des lots B.O.W. V8 à V11

Les quatre lots ajoutent **49 PNG : 33 candidats visuels et 16 essais conservés**. Parmi les candidats, 31 sont des poses gauches de V8 à V10 ; les deux candidats V11 sont des vues droites antérieures aux refus ultérieurs de leurs demandes gauches. Les 57 appels ont produit 49 images et 8 refus. Les huit sujets tenus sans appel restent distincts de Gatling Majini, tenu après trois essais réussis mais non qualifiés.

| Lot | PNG | Candidats | Essais | Appels | Refus | Tenus sans appel |
|---|---:|---:|---:|---:|---:|---:|
| [V8](v8/README.md) | 17 | 9 gauches | 8 | 20 | 3 | 1 |
| [V9](v9/README.md) | 13 | 9 gauches | 4 | 14 | 1 | 4 |
| [V10](v10/README.md) | 15 | 13 gauches | 2 | 15 | 0 | 1 |
| [V11](v11/README.md) | 4 | 2 droits | 2 | 8 | 4 | 2 |

Le [bilan cumulatif](CONTINUATION_20261119.md) et sa [version structurée](CONTINUATION_20261119.json) rattachent ces résultats à la file des 42 références et aux six anciens essais examinés. Une image présente dans un dossier ne suffit pas à la déclarer retenue : les manifestes finaux et les QA indépendantes portent les décisions.

### Corrections et limites maintenues

Les revues ont notamment corrigé le compte des membres de Flying Bug, la main supplémentaire de Giant Bat, les pattes de Wasp, et la latéralité de Garmr et de Mkono. Les sorties remplacées restent dans `trials/`. Les prises de l’arme de Gatling Majini n’ont pas atteint une lecture conforme après trois essais ; aucune de ces trois images n’est retenue.

Lucas et Mkono V11 conservent chacun un candidat droit créé et revu **avant** le refus de leur appel gauche. Ces refus ne sont pas décrits comme des images produites, et aucun nouvel appel sur ces sujets ne les suit. Les refus, sources tenues et limites d’anatomie sont conservés dans les registres propres à chaque lot.

La fidélité 1:1 demeure un objectif, sans certification. Les côtés cachés, microtextures et certains détails de perspective sont reconstruits. Les marges ne sont pas toutes généreuses et des fibres ou résidus de faible alpha subsistent ; les PNG n’ont pas été retouchés pour masquer ces limites. Aucun pivot, contact, collision, animation ou import moteur n’est admis par ce lot. Les indicateurs `canonical_one_to_one_certified` et `engine_admitted` restent `false`.

### Archives V8 à V11

Les fichiers extraits restent directement consultables sous `v8/`, `v9/`, `v10/` et `v11/`. Le ZIP d’origine est conservé en parallèle. Pour V8, V9 et V10, les segments binaires de 10 MiB maximum reconstituent les octets exacts du ZIP sans recompression ; ces trois ZIP monolithiques ne sont pas directement présents dans Git.

| Lot | Octets du ZIP | Membres / checksums | Conservation de l’archive |
|---|---:|---:|---|
| V8 | 21 953 833 | 29 / 28 | [partie 1](Resident_Evil_Combat_Generation_V8.zip.part01) · [partie 2](Resident_Evil_Combat_Generation_V8.zip.part02) · [partie 3](Resident_Evil_Combat_Generation_V8.zip.part03) · [manifeste](V8_ARCHIVE_PARTS.json) · [reconstruction](reconstruct_v8_archive.py) |
| V9 | 13 134 434 | 34 / 33 | [partie 1](Resident_Evil_Combat_Generation_V9.zip.part01) · [partie 2](Resident_Evil_Combat_Generation_V9.zip.part02) · [manifeste](V9_ARCHIVE_PARTS.json) · [reconstruction](reconstruct_v9_archive.py) |
| V10 | 19 691 077 | 34 / 33 | [partie 1](Resident_Evil_Combat_Generation_V10.zip.part01) · [partie 2](Resident_Evil_Combat_Generation_V10.zip.part02) · [manifeste](V10_ARCHIVE_PARTS.json) · [reconstruction](reconstruct_v10_archive.py) |
| V11 | 6 585 221 | 20 / 19 | [ZIP direct](Resident_Evil_Combat_Generation_V11.zip) |

Le ZIP V9 conserve son dossier racine `resident_evil_combat_v9/`. Les mêmes fichiers sont publiés sous `v9/` ; les noms de membres et les octets de l’archive restent inchangés. Les autres trois ZIP contiennent leurs fichiers directement à la racine. Aucun ZIP ne s’inclut lui-même.

```sh
python3 production-archives/rec-media/reconstruct_v8_archive.py
python3 production-archives/rec-media/reconstruct_v9_archive.py
python3 production-archives/rec-media/reconstruct_v10_archive.py
```

Les scripts utilisent uniquement Python standard. Ils vérifient l’ordre, la taille et le SHA256 de chaque segment, le SHA256 global, le nombre de membres et leurs CRC. Ils refusent d’écraser un fichier existant différent. Les reconstructions ont été exécutées et comparées octet pour octet aux archives figées.

Les rapports [V8](V8_PUBLICATION.json), [V9](V9_PUBLICATION.json), [V10](V10_PUBLICATION.json), [V11](V11_PUBLICATION.json) et le [rapport commun](V8_V11_PUBLICATION.json) donnent les empreintes et la correspondance avec les fichiers de revue. Les chemins locaux présents dans les anciens reçus sont des traces de travail, pas des bitmaps promis dans Git.

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

## Portée artistique et fonctionnelle du lot V5

Le lot propose un portrait et une pose gauche de Raymond Vester, une pose gauche d'Alcina Dimitrescu, une étude originale de décor pour `re5_060_reaper`, trois plans candidats et un complément de bible pour Moira Burton. Les références initiales des personnages sont textuelles ; les références d'édition employées ensuite sont génératives.

Les candidats ne sont pas certifiés en fidélité visuelle 1:1. Les poses restent statiques ; aucune animation, aucun import moteur et aucune modification des compteurs d'admission R34 ne sont produits par cette publication. Moira reste une proposition d'adaptation documentée, non implémentée, sans image produite.

Les trois plans du décor ont reçu une correction géométrique, avec joint de sol, contours, couverture caméra et intégration encore à vérifier. La cible de six plans maîtres de 7680 × 2160 reste ouverte. Les essais remplacés conservent leur statut et ne doivent pas être choisis par défaut.

## Vérification commune et CI observée

La conservation est contrôlée par les SHA256 des fichiers et archives, les CRC ZIP, les empreintes internes, les identifiants Git des blobs et le périmètre du diff. Les PNG sont identiques aux sorties originales, sans miroir logiciel ni retouche. Les anciens snapshots V5/V6/V7 et leurs archives restent protégés. Cette vérification documentaire ne remplace pas une recette de jeu.

Les résultats CI ci-dessous ont chacun été lus sur leur propre commit :

| Commit publié | Workflows achevés | Succès | Échecs | Exécution R34 |
|---|---:|---:|---:|---|
| V5 `a539a93b862fc12738abf7f9045cea96c6da54df` | 25 | 19 | 6 | [R34 V5](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44555774286) |
| V6 `4e374e87c240656d99e676bae005af6ae7d04e98` | 25 | 19 | 6 | [R34 V6](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44560451793) |
| V7 `67ad2430f17c40e64686f32918cc20fe3b43f7af` | 25 | 19 | 6 | [R34 V7](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44569070097) |

Pour chacun de ces commits, les logs des six échecs — QA générale, R25, R26, R28, R32 et R34 — confirment `AssertionError [ERR_ASSERTION]: Unknown R34 addition: production-archives/rec-media/README.md`, avec code de sortie 1. Les trois parcours navigateur R34 ont réussi. Le relevé final V7 est distinct des deux relevés antérieurs.

Ces résultats ne sont pas attribués au nouveau commit qui ajoute V8 à V11. Son état exact doit être consulté sur la PR et son propre SHA ; il peut être encore en cours au moment de la publication.

La garde [`verify-current-r34.mjs`](../../scripts/verify-current-r34.mjs) utilise une liste fermée d’ajouts qui n’admet pas ce dossier. **La compatibilité avec cette garde reste ouverte.** Aucune garde, assertion, empreinte historique, configuration de workflow ou partie du moteur n’est modifiée pour l’assouplir. La PR reste en brouillon, sans fusion.

Références du périmètre : [consignes des agents](../../AGENTS.md), [guide gamedev](../../docs/GAMEDEV_GUIDANCE.md), [livraison R34](../../docs/R34_DELIVERY.md), [partage des validations R32](../../docs/GAMEDEV_APPLIED_R32.md).
