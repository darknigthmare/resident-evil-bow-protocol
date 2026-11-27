# Resident Evil Combat — V23 : bible, deux extensions et clés de sélection

État du **27 novembre 2026**, depuis la PR #24 au commit `7c679b38c72ee4d34fd1c39d1dc8950dd4f506aa`.

Ce lot intègre les **trois fichiers originaux du guide**, leur application à Resident Evil et une matrice des **68 sections**. Il poursuit la production avec **11 PNG natifs : 9 clés candidates et 2 premiers essais remplacés conservés**. Un prototype autonome permet d’examiner les règles de déblocage et de sélection.

## Consulter le lot

- [Bible et raccordement au projet](../../../docs/combat-bible/README.md).
- [Extension 01 appliquée : taunts, sélection, équipes, bonus et hub](../../../docs/combat-bible/EXTENSION_01_APPLICATION.md).
- [Extension 02 appliquée : slots, droits, disponibilité et modes](../../../docs/combat-bible/EXTENSION_02_APPLICATION.md).
- [Matrice des 68 sections](../../../docs/combat-bible/INTEGRATION_MATRIX.json) et [provenance des originaux](../../../docs/combat-bible/sources/manifest.json).
- [Galerie des poses avec comparaison V22/V23](galerie.html).
- [Prototype interactif des dossiers verrouillés](prototype/index.html) et [périmètre de ses fonctions](prototype/README.md).
- [Manifeste des 11 PNG](ASSET_MANIFEST_V23.json), [clés par incarnation](SELECTION_KEYS_V23.json), [suite des travaux](WORK_QUEUE_V23.json) et [vérification du lot](reports/VALIDATION_V23.json).

La galerie s’ouvre localement avec ses fichiers voisins et les trois bases V22. Les fichiers du prototype utilisent des scripts classiques et des images locales ; aucune connexion ni clé API n’est nécessaire. Le dépôt conserve le moteur JavaScript/Canvas existant.

## Trois incarnations, trois clés chacune

| Incarnation fixée | Sélection | Confirmation | Désélection / retour |
| --- | --- | --- | --- |
| Barry Burton — *Revelations 2*, tenue de mission fondée sur le rendu promotionnel 2014 | [PNG](assets/barry_rev2_selected_v23.png) | [PNG](assets/barry_rev2_confirm_v23.png) | [PNG](assets/barry_rev2_deselect_v23.png) |
| Billy Coen — *RE0 HD Remaster 2016*, Prisoner | [PNG](assets/billy_re0hd_selected_v23.png) | [PNG](assets/billy_re0hd_confirm_v23.png) | [PNG](assets/billy_re0hd_deselect_v23.png) |
| Rebecca Chambers — *RE0 HD Remaster 2016*, S.T.A.R.S. | [PNG](assets/rebecca_re0hd_selected_v23.png) | [PNG](assets/rebecca_re0hd_confirm_v23.png) | [PNG](assets/rebecca_re0hd_deselect_v23.png) |

Chaque fichier contient un personnage entier et une seule pose sur fond alpha. Le tatouage et l’arme de Billy restent sur son côté droit anatomique, sa menotte sur le gauche ; Barry garde son arme à gauche et le petit objet source à droite. Cet objet n’est pas renommé ou doté d’une fonction non attestée. La tête de Barry dans la pose de désélection regarde effectivement vers la droite de l’image, malgré la direction gauche demandée dans le prompt ; le manifeste consigne cette différence.

Les premières sélections de Barry et Billy étaient trop grandes dans leur toile. Deux nouvelles générations corrigent le cadrage ; les premiers PNG restent dans [les essais](assets/trials/). Leurs octets et empreintes sont conservés. Aucun PNG n’a été redimensionné, retourné, détouré ou réencodé après génération.

### Fidélité : ce qui est établi et ce qui reste ouvert

Les nouveaux gestes sont des **adaptations de menu compatibles avec les personnages**, dérivées des candidats générés V22. Ils ne reproduisent pas une séquence officielle authentifiée. L’édition HD 2016 de Rebecca et Billy ne valide pas automatiquement les fiches GameCube 2002 ; la référence promotionnelle de Barry ne suffit pas à certifier tous les détails du modèle commercial 2015.

La revue confirme des poses distinctes, les silhouettes entières et les asymétries principales. Elle relève encore des franges colorées fines, des variations de détails et des écarts d’échelle/ancrage entre clés. Les marges des sélections Barry/Billy corrigées dépassent 8 % sur les quatre côtés ; toutes les autres images n’atteignent pas ce critère. Il faut préparer les transitions, stabiliser la taille et les appuis, nettoyer les contours, vérifier les pivots, puis les tester dans le menu réel. **Zéro animation complète, zéro admission moteur et aucune certification globale 1:1 ne sont annoncés.**

