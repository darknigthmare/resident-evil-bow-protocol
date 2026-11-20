# Resident Evil Combat — lot V18

**12 nouveaux PNG : 12 candidats statiques et 0 essais conservés, pour 6 identités de Resident Evil 6 (2012).** 7 UID ont été audités ; Ustanak reste en attente d’une source complète de sa configuration équipée.

La [PR #23](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/23) continue la [PR #22 fusionnée](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/22). La reprise logique est main `8073338896937faef6f1718387c1c9b3a4be6b72`. Le parent de livraison `935f44716b890303982c4cc384140cf54f4058b5` contient uniquement le [plan initial figé](docs/INITIAL_WORKPLAN_V18.json). Le [plan final](docs/WORKPLAN_V18.json) est un document distinct.

## Poses après revue indépendante

| Identité — RE6 (2012) | Gauche | Droite | Variante et limites |
| --- | --- | --- | --- |
| Napad, carapace intacte | [01](assets/re6_napad_left_01.png) | [01](assets/re6_napad_right_01.png) | Carapace intacte ; rotation parfois modeste, relief des plaques cachées interprété. |
| Whopper, tenue rouge/jaune du rendu final | [01](assets/re6_whopper_left_01.png) | [01](assets/re6_whopper_right_01.png) | Droite levée / gauche abaissée ; déchirure du ventre à droite, ourlets non certifiés au détail près. |
| Meset, forme ailée entière | [01](assets/re6_meset_left_01.png) | [01](assets/re6_meset_right_01.png) | Rendu recoupé avec figurine ; ailes entières, racines et appendices cachés non certifiés. |
| Iluzija, phase visible opaque | [01](assets/re6_iluzija_left_01.png) | [01](assets/re6_iluzija_right_01.png) | Corps visible opaque et bouclé ; occultations entre anneaux et détails oraux limités. |
| Ogroman, dispositif dorsal cylindrique | [01](assets/re6_ogroman_left_01.png) | [01](assets/re6_ogroman_right_01.png) | Configuration dorsale cylindrique conservée ; implantation cachée et échelle non certifiées. |
| Bloodshot, thorax habituel fermé | [01](assets/re6_bloodshot_left_01.png) | [01](assets/re6_bloodshot_right_01.png) | Même rendu que le crop R34, complété ; cœur non exposé, historique du zombie distinct. |

Le [manifeste](manifests/ASSET_MANIFEST_V18.json) relie chaque PNG à son prompt exact, ses mesures d’alpha, sa revue et ses empreintes. **6 paires gauche/droite** sont retenues dans V18. Les directions sont générées indépendamment ; aucun miroir logiciel n’est utilisé. Les images conservent les octets originaux du générateur.

## Essais et appels réels

Aucun PNG de cette passe n’est classé en essai après les revues finales.

Les vues sont des sorties distinctes du générateur, sans duplication des octets d’une vue opposée. Une non-sélection visuelle est distincte d’un refus outil. Le [journal de génération](../GENERATION_LEDGER_V18_20261120.json) contient **12 appels réels, 12 images produites et 0 refus sans image**.

Aucun nouveau refus outil n’est enregistré dans cette passe.

## Sources, phases et hold conservé

Les [décisions de source](docs/SOURCE_DECISIONS_V18.json) synthétisent les rapports [Napad/Whopper](docs/SOURCES_RE6_NAPAD_WHOPPER_V18.json), [Meset/Iluzija/Ogroman](docs/SOURCES_RE6_MESET_ILUZIJA_OGROMAN_V18.json) et [Bloodshot/Ustanak](docs/SOURCES_RE6_BLOODSHOT_USTANAK_V18.json).

Napad conserve sa carapace intacte. Whopper reprend uniquement le rendu final à droite de la comparaison de l’entretien Capcom, avec ses rôles de bras et sa déchirure anatomique droite ; le concept peint de gauche est exclu. Le rendu de Meset est recoupé avec sa figurine de jeu. Iluzija reste dans sa phase visible opaque. Ogroman conserve le dispositif dorsal cylindrique. Bloodshot garde son thorax habituel sans cœur exposé ; le rendu entier correspond visuellement au crop R34 et est corroboré par une figurine.

Ces sources associent rendus, captures et documents, parfois hébergés par des tiers. Les plateformes exactes de certaines captures, le maillage, les racines d’appendices, l’intérieur des boucles et les faces cachées ne sont pas authentifiés. Les revues précisent ce qui est visible et ce qui demeure interprété.

**Ustanak reste `SOURCE_HOLD`, sans appel, sans image et sans nouveau refus.** La figurine principale ne prouve pas la terminaison entière du bras mécanique ; la vue alternative coupe les jambes et contient Jake capturé. La petite vignette entière ne contrôle pas assez le détail de l’arme. Aucune synthèse de configurations n’est admise. Sa ligne de l’inventaire reste exactement celle de V17.

Les refus historiques propres à `re6-zombie`, `re6-javo` et `re6-deborah-harper` sont conservés séparément, sans nouvelle tentative sur ces identités. Le lien biologique entre Bloodshot et zombie ne réécrit ni le refus du zombie ni le portrait Bloodshot R34 déjà `GENERATED`.

## Alpha, cadre et portée

Les sorties sont inspectées sur des composites gris et clairs et mesurées sans modifier les PNG. Les marges de 10 % demandées ne sont pas toutes obtenues ; les revues distinguent cette déviation d’une coupe de silhouette. Les RGB cachés et faibles résidus alpha sont préservés. Certaines directions restent des trois-quarts frontaux plutôt que des profils purs.

Une pose candidate ne certifie ni fidélité géométrique 1:1, ni surfaces invisibles, ni animation, pivot, contact, collision, échelle ou admission moteur. Les bitmaps de référence et modèles sources restent hors dépôt. Les chemins locaux des reçus documentent le travail de recherche.

## Inventaire, intégrité et CI

- [Bilan V18](../CONTINUATION_V18_20261120.md) et [inventaire structuré des 346 UID](../CONTINUATION_V18_20261120.json).
- [Validation d’intégrité V18](../V18_VALIDATION_20261120.json).
- [Historique V17 fusionné](../CONTINUATION_V17_20261120.md).

6 entrées reçoivent les résultats d’appels réels ; **340 autres entrées sont identiques à V17**, dont Ustanak. Les 43 entrées contextuelles hors roster restent séparées et les 44 PNG annoncés V12/V13 restent non récupérés.

La [preuve CI de la base 807333](docs/CI_BASELINE_V18.json) porte sur **24 workflows : 17 succès et 7 échecs**. Six échecs s’arrêtent à la garde R34 `Unknown R34 addition: production-archives/rec-media/CI_CHECKPOINT2_20261120.json`. Le septième, R23, survient avant validation pendant l’installation externe de ffmpeg ; il ne relève pas de la même assertion. Les trois jobs navigateur R34 ont réussi. Cette preuve concerne uniquement le commit main de reprise 807333, pas le parent de livraison 935f447 ni le futur commit V18. Les étapes aval sautées ne sont pas déclarées validées.

Aucun moteur, test, workflow ou garde n’est modifié. La CI du nouveau commit sera contrôlée séparément lors de sa publication. La PR de continuation reste en brouillon, sans fusion dans cette livraison. Les snapshots V5–V11 et V14–V17 restent figés.
