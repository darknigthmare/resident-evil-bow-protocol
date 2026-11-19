# Resident Evil Combat Complément Moira V5

19 novembre 2026 · Fiche de conception pour le combat et la production des animations

**Statut : proposition d’adaptation. Intégration et validation moteur à effectuer.** Cette fiche développe Moira Burton, version Resident Evil Revelations 2, dans les conventions de la Bible V1. Elle fixe une première liste de coups, leur intention visuelle et plusieurs valeurs de départ. Les paramètres encore ouverts sont identifiés pour éviter de transformer une intention de jeu en comportement supposé acquis.

Aucune nouvelle image de Moira n’a été produite dans ce lot : la génération de sa pose gauche a été refusée. Cette fiche ne livre donc ni pose, ni animation, ni personnage importé dans le moteur. Elle complète la Bible V1 sans remplacer ses règles générales.

## Identité et équipement

L’identifiant de travail est `REC_MOIRA_REV2`. La fiche de réserve de la Bible V1, page 68, et le contenu narratif `CRISIS_11` restent des références distinctes. Le profil proposé privilégie le contrôle à courte portée, la lampe et les coups de pied ou de pied-de-biche.

Les manuels officiels de Revelations 2 attribuent à Moira une lampe et un pied-de-biche. Ils décrivent notamment l’éblouissement temporaire de certains ennemis [1, 2]. L’annonce de Capcom situe Claire et Moira dans TerraSave et présente leur enlèvement [3]. Les commandes, dégâts, charges et récits décrits ici sont des adaptations originales pour Resident Evil Combat.

La tenue de travail conserve la veste sombre à capuche magenta, le haut clair, le short en jean, les collants sombres et les bottes. Le bracelet vert demeure au poignet anatomique gauche. La lampe est tenue de la main droite dans la référence visuelle examinée. Les deux orientations doivent préserver ces côtés, avec des prises d’arme et des transitions cohérentes. La validation visuelle finale des accessoires reste nécessaire.

Cette interprétation utilise la lampe et le pied-de-biche comme équipement principal. La lumière produit un effet bref de gêne sur les cibles compatibles ; elle ne devient pas un rayon brûlant ni un pouvoir surnaturel. Le choix de ne pas employer de pistolet dans cette fiche est une décision de conception, sans généraliser le comportement de Moira à toutes les scènes du jeu d’origine.

## Conventions de lecture

La simulation conserve 60 mises à jour par seconde. `L`, `M`, `H` et `U` désignent les commandes légère, moyenne, forte et outil. Les directions du pavé numérique sont relatives à l’orientation : `6` avance, `4` recule, `2` baisse et `5` représente la position neutre. Le préfixe `j` indique une action aérienne.

Dans les tableaux, `D / A / R` signifie démarrage, durée active et récupération, en ticks. La première phase active commence au tick `D` ; la durée totale vaut `D − 1 + A + R`. Les dégâts affichés sont les valeurs de base proposées avant réduction de combo. Une valeur chiffrée ne prouve ni une portée, ni une continuité d’enchaînement [4].

<!-- pagebreak -->

## Douze attaques normales proposées

Les valeurs ci-dessous forment un point de départ pour les essais. « Mi-haut » désigne une frappe gardable debout ou accroupi ; « bas » exige la garde basse ; « overhead » exige la garde haute. Les zones de contact, les déplacements et les durées d’étourdissement restent à produire.

| Commande | Animation proposée | D / A / R | Dégâts | Garde |
|---|---|---:|---:|---|
| 5L | Poussée courte de la main libre | 7 / 2 / 10 | 25 | Mi-haut |
| 5M | Frappe compacte au pied-de-biche | 11 / 3 / 18 | 48 | Mi-haut |
| 5H | Balayage horizontal de l’outil | 18 / 3 / 28 | 72 | Mi-haut |
| 2L | Coup bref au tibia | 7 / 2 / 12 | 20 | Bas |
| 2M | Frappe aux jambes avec l’outil | 12 / 3 / 20 | 42 | Bas |
| 2H | Balayage bas engagé | 17 / 4 / 31 | 60 | Bas |
| jL | Genou court en l’air | 6 / 3 / 10 | 22 | Overhead |
| jM | Coup de pied oblique en l’air | 10 / 4 / 14 | 45 | Overhead |
| jH | Frappe descendante avec l’outil | 15 / 5 / 19 | 68 | Overhead |
| 6M | Talon descendant | 24 / 3 / 20 | 60 | Overhead |
| 6H | Avancée et poussée avec l’outil | 23 / 4 / 31 | 80 | Mi-haut |
| 3H | Levier servant de lanceur | 18 / 4 / 29 | 65 | Mi-haut |

