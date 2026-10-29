# Guides gamedev appliqués à Resident Evil — B.O.W. Protocol

## Objet et références

Ce document transforme les guides transversaux d’[awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) en consignes adaptées au jeu de combat 2D existant. Il sert à choisir les bons guides, retrouver les fichiers responsables et définir une preuve de résultat pour chaque chantier.

| Référence vérifiée le 29 octobre 2026 | Valeur |
| --- | --- |
| Projet | `darknigthmare/resident-evil-bow-protocol` |
| Base de cette intégration | `main`, commit `413b89bfafc18abc55be1404ff77bdaf573b1334` |
| Version du package | `0.7.3` |
| Base publiée du cadre | R31, après fusion des ajouts R30–R31 ; application suivante documentée dans [R32](GAMEDEV_APPLIED_R32.md) |
| Catalogue de guides | Commit `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9` |
| Mode d’utilisation | Lecture ciblée de guides à révision fixe, complétée par les contrats du projet |

Consulter [la livraison R31](R31_DELIVERY.md), [son suivi](FIDELITE_R31.md) et [son classeur](BOW_FIDELITE_R31.xlsx) pour l’état du contenu. Le présent document ajoute un cadre de travail ; il n’atteste aucune nouvelle animation, correction de gameplay ou certification de fidélité.

La base distingue 115 combattants principaux, 231 prototypes isolés et 43 exercices contextuels. Ces catégories doivent rester séparées dans le suivi. Les 389 identités ne sont pas 389 combattants finalisés en fidélité 1:1. Les chantiers R31 conservent leurs critères encore ouverts.

## 1. Raccordement au moteur réel

Le [router amont][router] et sa [référence pour moteurs personnalisés][custom-engine] demandent de partir des points d’entrée, du cycle de vie et des API réellement présents. Pour ce dépôt, les repères sont les suivants :

| Responsabilité | Fichiers à consulter avant modification |
| --- | --- |
| Exécution et build statique | `package.json`, `scripts/dev.mjs`, `scripts/build.mjs` |
| Montage du Versus et de ses surcouches | `modules/versus.html`, `catalog-duel.html`, `modules/fidelity-r28/evolutions/index.html` |
| Entrées, boucle de combat, profils IA et replays | `src/unified-engine-v060.js`, `src/combat-foundation-v060.js`, `src/catalog-duel-v070.js`, `src/trial-input-v071.js` |
| Présentation et cadrage | `src/re-renderer.js`, `src/combat-camera-v060.js`, `src/fighter-directions.js` |
| Contacts et points faibles | `src/lab-contact-v073.js`, `src/spatial-weakpoints-v072.js` |
| Menus, navigation et préférences | `src/game-menu-r20.js`, `src/menu-navigation-r20.js`, `src/interface-preferences-r20.js` |
| Sauvegardes et lecture de replays | `src/save-center-r19.js`, `src/replay-vault-r13.js`, `src/catalog-replay-contract.js`, `modules/fidelity-r31/persistence/` |
| Présentation actuelle et gestion des images | `modules/fidelity-r31/combat/`, `modules/fidelity-r31/performance/` |
| Validation courante et historique | `.github/workflows/ci.yml`, `.github/workflows/source-fidelity-r31.yml`, `scripts/audit-delivery-r31.py` |

Suivre les appels depuis le montage HTML jusqu’à leur propriétaire. L’existence d’un module plus récent ne signifie pas qu’il remplace toutes les anciennes fonctions. Préserver les identifiants, l’ordre de chargement nécessaire et les contrats de communication entre couches.

Le contrôleur utilise déjà un pas fixe de `1000/60` ms et appelle `Combat.step` depuis un accumulateur ; `requestAnimationFrame` cadence l’affichage. Les règles emploient une graine de simulation. Préserver ces contrats : un changement du temps simulé ou des contacts modifie potentiellement le résultat et la compatibilité des replays, même s’il est présenté comme un effet de pause d’impact.

Le package ne déclare pas de framework de jeu. Les exemples d’autres moteurs dans les guides restent des illustrations à traduire vers le JavaScript du projet. Les versions de moteur citées par le catalogue ne sont pas des objectifs de migration ; voir [la politique amont de versions][versions].

## 2. Guide à sélectionner selon le chantier

Lire les guides de la ligne correspondant au travail en cours. Ajouter un autre guide seulement lorsqu’une seconde responsabilité est réellement touchée.

