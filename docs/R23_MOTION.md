# R23 — Malacoda : 218 images documentaires sans cadence inventée

Le [lecteur](../modules/fidelity-r23/motion/index.html) permet d’examiner 218 images
de Malacoda dans Resident Evil Revelations, avec les pixels composites du GIF
publié conservés à leur définition de 420 × 242. Il garde les changements de
caméra, le décor, l’hélicoptère et les autres éléments de la scène.

Le fichier source ne définit **aucun délai** entre ses images : les 218 durées
décodées valent zéro. Le lecteur propose donc uniquement précédent/suivant,
début/fin et curseur. Il n’invente ni cadence, ni durée de scène, ni audio.
Le GIF original est conservé intact et téléchargeable. La fidélité complète du
jeu ne peut pas être déduite de la copie exacte de ces images publiées.

## Attribution et limites

L’article [Blackjack Rants consacré à Revelations](https://blackjackrants.blogspot.com/2021/07/reviewing-monsters-resident-evil.html)
nomme Malacoda, décrit son hôte et renvoie explicitement au GIF « from
Revelations ». [Evil Resource](https://www.evilresource.com/resident-evil-revelations/enemies/malacoda)
recoupe l’identité, le contexte aquatique et l’épisode 11-1 sur Queen Zenobia.
Ce second article n’authentifie pas la cadence ou la version de plateforme de la
vidéo. Les deux pages sont conservées comme texte brut dans `motion/provenance/`.
Les URL, empreintes, limites et fichiers livrés figurent dans
[`R23_MOTION_EVIDENCE.json`](R23_MOTION_EVIDENCE.json).

Les GIF Adder et Tyrantv2 précédemment inaccessibles sont maintenant
téléchargeables, mais leur décodage révèle une seule image chacun. Ils sont
explicitement exclus du compteur d’animations ; leur extension ne suffit pas à
en faire des mouvements.

Cette scène avance la collecte des preuves et des cinématiques. Elle ne clôture
pas les rigs, les vues opposées, les gestes de combat, les résultats de manche
ou les associations de conclusions. Aucune phase n’est affectée à une victoire,
une défaite ou une égalité sans preuve correspondante.

## Conservation et validation

Dix atlas PNG bornés à 2,8 millions de pixels conservent les images sans perte.
Le lecteur vérifie le manifeste, chaque atlas et les pixels RGBA de l’image avant
affichage. Son cache contient au maximum deux atlas décodés. Le dernier choix
manuel reste prioritaire pendant un chargement retardé ; une source corrompue
est refusée et peut être rechargée.

Validation locale exécutée : cinq tests Python, dont comparaison des **218
images** à leur GIF original, et cinq groupes de contrôles Chromium. Ces derniers
couvrent 1440/390 px, sept images réparties dans les atlas, la navigation clavier,
l’absence d’avance automatique après dix secondes, le cache, le refus d’un atlas
corrompu, sa reprise et les requêtes retardées. Le rendu mobile a été inspecté.
Aucun appareil physique n’a été testé.

```sh
python3 -m unittest discover -s tests -p 'test_manual_motion_r23.py' -v
CHROME_BIN=/usr/bin/chromium node tests/browser-manual-motion-r23.mjs
```

L’outil `scripts/extract-manual-motion-r23.py` réutilise les règles de chemins et
de conservation R22 sans modifier cette livraison. Il refuse les sources
statiques, les empreintes différentes, les sorties existantes différentes,
les liens symboliques et les fichiers qui définissent une cadence. Les fixtures
des tests sont des couleurs synthétiques et ne comptent pas comme personnages.
