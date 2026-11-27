# Helena — correction ciblée hors dépôt, V25

Un seul appel `image_gen.imagegen`, en édition depuis le PNG V24 et la référence promotionnelle officielle Capcom du 23 janvier 2012.

## Résultat

La tête et les yeux sont maintenant dirigés clairement vers la **gauche de l’image**. L’arme demeure dans la main droite anatomique (à gauche du spectateur), pointée vers le bas. La tenue et la posture restent visuellement cohérentes avec la cible V24.

**Statut : candidat de correction avec dérive de pixels hors de la tête, à revoir par le parent.** Les pixels du corps n’ont pas été conservés identiquement par la génération. La direction ciblée est corrigée ; la contrainte stricte d’une modification limitée à la tête n’est pas satisfaite au niveau pixel. Aucun second appel effectué. Aucune certification canonique 1:1, animation complète ni admission moteur.

## Fichiers

- `outputs/helena_re6_agent_deselect_head_left_v25.png` : sortie native 1024×1536 RGBA, 1 353 016 octets, alpha 0–254.
- `inputs/helena_re6_agent_deselect_v24_exact_original.png` : copie intégrale exacte de la cible V24.
- `inputs/helena_capcom_promo_20120123_exact.jpg` : référence officielle basse résolution, conservée uniquement dans ce dossier de travail hors dépôt.
- `manifest.json` : provenance, hashes, prompt exact, mesures et revue de l’auteur.
- `prompt.txt`, `tool_call.json`, `inputs.json`, `measurements.json` : trace de l’appel et mesures en lecture seule.

SHA-256 sortie : `7ee77aa161e7507842f1eb0d6c2282d01bea18f9cdb186836ad697d13600528c`.
SHA de blob Git : `421a53ba112b10b2631c3b54e50c21e17c862729`. Ce seul blob PNG a été créé dans GitHub depuis le base64 original ; le SHA retourné correspond au manifeste et au fichier local. Reçu : `GIT_BLOB.json`. Aucun tree, commit ou ref créé/modifié.

La copie de sortie est identique octet pour octet au fichier natif et au PNG du `image_url` retourné par l’outil. Ce PNG natif a été visualisé directement. Les aperçus `view_image` de la nouvelle sortie s’affichaient presque noirs malgré les pixels/alpha mesurés ; ils ne sont pas considérés comme une inspection visuelle réussie. Le PNG `image_url` exact a fourni la vue de contrôle sans transformation des pixels.

Marges utiles à alpha >=128 : gauche 291, haut 135, droite 340, bas 80 pixels. Silhouette entière ; marges verticales de 10 % non atteintes. Pose, textures, petits contours, pivot et rendu composé restent à qualifier.

Source officielle : https://news.capcomusa.com/brelston/blog/2012/01/23/official_leon_and_helena_art_from_resident_evil_6

La livraison locale reste dans `v25-correction-helena/`, hors dépôt, avec le fuseau Europe/Paris dans le manifeste. Seul le blob PNG a été créé à distance pour l’assemblage du parent. Les fichiers V24, l’index Git, les commits et les références n’ont pas été modifiés. Le placement V25 et toute publication sont laissés à la décision du parent après publication V24.
