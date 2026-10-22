# R20 — interface joueur, espace DEV et sprites indépendants

## Livraison

Cette continuation part de `main` après la fusion de la PR #13 et intègre les sauvegardes R19. La base examinée est `e4b27bc42eacee69ecb0280fb35de117d4031cf1`. La version du moteur reste 0.7.3 : R20 modifie sa présentation et son parcours de navigation.

Ce commit de base est la fusion locale utilisée pour les essais. Son arbre Git `1425afc447b84a1873c0d7e1bfa5575d3ff25d98` est identique à celui du commit R19 publié `67b805aa814856148297dbf42a6fda219d20a8ac`, ce qui permet de reconstituer exactement les fichiers de départ depuis le dépôt distant.

Le menu principal propose Jouer, Dossiers, Entraînement, Archives, Options et Crédits dans une scène de confinement. Les panneaux gèrent la navigation au clavier, le retour de focus et les commandes de manette standard. Les préférences de mouvement, de contraste et de texte sont enregistrées dans la seule clé `re.bow.interface.r20`, distincte des groupes de progression et de sauvegarde R19.

Les pages joueur partagent leur typographie, leurs couleurs, leurs focus et leurs adaptations mobiles. Les laboratoires, diagnostics, téléchargements de suivi, exercices contextuels et outils d’inspection sont accessibles depuis `dev.html`. Le suffixe `?dev=1` expose les commandes techniques d’une page. Ctrl+Maj+D ouvre le centre DEV depuis le menu principal. Il s’agit d’une séparation d’interface ; ces fichiers statiques restent accessibles directement.

Le catalogue complémentaire est consultable dans les archives du joueur. Ses 231 profils d’essai et ses 43 exercices restent disponibles dans le parcours DEV. Le bestiaire principal conserve les liens vers le jeu et l’entraînement. Les textes d’avertissement nécessaires à la restauration des sauvegardes restent visibles dans la machine à écrire.

## Art réellement produit

| Identité | Incarnation | Présentation livrée | Destination |
| --- | --- | --- | --- |
| Tyrant T-00 | RE2 remake, 2019 | Un PNG transparent | Menu, sélection Versus, DEV |
| Licker | RE2 remake, 2019 | Un PNG transparent | Menu, DEV |
| Hunter α | RE remake, 2002 | Un PNG transparent | Menu, DEV |
| Nemesis stade 1 | RE3 remake, 2020 | Un PNG au lance-roquettes, un corps sans arme | Menu, sélection Versus, DEV ; variante sans arme téléchargeable |

Le lot contient **4 identités et 5 PNG**, soit **11 752 490 octets** de fichiers PNG. Les dimensions, les empreintes SHA-256, l’alpha mesuré, les pivots et la provenance sont enregistrés dans [le manifeste](../assets/sprites/bow/manifest.json). Les prompts exacts et les références locales sont conservés avec les fichiers.

Les incarnations Licker 2019 et Hunter 2002 appartiennent au catalogue expérimental. Elles ne remplacent pas les versions 1998 et 1996 du roster principal. La surcouche des portraits utilise uniquement les identités exactes Tyrant RE2R et Nemesis RE3R. Elle conserve le canvas original, le rétablit si le PNG échoue et rejette les résultats de chargements devenus obsolètes.

Les cinq fichiers sont des poses entières statiques. Le lot ne contient pas de rig de membres, de clip animé ni de nouvelle vue opposée. La variante de Nemesis ne constitue pas une arme amovible. Les images sont des interprétations générées appuyées sur des références ; leur conformité géométrique 1:1 n’est pas certifiée. Le rendu des combats conserve ses animations existantes. Voir [SPRITES_R20.md](SPRITES_R20.md).

## Vérifications du candidat

Le résumé de la suite complète est conservé dans [R20_VERIFY_RESULTS.json](R20_VERIFY_RESULTS.json). Les résultats HTTP détaillés et leurs empreintes sont regroupés dans [R20_HTTP_TESTS.json](R20_HTTP_TESTS.json).

**`npm run verify` : 605 contrôles réussis, 0 échec, sortie 0 dans une seule exécution complète. `npm run build` : sortie 0.** Le total de 605 correspond aux lignes `PASS` réellement émises ; il n’additionne pas les exécutions intermédiaires. Les 155 scénarios HTTP ci-dessous sont présentés séparément.

| Recette HTTP Chromium | Contrôles réussis |
| --- | ---: |
| Menu principal R20 | 17 |
| Pages joueur et séparation DEV R20 | 16 |
| Sprites R20 | 8 |
| Livraison / conclusions R10 | 22 |
| Lucas R11 | 8 |
| Vol et atterrissage R12 | 8 |
| Archives de replay R13 | 8 |
| Scènes Baker R14 | 8 |
| Audio Baker R15 | 10 |
| Audio du duel R16 | 12 |
| Repères textuels R17 | 12 |
| Dossiers et contextes R18 | 10 |
| Sauvegardes R19 | 16 |
| **Total HTTP** | **155** |

