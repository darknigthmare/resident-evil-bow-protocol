# R4 — Références de combat et rendu des Dossiers

## Livrable graphique limité mais réel

Douze illustrations déjà présentes sont préparées en PNG de combat séparés, sous `assets/lateral-native/r4/`. L'original documentaire n'est jamais remplacé. Les pixels sont copiés sans déformation ou reconstruction, avec recadrage transparent et huit pixels de marge. Pour les huit sources sur fond noir, seul le noir EXACT connecté au bord devient transparent ; les pixels foncés non noirs restent intacts. Le seuil de six a été écarté après inspection de l'abdomen de la hyène.

Strelat (RE6) et la hyène zombie (Outbreak File 2) offrent une silhouette native principalement de profil. Une réflexion de présentation est autorisée sur ces dessins, sans certifier les blessures du côté caché. Avec les trois poses natives antérieures, cela porte la couverture de référence bidirectionnelle à cinq corps. Ce ne sont pas cinq paires anatomiques indépendantes.

Albinoid adulte, Globster, Sea Creeper, papillon de Code Veronica, gros cafard RE2, Colmillos RE4, Ghiozzo, G-Embryo, Hornbill et Giga Bite reçoivent une direction de référence corrigée et un PNG préparé. Ils restent OBLIQUES, pas des profils orthographiques. Le papillon, Colmillos et Hornbill restent partiellement coupés à la source : aucune aile, extrémité ou patte absente n'est inventée.

**Aucun nouveau dessin de personnage, aucune nouvelle animation et aucune paire anatomique indépendante. 341 des 346 corps n'ont toujours pas une couverture latérale bidirectionnelle validée.** La vue droite seule du Bandersnatch est conservée ; sa mutation ne doit pas être inversée. Les 43 exercices contextuels restent hors de ce compte.

## Corrections du moteur de présentation

- Un descripteur `referenceImage` mesuré et vérifié par SHA-256 permet de séparer le portrait documentaire de sa ressource de combat préparée.
- Une référence préparée absente conserve une erreur visible mais retourne au fichier original au lieu de laisser un corps invisible.
- Le préchargement d'une action charge également sa pose de repos du même côté, dans une enveloppe de quatre fichiers au maximum par sujet, sans charger toute la collection.
- Les plans des Dossiers possèdent une horloge de présentation persistante par canvas, scène et sujet. Les séquences ne restent plus bloquées à la première frame faute d'acteur physique. Les demandes victoire/défaite sont raccordées ; leur dessin reste à produire.
- Des rectangles d'atlas identiques ne peuvent pas être déclarés comme deux côtés anatomiques en changeant leur nom, leur timing ou leur ancrage.
- Suppression d'un double nettoyage inutile de la surface détourée du cache.

## Vérification et frontière

La revue visuelle concerne uniquement les douze sources décrites dans `data/directional-reference-review-r4.json` et leur détourage. Elle n'est pas une certification du lore complet ni du côté anatomique invisible. Les comparaisons d'images de tests utilisent des textures techniques, pas des mouvements de personnages nouvellement dessinés.

Les résultats réellement exécutés sont écrits dans `docs/DIRECTIONAL_R4_TESTS.json`. Les données des 346 corps, les statistiques, les hitboxes, les sauvegardes et les contrats de replay restent ceux de 0.7.3. La révision graphique passe à 4 ; cela ne crée pas une release gameplay 0.8.

La branche de validation n'est promue dans la PR #11 qu'après tests et build réussis. La PR demeure en brouillon et n'est ni fusionnée dans `main`, ni déployée automatiquement sur Vercel.
