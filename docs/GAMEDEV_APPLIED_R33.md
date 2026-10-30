# R33 — couverture source, orientations et inventaire des manquants

R33 poursuit le chantier de fidélité sans réécrire les acquis R31/R32. Sa base est le commit R32 réussi `51044acfe1c2a5428a8de5e5b7ca188f4c69f53d`. La fidélité globale 1:1 reste **non certifiée** : ce lot ferme des manques de consultation et de couverture source précis, mais ne transforme pas des modèles communautaires, des poses statiques ou des adaptations générées en frames originaux Capcom.

## Principes appliqués

Le lot suit `create-game-assets` et `game-ui-ux` du catalogue gamedev référencé par le projet :

- préférer les octets source déjà archivés aux nouvelles générations lorsque ces sources existent ;
- préserver modèle, matériaux, textures, pose et transformations, puis déplacer uniquement la caméra pour documenter plusieurs côtés ;
- distinguer vue source, pose statique adaptée, animation native, frame original et usage en combat ;
- garder provenance, empreinte, édition, limites et décision d’admission à côté de chaque ajout ;
- vérifier la consultation au clavier, le reflow et l’inventaire complet plutôt que produire une galerie sans navigation.

Deux essais imagegen ont été produits pendant l’exploration (un recadrage de Lucas et une interprétation gauche du Zombie), puis **écartés du lot livré** au profit de transformations plus strictes : le Lucas R31 est seulement recadré par code, et le côté gauche du Zombie utilise directement une vue source du modèle déjà vérifiée.

## 1. Quatre variantes OBJ et seize vues natives générables

R26 conservait des modèles publiés qui n’avaient pas tous reçu leurs quatre vues R30. R33 rend accessibles exactement quatre variantes supplémentaires :

| Variante | Incarnation | Édition | Source conservée |
| --- | --- | --- | --- |
| `re0-zombie-gc-r26-1` | `re0-zombie` | GameCube 2002 | OBJ/MTL + cinq textures vérifiées |
| `re0-zombie-gc-r26-2` | `re0-zombie` | GameCube 2002 | OBJ/MTL + cinq textures vérifiées |
| `reoutbreak-zombie-uss-b-ps2-r26` | `reoutbreak-zombie` | PlayStation 2 2003 | OBJ/MTL + texture U.S.S. B |
| `reoutbreak-zombie-uss-c-ps2-r26` | `reoutbreak-zombie` | PlayStation 2 2003 | OBJ/MTL + texture U.S.S. C |

Le renderer `modules/fidelity-r33/native-renderer.js` relit chaque ressource via son nombre d’octets et son SHA-256 avant décodage. Il produit les angles 0°, 90°, 180° et 270° à 512×512 avec une caméra orthographique. Les garde-fous déclarent et vérifient :

- `geometryMirrored: false` ;
- `modelTransformsChanged: false` ;
- `poseChanged: false` ;
- aucune conversion arbitraire des unités source ;
- aucun bord alpha touchant le cadre ;
- matériau de revue non éclairé à partir des textures source, distinct du shader ou de l’éclairage du jeu original.

Cela représente **16 vues source dérivées**, pas 16 frames originaux du jeu. Les exports R26 proviennent d’une publication communautaire attribuée au jeu et au support ; leur égalité aux paquets Capcom bruts n’est pas certifiée.

## 2. Zombie remake 2002 — côté gauche source, sans miroir

R31 fournissait une pose 2D adaptée de profil droit du NakedZombie GameCube. Le suivi indiquait encore le côté opposé comme ouvert. Or les sources R31 contenaient déjà les quatre rendus du modèle, dont :

`modules/fidelity-r31/sprites/sources/views/re1r-zombie-naked-gc-r31/source-90.png`

R33 utilise directement cette vue à gauche, avec l’empreinte attendue
`079c75e094ad3ee0c79445b30d6aa19f76878876a406ce901a31e58342910fda`.

Elle est exposée comme **vue source statique non miroir**. Elle n’est pas installée comme idle de combat : aucune animation, transition, durée ou pose de gameplay originale n’est prouvée par cette image seule. Le costume/portrait historique reste inchangé.

