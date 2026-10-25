# R27 — poses générées, sources et chantiers parallèles

Le [suivi R27](../modules/fidelity-r27/index.html) et le [classeur](BOW_FIDELITE_R27.xlsx) couvrent les 17 chantiers ouverts et les 389 incarnations. Les 29 feuilles historiques R26 restent conservées à l’octet ; six nouvelles feuilles détaillent les ajouts, les critères encore ouverts, les sources et les résultats exécutés.

## Les 385 poses ciblées

Le gel conserve **363 PNG réels et 22 refus d’outil sans image**, soit un résultat pour chacune des 385 demandes. Parmi les générations, 192 ont été revues visuellement, 82 ont un corps entier revu et 22 nouvelles poses de base sont admissibles au seul rendu idle du côté effectivement disponible. Les autres états, vues et cycles restent ouverts ; les révisions archivées ne comptent pas comme des UID supplémentaires.

L’utilisateur a choisi explicitement : **« Conserver les refus, fidélité prioritaire »**. Les refus de l’outil restent documentés, sans variantes édulcorées destinées à atteindre artificiellement 385 fichiers. Les 385 tentatives peuvent être résolues avec N PNG réels et M refus sans image ; ces deux quantités restent distinctes. Aucun placeholder ne remplace un refus.

Les quatre présentations R20 restent conservées. R27 cible les 385 autres identités avec l’outil `image_gen` et les références attribuées à chacune. Le [registre des sprites](../modules/fidelity-r27/sprites/manifest.json) distingue les fichiers réellement produits des générations encore en attente ; les jobs ne sont pas comptés comme des fichiers. Le catalogue Excel conserve aussi les états `AWAITING_OUTPUT` et `BLOCKED_BY_TOOL`, avec les motifs exacts des refus d’outil encore sans image.

Chaque génération conserve son prompt, ses références, son incarnation, ses octets, son empreinte, ses dimensions, son alpha, ses limites visibles et son statut de revue. Les états disponibles restent explicites : une pose neutre ne devient pas une marche, une attaque, une vue opposée ou un cycle complet. Aucune vue asymétrique n’est obtenue par miroir.

Les 385 cibles incluent 43 rencontres contextuelles ; elles ne deviennent pas des combattants libres. Un portrait ou une géométrie partielle ne certifie pas les zones non documentées du corps. Les compteurs distinguent génération, revue visuelle, corps entier revu, référence corporelle déclarée dans le job et admissibilité à la seule pose idle du rendu de combat. Le type de pose est conservé séparément : `neutral-base`, `source-bind-pose`, `source-presentation` ou `unknown`. Un corps entier de profil en pose T ou de liaison reste exclu du rendu idle ; seules les poses `neutral-base` explicitement revues, complètes et orientées du côté disponible peuvent déclarer cet état. La revue d’une image générée ne certifie pas son égalité géométrique à l’apparence originale. Une observation manuelle de source peut être liée séparément aux SHA du corps visible et de la génération ; elle ne modifie pas la déclaration initiale du job figé. Le catalogue conserve le lien vers cette preuve et les revues locales correspondantes.

La [galerie](../modules/fidelity-r27/sprites/index.html) charge une seule image sélectionnée et expose les états encore absents. Les fichiers sont des interprétations produites pour le projet ; aucun n’est déclaré image officielle du jeu. Les quatre présentations historiques et les images sources ne sont pas remplacées.

## Références, mouvements, citations et sons

Un [addendum distinct](R27_SOURCE_BODY_RASTERS.md) fournit 16 vues de référence 512 px pour quatre UID à partir de géométries déjà conservées. La pose publiée et les équipements absents restent explicites : chaîne de Lisa incluse dans le cadrage, corps RE5 sans arme non complétés. Ces images ne sont ni des sorties image_gen, ni des images du jeu original, ni des sprites de combat terminés ; elles ne gonflent pas le compteur des 385 cibles.

