# Resident Evil Combat Lot V5

Date de production : 19 novembre 2026.

Ce lot poursuit les manquants graphiques et la conception de combat du projet. Il fournit trois candidats de personnage, une étude de décor avec trois plans corrigés, un complément de bible consacré à Moira Burton et un catalogue visuel. Les fichiers sont des éléments de production à qualifier ; aucune intégration au jeu ni fidélité visuelle 1:1 n'est certifiée.

## Contenu retenu

| Élément | Fichier dans assets | Format natif | État |
|---|---|---|---|
| Raymond Vester, portrait | REC_RAYMOND_REVHD_PC2013_PORTRAIT_V5_03.png | 1312 × 1199 RGBA | Costume corrigé et cadrage élargi |
| Raymond Vester, pose gauche | REC_RAYMOND_REVHD_PC2013_IDLE_LEFT_V5_01.png | 1024 × 1536 RGBA | Candidat de pose fixe |
| Alcina Dimitrescu humaine, pose gauche | REC_ALCINA_VILLAGE_IDLE_LEFT_V5_02.png | 1024 × 1536 RGBA | Cadrage élargi autour du chapeau et de la robe |
| Missiles et Convoyeurs, image maître | REC_STAGE_RE5_MISSILE_CONVEYORS_STUDY_V5_01.png | 1672 × 941 RGB | Étude originale pour re5_060_reaper |
| Décor, fond lointain | REC_STAGE_RE5_MISSILE_CONVEYORS_FAR_V5_01.png | 1672 × 941 RGB | Fond reconstruit à qualifier |
| Décor, convoyeur et piliers | REC_STAGE_RE5_MISSILE_CONVEYORS_MID_V5_02.png | 1672 × 941 RGBA | Géométrie corrigée ; pixels réinterprétés |
| Décor, sol | REC_STAGE_RE5_MISSILE_CONVEYORS_FLOOR_V5_02.png | 1672 × 941 RGBA | Géométrie corrigée ; raccord à vérifier |

La transparence des cinq images RGBA retenues a été contrôlée dans les données PNG. Elle ne vaut pas validation des franges, de la prémultiplication, des pivots ou de l'échelle dans le moteur. Les deux poses ne constituent pas des séquences d'animation.

## Documents

- `docs/Resident_Evil_Combat_Complement_Moira_V5.docx` et sa version Markdown : commandes, douze normaux, spéciaux et EX, super, ultime, ressources, projections, routes chiffrées, rivalité, deux fins originales et finishers après le KO final.
- `docs/Resident_Evil_Combat_Catalogue_V5.pdf` : présentation des trois candidats de personnage et de l'étude de décor, avec leur état de production.
- `docs/QA_DECOR_V5.md` : écarts des premières séparations, contrôle des variantes corrigées et critères restant avant intégration.
- `data/asset_manifest_v5.json` : chemins, empreintes SHA256, dimensions et mesures de transparence des douze PNG.
- `data/production_status_v5.json` : manquants traités, refus, références à retrouver, état des arènes et archives précédentes.
- `data/production_jobs_v5.json` : consignes de génération et résultats, sans masquer les essais non retenus.
- `sources/arenas_main_12deacf.json` : état des arènes utilisé pour l'audit, extrait du dépôt au commit indiqué.

## Essais conservés

Le dossier `essais/` contient cinq images remplacées : les deux premiers portraits de Raymond, le premier cadrage d'Alcina, et les premières séparations MID et FLOOR. Ils ne doivent pas être sélectionnés par défaut lors d'une intégration. Le premier portrait de Raymond comportait un costume erroné ; le deuxième avait un cadrage trop serré. Les premières séparations du décor déplaçaient les piliers et la limite du sol.

## Résultat des huit manquants de personnage prioritaires

Trois manquants disposent maintenant d'un candidat : portrait de Raymond, pose gauche de Raymond et pose gauche d'Alcina.

Cinq tentatives n'ont pas produit d'image, en raison d'un refus de l'outil : Sheva Business gauche, Chris RE5 gauche, Moira gauche, Carlos RE3 Remake gauche et Wesker humain RE5 droite. Elles restent ouvertes. Le refus historique de Krauser est également conservé ; aucune variante n'a été utilisée pour le contourner.

Chris Safari reste en attente d'une référence visuelle primaire. Parker et Luis nécessitent une référence corporelle complète. Les références de Jessica issues de versions PC2013 et 2017 doivent rester distinctes tant que l'édition visée n'est pas résolue.

## Provenance et fidélité

Les premières créations de personnages de ce lot ont été guidées par des descriptions textuelles. Aucune image officielle de modèle n'était jointe à ces premières générations. Les retouches utilisent des images générées pendant le lot ; leur cohérence interne ne démontre pas une fidélité canonique indépendante.

