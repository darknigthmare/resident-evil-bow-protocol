# QA finale V11

Deux vues droites sont retenues comme candidats statiques limités : Lucas muté01 et Uroboros Mkono03. Deux essais Mkono sont conservés. Les huit appels ont produit quatre PNG et quatre refus, tous consignés ; aucune demande n’a suivi un refus pour la même identité.

## Résultats visuels

### re7-lucas-baker-mutated — REC_LUCAS_MUTATED_RE7_FULLBODY_RIGHT_V11_01.png

Statut : `CANDIDATE_RIGHT_THREE_QUARTER_WITH_LIMITS`. Revue : root, bible_docx_v5.

- Têtes, bassin et deux pieds se dirigent vers la droite ; le thorax reste largement ouvert vers la caméra. La vue est un trois-quarts limité, pas un profil strict.
- Le grand bras-lame pâle droit anatomique se lit au premier plan ; le bras gauche sombre portant la bouche se lit plus loin. Deuxième regard indépendant répété après correction de la règle de latéralité.
- Silhouette entière, avec seulement8px en haut et10px en bas à alpha>=16. Ces marges ne satisfont pas la demande de cadrage généreux.
- Ce PNG et sa revue précèdent le refus de la demande gauche01. La gauche reste manquante ; aucun nouvel appel Lucas ne suit ce refus.

### re5-uroboros-mkono — REC_UROBOROS_MKONO_RE5_FULLBODY_RIGHT_V11_03.png

Statut : `CANDIDATE_RIGHT_ASYMMETRY_CORRECTED_WITH_LIMITS`. Revue : root, audit_depot.

- Tête, tronc et appuis lisent vers la droite ; les deux mains et deux pieds sont entiers.
- Le bras anatomique droit, plus fin et sans amas orange, est proche ; le bras gauche portant les excroissances orange reste éloigné, derrière la tête et l’épaule. Ce rapport est cohérent avec la référence frontale.
- Les surfaces latérales, enchevêtrements et détails cachés sont reconstruits. La correspondance géométrique native et la fidélité1:1 ne sont pas certifiées.
- Ce PNG et sa revue précèdent le refus de la demande gauche01. Aucun nouvel appel Mkono ne suit ce refus.

### re5-uroboros-mkono — REC_UROBOROS_MKONO_RE5_FULLBODY_RIGHT_V11_01.png

Statut : `TRIAL_ORIENTATION_NOT_RIGHT`. Revue : root.

- Silhouette entière, mais présentation encore frontale/oblique gauche ; la direction droite demandée n’est pas démontrée. Remplacé par03 après deux corrections documentées.

### re5-uroboros-mkono — REC_UROBOROS_MKONO_RE5_FULLBODY_RIGHT_V11_02.png

Statut : `TRIAL_ANATOMICAL_LATERALITY_INVERTED`. Revue : root.

- La vue pointe vers la droite mais place le bras à excroissances orange au premier plan. Ce résultat ressemble à une inversion de latéralité ; il n’est pas retenu. La consigne erronée de flanc proche est corrigée dans03, sans modifier le prompt exécuté02.

## Erreur de consigne et correction

Les premières consignes droites demandaient à tort le flanc anatomique gauche proche. Pour la direction droite, le flanc droit doit être proche et le gauche éloigné. Les prompts exécutés sont préservés tels quels. Mkono02 conserve l’erreur et reste un essai ;03 corrige le rapport des deux bras. Lucas01 a été réexaminé suivant la règle correcte : son image reste compatible avec le bras-lame droit proche et le bras-bouche gauche éloigné, malgré le texte initial contradictoire. Cette lecture ne certifie pas la géométrie cachée.

## Transparence et conservation

Les quatre PNG sont RGBA, avec alpha de0 à255. Aucun pixel de silhouette alpha>=16 n’atteint les bords du canevas. Cela n’implique pas que les marges demandées ont toutes été respectées : Lucas ne garde que8px en haut et10px en bas. Les dimensions, marges, SHA et comparaisons binaires aux originaux sont dans [TECHNICAL_QA_V11.json](TECHNICAL_QA_V11.json). Aucun miroir logiciel, détourage, redimensionnement, recoloration ou autre retouche de pixels n’a été appliqué.

## Demandes sans PNG

Duvalia droite01 et Soldat Panzer droite01 ont été refusés. Les demandes gauches Lucas01 et Mkono01 ont été refusées après création et revue de leurs candidats droits. Les deux gauches restent manquantes. Queen Leech RE0 reste tenue faute de preuve de latéralité ; Uriaș reste exclu de cette continuation en raison du refus historique de la variante apparentée Uriaș Drac, sans attribuer un nouveau refus à Uriaș.

Les sources originales restent exclues de la livraison. Ces poses sont des reconstructions génératives documentées, sans certification1:1, sans animation et sans admission moteur.
