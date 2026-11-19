# Audit des manquants B.O.W. pour le lot V6

Date : 19 novembre 2026. Audit en lecture seule du dépôt `darknigthmare/resident-evil-bow-protocol`, à la révision `12deacf4cf9b7706eba69fecc1c13593d030180b`.

## Résultat utilisable

**Six poses gauches constituent les priorités les mieux documentées du périmètre examiné.** Chaque cible possède une pose droite R34 générée et admise, un corps entier précédemment revu et une référence complète conservée au dépôt. Le manque porte sur une pose gauche indépendante dans les manifestes examinés. Les portraits existent déjà ; ils ne sont pas à régénérer pour combler cette lacune.

Les images ne sont pas encore produites par cet audit. Une vue entière unique ne certifie pas les surfaces cachées du côté opposé. Toute nouvelle pose garde le statut de candidat jusqu’à inspection des références, des asymétries et du résultat.

| Priorité | Identifiant exact | Incarnation | Sortie à compléter |
|---|---|---|---|
| 1 | `re5-reaper` | Resident Evil 5 (2009) | Pose entière gauche indépendante |
| 2 | `re4r-regenerador` | Resident Evil 4 remake (2023) | Pose entière gauche indépendante |
| 3 | `re4-verdugo` | Resident Evil 4 (2005) | Pose entière gauche indépendante |
| 4 | `re1-cerberus` | Resident Evil (1996) | Pose entière gauche indépendante |
| 5 | `re1r-chimera` | Resident Evil remake (2002) | Pose entière gauche indépendante |
| 6 | `re5-popokarimu` | Resident Evil 5 (2009) | Pose entière gauche indépendante |

## Sources de production disponibles

Les liens suivants pointent vers les références conservées au commit contrôlé. Le JSON associé contient leurs tailles, SHA-256, sources de publication, chemins des droites existantes et reçus de production. Les sources sont des références d’apparence provenant de publications secondaires ; aucun statut d’asset original Capcom ou de modèle natif certifié n’est attribué par cet audit.

### 1. Reaper — Resident Evil 5 (2009)

Identifiant : `re5-reaper`. Pose droite : [PNG existant](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/generated/re5-reaper/idle-right.png). Preuve de revue : [reçu R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_2/re5-reaper/idle.json).

Référence de corps entier : [re5-reaper-candidate-1.png](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_2/source-research/re5-reaper-candidate-1.png).

Conserver quatre membres supérieurs en faux, deux pattes porteuses, les antennes et l’abdomen segmenté. Le repli antérieur est orienté de face ; il n’établit pas une seconde pose gauche indépendante.

### 2. Regenerador — Resident Evil 4 remake (2023)

Identifiant : `re4r-regenerador`. Pose droite : [PNG existant](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/generated/re4r-regenerador/idle-right.png). Preuve de revue : [reçu R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/re4r-regenerador/idle.json).

Référence de corps entier : [re4r-regenerador-candidate-1.jpg](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_4/research/re4r-regenerador-candidate-1.jpg).

Variante régulière de 2023 : corps arrondi gris pâle, longs bras et extrémités complètes ; ne pas ajouter les épines d’Iron Maiden. Le repli antérieur est orienté de face ; il n’établit pas une seconde pose gauche indépendante.

### 3. Verdugo — Resident Evil 4 (2005)

Identifiant : `re4-verdugo`. Pose droite : [PNG existant](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/generated/re4-verdugo/idle-right.png). Preuve de revue : [reçu R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_2/re4-verdugo/idle.json).

Référence de corps entier : [re4-verdugo.webp](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/specimens/re4-verdugo.webp).

Version 2005 : armure sombre, yeux orangés, mains griffues, deux pieds et totalité de la queue segmentée terminée en lame. Le repli antérieur est orienté de face ; il n’établit pas une seconde pose gauche indépendante.

### 4. Cerberus — Resident Evil (1996)

