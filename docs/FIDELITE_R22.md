# R22 — références d’origine dans les Dossiers

Cette livraison corrige la présentation de 20 Dossiers avec des images sources
attribuées à l’identité et à la forme revues. Elle ajoute une lecture documentaire
de la scène où Nemesis infecte un zombie dans Resident Evil 3 remake (2020).
Elle ne finalise pas les rigs, les animations de combat ou la fidélité de tout le
catalogue.

## Utiliser la livraison

Lancer `npm start`, ouvrir le Bestiaire et consulter le dossier de Nemesis,
forme 1 de RE3 remake. Le lien « Voir une séquence d’origine » ouvre le lecteur.
Il démarre en pause et propose lecture, pause, image précédente/suivante,
recherche par curseur, retour au début et téléchargement de la source.
Les 13 premières images sombres appartiennent au fichier d’origine.

Les 20 images nommées couvrent RE7, ses DLC, Village et Méndez muté de RE4.
Elles comprennent 12 vues de corps, cinq portraits et trois scènes.
Une vue de corps ne garantit pas que toutes les parties soient visibles.
Les images restent des références publiées par des sources secondaires, avec
provenance et limites : leur copie exacte ne certifie pas une géométrie canonique.

Le dossier Jack Baker avec scie à ciseaux masque son ancien composite et indique
que la vue d’origine reste à documenter. Il ne reçoit pas le portrait d’une autre
phase. Les données de combat, les sauvegardes et les replays ne sont pas modifiés.

## Conservation des sources

Le module autonome est `modules/source-motion-r22/`. Les PNG revus conservent les
octets des téléchargements. Le GIF Nemesis original est conservé intact et les
150 images composites sont stockées sans perte dans cinq atlas limités à
2,88 millions de pixels chacun. Chaque image garde sa durée de 40 ms, soit
6 000 ms au total. Aucun miroir, détourage, mouvement interpolé ou audio ajouté.

Le lecteur vérifie les empreintes des atlas et limite son cache à deux images.
Les pauses demandées et le passage en arrière-plan restent respectés pendant
les chargements. Les portraits vérifient leur identité, leur jeu et leur
empreinte avant affichage ; une réponse tardive ne remplace pas un autre Dossier.

`docs/R22_SOURCE_ADDITIONS.json` enregistre les empreintes des 34 fichiers du
module et l’ajout exact des deux scripts dans `codex.html`. Les arbres historiques
protégés et leur référence R20 restent conservés.

## Validation exécutée

- Suite existante : **605 contrôles réussis**, sortie 0, rapports écrits dans une copie isolée.
- Outils de sources R21/R22 : **20 tests réussis**.
- Nouveau navigateur R22 : **8 groupes réussis**, dont comparaison RGBA des images
  0, 13, 31, 32, 75 et 149 en 1440/390 px, cadence native, pause, corruption,
  reprise, les 20 Dossiers, la phase Jack manquante et les réponses tardives.
- Pages joueur R20 : **16 contrôles réussis**.
- Conservation historique : **8 contrôles réussis**.
- Build statique : sortie 0.

Commandes depuis la racine, avec Node 22.16.0 et Python/Pillow disponibles :

```sh
python3 -m unittest discover -s tests -p 'test_*r2[12].py' -v
CHROME_BIN=/usr/bin/chromium node tests/browser-source-motion-r22.mjs
CHROME_BIN=/usr/bin/chromium node tests/browser-player-shell-r20.mjs
npm run build
```

La suite `npm run verify` réécrit des rapports historiques : utiliser la copie de
validation décrite dans les instructions de démarrage de l’environnement.
Le workflow `.github/workflows/source-fidelity-r22.yml` ajoute les tests de
transport/frames et les contrôles navigateur à la CI. Il est configuré, mais
n’a pas été exécuté sur GitHub pendant cette tâche.

## Suivi et travaux ouverts

[Le classeur R22](BOW_FIDELITE_R22.xlsx) conserve les 389 entrées : 388 ont un
fichier lié à sa source, 20 ont une image nommée intégrée dans le Dossier,
une possède cette séquence documentaire. Les **17 chantiers de production restent
ouverts**. Le compteur de fidélité globale 1:1 certifiée demeure nul.

Pour réexporter le classeur, le Python d’outillage cloud doit disposer
d’`openpyxl`, et les packs de référence collectés doivent être présents :

```sh
python3 scripts/export-fidelity-progress-r22.py
```

Restent à rechercher et produire : modèles et parties occultées, deux orientations
indépendantes, rigs, chaque geste et transformation, voix/sons, mesures et recette
par incarnation. Les trois autres GIF candidats (Adder, Tyrant v2, Malacoda)
renvoient 402 ; YouTube refuse la connexion, Fandom et Capcom refusent certaines
pages. Google présente une vérification anti-robot qui n’a pas été contournée.

Les domaines des archives de modèles, sprites, sons et d’un autre moteur de
recherche ont été ajoutés au brouillon pour poursuivre la recherche autonome :
`www.models-resource.com`, `www.spriters-resource.com`,
`www.sounds-resource.com`, `www.bing.com`.
Ils doivent être enregistrés/appliqués dans les paramètres avant leur consultation.
Aucun contenu de ces archives n’est revendiqué comme téléchargé.