La lampe doit rester crédible pendant les attaques de la main libre. Les animations devront montrer la prise de l’outil, son rangement éventuel et la reprise de la garde. Un objet ne doit pas changer de main ou disparaître sans transition visible.

## Annulations autorisées

La chaîne au sol suit `L → M → H` sur touche ou garde, sans répétition ni retour vers une force inférieure. La proposition autorise `5L`, `2L`, `5M`, `2M`, `5H` et `6H` vers un spécial lorsque les conditions de contact et de ressource sont remplies. Les fenêtres exactes restent à régler.

`5M` et `2M` peuvent mener à `3H` uniquement sur touche. `3H` autorise ensuite un saut uniquement sur touche. La fiche n’autorise aucune annulation de `2H` et n’ajoute aucune chaîne aérienne libre. Les atterrissages gardent la récupération commune de 4 ticks après saut vide ou de 6 ticks après attaque aérienne [4].

Les deux commandes communes sont conservées : `6M` reste à −7 en garde, sans annulation ; `3H` reste à −18 en garde. Leur animation doit respecter ces contraintes, au lieu de leur attribuer une récupération différente pour des raisons visuelles.

<!-- pagebreak -->

## Lampe et ressource propre

`U` propose une focalisation de lampe à `18 / 4 / 26`, pour 0 dégât. Le cône est un effet local et bref. La compatibilité doit être déclarée par une propriété de cible ; elle ne se déduit pas de la présence apparente d’yeux. La lampe ne remet pas à zéro l’étourdissement d’un combo et ne prolonge pas indéfiniment un effet déjà appliqué.

Le profil propose trois charges abstraites. Elles représentent une règle de combat, sans prétendre reproduire une batterie canonique. Une utilisation acceptée dépense une charge. `2U` lance une remise en disponibilité de 72 ticks : les charges ne sont restaurées qu’à son terme. Une interruption conserve le nombre restant et ne donne aucun remboursement.

La durée de gêne, le cône, la portée, le délai avant réapplication et l’interaction exacte avec la garde restent ouverts. Ces paramètres doivent être fixés ensemble avant tout équilibrage. L’effet visuel reste bref et lisible ; un réglage de réduction des flashs doit préserver l’information de contact sans blanc plein écran.

Les actions de lampe `U`, `214M` et `214M + U` n’infligent aucun dégât en garde ; le minimum de dégâts en garde des spéciaux offensifs ne leur est pas appliqué. Le gain éventuel de jauge lors d’un contact de lampe reste à définir.

## Spéciaux et versions EX

| Commande | Action et rôle | Valeurs proposées | Ressource |
|---|---|---|---|
| 236L | Traverse, frappe mi-haute à courte portée | 16 / 3 / 24 ; 65 dégâts | Aucun coût dédié |
| 236L + U | Traverse EX, deux impacts | Démarrage 14 ; bases 35 puis 45 ; intervalles et récupération à définir | 500 jauge |
| 214M | Écart éclairé, bref recul puis flash | 0 dégât ; déplacement et phases à définir | 1 charge |
| 214M + U | Écart éclairé EX | Préparation plus courte à chiffrer ; 0 dégât | 500 jauge et 1 charge |
| 623H | Levier ascendant, couverture aérienne | 15 / 4 / 32 ; 80 dégâts | Aucun coût dédié |
| 623H + U | Levier ascendant EX | 12 / 4 / 34 ; 95 dégâts | 500 jauge |

Le recul éclairé ne donne pas d’invulnérabilité ni de saisie garantie. Son EX doit obtenir une différence mesurable avant intégration ; « plus rapide » reste ici une intention. Le levier ascendant ne possède pas d’invulnérabilité. Sa version EX n’ajoute ni rebond mural ni remise debout forcée.

L’analyseur de commandes traite `U` comme modificateur d’EX quand l’EX est légal. Il ne doit pas activer simultanément la lampe autonome. Si la ressource est insuffisante, il examine la meilleure action légale selon les priorités de la Bible, sans laisser une commande coûteuse impossible absorber un spécial disponible [4].

<!-- pagebreak -->

## Super et ultime

`236236H`, **Dégager le passage**, coûte 1 000 points de jauge. Son attaque initiale est mi-haute et gardable. La suite cinématique ne démarre que sur touche confirmée, avec trois bases de dégâts : 40, 80 et 100. La commande ne recharge pas la lampe et ne restaure pas de vie.

`214214H`, **Je choisis la sortie**, coûte 2 000 points. Son départ est également mi-haut. La proposition utilise les bases 50, 90 et 150. Le flash d’illustration ne déclenche aucun étourdissement supplémentaire et la séquence ne permet pas de continuation. Démarrages, contacts, récupération et durée de présentation restent à définir pour ces deux actions.

