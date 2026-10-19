# PR11 / R6 — Attaques, supers et scènes animées

Base : 28f9b16d6bb1dc00d94a50848f47bb44e8cf0e2b (R5). Version de paquet conservée en 0.7.3 ; révision de travail R6, avec nouveau contrat de combat.

## Combat réellement modifié

Quatre profils principaux sont modifiés : re3r-nemesis, re3r-stage-2-nemesis, re5-gatling-gun-majini et re5-jill-valentine-enemy. Les 111 autres profils principaux et les 231 profils expérimentaux ne sont pas réécrits.

- Les salves déclarées soutenues émettent leurs coups aux frames prévues. Si l'attaque est interrompue, les coups encore différés sont annulés ; les projectiles déjà tirés continuent. L'origine d'un coup différé suit la position réelle de son propriétaire et l'orientation engagée de l'attaque.
- Les roquettes déclarées à détonation de contact explosent une seule fois, au premier contact balayé ou au bord de l'arène. Pas de double dégât impact + explosion. La garde et le sens de poussée restent pris en compte ; une explosion ne bénéficie pas gratuitement d'une zone critique.
- Les attaques à plusieurs fenêtres possèdent des intervalles inoffensifs. Les volumes, possibilités de parade, effets visibles et nouveaux dégâts utilisent les mêmes fenêtres. Un second coup est annulé si le premier mouvement est interrompu. Le coût ressource/super n'est payé qu'à l'engagement.

### Nemesis — forme humanoïde au lance-roquettes
Le nom industriel M202 non attesté est supprimé. La salve est une synthèse versus de trois roquettes espacées, coûtant 48 unités de la ressource existante et 100 de super. Ce n'est pas une salve officiellement extraite de RE3. Le recul précédemment implémenté comme un déplacement instantané devient un saut avec trajectoire continue. Le marquage de cible et la ressource biologique chiffrée restent des aides de simulation, pas de nouveaux pouvoirs canoniques.

### Nemesis — stade 2 quadrupède
Les commandes sont nommées séparément de l'humanoïde. Le bond d'écrasement n'inflige son impact que dans sa fenêtre d'atterrissage ; le super possède deux frappes et une interruption entre elles. Ces variantes, les valeurs et la prise sont classées SIMULATION, sans prétendre reconstituer toutes les animations du boss original. Aucun changement de mutation, roquette ou pouvoir de téléportation n'est importé dans ce profil.

### Majini Gatling et Jill sous P30
Les rafales existantes deviennent réellement interrompables. Cette passe ne change ni leur agent biologique ni leur répertoire d'armes.

## Présentation commune

Le module combat-cues-r6.js est utilisé par le Versus principal, les deux laboratoires et les duels expérimentaux. Il distingue balles, roquettes, flammes, sécrétions organiques, électricité, projectiles de retour et grenades. Les effets de mêlée suivent les vraies fenêtres actives ; le super affiche une anticipation locale, sans arrêt gratuit du temps. Les trajectoires différées ne sont pas dessinées avant leur émission. La lecture seule de ce module est testée : il n'ajoute pas de collision, de dégâts ou de consommation de hasard.

Ces effets vectoriels ne sont pas des animations de corps ou des sprites finaux. Les dessins latéraux R4/R5 sont conservés. Les textes FINE/CAUTION/DANGER et les contrats de sauvegarde contextuels existants restent présents.

## Décors et animation de stage

Quatre configurations de stage cessent de réutiliser un fond sans rapport : ascenseur d'évacuation NEST, cuve de traitement NEST 2, lac du village et morgue de Dulvey. Le module stage-dynamics-r6.js compose leurs plans à l'exécution : arrière-plans, installations, sols, câbles/structures, eau et lumière.

La machinerie de l'ascenseur, les rides du lac, la brume, l'éclairage lent et les ambiances sont liés au temps de simulation. La pluie/neige ne traverse plus les intérieurs explicitement déclarés. La réduction des mouvements fige ces animations et évite les flashes de super. Ces installations sont des décors, sans dégâts environnementaux ou nouvelles armes utilisables.

Les quatre scènes sont des interprétations originales pour le duel 2D, PAS des géométries 1:1 des jeux. Elles remplacent quatre configurations sur les 52 existantes ; le total n'est pas artificiellement augmenté. L'atelier stages.html permet de consulter les 52 stages, chercher, jouer/mettre en pause, avancer d'une frame, réinitialiser et réduire les mouvements. Il revient du cache en une boucle unique et en pause.

## Fidélité et source

Source primaire consultée le 16 octobre 2026 : entretien publié par Capcom avec le directeur Kiyohiko Sakata, « Making a monster: How Nemesis was brought to terrifying life in Resident Evil 3 », PlayStation Blog, 15 mai 2020.
https://blog.playstation.com/archive/2020/05/15/making-a-monster-how-nemesis-was-brought-to-terrifying-life-in-resident-evil-3/

Cet entretien distingue le Nemesis humanoïde, son arsenal/tentacule et la refonte non humanoïde du type 2. Le passage sur Resistance explique une sélection d'attaques inspirées de RE3 : il n'autorise pas l'import de tout pouvoir de Resistance dans RE3. Il ne fournit ni les valeurs de frames, dégâts, portée, coût, le nom M202, la salve créée ici, ni une reconstruction des décors. Ces limites sont consignées dans les fiches.

Les anciens classements « canonical » non touchés par cette passe ne sont pas recertifiés. Le catalogue existant de 389 identités n'est pas une preuve d'exhaustivité de toute la franchise.

## Validation et compatibilité

267 groupes de tests exécutables locaux réussis : 243 précédents + 24 nouveaux. Moteur réel en VM, Canvas natif et fenêtres DOM contrôlées. Les tests de préservation historiques utilisent une liste explicite avant/après pour les quatre profils et fichiers de gameplay volontairement modifiés ; les anciennes empreintes ne sont pas écrasées silencieusement. Les 111 profils non modifiés et les données d'art/journal/annexe restent contrôlés.

Les rapports historiques restent historiques. COMBAT_STAGE_R6_TESTS.json contient les nouveaux résultats ; le log complet est joint à la livraison. La navigation HTTP Chromium locale a renvoyé ERR_BLOCKED_BY_ADMINISTRATOR. Le test browser-combat-stage-r6.mjs est fourni pour une exécution HTTP séparée en CI. Aucune réussite navigateur n'est revendiquée avant son résultat.

Les replays de combat utilisent le nouveau digest : les anciens fichiers sont conservés mais doivent être lus dans leur version de combat d'origine. Le contrat et les données du journal contextuel restent identiques à R5. Le mode d'essai ne crédite pas de récompenses de campagne.

## Travail graphique restant

346 corps au total (115 principaux + 231 expérimentaux) ; 43 exercices contextuels distincts. Couverture graphique inchangée : cinq poses de référence utilisables dans les deux sens par réflexion approuvée, 341 corps sans couverture latérale complète. Aucune nouvelle animation de personnage, paire anatomique opposée, destruction de membre ou phase de mutation scénarisée. Les sprites par technique et le 1:1 final demeurent un chantier ouvert.

Cette livraison continue PR11 en brouillon. Elle ne fusionne pas main et ne constitue pas un nouveau déploiement Vercel.
