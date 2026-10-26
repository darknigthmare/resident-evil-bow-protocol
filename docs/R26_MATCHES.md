# R26 — KO, adversaires différents et manches nulles

La recette conserve **133 scénarios**, dont **131 matchs terminés** : **128 par KO et trois au chronomètre**, avec dégâts observés dans chacun. Les 131 replays complets ont chacun produit deux reconstructions identiques dans le moteur réel, soit **262 reconstructions**. Deux scénarios supplémentaires restent des séries de manches nulles bornées ; ils ne sont pas comptés comme des matchs terminés.

| Série | Scénarios | Portée |
| --- | ---: | --- |
| Rotation du roster | 115 | Chaque identité principale apparaît une fois de chaque côté, face à une identité différente. |
| Ordre inversé | 7 | Échantillons réciproques conservant l’orientation des deux sujets. |
| Adversaire CPU | 6 | Inputs du CPU réel, déterministe par graine, enregistrés avec ceux du joueur. |
| Première manche nulle | 5 | Trois matchs atteignent ensuite deux victoires ; deux autres restent nuls jusqu’à la borne. |

Ces séries représentent **122 couples ordonnés distincts**, et non 133 couples ni les 13 225 couples possibles du roster principal. En les rapprochant des 115 miroirs R25 conservés, les deux recettes couvrent 237 couples à règles et entrées documentées. Cela ne certifie ni toutes les confrontations, ni l’équilibrage, ni les conclusions artistiques.

Les combats commencent avec les points de vie complets ordinaires, contrôlés contre le maximum créé par le moteur. Le pilote utilise uniquement les événements clavier : approche gauche/droite selon les positions lues, puis lourd, léger et prise. Il ne réécrit aucun état, point de vie, ressource ou jauge. Les adversaires locaux restent volontairement immobiles pour éprouver les dégâts et les KO ; les six scénarios CPU exercent aussi la réponse adverse. Le chronomètre des séries croisées est le réglage B.O.W. Protocol de 99 secondes, avec une victoire requise. Il ne s’agit pas d’une règle officielle des jeux Resident Evil.

Les cinq scénarios de manche nulle utilisent un chronomètre contrôlé de cinq secondes et deux victoires requises. La première manche reste sans entrée, puis le même pilote d’approche et d’attaque reprend. Cerberus contre Tyrant, Hunter contre Hunter β et Marguerite mutée contre Lucas muté traversent la manche nulle, sa remise à zéro et deux victoires réelles. Aucune victoire n’est attribuée à une égalité.

**Uroboros Albert Wesker contre Cerberus et Nemesis contre Bitores Méndez restent sans dégâts dans ce protocole de cinq secondes.** Chacun atteint 24 000 frames, 50 manches nulles et 49 remises à zéro, avec vie complète et zéro victoire. La recette s’arrête à cette borne et conserve un extrait issu de l’API B.O.W. Protocol sans résultat, plutôt que d’inventer une fin de match. Le validateur distingue leur déterminisme de la validation d’un résultat : l’extrait reconstruit reste inachevé, sans vainqueur et sans résultat revendiqué. Les compteurs `tiedRounds`, `roundEndEvents` et `roundResetEvents` du résumé concernent les matchs terminés ; les 100 égalités des deux cas bornés sont détaillées dans leurs propres événements.

Les fichiers du moteur et du roster ne sont pas modifiés. Les huit entrées source enregistrées avec leurs SHA-256, les réglages, les inputs compactés, les dégâts, les transitions, les résultats et les vérifications sont dans [`R26_MATCHES.json`](R26_MATCHES.json). Les segments d’exécution distinguent la recette initiale et les enregistrements supplémentaires des cas de manches nulles. Les finishers sont désactivés : aucune animation, image, voix ou temporalité de victoire/défaite d’origine n’est certifiée par ces simulations.

Reproduction sous Node 22.16.0 :

```bash
node scripts/audit-full-matches-r26.mjs
node tests/verify-full-matches-r26.mjs
```

La première commande réenregistre les séries et vérifie leurs replays dans le moteur. La seconde vérifie les données gelées, rejette les falsifications de portée, de vie et de résultats, puis reconstruit des échantillons KO, inversés, CPU, de manche nulle et d’extrait inachevé dans le moteur d’origine. Elle enregistre les résultats dans [`R26_MATCH_TESTS.json`](R26_MATCH_TESTS.json). La reconstruction d’un extrait sans vainqueur ne transforme pas cet extrait en replay de match complet.
