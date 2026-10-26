# Revue documentaire R26

Le [lecteur canonique R26](../modules/fidelity-r26/canonical/index.html) ajoute **110 assertions vérifiées dans 99 fiches de sources**, pour **99 UID qui ne possédaient encore aucune assertion revue en R23, R24 ou R25**. Le cumul atteint **275 des 389 incarnations**. Les 114 autres restent sans revue d’assertion ; une fiche et une citation ne constituent pas une certification 1:1 globale.

| Type | Assertions R26 |
| --- | ---: |
| Geste ou comportement | 70 |
| Forme | 23 |
| Vulnérabilité ou condition de traitement décrite | 5 |
| Périmètre, scénario ou condition | 12 |

Les sujets couvrent CODE: Veronica, RE2 original et remake, RE3 original et remake, Outbreak et Outbreak File #2. La [curation manuelle](../modules/fidelity-r26/canonical/curation.json) conserve les citations exactes. Le [manifeste reproductible](../modules/fidelity-r26/canonical/manifest.json) lie chaque énoncé au jeu, à l’acteur, à la phase, à sa polarité et aux SHA du snapshot gzip R23 et de son HTML décompressé. **Aucun snapshot historique n’est dupliqué ou modifié.** Les liens des trois manifestes antérieurs conservent leur SHA ; les paramètres de combat, le roster et les images historiques ne changent pas.

Les distinctions vérifiées comprennent :

- La bonbonne de gaz de l’alligator RE2 (1998) et la conduite de gaz du remake 2019.
- L’Albinoid infantile ne possédant pas le grand champ de l’adulte, tout en pouvant encore infliger un choc limité.
- Les Scissor Worms d’Outbreak seulement en Hard / Very Hard et la saisie létale de la lionne File #2 conditionnée par l’affaiblissement du joueur.
- L’incapacitation de Thanatos pour prélever le T-Blood, distincte d’une mort ; le bras droit absent de Thanatos R reste explicite.
- Les attaques larvaires du Drain Deimos 2020 séparées de la succion de sang décrite pour celui de 1999 ; les tentacules et formes de Nemesis conservent leur jeu et leur phase.
- Les variations de taille et distances vagues ne deviennent pas des dimensions anatomiques ou des valeurs de collision.

Les 99 sources de ce lot sont des fiches secondaires d’Evil Resource déjà conservées en R23. **Zéro nouvelle capture primaire, zéro recoupement primaire indépendant, zéro répertoire complet, zéro dimension corporelle certifiée.** Les citations ajoutent une preuve documentaire bornée ; les chronologies originales, correspondances aux clips, animations, sons, paramètres et transformations doivent encore être vérifiés dans les ressources originales.

Reproduction sans réseau :

```sh
python scripts/build-canonical-evidence-r26.py --check
python -m unittest discover -s tests -p 'test_canonical_evidence_r26.py' -v
node tests/browser-canonical-r26.mjs
```

Les [neuf tests Python](R26_CANONICAL_VALIDATION.json) vérifient les 110 citations, les 99 snapshots, la croissance du sous-ensemble revu, les jeux et phases, les négations, les conditions et asymétries, ainsi que les anciennes empreintes. Les [cinq groupes navigateur](R26_CANONICAL_BROWSER.json) passent aux largeurs 1 440 et 390 px, contrôlant recherche, filtres, citations, copies locales, conditions, différences original/remake et refus des index incomplets ou distants. Le texte des sources et libellés reste inerte.
