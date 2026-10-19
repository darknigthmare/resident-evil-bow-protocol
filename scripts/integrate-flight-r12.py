#!/usr/bin/env python3
"""Two-command correction; existing gravity/collision engine remains untouched."""
from pathlib import Path
import json,subprocess,copy,hashlib,os
R=Path(__file__).resolve().parents[1];BASE=os.environ.get('BOW_R12_BASE','HEAD');UID='re7-flying-bug'
read=lambda p:json.loads((R/p).read_text());sha=lambda b:hashlib.sha256(b).hexdigest();old=lambda p:subprocess.check_output(['git','show',BASE+':'+p],cwd=R)
def change(file,a,b):
 p=R/file;s=p.read_text()
 if b in s:return
 assert s.count(a)==1,(file,a[:90],s.count(a));p.write_text(s.replace(a,b))
p=R/'data/roster.json';D=read('data/roster.json');f=next(f for f in D['fighters'] if f['uid']==UID)
f['role']=f['combat']['role']='INSECTE VOLANT — SIMULATION'
f['fidelity']['status']='source-review-partial'
f['fidelity']['rule']='Incarnation RE7 uniquement. La reprise R12 corrige les déplacements du prototype ; le répertoire officiel, les dimensions et animations restent à documenter.'
f['fidelity']['balanceBoundary']='Envol bref et retrait continus sous la gravité existante, sans téléportation, invincibilité, soin ou invocation. Les durées, déplacements et ressources sont des paramètres originaux de simulation.'
f['combat']['passive']={'id':'flight-maneuvers-r12','name':'Manœuvres aériennes — simulation','desc':'UTILITAIRE : envol bref avec faible recul. ARRIÈRE + SPÉCIAL : retrait plus long. Ces commandes sont payantes, utilisables depuis le sol et restent vulnérables ; aucun bonus automatique de focus.'}
f['combat']['fidelity']=copy.deepcopy(f['fidelity']);f['combat']['evidence']='source-review-partial'
for m in f['combat']['moves'].values():
 m['evidence']=m['lore']='simulation'
 m['adaptation']='Commande héritée du prototype 2D, non recertifiée comme geste officiel par R12. La référence secondaire indique le sujet RE7, pas ses timings, hitboxes ou ce mapping.'
 m['loreBasis']='Incarnation RE7 déjà identifiée dans le catalogue. Une vérification primaire et des séquences horodatées restent nécessaires pour certifier chaque geste ; pas de transfert depuis les homonymes Outbreak.'
utility=f['combat']['moves']['utility']
for k in ['buff','duration','hits','restore','blink']:utility.pop(k,None)
utility.update(name='Vol erratique — envol bref',kind='mobility',startup=8,active=12,recovery=20,travel=-5,launchSelf=-10.5,cooldown=90,cost=16,counterplay='Anticipation de 8 ticks, envol vulnérable et faible recul. Toucher le corps pendant le départ ou en altitude ; punir la descente. Aucun dégât, soin, buff de focus ou invincibilité.',adaptation=f['fidelity']['balanceBoundary'])
back=f['combat']['moves']['specialBack'];back.pop('blink',None)
back.update(name='Écart aérien — recul continu',cooldown=60,counterplay='Recul continu de 6 unités par tick actif après 4 ticks de départ ; pas de téléportation. Coins, atterrissage et interruption restent contraignants.',adaptation=f['fidelity']['balanceBoundary'])
p.write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n')
for file in ['src/technique-lab-v061.js','src/catalog-laboratory-v070.js']:
 change(file,' const begun=C.start(s,s.a,slot),',' const origin={x:s.a.x,y:s.a.y};let peakAltitude=0;\n const begun=C.start(s,s.a,slot),')
 change(file,'C.step(s,[C.empty(),input]);ticks++;','C.step(s,[C.empty(),input]);peakAltitude=Math.max(peakAltitude,C.FLOOR-s.a.y);ticks++;')
 change(file,'return{uid:f.uid,target:target.uid,slot,frame:ticks,','return{motion:{x:s.a.x,y:s.a.y,dx:s.a.x-origin.x,altitude:C.FLOOR-s.a.y,peakAltitude,grounded:s.a.onGround},uid:f.uid,target:target.uid,slot,frame:ticks,')
 change(file,'root.RE_LAB_CONTACT?.readout(x,bench);',"root.RE_LAB_CONTACT?.readout(x,bench);const mm=x.motion;if($('labMotion'))$('labMotion').textContent='DÉPLACEMENT '+mm.dx.toFixed(1)+' U · ALTITUDE '+mm.altitude.toFixed(1)+' U · MAX '+mm.peakAltitude.toFixed(1)+' U · '+(mm.grounded?'AU SOL':'EN AIR')+' — unités du prototype, pas des centimètres';")
