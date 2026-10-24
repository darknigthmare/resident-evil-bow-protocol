# R25 — examiner les sources avec ou sans affichage 3D

Le lecteur R25 réutilise les fichiers Three.js et les contrôles de fichiers R24.
Il accepte les ressources R24 et R25 à l’intérieur de `modules/`, avec une liste
explicite des quatre dossiers de sources autorisés. Les fichiers restent à leurs
emplacements d’origine ; aucun modèle, rig, poids, UV ou mouvement n’est réécrit.

## Vue et navigation

Les boutons et le canevas au clavier permettent de tourner, incliner, rapprocher
et éloigner la caméra. Dans le canevas, les flèches tournent la vue, `+` et `−`
changent la distance, `Home` retrouve la vue initiale et Espace commande la lecture
ou la pause. Aucun mouvement ne démarre au chargement. Une demande de réduction
des animations ou le masquage du document met une lecture en pause.

Le cadrage prend la sphère englobante de la pose, le champ de vision horizontal
et vertical et une marge. Il couvre la profondeur du corps ainsi que la largeur
disponible sur petit écran. Le précédent cadrage fondé sur le seul plus grand axe
coupait les extrémités de Plaga C ; ses sommets et sa boîte étaient pourtant
corrects. Le changement concerne seulement la caméra. « Recadrer la pose »
recentre une clé dont la translation source sort du cadre initial ; le mouvement
et ses coordonnées restent inchangés.

Si WebGL est indisponible, les notices, limites et liens de téléchargement
restent utilisables. Quand le catalogue comporte un aperçu publié, ses octets
et son SHA-256 sont vérifiés avant affichage. Aucune géométrie n’est téléchargée
pour fabriquer ce repli. L’image publiée reste une référence fixe ; elle ne
devient pas une preuve du mouvement sélectionné.

Une perte réelle du contexte graphique arrête la lecture et libère la scène.
Après restauration, le fichier est revérifié, le temps d’examen est rétabli et
la pose recadrée ; la lecture reste en pause. Une sortie de page libère les
matériaux, textures, géométries, contrôles et archive en cache. Le lecteur de
production ne lit ni n’écrit les sauvegardes ou le stockage du jeu.

## Archives et matériaux incomplets

Les nouveaux paquets Revelations dépassent 40 Mio. Seules les archives
explicitement sélectionnées peuvent employer la nouvelle limite de **80 Mio**,
avec téléchargement par flux borné, longueur exacte et SHA-256 obligatoires.
Les autres fichiers conservent la limite R24 de 40 Mio et les membres FBX lus
depuis l’archive restent limités à 12 Mio. Une seule archive est conservée en
cache. Le téléchargement d’un ancien paquet utilise le contrôleur R24 inchangé.

Les correspondances de matériaux à un corps de référence doivent couvrir tous
les maillages de la scène, avec cibles distinctes et coordonnées UV identiques.
Le contrôleur ne suppose plus que chaque modèle possède neuf maillages.

L’export Uroboros publié référence `unknownmaterial` pour deux maillages alors
qu’aucun membre de l’archive ne fournit cette image. La dérogation est limitée
aux références prouvées par le SHA du modèle, le nom du maillage, le nom exact
de la texture et sa propriété `DiffuseColor`. Le décodeur reçoit une texture
vide puis retire sa liaison avant tout rendu. Aucun pixel de remplacement
n’est fabriqué et le lecteur annonce les deux maillages incomplets. Toute autre
référence manquante est refusée.

## Sources depuis les Dossiers

Le lien du Bestiaire est installé après la construction de son menu. Les
Dossiers consultent un petit index des 389 identités et séparent les modèles
attribués des références candidates. Ces dernières conservent leur avertissement
sur la plateforme ou la forme. Les liens audio et documentaires affichent leur
nombre de références ; ouvrir un Dossier ne charge ni ne joue de son. Les images
historiques des personnages ne sont pas remplacées.

L’index est local, les textes sont insérés comme texte et les liens sortant du
lot sont refusés. Une provenance corrompue ne donne pas accès à un modèle
arbitraire. Les cas d’animation à pose fixe après zéro gardent leur bouton de
lecture désactivé et leur pré-clé originale dans le fichier.

## Vérification

```sh
node tests/verify-model-reader-r25.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-models-r25.mjs
AXE_CORE_PATH=/chemin/axe-core/axe.min.js CHROME_BIN=/usr/bin/chromium node tests/browser-access-r25.mjs
```

Les rapports sont `R25_READER_ASSET_TESTS.json`, `R25_READER_BROWSER.json` et
`R25_ACCESS_BROWSER.json`. Le harnais navigateur conserve les captures des
modèles statiques dans `qa-models-r25-browser/static/`. Les contrôles portent
sur un Chromium virtualisé avec SwiftShader ; ils ne certifient ni le GPU
physique, ni NVDA/VoiceOver, ni le rendu d’origine des jeux.

Cette exécution réussit ses **six contrôles de transport/DOM, neuf groupes du
lecteur et dix-huit groupes d’accès**. Les 51 entrées cumulées sont chargées,
dont 46 références statiques et 228 fichiers à clés : 226 varient après zéro
et deux restent des poses fixes. Les scènes d’objet associé restent distinctes
des corps et ne deviennent pas une incarnation supplémentaire.

Le test de sortie de page conserve le résultat synchrone de `pagehide` dans
une clé propre au contexte navigateur de test, puis l’efface. Les messages
DevTools du contexte détruit peuvent disparaître avant leur réception. Cette
instrumentation de test ne donne aucun accès au stockage au lecteur livré.
