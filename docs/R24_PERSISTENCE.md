# R24 — reconstruction des replays dans leur moteur

La [page R24](../modules/fidelity-r24/persistence/index.html) reconstruit désormais
les commandes avec les vrais moteurs B.O.W. du dépôt. Elle complète l’inspection
statique R23 par une relecture, une comparaison du résultat enregistré et une
deuxième simulation indépendante. Elle ne modifie ni les sauvegardes ni les
replays conservés par les pages de jeu.

Cette vérification concerne la simulation B.O.W. Protocol. Elle ne certifie pas
que ses animations, images ou sons reproduisent les jeux Resident Evil d’origine.

## Contrats et formats effectivement pris en charge

| Fichier | Moteur sélectionné | Vérification exécutée |
| --- | --- | --- |
| Replay principal actuel, enveloppe `version: "0.48"` | Versus courant, moteur `0.60`, contrat `612953ce…` | Toutes les commandes sont relues deux fois ; dix champs du résultat actuel sont comparés à la simulation, dont vie, timer, manches et métriques |
| Replay principal avant R13, même enveloppe `version: "0.48"` | Révision Git `31671fecf53a26d81f77d2cb13a5ff61f15ef363`, contrat `87b73542…` | Replay réellement enregistré par cette révision, puis relu deux fois par ce même moteur ; refus de le lire sous le contrat courant |
| `re.bow.catalog-duel-replay/1` | Moteur expérimental R7 courant, contrat `7481cce1…` | Le validateur original reconstruit les commandes et vérifie `stateDigest` ; deux joueurs indépendants reconstruisent ensuite le même état |
| Autres contrats ou contrat absent | Aucun moteur choisi | Fichier conservable ; ouverture refusée avec les moteurs disponibles |
| Archives complètes et sauvegarde `re.bow.backup/1` | Inspecteur R23 | Inspection et comparaison des copies ; extraire le replay individuel depuis son mode pour la relecture R24 |

Le numéro `0.48` de l’enveloppe ne suffit donc pas à identifier un moteur. Le
contrat de simulation sélectionne la révision. Les clés de réglages historiques
du Dojo (`v043` à `v046`) ne constituent pas des moteurs de replay.

La révision avant R13 conserve son HTML et ses **24 scripts originaux, octet pour
octet**. Les copies vivent uniquement dans le nouveau module R24. Aucun de ces
scripts historiques n’a été réécrit. Les empreintes et la provenance Git sont dans
son [manifeste](../modules/fidelity-r24/persistence/historical/pre-r13/manifest.json).
Les images et sons existants peuvent être consultés pour l’initialisation du
moteur, mais ne participent pas à une certification artistique.

Pour régénérer ce paquet à partir des objets Git présents localement :

```sh
python3 scripts/collect-persistence-engines-r24.py
```

## Isolation et limites

Chaque vérification ouvre un iframe `sandbox="allow-scripts"` à origine opaque,
sans permission d’origine partagée. Avant les scripts du moteur, `localStorage`
et `sessionStorage` reçoivent une copie privée en mémoire. Les frames automatiques
et le son sont désactivés ; seule l’API de ticks du moteur avance la simulation.
Une politique CSP refuse les connexions, médias distants, formulaires et sous-frames.
Les messages de contrôle vérifient l’émetteur, l’origine et le jeton de la tâche.
Annuler détruit cet iframe ; une ancienne réponse ne remplace pas un nouveau fichier.

Pour le moteur principal, les deux états reconstruits sont comparés intégralement
après remplacement des définitions immuables de combattants et d’arène par leurs
identifiants. Ces définitions appartiennent au contrat du moteur. Le format R13
ne contient pas d’empreinte de l’état original complet : la comparaison au fichier
porte sur ses champs de résultat disponibles, puis les deux reconstructions sont
comparées entre elles. Un extrait sans résultat ne devient pas une victoire.

Les conclusions artistiques et leur audio ne sont pas rejoués. L’empreinte FNV du
rapport sert au diagnostic et ne prouve pas l’authenticité du fichier.

## Validation exécutée

- **14 tests ciblés réussis** : replays réellement générés par les moteurs
  courant, pré-R13 et expérimental ; états répétés, extraits, ralenti, perturbation
  contrôlée d’un état, résultats falsifiés, commandes tronquées ou ajoutées, contrats
  absents/inconnus, digest R7 corrompu et enregistrement initial vide.
- **6 groupes Chromium réussis** : reconstruction principale en 1440/390 px,
  état expérimental, refus des falsifications, contrat inconnu et copie originale
  identique, sélection du vrai moteur pré-R13 et annulation pendant un chargement.
- Les 24 scripts et le HTML historiques sont comparés à leurs empreintes. Lors
  de cette tâche, leurs octets ont aussi été comparés aux objets Git originaux.
  Dans un checkout peu profond qui n’a pas ces objets, le rapport indique que
  cette dernière comparaison est indisponible et garde le contrôle des empreintes.
- Les sauvegardes témoins de la page principale restent identiques dans les
  contrôles navigateur. Le moteur isolé n’obtient pas leur origine de stockage.

```sh
node tests/verify-persistence-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-persistence-r24.mjs
```

Rapports : [tests ciblés](R24_PERSISTENCE_TESTS.json),
[navigateur](R24_PERSISTENCE_BROWSER_TESTS.json),
[fichiers et contrats](R24_PERSISTENCE_EVIDENCE.json).
Les fixtures reproductibles et captures locales restent dans les dossiers ignorés
`qa-persistence-r24-fixtures/` et `qa-persistence-r24-browser/`.

`G-REPLAYS` reste ouvert pour les autres révisions et la recette exhaustive.
`G-SAUVES` reste ouvert pour le cloud, les formats inconnus, les arrêts brutaux
et l’atomicité des restaurations. Aucun backend cloud n’est ajouté par ce module.
