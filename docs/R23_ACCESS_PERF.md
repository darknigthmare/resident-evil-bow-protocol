# R23 — parcours accessibles et mesures de performance

Les contrôles exécutés font avancer `G-ACCESS`, `G-PERF` et `G-RECETTE` sur
le Bestiaire et le lecteur documentaire. Ils ne valident ni le matériel cible,
ni les lecteurs d’écran physiques, ni la production artistique 1:1 du catalogue.

## Trois défauts corrigés

- Le dialogue du Bestiaire n’avait aucun nom dans l’arbre d’accessibilité
  Chromium : `Accessibility.getFullAXTree` retournait `role=dialog`, `name=""`.
  Le titre `detailName` et le jeu `detailEpisode` donnent désormais le nom et
  la description accessibles, sans transformer l’identité ou sa forme.
- Un déplacement clavier du curseur vers une autre image désactivait les
  commandes pendant le chargement de l’atlas. Le navigateur perdait alors
  le focus : après `End`, `ArrowLeft` et `Home` n’agissaient plus.
  Le focus revient maintenant au contrôle après le chargement, ou au curseur
  si le bouton est désactivé à une extrémité. Un changement volontaire de
  focus, `Tab`, `Escape`, un clic ou une page cachée annule cette restauration.
- L’événement natif `close` peut être délivré après une réouverture rapide.
  Il invalidait alors l’image du nouveau Dossier : dialogue ouvert, identifiant
  R22 nul et image source jamais affichée. Le complément R23 resynchronise
  uniquement ce cas de fermeture retardée alors que le dialogue est rouvert.

Ces corrections sont additives dans
`modules/fidelity-r23/access/dossier-access.js` et `motion-access.js`.
Les moteurs de combat, données et images R22 ne sont pas réécrits.

## Validation exécutée

Le rapport machine est [R23_ACCESS_PERF.json](R23_ACCESS_PERF.json).
Les **sept groupes réussissent**, sans échec :

- Les **115 Dossiers principaux** parcourus au clavier à 1 440 px et les mêmes
  **115** par interactions tactiles émulées à 390 px : titre et jeu exacts dans
  l’arbre d’accessibilité, fond modal inaccessible aux commandes, fermeture et
  retour du focus à la carte. Le passage du focus au chrome du navigateur reste
  autorisé, comme le prévoit le dialogue natif.
- Les **20 images sources revues** affichées sous leur propre identité et avec
  leurs dimensions d’origine dans chacun de ces parcours ; cache applicatif
  de deux images au maximum.
- Dix fermetures et réouvertures dans le même tour JavaScript, avec conservation
  de l’identité et de l’image source après réception de l’événement `close`.
- Lecture clavier : `Enter`, `Space`, `Home`, `End`, flèches du curseur, pause
  persistante, contour de focus visible et ouverture de la citation.
- Chargement d’un atlas volontairement retardé : `Tab` pendant l’attente garde
  le nouveau focus ; le chargement terminé ne le reprend pas. Un déplacement
  clavier suivant retrouve le curseur. Une page cachée ne lance pas la lecture.
- Lecture tactile émulée, cibles des commandes d’au moins 24 pixels CSS et corps
  du texte passé de 16 à 32 pixels sans débordement horizontal du document.
- Mesures de lecture et **40 changements entre les 20 images**.

## Mesures observées

Cette exécution utilise Node **22.16.0**, Chromium **154.0.8037.57** en mode
headless sous Linux x64 virtualisé. Le serveur utilise HTTP en boucle locale,
sans limitation réseau ni ralentissement CPU imposé.

| Mesure | Résultat de cette exécution |
| --- | ---: |
| Lecteur prêt, première image vérifiée | 216 ms |
| Intervalles `requestAnimationFrame` observés | 385 en 6,5 s |
| Intervalle médian / 95e percentile | 16,7 / 16,8 ms |
| Intervalles supérieurs à 50 ms | 1 |
| Tâche longue relevée pendant la lecture | 93 ms |
| Dernière image atteinte | 149 sur 149, indexation à partir de zéro |
| Cache maximum d’atlas / portraits | 2 / 2 |
| Tas JavaScript après 40 changements de portrait | 5 583 952 octets |

Ces chiffres ne donnent pas une cadence certifiée sur téléphone ou ordinateur
physique. Les mesures CDP du tas JavaScript ne couvrent pas toute la mémoire du
processus, du GPU ou des images décodées. Un cache applicatif limité à deux
entrées ne prouve pas que toute la mémoire native du navigateur est bornée.
La tâche longue mesurée reste visible dans le rapport ; aucune garantie de
temps de frame constant ou de longues sessions n’en est déduite.

## Reproduire

Depuis la racine du dépôt, avec Playwright installé et Chromium disponible :

```sh
CHROME_BIN=/usr/bin/chromium node tests/browser-fidelity-r23.mjs
```

Le script lance son serveur local sur le port 5269, écrit les captures et le
rapport complet dans `qa-fidelity-r23-browser/`, et exporte le résultat dans
`docs/R23_ACCESS_PERF.json`.

VoiceOver, NVDA, manettes physiques, écran tactile réel, écoute matérielle,
sessions prolongées et recette artistique des 389 incarnations restent ouverts.
