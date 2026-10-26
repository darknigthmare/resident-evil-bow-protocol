# Sons sources R28

Ce lot conserve 1 450 fichiers WAV publiés pour Resident Evil 3 Remake sur PC. Il contient 1 105 contenus distincts par SHA-256 ; 345 fichiers sont des doublons de publication et 50 contenus distincts existent déjà en R24–R27. Le gain est donc de 1 055 contenus distincts absents de ces lots. Aucun son n’est affecté automatiquement à une action du combat.

| Publication | Section | WAV livrés | Attribution |
| --- | --- | ---: | --- |
| [Licker](https://sounds.spriters-resource.com/pc_computer/residentevil3remake/asset/475786/) | Voices | 301 | Sujet Licker (incarnation RE3R) |
| [NE-a Type](https://sounds.spriters-resource.com/pc_computer/residentevil3remake/asset/475787/) | Voices | 1 | Candidats : hôte/parasite non isolés |
| [Nemesis](https://sounds.spriters-resource.com/pc_computer/residentevil3remake/asset/475788/) | Voices | 241 | Candidats : trois formes de Nemesis, phases non décodées |
| [NE-a Type](https://sounds.spriters-resource.com/pc_computer/residentevil3remake/asset/475792/) | Sound Effects | 143 | Candidats : hôte/parasite non isolés |
| [Nemesis](https://sounds.spriters-resource.com/pc_computer/residentevil3remake/asset/475793/) | Sound Effects | 764 | Candidats : trois formes de Nemesis, phases non décodées |

Les 301 fichiers Licker relient le groupe publié à un seul sujet du catalogue. Les 1 149 autres fichiers restent des candidats pour quatre UID. Les dossiers techniques `em9000`, `em9200`, `em9300` et leurs variantes sont conservés ; leurs noms ne suffisent pas à attribuer les effets à une phase de Nemesis. Le groupe NE-a Type ne permet pas de séparer les sons de l’hôte de ceux du parasite isolé.

Les 239 869 298 octets WAV couvrent 2 294,8097 secondes. Les 62 fichiers stéréo restent stéréo ; les quatre fichiers à 44,1 kHz gardent leur fréquence. Aucun rééchantillonnage, nettoyage, normalisation ou montage n’est effectué. Les autres fichiers restent à 48 kHz.

Les cinq ZIP originales totalisent 165 484 725 octets. La plus grande (81 547 052 octets, Nemesis / Sound Effects) est conservée en deux segments de plages binaires contiguës, sans recompression. Reconstitution vérifiée :

```sh
python scripts/reassemble-audio-archive-r28.py --asset 475793 --output /tmp/nemesis-r28-original.zip
```

Le script refuse un fichier de sortie existant et vérifie les segments puis la ZIP complète avant écriture. Le SHA-256 attendu est `a4350cf78ada22e70e540c339e3fbc79eed2a426763f43dfdba96ab6522e9032`.

Le [lecteur local](../modules/fidelity-r28/audio/index.html) propose une sélection par groupe, une recherche et un filtre `?identity=UID` qui conserve les mentions candidates. Une action explicite charge un seul WAV après vérification de taille et de SHA-256 ; une seconde action lance la lecture. Les changements de sélection révoquent l’ancien Blob et annulent les requêtes obsolètes. Les archives partielles restent accessibles via leur descripteur.

Validation exécutée : neuf tests Python et sept groupes navigateur. Tous les 1 450 WAV ont été comparés aux octets des membres ZIP, hachés et décodés avec leur nombre de frames et leur fréquence d’origine. Les contrôles couvrent les canaux, le réassemblage des segments, les substitutions d’incarnation, les chemins dangereux, la corruption, la promotion abusive d’un candidat en forme exacte, les courses entre sélections et le lecteur aux largeurs 1 440 et 320 pixels.

- [Rapport Python](R28_AUDIO_TESTS.json)
- [Rapport navigateur](R28_AUDIO_BROWSER.json)
- [Catalogue, empreintes et limites](../modules/fidelity-r28/audio/manifest.json)
- [Demande d’import reproductible](../modules/fidelity-r28/audio/import-request.json)

L’écoute sémantique indépendante, les déclencheurs, la synchronisation d’animation, la conversion historique WEM→WAV et la comparaison aux banques natives restent ouverts. La lecture technique dans Chromium ne valide pas l’interprétation sémantique ou les appareils audio physiques. Certification 1:1 globale et sons finaux de combat : zéro.
