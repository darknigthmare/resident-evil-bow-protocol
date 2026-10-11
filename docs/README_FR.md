# Guide complet — Resident Evil : B.O.W. Protocol

Jeu de combat 2D de fans construit à partir du moteur **CQC Versus Legacy v0.60** de Darknigthmare, avec un roster, une progression, une interface et des données Resident Evil indépendants.

**Version 0.4.0 — Apex Mutation, 11 octobre 2026.** Cette livraison cumulative conserve **Incident Baker** et ajoute douze formes terminales issues de Resident Evil 2 remake, Resident Evil 3 remake, Resident Evil 4 remake, Resident Evil 6 et Resident Evil Village.

## Contenu

- **93** incarnations jouables et **930** techniques.
- **650** techniques canoniques, **203** anatomiques et **77** de simulation.
- **93** Dossiers de huit rencontres, soit **744** essais.
- **372** conclusions stylisées, **389** fiches de Bestiaire et **30** configurations d’arène.
- Sept protocoles : Versus, Dossiers, Arcade, Survie, Boss Rush, Laboratoire et **Apex Mutation**.

## Apex Mutation

| Sujet | Incarnation | Agent | Rôle |
|---|---|---|---|
| SUPER TYRANT — T-103 LIBÉRÉ | Resident Evil 2 remake (2019) | Virus-T / T-103 | BERSERKER DU LIMITATEUR ROMPU |
| NEMESIS — STADE 2 | Resident Evil 3 remake (2020) | Virus-T / parasite NE-α | POURSUITE QUADRUPÈDE |
| NEMESIS — STADE 3 | Resident Evil 3 remake (2020) | Virus-T / parasite NE-α | MASSE TERMINALE NE-α |
| DEL LAGO | Resident Evil 4 remake (2023) | Las Plagas | PRÉDATEUR LACUSTRE |
| GARRADOR | Resident Evil 4 remake (2023) | Las Plagas | BOURREAU AVEUGLE |
| IRON MAIDEN | Resident Evil 4 remake (2023) | Las Plagas / parasites régénératifs | RÉGÉNÉRATEUR À POINTES |
| RAMÓN SALAZAR — MUTATION | Resident Evil 4 remake (2023) | Las Plagas dominante | PRÉDATEUR DE LA CHANTRERIE |
| OSMUND SADDLER — MUTATION | Resident Evil 4 remake (2023) | Las Plagas dominante | ARCHONTE DES PLAGAS |
| ALCINA DIMITRESCU — MUTATION | Resident Evil Village (2021) | Cadou / mutamycète | DÉMON AILÉ DU CHÂTEAU |
| SALVATORE MOREAU — MUTATION | Resident Evil Village (2021) | Cadou / mutamycète | LEVIATHAN CORROSIF |
| KARL HEISENBERG — MUTATION | Resident Evil Village (2021) | Cadou / mutamycète | COLOSSE FERROMAGNÉTIQUE |
| USTANAK | Resident Evil 6 (2012) | Virus-C | TRAQUEUR À OUTILS INTERCHANGEABLES |

Le protocole Apex enchaîne douze affrontements fixes. Chaque adversaire ouvre sa chambre de confinement et conserve son UID, son agent, sa morphologie, sa ressource, son passif et ses dix techniques propres.

## Jouer

- Production : <https://resident-evil-bow-protocol.vercel.app/>
- GitHub : <https://github.com/darknigthmare/resident-evil-bow-protocol>

```sh
npm start
```

Pour reconstruire le contenu éditable :

```sh
python3 -m pip install -r requirements-content.txt
python3 scripts/apply-v040-apex-mutation.py
python3 scripts/build-lore-movesets.py
python3 scripts/compile-content.py
npm run verify
python3 scripts/generate-v040-docs.py
npm run build
```

## Fidélité

La fidélité porte sur l’incarnation, l’épisode, l’agent biologique, l’anatomie, la locomotion et les familles d’attaque documentées. Les commandes, timings, dégâts, ressources, collisions, duels croisés et finishers restent des adaptations originales du moteur 2D. Le projet ne revendique pas l’extraction des animations, hitboxes, frames ou paramètres internes des jeux Capcom.

## Validation

- Lore : **93/93 profils**, **930/930 techniques**, **93 signatures distinctes**.
- Moteur et Dossiers : **26/26**.
- Bestiaire et Opérations : **21/21**.
- Interface : **13/13**.
- Total exécutable : **60/60**.

Resident Evil / Biohazard, ses personnages, créatures et lieux appartiennent à leurs ayants droit, dont Capcom. Projet de fans non officiel.
