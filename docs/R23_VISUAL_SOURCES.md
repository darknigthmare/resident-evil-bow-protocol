# R23 — archives visuelles conservées

Le lot visuel livre sept nouvelles vignettes de Dossier pour RE3 remake, un
lecteur documentaire autonome et deux portraits supplémentaires de Wesker dans
le mode Mercenaires de RE5. Les images proviennent d’archives communautaires
attribuées aux jeux. Les fichiers téléchargés, leurs notices et leurs empreintes
sont conservés ; cette provenance secondaire ne prouve pas à elle seule une
extraction directe et sans traitement des fichiers Capcom.

## Livraison utilisable

Ouvrir `modules/fidelity-r23/visual/index.html` depuis le serveur local. Les sept
vignettes de 128 × 128 pixels sont aussi proposées dans les Dossiers exacts :
chien zombie, NE-α, Drain Deimos, Hunter β, Pale Head et Nemesis aux stades 2 et 3
de RE3 remake. Le jeu et l’UID sont vérifiés avant affichage. Le PNG est refusé si
son SHA-256 ou ses dimensions diffèrent ; l’erreur propose une nouvelle tentative.
Le cache conserve au plus deux portraits. Une réponse tardive ou la fermeture
retardée d’un ancien Dossier ne remplace pas le nouveau sujet.

Ces vignettes sont des **vues partielles**, et non des combattants détourés ou des
corps complets. L’interface conserve leur taille native. Aucun membre caché,
orientation opposée, rig, geste, effet ou son n’est fabriqué à partir du portrait.

La feuille de RE3 est publiée par The Spriters Resource sous « Models » : ce nom
désigne ici des textures du menu bonus, **pas des modèles 3D**. L’archive ZIP de
739 002 octets contient deux PNG, dont un atlas de 512 × 1 024 pixels. La revue
visuelle de la feuille complète et des sept références Evil Resource a permis
ces associations. Les recadrages conservent chaque pixel RGBA de la feuille.

| UID | Recadrage x, y, largeur, hauteur | Limite principale |
| --- | --- | --- |
| re3r-zombie-dog | 0, 640, 128, 128 | Tête et avant du chien |
| re3r-ne-alpha-parasite | 128, 640, 128, 128 | Hôte parasité, pas parasite isolé |
| re3r-drain-deimos | 256, 640, 128, 128 | Tête et haut du thorax |
| re3r-hunter-beta | 384, 640, 128, 128 | Tête et épaules |
| re3r-pale-head | 256, 768, 128, 128 | Tête et thorax |
| re3r-stage-2-nemesis | 0, 896, 128, 128 | Tête et avant-train |
| re3r-stage-3-nemesis | 128, 896, 128, 128 | Face et masse partielle |

Le Hunter γ a la gueule fermée sur la feuille : il n’est pas attribué à la cible
du catalogue qui exige la gueule ouverte. Les deux vues de la première forme de
Nemesis ne prouvent pas sa configuration au lance-roquettes. Aucun Licker n’est
identifié sur cette feuille. Aucun zombie humain particulier n’est choisi pour
remplir arbitrairement une entrée générique.

## Variantes de mode et recherche élargie

L’archive de portraits Mercenaires de RE5 de 3 317 918 octets contient dix PNG.
Les deux portraits de Wesker Midnight et S.T.A.R.S., revus visuellement et copiés
sans conversion, sont consultables séparément dans la page visuelle. Ils sont
explicitement exclus des associations au Dossier de campagne de Wesker humain.
Leur visage, costume de mode et cadrage ne prouvent pas un corps complet ou une
équivalence automatique avec la tenue de campagne.

`docs/R23_VISUAL_INDEX.json` inventorie les **17 pages de jeux effectivement
consultées** sur The Spriters Resource et leurs **208 liens d’assets** propres à
chaque jeu. Les menus latéraux et ressources d’autres jeux sont exclus. La plupart
de ces liens concernent l’interface : leur présence ne constitue pas une couverture
de personnages, de membres ou d’animations. Deux archives seulement sont livrées
dans ce lot, RE3 remake et RE5.

L’ancien domaine `www.models-resource.com` renvoie un refus de tunnel 403. La page
Spriters expose les nouveaux domaines `models.spriters-resource.com`,
`textures.spriters-resource.com` et `sounds.spriters-resource.com`. Leur ajout au
brouillon réseau ne vaut pas application ; aucune ressource de ces nouveaux
domaines n’est revendiquée comme téléchargée dans ce lot.

## Reproduction et vérification

La demande de revue versionnée est `docs/R23_VISUAL_IMPORT_REQUEST.json`. Elle
associe la page, le ZIP, le membre PNG, les sept recadrages, leurs formes et les
références secondaires. Depuis la racine, avec Python et Pillow :

```sh
python3 scripts/import-visual-archive-r23.py \
  --request docs/R23_VISUAL_IMPORT_REQUEST.json \
  --archive modules/fidelity-r23/visual/source/original.zip \
  --page modules/fidelity-r23/visual/source/page.html.txt \
  --output modules/fidelity-r23/visual
python3 -m unittest discover -s tests -p 'test_visual_archive_r23.py' -v
CHROME_BIN=/usr/bin/chromium node tests/browser-visual-r23.mjs
```

L’import refuse les changements de source, jeux incohérents, recadrages hors
limites, chemins traversants, doublons, liens symboliques et archives trop
volumineuses. Il lit les membres en mémoire, sans exécuter de ressource distante.
Les captures HTML sont livrées avec l’extension `.html.txt`, pour ne pas exécuter
leurs scripts sur l’origine de l’application.

Les tests comparent les octets conservés et tous les pixels des sept recadrages
avec le ZIP d’origine. Les contrôles navigateur comparent les portraits à l’atlas
décodé par ce même navigateur : le canvas prémultiplie les couleurs des pixels
semi-transparents, d’où une comparaison distincte du RGBA brut des fichiers.
Les chantiers R20-09, R20-10 et G-RENDU restent ouverts.