| Chantier | Guides | Application et preuve attendue |
| --- | --- | --- |
| Commandes et contrôles | [input-systems][input], puis [physics-tuning][physics] si nécessaire | Partir des actions, bindings et sources d’entrée existants. Vérifier appui/maintien, remappage, conflits P1/P2, manettes, perte de focus, pause et consommation unique d’une commande mémorisée. |
| Combat et feedback | [game-feel][feel] ; [physics-tuning][physics] si les durées, collisions ou la simulation sont touchées | Décrire les effets par événement confirmé. Contrôler qu’un impact produit son feedback une seule fois, que l’effet se termine et que les commandes restent prises en compte. Les collisions et les durées appartiennent à la simulation. |
| Adversaires | [game-ai][ai] | Étendre les profils et niveaux déjà présents. Distinguer décision, exécution et présentation ; éprouver portée, garde, récupération et ressources dans des situations reproductibles. |
| Sprites, portraits et mouvements | [create-game-assets][assets] | Réutiliser les manifestes et preuves existants. Qualifier source, incarnation, vue, dimensions, alpha, pivots, appuis et états. Vérifier le rendu à l’échelle du jeu, dans les deux orientations réellement prises en charge. |
| Caméra et arènes | [camera-systems][camera], [level-design][level] selon la demande | Contrôler le cadrage des deux acteurs, les bords de scène, les transitions et la lisibilité des points faibles. Préserver l’accord entre fond visible, espace de combat et règles de scène. |
| Menus, HUD et accessibilité | [game-ui-ux][ui] | Garder une navigation complète au clavier/manette, la restauration du focus, les options R20 et le parcours DEV dédié. Vérifier petits écrans et agrandissement du texte sur les écrans modifiés. |
| Audio | [audio-design][audio] | Partir des événements et lecteurs audio existants. Vérifier déclenchement, superpositions, volumes et lisibilité à l’écoute. Conserver la distinction entre fichier disponible, écoute documentée et attribution validée à une action. |
| Sauvegardes et import/export des replays | [save-systems][saves] | Préserver schémas et validations. Vérifier import invalide, aperçu, journal préalable, rechargement, retour arrière et conflit entre onglets dans les mécanismes existants. |
| Commandes rejouées et simulation d’un replay | [input-systems][input] et/ou [physics-tuning][physics] selon la modification | Préserver l’ordre des commandes, le pas de simulation, les contrats et le moteur de lecture compatible. `save-systems` ne définit pas les règles de simulation du replay. |
| Performances | [performance-optimization][perf] | Relever une situation initiale, isoler le coût observé, puis mesurer à conditions comparables. Respecter le budget coordonné des lecteurs R31, leurs évictions, reprises et nettoyages. |

Le catalogue consulté ne fournit pas de guide de genre dédié au jeu de combat 2D. La section suivante est notre complément spécifique. Les tests du catalogue vérifient ses guides et ses outils ; la recette du jeu reste celle de B.O.W. Protocol.

## 3. Complément propre au combat 2D

Pour une technique modifiée, consigner son incarnation, sa commande, son coût, les états de préparation/activité/récupération et les résultats attendus. Décrire uniquement les mécanismes réellement implémentés ou demandés.

| Aspect | Cas de validation à choisir selon la modification |
| --- | --- |
| Temps et commandes | Même comportement aux cadences de rendu testées ; fenêtre de commande bornée ; absence de double consommation ; reprise après pause ou perte de focus. |
| Contacts | Contact et coup dans le vide ; garde ; limite de portée ; orientation gauche/droite ; projectiles rapides si concernés ; distinction des zones de frappe, de vulnérabilité et de séparation lorsqu’elles existent. |
| États et interruptions | Début/fin d’attaque, récupération, interruption autorisée/interdite, réception d’un coup, KO et nouvelle manche ; absence d’état bloqué. |
| Ressources | Coût payé une fois, seuils respectés, consommation/refus expliqués, interaction avec les mutations ou modificateurs existants. |
| Présentation | Pose et effet alignés avec le moment du contact ; appuis stables ; silhouette lisible ; fin de la pause d’impact ; option de mouvement réduit respectée. |
| IA | Décision valide dans son état, sa portée et ses ressources ; temps de réaction correspondant au profil configuré ; aucune nouvelle lecture de commandes cachées introduite par le correctif. |
| Replays et restauration | Contrat compatible ou refus explicite ; même scénario rejoué avec les données attendues ; sauvegarde/reprise sans perte de progression ni effacement silencieux. |

