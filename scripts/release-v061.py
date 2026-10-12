#!/usr/bin/env python3
"""Document only the execution results present in this checkout."""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[1]
def load(p):return json.loads((R/p).read_text(encoding='utf8'))
def put(p,data):(R/p).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
pkg=load('package.json');data=load('data/roster.json');assert pkg['version']==data['version']=='0.6.1'
suites={}
for name,file in [('engine','engine-results.json'),('pages','pages-results.json'),('ui','ui-results.json'),('re5','v060-results.json'),('continuity','v061-results.json')]:
 result=load('tests/'+file);failed=result.get('failed',result.get('failures',0));assert failed==0,(name,failed)
 passed=result['passed'] if 'passed' in result else result['checks']-failed
 suites[name]={'passed':passed,'failed':failed}
total=sum(s['passed'] for s in suites.values());assert total>=97
visual=load('docs/qa-v061-offline-ui.json');assert visual['passed']==10 and visual['failed']==0
contract=json.loads(re.search(r'Object.freeze\((.*)\);',(R/'src/runtime-contract.js').read_text()).group(1))
ids={f['uid'] for f in data['fighters']};remaining=sum(c['id'] not in ids for c in data['catalog'])
manifest={'version':'0.6.1','codename':'Containment Continuity','counts':data['counts'],'newPlayableSubjects':0,'runtimeContract':contract,
 'verification':{'passed':total,'failed':0,'suites':suites,'offlineChromium':{'passed':10,'failed':0,'report':'docs/qa-v061-offline-ui.json','scope':visual['scope']},'scope':'Executed engine, paired controlled DOM and native Canvas. Evidence labels in movesets are not a canon certification.'},
 'features':['Validated dual-slot operation checkpoints','Interrupted encounter restarts with same route/seed/starting health','Checkpoint import/export and stale-tab conflict detection','Versioned replay runtime contracts','Engine-driven laboratory for 1150 existing command slots','Searchable archive of 460 existing stylized finishers','Winner-slot identity validation','Local packaged assets instead of historical Vercel proxy'],
 'remaining':{'documentaryWithinExistingCatalog':remaining,'referenceOnlyRE5Sprites':16,'provisionalE001Composites':6,'spatialWeakpointsImplemented':False,'perMoveSkeletalAnimationImplemented':False,'franchiseExhaustive':False,'cloudSave':False,'legacyReplays':'Kept intact; require their original game version'},
 'production':'Read current Vercel deployment and alias; a release archive does not prove production promotion.'}
