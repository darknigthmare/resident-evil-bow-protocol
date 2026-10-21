# R11 — Lucas humain : dispositifs réellement jouables

Base : **main b8b47ee78b80015263f10303781ae2566eb27699**, fusion de R1–R10 le 19 octobre 2026. Nouvelle PR de continuation ; #11 est déjà fusionnée. Gameplay 0.7.3 / révision R11.

## Profil et fonctionnement

Seul `re7-lucas-baker` change. Ses dix commandes sont explicitement SIMULATION, avec une revue de source partielle. La forme humaine reste distincte de sa mutation. Les noms hérités ne sont pas des preuves canoniques.

- Léger / bas / prise : défense générique du prototype, déclarée simulation. Le balayage n’est plus présenté comme un fil réellement posé.
- Lourd : charge projetée avec trajectoire et mèche ; une seule explosion, pas une frappe nommée bombe.
- Spécial neutre : charge télécommandée, posée à l’activation, armée après 30 ticks ; l’utilitaire la déclenche.
- Spécial bas : fil bas destructible ; armement de 35 ticks, passage au sol balayé, saut possible.
- Spécial avant : caisse de proximité, pas une prise cachée derrière un nom de dispositif.
- Spécial arrière : recul sans téléportation ni trappe de décor fictive.
- Super : trois charges visibles à mèches décalées, dans le même quota ; montage original de simulation, pas une séquence Capcom attestée.
- Utilitaire : détonation des seules charges télécommandées personnelles armées. Sans charge, aucun coût, dégât ou soin inventé ; message explicite.

Trois dispositifs au maximum par propriétaire. Une quatrième pose retire la plus ancienne sans explosion. Les boîtiers peuvent être détruits au corps à corps. KO du propriétaire et fin de manche retirent le réseau. Les explosions n’appliquent plus de poison. Durées, dimensions, absence de dégâts à soi, quota et coefficients sont des règles originales du moteur 2D.

Le passif ne promet plus le noyau de la mutation finale. Le soin actif est retiré de ce profil de simulation ; cela ne prétend pas résoudre la biologie canonique ou nier les capacités narratives de Lucas. La variante mutée garde ses données précédentes.

## Préservation et sauvegardes

114 autres profils principaux, 231 prototypes, 43 exercices, les illustrations et 460 définitions de conclusion sont conservés. Les pièges antérieurs gardent leur logique ; seuls les champs `lucasDevice` activent le nouveau fonctionnement. Les indices procéduraux ne sont pas des dessins définitifs.

Les contrats de replay principal et expérimental changent puisque le profil et la simulation changent. Les fichiers anciens restent conservés et doivent être lus avec leur version originale. Le contrat du journal contextuel reste identique ; aucune conversion ou suppression silencieuse de sauvegarde.

## Sources réellement consultées, 19 octobre 2026

1. Capcom, 16 octobre 2017, contexte Not a Hero : https://news.capcomusa.com/lets/browse/chris-redfield-returns-in-the-latest-video-for-not-a-hero-and-end-of-zoe — poursuite de Lucas, agents captifs, Molded et gaz. Ne prouve pas chaque commande, dispositif ou timing.
2. Capcom, 31 janvier 2017, modes additionnels : https://news.capcomusa.com/lets/browse/the-first-banned-footage-dlc-for-resident-evil-7-biohazard-is-out-today — distingue Nightmare, 21 et les autres modes. Ne pas transférer leurs mécaniques entre incarnations.
3. Référence secondaire héritée, non recertifiée : https://blackjackrants.blogspot.com/2020/11/reviewing-monsters-resident-evil-7.html.

Aucun timecode, dialogue ou clip original inventé. Le relevé exact des fils, boîtes et montages dans l’édition visée reste ouvert. Un article général ne suffit pas à rendre ces dix adaptations canoniques.

## Tests et classeur

22 nouveaux groupes exécutés : armement, détonation vide, propriété, limite globale, mèches, saut, destruction, interruption, KO, reset, grenade, dix duels CPU complets/rejoués, laboratoire sans récompense et rendu sans mutation de simulation. Les tests historiques restent actifs avec des successeurs SHA-256 exacts et la comparaison des 114 autres profils.

Le navigateur R11 utilise le vrai HTTP des runners GitHub, en 1440 et 390 px. L’accélération CPU et le dispositif préparé du laboratoire sont signalés. La navigation HTTP dans le conteneur local a été refusée par sa politique ; aucun contournement essayé. Les preuves CI finales sont distinctes de la préparation locale. Pas de matériel physique ou de nouveau clip canonique certifié.

`docs/planning/BOW_LUCAS_DISPOSITIFS_R11.xlsx` : quatre onglets (synthèse, dix commandes avant/après, 22 tests, sources/limites), créé avec artifact_tool. Les 17 composants XML sont conservés à l’octet près par son transport. Les anciens classeurs ne sont pas écrasés. Aucun lot artistique global P1 fermé.

Aucune fusion dans main, promotion Vercel ou nouveau transfert Google Drive automatique dans cette passe.
