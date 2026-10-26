# Références R28 accessibles depuis les dossiers

Le dossier d’une incarnation conserve ses liens historiques et reçoit une section R28 indépendante. L’identité est lue dans les actions réelles du dossier ouvert ; les nouveaux liens gardent exactement cet UID, y compris si le registre arrive après un changement de personnage.

L’index léger couvre les 389 identités et pointe vers les 363 poses revues, dont 106 corps visibles revus et quatre remplacements R28. Le texte distingue une région partielle, un corps entier, une pose de présentation et une attente neutre admise. Un nouveau corps entier ne devient pas automatiquement une animation ou une pose d’attente. Les limites d’apparence et d’équipement restent signalées ; une pose de rencontre n’ouvre pas un combattant libre.

Les 42 citations R28 des 33 dernières identités sont directement accessibles dans le lecteur documentaire. Elles conservent la salle, le mode, la phase et les limites des sources. Les citations R27 et précédentes restent disponibles par leurs anciens liens.

Le groupe sonore Licker conserve ses 301 fichiers attribués au sujet publié. Les 1 149 fichiers aux formes ou hôtes non résolus restent des candidats : 1 005 sont consultables depuis chacun des trois dossiers Nemesis, et 144 depuis le parasite NE-α. Ces liens multiples sont des associations candidates aux mêmes fichiers, pas des fichiers supplémentaires. Ils ne prouvent aucune attribution à une forme précise ou au parasite isolé. Le dossier ne charge ni ne joue automatiquement les sons.

L’index refuse notamment une attribution exacte inventée pour Nemesis. Un registre indisponible ou invalide masque uniquement la section R28 ; les sources historiques restent utilisables.

Vérification :

```bash
python3 scripts/build-dossier-additions-r28.py --check
node tests/browser-dossier-additions-r28.mjs
```

Les six groupes du [rapport Chromium](R28_DOSSIER_BROWSER.json) passent : liens de corps aux deux largeurs, lecture exacte des citations, distinction des sons attribués et candidats, sélection changée pendant une réponse retardée, et refus d’une attribution falsifiée. Aucun moteur, état de combat, replay ou stockage de progression n’est modifié par ces liens.
