# R25 — nouveaux mouvements, sons et références par Dossier

Le classeur [BOW_FIDELITE_R25.xlsx](BOW_FIDELITE_R25.xlsx) poursuit les **17
chantiers et les 389 incarnations** avec six nouvelles feuilles. Les 17 feuilles
historiques restent identiques à l’octet, avec leurs valeurs, styles et liens.
Le [centre Sources et chantiers](../modules/fidelity-r25/index.html) et les Dossiers
donnent accès aux modèles, sons, citations et replays sans remplacer les images
historiques ou attribuer des attaques au jugé.

## Modèles et mouvements publiés

Le nouveau lot visuel conserve **huit références dans sept ZIP**, trois OBJ et
cinq FBX pondérés, dont une partie indépendante. Chainsaw Majini, Executioner
et Uroboros de RE5 ont des références attribuées ; Del Lago, Dr. Salvador et
El Gigante du port PC 2007 de RE4 restent candidats pour les incarnations du
catalogue de 2005. « Plaga C » reste candidat pour Duvalia tant que l’alias n’est
pas suffisamment établi. La partie Uroboros reste distincte du corps complet.

Les textures et aperçus sont les fichiers publiés. Deux liaisons de textures
Uroboros sont absentes de l’archive ; leur absence est attestée et liée au SHA
du modèle. Les surfaces correspondantes restent neutres et signalées. Les
autres matières sans texture ne reçoivent aucun PNG inventé.

Farfarello, Wall Blister et Scagdead apportent **cinq références pondérées** :
trois corps, une variante Scagdead et un objet associé. Les trois ZIP d’origine
contiennent 185 FBX dans les dossiers d’animation :

- **170 mouvements de corps** et **neuf mouvements d’objet associé** ;
- **une pose à clés** fixe après zéro ;
- **cinq bases sans aucune clé**, conservées séparément.

Les 180 fichiers à clés sont vérifiés sur leurs os et sommets pondérés à cinq
instants. Les 1 499 correspondances de topologie, UV et matières relient les
185 scènes à leurs corps sources. Les noms BA, DM ou SC ne deviennent pas des
noms de commandes sans séquence justificative. Les pré-clés négatives restent
dans les fichiers ; l’étendue native min→max est distincte de la lecture 0→max.

Ces exports sont attribués à **l’édition HD/PC de 2013**. Wall Blister est
explicitement décrit comme propre aux versions HD ; aucune présence identique
dans la version 3DS de 2012 n’est affirmée. Les UID historiques du catalogue
restent des points de rattachement, sans effacer cette différence d’édition.

Le [lecteur cumulatif](../modules/fidelity-r25/models/index.html) présente 51
entrées et 228 fichiers à clés, soit 226 mouvements et deux poses à clés en
cumulant R24/R25. Il ajoute une caméra au clavier, un cadrage qui tient compte
de la profondeur et un recadrage de la pose. En absence de WebGL, il conserve
les liens et un aperçu publié vérifié lorsqu’il existe, sans fabriquer d’image.
La perte et la restauration du contexte graphique conservent le temps et la
pause. Les flux sont bornés, une seule ZIP est conservée en cache et les
ressources sont libérées au départ de la page.

## Sons et citations

**708 WAV non silencieux numériquement** sont conservés dans leurs octets
publiés, avec 17 groupes rattachés à 16 UID de Revelations. Les 819 WAV de la
ZIP originale sont audités. Quatre fichiers strictement silencieux restent
uniquement dans cette ZIP ; les groupes hors catalogue ou de forme ambiguë
ne sont pas attribués automatiquement. Les WAV livrés totalisent 959,542
secondes, en PCM mono 16 bits à 48 kHz.

Le [lecteur audio](../modules/fidelity-r25/audio/index.html) vérifie les SHA avant
création des objets audio, filtre par sujet et ne démarre aucune lecture tout
seul. Le regroupement du publicateur ne prouve pas chaque action, locuteur ou
phase. **Écoute sémantique indépendante, banque brute certifiée et mixage final
restent à zéro.** Les 71 fichiers Wall Blister gardent leur portée HD/PC.

L’[index documentaire](../modules/fidelity-r25/canonical/index.html) ajoute
**109 assertions pour 80 UID nouvellement revus**, soit 176 UID cumulés : 59
gestes, 12 points faibles, 21 formes, deux alias et 15 périmètres. Les 84 sources
sont liées aux copies R23 conservées, sans duplication. Dix recoupements entre
éditeurs restent limités à l’assertion commune ; aucune capture primaire,
mesure corporelle ou liste complète de gestes n’est certifiée. Les acteurs,
phases et négations restent explicites, y compris lorsque l’acteur cité est
absent du catalogue.

