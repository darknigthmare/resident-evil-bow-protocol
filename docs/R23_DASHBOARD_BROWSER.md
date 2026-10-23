# R23 — contrôle du centre Sources et chantiers

Les cinq groupes de `tests/browser-fidelity-dashboard-r23.mjs` réussissent
sur le centre R23 final. Le résultat détaillé est conservé dans
[R23_DASHBOARD_BROWSER.json](R23_DASHBOARD_BROWSER.json).

Les parcours à 1 440 px et 390 px vérifient les 17 identifiants du classeur,
leur statut `EN COURS`, les filtres, les deux chantiers sauvegardes/replays,
les cinq entrées de ressources et la réponse HTTP de chaque lien de revue.
Le clavier permet d’atteindre le lien d’évitement, les filtres nommés et les
détails avec un contour de focus visible. Le parcours à 390 px utilise des
interactions tactiles émulées.

Les refus et reprises sont aussi exécutés : réponse 404, suivi incomplet à
16 chantiers, puis nouvel essai avec les 17 chantiers. Un titre contenant
du HTML reste affiché comme du texte ; un lien de ressource externe est
refusé sans créer de lien cliquable vers cette destination.

```sh
CHROME_BIN=/usr/bin/chromium node tests/browser-fidelity-dashboard-r23.mjs
```

Le script requiert le suivi `modules/fidelity-r23/progress.json`, lance son
serveur local sur le port 5271 et conserve les captures dans
`qa-fidelity-r23-dashboard/`. L’exécution utilise Node 22.16.0 et Chromium
154.0.8037.57 headless sous Linux virtualisé. Elle ne remplace pas un essai
sur écran tactile physique, lecteur d’écran, manette ou matériel cible.
