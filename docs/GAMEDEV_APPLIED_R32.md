# R32 — application des guides gamedev aux commandes et aux outils

Cette révision applique les guides `input-systems`, `game-ui-ux` et `performance-optimization` référencés dans [GAMEDEV_GUIDANCE.md](GAMEDEV_GUIDANCE.md). La base publiée est `413b89bfafc18abc55be1404ff77bdaf573b1334` (R31). Le package conserve sa version `0.7.3` et les contrats de replay existants.

## Comportements corrigés

### Technique directionnelle du duel catalogue

Dans `src/trial-input-v071.js`, gauche et droite maintenues ensemble produisent désormais une direction horizontale neutre. Le calcul correspond à celui du moteur `CQCCombat060.directionSlot`. Il s'applique après la combinaison clavier, pointeurs et manette, donc également aux directions provenant de deux appareils. La direction basse reste prioritaire ; la résolution avant/arrière suit l'orientation au moment où la commande est consommée.

La reproduction dans la page de duel livrée montrait une technique **avant** avec gauche + droite + L. Le nouveau test utilise les boutons Démarrer/Passer l'intro, les événements clavier fiables de Chromium, la boucle de simulation et l'export/relecture du vrai replay. Le moteur démarre une seule attaque et enregistre désormais la technique neutre.

### Confirmation et retour dans le menu

Dans `src/game-menu-r20.js`, la répétition automatique d'Entrée, d'Espace ou d'Échap ne traverse plus plusieurs écrans. Le premier appui conserve l'activation native des boutons ; les flèches répétées et les listes natives continuent de fonctionner. Les événements déjà consommés par un autre gestionnaire restent respectés.

Les témoins avant correction reproduisent Entrée traversant démarrage → accueil → modes, Échap traversant commandes → options → accueil, et Espace activant Jouer au relâchement après la sortie du démarrage.

### Retour navigateur et mesure de performance

Dans `modules/fidelity-r31/performance/page.js`, chaque mesure appartient au moniteur et au document qui l'ont lancée. Quitter la page termine la mesure et conserve son relevé partiel ; un retour depuis le cache de navigation rétablit les commandes. Le joueur doit lancer explicitement une nouvelle mesure.

Un changement de mode ou un rechargement du cadre efface l'ancien résultat. Une promesse provenant de l'ancien document ne peut plus remplacer le relevé courant. Le test comprend un vrai aller-retour navigateur avec `pageshow.persisted`, ainsi que des événements de cycle de vie simulés identifiés séparément.

### Titres lisibles à 200 % sur écran étroit

Deux défauts préexistants de reflow ont été identifiés dans les exécutions R31 antérieures à cette révision : les pages Audio et Illustrations corporelles débordaient à 320 px avec un texte agrandi à 200 %. Leurs titres autorisent maintenant le retour à la ligne à l'intérieur des mots lorsque l'espace l'exige. Les deux changements CSS sont bornés à cette propriété ; aucune règle de masquage du débordement n'est ajoutée.

## Complément R32 — commandes du catalogue et perte de focus

Après la validation de `fb3ba2fc533b395ac7951356a15468cce7d9af93`, l'examen des guides `input-systems` et `game-ui-ux` a reproduit deux autres défauts dans `src/catalog-duel-v070.js`.

Les six boutons de déplacement, accroupissement, garde, saut et dash recevaient bien les événements clavier et les clics natifs du navigateur, mais aucun gestionnaire ne transmettait ces actions au moteur. Le complément reprend la gestion par source d'entrée déjà utilisée dans le duel Évolutions : la commande maintenue dure jusqu'au relâchement, à la perte de focus du bouton ou à une interruption ; une action ponctuelle ne se répète pas avec le clavier. Les entrées clavier et pointeur gardent des propriétaires distincts.