Les trois nouvelles recettes comptent **41 contrôles** et les dix recettes historiques **114**. Elles ont été exécutées avec Chromium 153.0.8010.0 sur un serveur HTTP local, aux largeurs 1 440 et 390 pixels. Les captures ont été inspectées. Les défauts trouvés puis corrigés comprennent le débordement du menu principal, des filtres Dossiers, de l’import des Opérations et du sélecteur de sprites DEV, ainsi que la hauteur variable des en-têtes.

La revue finale des huit pages joueur et des fenêtres Techniques / Conclusions à 390 pixels trouve zéro lien local cassé, zéro lien technique visible, zéro débordement horizontal et zéro erreur de page. La preuve est conservée dans [R20_NAVIGATION_REVIEW.json](R20_NAVIGATION_REVIEW.json).

Les contrôles grand texte et contraste renforcé concernent le menu, les Dossiers et Versus ; les autres pages ont été contrôlées en présentation normale. Le refus de l’API plein écran est testé, avec un message utilisable. Une entrée puis une sortie réussies du plein écran sur matériel réel restent à vérifier. Les commandes de manette sont injectées via l’API du navigateur, sans prétendre constituer un essai de manette physique. Les erreurs de stockage, certains événements de restauration de page et les pannes réseau explicitement nommés dans les rapports sont des injections contrôlées.

### Adaptations des tests historiques

Les contrôles du Codex et du catalogue vérifient séparément les présentations joueur et DEV. Les 389 fiches du Codex, les 115 diagnostics de combattants et les 274 fiches complémentaires restent parcourus. Les liens, filtres, identités, techniques et retours de focus demeurent contrôlés. La recette de sauvegardes vérifie l’absence de téléchargement Excel dans le parcours joueur, puis télécharge les mêmes octets depuis la page DEV.

Les contrôles d’intégrité historiques conservent leurs ensembles d’origine. [R20_PRESENTATION_BASELINE.json](R20_PRESENTATION_BASELINE.json) enregistre les empreintes avant et après des trois seuls modules de présentation existants modifiés : `catalog-page-v070.js`, `codex.js` et `movesets.js`. Les huit tests de refus de conservation injectent des lectures altérées en mémoire : un fichier moteur modifié, un ancien asset modifié ou absent, un ajout hors du dossier de sprites, une nouvelle modification non revue de la présentation ou une altération des sauvegardes R19 sont toujours rejetés.

## Contrats et données conservés

La comparaison avec R19 confirme les octets identiques des trois modules de contrat. Leurs validateurs ont également réussi. Voir [R20_CONTRACTS_PRESERVATION.json](R20_CONTRACTS_PRESERVATION.json).

| Contrat | Empreinte logique |
| --- | --- |
| Runtime 0.7.3 | `612953ce952cdd2bd6b5dd21a489bc961c2bfcc3ff1321d15528e341f34ee67d` |
| Journal contextuel | `4af946077d25392fb409ab18d6ed619bc955610ab4a17c38863a2921513977f6` |
| Replay du catalogue | `7481cce1dabb7aab981422cd28448648476e60737991e764783118ae038e2ca0` |

Les 508 ressources historiques et les 19 fichiers de données sont vérifiés à l’octet près. Les modules de sauvegarde R19 et son classeur sont protégés séparément. Le catalogue conserve **115 combattants principaux, 231 profils expérimentaux, 43 rencontres contextuelles et 52 arènes**. Aucun profil expérimental n’est promu dans le roster principal par cette livraison.

## Reproduire et poursuivre

```sh
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.80 playwright@1.64.1
npx playwright install chromium
npm run verify
npm run build
npm run verify:r20:http
```

Un Chromium existant peut être sélectionné avec `CHROME_BIN`. La recette R20 possède un workflow GitHub Actions dédié ; les preuves HTTP et captures sont conservées dans les artefacts de cette exécution. Le build vérifie aussi que le registre compilé des sprites correspond au manifeste livré.

[Le classeur R20](planning/BOW_INTERFACE_SPRITES_R20.xlsx) contient trois feuilles : Suivi, Sprites et QA. Il suit 27 chantiers et les 389 identités, dont 385 restent sans nouveau PNG R20. Les 15 lots globaux de production demeurent ouverts. La validation des appareils physiques, des lecteurs d’écran, du rendu final par incarnation, des animations et de la fidélité canonique complète reste documentée comme travail à réaliser.
