# Application R34 — portraits, poses complètes et sélection de l’arène

La base de ce lot est R33, commit `6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5`. Les 115 combattants principaux et les 231 prototypes font l’objet de deux demandes d’image chacun : portrait, puis pose de combat en pied. Les 43 exercices contextuels ne sont pas ajoutés à ce périmètre. Les refus historiques restent conservés.

## Guides lus et décisions

Les guides sont ceux du catalogue figé par [GAMEDEV_GUIDANCE.md](GAMEDEV_GUIDANCE.md), au commit `19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`.

| Guide | Application concrète |
| --- | --- |
| `create-game-assets` | Chaque image générée conserve ses octets d’origine, sa requête, ses références avec empreintes, son incarnation et une revue visuelle. Le portrait et le corps sont deux qualifications distinctes. |
| `game-ui-ux` | Le parcours joueur devient personnages → arène → combat, avec retour, focus et dispositions étroites. Les contrôleurs existants conservent leurs URL et leurs contrats. |
| `input-systems` | Le menu masque les manettes au contrôleur de combat, puis attend leur relâchement avant de rendre les entrées. Un appui de confirmation ne doit pas devenir une attaque ou une pause. |
| `performance-optimization` | Les PNG générés mesurent généralement 1254 × 1254 pixels ; la sélection affiche des miniatures décodées de 256 pixels au maximum. Les réservations transitoires et permanentes passent par le budget d’images existant. Les recettes mesurent les dimensions et les crédits réellement observés, sans conclure à une cadence physique ou à la mémoire totale du GPU. |

## Référence visuelle et admission

Une vue native en T peut documenter le corps sans être une animation idle admissible. Inversement, un ancien indicateur « corps entier » ne dispense pas d’ouvrir l’image : une arme, une queue ou des pieds coupés restent des limites de référence. Les références d’une autre phase ou édition sont écartées de la requête, ou déclarées comme non qualifiées. Une source complète nouvellement retrouvée conserve sa page, son URL et son empreinte.

Les portraits acceptés sont recadrés uniquement à l’affichage. Le recadrage doit avoir été regardé ; il ne doit pas montrer un détail périphérique reconnu comme non vérifié. Ce recadrage n’écrit pas un nouveau PNG et n’ajoute pas une génération au compteur.

Une nouvelle pose par défaut exige une référence de corps complet effectivement utilisée, la silhouette entière dans l’image, une pose de combat revue et une orientation vers la droite. Les marges et l’alpha sont contrôlés. L’image reste une adaptation générée et statique d’une image ; elle ne devient ni sprite original Capcom, ni cycle idle original, ni preuve de fidélité artistique globale 1:1. Les vues gauches ou frontales peuvent être conservées comme études sans remplacer le défaut droit. Les asymétries ne sont pas validées par un miroir automatique.

Les couleurs RGB stockées sous un alpha nul restent invisibles dans le jeu. Une prévisualisation qui les révèle ne suffit pas à prouver un halo. La revue utilise le vrai compositing du navigateur avant de demander une correction ; aucune suppression des canaux cachés n’est appliquée aux PNG d’origine.

Lorsqu’un conflit de référence est découvert, le repli ancien est lui aussi examiné. Pour Steve, le rendu violet du catalogue diffère du visage humain et du corps vert de la capture CODE: Veronica. Son édition reste non établie ; la décision ne lui attribue pas une autre édition par supposition. Le portrait généré est conservé comme étude, et les anciennes présentations issues de la même source sont retenues hors défaut R34. Le combattant reste sélectionnable avec un emplacement de portrait à documenter.

Les refus de l’outil sont conservés sans nouvelle demande sur le même sujet. Ils ne sont pas contournés par une variante moins graphique ou par la phase suivante. Une référence insuffisante produit un état explicite avec le motif et les recherches concrètes, plutôt qu’une anatomie inventée.

## Parcours et conservation

Les trois montages joueurs chargent `selection/prepare.js` dans le `head`, avant les contrôleurs. La préparation empêche le démarrage pendant le chargement du menu. `selection/flow.js` monte le parcours après les autres scripts. La confirmation des deux personnages ouvre la galerie des arènes ; son bouton Combattre démarre ensuite la session. Le retour restaure les choix des personnages, formes et apparences.

