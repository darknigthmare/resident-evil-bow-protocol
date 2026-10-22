# R18 — continuation après fusion de la PR12

La PR12 R11–R17 a été fusionnée par l'utilisateur le 21 octobre 2026 pendant la validation de cette passe. Le nouveau main `f72df25b938c97d026a0cffacaf23c7917277002` a exactement le même contenu que la base R17 `86aa2637b03f1bc094e52339eb4ebf622aa0ce60` (comparaison GitHub : aucun fichier changé). La livraison R18 part donc de cette base et ouvre une nouvelle PR ; elle ne modifie ni ne rouvre la PR fusionnée. Les mentions PR12 dans le suivi de préparation indiquent sa destination initiale, pas l'état actuel du dépôt.

## Contenu livré

Le panneau TEXTE est disponible dans le parent des Dossiers et les 43 rencontres contextuelles. Le parent lit uniquement son iframe de même origine, acquittée, avec jeton, sujets et stage concordants. Les messages périmés ou non sollicités ne remplissent pas le journal et ne donnent aucune victoire. Le lecteur reste séparé du protocole de progression.

Les neuf familles contextuelles possèdent un observateur adapté : actions manuelles à la même frame observées une fois, résultats d'exercice explicitement non canoniques, UV limité à son appareil. Historique de 60 entrées, deux lignes courantes, expiration en ticks et mention de journal partiel lorsque des événements ont été sautés.

Le texte est volontaire, désactivé par défaut, indépendant de l'audio et sans nouvelles écritures de préférence. Changement de sujet, remise à zéro ou reprise validée : journal neuf. Import invalide : session et annotations conservées. Annonces de résultat sans doublon avec le statut existant.

## Défauts trouvés en navigateur et corrigés

Les tentatives échouées sont conservées comme telles. Le dialogue natif de pause recouvrait TEXTE. Il possède désormais son entrée Repères textuels : pause -> texte -> pause, sans reprise implicite. Une ouverture derrière un dialogue natif est refusée. Tab, Maj+Tab, Échap, retour du focus et libération des touches restent vérifiés.

La reprise transférait le focus à l'iframe ; le parent interprétait ce mouvement interne comme une sortie de fenêtre et rouvrait la pause. Une vérification différée et bornée distingue cette iframe acquittée d'une véritable perte de focus. Une page cachée ou fenêtre réellement inactive suspend toujours le combat.

À 390 pixels, la barre à hauteur fixe laissait les boutons déborder sous l'en-tête. Elle prend maintenant sa hauteur réelle, avec titre et actions séparés. Les trois boutons passent un hit-test natif et des clics ordinaires ; aucun force-click ou effacement d'overlay ne masque le défaut.

## Preuves exécutées

Candidat : `98ac82f46e4cc52d5ee4d1d3d4a0eeb9f94feec2`.
Workflow : https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/39616434055

554 groupes exécutables réussis, zéro échec, dont 25 R18. Compilation et packaging réussis. 98 scénarios Chromium HTTP réussis : 10 R18 et 88 R10–R17, en 1440 et 390 pixels. Les 43 exercices sont comparés avec/sans texte pour leurs commandes, résultats et checkpoints. Les 115 Dossiers utilisent le raccordement partagé ; le nouveau test de parcours réel est représentatif, pas 115 campagnes intégralement jouées.

HTTP utilise la véritable iframe, le clavier/clics natifs, l'import fichier et le téléchargement XLSX comparé octet par octet. Débordements, tokens erronés, refus et paramètres accélérés sont signalés dans les tests. Les 1020 fichiers du candidat sont reconstruits et comparés au manifeste SHA-256. Après ces tests, seuls ce document et le workflow HTTP permanent sont ajoutés. Le runtime est inchangé ; les checks de la PR finale constituent une seconde validation, pas des tests à additionner.

## Excel et Drive

`docs/planning/BOW_ACCESS_DOSSIERS_R18.xlsx` : sept onglets, cinq travaux techniques, registre de 115 Dossiers et 43 contextes, événements, 25 groupes QA et sources. Les 26 composants XML artifact_tool sont préservés. Les quatre formules affichent 5 / 25 / 43 et zéro clôture globale 1:1. Dix anciens classeurs inchangés. VALIDÉ LOCAL est l'état de préparation ; les JSON exécutés et cette note consignent la CI finale.

Une copie identique du classeur a été déposée dans le dossier Drive : https://drive.google.com/drive/folders/1BDzfxxvTlnqjCJT32knn8oXWrv47FKM6. Le titre initial PR12 est conservé ; il s'agit de la continuation R18. La présence de l'archive complète doit être vérifiée séparément dans le rapport final de livraison.

## Limites et conservation

G-ACCESS, G-AUDIO, G-REPLAYS, G-PERF et G-RECETTE restent EN COURS pour leur portée globale. VoiceOver/NVDA réel, appareils physiques, BFCache réel et refonte complète du cadrage mobile ne sont pas certifiés. Aucun nouveau sprite, clip final, voix, transcription officielle ou mouvement canonique n'est livré.

Les 346 corps, 43 exercices, 115 récits, 52 stages, 508 ressources, mouvements, RNG et trois contrats replay/journal restent inchangés. Aucune récompense issue de la consultation. R11–R17 sont conservées. Aucune fusion de R18 dans main ou promotion Vercel exécutée par cette publication.
