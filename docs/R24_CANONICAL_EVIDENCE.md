# R24 — nouvelles revues et recoupements précis

La page `modules/fidelity-r24/canonical/index.html` ajoute **115 citations revues
sur 78 identités**, dont **77 n’avaient aucune citation relue en R23**. Les deux
lots couvrent maintenant **96 identités relues**. Les 38 citations et les copies
R23 restent conservées ; les nouvelles fiches renvoient aux anciennes preuves.

Le lot comporte 61 descriptions de gestes ou comportements, 19 descriptions de
vulnérabilité, 11 descriptions de forme, 16 énoncés de périmètre, quatre dimensions
et quatre citations de terminologie. Il ne constitue pas un répertoire complet
de commandes. Chaque énoncé garde l’UID, le jeu exact, le sujet, l’acteur ou son
rôle, la phase, la polarité et les limites de ce qui est effectivement documenté.

## Recoupement et provenance

**14 énoncés sont recoupés entre publications distinctes**, avec une portée
commune écrite pour chacun. Les citations sont affichées côte à côte et peuvent
être vérifiées dans leurs pages conservées. Le recoupement concerne notamment les
tentacules dorsaux des Colmillos, les yeux cousus et le parasite dorsal du
Garrador, le parasite dorsal d’El Gigante, la régénération et les parasites du
Regenerator, les pointes de l’Iron Maiden, l’ouverture des Adjule et Duvalia, la
sécrétion collante et le dessous exposé de Popokarimu, les pinces et les organismes
volants de U8, et la capacité reproductive des Lickers de RE5.

Les publications utilisées sont Evil Resource, Bogleech et Blackjack Rants. Leur
indépendance signifie ici **des éditeurs distincts** ; l’indépendance de leurs
observations ou documents primaires sous-jacents n’est pas établie. Les limites
empêchent d’étendre un accord partiel à un timing, une anatomie cachée, une valeur
de dégâts ou à toute la phrase de l’autre source. Les articles de RE4 original
ne sont pas transférés au remake.

**21 citations appartiennent aux sections « Transcript » de fichiers en jeu**,
hébergées et transcrites par Evil Resource. Le validateur refuse d’utiliser leur
introduction éditoriale comme si elle faisait partie du texte du jeu. Huit
nouveaux instantanés gzip conservent ces réponses HTTP complètes :

- RE4 original : *Luis’ Memo 3*.
- RE5 : *U-8 File*, *Regarding the Mutant Organism Found in the Facilities*,
  *Tricell Researcher Miguel’s Journal — No. 1*.
- RE1 remake : *V-ACT*, *Body Disposal*, *Plant 42 Report*.
- RE0 : *Leech Growth Records*.

Ce sont des **contenus du jeu transcrits par un tiers**. Le lot n’a obtenu aucune
capture originale directe et n’a pas comparé ces transcriptions avec l’affichage
ou les fichiers natifs du jeu. Il conserve donc zéro capture primaire directe et
zéro recoupement primaire indépendant.

## Résultats qui changent la revue

Le journal de Miguel place explicitement les recherches sur les Lickers dans le
contexte de l’administration de Progenitor à des B.O.W. créés avec le T-Virus.
Cette transcription soutient la version Progenitor d’Evil Resource face à la
mention Uroboros du blog conservée en R23. La phrase dit « Lickers », sans le
suffixe beta : le jeu, le paragraphe du 7 mars et la fiche du Licker beta sont
gardés comme contexte d’attribution. Le désaccord historique reste consultable ;
la comparaison avec une capture native demeure ouverte. Aucune donnée de jeu
n’a été modifiée à partir de cet élément.

Les nouvelles dimensions gardent leur imprécision : Plague Crawler est décrit
comme mesurant **presque deux mètres de long**, certains Giant Majini comme
atteignant **presque trois mètres de haut**. Le fichier U8 annonce **« some tens
of meters tall »** pour le corps, sans nombre exact, et des pattes-pinces de
**plus de trois mètres**. La taille des membres est séparée de la hauteur du
corps. Ces citations ne fixent aucune échelle de modèle ni collision.

Quatre écarts de périmètre deviennent explicites :

- **U-8 Prime** est une variante nommée dans le fichier, avec une carapace
  renforcée. Cette mention ne prouve pas une rencontre, un modèle natif ou une
  entrée jouable ; aucun nouvel UID n’est inventé.
- Les **Plagas A, B et C** sont regroupées sous une entrée du catalogue, avec des
  capacités distinctes. Le détachement du corps n’est attribué qu’au type C.
- Le **Novistador invisible** et le **Novistador volant** sont décrits comme deux
  types. Une seule incarnation n’acquiert pas automatiquement les deux pouvoirs.
- La fiche liée au **Saddler humain de RE4 original** décrit aussi sa mutation
  finale. Ce texte ne valide pas les commandes de la forme humaine.

La seconde rencontre de Yawn conserve explicitement la négation du venin. Les
effondrements de Lisa restent temporaires. La griffe droite du Proto-Tyrant et
les débris sur le bras droit de Wesker Uroboros sont cités sans recours au miroir.
Les interventions externes contre une vulnérabilité ne deviennent pas des
commandes exécutées par l’ennemi.

## Fichiers et vérification

`modules/fidelity-r24/canonical/manifest.json` suit le schéma
`re.bow.canonical-evidence-index/2`. Il expose les citations et leurs portées,
88 sources effectivement utilisées, les écarts de périmètre et le suivi du
désaccord. Les 80 références R23 sont liées à leurs copies existantes ; seules
les huit nouvelles pages sont ajoutées. Les SHA-256 vérifient les réponses brutes
et les paquets gzip.

```sh
python3 -m unittest discover -s tests -p 'test_canonical_evidence_r24.py' -v
CHROME_BIN=/usr/bin/chromium node tests/browser-canonical-r24.mjs
```

Les huit tests Python vérifient tous les extraits et toutes les copies depuis les
fichiers versionnés, la couverture nouvelle, la séparation original/remake,
les transcriptions, le refus d’un faux recoupement entre pages d’un même éditeur,
les dimensions et les phases. Les quatre groupes navigateur couvrent bureau et
mobile, les comparaisons, les téléchargements R23 liés, le clavier, les
dimensions vagues, les négations, les variantes et le rendu inerte de HTML distant.

La reconstruction utilise les caches de collecte et le fichier de revue
versionné :

```sh
python3 scripts/build-canonical-evidence-r24.py \
  --file-cache /workspace/scratch/r24-canonical
```

Les chantiers G-PÉRIMÈTRE, G-PREUVES, G-COMMANDES et G-ÉCHELLE progressent.
Les répertoires complets, les mesures indépendantes, les rigs, les timings natifs
et la fidélité complète restent ouverts et non certifiés.
