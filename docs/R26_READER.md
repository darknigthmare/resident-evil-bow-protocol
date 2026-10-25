# Lecteur de sources et positions R26

Le lecteur `modules/fidelity-r26/models/index.html` rassemble **66 références**, dont **587 fichiers à clés** cumulés. Les modèles, archives, textures, poids, pistes et temps restent ceux des publications importées. Les 51 entrées R25 et leurs fichiers restent inchangés ; le catalogue R26 rétablit uniquement leurs chemins relatifs depuis la nouvelle page. Les références exactes et candidates, corps et objets associés restent séparés. Le rendu Three.js sert à examiner les sources ; il ne certifie pas le rendu Capcom ni un sprite de combat fini.

## Positions partageables

Le bouton « Préparer le lien de cette position » produit une URL locale contenant le modèle, le fichier de mouvement, la position native en secondes et son SHA-256. Il met la lecture en pause et sélectionne le champ du lien. Il n’accède pas au presse-papiers. À l’ouverture, les octets sont vérifiés avant d’appliquer la position ; aucun lien ne déclenche la lecture. Une empreinte différente, un fichier absent, un doublon de paramètre ou une position invalide/hors durée provoque un refus explicite et une inspection depuis le début. Une nouvelle sélection efface l’attestation de position précédente.

Les six fichiers DM_123/124 R26 possèdent une pré-clé négative et une fin native à zéro. Ils restent des poses fixes, avec durée de lecture zéro et bouton de lecture désactivé. Leur intervalle documentaire incluant la pré-clé n’est pas transformé en durée d’animation artificielle. Les autres poses fixes à durée positive gardent aussi leur statut.

## Comparer une image publiée

Lorsqu’une entrée contient un aperçu de la publication, une case permet de l’afficher à côté du parcours d’inspection, après vérification de ses octets. Cette image ne modifie ni le modèle ni sa position. La page distingue la caméra/pose/éclairage de l’image publiée du rendu d’examen ; elle n’invente aucune image pour les archives sans aperçu. Une image corrompue n’est pas affichée. Le Blob est libéré à la fermeture, à la sélection suivante et au départ de la page.

## Mémoire et conservation

Le lecteur réutilise Three.js 0.180.0 et les vérificateurs R24, sans copie du moteur ni des ressources historiques. Les ressources ordinaires gardent la limite de 40 MiB et les membres FBX animés celle de 12 MiB. R26 autorise une seule ZIP explicitement choisie de 96 MiB au maximum afin de lire l’archive Pincer originale de 85 352 847 octets. La limite R25 de 80 MiB reste inchangée.

Le flux est copié directement dans un buffer de la taille déclarée, sans garder tous les fragments en plus de leur copie. Un flux court, trop long, interrompu ou de mauvais SHA est refusé. Le cache lie URL, SHA et taille ; il libère la ZIP précédente avant un nouveau téléchargement. Cette borne n’est pas une certification de la mémoire totale du navigateur : modèles décompressés, textures, buffers GPU et chargements simultanés du navigateur consomment aussi de la mémoire.

Les commandes au clavier, clés natives, réduction des mouvements, repli sans WebGL, perte/restauration du contexte, absence de lecture automatique, réponses périmées et libération au départ de la page reprennent le comportement contrôlé R25. Le contexte graphique cloud n’atteste pas les appareils physiques.

## Dossiers cumulatifs

`dossier-index.json` emploie `re.bow.dossier-source-index/2` pour les 389 UID : modèles attribués/candidats, groupes audio documentés R25/R26, citations R23/R24/R25/R26, et planches dérivées R26. Les groupes restent liés à leur livraison ; ils ne deviennent pas une banque native ou une attribution de son à une action. Les neuf planches possèdent 72 vues sans miroir et restent explicitement « pas les sprites du jeu » et « pas des sprites de combat terminés ».

Le nouvel adaptateur remplace visuellement la section R25 uniquement après validation complète de l’index R26. Un échec conserve le parcours historique. Aucun changement d’image du bestiaire, état de combat, stockage du jeu ou lecture audio automatique n’est introduit.

## Reproduction

```sh
python scripts/build-model-catalog-r26.py --check
python scripts/build-dossier-source-index-r26.py --check
node tests/verify-model-reader-r26.mjs
node tests/browser-models-r26.mjs
node tests/browser-access-r26.mjs
```

Les preuves sont enregistrées dans `docs/R26_READER_ASSET_TESTS.json`, `docs/R26_READER_BROWSER.json`, `docs/R26_READER_FOLLOWUP.json` et `docs/R26_ACCESS_BROWSER.json`. Le contrôle intégral du lecteur couvre les 359 nouveaux fichiers à clés ; le suivi ciblé après revue couvre 17 fichiers (dix mouvements et sept poses), la remise à zéro des attestations de position et la liaison du cache à l’empreinte et à la taille. Les tests distinguent des archives, scènes et positions vérifiées d’une certification artistique 1:1, qui reste fausse.
