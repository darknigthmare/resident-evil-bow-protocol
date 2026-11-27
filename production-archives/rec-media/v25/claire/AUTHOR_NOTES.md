# Claire Military — correction ciblée V25 hors dépôt

**Tête, nez et yeux maintenant vers la gauche de l’image.** La stance et les mains vides restent reconnaissables ; tatouage et holster à droite anatomique, montre et gourde à gauche. Une seule génération a été exécutée, depuis la cible V25 et les deux références natives inspectées.

Statut : `correction_candidate_with_nonlocal_pixel_drift`. La correction de direction est visible, mais les pixels du corps sous le cou ne sont pas immuables : textures, reflets et petits contours diffèrent. Aucune certification 1:1, animation complète ou admission moteur. Le remplacement de la cible V25 reste à la décision du parent ; l’original est intact.

## Livraison

- `outputs/claire_re2r_military_deselect_head_left_v25.png` : PNG natif exact, 1024×1536 RGBA, 1 576 658 octets, alpha 0–254.
- `manifest.json` : prompt exact, provenance, références et hashes, mesures, revue et limites.
- `GIT_BLOB.json` : reçu de l’unique blob PNG créé dans GitHub depuis le base64 original, sans réencodage.
- `inputs/` et `inputs.json` : copies exactes de la cible et des deux références natives, avec SHA-256.
- `prompt.txt`, `tool_call.json`, `measurements.json` : trace et mesures en lecture seule.

SHA-256 sortie : `a9ccc600a39858dcd05c144a5e0587bdddba0f546099be54411dbafa9913bbd3`.
SHA de blob Git retourné, calculé et inscrit au manifeste : `6ca8f2e32219cfb1896db0873313226ce9c47f28`.

Édition : Resident Evil 2 Remake (2019), Claire Costume: Military DLC. Variante : `COST_AUDIT_CLAIRE_MILITARY`. Cible corrigée : `REC_CLAIRE_RE2R_MILITARY_DESELECT_KEY_V25`, conservée exactement.

Source officielle : https://store.steampowered.com/app/920562/
Source native plein corps reproduite : https://gamewith.net/residentevil2/article/show/3486
Les URL image précises, hashes et limites figurent dans `inputs.json` et le manifeste. Les bitmaps tiers restent hors dépôt.

Marges utiles à alpha >=128 : gauche 268, haut 120, droite 295, bas 121 pixels. Silhouette entière ; marges familiales de 10 % et 12 % non atteintes. Le contrôle visuel utilise le PNG natif `image_url`, vérifié identique octet pour octet au fichier sauvegardé ; l’aperçu `view_image` de ce fichier s’affichait presque noir dans la session de l’auteur et n’est pas compté comme revue réussie.

Fuseau : Europe/Paris. Tous les fichiers locaux restent dans ce dossier hors dépôt. Un seul blob distant créé, aucun tree, commit, ref, index ou ancien fichier modifié ; aucun second appel image_gen.
