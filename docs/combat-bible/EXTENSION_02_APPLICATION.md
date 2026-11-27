# Extension 02 — Slots, déblocages et contenus de soutien

**V23 · 27 novembre 2026 · sections 50–67 du guide commun**

Cette application ajoute à la bible un catalogue d'accès pour les personnages, soutiens, costumes, stages et modes. Elle conserve les règles de fidélité et de production de la [bible principale](README.md) et s'articule avec [l'extension 01](EXTENSION_01_APPLICATION.md).

Source intégrée sans changement : [Combat_Games_Extension_02_Slots_Verrouilles_Deblocages_Abonnes_v1.0.txt](sources/Combat_Games_Extension_02_Slots_Verrouilles_Deblocages_Abonnes_v1.0.txt). Les décisions des sections 50–67 figurent dans la [matrice](INTEGRATION_MATRIX.json).

## 1. État réel et résultat visé

Le [noyau Chroniques](../../src/chronicles-core-v060.js) possède déjà un tableau `unlocked`, des conditions de lecture d'épilogue et une validation des parcours terminés. Il serait incorrect d'annoncer que le projet ne possède aucun déblocage. Ce tableau reste limité à son contrat historique ; il ne représente pas les droits de sélection d'un personnage, d'un costume ou d'un stage.

Le [prototype V23](../../production-archives/rec-media/v23/prototype/index.html), accompagné de son [périmètre](../../production-archives/rec-media/v23/prototype/README.md), démontre séparément des états de slots, règles ET/OU, événements d'acquisition et annulations de sélection. Ses profils et preuves de droits sont **simulés**. Il ne modifie pas les sauvegardes du jeu, n'installe pas un nouveau mode de combat et ne constitue pas une liaison Patreon ou un traitement de paiement.

Le résultat recherché pour le futur jeu est précis : un contenu consultable affiche ce qu'il est permis de révéler, sa condition réelle, ses dépendances et la prochaine action utile. Un verrou ne dissimule jamais une image absente, un système inachevé ou une erreur de chargement.

## 2. Quatre dimensions indépendantes

| Dimension | États de conception | Responsabilité |
| --- | --- | --- |
| Découverte | `secret`, `hint`, `identified` | Ce que le menu peut révéler : identité, silhouette, voix, lieu, condition et texte accessible. |
| Droit d'accès | Aucun ; conditions remplies à réclamer ; permanent ; temporaire actif ; vérification en attente ; expiré ; retiré | Pourquoi un contenu peut être utilisé et pour quelle durée. Les sources restent distinctes. |
| Disponibilité technique | Prêt ; fichiers manquants ; mise à jour requise ; erreur/indisponibilité | Le contenu peut-il être chargé dans sa bonne version ? |
| Compatibilité | Mode, équipe, incarnation, costume, doublon, dépendances et règles de match | Le droit est-il utilisable dans ce contexte précis ? |

Un booléen `unlocked` ne suffit pas pour ce modèle. Un costume permanent peut être obtenu avant son personnage. Un stage peut être possédé mais absent du paquet installé. Un combattant peut être autorisé à l'entraînement et exclu d'un chapitre qui exige une autre incarnation.

### 2.1 Résolution de l'état affiché

1. Appliquer la politique de découverte avant de produire nom, image, audio, texte accessible ou notification.
2. Calculer toutes les sources de droit valides et les conditions éventuellement réclamables.
3. Évaluer dépendances et compatibilité du contexte.
4. Examiner disponibilité/version des assets.
5. Déduire les actions distinctes : consulter, prévisualiser, sélectionner/équiper, participer, s'entraîner.
6. Présenter l'obstacle prioritaire et permettre de consulter les autres raisons, sans effacer une acquisition valide.

Le refus de sélection n'est pas un refus de focus. Un clic de confirmation sur une entrée indisponible ouvre une fiche utile, puis revient au même emplacement ; il n'entre pas dans une boucle d'erreurs. Si aucune entrée aléatoire n'est admissible, afficher la raison et un retour possible.

### 2.2 Messages de référence

| Situation | Libellé et action proposés |
| --- | --- |
| Secret | « Dossier non révélé » ; afficher un indice de parcours compatible avec l'anti-spoiler. |
| Identifié, sans droit | « À débloquer » ; voir la condition et ses alternatives. |
| Condition remplie, récupération requise | « Récompense disponible » ; réclamer ou rejoindre le casier concerné. |
| Permanent, dépendances prêtes | « Acquis » ; sélectionner/équiper si le mode le permet. |
| Costume acquis, personnage non disponible | « Costume acquis — personnage requis indisponible » ; conserver la récompense. |
| Droit valide, fichier absent | « Acquis — installation nécessaire » ; ne pas proposer un achat comme solution. |
| Accès temporaire actif | « Accès de soutien actif » ; consulter sa durée lorsqu'elle est établie. |
| Fournisseur indisponible | « Vérification indisponible » ; conserver le dernier état selon la politique annoncée. |
| Expiration confirmée | « Accès temporaire terminé » ; proposer une autre voie valide si elle existe. |
| Restriction de mode | « Indisponible dans ce mode » ; expliquer la restriction sans révoquer le droit. |

Les exemples ne fixent pas la localisation finale. Les identifiants restent stables lorsque le texte change.

## 3. Charte visuelle Resident Evil

**Direction retenue : dossier classifié, scan d'identification et autorisation de secteur.** Ce langage est une métaphore d'interface originale compatible avec le ton scientifique/militaire. Il ne crée ni sceau magique ni règle fictive selon laquelle les protagonistes s'abonneraient à un service réel.

| Catégorie | Version verrouillée | Version secrète | Révélation proposée |
| --- | --- | --- | --- |
| Personnage | Silhouette noire lisible, cadre de dossier et cadenas/badge | Emblème neutre ; aucune silhouette reconnaissable | Autorisation validée puis portrait ; version réduite par apparition simple. |
| Costume | Aperçu assombri ou complet autorisé avec marque d'accès | Dossier neutre si la tenue révèle une identité/forme | Mise à jour de la fiche du personnage, sans changer le kit. |
| Stage | Miniature assombrie et accès de secteur | Carte/coordonnées masquées | Ouverture de la destination et affichage de la période. |
| Mode | Tuile consultable avec condition de qualification | Nom générique sans dénouement divulgué | Accès au parcours et rappel de ses règles. |
| Scène / taunt / collection | Fiche d'archive, badge de découverte | Numéro de dossier sans spoiler | Présentation courte, puis consultation volontaire. |

Le symbole de verrou et le texte se complètent. La couleur seule ne code pas l'état. Le fond, le contour et le focus doivent rendre une silhouette noire lisible. Les tailles de texte, les dispositions étroites, clavier/manette et lecteurs d'écran font partie de la recette.

Les animations prévues sont repos discret, focus, tentative de sélection, récompense prête, révélation et désélection. Le son de refus reste bref et ne se répète pas pendant un maintien. Les flashes sont contrôlables ; mouvement réduit et version statique transmettent la même information.

### 3.1 Anti-spoiler cohérent

La même politique filtre titre, silhouette, biographie, voix, miniatures, infobulles, alt/ARIA, notifications et liens visibles. Les noms techniques internes ne sont pas utilisés comme texte de secours. Si une silhouette identifie clairement le combattant, elle correspond à `hint`, jamais à `secret`.

La règle masque les contenus non découverts dans les menus concernés. Elle ne promet pas de cacher un adversaire effectivement rencontré en multijoueur. Une version transformée ou une arène détruite peut recevoir sa propre découverte, même si sa version de base est déjà identifiée.

## 4. Personnages, costumes, soutiens et modes

### 4.1 Personnages et entités

Un personnage peut posséder plusieurs variantes techniques et un rôle de soutien. La fiche annonce quels éléments sont compris dans l'acquisition. Une entité indispensable au moveset reste comprise ; on ne retire pas un piège essentiel ou un compagnon natif derrière un verrou cosmétique.

Le droit d'un membre ne signifie pas compatibilité de toutes ses paires. L'accès à une fin dramatique est distinct de l'accès aux participants. Un prêt de personnage dans un chapitre est distinct de son déblocage permanent et ne prouve pas qu'il rejoint tous les récits.

La production ne doit pas transformer un combattant encore non intégré en faux « secret à débloquer ». Pour les incarnations humaines actuellement réconciliées en V22, le catalogue réel conserve sa disponibilité technique et ses limites d'admission. Les entrées du prototype V23 utilisent des données de démonstration ; elles ne sont pas une promesse de kit jouable.

### 4.2 Costumes

Chaque costume référence son personnage, sa version, ses accessoires compatibles et sa provenance. Une tenue cosmétique conserve collisions, délais, commandes et ressources. Une tenue changeant réellement le kit devient une variante distincte, avec ses critères de compétition et de campagne.

L'aperçu peut être libre, partiel ou secret selon la découverte. Prévisualiser ne donne pas le droit d'équiper. Obtenir un costume avant son personnage conserve l'acquisition et affiche la dépendance. Une tenue HD2016 ne devient pas une tenue de l'édition 2002 du seul fait qu'elle porte le même nom.

### 4.3 Modes

Les réglages, l'accessibilité et l'entraînement nécessaire aux mécaniques déjà accessibles ne sont pas enfermés derrière un défi ou un soutien. Boss Rush, défis avancés, routes alternatives et zones supplémentaires peuvent avoir des conditions propres. Chaque condition doit pouvoir être remplie sans accéder préalablement au contenu qu'elle ouvre.

Le tableau des dépendances est vérifié pour cycles directs et indirects. Une fermeture pour maintenance ou fichiers manquants n'est pas présentée comme un objectif de progression.

## 5. Règles de déblocage et attribution

Une règle a un ID/version, une expression de conditions, des événements admissibles, un périmètre de sauvegarde, une politique de découverte, des dépendances, un mode d'attribution et une récompense. Les valeurs de score ou de nombre de victoires ci-dessous sont des **propositions à tester**, pas des objectifs déjà enregistrés dans le runtime.

### 5.1 Conditions ET / OU

| Exemple de règle proposée | Expression de conception | Résultat |
| --- | --- | --- |
| `UNLOCK_RE0_ARCHIVE_SCENE` | Route RE0 terminée **ET** casier d'archive ouvert | Scène/illustration permanente, après récupération. |
| `UNLOCK_PRESENTATION_BARRY` | Défi de précision réussi **OU** récompense d'exploration correspondante | Présentation alternative permanente ; les deux voies restent affichées. |
| `ACCESS_SUPPORTER_AMBIENCE` | Acquisition permanente autorisée **OU** justificatif temporaire valide | Ambiance disponible ; expiration temporaire sans effet sur la source permanente. |
| `UNLOCK_ADVANCED_BOSS_PATH` | Initiation terminée **ET** ensemble de boss prédéfini rencontré | Parcours avancé ; aucune victoire dans ce parcours exigée pour l'ouvrir. |

Le prototype représente ces expressions par `all`, `any`, faits et compteurs. Le moteur final doit enregistrer la provenance des événements, les modes admissibles, la difficulté si elle compte, les abandons, remises à zéro et périodes. Aucun accomplissement rétroactif n'est promis si l'ancienne sauvegarde ne conserve pas l'événement requis.

### 5.2 Attribution unique

L'attribution porte un ID d'événement et une révision par source. Une répétition du même événement retourne l'état déjà connu. Un événement plus ancien ne peut annuler un droit plus récent. Une récompense ne change pas arbitrairement de date ou de durée lors d'une nouvelle synchronisation.

Le coût d'ouverture et l'attribution sont engagés selon une stratégie de sauvegarde documentée. L'animation vient après la sauvegarde logique ; fermer ou abréger la révélation ne perd pas le contenu. Un second clic ne prélève pas une seconde clé. Si la récompense est déjà permanente par une autre source, l'interface l'annonce avant toute dépense et suit la politique de doublon fixée.

Le périmètre d'autorité est explicite : progression locale pour un profil local, autorité de compte pour droits synchronisés, service de partie pour un résultat réseau. Une sauvegarde locale éditable n'est pas une preuve d'un soutien externe.

## 6. Exploration et catalogue unique

Les [Archives de confinement](EXTENSION_01_APPLICATION.md#10-hub-proposé--archives-de-confinement) utilisent le même `content_id` que les menus. La porte, le casier, le dossier et la tuile de sélection représentent différents accès à une même entrée, sans créer des copies concurrentes.

Chaque point d'acquisition conserve zone/position, accès, coût, récompense, découverte et état après ouverture. Le trajet rejoint réellement le point annoncé. Le casier d'une scène ne se retrouve pas derrière une porte dont la clé est cette même scène.

Un succès automatique produit immédiatement l'acquisition ; il n'affiche pas « à réclamer » si aucune récupération n'est prévue. Un objet à découvrir conserve son état ouvert après reprise. Les scènes de révélation sont consultables ensuite sans refaire la transaction.

## 7. Contenus dédiés aux soutiens

La bible retient la **possibilité de contenus cosmétiques et d'ambiances dédiées**, sans activation de paiement dans V23. Chaque offre future devra identifier ses contenus réellement disponibles, dépendances et autorisations de réutilisation connues. Un contenu original compatible garde ce statut après acquisition.

| Modèle | Attribution | Fin d'abonnement ordinaire | Exemple de conception |
| --- | --- | --- | --- |
| Permanent | Événement admissible vérifié accorde une récompense durable | Acquisition conservée | Présentation ou cadre de dossier livré pendant une période définie. |
| Temporaire | Accès au catalogue pendant l'admissibilité connue | Source temporaire expire à sa date effective | Ambiance de stage proposée comme accès limité. |
| Livraison par période | Chaque lot possède son propre événement et sa politique | Selon permanence propre à chaque lot | Collection mensuelle nommée ; anciens lots inclus/exclus explicitement. |

La liaison d'un compte ne vaut pas paiement ni admissibilité. Essais, cadeaux, adhésions gratuites, changements de niveau et livraisons passées demandent une politique d'avantage. Un nom commercial ou un prix ne sert pas d'identifiant technique.

Les modalités sont affichées avant redirection : contenu, durée ou permanence, conditions, dépendances, voie gratuite éventuelle, plateformes et règles de participation. Une voie gratuite **OU** soutien reste une alternative ; elle n'est pas transformée en obligation de faire les deux.

### 7.1 Adaptateur fournisseur différé

Patreon ou un service équivalent devra passer par son autorisation officielle et une vérification de confiance. Le jeu ne demande pas le mot de passe du fournisseur. Les secrets et jetons ne résident pas dans le client public. Les événements sont vérifiés, dédupliqués, ordonnés par version et réconciliés avec l'état autoritatif.

Les sources de l'original citent [la documentation Patreon](https://docs.patreon.com/) ; ses champs et conditions doivent être revérifiés lors d'une implémentation réelle. V23 ne fixe ni compte de campagne, ni prix, ni niveau, ni serveur OAuth, ni webhook actif. Un paramètre de vérification injecté dans les tests du prototype est une **fixture**, pas un mécanisme de sécurité de production.

Liaison, déliaison, arrêt du renouvellement et suppression du compte de jeu sont des actions séparées. Les règles de changement/transfert de profil évitent la duplication d'une livraison permanente. La collecte se limite aux informations requises pour les avantages concernés.

## 8. Expiration, panne, hors ligne et match en cours

| Événement | Traitement retenu pour le projet |
| --- | --- |
| Arrêt du renouvellement | Attendre la fin effective confirmée de l'accès temporaire ; aucune révocation anticipée déduite d'une simple annulation. |
| Expiration confirmée | Retirer seulement la source temporaire concernée ; recalculer les autres sources. |
| Récompense permanente déjà livrée | La conserver après fin ordinaire du soutien selon son modèle déclaré. |
| Diminution de niveau | Appliquer les avantages à la date effective vérifiée. |
| Panne fournisseur / statut inconnu | Afficher l'incertitude ; ne pas annoncer « abonnement terminé ». |
| Remboursement/retrait confirmé | Appliquer la politique d'avantage à sa source ; aucune suppression d'une autre acquisition indépendante. |
| Déliaison | Suivre la politique de justificatif et d'acquisitions ; ne pas confondre avec suppression de progression. |
| Reconnexion | Réconcilier sans doubler les lots ou prolonger arbitrairement les droits. |

### 8.1 Politique hors ligne

Les acquisitions permanentes localement valides restent permanentes ; elles ne demandent pas un abonnement actif. Un droit temporaire dépend d'un justificatif de dernière vérification et d'une durée de validité explicitement annoncée. La durée de tolérance n'est pas encore fixée pour le jeu : aucun nombre de jours n'est promis par ce document.

Une panne ne crée pas un nouveau droit. À la fin d'une validité connue, proposer la reconnexion et les contenus disponibles, sans effacer profils, découvertes, records ou sauvegardes. Le prototype couvre des horloges et états simulés ; la résistance à une horloge locale altérée ou à une preuve falsifiée nécessite un service réel.

### 8.2 Partie autorisée

La configuration validée au lancement reste stable jusqu'au résultat : ne pas retirer un skin pendant un combo, changer de stage ou remplacer un partenaire en combat. Les nouvelles conditions s'appliquent avant la prochaine partie.

Une apparence équipée devenue inaccessible conserve sa préférence enregistrée. Le menu explique le remplacement et choisit une apparence réellement disponible, sans perdre l'équipe entière. La restauration de la préférence lors d'un retour du droit est annoncée ou demandée au joueur. Les récompenses permanentes gagnées pendant une période valide conservent leur règle propre.

## 9. Stages de soutien et transitions

Exemple de conception : `REC_STAGE_KIJUJU_ARCHIVE_AMBIENCE_V1`, ambiance originale d'une scène basée sur le stage existant `kijuju`. Cet identifiant est une **proposition de catalogue**, pas un stage ajouté au moteur par la bible. Sa décoration garde les repères de gameplay ; aucun meilleur camouflage ni changement caché de géométrie.

| Autorisation | Politique proposée |
| --- | --- |
| Choisir l'ambiance | Droit adéquat du joueur qui sélectionne. |
| Participer comme adversaire | Autorisé lorsque le match possède les assets compatibles ; aucune acquisition gratuite implicite. |
| Choisir ensuite le stage | Droit personnel évalué séparément. |
| Version statique/réduite | Disponible avec l'accès au stage ; le confort n'est pas un avantage payant. |
| S'entraîner contre ses propriétés | Géométrie et règles accessibles suivant le profil commun ; aucune mécanique compétitive cachée. |
| Transition vers une zone liée | Assets et règle de destination préparés pour tous avant lancement. |
| Fichier absent ou version incompatible | Téléchargement proposé ou stage commun annoncé avant match, selon la politique retenue. |
| Expiration pendant le match | Configuration conservée jusqu'au résultat. |

Si une arène spéciale possède de vraies mécaniques nouvelles, sa fiche décrit compatibilité compétitive, moyens d'entraînement et distribution des informations. Les interactions concernent les deux participants, quel que soit le propriétaire du contenu.

## 10. Local, invité, entraînement et replay

La politique de profil doit être fixée avant raccordement : profil principal, second profil local et invité ne partagent pas implicitement toutes leurs acquisitions. Une possibilité de prêt local est une règle explicite et ne crée pas une copie permanente dans le compte invité.

| Action | Contrôle distinct |
| --- | --- |
| Consulter | Politique de découverte et disponibilité de la fiche. |
| Prévisualiser | Politique d'aperçu ; ne confère pas le droit d'équiper. |
| Sélectionner/équiper | Droit, dépendances, contenu technique et mode valides. |
| Participer | Configuration du match et assets compatibles, même pour un contenu choisi par l'autre joueur. |
| S'entraîner | Profil d'apprentissage explicitement permis. |

Un précontrôle de match vérifie content IDs, versions, participants, stage et destinations avant le chargement. Une composition sauvegardée indique précisément le membre ou le costume à remplacer ; elle n'est pas supprimée en totalité. La sélection aléatoire réutilise ce même résolveur d'admissibilité.

Le replay conserve les références de version et la configuration autorisée du match. La possibilité d'afficher un contenu non possédé est distincte de sa sélection actuelle. Lire un ancien match ne doit pas dépendre uniquement de l'abonnement actuel de son auteur. Si les assets manquent, un remplacement visuel annoncé ou une incompatibilité explicite est utilisé ; pas de simulation inventée d'un ancien fichier absent.

Les contrats historiques de [replay](../../src/catalog-replay-contract.js) et [sauvegarde](../../src/save-center-r19.js) restent inchangés par V23. Une future migration doit les versionner, conserver les données initiales, traiter les conflits entre onglets et fournir une reprise vérifiée.

## 11. Six fiches de production appliquées

### Fiche A — Contenu et slot

Exemple : présentation de Barry REV2. ID stable de contenu et de personnage séparés ; provenance issue du manifeste V23 ; statut « création générée adaptée ». État initial `identified` si l'identité est déjà connue ; aperçu autorisé distinct de l'équipement. Condition proposée : défi ou archive. Disponibilité technique déterminée par fichier réellement présent et version, jamais par la seule fiche. La sélection de l'animation reste différée tant que seules les poses fixes existent.

### Fiche B — Règle de déblocage

Exemple `UNLOCK_PRESENTATION_BARRY` : défi validé **OU** récompense d'archive, attribution permanente, événement stable par profil, coût seulement sur la voie qui le prévoit. Modes et score admissibles restent à régler. Une seconde voie n'écrase pas la première. Une récompense produite par une fixture de démonstration ne modifie pas la sauvegarde réelle.

### Fiche C — Avantage de soutien

Exemple d'ambiance spéciale : ID d'avantage, modèle permanent ou temporaire à annoncer, période et règles d'anciennes collections, dépendance au stage, preuves requises, états de panne/expiration, accès de l'adversaire. Fournisseur et niveaux restent non configurés ; aucun bouton de paiement fonctionnel n'est revendiqué.

### Fiche D — Charte des verrous

Dossier classifié, silhouette noire pour `hint`, emblème neutre pour `secret`, cadenas/badge + texte, focus visible, contraste et version réduite. Distinguer attente de vérification, manque d'installation, mode incompatible et acquisition. La source du droit reste hors fiction ; la mise en scène ne prétend pas être un objet canonique.

### Fiche E — Stage spécial

Ambiance proposée de Kijuju : géométrie commune, choix réservé selon droit, participation adverse autorisée avec assets compatibles, présentation statique incluse, aucun changement en cours de match. Chaque destination de transition a sa règle de préchargement ; stage commun de repli annoncé avant lancement.

### Fiche F — Matrice des droits

Pour chaque contenu/profil : découverte, sources permanentes, sources temporaires/validité, dernière vérification, disponibilité/version et mode ; texte attendu, actions permises, sauvegarde/reprise, résultat constaté et preuve. Les cas non exécutés restent « à tester », jamais « conforme » sur la base d'un écran seul.

## 12. Recette minimale et limites

| Cas | Résultat attendu |
| --- | --- |
| E02-01 Secret | Nom, image, silhouette, voix, infobulle et texte accessible respectent le masquage. |
| E02-02 Slot verrouillé | Focus et condition utilisables ; confirmation informative, sans ajout interdit à l'équipe. |
| E02-03 Attribution automatique/à réclamer | Bon état, bon contenu ; révélation facultative sans perdre la récompense. |
| E02-04 Conditions ET/OU | Alternatives et progression exactes, pas de transformation accidentelle en obligation d'abonnement. |
| E02-05 Double événement/fermeture | Une acquisition et un débit au maximum ; reprise cohérente. |
| E02-06 Costume avant personnage | Acquisition conservée, dépendance montrée. |
| E02-07 Permanent + abonnement expiré | Source permanente garde l'accès. |
| E02-08 Temporaire expiré | Seulement sa source cesse ; préférences et progression conservées. |
| E02-09 Annulation encore valide | Aucun retrait avant fin effective. |
| E02-10 Panne/hors ligne | Inconnu distinct d'expiré, politique appliquée, aucun droit fabriqué. |
| E02-11 Droit valide/assets manquants | Installation requise ; pas de faux verrou commercial. |
| E02-12 Retrait d'une source | Autres sources recalculées et conservées. |
| E02-13 Stage choisi par soutien | Adversaire admis selon règle, sans acquisition implicite. |
| E02-14 Transition liée | Destination préchargée et autorisée pour la partie. |
| E02-15 Expiration en combat | Match stable jusqu'au résultat. |
| E02-16 Costume/partenaire inaccessible | Remplacement expliqué, composition et préférences conservées. |
| E02-17 Présentation statique | Même confort et informations utiles sans privilège de paiement. |
| E02-18 Mode verrouillé | Pas de cycle direct/indirect, reprise possible. |
| E02-19 Invité/liaison/niveau | Bon profil et absence de duplication de lot. |
| E02-20 Doublons/désordre | Révision monotone par source et état final conforme. |
| E02-21 Accessibilité | Clavier, manette, lecteur d'écran et mouvement réduit compréhensibles sur les plateformes testées. |
| E02-22 Migration/restauration | Acquisitions, sources, records et paramètres conservés ; conflit traité sans écrasement silencieux. |

À ces 22 cas s'ajoutent les courses de sélection de l'extension 01 : réponse tardive, annulation, focus perdu, double validation et absence de candidat aléatoire. Les tests locaux du prototype ne prouvent pas des contrôleurs physiques, une synchronisation de comptes, un backend de paiement ou une migration de sauvegardes.

**Ordre de raccordement :** stabiliser catalogue et vocabulaire ; vérifier le prototype isolé ; relier une récompense locale et sa reprise ; raccorder la sélection réelle avec précontrôle ; tester stage/adversaire/replay ; ajouter un fournisseur externe seulement lorsque son autorité, ses règles et ses preuves sont réellement disponibles. Aucune garde historique ne doit être désactivée pour raccorder ces fonctions.
