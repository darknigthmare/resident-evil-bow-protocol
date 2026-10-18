# R9 — Fermeture des six défauts techniques de l’audit R8

Base immuable : ba4e3cc82f2c9af7c7324420a0cc4409c599fd1a. PR #11 conservée en brouillon ; aucune fusion dans main ni promotion Vercel. Version de jeu toujours 0.7.3.

## Changements proposés
- AUD-01 : navigation Tab/Maj+Tab dans les panneaux, actions natives Entrée/Espace, restauration du focus et commandes de combat séparées des commandes de menu.
- AUD-02 : API manette optionnelle, erreur de politique interceptée une fois, contrôles clavier/tactiles conservés et diagnostic visible.
- AUD-03 : préférences de raccourcis normalisées à partir des actions connues, touches réservées et collisions refusées ; valeurs valides conservées. Réparation en mémoire sans suppression de progression.
- AUD-04 : historique des conclusions normalisé avant publication d’une scène, dates et identifiants connus vérifiés, crédit unique, refus d’écriture du stockage non bloquant et signalé.
- AUD-05 : horloge de présentation finale séparée du combat enregistré ; victoire puis outro, pause/reprise et avance d’un tick, limite de 600 ticks. Seek et import ne modifient pas le combat enregistré. Les durées sont des règles du prototype, pas des valeurs Capcom.
- AUD-06 : page conservée dans l’historique : audio suspendu mais réactivable par le bouton utilisateur, retour du combat en pause et une seule boucle. Page réellement quittée : disposition définitive de l’instance.

Les résultats exécutés et les preuves avant/après se trouvent dans AUDIT_R8_BEFORE_R9.json, AUDIT_R9_TESTS.json et qa-audit-r9/BROWSER_AUDIT_R9_RESULTS.json des artefacts. Une ligne de ce document ne remplace pas ces tests.

## Portée des tests
Reproductions avant correctif sur le commit R8, avec erreurs de préférence et de politique explicitement injectées. Les tests de contrôleur utilisent un DOM contrôlé et un canvas natif ; certains verdicts finaux sont préparés. Le duel expérimental termine aussi un combat CPU complet, accéléré, avec les vraies décisions du moteur. Les tests navigateur utilisent le serveur HTTP réel, les touches natives, le vrai AudioContext et une politique Gamepad de test. Les événements de cache synthétiques sont distingués du retour historique effectivement observé.

## Ce qui n’est pas clôturé
Les 346 corps, les 3 460 emplacements de commande, les 508 ressources et les données de lore/stage restent inchangés. Le classeur R8 est préservé à l’octet près. Les nouvelles animations, paires anatomiques, supers et conclusions 1:1, scripts complets des 43 exercices et la certification exhaustive du lore ne sont pas produits par cette correction. L’intro du duel expérimental reste sautée pour conserver son contrat de replay ; cette passe corrige son outro technique, pas sa réalisation graphique.

Le contrat des replays principaux change parce que leur contrôleur dépend des nouvelles protections ; les anciens replays restent à lire avec leur version d’origine. Les contrats expérimentaux et contextuels restent inchangés.

## Références techniques consultées le 18 octobre 2026
- W3C APG, modèle de fenêtre modale (Tab/Maj+Tab, focus) : https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- MDN, Navigator.getGamepads : https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads
- MDN, AudioContext.suspend : https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend
- Chrome/web.dev, back/forward cache : https://web.dev/articles/bfcache

Aucune restriction de transfert Google Drive précédente n’est contournée. Les preuves et archives sont fournies via GitHub et la conversation lorsqu’elles ont été validées.
