# R23 — recherche de voix et sons par incarnation

Le chantier G-AUDIO reste ouvert. **Aucun nouveau clip natif n’a été téléchargé ou intégré.**
Les ambiances originales déjà présentes dans l’application ne sont pas comptées
comme des cris ou voix d’origine des personnages.

La nouvelle page `modules/fidelity-r23/audio/index.html` présente les consultations
et permet de rechercher les 389 incarnations. Chaque ligne renvoie à sa page de
référence et conserve l’empreinte de cette page dans `catalogue.json`.

## Résultat vérifié

Les 371 documents déjà conservés pour les 389 identités ont été relus après
vérification de leurs SHA-256. Aucun attribut de lien ou média ne publie un fichier
direct `.wav`, `.ogg`, `.mp3`, `.flac`, `.m4a` ou `.opus`. Il s’agit d’un constat
sur ces documents, pas d’une preuve de l’absence de sons dans les jeux.

La page d’accueil de [Spriters Resource](https://www.spriters-resource.com/),
consultée avec HTTP 200, publie le lien **https://sounds.spriters-resource.com/**.
Sa réponse complète de 634 112 octets est conservée dans le cache de recherche,
SHA-256 `547ad26e83125d51d706e55c84a6c69eaa51bd3e50b024e192c4bdc8091dddf3`.

Les deux adresses `www.sounds-resource.com` et `sounds.spriters-resource.com`
refusent la connexion au tunnel du proxy avec 403. La catégorie Audio de
[Resident Evil Wiki](https://residentevil.fandom.com/wiki/Category:Audio)
renvoie HTTP 402. Les observations datées figurent dans `audio/manifest.json`.
Les refus n’ont pas été contournés. Les résultats Bing consultés ne donnaient pas
de fichier audio attribuable et n’ont pas servi de preuve de voix ou de cri.

## Outil réutilisable

`scripts/collect-native-audio-r23.py` propose trois opérations indépendantes :

```sh
python3 scripts/collect-native-audio-r23.py \
  --cache /workspace/scratch/r23-audio/discovery --discover \
  --output /workspace/scratch/r23-audio/discovery.json

python3 scripts/collect-native-audio-r23.py \
  --cache /workspace/scratch/bow-source-research \
  --catalogue-evidence /workspace/scratch/bow-source-research/catalog-source-evidence.json \
  --output /workspace/scratch/r23-audio/catalogue-audio-audit.json

python3 scripts/collect-native-audio-r23.py \
  --cache /chemin/du/cache --import-request /chemin/demande.json \
  --output /chemin/du/lot/manifest.json
```

L’import attend le schéma `re.bow.native-audio-import/1`, avec `entries` contenant
`id`, `game`, `source_bytes_transformed: false`, `source_page`, `source_audio`
et `review`. Les preuves page/audio donnent chacune `url`, `path` relatif au cache
et `sha256`. La revue donne `accepted: true`, `phase_ambiguity: false`,
`specific_form`, `audible_observation`, `language` et `limitations` non vides.

L’outil refuse un autre jeu, une phase incertaine, des octets modifiés, une URL
audio absente de la page et les chemins sortant du cache. `ffprobe` contrôle le
format audio, les pistes, la durée, les canaux et la fréquence. Le démultiplexeur
est imposé au format du fichier, les protocoles sont limités aux fichiers locaux,
et aucun extrait n’est exécuté, réencodé, normalisé, découpé ou synthétisé.
La copie conserve les octets et les indicateurs `canonical_fidelity_certified`
et `combat_audio_final` restent faux.

Les six tests de provenance passent : copie exacte, refus d’un autre jeu, preuve
altérée, lien absent, phase incertaine/transformation et chemin hors cache.
Leur court WAV synthétique reste dans un dossier temporaire ; il ne figure pas
dans les ressources du produit.

Le contrôle navigateur passe en 1440 et 390 px : les 389 lignes et quatre sources
se chargent, les filtres texte et sans résultat fonctionnent, sans erreur JavaScript
ni débordement de la page. La table dispose d’une zone de défilement nommée et
accessible au clavier. Le rapport et les captures restent dans le cache de recette
`/workspace/scratch/r23-audio/`.

La fidélité sonore 1:1 requiert encore des fichiers accessibles attribués au jeu,
à l’incarnation, au geste et à la langue, puis l’écoute des extraits, la mesure de
leurs bornes, l’intégration au combat et la recette sur matériel cible.
