#!/usr/bin/env python3
"""Finish only human Lucas's dossier and fix storage-isolation assertions."""
from pathlib import Path
import json,subprocess,hashlib,os
R=Path(__file__).resolve().parents[1];BASE=os.environ.get('BOW_R11_BASE','b8b47ee78b80015263f10303781ae2566eb27699');UID='re7-lucas-baker'
sha=lambda b:hashlib.sha256(b).hexdigest()
old=lambda p:subprocess.check_output(['git','show',BASE+':'+p],cwd=R)
D=json.loads((R/'data/roster.json').read_text());by={f['uid']:f for f in D['fighters']};f=by[UID]
p=R/'data/chronicles.json';book=json.loads(p.read_text());s=book['stories'][UID]
texts=[
 'Ce dossier concerne LUCAS BAKER — FORME HUMAINE dans Resident Evil 7 biohazard (2017). La présentation de ce duel reste séparée du profil de sa mutation finale. Les confrontations suivantes sont une fiction du fangame.',
 'Le prototype emploie des dispositifs visibles : charge télécommandée, fil bas et caisse de proximité. Trois boîtiers au maximum appartiennent à chaque combattant. Ces règles ne sont pas des données extraites du jeu original.',
 'Laisser le boîtier terminer son armement, puis employer Mise à feu pour les seules charges radio personnelles. Le recul sert à quitter la zone de contact. Les boîtiers adverses sont destructibles selon les règles du duel.',
 'Les huit essais du dossier LUCAS BAKER — FORME HUMAINE sont achevés dans la simulation. Le résultat appartient au parcours du fangame ; il ne modifie pas la fin du personnage dans la continuité originale.',
 'Le rapport suit les poses, les armements, les déclenchements et les explosions uniques. Le super constitue un réseau temporisé de simulation. Aucune de ces commandes ne reçoit une certification 1:1 par ce seul compte rendu.',
 'Le dossier de cette incarnation est clôturé pour ce parcours. Les conclusions adaptées aux victimes, dessins, voix et relevés précis des gestes restent à produire. Aucune nouvelle évolution biologique n’est attribuée au sujet.'
]
for i,panel in enumerate(s['intro']+s['outro']):
 panel['focus']=UID;panel['text']=texts[i];panel['paragraphs']=[texts[i]];panel['stage']='testing_area_2017';panel['place']='ZONE D’ESSAI — SIMULATION';panel['visual']['environment']=panel['place']
s['name']=f['name'];s['game']=f['ep'];s['evidence']='source-review-partial';s['anchor']='Lucas humain ; dispositifs et confrontation 2D déclarés comme adaptations.'
for row in s['route']:
 enemy=by[row['opponent']];m=enemy['combat']['moves']['throw'];row['challenge']='Observer '+enemy['name']+' : '+m['name']+'. '+m['counterplay']
previous=json.loads(old('data/chronicles.json'))['stories']
for uid,story in book['stories'].items():
 if uid!=UID:assert story==previous[uid],uid
assert [(x['opponent'],x['stage']) for x in s['route']]==[(x['opponent'],x['stage']) for x in previous[UID]['route']]
p.write_text(json.dumps(book,ensure_ascii=False,indent=2)+'\n')
policy='src/finisher-compatibility-r10.js';p=R/policy;code=p.read_text()
anchor="  if(!fin)return result(false,'unknown-conclusion','Conclusion absente de cette incarnation.');"
guard="\n  if(attackerUID==='re7-lucas-baker')return result(false,'lucas-review-required','Lucas humain : les anciennes conclusions par saisie ne représentent pas ses dispositifs. Victoire normale ; chorégraphie dédiée à produire.');"
if guard not in code:
 assert code.count(anchor)==1;code=code.replace(anchor,anchor+guard);p.write_text(code)
# Preserve every browser preference, instead of erasing storage to make QA green.
p=R/'tests/browser-lucas-r11.mjs';code=p.read_text()
start="   await page.goto(base+'/catalog-duel.html?uid=re7-lucas-baker&target=re5-big-man-majini',{waitUntil:'networkidle'});"
new="   const saved=await page.evaluate(()=>{localStorage.setItem('r11-test-sentinel','DO NOT CHANGE');return JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]));});\n"+start
if new not in code:
 assert code.count(start)==1;code=code.replace(start,new)
 code=code.replace('storage:localStorage.length','storage:JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))')
 assert 'assert.equal(result.storage,0)' in code;code=code.replace('assert.equal(result.storage,0)','assert.equal(result.storage,saved);delete result.storage;result.storageUnchanged=true');p.write_text(code)
p=R/'package.json';package=json.loads(p.read_text())
if 'verify-lucas-continuity-r11' not in package['scripts']['verify']:package['scripts']['verify']+=' && node tests/verify-lucas-continuity-r11.mjs'
p.write_text(json.dumps(package,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['python3','scripts/compile-content.py'],cwd=R,check=True)
for script in ['contract.mjs','catalog-replay-contract.mjs']:
 subprocess.run(['node','scripts/'+script,'--write'],cwd=R,check=True)
subprocess.run(['node','scripts/finalize-lucas-r11.mjs'],cwd=R,check=True)
p=R/'docs/LUCAS_R11_CHANGES.json';changes=json.loads(p.read_text());changes['changed'][policy]={'before':sha(old(policy)),'after':sha((R/policy).read_bytes())};p.write_text(json.dumps(changes,indent=2)+'\n')
canonical=lambda x:json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
proof={'base':BASE,'humanUID':UID,'unchangedStories':{uid:sha(canonical(story)) for uid,story in previous.items() if uid!=UID},'humanRoute':[[x['opponent'],x['stage']] for x in previous[UID]['route']], 'finishersSHA256':sha(old('data/finishers-v053.json'))}
(R/'docs/LUCAS_R11_STORY_PRESERVATION.json').write_text(json.dumps(proof,indent=2)+'\n')
p=R/'scripts/package-lucas-r11.py';code=p.read_text().replace('assert passed==388,passed','assert passed==392,passed')
line="new=json.loads((R/'docs/LUCAS_R11_TESTS.json').read_text());assert new['passed']==22 and new['failed']==0"
extra=line+"\ncontinuity=json.loads((R/'docs/LUCAS_R11_CONTINUITY_TESTS.json').read_text());assert continuity['passed']==4 and continuity['failed']==0"
if extra not in code:
 assert code.count(line)==1;code=code.replace(line,extra)
code=code.replace("'newChecks':22","'newChecks':26").replace("'docs/LUCAS_R11_CHANGES.json','docs/planning/", "'docs/LUCAS_R11_CHANGES.json','docs/LUCAS_R11_CONTINUITY_TESTS.json','docs/LUCAS_R11_STORY_PRESERVATION.json','docs/INTEGRATION_R11.md','docs/planning/");p.write_text(code)
print('Six human panels + eight current opponent challenges; 114 peer stories and route topology preserved. Old conclusion definitions kept but disabled for human Lucas as attacker.')