Un spécial standard peut être annulé vers le super uniquement sur touche. Les EX, le super et l’ultime ne reçoivent pas d’annulation vers un autre super. La jauge plafonne à 3 000 ; les coûts sont prélevés à l’acceptation de l’action, sans remboursement à l’interruption [4].

## Saisies

`6L + M` propose une prise de bras suivie d’un déséquilibre ; `4L + M`, un pivot avec changement de côté. Elles conservent les valeurs communes : démarrage 5 ticks, 120 dégâts, fenêtre de déchoppe 10 ticks et récupération à vide 25 ticks. La cible doit être au sol et aucun enchaînement ne suit la saisie.

La protection commune contre les saisies dure 5 ticks après la garde, l’étourdissement ou la relevée. La chorégraphie doit prévoir les différences de gabarit et une sortie neutre si les ancrages ne sont pas compatibles.

## Routes de test et dégâts calculés

| Route proposée | Dégâts après réduction | Condition essentielle |
|---|---:|---|
| 5L → 5M → 5H → 236L | 25 + 43 + 58 + 46 = 172 | Portée et fenêtres à vérifier |
| 2M → 3H → saut → jM | 42 + 59 + 36 = 137 | Annulations sur touche ; juggle 4 sur 8 |
| 5M → 5H → 236L → super | 48 + 65 + 52 + 28 + 48 + 55 = 296 | Spécial vers super sur touche |

Le calcul applique, impact par impact, `floor((base × pourcentage + 50) / 100)`. La suite commence à 100, 90, 80, 70, 60 puis 55 %. Le super ne remet pas cette réduction à zéro. Ces totaux sont contrôlés arithmétiquement ; aucune des routes n’est certifiée exécutable dans le moteur.

<!-- pagebreak -->

## Règles communes à préserver

Le budget de juggle reste de 8 : un lanceur consomme 3, un normal aérien 1 et un spécial aérien 2. Les remises debout forcées coûtent 4 et les rebonds muraux 2. La limite demeure un relancement, une frappe au sol et un rebond mural par séquence. La route aérienne de cette fiche ne comprend qu’un seul normal en l’air [4].

La réduction générale des dégâts a un plancher de 20 %, celui du super de 30 % et celui de l’ultime de 40 %. Les normaux ne causent aucun dégât en garde. Les spéciaux appliquent 10 % de dégâts en garde, arrondis à l’entier inférieur avec un minimum de 1 lorsqu’ils s’appliquent, sans permettre de KO. Super et ultime utilisent 20 % et peuvent provoquer le KO.

Les gains de jauge restent plafonnés par activation : 35 sur touche et 20 en garde pour un normal ; 20 sur touche pour un spécial. Le défenseur reçoit au maximum 25 sur touche et 15 en garde. Un coup à vide ne rapporte rien. L’attaquant ne gagne pas de jauge avec un EX, un super ou un ultime.

Le buffer garde ses 5 ticks, la séquence directionnelle ses 20 ticks et la fenêtre de commandes simultanées ses 2 ticks. Les commandes de menu, pause et résultat restent prioritaires. Les saisies, outils et déplacements respectent les états communs ; une animation ne peut pas autoriser une action interdite par la simulation.

## Paramètres à fermer avant intégration

| Domaine | Décisions et vérifications nécessaires |
|---|---|
| Contacts | Hitboxes, hurtboxes, portée, poussée, hitstun, blockstun et identifiant unique de chaque impact |
| Déplacements | Distance et vitesse de 6H et 214M, lancement de 3H, trajectoires et reprise au sol |
| Annulations | Fenêtres exactes, conditions touche ou garde, reprise après interruption |
| Lampe | Cibles compatibles, effet, durée, cône, portée, garde et délai avant réapplication |
| Attaques multiples | Intervalles EX et cinématiques, paiement unique, arrêt en garde ou à vide |
| Présentation | Ancrages des mains et des pieds, accessoires, orientation, flash réduit, caméra et son |

Ces décisions doivent être confrontées aux états réels du moteur. Une animation fluide ou un total de dégâts plausible ne remplace pas les essais de collision, d’interruption et de synchronisation.

<!-- pagebreak -->

## Rivalité et fins originales

Le rival proposé est **Neil Fisher sous forme humaine**, sous réserve de présence et de validation de cette variante dans le catalogue. La rencontre et ses dialogues sont une simulation originale pour le projet. L’introduction proposée de Moira est : « J’ai déjà assez donné pour les cages. »

Avant le duel, Moira demande : « Tu savais ce qu’ils nous feraient ? » Neil répond : « Tu ne comprends pas ce qui est en jeu. » Elle conclut : « Alors explique. Sans fermer la porte derrière moi. » La scène installe le conflit sans modifier les événements du jeu d’origine.

