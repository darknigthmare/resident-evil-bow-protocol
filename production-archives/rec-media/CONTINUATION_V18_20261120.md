# Resident Evil Combat — continuation V18 du 20 novembre 2026

**V18 ajoute 12 PNG : 12 candidats statiques et 0 essais, pour 6 identités RE6 (2012).** Le corpus atteint **133 PNG, dont 97 candidats visuels et 36 essais**. Ce compte comprend les directions multiples et les décors V5 ; il ne représente pas 133 personnages.

La [PR #23](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/23) reprend main `8073338896937faef6f1718387c1c9b3a4be6b72`, après fusion de la PR22. Le checkpoint parent de livraison `935f44716b890303982c4cc384140cf54f4058b5` ajoute uniquement le [plan initial](v18/docs/INITIAL_WORKPLAN_V18.json), conservé tel quel. Le [plan final](v18/docs/WORKPLAN_V18.json) décrit les résultats de cette passe.

Le [lot détaillé](v18/README.md), le [manifeste](v18/manifests/ASSET_MANIFEST_V18.json), le [journal des appels](GENERATION_LEDGER_V18_20261120.json), les [décisions de source](v18/docs/SOURCE_DECISIONS_V18.json) et la [validation d’intégrité](V18_VALIDATION_20261120.json) forment le dossier de revue.

## Couverture et compte des médias

La recherche porte sur Napad, Whopper, Meset, Iluzija, Ogroman, Bloodshot et Ustanak. Les six premiers disposent de références bornées à leur forme RE6 ; les sorties et directions effectivement retenues figurent dans le manifeste. **6 paires** sont qualifiées par les revues finales. Les images opposées sont générées indépendamment, sans miroir ; les surfaces cachées restent interprétées.

| Lot | PNG | Candidats | Essais |
| --- | ---: | ---: | ---: |
| V5–V11 | 82 | 56 | 26 |
| V14 | 14 | 11 | 3 |
| V15 | 2 | 2 | 0 |
| V16 | 11 | 8 | 3 |
| V17 | 12 | 8 | 4 |
| V18 | 12 | 12 | 0 |
| **Total** | **133** | **97** | **36** |

Le journal enregistre 12 appels réels : 12 images et 0 refus sans image. Les essais ne sont pas des refus et restent archivés. Les marges, anatomies, orientations, asymétries et sources de chaque sortie sont détaillées dans sa revue.

## Inventaire global conservé

L’[inventaire](CONTINUATION_V18_20261120.json) garde **346 UID** dans le même ordre. 6 UID reçoivent des images et 6 entrées sont actualisées à partir des appels réels ; **340 entrées restent strictement identiques à V17**. Aucun UID audité seulement ne reçoit une nouvelle ligne ou un nouvel état : `review_only_updated_uids=[]`.

Ustanak reste `SOURCE_HOLD`, faute d’une vue détaillée entière d’une configuration équipée unique. Il n’a aucun appel ni nouveau refus. Sa ligne complète, ses preuves de baseline et ses historiques sont identiques à V17. Les refus réels de Zombie au Virus-C, J’avo et Deborah restent conservés ; les formes visuellement distinctes ne sont pas assimilées à ces identités par leur seul lien biologique.

| Statut exclusif actuel | UID |
| --- | ---: |
| `CANDIDATE_WITH_LATER_DIRECTION_REFUSAL` | 3 |
| `EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS` | 25 |
| `EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW` | 41 |
| `HISTORICAL_TOOL_REFUSAL` | 44 |
| `OUT_OF_CURRENT_CREATURE_SCOPE` | 17 |
| `OWN_TOOL_REFUSAL` | 8 |
| `RELATED_REFUSAL_HOLD` | 6 |
| `RETAINED_STATIC_CANDIDATE` | 68 |
| `SOURCE_HOLD` | 133 |
| `TRIALS_ONLY_NOT_ADMITTED` | 1 |

Le [bilan V17](CONTINUATION_V17_20261120.md) reste le point historique précédent, avec ses attentes documentées. Les **43 entrées contextuelles hors roster** et les **44 PNG annoncés V12/V13 non récupérés** sont inchangés et ne sont pas ajoutés aux nouveaux résultats.

## Provenance, intégrité et CI

Les PNG sont identiques octet pour octet aux sorties générées. Chaque image a un prompt exact, des mesures d’alpha, une revue indépendante et des empreintes. Les références restent des rendus/captures et documents, parfois hébergés par des tiers ; elles ne certifient ni maillage natif, ni surfaces invisibles, ni animation. Aucun bitmap source ou modèle externe n’est publié.

La [preuve CI de la base 807333](v18/docs/CI_BASELINE_V18.json) couvre **24 workflows push : 17 succès et 7 échecs**. Six échecs sont dus à la garde R34 `Unknown R34 addition: production-archives/rec-media/CI_CHECKPOINT2_20261120.json`. L’échec R23 est distinct : timeout pendant l’installation externe de ffmpeg, avant validation. Les trois jobs navigateur R34 ont réussi. Cette preuve ne décrit ni le checkpoint 935f447 ni le futur commit V18 ; les étapes aval sautées restent non validées.

La livraison ne modifie aucun moteur, test, garde ou workflow. La CI du nouveau head est à contrôler séparément lors de la publication. La validation locale de l’archive ne vaut pas une recette du jeu. La fidélité 1:1, l’animation complète et l’admission moteur restent non certifiées ; tous les personnages manquants ne sont pas déclarés terminés. La PR reste en brouillon, sans fusion dans cette livraison.
