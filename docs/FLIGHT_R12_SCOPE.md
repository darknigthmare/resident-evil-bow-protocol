# R12 — Flying Bug : mouvements effectifs et mesure de trajectoire

Base de la même PR nº 12 : `355d545e08327d3cea0af20d3c0248de0e3364a5` (R11). Les changements de Lucas sont conservés. Aucun nouveau dessin final, attaque canonique, invincibilité, soin ou invocation dans cette passe.

## Corrections

L’utilitaire Vol erratique dépensait 16 unités pour poser un buff focus sans effet de vol. La définition d’origine est réexécutée dans les tests avant/après : aucun déplacement, aucune élévation. Le nouveau mouvement utilise la gravité et les collisions existantes : départ 8 ticks, actif 12, récupération 20, coût 16, délai de réutilisation 90. Envol haut et retrait limité, corps toujours vulnérable.

Écart aérien ajoutait une téléportation instantanée de 120 unités à son recul. L’instantané est retiré. Départ 4 ticks, actif 17, récupération 19, coût 14 et délai 60. Retrait continu, interrompable, soumis aux coins et à l’atterrissage. Aucun redéclenchement en plein air ; les coûts déjà engagés ne sont pas remboursés par une interruption.

Mesures hors coins et sans adversaire perturbant la trajectoire : envol 60 unités de retrait et 71,4 d’altitude maximale ; recul 102 unités et 40,48 d’altitude. Symétrie gauche/droite ; pas maximums respectifs de 5 et 6 unités. Ce sont les unités du prototype, pas des centimètres ou des images extraites des jeux Capcom.

## Laboratoires

Les deux laboratoires affichent déplacement signé, altitude, altitude maximale relevée à chaque tick et état sol/air. Cette observation ne modifie aucune donnée de combat ou progression. Pause, avance de plusieurs ticks et remise à zéro sont testées. Les positions de dessin et de collision continuent à utiliser les mêmes acteurs du moteur. Aucune animation dessinée ne remplace les poses de référence existantes.

## Fidélité et préservation

Seul le profil re7-flying-bug est modifié. Les huit autres commandes du profil gardent leurs contrats mécaniques/nombres ; les dix étiquettes passent à simulation car cette passe ne les a pas recertifiées. Le statut devient source-review-partial. La référence héritée est une piste sur le sujet, pas une preuve de chaque commande.

114 autres profils principaux, 231 prototypes, 43 exercices, les 115 Dossiers, les images, les définitions de conclusions et le cœur de simulation sont inchangés. Les contrats principal et expérimental de replay changent avec les données ; les anciens fichiers restent lisibles dans leur version d’origine. Le journal contextuel garde son contrat.

Le vol permanent, les battements d’ailes, les sons, les gestes et trajectoires exacts, les conclusions dédiées et les sources primaires horodatées restent ouverts. Aucun comportement n’est transféré depuis les homonymes d’Outbreak.

## Sources réellement disponibles

Code R11 et profil source du commit de base, exécutés avant/après. La référence secondaire héritée https://www.evilresource.com/resident-evil-7/enemies/flying-bug a été retrouvée dans la recherche le 19 octobre 2026 ; elle ne valide ni ces timings ni ce mapping. Aucun nouveau timecode ou relevé primaire Capcom précis n’a été obtenu pour cette manœuvre. Aucun statut 1:1 attribué.

## Validation et Excel

19 groupes ciblés : coût, départ, deux côtés, retour au sol, coins, croisement, interruption avant/après activation, vulnérabilité, absence d’effet offensif ou soin, reset, cinq duels CPU/replays, laboratoires et contrôleur principal. Les positions et dommages préparés sont indiqués dans les tests.

Le workflow exécute séparément le vrai HTTP Chromium en 1440 et 390 pixels. Les accélérations de laboratoire/CPU sont déclarées ; les résultats générés font autorité. Pas de téléphone, manette ou BFCache physique certifié.

`docs/planning/BOW_FLIGHT_R12.xlsx` : quatre onglets, 19 résultats locaux, deux mouvements mesurés, sources et limites ; créé avec artifact_tool et restauré sans altérer ses 17 parties XML. Complément de P1 et R8–R11, pas remplacement. Trois fermetures techniques uniquement : mouvement utile, retrait continu et mesure de trajectoire. Aucun lot artistique global fermé.

Aucune fusion main, promotion Vercel ou nouvelle copie Drive implicitement effectuée.
