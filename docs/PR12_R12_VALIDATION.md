# PR12 — R11 conservée, R12 vérifiée

R12 continue la même PR nº 12 à partir de `355d545e08327d3cea0af20d3c0248de0e3364a5`. Aucune fusion dans main n'est effectuée.

## Preuves réellement exécutées

Le candidat `d5da2ac176c9c78c0ef4eab7cefbcdae567c5e82` contient les données compilées et le classeur XLSX. Le workflow https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/39323012124 a réussi : 411 groupes exécutables, dont 19 nouveaux, compilation, 8 scénarios HTTP R12, 8 R11 et 22 R10. Les 887 fichiers du candidat ont été reconstruits et comparés individuellement au manifeste SHA-256 de l'artefact. Les 508 ressources sont conservées.

Le présent document et le workflow permanent R12 sont les seuls ajouts au candidat après ces tests. Les contrôles de la PR valident séparément le commit final ; consulter leur résultat courant.

## Trois clôtures techniques

- Le coût de Vol erratique produit enfin un envol bref et un faible retrait, pas seulement un buff focus sans effet. Coût 16 conservé ; départ de huit ticks, douze ticks actifs et récupération de vingt ticks. La gravité et le moteur de collision sont inchangés.
- Écart aérien ne téléporte plus le sujet de 120 unités au démarrage. Il recule de manière continue, reste vulnérable et ne traverse pas les limites d'arène. L'atterrissage et les délais de réutilisation empêchent une chaîne illimitée en l'air.
- Les deux laboratoires affichent le déplacement signé, l'altitude, le maximum observé et l'état sol/air. La lecture de ces mesures ne modifie pas le combat et n'écrit aucune progression.

Les trajets contrôlés produisent 60 unités de recul et 71,4 d'altitude maximale pour l'envol, 102 unités et 40,48 pour le retrait. Ce sont des unités et des gestes de simulation ; ni tailles réelles ni captures Capcom. Les cinq duels CPU du test parcourent 6 664 frames au total et se rejouent à l'identique. Ils ne constituent pas toutes les combinaisons du roster ni cinq démonstrations garanties de la nouvelle commande.

## Périmètre inchangé et limites

Seul le profil `re7-flying-bug` change. Ses huit autres contrats mécaniques sont conservés, mais leurs preuves héritées ne sont plus présentées comme une vérification actuelle : les dix commandes sont classées simulation. Le profil devient source-review-partial. Aucun transfert de capacité depuis les homonymes d'Outbreak.

Les 114 autres profils principaux, dont Lucas humain R11, les 231 prototypes, les 43 exercices, les 115 Dossiers, les conclusions et le cœur de simulation sont préservés. Les contrats principal et expérimental de replay évoluent avec ces données ; les anciens fichiers doivent être lus dans leur version d'origine. Le contrat du journal contextuel est inchangé.

`docs/planning/BOW_FLIGHT_R12.xlsx` est un complément de quatre onglets aux anciens classeurs. Ses 17 composants XML créés avec artifact_tool sont conservés à l'octet près. Il répertorie les 19 tests locaux et les deux mouvements ; ce document et les JSON exécutés précisent les résultats CI finaux.

Les battements d'ailes, dessins par mouvement, sons, vol permanent, mouvements exacts et sources primaires horodatées restent ouverts. Aucun nouveau clip final, super canonique, fatalité ou décor 1:1. Les tests HTTP utilisent Chromium en 1440/390 pixels, avec accélérations de laboratoire/CPU déclarées ; aucun téléphone, manette physique ou BFCache réel certifié.

Pas de promotion Vercel, de nouvelle copie Drive ou de clôture globale P1 implicite dans cette publication de PR.