Ces contrôles sont à sélectionner selon le risque. Une correction de texte n’exige pas une nouvelle campagne de simulation. Une nouvelle mécanique nécessite en revanche une preuve de comportement, et pas seulement la présence d’un fichier ou d’une entrée dans un classeur.

Les durées, dégâts, priorités, collisions et ressources de l’adaptation doivent être décrits comme des choix de notre combat 2D lorsque leurs valeurs originales ne sont pas attestées. Aucun guide générique ne certifie la fidélité à Resident Evil.

## 4. Production d’assets et fidélité

Le guide `create-game-assets` apporte une méthode de production : examiner la direction existante, définir les contraintes, produire des éléments cohérents, vérifier leurs propriétés puis les regarder dans le jeu. Utiliser les manifestes et suivis déjà en place comme source de vérité.

Pour chaque asset ou mouvement livré, conserver :

- L’identité, le jeu, l’édition, la phase et l’usage prévu : portrait, référence, corps de combat, pose ou séquence.
- L’origine et la qualification de la preuve : source documentée, source native, dérivation de rendu ou création générée ; les transformations appliquées.
- Les dimensions, l’alpha, l’ancrage, l’orientation, les proportions et les états réellement produits.
- La vérification technique et l’inspection à l’échelle de jeu, avec les limites encore visibles.

Une pose fixe peut être un résultat utile tout en laissant l’animation ouverte. Une séquence native observée peut documenter un geste sans valider une attaque, un idle, une intro ou un KO. Mettre à jour uniquement les critères que la livraison démontre ; conserver les réserves artistiques et les décisions d’édition non résolues.

## 5. Vérifications existantes à réutiliser

Lire les commandes dans le `package.json` et les workflows du commit de travail. Les suites ci-dessous existent dans la base de référence. Leurs prérequis et versions d’outils viennent des workflows concernés, notamment Node `22.16.0`, `@napi-rs/canvas@0.1.80` et, pour les recettes navigateur, `playwright@1.64.1`.

| Périmètre | Commandes existantes pertinentes |
| --- | --- |
| Moteur et cohérence générale | `npm run verify` ; `npm run build` |
| Interface R20 | `npm run verify:r20:http` |
| Sprites R31 | `python3 tests/test_generated_sprites_r31.py` ; `node tests/verify-generated-sprites-r31.mjs` ; `node tests/browser-generated-sprites-r31.mjs` |
| Mouvements natifs R31 | `node tests/verify-native-motion-r31.mjs` ; `node tests/browser-motion-commands-r31.mjs` |
| Sauvegardes et replays R31 | `node tests/verify-persistence-r31.mjs` ; `node tests/browser-persistence-r31.mjs` |
| Audio R31 | `node tests/verify-audio-listening-r31.mjs` ; `node tests/browser-audio-r31.mjs` |
| Performances et accès R31 | `node tests/verify-performance-access-r31.mjs` ; `node tests/browser-performance-access-r31.mjs` |
| Intégration et conservation R31 | `node tests/verify-r31-integration.mjs` ; `python3 scripts/audit-delivery-r31.py --check` |
| Suivi R31 | `python3 scripts/fidelity-progress-r31.py check` ; `python3 scripts/fidelity-progress-r31.py reproduce` |

Certaines recettes écrivent des rapports ou produisent des captures. Les lancer dans un checkout adapté, examiner le diff et suivre l’ordre du workflow avant de publier une preuve. Une recette historique et une recette du montage courant ont des périmètres différents ; ne pas additionner leurs résultats comme s’il s’agissait de nouveaux tests identiques.

Depuis R32, `npm run verify` exige les 38 commandes originales qui restent sur la version courante, les nouveaux contrôles R32 et les deux suites de conservation exécutées sur l’archive publiée R31. `npm run verify:r32:http` vérifie les nouvelles interactions dans le navigateur. Le workflow R31 distingue les audits de provenance et de build sur le commit publié R31, et ses anciennes recettes navigateur exécutées sur la révision courante. Une preuve d’archive ne constitue pas une preuve d’exécution de R32. Voir [le détail et les limites de cette transition](GAMEDEV_APPLIED_R32.md). La sélection de commandes doit suivre les responsabilités réellement modifiées.

