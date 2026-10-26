# R27 — citations et contraintes d’apparence

Le lot ajoute **84 assertions documentaires pour 81 incarnations qui n’avaient encore aucune citation revue**. Le cumul des lots R23 à R27 atteint **356 UID sur 389** ; **33 restent sans nouvelle assertion validée**. Les pages vides ou ne contenant que catégorie et localisations ne sont pas complétées par déduction.

Les assertions utilisent **36 copies de sources conservées en R23**, dont les empreintes compressées et décompressées sont revérifiées : Evil Resource, Blackjack Rants et Bogleech. Il n’y a pas de nouvelle capture primaire, de recoupement entre éditeurs ajouté ou d’indépendance des observations originales certifiée. Un commentaire artistique reste explicitement secondaire.

Le lot distingue **51 descriptions de forme, 25 gestes/comportements, quatre limites de périmètre et quatre vulnérabilités**. Les éditions originales et remakes, formes humaines et mutées, DLC, acteurs et négations restent attachés à chaque citation.

## Exemples conservant leurs limites

- La bouche à la main **gauche** de Lucas concerne sa forme mutée dans **Not a Hero**. Le refus d’un combat direct de Lucas humain concerne le jeu principal et reste une négation dans ce contexte.
- Le Plaga autonome de **RE4 Remake** a huit pattes et une queue recourbée d’après le commentaire cité ; les quatre pattes de la version 2005 ne lui sont pas attribuées.
- La première mutation de Méndez conserve ses jambes dans la citation ; cette description ne devient pas une preuve de la seconde mutation détachée.
- Fumer WM-002 a du mycélium blanc dans **Not a Hero** ; cette apparence ne recolore pas les Molded du jeu principal.
- La présence physique de Baby et l’identification du Commandant à HUNK restent des incertitudes explicites. Le groupe Chunk ne distingue pas arbitrairement les apparences des deux frères.

## Aide à la génération des sprites

[appearance-constraints.json](../modules/fidelity-r27/canonical/appearance-constraints.json) contient 55 citations liées au manifeste par SHA : 51 contraintes de forme et quatre limites de portée séparées par le champ `type`. Les limites `scope` restreignent ce qui peut être affirmé ; elles ne créent pas d’anatomie. Chaque entrée conserve UID, phase, polarité, citation et source.

Ces textes servent à comparer les détails des références visuelles propres à chaque incarnation. Ils ne donnent ni une vue manquante ni une géométrie exacte et ne certifient pas les images générées, les mouvements natifs, les mesures corporelles ou un répertoire complet.

## Reproduction et consultation

Ouvrir [le lecteur](../modules/fidelity-r27/canonical/index.html), avec un fragment `#UID` pour rejoindre une fiche précise. Les citations sont recherchables et leurs copies gzip restent téléchargeables. Les textes d’un index modifié restent inertes ; un index incomplet ou une copie distante est refusé.

```sh
python scripts/build-canonical-evidence-r27.py --check
python -m unittest discover -s tests -p test_canonical_evidence_r27.py -v
node tests/browser-canonical-r27.mjs
```

Neuf tests Python et cinq groupes Chromium réussissent. Les résultats sont [R27_CANONICAL_VALIDATION.json](R27_CANONICAL_VALIDATION.json) et [R27_CANONICAL_BROWSER.json](R27_CANONICAL_BROWSER.json). Les captures mobiles ont été inspectées. **Fidélité globale, tailles corporelles, répertoires complets et captures primaires certifiés : zéro.**
