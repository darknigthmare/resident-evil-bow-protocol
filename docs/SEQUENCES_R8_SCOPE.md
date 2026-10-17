# R8 — Séquences de manche, fin de duel et matrice de production

Base de travail : PR11 / R7 `d79f9e3ce6d37f91ceb772f0bb457acf34efbf4d`. La version affichée du jeu reste 0.7.3. Cette révision ne termine pas les illustrations 1:1.

## Implémentation

Huit emplacements de présentation sont distingués par UID, incarnation et orientation : intro, victoire de manche, défaite de manche, manche nulle, victoire de match, défaite de match, match nul et outro du vainqueur. Les 21 états/commandes directionnels précédents restent disponibles séparément.

Le contrôleur du Versus et le duel expérimental utilisent le même module de sélection. Une défaite de manche est réversible, même lorsque la vie affichée est à zéro. Elle ne sélectionne jamais automatiquement une mort finale. Les entrées de conclusions du contrôleur principal exigent un match terminé, le bon gagnant et son véritable objet d'acteur. Une égalité ou une valeur invalide n'autorise pas une conclusion.

L'horloge de présentation principale peut continuer après le combat, sans avancer la simulation et en respectant la pause. Le vainqueur passe à l'emplacement outro après 90 ticks de présentation : c'est un choix du prototype, pas une durée Capcom. Dans le replay expérimental, la présentation finale reste à son tick zéro : aucune frame fictive n'est ajoutée à l'enregistrement.

Le thème des transitions du projet Resident Evil devient BIOHAZARD / CONFINEMENT et celui de la défaite BIOHAZARD / SUJET NEUTRALISÉ. Les anciennes familles MGS sont conservées dans le module historique, mais ne sont plus sélectionnées pour les 346 identités RE vérifiées.

`sequences.html` inspecte 346 sujets, huit séquences, deux orientations, la lecture/pause et l'avancement d'un tick. Aucun résultat, santé, statistique ni sauvegarde de campagne n'est créé par cet atelier. Les états absents conservent la pose existante sans torsion de mort inventée ; un avertissement indique que la séquence reste à dessiner.

## Plan Excel

`docs/planning/BOW_PR11_MATRICE_EXECUTION_R8.xlsx` est un nouveau complément compact au classeur détaillé P1 déjà fourni dans la conversation. Ses neuf onglets répertorient les 346 corps, 3 460 noms de commandes actuels, 346 supers/conclusions, 2 768 emplacements de séquence, 52 configurations de stage et 43 exercices contextuels. Les huit emplacements ne sont pas huit dessins déjà fournis. Les statuts de production artistique restent ouverts.

Ce nouveau fichier ne remplace pas ni ne prétend contenir les 21 onglets du P1. Le fichier P1 est conservé dans la livraison locale précédente ; sa publication distante n'est pas revendiquée par cette révision. La matrice R8 est exportée avec artifact_tool, puis transmise sans perte de ses composants XML et contrôlée par SHA-256.

## Conservation et compatibilité

Les statistiques, 115 profils principaux, 231 prototypes, 43 exercices et les ressources graphiques ne changent pas. Les données d'animation existantes ne sont pas enrichies de faux clips. Les huit types de présentation sont ajoutés au validateur de clips avec ses contrôles d'orientation, dimensions et empreintes.

Le contrat des replays principaux change parce que leur contrôleur dépend d'un nouveau module. Les anciens fichiers restent utilisables dans leur version d'origine, sans suppression. Les contrats et règles de l'enregistrement expérimental et du journal contextuel restent inchangés. Les tests historiques chaînent les empreintes précises R6 puis R8 ; aucun contrôle de conservation n'est désactivé globalement.

## Preuves et limites

Les résultats exécutables de cette révision se trouvent dans `docs/SEQUENCES_R8_TESTS.json` ; ils ne certifient pas le lore. Le test Chromium utilise le vrai serveur HTTP local du runner GitHub. Les fins de manche/match y sont explicitement préparées comme fixtures, et les événements de cache sont synthétiques : ce ne sont pas des parcours manuels complets ni des tests sur appareil physique.

Aucune nouvelle attaque canonique, fatalité officielle, animation, paire anatomique indépendante ou sprite final n'est produite. Les poses de référence existantes, les 341 corps sans couverture latérale complète et les références de movesets restant à revoir ne sont pas marqués comme terminés. Les 43 exercices contextuels restent séparés de la progression principale.

Une PR, un build ou un dossier Drive ne constituent pas une preuve de promotion Vercel. Cette révision n'effectue aucune fusion ni déploiement de production.
