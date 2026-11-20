# Resident Evil Combat — continuation V17 du 20 novembre 2026

**V17 ajoute 12 PNG : 8 candidats statiques et 4 essais, pour 5 identités RE4 original (2005).** Le corpus archivé atteint **121 PNG, dont 85 candidats visuels et 36 essais**. Les directions multiples et les décors V5 sont inclus ; il ne s’agit pas de 121 personnages.

La reprise part du commit `1ed251b8b7c719c81a7ae16319ca3fc9b9f168d8` de la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22). Le [lot détaillé](v17/README.md), son [manifeste](v17/manifests/ASSET_MANIFEST_V17.json), le [journal des appels](GENERATION_LEDGER_V17_20261120.json) et la [validation](V17_VALIDATION_20261120.json) forment le dossier de revue.

## Couverture de cette passe

El Gigante obtient sa gauche corrigée ; sa droite R34 existante a été relue. Armadura est traité uniquement dans sa variante noir/or à plume rouge et hache. Colmillos reçoit seulement une droite, appendices dorsaux déployés. J.J. et le soldat chauve au lance-roquettes ont des vues indépendantes qui conservent le cache-œil et les prises du bon côté anatomique. Le lot contient 3 paires qualifiées à lui seul ; les revues détaillent les orientations restant de trois-quarts frontal.

Les essais de cordon, prises d’Armadura et arrière du RPG restent archivés et exclus du compte des candidats. Les corrections sont des sorties distinctes du générateur, sans retouche logicielle des PNG livrés ni miroir. Aucun refus outil nouveau n’est survenu.

## Inventaire global et décisions conservées

L’[inventaire structuré](CONTINUATION_V17_20261120.json) garde ses 346 UID. **Cinq entrées reçoivent des images ; Salvador 2005 reçoit seulement une décision de hold datée. Les 340 autres entrées sont identiques au point V16.** La baseline, les refus propres et les anciennes décisions restent conservés. La nouvelle décision Salvador indique le refus apparenté 2023 ; elle ne prétend pas à un refus outil propre à 2005.

| Statut exclusif actuel | UID |
| --- | ---: |
| `CANDIDATE_WITH_LATER_DIRECTION_REFUSAL` | 3 |
| `EXISTING_LEFT_AND_RIGHT_STATIC_VIEWS` | 25 |
| `EXISTING_NATIVE_LIBRARY_REQUIRES_REVIEW` | 41 |
| `HISTORICAL_TOOL_REFUSAL` | 44 |
| `OUT_OF_CURRENT_CREATURE_SCOPE` | 17 |
| `OWN_TOOL_REFUSAL` | 8 |
| `RELATED_REFUSAL_HOLD` | 6 |
| `RETAINED_STATIC_CANDIDATE` | 62 |
| `SOURCE_HOLD` | 139 |
| `TRIALS_ONLY_NOT_ADMITTED` | 1 |

Les [décisions de source V17](v17/docs/SOURCE_DECISIONS_V17.json) couvrent 7 UID. Hammer Ganado reste en attente d’une preuve d’édition malgré le corps entier retrouvé. Les sources complètes de l’Armadura argenté, la gauche de Colmillos et le corps équipé exact 2005 de Salvador ne sont pas établis. La source Colmillos est le même rendu R34 réévalué, pas un nouveau modèle complet récupéré.

Les attentes V16, notamment Sweeper, Moth, Bat, Eliminator blanc et Gatling gauche, restent conservées. Les 43 entrées contextuelles extérieures au roster sont toujours séparées. Les 44 PNG annoncés V12/V13 restent non récupérés et exclus des totaux.

## Intégrité, CI et limites

Chaque PNG est identique octet pour octet à sa sortie générée et possède prompt exact, SHA256, mesure d’alpha et revue indépendante. Le contrôle porte sur les archives et leur cohérence ; ce n’est pas une recette moteur. Les bitmaps de référence et modèles externes ne sont pas ajoutés.

La [CI du parent 1ed251b8](v17/docs/CI_PARENT_1ED251B.json) donne 19 workflows réussis et 6 échecs sur l’assertion `Unknown R34 addition: production-archives/rec-media/CI_CHECKPOINT2_20261120.json`. Les six logs ont été lus ; les trois parcours navigateur R34 ont réussi. Cela ne préjuge pas du résultat du futur commit V17. Les tests aval sautés ne sont pas certifiés et les gardes restent inchangées.

Toutes les images restent des candidats statiques ou des essais. Les zones cachées, détails fins, contacts et animations restent à établir ; la fidélité 1:1 et l’admission moteur ne sont pas certifiées. La PR est une archive de revue, toujours en brouillon, sans fusion. Le bilan ne déclare pas tous les personnages manquants terminés.