La [revue indépendante](reports/INDEPENDENT_VISUAL_REVIEW_V23.json) couvre les six candidats Barry/Billy et leurs deux essais. Les trois revues Rebecca ont été faites par leur auteur et sont identifiées comme telles. La revue en deux passes conserve les mesures et hashes de la première passe avant corrections.

## Guides réellement intégrés

Les originaux v1.0 récupérés sont : guide général du **25 novembre**, extension 01 du **26 novembre**, extension 02 du **27 novembre 2026**. Ils sont copiés sans modification, avec leurs URLs Drive, tailles et SHA-256. L’audit du dépôt a trouvé l’ancien `GAMEDEV_GUIDANCE.md`, mais aucun fichier identifiable correspondant aux nouveaux titres. Il n’a pas décompressé toutes les archives historiques ; l’absence de tout contenu équivalent à l’intérieur de ces archives n’est donc pas affirmée.

L’application Resident Evil couvre notamment les éditions et phases, les routes intro/rival/conclusion, les équipes et périodes compatibles, les taunts visuels, la sélection annulable, les assistances et changements de combattant, les supers duo et finishers conditionnels, les clashes/QTE, les entités et projectiles persistants, les bonus et un hub de dossiers. Elle traite séparément la découverte, les droits, les fichiers prêts et la compatibilité des personnages/costumes/stages/modes.

Le moteur possède déjà un buff `taunt`, des séquences de match et des déblocages d’épilogues. Le nouveau guide ne les présente pas comme absents, et leur présence ne valide pas pour autant les nouvelles extensions. Les valeurs de ressources, durées et défis proposés restent des choix de cette adaptation. Aucun fournisseur de paiement ou service d’abonnement n’est connecté.

## Prototype des droits et de la sélection

Le prototype livre des fonctions séparées pour les règles ET/OU, les droits par source, l’expiration, le cache hors ligne, les acquisitions permanentes, les dépendances et les restrictions de partie. Il conserve une préférence indisponible en proposant un remplacement accessible et protège la sélection contre les chargements d’image périmés. Une identité secrète garde un dossier neutre.

**26 tests de domaine réussissent**, notamment les droits non vérifiés, les événements répétés ou désordonnés, le costume obtenu avant son personnage, le renouvellement, l’expiration d’une source sans perte des autres, les fichiers manquants et les réponses tardives. Les exemples sont simulés : ils n’attribuent aucun droit réel et ne lisent ni ne modifient les sauvegardes du jeu.

```bash
node --test production-archives/rec-media/v23/prototype/test-access.mjs
python production-archives/rec-media/v23/validate_v23.py
```

La vérification navigateur reste **bloquée** : Chromium absent et téléchargement Playwright refusé HTTP 403. La recette existe, mais aucune capture ni assertion navigateur réussie n’est revendiquée. La galerie fait l’objet de contrôles de structure, liens, données embarquées et syntaxe ; ces contrôles ne remplacent pas une inspection de son rendu navigateur.

## Suite précise

1. Finir la chaîne visuelle des trois incarnations : contours, ancrages, transitions et cycle complet de sélection/désélection.
2. Raccorder les droits à la progression et aux sauvegardes réelles, avec migrations et autorité validée ; conserver les conventions des anciens replays.
3. Implémenter le profil d’équipe retenu et ses événements déterministes avant d’admettre les supers/finishers duo dans le combat.
4. Reprendre les autres manquants depuis [l’inventaire V22](../v22/inventory/INVENTAIRE_COMPLET_V22_20261124.md). Les récupérations V19, les formes encore sans références complètes et les séquences de projectiles restent ouvertes ; ces clés ne les ferment pas.

Les scripts du lot n’altèrent aucune preuve historique. `assemble_v23.py` assemble uniquement les nouveaux JSON et la galerie depuis les PNG existants et leurs prompts ; `validate_v23.py` contrôle ce périmètre. Le lot ne modifie ni le moteur, ni les contrats de replay, ni les workflows et gardes historiques. La publication dans une PR reste distincte d’une fusion ou d’une mise en production.

## Suivi de la publication et des contrôles historiques

La première publication V23 (`fea27e137cfface468d71875e7621aa0ffe0c34a`) a ajouté des liens aux deux index antérieurs. Les logs R25, R26, R28 et R32 ont alors signalé `Frozen file changed: README.md`. Le correctif rétablit le README racine et l’index médias **octet pour octet à leur état V22** ; la bible, ses sources, les poses et le prototype restent dans leurs nouveaux dossiers.

Le [suivi CI de cette correction](reports/CI_FOLLOWUP_V23.json) conserve les liens des quatre exécutions et la preuve de restauration. Le contrôle R34 possède une liste fermée de chemins et n’admet pas les nouveaux dossiers `docs/combat-bible/` ou `production-archives/rec-media/v23/`. Leur publication ne signifie donc pas que la CI générale est validée. Aucun ancien garde, contrat ou résultat n’a été assoupli. Le rapport de validation initial reste la preuve des contrôles exécutés avant cette correction documentaire ; le suivi consigne les vérifications propres au correctif.
