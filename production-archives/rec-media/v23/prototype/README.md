# V23 — prototype des archives de sélection

**Prototype autonome de règles et d’interface. Il ne remplace aucun menu du jeu, ne lance aucun combat et ne modifie aucune sauvegarde existante.**

Ouvrir [index.html](index.html) avec les fichiers voisins et les trois images V22 conservées à leur emplacement. Les scripts classiques permettent l’ouverture locale avec `file://` ; le prototype ne demande ni serveur, ni connexion, ni clé API. Le parcours navigateur est préparé, mais n’a pas pu être exécuté dans l’environnement de production de ce lot : voir la section Vérification.

## Fonctions concrètement écrites

Le domaine JavaScript [access-model.js](access-model.js) sépare quatre axes : découverte, droit d’accès, disponibilité technique et compatibilité. Il évalue les conditions **ET / OU**, conserve les sources permanentes et temporaires séparément et permet de consulter un dossier verrouillé sans l’ajouter à une équipe.

La démonstration propose **sept dossiers et douze situations d’essai** : première visite, récompense à réclamer, costume obtenu avant son personnage, droit temporaire, expiration, acquisition permanente conservée, cache hors ligne valide, service indisponible, fichiers manquants, mode incompatible, doublon d’équipe et alternative OU. L’horloge d’essai est fixée au 27 novembre 2026 ; certains scénarios la déplacent explicitement. Il ne s’agit pas de l’état réel d’un abonnement.

| Composant | Comportement vérifié par les tests de domaine |
| --- | --- |
| `evaluateRule` | Arbres `all`, `any`, `fact` et `counter`, compteurs entiers, booléens stricts, absence de `eval`, structures invalides refusées, profondeur bornée. |
| `applyGrantEvent` | Événement vérifié par une autorité injectée, profil destinataire, identifiant d’événement unique, révision par source, rejet des doublons altérés et des révisions conflictuelles, ancien événement sans effet sur un renouvellement plus récent. |
| `resolveSlot` | Accès permanent distinct du temporaire ; preuve arrivée à échéance distincte de la fin d’accès ; version et installation contrôlées ; dépendances et cycles traités ; permissions de consultation, aperçu, sélection, participation, entraînement et replay séparées. |
| `resolveSavedChoice` | Apparence favorite conservée, remplacement accessible proposé sans effacer la préférence. |
| `createSessionSnapshot` | Configuration autorisée figée pour la session simulée ; changements d’accès appliqués au choix suivant ; rejet des sélections vides ou des doublons interdits. |
| `createSelectionController` | Préselection, confirmation immédiate avec revalidation des droits, annulation et invalidation ; réponse d’image périmée ignorée ; notification d’acquisition préservée pendant un chargement. |

Les droits sont attribués **avant** le message de révélation. Un événement identique reçu une seconde fois ne crée pas un nouveau droit. Le retrait ou l’expiration d’une source temporaire n’efface pas une source permanente du même contenu. La découverte, les préférences et les faits de progression sont conservés dans des structures séparées du journal des droits.

### Interface et découverte

Un secret utilise un dossier neutre sans nom, portrait, silhouette reconnaissable ou description accessible révélatrice. Un indice peut afficher la silhouette autorisée. Les emplacements restent consultables au clavier ; la confirmation d’un contenu interdit expose ses conditions. Une action d’information reste un bouton utilisable.

Le thème des archives emploie des dossiers scellés, des étiquettes et des autorisations administratives : c’est une **métaphore d’interface originale compatible**, pas un lieu, un objet ou un événement canonique de Resident Evil. Le mode « Scénario REV2 » ne représente qu’un filtre de compatibilité d’incarnations dans la démonstration.

Les cartes de personnages réutilisent, sans modification de pixels, trois candidats V22 :

| Personnage | Source locale existante |
| --- | --- |
| Barry Burton — *Revelations 2* | [Pose V22](../../v22/assets/REC_BARRY_REV2_BASE_FULLBODY_FRONT_V22_01.png) |
| Rebecca Chambers — *RE0 HD Remaster 2016* | [Pose V22](../../v22/assets/REC_REBECCA_RE0HD_BASE_FULLBODY_FRONT_V22_01.png) |
| Billy Coen — *RE0 HD Remaster 2016*, tenue Prisoner | [Pose V22](../../v22/assets/REC_BILLY_RE0HD_PRISONER_FULLBODY_FRONT_V22_01.png) |

