# QA de production V9 — état final

Revue progressive close le 2026-11-19T17:22:14.947810+00:00. La [QA indépendante figée](QA_INDEPENDENT_V9.md) est l’autorité finale pour les décisions.

**13 PNG:9 candidats avec limites et 4 essais.14 appels de génération, dont 1 refus sans PNG.** Aucun pixel n’a été retouché.

| Fichier | Statut final | Dimensions | MargesL/H/D/B à alpha≥16 |
|---|---|---:|---|
| [REC_ADDER_RE1R_2002_FULLBODY_LEFT_V9_01.png](../assets/REC_ADDER_RE1R_2002_FULLBODY_LEFT_V9_01.png) | CANDIDATE_WITH_LIMITS | 1983×793 | 72 / 224 / 68 / 246px |
| [REC_CRIMSON_HEAD_RE1R_2002_FULLBODY_LEFT_V9_01.png](../assets/REC_CRIMSON_HEAD_RE1R_2002_FULLBODY_LEFT_V9_01.png) | CANDIDATE_WITH_LIMITS | 1085×1450 | 190 / 63 / 155 / 64px |
| [REC_WASP_RE1R_2002_FULLBODY_LEFT_V9_01.png](../assets/REC_WASP_RE1R_2002_FULLBODY_LEFT_V9_01.png) | CANDIDATE_WITH_LIMITS | 1402×1122 | 95 / 61 / 94 / 100px |
| [REC_G_FOURTH_FORM_RE2R_2019_FULLBODY_LEFT_V9_01.png](../trials/REC_G_FOURTH_FORM_RE2R_2019_FULLBODY_LEFT_V9_01.png) | TRIAL_REJECTED_LEFT_ORIENTATION | 1478×1064 | 55 / 20 / 102 / 22px |
| [REC_EL_GIGANTE_RE4R_2023_FULLBODY_LEFT_V9_01.png](../assets/REC_EL_GIGANTE_RE4R_2023_FULLBODY_LEFT_V9_01.png) | CANDIDATE_WITH_LIMITS | 1199×1312 | 39 / 21 / 104 / 36px |
| [REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_01.png](../trials/REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_01.png) | TRIAL_REJECTED_APPENDAGE_LATERALITY | 1130×1392 | 83 / 35 / 153 / 26px |
| [REC_G_EMBRYO_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png](../assets/REC_G_EMBRYO_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | CANDIDATE_WITH_LIMITS | 1536×1024 | 88 / 156 / 78 / 161px |
| [REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png](../trials/REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | TRIAL_REJECTED_UNRESOLVED_LEG_TOPOLOGY | 1402×1122 | 179 / 62 / 113 / 90px |
| [REC_SMALL_LEECH_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png](../assets/REC_SMALL_LEECH_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | CANDIDATE_WITH_LIMITS | 1774×887 | 273 / 262 / 183 / 213px |
| [REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_02.png](../assets/REC_NOSFERATU_CODE_VERONICA_2000_FULLBODY_LEFT_V9_02.png) | CANDIDATE_WITH_LIMITS | 1130×1392 | 80 / 32 / 148 / 27px |
| [REC_THANATOS_R_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png](../assets/REC_THANATOS_R_OUTBREAK_2003_FULLBODY_LEFT_V9_01.png) | CANDIDATE_WITH_LIMITS | 1133×1388 | 131 / 37 / 87 / 44px |
| [REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_02.png](../trials/REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_02.png) | TRIAL_REJECTED_SEVEN_LEGS | 1402×1122 | 177 / 58 / 108 / 90px |
| [REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_03.png](../assets/REC_GIANT_WASP_OUTBREAK_2003_FULLBODY_LEFT_V9_03.png) | CANDIDATE_WITH_LIMITS | 1402×1122 | 176 / 55 / 109 / 88px |

## Corrections et décisions

- Nosferatu01: appendice majeur du mauvais côté anatomique.02 corrige l’attache droite éloignée et est retenu.
- G quatrième forme01: torse/bassin trop frontaux pour une gauche admissible. Correction02 refusée au stade output(violence); aucun PNG02 et aucune nouvelle tentative.
- Giant Wasp01: sixième patte non traçable;02: sept pattes.03 retire uniquement la chaîne surnuméraire centrale et conserve six pattes lisibles.03 retenu,01/02 en essais.
- Thanatos-R01: la capture communautaire qualifiée lève seulement l’occultation du bas de jambe/pied; corps complet retenu, sans preuve géométrique native1:1.

## Transparence et limites

Alpha réel0–255 pour12PNG et0–254 pour GEmbryo. Aucun pixel alpha≥16 au bord ni à12px du noyau alpha128. Des RGB colorés presque transparents restent possibles, et le corps est souvent légèrement inférieur à255. Les marges uniformes demandées ne sont pas toutes atteintes; les extrémités sont néanmoins contenues. Aucun import moteur, pivot, animation ou résolution standard n’est qualifié.

Les observations par fichier, références/SHA et métriques sont dans [QA_INITIAL_V9.json](QA_INITIAL_V9.json) et [TECHNICAL_QA_V9.json](TECHNICAL_QA_V9.json).
