# R17 — repères textuels, indépendants du son

Base : R16 `0663f925b2cba8fbe3b42fc2f0dbcf7f2a2e70ef`. R16 a été effectivement rattachée à la même PR nº 12 le 21 octobre 2026, sans fusion dans main. R17 fait avancer G-ACCESS, G-AUDIO, G-REPLAYS, G-PERF et G-RECETTE ; aucun lot global 1:1 n'est fermé par ce branchement.

## Interface jouable

Bouton TEXTE dans la sélection et l'arène du Versus principal, ainsi que dans l'arène du duel expérimental. Le panneau met le combat en pause ; fermeture et touche Échap restaurent l'état précédent seulement si le même match reste actif et qu'aucune interruption extérieure n'est survenue. Navigation Tab/Maj+Tab contenue dans la fenêtre, fond inerte, focus revenu à l'arène lors d'une reprise. Taille normale ou grande. Aucun réglage sonore requis.

L'affichage est désactivé par défaut et n'est jamais activé par l'URL. Deux lignes au plus sont superposées, identifiées par J1/J2 (identités fixes, pas une indication de gauche/droite après un croisement). Les lignes expirent après 180 ticks de simulation : la pause les fige. Les répétitions identiques et proches sont regroupées avec un compteur et une plage de frames. Le journal ne conserve que ses 60 dernières entrées. Effacer le journal n'efface aucun replay ou historique de jeu.

Les annonces polies de résultat/rupture de garde sont facultatives et initialement désactivées. Le journal ne s'annonce pas automatiquement et n'utilise pas une file de notifications par projectile. Les attributs ARIA et le parcours clavier sont testés ; aucune certification du rendu vocal de NVDA, VoiceOver ou autre matériel n'est revendiquée.

## Événements, pas dialogues

Seize familles décrivent les faits actuels : engagement, tirs émis, impacts, garde/parade, rupture, pose, armement, destruction, explosion, détonateur vide, retrait de dispositif, récupération, altération, refus et résultat. Les noms de techniques viennent du profil exact. Les textes sont originaux du fangame : pas de sous-titres officiels, voix Capcom, localisation d'un son non observé ou geste 1:1 ajouté.

Les tirs réservés d'une rafale ne sont pas annoncés avant émission. Une rafale Gatling réelle produit six émissions aux frames 25/30/35/40/45/50 ; le texte les regroupe. Une interruption après le premier tir n'invente pas les cinq suivants. L'explosion de Lucas n'est pas répétée à travers deviceDetonated. Un détonateur vide ne décrit pas une explosion ou un soin. Un coup bloqué identifie le défenseur et ses dégâts effectivement subis ; il n'est pas présenté aussi comme un impact normal.

## Temps et replays

Les annotations sont produites à partir des observations du contrôleur, sans minuteur ni boucle d'animation supplémentaire. Lecture accélérée et pas manuel peuvent mettre à jour le journal mais ne génèrent pas d'annonce automatique. Intro, page masquée et activation tardive ne rattrapent pas les anciens événements.

Nouvelle partie, nouvel état de replay et retour de frame ouvrent un journal neuf. Import refusé : le duel et son journal actuel restent inchangés. Si l'avance dépasse les 180 événements conservés par le moteur, l'interface annonce explicitement un **journal partiel** ; elle ne prétend pas reconstruire tout le match. Le journal est une aide de lecture, pas un enregistrement de débogage complet ou une sauvegarde.

## Préservation et limites

Aucune santé, ressource, collision, frame, commande, RNG, récompense ou sauvegarde modifiée. Aucune connexion, lecture audio, police distante, stockage local ou cookie ajouté. Les 346 corps, 43 exercices, 115 Dossiers, 52 stages, 508 ressources, compositions précédentes et **trois contrats de replay/journal** restent identiques à R16. Les neuf anciens classeurs sont conservés. Aucune migration de replay.

Le parent des Dossiers et le mode histoire embarqué restent hors de ce lot d'interface. Il n'existe pas de transcription de voix, de narration automatique ni de journal de 43 rencontres contextuelles. Les œuvres visuelles et répertoires officiels restent ouverts.

Les vérifications d'intégrité historiques sont conservées : les deux fichiers de présentation modifiés possèdent leurs prédécesseurs SHA exacts. L'export de capture du test R14 attend désormais toBuffer, compatible avec le Canvas natif synchrone et le fallback Skia asynchrone ; aucune assertion graphique n'est supprimée.

## Preuves

26 groupes nouveaux exécutés localement : moteur réel, 346 identités, rafales, pièges, garde, récupération, pause, recherche de frame, budget, injection de noms ressemblant à du HTML, interface, imports, cycle de navigation et trois duels CPU/replays comparés octet par octet. Les événements synthétiques et le DOM contrôlé sont indiqués dans les noms/métadonnées des tests.

Le script HTTP vérifie 12 scénarios en 1440/390 pixels : clics, clavier, import JSON et téléchargement du vrai XLSX ; les matchs courts et CPU accélérés sont déclarés. Les résultats du runner, après exécution, font autorité. Le navigateur du conteneur local a refusé HTTP localhost avec ERR_BLOCKED_BY_ADMINISTRATOR ; aucun contournement de cette politique n'a été tenté.

## Sources et Excel

`docs/planning/BOW_REPERES_COMBAT_R17.xlsx` : cinq onglets, cinq lots techniques, 16 familles, 26 résultats locaux et quatre formules. La recette HTTP et la publication finale sont consignées dans les rapports de livraison, pas inventées dans le suivi préparatoire.

Sources techniques consultées le 21 octobre 2026 :
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live

Aucune nouvelle source primaire Capcom recertifiée. Aucun changement du contenu biologique ou des mouvements officiels.
