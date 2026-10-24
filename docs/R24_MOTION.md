# R24 — Sea Creeper : armature, 47 mouvements et une pose à clés

Le [parcours des mouvements](../modules/fidelity-r24/motion/index.html) donne accès
au lecteur 3D et à l’archive publiée de Sea Creeper pour Resident Evil Revelations
sur PC. La livraison conserve un corps FBX pondéré, quatre textures, six fichiers
à clés accessibles directement et le ZIP original contenant les **48 fichiers
à clés : 47 mouvements après zéro et une pose fixe**. Les autres fichiers peuvent
être extraits individuellement du même ZIP.
Ils ne sont pas reconstruits à partir de poses ou de captures d’écran.

## Source et attribution

[La fiche de Models Resource](https://models.spriters-resource.com/pc_computer/residentevilrevelations/asset/461302/)
identifie le sujet, le jeu, la plateforme et le téléchargement. La fiche
[Evil Resource](https://www.evilresource.com/resident-evil-revelations/enemies/sea-creeper)
recoupe l’identité dans Revelations. Les deux pages sont conservées, sans
exécution de leur HTML, dans `motion/sea-creeper/source/`.

Le ZIP original pèse 33 776 058 octets et conserve l’empreinte
`a04c0c942bd2aaf0a39a6b91d5849a5c81a93491fb4368908562b0fb70188783`.
Il s’agit d’un export communautaire attribué à la version PC. Ni les options de
l’outil d’extraction, ni l’équivalence du rendu avec chaque version du jeu ne sont
certifiées. Le catalogue nomme le jeu sorti en 2012 ; cela ne transforme pas cet
export PC en une ressource 3DS d’origine.

## Ce qui a été vérifié dans les fichiers

Le décodage binaire FBX vérifie les structures réelles, plutôt que leurs seuls
noms : chaque fichier animé contient neuf géométries, neuf peaux pondérées,
10 144 affectations de poids valides, 33 nœuds d’os et une racine supplémentaire
nommée `bone255`. Le corps statique déclare cette racine comme un os ; les clips
la déclarent comme un objet nul animé. Les scènes animées sont autonomes : aucun
transfert vers un autre personnage n’est nécessaire.

Les 48 fichiers contiennent 14 688 courbes, dont 5 019 varient en incluant les
préclés négatives, et 450 621 entrées
temporelles de clés. Ce dernier nombre **ne désigne pas des images vidéo ou des
gestes distincts** : plusieurs courbes partagent le même instant. Les instants
uniques par clip totalisent 3 891. Les temps natifs, exprimés en unités FBX de
46 186 158 000 unités par seconde, restent consignés dans le manifeste.

L’analyse séparée du temps supérieur ou égal à zéro trouve **47 fichiers avec
mouvement**, totalisant 4 596 courbes qui varient pendant leur lecture. Un seul
fichier, `em1200_em1201_BA_1`, reste strictement fixe après zéro. Ses trois instants
natifs sont `-9622116`, `0` et `769769300` : les valeurs des deux dernières clés
sont identiques sur les 306 courbes. Ses 103 courbes variables changent uniquement
entre la pose de référence négative et la pose à zéro ; cela n’ajoute pas un
48e mouvement visible. Les 47 autres fichiers ont chacun au moins 33 courbes
dont l’écart dépasse `1e-4` après zéro. Le rapport
[`R24_MOTION_POSITIVE_TIME.json`](R24_MOTION_POSITIVE_TIME.json) conserve les
comptes et les amplitudes par propriété, sans modifier les fichiers sources.

Les noms `BA`, `DM` et `SC` sont conservés tels quels. Cette livraison ne les
traduit pas arbitrairement en marche, attaque, prise, blessure, victoire ou mort.
Une revue de chaque fichier, confrontée au jeu, reste nécessaire pour constituer
un répertoire de commandes et des conclusions artistiques.

Tous les clips gardent une préclé négative de 0,0002083333279 seconde. Le champ
`sourceTimeSpanSeconds` décrit l’étendue de la première à la dernière clé, tandis
que `lastNativeTimeSeconds` décrit le dernier instant après zéro. Par exemple,
`BA_1` a une étendue de 2,5002083333 secondes et une lecture de zéro à 2,5 secondes.
Aucun délai ou nombre d’images par seconde n’a été inventé pour combler cet écart.

## Matériaux explicites, sans association arbitraire

Les fichiers animés omettent leurs matériaux. Le FBX du corps, dans **la même
archive**, conserve les neuf affectations et leurs connexions de textures :
`DiffuseColor` vers `em1200_BM.png`, `NormalMap` vers `em1200_NM.png` et
`SpecularFactor` vers `em1200_MM.png`. Le DAE original recoupe la liaison diffuse.

La preuve `motion/sea-creeper/source/material-bindings.json` compare les 48 scènes
au corps : **432 correspondances de maillages** vérifient les noms, la topologie
et les coordonnées UV déployées par coin de polygone, strictement identiques.
Les tableaux UV bruts sont réordonnés dans certains exports ; comparer uniquement
leur ordre produirait une fausse différence. Le validateur refuse une autre
incarnation, des UV différents ou l’absence d’une affectation native.

Cette preuve permet au lecteur de réutiliser les matériaux documentés du corps
sur leurs maillages correspondants. Elle n’autorise pas une texture choisie par
son nom, une recoloration ou une autre surface supposée. Les shaders, la caméra
et l’éclairage d’examen restent distincts d’une reproduction du moteur du jeu.

## Recherche systématique des séquences raster

`scripts/scan-source-motion-r24.py` décompresse et vérifie les empreintes des 389
snapshots R23, correspondant à 386 pages brutes distinctes. L’analyse des liens,
attributs différés et éléments vidéo retrouve quatre GIF de sujets et une icône
Blogger exclue. Les quatre sujets sont ceux déjà examinés : Nemesis, Malacoda,
Adder et Tyrantv2. Les deux derniers sont statiques. L’unique vidéo intégrée
distincte est hébergée sur YouTube ; elle apparaît dans deux snapshots du même
article. Aucun nouveau clip raster n’est déduit de cette recherche.

Le flux complet de 23 articles Blogspot et les caches R21/R22 ont également été
recherchés. Le flux, conservé dans `motion/research/`, ne fournit pas d’autre GIF
de sujet. Trois galeries ou pages de gameplay Fandom répondent HTTP 402. Les
résultats Bing insuffisants ou hors sujet ne sont pas retenus comme preuve.
Cette limite a conduit à rechercher les véritables sources d’animation dans les
archives de modèles, où les 48 fichiers natifs ont été trouvés.

## Deux candidats RE5 conservés pour un lot ultérieur

Deux autres archives PC de Resident Evil 5 ont été décodées, puis laissées en
scratch sans ajouter leurs ressources au dépôt. Leurs armatures sont réelles,
mais leurs affectations de matériaux restent incomplètes :

- **Chainsaw Majini** : 87 os, 11 peaux, 10 561 affectations de poids valides.
  Sept maillages ont des textures explicitement liées ; quatre conservent un
  matériau `unknownmaterial` gris sans texture. Sa fiche est
  [Models Resource 316460](https://models.spriters-resource.com/pc_computer/residentevil5/asset/316460/).
  Le [ZIP de 6 133 364 octets](https://models.spriters-resource.com/media/assets/313/316460.zip?updated=1755504373)
  a pour SHA-256 `af503379aa8dddc2837a732f2a85af6cce290c313d05a450968689d8449b41c3`.
- **Axe Executioner** : 112 os, 12 peaux, 12 955 affectations de poids valides.
  Neuf maillages ont des textures explicitement liées ; trois conservent ce
  matériau gris. Sa fiche est
  [Models Resource 310867](https://models.spriters-resource.com/pc_computer/residentevil5/asset/310867/).
  Le [ZIP de 9 750 889 octets](https://models.spriters-resource.com/media/assets/308/310867.zip?updated=1755502931)
  a pour SHA-256 `3e0e3206529b8cef0deaac519c0093327ece593face5223f208d2585197675e5`.

Les deux FBX possèdent une prise nommée `Take 001`, mais une seule clé temporelle
et aucune courbe qui varie : **aucun mouvement supplémentaire n’est compté**.
Le FBX d’Executioner lie ses fichiers `NM` au canal `Bump` ; cette déclaration
n’est pas changée arbitrairement en `NormalMap`. Les identités restent des
candidats d’attribution, les matériaux inconnus ne sont pas remplacés par une
texture supposée, et ces deux armatures ne comptent pas dans la livraison.
Les inventaires et ZIP restent dans `/workspace/scratch/r24-motion/` pour une
revue ultérieure. Le rapport JSON conserve leurs URL, empreintes et limites.

## Validation et reproduction

Sept tests Python couvrent les 48 FBX réels, la conservation du ZIP et des membres
livrés, les clés et pondérations, les sorties idempotentes, les refus de chemins
et liens symboliques, les collisions de destination, les structures tronquées,
les limites de décompression et les associations de matériaux. Le scan des 389
snapshots passe également son contrôle en lecture seule.

```sh
python3 -m unittest discover -s tests -p 'test_rigged_motion_r24.py' -v
python3 scripts/scan-source-motion-r24.py --check
python3 scripts/import-rigged-motion-r24.py \
  --archive modules/fidelity-r24/motion/sea-creeper/source/original.zip \
  --request docs/R24_MOTION_IMPORT_REQUEST.json \
  --output /tmp/bow-r24-sea-creeper-review
```

Le lecteur fait l’objet d’une validation séparée. Le premier contrôle de `BA_1`
observe neuf maillages pondérés, 102 pistes décodées et une modification de 32
positions/rotations d’os à une seconde. La vérification indépendante des copies
d’os du chargeur retrouve des matrices cohérentes à six instants. Cela valide
la lecture de cet export ; cela ne certifie pas un rendu final du jeu ni la
sémantique des fichiers. Les rapports du lecteur précisent leur périmètre.

Les chantiers de rig final, de commandes complètes, de résultats de manche,
d’intros/outros, de compatibilité artistique des victimes et de preuves primaires
restent ouverts. Aucune clé, aucun mouvement, aucun son et aucune anatomie
supplémentaire n’est inventé par cette collecte.
