# R27 — Ooze, scènes natives et archive exacte segmentée

Le [lecteur R27 Ooze](../modules/fidelity-r27/motion/index.html) ajoute un sujet de Revelations, avec le corps `em1000` et son objet associé `om120a` distinct. La publication est attribuée à l’édition PC/HD de 2013 ; elle ne certifie pas les géométries ou mouvements de la version 3DS de 2012.

Les fichiers ajoutés comportent 117 mouvements corporels et un mouvement d’objet, deux poses fixes à clés et deux bases sans clés. Les 120 scènes à clés sont livrées directement en FBX, avec les octets originaux de chaque membre de ZIP. Les temps natifs, pré-clés négatives, poids et coordonnées sont conservés. Aucun geste n’est attribué à partir des noms BA/DM.

La [publication du modèle](https://models.spriters-resource.com/pc_computer/residentevilrevelations/asset/461159/) et la [fiche Ooze](https://www.evilresource.com/resident-evil-revelations/enemies/ooze) sont conservées en copies gzip avec empreintes. Les corps, scènes et textures sont décrits dans le [manifeste](../modules/fidelity-r27/motion/manifest.json).

La ZIP originale fait 136 688 510 octets, SHA-256 `e1ab5bfcc9275554fbf0e2db6e33193e8f04e9de7b5a2e9fc176c2589a344d3a`. Elle dépasse la limite individuelle de GitHub. Elle est donc conservée comme trois plages brutes consécutives de 48 MiB maximum, sans décompression ni recompression. Le descripteur indique ordre, décalages, tailles et empreintes. Le réassemblage utilise un tampon de 1 MiB et refuse un fichier de sortie déjà présent, des parties modifiées ou mal ordonnées et les chemins extérieurs.

```sh
python scripts/reassemble-motion-archive-r27.py --output /tmp/ooze-original.zip
python scripts/import-rigged-motion-r27.py --check --archive /tmp/ooze-original.zip
python scripts/build-motion-catalog-r27.py --check
```

Sans archive locale, l’importateur peut aussi reconstruire temporairement les trois segments avant son contrôle. Le lecteur charge les scènes directes, bornées chacune à moins de 12 MiB ; il n’assemble pas la ZIP de 136 MB dans le navigateur et ne relève aucun plafond d’archive existant. Les trois liens de téléchargement restent explicitement étiquetés comme segments.

Huit tests Python vérifient notamment le réassemblage à l’octet, les 120 scènes et deux bases exactes, la reproduction de l’import, l’intégrité et les refus. Les preuves de matières couvrent 1 204 correspondances de topologie et UV. Les 120 contrôles Node appliquent les clés aux cibles originales et vérifient tous les sommets pondérés à cinq instants ; 118 fichiers déforment effectivement la géométrie après zéro, deux restent fixes.

Cinq groupes Chromium décodent les 120 fichiers à clés et leurs textures, éprouvent les poses de durée nulle, les liens à empreinte, la corruption, le repli sans WebGL et le clavier à 320 pixels avec texte agrandi. Aucun segment ZIP n’est demandé pendant ces parcours. Les captures du corps source et de la version étroite ont été inspectées.

Voir [preuves de livraison](R27_MOTION_EVIDENCE.json), [déformations natives](R27_MOTION_SKELETON_TESTS.json) et [recette navigateur](R27_MOTION_BROWSER.json). Les exports communautaires et le rendu logiciel cloud ne certifient ni les paquets Capcom bruts, ni l’éclairage du jeu, ni l’attribution finale des actions, ni des sprites de combat terminés.
