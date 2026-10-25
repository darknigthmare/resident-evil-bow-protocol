# R25 — 708 WAV publiés et reliés à seize incarnations

Le [lecteur R25](../modules/fidelity-r25/audio/index.html) rend consultables
**708 fichiers WAV** du paquet communautaire
[Enemies — Resident Evil Revelations, PC / Computer](https://sounds.spriters-resource.com/pc_computer/residentevilrevelations/asset/478834/).
Ils conservent leurs octets, leurs noms, leur cadence et leurs canaux. Les seize
liens aux UID reposent sur les groupes explicitement nommés de l’archive et une
référence du même jeu ; ils ne certifient ni une extraction Capcom brute, ni les
déclencheurs, ni l’exactitude sémantique de chaque nom de fichier.

## Ce qui est conservé

Le ZIP original fait **87 661 655 octets**, SHA-256
`5d53eddc59a22056916ac304219008d1a4267aa032522b06624ac0f2bb1e74ae`.
Il reste entier dans `audio/archives/revelations-enemies.zip`, avec ses 847
membres, dont 819 WAV. La page de publication et le lien exact de téléchargement
restent dans `evidence/source-page.html.txt`. Ce HTML est une pièce inerte,
jamais exécutée.

Dix-sept groupes publiés correspondent à seize UID : Draghignazzo, Farfarello,
Fenrir, Ghiozzo, Globster, Hunter, Malacoda, Ooze et ses variantes Chunk/Pincer/
Tricorne, Rachael Foley (Ooze), Scagdead, Scarmiglione, Sea Creeper et Wall
Blister. Les groupes Malacoda et Malacoda (Final) gardent leurs noms distincts
et renvoient au même sujet ; aucun timing ou déclencheur de phase n’est déduit.
Les variantes ne sont pas réaffectées au Ooze de base ni au Black Fenrir.

Sur les 712 WAV de ces groupes, **quatre placeholders contiennent uniquement
des échantillons PCM nuls**. Ils restent dans le ZIP mais ne sont pas comptés
comme sons consultables. Les 708 autres totalisent **92 147 184 octets** et
**959,542 secondes** de fichiers. Ils sont tous en PCM mono 16 bits à 48 kHz.
La présence d’échantillons non nuls ne prouve pas leur audibilité perçue ni le
sens du son. **Aucune écoute sémantique indépendante n’est annoncée.**

Les groupes Common, Aculeozzo absent du catalogue et Jack Norman dont la forme
n’est pas assez précise restent dans le ZIP sans affectation aux 389 UID. Les
canaux d’ambiance, centre, surrounds et LFE publiés sous forme de fichiers mono
restent séparés : aucun mixage spatial n’est reconstitué. Les codes ENG/JPN sont
les libellés de l’archive, pas une langue confirmée par écoute.

Le support est le port PC / Computer. La publication ne certifie pas l’identité
de ses banques à celles de la version Nintendo 3DS de 2012. Le cas Wall Blister,
signalé ailleurs comme propre aux versions HD, reste explicitement limité à ce
contexte. Aucun fichier n’est découpé, normalisé, rééchantillonné, synthétisé ou
automatiquement attribué au combat.

## Lecture et intégration

La recherche et le filtre de groupe permettent d’examiner les noms publiés. Un
lien `index.html?identity=rerev-sea-creeper` affiche seulement les sons de cette
incarnation. Un UID inconnu est refusé, sans afficher les sons d’une autre
créature. Chaque chargement est borné à quatre Mio et vérifie sa taille et son
SHA-256 avant de créer l’URL audio. Une seule URL audio locale reste vivante.
Un changement de sélection annule la requête précédente ; une réponse tardive
ne remplace pas le nouveau son. Le passage en arrière-plan suspend la lecture.
Il n’y a aucun autoplay ni reprise automatique.

## Validation et reproduction

**Neuf tests Python et sept groupes navigateur réussissent.** Les tests comparent
les 708 WAV et le ZIP aux octets originaux, vérifient les placeholders silencieux,
le refus des mauvais sujets/jeux, fausses certifications, archives altérées,
chemins sortants, liens symboliques, collisions, compression excessive et PCM
inattendu. L’import est reproductible sans modifier les sources conservées.

Le navigateur décode les 708 WAV à une fréquence de contexte explicitement fixée
à 48 kHz et vérifie leurs nombres d’échantillons, canaux et empreintes. Cela évite
de confondre un rééchantillonnage implicite du contexte audio avec une altération
des fichiers. Ces décodages ne sont pas envoyés vers une sortie sonore. Les
parcours 1440/390 px couvrent chargement manuel, lecture/pause/volume, filtrage,
corruption, manifeste invalide et course entre deux sélections. Les captures ont
été inspectées. Les appareils audio et écoutes réelles restent à vérifier.

```sh
python3 -m unittest discover -s tests -p 'test_audio_archive_r25.py' -v
CHROME_BIN=/usr/bin/chromium node tests/browser-audio-r25.mjs
python3 scripts/import-audio-archive-r25.py \
  --archive modules/fidelity-r25/audio/archives/revelations-enemies.zip \
  --page modules/fidelity-r25/audio/evidence/source-page.html.txt
```

L’importeur emploie les empreintes et attributions de `audio/import-request.json`.
Les résultats détaillés sont dans [R25_AUDIO_BROWSER.json](R25_AUDIO_BROWSER.json).
G-AUDIO reste ouvert pour l’écoute indépendante, les banques primaires, les
déclencheurs, le mixage final et les autres incarnations.
