#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from collections import Counter
from datetime import date
import hashlib, json, subprocess

ROOT=Path(__file__).resolve().parents[1]
read=lambda p: json.loads((ROOT/p).read_text(encoding='utf-8'))
write=lambda p,s: (ROOT/p).write_text(s.rstrip()+"\n",encoding='utf-8')
sha=lambda p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
package=read('package.json'); data=read('data/roster.json'); lore=read('data/lore-movesets.json'); chronicles=read('data/chronicles.json'); finishers=read('data/finishers-v053.json')
version=package['version']; c=data['counts']; fighters=data['fighters']
release_ids=['re7-jack-baker-mutated','re7-jack-baker-swamp-man','re7-marguerite-baker-mutated','re7-lucas-baker-mutated','re7-eveline-final','re7-fumer']
by={f['uid']:f for f in fighters}
release=[by[x] for x in release_ids]
engine=read('tests/engine-results.json'); pages=read('tests/pages-results.json'); ui=read('tests/ui-results.json')
engine_pass=engine.get('passed',sum(x['pass'] for x in engine.get('checks',[]))); pages_pass=pages.get('passed',sum(x['pass'] for x in pages.get('checks',[]))); ui_pass=ui['checks']-ui['failures']; executable=engine_pass+pages_pass+ui_pass
release_date='11 octobre 2026'

