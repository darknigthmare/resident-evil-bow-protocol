# R27 — groupe Zombie de Resident Evil 3 Remake

Le lot ajoute **330 fichiers WAV**, soit **330 contenus distincts par SHA-256**, classés par la publication sous **Zombie / Voices** pour la version PC de Resident Evil 3 Remake. La fiche du même jeu dans le catalogue est `re3r-zombie`. La page affiche 336 éléments ; six sont des dossiers, et seuls les 330 fichiers sont comptés comme sons livrés.

Les fichiers représentent **619,8022916667 secondes** et **59 515 540 octets** : PCM signé 16 bits, mono, 48 kHz. Aucun PCM entièrement nul n’a été trouvé. Les empreintes ne recoupent aucun WAV des lots R24, R25 ou R26. Cette absence de doublon numérique n’établit pas une action ou un locuteur supplémentaire.

La ZIP de publication de **44 047 917 octets** et la page HTML brute sont conservées sans normalisation. Chaque WAV est identique au membre original de l’archive. Le préfixe et les noms `.wem.wav` restent tels que publiés : la chaîne de conversion WEM antérieure à cette publication et les banques brutes Capcom ne sont pas certifiées.

## Consultation et attribution

Ouvrir [le lecteur](../modules/fidelity-r27/audio/index.html), éventuellement avec `?identity=re3r-zombie`. Le chargement vérifie taille et SHA avant de créer une URL audio ; une action explicite reste nécessaire pour lancer la lecture. Une recherche ou une nouvelle sélection annule le chargement précédent et libère son URL Blob. Une identité inconnue, un chemin distant, une empreinte incorrecte ou une certification non supportée est refusé.

Le groupe publié ne distingue pas sûrement les vêtements, variantes de zombie, états, actions, dialogues, langues ou déclencheurs. Aucun fichier n’est affecté automatiquement aux actions de combat. **Zéro écoute sémantique indépendante, banque native ou son final de combat certifié.** Le groupe « Voices » reste un classement de la publication, pas une transcription.

## Reproduction et preuves

```sh
python scripts/import-audio-archives-r27.py --check
python -m unittest discover -s tests -p test_audio_archives_r27.py -v
node tests/browser-audio-r27.mjs
```

Neuf tests Python et sept groupes Chromium réussissent, avec décodage et comptage exact des échantillons des 330 WAV, corruption volontaire, courses de sélection, filtrage d’identité, absence de lecture automatique et parcours à 1440/390 px. Les captures mobiles ont été inspectées. Les rapports sont [R27_AUDIO_TESTS.json](R27_AUDIO_TESTS.json) et [R27_AUDIO_BROWSER.json](R27_AUDIO_BROWSER.json). Le [manifeste](../modules/fidelity-r27/audio/manifest.json) détaille les sources, membres, formats et empreintes.