Raymond vise l'interprétation Revelations HD PC2013. Alcina vise sa forme humaine de Village. Les visages, tissus, accessoires et asymétries anatomiques restent à comparer aux références complètes avant admission.

Le décor constitue une adaptation visuelle originale du thème Missiles et Convoyeurs. Sa géométrie n'est pas présentée comme celle du jeu source.

## Contrat de décor conservé

La Bible V1 demande six plans maîtres de 7680 × 2160, pour une vue de 1920 × 1080, une piste de 3200 unités, une ligne d'appui à y = 900 et des coefficients de parallaxe 0,04 ; 0,18 ; 0,42 ; 0,72 ; 1 ; 1,16.

Le présent lot propose trois plans de 1672 × 941. Les variantes 02 réalignent les éléments principaux du master, mais elles repeignent les pixels. MID se termine vers y = 694 et FLOOR commence vers y = 698 au seuil alpha supérieur à 16 : le raccord et les contours doivent être examinés dans le rendu. Le fond reconstruit demande aussi une qualification en mouvement.

Les trois plans supplémentaires, l'extension latérale, les masters à la taille cible, les collisions, le calage des pieds, les extrémités de caméra et la performance restent à produire ou vérifier. Un simple agrandissement de ces images ne remplit pas ces exigences.

## État du dépôt et des archives précédentes

Le dépôt audité est [darknigthmare/resident-evil-bow-protocol](https://github.com/darknigthmare/resident-evil-bow-protocol), à `main` `12deacf4cf9b7706eba69fecc1c13593d030180b`. La PR 21 a été fusionnée le 15 novembre 2026. Le [bilan R34](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/12deacf4cf9b7706eba69fecc1c13593d030180b/docs/R34_DELIVERY.md) distingue 115 combattants principaux, 231 identités de prototype et 43 exercices contextuels. Les nouveaux candidats V5 ne modifient pas automatiquement ses compteurs d'admission.

L'état audité des arènes comporte 52 entrées : 36 références à neuf images bitmap et 16 entrées sans bitmap, déjà dotées de décors procéduraux. Ces 16 scènes ne sont donc pas des arènes vides. Leur liste précise figure dans le registre de production.

Les ZIP V3 et V4 avaient été retrouvés et contrôlés avant le changement d'environnement. Le contrôle ZIP et les empreintes correspondaient aux points de reprise :

| Archive | Octets | Membres ZIP | SHA256 |
|---|---:|---:|---|
| V3 | 121392052 | 332 | b4bc94e98e9f08688933e6b900896a6c1d864547e60b667ed95b0a93193c74c6 |
| V4 | 60787557 | 208 | c44e90b4d43e21a25e9796f1aac3569c7d2851e01b58cf6cc90f7ed180ee2b18 |

Leur contenu complet n'est pas inclus dans V5. La branche `chore/rec-media-v3-v4-backup-20261119`, à `85e8daf871ed71291a961bde3acc0ed3011ced80`, conserve un portrait d'Alcina V3 et un [rapport de récupération](https://github.com/darknigthmare/resident-evil-bow-protocol/blob/85e8daf871ed71291a961bde3acc0ed3011ced80/production-archives/rec-media/RECOVERY.md). Elle ne constitue pas une sauvegarde complète des deux ZIP. Aucun nouveau transfert de V3 ou V4 n'est déclaré terminé.

## Avant admission dans le jeu

1. Valider l'édition, l'identité, le costume et les asymétries à partir des références complètes.
2. Définir pivots, échelle, ligne d'appui, atlas et conventions des orientations gauche et droite.
3. Produire les animations et leurs transitions ; contrôler interruptions, contacts, poses de garde et retour à l'attente.
4. Finaliser les six plans de décor et tester le défilement sur toute la piste.
5. Implémenter puis tester la proposition Moira, notamment les fenêtres d'annulation, la lampe, les coûts, les cibles compatibles, le replay et les finishers.
6. Restaurer l'accès aux archives V3/V4 complètes pour terminer leur sauvegarde.

Aucun fichier du moteur, aucune branche et aucune PR n'ont été modifiés pour ce lot V5. La Bible V1 reste la référence, accompagnée du présent complément.

## Accès au complément

La [page de suivi et le complément Moira](https://chatgpt.com/space/page_30d95fd7e8f881919a7041757fd0f526) ont été créés. La sauvegarde permanente du ZIP, du PDF et du Word a été bloquée par la limite de stockage des fichiers. Le présent lot téléchargeable reste la copie locale produite et contrôlée.