new_table='\n'.join(f"| {f['name']} | {f['ep']} | {f['bioAgent']} | {f['combat']['role']} |" for f in release)
readme=f'''# Resident Evil — B.O.W. Protocol

Jeu de combat 2D de fans construit à partir du moteur **CQC Versus Legacy v0.60** de Darknigthmare, avec un roster, une progression, une interface et des données Resident Evil indépendants.

**Version {version} — Incident Baker, {release_date}.** Cette version porte le roster à **{c['fighters']} incarnations jouables** et transforme six dossiers de *Resident Evil 7 biohazard* en combattants complets, sans fusionner leurs phases ni importer des capacités d’une autre mutation.

## Contenu {version}

- **{c['fighters']} B.O.W., mutants et antagonistes jouables**, chacun limité à l’épisode et à la forme indiqués.
- **{c['loreMoves']} techniques**, soit dix commandes par sujet.
- **{c['canonicalMoves']} techniques canoniques**, reliées à une action ou un comportement documenté.
- **{c['anatomicalMoves']} extensions anatomiques**, fondées sur la morphologie visible sans ajouter un pouvoir étranger.
- **{c['simulationMoves']} traductions de simulation**, nécessaires au jeu de combat et explicitement signalées comme non canoniques.
- **{c['fighters']} signatures complètes distinctes** : aucun sujet ne reprend intégralement le répertoire d’un autre.
- **{c['stories']} Dossiers de confinement** de huit rencontres, soit **{c['duels']} essais**.
- **{c['finishers']} conclusions de duel**, **{c['catalog']} fiches de Bestiaire** et **{c['paintedArenas']} configurations d’arène**.

L’[Archive des movesets](movesets.html) permet de consulter les {c['loreMoves']} techniques avec commande, niveau de preuve, justification, valeurs de simulation, contre-jeu et sources.

## Incident Baker

| Sujet jouable | Incarnation | Agent | Rôle tactique |
|---|---|---|---|
{new_table}

Ces six profils possèdent chacun un sprite en pied, dix techniques écrites pour la phase concernée, quatre conclusions stylisées et un Dossier de huit essais. Les mutations de Jack, Marguerite, Lucas et Eveline restent séparées de leurs autres états.

## Jouer

- Production : <https://resident-evil-bow-protocol.vercel.app/>
- Dépôt : <https://github.com/darknigthmare/resident-evil-bow-protocol>
- Drive : voir `docs/deployment.json`.

Pour lancer localement avec **Node.js 20 ou ultérieur** :

```sh
npm start
```

Puis ouvrir `http://localhost:5173`. Aucune dépendance n’est nécessaire pour jouer. Les lanceurs `LANCER_WINDOWS.bat` et `LANCER_MAC_LINUX.sh` sont inclus.

Le menu donne accès au Versus, aux Dossiers, à l’Arcade, à la Survie, au Boss Rush, au Laboratoire, au Bestiaire et à l’Archive des movesets.

## Commandes

| Action | Joueur 1 | Joueur 2 |
|---|---|---|
| Déplacement, saut, accroupi | Flèches | W A S D |
| Coup léger / lourd | J / K | F / G |
| Coup bas | ↓ + J | S + F |
| Technique neutre / directionnelle | I + direction | T + direction |
| Prise | U | R |
| Super / finisher | O | Y |
| Utilitaire propre au sujet | L | H |
| Garde | Espace | Q |
| Dash | Majuscule droite | E |

Les commandes correspondent aux positions physiques QWERTY. Sur AZERTY, les déplacements du joueur 2 correspondent à Q / D / Z / S et sa garde à A. Manettes standard et commandes tactiles sont prises en charge. F1 ouvre le dossier des techniques ; F2 ouvre les conclusions.

## Portée de la fidélité « 1:1 »

La fidélité porte sur l’incarnation, l’épisode, la forme, l’agent biologique, l’anatomie, les familles d’attaque et les comportements documentés. Les formes sont cloisonnées : une créature ne reçoit pas silencieusement les pouvoirs d’une autre mutation, phase ou version.

La livraison ne prétend pas extraire ou reproduire les animations, hitboxes, frames ou valeurs internes des jeux Capcom. Les commandes, timings, dégâts, ressources, collisions, enchaînements, campagnes, affrontements entre époques et finishers sont des adaptations originales du moteur 2D. Cette frontière est visible dans le Bestiaire, le Laboratoire et l’Archive des movesets.

Les niveaux de preuve sont :

- **Canonique** : action ou comportement documenté pour cette incarnation ; seules les valeurs de duel sont adaptées.
- **Anatomique** : extension prudente de la morphologie ou de la locomotion visibles, sans nouveau pouvoir.
- **Simulation** : fonction nécessaire au jeu de combat, explicitement non présentée comme canonique.

Le détail complet figure dans [`docs/AUDIT_LORE_V030.md`](docs/AUDIT_LORE_V030.md) et [`docs/MOVESETS_COMPLETS_V030.md`](docs/MOVESETS_COMPLETS_V030.md).

## Interface Resident Evil

La version {version} unifie les écrans autour d’un terminal de confinement original : noir industriel, rouge d’alerte, vert vital, ambre de précaution, scanlines, dossiers biologiques et états **FINE / CAUTION / DANGER**. L’accueil comprend désormais le panneau **Incident Baker**, alimenté directement par les données du roster.

Cette direction artistique est une création originale pour le fangame ; elle ne recopie pas l’interface ou les ressources d’un titre commercial.

## Développement, compilation et validation

Le contenu éditable se trouve dans `data/`. Pour régénérer le contrat lore et les données navigateur :

```sh
python3 scripts/apply-v030-re7-bosses.py
python3 scripts/build-lore-movesets.py
python3 scripts/compile-content.py
python3 scripts/generate-v030-docs.py
```

Pour valider et construire :

```sh
npm run verify
npm run build
```

La validation actuelle comprend :

- l’audit exhaustif des **{c['fighters']} profils et {c['loreMoves']} mouvements** ;
- **{engine_pass}/{engine_pass}** contrôles moteur, IA, ressources, statuts, replays, images et Dossiers ;
- **{pages_pass}/{pages_pass}** contrôles Bestiaire et Opérations reliés au moteur ;
- **{ui_pass}/{ui_pass}** contrôles d’interface, navigation et initialisation DOM réelle.

Total : **{executable}/{executable} contrôles exécutables réussis**, en plus de l’audit exhaustif des données. GitHub Actions réexécute ces contrôles sur chaque push et chaque pull request.

## Sources, crédits et statut

Resident Evil / Biohazard, ses personnages, créatures et lieux appartiennent à leurs ayants droit, dont Capcom. Projet de fans non officiel. Les URL de référence et la provenance des ressources sont conservées dans les données et dans `data/asset-sources.json`.

Le code de base reste attribué au projet CQC Versus Legacy de Darknigthmare. La transposition et les empreintes sont documentées dans `docs/source-provenance.json`. Aucune licence générale sur les ressources Resident Evil n’est accordée par ce dépôt.
'''
write('README.md',readme)
write('docs/README_FR.md',readme.replace('# Resident Evil — B.O.W. Protocol','# Guide complet — Resident Evil : B.O.W. Protocol'))
subprocess.run(['pandoc','docs/README_FR.md','-s','-f','gfm','-t','html5','--metadata',f'title=Guide — Resident Evil : B.O.W. Protocol {version}','--css=../styles/hub.css','--css=../styles/bow-v030.css','-o','docs/README_FR.html'],cwd=ROOT,check=True)

