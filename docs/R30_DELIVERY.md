# Livraison R30

La sélection principale, le duel classique et le mode avec évolutions proposent désormais « CHOISIR AVEC LES AVATARS ». Le catalogue compte 388 avatars disponibles : sept vignettes natives extraites, sept vues dérivées de modèles natifs et 374 références documentaires. Jack à scie à ciseaux reste sans avatar exact ; son ancien composite n’est pas présenté comme une référence fidèle.

Dans « Rendus natifs en 2D », les variantes PC/HD 2013 d’Ooze, Tricorne Ooze, Pincer Ooze et Farfarello peuvent utiliser leur boucle neutre native observée. Elles restent des choix visuels volontaires de cette édition. Chaque mouvement conserve sa durée complète et 60 échantillons par seconde, avec deux vues réellement rendues depuis les côtés opposés. Le nom original de l’action et l’équivalence avec l’édition 3DS ne sont pas certifiés. La boucle de Chunk Ooze est consultable dans la bibliothèque ; cette identité reste contextuelle dans les combats.

Stinger et le Zombie RE1 au manteau vert disposent chacun de deux poses natives neutres utilisables. Ce sont des poses fixes. Les attaques, déplacements et autres états gardent la présentation déjà disponible ; aucune action manquante n’est fabriquée à partir de ces poses.

La [bibliothèque native](../modules/fidelity-r30/native/index.html) réunit 3 314 images pour 50 identités : 204 vues statiques et 16 séquences orientées issues de huit clips natifs. Les différences d’édition, pièces détachées, poses de liaison et gestes non attribués restent explicitement retenus hors de l’admission au combat. Les 22 refus de génération historiques et le refus de révision Tyrant sont conservés.

Le [classeur R30](BOW_FIDELITE_R30.xlsx) contient 56 feuilles, dont les 49 feuilles R29 et leurs relations conservées exactement. Les 389 identités et les 17 chantiers ouverts restent suivis. Il reste 339 identités sans entrée dans cette nouvelle bibliothèque native et aucun cycle idle original n’est certifié pour toutes les éditions cibles. Les quatre variantes animées jouables constituent l’avancement réel de cette livraison, sans clôture de fidélité globale 1:1.

Les [15 rapports de recette](R30_VALIDATION.json) couvrent 46 tests Python, 21 groupes Node et 30 groupes navigateur, avec cinq contrôles de définition CI. Les [neuf contrôles d’intégration](R30_INTEGRATION_TESTS.json), les [605 assertions historiques exécutées](R30_HISTORICAL_TESTS.json), le [build comparé fichier par fichier](R30_BUILD.json) et la [conservation du dépôt](R30_SOURCE_ADDITIONS.json) complètent ces preuves après l’export. La [reproduction du classeur](R30_REPRODUCTION.json) passe trois contrôles sur trois.

Le moteur, les conditions d’évolution, les collisions, les acteurs et les formats de replay restent ceux de la version publiée. L’affichage suit l’horloge du combat, respecte la réduction des mouvements et libère les chargements d’images lors des changements de page. Les tests de navigateur n’établissent pas une fréquence d’affichage garantie sur tout appareil physique.

La CI R30 teste la branche courante ; les assertions historiques R25/R26/R29 conservent leurs sources publiées. Les comparaisons PNG strictes gardent la version de navigateur 154.0.8037.57. Le résultat de la CI distante et le déploiement restent distincts des vérifications locales.