Identifiant : `re1-cerberus`. Pose droite : [PNG existant](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/generated/re1-cerberus/idle-right.png). Preuve de revue : [reçu R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_3/re1-cerberus/idle.json).

Référence de corps entier : [re1-cerberus.webp](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/specimens/re1-cerberus.webp).

Doberman de 1996 : pelage noir et feu, oreilles et lésions asymétriques, queue courte, quatre appuis ; ne pas remplacer par le modèle du remake. Le repli antérieur est orienté vers la droite ; il n’établit pas une seconde pose gauche indépendante.

### 5. Chimera — Resident Evil remake (2002)

Identifiant : `re1r-chimera`. Pose droite : [PNG existant](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/generated/re1r-chimera/idle-right.png). Preuve de revue : [reçu R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_2/re1r-chimera/idle.json).

Référence de corps entier : [re1r-chimera.png](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/specimens/re1r-chimera.png).

Version remake 2002 : hybride insecte et humain sombre, thorax nervuré, crochet, appendices articulés et deux membres inférieurs complets. Le repli antérieur est orienté vers la droite ; il n’établit pas une seconde pose gauche indépendante.

### 6. Popokarimu — Resident Evil 5 (2009)

Identifiant : `re5-popokarimu`. Pose droite : [PNG existant](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/generated/re5-popokarimu/idle-right.png). Preuve de revue : [reçu R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/lots/lot_1/re5-popokarimu/idle.json).

Référence de corps entier : [re5-popokarimu-candidate-1.png](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/source-research/re5-popokarimu-candidate-1.png).

Version 2009 : corps bas, ailes repliées et griffes terminales, abdomen relevé et appendices terminaux ; référence illustrée, géométrie native non certifiée. Le repli antérieur est orienté de face ; il n’établit pas une seconde pose gauche indépendante.


## Contrôle des doublons et limites

Le contrôle a croisé le suivi et le manifeste R34, ses reçus individuels, le manifeste de sélection, les poses R27, les rendus natifs R30 « new-sources » et « other-games », la bibliothèque native R33 et `data/directional-art.json`. Les six cibles ne possèdent pas d’entrée de corps dans les trois bibliothèques natives contrôlées ni de vue déclarée dans le manifeste directionnel. Leurs poses droites et leurs anciens replis restent conservés.

Le lot V2 accessible contient 212 membres ZIP, 49 entrées de nouveaux assets et 24 fiches de combattants. La lecture des noms de fichiers, des entrées du manifeste et des demandes non produites ne trouve aucune des six créatures prioritaires ni Licker. Ce contrôle s’appuie sur le ZIP et les fichiers extraits, pas seulement sur le contenu de `main`.

**L’absence de doublon dans V3 et V4 n’est pas démontrée.** Leurs inventaires complets ne sont pas disponibles sur cette machine. La branche `chore/rec-media-v3-v4-backup-20261119`, tête `85e8daf871ed71291a961bde3acc0ed3011ced80`, ne contient que le checkpoint de récupération et un portrait d’Alcina. Son caractère partiel est explicite dans [RECOVERY.md](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/85e8daf871ed71291a961bde3acc0ed3011ced80/production-archives/rec-media/RECOVERY.md). Aucun doublon historique globalement exclu à 100 % n’est annoncé. L’observation « aucune PR ouverte » décrit uniquement le relevé du 19 novembre 2026, effectué avant la génération et la publication éventuelle du lot V6 ; elle ne décrit pas l’état du dépôt après ces opérations.

## Septième cible conditionnelle : Licker RE2 remake

`re2r-licker`, Resident Evil 2 remake (2019), conserve déjà une pose droite de 1536 × 1024 : [ancien PNG](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/assets/sprites/bow/re2r-licker/idle-right.png). Le dossier contrôlé ne contient que cette image et son manifeste ; aucune gauche n’y figure.