Le moteur, ses règles, ses données, ses sauvegardes et ses replays publiés restent conservés. Les nouveaux lecteurs de présentation R34 utilisent les mêmes API que les lecteurs précédents. Les registres anciens servent de repli lorsque la nouvelle image n’est pas admise ; leur disponibilité n’est pas comptée comme une nouvelle génération.

Une absence du registre ne suffit pas à empêcher le moteur historique de dessiner sa photographie. La barrière R34 est donc montée après le renderer, avant les premiers contrôleurs, puis réinstallée après les adaptateurs. Son installation est idempotente. Elle bloque les anciennes images retenues dans tous les états et orientations, y compris le tout premier dessin d’une URL contenant un personnage. Un marqueur neutre remplace la vue indisponible ; aucune anatomie n’est inventée. Une nouvelle pose en cours de décodage reste sur son lecteur vérifié, et les choix natifs qualifiés conservent leur priorité.

Les corrections d’images importées utilisent une révision explicite par empreinte, avec conservation exacte de l’ancien PNG et de son reçu. Une nouvelle source peut rouvrir un état `HELD_REFERENCE` par l’empreinte de son reçu. Les refus ne peuvent être promus. Les imports partagent un verrou par identité, relisent les préconditions sous verrou et publient une paire PNG/reçu cohérente ; les tests comprennent une vraie concurrence contrôlée et la conservation des archives.

Le rollback du tout premier import retire aussi le reçu neuf si la validation finale échoue, afin de ne pas laisser un état `GENERATED` sans PNG. Les deux nouveaux cas de régression vérifient la suppression de la paire neuve avec possibilité de recommencer, puis la restauration exacte d’une paire préexistante lors d’une révision échouée.

Les anciennes recettes navigateur R31–R33 s’exécutent avec la présentation de compatibilité explicitement activée par `?dev=1&selection=direct`, qui expose le dialecte d’images R33. Leurs assertions originales ne sont pas modifiées. Cette recette vérifie les anciens contrats d’interaction sur les contrôleurs courants ; elle n’atteste pas le nouveau parcours par défaut ni les nouvelles images. Les recettes R34 les vérifient séparément, sans cette option.

Les douze recettes navigateur antérieures encore montées directement sur les contrôleurs courants utilisent aussi cette fixture explicitement, dans 65 appels répartis entre 21 workflows. Les publications R25–R30 épinglées restent intactes. La fixture masque uniquement la barre DEV qu’elle a introduite artificiellement pour une URL publique ; un marqueur d’URL conserve cette distinction au retour d’historique, sans modifier le stockage ni `history.state`. Une URL explicitement DEV et l’outil catalogue conservent leur navigation.

La découverte du propriétaire du lien primaire dans la recette R24 est corrigée : le lien DEV « Ajouts R33 » ne remplace pas « Sources et chantiers ». Les assertions d’unicité, de visibilité, de destination et de navigation restent intactes. Le garde vérifie la transformation exacte et son inverse ; ce correctif ne modifie aucun lien du produit.

Les contrôles originaux du moteur et des entrées continuent sur le code soumis. Le workflow de provenance R33 utilise son commit publié, tandis que ses recettes navigateur continuent sur le code courant avec la compatibilité déclarée. Le garde R34 décrit exactement les 30 fichiers historiques modifiés : huit montages initiaux, 21 workflows et la découverte du propriétaire du lien R24. Il exécute les cas R33 et R32 inchangés après projection des montages explicitement revus.

## Preuves

Les recettes et limites finales figurent dans `R34_SELECTION_BROWSER.json`, `R34_ASSETS_TESTS.json`, `R34_ASSETS_BROWSER.json`, `R34_ROSTER_RUNTIME_TESTS.json`, `R34_ROSTER_RUNTIME_BROWSER.json`, `R34_CURRENT_GUARD_TESTS.json` et `R34_CI_VALIDATION.json`. Le suivi Excel exige des rapports positifs, courants par empreinte, sans tests sautés ni mode provisoire avant de publier sa validation finale.

Le classeur R34 conserve les 70 feuilles R33 et ajoute quatre feuilles de suivi. Les 692 sorties demandées sont suivies individuellement. Les anciens chantiers non démontrés restent ouverts. L’intégration, la reproduction du classeur, le build local et la conservation de l’index Git disposent de preuves séparées ; une compilation locale des définitions CI ne constitue pas un résultat d’exécution distant.
