# V25 — Claire Military et Billy Wolf Force : six clés de sélection

Ce sous-lot fournit **six PNG natifs distincts** : sélection, confirmation et désélection pour **Claire Redfield — Resident Evil 2 Remake (2019), Claire Costume: Military DLC**, et **Billy Coen — Resident Evil Zero HD Remaster (2016), Costume Pack 1, Wolf Force**. Les bases complètes V22 et les quatre références natives ont été inspectées avant génération. Les quatre références récupérées correspondent octet pour octet à leurs SHA256 V22. Aucun refus historique n’a été retenté.

Les poses sont des adaptations de menu du projet. Le costume Wolf Force reste distinct de Prisoner, couvert par V23. Ces fichiers ne ferment aucune animation complète ni admission moteur et ne sont pas certifiés 1:1.

## Gestes et limites observées

Claire garde le tatouage et le holster à droite anatomique, la montre et la gourde à gauche. Sa confirmation ramène la main gauche près de la clavicule. La désélection initiale conserve **un regard vers la droite de l’image malgré la gauche demandée** ; son changement d’appui est faible. L’écart reste ouvert et ce PNG original est conservé.

Billy garde la visière sur l’œil droit, les cinq principaux cylindres sur l’épaule droite, les deux grandes poches/cylindres à droite de la ceinture et la petite poche à gauche. La lèvre supérieure du support n’est pas comptée comme un sixième cylindre. La confirmation touche l’oreillette gauche avec la main gauche ; la désélection tourne la tête vers la gauche de l’image. Les mains restent vides, comme dans les deux bases V22. Les armes des captures natives ne sont pas ajoutées.

## Mesures des sorties

Les six fichiers sont en **1024 × 1536, RGBA, alpha [0,254]**. Ils totalisent **9 715 553 octets**. Les marges ci-dessous sont mesurées autour du contenu à alpha ≥128, avec les bornes droite/basse exclusives de Pillow. Elles ne sont pas une mesure de bord totalement exempt de pixels translucides.

| Clé | Ligne basse du contenu | Marge haute / basse | Qualification |
|---|---:|---:|---|
| Claire Redfield — selected | 1413 | 8.40 % / 8.01 % | Clé candidate |
| Billy Coen — selected | 1447 | 9.77 % / 5.79 % | Clé candidate |
| Claire Redfield — confirm | 1414 | 8.40 % / 7.94 % | Clé candidate |
| Claire Redfield — deselect | 1414 | 8.07 % / 7.94 % | Écart de regard ouvert |
| Billy Coen — confirm | 1447 | 9.51 % / 5.79 % | Clé candidate |
| Billy Coen — deselect | 1448 | 9.70 % / 5.73 % | Clé candidate |

La ligne des bottes varie de **1 px dans chaque trio** ; la hauteur de silhouette varie de 6 px pour Claire et de 4 px pour Billy. Le cadrage reste trop serré verticalement : **aucun des six PNG n’atteint 10 % sur les quatre côtés**, et la cible initiale de 12 % n’est donc pas remplie. Les quatre dernières clés conservent le cadrage des deux sélections pour limiter la dérive entre états. Des traces d’alpha 1–15 subsistent hors de la silhouette principale, parfois jusqu’au bord. Franges, appuis, pivots et prémultiplication restent à valider dans le rendu du menu.

Visages, insignes, motif de camouflage, mains, poches et petits accessoires restent réinterprétés. Les bases candidates ne sont pas assimilées à des pixels natifs de Capcom. Le microphone hérité de Billy n’est pas recertifié par une vue native rapprochée complète.

## Fichiers de suivi

- `manifest.json` : les six états, éditions, costumes, empreintes, limites et statuts.
- `inputs.json` : les deux bases générées V22 et les quatre sources natives, avec rôles, chemins scratch, URLs, dimensions et SHA256.
- `prompts.json` : les six consignes exactes et les entrées effectives de chaque appel.
- `generation_outputs.json` : chemins natifs du générateur ; aucun réencodage ni transformation de pixels.
- `measurements.json` : dimensions, transparence, bornes aux seuils 1/16/128, marges et lignes de base.
- `QA_AUTHOR_V25.json` : inspection de l’auteur, explicitement non indépendante.
- `GIT_BLOBS_V25.json` : reçus des six blobs créés depuis les données PNG originales, SHA distant vérifié égal au SHA Git local.

Les octets ont été copiés depuis les sorties natives. Six appels ont produit six PNG, sans refus et sans reprise. Une éventuelle correction séparée de Claire pourra remplacer l’usage de la désélection initiale lors de la consolidation, tout en préservant cet original. Aucune correction externe n’est déclarée produite dans ce sous-lot.

Le travail de cet agent reste hors dépôt dans le dossier scratch dédié : aucun fichier V24, moteur, garde, index, arbre, commit ou ref n’a été modifié. La publication commune est confiée à l’agent parent.
