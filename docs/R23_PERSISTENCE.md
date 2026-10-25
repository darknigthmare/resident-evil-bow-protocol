# R23 — inspection des copies et compatibilité des replays

Le module [d’inspection](../modules/fidelity-r23/persistence/index.html) ouvre les
exports R19 et les replays existants sans lire le stockage du navigateur, sans
restaurer de sauvegarde et sans lancer de combat. Il permet de comparer deux
copies et de conserver le fichier original octet pour octet, même si son contenu
ne peut pas être interprété. Aucun fichier n’est envoyé à un service distant.

## Avancée vérifiable

Un cas de couverture incomplet est reproduit par les tests : R19 considère
`[false]` comme une collection de replays extérieurement lisible. Cette conclusion
ne valide pas ses entrées. R23 appelle le validateur de replay R13 sur chacune
d’elles et signale l’anomalie. Le centre de sauvegardes historique reste conservé.

L’inspecteur vérifie également les propriétés JSON répétées, la profondeur et la
taille du document, les empreintes de transport et des slots, les identifiants de
replay répétés et les copies de même révision dont les contenus divergent. La
comparaison expose les différences sans arbitrer ni fusionner les données.

| Export reconnu | Contrôles R23 | Contrôles encore nécessaires |
| --- | --- | --- |
| Sauvegarde `re.bow.backup/1` | Inventaire R19 exact de 18 clés et 8 groupes, empreinte de transport, inspection des replays et enveloppes de reprise | Règles sémantiques propres aux modes, progression et paramètres |
| Replay principal R13 | Validateur R13 existant, commandes/durée, contrat courant ou différent | Reconstruction de l’état final par le moteur d’origine |
| Archive principale | Contrôles de chaque entrée, limite de taille, identifiants répétés | Relecture de chaque replay dans son moteur |
| Replay expérimental R7 | Structure bornée, somme des runs, commandes IA, contrat et syntaxe de l’empreinte d’état | Reconstitution de la simulation et comparaison de l’état final |

La mention « contrat courant » indique seulement que l’empreinte des règles
correspond. Elle ne certifie ni la validité du résultat ni un replay compatible
avec toutes les anciennes versions. Les formats inconnus restent à conserver
avec leur moteur d’origine. Les empreintes FNV historiques détectent des dommages
accidentels ; elles ne prouvent pas l’authenticité d’un fichier.

## Validation exécutée

- **12 tests ciblés réussis**. Deux cas utilisent les vrais moteurs du dépôt : un
  combat principal terminé et un enregistrement expérimental de 120 frames sont
  créés, inspectés, puis relus indépendamment dans leur moteur. Cela valide ces
  deux cas, sans attribuer une simulation à l’inspecteur.
- **4 groupes Chromium réussis** : import en 1440 et 390 px, stockage inaccessible
  sans erreur, aucune requête d’envoi, texte non exécuté, comparaison d’un ID en
  conflit, copie originale identique comprenant un BOM et des retours CRLF,
  ancienne lecture asynchrone empêchée de remplacer une sélection plus récente.

```sh
node tests/verify-persistence-r23.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-persistence-r23.mjs
```

Les rapports [unitaires](R23_PERSISTENCE_TESTS.json),
[navigateur](R23_PERSISTENCE_BROWSER_TESTS.json) et le
[relevé des fichiers historiques](R23_PERSISTENCE_EVIDENCE.json) rendent les
résultats et leurs limites vérifiables. Les captures locales sont dans le dossier
ignoré `qa-persistence-r23-browser/`.

## Chantiers restant ouverts

`G-REPLAYS` reste ouvert pour les formats inconnus, la relecture exhaustive et les
moteurs historiques absents. `G-SAUVES` reste ouvert pour le cloud, les arrêts
brutaux, l’atomicité de plusieurs écritures et la résilience sur appareils
physiques. L’inspection améliore les contrôles disponibles et ne ferme aucun de
ces deux chantiers.
