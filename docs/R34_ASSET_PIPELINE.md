# R34 — Portraits et poses entières par combattant

Le [plan de production](../modules/fidelity-r34/assets/jobs.json) contient **346 UID combattants** : 115 principaux et 231 prototypes. Les 43 contextes sont exclus. Les 22 refus initiaux et le refus de révision Tyrant sont préservés, soit 23 combattants sans nouvelle tentative.

Quatre lots stables couvrent 87, 87, 86 et 86 UID. Les portraits constituent la première phase ; les poses statiques d’attente de combat suivent. Chaque pose doit montrer le corps entier dans une seule image, sans assemblage de membres ni grille de pseudo-animation.

Les drapeaux historiques de référence entière restent des informations héritées. Chaque artiste inspecte les références réellement utilisées, écarte les conflits de forme/édition et recherche une source entière lorsque le cadrage est incomplet. Une référence de port ou d’une autre phase n’est pas promue silencieusement vers l’incarnation cible. Les recherches infructueuses sont documentées avec leurs pages ou fichiers examinés.

Une image indépendante par sortie est recommandée pour la lisibilité, les proportions et l’attribution exacte. Les PNG de l’outil sont copiés sans retouche. Le cadrage d’une vignette pourra être fourni comme métadonnée d’affichage, sans modifier le raster d’origine. Un portrait ou une pose fixe ne certifie ni les pixels Capcom ni une boucle idle originale.

## Reçu commun

Chaque job fournit `outputs.portrait.receiptPath` et `outputs.idle.receiptPath`. Les artistes peuvent écrire directement un reçu conforme, ou utiliser l’importeur. Le reçu contient :

```json
{
  "schema": "re.bow.generated-output-r34/1",
  "uid": "exact-catalogue-uid",
  "kind": "portrait",
  "lotId": "lot_1",
  "status": "GENERATED",
  "generator": "image_gen",
  "prompt": "Exact actual tool prompt",
  "references": [{
    "path": "assets/catalog/exact-catalogue-uid.png",
    "sha256": "actual-source-sha256",
    "bytes": 123,
    "sourceUrl": "https://verified-source-page",
    "exactIdentity": true,
    "targetEditionAdmitted": true
  }],
  "image": "modules/fidelity-r34/assets/generated/exact-catalogue-uid/portrait.png",
  "sourceOutputPath": "/actual/path/returned/by/image_gen.png",
  "sha256": "actual-output-sha256",
  "bytes": 123,
  "generatedBytesEdited": false,
  "review": {
    "visuallyReviewed": true,
    "portraitIdentityReviewed": true,
    "sourceFacing": "front",
    "fullBodyVisible": false,
    "fullBodyReviewed": false,
    "completeBodyReferenceVerified": false,
    "fightingPoseReviewed": false,
    "knownAppearanceGaps": [],
    "observations": ["Concrete inspected anatomy, costume, crop or limitation"],
    "canonicalFidelityCertified": false,
    "originalIdleAnimationCertified": false
  }
}
```

`BLOCKED_BY_TOOL` and `HELD_REFERENCE` keep an actual `reason`, without output image/bytes/SHA. A held reference also requires concrete `research` records. A refused portrait must not be followed by another prompt for the same subject’s body. Refusals do not count as generated media.

For a whole-body pose, `review.completeBodyReferenceVerified: true` also requires `review.completeBodyReferences`, a list of `{path, sha256, observation}` objects naming the actual inspected full-body images used in the request. An inherited boolean alone is insufficient.

Every body receipt explicitly records boolean `fullBodyVisible`, `fullBodyReviewed`, `completeBodyReferenceVerified`, and `fightingPoseReviewed`. A newly generated `idle-right.png` is admitted as a default static combat idle only when all four are true, the silhouette is padded inside the canvas, there are no appearance gaps, the edition matches, and the actual `sourceFacing` is `right`. A left, front or uncertain pose remains a generated source presentation with no combat states. Its direction must never be relabelled to satisfy admission. Historical R33 poses keep their prior rules.

