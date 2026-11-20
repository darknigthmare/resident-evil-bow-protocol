# V14 — Reprise du 20 novembre 2026, checkpoint 3

Le lot conserve **14 PNG : 11 candidats statiques revus et 3 essais**, avec un personnage par image et une transparence réelle. Ils couvrent **5 identifiants de catalogue**. Les deux Bella Sisters partagent un identifiant mais conservent deux variantes de costume distinctes.

Les candidats comprennent **6 vues gauches et 5 vues droites**, soit **5 paires gauche/droite complètes** et Yawn gauche. Un refus de génération de Yawn droite n'a produit aucune image et n'entre dans aucun compteur PNG.

La reprise continue dans la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22), après le checkpoint 2 publié au commit `0ecb6d595c67fbca6783dab309a32f8947516faa`. Elle conserve les neuf entrées précédentes et ajoute cinq PNG ; les trois essais ont un lien `superseded_by` vers leur correction retenue. Les trois premières entrées du checkpoint 1 restent intactes.

Sur l'ensemble de cette reprise, **8 PNG V14 ont été nouvellement générés et 1 demande a été refusée sans image**. Les six autres PNG existaient déjà ; parmi eux, les deux Bella initiales et le Leader Zealot droit ont été récupérés et revus sans être régénérés.

## Candidats de poses fixes

| Identité / variante | Édition | Vue gauche retenue | Vue droite retenue |
| --- | --- | --- | --- |
| Leader Zealot — robe rouge | Resident Evil 4 (2005) | [Gauche 01](assets/REC_LEADER_ZEALOT_RE4_2005_FULLBODY_LEFT_V14_01.png) | [Droite 01](assets/REC_LEADER_ZEALOT_RE4_2005_FULLBODY_RIGHT_V14_01.png) |
| Castle Ganado — moine chauve à faux | Resident Evil 4 (2005) | [Gauche 01](assets/REC_CASTLE_GANADO_RE4_2005_FULLBODY_LEFT_V14_01.png) | [Droite 01](assets/REC_CASTLE_GANADO_RE4_2005_FULLBODY_RIGHT_V14_01.png) |
| Jill Valentine — Battle Suit avec P30 | Resident Evil 5 (2009) | [Gauche 01](assets/REC_JILL_VALENTINE_RE5_BATTLESUIT_FULLBODY_LEFT_V14_01.png) | [Droite 01](assets/REC_JILL_VALENTINE_RE5_BATTLESUIT_FULLBODY_RIGHT_V14_01.png) |
| Bella Sister — tablier crème | Resident Evil 4 (2005) | [Gauche 02](assets/REC_BELLA_SISTER_CREAM_APRON_RE4_2005_FULLBODY_LEFT_V14_02.png) | [Droite 01](assets/REC_BELLA_SISTER_CREAM_APRON_RE4_2005_FULLBODY_RIGHT_V14_01.png) |
| Bella Sister — jupe verte | Resident Evil 4 (2005) | [Gauche 03](assets/REC_BELLA_SISTER_GREEN_SKIRT_RE4_2005_FULLBODY_LEFT_V14_03.png) | [Droite 01](assets/REC_BELLA_SISTER_GREEN_SKIRT_RE4_2005_FULLBODY_RIGHT_V14_01.png) |
| Yawn | Resident Evil remake (2002) | [Gauche 01](assets/REC_YAWN_REMAKE_2002_FULLBODY_LEFT_V14_01.png) | [Refus outil, aucune image](docs/yawn-right-refusal.json) |

Ces paires sont deux poses fixes générées et revues. Elles ne constituent ni cycle animé, ni import moteur. Les poses trois quarts, les petites marges et les limites de référence restent explicites dans les revues. Jill gauche conserve notamment un buste presque frontal.

## Essais conservés et corrections

