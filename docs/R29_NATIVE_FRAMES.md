# Images de mouvements natifs — R29

Le lot produit **384 PNG de mouvement pour 24 scènes et six sujets**, plus **24 vues de pose source**. Les six sujets sont Ooze, Chunk Ooze, Tricorne Ooze, Pincer Ooze, Farfarello et Wall Blister. Les géométries, textures, poids et courbes proviennent des FBX publiés déjà conservés en R25–R27. Aucun nouveau modèle ni aucune nouvelle identité de sprite généré ne sont comptés.

Le [lecteur R29](../modules/fidelity-r29/motion/index.html) affiche les instants sources, avec choix de la séquence, lecture volontaire, recherche d’image et téléchargement vérifié. Les liens `?identity=rerev-ooze` ou `?clip=em1000_em1000_BA_1` sélectionnent exactement le sujet ou le fichier disponible. Une identité sans séquence reste explicitement indisponible. Le lecteur conserve au plus une URL Blob et une image active ; une réponse ancienne ne remplace pas la sélection courante.

## Géométrie et temps

Chaque séquence comporte seize instants sélectionnés dans les temps de clé natifs non négatifs. Le registre conserve les ticks FBX, le diviseur de 46 186 158 000 ticks par seconde, le nombre de temps sources et leur intervalle minimal. La lecture conserve les intervalles de ces observations ; aucune fréquence de jeu originale n’est certifiée.

Les os natifs déforment les géométries pondérées. Les correspondances entre les maillages du clip et ceux du corps sont vérifiées avec les preuves de topologie et de coordonnées UV conservées ; les textures liées restent celles de ces sources. Les fichiers FBX sélectionnés sont copiés octet pour octet depuis leurs archives ou leurs fichiers déjà extraits.

Une seule caméra orthographique couvre l’union des seize poses rendues d’une séquence. La projection, la cible, l’échelle et le pivot ne changent pas entre images. Le pivot désigne la projection de l’origine source ; il ne certifie aucun point d’appui anatomique ni aucune collision. Les translations et rotations sources restent visibles. Les bornes ne prétendent pas couvrir tous les instants intermédiaires non rendus.

Les scènes animées chargées placent ici la hauteur en Y. Les bases statiques publiées peuvent avoir une autre orientation ; seule la caméra a été réglée pour observer les scènes animées debout. Aucun membre, os, poids ou transform de source n’est réorienté à la main. Aucun miroir ni interpolation entre PNG ne crée de mouvement.

## Revue et limites

Les [six planches de revue](R29_NATIVE_FRAME_REVIEW/index.json) conservent quatre instants de chacune des 24 scènes : **96 échantillons vus**. Les [observations liées par SHA](R29_NATIVE_FRAME_REVIEW/observations.json) décrivent uniquement les variations visibles. Les codes BA, DM et UZ restent opaques ; aucun idle, attaque, blessure ou timing de combat n’est attribué à partir de ces noms.

Certaines scènes, notamment Farfarello BA101 et Wall Blister BA101/102, contiennent un déplacement source très étendu. La caméra fixe en conserve la trajectoire, ce qui projette le corps à une petite échelle dans certains instants. Ces images ne qualifient pas les détails de son anatomie ; aucune remise à l’échelle automatique n’est utilisée pour le masquer.

Ces publications sont attribuées à **l’édition HD/PC 2013** de Revelations. L’équivalence des géométries et des mouvements avec l’édition Nintendo 3DS 2012 reste non certifiée. Les objets associés, notamment `om120a`, ne sont pas assemblés aux corps ni comptés comme des combattants. Tous les enregistrements du lot portent `modelRole: body`.

L’éclairage, la projection et le rendu sont ceux de cet atelier. Three.js ne prend pas en charge le canal de texture FBX `SpecularFactor` ; les octets sont conservés, mais ce matériau natif n’est pas reproduit intégralement. Aucun PNG n’est une capture originale du moteur du jeu. Les seize observations ne constituent pas un cycle complet de combat, et ne sont pas automatiquement branchées aux gestes du simulateur. **Action attribuée : zéro ; cycle de combat admis : zéro ; certification globale 1:1 : zéro.**

## Vérification et reproduction

```sh
python3 scripts/prepare-native-frames-r29.py --check
python3 tests/test_native_frames_r29.py
node tests/verify-native-frames-r29.mjs
node tests/browser-native-frames-r29.mjs
```

Les six tests Python vérifient les **408 PNG réels**, leurs octets et pixels RGBA, les bornes alpha sans coupure, les temps natifs et les pivots fixes. Les 24 groupes Node reconstruisent indépendamment toutes les coordonnées pondérées des 384 poses et prouvent une variation de distances entre vertices : une simple translation ou rotation d’image ne suffit pas à ces contrôles.

Les interpolations flottantes de Chromium et Node diffèrent parfois de quelques ULP. Les empreintes indépendantes sont donc mesurées à **10⁻⁴ unité source**, avec comparaison des bornes et amplitudes à 10⁻⁷ ; la géométrie rendue n’est jamais quantifiée. Les empreintes brutes Float64 de Chromium sont conservées séparément, sans affirmation d’identité binaire entre machines virtuelles.

Les sept groupes navigateur couvrent les six identités exactes, les commandes clavier, la lecture volontaire, la suspension, les réponses tardives, les refus d’action inventée, d’objet associé et de miroir, le décodage des 384 frames, ainsi que le reflow à 320 px avec chaque taille de texte doublée. Les appareils physiques ne sont pas certifiés.

```sh
# Reproduire les dérivations, sans générer d’image par IA ni contacter Internet :
python3 scripts/prepare-native-frames-r29.py
node scripts/render-native-frames-r29.mjs
node scripts/capture-native-frame-review-r29.mjs
```

Un nouveau rendu peut différer au niveau des pixels selon le pilote graphique ou la version de Chromium. La vérification de livraison porte donc sur les PNG publiés et les coordonnées natives indépendantes, sans exiger une identité de pixels entre GPU. La revue des planches reste une étape humaine distincte de leur capture.
