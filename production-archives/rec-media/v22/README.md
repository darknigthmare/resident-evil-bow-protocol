# Resident Evil Combat — V22

**80 PNG natifs documentés : 77 candidats statiques, 1 étude(s) et 2 essai(s) écarté(s).** 13 demandes refusées n’ont produit aucun PNG. État du 24 novembre 2026 ; continuation de la [PR #24](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/24), head antérieur à V22 `29b004d3ba9d03941e7e56a8f0871760be46a774`.

## Consulter les résultats

- [Galerie filtrable](galerie.html), à ouvrir avec le dossier `assets` à côté.
- [Inventaire complet lisible](inventory/INVENTAIRE_COMPLET_V22_20261124.md).
- [Classeur Excel](inventory/Resident_Evil_Combat_Inventaire_V22_20261124.xlsx).
- [Inventaire structuré](inventory/INVENTAIRE_COMPLET_V22_20261124.json).
- [Manifeste des sorties](ASSET_MANIFEST_V22.json) et [contrôle d’intégrité](reports/INTEGRITY_V22.json).

## Ce que ce lot apporte

| Catégorie | Candidats | Études | Essais |
| --- | --- | --- | --- |
| Décors | 23 | 0 | 2 |
| Créatures | 15 | 0 | 0 |
| Personnages | 5 | 0 | 0 |
| Costumes | 32 | 0 | 0 |
| Projectiles / VFX | 2 | 1 | 0 |

Les masters de scènes complètent 18 entrées runtime et 5 spécifications V1 supplémentaires. Les incarnations et costumes gardent leur édition précise. Les objets de RE0, RE2 remake, RE4 remake, RE5 et Code Veronica ne sont pas substitués les uns aux autres.

## Ce qui reste ouvert

Les listes détaillées couvrent 52 arènes runtime, 24 spécifications de scène V1, 346 UID suivis, 24 fiches de finition, 60 propositions d’extension, 24 tenues de base, 38 variantes de costume ciblées, quatre motifs Fan Design séparés et 44 actions réparties en 16 familles de projectiles/VFX. Ces unités se recoupent : aucun total global de « manquants » ni pourcentage d’achèvement de franchise n’est calculé. Les 32 PNG de costumes comprennent 28 variantes principales et quatre annexes.

Les fichiers sont des candidats de revue. **Zéro asset V22 est certifié 1:1, animé complètement ou admis dans le moteur.** Les décors ont été adaptés à un cadrage latéral ; les calques, les collisions, les zones cachées et la continuité des animations restent à produire ou vérifier. Les sources tronquées, les éditions incertaines et les archives annoncées non récupérées sont explicitement signalées.

Les 61 états de refus historiques B.O.W. et les autres refus documentés sont conservés. Les nouvelles demandes refusées ne sont pas reformulées pour être relancées. Les études et essais restent archivés sans augmenter la couverture candidate.

## Intégrité et historique

Chaque PNG est décodé et vérifié par dimensions, SHA-256 et SHA de blob Git. Les sprites possèdent un alpha utile ; les résidus éventuels sont signalés sans retouche silencieuse. Les sorties natives sont copiées inchangées. Les références tierces sont documentées par URL, sans redistribution de leurs bitmaps.

Les fichiers V21 et antérieurs, le moteur, les gardes et les workflows restent inchangés. La PR demeure en brouillon ; le relevé final de publication documente l’état CI observé. La garde cumulative avait un échec antérieur sur `production-archives/rec-media/CI_CHECKPOINT2_20261120.json` ; cela ne vaut pas validation CI du présent lot.

Les 80 PNG ont été restaurés à l’identique depuis leurs blobs Git après une interruption du calcul. Les rapports et l’inventaire ont été reconstitués depuis les checkpoints et les données de génération conservées ; leurs nouvelles empreintes ne sont pas confondues avec celles des fichiers temporaires antérieurs.

## Reproduire l’assemblage

Exécuter `python production-archives/rec-media/v22/assemble_delivery.py` depuis le dépôt une fois tous les rapports finalisés. Le classeur est produit séparément par `inventory/build_workbook.mjs` avec le runtime `@oai/artifact-tool`. Les scripts ne modifient aucun pixel ni aucun document historique.
