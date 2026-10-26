# R26 — répétition atomique de restauration

La [page de répétition](../modules/fidelity-r26/persistence/index.html) ajoute un
atelier de restauration **isolé dans IndexedDB**. Il conserve son état et son
journal après rechargement. Il ne lit ni ne remplace le `localStorage` du jeu et
n’ajoute aucun service cloud.

## Parcours réalisé

1. Importer une sauvegarde R19 de départ dans la seule base
   `re.bow.restore-rehearsal.r26` ; remplacer un atelier existant demande un choix
   explicite. L’ouverture d’un fichier ne déclenche aucune écriture.
2. Ouvrir la sauvegarde à essayer, choisir ses groupes lisibles et prévisualiser
   chaque ajout, remplacement ou retrait. Les groupes non choisis conservent
   exactement leurs chaînes brutes.
3. Demander le téléchargement de la copie avant répétition, puis confirmer
   l’application à la base isolée. Le navigateur demande le téléchargement ; il
   ne certifie pas que la personne a conservé le fichier sur son disque.
4. Exporter l’état obtenu au format R19, retrouver le journal après rechargement
   ou revenir explicitement aux valeurs brutes précédant la répétition.
5. Effacer explicitement cet atelier. Aucun autre stockage n’est effacé.

Les sauvegardes exportées sont de **nouvelles enveloppes R19**, avec de nouvelles
métadonnées de conteneur. Les valeurs imbriquées restent des chaînes exactes :
espaces, Unicode, ordre des propriétés et valeurs nulles sont conservés.
L’outil ne prétend pas reproduire les octets du conteneur d’entrée.

## Contrat et frontières

Le module R19 `src/save-center-r19.js` est réutilisé à l’octet : décodage,
inventaire de clés, description des groupes et aperçu en mémoire. La fonction
`parseStrict` R23 refuse aussi les propriétés JSON répétées, y compris dans les
valeurs sélectionnées. Un groupe vide ou endommagé ne peut pas être choisi.
Aucune clé inconnue ni migration de contrat n’est introduite.

Les contrôles R19 établissent une lisibilité extérieure. Ils ne valident pas les
règles de progression de chaque mode. Le checksum FNV du transport détecte des
dommages accidentels et **ne prouve pas l’authenticité** d’une sauvegarde.
Les limites restent de 32 Mio par fichier, 8 388 608 unités UTF-16 par valeur et
12 582 912 unités UTF-16 cumulées. Le parseur strict borne l’imbrication à 96.

## Transaction et retour

La base possède deux magasins : `values` pour les clés brutes autorisées et
`meta` pour la révision et un journal. Chaque import, application, retour ou
effacement utilise une transaction couvrant les deux magasins. La promesse ne
publie un succès qu’après l’événement `complete` d’IndexedDB.

L’aperçu est opaque et à usage unique. La transaction compare la révision et les
valeurs exactes à l’état prévisualisé, dans la même transaction d’écriture. Un
onglet concurrent ne peut donc pas profiter d’un aperçu périmé. Le journal
conserve l’état avant et après la dernière application, avec les groupes et la
source descriptive. Un retour exige la révision attendue et les valeurs encore
identiques à cet état après ; une modification extérieure est conservée et
bloque le retour.

Une interruption avant validation annule les écritures et le journal ensemble.
Après un refus ou une interruption, l’interface retire l’aperçu consommé et
demande une nouvelle prévisualisation, une nouvelle conservation de la copie
avant répétition et une nouvelle confirmation avant de réessayer.
L’arrêt physique de la machine, la durabilité du disque, l’éviction du stockage
par le navigateur et les erreurs de matériel ne sont pas certifiés par ce test.
L’espace disponible dépend du quota réel du navigateur ; un refus n’est pas
converti en succès ni en écriture dans le stockage du jeu.

## Replays et moteurs

L’état exporté s’ouvre dans le [vérificateur R25](../modules/fidelity-r25/persistence/index.html),
qui réutilise les trois vrais moteurs déjà documentés : principal courant,
principal avant R13 et expérimental R7 individuel. Cette livraison n’en copie
aucun et ne modifie aucun contrat de simulation. Le format R19 conserve
l’archive principale ; le replay R7 reste individuel.

## Vérifications exécutées

- **6 groupes Node réussis** : nom de base isolée, dépendances requises, fichiers
  malformés ou avec propriétés répétées, checksum endommagé, annulation préalable,
  refus de politique de stockage et atelier fermé. Ces refus précèdent toute
  ouverture ou écriture non autorisée.
- **10 groupes Chromium réussis** : parcours complet à 1 440 et 390 pixels,
  conservation brute des groupes, téléchargement avant/après, retour exact,
  reprise après rechargement, journal durable, plans étrangers ou périmés,
  pré-annulation, politique de stockage refusée et IndexedDB absent.
- Un test injecte une interruption dans **une vraie transaction IndexedDB après
  trois `put` déjà placés dans sa file**. Les valeurs et le journal restent
  identiques à l’état précédent, y compris après fermeture et réouverture de la
  base. Le même refus est éprouvé dans l’interface : l’aperçu consommé est retiré
  et la reprise exige une nouvelle prévisualisation, une nouvelle demande de
  copie de sécurité et une nouvelle confirmation. Il s’agit d’une interruption
  contrôlée, pas d’une panne physique.
- Les sauvegardes témoins du jeu et une clé étrangère restent inchangées ; aucun
  appel distant n’est observé dans les parcours principaux. Le clavier, les
  métadonnées hostiles rendues comme texte et le texte à 200 % sur 320 pixels
  CSS sont vérifiés. Aucun lecteur d’écran matériel n’est certifié.

```sh
python scripts/build-persistence-manifest-r26.py --check
node tests/verify-persistence-r26.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-persistence-r26.mjs
```

Rapports : [gardes Node](R26_PERSISTENCE_TESTS.json),
[transactions dans Chromium](R26_PERSISTENCE_BROWSER_TESTS.json).
Le [manifeste](../modules/fidelity-r26/persistence/manifest.json) enregistre les
SHA-256 de l’implémentation et des deux dépendances originales.

Les chantiers sauvegarde, compatibilité des replays et restauration restent
ouverts pour le stockage réel du jeu, les autres révisions, le cloud et les
pannes physiques. Cette fonctionnalité ne certifie pas la fidélité visuelle,
sonore ou artistique 1:1 aux jeux Resident Evil.
