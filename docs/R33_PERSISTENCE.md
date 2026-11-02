# R33 — Reprise sélective et lots de replays avec évolutions

Le [restaurateur R33](../modules/fidelity-r33/persistence/index.html) permet de reprendre ou d’annuler une restauration après un changement dans un groupe non choisi. Le [lecteur de lots R33](../modules/fidelity-r33/replay/index.html) vérifie plusieurs fichiers individuels, y compris ceux du combat avec évolutions. Les sauvegardes et les moteurs publiés restent dans leurs formats existants.

## Progrès réalisés ailleurs pendant une restauration

Avant R33, une restauration des volumes et des réglages du dojo conservait un journal de toutes les clés reconnues par R19. Si le joueur changeait ensuite ses commandes, R31 refusait le retour des seuls volumes et réglages : sa vérification exigeait aussi que le groupe des commandes reste identique. La valeur extérieure était préservée, mais le retour utile devenait indisponible.

R33 limite les écritures, les comparaisons finales de reprise/retour et la clôture du journal aux groupes sélectionnés. Un changement des commandes reste donc conservé pendant le retour des volumes et du dojo. Une valeur extérieure dans un **groupe choisi** bloque toujours la reprise et le retour ; aucune valeur tierce n’est remplacée pour réparer le journal.

La première application exige encore un aperçu complet à jour, une copie téléchargée exacte et une confirmation. Si un groupe quelconque change entre cet aperçu et l’application initiale, l’application est refusée avant la création du journal. Le joueur prépare alors un nouvel aperçu et une nouvelle copie. L’assouplissement concerne uniquement les opérations dont le journal durable existe déjà.

Les 18 clés, les huit groupes R19, le verrou Web Locks et le schéma IndexedDB R31 restent identiques. Un journal R31 interrompu ou terminé peut être repris ici sans migration de son contenu. La page indique le nombre de clés non choisies ayant changé. Elle ne reprend rien automatiquement, et sa copie avant opération reste un instantané de la préparation initiale. La copie actuelle peut être exportée séparément.

Une transaction IndexedDB conserve toujours l’état avant/après et son SHA-256 avant la première écriture du jeu. L’écriture multi-clés de `localStorage` n’est pas atomique ; fermer les autres onglets reste requis. Une écriture non coopérante qui intervient entre la dernière lecture et l’écriture demeure un risque du support, comme en R31. Aucun backend cloud, test de coupure électrique ou appareil physique n’est certifié.

## Plusieurs fichiers, contrat conservé pour chaque replay

R31 accepte le replay R28 avec évolutions individuellement ; R25 vérifie des lots historiques sans reconnaître ce schéma. Le nouveau lecteur accepte ensemble les fichiers individuels Versus R13, duel catalogue R7 et évolutions R28. La route principale actuelle et celle d’avant R13 restent distinctes : quatre routes de moteur sont effectivement vérifiées.

Le lot est borné à **16 fichiers et 32 Mio au total**. Le replay avec évolutions conserve sa limite de 4 Mio. Les octets UTF-8 de chaque fichier reçoivent une empreinte SHA-256 ; un doublon exact est signalé et n’est reconstruit qu’une fois. Les noms et erreurs sont affichés comme du texte. Une collection principale ou une sauvegarde R19 est explicitement renvoyée vers le lecteur d’archives existant.

La préparation n’exécute aucun moteur. Après lancement volontaire, un seul fichier à la fois utilise le lecteur R31 et ses moteurs isolés. Chaque succès exige deux reconstructions avec états finaux égaux, puis conserve le contrat et le constat original. Le résultat individuel modifié, un contrat inconnu, les clés JSON répétées et les octets altérés d’une source R28 sont refusés. Le refus d’un fichier reste visible et n’empêche pas la vérification des autres fichiers reconnus.

Le constat exporté comprend les empreintes, résultats individuels, doublons et fichiers non lancés. Une annulation termine le constat immédiatement, interrompt le moteur actif et annule aussi une tâche créée tardivement après chargement de ses sources. Une sortie de page annule le lot ; le retour demande un nouveau lancement volontaire. Cette relecture ne restaure aucune sauvegarde et ne valide ni images, sons, récompenses ni fidélité artistique aux jeux d’origine.

## Reproduction

```sh
node tests/verify-persistence-r33.mjs
node tests/browser-persistence-r33.mjs
python3 scripts/build-persistence-r33.py
python3 scripts/build-persistence-r33.py --check
```

Les suites emploient Node 22.16.0 et Playwright 1.64.1 avec Chromium. La recette d’accessibilité charge axe-core 4.14.0 (`BOW_AXE_PATH` permet de désigner son fichier local). Les résultats et empreintes exécutés figurent dans [le rapport Node](R33_PERSISTENCE_TESTS.json) et [le rapport navigateur](R33_PERSISTENCE_BROWSER.json).

Les contextes Chromium ne contiennent que des valeurs de recette. Les scénarios de stockage utilisent de vrais `localStorage`, IndexedDB, téléchargements et Web Locks ; les interruptions et quotas sont des fautes injectées annoncées. Les événements de cycle de vie du lot sont des événements synthétiques explicitement identifiés. Les quatre replays sont produits par les moteurs existants, dont une évolution obtenue par les conditions normales du moteur. Aucun profil réel du joueur n’est utilisé.
