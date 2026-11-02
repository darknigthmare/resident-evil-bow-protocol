# R34 — portraits, poses en pied et sélection des arènes

Le parcours joueur sépare désormais le choix des personnages, la galerie des 52 arènes et le début du combat. Le retour conserve les personnages, formes et apparences. Le clavier, les boutons et les manettes gardent leurs contrôles ; un appui de confirmation doit être relâché avant de devenir une commande de combat.

La passe couvre les 115 combattants principaux et 231 prototypes, soit 346 identités et 692 sorties demandées. Les 43 exercices contextuels gardent leur statut documentaire.

| Sortie | Produite | Admise dans le parcours joueur |
| --- | ---: | ---: |
| Portrait de sélection | 306 | 305 |
| Pose statique en pied | 128 | 114, orientées vers la droite |
| Total des sorties demandées produites | 434 | 419 |

Les 15 autres sorties générées restent des études. Les 177 sorties sans référence suffisante et les 81 sorties bloquées, historiques ou exclues après un refus de portrait conservent leurs motifs. Toutes les demandes ont une décision ; aucun état `PENDING` ne reste. Les compteurs portent sur une sortie par identité et par type. Révisions et études de reprise gardent leurs propres preuves.

Chaque sortie conserve son prompt exact, ses références avec empreintes, son PNG brut et sa revue. Une référence entière doit montrer l'incarnation concernée ; les vues d'une autre mutation ou édition ne sont pas promues. Les corrections archivent le reçu et l'image précédents, avec contrôle de propriétaire, empreinte et import concurrent. Les sorties récupérées après interruption sans prompt attesté restent des études, sans provenance inventée.

Les poses sont des adaptations générées et statiques. Les animations idle originales, états d'action complets, surfaces cachées et fidélité globale 1:1 restent non certifiés. Les sens opposés sans vue indépendante qualifiée conservent les replis existants ; aucune asymétrie n'est masquée par un miroir automatique. Les 17 anciens chantiers restent ouverts dans le suivi.

Le conflit de référence de Steve est retenu : son rendu violet ne peut revenir par l'ancien renderer, même au premier dessin d'une URL qui le sélectionne. La barrière de présentation est installée avant les contrôleurs puis après les adaptateurs, de manière idempotente. Une pose nouvelle en décodage attend sa source vérifiée ; les présentations natives qualifiées gardent priorité. Le marqueur d'une vue indisponible reste distinct d'un sprite produit.

| Vérification locale | Résultat |
| --- | --- |
| Sources, reçus et imports | 28 contrôles réussis |
| Runtime Node / navigateur | 15 / 12 groupes réussis |
| Personnages → arène → combat | 16 groupes réussis |
| Galerie de production | 8 groupes réussis |
| Garde R34 | 32 cas réussis, plus 39 R33 et 40 R32 conservés |
| Définitions CI | 6 contrôles réussis, 7 workflows et 137 scripts compilés |
| Intégration | 7 groupes réussis |
| Vérification générale isolée | 41 commandes actuelles et 2 conservations R31 réussies ; 2 866 empreintes inchangées |
| Anciennes recettes navigateur, vue de compatibilité explicite | R31 : 57 groupes ; R32 : 98 plus 16 R28 ; R33 : 56 |
| Build statique | 2 183 fichiers R34 comparés octet par octet, 1 163 743 682 octets |
| Classeur | 74 feuilles, dont 70 anciennes préservées ; reproduction exacte 3/3 |

Les sept rapports agrégés sont positifs, courants par empreinte et sans test sauté. Les smokes naturels de Cerberus et Flying Bug utilisent leurs vrais PNG dans le combat, après le parcours normal, sans mutation des acteurs, replays ou sauvegardes pendant le rendu. La [comparaison visuelle de quatre corps](R34_VISUAL_REVIEW.json) distingue aussi une étude gauche volontairement non admise. Ces vérifications locales n'attestent ni matériel physique ni exécution CI distante.

Preuves : [validation](R34_VALIDATION.json), [intégration](R34_INTEGRATION_TESTS.json), [commande générale isolée](R34_CURRENT_TESTS.json), [build](R34_BUILD.json), [conservation des sources](R34_SOURCE_ADDITIONS.json), [smokes réels](R34_NATURAL_RENDER_SMOKE.json), [classeur final](BOW_FIDELITE_R34.xlsx), [suivi](FIDELITE_R34.md), [application des guides](GAMEDEV_APPLIED_R34.md).

Les 2 183 fichiers du module sont également vérifiés contre les objets Git réellement indexés. Le contrôle de mise en forme des fichiers rédigés ne relève aucune anomalie ; les espaces des 206 captures HTML sources sont conservés avec leurs empreintes ([détail](R34_WHITESPACE_CHECK.json)).

La référence de cette évolution est R33, commit `6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5`. Ses sprites orientés, sources natives, restauration sélective et replays restent conservés ; leur portée et leurs preuves figurent dans [la livraison R33](R33_DELIVERY.md). Les contrôleurs, règles, données, sauvegardes et anciennes assertions restent préservés. La vue DEV `?dev=1&selection=direct` sert aux anciens contrats d'interaction ; les nouvelles recettes utilisent le parcours joueur par défaut.
