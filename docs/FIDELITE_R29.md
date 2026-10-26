# R29 — Corps, poses et images natives

Le [classeur R29](BOW_FIDELITE_R29.xlsx) ajoute sept feuilles aux 42 feuilles R28, conservées avec leurs relations. Le [suivi central](../modules/fidelity-r29/index.html) expose les 17 chantiers ouverts et les 389 identités.

R29 compte 5 versions corporelles remplacées et 106 poses existantes requalifiées. Le cumul reste de 363 identités avec PNG actif et 22 refus conservés. 112 corps anatomiques sont revus et 32 attentes statiques sont admissibles. L’équipement et les autres phases gardent leurs critères propres.

4 versions documentaires appartiennent à une autre édition et ne remplacent pas le PNG actif. Les interprétations HD/PC2013 des formes Ooze restent distinctes des incarnations Nintendo3DS2012 ; elles ne ferment aucun corps cible de cette édition.

Les anciennes interprétations R28 de Wall Blister et Scagdead conservent leurs pixels et leurs observations corporelles. Leurs notes R29 précisent désormais la source HD/PC (2013) et l’équivalence non vérifiée avec Nintendo 3DS (2012) ; aucun idle ni nouvelle revue de pose n’en est déduit.

Les modèles sources donnent 384 images de clés et 24 vues de pose. Les éditions et limites de rendu sont explicites. Les codes de clips restent non attribués ; ces observations ne certifient aucun cycle de combat jouable, timing officiel ou image originale du moteur du jeu. Les sources candidates de mauvaise phase ou édition restent hors production.

Les Dossiers relient uniquement les nouvelles preuves du même UID, sans charger les PNG automatiquement. Le lecteur permet de comparer les images natives et leurs références. Les commandes, évolutions, sons et sauvegardes R28 conservent leur périmètre historique.

La recette R29 rassemble 47 tests Python, 32 groupes Node et 34 groupes navigateur réussis. État des rapports : complet. Les résultats historiques ne sont pas recomptés comme exécutés en R29.

211 corps de combattants restent ouverts. Les rencontres contextuelles, les refus, les accessoires et les cycles complets restent séparés dans le suivi. La fidélité globale 1:1 reste non certifiée.

Preuves : [poses](../modules/fidelity-r29/sprites/index.html), [images natives](../modules/fidelity-r29/motion/index.html), [recette](R29_VALIDATION.json), [suivi structuré](R29_TRACKING.json), [reçu d’export](R29_EXPORT.json), [reproduction](R29_REPRODUCTION.json).

```sh
python3 scripts/fidelity-progress-r29.py build
python3 scripts/fidelity-progress-r29.py check
python3 scripts/fidelity-progress-r29.py export
python3 scripts/fidelity-progress-r29.py reproduce
```