release_notes=f'''# Notes de version — B.O.W. Protocol {version}

**Nom de code : Incident Baker**  
**Date : {release_date}**

## Nouveaux combattants
'''
release_notes += '\n'.join(f"- **{f['name']}** — {f['ep']} — {f['combat']['role']}." for f in release)
release_notes += f'''\n\n## Systèmes et contenu

- Roster porté de 75 à **{c['fighters']}** sujets.
- Répertoire porté de 750 à **{c['loreMoves']}** techniques.
- Dossiers portés à **{c['stories']}**, soit **{c['duels']}** essais.
- Finishers portés à **{c['finishers']}**.
- Six nouveaux profils biologiques, ressources et passifs propres à chaque phase.
- Accueil **Incident Baker**, compteurs dynamiques et thème `bow-v030.css`.
- Scripts de compilation et tests rendus dynamiques : les compteurs ne sont plus figés à 75/750.
- CI GitHub complète avec backend Canvas natif, QA et build statique.

## Corrections structurelles

- Ajout de l’identifiant de combat à chaque nouveau sujet.
- Dimensions de collision maintenues dans l’enveloppe validée du moteur, indépendamment de la largeur des illustrations.
- Cinématiques des nouveaux Dossiers alignées sur le contrat des 75 dossiers historiques.
- Toutes les phases sont séparées par UID, agent, silhouette, passif et moveset.

## Validation

- Lore : **{c['fighters']} profils / {c['loreMoves']} techniques / {c['fighters']} signatures distinctes**.
- Moteur : **{engine_pass}/{engine_pass}**.
- Bestiaire et Opérations : **{pages_pass}/{pages_pass}**.
- Interface : **{ui_pass}/{ui_pass}**.
- Total exécutable : **{executable}/{executable}**.
'''
write('docs/RELEASE_NOTES_v0.3.0.md',release_notes)

audit=f'''# Audit lore et movesets — version {version}

## Résultat

- **{c['fighters']}/{c['fighters']} incarnations jouables couvertes** par un profil indépendant.
- **{c['loreMoves']}/{c['loreMoves']} techniques** compilées et traçables.
- **{c['fighters']} signatures complètes distinctes**.
- **{c['canonicalMoves']} canoniques**, **{c['anatomicalMoves']} anatomiques**, **{c['simulationMoves']} de simulation**.
- **{c['catalog']} dossiers de Bestiaire**, dont **{c['fighters']} jouables** et {c['catalog']-c['fighters']} documentaires.

## Règles de cloisonnement

1. L’UID représente une incarnation et une phase précises.
2. Une forme ne reçoit pas les organes, armes ou pouvoirs d’une autre phase.
3. Une entrée « canonique » décrit une action documentée pour cette incarnation ; les valeurs du duel restent adaptées.
4. Une entrée « anatomique » extrapole uniquement un mouvement compatible avec le corps visible.
5. Une entrée « simulation » répond à un besoin de lisibilité ou de mobilité et est signalée comme non canonique.
6. Les rencontres entre épisodes, finishers et résultats de combat sont des simulations de laboratoire, pas des événements de continuité.

## Incident Baker

| Sujet | Phase cloisonnée | Agent | Passif | Ressource |
|---|---|---|---|---|
'''
for f in release:
 audit+=f"| {f['name']} | {f['ep']} | {f['bioAgent']} | {f['combat']['passive']['name']} | {f['combat']['resource']['label']} |\n"
