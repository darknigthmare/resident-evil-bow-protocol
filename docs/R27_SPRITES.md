# Sprites générés R27

L’atelier couvre les **385 UID** qui ne possèdent pas l’une des quatre présentations R20. Il ne remplace pas les quatre images historiques. Les demandes figées se trouvent dans `modules/fidelity-r27/sprites/jobs.json` ; `generation-lock.json` lie leurs prompts et références locales à une empreinte. Un fichier demandé n’est pas compté comme produit.

## Images effectivement produites

`modules/fidelity-r27/sprites/manifest.json` distingue `sprites` — PNG réellement importés — et `pending` — UID encore sans sortie générée. Leur union contient les 385 identités sans doublon. Les compteurs sont calculés à partir des fichiers présents et de leurs reçus, sans placeholder ni conversion de portrait en prétendu sprite nouveau.

Chaque image est issue de `image_gen` à partir de références locales attribuées à l’incarnation. Les octets du PNG retourné sont conservés sans rééchantillonnage, détourage local ni recompression. Pillow est utilisé uniquement pour analyser le format, l’alpha, le rectangle visible, le pivot d’affichage et les pixels décodés. Les SHA du fichier et des pixels RGBA empêchent de compter une copie recompressée comme une autre identité.

Une image générée reste une interprétation pour le projet ; une demande de base neutre ne prouve pas que la pose obtenue est neutre. Elle n’est pas un fichier original extrait du jeu, une animation par action ou une conformité géométrique 1:1. Les membres, vues opposées, équipements détachables, attaques, chutes et conclusions restent à produire et vérifier par incarnation.

## Corps, directions et rencontres

Les demandes distinguent **43 rencontres contextuelles** des combattants. Les plantes enracinées, structures et organismes liés à une scène ne deviennent pas des combattants humanoïdes. Une référence de corps complet disponible n’est pas, à elle seule, une revue du corps généré.

`reviewStatus` et `fullBodyReviewed` sont des décisions explicites de revue. L’importation laisse ces champs non revus par défaut. L’admission de corps exige une référence complète réellement utilisée, une revue visuelle et un sujet non contextuel. `sourceFacing` est également inconnu par défaut ; un côté ne peut pas être déduit du seul nom `idle-right.png`. Aucun miroir n’est autorisé. `poseKind` distingue `neutral-base`, `source-bind-pose`, `source-presentation` et `unknown`. Une observation absente reste inconnue : ni un corps entier ni un côté visible ne prouvent une attente neutre. `requestedState: idle` conserve la demande initiale ; `availableStates` reste vide sauf pour un combattant revu, corps complet, côté gauche ou droit identifié et pose explicitement classée `neutral-base`. Cette seule capacité ne contient qu’une image, aucun cycle.

Le fichier de génération conserve `combatIntegrated: false` : l’intégration éventuelle est une capacité de l’adaptateur séparé, soumis à ses vérifications de sujet, état, côté et revue. Une pose idle ne doit jamais remplacer silencieusement une attaque ou une chute. Aucun répertoire complet de combat n’est déclaré terminé.

## Importer un résultat réel

Le reçu JSON doit contenir l’UID exact, le générateur, le prompt effectivement envoyé et les chemins des références utilisées :

```json
{
  "id": "UID-DU-JOB",
  "generator": "image_gen",
  "prompt": "Prompt effectivement envoyé à l’outil",
  "referenced_image_paths": ["/chemin/du/depot/assets/reference.png"],
  "tool_output": "/chemin/du/resultat/image_gen.png"
}
```

```sh
python scripts/import-generated-sprites-r27.py \
  --uid UID-DU-JOB --source /chemin/du/resultat/image_gen.png \
  --generation-record /chemin/du/recu.json --defer-manifest
python scripts/import-generated-sprites-r27.py
python scripts/import-generated-sprites-r27.py --check
```

Le mode `--defer-manifest` permet une queue parallèle par UID : les PNG et fiches individuels sont écrits atomiquement, puis le registre est reconstruit une fois. `--batch` accepte une liste de demandes `{uid, source, generation_record, reviewed?, facing?, full_body_reviewed?}`. Une image différente ne peut pas écraser une sortie déjà importée. `--reviewed`, `--full-body-reviewed` et `--facing` doivent correspondre à une revue réellement effectuée ; ils ne sont pas des optimisations de génération.

## Atelier et validation

L’[atelier](../modules/fidelity-r27/sprites/index.html) affiche une liste textuelle paginée de 24 résultats et une seule image à la fois. Il charge le PNG sélectionné dans un flux borné, vérifie son empreinte avant décodage et crée au plus une URL Blob. Les références sont liées séparément ; aucun portrait n’est affiché à la place d’un fichier manquant. `?identity=UID` ouvre et filtre l’identité exacte. Les erreurs, changements de sélection et départs de page libèrent l’image active.

```sh
python scripts/build-sprites-jobs-r27.py --check
python -m unittest discover -s tests -p test_generated_sprites_r27.py -v
node tests/browser-generated-sprites-r27.mjs
```

Les **18 tests Python** contrôlent les octets inchangés, les formats et alpha, les reçus, sources, doublons de pixels, refus d’écrasement et fausses capacités. Les **six groupes navigateur** vérifient les 385 UID, pagination, filtres, téléchargement, corruption, réponse périmée, registre hostile, clavier, 320 px avec texte à 200 % et durée de vie de l’unique Blob. Le rapport navigateur indique le nombre de fichiers réellement disponibles pendant son exécution ; il doit être relancé après la génération finale pour couvrir le registre final. Ces contrôles ne certifient ni appareils physiques ni fidélité artistique complète.

Un refus réel de génération peut être conservé avec `--failure-record reçu.json --defer-manifest`. Il reste dans les demandes en attente (`BLOCKED_BY_TOOL`) et n’ajoute aucun PNG ou sprite généré. Les identifiants de requête et l’erreur reçue sont conservés sans réécriture. Le compteur des refus encore sans image et l’historique des échecs restent distincts.

Une correction explicite utilise `--revision-of SHA_ACTIF`. Elle exige une nouvelle génération, archive exactement l’ancien PNG et sa fiche sous `superseded/UID/SHA`, puis lie ces deux fichiers depuis la nouvelle provenance. Le registre compte une seule génération active par UID et vérifie aussi les octets de l’archive précédente. Une relance ordinaire ne peut pas écraser une image existante.

Lorsqu’une référence montre visiblement le corps entier mais que sa couverture historique reste inconnue, `--source-completeness-evidence observation.json` peut attester une revue limitée à cette image. Le document lie UID, référence effectivement utilisée, SHA source, SHA du PNG généré, côté observé et capture de comparaison. Les deux corps doivent être explicitement observés entiers. Les certifications de géométrie, vue opposée et pose originale restent fausses. L’importation contrôle les octets de la preuve et de la capture ; elle n’altère ni les références ni les demandes figées et n’admet aucune rencontre contextuelle au combat.

Une revue de pose utilise `--pose-kind` avec la catégorie effectivement observée. Une mise à jour sur le même PNG conserve la provenance, les archives de révision, la preuve de corps et les qualifications précédentes ; une nouvelle génération repart avec une pose inconnue sans déclaration explicite. `--migrate-contract-fields --defer-manifest` ajoute uniquement les champs contractuels conservateurs aux anciennes fiches, avec empreintes avant/après dans `R27_SPRITE_CONTRACT_MIGRATION.json`. Aucune pose neutre n’est inférée et aucun pixel n’est modifié.
