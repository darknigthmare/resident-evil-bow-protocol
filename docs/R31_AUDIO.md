# R31 — Écoute et attribution des sons

Le [lecteur R31](../modules/fidelity-r31/audio/index.html) ajoute 218 fichiers audio publiés dans quatre archives : Dr. Salvador / Bella Sisters (17 OGG, port PC de Resident Evil 4 publié comme 2007), Alexander Ashford (5 WAV), Alexia Ashford (25 WAV) et Steve Burnside (171 WAV), ces trois derniers groupes venant de CODE: Veronica X sur PlayStation 2.

Les 218 empreintes de fichiers sont nouvelles par rapport aux bibliothèques R24 à R28. Elles produisent 216 empreintes PCM de mesure distinctes : deux paires de fichiers différents contiennent les mêmes échantillons décodés. Les fichiers et doublons de publication sont conservés exactement. Ces nombres ne mesurent pas des gestes ou des voix sémantiquement distincts.

Les groupes fournissent des références candidates pour sept identités du catalogue. Le titre partagé Dr. Salvador / Bella Sisters ne permet pas de répartir chaque fichier entre les deux ennemis. Le groupe Alexia ne permet pas de choisir entre ses trois formes, et les voix de Steve ne sont pas automatiquement affectées à son incarnation mutée. La correspondance Alexander Ashford / Nosferatu est documentée par une page du même jeu ; elle ne certifie pas la phase de chaque enregistrement.

Les publications PC (2007) et CODE: Veronica X sur PS2 restent distinctes des cibles GameCube (2005) et Dreamcast (2000). Aucune équivalence entre ces éditions, écoute sémantique indépendante, action, langue précise ou banque Capcom brute n’est certifiée. Aucun de ces sons n’est affecté automatiquement au combat.

Le lecteur accepte les liens par incarnation `?id=<UID>` et par extrait `?clip=<clipId>`. Il ne demande aucun fichier son à l’ouverture. « CHARGER L’EXTRAIT » vérifie les octets puis prépare le lecteur ; la lecture reste une action explicite dans ses commandes. Une seule ressource audio reste préparée à la fois. Elle est libérée au changement d’extrait et à la sortie de page ; les requêtes en cours sont annulées.

Les notes d’écoute personnelles contiennent une incarnation envisagée, un locuteur, une phase, un geste et une référence de séquence. Leur export lie chaque note à l’empreinte de la bibliothèque et à celle de l’extrait. Un import incompatible est rejeté avant de remplacer les notes en mémoire. Les notes restent déclarées personnelles et ne changent jamais les attributions du jeu. Le lecteur n’écrit pas dans les sauvegardes ou le stockage du jeu.

Dix pages de jeux sur The Sounds Resource ont également été conservées avec un résultat HTTP 200 et zéro ressource audio annoncée, notamment RE0, le remake GameCube, RE5, RE6, RE7 et Revelations 2. Il s’agit de l’état de ces publications, sans prétendre à l’absence de sons dans les jeux eux-mêmes.

Les [manifestes](../modules/fidelity-r31/audio/manifest.json) relient les fichiers audio aux membres des ZIP, aux pages des groupes et aux sept références d’identité. Les octets WAV et OGG restent inchangés. La conversion Vorbis vers PCM sert uniquement aux mesures de validation et n’est pas distribuée comme un nouveau fichier source.

## Recette

```sh
python3 scripts/import-audio-sources-r31.py --check
python3 tests/test_audio_sources_r31.py
node tests/verify-audio-listening-r31.mjs
node tests/browser-audio-r31.mjs
```

Les tests de décodage Vorbis utilisent `ffmpeg` et `ffprobe`. Ils vérifient les formats, étendues et mesures ; les octets de publication restent la référence de conservation. Les rapports distinguent 12 tests Python, huit groupes Node et neuf groupes navigateur. Les vérifications de navigateur couvrent les deux formats réels, l’absence d’autoplay, les notes exportées/importées, la corruption, les annulations et la largeur de 320 pixels avec le texte doublé. Elles ne constituent pas une écoute humaine indépendante.

Le chantier G-AUDIO reste ouvert pour l’écoute indépendante, la détermination de chaque phase et geste dans les séquences originales, les éditions cibles et le mixage final du combat.
