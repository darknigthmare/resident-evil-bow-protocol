# PR12 — R16 rattachée, R17 validée

Base : R16 `0663f925b2cba8fbe3b42fc2f0dbcf7f2a2e70ef`. Cette version d'intégration a réellement été rattachée à la branche `codex/lucas-devices-r11` le 21 octobre 2026, sans fusion dans main. R17 poursuit la même PR.

## Contenu livré

Repères textuels indépendants du son, désactivés par défaut, dans le Versus principal et le duel expérimental/replay. Deux lignes superposées, choix de taille normale/grande et journal de session de 60 entrées. Les répétitions proches sont regroupées, les lignes expirent au rythme des ticks de simulation. Aucun contexte audio ou stockage n'est requis. Les identités J1/J2 restent fixes après un croisement ; elles ne prétendent pas localiser la provenance acoustique.

Seize familles décrivent des faits exécutés : engagement, émission de tirs, impacts, garde/parade, rupture, dispositifs, explosions, détonateur vide, récupération, altérations, refus et résultat. Un tir réservé puis annulé n'est pas annoncé. Les explosions ne sont pas doublées par l'événement secondaire d'un dispositif. Les textes sont originaux du fangame et reprennent le nom de la technique du profil ; ce ne sont pas des dialogues ou sous-titres officiels.

Le panneau suspend le match et restaure seulement son état antérieur valide. Tab/Maj+Tab, Échap, retour du focus, fond inerte et interruptions extérieures sont traités. L'annonce polie facultative concerne uniquement résultats et ruptures de garde ; aucune file de parole par projectile. Les attributs et interactions DOM sont testés ; aucune vocalisation NVDA/VoiceOver sur matériel n'est certifiée.

## Correction trouvée pendant la validation HTTP

La première tentative `39556941296` a réussi les 529 groupes exécutables et la compilation, puis échoué au sixième scénario HTTP : une recherche en avant dans le replay réutilise le même état objet. L'observateur prenait les événements reconstruits pour des actions nouvellement vues. Le code remet maintenant explicitement le curseur textuel à zéro sur une recherche valide, dans les deux directions et au retour au début. L'assertion n'a pas été affaiblie : les contrôles DOM et HTTP parcourent plusieurs recherches avant/arrière et exigent un journal vide, sans toucher au replay. Les positions invalides et imports refusés conservent le duel et son journal.

Une avance de simulation trop importante pour le journal du moteur produit toujours la mention JOURNAL PARTIEL. Le journal est une aide de lecture bornée, pas une sauvegarde ou une reconstitution exhaustive d'une séquence sautée.

## Preuves exécutées

Candidat : `938137785540d3af869f619b2c4a3c53b1c91bdd`.
Workflow : https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/39557840376

529 groupes exécutables réussis, zéro échec, dont 26 nouveaux R17 ; compilation réussie. 88 scénarios Chromium HTTP : 12 R17, 12 R16, 10 R15, 8 R14, 8 R13, 8 R12, 8 R11 et 22 R10, en 1440/390 pixels. Les paramètres de match court, accélérations CPU, événements synthétiques et imports préparés sont déclarés. Téléchargement du vrai XLSX comparé octet par octet. Les 3 duels/replays du test d'observation produisent le même état et les mêmes données exportées avec ou sans annotations.

Les deux seuls ajouts après le candidat sont ce document et le workflow permanent qui exécute les tests HTTP R17 et R16 sur la PR. Aucun runtime changé après ces résultats. Les checks du commit publié constituent une seconde validation, pas des tests additionnels à compter deux fois.

## Excel et périmètre global

`docs/planning/BOW_REPERES_COMBAT_R17.xlsx` est réellement versionné : cinq onglets, cinq travaux techniques, 16 familles et 26 résultats locaux. Ses 20 composants XML créés avec artifact_tool sont conservés à l'octet près ; les quatre formules affichent 5/26/16 et zéro clôture globale 1:1. Les preuves finales HTTP et le commit livré sont dans les rapports, distincts du suivi de préparation. Les neuf anciens classeurs sont inchangés.

Les lignes G-ACCESS, G-AUDIO, G-REPLAYS, G-PERF et G-RECETTE restent EN COURS pour leur objectif complet. Le parent des Dossiers, le mode histoire embarqué et les 43 rencontres contextuelles ne reçoivent pas ce panneau dans R17. Voix, descriptions des sons officiels, répertoires exacts, clips, sprites, essais matériels et recette perceptive restent ouverts.

## Conservation

Les 346 corps, 43 exercices, 115 Dossiers, 52 configurations de stage et 508 ressources sont conservés. Santé, commandes, collisions, RNG, événements du moteur, compositions audio et trois contrats de replay/journal restent inchangés. Aucune migration de replay ou écriture de progression introduite. R11 Lucas, R12 vol, R13 archives, R14 décors, R15 ambiances et R16 audio restent présents.

Aucune fusion main, promotion Vercel ou nouvelle copie Google Drive n'est effectuée par cette publication de PR. Aucune nouvelle illustration, animation finale, transcription officielle ou certification 1:1 revendiquée.
