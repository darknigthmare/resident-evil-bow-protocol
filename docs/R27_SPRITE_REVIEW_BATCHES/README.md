# R27 — revue visuelle gelée

Les 385 demandes initiales sont résolues au gel : **363 PNG générés** et **22 refus réels de l’outil**, conservés sans réessai identique. Les refus ne comptent pas comme images. Les quatre générations corrigées conservent leurs anciens PNG et JSON exacts dans `sprites/superseded/` ; ces archives ne comptent pas comme nouvelles identités.

**192 identités ont été comparées visuellement à leurs références réellement utilisées** : 175 dans les lots principaux et 17 dans `reviewer-ci-re1/`. Les 171 autres PNG gardent une revue et une pose non validées. Un ancien drapeau de référence complète n’est pas une preuve : plusieurs sources coupent des membres, des armes ou des ailes.

Au gel, 82 corps sont revus entiers. Seules **22 bases statiques** ont aussi une orientation gauche/droite et une observation explicite `neutral-base`. Les présentations, les T/bind poses, les groupes, les vues partielles et les poses inconnues n’exposent aucun état de combat. `idle` désigne ici une image de base statique ; aucun cycle d’animation ou instant d’idle du jeu d’origine n’est certifié.

| Métadonnée de pose | PNG au gel | Portée |
| --- | ---: | --- |
| `neutral-base` | 22 | Base statique revue, corps entier et côté observé ; une seule image `idle`. |
| `source-presentation` | 60 | Présentation visible, vol, bond, langue projetée, émission ou composition ; aucun état de combat. |
| `source-bind-pose` | 2 | Pose de liaison du modèle ; aucun état de combat. |
| `unknown` | 279 | Pose non établie ; aucun état de combat. |

L’[index JSON](index.json) relie chaque UID revu à son rapport et à ses empreintes. Le [contrôle d’intégrité](integrity.json) vérifie les PNG, les sources, les métadonnées de pose, les preuves manuelles et les archives des versions corrigées. La [revue initiale](../R27_SPRITE_REVIEW.json), les lots `batch-002/` à `batch-016/`, l’[audit des poses](pose-kind-audit/index.json) et le [lot indépendant RE1](reviewer-ci-re1/) contiennent les observations et contacts visuels.

Aucune retouche de pixels n’a été appliquée par la revue. La comparaison locale ne certifie ni fidélité géométrique 1:1, ni faces cachées, dimensions physiques, sons, transformations, attaques ou animations complètes des jeux d’origine. Les limites et refus restent visibles dans les données.
