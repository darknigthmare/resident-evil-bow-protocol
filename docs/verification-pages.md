# Vérification des opérations et du bestiaire

Exécution : 2026-10-13T07:42:25.599Z. **22 contrôles réussis ; 0 en échec.**

## Méthode

La suite charge réellement `operations.html`, `codex.html` et `modules/versus.html`, puis leurs scripts livrés. Deux fenêtres VM distinctes communiquent avec une file asynchrone de messages `postMessage`, en conservant les identités de `event.source`. Aucun résultat positif n’est fabriqué : les victoires et défaites passent par les collisions, dégâts, KO et fonctions de résultat du moteur.

Pour rendre les branches reproductibles, le contrôleur CPU réel pilote temporairement un des deux combattants pendant que l’autre reste immobile. Le scénario Survie laisse d’abord l’adversaire infliger des blessures réelles, puis vérifie la récupération de douze points de pourcentage et les points de vie du prochain combat. Les vies, dégâts, ressources et vainqueurs ne sont jamais écrits par le test. Les messages erronés ou retardés sont injectés uniquement pour vérifier leur rejet.

Avant chaque duel ou replay, la suite attend le décodage réel de son décor et des images demandées par le module. Un fichier manquant ou illisible échoue explicitement ; l’horloge de simulation ne remplace pas cette attente.

Le DOM contrôlé vérifie les états, liens, filtres, dialogues et interactions de scripts. Il ne remplace pas une inspection navigateur de la mise en page, du clavier réel, de l’iframe native, des tailles tactiles ou des protections de déploiement. La navigation de l’iframe est reliée explicitement au vrai module de combat dans ce banc de test.

## Reproduction

```sh
node tests/verify-pages.mjs
```

Prérequis : Node.js, les données compilées et `@napi-rs/canvas`, directement installé ou disponible dans `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. Le résultat détaillé et les empreintes SHA-256 des sources sont enregistrés dans `tests/pages-results.json`.

## Couverture

- 389 dossiers consultables ; 115 versions jouables.
- Pagination, recherche avec accents, filtres par épisode/statut, sources et liens des dossiers, fermeture et retour du focus.
- Lancement, accusé de réception et résultat du vrai moteur ; origine de fenêtre et identifiant de requête.
- Huit victoires Arcade, sélection des dix boss, Survie, replays, défaite, retour à la sélection et records persistants.
- 15 duels d’opération exécutés jusqu’au KO dans cette exécution.

## Duels du parcours

| Mode | Rencontre | P1 | P2 | Gagnant | Images simulées | Vie P1 / P2 |
|---|---:|---|---|---:|---:|---:|
| arcade | 1 | re3r-nemesis | rerev2-splasher | 1 | 1003 | 10000 / 0 |
| arcade | 1 | re3r-nemesis | revillage-moroaica | 1 | 1171 | 10000 / 0 |
| arcade | 2 | re3r-nemesis | re7-mia-winters-infected | 1 | 1076 | 10000 / 0 |
| arcade | 3 | re3r-nemesis | re5-jill-valentine-enemy | 1 | 1192 | 10000 / 0 |
| arcade | 4 | re3r-nemesis | re5-big-man-majini | 1 | 1288 | 10000 / 0 |
| arcade | 5 | re3r-nemesis | re6-ustanak | 1 | 1209 | 10000 / 0 |
| arcade | 6 | re3r-nemesis | re2r-super-tyrant | 1 | 1112 | 10000 / 0 |
| arcade | 7 | re3r-nemesis | re5-ndesu | 1 | 1211 | 10000 / 0 |
| arcade | 8 | re3r-nemesis | revillage-mutated-miranda | 1 | 1120 | 10000 / 0 |
| arcade | 1 | re3r-nemesis | re4r-garrador | 1 | 1069 | 10000 / 0 |
| arcade | 1 | re3r-nemesis | re7-little-crawler | 1 | 1125 | 10000 / 0 |
| survival | 1 | re3r-nemesis | re7-lucas-baker-mutated | 1 | 1495 | 7330 / 0 |
| survival | 2 | re3r-nemesis | re4r-del-lago | 1 | 1087 | 8530 / 0 |
| survival | 1 | re3r-nemesis | re4r-garrador | 2 | 940 | 0 / 10000 |
| arcade | 1 | re3r-nemesis | re7-marguerite-baker-mutated | 1 | 1120 | 10000 / 0 |

## Contrôles

- RÉUSSI — Operations and Codex scripts parse and their shipped HTML loads
- RÉUSSI — Codex pagination exposes every dossier exactly once with the right status
- RÉUSSI — Codex status and episode filters partition the real catalog without leakage
- RÉUSSI — Codex search ignores accents and case; empty results and filter resets are usable
- RÉUSSI — All Codex details resolve real assets, sources and playable links; closing restores focus
- RÉUSSI — Codex direct links open the requested dossier and missing image failures stay explicit
- RÉUSSI — Operations iframe handshake launches the real eight-opponent Arcade route
- RÉUSSI — Operations ignore unrelated windows, stale results and stale acknowledgements
- RÉUSSI — A genuine Arcade KO advances only on Next; duplicate results count once
- RÉUSSI — Eight real Arcade victories complete the route and persist the record
- RÉUSSI — Boss Rush selects ten genuine bosses and preserves the selected difficulty
- RÉUSSI — Apex Mutation selects its twelve fixed forms and matching first chamber
- RÉUSSI — E-001 Family Protocol selects fourteen Dulvey subjects
- RÉUSSI — Stylized and cinematic finishes emit one correlated result after their actual sequence
- RÉUSSI — Survival restores twelve percentage points after actual injuries and carries life into the next engine match
- RÉUSSI — A replay recorded during reduced-health Survival reproduces the real result
- RÉUSSI — A real Survival defeat ends the run and does not increase its record
- RÉUSSI — Stale engine errors cannot cancel an active duel with a newer requestId
- RÉUSSI — A real engine launch failure retains its requestId and offers a clean restart
- RÉUSSI — A delayed ready notification cannot automatically replay an already completed encounter
- RÉUSSI — Leaving a run aborts the real engine, late results stay ignored and a new run can launch
- RÉUSSI — Stored operation records survive a page reload and corrupted storage falls back to a clean setup

## Traçabilité

Une modification de source après cette exécution nécessite de relancer la suite. Les autres règles du combat, techniques, collisions, cinématiques et chroniques sont couvertes par `tests/verify-engine.mjs` et son rapport `docs/verification-runtime.md`.