Ces images fixes ne sont pas présentées comme des animations. Le costume « Palette Archives », la salle des archives et le mode de survie sont des **données d’essai** : aucune nouvelle apparence dessinée, arène jouable ou partie de survie n’est fournie par ce prototype. « Prêt dans cette simulation » décrit une fixture de test, pas l’admission de son asset dans le moteur du jeu.

## Frontière d’autorité et fonctionnement hors ligne

`applyGrantEvent` **n’authentifie pas un abonnement**. Il exige un adaptateur `authority.verify(event)` ; celui de la démonstration reconnaît uniquement les événements qu’elle a émis elle-même. L’adaptateur doit être remplacé par une autorité de confiance et une vérification réelle avant toute intégration. Un programme public exécuté dans le navigateur n’est pas un service de validation de paiement.

Le domaine suppose que le journal passé à `resolveSlot` vient de cette frontière de confiance. Copier un faux journal dans le code client ne constitue pas un droit valide en production. Les tests couvrent la consommation de décisions vérifiées et le rejet d’événements non vérifiés ; ils ne certifient ni sécurité cryptographique, ni résistance à la modification du client, ni serveur d’abonnement.

La politique de cache simulée accepte une preuve jusqu’à la plus proche des deux dates : fin du droit temporaire ou fin de validité du justificatif. Une panne de service avec justificatif périmé donne **« vérification requise »** ; elle ne crée aucun droit et ne devient pas une expiration présumée. Les échéances de cette démo sont des paramètres de test, sans valeur contractuelle pour un fournisseur.

Les snapshots de session sont de nouveaux objets isolés de cette démonstration. Ils n’ajoutent pas un mode réseau ou une compatibilité de replay au moteur existant. Aucune donnée de compte, aucun jeton, aucune information de paiement et aucune préférence du jeu ne sont lus ou écrits. Le rechargement de la page réinitialise cette démonstration.

## Vérification

**26 tests de domaine réussis, zéro échec**, exécutés avec Node `v24.22.3`. Preuve : [DOMAIN_QA.tap](reports/DOMAIN_QA.tap). Les trois scripts d’application et la recette navigateur passent le contrôle de syntaxe JavaScript.

```bash
node --test production-archives/rec-media/v23/prototype/test-access.mjs
```

La recette [test-browser.mjs](test-browser.mjs) est écrite pour une ouverture locale, la navigation clavier, l’anti-spoiler visible et accessible, les douze situations, l’annulation, les ressources locales, les formats 1440/390/320 px et le texte à 200 %. **Ces contrôles navigateur n’ont pas été exécutés**, car aucun binaire Chromium exploitable n’était disponible. L’installation du navigateur Playwright a échoué avec HTTP 403 sur son CDN. Aucun rendu, aucune capture et aucun résultat navigateur réussi ne sont revendiqués. Le relevé exact est dans [BROWSER_QA.json](reports/BROWSER_QA.json).

Dans un environnement où Playwright et Chromium sont disponibles :

```bash
node production-archives/rec-media/v23/prototype/test-browser.mjs
```

La recette produit un nouveau rapport et des captures uniquement dans `prototype/reports/`. Elle ne réécrit aucune preuve historique. Les périphériques physiques, le lecteur d’écran réel, l’intégration au moteur, la progression persistante, les migrations de sauvegarde, les comptes invités et la liaison de service restent à développer et vérifier.

## Raccordement aux guides

- [Bible d’application Resident Evil Combat](../../../../docs/combat-bible/README.md).
- [Guide général original v1.0](https://drive.google.com/file/d/14o_RrgXucs8Km-x1LQJtMK7rol6mENKy/view?usp=drivesdk).
- [Extension 01 originale](https://drive.google.com/file/d/1rYxKLIbz67L1sstmJWsga76uK7cX2mXF/view?usp=drivesdk), section 32 : propriétaires d’aperçu, confirmation, désélection et navigation rapide.
- [Extension 02 originale](https://drive.google.com/file/d/1qr8hgvvjFqdWzcGaf1DPeKromk75bBn0/view?usp=drivesdk), sections 51–64 : quatre axes, conditions, attribution, expiration, hors ligne, permissions et recette.
- [Guide gamedev du dépôt](../../../../docs/GAMEDEV_GUIDANCE.md) et [game-ui-ux, révision épinglée](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/game-ui-ux/SKILL.md).

La présence de ce prototype dans le PR ne signifie pas qu’il est installé dans le jeu en production. Aucun autre fichier, moteur, contrat, sauvegarde, workflow ou garde historique n’est modifié par ce dossier.