put('docs/RELEASE_MANIFEST_v0.6.1.json',manifest)
notes=f'''# B.O.W. Protocol v0.6.1 — Containment Continuity

## Contenu conservé
115 incarnations jouables, 1 150 commandes, 115 Dossiers / 920 essais, 460 conclusions stylisées, 389 entrées de catalogue et 52 configurations d’arène. Aucun nouveau combattant ou pouvoir canonique n’est ajouté par cette version.

## Changements jouables
- Reprise des opérations Arcade, Survie, Boss Rush, Apex, E-001 Family et Uroboros. Un duel interrompu recommence à son état de départ avec la même route, graine, difficulté et santé initiale. Après une victoire réelle, la reprise passe au prochain duel sans attribuer la victoire deux fois.
- Deux copies locales à révision et empreinte d’intégrité ; récupération de la dernière copie valide, import/export JSON contrôlé, détection des changements d’un autre onglet. Le contrôle d’intégrité protège des corruptions accidentelles, pas de la triche. Il ne s’agit pas d’un verrou transactionnel multi-onglets ni d’une sauvegarde cloud.
- Une opération terminée ou perdue efface son point de reprise. Les Dossiers et records antérieurs ne sont pas supprimés. Le lancement d’un nouveau parcours remplace explicitement la reprise.
- Résultats de duel : cohérence gagnant/perdant/numéro de joueur, santé et corrélation de requête ; le bouton Suivant ne saute plus un combat non validé.
- Replays : empreinte SHA-256 des sources de gameplay et des données. Un replay ancien sans contrat ou incompatible est refusé avant toute modification du combat ; son fichier n’est pas effacé. Le lire dans la version d’origine.
- Banc d’essai `laboratory.html` : chaque commande s’exécute dans le vrai moteur, avec pause, pas de simulation, accès au démarrage, adversaire mannequin, garde haute/basse, saut, orientation, distance, vitesses et volumes de collision. Ressources et conditions de test sont annoncées. Le banc ne décerne ni victoire ni récompense.
- Archive `finishers.html` : les 460 conclusions existantes sont consultables et filtrables ; remplacement du lien hérité cassé. Ce ne sont pas 460 nouvelles animations.
- Archive de techniques : liens TESTER, directions relatives AVANT/ARRIÈRE et affichage simultané des deux coûts lorsque nécessaire.
- Livraison autonome : suppression de la redirection des assets vers un ancien déploiement Vercel ; les fichiers fournis accompagnent le nouveau build.

## Fidélité et limitations
Les formes et leurs capacités existantes sont conservées. Les commandes, frames, dégâts, ressources et affrontements croisés restent une adaptation 2D. Le banc d’essai expose ces règles réelles mais ne transforme pas leur classification documentaire en preuve canonique.
16 références RE5 et six composites E-001 restent provisoires. Les animations propres à chaque technique, points faibles spatiaux et mutations scénarisées ne sont pas livrés par cette passe. Le catalogue contient encore {remaining} entrées non jouables et n’est pas exhaustif de toute la franchise.

## Validation
{total} contrôles exécutables réussis : moteur {suites['engine']['passed']}, opérations/pages {suites['pages']['passed']}, interface {suites['ui']['passed']}, RE5 {suites['re5']['passed']}, continuité {suites['continuity']['passed']}.
Les 1 150 commandes ont été déclenchées au démarrage prévu par le moteur ; cela ne certifie pas qu’elles touchent toutes un adversaire dans toute position. Les 460 conclusions sont couvertes par les tests d’archive.
Dix rendus/interfaces hors ligne dans Chromium (cinq pages, largeurs 1440 et 390) ne présentent aucune erreur JavaScript ni débordement horizontal du document. Les tableaux restent défilants. Le navigateur a reçu les fichiers locaux en mémoire ; la navigation HTTP et les iframes réseau n’ont pas été vérifiées dans ce contrôle. Les parcours et sauvegardes sont testés séparément dans les fenêtres DOM contrôlées avec le vrai moteur.
'''
(R/'docs/RELEASE_NOTES_v0.6.1.md').write_text(notes,encoding='utf8')
readme='''# Resident Evil — B.O.W. Protocol

## v0.6.1 — Containment Continuity

Prototype de combat 2D basé sur CQC Versus Legacy v0.60. Projet de fans non officiel.
115 incarnations / 1 150 commandes / 115 Dossiers / 460 conclusions stylisées / 389 entrées de catalogue / 52 configurations d’arène.

### Lancer

```sh
npm start
```

Ouvrir l’adresse locale imprimée par le serveur. Les lanceurs Windows et macOS/Linux sont également conservés.

### Nouveautés pratiques

- Dans **Opérations**, suspendre puis **Reprendre le parcours**. Export/import JSON disponible dans le panneau Machine à écrire. Un duel en cours reprend depuis son début, pas au milieu d’une animation. Nouveau parcours = remplacement de la reprise ; Dossiers/records conservés.
- Dans **Movesets**, le lien **TESTER** de chaque technique ouvre le **Banc d’essai** : `laboratory.html`. Pause, +1 frame, démarrage, garde du mannequin, distance et collisions.
- L’**Archive des conclusions** (`finishers.html`) donne accès aux 460 fiches existantes. Les scènes restent stylisées et non canoniques.
- `coverage.html` distingue les 274 entrées encore documentaires et les visuels provisoires.

Les replays de versions antérieures sans contrat ne sont pas effacés ; ils nécessitent leur ancienne version du jeu. Aucune synchronisation cloud n’est incluse.

### Vérifier et compiler

```sh
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.80
npm run verify
npm run build
```

Après une modification des données ou du gameplay :

```sh
python3 scripts/build-lore-movesets.py
python3 scripts/compile-content.py
node scripts/contract.mjs --write
npm run verify
python3 scripts/release-v061.py
npm run build
```

Le build échoue aux tests si l’empreinte de contrat n’est plus cohérente. Lire les notes de release et le manifeste dans `docs/`. Une archive valide n’atteste pas d’un déploiement public ; consulter Vercel et le rapport de livraison correspondant.

### Fidélité

Les formes et capacités sont compartimentées par incarnation. Les valeurs de combat, contrôles, duels et finishers sont adaptés au versus. Les poses RE5 et six composites E-001 restent provisoires ; les animations par technique et points faibles spatiaux sont encore à produire. Aucun 1:1 visuel/animé exhaustif n’est revendiqué.

Resident Evil, ses personnages et lieux appartiennent à leurs ayants droit dont Capcom. Ce projet n’est pas un produit officiel.
'''
(R/'README.md').write_text(readme,encoding='utf8');(R/'docs/README_FR.md').write_text(readme,encoding='utf8')
print(json.dumps({'version':'0.6.1','passed':total,'suites':suites,'offlineViews':10,'runtimeContract':contract['digest']}))
