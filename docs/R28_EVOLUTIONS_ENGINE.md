# Évolutions volontaires R28

Le mode R28 permet de choisir une mutation pendant un vrai duel, puis de poursuivre avec le profil, les techniques, la ressource et la silhouette de l’UID cible. Les 42 formes de 15 familles sont regroupées sous leur personnage de base. Les jeux originaux et leurs remakes restent des familles distinctes.

Le graphe contient 26 liens examinés : 17 passages admis au duel et 9 passages retenus comme phases de contexte. Les 24 citations proviennent de pages secondaires déjà capturées dans le dépôt. Chaque citation renvoie à une URL, une archive, son SHA compressé et son SHA décompressé ; le constructeur vérifie le texte exact. Les conditions de combat ci-dessous sont des règles de cette adaptation, pas des conditions certifiées des jeux Capcom.

## Conditions et comportement

Le joueur choisit explicitement la forme cible. La mutation exige 35 points de jauge, 70 % de vie ou moins, au moins 120 ticks écoulés, une posture neutre au sol et la fin de ses propres projectiles et dispositifs. Le passage a lieu au tick suivant après une nouvelle vérification. Il coûte 35 points et impose 24 ticks de récupération vulnérable. Il ne se déclenche jamais automatiquement, y compris pour les personnages contrôlés par l’IA ; les deux camps peuvent recevoir un choix volontaire en mode spectateur.

La vie, la garde, les dégâts récupérables, le budget de régénération consommé, les afflictions et les récupérations des techniques restent en place. La fraction de ressource disponible est transférée à la ressource de la nouvelle forme, en tenant compte des ressources inversées de chaleur/coût. Les bonus temporaires sont retirés. Aucune guérison ni restauration de munition ne résulte du passage. Les tours suivants suivent les règles de réinitialisation ordinaires, en conservant la forme atteinte.

Les passages sont orientés : aucun retour à la forme humaine, aucun saut d’étape et aucune fusion entre incarnations. La scie de Jack reste un équipement de sa forme humaine. Sa masse géante, les cinquièmes formes de G, l’Alexia enracinée et les phases ancrées de Nemesis restent dans les rencontres de contexte. Le passage narratif de Lucas vers sa forme de Not a Hero est signalé comme adaptation de duel entre profils, sans prétendre rejouer la chronologie.

## Conservation et replay

Le moteur historique CQC 0.60, ses alias et les formats R7/R13 sont conservés. Le mode R28 utilise un moteur d’extension explicite et le format `re.bow.evolution-duel-replay/1`, avec les commandes de mutation des deux camps dans les blocs d’entrée. La relecture reconstruit un duel neuf, les décisions de l’IA et chaque passage ; aucune vie ou définition de personnage n’est importée. Un contrat SHA lie les fichiers du moteur, des profils, du graphe et du replay. Les anciens et nouveaux lecteurs refusent mutuellement leurs formats.

Les fichiers restent exportés seulement à la demande. Ce mode ne produit aucune récompense de campagne et n’écrit pas dans ses sauvegardes. L’intégrité vérifiée est un contrôle de corruption et de compatibilité, pas une signature contre la modification hostile locale.

## Vérification

`python scripts/build-evolutions-r28.py --check` vérifie citations, archives, graphes et contrat. `node tests/verify-evolutions-r28.mjs` teste les 17 passages réels, les limites, les deux camps, les refus de contexte, la récupération vulnérable et la relecture. Un duel naturel Tyrant RE2 remake contre Nemesis RE3 remake, graine 7070, atteint l’éligibilité au tick 678 sans modifier de vie, jauge, position ou état ; le passage choisi est enregistré au tick 679 et reconstitué avec recherche avant/après.

Les graphismes emploient les ressources disponibles et les limitations de leurs registres. Cette livraison ne fournit aucune nouvelle animation officielle de transformation et ne certifie ni dimensions, ni gestes, ni fidélité globale 1:1. Le graphe est limité aux relations examinées et reste extensible lorsque des références suffisantes existent.