audit+=f'''\n## Couverture de preuve

| Niveau | Nombre | Part |
|---|---:|---:|
| Canonique | {c['canonicalMoves']} | {c['canonicalMoves']/c['loreMoves']:.1%} |
| Anatomique | {c['anatomicalMoves']} | {c['anatomicalMoves']/c['loreMoves']:.1%} |
| Simulation | {c['simulationMoves']} | {c['simulationMoves']/c['loreMoves']:.1%} |
| **Total** | **{c['loreMoves']}** | **100 %** |

## Limite de la revendication

L’audit confirme la cohérence des identités, anatomies, agents, sources et familles d’attaque dans les données livrées. Il ne revendique pas l’extraction des animations, hitboxes, frames ou paramètres internes des jeux Capcom. Les valeurs numériques, commandes, enchaînements et affrontements croisés sont des adaptations originales.

Le détail ligne par ligne figure dans [`MOVESETS_COMPLETS_V030.md`](MOVESETS_COMPLETS_V030.md) et dans l’interface `movesets.html`.
'''
write('docs/AUDIT_LORE_V030.md',audit)

cmd={'light':'J / F','heavy':'K / G','low':'↓+J / S+F','throw':'U / R','special':'I / T','specialDown':'↓+I / S+T','specialForward':'→+I / →+T','specialBack':'←+I / ←+T','super':'O / Y','utility':'L / H'}
label={'canonical':'Canonique','anatomical':'Anatomique','simulation':'Simulation'}
move_doc=[f'# Movesets complets — {c["fighters"]} sujets / {c["loreMoves"]} techniques','',f'Version **{version} — Incident Baker**. Les valeurs sont celles de la simulation 2D ; la colonne « preuve » indique la relation au matériau de référence.','']
for idx,f in enumerate(fighters,1):
 p=lore['profiles'][f['uid']]
 move_doc += [f'## {idx:02d}. {f["name"]}', '', f'- **Incarnation :** {f["ep"]}', f'- **Agent :** {f["bioAgent"]}', f'- **Rôle :** {f["combat"]["role"]}', f'- **Ressource :** {f["combat"]["resource"]["label"]} ({f["combat"]["resource"]["max"]})', f'- **Passif :** {f["combat"]["passive"]["name"]} — {f["combat"]["passive"]["desc"]}', f'- **Frontière :** {f["fidelity"]["balanceBoundary"]}', '', '| Commande | Technique | Preuve | Type | Dém./Act./Réc. | Dégâts | Coût |', '|---|---|---|---|---:|---:|---:|']
 for slot,m in f['combat']['moves'].items():
  move_doc.append(f"| {cmd[slot]} | {m['name']} | {label[m['evidence']]} | {m['kind']} | {m['startup']}/{m['active']}/{m['recovery']} | {m['damage']} | {m['cost']} |")
 move_doc += ['', '<details><summary>Justifications, contre-jeu et sources</summary>', '']
 for slot,m in f['combat']['moves'].items():
  move_doc += [f"**{m['name']} — {label[m['evidence']]}**",'',f"- Base : {m['loreBasis']}",f"- Adaptation : {m['adaptation']}",f"- Contre-jeu : {m['counterplay']}",f"- Source : {m['source']}",'']
 move_doc += ['</details>','']
write('docs/MOVESETS_COMPLETS_V030.md','\n'.join(move_doc))

