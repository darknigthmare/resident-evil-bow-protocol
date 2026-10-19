# R13 — Archives de combat récupérables et collecte bornée

Base de la même PR nº 12 : 31671fecf53a26d81f77d2cb13a5ff61f15ef363. R11 et R12 sont conservées. Aucune donnée de combattant, décor, image ou cœur de combat n'est modifiée.

## Défauts constatés et corrections

R12 avalait les exceptions de sauvegarde du replay puis renvoyait le replay comme si l'archivage avait réussi. Le cas QuotaExceededError a été reproduit avec la fonction d'origine. La collecte principale ajoutait aussi une paire d'entrées à chaque frame sans plafond, avant de compresser à la fin. R13 traite ces deux chemins sans toucher au résultat réel du match.

- Compression RLE pendant la capture : commandes identiques regroupées, maximum de 216 000 ticks et de 80 000 segments. Une limite atteinte arrête seulement l'enregistrement, pas le combat. Le préfixe conservé devient un extrait avec résultat nul, jamais une victoire complète attribuée au fichier tronqué.
- Entraînement : pas de collecte automatique de replay. La lecture et le fantôme continuent à utiliser le format déjà accepté.
- Échec de quota, accès refusé, archive illisible, écriture non confirmée ou collection de 30 entrées : message visible et copie en mémoire exportable. Jusqu'à cinq copies en attente et un budget textuel borné ; si le tampon ne peut garantir de place, les nouveaux enregistrements sont suspendus, pas les combats.
- Les anciennes entrées ne sont plus supprimées automatiquement pour ajouter la 31e. Le joueur exporte/retire une entrée choisie, puis réessaie la sauvegarde.
- Archive corrompue : aucune réinitialisation silencieuse. Son texte brut reste exportable si le navigateur en autorise la lecture. L'effacement global de la seule clé des replays est une action distincte confirmée, jamais un nettoyage de toutes les sauvegardes.

## Interface effective

Le bouton REPLAYS est ajouté à la sélection, à la pause et au résultat du Versus principal. Le panneau fournit liste, état local/mémoire, compatibilité de version, relecture, import d'un fichier, export individuel/dernier match/extrait courant, copie brute, nouvelle tentative et suppression confirmée.

Un import illisible, incompatible ou devenu obsolète après changement de match ne remplace pas ce match. Les replays anciens restent consultables/exportables mais doivent être lus dans leur version d'origine. Le dialogue met le combat en pause et restaure son état antérieur à la fermeture ; la navigation clavier est locale au panneau. La fonctionnalité n'ouvre pas de replay arbitraire au milieu d'une opération intégrée.

## Préservation et limites

La clé historique `re-bow-v048-replays` est conservée. Les clés de campagne, de contexte, les préférences et le replay expérimental sont distincts et non touchés. Les données des 346 corps, les Dossiers, les 508 ressources et les anciens classeurs restent identiques. Le contrat principal change avec le contrôleur ; ceux du journal contextuel et du replay expérimental restent identiques.

Ce n'est pas une sauvegarde cloud. Une copie uniquement en mémoire disparaît à la fermeture de la page sans export. La relecture d'écriture et la détection d'un instantané modifié ne constituent pas une transaction atomique entre onglets simultanés. Les imports sont bornés à 4 Mio ; les budgets internes de texte sont comptés en unités JavaScript, pas en octets de stockage effectivement accordés par chaque navigateur.

Les nouvelles archives complètes gardent le format 0.48 des commandes. Le champ captureR13 précise complet/extrait. Les extraits sont lus jusqu'à leur vraie fin puis marqués incomplets. Aucune santé, victoire ou récompense n'est accordée par simple import de métadonnées.

## Tests et preuves

26 groupes nouveaux ont réussi localement avec l'archive pure et le vrai contrôleur dans le DOM contrôlé. Ils couvrent notamment les bornes complètes 216 000/80 000, les écritures refusées, la récupération, les conflits, les 30 entrées, l'absence de collecte en entraînement, les extraits, la relecture réelle et la conservation des autres clés. Les fautes de stockage et les limites réduites d'un test d'intégration sont explicitement injectées.

La tentative de suite locale complète a été arrêtée par le processus (sortie 137), sans être déclarée réussie. La chaîne complète et le vrai navigateur HTTP sont exécutés séparément par le workflow GitHub. Les JSON et les journaux exécutés attestent leurs résultats. Le test HTTP emploie de vrais téléchargements et inputs fichier ; chronomètre/santé courte et archive synthétique de 30 entrées sont déclarés. Aucun téléphone ou BFCache physique certifié.

`docs/planning/BOW_REPLAYS_R13.xlsx` est un complément artifact_tool de quatre onglets. Ses 17 composants XML sont conservés par le transport. Les 26 tests et cinq lots techniques y sont identifiés ; la QA finale de la PR est documentée séparément. Aucun lot artistique global P1 n'est terminé par cette passe.

## Sources techniques consultées le 19 octobre 2026

https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage — stockage lié à l'origine et SecurityError.
https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem — QuotaExceededError et absence de valeur de retour de confirmation.

La PR reste en brouillon ; aucune fusion main, promotion Vercel ou nouvelle copie Drive n'est implicite.
