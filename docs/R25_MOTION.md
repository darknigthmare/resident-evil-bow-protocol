# R25 — trois nouvelles créatures et leurs scènes originales

Les archives communautaires publiées pour **Farfarello, Wall Blister et Scagdead
dans l’édition HD/PC de Revelations (2013)** sont conservées intégralement, avec les FBX, textures
et sept copies justificatives de pages. Les entrées restent consultables dans le
[lecteur de mouvements](../modules/fidelity-r25/motion/index.html).

## Comptage des scènes

| Référence de modèle | Rôle | Cibles du modèle source | Maillages pondérés | Fichiers à clés | Mouvements après zéro | Poses à clés | Bases sans clés |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Farfarello em1240 | Corps | 30 | 6 | 78 | 78 | 0 | 1 |
| Wall Blister em1410 | Corps | 40 | 10 | 39 | 39 | 0 | 1 |
| Scagdead em1400 | Corps | 31 | 11 | 53 | 53 | 0 | 1 |
| Scagdead em1401 | Variante de corps, phase non attribuée | 31 | 9 | 0 | 0 | 0 | 1 |
| Objet associé om1706 | Objet distinct du corps | 4 | 2 | 10 | 9 | 1 | 1 |

Les dossiers nommés `Animations` contiennent ainsi **185 FBX : 180 fichiers à
clés, dont 179 mouvements et une pose fixe, plus cinq bases sans aucune clé**.
Les 179 mouvements se répartissent en **170 mouvements de corps et neuf d’objet
associé**. Les neuf mouvements de l’objet ne deviennent pas neuf gestes de
Scagdead. Les cinq corps ou objets sources ont aussi leur FBX à matériaux : les
trois ZIP contiennent 190 FBX en tout. Les fichiers DAE/OBJ et autres membres
restent présents dans leurs archives intactes.

Le fichier à clés `om1706_om1706_2` reste une pose géométriquement fixe. Les
cinq fichiers `*_base.FBX` n’ont aucune courbe ni clé ; aucune durée d’animation
ne leur est attribuée. Le second corps `em1401` ne représente pas une nouvelle
incarnation du catalogue et ne reçoit pas un nom de transformation supposé.

## Fichiers, matériaux et temps

Les ZIP font respectivement **51 272 971**, **54 239 972** et **70 540 768** octets.
Leurs empreintes complètes figurent dans le
[manifeste](../modules/fidelity-r25/motion/manifest.json) et dans la
[requête d’import reproductible](R25_MOTION_IMPORT_REQUEST.json). Chaque fichier
FBX animé est lu depuis son membre exact, sans réemballage de l’archive.

Les corps originaux ont des connexions explicites entre les matériaux et les
textures. Le transfert vers chaque scène exige une correspondance unique du
nom natif d’objet, du nombre de sommets, de la topologie et des UV développés
par coin de polygone. Les suffixes originaux `SkinnedCharacter` et
`SingleSkinnedCharacter` sont reconnus ; aucune correspondance n’est devinée
par ordre des objets. **1 499 correspondances** couvrent les 185 scènes,
y compris les bases sans clés. Toute différence de topologie ou UV est refusée.

Les poids, clés, coordonnées, pré-clés négatives et octets FBX restent inchangés.
Le temps natif min→max, le pré-roll avant zéro et la lecture 0→max restent trois
valeurs distinctes. Une clé négative n’est pas transformée en un mouvement
supplémentaire. Aucune cadence n’est plaquée sur des bases dépourvues de clés.

Les corps sources comprennent une racine nommée qui peut être représentée
comme `Null` dans les scènes animées. Le nombre de cibles nommées d’un corps
ne doit donc pas être confondu avec le nombre d’objets `Bone` du décodeur.
Les copies d’os utilisées par les maillages restent vérifiées dans l’espace
de la scène à chaque instant échantillonné.

## Portée des preuves

Chaque paquet conserve la page de Models Resource qui attribue le jeu et le
sujet et lie le ZIP, ainsi qu’une page indépendante Evil Resource qui identifie
la créature dans Revelations. La seconde page ne certifie ni les courbes du
FBX ni sa chaîne d’extraction. Il s’agit d’exports communautaires, pas de paquets
bruts officiels Capcom. Leur égalité aux fichiers internes du jeu n’est pas prouvée.

Une troisième source conservée pour Wall Blister précise : « Only showing up
in the 'HD' versions of Revelations ». Le modèle garde donc explicitement son
édition HD/PC ; son UID générique du catalogue ne certifie pas une présence en
3DS en 2012. Cette citation provient du snapshot R23 immuable de Blackjack Rants,
recopié avec ses empreintes, sans prétendre à une nouvelle visite de la page.

Les noms de fichiers BA/DM/SC/WBm ne sont pas des attributions d’attaque,
déplacement, capture, mort, victoire ou cinématique. Aucun de ces rôles n’est
déduit des seuls noms. Aucune animation n’est transférée à une autre incarnation.
Les unités des modèles ne deviennent pas des mètres et le rendu d’examen ne
certifie pas l’éclairage du jeu original. Les sprites de combat finaux et le
rig complet du catalogue restent à produire et à recetter.

Le candidat Garrador trouvé pour **The Mercenaries 3D sur Nintendo 3DS** reste
hors de cette livraison : ses animations ne sont pas assimilées au Garrador de
la campagne RE4. Les archives Ooze n’ont pas été ajoutées à ce lot car leur taille
dépasse la borne de 80 Mio prévue pour le lecteur ; aucune absence de source
n’est masquée par une animation synthétique.

## Contrôles et reproduction

Le test Node charge les **180 scènes à clés** avec le Three.js local épinglé à
0.180.0. Il vérifie les noms des cibles, les copies d’os, les poids lisibles et
tous les sommets pondérés à cinq instants. Il constate **179 déformations
effectives après zéro et une pose fixe**. Le plus petit déplacement maximal
mesuré est de 2,7549 unités natives pour les corps et de 0,1255 pour l’objet
associé ; ces valeurs ne sont pas des dimensions réelles. Le rapport est
[R25_MOTION_SKELETON_TESTS.json](R25_MOTION_SKELETON_TESTS.json).

```sh
python3 scripts/import-rigged-motion-r25.py --check
python3 -m unittest discover -s tests -p 'test_rigged_motion_r25.py' -v
node tests/verify-motion-skeletons-r25.mjs
```

L’import vérifie les trois archives entières et chaque source compressée avant
de vérifier les scènes. Il refuse une identité inconnue, une attribution de rôle
non reconnue, une prétention de fidélité finale, une archive altérée ou une
destination traversante. Les modèles, textures et notices du paquet restent
dans les archives intactes. Aucun contenu HTML téléchargé n’est exécuté.

Les **neuf tests Python réussissent**, y compris la reconstruction exacte du
manifeste depuis les trois archives, les suffixes de maillages, les refus des
archives ou UV altérés, la séparation des bases sans clés et la portée HD/PC.
