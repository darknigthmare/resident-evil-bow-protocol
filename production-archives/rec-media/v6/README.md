# Resident Evil Combat — B.O.W. V6

19 novembre 2026 · [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22) · Branche `chore/rec-media-v5-v6-20261119`

Le lot livre **10 nouvelles poses corporelles gauches retenues comme candidats**, pour dix incarnations précises, et **2 essais remplacés conservés**. Les 12 PNG contiennent chacun une seule créature, disposent d’un canal alpha et conservent leurs octets de sortie. Deux écarts anatomiques identifiés pendant la revue ont été corrigés : l’épaule de Cerberus et le nombre d’appendices dorsaux de Chimera.

## Images retenues

| B.O.W. et PNG | Incarnation | Dimensions | Contrôle et source |
|---|---|---:|---|
| [Reaper](assets/REC_REAPER_RE5_FULLBODY_LEFT_V6_01.png) | Resident Evil 5 (2009) | 1254 × 1254 | Référence corporelle complète archivée dans R34. |
| [Regenerador](assets/REC_REGENERADOR_RE4R_FULLBODY_LEFT_V6_01.png) | Resident Evil 4 Remake (2023) | 974 × 1614 | Forme régulière ; source corporelle complète, sans épines d’Iron Maiden. |
| [Licker](assets/REC_LICKER_RE2R_FULLBODY_LEFT_V6_01.png) | Resident Evil 2 Remake (2019) | 1536 × 1024 | Vues d’un modèle communautaire ; posture basse et langue rétractée adaptées. |
| [Ivy](assets/REC_IVY_RE2R_FULLBODY_LEFT_V6_01.png) | Resident Evil 2 Remake (2019) | 1024 × 1536 | Tête fermée ; une seule créature à partir d’une référence à deux états. |
| [Verdugo](assets/REC_VERDUGO_RE4_2005_FULLBODY_LEFT_V6_01.png) | Resident Evil 4 (2005) | 1193 × 1319 | Version originale sans manteau ; queue et lame terminale entières. |
| [Popokarimu](assets/REC_POPOKARIMU_RE5_FULLBODY_LEFT_V6_01.png) | Resident Evil 5 (2009) | 1312 × 1199 | Illustration corporelle complète ; ailes repliées et abdomen tacheté. |
| [Hunter β](assets/REC_HUNTER_BETA_RE3R_FULLBODY_LEFT_V6_01.png) | Resident Evil 3 Remake (2020) | 1448 × 1086 | Modèle communautaire intact ; bras gauche anatomique plus massif conservé. |
| [Drain Deimos](assets/REC_DRAIN_DEIMOS_RE3R_FULLBODY_LEFT_V6_01.png) | Resident Evil 3 Remake (2020) | 1448 × 1086 | Modèle communautaire ; six grands membres, deux faux dorsales et petits appendices antérieurs. |
| [Cerberus](assets/REC_CERBERUS_RE1_1996_FULLBODY_LEFT_V6_02.png) | Resident Evil (1996) | 1494 × 1052 | Variante02 : lésion sur l’épaule droite anatomique éloignée ; tête asymétrique préservée. |
| [Chimera](assets/REC_CHIMERA_RE1R_2002_FULLBODY_LEFT_V6_02.png) | Resident Evil Remake (2002) | 1010 × 1557 | Variante02 : quatre appendices dorsaux fins, deux bras principaux et deux jambes. |

Les deux variantes `01` de Cerberus et Chimera sont dans `trials/`. Elles ne doivent pas être choisies à la place des variantes `02` de `assets/` : la première inversait le côté de la lésion d’épaule ; la seconde comportait un appendice dorsal de trop. Leurs prompts, empreintes et raisons de remplacement restent disponibles.

## Fidélité et usage

L’objectif est la fidélité visuelle 1:1 à l’incarnation indiquée. La revue a contrôlé les grands repères identitaires, les asymétries établies, les groupes de membres, l’orientation et les silhouettes entières. **La fidélité 1:1 n’est pas certifiée** : des profils, proportions fines, textures et surfaces cachées sont reconstruits par génération. Les sources frontales et les illustrations ne permettent pas de mesurer tous ces détails. Les modèles communautaires sont identifiés comme tels ; leurs rendus de consultation ne sont pas le rendu du moteur Capcom.

