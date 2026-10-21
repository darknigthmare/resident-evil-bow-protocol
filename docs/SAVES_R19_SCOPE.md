# R19 — centre de sauvegarde et restauration choisie

Base de la PR13 : R18 `f9dcf65c0b147be5942aba82ffbab738147d0481`.
Lots P1 traités : G-SAUVES, avec contribution à G-REPLAYS et G-RECETTE.

## Livré

Page `saves.html`, liée au centre de commande et incluse dans le build statique.
Inventaire de 18 clés persistantes connues, en huit groupes : Dossiers,
opérations, exercices contextuels, replays principaux, conclusions, commandes,
dojo (copies anciennes comprises) et volumes. Les clés non déclarées ne sont
ni énumérées, ni lues, ni exportées. La sélection éphémère d’un combattant est
exclue. Aucune requête de téléversement, aucun cookie ou jeton d’authentification.

L’export transporte chaque valeur brute, y compris une copie illisible. Une
absence reste distincte d’une chaîne vide. Les groupes entrants illisibles ou
aux empreintes internes invalides sont archivables, mais non restaurables.
Les données anciennes ne sont pas converties automatiquement.

L’import contrôle format, version, inventaire exact, doublons, types, bornes et
empreinte FNV. Cette empreinte détecte des dommages accidentels, pas une fraude.
Les enveloppes de copies alternées sont contrôlées ; le contenu de jeu et la
compatibilité des règles restent validés par les chargeurs de chaque mode.
Un texte JSON lisible n’est donc pas présenté comme une partie certifiée.
Utiliser uniquement ses propres copies ou une source de confiance.

Aucun groupe n’est coché par défaut. Après sélection, l’aperçu liste les ajouts,
remplacements et retraits. Un groupe choisi est restauré à l’identique, sans
fusion : une copie alternée absente est explicitement retirée, pour éviter
qu’une révision locale plus haute masque la copie restaurée. Les autres groupes
restent intacts. L’utilisateur doit demander le téléchargement de l’état local
avant restauration, confirmer qu’il l’a conservé et fermer les autres onglets.
Un clic de téléchargement ne prouve pas que le fichier est réellement sur disque.

Les lectures sont vérifiées deux fois ; l’état est comparé avant chaque écriture
et relu après chaque écriture, puis en fin d’opération. Un échec déclenche un
retour sur les seules valeurs écrites par cette tentative. Une valeur modifiée
par un autre écrivain n’est pas écrasée lors de ce retour. Si le retour ne peut
pas être confirmé, la page l’indique et propose encore l’export de récupération.
Pas de `localStorage.clear()`, de suppression automatique d’archives ou de
relance automatique d’une restauration.

## Limites importantes

Le stockage Web n’est pas une transaction multi-onglets. Cette protection est
une détection de conflit et un retour contrôlé, pas une garantie face à un arrêt
brutal du navigateur ou un disque défaillant. Un autre onglet peut lire un état
intermédiaire : fermer les autres modes avant restauration, puis les recharger.
Les états uniquement en mémoire, fichiers jamais importés et clés historiques
non déclarées ne font pas partie de la copie. Une origine (protocole/hôte/port)
possède son stockage propre ; un serveur local ne lit pas celui de Vercel.

Bornes : 8 Mio de caractères par valeur, 12 Mio de caractères cumulés et 32 Mio
UTF-8 par fichier. L’export refuse une copie dépassant ces bornes au lieu de la
tronquer. Au plus trois téléchargements préparés en parallèle, libérés après
10 secondes ou à la fermeture de page. Aucun budget de performance matériel
n’est déduit de ces plafonds.

## Validation

`tests/verify-save-center-r19.mjs` : 25 groupes exécutables ciblés ; erreurs de
Storage injectées explicitement, vrai chargeur de Dossier et vraie restauration
de session contextuelle. `tests/browser-save-center-r19.mjs` : huit parcours par
largeur 1440/390, imports et téléchargements réels, conflit avec un second onglet,
quota injecté, annulation clavier et lien XLSX. Les résultats exécutés JSON font
autorité ; la présence d’un script n’est pas un résultat de test.

Le navigateur du conteneur a refusé HTTP local (ERR_BLOCKED_BY_ADMINISTRATOR).
Aucun contournement tenté. Les tests HTTP sont confiés au runner GitHub habituel.
Aucun appareil physique, lecteur d’écran, interruption électrique ou BFCache réel
n’est certifié. Les transitions pagehide/pageshow invalident les aperçus.

`docs/planning/BOW_SAUVEGARDES_R19.xlsx` : cinq onglets, six travaux, 18 clés,
25 contrôles locaux et quatre formules. C’est un complément du P1, pas sa
réécriture. Les 11 classeurs précédents sont conservés. G-SAUVES reste EN COURS
pour sa portée complète (cloud, formats historiques non documentés, crash-atomicité).

## Préservation et sources

Aucun ancien fichier `src/`, données, assets ou classeur n’est modifié. Les trois
contrats de replay/journal sont identiques. Aucun sprite, son, geste canonique ou
récompense ajouté. Le centre de sauvegarde ne lance pas un combat.

- Code R18 : https://github.com/darknigthmare/resident-evil-bow-protocol/tree/f9dcf65c0b147be5942aba82ffbab738147d0481
- MDN Web Storage : https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- MDN storage event : https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event

Documentation consultée le 21 octobre 2026. Les sources navigateur étayent les
contraintes de stockage, pas une fidélité artistique ou un audit de sécurité.