For a portrait with reservations, `review.portraitDisplayRegionReviewed: true` is required before selection admission. A verified `{x,y,width,height}` source-pixel `review.portraitCrop` can exclude an unverified accessory while preserving the raw PNG. An invented accessory visibly remaining in the display crop must stay held. Normal peripheral portrait cropping is distinguished from an unqualified complete combat body.

A documented unresolved source edition can also hold the retained presentation for an exact UID. `reference-admissions.json` records the source path and SHA, a concrete reason, `targetEditionReferenceMatched:false`, and `blockRetainedPresentationFallbacks:true`. The compiled `retainedPresentationHolds` exposes that decision. Historical images move to `retainedUnadmittedFallbacks` with `HELD_SOURCE_EDITION`; the current `fallbacks` are null and those images are excluded from available fallback counters. Historical files and compatibility manifests remain untouched. A future independently qualified R34 output remains possible.

```sh
python3 scripts/build-roster-jobs-r34.py --check
python3 scripts/import-roster-asset-r34.py --receipt /tmp/prepared-receipt.json --source /actual/tool-output.png
python3 scripts/import-roster-asset-r34.py --receipt modules/fidelity-r34/assets/lots/lot_1/UID/portrait.json --check
```

The importer checks UID ownership, reference hashes, actual RGBA transparency, bounds, byte preservation, refusal gates and the recorded visual inspection. It does not generate or paint an image. The registry must still distinguish **new generated**, **reused**, **held** and **pending** outputs; existing R27–R33 images never become new R34 generations merely by being indexed.

## Explicit positive corrections and new reference discoveries

A delivered PNG and its receipt cannot be silently overwritten. After a genuinely new image-generator output has been inspected, an explicit correction uses the exact SHA256 of the currently delivered PNG:

```sh
python3 scripts/import-roster-asset-r34.py --receipt /tmp/reviewed-correction.json --source /actual/new-tool-output.png \
  --replace-sha256 CURRENT_PNG_SHA256 --revision-reason "Concrete visually verified correction"
```

`CURRENT_PNG_SHA256` is a placeholder for the real current64-character digest. The previous receipt must be `GENERATED`, belong to the same UID/kind/lot, and bind the unchanged old PNG. Before the new bytes are published, the importer stores the exact old PNG and receipt in their own deterministic `revisions/` directory. `replacesGeneratedOutput` binds both archived files by path, byte count and SHA256, with the correction reason. An existing discordant archive, stale digest, different owner, historical refusal or prior portrait refusal rejects the operation before changing the delivered files. A style reference to the old live PNG is rebound to its identical immutable archive; `originalToolReferencePath` preserves the path used by the tool.

When a real complete source has been discovered after an output was explicitly held, a separate transition uses the SHA256 of that `HELD_REFERENCE` receipt:

```sh
python3 scripts/import-roster-asset-r34.py --receipt /tmp/newly-supported-output.json --source /actual/new-tool-output.png \
  --replace-receipt-sha256 CURRENT_HELD_RECEIPT_SHA256 --revision-reason "New complete original source inspected"
```

This archives the exact held receipt in `replacesHeldReference`; it does not invent an old PNG. The two replacement flags are mutually exclusive. Neither path can promote `BLOCKED_BY_TOOL` or a preserved historical refusal. New requests must still stop after a tool refusal.

Publication holds a private operating-system lock for the UID across both portrait and body operations, including the current-file recheck, archive writes, new-file publication and final validation. Lock files stay outside the delivered checkout and cannot be symlinks. A competing revision with an obsolete prior SHA is rejected after the first publication; it cannot interleave another PNG with the first receipt. The refusal gate is also symmetric for new imports: a known body refusal blocks a later portrait correction, while an earlier delivered portrait remains readable as historical art.

Revision archives, studies and recovered generated positives can guide an edit or its style. They cannot appear in `completeBodyReferences` as original anatomy evidence. Original web captures and native views under `source-research/` remain eligible only after their actual identity, edition and complete framing have been reviewed.
