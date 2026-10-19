# PR12 — R13 : archives récupérables, collecte bornée

R13 continue la même PR nº 12 depuis `31671fecf53a26d81f77d2cb13a5ff61f15ef363`. Aucun changement de fighter, de moveset, de core combat ou de ressource artistique. Aucune fusion dans main.

## Code et preuves exécutés

Le candidat `b2b2ce0f275c1dd75dfa31a87c6b9f6476158a8e` contient les fichiers intégrés et le classeur Excel. Le workflow https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/39330385188 a terminé avec succès : **437 groupes exécutables**, compilation, **46 scénarios HTTP Chromium** (8 R13, 8 R12, 8 R11, 22 R10). Les 26 groupes nouveaux appartiennent aux 437, ils ne s’y ajoutent pas une deuxième fois.

La suite locale a aussi terminé à 437 réussites et la compilation a réussi après adaptation du contrôle de focus. Le premier passage interrompu est conservé comme fait historique : son assertion supposait un seul bouton dans la pause. Le contrôle visite maintenant les deux boutons effectifs, REPRENDRE et REPLAYS, puis confirme la reprise native. Les tests R9, y compris leur version HTTP, sont conservés et étendus, pas supprimés.

Les 905 fichiers du candidat ont été reconstruits et comparés au manifeste SHA-256 de l’artefact authentifié. Les 508 ressources sont réutilisées à l’octet près. Les deux seuls ajouts de publication sont ce document et le workflow permanent HTTP R13 ; aucun changement de runtime après les preuves ci-dessus. Les checks de la PR contrôlent séparément le commit publié.

## Cinq fermetures techniques

1. Un refus de quota ou d’accès ne se transforme plus en faux succès. Le replay reste exportable en mémoire et une nouvelle tentative de sauvegarde est explicite.
2. Les archives illisibles ou pleines ne sont plus remplacées ou tronquées silencieusement. Copie brute et suppression ciblée confirmée sont disponibles ; le 31e enregistrement ne supprime pas le plus ancien.
3. Les commandes sont compressées pendant le match, avec plafonds de 216 000 ticks et 80 000 segments. La limite arrête seulement la capture ; le combat continue et l’archive partielle n’affiche pas de victoire fictive. L’entraînement n’accumule plus cet historique.
4. Le panneau REPLAYS existe dans la sélection, la pause et le résultat : liste, état local/mémoire, lecture, import, export, extrait, sauvegarde brute et réessai.
5. Les importations invalides, incompatibles ou devenues obsolètes après changement de match ne remplacent pas la partie. Les suppressions restent confirmées et n’affectent que les replays, pas les campagnes ou préférences.

## Scénarios et limites des tests

Les tests HTTP utilisent de vrais boutons, navigation clavier, téléchargements et inputs fichier, en 1440 et 390 px. Les quotas refusés, archives corrompues et collection initiale de 30 entrées sont des fixtures déclarées. Les matchs au chronomètre court/santé configurée avancent réellement dans le moteur, sans injection de victoire. Les captures sont des preuves d’interface, pas de fidélité artistique.

La mémoire temporaire est bornée à cinq enregistrements en attente avec un budget textuel. Elle disparaît à la fermeture sans export : ce n’est pas une sauvegarde cloud. Les nouvelles captures peuvent être suspendues faute de place, jamais le match. Les contrôles de changement d’instantané et de lecture après écriture ne garantissent pas une transaction atomique entre onglets simultanés. Aucune certification sur appareil physique ou BFCache réel.

## Excel et compatibilité

`docs/planning/BOW_REPLAYS_R13.xlsx` est réellement inclus : quatre onglets, cinq lots, 26 tests et sources/limites. Les 17 parties XML de l’export artifact_tool ont été vérifiées identiques. Les cinq anciens classeurs sont inchangés ; P1 n’est ni remplacé ni déclaré terminé. Leurs résultats locaux et ceux du workflow final sont distingués.

Le contrat principal évolue avec le contrôleur ; les anciennes versions restent exportables et se lisent avec leur version d’origine. Les contrats de replay expérimental et du journal contextuel sont inchangés. R11 Lucas, R12 Flying Bug, les 115 principaux, 231 prototypes et 43 exercices sont préservés.

Aucun nouveau dessin latéral, animation finale, voix, moveset canonique, conclusion spécifique ou décor 1:1 n’est livré par R13. Les lots artistiques et leur revue primaire restent ouverts. Pas de promotion Vercel ni de nouvelle copie Google Drive dans cette publication.
