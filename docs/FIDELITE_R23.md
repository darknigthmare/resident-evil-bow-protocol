# R23 — chantiers parallèles et ressources d’origine

Le suivi R23 avance les 17 chantiers ouverts du classeur, avec six lots traités
en parallèle. Le Bestiaire donne accès à « Sources et chantiers », où chaque
chantier conserve son avancée, ses preuves et ses critères restant à satisfaire.
Le nouveau classeur est `docs/BOW_FIDELITE_R23.xlsx` ; les feuilles historiques
R22 sont conservées et les feuilles R23 détaillent la nouvelle livraison.

## Ressources livrées

- Sept vignettes natives de RE3 remake, attribuées aux incarnations revues,
  consultables dans leurs Dossiers et dans la bibliothèque visuelle. L’archive
  ZIP et l’atlas restent intacts ; les recadrages conservent leurs pixels RGBA.
  Ce sont des portraits partiels de 128 × 128 pixels. Les 385 sprites de combat
  manquants du suivi historique ne sont pas déclarés produits par ces portraits.
  Deux portraits de Wesker des Mercenaires RE5 sont conservés séparément :
  leurs tenues ne sont pas substituées au dossier du boss de campagne.
- Une scène de Malacoda dans Revelations : 218 images exactes, dix atlas,
  GIF original et deux pages justificatives conservés. Les délais du GIF publié
  sont tous nuls ; le lecteur propose uniquement une navigation manuelle.
- Un index des 389 incarnations, avec 389 copies de sources compressées
  (371 pages du catalogue et 18 autres articles), 38 citations revues pour
  19 incarnations et des mentions supplémentaires pour 258 entrées.
  Les citations couvrent trois alias, dix-neuf gestes, quinze descriptions
  de points faibles et une longueur corporelle citée. Elles restent secondaires.
- Un inspecteur de sauvegardes et replays : inventaire R19 de 18 clés et huit
  groupes, contrôles imbriqués, contrats de replays, doublons et conflits entre
  copies. Il conserve le fichier original, sans écriture dans le stockage,
  téléversement, migration ou lancement automatique d’un combat.
- Un état audio sur les 389 entrées et un importeur de sons natifs vérifiant
  le jeu, la forme, la liaison à la page, les octets et le format décodé.
  Aucun clip natif n’a pu être récupéré : le nouveau site de sons est bloqué.
- Une matrice des 13 225 paires de combattants principaux, soit 52 900 verdicts
  issus des règles réelles de conclusions. Les 2 141 paires compatibles avec
  un prototype restent distinctes des animations finales à produire. Les
  événements de fin de manche sont exercés dans le moteur avec des états contrôlés.

## Corrections d’accessibilité

Les Dossiers ont désormais un nom accessible fondé sur leur identité et leur
jeu. Le lecteur R22 restaure le focus du contrôle après un chargement d’atlas,
sans reprendre le focus que l’utilisateur a déplacé volontairement. Une fermeture
native livrée après l’ouverture du Dossier suivant ne doit plus annuler son image.
Ces corrections sont ajoutées par des scripts R23 ; le lecteur R22 et les modules
historiques de combat restent conservés.

Les mesures et parcours de référence se trouvent dans `R23_ACCESS_PERF.json` :
115 Dossiers au clavier et 115 en émulation tactile, images revues, chargements,
cadence du navigateur, mémoire et cache. L’environnement est un Chromium
virtualisé. Les lecteurs d’écran, manettes, appareils physiques et longues
sessions restent à éprouver. Les ralentissements observés figurent dans le rapport.

## Critères de fidélité

La copie des pixels publiés et leur attribution ne certifient pas la géométrie
du jeu, les côtés occultés, le rig, les mouvements complets ou leurs durées.
Une scène avec caméra et décor ne constitue pas un sprite détouré de combat.
Le compteur de fidélité globale 1:1 certifiée reste nul et les 17 chantiers restent
ouverts. Aucune pose manquante, orientation ou voix n’est inventée.

Les limites et désaccords des sources restent visibles : le cœur du Tyrant est
explicitement décrit comme n’étant pas un point faible dans la citation conservée ;
le saut de Krauser ne devient pas sa taille corporelle. Deux sources secondaires
se contredisent sur l’agent du Licker β de RE5 ; le désaccord est conservé sans
modifier les données de combat. Les pages officielles essayées ont refusé l’accès.

## Reproduire le suivi et les contrôles

Validation locale exécutée : 605 contrôles historiques, 30 tests Python R23,
12 tests d’inspection des formats, cinq groupes de conclusions et 31 groupes
navigateur R23 réussis. Les huit groupes de régression navigateur R22 passent
également. Le build statique termine avec la sortie zéro. Les détails et limites
sont conservés dans `R23_VALIDATION.json` et les rapports des lots.

Avec Node 22.16.0, Chromium, Python, Pillow, openpyxl et ffprobe disponibles :

```sh
python3 scripts/export-fidelity-progress-r23.py
python3 -m unittest discover -s tests -p 'test_*r23.py' -v
node tests/verify-persistence-r23.mjs
node scripts/audit-conclusions-r23.mjs --check
CHROME_BIN=/usr/bin/chromium node tests/browser-fidelity-dashboard-r23.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-manual-motion-r23.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-visual-r23.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-canonical-r23.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-persistence-r23.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-fidelity-r23.mjs
npm run build
```

L’export vérifie les empreintes des preuves du suivi avant de produire le classeur
et le tableau de bord. Il refuse une identité inconnue, un chantier omis ou une
clôture sans preuve. Les rapports de tests existants sont conservés dans leurs
fichiers dédiés. Le workflow `source-fidelity-r23.yml` enregistre ces contrôles
pour GitHub ; ses résultats distants doivent être consultés après exécution.

## Accès aux archives

La page Spriters publie maintenant les sous-domaines
`models.spriters-resource.com`, `sounds.spriters-resource.com` et
`textures.spriters-resource.com`. Ils ont été ajoutés au brouillon réseau,
avec `api.github.com` pour la livraison GitHub, en conservant les domaines déjà
autorisés. Le brouillon est enregistré mais son enregistrement n’applique pas
le changement. Il faut enregistrer les paramètres puis publier l’environnement
pour reprendre les requêtes bloquées. Aucun contenu de ces nouveaux domaines
n’est déclaré téléchargé avant vérification effective.
