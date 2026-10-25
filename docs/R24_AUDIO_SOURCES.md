# R24 — 57 extraits publiés, conservés sans modification

Le chantier G-AUDIO dispose de **57 MP3 réels**, environ **118,91 secondes**,
consultables dans `modules/fidelity-r24/audio/index.html`. Ils proviennent du
[soundboard des Ganados de Resident Evil 4](https://github.com/juliani91/resident-evil-4-soundboard),
publication communautaire datée de 2016, figée au commit
`a218d8345cf6bc52a0bd40b4cee6b616b546680d`.

Cette livraison prouve la copie exacte d’une publication secondaire. Elle ne
certifie pas un rip primaire du jeu. Le support exact et la chaîne d’extraction
ne sont pas documentés. Les libellés espagnols sont ceux de l’auteur ; aucune
écoute sémantique indépendante n’a pu être réalisée, le runtime ne prenant pas
en charge l’entrée audio. La présence d’une piste décodable ne remplace pas cette
écoute. **Aucun des 57 fichiers n’est attribué à un UID précis ni au combat.**

## Provenance et limites

L’archive GitHub officielle de ce commit a été téléchargée : 44 335 614 octets,
SHA-256 `c79159457e5dd4d1a2981995a9e868219593a9d4abfd6e935752489750df289b`.
Elle contient 292 membres. Sur 59 MP3 du dossier `res/raw`, 57 correspondent
exactement à un nom du XML de libellés. `_intro.mp3` et `romperpedazos.mp3` ont été
exclus faute de libellé exact. Les APK et les autres fichiers du projet restent
dans le cache ; aucun code téléchargé n’est exécuté ou intégré.

Les 57 MP3 livrés gardent leurs octets et leurs SHA-256. Leur empreinte d’objet Git
SHA-1 a aussi été calculée puis comparée à celle publiée dans la réponse de l’API
du commit : **57 correspondances**. `evidence/strings.xml` conserve le fichier de
libellés exact ; `evidence/commit-proof.json` conserve les preuves compactes.
`evidence/source-publication.txt` donne les URLs immuables et les observations.

Les trois pages de Village Ganado, Castle Ganado et Soldier Ganado déjà revues
restent des références de contexte. Elles ne prouvent pas quel personnage parle
dans chaque fichier. Les affectations exactes et certifications restent à zéro.

## Lecteur et contrôles

Le lecteur permet de rechercher un libellé, sélectionner une phrase et charger
son fichier. Il vérifie taille et SHA-256 avant de créer l’URL audio locale. La
lecture nécessite une action explicite sur les commandes audio ; aucun extrait
n’est lancé automatiquement. Le changement de sélection arrête la lecture et
annule les anciens chargements. Le lecteur conserve au maximum une URL audio.
Le passage en arrière-plan suspend la lecture, sans reprise automatique.

`ffprobe` valide les 57 fichiers, leur format, leurs pistes, fréquences, canaux et
durées. Le navigateur décode aussi les 57 MP3 après comparaison de leur SHA-256,
sans envoyer ces décodages vers une sortie sonore. Cinq groupes navigateur
réussissent : parcours en 1440 et 390 px avec lecture/pause/volume, décodages,
refus de corruption et réponse tardive. Les captures ont été inspectées ; aucun
débordement de page ou erreur JavaScript n’a été observé.

Huit tests Python contrôlent l’archive altérée, les chemins dangereux, liens
symboliques et collisions de casse, taux de compression excessif, entités XML,
copie exacte sans certification, mauvais commit et objet Git discordant.

```sh
python3 -m unittest discover -s tests -p 'test_audio_archive_r24.py' -v
CHROME_BIN=/usr/bin/chromium node tests/browser-audio-r24.mjs
```

## Réimporter la publication

Avec Python 3 et `ffprobe`, télécharger l’archive et les métadonnées aux URLs
déclarées dans `audio/import-request.json`, puis exécuter :

```sh
python3 scripts/import-audio-archive-r24.py \
  --archive /workspace/scratch/r24-audio/source.zip \
  --request modules/fidelity-r24/audio/import-request.json \
  --commit-metadata /workspace/scratch/r24-audio/github-commit.json \
  --output modules/fidelity-r24/audio/manifest.json
```

L’importeur inspecte les chemins et attributs de tous les membres avant extraction.
Il refuse chiffrement, liens symboliques, chemins sortants, collisions de casse,
formats de compression non pris en charge et limites de taille ou de ratio
dépassées. Seuls les MP3 nommés par le XML sont copiés. Le démultiplexeur audio est
imposé et les protocoles limités aux fichiers locaux. Aucun réencodage,
normalisation, découpage, miroir ou son synthétique n’est produit.

L’accueil de la nouvelle archive Sounds Resource et son index de série sont
maintenant accessibles. L’index publie vingt jeux Resident Evil. Les six pages de
jeux exactes testées renvoient encore HTTP 403 ; aucune boucle de nouvelle tentative
ou contournement n’a été effectuée. Le relevé est conservé dans
`evidence/archive-discovery.json`. La recherche GitHub a fourni la publication
exploitable de ce lot ; les dépôts d’outils sans audio ont été exclus.

G-AUDIO reste ouvert : écoute et langue à confirmer, attribution par incarnation,
comparaison avec les banques primaires, bornes et déclencheurs, sons manquants,
mixage et recette réelle sur les appareils cibles.
