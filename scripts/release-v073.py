#!/usr/bin/env python3
"""Write release evidence from completed executable reports, not requested totals."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
d=read('data/roster.json');a=read('data/catalog-expansion-v070.json');assert read('package.json')['version']==d['version']=='0.7.3'
suites={}
for name,file in [('engine','engine-results'),('pages','pages-results'),('ui','ui-results'),('re5','v060-results'),('continuity','v061-results'),('catalog','v070-results'),('journal','v071-results'),('spatial','v072-results'),('contacts','v073-results')]:
 r=read('tests/'+file+'.json');failed=r.get('failed',r.get('failures',0));assert failed==0,(name,failed);suites[name]={'passed':r['passed'] if 'passed' in r else r['checks']-failed,'failed':failed}
total=sum(x['passed'] for x in suites.values())
manifest={'version':'0.7.3','codename':'Contacts et reprise','productionCounts':d['counts'],'annexCounts':a['counts'],'annexDataVersion':a['version'],'baseCommit':'b8330410ca9880914aac110285af965f3db592a5','newCharacters':0,'newFinalAnimations':0,'verification':{'passed':total,'failed':0,'suites':suites,'browser':'Separate offline Chromium report in delivery; HTTP navigation blocked by environment. No actual bfcache or physical-phone claim.'},'compatibility':{'mainReplay':'New runtime digest; old files kept for their original version.','contextJournal':'Engine, data and contract preserved byte-for-byte.'},'changes':['Fast return projectiles hit on their actual crossing frame','Critical projectile zones limited to first body contact','Combo escape follows incoming projectile flight','Last impact point and clipped trace in both laboratories','Validated shareable laboratory settings','Paused, single-loop resume after persisted pageshow in four rehearsal screens'],'limits':['115 main fighters, 231 experimental profiles and 43 abstract contextual exercises remain separate.','Only the existing five RE5 incarnations have spatial zones; no new weakpoint invented.','Sprites, per-move animations, exact Capcom hitboxes and the full primary-source lore audit remain unfinished.','Checksums are compatibility/corruption checks, not anti-cheat.','A pull request or archive does not constitute a production deployment.']}
(R/'docs/RELEASE_MANIFEST_v0.7.3.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
notes=f'''# B.O.W. Protocol v0.7.3 — Contacts et reprise

## Corrections du moteur
Un projectile revenant pouvait traverser entièrement sa cible sans infliger son second impact : sa cible est désormais réarmée avant le balayage, et uniquement après séparation. Un retour encore dans le corps ne bénéficie pas d'un double impact.
Un projectile non perforant ne peut plus emprunter le bonus d'un noyau situé après son premier contact avec le corps. Les zones superficielles frontales, dorsales et supérieures restent atteignables.
La sortie de combo utilise la direction du projectile à l'impact plutôt que l'orientation du tireur original.
Le dernier impact conserve le point de surface et le segment arrêté à ce point. Le rendu n'écrit pas dans la simulation.

## Laboratoires et reprise
Les deux laboratoires montrent CORPS, GARDE ou ZONE CRITIQUE, avec dégâts, frame et coordonnées. Le lien d'essai reproduit sujet, cible, commande, orientation, distance, garde et ouverture préparée, sans données de sauvegarde.
Les deux laboratoires, le duel expérimental et l'exercice contextuel redémarrent une seule boucle de rendu, en pause, lors d'un pageshow persisté. Ils conservent leur état et ne rejouent pas une attaque en attente.

## Tests
{total} contrôles exécutables réussis, zéro échec. La nouvelle suite contient {suites['contacts']['passed']} cas reproductibles. Les événements de cache sont synthétiques dans les tests DOM. Les contrôles Chromium hors ligne sont séparés et ne prouvent pas une navigation HTTP ou une utilisation sur appareil physique.

## Préservation
115 combattants principaux, 231 prototypes isolés, 43 exercices contextuels. Aucune nouvelle animation finale, créature ou capacité canonique ajoutée. Le journal conserve ses données et son empreinte. Les replays de combat utilisent le nouveau moteur et conservent les fichiers anciens sans les migrer silencieusement.
Les tâches restantes de sprites définitifs, animations par technique, phases de boss et sources primaires restent ouvertes.

Références de cycle de page : MDN Window/pageshow_event et Window/requestAnimationFrame. Les paramètres de collision sont ceux de ce prototype, pas des données Capcom.
'''
(R/'docs/RELEASE_NOTES_v0.7.3.md').write_text(notes)
(R/'README.md').write_text('# Resident Evil — B.O.W. Protocol\n\n## v0.7.3 — Contacts et reprise\n\n115 combattants principaux + 231 prototypes isolés + 43 exercices contextuels. Pas 389 combattants 1:1 finalisés.\n\n```sh\nnpm start\n```\n\n```sh\nnpm run verify\nnpm run build\n```\n\nCanvas de test : @napi-rs/canvas@0.1.80, ou repli skia-canvas documenté dans le harness. Voir docs/RELEASE_NOTES_v0.7.3.md et le manifeste.\n\nSource des anciens modes préservée, corrections de contacts et reprise en pause. Les visuels demeurent provisoires. Fangame non officiel : Resident Evil appartient à ses ayants droit dont Capcom.\n')
print(json.dumps({'version':'0.7.3','passed':total,'failed':0}))