Une fenêtre visible mais inactive continuait également à accepter Start à la manette, annulant ainsi la pause de sécurité. L'échantillonnage ignore maintenant les commandes lorsque la fenêtre est inactive ou masquée. Au retour, le premier échantillon rétablit la référence de la manette sans déclencher d'action. Le combat reste en pause ; maintenir Start pendant l'interruption ne vaut pas une nouvelle demande de reprise. Le retour depuis le cache de navigation conserve cette règle.

Le complément change le contrôleur de page et ses recettes, sans modifier la simulation, les données de combat, les identifiants ou les contrats de replay. Les archives et assertions historiques gardent leur périmètre précédemment validé.

## Vérification avant/après du premier lot

Les résultats détaillés, empreintes des sources et limites figurent dans [GAMEDEV_APPLIED_R32.json](GAMEDEV_APPLIED_R32.json). Les nombres sont des groupes de scénarios, et non des appareils physiques certifiés.

| Suite ajoutée | Avant : réussis / échecs | Après : réussis / échecs |
| --- | ---: | ---: |
| Résolution des commandes, VM Node | 2 / 5 | 7 / 0 |
| Page de duel, attaque réelle et replay | 10 / 2 | 12 / 0 |
| Menu, clavier Chromium | 4 / 3 | 7 / 0 |
| Cycle de vie de la mesure | 1 / 4 | 5 / 0 |
| Titres des pages Audio et Illustrations | 4 / 2 | 6 / 0 |
| **Total comportemental** | **21 / 16** | **37 / 0** |

Sur le code corrigé, les suites existantes `verify-v071`, `verify-catalog-replay-r7`, `verify-menu-r20` et `verify-performance-access-r31` ont également réussi : **67 groupes, 0 échec**. Leurs rapports de travail ont été recueillis séparément, puis les fichiers historiques ont été restaurés à leurs octets d'origine. La garde R32 et ses **28 cas de contrôle** ont été exécutés avec succès sur le vrai diff Git.

Environnement local : Node `24.22.1`, Playwright `1.62.1`, Chrome `156.0.8078.73`. Le workflow utilise ses versions explicitement épinglées et produit ses propres résultats : les résultats locaux ne sont pas présentés comme une exécution de cet environnement CI.

Les suites navigateur de commandes et de menu emploient les vrais contrôleurs et DOM, avec une image de remplacement pour les ressources raster. La suite de mesure emploie la vraie page et le vrai moniteur dans un cadre de jeu de test. La suite de reflow utilise les vrais HTML/CSS et polices, avec des scripts inertes pour isoler les titres ; les tests R31 courants couvrent séparément les pages enrichies. Ces preuves locales ne certifient pas les visuels, les appareils physiques, le tactile réel, la fréquence physique d'affichage ou la mémoire GPU totale. Les cas unitaires couvrent les deux orientations et les combinaisons d'appareils simulés.

## Vérification du complément catalogue

La référence de départ du complément est `fb3ba2fc533b395ac7951356a15468cce7d9af93`. Ses **35 exécutions GitHub Actions étaient terminées avec succès** : 23 workflows de PR et 12 exécutions push, dont les sept anciennes suites navigateur R31 sur le code courant. Ce constat porte sur cette référence exacte, pas sur un commit ultérieur.

| Nouvelle recette | Avant : réussis / échecs | Après : réussis / échecs |
| --- | ---: | ---: |
| Boutons du catalogue, clavier et replays | 0 / 30 | 30 / 0 |
| Focus, manette et retour navigateur | 4 / 3 | 7 / 0 |
| **Total du complément** | **4 / 33** | **37 / 0** |

La suite des boutons couvre 1280 et 390 px, les six actions avec Entrée/Espace, l'Entrée du pavé numérique, les répétitions, la coexistence clavier/pointeur, la tabulation, le relâchement et les nettoyages lors d'un changement d'état. L'import de replay est également testé directement pendant un maintien actif. Les événements clavier et souris sont émis par Chromium ; chaque scénario accepté vérifie le replay déterministe et l'absence d'écriture de progression.

