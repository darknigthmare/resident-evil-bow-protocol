# R24 — modèles, mouvements, sons et chantiers parallèles

Le classeur [BOW_FIDELITE_R24.xlsx](BOW_FIDELITE_R24.xlsx) reprend les **17
chantiers ouverts et les 389 incarnations**, avec six nouvelles feuilles. Les onze
feuilles historiques restent conservées à l’octet, y compris leurs liens.
Le Bestiaire ouvre le centre [Sources et chantiers R24](../modules/fidelity-r24/index.html).
Les anciens lecteurs et leurs sources restent accessibles.

## Ressources consultables

- **36 vues OBJ**, dont sept parties indépendantes, avec **21 archives ZIP**,
  textures, aperçus, notices et empreintes. Les poses d’export, articulations
  séparées et chaînes détachées restent telles que publiées. Les ports GameCube
  gardent leur plateforme ; leur équivalence aux incarnations PS1 n’est pas
  déclarée. Une référence publiée du Tyrant du remake contient 34 articulations
  et 11 maillages pondérés, sans animation ; son origine console n’est pas certifiée.
- **Sea Creeper, Revelations** : corps FBX pondéré, neuf maillages et 34 cibles
  nommées dont la racine. L’archive contient **48 fichiers FBX à clés : 47
  mouvements après zéro et une pose fixe** (`em1200_em1201_BA_1`). Cette dernière
  varie uniquement entre une pré-clé négative et la pose initiale ; le lecteur
  la signale et désactive sa lecture automatique. Les clés, poids et coordonnées
  sources ne sont pas réécrits. Les actions BA/DM/SC restent non attribuées.
  Les matériaux viennent du corps original : 432 correspondances exactes de
  topologie et UV relient ses neuf maillages aux 48 scènes. Aucune texture n’est
  choisie au jugé. Six FBX sont disponibles directement ; les autres sont lus
  depuis leur membre exact de l’archive conservée, après contrôle SHA-256.
- **57 MP3 documentaires RE4**, copiés sans transformation d’une publication Git
  de 2016 épinglée à son commit. Les libellés XML, objets Git et empreintes sont
  conservés. Le navigateur vérifie les octets puis décode les sons, sans autoplay.
  Ils restent des références de la famille Ganados : **zéro attribution à une
  incarnation précise, zéro écoute sémantique indépendante et zéro son natif
  certifié**. Les bornes des banques audio du jeu ne sont pas prouvées.
- **115 nouvelles assertions pour 78 UID**, dont 77 nouvellement revus, soit
  96 identités revues en cumulant R23/R24. Elles couvrent 61 gestes, 19 points
  faibles, 11 formes, 16 périmètres, quatre dimensions et quatre alias. Les
  88 sources utilisées comprennent huit nouvelles copies. Les 14 rapprochements
  entre publications ne prouvent pas l’indépendance de leurs observations
  primaires. Les 21 assertions fondées sur des transcriptions de fichiers du jeu
  restent hébergées par un tiers ; aucune capture primaire directe n’est acquise.

Le [lecteur de modèles](../modules/fidelity-r24/models/index.html) présente 38
entrées : les 36 OBJ, la référence pondérée Tyrant et Sea Creeper. Il propose
rotation, zoom, squelette, pause et navigation par clé. Les fichiers sont bornés
et vérifiés avant leur décodage. Le rendu neutre sert à l’inspection ; il ne
certifie pas l’éclairage ou le rendu des jeux originaux. Les unités d’un modèle
ne deviennent pas une taille corporelle en mètres.

## Replays et accès

La [vérification des replays](../modules/fidelity-r24/persistence/index.html)
reconstruit réellement les commandes dans trois routes : moteur principal
courant, vrai moteur pré-R13 et expérimental R7. Le HTML et les 24 scripts
pré-R13 sont conservés depuis la révision Git
`31671fecf53a26d81f77d2cb13a5ff61f15ef363`. Chaque relecture compare deux
simulations ; les contrats inconnus sont refusés. Des iframes à origine opaque
et un stockage privé en mémoire préservent les sauvegardes de jeu. Les limites
des états enregistrés sont détaillées dans [R24_PERSISTENCE.md](R24_PERSISTENCE.md).

L’accès R24 corrige le focus aux extrémités du lecteur Malacoda, le retour à la
ligne à 320 pixels CSS avec texte à 200 % et propose une navigation facultative
à la manette. Les 28 groupes de parcours couvrent 12 pages R23/R24. Les manettes
sont simulées, les contrastes échantillonnés et les règles axe incomplètes
restent visibles. NVDA, VoiceOver et les appareils physiques restent à vérifier.
Les deux groupes de performance incluent 1 000 navigations rapides puis 1 020
demandes sur 180,653 secondes, avec deux atlas vivants au maximum. Les mesures
avant et après collecte restent dans les rapports, sans extrapolation au GPU.

## Portée de la fidélité

Les fichiers exacts sont ceux des **publications communautaires documentées**.
Cette conservation ne certifie pas leur identité aux paquets bruts Capcom.
Un OBJ, une pose, une vignette ou un son de famille ne remplace pas un sprite
de combat complet et attribué. Les 385 sprites de combat manquants du suivi
historique restent à produire avec leurs membres, orientations et cycles.

Le classeur conserve **17 chantiers en cours et zéro fidélité globale 1:1
certifiée**. Il distingue les résultats du moteur B.O.W., la preuve documentaire
et la validation artistique. Les conclusions, intros/outros, transformations,
sons par phase, rig complet du catalogue et mesures matérielles restent ouverts
là où leurs critères ne sont pas satisfaits. Aucune animation absente n’est
inventée pour remplir une case.

## Reproduire la livraison

Validation locale réussie : **605 contrôles historiques, 41 tests Python R24,
65 contrôles Node ciblés et 95 groupes navigateur R24**. Les lecteurs historiques
R22/R23 passent aussi leurs 13 groupes de régression dans une copie isolée.
Le build statique termine avec la sortie zéro. Ces résultats restent des
contrôles locaux ; aucune réussite CI distante n’est annoncée avant son exécution.

Utiliser Node 22.16.0, Python avec Pillow et openpyxl, ffprobe, Chromium et
Playwright 1.64.1. Le harnais d’accès emploie axe-core 4.14.0 ;
`AXE_CORE_PATH` peut désigner son fichier `axe.min.js`. Three.js 0.180.0 est
conservé localement avec sa licence et les empreintes de ses douze fichiers.

```sh
python3 scripts/build-model-catalog-r24.py --check
python3 scripts/export-fidelity-progress-r24.py
python3 -m unittest discover -s tests -p 'test_*r24.py' -v
node tests/verify-model-assets-r24.mjs
node tests/verify-model-skeletons-r24.mjs
node tests/verify-persistence-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-models-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-visual-models-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-audio-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-canonical-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-persistence-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-access-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-perf-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-fidelity-dashboard-r24.mjs
npm run build
```

Le suivi vérifie les empreintes de ses entrées avant l’export. La feuille des
48 fichiers distingue les temps natifs min→max de la lecture 0→max et de la
pré-clé négative conservée. Les preuves par chantier sont dans
[R24_TRACKING.json](R24_TRACKING.json), les résultats consolidés dans
[R24_VALIDATION.json](R24_VALIDATION.json). Le workflow GitHub dédié enregistre
les mêmes contrôles ; son résultat distant dépend de son exécution sur la PR.
