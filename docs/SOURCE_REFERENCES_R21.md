# R21 — références statiques liées à leurs sources

Les outils R21 collectent des preuves consultables et préparent des références
statiques sans modifier les fichiers historiques R20 ni le moteur. Une image
présente sur une page communautaire reste une **référence secondaire** : sa copie
exacte ne certifie ni son authenticité native, ni la forme précise, les parties
occultées, l’orientation opposée, les mouvements ou les sons du jeu d’origine.

La collecte actuelle couvre les 389 identités du catalogue. L’import a accepté
368 références PNG : **325 références de corps et 43 références de scènes
contextuelles**. Les 21 entrées liées à des articles généraux ne reçoivent pas
automatiquement leur image de couverture. Ces nombres ne sont pas des sprites
R20 finalisés : zéro rig, clip animé ou fidélité canonique 1:1 n’est validé ici.

## Reproduire la collecte et l’import

Depuis la racine du dépôt, utiliser Python avec Pillow installé (voir
`requirements-content.txt`) et conserver les proxys et la confiance TLS fournis
par l’environnement :

```sh
python3 scripts/collect-catalog-sources-r21.py --output /workspace/scratch/bow-source-research
python3 scripts/collect-source-images-r21.py --output /workspace/scratch/bow-source-research
```

Le cache contient les pages, images brutes et métadonnées des réponses HTTP.
Créer une demande d’import à partir des candidats disponibles :

```sh
python3 - <<'PY'
from pathlib import Path
import hashlib, json
cache = Path('/workspace/scratch/bow-source-research')
report = json.loads((cache / 'catalog-image-evidence.json').read_text())
entries = []
for item in report['identities']:
    if not item['automatic_reference_candidate_present']:
        continue
    image = next(candidate for candidate in item['primary_image_candidates'] if candidate['usable_image'])
    page_key = hashlib.sha256(item['source_page'].encode()).hexdigest()[:24]
    entries.append({'id': item['id'], 'page_metadata': 'catalog-pages/' + page_key + '.json',
                    'image_metadata': image['metadata_path']})
(cache / 'import-request-r21.json').write_text(json.dumps({
    'schema': 're.bow.source-reference-import/1', 'entries': entries
}, ensure_ascii=False, indent=2) + '\n')
PY
python3 scripts/import-source-references-r21.py \
  --cache-root /workspace/scratch/bow-source-research \
  --manifest /workspace/scratch/bow-source-research/import-request-r21.json
```

La sortie par défaut est `qa-source-references-r21/`, ignorée par Git. Chaque UID
contient `reference.png` et `source-reference.json`. Le manifeste cumulatif est
`manifest.json`, schéma `re.bow.source-reference-pack/1`, avec `counts` et
`entries`. Les chemins des images y sont relatifs au dossier du manifeste.
`--output` peut désigner un autre dossier. Relancer avec les mêmes preuves est
idempotent ; des fichiers existants différents sont conservés et l’import refuse
leur écrasement. Choisir un nouveau dossier pour une collecte révisée.

## Vérifications et limites

L’import valide tous les éléments avant de créer les sorties : UID connu, page
individuelle du bon jeu, titre du sujet, réponse HTTP 200 complète, empreintes des
octets collectés, image principale réellement déclarée dans le HTML/JSON-LD de
cette page, et liaison du téléchargement à ce même UID et à cette empreinte de
page. Les lettres grecques et la ponctuation des noms sont normalisées ; certains
suffixes de route (`enemy`, `zombie`, `helicopter`) sont des qualificatifs de la
page, sans certifier la forme représentée. Un changement de jeu ou de sujet dans
une redirection est refusé.

Les PNG conservent leurs octets originaux. Un WebP est converti en PNG uniquement
si les dimensions et chaque pixel RGBA décodé restent identiques. Aucune rotation,
déformation, découpe, suppression de fond ou réflexion n’est appliquée. Les chemins
symboliques et les chemins sortant du cache sont refusés.

Les champs d’entrée ne permettent pas d’approuver une vue, une animation ou une
fidélité finale. Les sorties portent exclusivement l’état `reference`, une
orientation non revue, et des indicateurs `false` pour le miroir, le rig,
l’animation, l’intégration combat, le dessin final et la certification canonique.
Elles ne remplacent pas les ressources du jeu. Les pages, leurs horodatages et
empreintes restent des preuves de collecte, sans valoir une validation artistique.

## Classeur de preuves

L'exporteur utilise `openpyxl`, disponible dans le Python d'outillage cloud
(distinct du venv de traitement d'images). Il vérifie les empreintes du pack et
produit un nouveau classeur dans le dossier ignoré, sans modifier le suivi R20 :

```sh
python3 scripts/export-source-evidence-r21.py \
  --evidence-root /workspace/scratch/bow-source-research \
  --motion /workspace/scratch/bow-primary-research/evidence-report.json \
  --additional /workspace/scratch/bow-additional-research/additional-source-evidence.json
```

Les deux dernières options sont facultatives et désignent les dossiers de
recherche effectivement collectés dans cette tâche. `Sources 389` distingue les
imports statiques, les pages examinées individuellement et les mentions
documentaires candidates. `Séquence originale` décrit le GIF Nemesis de 150
images sur six secondes ; le décor, la caméra et l'absence d'audio empêchent de
le compter comme une animation de combattant. Les 17 chantiers restent ouverts.

Les médias supplémentaires sont archivés sous
`/workspace/scratch/bow-additional-research/` et les preuves de mouvement sous
`/workspace/scratch/bow-primary-research/`. Les articles Fandom ont renvoyé 402,
YouTube un refus CONNECT 403 et les pages officielles Capcom un refus 403 ; ces
sources ne sont donc pas déclarées visionnées. Les accès complémentaires à
`blogger.googleusercontent.com` et `vignette.wikia.nocookie.net`, rencontrés dans
les pages consultées, ont été ajoutés au brouillon de configuration et restent
à enregistrer/appliquer avant leur téléchargement.

```sh
python3 -m unittest discover -s tests -p 'test_source_reference_import_r21.py' -v
```

Les sept tests utilisent de petits pixels synthétiques pour vérifier le transport
des fichiers, la conversion, les refus de preuves incohérentes, les noms et jeux,
la préservation des sorties et la distinction des contextes. Ils ne représentent
pas des dessins de personnages et ne certifient aucun résultat artistique.
