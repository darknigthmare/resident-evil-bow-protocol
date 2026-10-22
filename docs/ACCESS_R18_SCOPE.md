# R18 — repères des Dossiers et des rencontres contextuelles

Base exacte : `86aa2637b03f1bc094e52339eb4ebf622aa0ce60` (R17). Continuation de la même PR12, sans fusion dans main. Les changements concernent l'affichage et les contrôles des panneaux, pas les règles du combat ou de la progression.

## Dossiers : observer le véritable duel embarqué

Le bouton TEXTE est disponible dans la barre du combat du Dossier, après acquittement du moteur. Le parent réutilise l'observateur R17 et lit en lecture seule le contrôleur de son iframe **de même origine**. Il exige le jeton de la session démarrée, les deux UID et le stage attendus. Une ancienne instance, une lecture interdite par l'origine ou un moteur non prêt ne fournit aucun événement et désactive le bouton. Aucun message entrant de texte libre n'est accepté comme une preuve de combat.

La lecture utilise la boucle déjà existante du parent ; pas de nouvelle boucle ni de sérialisation d'un état par tick. Le panneau appartient au parent, donc la pause, le focus et le fond inerte englobent réellement l'iframe et les commandes tactiles. La fermeture ne réanime pas un ancien match, un chapitre quitté ou un combat interrompu par la perte de focus. Les commandes maintenues sont relâchées lors de la pause.

Les identités J1/J2, les tirs réellement libérés, les gardes et les résultats restent ceux de R17. Les textes sont des descriptions originales du prototype. Les passages narratifs, prologues et épilogues continuent à utiliser leurs textes existants ; ils ne sont pas remplacés par un journal de combat. Lorsqu'un chapitre quitte le combat, le journal de cette session est effacé. Aucun nouveau sous-titre officiel ni texte de scénario n'est écrit dans cette passe.

## 43 exercices : pas de faux duel humanoïde

Les 43 sessions des neuf familles possèdent un observateur adapté à leurs propres événements : observation, évitement, UV, exposition, passage fermé, progression, contre prématuré, répit, dispersion, phase de diagnostic, mise à distance, contre-mesure, éclosion, fenêtre, impact de simulation et fin. Les refus de commande ont un libellé distinct. Il ne prétend pas qu'une sortie tue un poursuivant ou qu'une incubation crée un nouveau combattant.

Deux lignes sont visibles ; le journal de session est limité à 60 entrées. Les répétitions proches peuvent être regroupées ; les lignes expirent après 180 ticks réellement avancés. Les snapshots de l'exercice sont des copies et n'offrent pas de numéro d'événement global : le raccord des fenêtres est vérifié exactement. Une portion non observée est marquée JOURNAL PARTIEL, **sans inventer un nombre exact d'événements perdus**.

Le panneau met la session en pause. Ses contrôles ne lancent pas une action derrière le dialogue. Fermer ne reprend que la même session préalablement active et non interrompue. Les imports refusés conservent le journal actuel ; une restauration ou un changement de sujet crée un journal neuf, sans réannoncer tous les événements reconstruits. Les sauvegardes, records et exports de la session restent ceux du module existant. Le texte ne déclenche pas de récompense.

Les phases changeant fréquemment ne sont plus annoncées à chaque frame. Le résultat conserve son annonce native, sauf lorsque l'utilisateur choisit l'annonce du panneau ; une seule zone vivante annonce alors le résultat. Les annonces ne sont ni un flux audio ni une vocalisation VoiceOver certifiée.

## Tests et limites

Les contrôles utilisent les véritables sessions des 43 exercices et leurs checkpoints, deux fenêtres VM connectées pour les Dossiers, le contrôleur réel, des refus synthétiques d'origine et des événements de débordement explicitement artificiels. Un duel de Dossier est accéléré en CPU et doit produire exactement un résultat normal. Les captures de navigateur et les tests natifs HTTP font partie du workflow distinct du candidat ; leur réussite ne se déduit pas de ce document.

Le profil Hunter Gamma et ses commandes ne sont pas modifiés : leur audit et leur correction constituent un lot distinct, toujours ouvert.

Les contrôles matériels (lecteurs d'écran, téléphone, manette et BFCache réel) restent ouverts. Les 115 histoires ne sont pas toutes parcourues manuellement de bout en bout. Ce branchement commun n'est pas une certification exhaustive de l'accessibilité des menus ou de toutes les interactions du jeu.

## Préservation et suivi Excel

Les 346 corps, 43 définitions d'exercice, 115 histoires, 52 stages, 508 ressources et les trois contrats de replay/journal sont conservés. Aucun nouveau geste, dessin, voix, fatalité ou paramètre de dommage. Aucun changement de stockage de campagne, aucune migration de replay.

`docs/planning/BOW_ACCESS_DOSSIERS_R18.xlsx` complète les feuilles P1/R8–R17 : synthèse, lots globaux, 115 Dossiers, 43 contextes, familles d'événements, QA et sources. Les cases G-ACCESS, G-AUDIO, G-REPLAYS, G-PERF et G-RECETTE restent EN COURS pour leur portée globale. Les fermetures techniques sont distinctes des dessins, répertoires, sons et séquences officiels restant à produire.

Sources techniques consultées le 21 octobre 2026 :
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy
- https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage

Ces documentations étayent la gestion du dialogue et de l'origine ; elles ne prouvent pas le lore de Resident Evil.