Les Dossiers séparent modèles attribués et candidats, puis proposent les sons
et citations correspondants. L’index compact couvre les 389 UID et ses liens
restent locaux. Il ne transforme pas une attribution documentaire en preuve
de fidélité globale.

## Archives et matchs

L’[outil de replays](../modules/fidelity-r25/persistence/index.html) ouvre
directement les sauvegardes R19 et archives connues. Le fichier original,
l’archive imbriquée et les tranches JSON des replays peuvent être extraits à
l’identique. Les lots restent bornés à 30 ; les résultats des trois moteurs
réels sont séparés et les contrats inconnus, doublons ou falsifications refusés.
L’annulation fonctionne aussi pendant la création lente du moteur. Les moteurs
historiques sont réutilisés, avec stockage privé, sans copie supplémentaire.

La [recette des matchs](R25_FULL_MATCHES.json) a joué **115 miroirs complets**
avec vies normales, inputs réels et dégâts observés pour chaque identité, puis
effectué **230 reconstructions identiques**. Elle traverse 239 fins de manche,
124 reprises et 115 fins de match. Le chrono est réglé à cinq secondes pour ce
contrôle borné ; les 115 matchs finissent au chrono, sans KO. Les finishers sont
désactivés. Cette recette ne certifie ni les règles officielles 60/99 secondes,
ni les 13 225 paires, ni une conclusion artistique.

## Contrôles et portée

Les corrections d’accès couvrent clavier, repli, lien d’évitement, texte agrandi
et manette simulée. Elles ne remplacent pas les essais NVDA/VoiceOver, appareils
et manettes physiques. Le rendu logiciel cloud ne certifie pas les performances
des GPU cibles. Le nouveau lien de Dossier vérifie aussi les capacités du
navigateur et se désactive proprement si elles ne sont pas disponibles.

Les défaillances CI anciennes ont été isolées puis corrigées dans les harnais :
horloge réellement figée avec assertion exacte 240 ms/frame 6, et précondition
de focus contrôlée avant l’essai de restitution. Les lecteurs historiques ne
sont pas modifiés. Les workflows historiques passent au commit `dd288ab` ; les
prévisualisations Vercel sont limitées par un quota externe. La CI de la nouvelle
livraison doit encore être consultée après son exécution.

Les preuves et critères restants se trouvent dans [R25_TRACKING.json](R25_TRACKING.json),
les contrôles consolidés dans [R25_VALIDATION.json](R25_VALIDATION.json). Les **17
chantiers restent ouverts et la fidélité globale 1:1 certifiée reste à zéro**.
Les 385 sprites de combat manquants du suivi historique ne sont pas déclarés
produits par des modèles, poses ou sons documentaires. Les publications
communautaires ne certifient pas l’égalité aux paquets bruts Capcom.

Validation locale : **605 contrôles historiques, 50 tests Python, 227 contrôles
Node ciblés et 55 groupes navigateur R25 réussis**. Les douze contrôles de l’export
ont aussi été rejoués après le renforcement des liens autorisés. Les 21 groupes
de régression R22/R23/R24 passent dans des copies isolées et le build statique
termine avec la sortie zéro. Les résultats distants de la nouvelle livraison
restent distincts de ces exécutions locales.

Avec Node 22.16.0, Python/Pillow/openpyxl et Chromium :

```sh
python3 scripts/build-model-catalog-r25.py --check
python3 scripts/build-dossier-source-index-r25.py --check
python3 scripts/build-canonical-evidence-r25.py --check
python3 scripts/export-fidelity-progress-r25.py
python3 -m unittest discover -s tests -p 'test_*r25.py' -v
node tests/verify-visual-models-r25.mjs
node tests/verify-motion-skeletons-r25.mjs
node tests/verify-model-reader-r25.mjs
node tests/verify-persistence-r25.mjs
node tests/verify-full-matches-r25.mjs
node tests/verify-r25-integration.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-models-r25.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-audio-r25.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-canonical-r25.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-persistence-r25.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-fidelity-dashboard-r25.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-access-r25.mjs
npm run build
```

Le harnais d’accès utilise axe-core 4.14.0 (`AXE_CORE_PATH` si nécessaire), les
tests navigateur Playwright 1.64.1. Le workflow reproduit les indices et le
classeur avant les tests qui réécrivent les rapports. Le rapport des 115 matchs
est validé par ses sources, ses replays et des reproductions ciblées ; la campagne
entière n’est relancée que si les entrées ou le moteur changent.
