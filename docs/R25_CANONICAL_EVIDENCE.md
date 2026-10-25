# R25 — 109 assertions ciblées, 80 nouvelles incarnations revues

Le [lecteur R25](../modules/fidelity-r25/canonical/index.html) ajoute **109
assertions documentaires pour 80 UID** qui n’avaient pas de citation revue en
R23/R24. La couverture cumulée atteint **176 incarnations sur 389** ; ce nombre
désigne une revue documentaire partielle, jamais un sprite ou répertoire complet.
Les 38 assertions R23 et les 115 R24 restent conservées dans leurs publications.

Le nouveau lot comprend 59 gestes/comportements, 12 vulnérabilités décrites,
21 formes, deux alias et 15 périmètres/contextes. Il porte notamment sur Code
Veronica, Resident Evil 1996, Revelations, Revelations 2 et Resident Evil 6. Les
citations ont été sélectionnées individuellement, puis comparées mot à mot au
contenu visible de leurs pages exactes. Une page entière n’est pas comptée comme
un répertoire de commandes.

## Sources et recoupements

Les **84 sources** sont liées à leurs copies gzip R23 déjà conservées, avec
vérification des empreintes du gzip et du HTML décompressé. Il n’y a pas de
duplication de ces copies ni de nouvelle capture primaire dans ce lot. Le
manifeste retient le jeu, l’URL, la date originale d’observation, le titre et
les empreintes de chaque source. Les citations du blog sont extraites du texte
visible, sans exécuter ses scripts ou traiter les données JSON comme un témoignage.

**Dix rapprochements entre Evil Resource et Blackjack Rants** précisent ce que
les deux publications disent en commun : extension du bras du Bandersnatch,
identité de Nosferatu, décharge de l’Albinoid adulte dans la piscine, bouche
thoracique du Sea Creeper, appendice organique en scie du Scagdead, ADN de requin
du Scarmiglione, mirages/téléportation de Norman muté, camouflage du Glasp,
parasites projetés du Slinger et insecte caché par l’essaim du Gnezdo.

Le recoupement garde une portée étroite : la description de la scie du Scagdead
ne confirme pas à elle seule une attaque létale ; la bouche thoracique du Sea
Creeper ne confirme pas à elle seule sa saisie. Les interprétations du blog sur
la vitesse de Norman ou le gaz du Glasp ne deviennent pas des mécanismes de jeu
certifiés. **L’indépendance des observations primaires de ces publications n’est
pas établie.**

## Éditions, acteurs et négations

- Wall Blister conserve explicitement le contexte **HD/PC**. Le blog écrit
  « Only showing up in the 'HD' versions of Revelations are these unique enemy. »
  Le titre 2012 du catalogue ne certifie pas sa présence sur Nintendo 3DS.
- Le réveil de Forest Speyer reste limité à **Director’s Cut,
  Arranged/Advanced**, tel que le décrit la source. Il n’est pas généralisé
  à toutes les éditions de Resident Evil 1996.
- Le Spotter détecte le joueur et appelle un Hunter/Sweeper. Son action reste
  attribuée à ce détecteur nommé hors catalogue ; elle ne devient pas une
  commande du Hunter. L’Oko reste pour sa part l’acteur qui avertit Ustanak.
- Les trois prédicats niés gardent leur phase : soin ordinaire du poison de
  Nosferatu, empoisonnement par Yawn au second combat et efficacité des attaques
  conventionnelles contre la seconde forme d’Alex de Revelations 2. Le premier
  combat de Yawn conserve sa description distincte de poison.
- Le saut du Hunter reste une **distance d’action**. La croissance de la guêpe
  « roughly four times » reste une comparaison vague ; aucun de ces énoncés
  ne fournit une taille corporelle en mètres.

Le lien `canonical/index.html#rerev-sea-creeper` ouvre directement le sujet.
La liste affiche les 80 nouvelles revues, tandis que le manifeste conserve les
389 UID pour l’intégration au classeur. Les fiches des anciennes revues peuvent
renvoyer à leurs citations R23/R24 conservées. Les filtres distinguent les
recoupements, négations et écarts de périmètre. Les contenus restent du texte
inerte ; une source distante à la place d’une copie locale est refusée.

## Validation et limites

**Neuf tests Python et cinq groupes navigateur réussissent.** Ils contrôlent
les citations et leurs empreintes, l’extension réelle des 96 identités déjà
revues, les frontières original/remake, acteur/sujet, modes et négations, le
refus des mesures inventées, des fausses certifications et des recoupements
provenant d’un même éditeur. Les parcours 1440/390 px couvrent filtres, liens,
copies vérifiables, fragments d’URL, texte malveillant inerte et index incomplet.
Les captures ont été inspectées ; aucune erreur JavaScript ou débordement n’a
été relevé dans ces parcours. Ces résultats ne certifient pas les appareils
physiques ni les lecteurs d’écran.

```sh
python3 scripts/build-canonical-evidence-r25.py --check
python3 -m unittest discover -s tests -p 'test_canonical_evidence_r25.py' -v
CHROME_BIN=/usr/bin/chromium node tests/browser-canonical-r25.mjs
```

Les données curées sont dans `canonical/curation.json`, les assertions liées
dans `canonical/manifest.json`, et les résultats dans
[R25_CANONICAL_BROWSER.json](R25_CANONICAL_BROWSER.json). Ce lot ajoute **zéro
capture primaire, zéro répertoire complet, zéro taille corporelle certifiée et
zéro fidélité globale certifiée**. G-PREUVES, G-COMMANDES, G-PERIMETRE et G-ECHELLE
restent ouverts lorsque leurs critères dépassent ces assertions documentaires.
