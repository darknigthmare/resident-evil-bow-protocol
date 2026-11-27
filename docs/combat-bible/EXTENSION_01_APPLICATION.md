# Extension 01 — Application à Resident Evil Combat

**V23 · 27 novembre 2026 · sections 30–49 du guide commun**

Cette extension définit les fonctions à ajouter au projet : taunts, sélection et désélection, équipes, clashes, objets persistants, stages bonus et exploration. Les règles proposées sont des **adaptations de combat 2D**. Les sources de personnages et de périodes sont distinguées dans la [bible principale](README.md) ; les valeurs de réglage ci-dessous ne proviennent pas de Capcom.

Source inchangée : [Combat_Games_Extension_01_Tag_Taunts_Bonus_v1.0.txt](sources/Combat_Games_Extension_01_Tag_Taunts_Bonus_v1.0.txt). Couverture et statuts : [matrice 68 sections](INTEGRATION_MATRIX.json). Le système de déblocage associé est détaillé dans [l'extension 02](EXTENSION_02_APPLICATION.md).

## 1. Existant et frontière de ce lot

Le [moteur de combat](../../src/combat-foundation-v060.js) possède déjà un buff `taunt`, des projectiles, des pièges et des détonations. Le taunt affecte les dégâts ; il ne faut donc pas transformer ce nom en simple animation cosmétique sans examiner chaque move qui le déclenche. Les pièges actuels enregistrent notamment le slot du joueur comme propriétaire. Le futur tag demandera une identité de combattant propriétaire distincte du slot d'équipe.

Le [menu R20](../../src/game-menu-r20.js) possède une navigation avec mémoire de focus et filtre de répétition des confirmations/retours. Les [correctifs R32](../GAMEDEV_APPLIED_R32.md) documentent des courses de chargement, pertes de focus et nettoyages ; ils sont les contrats à prolonger.

**V23 livre une application documentaire et des clés visuelles fixes de présentation.** Une animation complète, une assistance réelle, un transfert de contrôle, une scène duo ou une campagne ne sont pas déclarés terminés par ces fichiers. Le [lot V23](../../production-archives/rec-media/v23/README.md), son [manifeste](../../production-archives/rec-media/v23/ASSET_MANIFEST_V23.json) et sa [galerie](../../production-archives/rec-media/v23/galerie.html) donnent les résultats effectivement produits.

## 2. Taunts : personnalité et risque

Deux familles restent distinctes :

- **Présentation** : geste de personnalité, sans gain de jauge ou de dégâts ; le combattant reste exposé selon sa fiche.
- **Effet de combat** : taunt déjà présent ou nouvel effet explicitement autorisé dans un kit ; coût, durée, vulnérabilité et limite sont recensés comme pour un spécial.

Chaque fiche `TAUNT_*` indique incarnation, source ou statut original, commande remappable, états autorisés, entrée/pose/sortie, fenêtre d'interruption, retour au contrôle, voix/son, répétition et éventuelle condition de rivalité. Les phrases nouvelles sont identifiées comme dialogues écrits pour le fangame ; aucune imitation d'une réplique officielle n'est certifiée sans source.

### 2.1 Premier ensemble de fiches

| ID proposé | Incarnation | Geste conçu pour le projet | Effet et contrepartie | Assets / validation |
| --- | --- | --- | --- | --- |
| `TAUNT_BARRY_REV2_CHECK` | Barry, Revelations 2 | Regard sur les issues puis reprise de prise en main de l'arme déjà présente dans la référence | Présentation ; aucun tir, soin ou recharge implicite. Interruption par coup ; retour à une garde valide. | Entrée, pose, sortie et réaction d'interruption ; arme et tenue REV2 maintenues. |
| `TAUNT_REBECCA_RE0HD_RESOLVE` | Rebecca, RE0 HD Remaster | Courte respiration et geste de résolution, matériel gardé à sa place | Présentation ; aucun soin gratuit. Une action de soin serait un move distinct avec sa propre source. | Pose de résolution et sortie ; édition HD2016 conservée, non substituée à la fiche 2002. |
| `TAUNT_BILLY_RE0HD_CHALLENGE` | Billy, RE0 HD Remaster | Défi silencieux par posture et regard | Présentation ; aucun buff universel. Le tatouage et les accessoires ne changent pas de côté. | Entrée/sortie dédiée et asymétries contrôlées. |
| `TAUNT_BOW_CONTEXTUAL` | Une forme B.O.W. précisément référencée | Menace corporelle ou cri attesté pour la forme | À confirmer jusqu'à la référence ; ne pas importer le geste d'une autre créature. | Source de geste/son avant production ; variante par morphologie. |

Ces gestes sont des créations compatibles à revoir visuellement. Ils ne sont pas présentés comme animations extraites des jeux.

### 2.2 Interruption et anti-spam

La commande de taunt est consommée une fois par appui. Le maintien ne redéclenche pas la voix. La fin, l'interruption, le KO et la sortie de page annulent les événements de présentation encore en attente. Une nouvelle demande ne remet pas à zéro la récupération du move en cours.

Une sortie abrégée peut réduire une présentation, mais ne supprime pas une contrepartie de combat déjà engagée. Les taunts automatiques sont limités aux états définis et n'occupent pas la commande du joueur. La fréquence vocale et les scènes déjà vues disposent de réglages de confort ; les règles du duel restent identiques.

## 3. Cycle complet de sélection et désélection

| État | Déclencheur | Présentation | Résultat de contrôle |
| --- | --- | --- | --- |
| Survol | Déplacement du curseur | Focus et métadonnées autorisées | Aucun verrouillage de personnage ; une vieille requête d'image ne peut remplacer la nouvelle. |
| Présélection | Consultation active | Corps/version/costume corrects | Aperçu distinct du droit de sélection. |
| Confirmation | Appui validé | Geste ou pose de confirmation | Choix enregistré immédiatement ; animation non bloquante. |
| Attente confirmée | L'autre joueur choisit | Pose d'attente courte ou fixe | Annulation reste disponible selon les règles du lobby. |
| Changement de costume | Nouveau costume consulté/équipé | Aperçu révisé sans changer l'incarnation | Le modèle, l'arme, les effets et la provenance concordent. |
| Désélection | Annulation ou remplacement | Sortie dédiée ; forme courte lors d'une navigation rapide | Nettoyage du corps, des voix, particules, lumières et entités de l'ancien aperçu. |
| Validation d'équipe | Tous les membres confirmés | Rôles actif/réserve/soutien et compatibilités | Réévaluation du profil, des droits et du stage avant lancement. |
| Départ | Configuration autorisée | Transition versus | Configuration figée pour le match ; passage abrégé vers le même état. |

Ne pas jouer mécaniquement la confirmation à l'envers pour fabriquer une désélection. Le rangement ou la sortie possède sa logique propre. Une option de mouvement réduit affiche les poses clés et les mêmes informations.

### 3.1 Poses V23 et usage exact

| Incarnation | Présélection | Confirmation | Désélection | Qualification |
| --- | --- | --- | --- | --- |
| Barry — REV2 | `barry_rev2_selected_v23.png` | `barry_rev2_confirm_v23.png` | `barry_rev2_deselect_v23.png` | Clés fixes adaptées à partir des candidats générés V22 ; aucune animation officielle revendiquée. |
| Billy — RE0 HD | `billy_re0hd_selected_v23.png` | `billy_re0hd_confirm_v23.png` | `billy_re0hd_deselect_v23.png` | Edition HD2016 explicitement distincte de la référence V1 2002 à rapprocher. |
| Rebecca — RE0 HD | `rebecca_re0hd_selected_v23.png` | `rebecca_re0hd_confirm_v23.png` | `rebecca_re0hd_deselect_v23.png` | Même règle d'édition ; un sujet par source, asymétries conservées. |

Le lot V23 conserve **11 PNG natifs : 9 clés candidates et 2 premiers essais de sélection remplacés**, archivés dans `assets/trials/`. Les fichiers admissibles et leurs résultats de revue sont déterminés par le [manifeste V23](../../production-archives/rec-media/v23/ASSET_MANIFEST_V23.json). La table ci-dessus décrit les neuf clés retenues comme candidates ; les essais remplacés ne s'ajoutent pas aux états couverts. Les halos de contour, marges et alignements de ligne de sol restent à contrôler à la taille de jeu. Ce lot compte **zéro animation complète, zéro admission au moteur et zéro certification 1:1**.

### 3.2 Courses de sélection

Chaque joueur conserve un jeton de sélection monotonique et un propriétaire de présentation. Une nouvelle sélection, annulation, fermeture ou changement de costume invalide les réponses précédentes. Une promesse tardive, réussie ou rejetée, ne change ni l'image ni le message ni le lien courant. L'ancien chargement libère ses ressources sans relancer ses effets.

Un seul événement de confirmation est accepté par front d'appui. Les répétitions clavier, doubles clics, arrivée simultanée de la manette et du pointeur, et événements déjà consommés ne déclenchent pas deux engagements. Une perte de focus met les entrées maintenues en état neutre ; le retour ne confirme pas le choix tout seul.

Les deux curseurs ont des états indépendants. En cas de doublon interdit, la règle de réservation est déterministe et visible, sans remplacer silencieusement le choix de l'autre joueur. La sélection aléatoire tire uniquement parmi les entrées admissibles du contexte courant ; zéro entrée admissible produit une explication et un retour utilisable.

## 4. Profils d'équipe

Le mode annonce son profil avant la sélection. Les modes de duel existants gardent leur règle actuelle tant qu'un raccordement n'est pas versionné et testé.

| Profil proposé | Composition | Contrôle et défaite | Périmètre |
| --- | --- | --- | --- |
| `REC_ASSIST_V1` | Un actif + un soutien de roster | Seul l'actif est contrôlable ; défaite de l'actif termine le duel | Premier profil de validation d'assistance. Le soutien n'est pas nécessairement un combattant complet. |
| `REC_TAG_V1` | Deux combattants contrôlables | Vie propre ; passage de contrôle ; équipe battue après les deux KO | Le relais de secours et les appels ne sont pas ajoutés implicitement. |
| `REC_HYBRID_V1` | Deux combattants ; réserve pouvant assister | Vie propre ; disponibilité exclusive ; deux KO pour perdre | Une assistance de roster par équipe au maximum à un instant donné. |
| `REC_STORY_PAIR_V1` | Paire autorisée par le chapitre | Rôles et échec dictés par la mission | Une entité de soutien narratif n'est pas automatiquement admise au versus libre. |

**Budget de prototype proposé, non implémenté :** jauge d'équipe plafonnée à 100, départ à 0 ; assistance 25, relais volontaire 20, relais de combo 40, super duo 100. Les durées de récupération, vitesse de gain et conservation entre manches restent à calibrer avant exécution. Aucune valeur de ce tableau n'est injectée dans les constantes legacy.

Le gain d'équipe vient d'événements confirmés avec un plafond par séquence. Aucun gain ne doit être multiplié parce qu'un coup touche actif et soutien. Un coût est réservé puis prélevé une fois au point d'engagement ; un refus avant engagement ne dépense rien. Une interruption après engagement conserve le coût, sauf exception documentée par la fiche. L'absence de jauge ne bloque jamais l'arrivée obligatoire du dernier survivant après KO.

### 4.1 Commandes et priorité

Actions abstraites remappables : `TAUNT`, `ASSIST`, `TAG`, `DUO_SUPER`, `TEAM_FINISH`, `ENTITY_ORDER`. Les raccourcis distincts sont la base. Un schéma appui court/maintien peut être ajouté après définition du seuil et de sa priorité ; il ne doit pas lancer une assistance avant de reconnaître le maintien prévu pour un tag.

Si assistance et tag visent le même partenaire au même pas, un arbitre unique valide une action selon la priorité du profil. Le partenaire ne peut pas être simultanément en arrivée, en sortie et actif. Une super duo exige la réservation de tous ses participants et de la jauge ; un second consommateur ne voit pas la ressource déjà réservée.

### 4.2 Ressources et temps

Vie, munitions, statut de transformation, pièges, récupérations et état des armes appartiennent au combattant. La jauge commune appartient à l'équipe. Une récupération suit le temps simulé, avec comportement explicite pendant pause, hitstop et cinématique. La cadence d'affichage ne peut ni accélérer ni retarder la disponibilité.

La vie récupérable en réserve est une option de profil, différée tant que rythme, plafond, interruption et effet sur la durée des matches ne sont pas testés. Aucun soin gratuit n'est déduit du simple changement de combattant.

## 5. Assistances et vrais relais

### 5.1 Cycle assistance

`disponible → appel engagé → arrivée → action → sortie → récupération → disponible`, avec branches interruption et KO. La fiche précise point d'entrée, orientation, délai, signal sonore/visuel, portée, vulnérabilité, vie affectée, coût, combo et sortie.

L'aide apparaît depuis une bordure ou un emplacement cohérent avec l'arène. Une arrivée hors écran ne frappe pas avant son signal prévu. Les attaques tierces et transitions au même pas suivent une priorité stable. Une assistance pendant hitstun/garde est un secours défensif distinct ; elle est interdite par défaut jusqu'à conception de son coût et de ses réponses adverses.

### 5.2 Fiches pilotes

| ID proposé | Membres / référence | Intervention | Restrictions |
| --- | --- | --- | --- |
| `ASSIST_RE5_COVER` | Chris/Sheva RE5 ; partenariat CAP-RE5-MANUAL | Couverture courte avec l'arme verrouillée dans le loadout, sortie exposée | Chorégraphie 2D originale ; trajectoire, munitions et équipe doivent être cohérentes. Pas de tir si coût/munition/partenaire indisponible. |
| `ASSIST_REV2_LIGHT` | Claire/Moira ; CAP-REV2-MANUAL et CAP-REV2-PAIR | Moira concentre sa lampe, puis se retire | Effet seulement sur les cibles autorisées par la fiche ; ne pas aveugler universellement toute machine/B.O.W. Une attaque au pied-de-biche est une autre variante. |
| `SUPPORT_REV2_SENSE` | Barry/Natalia ; mêmes sources | Repérage d'une menace ou d'un point faible dans une mission compatible | Soutien d'information ; aucune balle ni attaque surnaturelle inventée. Une preuve de détection ne donne pas un tag complet en versus. |
| `ASSIST_RE0_COORDINATION` | Rebecca/Billy ; CAP-HISTORY et CAP-RE0-PAIR | Couverture et reprise de position complémentaires | Loadout de l'édition fixé ; gameplay original à documenter, pas de mélange des costumes 1998/HD/bonus. |

### 5.3 Formes de tag

Le relais volontaire part d'un état autorisé et laisse une exposition définie. Le relais de combo partage réduction de dégâts, rebonds et captures déjà consommés. Le secours défensif reçoit un coût propre. Le relais après KO entre sans coût bloquant. Le relais scénarisé suit les participants et connaissances du chapitre.

Le transfert de contrôle intervient sur un événement de simulation identifié. L'entrant possède position, orientation, collisions et état de défense déterminés ; le HUD suit ce transfert. Les commandes mises en mémoire pendant l'entrée ne sont consommées qu'une fois. Un partenaire KO ou engagé dans une assistance ne peut être sélectionné.

Un projectile déjà tiré garde son propriétaire ; sa cible, sa trajectoire et le crédit du coup ne sont pas réécrits parce que l'actif change. Le tableau des pièges actuel ne doit pas attribuer au nouvel actif tous les objets enregistrés sous le slot du joueur. Il faut conserver `team_id`, `fighter_instance_id` et `spawn_id` dans le futur schéma d'équipe.

## 6. Supers duo, finishers et fins dramatiques

### 6.1 Trois familles

| Famille | Moment | Exemple de conception | Résolution |
| --- | --- | --- | --- |
| Super duo | Pendant le combat | « Couverture croisée » Chris/Sheva ; nom et chorégraphie du projet | Première attaque confirmée → scène complète ; garde/échec → variante courte ; coûts conservés selon fiche. |
| Finisher d'équipe | Après condition de conclusion | Neutralisation coordonnée, désarmement ou extraction selon participants/cible | Aucun changement rétroactif du vainqueur ; cibles et partenaires requis disponibles. |
| Fin dramatique | Conditions particulières de version/lieu/adversaire | Scène liée à un incident documenté, ou variante alternative clairement nommée | Priorité sur le générique si toutes les conditions sont vraies ; sinon repli compatible. |

Les noms ci-dessus sont originaux. Une paire canonique n'authentifie pas automatiquement une chorégraphie. Une scène emblématique n'est reproduite qu'après références d'action, de contexte et de costume.

### 6.2 Fiche représentative `DUO_RE5_CROSS_COVER_V1`

- **Participants :** Chris et Sheva, RE5, loadouts explicitement référencés ; partenariat attesté, technique 2D originale.
- **Condition :** profil autorisé, deux membres vivants, réserve disponible, jauge suffisante, cible et espace admissibles.
- **Entrée :** annonce brève, engagement de l'actif ; la longue scène commence uniquement après confirmation du contact initial.
- **Action :** ouverture par le meneur, contribution distincte du partenaire, impact final, séparation des acteurs ; aucune arme non prévue ajoutée pour remplir le cadre.
- **Garde/échec :** résolution courte et récupération du meneur ; le soutien ne rejoint pas une cinématique déjà refusée.
- **Sortie :** meneur initial actif, positions légales, partenaire en sortie puis récupération, combo conservé ; aucune recharge d'arme automatique.
- **Cible incompatible :** séquence courte de couverture avec résultat simulé défini, ou refus avant engagement ; pas de saisie humanoïde appliquée à une masse géante.
- **Assets :** entrée/action/sortie de chacun, réaction cible, points d'émission, sons, sous-titres, VFX séparés et version abrégée.
- **État :** documenté ; animation, code et recette restent à réaliser.

### 6.3 Priorité des conclusions

Résoudre d'abord le résultat du match. Chercher ensuite une fin dramatique spécifique compatible, puis un finisher collectif, un individuel compatible, enfin une victoire standard. Aucun partenaire KO ne revient implicitement pour la scène. La version abrégée produit le même état final et la même récompense, sans double attribution.

En campagne, période, connaissance des personnages, présence réelle du partenaire et état de l'arène font partie des conditions. Le versus hypothétique peut autoriser des paires hors chronologie avec une mention de simulation ; il ne modifie pas les scènes du récit principal.

## 7. Clashes et QTE compatibles avec Resident Evil

L'objectif est un affrontement entre actions admissibles, pas une collision universelle entre toutes les attaques. Aucun rayon énergétique ou pouvoir nouveau n'est donné aux personnages pour imiter une autre licence.

| Résolution | Règle proposée | Modes |
| --- | --- | --- |
| Échange normal | Les contacts se résolvent selon la simulation habituelle | Tous, par défaut. |
| Clash mécanique | Groupe explicitement compatible ; rebond/annulation/priorité bornée | Duel compétitif possible après recette. |
| Clash cinématique | Contact physique et versions admissibles ; courte interaction ou résolution automatique | Histoire/spectacle seulement jusqu'à validation d'une règle PvP commune. |

Une opposition de lames ou de force doit être cohérente avec les équipements et capacités concernés. Sa fiche décrit deux actions exactes, phases actives, contact des zones, distance/orientation, fenêtre simultanée et limite de fréquence. Les tirs ordinaires ne produisent pas une lutte de pression en suspension.

Pour le QTE proposé : appui dans une fenêtre courte ou direction, commandes remappées, durée maximale, réussite, échec, égalité, absence d'entrée et déconnexion. Le maintien peut remplacer un martèlement en solo. Une aide individuelle ne modifie pas secrètement un duel PvP.

Pendant la scène, l'état du chrono, des soutiens, pièges, projectiles et impacts engagés est commun. Un projectile tiers arrivé au même pas ne favorise pas le joueur mis à jour en premier. La détection appartient à la simulation ; l'animation ne décide pas qu'un clash a eu lieu. La version sans QTE suit une résolution déterministe annoncée avant match.

## 8. Entités natives, objets placés et projectiles persistants

Les entités font partie du kit de leur propriétaire. Elles ne consomment pas automatiquement une place de tag et ne sont pas vendues/débloquées séparément si elles sont indispensables au kit de référence.

### 8.1 Familles retenues

| Famille | Application Resident Evil | Frontière |
| --- | --- | --- |
| Projectile | Arme ou attaque biologique attestée de l'incarnation | Forme/vitesse/effet/impact définis par fiche ; réglages 2D explicites. |
| Objet placé / piège | Dispositif du kit ou scénario, notamment mécanismes Lucas déjà traités par le moteur | Attribution stable, armement, déclencheur et budget ; pas de nouvel objet canonique inventé. |
| Zone persistante | Effet attesté adapté à la surface de combat | Durée, lisibilité, limite, contre-mesure et retrait documentés. |
| Soutien ou créature autonome | Seulement lorsque le personnage/version le justifie | Référence nécessaire ; ne pas ajouter systématiquement un familier à chaque combattant. |
| Illusion / double | Uniquement sur preuve de la capacité et du contexte | Un effet visuel n'obtient pas implicitement des collisions ou des dégâts. |

Chaque entité conserve propriétaire de combattant, équipe, ID d'émission, définition/version, état, position, trajectoire, âge, durée, budget de touches, collision, réponse adverse, ressource et attribut de crédit des dégâts. L'entité réfléchie change de propriétaire selon une règle explicite, pas seulement de couleur.

### 8.2 Table d'événements à remplir par entité

| Événement | Règle de base proposée | Exception à justifier |
| --- | --- | --- |
| Propriétaire touché/projeté | Action déjà émise continue si sa fiche le permet ; nouvelle commande interrompue | Entité liée en continu au geste ou à la concentration. |
| Propriétaire en réserve | Aucun changement de propriétaire ; commande autorisée seulement si prévue | Rappel ou désactivation automatique spécifique au kit. |
| Propriétaire KO | Résoudre les impacts engagés dans l'ordre commun puis appliquer fin de vie | Persistance après KO seulement explicite et équilibrée. |
| Transformation | Conserver les entités compatibles ; conversion/retrait borné des autres | Pas de duplication de charge par changement de forme. |
| Transition d'arène | Retrait ou transfert prévu par type, destination chargée | Une mine ancrée à l'ancienne salle ne se téléporte pas sans justification. |
| Nouvelle manche | Remise à zéro définie par profil | Continuité de mission explicitement séparée du duel. |
| Super/clash/finisher | Gel ou poursuite synchronisée, identique pour les deux équipes | La version abrégée conserve le même résultat. |
| Correction/replay | Restauration du même ID et des touches déjà consommées | Aucune réapparition, dépense ou récompense doublée. |

Les budgets de pièges, projectiles, zones et assistances sont séparés puis testés ensemble. Un remplacement à limite atteinte est un choix explicite : refus ou retrait du plus ancien. Les éléments de danger restent visibles lorsque les effets graphiques sont réduits.

## 9. Stages bonus intégrés aux parcours

Les bonus sont des créations de mission adaptées à la franchise. Ils ne sont pas présentés comme des modes officiels Resident Evil copiés à l'identique. Ils conservent les capacités, l'urgence et la période du protagoniste.

| ID proposé | Famille | Contexte / objectif | Critère et sortie |
| --- | --- | --- | --- |
| `BONUS_RANGE_TRAINING` | Précision et tir | Entraînement explicitement signalé ; cibles et munitions limitées | Touches correctes et erreurs comptées ; variante de cible pour kit sans arme. |
| `BONUS_EVAC_COVER` | Protection/extraction + horde | Couvrir une sortie lors d'une reconstitution d'incident autorisée | Survie d'un objectif et durée bornée ; unités adaptées, pas de Tyrant réduit arbitrairement à un PV. |
| `BONUS_RE0_COORDINATION` | Coordination d'équipe | Rebecca/Billy : activer des mécanismes complémentaires dans un lieu référencé | Deux rôles et chemin valide ; aucune impasse si un membre est indisponible. |
| `BONUS_REV2_DETECTION` | Maîtrise de soutien | Barry/Natalia : identifier menace et passage d'une mission compatible | Repérage et choix de route ; pas de tir demandé à Natalia. |
| `BONUS_REV2_LIGHT` | Défense/contre | Claire/Moira : lumière puis fenêtre de déplacement sur cible admise | Signaux et timing ; effet limité aux cibles prévues. |
| `BONUS_OBSTACLE_BREAK` | Destruction contrôlée | Obstacle ou cible d'entraînement compatible ; équivalent original du bonus de casse | États de dégradation, outils admis, score ; ne pas importer une voiture au milieu d'un laboratoire sans raison. |
| `BONUS_CONTAINMENT_EXIT` | Mobilité/fuite | Rejoindre une issue à travers obstacles cohérents | Capacité réelle du kit, chrono et reprises accessibles. |
| `BONUS_DEVICE_SHUTDOWN` | Interaction/sabotage fictif | Couper un dispositif de jeu dans une séquence scénarisée | Commandes fictives et vulnérabilité, aucune capacité technique universelle attribuée au roster. |

Les deux familles restantes du guide — culture/personnalité et maîtrise d'entité avancée — restent retenues pour adaptation lorsque personnage et source justifient une épreuve. Elles ne reçoivent pas de fausse scène pour remplir le tableau.

Chaque fiche de bonus fixe version/lieu, caractère facultatif ou obligatoire, préconditions, état initial vie/munitions/équipe, ennemis et plafond simultané, score, rangs, échec, récompense, checkpoint et état transmis à l'histoire. Les valeurs de PV, nombre de vagues et délais sont des réglages de projet à tester.

Un bonus facultatif peut échouer sans fermer la campagne ; sa récompense dépend du résultat annoncé. Une mission indispensable possède une reprise. Un résultat possède un identifiant unique : recommencer son écran de récompense ne produit pas un second lot. Les hordes demandent collisions de foule, spawn annoncé, budget de présence et solutions pour les munitions limitées.

## 10. Hub proposé : Archives de confinement

**Statut : original compatible, interface exploratoire du fangame.** Le hub classe les dossiers et récompenses ; il n'affirme pas l'existence canonique d'un bâtiment reliant physiquement tous les incidents. Sa représentation peut être une carte 2D ou un espace 2,5D ultérieur.

| Zone proposée | Accès | Fonction | Récompenses possibles |
| --- | --- | --- | --- |
| Accueil des dossiers | Disponible dès le départ | Orientation, état des incidents, guide d'apprentissage | Aucun paiement ou victoire préalable nécessaire pour les réglages. |
| Salle des rapports | Première lecture de dossier | Archives, scènes vues, sources de continuité | Illustrations et épilogues déjà acquis selon les systèmes existants. |
| Galerie d'équipement | Défi de maîtrise ou récompense ciblée | Costumes et présentations | Identité/costume/édition et provenance affichées. |
| Chambre d'essais | Initiation terminée selon règle du projet | Bonus et rencontres d'entraînement | Conditions de progression lisibles, jamais circulaires. |
| Réserve des incidents | Conditions propres à chaque dossier | Accès aux branches de campagne et scènes découvertes | Stages/variantes, scènes et défis, suivant extension 02. |

Les connexions sont des passages identifiés entre zones voisines du hub. Une porte possède position, destination et condition ; une clé n'exige pas la récompense qu'elle ouvre. Les dossiers d'autres lieux s'ouvrent comme des reconstitutions avec une transition annoncée, pas comme une porte menant arbitrairement d'un continent à l'autre.

Le catalogue est unique : un casier et un menu référencent le même `content_id`. L'ouverture enregistre un événement stable, vérifie le coût et attribue une fois. Après fermeture pendant la révélation, la récompense et l'état du casier sont récupérés. Les objets déjà possédés affichent leur état avant dépense ; pas de duplication ou de remplacement aléatoire silencieux.

## 11. Relations, versions et priorités de production

| Paire | Relation sourcée | Usage narratif | Usage versus |
| --- | --- | --- | --- |
| Chris/Sheva RE5 | Partenariat de mission, CAP-RE5-MANUAL | Priorité pour couverture et scène duo, dans leur période | Compatible après kits complets. |
| Rebecca/Billy RE0 | Association documentée, CAP-HISTORY/CAP-RE0-PAIR | Priorité pour coordination et exploration | Compatible après verrouillage de l'édition. |
| Claire/Moira REV2 | Scénario officiel, CAP-REV2-PAIR | Rôles propres, lampe/pied-de-biche sourcés | Assistance à valider ; ne pas déduire un kit complet de la seule présence d'un soutien. |
| Barry/Natalia REV2 | Scénario officiel, CAP-REV2-PAIR | Détection et protection dans les missions | Soutien d'information conditionnel ; aucune disponibilité universelle présumée. |
| Deux incarnations éloignées | Pas de scène commune attestée par défaut | Exclues d'un chapitre incompatible | Rencontre de simulation explicite si le mode l'autorise. |

Produire d'abord une paire représentative, ses présentations et une assistance, puis un relais, une super et un bonus. Pour les autres associations, un relais générique compatible reste identifié comme générique ; il ne compte pas comme chorégraphie exclusive. Le nombre de duos exclusifs n'est pas égal au nombre de paires possibles.

## 12. Données de production et critères d'acceptation

Les dix fiches A–J de l'original sont retenues. Chaque enregistrement possède ID/version, sources/statut de fidélité, participants, conditions, commandes, ressources, simulation, présentation, assets, critères et état. Les domaines supplémentaires à suivre sont taunts ; sélection/désélection ; assistances ; relais ; supers ; conclusions ; clashes ; entités ; bonus ; zones et récompenses.

| Cas | Résultat attendu | Type de preuve future |
| --- | --- | --- |
| E01-01 Navigation rapide, confirmation, annulation et ancien chargement | Ancienne présentation nettoyée ; choix courant inchangé | Navigation réelle et réponses asynchrones inversées. |
| E01-02 Taunt interrompu | Vulnérabilité respectée, voix arrêtée, retour au contrôle | Combat à l'instant d'interruption. |
| E01-03 Assistance + tag simultanés | Un seul engagement du partenaire | Simulation déterministe, deux côtés. |
| E01-04 Deux dépenses sur dernière jauge | Débit unique, second refus expliqué | Ressource au seuil, pas de solde négatif. |
| E01-05 Soutien touché/KO à l'arrivée | Vie, sortie et état d'équipe cohérents | Contact réel pendant l'entrée. |
| E01-06 Super pendant sortie d'assistance | Refus ou queue autorisée selon profil, jamais double usage | Séquence d'états du partenaire. |
| E01-07 Super initial gardé/raté | Variante courte et coût correct | Touche/garde/vide comparés. |
| E01-08 Fin incompatible | Repli déterministe ; vainqueur conservé | Cible géante, mauvais costume/période/stage. |
| E01-09 Clash avec projectile tiers | Même résultat quel que soit ordre d'acteurs | Contacts simultanés et replay. |
| E01-10 QTE tous résultats | Réussite/échec/égalité/absence/déconnexion bornés | Scénarios de chaque issue et sans QTE. |
| E01-11 Propriétaire réserve/KO | Propriété et persistance conformes | Piège déjà posé avant relais. |
| E01-12 Transition pendant combo | Budget de combo conservé et entité traitée | Zone d'arrivée chargée et jouable. |
| E01-13 Projectile réfléchi | Crédit, ressources et conclusion exacts | Identités propriétaire/équipe après réflexion. |
| E01-14 Cycle piège–relais–assistance | Pas de combo ou garde infinie | Scénario de boucle et sortie défenseur. |
| E01-15 Horde au plafond | Spawn, collision, performance et issue lisibles | Stress à budget annoncé, pas seulement moyenne FPS. |
| E01-16 Bonus réussi/raté | Bonne progression, ressources et récompense | Reprise de chaque résultat. |
| E01-17 Récompense puis fermeture | Persistance sans double attribution | Fermeture/rechargement pendant révélation. |
| E01-18 Scène abrégée/replay | État final identique et pas de doublons | Trace de simulation et présentation. |

Ces cas sont des critères à exécuter quand leurs systèmes sont raccordés. Cette intégration documentaire ne les marque pas réussis. Le prototype isolé de sélection/droits couvre son propre périmètre, décrit dans son rapport ; il ne valide pas assistance, tag ou simulation de combat.
