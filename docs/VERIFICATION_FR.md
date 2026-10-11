# Vérification — Resident Evil : B.O.W. Protocol 0.3.0

**Résultat final : 59/59 contrôles exécutables réussis, aucun échec, plus l’audit exhaustif des 81 profils et 810 techniques.**

| Suite | Résultat | Portée |
|---|---:|---|
| Audit lore | 81/81 profils, 810/810 techniques | Couverture, unicité, sources, niveaux de preuve, cloisonnement |
| Moteur et Dossiers | 26/26 | Parsing, assets, mouvements, IA, collisions, statuts, replays, sauvegardes, cinématiques |
| Bestiaire et Opérations | 20/20 | 389 dossiers, filtres, liens jouables, Arcade, Survie, Boss Rush |
| Interface | 13/13 | Thème v0.3.0, compteurs, Incident Baker, navigation, Archive DOM réelle |
| **Total exécutable** | **59/59** | Tous les contrôles réussis |

## Données vérifiées

- **81** combattants et **810** commandes.
- **81** Dossiers et **648** résultats de progression validables.
- **324** conclusions stylisées.
- **389** fiches du Bestiaire.
- **18** configurations d’arène illustrées.
- **577 / 165 / 68** techniques canoniques, anatomiques et de simulation.

## Incident Baker

Les six nouveaux sujets sont testés comme de vrais combattants : démarrage et activation des 60 techniques, dépense et récupération de ressources, collisions, IA, super, statuts, images, huit duels par Dossier et quatre conclusions par sujet.

## Limites des tests

Les tests valident les contrats de données et le rendu Canvas contrôlé. Ils ne revendiquent pas une comparaison pixel par pixel avec les jeux Resident Evil, ni une validation matérielle exhaustive de tous les navigateurs, manettes ou écrans physiques.