| Essai | Fichier et revue | Correction retenue |
| --- | --- | --- |
| Bella Sister — tablier crème — gauche 01 | [PNG essai](assets/REC_BELLA_SISTER_CREAM_APRON_RE4_2005_FULLBODY_LEFT_V14_01.png) · [Revue](docs/bella-cream-left-review.json) | [Gauche 02](assets/REC_BELLA_SISTER_CREAM_APRON_RE4_2005_FULLBODY_LEFT_V14_02.png) |
| Bella Sister — jupe verte — gauche 01 | [PNG essai](assets/REC_BELLA_SISTER_GREEN_SKIRT_RE4_2005_FULLBODY_LEFT_V14_01.png) · [Revue](docs/bella-green-left-review.json) | [Gauche 03](assets/REC_BELLA_SISTER_GREEN_SKIRT_RE4_2005_FULLBODY_LEFT_V14_03.png) |
| Bella Sister — jupe verte — gauche 02 | [PNG essai](assets/REC_BELLA_SISTER_GREEN_SKIRT_RE4_2005_FULLBODY_LEFT_V14_02.png) · [Revue](docs/bella-green-left-02-review.json) | [Gauche 03](assets/REC_BELLA_SISTER_GREEN_SKIRT_RE4_2005_FULLBODY_LEFT_V14_03.png) |

Les trois essais inversaient la prise de tronçonneuse : main droite anatomique sur la poignée avant, main gauche sur la poignée arrière. La correction crème gauche 02, puis verte gauche 03, replace la **main gauche sur la poignée avant et la main droite sur la poignée arrière**, en faisant tourner le corps. Les vues droites retiennent cette même propriété anatomique. Les costumes restent séparés.

Les essais gardent leurs PNG d'origine, leurs revues et le statut `TRIAL_NEEDS_GRIP_CORRECTION`, avec `excluded_from_candidate_count: true`. Leur remplacement est une nouvelle image distincte ; les originaux ne sont ni effacés ni retouchés.

## Yawn droite : refus conservé

Le [reçu de refus](docs/yawn-right-refusal.json) documente une demande de vue droite arrêtée par l'outil de génération à l'étape de sortie (`moderation_blocked`), avec **zéro image retournée**. Le prompt et l'identifiant de requête sont conservés. Aucun nouvel appel Yawn n'a suivi ce refus. Le candidat gauche antérieur reste intact ; la vue droite reste ouverte et bloquée par ce refus.

## Preuves et limites

Le [manifeste V14](manifests/ASSET_MANIFEST_V14.json) contient les SHA256, dimensions, mesures alpha, statuts, prompts et revues des 14 PNG, ainsi que les paires retenues, liens de remplacement et le refus sans image. Les empreintes des 14 PNG et tous les chemins de leurs prompts et revues ont été contrôlés. Les valeurs des neuf entrées du checkpoint 2 sont conservées ; seuls les liens de correction ont été ajoutés aux deux essais déjà présents.

Chaque revue visuelle utilise un véritable compositing alpha sur fond gris et clair. Les RGB cachés sous un alpha nul ne sont pas confondus avec un fond opaque. Les silhouettes et armes complètes sont visibles, mais les marges souhaitées ne sont pas atteintes partout et des résidus alpha faibles persistent. Les PNG sont conservés octet pour octet, sans miroir logiciel, recadrage ou nettoyage alpha.

Sources documentées : [moines](docs/ZEALOT_SOURCES_V14.json), [Yawn et références encore ouvertes](docs/REFERENCE_REVIEW_V14.json), [Jill et Bella Sisters](docs/SOURCE_RECOVERY_JILL_BELLA_V14.json). Les bitmaps documentaires ne sont pas ajoutés au lot.

Les **44 PNG historiquement annoncés pour V12/V13 restent non récupérés**. Les fichiers V14 ne sont pas présentés comme ces originaux retrouvés. Les lots V5–V11 sont conservés. La nouvelle paire Hunter Gamma de l'édition Outbreak est suivie séparément dans [V15](../v15/README.md).

La fidélité globale 1:1, les surfaces cachées, l'exactitude des visages, textures et mécanismes d'armes ne sont pas certifiées. Aucun pivot, contact, collision, cycle animé ou admission moteur n'est validé par ce lot. Les indicateurs correspondants restent faux.

La CI R34 précédemment observée sur `dc9e217` rejetait les ajouts `production-archives`. Ce constat historique n'est pas un résultat de test sur le nouveau checkpoint. Les gardes et assertions restent inchangées ; aucune recette de gameplay n'est revendiquée pour cette publication de médias.