L’[index d’apparence](../modules/fidelity-r27/sources/index.html) couvre les 389 identités avec leurs références locales et leurs empreintes. Il sépare corps historiques, portraits, modèles attribués, candidats et objets associés. Les écarts des anciennes métadonnées restent signalés sans réécriture silencieuse du roster.

Le nouveau [lot de mouvements](../modules/fidelity-r27/motion/manifest.json) conserve les fichiers à clés et leur horloge native, séparément des poses et bases sans clés. Une archive dépassant la taille d’un blob Git est conservée en segments d’octets exacts, reliés à son SHA global ; les clips directs gardent les bornes du lecteur. Les noms techniques ne certifient pas une action.

Le [lecteur audio](../modules/fidelity-r27/audio/index.html) ajoute une publication Zombie RE3 Remake : 330 WAV, 330 contenus SHA distincts, sans contenu identique aux lots audio R24/R25/R26. Les 330 fichiers et l’archive originale restent intacts. Leur groupe publié ne prouve ni une action précise, ni une écoute sémantique indépendante, ni une banque Capcom brute.

La [revue canonique](../modules/fidelity-r27/canonical/index.html) ajoute 84 assertions pour 81 incarnations supplémentaires : 356 UID revus au cumul et 33 encore sans revue. Les sources et les limites sont explicites. Aucune nouvelle capture primaire, métrique corporelle ou intégralité de répertoire n’est inventée.

## Replays, restauration et conclusions

Le [pont de restauration](../modules/fidelity-r27/persistence/index.html) lit les valeurs de la base isolée R26, extrait les archives et vérifie les records avec leur moteur courant ou pré-R13. Il contrôle révision et valeurs avant et après vérification. Le format R7 garde son parcours de fichier séparé ; il n’est pas présenté comme contenu possible d’une sauvegarde R19. Le stockage du jeu et les services cloud ne sont pas restaurés par cet atelier.

La [recette de matchs](R27_MATCHES.md) ajoute douze matchs complets, 24 reconstructions identiques, dix KO et deux résultats au chrono. Les deux cas R26 qui restaient limités à 50 égalités terminent après changement des seuls inputs. Six scènes de conclusion restent des chorégraphies de prototype, avec deux refus de compatibilité, un passage au clavier et une expiration. Le vérificateur de replay laisse `finisherVerified` à faux : il ne rejoue pas ces scènes artistiques.

## Reproduction et validation

Les [résultats R27](R27_VALIDATION.json) distinguent contrôles exécutés, rapports encore absents et échecs éventuels. Les instantanés de génération peuvent être partiels pendant la production ; le registre ne transforme pas les attentes en réussites. Le champ `complete` de ce rapport concerne les contrôles exécutés ; `target_generation_attempts_complete` indique si les 385 demandes ont un résultat ou un refus enregistré, et `target_generation_complete` indique séparément si les 385 générations disposent effectivement d’un PNG. Ce dernier reste faux si des refus sans image subsistent. Le contrôle final refuse un résultat de galerie exécuté sur un ancien nombre d’images.

```sh
python scripts/build-validation-summary-r27.py
python scripts/build-fidelity-tracking-r27.py
python scripts/export-fidelity-progress-r27.py
node tests/verify-r27-integration.mjs
npm run build
```

Les commandes `--check` vérifient la cohérence avec les entrées conservées. L’exporteur contrôle les 385 cibles, les octets des sprites générés, les statuts et les critères de rendu ; une génération en attente ou un contexte ne peut acquérir une intégration de combat certifiée. Les valeurs, formules, styles, liens, commentaires, cellules fusionnées et volets historiques sont vérifiés après relecture du classeur.

Les 17 chantiers restent ouverts et la fidélité globale 1:1 certifiée reste à zéro. Les cycles complets, membres séparés, gestes attribués par séquences, banques natives, rendu original, tailles physiques et appareils cibles restent à vérifier. Le fait de générer les 385 poses ne clôture pas ces critères.
