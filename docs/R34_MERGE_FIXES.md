# R34 — corrections avant fusion

Cette reprise part du commit `730ededd457c1a4c8cf09db4f5a8a4938626f17d`. Elle conserve les règles, données, contrôleurs de combat et formats de sauvegarde et de replay.

## Import atomique

Une défaillance de validation après le premier import supprimait le PNG neuf mais laissait son reçu `GENERATED`. Le rollback supprime maintenant les deux fichiers lorsqu'ils étaient absents avant l'opération. Une révision échouée restaure toujours les octets exacts du PNG et du reçu précédents. Deux régressions vérifient ces cas, dont la possibilité de recommencer le premier import après l'échec.

## Anciennes recettes navigateur

Le nouveau parcours personnages → arène → combat est vérifié par les recettes R34 par défaut. Plusieurs anciennes recettes attendent intentionnellement le lancement direct du combat : leur montage courant doit donc déclarer la vue de compatibilité `?dev=1&selection=direct` déjà utilisée par R31–R33.

Les 65 appels concernés, répartis dans 21 workflows, préchargent désormais explicitement `tests/browser-compat-r34.mjs` au moment du test. Les 12 recettes originales conservent leurs assertions. Aucun préchargement n'est activé avant l'installation des dépendances et les matrices de publications R25–R30 restent intactes. Le garde exige que l'inversion de chaque transformation restitue exactement le workflow publié ; il refuse aussi le retrait d'une assertion ou l'extension du préchargement à tout un job.

La fixture n'affiche plus la barre DEV qu'elle avait elle-même ajoutée aux URL de joueur : cette barre pouvait recouvrir les commandes de pause. Le marqueur d'URL `__reLegacyPublicR34=1` garde cette distinction lors d'un retour dans l'historique. Les URL demandant explicitement `dev=1` et la page d'outillage du catalogue conservent leur navigation DEV. Cette adaptation appartient uniquement aux tests de compatibilité ; le parcours livré par défaut reste celui de R34.

Les douze recettes passent dans la copie isolée avec la fixture finale, soit 118 groupes sans échec. Les deux diagnostics R9 ayant révélé le recouvrement et le retour d'historique sont conservés séparément, sans être présentés comme des résultats positifs : [rapport et sources liées](R34_LEGACY_BROWSER.json).

## Destination du lien de sources

La découverte de la destination attendue dans la recette R24 assimilait tout adaptateur `dossier-link.js` au propriétaire de « Sources et chantiers ». L'adaptateur R33 possède pourtant son lien DEV distinct « Ajouts R33 ». La découverte identifie maintenant les adaptateurs qui possèdent réellement `#fidelityR23Link`. Les assertions d'unicité, de visibilité, d'adresse et de navigation restent intactes ; aucun lien produit n'a été changé pour satisfaire le test. La reproduction passe de 5/6 à 6/6 : [preuve avant et après](R34_DASHBOARD_DISCOVERY_REVIEW.json).

## Références et limites

Les nouvelles recherches conservent les pages, images brutes, URL, empreintes et décisions dans `modules/fidelity-r34/assets/source-research-extra/merge-research/`. Une source complète retrouvée ne suffit pas à admettre automatiquement une pose : l'édition, la tenue, la phase et les asymétries doivent encore concorder. Les refus antérieurs restent conservés sans nouvelle demande.

Une passe de génération a produit une étude complète de Nemesis deuxième forme de RE3 (1999). La latéralité de la tête et des tubes n'est pas établie, et des agrafes ont été ajoutées sans référence sur le pantalon : elle reste non admise. Le reçu `HELD_REFERENCE` officiel reste inchangé ; cette tentative supplémentaire n'augmente ni les 434 sorties officielles produites ni les 419 sorties admises. Aucun refus de l'outil ni deuxième demande n'a eu lieu pour ce sujet.

Les résultats courants, les compteurs artistiques et le classeur figurent dans [la livraison](R34_DELIVERY.md), [la validation](R34_VALIDATION.json) et [le classeur](BOW_FIDELITE_R34.xlsx). Les résultats des contrôles GitHub et des déploiements Vercel sont suivis séparément dans la PR ; une recette locale ne vaut pas un résultat distant.
