# SAUVEGARDE PARTIELLE — TRANSFERT V3/V4 INCOMPLET

Date du point de reprise : 19 novembre 2026.

**Ce commit ne sauvegarde pas encore les lots V3 et V4 complets.** Il conserve uniquement ce document et un PNG réel d’Alcina V3 dont les octets ont été vérifiés avant l’interruption du runtime. Aucun autre média, archive, lecteur ou manifeste du lot n’est annoncé comme transféré par ce commit. Il ne constitue pas une livraison complète ni une admission au moteur.

## Objet effectivement conservé

- Fichier : `v3-20261119/native/Resident_Evil_Combat_Generation_V3/assets/portraits/REC_ALCINA_RE8_PORTRAIT_V3_01.png`
- Taille : **1 730 446 octets**
- SHA Git du blob : `f47dcf381e02f2e422488a6506577692fb71a07a`
- SHA-256 du PNG : `aa7c6de551c4dfbf98275c36eab0ce9b43484f86f37e8c07cc236e6df10bf9df`
- Méthode : API GitHub `create_blob`, encodage `base64` explicite ; le SHA Git retourné correspond au calcul sur les octets du PNG local.
- Portée : portrait candidat généré, **sans admission moteur et sans certification globale de fidélité 1:1**.

[Ouvrir le PNG conservé](v3-20261119/native/Resident_Evil_Combat_Generation_V3/assets/portraits/REC_ALCINA_RE8_PORTRAIT_V3_01.png)

## Lots gelés avant l’interruption

Les mesures suivantes décrivent les archives assemblées et vérifiées avant l’interruption. Elles ne signifient pas que les archives sont déjà présentes sur cette branche.

| Mesure | V3 | V4 |
| --- | ---: | ---: |
| Taille exacte du ZIP | 121 392 052 octets | 60 787 557 octets |
| Membres du ZIP | 332 | 208 |
| PNG déclarés dans le lot | 54 nouveaux candidats | 34 PNG au total |
| Détail V4 | Sans objet | 30 candidats sélectionnés + 4 essais archivés |
| Références V4 | Sans objet | 24 |
| Images sélectionnées du direct de Samuel | Sans objet | 12 |
| Demandes en cours au gel | 0 | 0 |

**V3 — SHA-256 du ZIP**

`b4bc94e98e9f08688933e6b900896a6c1d864547e60b667ed95b0a93193c74c6`

Dossier assemblé :
`/workspace/scratch/5d8ed11ce666/outputs/resident_evil_combat_v3/Resident_Evil_Combat_Generation_V3`

Archive :
`/workspace/scratch/5d8ed11ce666/outputs/resident_evil_combat_v3/Resident_Evil_Combat_Generation_V3.zip`

**V4 — SHA-256 du ZIP**

`c44e90b4d43e21a25e9796f1aac3569c7d2851e01b58cf6cc90f7ed180ee2b18`

Dossier assemblé :
`/workspace/scratch/5d8ed11ce666/outputs/resident_evil_combat_v4/Resident_Evil_Combat_Generation_V4`

Archive :
`/workspace/scratch/5d8ed11ce666/outputs/resident_evil_combat_v4/Resident_Evil_Combat_Generation_V4.zip`

Les quatre essais V4 sont trois essais d’animation et une première version de borne. Ils ne deviennent ni quatre personnages supplémentaires ni quatre images sélectionnées supplémentaires. Les références et les dépendances V2/V3 restent distinctes des nouveaux médias.

## Cause de l’arrêt

Le runtime a été déclaré indisponible après une déconnexion du transport et un échec de récupération. Le dernier appel d’exécution a retourné :

> No usable execution environment is available. Wait for an environment to become available before using this tool.

La disparition du runtime ne démontre pas la perte du workspace. Sa présence et celle de ses fichiers devront être contrôlées à la reprise. Le checkout et les anciennes préparations sous `/tmp` peuvent être réinitialisés ; ils ne sont pas considérés comme une conservation durable.

Le push Git natif à blanc avait auparavant échoué avec `fatal: unable to get password from user`. La voie binaire du connecteur GitHub a, elle, réussi pour le PNG conservé. Aucun credential n’a été modifié ou exposé. Les auxiliaires privés de transfert sont exclus de ce commit.

## Étapes restant à effectuer

1. Rétablir un environnement d’exécution et contrôler les fichiers existants sans supposer leur perte ni leur intégrité.
2. Relire la tête de la branche de sauvegarde et les PR éventuelles ; réutiliser le blob Alcina déjà présent. Ne jamais forcer une ref concurrente.
3. Revalider les deux ZIP contre les tailles et SHA-256 ci-dessus, puis leurs 332 et 208 membres.
4. Préparer les fragments d’archive de **2 Mio** : **non préparés à l’instant de ce checkpoint**. Conserver les ZIP exacts et produire un index ordonné avec tailles, offsets, SHA par fragment et SHA du ZIP reconstitué.
5. Transférer tous les autres objets manquants : dossiers natifs complets V3/V4, fragments exacts, index, restaurateur et README. Les autres objets ne sont pas présents dans ce checkpoint. Exclure secrets et auxiliaires privés ; préserver les octets et la provenance.
6. Vérifier à distance les chemins, tailles et SHA Git des objets, récupérer les fragments depuis GitHub et reconstituer **les deux archives** dans un emplacement indépendant. Comparer leurs SHA-256 aux originaux.
7. Ouvrir une **PR en brouillon seulement quand tout le lot demandé est présent et vérifié**, avec compteurs réels, résultats de validation et limites. Ce checkpoint partiel ne déclenche aucune PR.

**Aucune suppression ni opération de nettoyage n’est autorisée avant vérification complète de la sauvegarde et instruction distincte de nettoyage.**

## Frontière du projet

Le commit de référence du jeu reste `12deacf4cf9b7706eba69fecc1c13593d030180b`. Ce checkpoint ajoute seulement un PNG et ce document dans `production-archives/rec-media/`. Il ne modifie aucun fichier historique, moteur, sauvegarde, replay, garde ou workflow.

La garde courante R34 utilise une liste fermée de chemins qui n’inclut pas ce périmètre de conservation. **Aucune CI verte n’est annoncée.** Le runtime, le navigateur et la recette visuelle n’ont pas été relancés pour ce checkpoint. Les fichiers candidats ne sont pas des animations finales certifiées ni une reproduction globale 1:1 admise.