Pour les ajouts documentaires de cette intégration, les contrôles requis sont les liens, les chemins, la cohérence des consignes et le diff limité à `AGENTS.md` et ce document. Les tests de gameplay existants restent disponibles et les workflows GitHub gardent leurs déclencheurs actuels.

Le complément R32 du duel catalogue ajoute deux recettes à `npm run verify:r32:http` : les boutons de commande au clavier et la suspension/reprise des entrées à la perte de focus. Pour une commande maintenue, vérifier séparément l'appui, le relâchement, le changement de focus, l'interruption et la coexistence des appareils. Une activation native du bouton ne prouve pas que le moteur a reçu l'action : contrôler aussi l'état simulé et le replay enregistré.

Le lecteur de mouvements R31 applique également cette distinction : lecture/pause est une action ponctuelle, tandis que le parcours image par image conserve les répétitions. Sa recette `tests/browser-motion-input-r32.mjs` vérifie la première activation native, les répétitions et les raccourcis réservés, avec les médias réels en CI.

Le mode Combat avec évolutions possède son propre contrôleur de page et deux lecteurs de manette : commandes de combat/Start et évolution/Select. Une correction du catalogue doit donc être vérifiée séparément sur ce montage. La recette `tests/browser-evolution-input-r32.mjs` couvre le retour de focus, les boutons et les évolutions volontaires, puis rejoue l'ancienne recette R28 intacte sur le code courant en conservant son ancien rapport. Les contrats scellés du moteur restent distincts de ce contrôleur d'interface.

## 6. Utilisation lors des prochains travaux

1. Partir de la version courante et de la demande précise, puis sélectionner les guides pertinents.
2. Choisir une tâche encore ouverte du suivi ou un problème reproduit. Écrire le comportement attendu et la preuve qui permettra de l’accepter.
3. Retrouver le propriétaire dans le code et ses contrats ; implémenter une évolution délimitée.
4. Exécuter la vérification adaptée, inspecter le résultat visible lorsque nécessaire et consigner les limites.
5. Mettre à jour les preuves du nouveau travail et le suivi correspondant sans réécrire les acquis historiques.

Exemples : un défaut de remappage appelle `input-systems` et les tests d’entrée concernés ; un sprite rogné appelle `create-game-assets` et une inspection dans le montage réel ; un ralentissement appelle `performance-optimization` et une mesure reproductible. Le premier lot doit être choisi à partir du défaut ou du critère manquant effectivement constaté.

### Conservation R31

L’audit R31 protège les fichiers de sa référence R30 et conserve les feuilles historiques du classeur. Les ajouts `AGENTS.md` et `docs/GAMEDEV_GUIDANCE.md` sont extérieurs aux arbres de jeu figés et au registre des fichiers du module R31. Ils ne nécessitent pas de régénérer les rapports de conservation.

Une future évolution du gameplay doit expliciter sa nouvelle référence et ses preuves de compatibilité tout en gardant les anciennes versions vérifiables. Ne pas modifier les empreintes, assertions ou résultats anciens pour présenter une nouvelle version comme identique à une version publiée.

### Mise à jour du catalogue

La révision amont est volontairement fixe. Pour la mettre à jour, comparer les seuls guides utilisés, examiner leurs changements, vérifier leur compatibilité avec le projet, puis actualiser la référence dans les deux documents. Une mise à jour du catalogue ne change pas automatiquement le moteur ou ses dépendances.

## Sources des guides

Les liens ci-dessous pointent vers les textes originaux à la révision inspectée. Le catalogue est publié sous licence Apache-2.0 ; voir sa [licence][license] et son [NOTICE][notice]. Les consignes propres au combat, les chemins et la matrice de recette ci-dessus sont des adaptations pour ce projet.

[router]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/router/SKILL.md
[custom-engine]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/router/references/custom-engines.md
[versions]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/docs/VERSION-SUPPORT.md
[input]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/input-systems/SKILL.md
[physics]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/physics-tuning/SKILL.md
[feel]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/game-feel/SKILL.md
[ai]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/game-ai/SKILL.md
[assets]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/create-game-assets/SKILL.md
[camera]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/camera-systems/SKILL.md
[level]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/level-design/SKILL.md
[ui]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/game-ui-ux/SKILL.md
[audio]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/audio-design/SKILL.md
[saves]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/save-systems/SKILL.md
[perf]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/performance-optimization/SKILL.md
[license]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/LICENSE
[notice]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/NOTICE
