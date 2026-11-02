# R34 — lot 4, portraits puis corps complets

Les 86 combattants du lot ont une décision pour chaque phase. Les 75 portraits générés restent distincts des trois refus nouveaux et des huit refus historiques conservés sans nouvelle tentative.

La phase des corps est figée : **39 sorties générées**, dont **35 poses droites admissibles** et quatre études hors défaut. Les 35 autres demandes autorisées restent `HELD_REFERENCE` avec une inspection concrète des sources et des cadrages. Méndez 2005 a reçu un refus pendant cette phase ; les trois refus de portraits et les huit refus historiques restent également bloqués. Il ne reste aucun `PENDING`.

Les 75 reçus de corps présents ont été vérifiés avec `validate_receipt`, y compris les dix sorties transférées au producteur auxiliaire. Le bilan par UID et les empreintes figurent dans [body-production-final.json](../modules/fidelity-r34/assets/lots/lot_4/body-production-final.json).

| Étude hors défaut | Limite conservée |
| --- | --- |
| `re2-g-type-adult` | La meilleure correction conserve enfin le gros bras du côté source, mais regarde vers la gauche. Les essais droits inversaient cette anatomie. Aucun miroir ni défaut droit n’est déclaré. |
| `re2-evolved-licker` | La vue entière ajoutée diffère de la présentation du catalogue. La correspondance exacte du modèle et de l’édition 1998 reste non établie ; les vues natives 2003 ne sont pas promues comme preuves de cette édition. |
| `re5-duvalia` | Le corps est entier, mais l’ouverture réelle de la carapace reste présentée de face après correction. |
| `re0-queen-leech` | Le producteur auxiliaire conserve une réserve explicite de latéralité ; la pose ne devient pas automatiquement un défaut. |

Les références ont été ouvertes avant génération et les sorties comparées dans Chromium avec le véritable alpha. Les couleurs RGB sous alpha nul sont invisibles dans ce rendu : elles n’ont pas été confondues avec un halo visible. Cette vérification a notamment évité des corrections inutiles.

Les corrections positives de Wesker, d’Albinoid adulte et du corbeau conservent leurs sorties initiales. Pour Albinoid, l’article documentaire permet de distinguer la queue allongée de la petite tête entre les bosses d’épaule ; la pose retenue respecte cette orientation et son corps aquatique. Le remplacement de l’ancien G inversé utilise la révision explicite du pipeline : ancien PNG et ancien reçu archivés exactement, avec leur SHA, sans écrasement silencieux.

[retained-tool-outputs.json](../modules/fidelity-r34/assets/lots/lot_4/retained-tool-outputs.json) relie les 30 retours positifs de l’agent de reprise à leurs octets livrés, y compris les essais intermédiaires non retenus comme base. Ils ne sont pas additionnés aux 39 sorties demandées par UID. Les premières sorties récupérées, les révisions et les reçus du producteur auxiliaire restent également dans le lot. Les captures de comparaison sont des preuves navigateur et ne comptent pas comme images générées.

[held-body-source-reviews.json](../modules/fidelity-r34/assets/lots/lot_4/held-body-source-reviews.json) détaille les 35 limites de référence : extrémités coupées, équipement incomplet, corps enterré ou masqué, groupe non isolé, variante différente et ancien corps de remplacement. Les recherches de jeu conservées y restent distinctes d’une prétention de recherche Internet exhaustive pour chaque UID.

Il s’agit de poses statiques adaptées au combat 2D. Ce lot ne certifie ni nouveaux sprites natifs Capcom, ni cycles idle originaux, ni fidélité géométrique globale 1:1. Les fichiers et identifiants publiés restent conservés ; aucun refus n’a été contourné et aucun corps sans référence complète n’a été inventé.
