# R8 — Intégration du plan de fidélité

Ce dossier contient `BOW_PR11_MATRICE_EXECUTION_R8.xlsx`, complément opérationnel de neuf onglets au P1 de 21 onglets fourni précédemment. Il ne remplace pas le P1, dont l'empreinte figure dans le manifeste. Les identifiants de lots P1 restent stables : F-{UID}-INT, OUT, WIN, LOSE, MOV, SUP, FIN, etc. et S-{stage}-GEO, AMB, LUX, PROP, SEQ, QA.

## Ce qui fonctionne
- Huit états de présentation par corps : intro, résultat de manche gagné/perdu/nul, résultat final gagné/perdu/nul et outro. Séparation par incarnation et orientation, même avec un acteur en état KO ou portant une attaque ancienne.
- Défaite de manche réversible ; elle n'hérite pas d'une mort ou d'un outro terminal. Les conclusions principales exigent un vrai vainqueur final, pas une manche, une égalité, un objet falsifié ou un résultat déjà émis.
- L'ouverture répétée d'une conclusion ne réinitialise plus son délai ; un indice invalide n'exécute plus silencieusement la première conclusion.
- Atelier `sequences.html` : 346 corps, 8 états, 52 arènes, tick borné, pause et lien reproductible. Le lien n'accepte que UID, état, arène et tick. Aucune santé, statistique, URL d'image ou récompense importée.
- Les scènes existantes utilisent le temps de présentation de l'atelier ; pas de nouvelle animation de décor livrée.

## Statuts du classeur
Les 2 768 emplacements sont raccordés techniquement, mais aucun nouveau clip final n'est dessiné. Les 3 460 commandes sont inventoriées, pas recertifiées individuellement. Les 346 lots super/conclusion conservent la différence entre les 115 sujets principaux et les 231 prototypes. Les 43 exercices restent distincts des corps libres. Aucun lot global P1 n'est clôturé uniquement parce qu'un sélecteur ou un test existe.

Le classeur a été exporté avec artifact_tool, puis reconstitué sans modification de ses composants XML. Ses cellules QA reflètent sa préparation et demandent une revalidation CI ; les résultats exécutés finaux se trouvent dans les JSON du rapport et le workflow lié à la PR. Ne pas convertir ces lignes en preuve de fidélité canonique.

## Références primaires ciblées (18 octobre 2026)
- Capcom, entretien Nemesis sur PlayStation Blog : https://blog.playstation.com/archive/2020/05/15/making-a-monster-how-nemesis-was-brought-to-terrifying-life-in-resident-evil-3/ . Distinguer les formes et le remake des adaptations dans Resistance.
- Tsuyoshi Kanda / Capcom, Mercenaires — Additional Orders : https://blog.playstation.com/2022/07/21/new-re-village-the-mercenaries-additional-orders-details-revealed/ . Les jauges et capacités jouables de ce mode ne sont pas automatiquement celles des boss de campagne.

Ces deux références cadrent la séparation des incarnations ; elles ne valident pas les répertoires de l'ensemble des 346 sujets. Les relevés vidéo, timecodes, animations anatomiques, phases spécifiques et morts attestées demeurent des tâches de production.

## Tests et livraison
Chaîne complète incluant les suites historiques, 17 contrôles de séquence, 7 addenda et 9 nouvelles régressions de scénario/conclusion ; seuls les résultats effectivement exécutés comptent. Le navigateur HTTP prépare explicitement certains verdicts pour tester le contrôleur. Ce n'est pas un parcours manuel complet, un téléphone physique ou un test exhaustif des confrontations.

PR #11 maintenue en brouillon, sans fusion de main ni promotion de production. Les restrictions de transfert Google Drive antérieures ne sont pas contournées ; aucune sauvegarde Drive nouvelle n'est revendiquée.
