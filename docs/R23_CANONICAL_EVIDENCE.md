# R23 — citations, périmètre et contradictions documentaires

La page `modules/fidelity-r23/canonical/index.html` permet de chercher les
**389 identités** par nom, UID, jeu ou citation. Les filtres distinguent les
gestes décrits, les points faibles, les alias explicitement nommés et les
dimensions corporelles citées. Elle conserve le titre et la source liés à chaque
UID sans présenter ce titre comme la validation d’un alias ou d’une phase.

Le lot comporte **38 citations relues pour 19 identités** : trois alias
documentaires, 19 gestes ou propriétés de mouvement, 15 descriptions de faiblesse
et une longueur corporelle annoncée. Les citations restent dans leur langue
d’origine. Chaque citation renvoie à sa page, à son empreinte et à une copie gzip
des octets complets de la réponse HTTP. Les instantanés ne sont pas exécutés par
l’application. Les textes distants sont affichés avec `textContent`.

Les **389 copies de pages** comprennent 371 sources du catalogue et 18 articles
supplémentaires ; un même article peut apparaître dans plusieurs collectes.
**258 identités** conservent aussi les mentions supplémentaires trouvées dans ces
articles. Une mention de nom dans un article qui compare originaux et remakes
n’est pas une confirmation de la forme, d’un geste ou de ses dimensions.

## Résultats de la revue

- Le Stinger de RE0 est décrit comme atteignant **jusqu’à trois mètres de
  longueur, pinces comprises**. La source secondaire ne fournit pas une mesure
  indépendante. Ce nombre n’est ni une hauteur ni une longueur du seul tronc.
- Le saut de **20 mètres** attribué à Krauser de RE4 original reste une citation
  de mouvement non corroborée. Ce n’est jamais une dimension corporelle.
- La mutation du **bras gauche** de Krauser est explicitement citée ; aucune
  symétrie ni variante du remake ne lui est attribuée depuis cette phrase.
- Les descriptions du Tyrant de RE1 original et du remake disent que son cœur
  exposé **ne le rend pas vulnérable**. La négation est conservée, sans créer un
  point faible à partir d’une simple occurrence du mot « heart ».
- La variante Forest de **One Dangerous Zombie** reste distinguée du Forest
  ordinaire. Ses grenades appartiennent au mode nommé dans la citation.
- Deux sources divergent sur l’origine virale du **Licker beta de RE5** :
  Evil Resource indique Progenitor, Blackjack Rants indique Uroboros. Les deux
  phrases et leurs empreintes sont conservées dans `conflicts`. L’index ne
  choisit pas une version et ne modifie aucune donnée de jeu.

Les 21 pages du sous-ensemble relu ont été reconsultées le 23 octobre 2026 et ont
toutes répondu HTTP 200. Les cinq pages officielles suivantes ont répondu 403 :

- `https://game.capcom.com/residentevil/en/`
- `https://www.residentevil.com/`
- `https://www.residentevil.com/re4/en-us/`
- `https://www.residentevil.com/village/us/`
- `https://www.residentevil.com/7/`

Ces refus restent des observations d’accès, pas des références primaires
consultées. Le lot compte **zéro preuve primaire**, zéro répertoire complet de
commandes, zéro échelle corporelle certifiée et zéro fidélité complète certifiée.
Il fait progresser G-PÉRIMÈTRE, G-PREUVES, G-COMMANDES et G-ÉCHELLE sans les clore.

## Reproduire et vérifier

Le manifeste a le schéma `re.bow.canonical-evidence-index/1`. `sources` expose les
URL demandées et effectives, horodatages, tailles, SHA-256 bruts, chemins des
instantanés et empreintes gzip. `entries` expose les UID, jeux exacts, titres,
citations, mentions supplémentaires et limites. Les citations ont un statut de
revue documentaire ; elles ne certifient pas une géométrie ou une animation.

Les vérifications fonctionnent depuis les fichiers versionnés, sans les caches
de collecte ignorés :

```sh
python3 -m unittest discover -s tests -p 'test_canonical_evidence_r23.py' -v
CHROME_BIN=/usr/bin/chromium node tests/browser-canonical-r23.mjs
```

Les six tests Python contrôlent notamment les octets des copies conservées,
l’existence des citations dans leur article, le refus d’un autre jeu, des données
altérées, d’un chemin sortant du cache et de la transformation d’un saut en taille.
Les contrôles navigateur couvrent bureau et mobile, les téléchargements, le
parcours clavier, les négations, les divergences, les liens vers une fiche et
l’affichage inerte d’un texte contenant du HTML.

La reconstruction depuis les caches de recherche disponibles utilise :

```sh
python3 scripts/build-canonical-evidence-r23.py \
  --source-cache /workspace/scratch/bow-source-research \
  --additional-cache /workspace/scratch/bow-additional-research \
  --refresh-cache /workspace/scratch/r23-canonical/fresh \
  --official-checks /workspace/scratch/r23-canonical/official/official-checks.json
```

Le générateur vérifie les réponses conservées avant toute citation. Les sorties
sont autonomes ; l’exploration de toutes les phases, mesures, commandes et preuves
primaires reste à poursuivre.