for file in ['laboratory.html','catalog-laboratory.html']:
 change(file,'<p id="labContact"','<p id="labMotion" class="contact-status" aria-live="off"></p><p id="labContact"')
change('tests/r11-baseline.mjs',"import fs from 'node:fs';","import {r12Expected} from './r12-baseline.mjs';\nimport fs from 'node:fs';")
p=R/'tests/r11-baseline.mjs';s=p.read_text().replace('return previous;','return r12Expected(root,key,previous);').replace('return e.after;','return r12Expected(root,key,e.after);');p.write_text(s)
change('tests/verify-lucas-r11.mjs',"import fs from 'node:fs';","import {r12Expected} from './r12-baseline.mjs';\nimport fs from 'node:fs';")
change('tests/verify-lucas-r11.mjs',"p.profiles[f.uid],f.uid)","r12Expected(R,'fighter:'+f.uid,p.profiles[f.uid]),f.uid)")
change('tests/verify-combat-stage-r6.mjs',"if(f.uid==='re7-lucas-baker'){", "if(f.uid==='re7-flying-bug'){const delta=JSON.parse(read('docs/FLIGHT_R12_CHANGES.json')).changed['fighter:'+f.uid];assert.equal(delta.before,b.originalProfiles[f.uid]);assert.equal(hash(JSON.stringify(f)),delta.after);continue;}if(f.uid==='re7-lucas-baker'){")
change('tests/verify-combat-stage-r6.mjs','assert.equal(same,110);return{unchangedSinceR6:110,r6Changed:4,r11Changed:1}', 'assert.equal(same,109);return{unchangedSinceR6:109,r6Changed:4,r11Changed:1,r12Changed:1}')
change('tests/verify-combat-stage-r6.mjs','Historical R6 changes preserved; only documented human Lucas changes in R11','Historical R6/R11 changes preserved; only Flying Bug adds the reviewed R12 delta')
p=R/'package.json';P=read('package.json')
if 'verify-flight-r12' not in P['scripts']['verify']:P['scripts']['verify']+=' && node tests/verify-flight-r12.mjs'
p.write_text(json.dumps(P,ensure_ascii=False,indent=2)+'\n')
for script in ['build-lore-movesets.py','compile-content.py']:subprocess.run(['python3','scripts/'+script],cwd=R,check=True)
for script in ['contract.mjs','catalog-replay-contract.mjs']:subprocess.run(['node','scripts/'+script,'--write'],cwd=R,check=True)
previous=json.loads(old('data/roster.json'));after=read('data/roster.json');changed={}
for file in ['data/roster.json','data/lore-movesets.json','data/chronicles.json','src/re-data.js','src/chronicles-data-v060.js','src/runtime-contract.js','src/catalog-replay-contract.js','src/technique-lab-v061.js','src/catalog-laboratory-v070.js']:
 changed[file]={'before':sha(old(file)),'after':sha((R/file).read_bytes())}
compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
changed['mainFighters']={'before':sha(compact(previous['fighters'])),'after':sha(compact(after['fighters']))}
for f in after['fighters']:
 prior=next(g for g in previous['fighters'] if g['uid']==f['uid'])
 if f['uid']!=UID:assert f==prior,f['uid']
 else:changed['fighter:'+UID]={'before':sha(compact(prior)),'after':sha(compact(f))}
(R/'docs/FLIGHT_R12_CHANGES.json').write_text(json.dumps({'baseCommit':'355d545e08327d3cea0af20d3c0248de0e3364a5','changed':changed},indent=2)+'\n')
protected=['src/combat-foundation-v060.js','data/catalog-expansion-v070.json','data/finishers-v053.json','data/directional-art.json','src/context-contract.js','src/context-journal-v071.js']
(R/'docs/FLIGHT_R12_PRESERVATION.json').write_text(json.dumps({'profiles':{g['uid']:sha(compact(g)) for g in previous['fighters']},'files':{p:sha(old(p)) for p in protected},'stories':sha(compact(json.loads(old('data/chronicles.json'))['stories'])),'beforeMoves':next(f for f in previous['fighters'] if f['uid']==UID)['combat']['moves']},indent=2)+'\n')
print('R12: one profile, two movement contracts, 114 peers and all stories unchanged. Engine unchanged.')