Le reçu R34 reste `HELD_REFERENCE`, car les sources alors disponibles coupaient les extrémités. L’équipe de recherche a identifié et téléchargé le modèle communautaire DAE/FBX de [Models Resource, asset 326332](https://models.spriters-resource.com/playstation_4/residentevil2remake/asset/326332/). Une nouvelle vue gauche peut être étudiée à partir d’un rendu complet de ce modèle, après contrôle de son incarnation et de son anatomie. Le téléchargement et le rendu sont documentés par la tâche de références ; ils ne transforment pas automatiquement cette source communautaire en asset officiel certifié.

## Corps encore retenus faute de référence complète

| Identifiant | Jeu / édition | Motif exact du manque de qualification |
|---|---|---|
| `re3r-hunter-beta` | RE3 remake, 2020 | Les anciennes références montrent surtout tête, poitrine et épaules ; membres latéraux et bas du corps coupés. |
| `re2r-ivy` | RE2 remake, 2019 | Membres racinaires, mains et extrémités inférieures incomplets ; l’Ivy fleuri de 1998 est une autre forme. |
| `re3r-drain-deimos` | RE3 remake, 2020 | Un grand appendice latéral quitte le cadre. |
| `re5-u-8` | RE5, 2009 | Abdomen, grandes pattes et pointes latérales non intégralement documentés. |
| `re5-licker-beta` | RE5, 2009 | Arrière du corps et terminaisons des membres coupés. |

Ces cinq identités ont déjà des portraits admis et des replis graphiques historiques. Elles n’ont pas de nouvelle pose entière R34 admise. Les recopier depuis un portrait, les compléter avec une autre édition ou considérer une URL contenant « full » comme preuve de corps entier ne lèverait pas le blocage. Les reçus avaient déjà testé plusieurs URL d’images complètes d’Evil Resource, avec les mêmes limites de cadrage.

## Cibles écartées de cette priorité

- **Hunter Gamma RE3 remake** : droite R34, ancien rendu gauche R27 et quatre vues natives R30 déjà présents. Il ne constitue pas un manque gauche évident.
- **Novistador RE4 de 2005** : droite R34 et ancien rendu gauche R27 déjà présents.
- **Eliminator RE0** : la variante blanche reste retenue ; un corps entier brun ne prouve pas la coloration inférieure de la variante blanche. Un ancien rendu gauche existe par ailleurs.
- **Tyrant RE1 remake** : refus historique explicite conservé. Aucun nouvel essai ni changement de cadrage pour le relancer.
- Les refus antérieurs de Krauser, Sheva, Chris, Moira, Carlos et Wesker restent hors de cette production.

## Conditions de passage en production

Vérifier visuellement le fichier de référence complet avant de le joindre à la génération. Fixer l’édition, la forme, le côté anatomique des asymétries, les proportions et les appuis. Produire un seul sujet entier par image, avec des marges réelles et un alpha contrôlé ; préserver les membres et accessoires jusqu’à leurs extrémités. Une pose gauche indépendante ne doit pas être remplacée par un miroir logiciel d’un corps asymétrique.

Conserver prompt, références, empreintes, PNG brut et verdict. Ne pas modifier les anciens reçus pour présenter une lacune comme soldée. L’admission finale demande une vérification du rendu réel ; une pose fixe n’est ni une animation complète ni une certification 1:1.

## Sources du dépôt

- [Suivi R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/docs/R34_TRACKING.json)
- [Manifeste des assets R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/manifest.json)
- [Demandes et références R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/assets/jobs.json)
- [Sélection R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r34/selection/manifest.json)
- [Poses R27](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r27/sprites/manifest.json)
- [Rendus natifs R30, nouvelles sources](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r30/native/new-sources/renders.json)
- [Rendus natifs R30, autres jeux](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r30/native/other-games/renders.json)
- [Bibliothèque native R33](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/modules/fidelity-r33/native/manifest.json)
- [Vues directionnelles](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/data/directional-art.json)

Le fichier `BOW_GAPS_V6.json` fournit les preuves structurées et préserve également les 81 sorties R34 bloquées, historiques ou liées à un refus, sans les remettre en production.

