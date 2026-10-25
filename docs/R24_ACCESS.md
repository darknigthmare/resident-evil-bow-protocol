# R24 — contrôles d’accès et de ressources

Les compléments R24 rendent la navigation des sources plus accessible sans
changer les fichiers des personnages, les commandes de combat ou les preuves
des versions précédentes. Les essais utilisent Chromium headless sous Linux
virtualisé. Ils ne valent pas une validation NVDA, VoiceOver, manette physique
ou matériel cible.

## Focus des images source

Le lecteur Malacoda désactive le bouton « Image précédente » en arrivant à la
première image. Si ce bouton avait le focus clavier, le navigateur plaçait le
focus sur `BODY` et les flèches suivantes n’agissaient plus sur le curseur.

`modules/fidelity-r24/access/focus-retention.js` replace le focus sur le curseur
si le contrôle devient désactivé. Il annule ce retour si l’utilisateur choisit
une autre cible, utilise Tab ou Échap, clique, masque la page ou quitte la
fenêtre. Le choix volontaire d’un autre lien n’est pas remplacé.

Chromium peut aussi conserver provisoirement le focus sur le bouton déjà
désactivé avant son prochain rendu. Le complément traite ce cas et la sortie
effective du focus ; il ne dépend pas de l’ordre de ces deux événements.

Le complément reconnaît le groupe historique `#controls` / `#position`.
Un nouveau lecteur peut employer `data-r24-focus-retention` sur son groupe et
`data-r24-focus-fallback="identifiant-du-curseur"` pour désigner le contrôle de
repli. Le curseur peut être frère du groupe de boutons.

## Texte agrandi

À 320 pixels CSS, neuf pages de sources débordaient lorsque le texte racine
était agrandi à 200 % : des mots de titres et libellés de boutons ne pouvaient
plus tenir sur leur ligne. `access/text-reflow.css` autorise leur retour à la
ligne et permet aux conteneurs de rétrécir. Le contenu n’est ni masqué, ni
réduit pour faire disparaître le débordement. La feuille est additionnelle
aux styles historiques.

Le lien d’évitement avait aussi une position négative fixe : une fois son texte
agrandi, une partie dépassait dans l’en-tête. Sa position hors focus dépend
désormais de sa propre hauteur. Au focus clavier, tout le lien reste visible.

## Navigation facultative à la manette

Le centre R24 et le lecteur de modèles proposent un bouton d’activation
explicite lorsque `navigator.getGamepads` existe. Aucun élément n’est activé
au chargement ou par une touche déjà maintenue : il faut d’abord la relâcher.

- La croix déplace le focus suivant l’ordre des commandes visibles.
- Gauche et droite ajustent un curseur ou une liste lorsque ces commandes
  ont le focus.
- A active un bouton, un lien ou un détail. La confirmation ne se répète pas
  quand A reste maintenu.
- B arrête cette navigation et remet le focus sur son bouton d’activation.
  Il ne déclenche aucun retour dans l’historique. B prend priorité si A est
  pressé au même instant.
- Une page cachée arrête le sondage. À son retour, les commandes doivent être
  relâchées avant toute nouvelle action.

Les champs de texte et fichiers gardent les actions normales du clavier et du
tactile. L’absence ou le refus de l’API ne bloque pas ces parcours.

Contrat d’intégration : `data-r24-gamepad-root` sur la zone à parcourir,
`data-r24-gamepad-ui` sur l’emplacement du bouton, puis le script historique
`src/menu-navigation-r20.js`, le complément `gamepad-navigation.js` et sa
feuille `gamepad.css`. Le moteur de combat n’utilise pas ce complément.

## Reproduire les contrôles

Le harnais d’accès utilise **axe-core 4.14.0**. Installer cet outil dans un
dossier d’outillage séparé, ou l’ajouter aux dépendances de validation sans
réécrire les manifestes du jeu. `AXE_CORE_PATH` désigne `axe.min.js` si le module
ne se résout pas depuis la racine.

```sh
AXE_CORE_PATH=/chemin/axe-core/axe.min.js CHROME_BIN=/usr/bin/chromium node tests/browser-access-r24.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-perf-r24.mjs
```

Le premier harnais examine les six pages de sources R23 et les six pages R24,
les contrastes simples visibles, le reflow à 320 pixels CSS et le texte agrandi.
320 pixels CSS simulent la largeur de mise en page d’un écran de 1 280 pixels
à 400 % ; le zoom de l’interface physique du navigateur n’est pas exercé.
Les commandes de manette sont injectées dans l’API du navigateur : aucune
manette physique n’est revendiquée. Le cas de visibilité masque le document
par une injection contrôlée pour vérifier cette branche.

Le second harnais demande 1 000 images successives, contrôle les pixels à
chaque centaine, suit la création et la fermeture des `ImageBitmap`, puis
exécute 1 020 demandes réparties sur trois minutes. Les compteurs mémoire
avant et après la collecte explicite des déchets sont conservés. Le nombre
de nœuds rattachés au document est distingué du compteur CDP, qui inclut aussi
les nœuds détachés en attente de collecte.

Les rapports sont `R24_ACCESS_BROWSER.json` et `R24_ACCESS_PERFORMANCE.json`.
Les captures et points de mesure intermédiaires restent dans `qa-access-r24/`
et `qa-perf-r24/`. Les règles axe incomplètes restent à vérifier ; une absence
de violation automatique ne certifie pas une conformité WCAG complète.

L’estimation mémoire des atlas vivants utilise quatre octets par pixel. Elle
exclut le GPU, les copies du canevas, la mémoire du processus et les caches
internes du navigateur. Le lecteur de modèles est examiné avec SwiftShader,
un rendu logiciel ; aucune performance GPU physique n’en est déduite.

## Mesures de cette exécution

Les **28 groupes d’accès réussissent** : les douze pages R23/R24 à deux
largeurs, le focus du lecteur et les trois scénarios de manette simulée.
Aucune violation axe n’est relevée sur les règles A/AA testées. Les
124 échantillons de contraste sur fonds simples visibles ont un minimum de
**7,31:1**. Les contrastes non déterminés automatiquement des listes et
tableaux restent indiqués comme incomplets dans le rapport, notamment dans
les pages canoniques et le relevé audio R23. Ces résultats n’étendent pas la
couverture aux contenus hors écran ou aux technologies d’assistance réelles.

Les deux groupes de performance réussissent. Le passage rapide de 1 000
images dure 4,710 secondes en boucle locale : délai médian de 1 ms, 95e
percentile de 4,3 ms, maximum observé de 334,6 ms. Ce maximum reste dans le
rapport ; le test n’impose pas une cadence du jeu à cette scène manuelle.

Le passage cadencé effectue 1 020 demandes sur **180,653 secondes**. Les
109 nœuds rattachés au document restent constants. Le compteur global CDP
retombe à 123 nœuds après collecte, comme au départ ; ses valeurs avant
collecte sont conservées. Le tas JavaScript final passe de 1 729 860 à
1 467 728 octets après cette collecte explicite.

Pendant ce passage, 47 atlas natifs sont décodés, 45 fermés et deux restent
vivants. Le maximum est de deux, soit une estimation RGBA de 19 514 880
octets pour ces seuls objets. La navigation réelle vers une autre page puis
Retour recharge le lecteur dans ce Chromium ; elle ne passe pas par le cache
de navigation. L’image et le déplacement suivant restent vérifiés après ce
rechargement.
