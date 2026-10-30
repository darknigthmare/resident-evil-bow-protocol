# Resident Evil — B.O.W. Protocol : guide des agents

Ces consignes concernent uniquement `darknigthmare/resident-evil-bow-protocol`.
Les demandes de l’utilisateur définissent le périmètre de chaque intervention.

## Commencer par la base réelle

1. Relever la branche, le commit et les modifications déjà présentes avant toute édition.
2. Lire `package.json`, le point d’entrée concerné et un exemple fonctionnel du même sous-système.
3. Lire [le guide gamedev](docs/GAMEDEV_GUIDANCE.md), puis uniquement les guides amont utiles à la tâche.
4. Lire les preuves et limites du lot courant : [application R32](docs/GAMEDEV_APPLIED_R32.md), [livraison R31](docs/R31_DELIVERY.md) et [suivi R31](docs/FIDELITE_R31.md). Rechercher les lots plus récents lorsqu’ils existent.

La référence initiale est `413b89bfafc18abc55be1404ff77bdaf573b1334`, version de package `0.7.3`, avec les ajouts R30–R31 fusionnés. Le titre R20 du README ne suffit pas à identifier le dernier état du projet.

Le jeu utilise son moteur JavaScript/Canvas existant, des scripts navigateur et des modules de présentation. Node sert à l’outillage et au build statique. Vérifier le montage HTML et les symboles réellement utilisés avant de modifier un script : `type: module` dans le package ne transforme pas tous les scripts navigateur en modules ES.

## Utiliser les guides de façon ciblée

Le catalogue de référence est `gamedev-skills/awesome-gamedev-agent-skills`, figé au commit `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`. Les liens exacts et le raccordement aux fichiers du projet figurent dans le guide gamedev.

| Travail demandé | Guides à lire |
| --- | --- |
| Commandes, manette, remappage, mémorisation d’un appui | `input-systems` ; `physics-tuning` si la simulation est touchée |
| Lisibilité d’un impact, pause d’impact, recul visuel | `game-feel` ; `camera-systems` ou `audio-design` selon l’effet |
| Sprite, portrait, animation, cohérence des proportions | `create-game-assets` |
| Décisions de l’adversaire | `game-ai` |
| Menus, HUD, navigation et accessibilité | `game-ui-ux` |
| Sauvegarde, restauration et import/export des replays | `save-systems` |
| Commandes rejouées ou simulation d’un replay | `input-systems` et/ou `physics-tuning` selon la modification, avec les contrats du projet |
| Coût de rendu, décodage, fluidité, mémoire | `performance-optimization` |

Annoncer la sélection et son objectif. Lire le corps du `SKILL.md` choisi avant de l’appliquer ; ouvrir ses références au besoin. Si une source est inaccessible, le signaler et continuer avec les contrats établis par le code et les tests, sans inventer son contenu.

Conserver le moteur et les dépendances du projet. Les exemples Godot/Unity/Unreal des guides illustrent des principes ; leur API ne doit pas être copiée dans le runtime JavaScript. Les outils 3D de préparation d’assets ne définissent pas à eux seuls le moteur de combat. Une migration doit correspondre à une demande explicite du projet.

## Contrats propres à ce jeu

- Préserver les identifiants et la séparation entre combattants principaux, prototypes isolés et exercices contextuels. Une entrée de catalogue n’est pas une preuve de combattant terminé.
- Documenter chaque incarnation par jeu, édition, forme/phase, anatomie, locomotion et attaques attestées. Distinguer information canonique, référence visuelle, source native, rendu dérivé, création générée et adaptation de combat 2D.
- Garder les proportions, orientations, appuis, pivots et silhouettes cohérents avec l’incarnation concernée. Un portrait, une pose fixe ou un geste observé ne valide pas une animation de combat complète.
- Pour les commandes et les coups, vérifier les états de début, activité et récupération, les contacts, la garde, les interruptions, les ressources et les changements de côté dans les mécanismes réellement présents. Les valeurs d’équilibrage de notre adaptation ne sont pas des valeurs originales Capcom.
- Relier les effets à des événements confirmés. Préserver la lecture des commandes pendant les effets, les contrôles de pause, les options d’animations réduites et la séparation entre présentation et état simulé.
- Conserver le pas fixe et l’aléatoire contrôlé par la graine du combat. Un effet qui change le temps simulé, les contacts ou l’issue d’une partie relève des règles de combat et doit aussi être vérifié contre les contrats de replay.
- Préserver les contrats de replay, les sauvegardes existantes, les validations d’import et la protection des écritures concurrentes. Une incompatibilité doit être expliquée ; elle ne justifie pas l’effacement silencieux d’une progression.
- Mesurer une optimisation sur un scénario documenté avant/après. Les intervalles `requestAnimationFrame` et le budget des lecteurs d’images ne certifient ni la cadence de l’écran physique ni la mémoire totale du GPU.
- Conserver le parcours joueur et l’accès dédié aux outils DEV. Les détails d’audit et de production restent dans leurs écrans de développement.

## Modifier et vérifier

1. Reproduire le problème ou préciser le résultat attendu et les fichiers concernés.
2. Choisir une modification cohérente avec le lot et ses contrats ; utiliser les fonctions et événements existants.
3. Lire les workflows et tests pertinents avant d’exécuter des générateurs. Certains scripts réécrivent des preuves, classeurs ou contrats.
4. Exécuter la vérification adaptée au risque ; conserver les commandes, le commit, les résultats et les limites observées.
5. Pour un changement de comportement ou de présentation, vérifier le parcours réel dans le navigateur et les cas de reprise utiles. Un contrôle statique ne vaut pas une recette de jeu.
6. Mettre à jour le suivi de la tâche lorsque le contenu change, avec une preuve proportionnée. Garder ouverts les critères non démontrés.

Commandes existantes : `npm start`, `npm run verify`, `npm run build`, `npm run verify:r20:http`. À partir de R32, `npm run verify` exige les suites courantes et les deux assertions de conservation sur l’archive publiée R31. `npm run verify:r32:http` contrôle les nouvelles interactions navigateur. Le workflow R31 distingue provenance/build sur l’archive publiée et anciennes recettes navigateur sur la révision courante. Lire [le partage des validations](docs/GAMEDEV_APPLIED_R32.md) avant de lancer un générateur de rapports. Reprendre les versions d’outils épinglées dans les workflows concernés.

Pour une modification documentaire seule, vérifier les liens, les chemins, les instructions et le diff. Ne pas régénérer les données du jeu ou les preuves historiques pour cette seule raison. Ne pas annoncer les tests de gameplay comme exécutés s’ils ne l’ont pas été.

## Respecter la conservation et la provenance

`scripts/audit-delivery-r31.py` compare le lot à sa référence R30 et protège les fichiers historiques, les données et les anciennes feuilles du classeur. Lire ses règles avant toute modification dans ces périmètres. Une évolution ultérieure du moteur doit avoir son propre périmètre, ses preuves et sa stratégie de compatibilité ; conserver la possibilité de vérifier les archives publiées.

Éviter de réécrire un rapport ancien, de modifier une empreinte attendue ou de retirer une assertion pour faire disparaître un échec. Rechercher sa cause et distinguer la validation historique de la validation de la nouvelle évolution.

La définition de « terminé » comprend : comportement livré, vérification pertinente, intégration observée, provenance, suivi et limites explicites. Une suite verte ne certifie pas à elle seule la fidélité artistique globale 1:1.
