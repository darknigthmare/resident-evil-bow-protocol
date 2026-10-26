# Classeur et suivi R28

[BOW_FIDELITE_R28.xlsx](BOW_FIDELITE_R28.xlsx) ajoute sept feuilles aux 35 feuilles du classeur R27. Les parties XML des feuilles historiques et leurs relations sont conservées octet pour octet. Les feuilles R28 couvrent la synthèse, les 17 chantiers, les 389 identités, les preuves, la recette, les évolutions et les modèles corporels.

Le [suivi central R28](../modules/fidelity-r28/index.html) expose les mêmes compteurs, permet de rechercher et filtrer les 17 chantiers, puis d’ouvrir leurs ressources et leurs critères restants. Les nouvelles galeries disposent ainsi d’une route de retour fonctionnelle vers ce suivi.

L’index R28 des [Dossiers](R28_DOSSIER.md) dérive les liens par incarnation depuis les mêmes manifestes. Ses 389 UID et son adaptateur sont enregistrés comme entrées SHA du classeur ; cet index de navigation n’ajoute aucune référence originale aux 2 114 lignes de preuves.

Le suivi distingue les **363 identités disposant d’une pose active**, les **quatre nouvelles versions corporelles**, les **22 refus conservés** et les **385 cibles initiales**. Les quatre versions ne sont pas ajoutées au compteur des identités. Les 363 images actives ont une revue visuelle ; 106 corps anatomiques entiers sont revus et 32 poses sont admissibles au seul rendu idle.

La complétude de l’anatomie reste distincte des accessoires, des différentes phases et de l’apparence complète. La file des corps conjointement non qualifiés contient 257 identités : 215 combattants et 42 rencontres, séparées des 22 refus d’outil. Les lacunes connues de Lisa Trevor et Cerberus restent visibles. Les quatre nouvelles versions sont des poses de liaison ou de présentation ; elles n’ajoutent aucun idle.

Les évolutions R28 regroupent 42 formes dans 15 familles. Parmi les 26 liens documentés, 17 sont ouverts au duel et neuf restent liés à une rencontre particulière. Les coûts et conditions de mutation sont des règles de ce mode. Les nouvelles colonnes du catalogue distinguent les cibles jouables, les phases retenues et le personnage de base.

Les 42 nouvelles assertions concernent les 33 identités qui restaient sans revue documentaire en R27. Le cumul atteint 389 identités ; 40 citations sont liées à une salle et un mode précis et deux à des commentaires de forme. Cette couverture documentaire est distincte d’une certification des répertoires de combat, des animations, des dimensions ou du 1:1.

Le lot audio ajoute 1 450 fichiers publiés : 1 105 contenus SHA distincts, dont 1 055 absents des lots R24–R27, avec 345 doublons de publication et 50 contenus déjà présents. Les 301 fichiers du groupe Licker RE3 remake et les 1 149 fichiers candidats NE-α/Nemesis sont séparés dans le catalogue ; les candidats ne deviennent pas des attributions certaines. Aucune affectation sonore de mutation ou de geste n’est ajoutée au combat.

Les critères ouverts restent écrits pour chaque chantier. Le rig, les cinématiques et les sauvegardes conservent leurs acquis historiques sans nouvelle implémentation revendiquée dans cette livraison.

Les résultats R28 sont agrégés depuis les rapports effectivement exécutés dans [R28_VALIDATION.json](R28_VALIDATION.json). Les tests R27 ne sont pas recomptés comme exécutés en R28. Le classeur ne clôture aucun des 17 chantiers et conserve une certification globale 1:1 à zéro.

## Reproduire le suivi

Après l’exécution des recettes des lots R28 et la stabilisation de leurs manifestes :

```bash
python3 tests/test_fidelity_export_r28.py
python3 scripts/build-validation-summary-r28.py
python3 scripts/build-fidelity-tracking-r28.py
python3 scripts/export-fidelity-progress-r28.py
python3 scripts/build-validation-summary-r28.py --check
python3 scripts/build-fidelity-tracking-r28.py --check
```

Le mode `--allow-pending` du premier constructeur conserve explicitement les rapports manquants ou en échec dans une version provisoire. Le constructeur normal refuse de déclarer la recette terminée tant qu’un rapport requis manque ou qu’une preuve exécutée a changé.

L’export vérifie les SHA des entrées, les 389 UID, les 17 chantiers, les octets des PNG et les états de pose. Un refus ne peut pas devenir une image ou un état de combat. Les cellules nouvelles susceptibles d’être interprétées comme des formules sont conservées comme texte. L’export refuse d’écraser les entrées historiques ou le classeur d’un autre auteur.

Le reçu [R28_EXPORT.json](R28_EXPORT.json) contient les empreintes exactes du classeur produit, du classeur historique, du suivi structuré et de `modules/fidelity-r28/progress.json`. Deux exports identiques produisent les mêmes octets.
