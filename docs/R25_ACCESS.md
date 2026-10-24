# R25 — accès aux lecteurs et aux Dossiers

Les lecteurs R25 conservent les contrôles de reflow et de navigation facultative
à la manette de R24. Le lecteur de modèles ajoute une navigation complète de la
caméra au clavier, un recadrage de la pose et un repli avec l’aperçu publié si
WebGL est indisponible. La lecture des mouvements et des sons reste manuelle.

Le lien d’évitement de la nouvelle page audio héritait d’une feuille qui ne
positionnait pas `.skip`. Le retour à la ligne R24 appliquait une transformation
à ce lien inline, qui restait donc visible hors focus avec le texte agrandi.
`modules/fidelity-r25/access/workbench.css` définit son positionnement et sa
largeur, le masque selon sa propre hauteur et le rend entièrement visible au
focus. Cette correction concerne les pages R25 qui la chargent.

Les Dossiers distinguent les modèles attribués des références candidates et
présentent les accès audio et documentaires sans lancer de son. Les textes
distants restent inertes et les liens qui sortent du lot sont refusés. Les
contrôles d’origine des Dossiers et leurs images restent conservés.

Le harnais `tests/browser-access-r25.mjs` inspecte chaque page R25 présente au
début de l’exécution à 1 280 et 320 pixels CSS, avec texte racine agrandi à
200 % pour cette dernière largeur. Il conserve les règles axe incomplètes et
les contrastes complexes non calculables. Il vérifie aussi le focus aux
extrémités des clés, la manette simulée et les liens des Dossiers à 1 280 et
390 pixels. La largeur CSS simule le reflow ; le zoom physique du navigateur
n’est pas exercé.

La version d’axe-core est 4.14.0. Les résultats et captures sont dans
`docs/R25_ACCESS_BROWSER.json` et `qa-access-r25/`. L’absence de violation
automatique ne vaut pas conformité WCAG complète. Lecteurs d’écran, appareils
et manettes physiques restent à éprouver.

Les **18 groupes de cette exécution réussissent** : les six pages aux deux
largeurs, les clés, deux scénarios de manette/API, les Dossiers aux deux
largeurs et le refus d’un index hostile. Les règles incomplètes et les limites
des contrastes échantillonnés restent présentes dans le rapport.
