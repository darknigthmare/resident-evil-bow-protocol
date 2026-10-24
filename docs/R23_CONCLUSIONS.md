# R23 — audit des conclusions et des résultats de manche

La [matrice](R23_CONCLUSIONS_MATRIX.json) recalcule les règles réellement utilisées
par `RE_FINISHER_COMPATIBILITY`, sans modifier les profils. Elle couvre les
**13 225 paires ordonnées** des 115 combattants principaux et leurs **52 900
verdicts**, soit les quatre conclusions existantes de chaque attaquant contre
chacune des 115 victimes. Les identités expérimentales et les contextes restent
hors du périmètre de cette politique héritée.

**2 141 paires** sont compatibles avec au moins une chorégraphie de prototype,
soit 8 564 verdicts autorisés. **44 336 verdicts sont refusés**, avec le motif exact
retourné par le module. Cela ne certifie ni des contacts anatomiques, ni une
conclusion canonique, ni la présence d’une animation finale.

## Lire la matrice

Chaque ligne `rows` contient un attaquant et ses `conclusions`. Les cellules
`victims` indiquent la victime et quatre `verdictCodes`, dans le même ordre que
les conclusions. `reasonCatalog` conserve pour chaque code l’autorisation, le
texte du refus ou de l’acceptation et sa portée exacte. `reasonCounts` et
`anatomyPairs` permettent de distinguer les raisons et les couples de gabarits.

Les `bodies` proviennent des gabarits déclarés du moteur : 45 bipèdes, neuf corps
bas, 32 gabarits non qualifiés et 29 sujets d’autres catégories. Leurs dimensions
ne sont pas des mesures des jeux d’origine. La projection d’Eveline, le sujet
collectif Donna/Angie et les anciennes prises de Lucas humain restent refusés.
Un identifiant de conclusion d’une autre incarnation reste également refusé.

## Événements du moteur et présentation

L’audit exécute le véritable moteur avec des états de KO contrôlés, pour les deux
slots gagnants. Il observe `roundEnd`, `roundReset`, `roundEnd`, puis `matchEnd`.
La première défaite reste réversible. Même à la manche décisive, une conclusion
reste interdite avant la fin du décompte de 90 ticks. Ensuite, seul l’objet du
vainqueur avec le bon slot peut conclure ; la notification de résultat bloque
une répétition. La victoire finale et l’outro à partir du tick 90 restent des
emplacements de présentation distincts.

Une manche de KO simultané produit `roundDraw`, puis le moteur réinitialise une
nouvelle manche sans terminer le match. `matchDraw` est pris en charge par le
module de présentation, mais n’est exercé ici qu’avec une fixture de résultat
terminal : **aucun match nul terminal n’a été observé par les pas du moteur**.
Les valeurs de vainqueur invalides et les conclusions sur égalité restent
refusées. Une conclusion en attente masque la présentation finale ordinaire et
le mode de réduction des mouvements ramène son tick de dessin à zéro.

Les huit états de présentation ont été vérifiés pour les 115 identités, soit
920 états et 1 840 côtés. **Aucun état n’a ses deux clips animés disponibles**.
Cette vérification ne produit aucun dessin, son, rig ou geste de conclusion.

## Reproduire

```sh
node scripts/audit-conclusions-r23.mjs
node scripts/audit-conclusions-r23.mjs --check
```

La première commande écrit seulement la nouvelle matrice R23. `--check` recalcule
en mémoire puis compare à cette matrice, sans réécrire de fichier. Le rapport est
déterministe et conserve les empreintes des huit fichiers d’entrée. Cinq groupes
de contrôles réussissent : matrice exhaustive, refus et conservation des profils,
transitions du vainqueur 0, transitions du vainqueur 1 et égalités/couverture.
Ces fixtures ne constituent pas des matchs joués intégralement, une recette de
campagne ou une validation artistique sur appareils physiques.
