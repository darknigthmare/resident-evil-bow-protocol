# Resident Evil Combat — bilan de continuation V5 à V11

**Les lots V5 à V11 conservent 82 PNG :56 candidats visuels retenus et 26 essais.** V5 comprend des personnages et des stages. Les seules poses corporelles B.O.W. V6–V11 représentent 49 candidats distincts : 47 gauches et 2 droits. Aucun de ces comptes ne vaut certification 1:1 ou admission moteur.

Ce bilan accompagne la [PR #22](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22). Les snapshots gelés sont conservés séparément ; les références documentaires originales ne sont pas publiées.

## Lots conservés

| Lot | PNG | Candidats | Essais | Portée |
| --- | ---: | ---: | ---: | --- |
| [V5](v5/README.md) | 12 | 7 | 5 | Personnages et stages ; pas sept nouvelles B.O.W. |
| [V6](v6/README.md) | 12 | 10 | 2 | Vues corporelles gauches |
| [V7](v7/README.md) | 9 | 6 | 3 | Vues corporelles gauches |
| [V8](v8/README.md) | 17 | 9 | 8 | Vues corporelles gauches |
| [V9](v9/README.md) | 13 | 9 | 4 | Vues corporelles gauches |
| [V10](v10/README.md) | 15 | 13 | 2 | Vues corporelles gauches |
| [V11](v11/README.md) | 4 | 2 | 2 | Vues corporelles droites |

V8–V11 ajoutent ensemble 49 PNG :33 candidats retenus et 16 essais. Les 57 appels correspondants ont aussi produit 8 refus sans image. Huit sujets sont restés sans appel ; Gatling Gun Majini est tenu après trois essais dont aucun ne reproduit correctement les prises de l’arme.

## Les 42 pistes disposant déjà d’une source documentaire

Les files V8, V9 et V10 sont une partition exacte de 14+14+14 UID, sans omission, doublon ou ajout. Chaque référence a été récupérée, vérifiée et ouverte avant décision. Les 42 cas ont maintenant une décision explicite :

| Résultat exclusif | Identités |
| --- | ---: |
| Vue gauche candidate retenue |31 |
| Refus propre de l’outil |4 |
| Attente liée à un refus apparenté, sans appel |2 |
| Source anatomique insuffisante |4 |
| Sorties présentes uniquement comme essais |1 |

Les 31 candidats sont détaillés dans les manifestes des lots et dans [le bilan JSON](CONTINUATION_20261119.json). Les 11 autres cas restent ouverts :

| Identité | Édition | Résultat | Dossier |
| --- | --- | --- | --- |
| Garrador | Resident Evil 4 remake (2023) | Refus propre de l’outil | [V8](v8/README.md) |
| Gatling Gun Majini | Resident Evil 5 (2009) | Essais seuls, non admis | [V8](v8/README.md) |
| Hauler | Resident Evil Village (2021) | Refus propre de l’outil | [V8](v8/README.md) |
| Moroaică | Resident Evil Village (2021) | Attente liée à un refus apparenté | [V8](v8/README.md) |
| Yawn | Resident Evil (1996) | Refus propre de l’outil | [V8](v8/README.md) |
| G (Fourth Form) | Resident Evil 2 remake (2019) | Refus propre de l’outil | [V9](v9/README.md) |
| G-Young | Resident Evil 2 remake (2019) | Référence encore insuffisante | [V9](v9/README.md) |
| Garrador | Resident Evil 4 (2005) | Attente liée à un refus apparenté | [V9](v9/README.md) |
| Kipepeo | Resident Evil 5 (2009) | Référence encore insuffisante | [V9](v9/README.md) |
| Baby Moth | Resident Evil Outbreak (2003) | Référence encore insuffisante | [V9](v9/README.md) |
| Giant Whip Spider | Resident Evil Revelations 2 (2015) | Référence encore insuffisante | [V10](v10/README.md) |

Les sources encore insuffisantes sont G-Young, Kipepeo, Baby Moth et Giant Whip Spider. Les recherches complémentaires n’ont pas établi leurs attaches ou leur topologie avec assez de certitude. Thanatos-R a pu être repris grâce à une capture de port communautaire montrant les deux pieds ; ce complément sert à la topologie du bas du corps, sans certifier le modèle natif ni ses matériaux.

Gatling reste en essai à cause des prises main droite arrière/main gauche avant non reproduites. Les autres corrections retenues traitent des défauts observés : bras ou flanc inversés, corps trop frontal, ailes ou pattes manquantes/surnuméraires. Les essais sont conservés avec leurs causes, sans les additionner aux candidats.

## Les six anciens essais de direction V11

Ces six UID sont distincts des42 précédents.

| Identité | Décision |
| --- | --- |
| Uroboros Mkono — Resident Evil 5 (2009) | Candidat droit antérieur ; gauche ensuite refusée |
| Lucas Baker — forme mutée — Resident Evil 7 Biohazard (2017) — Not a Hero | Candidat droit antérieur ; gauche ensuite refusée |
| Soldat Panzer — Resident Evil Village (2021) | Refus propre de l’outil |
| Uriaș — Resident Evil Village (2021) | Attente liée à un refus apparenté |
| Queen Leech — Resident Evil 0 (2002) | Référence encore insuffisante |
| Duvalia — Resident Evil 5 (2009) | Refus propre de l’outil |

Lucas muté droite01 et Mkono droite03 ont été créés et revus avant les demandes gauches, ensuite refusées. Ils restent deux candidats droits ; ils ne clôturent pas les deux gauches. V11 contient donc deux candidats, mais quatre UID portant un refus effectif : Lucas, Mkono, Duvalia et Panzer. Deux de ces UID appartiennent déjà à la classe des candidats droits : les compter à nouveau comme identités supplémentaires serait incorrect. Aucun appel n’a suivi ces refus pour les mêmes sujets.

Queen Leech reste tenue faute de preuve de latéralité. Uriaș est tenu en raison du refus historique de la variante apparentée Uriaș Drac, sans inventer un nouveau refus propre à Uriaș. Les détails et l’erreur de consigne corrigée sur Mkono sont dans [V11](v11/README.md).

## Portée du catalogue plus large

L’audit de métadonnées conserve 346 identités R34 et ne transforme pas les 43 entrées contextuelles extérieures en nouveaux combattants. Les catégories suivantes sont exclusives ; leur somme reste 346.

| État après continuation | Identités |
| --- | ---: |
| Candidats statiques conservés V6–V11, dont deux avec refus gauche ultérieur |49 |
| Deux vues statiques déjà présentes dans le dépôt antérieur |25 |
| Bibliothèque native présente, édition et admission encore à examiner |45 |
| Référence complète, exacte ou latéralité encore insuffisante |152 |
| Refus historiques R34/V2 conservés |44 |
| Nouveau refus propre, sans candidat retenu |8 |
| Attente liée à un refus apparenté |5 |
| Essais seuls non admis |1 |
| Hors du périmètre créature de cette continuation |17 |

Il ne s’agit pas de 346 nouvelles images contrôlées physiquement : le catalogue global est un audit de métadonnées, tandis que les sources des lots générés ont été ouvertes. Les réserves antérieures de U-8, Licker beta RE5, Eliminator blanc RE0 et de l’incarnation de Steve muté demeurent. Les [preuves de référence antérieures](v7/docs/INVENTORY_V7.json) ne sont pas effacées par les nouveaux candidats.

## Fidélité, conservation et validation

Les PNG livrés sont les octets originaux de l’outil. Les relectures vérifient l’incarnation, la direction, les asymétries, les membres visibles, les extrémités dans le cadre et l’alpha. Des détails, surfaces cachées, marges et points d’occlusion restent explicitement limités. La fidélité géométrique 1:1 n’est pas certifiée ; les drapeaux canonical_one_to_one_certified et engine_admitted restent false. Aucune animation, hitbox, échelle, pivot ou recette moteur n’est validée par la seule présence des images.

Les bitmaps sources et modèles sont exclus. Certains ZIP sont conservés en parties, avec reconstruction et empreinte de l’archive exacte ; les README de lots décrivent leur livraison. V9 garde son dossier racine dans son ZIP original. Les archives V3/V4 intégrales n’ont pas été récupérées : une déduplication historique mondiale n’est donc pas démontrée.

La publication et la CI du commit effectif sont décrites dans la [note de publication](README.md), extérieure aux snapshots. Un contrôle d’archive réussi ne remplace pas une suite de gameplay ou un résultat CI vert.

## Preuves de ce bilan

- [Bilan JSON avec les 42 décisions, les six reprises et les346 états du catalogue](CONTINUATION_20261119.json).
- [Recoupement indépendant de la partition et des résultats](INDEPENDENT_SCOPE_AUDIT_20261119.json).
- [Empreintes du présent bilan et de son contrôle indépendant](CONTINUATION_20261119_SHA256.txt).