La suite de focus obtient de vrais événements `blur` et `focus` du navigateur en désactivant explicitement l'émulation de focus de Playwright. La page reste visible pendant la perte de focus. Elle vérifie aussi une vraie restauration BFCache, avec identité du document conservée et `pageshow.persisted`, ainsi que la reprise en mode CPU. Le test de visibilité synthétique est identifié séparément. La manette standard et les images sont des fixtures ; ces résultats ne certifient pas un périphérique physique ou un lecteur d'écran.

Les trois recettes existantes réexécutées sur le contrôleur final ont passé **65 groupes, aucun échec** : v071 (22), v073 (19), catalogue/replay R7 (24). Leurs anciens rapports ont été restaurés après collecte. La résolution directionnelle R32 a été revérifiée dans le navigateur (**12/12**) et en VM (**7/7**). La garde du complément catalogue accepte exactement **14 fichiers modifiés et 15 ajouts** par rapport à R31, et ses **32 cas de contrôle** passent. Les contrats runtime et catalogue restent identiques. Une revue indépendante du correctif et des nouvelles recettes a confirmé le périmètre.

Les preuves détaillées du complément sont regroupées dans `catalogControlsFollowUp` du JSON associé. Les commandes exécutées utilisent `node tests/browser-catalog-controls-r32.mjs` et `node tests/browser-catalog-focus-r32.mjs`, avec `CHROME_BIN` pointant vers Chromium. Pour reproduire le témoin avant correction, extraire `src/catalog-duel-v070.js` au commit de départ dans un fichier temporaire puis fournir respectivement `--source=<fichier>` ou `--catalog-source=<fichier>`. L'option `--report=<fichier>` conserve chaque résultat séparément.

## Complément R32 — lecture des mouvements au clavier

Le contrôleur `modules/fidelity-r31/motion/page.js` distinguait mal l'appui initial des répétitions d'Espace. Le corps réel du module, exécuté avec des fixtures explicites de DOM, d'images, de manifeste et de RAF, a reproduit une alternance lecture/pause à chaque répétition. Le correctif conserve une seule transition par appui. Les flèches répétées, Début et Fin gardent leur rôle de déplacement dans la scène.

Sur le bouton LIRE/SUSPENDRE, la première activation reste celle du navigateur. Le filtre empêche seulement les répétitions d'Entrée/Espace sans fabriquer de clic. Sur l'image, les raccourcis Ctrl/Alt/Meta et les événements déjà consommés sont respectés. La simulation de combat, les médias, le lecteur d'images et les contrats de replay ne changent pas.

