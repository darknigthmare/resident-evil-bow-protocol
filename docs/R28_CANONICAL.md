# Revue documentaire du catalogue — R28

Le lot R28 ajoute **42 assertions pour les 33 identités qui restaient sans revue documentaire en R27**. Le cumul atteint ainsi 389 identités ayant au moins une assertion documentée. Cette couverture comprend des localisations et des contextes de rencontre ; elle ne certifie aucun répertoire de combat complet, aucune animation originale, taille physique ou fidélité globale 1:1.

Les assertions se répartissent en 18 comportements ou mouvements, 18 éléments de périmètre et six éléments de forme. **Quarante citations** gardent explicitement la salle, le mode et la phase de la rencontre, et **deux citations** proviennent de commentaires de forme. Les deux énoncés négatifs restent limités au passage ou à l’escalier cités ; ils ne deviennent pas une incapacité générale du personnage.

Les variantes Strong Threat et les phases humaines ou mutées conservent leur propre UID, page et déclencheur. Une information décrivant un autre acteur, une autre édition ou une autre variante n’est pas transférée au sujet sélectionné.

## Références conservées

Les 33 nouvelles réponses HTTP 200 sont conservées en gzip, avec les empreintes du fichier compressé et du HTML brut. Un instantané R23 est réutilisé. Les 34 sources capturées sont conservées ; 33 identifiants de source sont effectivement cités. La page humaine de Saddler, dont le contenu ne fournit pas l’assertion nécessaire, reste une capture sans promotion en preuve. La forme du sceptre utilise la citation attribuée du commentaire R23.

Ces références sont des sites secondaires. Les captures primaires, l’écoute des banques sonores et les comparaisons indépendantes ne sont pas produites par ce lot. Les 18 écarts de périmètre documentés restent accessibles dans le registre.

Le [lecteur R28](../modules/fidelity-r28/canonical/index.html) permet de rechercher l’UID, le jeu et les citations, de filtrer les rencontres et les négations, puis d’ouvrir la capture locale exacte. Les anciennes identités conservent leurs routes et leurs citations historiques.

## Vérification

```bash
python3 scripts/build-canonical-evidence-r28.py --check
python3 tests/test_canonical_evidence_r28.py
node tests/browser-canonical-r28.mjs
```

[R28_CANONICAL_VALIDATION.json](R28_CANONICAL_VALIDATION.json) consigne **10 tests Python réussis** ; [R28_CANONICAL_BROWSER.json](R28_CANONICAL_BROWSER.json), **sept groupes Chromium réussis**. Les tests couvrent les citations exactes, la salle et le mode obligatoires, les frontières d’édition, les variantes, les négations contextualisées, les anciens dossiers, le texte doublé à 320 et 1280 px et le refus des liens de capture distants ou altérés. Les octets téléchargés dans le lecteur correspondent à la capture locale vérifiée.