## 3. Lucas muté — correction de cadrage déterministe

La revue R31 de `re7-lucas-baker-mutated` signalait seulement deux pixels de marge alpha16 au-dessus de la pointe la plus haute. R33 ne remplace pas l’illustration et n’ajoute aucune anatomie.

La page vérifie d’abord le PNG R31
`c52ea3e524fed6230118d609bc8434f6e52790575c02892287acaff44e52d414`,
puis le place dans un canevas transparent de 768 pixels avec 8 % de marge théorique. Le contrôle mesure les limites alpha16 et refuse la présentation si la marge effective devient insuffisante.

Ce changement améliore la lisibilité de la preuve existante ; les détails de surface du PNG R31 restent une interprétation générée et non des texels originaux certifiés.

## 4. Inventaire courant des 389 incarnations

La page R33 reconstruit l’inventaire depuis les deux données de production existantes, sans les modifier :

- 115 combattants principaux ;
- 231 prototypes isolés ;
- 43 rencontres contextuelles ;
- total : 389 identités uniques.

Elle affiche 24 entrées par page et permet recherche, filtre par catégorie et filtre sur les ajouts R33. Quatre identités reçoivent un signal R33 :

- `re0-zombie` — nouvelles vues natives ;
- `reoutbreak-zombie` — nouvelles vues natives ;
- `re1r-zombie` — orientation source gauche ;
- `re7-lucas-baker-mutated` — correction de cadrage de revue.

Les 385 autres restent visibles comme non modifiées par R33. Cela empêche de confondre « inventorié » avec « finalisé ».

## 5. Accès et validation

Le centre DEV ajoute un lien vers `modules/fidelity-r33/index.html`. Le parcours joueur reste inchangé.

Le lot possède une garde propre, `scripts/verify-current-r33.mjs`, basée sur le commit R32 réussi. Elle n’autorise que deux modifications d’existants : le lien DEV et l’évolution du garde R32 pour ignorer **uniquement** la liste explicite de fichiers R33. Tout le reste du lot est ajouté dans un nouvel espace.

`tests/verify-current-guard-r33.mjs` injecte 41 fautes : changements moteur/roster/replay, suppression de fichiers obligatoires, faux nombres de catalogue, revendication d’un frame original, miroir ou changement de pose, promotion de l’image gauche en idle, génération d’anatomie Lucas, source hors R26 et workflow non bloquant.

`tests/browser-r33.mjs` vérifie dans Chromium :

1. les 389 identités et la pagination ;
2. les comptes 115/231/43 ;
3. les filtres exacts des quatre identités R33 ;
4. recherche et commandes clavier ;
5. la vue gauche source et son SHA ;
6. le cadrage Lucas et sa marge alpha ;
7. les quatre variantes OBJ et leurs seize vues réelles ;
8. le reflow à 320 px avec texte à 200 % ;
9. le lien du centre DEV.

Le workflow `.github/workflows/gamedev-r33.yml` rejoue d’abord les gardes R32, puis les gardes R33, la recette navigateur et enfin le build complet. Les résultats de ce document décrivent les **critères de la recette** ; un succès CI n’est acquis que lorsqu’une exécution du commit effectivement publié est terminée.

## Manquants qui restent ouverts après R33

R33 ne clôt pas le chantier général « fidélité 1:1 ». Restent notamment à prouver ou produire selon les incarnations :

- corps complets encore sans source suffisante ;
- variantes de costume, équipement et phases non couvertes ;
- idles natifs, locomotions, attaques, impacts, KO, intros/outros et transitions ;
- correspondances entre éditions lorsque les sources viennent d’un port ou d’une autre version ;
- éclairage, matériaux/shaders, taille physique et caméra du jeu original ;
- audio attribué à chaque action et phase ;
- mouvements contextuels pour les rencontres qui ne sont pas des combattants libres ;
- comparaisons primaires frame-à-frame lorsque seules des sources communautaires ou documentaires existent.

Aucun de ces points n’est marqué terminé par l’existence d’un modèle, d’une vue statique ou d’une image générée. La progression doit continuer par lots prouvables, avec l’édition et la provenance attachées à chaque résultat.