**Une voix au bout du fil** est la fin proposée quand l’objectif facultatif de récupération d’une preuve est rempli. Moira rejoint une radio, transmet les documents et prépare un point de secours. La dernière image montre son écoute attentive avant l’arrivée des survivants. La preuve sert à la résolution narrative et n’accorde aucun avantage de combat.

**Personne ne reste** est la fin proposée sans cette preuve. Moira renonce à retourner dans une zone dangereuse et accompagne les blessés vers la sortie. Elle confie la lampe à quelqu’un qui en a besoin et reste près du dernier évacué. Les récompenses de puissance restent identiques. La condition des deux fins doit être expliquée après la première conclusion afin que le joueur puisse rejouer en connaissance de cause.

## Finishers après le KO final

`22H + U`, **Jamais prisonnière**, propose un désarmement suivi d’une mise à distance. `214H + U`, **Derrière la grille**, propose un flash bref puis la fermeture d’un passage lorsque le décor possède un ancrage validé. Sans cet ancrage, la séquence utilise une victoire à distance qui ne dépend pas du décor.

Les deux commandes ne s’ouvrent qu’après le KO final, dans la fenêtre commune de 180 ticks. Elles causent 0 dégât, coûtent 0 ressource et n’accordent aucun bonus. Le résultat est déjà enregistré et ne peut plus être modifié. Elles ne s’activent ni après un simple round ni après expiration du temps. Le mode classé utilise la présentation courte prévue par la Bible [4].

Leur mise en scène doit rester compatible avec les gabarits et les orientations. Une absence d’ancrage, une interruption de présentation ou un changement de scène doit conserver le résultat enregistré et revenir proprement à l’écran de fin.

<!-- pagebreak -->

## Production des animations

La production doit distinguer les poses de référence des animations jouables. Il faut prévoir les états de déplacement, garde, saut, atterrissage, dégâts, projection, relevée et victoire, puis les douze normaux, l’outil, la remise en disponibilité, les spéciaux et leurs variantes. Les contacts et les récupérations doivent rester lisibles à vitesse réelle.

Chaque action nécessite une préparation, un contact ou une phase active, une récupération et une sortie après interruption. Les deux orientations exigent une vérification indépendante du bracelet, de la lampe et du pied-de-biche. Une inversion horizontale ne suffit pas à préserver les asymétries anatomiques.

Les fichiers futurs devront garder des dimensions, pivots et conventions de nommage stables. La ligne d’appui des pieds doit rester constante au sol, et les effets doivent disposer de leur propre ancrage. Le nombre d’images de chaque action sera déterminé après accord sur les états et durées ; aucun nombre de frames graphiques n’est présenté ici comme livré.

## Contrôles avant admission

1. Vérifier démarrage, phases actives et récupération au pas de simulation, puis sur touche, garde et coup à vide.
2. Tester ressources vides, coût EX unique, restauration uniquement au terme des 72 ticks et interruption de chaque action.
3. Contrôler les contacts multiples, les annulations autorisées, la réduction des dégâts et le budget de juggle.
4. Vérifier les deux côtés, les changements de côté, les différentes tailles de cible et la lampe sur cibles compatibles ou incompatibles.
5. Contrôler pause, reprise, rejeu déterministe et conservation du résultat pendant les finishers.
6. Examiner la lisibilité des effets avec réduction des flashs, les ancrages, les contours et les transitions d’équipement.

L’admission demandera un résultat documenté pour ces contrôles. Le présent complément apporte la conception et les calculs ; la qualification visuelle et l’exécution des essais restent ouvertes.

## Références

[1] Capcom, manuel officiel de Resident Evil Revelations 2, PS3, anglais. Sections sur Moira et les actions des partenaires. [Consulter le manuel](https://static.capcom.com/manuals/rer2/RER2_PS3_DMNL_EN.pdf).

[2] Capcom, manuel officiel de Resident Evil Revelations 2, PS4, français Canada. Équipement de Moira et gêne temporaire provoquée par la lampe. [Consulter le manuel](https://static.capcom.com/manuals/rer2/RER2_PS4_DMNL_FR-CA.pdf).

[3] Capcom, Screens art and details for Resident Evil Revelations 2, 10 septembre 2014. Contexte TerraSave et enlèvement. [Consulter l’annonce](https://news.capcomusa.com/brelston/blog/2014/09/10/screens-art-and-details-for-resident-evil-revelations-2).

[4] Resident Evil Combat Bible V1, règles générales pages 9 à 14 ; entrée de réserve Moira page 68. [Ouvrir la Bible V1](https://chatgpt.com/library?file_id=libfile_fde3_f-eb60b8aecc448191832240248f4d0666_b6040bcabe388191b426902484aff67a&account_id=personal).
