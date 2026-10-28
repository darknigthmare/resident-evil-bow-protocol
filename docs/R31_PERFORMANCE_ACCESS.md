# R31 — Lecteurs coordonnés et bilan accessible

`performance/image-budget.js` coordonne les réservations des lecteurs natifs, portraits et poses générées. Le plafond est33554432pixels,64actifs et12réservations en cours. Les décodages sont réservés avant la création de l’image. Les images prêtes sont évincées selon leur dernier usage ; les réservations en cours restent protégées. La libération notifie les lecteurs en attente, sans transformer une pression temporaire en erreur de corruption pendant15secondes.

Les lecteurs R31 réutilisent les données R30 et leurs contrats existants. Une éviction de portrait libère aussi les images affichées dans le DOM et rétablit le canvas de repli lorsqu’il existe. Les évictions visibles et décodages temporairement bloqués reprennent quand la capacité revient. Les images natives en cours gardent une référence annulable et leurs gestionnaires sont détachés au changement de page. Les URL temporaires, réservations et files sont libérées lors de `pagehide` ; la reprise de page est exercée par les tests.

Ce budget décrit les pixels des lecteurs participants et une estimation RGBA. Les autres dessins, buffers de transport, surfaces du navigateur et allocations GPU ne sont pas une mesure de mémoire globale.

Le bilan demandé par le joueur s’insère dans le dialogue R17 déjà responsable de la pause, de la restauration du focus et de la reprise. Il lit les acteurs et les raisons d’évolution sans écrire dans le moteur ou le replay. Les noms et valeurs restent du texte inerte, les dimensions des grilles sont réductibles et aucun événement n’est annoncé automatiquement par ce nouveau composant.

Le moniteur de session démarre uniquement sur demande. Il borne les intervalles de callbacks à7200et les tâches longues à256, pendant60secondes au maximum. Une page masquée ou quittée interrompt la mesure et garde son résultat partiel. L’interface peut exporter le relevé réellement observé.

La recette comprend12groupes unitaires de budget/observateur/bilan,13régressions du lecteur natif et huit groupes navigateur sur les trois vrais montages, leurs images réellement décodées, une pression contrôlée, la reprise, le bilan et son replay, l’export, le clavier, axe4.14 et320pixels avec texte doublé. Les réservations de pression et l’horloge virtuelle sont explicitement des fixtures ; les lecteurs d’écran réels, GPU et appareils physiques restent non certifiés.
