# Vérification des opérations et du bestiaire

Exécution : 2026-10-11T08:46:47.845Z. **21 contrôles réussis ; 0 en échec.**

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

- 389 dossiers consultables ; 93 versions jouables.
- Pagination, recherche avec accents, filtres par épisode/statut, sources et liens des dossiers, fermeture et retour du focus.
- Lancement, accusé de réception et résultat du vrai moteur ; origine de fenêtre et identifiant de requête.
- Huit victoires Arcade, sélection des dix boss, Survie, replays, défaite, retour à la sélection et records persistants.
- 15 duels d’opération exécutés jusqu’au KO dans cette exécution.

## Duels du parcours

| Mode | Rencontre | P1 | P2 | Gagnant | Images simulées | Vie P1 / P2 |
|---|---:|---|---|---:|---:|---:|
| arcade | 1 | re3r-nemesis | re2-g-fourth-form | 1 | 1070 | 10000 / 0 |
| arcade | 1 | re3r-nemesis | revillage-soldat-zwei | 1 | 1148 | 10000 / 0 |
| arcade | 2 | re3r-nemesis | revillage-mutated-miranda | 1 | 1220 | 10000 / 0 |
| arcade | 3 | re3r-nemesis | re4-iron-maiden | 1 | 1194 | 10000 / 0 |
| arcade | 4 | re3r-nemesis | revillage-mutated-moreau | 1 | 1139 | 10000 / 0 |
| arcade | 5 | re3r-nemesis | revillage-samca | 1 | 1223 | 10000 / 0 |
| arcade | 6 | re3r-nemesis | recv-alexia-ashford-third-form | 1 | 1156 | 10000 / 0 |
| arcade | 7 | re3r-nemesis | re7-mama-mold | 1 | 1063 | 10000 / 0 |
| arcade | 8 | re3r-nemesis | re4r-osmund-saddler-mutated | 1 | 1139 | 10000 / 0 |
| arcade | 1 | re3r-nemesis | rerev-sea-creeper | 1 | 1284 | 10000 / 0 |
| arcade | 1 | re3r-nemesis | re2r-tyrant | 1 | 1034 | 10000 / 0 |
| survival | 1 | re3r-nemesis | re7-molded | 1 | 1351 | 7052 / 0 |
| survival | 2 | re3r-nemesis | re2r-tyrant | 1 | 1034 | 8252 / 0 |
| survival | 1 | re3r-nemesis | re7-molded | 2 | 1076 | 0 / 10000 |
| arcade | 1 | re3r-nemesis | re2-g-second-form | 1 | 1058 | 10000 / 0 |

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
