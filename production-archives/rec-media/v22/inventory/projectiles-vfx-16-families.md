# Projectiles et VFX — audit V22

16 familles et 44 actions V1, sans les assimiler à 44 PNG absents; sources historiques et V21 conservées.

**3 PNG : 2 objets candidats et 1 étude de flamme. 1 refus sans PNG. Aucun jeu d’animation complet ni fidélité 1:1 certifiée.**

| Famille | Actions V1 | État V22 | Travail restant / décision |
|---|---:|---|---|
| Balles et effets de tir | 18 | source_hold | Les 18 actions regroupent plusieurs éditions, armes et phases de tir. Le modèle d’arme exact et les séquences départ/impact ne sont pas verrouillés par les intitulés V1. Une balle générique inventée ne validerait pas ces actions. |
| Décharges de fusil | 4 | source_hold | Quatre actions de fusil restent à documenter par l’arme et les images départ/impact propres à chaque jeu. Aucun cône lumineux générique présenté comme effet canonique. |
| Grenades à explosion | 4 | partial_candidate_and_refusal | Candidat RE5 V21 conservé pour Chris uniquement. Le rendu natif RE2R a été inspecté, puis la génération de la grenade RE2R a été refusée; aucun PNG, aucune relance. Jill/Carlos RE3R, vol, rotations et explosions restent non produits. |
| Grenades incendiaires | 1 | source_hold | L’action de Claire doit être rapprochée des Flame Rounds du GM 79 de RE2R. La référence d’inventaire inspectée montre les munitions groupées; elle ne valide pas un projectile séparé en vol ni le feu d’impact. Ne pas y substituer la grenade RE5. |
| Projectile électrique de simulation | 1 | simulation_and_source_hold | Le Spark Shot et ses Needle Cartridges RE2R sont identifiés. Le chargeur inspecté montre seulement une partie des aiguilles. Le projectile lent de V1 est une règle de simulation; corps entier, câble et séquence électrique restent à documenter. |
| Bouteilles incendiaires | 1 | partial_static_candidate | Un objet RE0 entier non allumé a été généré depuis le rendu d’inventaire inspecté. La plateforme du rendu et le détail HD ne sont pas certifiés. Vol, rotation, allumage, éclatement et feu au sol restent manquants. |
| Éclat local de lampe | 1 | simulation_and_source_hold | L’éclat local de lampe de Barry est une proposition de simulation V1. La référence de phase, la forme et les durées exactes ne sont pas verrouillées; aucun effet plein écran inventé. |
| Grappin et câble | 2 | source_hold | L’article de Capcom confirme le grappin d’Ada Separate Ways 2023 et ses usages. Le téléchargement de sa capture a renvoyé HTTP403; tête complète et attache du câble n’ont pas pu être inspectées. Le lanceur seul ne suffit pas à valider le projectile. |
| Carreau explosif | 1 | source_hold | Les Blast Arrows d’Ada Separate Ways 2023 sont identifiées. Le rendu inspecté montre un carquois et des empennages rouges, mais cache les pointes et une partie des tiges. Le carreau bleu du Bolt Thrower de Leon généré en V22 est distinct et ne clôt pas cette action. |
| Électricité de contact | 2 | source_hold | Le Stun Rod de Sherry RE6 est identifié et son rendu d’inventaire entier mais très peu défini a été inspecté. La charge électrique et l’impact local ne sont pas visibles dans ce rendu; pas d’effet générique présenté comme copie du jeu. |
| Roquette | 1 | source_hold | La cible V1 est Nemesis forme1 RE3R 2020. L’étude de roquette RE5 V21 reste hors raccord. Une vue complète du projectile RE3R en vol, avec ses phases propres, manque toujours à la validation. |
| Ferraille projetée | 1 | simulation_and_source_hold | Le fragment projeté par Heisenberg humain est une spécification de combat V1. Aucun fragment précis de référence n’est verrouillé; ne pas le confondre avec les masses de la forme mutée. |
| Champ magnétique local | 1 | simulation_and_source_hold | Le champ local est une règle de simulation. Sa forme visuelle n’est pas un objet canonique démontré; les références de Heisenberg humain doivent être fixées avant création 1:1. |
| Mine de fer de simulation | 1 | simulation_and_source_hold | La mine de fer de Heisenberg est une adaptation V1. Les Attachable Mines RE4R et Mine Rounds RE3R trouvées dans les catalogues sont d’autres objets; elles ne sont pas raccordées à cette fiche. |
| Flèche explosive | 1 | source_hold | La flèche de l’EJF-338 de Krauser RE4R est distincte du carreau d’Ada et du Bolt Thrower de Leon. Identité de l’arme repérée, mais aucune image entière de la flèche de cette édition n’a été qualifiée. La page image consultée était inaccessible. |
| Feu réactif d’Alexia | 4 | effect_study_only | Une étude de flamme isolée est disponible. La capture PS2 2001 documente la transformation; la capture complémentaire près de la main n’explicite pas la plateforme. Elles n’établissent pas les quatre phases d’attaque V1. Aucune frame extraite ni animation complète certifiée. |

## Raccords à préserver

- Le carreau bleu RE4R de Leon est un complément d’arsenal; il ne remplace pas les Blast Arrows rouges d’Ada.
- Le Molotov RE0 est un objet statique non allumé; les phases de vol et d’impact restent à créer.
- La grenade RE5 V21 ne remplace ni la grenade RE2R refusée ni les grenades RE3R.
- L’étude de roquette RE5 V21 ne remplace pas la roquette de Nemesis RE3R.
- Les effets de simulation d’Heisenberg et de la lampe de Barry ne sont pas des objets canoniques 1:1 déjà établis.

Les 44 raccords individuels, les URLs et les états V21 conservés se trouvent dans projectiles-vfx-16-families.json.
