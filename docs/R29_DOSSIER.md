# Dossiers R29 — corps, sources et éditions

L’adaptateur R29 ajoute un panneau aux Dossiers existants, à partir d’un index de **389 UID exacts**. Il expose les seuls changements R29 : versions corporelles actives, requalifications de pose, références de modèles et images de clés natives. Les sections historiques restent accessibles.

Les **cinq révisions actives** sont distinctes des **quatre variantes documentaires HD/PC2013**. Les variantes Ooze ne remplacent pas les PNG des incarnations Nintendo3DS2012 et ne ferment pas leurs corps cibles. Chaque lien de variante indique son édition et ouvre directement le choix correspondant dans la galerie.

Les PNG historiques de Wall Blister et Scagdead restent conservés, avec leur source HD/PC2013 et leur comparaison avec l’incarnation Nintendo3DS2012 explicitement ouverte. Ces deux précisions n’ajoutent ni pixel, ni revue de pose, ni variante documentaire.

Les références corporelles sont regroupées par modèle, édition, variante et équipement. Les liens pointent vers les seules vues PNG locales du même sujet, avec leur SHA. Aucun de ces PNG n’est chargé automatiquement par le Codex. Les six modèles corporels produisent 24 vues ; les 24 scènes natives pour six UID produisent 384 images de clés et 24 vues de pose, consultables dans leur lecteur. Les gestes restent non attribués et aucun cycle de combat n’est admis à partir de ces images.

Une pose neutre comportant une lacune d’apparence connue reste explicitement retenue. Anatomie entière, équipement complet et autres phases demeurent des qualifications distinctes. Une présentation, une vue frontale, une rencontre contextuelle ou une variante d’édition n’ouvre aucun état idle.

Le champ historique `completeBodyReferenceVerified` peut conserver la déclaration initiale du job, même si une observation manuelle ultérieure démontre un corps source entier. L’index conserve ce booléen et projette séparément `activeSourceBodyObserved` et `spriteChange.sourceBodyObserved`. Pour les dix cas hérités concernés, le constructeur vérifie réellement l’UID, l’empreinte du PNG, l’observation conservée, la référence déclarée dans la provenance et les octets de la comparaison visuelle. Il ne déduit pas la complétude source du seul `fullBodyReviewed`.

Le transport est limité à 512 Kio. Les UID inconnus ou répétés, liens de vues distants ou hors périmètre, mutations d’édition en corps cible et états de combat attribués aux images natives sont refusés. La grille et la pagination du Codex refluent avec le texte doublé ; le panneau conserve le focus de son détail ouvert au clavier.

```sh
python3 scripts/build-dossier-additions-r29.py --check
python3 tests/test_fidelity_r29.py
node tests/browser-fidelity-r29.mjs
```

La recette navigateur commune vérifie les trois parcours du suivi et les sept parcours des Dossiers, dont les liens SHA sans chargement d’image, l’édition source, les variantes, les notes d’édition historiques, les lacunes d’apparence et les données forgées. Les tests Python utilisent des fixtures explicites pour la conservation des 42 feuilles historiques et les frontières d’UID, de source et d’édition.