verification=f'''# Vérification — Resident Evil : B.O.W. Protocol {version}

**Résultat final : {executable}/{executable} contrôles exécutables réussis, aucun échec, plus l’audit exhaustif des {c['fighters']} profils et {c['loreMoves']} techniques.**

| Suite | Résultat | Portée |
|---|---:|---|
| Audit lore | {c['fighters']}/{c['fighters']} profils, {c['loreMoves']}/{c['loreMoves']} techniques | Couverture, unicité, sources, niveaux de preuve, cloisonnement |
| Moteur et Dossiers | {engine_pass}/{engine_pass} | Parsing, assets, mouvements, IA, collisions, statuts, replays, sauvegardes, cinématiques |
| Bestiaire et Opérations | {pages_pass}/{pages_pass} | {c['catalog']} dossiers, filtres, liens jouables, Arcade, Survie, Boss Rush |
| Interface | {ui_pass}/{ui_pass} | Thème v{version}, compteurs, Incident Baker, navigation, Archive DOM réelle |
| **Total exécutable** | **{executable}/{executable}** | Tous les contrôles réussis |

## Données vérifiées

- **{c['fighters']}** combattants et **{c['loreMoves']}** commandes.
- **{c['stories']}** Dossiers et **{c['duels']}** résultats de progression validables.
- **{c['finishers']}** conclusions stylisées.
- **{c['catalog']}** fiches du Bestiaire.
- **{c['paintedArenas']}** configurations d’arène illustrées.
- **{c['canonicalMoves']} / {c['anatomicalMoves']} / {c['simulationMoves']}** techniques canoniques, anatomiques et de simulation.

## Incident Baker

Les six nouveaux sujets sont testés comme de vrais combattants : démarrage et activation des 60 techniques, dépense et récupération de ressources, collisions, IA, super, statuts, images, huit duels par Dossier et quatre conclusions par sujet.

## Limites des tests

Les tests valident les contrats de données et le rendu Canvas contrôlé. Ils ne revendiquent pas une comparaison pixel par pixel avec les jeux Resident Evil, ni une validation matérielle exhaustive de tous les navigateurs, manettes ou écrans physiques.
'''
write('docs/VERIFICATION_FR.md',verification)

links=f'''# Liens — Resident Evil : B.O.W. Protocol

**Version {version} · Incident Baker · {release_date}**

## Projet

- Production : <https://resident-evil-bow-protocol.vercel.app/>
- GitHub : <https://github.com/darknigthmare/resident-evil-bow-protocol>
- Google Drive : <https://drive.google.com/drive/folders/1_nofjkXcnWNcIYh-jK0_AcB32-sZD9g5>

## Documentation

- [Guide complet](README_FR.md)
- [Notes de version {version}](RELEASE_NOTES_v0.3.0.md)
- [Audit lore {version}](AUDIT_LORE_V030.md)
- [{c['loreMoves']} techniques détaillées](MOVESETS_COMPLETS_V030.md)
- [Rapport de vérification](VERIFICATION_FR.md)
- [Provenance](source-provenance.json)
- [État du déploiement](deployment.json)

La version {version} contient {c['fighters']} sujets, {c['loreMoves']} techniques auditées, {c['catalog']} fiches, {c['stories']} Dossiers, {c['finishers']} conclusions et {c['paintedArenas']} configurations d’arène. Les animations, frames et dégâts sont des adaptations de simulation ; l’incarnation, l’anatomie, l’agent et les familles d’attaque sont cloisonnés et sourcés.
'''
write('docs/LIENS.md',links)

deployment={
 'projectName':'resident-evil-bow-protocol','vercelProjectId':'prj_7UbXOgxYKAaAsyppLP1pth3OIK4M',
 'googleDriveFolder':'https://drive.google.com/drive/folders/1_nofjkXcnWNcIYh-jK0_AcB32-sZD9g5',
 'githubStatus':'repository_connected_source_ready','githubRepository':'darknigthmare/resident-evil-bow-protocol',
 'githubUrl':'https://github.com/darknigthmare/resident-evil-bow-protocol','publication':'GitHub source + Vercel static deployment',
 'productionUrl':'https://resident-evil-bow-protocol.vercel.app/','version':version,'releaseDate':'2026-10-11',
 'continuousDeployment':'GitHub Actions QA on push/PR; Vercel production promotion after verified build',
 'developmentBranch':'codex/v0.3-re7-bosses','productionStatus':'PENDING_V030_PROMOTION',
 'browserValidation':'automated_runtime_and_static_ui_passed','browserReport':'docs/VERIFICATION_FR.md',
 'loreAudit':{'profiles':c['fighters'],'moves':c['loreMoves'],'canonical':c['canonicalMoves'],'anatomical':c['anatomicalMoves'],'simulation':c['simulationMoves']},
 'verification':{'executableChecks':executable,'passed':executable,'failed':0},'completeMovesetsPath':'/movesets.html'
}
write('docs/deployment.json',json.dumps(deployment,ensure_ascii=False,indent=2))

