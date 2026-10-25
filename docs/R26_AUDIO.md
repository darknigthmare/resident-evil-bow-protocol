# Sons documentés R26

Le [lecteur R26](../modules/fidelity-r26/audio/index.html) ouvre **1 031 fichiers WAV publiés**, dans huit archives de The Sounds Resource consacrées à quatre sujets de **Resident Evil 3 Remake (2020), PC / Computer**. Il conserve les sections *Voices* et *Sound Effects* sans inventer leurs déclencheurs. Les contenus représentent **646 SHA-256 distincts** : les 385 fichiers supplémentaires sont des doublons de contenu sous des noms publiés différents. Ils restent séparés pour conserver les chemins et groupes originaux. Aucun contenu n’a le SHA d’un des 708 WAV R25.

| Sujet publié | UID du catalogue | Voix | Effets | Fichiers publiés |
| --- | --- | ---: | ---: | ---: |
| Zombie Dog | `re3r-zombie-dog` | 70 | 185 | 255 |
| Drain Deimos | `re3r-drain-deimos` | 32 | 184 | 216 |
| Hunter Beta | `re3r-hunter-beta` | 57 | 234 | 291 |
| Hunter Gamma | `re3r-hunter-gamma` | 54 | 215 | 269 |

Les archives originales totalisent **93 482 857 octets** ; leurs WAV extraits, **142 408 098 octets**, soit **1 475,039479 secondes** de fichiers comptés avec leurs doublons publiés. Les **1 029 fichiers mono et deux stéréo** restent PCM16 à 48 kHz, avec leurs canaux, nombres d’échantillons et bornes publiés. Aucun placeholder entièrement nul n’est présent dans ce lot. Les 31 contenus partagés entre plusieurs sujets ne prouvent pas un locuteur ou une action distincte.

Le [manifeste](../modules/fidelity-r26/audio/manifest.json) lie chaque fichier à son SHA-256, son membre ZIP, la page qui liste ce membre, son archive d’origine et une référence du même jeu conservée en R23. Les pages et ZIP sont copiés à l’octet, sans reformater le HTML ni convertir le son. Les noms `.wem.wav` décrivent la publication : les banques WEM brutes et la chaîne de conversion ne sont pas livrées ni certifiées.

L’attribution concerne **le sujet nommé par la publication**. Elle ne certifie ni action, locuteur, langue, phase ni état de gueule ouverte pour le Hunter Gamma du libellé du catalogue. Aucune écoute sémantique indépendante, transcription, normalisation, synthèse, mixage ou affectation automatique au combat n’est revendiquée. `native_bank_certified`, `independent_listening_completed`, `combat_audio_final` et `canonical_fidelity_certified` restent `false` pour tous les fichiers.

Le lecteur demande une action avant de charger, vérifie la longueur et le SHA avant d’exposer un Blob audio, puis laisse l’utilisateur déclencher la lecture. Les liens `?identity=<UID>` affichent uniquement les deux groupes du sujet connu. Changer de sélection annule la requête précédente et libère le Blob ; quitter ou masquer la page arrête la lecture.

Reproduction sans réseau :

```sh
python scripts/import-audio-archives-r26.py --check
python -m unittest discover -s tests -p 'test_audio_archives_r26.py' -v
node tests/browser-audio-r26.mjs
```

Les [neuf tests Python](R26_AUDIO_TESTS.json) vérifient notamment la reconstruction, les octets de tous les membres, les stéréos, les substitutions de sujet/édition/source, la corruption et le refus de certification. Les [sept groupes navigateur](R26_AUDIO_BROWSER.json) passent aux largeurs 1 440 et 390 px : décodage des 1 031 fichiers vers leurs nombres exacts d’échantillons et canaux, lecture manuelle, filtre d’identité, corruption, manifeste hostile et réponse périmée. Ce sont des vérifications numériques et logicielles, sans écoute humaine ni appareil audio physique certifié.
