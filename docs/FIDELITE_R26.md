# Livraison R26

R26 fait avancer les 17 chantiers du classeur et conserve les 389 incarnations du catalogue. Les 23 feuilles de R25 restent présentes à l’octet ; six nouvelles feuilles décrivent les ajouts, les sources et les critères encore ouverts.

Les ajouts sont consultables depuis [Sources et chantiers](../modules/fidelity-r26/index.html) et les Dossiers. Le [classeur R26](BOW_FIDELITE_R26.xlsx) conserve le suivi historique. Les fichiers du moteur, du roster, de l’art et des modules précédents ne sont pas remplacés.

## Ressources ajoutées

- Neuf références visuelles issues de huit archives RE0 GameCube et Outbreak PS2 : cinq UID attribués par la publication, un candidat séparé. Neuf planches dérivées présentent 72 orientations réellement rendues, sans miroir. Ce ne sont ni des sprites originaux ni des sprites de combat finaux.
- Six références pondérées pour Chunk Ooze, Tricorne Ooze et Pincer Ooze : 350 mouvements de corps, deux mouvements d’objets associés, sept poses fixes à clés et six bases sans clés. Les trois archives PC/HD et les clés natives restent intactes. L’attribution des gestes ne repose pas sur leurs noms techniques.
- 1 031 fichiers WAV, correspondant à 646 contenus distincts par SHA-256, de huit publications RE3 Remake pour Zombie Dog, Drain Deimos, Hunter Beta et Hunter Gamma. Les deux fichiers stéréo et les 1 029 mono conservent leurs octets. La section publiée « Voices » ne constitue pas une transcription, une langue vérifiée ou un déclencheur d’action.
- 110 assertions documentaires pour 99 incarnations nouvellement revues, soit 275 revues cumulées. Les 99 sources proviennent des copies conservées en R23 ; il ne s’agit pas de nouvelles captures primaires ni de 99 corroborations indépendantes.

Voir [ressources visuelles](R26_VISUAL.md), [planches](R26_SPRITES.md), [mouvements](R26_MOTION.md), [audio](R26_AUDIO.md) et [citations](R26_CANONICAL.md).

## Fonctions ajoutées

Le lecteur cumulatif conserve la distinction entre corps, objets, variantes et candidats. Les observations peuvent être reprises par un lien qui désigne le modèle, le clip, son instant et les empreintes attendues. Une comparaison avec l’aperçu publié est facultative. Les poses fixes sans durée de lecture restent distinctes des mouvements.

La [restauration isolée](../modules/fidelity-r26/persistence/index.html) prépare une sauvegarde R19 puis applique les clés sélectionnées dans une base IndexedDB propre à cet atelier. Les valeurs et le journal font partie de la même transaction. L’état avant et après peut être exporté ; un retour arrière explicite refuse un état modifié entre-temps. Le stockage du jeu et les services cloud ne sont pas restaurés par cet outil. Voir [contrats et limites](R26_PERSISTENCE.md).

La [recette de matchs](R26_MATCHES.md) ajoute des adversaires distincts, des KO avec vies normales et des reprises après égalité. Son [rapport](R26_MATCHES.json) distingue matchs terminés, reconstructions et tentatives bornées. Une conclusion de simulation ne certifie pas l’animation ou l’anatomie d’un finisher original.

## Reproduction

Depuis la racine du dépôt, avec Python, Pillow, openpyxl et Node 22.16 :

```sh
python scripts/build-model-catalog-r26.py --check
python scripts/build-dossier-source-index-r26.py --check
python scripts/build-canonical-evidence-r26.py --check
python scripts/build-persistence-manifest-r26.py --check
python scripts/build-fidelity-tracking-r26.py --check
python scripts/export-fidelity-progress-r26.py
python scripts/audit-delivery-r26.py --check
node tests/verify-r26-integration.mjs
npm run build
```

Le workflow `source-fidelity-r26.yml` reproduit aussi le classeur dans un autre fichier, compare ses feuilles et ses données de suivi, puis exécute les contrôles de source et de navigateur. Les résultats locaux sont consignés dans [R26_VALIDATION.json](R26_VALIDATION.json). Le [registre de livraison](R26_SOURCE_ADDITIONS.json) liste les fichiers, empreintes et octets conservés.

## Critères toujours ouverts

Les 17 chantiers restent ouverts et la fidélité globale 1:1 certifiée reste à zéro. Les 385 sprites de combat manquants du suivi historique ne sont pas déclarés produits par les planches d’examen. Les paquets et banques Capcom bruts, les gestes attribués par séquences, l’éclairage original, les tailles physiques, toutes les paires de combat et les appareils physiques restent à vérifier. Les publications communautaires conservent leur édition et leur portée.