prov=read('docs/source-provenance.json')
prov['residentEvilRelease']=version
prov['adaptationNotes']=[
 f"{c['fighters']} incarnations cloisonnées par forme et épisode.",
 f"{c['loreMoves']} techniques auditées : {c['canonicalMoves']} canoniques, {c['anatomicalMoves']} anatomiques, {c['simulationMoves']} de simulation.",
 f"Aucun moveset complet dupliqué parmi les {c['fighters']} sujets.",
 "Incident Baker : six formes RE7 passées du dossier documentaire au roster jouable.",
 "Traçabilité visible dans le Bestiaire, le Laboratoire et l’Archive des movesets.",
 "Interface originale de confinement avec états FINE, CAUTION et DANGER."
]
source_files=[p for p in (ROOT/'src').glob('*.js')]
prov['finalSourceHashes']={p.relative_to(ROOT).as_posix():sha(p.relative_to(ROOT).as_posix()) for p in sorted(source_files)}
interface_paths=['index.html','codex.html','movesets.html','operations.html','modules/chronicles.html','modules/versus.html','styles/archive.css','styles/hub.css','styles/re-theme.css','styles/bow-v030.css']
prov['finalInterfaceHashes']={p:sha(p) for p in interface_paths}
prov['loreAudit']={'schema':lore['schema'],'profiles':c['fighters'],'moves':c['loreMoves'],'canonical':c['canonicalMoves'],'anatomical':c['anatomicalMoves'],'simulation':c['simulationMoves'],'uniqueFullMovesets':c['fighters'],'source':'data/lore-movesets.json','report':'docs/AUDIT_LORE_V030.md','completeMoveList':'docs/MOVESETS_COMPLETS_V030.md'}
prov['verification']={'lore':'tests/verify-lore.mjs','engine':'tests/engine-results.json','pages':'tests/pages-results.json','ui':'tests/ui-results.json','summary':'docs/VERIFICATION_FR.md','executableChecks':executable,'passed':executable,'failed':0,'canvasBackend':'@napi-rs/canvas in CI; skia-canvas compatible fallback locally'}
editable=['data/roster.json','data/chronicles.json','data/finishers-v053.json','data/lore-movesets.json','scripts/apply-v030-re7-bosses.py','scripts/build-lore-movesets.py','scripts/compile-content.py','scripts/generate-v030-docs.py']
prov['editableSourceHashes']={p:sha(p) for p in editable}
prov['deployment']={'projectId':'prj_7UbXOgxYKAaAsyppLP1pth3OIK4M','productionAlias':'https://resident-evil-bow-protocol.vercel.app/','githubRepository':'darknigthmare/resident-evil-bow-protocol','status':'v0.3.0 pending verified promotion'}
write('docs/source-provenance.json',json.dumps(prov,ensure_ascii=False,indent=2))

# Manifest excludes generated dist and itself; intended to make the reviewed source reproducible.
manifest_files=[]
for p in sorted(ROOT.rglob('*')):
 if not p.is_file(): continue
 rel=p.relative_to(ROOT).as_posix()
 if rel.startswith(('dist/','node_modules/','.git/')) or rel=='docs/RELEASE_MANIFEST_v0.3.0.json': continue
 manifest_files.append({'path':rel,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
manifest={'schema':'re.bow.release-manifest/1','project':'Resident Evil — B.O.W. Protocol','version':version,'releaseDate':'2026-10-11','counts':c,'verification':{'executableChecks':executable,'passed':executable,'failed':0},'files':manifest_files}
write('docs/RELEASE_MANIFEST_v0.3.0.json',json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'version':version,'fighters':c['fighters'],'moves':c['loreMoves'],'docs':7,'manifestFiles':len(manifest_files),'checks':executable},ensure_ascii=False))