La reproduction avant publication utilise V8 avec des dépendances simulées ; elle n'est pas présentée comme une exécution Chromium. L'environnement local étant indisponible, la recette navigateur est exécutée par le workflow R32. La référence précédente `7c777b8f29292e0eded224cda2abc06ae8796bc9` dispose déjà d'une [CI R32 réussie](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/40897591190), soit 74 groupes comportementaux et 32 cas de garde, ainsi que d'une [QA générale et d'un build réussis](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/40897591377). Ces résultats restent attribués à cette référence.

### Recette du nouveau lecteur

`tests/browser-motion-input-r32.mjs` sert le vrai HTML, le lecteur d'images, les manifestes et les atlas du dépôt. Il vérifie dix scénarios par version, à 1280 et 390 px. Pour le témoin, seul `page.js` est remplacé par ses octets extraits du commit `7c777b8f` ; aucune ancienne source n'est écrite dans le checkout.

Les contrôles comprennent la synthèse native des clics Entrée, Entrée numérique et Espace, la répétition des touches, les raccourcis modifiés ou consommés, les flèches et les extrémités, le curseur de position, la liste de vitesse et le stockage inchangé. Les événements enregistrés doivent être fiables (`isTrusted`). Les atlas sont décodés par le lecteur original et soumis à ses vérifications d'empreinte.

La recette exige quatre contrôles témoins réussis et six reproductions des défauts connus avec leurs raisons précises, puis dix scénarios réussis sur la nouvelle source. Une erreur de chargement ou un délai dépassé ne peut pas servir de preuve du défaut attendu. Le résultat effectif est écrit dans `qa-gamedev-r32/motion-input.json` et publié par le workflow ; la présente définition n'est pas un résultat navigateur anticipé.

La garde de la révision complète borne désormais 15 fichiers modifiés et 16 ajouts par rapport à R31. Elle contrôle exactement les deux transformations du lecteur et comporte 34 cas de contrôle. Aucune autre suite n'est déplacée vers une archive. Les résultats de CI doivent toujours être lus sur le commit effectivement livré.

## Complément R32 — commandes du combat avec évolutions

La référence de départ est `a8e8996d2a1d50fc99872bf02e4420b44b81167a`. Sur ce commit, la [CI R32](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/40901306068) a exécuté **84 groupes comportementaux et 34 cas de garde**, tous réussis. La recette du lecteur de mouvements a confirmé ses quatre contrôles témoins, ses six défauts attendus et dix scénarios corrigés. La [QA générale et le build](https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/40901305835) ont aussi réussi. Ces résultats concernent ce commit antérieur au présent complément.

### Correction dans le contrôleur Évolutions

`modules/fidelity-r28/evolutions/duel.js` possédait encore son propre lecteur de manette sans contrôle du focus. Une reproduction V8 exécutant le contrôleur et le gestionnaire d'entrées réels, avec des dépendances explicites de DOM, RAF, manette et combat, a montré Start reprenant une fenêtre visible mais inactive. Une pression encore non échantillonnée au retour produisait également une reprise. Le même montage a confirmé que l'Entrée du pavé numérique n'activait pas le bouton GARDE. Cette reproduction ne vaut pas une exécution navigateur ou une preuve du moteur de combat.

Le correctif applique à ce contrôleur la suspension et la remise à jour des références de manette déjà validées dans le catalogue. Une perte de focus ou le masquage suspend le combat ; le retour ne constitue pas une commande de reprise. Le premier échantillon après retour est neutralisé, puis un nouveau front Start peut reprendre. Les événements de navigation conservent la pause lors d'une restauration du même document.

Le lecteur distinct du bouton Select respecte aussi le focus. Le nettoyage existant reste intégralement conservé : il annule les demandes d'évolution en attente et réinitialise leur référence de manette à chaque pause/reprise. Une évolution reste volontaire. L'ajout de `NumpadEnter` réutilise les sources de maintien indépendantes déjà employées par Entrée et Espace.

Le contrat Évolutions, digest `a4bf5c42ebd70c803e99412113ce5e30a1b52ffb56cb7e5143fd75f2d5c63893`, couvre neuf sources et exclut ce contrôleur de page. Aucune de ces neuf sources, aucune règle d'évolution et aucun pack de replay ne sont modifiés.

### Recette courante et conservation des anciennes preuves

`tests/browser-evolution-input-r32.mjs` sert le montage HTML Évolutions original, ses contrôleurs et le vrai moteur/replay. Son témoin remplace uniquement le contrôleur de page par les octets de `a8e8996d`. Les commandes clavier, le focus et le retour BFCache sont produits par Chromium ; les images raster et la manette standard sont des fixtures déclarées. Les deux cas portant sur une demande d'évolution isolent l'horloge RAF et atteignent les conditions par de vrais ticks, sans modifier directement la santé ou la jauge.

La recette exige **cinq contrôles témoins réussis et cinq défauts précis**, puis **dix scénarios réussis sur le contrôleur courant** : Start hors focus, appui maintenu au retour, BFCache, maintien/relâchement des boutons à 1280 et 390 px, pause/reprise CPU, Select et annulation d'une demande. Un échec de chargement ou un délai dépassé ne constitue pas une reproduction acceptée.

La même commande rejoue aussi les **16 groupes de `tests/browser-evolutions-r28.mjs` inchangé sur le checkout courant**. Son ancien rapport est sauvegardé avant exécution, puis restauré à ses octets exacts ; seul le nouveau résultat rejoint `qa-gamedev-r32/evolutions-existing`. Cela apporte une preuve actuelle, car le workflow R28 existant teste déjà sa recette navigateur sur une archive publiée. Aucun test supplémentaire n'est déplacé vers une archive.

Les résultats effectifs appartiennent aux rapports CI du commit livré. Les comptes ci-dessus décrivent les critères de la recette avant son exécution, sans annoncer un succès anticipé. La garde complète autorise désormais **16 fichiers modifiés et 17 ajouts** par rapport à R31 ; ses **37 cas** conservent les refus de changements hors périmètre et ajoutent la protection du contrôleur Évolutions et de sa recette.

## Conservation des versions publiées et validation courante

Les anciennes validations R19/R20 et R31 imposent des empreintes de sources publiées. R32 ne remplace ni leurs empreintes attendues, ni leurs rapports par de faux résultats actualisés.

- `npm run verify:current` exécute d'abord la garde R32, ses cas négatifs, puis les **38 autres commandes originales** de `npm run verify` dans leur ordre et la nouvelle suite d'entrées.
- `npm run verify:historical:r31` exécute les deux suites originales de conservation R19/R20 sur une archive Git du commit publié R31, avec leurs assertions intactes.
- `npm run verify` exige les deux étapes. Les entrées dédiées aux sauvegardes et à R20 exposent également ce partage.
- `npm run verify:r32` contrôle le périmètre courant et les entrées ; `npm run verify:r32:http` exécute les huit recettes R32 sur les fichiers courants, dont les commandes et le focus du catalogue, la lecture des mouvements au clavier et les entrées Évolutions. Cette dernière rejoue aussi les 16 groupes de l'ancienne recette navigateur Évolutions, inchangée, sur le checkout courant.
- Le workflow R31 conserve ses audits de provenance et son build sur le commit publié explicitement fixé. Ses sept anciennes recettes navigateur sont exécutées, avec leurs assertions intactes, sur la révision courante : elles vérifient notamment les corrections de reflow avec les vrais médias. Les libellés distinguent ces deux périmètres. La dépendance `axe-core` est installée explicitement comme dans les autres workflows d'accessibilité.
- R23/R24 continuent leurs vérifications courantes et exécutent leur seule assertion de conservation R20 sur l'archive publiée. R28 exécute `npm run verify` avant de régénérer ses rapports de travail.
- Les suites d'intégration R25/R26 contiennent elles aussi une assertion imposant l'identité des sources historiques. Elles sont exécutées intégralement sur l'archive publiée, avec leurs assertions intactes. La garde R32 s'exécute avant les générateurs de ces workflows et vérifie que tous leurs autres fichiers restent inchangés. Les autres recettes de ces workflows sont conservées. Les nouveaux journaux du runner sont publiés comme preuves d'archive ; leurs JSON historiques ne sont pas présentés comme de nouveaux résultats.

La garde `scripts/verify-current-r32.mjs` compare l'ensemble du diff à R31. Elle refuse tout chemin inattendu, suppression, renommage, modification de données, d'assets, d'anciens tests ou de preuves historiques. Les transformations des commandes, du menu, du lecteur de mouvements et du contrôleur Évolutions sont bornées aux hunks relus ; le contrôleur catalogue doit correspondre à l'empreinte de sa nouvelle source R32 relue. Cette empreinte ne remplace aucun manifeste historique. Les commandes de vérification, références d'archives et workflows sont contrôlés exactement. Les tests de faute modifient uniquement des copies en mémoire.

Cette révision corrige les interactions décrites. Les critères artistiques et de fidélité encore ouverts dans R31 restent ouverts. Le commit de la branche et les exécutions GitHub Actions constituent la référence pour l'état d'intégration ; le présent document ne prétend pas que la branche a été fusionnée ou déployée.
