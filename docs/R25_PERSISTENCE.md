# R25 — archives de replays et sauvegardes R19

La [page R25](../modules/fidelity-r25/persistence/index.html) ouvre désormais
directement une archive principale ou une sauvegarde R19. Il n’est plus
nécessaire d’extraire manuellement le replay pour lancer sa vérification.
Un replay principal ou expérimental individuel reste accepté.

La page affiche chaque entrée avec son chemin dans le fichier et le moteur
disponible. **Aucun replay ne démarre à l’ouverture.** L’utilisateur choisit un
lot, puis chaque entrée est reconstruite deux fois dans un nouvel iframe à
origine opaque. Le moteur et l’isolation sont ceux de R24, réutilisés à l’identique.

## Conservation et sélection

- Le fichier chargé peut être téléchargé à l’octet près, y compris s’il est refusé.
- La chaîne de l’archive imbriquée R19 est extraite sans sérialisation nouvelle.
- Chaque replay d’une archive conserve sa tranche JSON exacte : ordre des
  propriétés, espaces, Unicode et échappements. Le lecteur refuse une chaîne
  UTF-16 imbriquée qui ne pourrait pas être représentée exactement en UTF-8.
- Un identifiant répété bloque les deux copies. Les entrées invalides et contrats
  inconnus restent visibles ; aucune copie n’est choisie selon sa position.
- Une anomalie d’un autre groupe de sauvegarde reste signalée séparément. Elle ne
  devient pas une validation de restauration et ne masque pas le replay disponible.
- Les états « vérifié » et « refusé » sont séparés par entrée. Un résultat falsifié
  ne peut pas profiter d’un replay valide placé à côté.

Les limites sont explicites : fichier de 32 Mio maximum, archive principale de
8 Mio de caractères selon le contrat historique, 2 048 entrées inspectées au
maximum, **30 replays par lot et 100 lignes rendues par page**. Les choix sont
conservés lorsque l’on change de page. Un lot de plus de 30 sélections ne démarre
pas. Les budgets de chaque moteur et de chaque replay restent ceux de R24.

## Moteurs et annulation

| Source | Route et vérification |
| --- | --- |
| Replay principal courant | Moteur principal actuel ; champs du résultat comparés, deux états reconstruits égaux |
| Replay principal avant R13 | Vrai moteur de la révision `31671fecf53a26d81f77d2cb13a5ff61f15ef363`, sans migration vers les règles actuelles |
| Replay expérimental individuel | Moteur R7 actuel ; empreinte enregistrée vérifiée par son validateur, puis deux états reconstruits égaux |
| Autre contrat, entrée invalide ou identifiant répété | Entrée affichée et refusée avant lancement |

Le format R19 conserve l’archive des replays **principaux**. Un replay R7 glissé
dans cette archive reste refusé ; le fichier expérimental s’ouvre individuellement.

Annuler termine immédiatement le lot, même si la préparation d’un moteur attend
encore une réponse. L’iframe actif est détruit. Si une ancienne préparation finit
plus tard, sa tâche est annulée et son résultat ne remplace pas un nouveau fichier.
Les replays terminés avant l’annulation restent détaillés ; les suivants ne sont
pas annoncés vérifiés. La lecture ne touche ni `localStorage` du jeu, ni une
progression de campagne.

## Validation exécutée

**13 contrôles Node réussissent** : fichiers réellement enregistrés par les
trois routes, archives R19 avec Unicode, tranches exactes, doublons, limites,
transports endommagés, contrat inconnu, falsification, résultats séparés et
annulation avant ou pendant un moteur. Le validateur détecte aussi une chaîne
UTF-16 qui perdrait des données lors d’un export UTF-8.

**10 groupes Chromium réussissent** : sauvegarde R19 en 1 440/390 pixels,
extraction exacte du fichier/registre/replay, moteur expérimental, résultats
falsifiés, entrées refusées visibles, lot de 31 sélections bloqué, 205 entrées
sur trois pages avec conservation des choix et 100 lignes maximum, deux scénarios
d’annulation, clavier et texte à 200 % sur 320 pixels CSS. Les sauvegardes témoins
du jeu restent identiques et aucun appel distant n’est relevé dans les parcours
principaux. Les captures restent dans `qa-persistence-r25-browser/`.

```sh
node tests/verify-persistence-r25.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-persistence-r25.mjs
```

Rapports : [Node](R25_PERSISTENCE_TESTS.json),
[navigateur](R25_PERSISTENCE_BROWSER_TESTS.json).

Cette livraison vérifie la simulation **B.O.W. Protocol**. Elle ne certifie pas
les animations, sons, proportions ou conclusions des jeux Resident Evil originaux.
Les autres moteurs historiques, la restauration cloud, les pannes physiques et
l’atomicité d’une restauration réelle restent ouverts. Aucun fichier existant,
moteur, règle de combat ou stockage du jeu n’est modifié par ce module.