Il s’agit de poses statiques adaptées. La langue rétractée du Licker et ses appuis bas sont des choix de pose documentés, pas une animation native reproduite. Échelle de combat, pivots, contacts au sol, collisions, changement de côté et animations ne sont pas intégrés. Les marges sont mesurées dans les rapports : le cadrage conserve les extrémités, mais le minimum de 5–7 % demandé dans les prompts n’est pas atteint par toutes les images. Aucun miroir logiciel n’a été employé.

## Manquants qui restent ouverts

- **U-8, RE5 : `HELD_REFERENCE`.** Les nouveaux candidats examinés sont tronqués ; l’image primaire identifiée n’a pas pu être récupérée normalement. Aucune anatomie manquante n’a été inventée pour clôturer cette ligne.
- **Licker β, RE5 : `HELD_REFERENCE`.** Les captures examinées comportent des occlusions et les conversions communautaires trouvées ne prouvent pas une extraction RE5 complète.
- **Eliminator, RE0 :** la variante blanche reste insuffisamment documentée ; une ancienne vue gauche existe déjà. La variante brune n’est pas utilisée pour la remplacer.
- **Tyrant T-002, RE1 Remake, et autres refus historiques :** les statuts sont conservés dans l’audit, sans nouvelle tentative.

Hunter γ RE3 Remake et Novistador RE4 original ne sont pas regénérés comme prétendus nouveaux manquants : des vues correspondantes sont déjà inventoriées. Les portraits existants sont conservés. L’audit couvre les manifestes au commit `12deacf4cf9b7706eba69fecc1c13593d030180b` et l’inventaire V2 disponible. Les inventaires complets des archives V3/V4 n’étant pas récupérés, il ne certifie pas l’absence de tout doublon historique non publié.

## Traçabilité et contrôle

- [Manifeste des 12 PNG](manifests/MANIFEST_V6.json) : édition, statut, dimensions, SHA-256, alpha, références exactes et limites.
- [Inventaire CSV](manifests/INVENTAIRE_V6.csv).
- [12 prompts exécutés](prompts/GENERATION_PROMPTS_V6.json), avec liens de remplacement entre variantes.
- [Revue visuelle](docs/QA_BOW_V6.md) et [mesures détaillées](docs/QA_BOW_V6.json).
- [Audit préalable des manquants](docs/AUDIT_BOW_V6.md) et [preuves structurées](docs/BOW_GAPS_V6.json).
- [Récupération des sources](docs/REFERENCE_RECOVERY_V6.json), [relevé lisible](docs/REFERENCES_BOW_V6.md) et [métadonnées complémentaires](docs/REFERENCES_BOW_V6.json).
- [Empreintes de tous les fichiers publiés](CHECKSUMS_SHA256.txt).

Les documents de sources contiennent des chemins de travail et des URLs de provenance. Les images de référence, modèles 3D, textures et téléchargements V2 ne font pas partie du lot publié. Les seuls bitmaps du lot sont les 12 PNG générés.

Le ZIP `Resident_Evil_Combat_Generation_V6.zip` contient le dossier racine `Resident_Evil_Combat_Generation_V6/`. Les contrôles d’archive portent sur les CRC, les empreintes et l’identité des fichiers avec le dossier figé. Les modalités de conservation du ZIP sur GitHub sont décrites dans la note de publication située au-dessus de ce snapshot.

## État de la PR

La PR conserve V5 et ajoute V6 sous `production-archives/rec-media/`. Les fichiers de production existants du moteur restent inchangés. La PR est en brouillon : les workflows qui exécutent la liste fermée R34 rejettent le nouveau répertoire d’archives avec `Unknown R34 addition: production-archives/rec-media/README.md`. Cet échec a été observé dans les [logs R34](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/44555774286) du commit V5 `a539a93b862fc12738abf7f9045cea96c6da54df` ; il ne représente pas une altération des PNG. Aucun succès global CI, admission moteur, fusion ou certification canonique n’est déclaré.
