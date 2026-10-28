# R31 — Reprise d’une restauration réelle et contrats de replay

La page `modules/fidelity-r31/persistence/index.html` restaure les valeurs du jeu qui sont déjà reconnues par le centre R19. Elle ne travaille plus seulement sur une copie de répétition isolée. L’utilisateur choisit un fichier R19, des groupes, un aperçu, télécharge l’état local avant remplacement puis confirme. Les valeurs brutes, y compris les espaces, retours à la ligne et valeurs absentes, sont conservées.

Avant la première écriture dans le `localStorage` du jeu, une transaction IndexedDB enregistre un journal complet avant/après et son empreinte SHA-256. Le petit état d’avancement est écrit dans un magasin séparé ; les grandes copies ne sont pas réécrites à chaque clé. Si une écriture a eu lieu mais que son avancement n’a pas pu être confirmé, une nouvelle instance compare les valeurs présentes aux deux états autorisés. La reprise ignore les écritures déjà présentes et ne les compte pas comme de nouvelles modifications.

Le journal survit au rechargement. Aucune restauration n’est reprise automatiquement. L’utilisateur peut continuer ou revenir aux valeurs exactes d’avant l’opération ; un retour reste aussi disponible après une restauration terminée. La clôture du journal est distincte et volontaire. Un journal en cours ou une empreinte altérée ne peut pas être effacé par ce bouton. Les données étrangères aux clés du jeu ne sont jamais lues ni écrites.

Les pages de restauration coopèrent par le verrou Web Locks `re.bow.real-restore.r31`. Chaque lecture vérifie aussi que les clés du jeu correspondent à l’état avant ou après cette opération. Une modification extérieure est conservée et bloque la reprise et le retour. La page demande de fermer les autres onglets du jeu, car le `localStorage` n’est pas une transaction atomique entre applications ou onglets non coopérants. Une interruption laisse le journal disponible ; elle ne prétend pas que toutes les clés ont été modifiées ensemble.

La récupération locale ne remplace pas la copie téléchargée. Une panne physique du stockage, la disponibilité sur chaque navigateur, les lecteurs d’écran et les appareils physiques restent à vérifier. Aucun compte cloud, fournisseur de stockage distant ou mécanisme de synchronisation n’est configuré ou certifié.

## Replays

La page `modules/fidelity-r31/replay/index.html` reconnaît les fichiers individuels du Versus R13, du duel catalogue R7 et du mode avec évolutions R28. Les replays principaux actuels et antérieurs à R13 gardent les routes historiques déjà disponibles. Les archives de plusieurs replays et les sauvegardes restent accessibles dans le lecteur de lots R25.

Un replay R28 n’est accepté qu’avec son contrat exact `a4bf5c42…c63893`. Le lecteur vérifie le SHA-256 du manifeste de contrat publié, de ses neuf fichiers sources et des deux helpers de contrat/isolation avant de préparer le moteur. Les scripts vérifiés sont incorporés dans une iframe à origine opaque, sans accès au stockage du parent, sans réseau, audio ni animation murale. Le moteur R28 valide le fichier et son empreinte de résultat, puis les commandes sont reconstruites deux fois ; les états finaux complets doivent être identiques.

Ce mécanisme ne migre pas un replay vers les règles courantes. Les contrats absents ou inconnus, les clés JSON répétées, les résultats modifiés et une source du moteur altérée sont refusés. La vérification ne rejoue pas les images, voix, conclusions artistiques ni récompenses de campagne.

## Recette

```sh
node tests/verify-persistence-r31.mjs
node tests/browser-persistence-r31.mjs
python3 scripts/build-persistence-r31.py
python3 scripts/build-persistence-r31.py --check
```

Le premier rapport distingue les fixtures de stockage isolées des opérations réelles de navigateur. Le second utilise des contextes Chromium ne contenant que des valeurs de test : trois groupes choisis, retrait des anciennes clés du groupe, copie et retour exacts après rechargement, écriture interrompue avant confirmation du curseur, conflit extérieur, verrou inter-onglets et quatre routes de contrats de replay. Aucun profil réel de l’utilisateur n’a été touché pendant la recette.
