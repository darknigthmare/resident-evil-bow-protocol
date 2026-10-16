# Vérification du moteur Resident Evil — B.O.W. Protocol

Exécution : 2026-10-16T10:09:00.202Z. Version du contenu : 0.7.3.

**26 contrôles réussis ; 0 contrôle(s) en échec.**

## Méthode

La suite charge les sources livrées. Elle exécute la simulation CQC 0.60 adaptée, sa véritable IA, les règles des chroniques et le module versus complet dans un DOM contrôlé avec Canvas natif. Les duels CPU commencent à 10 000 points de vie, sans invulnérabilité, soin automatique ni ressource gratuite. Les données de résultat passent par les fonctions réelles du jeu.

Les vérifications de scénario isolent volontairement des situations : énergie insuffisante, blessures récupérables, interruption, mur et lancement de technique. Elles sont distinctes des duels complets. Les replays sont enregistrés puis relus par le moteur livré.

Les ressources d’un nouveau match sont demandées et réellement décodées avant toute avance de la simulation. Les fichiers locaux sont transmis au décodeur Canvas par leur chemin : le passage brut en Buffer du binding pouvait confondre certains PNG contenant du texte SVG dans leurs métadonnées avec une image SVG. Le PNG, son URL et le renderer livré restent inchangés ; les erreurs de fichier ou de décodage restent bloquantes pour la suite.

Cette exécution ne mesure pas la mise en page CSS dans un navigateur et ne constitue pas un essai avec une manette physique. Les images sont réellement décodées et les compositions sont réellement dessinées par Canvas.

## Reproduction

Prérequis : Node.js et `@napi-rs/canvas` installé. Le chargeur accepte également le chemin de modules indiqué par `CODEX_PRIMARY_RUNTIME_NODE_MODULES`.

```sh
node tests/verify-engine.mjs
```

Le contenu compilé doit déjà exister dans `data/roster.json`, `data/chronicles.json` et `src/re-data.js`. La suite écrit son résultat dans `tests/engine-results.json` et actualise le présent rapport.

## Couverture

- 115 combattants et 1150 contrats de techniques.
- 115 espèces testées contre un adversaire immobile avec la véritable IA.
- 8 duels CPU complets ciblant notamment les petites et grandes morphologies.
- 222 images locales réellement décodées.

## Duels CPU à vie entière

| P1 | P2 | Issue | Frames | Impacts P1 / P2 | Vie P1 / P2 |
|---|---|---|---:|---:|---:|
| re1-cerberus | re4-el-gigante | KO | 1098 | 10 / 12 | 0 / 5735 |
| re4-el-gigante | re1-cerberus | KO | 1017 | 13 / 8 | 5450 / 0 |
| re7-flying-bug | re3r-nemesis | KO | 1229 | 10 / 11 | 0 / 3566 |
| re3r-nemesis | re7-flying-bug | KO | 1218 | 14 / 10 | 5171 / 0 |
| re7-molded | re5-albert-wesker-enemy | KO | 1241 | 11 / 12 | 0 / 3340 |
| re5-albert-wesker-enemy | revillage-sturm | KO | 1253 | 13 / 10 | 1402 / 0 |
| revillage-samca | revillage-hauler | KO | 1081 | 4 / 16 | 0 / 7006 |
| re2-ivy | re1r-tyrant | KO | 1478 | 16 / 14 | 0 / 787 |

## Contrôles

- RÉUSSI — Every delivered JavaScript source parses
- RÉUSSI — Compiled browser datasets exactly match their editable release records
- RÉUSSI — Unique playable identities, physical dimensions and complete authored move contracts
- RÉUSSI — All referenced local portraits, full-body sprites and declared arena files decode
- RÉUSSI — Every dossier, route opponent and cinematic stage resolves to delivered content
- RÉUSSI — All real repertoires start, spend resources and activate only after their startup
- RÉUSSI — Resource exhaustion blocks paid attacks, then passive recovery restores eligibility
- RÉUSSI — The real recovery utility is delayed and clamps to the reserve capacity
- RÉUSSI — Organic healing uses real recoverable damage, has a budget and can be interrupted
- RÉUSSI — A morphologically small attacker really leaves the floor during its authored leap
- RÉUSSI — High and low guards apply the correct real contact response
- RÉUSSI — Authored projectiles travel into real targets and ranged CPU adapts to a crouched small body
- RÉUSSI — Camouflage activates through its real move and a real hit cancels it without invulnerability
- RÉUSSI — Small and large bodies separate at both walls without crossing floor or bounds
- RÉUSSI — Every playable species closes distance and damages an idle opponent through the real CPU
- RÉUSSI — Eight complete CPU duels cover asymmetric matchups at full initial life
- RÉUSSI — Super techniques require earned gauge and create real deferred damage
- RÉUSSI — Seeded CPU commands reproduce the same simulation without consulting AI during replay
- RÉUSSI — All stories advance through eight validated wins into their own unlocked ending
- RÉUSSI — Defeat consumes only the three continues and rejects an unrelated duel result
- RÉUSSI — Two-slot saves preserve progression and recover from a corrupted latest write
- RÉUSSI — The actual versus HTML initializes its real controls, engine and reference renderer
- RÉUSSI — Actual keyboard movement, pause and rematch preserve the chosen match configuration
- RÉUSSI — The actual UI engine records and replays a complete CPU match identically
- RÉUSSI — Corrupted replays are rejected and truncated replays pause with an explicit incomplete state
- RÉUSSI — Cinematic contracts draw actual references for hero, before, after and ending scenes

## Périmètre signalé

- Stages use the visible simulation fallback when no background was declared. re5_060_adjule, re5_060_big_man_majini, re5_060_chainsaw_majini, re5_060_executioner, re5_060_gatling_gun_majini, re5_060_jill_valentine_enemy, re5_060_licker_beta, re5_060_reaper, re5_060_popokarimu, re5_060_ndesu, re5_060_irving, re5_060_u_8, re5_060_uroboros, re5_060_uroboros_mkono, re5_060_uroboros_aheri, re5_060_uroboros_albert_wesker

## Traçabilité

Les empreintes SHA-256 des sources exactes exécutées sont conservées dans `tests/engine-results.json`. Une modification ultérieure des sources requiert une nouvelle exécution avant de réutiliser ce résultat.
