# R22 — lecture de séquences sources conservées

Le module `modules/source-motion-r22/` peut lire des images réellement présentes
dans une séquence publiée. L'extracteur ne produit ni pose, ni membre occulté,
ni nouvelle orientation : il conserve la scène entière, sa caméra, son décor et
ses sous-titres.

Le premier lot est la séquence de Nemesis infectant un zombie dans Resident Evil 3
remake (2020), publiée dans l'article de Blackjack Rants. Le GIF source conservé
contient **150 images de 40 ms**, soit **6 000 ms**, en **400 × 225**. Les 13 premières
images sont sombres dans le fichier d'origine ; elles restent présentes.

## Extraire le fichier vérifié

Avec Python et Pillow installés (voir `requirements-content.txt`) :

```sh
python3 scripts/extract-source-motion-r22.py \
  --input /workspace/scratch/bow-primary-research/original-nemesis-infect-zombie.gif \
  --output modules/source-motion-r22/media/nemesis-infection \
  --source-url 'https://static.wikia.nocookie.net/residentevil/images/d/d4/Nemesis_Infecting_Zombies.gif/revision/latest?cb=20200319220901&format=original' \
  --source-page-url 'https://blackjackrants.blogspot.com/2020/10/reviewing-monsters-resident-evil-3.html' \
  --expected-sha256 338cdf48f525d85d8111c10eb660feff557c2b65535b49cef524c50e5fbdd306 \
  --id re3r-nemesis-infection --subject-id re3r-nemesis \
  --game 'Resident Evil 3 remake (2020)' --label 'Infection d’un zombie' \
  --description 'Séquence publiée de Nemesis infectant un zombie. Images originales avec décor, caméra et sous-titres ; aucun audio, rig ou sprite de combat reconstitué.'
```

L'extraction produit `original.gif`, cinq atlas PNG sans perte et un
`manifest.json` de schéma `re.bow.source-motion/1`. Chaque atlas contient au plus
32 images, mesure au plus 4 096 pixels par côté et reste sous huit millions de
pixels. Les cinq atlas du lot courant contiennent 32, 32, 32, 32 et 22 images.

Chaque entrée de `frames` indique l'atlas, le rectangle, la durée native,
l'indice source et l'empreinte RGBA. Chaque recadrage de l'atlas est décodé et
comparé à l'image source compositée par le décodeur GIF, y compris sa palette et
ses règles de disposal. Le GIF original est copié octet pour octet. Aucune
interpolation, réflexion, suppression de fond ou correction de durée n'est
appliquée. Une durée explicite de zéro est conservée ; une durée inconnue est
refusée. Un fichier existant différent n'est pas écrasé.

```sh
python3 tests/test_source_motion_r22.py
```

Six groupes de tests couvrent le compositage/disposal, les limites d'atlas, les
durées nulles explicites, la conservation des pixels, le refus d'une empreinte
source erronée, l'idempotence et la préservation d'une sortie existante. Les
images de test synthétiques ne représentent pas des personnages.

## Portée de fidélité

L'identité pixel à pixel est prouvée **par rapport au GIF publié**, ainsi que la
conservation de ses durées. Cela ne certifie pas les timings du moteur d'origine,
les parties cachées du corps, un rig, une nouvelle animation de combattant, les
sons ou la fidélité géométrique complète de l'incarnation. La séquence reste
muette ; `combatIntegrated`, `modularRig` et les certifications finales sont faux.

Les autres GIF découverts dans les articles (Adder, Tyrantv2 et Malacoda) ont
renvoyé HTTP 402 sur les deux hôtes CDN autorisés lors de cette reprise. Une
requête YouTube a de nouveau été refusée par le proxy (CONNECT 403). Ces médias
ne sont donc pas annoncés comme téléchargés ou inspectés. Les tentatives et
leurs URL sont conservées dans `/workspace/scratch/bow-motion-r22/`.
