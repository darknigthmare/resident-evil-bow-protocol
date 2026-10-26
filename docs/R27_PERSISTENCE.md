# R27 — relire les replays de la restauration isolée

L’atelier R26 permettait une restauration dans une base IndexedDB isolée, puis imposait un export et une nouvelle sélection du fichier pour vérifier ses replays. R27 relie directement cette base au lecteur des moteurs d’origine : [ouvrir les replays de l’atelier](../modules/fidelity-r27/persistence/index.html).

## Parcours

1. Préparer et valider une restauration dans [l’atelier R26](../modules/fidelity-r26/persistence/index.html). Cet atelier garde ses règles d’aperçu, copie préalable et confirmation.
2. Dans R27, demander explicitement la lecture de la révision isolée. Cette lecture ne lance aucun replay et ne choisit pas automatiquement de combat.
3. Sélectionner au plus 30 replays. Chaque combat est reconstruit deux fois dans son moteur exact, dans un espace à origine opaque sans stockage partagé, puis cet espace est détruit.
4. Conserver l’archive imbriquée, une tranche de replay exacte ou le rapport lié à la révision capturée.

Le lecteur ne lit pas le `localStorage` du jeu, ne modifie pas la base isolée et ne restaure aucun service cloud. Les octets UTF-8 de l’archive imbriquée et les espaces des tranches JSON de chaque replay sont conservés. La base R26 ne conserve pas l’enveloppe de transport R19 d’origine : R27 ne prétend pas reconstruire son fichier original.

## Révisions et concurrence

La capture associe la révision R26, son état de journal, le SHA-256 des valeurs brutes et le SHA-256 de l’archive imbriquée. Avant une extraction ou une relecture, les valeurs brutes et la révision sont comparées à un nouvel instantané cohérent. Une restauration, un retour arrière, un effacement ou une écriture directe qui oublie d’incrémenter la révision oblige à relire la base.

Après la relecture, un troisième instantané vérifie que la source est toujours la même. Si un autre onglet l’a modifiée, les résultats des octets capturés restent détaillés, mais le verdict global est faux et `sourceStale` est vrai : aucun verdict ne certifie la révision courante. Le rapport distingue ainsi reconstruction du replay capturé et correspondance à l’état actuel de l’atelier.

Le lecteur utilise uniquement les routes principales actuelle et historique avant R13 que peut contenir l’archive R19. Le replay expérimental R7 ne rentre pas dans cette archive ; le [lecteur de fichiers R25 et ses trois moteurs](../modules/fidelity-r25/persistence/index.html) reste accessible pour ce format individuel. Aucun moteur n’est copié ou réécrit par R27.

## Bornes et durée de vie

Les contrôles et limites de transport restent ceux des contrats R19/R13 : 32 Mio au maximum, lots de 30, contrats inconnus et identifiants répétés refusés avant lancement. La liste rend au plus 100 entrées à la fois ; les sélections sont conservées entre les pages et un lot supérieur à 30 reste désactivé.

Une seule URL Blob de téléchargement est retenue à la fois et elle est révoquée au prochain téléchargement, après une seconde, ou au départ de page. Le départ annule la tâche, détruit son espace de simulation, ferme la connexion IndexedDB et libère la capture. Un retour de page conservée demande une nouvelle lecture explicite ; aucune relecture ne reprend automatiquement. Le test de ces événements est simulé et ne certifie pas BFCache sur du matériel physique.

## Validation exécutée

- Huit groupes Node : vrais contrats R19/R13 et fixtures de replays principaux actuels/historiques, extraction Unicode exacte, état privé, limites, contrats inconnus, doublons, révision et écriture brute concurrentes, annulation pendant une création lente, fermeture sans repli vers le stockage du jeu.
- Neuf groupes Chromium : restauration R26 réelle puis relecture R27 en 1440/390 px ; les deux moteurs originaux font chacun deux reconstructions. Les essais incluent aussi modification avant lancement et pendant le chargement du moteur, résultat falsifié dans un lot mixte, 205 entrées paginées, refus de stockage, départ/retour de page et clavier à 320 px avec texte CSS à 200 %.
- Les téléchargements successifs gardent un seul Blob actif ; archive et tranche de replay téléchargées correspondent aux octets source. Les sauvegardes du jeu sont vérifiées inchangées.

Rapports : [Node](R27_PERSISTENCE_TESTS.json), [Chromium](R27_PERSISTENCE_BROWSER_TESTS.json) et [manifeste](../modules/fidelity-r27/persistence/manifest.json).

```sh
python scripts/build-persistence-manifest-r27.py --check
node tests/verify-persistence-r27.mjs
node tests/browser-persistence-r27.mjs
```

Ces contrôles concernent le stockage et la reconstruction de B.O.W. Protocol. Ils ne certifient ni restauration réelle du jeu, ni panne physique, ni règles originales Capcom, ni fidélité des images, sons ou conclusions artistiques.
